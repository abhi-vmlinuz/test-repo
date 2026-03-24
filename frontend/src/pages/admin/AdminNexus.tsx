import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Server, DollarSign, Activity, Calculator, Trash2, RefreshCw,
    Cloud, Cpu, HardDrive, Network, Clock, TrendingUp,
    Settings, Zap, CheckCircle, XCircle, BarChart3,
    Download, Calendar, ChevronRight, Layers, Globe, MonitorDot, Shield, Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import BillingTab from './BillingTab';

const AdminNexus = () => {
    const [stats, setStats] = useState({ active_sessions: 0, total_pods: 0, total_sessions_today: 0, estimated_cost_today: 0 });
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [history, setHistory] = useState({ sessions: [], summary: { total_sessions: 0, total_cost: 0, total_hours: 0, unique_users: 0 }, daily_breakdown: [] });

    // K3s and VPN state
    const [vpnStatus, setVpnStatus] = useState({ total_users: 0, active_connections: 0, server_ip: '10.8.0.1' });
    const [clusterHealth, setClusterHealth] = useState({ status: 'healthy', nodes_ready: 0, nodes_total: 0, pod_capacity: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, sessionsRes, historyRes, vpnRes, clusterRes] = await Promise.all([
                axios.get(`${API}/admin/nexus/stats`).catch(() => ({ data: { active_sessions: 0, total_pods: 0, total_sessions_today: 0, estimated_cost_today: 0 } })),
                axios.get(`${API}/admin/nexus/sessions`).catch(() => ({ data: { sessions: [] } })),
                axios.get(`${API}/admin/nexus/history`).catch(() => ({ data: { sessions: [], summary: {}, daily_breakdown: [] } })),
                axios.get(`${API}/admin/nexus/vpn/status`).catch(() => ({ data: { total_users: 0, active_connections: 0, server_ip: '10.8.0.1' } })),
                axios.get(`${API}/admin/nexus/cluster/health`).catch(() => ({ data: { status: 'unknown', nodes_ready: 0, nodes_total: 0, pod_capacity: 0 } }))
            ]);
            setStats(statsRes.data);
            setSessions(sessionsRes.data.sessions || []);
            setHistory(historyRes.data);
            setVpnStatus(vpnRes.data);
            setClusterHealth(clusterRes.data);
        } catch (error) {
            console.error('Failed to fetch Nexus data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculatePricing = async () => {
        try {
            const res = await axios.get(`${API}/admin/nexus/pricing`, {
                params: { hours, concurrent_users: concurrent }
            });
            setPricing(res.data);
        } catch (error) {
            toast.error('Failed to calculate pricing');
        }
    };

    const terminateSession = async (sessionId) => {
        if (!confirm('Terminate this session?')) return;
        try {
            await axios.delete(`${API}/admin/nexus/sessions/${sessionId}`);
            toast.success('Session terminated');
            fetchData();
        } catch (error) {
            toast.error('Failed to terminate session');
        }
    };

    const terminateAllSessions = async () => {
        if (!confirm('Terminate ALL active sessions? This will affect all users.')) return;
        try {
            for (const session of sessions) {
                await axios.delete(`${API}/admin/nexus/sessions/${session.session_id}`);
            }
            toast.success('All sessions terminated');
            fetchData();
        } catch (error) {
            toast.error('Failed to terminate sessions');
        }
    };

    const cleanupOrphans = async () => {
        const orphanedSessions = sessions.filter((s: any) => s.is_orphaned);
        if (orphanedSessions.length === 0) {
            toast.error('No orphaned sessions to clean up');
            return;
        }
        if (!confirm(`Clean up ${orphanedSessions.length} orphaned session(s)? This removes stale database records.`)) return;
        try {
            for (const session of orphanedSessions) {
                await axios.delete(`${API}/admin/nexus/sessions/${session.session_id}`);
            }
            toast.success(`Cleaned up ${orphanedSessions.length} orphaned session(s)`);
            fetchData();
        } catch (error) {
            toast.error('Failed to clean up orphaned sessions');
        }
    };

    const orphanCount = sessions.filter((s: any) => s.is_orphaned).length;
    const totalBillingCost = history.summary?.total_cost || 0;
    const totalSessions = history.summary?.total_sessions || 0;
    const maxCost = Math.max(...(history.daily_breakdown || []).map(d => d.cost), 0.01);


    const exportToCSV = () => {
        if (!history.sessions || history.sessions.length === 0) {
            toast.error('No history data to export');
            return;
        }

        const headers = ['User', 'Email', 'Session ID', 'Challenge ID', 'Started At', 'Ended At', 'Duration (mins)', 'Status', 'Cost (USD)'];
        const csvRows = [
            headers.join(','),
            ...history.sessions.map(session => [
                `"${session.username || 'Unknown'}"`,
                `"${session.email || 'N/A'}"`,
                `"${session.session_id}"`,
                `"${session.challenge_id}"`,
                `"${session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}"`,
                `"${session.ended_at ? new Date(session.ended_at).toLocaleString() : 'N/A'}"`,
                session.duration_mins || 0,
                `"${session.status}"`,
                session.cost || 0
            ].join(','))
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `nexus_history_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Data exported to CSV');
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'sessions', label: 'Sessions', icon: Server },
        { id: 'vpn', label: 'VPN & Network', icon: Shield },
        { id: 'history', label: 'History', icon: Clock },
        { id: 'billing', label: 'Billing', icon: DollarSign },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
                        <Cloud className="w-8 h-8 text-blue-500" />
                        Nexus Engine v3
                    </h1>
                    <p className="text-gray-500 mt-1">K3s cluster orchestration & WireGuard VPN management</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Data
                    </Button>
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="border border-gray-200 bg-white">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Active Sessions</p>
                                            <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.active_sessions}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                            <Activity className="w-6 h-6 text-emerald-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Card className="border border-gray-200 bg-white">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Running Pods</p>
                                            <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.total_pods}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                            <Server className="w-6 h-6 text-blue-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card className="border border-gray-200 bg-white">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">VPN Users</p>
                                            <p className="text-3xl font-bold text-zinc-900 mt-1">{vpnStatus.total_users}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                                            <Shield className="w-6 h-6 text-teal-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <Card className="border border-gray-200 bg-white">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Monthly Cost</p>
                                            <p className="text-3xl font-bold text-zinc-900 mt-1">$44.00</p>
                                        </div>
                                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Session Activity Chart */}
                    <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <CardHeader className="border-b border-gray-50 bg-gray-50">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-wider">
                                <Activity className="w-4 h-4 text-purple-500" />
                                Session Activity (Last 7 Days)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {(history.daily_breakdown || []).length > 0 ? (
                                <div className="h-64 mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={history.daily_breakdown.map(d => ({ ...d, shortDate: d.date?.split(' ')[1] || d.date }))}>
                                            <defs>
                                                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="shortDate"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: any) => [value, 'Sessions']}
                                                labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="sessions"
                                                stroke="#a855f7"
                                                strokeWidth={2.5}
                                                fillOpacity={1}
                                                fill="url(#colorSessions)"
                                                animationDuration={2000}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-48 flex items-center justify-center">
                                    <div className="text-center">
                                        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                                        <p className="text-gray-400 font-medium">No usage data found</p>
                                        <p className="text-sm text-gray-300">Start some challenge containers to see live analytics</p>
                                    </div>
                                </div>
                            )}

                            {/* Summary Footer */}
                            {(history.daily_breakdown || []).length > 0 && (
                                <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-3 gap-8">
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Sessions</p>
                                        <p className="text-xl font-bold text-gray-900 mt-1">{history.summary?.total_sessions || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Avg Duration</p>
                                        <p className="text-xl font-bold text-purple-600 mt-1">
                                            {history.summary?.total_sessions > 0 
                                                ? ((history.summary?.total_hours || 0) / history.summary?.total_sessions).toFixed(1) 
                                                : '0.0'}h
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <Button variant="ghost" size="sm" className="text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                                            View Detailed Logs <ChevronRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border border-gray-200 bg-white hover:border-gray-300 transition-colors cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${clusterHealth.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'}`}>
                                        {clusterHealth.status === 'healthy' ? (
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                        ) : (
                                            <XCircle className="w-6 h-6 text-red-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-zinc-900">K3s Cluster</p>
                                        <p className={`text-sm ${clusterHealth.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                                            {clusterHealth.nodes_ready}/{clusterHealth.nodes_total} nodes ready
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-gray-200 bg-white hover:border-gray-300 transition-colors cursor-pointer" onClick={() => setActiveTab('vpn')}>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-zinc-900">WireGuard VPN</p>
                                        <p className="text-sm text-gray-500">{vpnStatus.total_users} users configured</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-gray-200 bg-white hover:border-gray-300 transition-colors cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                        <Zap className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-zinc-900">Nexus Engine</p>
                                        <p className="text-sm text-gray-500">65.21.191.184:8081</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Active Sessions Preview */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Server className="w-5 h-5 text-gray-500" />
                                    Active Sessions
                                </CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setActiveTab('sessions')}>
                                    View All →
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {sessions.length > 0 ? (
                                <div className="space-y-3">
                                    {sessions.slice(0, 5).map((session, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                <div>
                                                    <p className="font-mono text-sm text-gray-900">{session.target_ip || 'Pending...'}</p>
                                                    <p className="text-xs text-gray-500">Session: {session.session_id?.slice(0, 12)}...</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">
                                                    {session.started_at ? new Date(session.started_at).toLocaleTimeString() : 'N/A'}
                                                </p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 px-2"
                                                    onClick={() => terminateSession(session.session_id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Server className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                                    <p className="text-gray-400">No active sessions</p>
                                    <p className="text-sm text-gray-300">Sessions will appear when users start labs</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
                <div className="space-y-6">
                    {/* Session Controls */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-900">Active Sessions</h2>
                            {orphanCount > 0 && (
                                <p className="text-sm text-amber-600 mt-0.5">
                                    ⚠️ {orphanCount} orphaned session(s) detected
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" size="sm" onClick={fetchData}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                            </Button>
                            {orphanCount > 0 && (
                                <Button variant="outline" size="sm" onClick={cleanupOrphans} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Clean {orphanCount} Orphan{orphanCount > 1 ? 's' : ''}
                                </Button>
                            )}
                            {sessions.length > 0 && (
                                <Button variant="destructive" size="sm" onClick={terminateAllSessions}>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Terminate All
                                </Button>
                            )}
                        </div>
                    </div>


                    {sessions.length === 0 ? (
                        <Card className="border border-gray-200 bg-white">
                            <CardContent className="py-16 text-center">
                                <Server className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                                <p className="text-gray-500 text-lg">No active sessions</p>
                                <p className="text-gray-400 text-sm mt-1">Sessions will appear here when users start challenge containers</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {sessions.map((session: any) => (
                                <Card key={session.session_id} className={`border bg-white ${session.is_orphaned ? 'border-amber-300 bg-amber-50' :
                                    session.status === 'running' ? 'border-gray-200' :
                                        'border-gray-100 bg-gray-50'
                                    }`}>
                                    <CardContent className="py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-3 h-3 rounded-full ${session.is_orphaned ? 'bg-amber-500' :
                                                    session.status === 'running' ? 'bg-green-500 animate-pulse' :
                                                        'bg-gray-400'
                                                    }`} />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-mono text-lg font-semibold text-zinc-900">
                                                            {session.target_ip || 'N/A'}
                                                        </p>
                                                        <Badge variant="outline" className="text-[10px] border-teal-200 text-teal-700 bg-teal-50">
                                                            Direct Pod IP
                                                        </Badge>
                                                        {session.is_orphaned && (
                                                            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[10px]">
                                                                ⚠️ Orphaned
                                                            </Badge>
                                                        )}
                                                        {!session.in_nexus && session.status === 'running' && !session.is_orphaned && (
                                                            <Badge variant="outline" className="border-gray-300 text-gray-600 text-[10px]">
                                                                DB Only
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <p className="text-sm text-gray-600">
                                                            <span className="text-gray-400">User:</span> {session.username || 'Unknown'}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <span className="text-gray-400">Challenge:</span> {session.challenge_title || 'Unknown'}
                                                        </p>
                                                        {/* Exposed Ports */}
                                                        {session.ports && session.ports.length > 0 && (
                                                            <p className="text-sm text-gray-600">
                                                                <span className="text-gray-400">Ports:</span>{' '}
                                                                <span className="font-mono text-xs">{session.ports.join(', ')}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400 font-mono mt-1">
                                                        {session.session_id}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <Badge variant="outline" className={
                                                        session.status === 'running' ? 'border-green-200 text-green-700 bg-green-50' :
                                                            session.status === 'terminated' ? 'border-red-200 text-red-700 bg-red-50' :
                                                                session.status === 'expired' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                                                                    'border-gray-200 text-gray-700 bg-gray-50'
                                                    }>
                                                        {session.status || 'unknown'}
                                                    </Badge>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Started: {session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}
                                                    </p>
                                                    {session.estimated_cost > 0 && (
                                                        <p className="text-xs text-emerald-600 mt-0.5">
                                                            ${session.estimated_cost.toFixed(4)}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => terminateSession(session.session_id)}
                                                    title={session.is_orphaned ? 'Clean up orphaned record' : 'Terminate session'}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                    )}
                </div>
            )}

            {/* VPN & Network Tab */}
            {activeTab === 'vpn' && (
                <div className="space-y-6">
                    {/* VPN Status */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Shield className="w-5 h-5 text-gray-500" />
                                WireGuard VPN Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse"></div>
                                        <h4 className="font-semibold text-zinc-900">VPN Server</h4>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">Network: <span className="font-mono">{vpnStatus.server_ip}/24</span></p>
                                    <p className="text-sm text-gray-600">Protocol: <span className="font-mono">WireGuard UDP/51820</span></p>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Users className="w-5 h-5 text-blue-600" />
                                        <h4 className="font-semibold text-zinc-900">Total Users</h4>
                                    </div>
                                    <p className="text-3xl font-bold text-blue-600">{vpnStatus.total_users}</p>
                                    <p className="text-xs text-gray-500 mt-1">Configured VPN clients</p>
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Activity className="w-5 h-5 text-emerald-600" />
                                        <h4 className="font-semibold text-zinc-900">Active Connections</h4>
                                    </div>
                                    <p className="text-3xl font-bold text-emerald-600">{vpnStatus.active_connections}</p>
                                    <p className="text-xs text-gray-500 mt-1">Currently connected</p>
                                </div>
                            </div>
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Architecture</h4>
                                <p className="text-sm text-gray-600">
                                    • Students download VPN config once from <span className="font-mono text-xs bg-white px-1 rounded">/access</span> page<br/>
                                    • Direct access to pod IPs via VPN (<span className="font-mono text-xs">10.42.0.0/16</span>)<br/>
                                    • ipset-based multi-tenant isolation with O(1) lookups<br/>
                                    • TryHackMe-style standalone VPN model (user-scoped, not session-scoped)
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* K3s Cluster Health */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Server className="w-5 h-5 text-gray-500" />
                                K3s Cluster Health
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className={`p-4 rounded-lg border ${clusterHealth.status === 'healthy' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-3 h-3 rounded-full ${clusterHealth.status === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                        <h4 className="font-semibold text-zinc-900">Cluster Status</h4>
                                    </div>
                                    <p className={`text-2xl font-bold ${clusterHealth.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                                        {clusterHealth.status === 'healthy' ? 'Healthy' : 'Degraded'}
                                    </p>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Layers className="w-5 h-5 text-blue-600" />
                                        <h4 className="font-semibold text-zinc-900">Nodes Ready</h4>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {clusterHealth.nodes_ready}/{clusterHealth.nodes_total}
                                    </p>
                                </div>
                                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Cpu className="w-5 h-5 text-indigo-600" />
                                        <h4 className="font-semibold text-zinc-900">Pod Capacity</h4>
                                    </div>
                                    <p className="text-2xl font-bold text-indigo-600">{clusterHealth.pod_capacity}</p>
                                    <p className="text-xs text-gray-500 mt-1">Max concurrent pods</p>
                                </div>
                            </div>
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold text-sm text-gray-700 mb-2">Infrastructure Details</h4>
                                <p className="text-sm text-gray-600">
                                    • Bare Metal: Hetzner AX41-NVMe (65.109.20.25) - 6 cores, 64GB RAM<br/>
                                    • Pod Network: <span className="font-mono text-xs bg-white px-1 rounded">10.42.0.0/16</span> via CNI bridge<br/>
                                    • Isolation: iptables + ipset per user (direct pod IP access over VPN)<br/>
                                    • Cost: €38.83/month (bare metal) + €5.16/month (VPS) = <span className="font-semibold">$44/month total</span>
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Network Routing Info */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Network className="w-5 h-5 text-gray-500" />
                                Network Routing
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                    <div className="font-mono text-sm bg-white px-3 py-1.5 rounded border border-gray-200 text-gray-700">
                                        10.8.0.0/24
                                    </div>
                                    <div className="text-gray-400">→</div>
                                    <div className="font-mono text-sm bg-white px-3 py-1.5 rounded border border-gray-200 text-gray-700">
                                        WireGuard VPN
                                    </div>
                                    <span className="text-xs text-gray-500">(Student VPN clients)</span>
                                </div>
                                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                    <div className="font-mono text-sm bg-white px-3 py-1.5 rounded border border-gray-200 text-gray-700">
                                        10.42.0.0/16
                                    </div>
                                    <div className="text-gray-400">→</div>
                                    <div className="font-mono text-sm bg-white px-3 py-1.5 rounded border border-gray-200 text-gray-700">
                                        K3s Pod Network
                                    </div>
                                    <span className="text-xs text-gray-500">(Challenge containers)</span>
                                </div>
                                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                    <div className="font-mono text-sm bg-white px-3 py-1.5 rounded border border-gray-200 text-gray-700">
                                        cni0 bridge
                                    </div>
                                    <div className="text-gray-400">→</div>
                                    <div className="font-mono text-sm bg-white px-3 py-1.5 rounded border border-gray-200 text-gray-700">
                                        iptables + ipset
                                    </div>
                                    <span className="text-xs text-gray-500">(Per-user isolation)</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* History Tab - Session Logs */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="border border-gray-200 bg-white">
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                                    <p className="text-2xl font-bold text-zinc-900 mt-1">{history.summary?.total_sessions || 0}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-gray-200 bg-white">
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-500">Total Cost</p>
                                    <p className="text-2xl font-bold text-emerald-600 mt-1">${(history.summary?.total_cost || 0).toFixed(4)}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-gray-200 bg-white">
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-500">Total Hours</p>
                                    <p className="text-2xl font-bold text-blue-600 mt-1">{(history.summary?.total_hours || 0).toFixed(1)}h</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-gray-200 bg-white">
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-500">Unique Users</p>
                                    <p className="text-2xl font-bold text-purple-600 mt-1">{history.summary?.unique_users || 0}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Session Logs Table */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Clock className="w-5 h-5 text-gray-500" />
                                Session Logs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-4 font-medium text-gray-500">User</th>
                                            <th className="text-left py-3 px-4 font-medium text-gray-500">Session ID</th>
                                            <th className="text-left py-3 px-4 font-medium text-gray-500">Started</th>
                                            <th className="text-left py-3 px-4 font-medium text-gray-500">Duration</th>
                                            <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                                            <th className="text-right py-3 px-4 font-medium text-gray-500">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(history.sessions || []).map((session: any, idx: number) => (
                                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4">
                                                    <div>
                                                        <p className="font-medium text-zinc-900">{session.username}</p>
                                                        <p className="text-xs text-gray-400">{session.email}</p>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{session.session_id?.substring(0, 12)}...</code>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600">
                                                    {session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}
                                                </td>
                                                <td className="py-3 px-4 text-gray-600">
                                                    {session.duration_mins ? `${session.duration_mins} min` : 'N/A'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            session.status === 'running' ? 'border-green-200 text-green-700 bg-green-50' :
                                                                session.status === 'stopped' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                                                                    session.status === 'expired' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                                                                        session.status === 'terminated' ? 'border-red-200 text-red-700 bg-red-50' :
                                                                            session.status === 'completed' ? 'border-purple-200 text-purple-700 bg-purple-50' :
                                                                                'border-gray-200 text-gray-700 bg-gray-50'
                                                        }
                                                    >
                                                        {session.status}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 text-right font-medium text-zinc-900">
                                                    ${session.cost?.toFixed(4) || '0.0000'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(!history.sessions || history.sessions.length === 0) && (
                                    <div className="text-center py-8 text-gray-500">
                                        No session history yet
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Daily Breakdown Table */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calendar className="w-5 h-5 text-gray-500" />
                                Daily Breakdown (Last 7 Days)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                                            <th className="text-center py-3 px-4 font-medium text-gray-500">Sessions</th>
                                            <th className="text-center py-3 px-4 font-medium text-gray-500">Hours</th>
                                            <th className="text-right py-3 px-4 font-medium text-gray-500">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(history.daily_breakdown || []).map((day: any, idx: number) => (
                                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 font-medium text-zinc-900">{day.date}</td>
                                                <td className="py-3 px-4 text-center text-gray-600">{day.sessions}</td>
                                                <td className="py-3 px-4 text-center text-gray-600">{day.hours?.toFixed(1)}h</td>
                                                <td className="py-3 px-4 text-right font-medium text-emerald-600">${day.cost?.toFixed(4)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(!history.daily_breakdown || history.daily_breakdown.length === 0) && (
                                    <div className="text-center py-8 text-gray-500">
                                        No data for the last 7 days
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Billing Tab - BigQuery GCP Cost Tracking */}
            {activeTab === 'billing' && (
                <BillingTab API={API} />
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Resource Limits */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Cpu className="w-5 h-5 text-gray-500" />
                                Resource Limits
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Max Concurrent Pods</label>
                                <Input type="number" defaultValue={100} className="bg-gray-50 border-gray-200" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Default TTL (minutes)</label>
                                <Input type="number" defaultValue={60} className="bg-gray-50 border-gray-200" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">CPU per Pod (cores)</label>
                                <Input type="number" defaultValue={0.25} step={0.1} className="bg-gray-50 border-gray-200" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Memory per Pod (GB)</label>
                                <Input type="number" defaultValue={0.5} step={0.1} className="bg-gray-50 border-gray-200" />
                            </div>
                            <Button className="w-full bg-zinc-900 hover:bg-black text-white">
                                Save Settings
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Infrastructure */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Cloud className="w-5 h-5 text-gray-500" />
                                Infrastructure
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Architecture</span>
                                    <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50">
                                        K3s + VPN
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Cluster Type</span>
                                    <span className="font-medium">K3s Bare Metal</span>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Nodes Ready</span>
                                    <span className="font-medium">{clusterHealth.nodes_ready}/{clusterHealth.nodes_total}</span>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">VPN Server</span>
                                    <span className="font-mono text-xs">{vpnStatus.server_ip}:51820</span>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Nexus Engine</span>
                                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Online</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">API Endpoint</span>
                                    <span className="font-mono text-xs">65.21.191.184:8081</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="w-full">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Sync Challenges
                                </Button>
                                <Button variant="outline" className="w-full">
                                    <Activity className="w-4 h-4 mr-2" />
                                    View Logs
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminNexus;
