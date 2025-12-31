import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Server,
    DollarSign,
    Activity,
    Calculator,
    Trash2,
    RefreshCw,
    Cloud,
    Cpu,
    HardDrive,
    Network,
    Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

const AdminNexus = ({ user, logout }) => {
    const [stats, setStats] = useState({ active_sessions: 0, total_pods: 0 });
    const [sessions, setSessions] = useState([]);
    const [pricing, setPricing] = useState(null);
    const [loading, setLoading] = useState(true);

    // Pricing calculator inputs
    const [hours, setHours] = useState(8);
    const [concurrent, setConcurrent] = useState(50);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, sessionsRes] = await Promise.all([
                axios.get(`${API}/admin/nexus/stats`),
                axios.get(`${API}/admin/nexus/sessions`)
            ]);
            setStats(statsRes.data);
            setSessions(sessionsRes.data.sessions || []);
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
        if (!confirm('Are you sure you want to terminate this session?')) return;

        try {
            await axios.delete(`${API}/docker/stop/${sessionId}`);
            toast.success('Session terminated');
            fetchData();
        } catch (error) {
            toast.error('Failed to terminate session');
        }
    };

    return (
        <Layout user={user} logout={logout}>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
                            <Cloud className="w-8 h-8 text-blue-500" />
                            Nexus Engine
                        </h1>
                        <p className="text-gray-500 mt-1">Container orchestration for CTF challenges</p>
                    </div>
                    <Button onClick={fetchData} disabled={loading} variant="outline">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Active Sessions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold text-emerald-600">{stats.active_sessions}</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                                    <Server className="w-4 h-4" />
                                    Running Pods
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold text-blue-600">{stats.total_pods}</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" />
                                    Est. Hourly Cost
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold text-amber-600">
                                    ${(stats.active_sessions * 0.035).toFixed(2)}
                                </p>
                                <p className="text-xs text-amber-500 mt-1">@$0.035/instance/hr</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Pricing Calculator */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-green-400" />
                                Billing Calculator
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Input Side */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">Hours per Day</label>
                                        <Input
                                            type="number"
                                            value={hours}
                                            onChange={(e) => setHours(Number(e.target.value))}
                                            className="bg-black/30 border-white/20 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">Concurrent Users</label>
                                        <Input
                                            type="number"
                                            value={concurrent}
                                            onChange={(e) => setConcurrent(Number(e.target.value))}
                                            className="bg-black/30 border-white/20 text-white"
                                        />
                                    </div>
                                    <Button
                                        onClick={calculatePricing}
                                        className="w-full bg-green-600 hover:bg-green-700"
                                    >
                                        <DollarSign className="w-4 h-4 mr-2" />
                                        Calculate Costs
                                    </Button>
                                </div>

                                {/* Results Side */}
                                {pricing && (
                                    <div className="bg-black/30 rounded-xl p-6 space-y-4">
                                        <h3 className="font-bold text-lg text-green-400">Cost Breakdown</h3>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Cpu className="w-4 h-4 text-blue-400" />
                                                <span className="text-gray-400">vCPU (0.25):</span>
                                            </div>
                                            <span className="text-right">${pricing.pricing.breakdown.vcpu_0_25}/hr</span>

                                            <div className="flex items-center gap-2">
                                                <HardDrive className="w-4 h-4 text-purple-400" />
                                                <span className="text-gray-400">Memory (0.5GB):</span>
                                            </div>
                                            <span className="text-right">${pricing.pricing.breakdown.memory_0_5gb}/hr</span>

                                            <div className="flex items-center gap-2">
                                                <Network className="w-4 h-4 text-amber-400" />
                                                <span className="text-gray-400">LoadBalancer:</span>
                                            </div>
                                            <span className="text-right">${pricing.pricing.breakdown.loadbalancer}/hr</span>
                                        </div>

                                        <div className="border-t border-white/20 pt-4 mt-4">
                                            <div className="flex justify-between items-center text-lg">
                                                <span className="text-gray-300">Per Instance:</span>
                                                <span className="font-bold text-green-400">${pricing.pricing.per_instance_per_hour}/hr</span>
                                            </div>
                                        </div>

                                        <div className="bg-green-900/30 rounded-lg p-4 mt-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Clock className="w-5 h-5 text-green-400" />
                                                <span className="font-bold">Daily Estimate</span>
                                            </div>
                                            <p className="text-3xl font-bold text-green-400">${pricing.estimate.total_cost_usd}</p>
                                            <p className="text-sm text-gray-400">{pricing.estimate.total_instance_hours} instance-hours</p>
                                        </div>

                                        <div className="bg-amber-900/30 rounded-lg p-4">
                                            <p className="text-sm text-amber-300">Monthly Projection</p>
                                            <p className="text-2xl font-bold text-amber-400">${pricing.monthly_projection.monthly_cost_usd}/month</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Active Sessions */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Server className="w-5 h-5" />
                                Active Sessions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {sessions.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Server className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>No active sessions</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sessions.map((session) => (
                                        <div
                                            key={session.session_id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                <div>
                                                    <p className="font-mono text-sm font-bold">{session.target_ip}</p>
                                                    <p className="text-xs text-gray-500">Session: {session.session_id}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <Badge variant="outline" className="border-gray-200">{session.status}</Badge>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Expires: {new Date(session.expires_at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => terminateSession(session.session_id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Infrastructure Info */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Card className="bg-gray-50 border-dashed">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                                <Cloud className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-zinc-900">Infrastructure</h3>
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500">Platform</p>
                                            <p className="font-medium">GKE Autopilot</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Region</p>
                                            <p className="font-medium">asia-south1</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Nexus Engine</p>
                                            <p className="font-medium text-green-600">● Online</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">API Endpoint</p>
                                            <p className="font-mono text-xs">172.235.15.209:8081</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </Layout>
    );
};

export default AdminNexus;
