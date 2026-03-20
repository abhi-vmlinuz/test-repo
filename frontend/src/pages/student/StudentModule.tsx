import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, BookOpen, CheckCircle2, Flag, Star, ChevronRight,
    Target, Lock
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const StudentModule = ({ user }) => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const [module, setModule] = useState(null);
    const [challenges, setChallenges] = useState([]);
    const [progress, setProgress] = useState({ challenges: {}, percentage: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchModule();
    }, [moduleId]);

    const fetchModule = async () => {
        try {
            const response = await axios.get(`${API}/student/modules/${moduleId}`);
            setModule(response.data.module);
            setChallenges(response.data.challenges || []);
            setProgress(response.data.progress || { challenges: {}, percentage: 0 });
        } catch (error) {
            toast.error('Failed to load module');
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

    if (!module) return null;

    // Group challenges by topic
    const topics = challenges.reduce((acc, challenge) => {
        const topicKey = challenge.topic_number || 0;
        if (!acc[topicKey]) {
            acc[topicKey] = {
                number: topicKey,
                name: challenge.topic_name || `Topic ${topicKey}`,
                challenges: []
            };
        }
        acc[topicKey].challenges.push(challenge);
        return acc;
    }, {});

    const regularChallenges = challenges.filter(c => !c.is_capstone);
    const capstoneChallenges = challenges.filter(c => c.is_capstone);

    // Get module/course color or default to gray
    const moduleColor = module.color || 'gray';
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
    const gradient = colorGradients[moduleColor] || colorGradients.gray;

    return (
        <div className="p-8">
            {/* Back button */}
            <button
                onClick={() => navigate(`/student/course/${module.course_id}`)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Course
            </button>

            {/* Module Header - Dynamic color theme with explicit white text */}
            <div className={`bg-gradient-to-r ${gradient} rounded-3xl p-8 mb-8`}>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <Badge className="bg-white/20 text-white">Module {module.order}</Badge>
                            {module.has_capstone && (
                                <Badge className="bg-white/20 text-white">
                                    <Star className="w-3 h-3 mr-1" /> Has Capstone
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-3xl font-bold mb-2 text-white">{module.name}</h1>
                        <p className="text-white/80 max-w-2xl">{module.description}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-bold text-white">{progress.percentage}%</div>
                        <p className="text-white/80">Complete</p>
                    </div>
                </div>
                <div className="mt-6">
                    <Progress value={progress.percentage} className="h-3 bg-white/20" />
                </div>
                <div className="flex items-center gap-8 mt-6 text-sm">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-white" />
                        <span className="text-white">{Object.keys(topics).length} Topics</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-white" />
                        <span className="text-white">{challenges.length} Challenges</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-white" />
                        <span className="text-white">{module.total_points} points</span>
                    </div>
                </div>
            </div>

            {/* Topics & Challenges */}
            <div className="space-y-8">
                {Object.values(topics).filter(t => t.challenges.some(c => !c.is_capstone)).map((topic) => (
                    <div key={topic.number}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-500">
                                {topic.number}
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">{topic.name}</h2>
                        </div>

                        <div className="space-y-3">
                            {topic.challenges.filter(c => !c.is_capstone).map((challenge) => {
                                const challengeProgress = progress.challenges[challenge.id] || {};
                                const flagsSolved = challengeProgress.flags_solved?.length || 0;
                                const totalFlags = challenge.flags_count || 2;
                                const isComplete = challengeProgress.completed;

                                return (
                                    <Link
                                        key={challenge.id}
                                        to={`/student/challenge/${challenge.id}`}
                                        className={`block bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-all ${isComplete ? 'bg-gray-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete
                                                ? 'bg-gray-900 text-white'
                                                : flagsSolved > 0
                                                    ? 'bg-gray-200 text-gray-700'
                                                    : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Flag className="w-5 h-5" />}
                                            </div>

                                            <div className="flex-1">
                                                <h3 className={`font-medium ${isComplete ? 'text-gray-500' : 'text-gray-900'}`}>
                                                    {challenge.title}
                                                </h3>
                                                <p className="text-sm text-gray-400">{challenge.short_description}</p>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {/* Flag Progress */}
                                                <div className="flex gap-1">
                                                    {[...Array(totalFlags)].map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className={`w-3 h-3 rounded-full ${(challengeProgress.flags_solved || []).includes(i)
                                                                ? 'bg-gray-900'
                                                                : 'bg-gray-200'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>

                                                <span className="text-sm font-semibold text-gray-500 w-16 text-right">
                                                    {challenge.points} pts
                                                </span>

                                                <ChevronRight className="w-5 h-5 text-gray-300" />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Capstone Section */}
                {capstoneChallenges.length > 0 && (
                    <div className="mt-12">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                                <Star className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Capstone Challenge</h2>
                        </div>

                        <div className="space-y-3">
                            {capstoneChallenges.map((challenge) => {
                                const challengeProgress = progress.challenges[challenge.id] || {};
                                const flagsSolved = challengeProgress.flags_solved?.length || 0;
                                const totalFlags = challenge.flags_count || 2;
                                const isComplete = challengeProgress.completed;
                                // Capstone unlocked if regular challenges are mostly complete
                                const isLocked = progress.percentage < 80;

                                return (
                                    <div
                                        key={challenge.id}
                                        className={`bg-white rounded-xl border-2 p-6 transition-all ${isComplete
                                            ? 'border-gray-300 bg-gray-50'
                                            : isLocked
                                                ? 'border-gray-200 opacity-60'
                                                : 'border-gray-900 hover:shadow-md cursor-pointer'
                                            }`}
                                        onClick={() => !isLocked && navigate(`/student/challenge/${challenge.id}`)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isComplete
                                                ? 'bg-gray-900 text-white'
                                                : isLocked
                                                    ? 'bg-gray-200 text-gray-400'
                                                    : 'bg-gray-900 text-white'
                                                }`}>
                                                {isComplete ? <CheckCircle2 className="w-6 h-6" /> :
                                                    isLocked ? <Lock className="w-5 h-5" /> : <Star className="w-6 h-6" />}
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className={`font-semibold ${isComplete ? 'text-gray-500' : 'text-gray-900'}`}>
                                                        {challenge.title}
                                                    </h3>
                                                    <Badge className="bg-gray-100 text-gray-700">Capstone</Badge>
                                                </div>
                                                <p className="text-sm text-gray-400">{challenge.short_description}</p>
                                                {isLocked && (
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        Complete 80% of module challenges to unlock
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {!isLocked && (
                                                    <div className="flex gap-1">
                                                        {[...Array(totalFlags)].map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className={`w-3 h-3 rounded-full ${(challengeProgress.flags_solved || []).includes(i)
                                                                    ? 'bg-gray-900'
                                                                    : 'bg-gray-200'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                <span className="text-sm font-bold text-gray-700 w-16 text-right">
                                                    {challenge.points} pts
                                                </span>

                                                {!isLocked && <ChevronRight className="w-5 h-5 text-gray-400" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentModule;
