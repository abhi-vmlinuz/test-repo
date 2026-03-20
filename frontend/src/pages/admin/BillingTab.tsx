import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DollarSign, RefreshCw, Calendar, TrendingUp, TrendingDown,
    BarChart3, Clock, Layers, AlertTriangle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

interface BillingTabProps {
    API: string;
}

interface BillingReport {
    summary: {
        total_cost: number;
        total_credits: number;
        net_cost: number;
        currency: string;
        period_start: string;
        period_end: string;
        days_in_period: number;
        avg_daily_cost: number;
        projected_monthly: number;
    };
    daily_breakdown: Array<{
        date: string;
        cost: number;
        credits: number;
        net_cost: number;
    }>;
    service_breakdown: Array<{
        service: string;
        cost: number;
        percentage: number;
    }>;
    top_skus: Array<{
        sku: string;
        service: string;
        cost: number;
        usage_amount: number;
        usage_unit: string;
    }>;
    last_updated: string;
    error?: string;
}

const SERVICE_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#e11d48', '#9333ea', '#0ea5e9', '#22c55e'
];

const BillingTab = ({ API }: BillingTabProps) => {
    const [report, setReport] = useState<BillingReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchBillingData();
    }, [days]);

    const fetchBillingData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API}/admin/nexus/bigquery-billing`, {
                params: { days }
            });
            if (res.data?.error) {
                setError(res.data.error);
                setReport(res.data);
            } else {
                setReport(res.data);
            }
        } catch (err: any) {
            setError('Failed to fetch billing data');
            console.error('Billing fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number, decimals = 2) => {
        const symbol = report?.summary?.currency === 'INR' ? '₹' : '$';
        if (Math.abs(value) < 0.01) return `${symbol}${value.toFixed(4)}`;
        return `${symbol}${value.toFixed(decimals)}`;
    };

    const periodOptions = [
        { label: '7D', value: 7 },
        { label: '14D', value: 14 },
        { label: '30D', value: 30 },
        { label: '60D', value: 60 },
        { label: '90D', value: 90 },
    ];

    const summary = report?.summary;
    const dailyData = (report?.daily_breakdown || []).map(d => ({
        ...d,
        shortDate: d.date?.split('-').slice(1).join('/') || d.date,
    }));
    const services = report?.service_breakdown || [];
    const topSKUs = report?.top_skus || [];

    // Calculate cost trend (compare first half vs second half of period)
    const midPoint = Math.floor(dailyData.length / 2);
    const firstHalf = dailyData.slice(0, midPoint);
    const secondHalf = dailyData.slice(midPoint);
    const firstHalfAvg = firstHalf.length > 0
        ? firstHalf.reduce((sum, d) => sum + d.net_cost, 0) / firstHalf.length
        : 0;
    const secondHalfAvg = secondHalf.length > 0
        ? secondHalf.reduce((sum, d) => sum + d.net_cost, 0) / secondHalf.length
        : 0;
    const costTrend = firstHalfAvg > 0
        ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
        : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400">Loading BigQuery billing data...</p>
                    <p className="text-xs text-gray-400 mt-1">Querying GCP cost export</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Period Selection */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                        GCP Cost Analytics
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Real billing data from BigQuery • Project: zecurx-nexus
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                        {periodOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setDays(opt.value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${days === opt.value
                                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 shadow-sm dark:shadow-none'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <Button onClick={fetchBillingData} variant="outline" size="sm" disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-800">BigQuery billing unavailable</p>
                        <p className="text-sm text-amber-600 mt-0.5">{error}</p>
                        <p className="text-xs text-amber-500 mt-1">
                            Ensure the Nexus Engine has GOOGLE_APPLICATION_CREDENTIALS configured.
                        </p>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            {summary && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cost</p>
                                        <p className="text-3xl font-bold text-zinc-900 mt-1">
                                            {formatCurrency(summary.total_cost)}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {summary.period_start} → {summary.period_end}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <DollarSign className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Credits Applied</p>
                                        <p className="text-3xl font-bold text-emerald-600 mt-1">
                                            {formatCurrency(Math.abs(summary.total_credits))}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Net: {formatCurrency(summary.net_cost)}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                        <TrendingDown className="w-6 h-6 text-emerald-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Daily Cost</p>
                                        <p className="text-3xl font-bold text-zinc-900 mt-1">
                                            {formatCurrency(summary.avg_daily_cost)}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1">
                                            {costTrend > 0 ? (
                                                <ArrowUpRight className="w-3 h-3 text-red-500" />
                                            ) : (
                                                <ArrowDownRight className="w-3 h-3 text-emerald-500" />
                                            )}
                                            <span className={`text-xs font-medium ${costTrend > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {Math.abs(costTrend).toFixed(1)}% vs prior
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                        <BarChart3 className="w-6 h-6 text-amber-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Projection</p>
                                        <p className="text-3xl font-bold text-zinc-900 mt-1">
                                            {formatCurrency(summary.projected_monthly)}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Based on {days}-day avg
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-indigo-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            )}

            {/* Daily Cost Chart */}
            {dailyData.length > 0 && (
                <Card className="border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none overflow-hidden">
                    <CardHeader className="border-b border-gray-50 bg-gray-50 dark:bg-zinc-800/50/30">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            Daily Cost Breakdown ({days} Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyData}>
                                    <defs>
                                        <linearGradient id="colorBqCost" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorBqCredits" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="shortDate"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        dy={10}
                                        interval={Math.max(0, Math.floor(dailyData.length / 10))}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        tickFormatter={(v) => `${report?.summary?.currency === 'INR' ? '₹' : '$'}${v.toFixed(0)}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            fontSize: '12px'
                                        }}
                                        formatter={(value: any, name: string) => [
                                            `${report?.summary?.currency === 'INR' ? '₹' : '$'}${Number(value).toFixed(2)}`,
                                            name === 'cost' ? 'Gross Cost' : name === 'credits' ? 'Credits' : 'Net Cost'
                                        ]}
                                        labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="cost"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorBqCost)"
                                        animationDuration={1500}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="net_cost"
                                        stroke="#10b981"
                                        strokeWidth={1.5}
                                        strokeDasharray="4 4"
                                        fillOpacity={0}
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center gap-6 mt-4 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
                                Gross Cost
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-0.5 bg-emerald-500 rounded" style={{ borderBottom: '2px dashed' }}></div>
                                Net Cost (after credits)
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Service Breakdown + Top SKUs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Service Breakdown */}
                {services.length > 0 && (
                    <Card className="border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                <Layers className="w-4 h-4 text-blue-500" />
                                Cost by Service
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-48 mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={services}
                                            dataKey="cost"
                                            nameKey="service"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            animationDuration={1500}
                                        >
                                            {services.map((_entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={SERVICE_COLORS[index % SERVICE_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: any) => [`${report?.summary?.currency === 'INR' ? '₹' : '$'}${Number(value).toFixed(2)}`, 'Cost']}
                                            contentStyle={{
                                                borderRadius: '10px',
                                                border: 'none',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {services.map((svc, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:bg-zinc-800/50">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: SERVICE_COLORS[idx % SERVICE_COLORS.length] }}
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{svc.service}</span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                {svc.percentage.toFixed(1)}%
                                            </Badge>
                                            <span className="text-sm font-semibold text-zinc-900 font-mono w-20 text-right">
                                                {formatCurrency(svc.cost, 4)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Top SKUs */}
                {topSKUs.length > 0 && (
                    <Card className="border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                <BarChart3 className="w-4 h-4 text-amber-500" />
                                Top Cost Items (SKUs)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-56 mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topSKUs.slice(0, 8)} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis
                                            type="number"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            tickFormatter={(v) => `${report?.summary?.currency === 'INR' ? '₹' : '$'}${v.toFixed(0)}`}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="sku"
                                            width={140}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fill: '#64748b' }}
                                            tickFormatter={(v) => v.length > 22 ? v.substring(0, 22) + '...' : v}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '10px',
                                                border: 'none',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                                fontSize: '11px'
                                            }}
                                            formatter={(value: any, _name: string, props: any) => [
                                                `${report?.summary?.currency === 'INR' ? '₹' : '$'}${Number(value).toFixed(2)}`,
                                                props.payload.service
                                            ]}
                                        />
                                        <Bar dataKey="cost" radius={[0, 4, 4, 0]} animationDuration={1500}>
                                            {topSKUs.slice(0, 8).map((_entry, index) => (
                                                <Cell
                                                    key={`bar-${index}`}
                                                    fill={SERVICE_COLORS[index % SERVICE_COLORS.length]}
                                                    fillOpacity={0.85}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* SKU Table */}
                            <div className="overflow-x-auto max-h-48">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-zinc-700">
                                            <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">SKU</th>
                                            <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Service</th>
                                            <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topSKUs.map((sku, idx) => (
                                            <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 dark:bg-zinc-800/50">
                                                <td className="py-2 px-2 text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={sku.sku}>
                                                    {sku.sku}
                                                </td>
                                                <td className="py-2 px-2 text-gray-500 dark:text-gray-400">{sku.service}</td>
                                                <td className="py-2 px-2 text-right font-mono font-semibold text-zinc-900">
                                                    {formatCurrency(sku.cost, 4)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Last Updated Footer */}
            {report?.last_updated && (
                <div className="flex items-center justify-between text-xs text-gray-400 py-2">
                    <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Last updated: {new Date(report.last_updated).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        BigQuery Live Data
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingTab;
