import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Trophy, Users, ArrowRight, Star, Plus, Key, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Color gradient mapping
const colorGradients = {
    gray: 'from-gray-700 via-gray-800 to-gray-900',
    blue: 'from-blue-500 via-blue-600 to-blue-800',
    purple: 'from-purple-500 via-purple-600 to-purple-800',
    green: 'from-green-500 via-green-600 to-green-800',
    red: 'from-red-500 via-red-600 to-red-800',
    orange: 'from-orange-400 via-orange-500 to-orange-700',
    indigo: 'from-indigo-500 via-indigo-600 to-indigo-800',
    teal: 'from-teal-500 via-teal-600 to-teal-800',
    pink: 'from-pink-500 via-pink-600 to-pink-800',
    cyan: 'from-cyan-500 via-cyan-600 to-cyan-800'
};

const StudentCourses = ({ user }) => {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [enrollmentCode, setEnrollmentCode] = useState('');
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        fetchEnrollments();
    }, []);

    const fetchEnrollments = async () => {
        try {
            const response = await axios.get(`${API}/student/enrollments`);
            setEnrollments(response.data.enrollments || []);
        } catch (error) {
            toast.error('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinCourse = async () => {
        if (!enrollmentCode.trim()) {
            toast.error('Please enter an enrollment code');
            return;
        }

        setJoining(true);
        try {
            const response = await axios.post(`${API}/student/join-course`, {
                enrollment_code: enrollmentCode.toUpperCase()
            });
            toast.success(`Successfully enrolled in ${response.data.course_name}!`);
            setShowJoinModal(false);
            setEnrollmentCode('');
            fetchEnrollments();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Invalid enrollment code');
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-48" />
                    <div className="grid gap-6">
                        {[1, 2].map(i => (
                            <div key={i} className="h-48 bg-gray-200 rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
                    <p className="text-gray-500 mt-1">Your enrolled cybersecurity training programs</p>
                </div>
                <Button onClick={() => setShowJoinModal(true)} className="bg-gray-900 hover:bg-gray-800">
                    <Plus className="w-4 h-4 mr-2" /> Join Course
                </Button>
            </div>

            {enrollments.length > 0 ? (
                <div className="space-y-6">
                    {enrollments.map((enrollment) => {
                        // Get course color or default to gray
                        const courseColor = enrollment.color || 'gray';
                        const gradient = colorGradients[courseColor] || colorGradients.gray;

                        return (
                            <Link
                                key={enrollment.course_id}
                                to={`/student/course/${enrollment.course_id}`}
                                className="block bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
                            >
                                <div className="flex">
                                    {/* Course Image/Gradient - Dynamic color based on course setting */}
                                    <div className={`w-64 bg-gradient-to-br ${gradient} p-8 flex flex-col justify-between`}>
                                        <div>
                                            <Badge className="bg-white/20 text-white mb-4">{enrollment.course_code}</Badge>
                                            <BookOpen className="w-12 h-12 text-white/80" />
                                        </div>
                                        <div className="text-white text-sm">
                                            {enrollment.modules_count} Modules
                                        </div>
                                    </div>

                                    {/* Course Info */}
                                    <div className="flex-1 p-8">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                                                    {enrollment.course_name}
                                                </h2>
                                                <p className="text-gray-500 mt-2 line-clamp-2">{enrollment.course_description}</p>
                                            </div>
                                            <ArrowRight className="w-6 h-6 text-gray-300 group-hover:text-gray-700 group-hover:translate-x-1 transition-all" />
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center gap-8 mb-6 text-sm">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Clock className="w-4 h-4" />
                                                <span>{enrollment.duration || '40+ hours'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Trophy className="w-4 h-4 text-yellow-500" />
                                                <span>{enrollment.total_points || 0} points</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Star className="w-4 h-4 text-purple-500" />
                                                <span>{enrollment.challenges_count || 0} challenges</span>
                                            </div>
                                        </div>

                                        {/* Progress */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-gray-500">Course Progress</span>
                                                <span className="text-sm font-semibold text-gray-900">{enrollment.progress || 0}%</span>
                                            </div>
                                            <Progress value={enrollment.progress || 0} className="h-3" />
                                        </div>

                                        {/* Modules Preview */}
                                        <div className="mt-6 pt-6 border-t border-gray-100">
                                            <p className="text-sm text-gray-400 mb-3">Modules</p>
                                            <div className="flex gap-2 flex-wrap">
                                                {(enrollment.modules_preview || []).slice(0, 4).map((mod, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant="outline"
                                                        className={`${mod.completed
                                                                ? 'border-gray-400 text-gray-700 bg-gray-100'
                                                                : mod.started
                                                                    ? 'border-gray-300 text-gray-600 bg-gray-50'
                                                                    : 'border-gray-200 text-gray-500'
                                                            }`}
                                                    >
                                                        {mod.name}
                                                    </Badge>
                                                ))}
                                                {(enrollment.modules_count || 0) > 4 && (
                                                    <Badge variant="outline" className="border-gray-200 text-gray-400">
                                                        +{enrollment.modules_count - 4} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 text-center">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Courses Enrolled</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        You haven't joined any courses yet. Enter your enrollment code to get started.
                    </p>
                    <Button onClick={() => setShowJoinModal(true)} className="bg-gray-900 hover:bg-gray-800">
                        <Key className="w-4 h-4 mr-2" /> Join Now
                    </Button>
                </div>
            )}

            {/* Join Course Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
                    <div className="bg-white rounded-2xl w-full max-w-md">
                        <div className="border-b border-gray-100 p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                                    <Key className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Join a Course</h2>
                            </div>
                            <button onClick={() => setShowJoinModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-500 mb-6">
                                Enter the enrollment code provided by your administrator to join a course.
                            </p>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Enrollment Code</label>
                                <Input
                                    value={enrollmentCode}
                                    onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
                                    placeholder="Enter code (e.g., ABC12345)"
                                    className="text-center font-mono text-lg tracking-widest h-14"
                                    maxLength={10}
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setShowJoinModal(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleJoinCourse}
                                    disabled={joining || !enrollmentCode.trim()}
                                    className="flex-1 bg-gray-900 hover:bg-gray-800"
                                >
                                    {joining ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Key className="w-4 h-4 mr-2" /> Join Course
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentCourses;
