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
    Download, Calendar, ChevronRight, Layers, Globe, MonitorDot
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const AdminNexus = () => {
    const [stats, setStats] = useState({ active_sessions: 0, total_pods: 0, total_sessions_today: 0, estimated_cost_today: 0 });
    const [sessions, setSessions] = useState([]);
    const [pricing, setPricing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [history, setHistory] = useState({ sessions: [], summary: { total_sessions: 0, total_cost: 0, total_hours: 0, unique_users: 0 }, daily_breakdown: [] });

    // New Phase 2 state
    const [nodes, setNodes] = useState({ nodes: [], count: 0 });
    const [nexusConfig, setNexusConfig] = useState({ default_spawn_mode: 'hostport', available_modes: [], clusters: [] });
    const [portAllocations, setPortAllocations] = useState({ port_allocations: [] });

    // Pricing calculator inputs
    const [hours, setHours] = useState(8);
    const [concurrent, setConcurrent] = useState(50);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, sessionsRes, historyRes, nodesRes, configRes, portsRes] = await Promise.all([
                axios.get(`${API}/admin/nexus/stats`).catch(() => ({ data: { active_sessions: 0, total_pods: 0, total_sessions_today: 0, estimated_cost_today: 0 } })),
                axios.get(`${API}/admin/nexus/sessions`).catch(() => ({ data: { sessions: [] } })),
                axios.get(`${API}/admin/nexus/history`).catch(() => ({ data: { sessions: [], summary: {}, daily_breakdown: [] } })),
                axios.get(`${API}/admin/nexus/nodes`).catch(() => ({ data: { nodes: [], count: 0 } })),
                axios.get(`${API}/admin/nexus/config`).catch(() => ({ data: { default_spawn_mode: 'hostport', clusters: [] } })),
                axios.get(`${API}/admin/nexus/ports`).catch(() => ({ data: { port_allocations: [] } }))
            ]);
            setStats(statsRes.data);
            setNodes(nodesRes.data);
            setNexusConfig(configRes.data);
            setPortAllocations(portsRes.data);
            setSessions(sessionsRes.data.sessions || []);
            setHistory(historyRes.data);
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
        { id: 'nodes', label: 'Nodes', icon: Layers },
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
                        Nexus Engine
                    </h1>
                    <p className="text-gray-500 mt-1">Container orchestration & billing management</p>
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
                                            <p className="text-sm font-medium text-gray-500">Est. Hourly Cost</p>
                                            <p className="text-3xl font-bold text-zinc-900 mt-1">${(stats.active_sessions * 0.035).toFixed(2)}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                            <DollarSign className="w-6 h-6 text-amber-600" />
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
                                            <p className="text-sm font-medium text-gray-500">This Week</p>
                                            <p className="text-3xl font-bold text-zinc-900 mt-1">${totalBillingCost.toFixed(2)}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                            <TrendingUp className="w-6 h-6 text-purple-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Billing Chart */}
                    <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <CardHeader className="border-b border-gray-50 bg-gray-50/30">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-wider">
                                <Activity className="w-4 h-4 text-blue-500" />
                                Resource Consumption & Cost
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {(history.daily_breakdown || []).length > 0 ? (
                                <div className="h-64 mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={history.daily_breakdown.map(d => ({ ...d, shortDate: d.date?.split(' ')[1] || d.date }))}>
                                            <defs>
                                                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                                                tickFormatter={(v) => `$${v.toFixed(2)}`}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: any) => [`$${value.toFixed(4)}`, 'Daily Cost']}
                                                labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="cost"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorCost)"
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
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Cost</p>
                                        <p className="text-xl font-bold text-gray-900 mt-1">${(history.summary?.total_cost || 0).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Efficiency</p>
                                        <p className="text-xl font-bold text-emerald-600 mt-1">98.4%</p>
                                    </div>
                                    <div className="text-right">
                                        <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
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
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-zinc-900">System Health</p>
                                        <p className="text-sm text-green-600">All systems operational</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-gray-200 bg-white hover:border-gray-300 transition-colors cursor-pointer" onClick={() => setActiveTab('nodes')}>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <Layers className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-zinc-900">GKE Clusters</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50">
                                                {nodes.count || 0} node{(nodes.count || 0) !== 1 ? 's' : ''}
                                            </Badge>
                                            <Badge variant="outline" className={`text-[10px] ${nexusConfig.default_spawn_mode === 'hostport' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
                                                {nexusConfig.default_spawn_mode === 'hostport' ? '⚡ hostPort' : '⚖️ LoadBalancer'}
                                            </Badge>
                                        </div>
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
                                        <p className="text-sm text-gray-500">172.235.15.209:8081</p>
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
                                                        {/* Spawn Mode Badge */}
                                                        {session.spawn_mode && (
                                                            <Badge variant="outline" className={`text-[10px] ${session.spawn_mode === 'hostport' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
                                                                {session.spawn_mode === 'hostport' ? '⚡ hostPort' : '⚖️ LoadBalancer'}
                                                            </Badge>
                                                        )}
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

            {/* Nodes Tab - Cluster & Port Monitoring */}
            {activeTab === 'nodes' && (
                <div className="space-y-6">
                    {/* Clusters Section */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Cloud className="w-5 h-5 text-gray-500" />
                                Available Clusters
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(nexusConfig.clusters || []).map((cluster: any, idx: number) => (
                                    <div key={idx} className={`p-4 rounded-lg border ${cluster.hostport ? 'border-emerald-200 bg-emerald-50/30' : 'border-blue-200 bg-blue-50/30'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-zinc-900">{cluster.name}</h4>
                                            <Badge variant="outline" className={cluster.hostport ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-blue-200 text-blue-700 bg-blue-50'}>
                                                {cluster.type}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-500">{cluster.description}</p>
                                        <div className="mt-3 flex items-center gap-4 text-xs">
                                            <span className="text-gray-400">{cluster.zone || cluster.region}</span>
                                            {cluster.hostport && (
                                                <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50">
                                                    ⚡ hostPort Enabled
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Node List */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Server className="w-5 h-5 text-gray-500" />
                                    Cluster Nodes ({nodes.count || 0})
                                </CardTitle>
                                <Badge variant="outline" className={`${nexusConfig.default_spawn_mode === 'hostport' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
                                    Mode: {nexusConfig.default_spawn_mode || 'loadbalancer'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {(nodes.nodes || []).length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(nodes.nodes || []).map((node: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                                <div>
                                                    <p className="font-medium text-zinc-900 text-sm font-mono">{node.name}</p>
                                                    <p className="text-xs text-gray-400">Ready</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Globe className="w-4 h-4 text-gray-400" />
                                                <code className="text-sm bg-white px-2 py-1 rounded border border-gray-200">
                                                    {node.external_ip || 'No external IP'}
                                                </code>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Server className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                                    <p className="text-gray-400">No nodes found</p>
                                    <p className="text-sm text-gray-300">Nodes will appear when the cluster is connected</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Port Allocations */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Network className="w-5 h-5 text-gray-500" />
                                Port Allocations (hostPort Mode)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(portAllocations.port_allocations || []).length > 0 ? (
                                <div className="space-y-4">
                                    {(portAllocations.port_allocations || []).map((nodeAlloc: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <MonitorDot className="w-4 h-4 text-gray-500" />
                                                    <span className="font-medium text-zinc-900 text-sm">{nodeAlloc.node_name}</span>
                                                </div>
                                                <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                                                    {nodeAlloc.external_ip}
                                                </code>
                                            </div>
                                            {Object.keys(nodeAlloc.allocations || {}).length > 0 ? (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    {Object.entries(nodeAlloc.allocations || {}).map(([port, sessionId]: [string, any]) => (
                                                        <div key={port} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                                                            <span className="font-mono text-sm text-emerald-600">{port}</span>
                                                            <span className="text-xs text-gray-400 truncate" title={sessionId}>
                                                                {(sessionId as string).slice(0, 8)}...
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-400">No ports allocated on this node</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Network className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                                    <p className="text-gray-400">No port allocations</p>
                                    <p className="text-sm text-gray-300">Port allocations will appear when hostPort mode is active</p>
                                </div>
                            )}
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

            {/* Billing Tab */}
            {activeTab === 'billing' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cost Calculator - WHITE THEME */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calculator className="w-5 h-5 text-gray-500" />
                                Cost Calculator
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Hours per Day</label>
                                    <Input
                                        type="number"
                                        value={hours}
                                        onChange={(e) => setHours(Number(e.target.value))}
                                        className="bg-gray-50 border-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Concurrent Users</label>
                                    <Input
                                        type="number"
                                        value={concurrent}
                                        onChange={(e) => setConcurrent(Number(e.target.value))}
                                        className="bg-gray-50 border-gray-200"
                                    />
                                </div>
                            </div>

                            <Button onClick={calculatePricing} className="w-full bg-zinc-900 hover:bg-black text-white">
                                <Calculator className="w-4 h-4 mr-2" />
                                Calculate Costs
                            </Button>

                            {pricing && (
                                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h4 className="font-semibold text-zinc-900 mb-4">Cost Breakdown</h4>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600 flex items-center gap-2">
                                                <Cpu className="w-4 h-4" /> vCPU (0.25 core)
                                            </span>
                                            <span className="font-medium">${pricing.pricing?.breakdown?.['vcpu_0.25'] || '0.0079'}/hr</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600 flex items-center gap-2">
                                                <HardDrive className="w-4 h-4" /> Memory (0.5 GB)
                                            </span>
                                            <span className="font-medium">${pricing.pricing?.breakdown?.['memory_0.5gb'] || '0.0017'}/hr</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600 flex items-center gap-2">
                                                <Network className="w-4 h-4" /> LoadBalancer
                                            </span>
                                            <span className="font-medium">${pricing.pricing?.breakdown?.loadbalancer || '0.025'}/hr</span>
                                        </div>

                                        <div className="border-t border-gray-200 pt-3 mt-3">
                                            <div className="flex justify-between items-center text-lg">
                                                <span className="font-semibold text-zinc-900">Per Instance</span>
                                                <span className="font-bold text-blue-600">${pricing.pricing?.per_instance_per_hour || '0.035'}/hr</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                            <p className="text-sm text-blue-600">Daily Estimate</p>
                                            <p className="text-2xl font-bold text-blue-700">${pricing.estimate?.total_cost_usd || '0.00'}</p>
                                            <p className="text-xs text-blue-500">{pricing.estimate?.total_instance_hours || '0'} hrs</p>
                                        </div>
                                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                            <p className="text-sm text-purple-600">Monthly Projection</p>
                                            <p className="text-2xl font-bold text-purple-700">${pricing.monthly_projection?.monthly_cost_usd || '0.00'}</p>
                                            <p className="text-xs text-purple-500">30 days</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Billing History */}
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calendar className="w-5 h-5 text-gray-500" />
                                Billing History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(history.daily_breakdown || []).length > 0 ? (
                                <>
                                    <div className="space-y-3">
                                        {(history.daily_breakdown || []).map((day, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <p className="font-medium text-zinc-900">{day.date}</p>
                                                    <p className="text-sm text-gray-500">{day.sessions} sessions</p>
                                                </div>
                                                <p className="text-lg font-semibold text-zinc-900">${day.cost.toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 p-4 bg-zinc-900 rounded-lg text-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-300">Total This Period</p>
                                                <p className="text-3xl font-bold">${totalBillingCost.toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-300">Total Sessions</p>
                                                <p className="text-2xl font-bold">{totalSessions}</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-8 text-center">
                                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                                    <p className="text-gray-400">No billing data yet</p>
                                    <p className="text-sm text-gray-300">Usage history will appear here</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
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
                                    <span className="text-sm text-gray-600">Spawn Mode</span>
                                    <Badge variant="outline" className={`${nexusConfig.default_spawn_mode === 'hostport' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
                                        {nexusConfig.default_spawn_mode === 'hostport' ? '⚡ hostPort' : '⚖️ LoadBalancer'}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Active Cluster</span>
                                    <span className="font-medium">{(nexusConfig.clusters || [])[0]?.type || 'GKE Autopilot'}</span>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Nodes Available</span>
                                    <span className="font-medium">{nodes.count || 0}</span>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Nexus Engine</span>
                                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Online</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">API Endpoint</span>
                                    <span className="font-mono text-xs">172.235.15.209:8081</span>
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
