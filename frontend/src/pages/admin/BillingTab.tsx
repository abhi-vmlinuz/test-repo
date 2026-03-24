import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DollarSign, RefreshCw, Calendar, TrendingUp, TrendingDown,
    BarChart3, Clock, Layers, AlertTriangle, Server, HardDrive, CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';

interface BillingTabProps {
    API: string;
}

const BillingTab = ({ API }: BillingTabProps) => {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any>({ daily_breakdown: [], summary: {} });

    useEffect(() => {
        fetchUsageData();
    }, []);

    const fetchUsageData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/admin/nexus/history`);
            setHistory(res.data);
        } catch (error) {
            console.error('Failed to fetch usage data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fixed monthly costs for Hetzner infrastructure
    const BARE_METAL_COST = 38.83; // EUR converted to USD ~$44
    const VPS_COST = 5.16; // EUR converted to USD
    const TOTAL_MONTHLY_COST = 44.00; // USD

    const dailyData = (history?.daily_breakdown || []).map((d: any) => ({
        ...d,
        shortDate: d.date?.split(' ').slice(1).join(' ') || d.date,
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin" />
                    <p className="text-gray-500">Loading infrastructure billing...</p>
                    <p className="text-xs text-gray-400 mt-1">Hetzner Bare Metal + VPS</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                        Infrastructure Costs
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Fixed Hetzner billing • Bare Metal + VPS
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={fetchUsageData} variant="outline" size="sm" disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Fixed Cost Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border border-gray-200 bg-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Bare Metal Server</p>
                                    <p className="text-2xl font-bold text-zinc-900 mt-1">€38.83</p>
                                    <p className="text-xs text-gray-400 mt-1">Hetzner AX41-NVMe</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Server className="w-6 h-6 text-blue-600" />
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
                                    <p className="text-sm font-medium text-gray-500">VPS Server</p>
                                    <p className="text-2xl font-bold text-zinc-900 mt-1">€5.16</p>
                                    <p className="text-xs text-gray-400 mt-1">Nexus Engine Host</p>
                                </div>
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                    <HardDrive className="w-6 h-6 text-indigo-600" />
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
                                    <p className="text-sm font-medium text-gray-500">Total Monthly</p>
                                    <p className="text-2xl font-bold text-emerald-600 mt-1">${TOTAL_MONTHLY_COST}</p>
                                    <p className="text-xs text-gray-400 mt-1">Fixed cost</p>
                                </div>
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-emerald-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Session Usage Chart */}
            {dailyData.length > 0 && (
                <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-gray-50 bg-gray-50">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-wider">
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                            Session Usage (Last 7 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyData}>
                                    <defs>
                                        <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
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
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            fontSize: '12px'
                                        }}
                                        formatter={(value: any) => [value, 'Sessions']}
                                        labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="sessions"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorSessions)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-3 gap-8">
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Sessions</p>
                                <p className="text-xl font-bold text-gray-900 mt-1">{history.summary?.total_sessions || 0}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Hours</p>
                                <p className="text-xl font-bold text-blue-600 mt-1">{(history.summary?.total_hours || 0).toFixed(1)}h</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Unique Users</p>
                                <p className="text-xl font-bold text-emerald-600 mt-1">{history.summary?.unique_users || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Infrastructure Details */}
            <Card className="border border-gray-200 bg-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-wider">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        Infrastructure Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-zinc-900">Bare Metal Server</h4>
                                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                                    €38.83/month
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                                • Hetzner AX41-NVMe (Helsinki datacenter)<br/>
                                • 6 cores, 64GB RAM, 2x 512GB NVMe<br/>
                                • IP: 65.109.20.25<br/>
                                • Runs K3s cluster with challenge pods
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-zinc-900">VPS Server</h4>
                                <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50">
                                    €5.16/month
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                                • Hetzner VPS (Germany)<br/>
                                • Hosts Nexus Engine API<br/>
                                • IP: 65.21.191.184:8081<br/>
                                • Manages pod lifecycle and VPN configs
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Last Updated Footer */}
            <div className="flex items-center justify-between text-xs text-gray-400 py-2">
                <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Last updated: {new Date().toLocaleString()}
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    Fixed Monthly Billing
                </div>
            </div>
        </div>
    );
};

export default BillingTab;
