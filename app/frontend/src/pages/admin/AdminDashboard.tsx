import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import {
    Users, Flag, FolderOpen, FileText, TrendingUp, Activity,
    Award, CheckCircle2
} from 'lucide-react';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await axios.get(`${API}/admin/dashboard`);
            setStats(response.data);
        } catch (error) {
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-48" />
                    <div className="grid grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const statCards = [
        { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'bg-blue-500' },
        { label: 'Challenges', value: stats?.total_challenges || 0, icon: Flag, color: 'bg-emerald-500' },
        { label: 'Categories', value: stats?.total_categories || 0, icon: FolderOpen, color: 'bg-purple-500' },
        { label: 'Submissions', value: stats?.correct_submissions || 0, icon: CheckCircle2, color: 'bg-amber-500' },
    ];

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-500 mt-1">Platform overview and statistics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                {statCards.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm text-gray-500">{stat.label}</span>
                                <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                        </div>
                    );
                })}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-8">
                {/* Top Users */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Top Users</h2>
                        <Award className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="space-y-4">
                        {stats?.top_users?.length > 0 ? (
                            stats.top_users.map((user, idx) => (
                                <div key={user.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-amber-100 text-amber-600' :
                                            idx === 1 ? 'bg-gray-200 text-gray-600' :
                                                idx === 2 ? 'bg-orange-100 text-orange-600' :
                                                    'bg-gray-100 text-gray-500'
                                            }`}>
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-gray-900">{user.username}</p>
                                            <p className="text-xs text-gray-400">{user.email}</p>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-gray-900">{user.score} pts</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-center py-8">No users yet</p>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Solves</h2>
                        <Activity className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="space-y-4">
                        {stats?.recent_solves?.length > 0 ? (
                            stats.recent_solves.map((solve, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        <div>
                                            <p className="font-medium text-gray-900">{solve.username}</p>
                                            <p className="text-xs text-gray-400">solved {solve.challenge_title}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {solve.solved_at ? new Date(solve.solved_at).toLocaleDateString() : '—'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-center py-8">No recent activity</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Stats - Gray gradient to match theme */}
            <div className="mt-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-semibold">Platform Health</h3>
                        <p className="text-gray-400 text-sm mt-1">All systems operational</p>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="text-center">
                            <p className="text-2xl text-white font-bold">{stats?.active_containers || 0}</p>
                            <p className="text-xs text-gray-400">Active Labs</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl text-white font-bold">{stats?.total_submissions || 0}</p>
                            <p className="text-xs text-gray-400">Total Attempts</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl text-white font-bold">
                                {stats?.total_submissions > 0
                                    ? Math.round((stats.correct_submissions / stats.total_submissions) * 100)
                                    : 0}%
                            </p>
                            <p className="text-xs text-gray-400">Success Rate</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
