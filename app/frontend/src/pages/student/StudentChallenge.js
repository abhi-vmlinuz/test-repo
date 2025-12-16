import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Flag, CheckCircle2, Play, Container, Lightbulb,
    Send, Star, AlertCircle, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

const StudentChallenge = ({ user }) => {
    const { challengeId } = useParams();
    const navigate = useNavigate();
    const [challenge, setChallenge] = useState(null);
    const [progress, setProgress] = useState({ flags_solved: [] });
    const [loading, setLoading] = useState(true);
    const [flagInputs, setFlagInputs] = useState({});
    const [submitting, setSubmitting] = useState(null);
    const [dockerInstance, setDockerInstance] = useState(null);
    const [startingDocker, setStartingDocker] = useState(false);
    const [expandedContext, setExpandedContext] = useState(true);

    useEffect(() => {
        fetchChallenge();
    }, [challengeId]);

    const fetchChallenge = async () => {
        try {
            const response = await axios.get(`${API}/student/challenges/${challengeId}`);
            setChallenge(response.data.challenge);
            setProgress(response.data.progress || { flags_solved: [] });
        } catch (error) {
            toast.error('Failed to load challenge');
            navigate('/student/courses');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitFlag = async (flagIndex) => {
        const flagValue = flagInputs[flagIndex];
        if (!flagValue?.trim()) return;

        setSubmitting(flagIndex);
        try {
            const response = await axios.post(`${API}/student/submit-flag`, {
                challenge_id: challengeId,
                flag_index: flagIndex,
                flag: flagValue
            });

            if (response.data.correct) {
                toast.success(`🎉 Correct! +${response.data.points} points`);
                setProgress(prev => ({
                    ...prev,
                    flags_solved: [...(prev.flags_solved || []), flagIndex]
                }));
                setFlagInputs(prev => ({ ...prev, [flagIndex]: '' }));
                fetchChallenge(); // Refresh to get updated progress
            } else {
                toast.error('Incorrect flag. Try again!');
            }
        } catch (error) {
            toast.error('Failed to submit flag');
        } finally {
            setSubmitting(null);
        }
    };

    const handleStartDocker = async () => {
        if (!challenge.docker_image) return;

        setStartingDocker(true);
        try {
            const response = await axios.post(`${API}/student/docker/start/${challengeId}`);
            setDockerInstance(response.data);
            toast.success('Lab environment started!');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to start lab');
        } finally {
            setStartingDocker(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-64" />
                    <div className="h-64 bg-gray-200 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!challenge) return null;

    const flagsSolved = progress.flags_solved || [];
    const totalFlags = challenge.flags?.length || 2;
    const isComplete = flagsSolved.length >= totalFlags;

    return (
        <div className="p-8 max-w-5xl">
            {/* Back button */}
            <button
                onClick={() => navigate(`/student/module/${challenge.module_id}`)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Module
            </button>

            {/* Challenge Header - Gray theme */}
            <div className={`rounded-3xl p-8 mb-8 ${isComplete
                ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white'
                : 'bg-white border border-gray-100 shadow-sm'
                }`}>
                <div className="flex items-start justify-between">
                    <div>
                        {challenge.is_capstone && (
                            <Badge className={`mb-4 ${isComplete ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                <Star className="w-3 h-3 mr-1" /> Capstone Challenge
                            </Badge>
                        )}
                        <h1 className={`text-3xl font-bold mb-2 ${isComplete ? 'text-white' : 'text-gray-900'}`}>
                            {challenge.title}
                        </h1>
                        <p className={`${isComplete ? 'text-gray-300' : 'text-gray-500'} mb-4`}>
                            {challenge.module_name} • Topic {challenge.topic_number}
                        </p>
                        <div className="flex items-center gap-4">
                            <span className={`text-xl font-bold ${isComplete ? 'text-white' : 'text-gray-900'}`}>
                                {challenge.points} pts
                            </span>
                            <div className="flex gap-2">
                                {[...Array(totalFlags)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-6 h-6 rounded-full flex items-center justify-center ${flagsSolved.includes(i)
                                            ? isComplete ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'
                                            : isComplete ? 'bg-white/30' : 'bg-gray-200'
                                            }`}
                                    >
                                        {flagsSolved.includes(i) && <CheckCircle2 className="w-4 h-4" />}
                                    </div>
                                ))}
                            </div>
                            <span className={`text-sm ${isComplete ? 'text-gray-300' : 'text-gray-400'}`}>
                                {flagsSolved.length}/{totalFlags} flags found
                            </span>
                        </div>
                    </div>
                    {isComplete && (
                        <div className="text-right">
                            <CheckCircle2 className="w-16 h-16 text-white/80" />
                            <p className="text-gray-300 mt-2">Completed!</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Context/Learning Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <button
                            onClick={() => setExpandedContext(!expandedContext)}
                            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-5 h-5 text-gray-500" />
                                <h2 className="text-lg font-semibold text-gray-900">Context & Learning Material</h2>
                            </div>
                            {expandedContext ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                        </button>
                        {expandedContext && (
                            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                                <div className="prose prose-gray max-w-none">
                                    <pre className="whitespace-pre-wrap font-sans text-gray-600 leading-relaxed">
                                        {challenge.context || challenge.description}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Docker Lab */}
                    {challenge.docker_image && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Container className="w-5 h-5 text-gray-400" />
                                <h2 className="text-lg font-semibold text-gray-900">Lab Environment</h2>
                            </div>
                            <p className="text-gray-500 mb-6">Launch the vulnerable environment to practice</p>

                            {!dockerInstance ? (
                                <Button
                                    onClick={handleStartDocker}
                                    disabled={startingDocker}
                                    className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-8"
                                >
                                    <Play className="w-5 h-5 mr-2" />
                                    {startingDocker ? 'Starting...' : 'Start Lab'}
                                </Button>
                            ) : (
                                <Alert className="bg-gray-50 border-gray-200">
                                    <AlertDescription className="text-gray-700">
                                        <p className="font-medium">Lab is running!</p>
                                        <p className="text-sm mt-1">
                                            Access: <code className="bg-gray-100 px-2 py-0.5 rounded">{dockerInstance.url || dockerInstance.container_id}</code>
                                        </p>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    {/* Flag Submissions */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Flag className="w-5 h-5 text-gray-500" />
                            <h2 className="text-lg font-semibold text-gray-900">Submit Flags</h2>
                        </div>

                        <div className="space-y-6">
                            {challenge.flags?.map((flag, idx) => {
                                const isSolved = flagsSolved.includes(idx);

                                return (
                                    <div
                                        key={idx}
                                        className={`p-6 rounded-xl border ${isSolved
                                            ? 'bg-gray-100 border-gray-200'
                                            : 'bg-gray-50 border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${isSolved ? 'bg-gray-900 text-white' : 'bg-gray-300 text-white'
                                                        }`}>
                                                        {idx + 1}
                                                    </span>
                                                    <h3 className={`font-semibold ${isSolved ? 'text-gray-700' : 'text-gray-900'}`}>
                                                        Flag {idx + 1}
                                                    </h3>
                                                    {isSolved && (
                                                        <Badge className="bg-gray-200 text-gray-700">Solved</Badge>
                                                    )}
                                                </div>
                                                <p className={`text-sm ${isSolved ? 'text-gray-500' : 'text-gray-500'}`}>
                                                    {flag.description}
                                                </p>
                                                <p className="text-sm text-gray-400 mt-1">{flag.points} points</p>
                                            </div>
                                        </div>

                                        {!isSolved && (
                                            <div className="flex gap-3">
                                                <Input
                                                    placeholder="Enter flag..."
                                                    value={flagInputs[idx] || ''}
                                                    onChange={(e) => setFlagInputs(prev => ({ ...prev, [idx]: e.target.value }))}
                                                    className="flex-1 font-mono"
                                                />
                                                <Button
                                                    onClick={() => handleSubmitFlag(idx)}
                                                    disabled={submitting === idx || !flagInputs[idx]?.trim()}
                                                    className="bg-gray-900 hover:bg-gray-800"
                                                >
                                                    {submitting === idx ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Send className="w-4 h-4 mr-2" />
                                                            Submit
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Hints */}
                    {challenge.hints && challenge.hints.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Lightbulb className="w-5 h-5 text-gray-400" />
                                <h2 className="text-lg font-semibold text-gray-900">Hints</h2>
                            </div>
                            <div className="space-y-3">
                                {challenge.hints.map((hint, idx) => (
                                    <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="text-sm text-gray-600">{hint.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Challenge Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Challenge Info</h2>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Total Points</span>
                                <span className="font-semibold text-gray-900">{challenge.points}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Flags</span>
                                <span className="font-semibold text-gray-900">{totalFlags}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Docker Lab</span>
                                <span className="text-gray-900">{challenge.docker_image ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status</span>
                                <Badge className={isComplete ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600'}>
                                    {isComplete ? 'Completed' : `${flagsSolved.length}/${totalFlags} solved`}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Tips - Gray theme */}
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="w-5 h-5 text-gray-700" />
                            <h3 className="font-semibold text-gray-900">Tips</h3>
                        </div>
                        <ul className="text-sm text-gray-600 space-y-2">
                            <li>• Read the context carefully before starting</li>
                            <li>• Each flag is independent - solve in any order</li>
                            <li>• Check the hints if you're stuck</li>
                            <li>• Flag format is usually ZecurX{'{hash}'}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentChallenge;
