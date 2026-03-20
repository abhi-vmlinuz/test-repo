import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { BookOpen, Trophy, Target, Clock, CheckCircle2, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const StudentProgress = ({ user }) => {
    const [stats, setStats] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProgressData();
    }, []);

    const fetchProgressData = async () => {
        try {
            const [statsRes, enrollmentsRes] = await Promise.allSettled([
                axios.get(`${API}/student/stats`),
                axios.get(`${API}/student/enrollments`)
            ]);
            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data);
            }
            if (enrollmentsRes.status === 'fulfilled') {
                setEnrollments(enrollmentsRes.value.data.enrollments || []);
            }
        } catch (error) {
            console.error('Failed to load progress data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center gap-4 py-20">
                <div className="w-12 h-12 bg-zinc-900 rounded-xl animate-spin" />
                <p className="text-gray-500 font-mono text-sm">Loading Progress...</p>
            </div>
        );
    }

    // Calculate overall statistics
    const totalModules = enrollments.reduce((acc, curr) => acc + (curr.modules_count || 0), 0);
    const completedModules = enrollments.reduce((acc, curr) => {
        const completed = Math.round((curr.progress / 100) * (curr.modules_count || 0));
        return acc + completed;
    }, 0);
    const overallProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-8 h-8" />
                    Learning Progress
                </h1>
                <p className="text-gray-500 mt-2">Track your detailed performance and course completion.</p>
            </div>

            {/* Overall Progress Section */}
            <Card className="bg-zinc-900 text-white border-zinc-800">
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1 space-y-4">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">Overall Completion</h2>
                                <p className="text-zinc-400">You have completed {completedModules} out of {totalModules} modules across {enrollments.length} courses.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>Total Progress</span>
                                    <span>{overallProgress}%</span>
                                </div>
                                <Progress value={overallProgress} className="h-4 bg-zinc-800" indicatorClassName="bg-emerald-500" />
                            </div>
                        </div>
                        <div className="flex gap-8 text-center">
                            <div>
                                <div className="text-3xl font-bold text-emerald-400">{stats?.challenges_solved || 0}</div>
                                <div className="text-sm text-zinc-400 mt-1">Challenges Solved</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-blue-400">{stats?.total_points || 0}</div>
                                <div className="text-sm text-zinc-400 mt-1">Total Points</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-orange-400">{stats?.streak || 0}</div>
                                <div className="text-sm text-zinc-400 mt-1">Day Streak</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Course Progress */}
            <div className="grid lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Course Breakdown
                    </h2>
                    <div className="space-y-4">
                        {enrollments.map((enrollment, idx) => (
                            <motion.div
                                key={enrollment.course_id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-zinc-900">{enrollment.course_name}</h3>
                                                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                                    <Calendar className="w-4 h-4" />
                                                    Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {enrollment.progress === 100 ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">
                                                    Completed
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-zinc-600">
                                                    In Progress
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <div className="text-gray-500 mb-1">Modules</div>
                                                    <div className="font-semibold text-zinc-900">
                                                        {Math.round((enrollment.progress / 100) * enrollment.modules_count)} / {enrollment.modules_count}
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <div className="text-gray-500 mb-1">Status</div>
                                                    <div className="font-semibold text-zinc-900">
                                                        {enrollment.progress === 100 ? 'Done' : 'Active'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-medium text-gray-500">
                                                    <span>Completion</span>
                                                    <span>{enrollment.progress || 0}%</span>
                                                </div>
                                                <Progress value={enrollment.progress || 0} className="h-2" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Recent Activity
                    </h2>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">History Log</CardTitle>
                            <CardDescription>Your latest actions and achievements</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats?.recent_activity?.length > 0 ? (
                                <div className="space-y-6">
                                    {stats.recent_activity.map((activity, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${activity.type === 'solve' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                {activity.type === 'solve' ? <CheckCircle2 className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-zinc-900">{activity.title}</p>
                                                <p className="text-xs text-gray-500 mt-1">{activity.time_ago}</p>
                                            </div>
                                            {activity.points > 0 && (
                                                <div className="ml-auto font-mono text-xs font-bold text-emerald-600">
                                                    +{activity.points}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No recent activity found.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default StudentProgress;
