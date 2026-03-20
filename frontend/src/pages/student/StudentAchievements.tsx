import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Award, Lock, CheckCircle2, Download, Eye, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const StudentAchievements = ({ user }) => {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState(null);

    useEffect(() => {
        fetchEnrollments();
    }, []);

    const fetchEnrollments = async () => {
        try {
            const response = await axios.get(`${API}/student/enrollments`);
            setEnrollments(response.data.enrollments || []);
        } catch (error) {
            console.error('Failed to load enrollments:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-48" />
                    <div className="grid grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-gray-200 rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Achievements</h1>
                <p className="text-gray-500 mt-1">Your certificates and course completions</p>
            </div>

            {enrollments.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {enrollments.map((enrollment) => {
                        const isComplete = enrollment.progress === 100;

                        return (
                            <div
                                key={enrollment.course_id}
                                className={`bg-white rounded-2xl border overflow-hidden transition-all ${isComplete
                                    ? 'border-gray-900 shadow-lg hover:shadow-xl cursor-pointer'
                                    : 'border-gray-200 hover:shadow-md cursor-pointer'
                                    }`}
                                onClick={() => setSelectedCourse(enrollment)}
                            >
                                {/* Course Header */}
                                <div className={`p-6 ${isComplete ? 'bg-gradient-to-r from-gray-800 to-gray-900' : 'bg-gray-100'}`}>
                                    <div className="flex items-start justify-between">
                                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${isComplete ? 'bg-white/20' : 'bg-gray-200'
                                            }`}>
                                            {isComplete ? (
                                                <Award className="w-8 h-8 text-white" />
                                            ) : (
                                                <Lock className="w-8 h-8 text-gray-400" />
                                            )}
                                        </div>
                                        <Badge className={isComplete ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}>
                                            {enrollment.course_code}
                                        </Badge>
                                    </div>
                                    <h3 className={`mt-4 font-bold text-lg ${isComplete ? 'text-white' : 'text-gray-700'}`}>
                                        {enrollment.course_name}
                                    </h3>
                                </div>

                                {/* Progress & Status */}
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm text-gray-500">Progress</span>
                                        <span className="text-sm font-bold text-gray-900">{enrollment.progress || 0}%</span>
                                    </div>
                                    <Progress value={enrollment.progress || 0} className="h-2 mb-4" />

                                    {isComplete ? (
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <CheckCircle2 className="w-5 h-5 text-gray-900" />
                                            <span className="font-medium">Certificate Available</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Lock className="w-4 h-4" />
                                            <span className="text-sm">Complete all challenges to unlock</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 text-center">
                    <Award className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Courses Yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Enroll in courses to start earning certificates
                    </p>
                </div>
            )}

            {/* Certificate Preview Modal */}
            {selectedCourse && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8" onClick={() => setSelectedCourse(null)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Certificate */}
                        <div className={`relative p-12 ${selectedCourse.progress === 100 ? '' : 'filter blur-sm'}`}>
                            {/* Certificate Design */}
                            <div className="border-8 border-gray-900 rounded-xl p-8 bg-gradient-to-br from-gray-50 to-white">
                                <div className="text-center">
                                    {/* ZecurX Logo */}
                                    <div className="flex justify-center mb-6">
                                        <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center">
                                            <Award className="w-8 h-8 text-white" />
                                        </div>
                                    </div>

                                    <p className="text-gray-400 text-sm tracking-widest uppercase mb-4">Certificate of Completion</p>

                                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedCourse.course_name}</h2>
                                    <p className="text-gray-500 mb-8">{selectedCourse.course_code}</p>

                                    <p className="text-gray-600 mb-2">This is to certify that</p>
                                    <p className="text-2xl font-bold text-gray-900 mb-8">{user?.username || 'Student'}</p>

                                    <p className="text-gray-600 mb-8">
                                        has successfully completed all challenges and requirements<br />
                                        for the above certification program.
                                    </p>

                                    <div className="flex justify-center items-center gap-8 text-sm text-gray-500">
                                        <div>
                                            <p className="font-semibold text-gray-900">ZecurX Labs</p>
                                            <p>Cybersecurity Training</p>
                                        </div>
                                        <div className="w-px h-12 bg-gray-200" />
                                        <div>
                                            <p className="font-semibold text-gray-900">{new Date().toLocaleDateString()}</p>
                                            <p>Date of Completion</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Locked Overlay */}
                        {selectedCourse.progress !== 100 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
                                <div className="text-center text-white">
                                    <Lock className="w-16 h-16 mx-auto mb-4 opacity-80" />
                                    <h3 className="text-xl font-bold mb-2">Certificate Locked</h3>
                                    <p className="text-gray-300 mb-4">Complete all challenges to unlock</p>
                                    <div className="bg-white/20 rounded-full px-6 py-2 inline-block">
                                        {selectedCourse.progress || 0}% Complete
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="border-t border-gray-100 p-6 flex justify-between items-center">
                            <Button variant="outline" onClick={() => setSelectedCourse(null)}>
                                Close
                            </Button>
                            {selectedCourse.progress === 100 && (
                                <div className="flex gap-3">
                                    <Button variant="outline">
                                        <Eye className="w-4 h-4 mr-2" /> Preview
                                    </Button>
                                    <Button className="bg-gray-900 hover:bg-gray-800">
                                        <Download className="w-4 h-4 mr-2" /> Download PDF
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentAchievements;
