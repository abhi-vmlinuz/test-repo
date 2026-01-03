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
    Download, Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

const AdminNexus = () => {
    const [stats, setStats] = useState({ active_sessions: 0, total_pods: 0, total_sessions_today: 0, estimated_cost_today: 0 });
    const [sessions, setSessions] = useState([]);
    const [pricing, setPricing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [history, setHistory] = useState({ sessions: [], summary: { total_sessions: 0, total_cost: 0, total_hours: 0, unique_users: 0 }, daily_breakdown: [] });

    // Pricing calculator inputs
    const [hours, setHours] = useState(8);
    const [concurrent, setConcurrent] = useState(50);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, sessionsRes, historyRes] = await Promise.all([
                axios.get(`${API}/admin/nexus/stats`).catch(() => ({ data: { active_sessions: 0, total_pods: 0, total_sessions_today: 0, estimated_cost_today: 0 } })),
                axios.get(`${API}/admin/nexus/sessions`).catch(() => ({ data: { sessions: [] } })),
                axios.get(`${API}/admin/nexus/history`).catch(() => ({ data: { sessions: [], summary: {}, daily_breakdown: [] } }))
            ]);
            setStats(statsRes.data);
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
            await axios.delete(`${API}/docker/stop/${sessionId}`);
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
                await axios.delete(`${API}/docker/stop/${session.session_id}`);
            }
            toast.success('All sessions terminated');
            fetchData();
        } catch (error) {
            toast.error('Failed to terminate sessions');
        }
    };

    const totalBillingCost = history.summary?.total_cost || 0;
    const totalSessions = history.summary?.total_sessions || 0;
    const maxCost = Math.max(...(history.daily_breakdown || []).map(d => d.cost), 0.01);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'sessions', label: 'Sessions', icon: Server },
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
                    <Button variant="outline" size="sm">
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
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <BarChart3 className="w-5 h-5 text-gray-500" />
                                Usage This Week
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(history.daily_breakdown || []).length > 0 ? (
                                <div className="flex items-end gap-3 h-48">
                                    {(history.daily_breakdown || []).map((day, idx) => (
                                        <div key={idx} className="flex-1 flex flex-col items-center">
                                            <div className="text-xs text-gray-500 mb-2">${day.cost.toFixed(4)}</div>
                                            <div
                                                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all hover:from-blue-600 hover:to-blue-500"
                                                style={{ height: `${maxCost > 0 ? (day.cost / maxCost) * 140 : 0}px` }}
                                            />
                                            <div className="text-xs text-gray-400 mt-2">{day.date?.split(' ')[1] || day.date}</div>
                                            <div className="text-[10px] text-gray-400">{day.sessions} sessions</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-48 flex items-center justify-center">
                                    <div className="text-center">
                                        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                                        <p className="text-gray-400">No usage data yet</p>
                                        <p className="text-sm text-gray-300">Data will appear when containers are used</p>
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

                        <Card className="border border-gray-200 bg-white hover:border-gray-300 transition-colors cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <Cloud className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-zinc-900">GKE Cluster</p>
                                        <p className="text-sm text-gray-500">asia-south1 (Autopilot)</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-gray-200 bg-white hover:border-gray-300 transition-colors cursor-pointer">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <Zap className="w-6 h-6 text-purple-600" />
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
                        <h2 className="text-xl font-semibold text-zinc-900">Active Sessions</h2>
                        <div className="flex gap-3">
                            <Button variant="outline" size="sm" onClick={fetchData}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                            </Button>
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
                            {sessions.map((session) => (
                                <Card key={session.session_id} className="border border-gray-200 bg-white">
                                    <CardContent className="py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                                <div>
                                                    <p className="font-mono text-lg font-semibold text-zinc-900">{session.target_ip}</p>
                                                    <p className="text-sm text-gray-500">Session: {session.session_id}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                                                        {session.status || 'running'}
                                                    </Badge>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Expires: {session.expires_at ? new Date(session.expires_at).toLocaleTimeString() : 'N/A'}
                                                    </p>
                                                </div>
                                                <Button variant="destructive" size="sm" onClick={() => terminateSession(session.session_id)}>
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
                                                                session.status === 'terminated' ? 'border-red-200 text-red-700 bg-red-50' :
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
                                    <span className="text-sm text-gray-600">Platform</span>
                                    <span className="font-medium">GKE Autopilot</span>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Region</span>
                                    <span className="font-medium">asia-south1</span>
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
