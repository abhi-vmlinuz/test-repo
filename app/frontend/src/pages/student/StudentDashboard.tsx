import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { Link } from 'react-router-dom';
import { BookOpen, Trophy, Target, Clock, CheckCircle2, ArrowRight, Flame, Star, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const StudentDashboard = ({ user }) => {
    const [stats, setStats] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, enrollmentsRes] = await Promise.allSettled([
                axios.get(`${API}/student/stats`),
                axios.get(`${API}/student/enrollments`)
            ]);
            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data);
                setRecentActivity(statsRes.value.data.recent_activity || []);
            }
            if (enrollmentsRes.status === 'fulfilled') {
                setEnrollments(enrollmentsRes.value.data.enrollments || []);
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center gap-4 py-20">
                <div className="w-12 h-12 bg-zinc-900 rounded-xl animate-spin" />
                <p className="text-gray-500 font-mono text-sm">Loading Student Portal...</p>
            </div>
        );
    }

    // Stat cards configuration
    const statCards = [
        { label: 'Enrolled Courses', value: stats?.enrolled_courses || 0, icon: BookOpen },
        { label: 'Challenges Solved', value: stats?.challenges_solved || 0, icon: Trophy },
        { label: 'Current Streak', value: `${stats?.streak || 0}d`, icon: Flame },
        { label: 'Total Points', value: stats?.total_points || 0, icon: Star },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">
                    Welcome back, {user?.username}
                </h1>
                <p className="text-sm text-gray-500 font-medium">Continue your cybersecurity learning journey.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <Card className="border border-gray-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-300">
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-1.5 rounded-md bg-zinc-100/50 text-zinc-500">
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</p>
                                    </div>
                                    <div className="text-2xl font-bold text-zinc-900 tracking-tight pl-1">{stat.value}</div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Enrolled Courses */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">
                            Active Courses
                        </h2>
                        <Link to="/student/courses" className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1 group transition-colors">
                            View all <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>

                    {enrollments.length > 0 ? (
                        <div className="space-y-4">
                            {enrollments.slice(0, 3).map((enrollment, idx) => (
                                <motion.div
                                    key={enrollment.course_id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + (idx * 0.1) }}
                                >
                                    <Link to={`/student/course/${enrollment.course_id}`}>
                                        <Card className="hover:border-zinc-300 transition-colors group cursor-pointer border-gray-200">
                                            <CardContent className="p-6">
                                                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                                                    <div className="w-16 h-16 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                                        <BookOpen className="w-8 h-8 text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h3 className="font-bold text-lg text-zinc-900 group-hover:text-blue-600 transition-colors truncate pr-4">
                                                                {enrollment.course_name}
                                                            </h3>
                                                            {enrollment.progress === 100 && (
                                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">Completed</Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                                            <span className="flex items-center gap-2">
                                                                <Target className="w-4 h-4" />
                                                                {enrollment.modules_count} modules
                                                            </span>
                                                            <span className="flex items-center gap-2">
                                                                <Clock className="w-4 h-4" />
                                                                Self-paced
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-xs font-medium text-gray-500">
                                                                <span>Progress</span>
                                                                <span>{enrollment.progress || 0}%</span>
                                                            </div>
                                                            <Progress value={enrollment.progress || 0} className="h-2 bg-gray-100" indicatorClassName="bg-zinc-900" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <Card className="border border-dashed border-gray-200 bg-gray-50/50 shadow-none">
                            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center mb-3 shadow-sm">
                                    <BookOpen className="w-5 h-5 text-gray-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-900 mb-1">No active courses</h3>
                                <p className="text-xs text-gray-500 mb-4 max-w-[200px] leading-relaxed">Select a course from the catalog to start learning.</p>
                                <Button size="sm" variant="outline" className="h-8 text-xs font-medium bg-white hover:bg-gray-50 border-gray-200">
                                    Browse Catalog
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">
                        Activity Log
                    </h2>

                    <Card className="border-gray-200 h-fit">
                        <CardContent className="p-6">
                            {recentActivity.length > 0 ? (
                                <div className="space-y-6">
                                    {recentActivity.slice(0, 5).map((activity, idx) => (
                                        <div key={idx} className="flex gap-4 relative">
                                            {/* Connector Line */}
                                            {idx !== recentActivity.length - 1 && (
                                                <div className="absolute left-4 -ml-px top-8 bottom-[-24px] w-0.5 bg-gray-100" />
                                            )}

                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${activity.type === 'solve' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                {activity.type === 'solve' ? (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                ) : (
                                                    <Target className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                                <p className="text-sm font-medium text-zinc-900 truncate">{activity.title}</p>
                                                <div className="flex items-center justify-between mt-1">
                                                    <p className="text-xs text-gray-500">{activity.time_ago}</p>
                                                    {activity.points && (
                                                        <span className="text-xs font-bold text-emerald-600">+{activity.points} pts</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">No recent activity</p>
                                    <p className="text-xs text-gray-400 mt-1">Complete modules to track progress</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
