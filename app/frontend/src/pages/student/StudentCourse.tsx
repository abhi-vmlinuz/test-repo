import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, BookOpen, CheckCircle2, Lock, Trophy, Clock,
    Star, ChevronRight, Target
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const StudentCourse = ({ user }) => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [progress, setProgress] = useState({ overall: 0, modules: {} });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourse();
    }, [courseId]);

    const fetchCourse = async () => {
        try {
            const response = await axios.get(`${API}/student/courses/${courseId}`);
            setCourse(response.data.course);
            setModules(response.data.modules || []);
            setProgress(response.data.progress || { overall: 0, modules: {} });
        } catch (error) {
            toast.error('Failed to load course');
            navigate('/student/courses');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-64" />
                    <div className="h-48 bg-gray-200 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!course) return null;

    // Get course color or default to gray
    const courseColor = course.color || 'gray';
    const colorGradients = {
        gray: 'from-gray-700 to-gray-900',
        blue: 'from-blue-600 to-blue-800',
        purple: 'from-purple-600 to-purple-800',
        green: 'from-green-600 to-green-800',
        red: 'from-red-600 to-red-800',
        orange: 'from-orange-500 to-orange-700',
        indigo: 'from-indigo-600 to-indigo-800',
        teal: 'from-teal-600 to-teal-800'
    };
    const gradient = colorGradients[courseColor] || colorGradients.gray;

    return (
        <div className="p-8">
            {/* Back button */}
            <button
                onClick={() => navigate('/student/courses')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to My Courses
            </button>

            {/* Course Header - Dynamic color theme */}
            <div className={`bg-gradient-to-r ${gradient} rounded-3xl p-8 mb-8`}>
                <div className="flex items-start justify-between">
                    <div>
                        <Badge className="bg-white/20 text-white mb-4">{course.code}</Badge>
                        <h1 className="text-3xl font-bold mb-2 text-white">{course.name}</h1>
                        <p className="text-white/80 max-w-2xl">{course.description}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-bold text-white">{progress.overall}%</div>
                        <p className="text-white/80">Complete</p>
                    </div>
                </div>
                <div className="mt-6">
                    <Progress value={progress.overall} className="h-3 bg-white/20" />
                </div>
                <div className="flex items-center gap-8 mt-6 text-sm text-white/80">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-white" />
                        <span className="text-white">{modules.length} Modules</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-white" />
                        <span className="text-white">{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-white" />
                        <span className="text-white">{course.total_points} points</span>
                    </div>
                </div>
            </div>

            {/* Modules List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Modules</h2>

                {modules.map((module, idx) => {
                    const modProgress = progress.modules[module.id] || { percentage: 0, started: false, completed: false };
                    const isLocked = idx > 0 && !progress.modules[modules[idx - 1]?.id]?.started;

                    return (
                        <div
                            key={module.id}
                            className={`bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all ${isLocked ? 'opacity-60' : 'hover:shadow-md cursor-pointer'
                                }`}
                            onClick={() => !isLocked && navigate(`/student/module/${module.id}`)}
                        >
                            <div className="p-6 flex items-center gap-6">
                                {/* Module Number */}
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg ${modProgress.completed
                                    ? 'bg-gray-900 text-white'
                                    : modProgress.started
                                        ? 'bg-gray-200 text-gray-700'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {modProgress.completed ? <CheckCircle2 className="w-6 h-6" /> : idx + 1}
                                </div>

                                {/* Module Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-semibold text-gray-900">{module.name}</h3>
                                        {module.has_capstone && (
                                            <Badge className="bg-gray-200 text-gray-700">
                                                <Star className="w-3 h-3 mr-1" /> Capstone
                                            </Badge>
                                        )}
                                        {isLocked && (
                                            <Badge variant="outline" className="text-gray-400 border-gray-200">
                                                <Lock className="w-3 h-3 mr-1" /> Locked
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">{module.description}</p>
                                    <div className="flex items-center gap-6 mt-3 text-xs text-gray-400">
                                        <span>{module.topics_count} topics</span>
                                        <span>{module.challenges_count} challenges</span>
                                        <span>{module.points} pts</span>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="w-32 text-right">
                                    {!isLocked && (
                                        <>
                                            <div className="text-sm font-semibold text-gray-900 mb-1">
                                                {modProgress.percentage}%
                                            </div>
                                            <Progress value={modProgress.percentage} className="h-2" />
                                        </>
                                    )}
                                </div>

                                {!isLocked && (
                                    <ChevronRight className="w-5 h-5 text-gray-300" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentCourse;
