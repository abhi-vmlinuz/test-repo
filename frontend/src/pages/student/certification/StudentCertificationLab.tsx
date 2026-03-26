import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API, toast } from '../../../App';
import { ArrowLeft, Clock, Flag, CheckCircle2, XCircle, Loader2, AlertCircle, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Challenge {
    challenge_id: number;
    title: string;
    description: string;
    difficulty: string;
    points: number;
    category: string;
    is_solved: boolean;
    solved_at: string | null;
}

interface LabDetails {
    exam_id: number;
    exam_title: string;
    attempt_id: number;
    status: string;
    challenges: Challenge[];
    lab_score: number;
    total_points: number;
    earned_points: number;
    lab_timer_end: string;
    can_upload_report: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
    EASY: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HARD: 'bg-red-100 text-red-800'
};

const StudentCertificationLab = () => {
    const navigate = useNavigate();
    const { examId } = useParams();
    const [lab, setLab] = useState<LabDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [startingLab, setStartingLab] = useState(false);
    const [submittingFlag, setSubmittingFlag] = useState<number | null>(null);
    const [flagInputs, setFlagInputs] = useState<Record<number, string>>({});
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    useEffect(() => {
        fetchLabDetails();
    }, [examId]);

    useEffect(() => {
        if (lab?.lab_timer_end) {
            const interval = setInterval(() => {
                updateTimer();
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [lab]);

    const fetchLabDetails = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/student/certification-exams/${examId}/lab`);
            setLab(response.data);
        } catch (error: any) {
            if (error.response?.status === 404) {
                // Lab not started yet, need to start it
                setLab(null);
            } else {
                toast.error('Failed to load lab details');
                console.error(error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStartLab = async () => {
        setStartingLab(true);
        try {
            await axios.post(`${API}/student/certification-exams/${examId}/start-lab`);
            toast.success('Lab started! Good luck!');
            await fetchLabDetails();
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || 'Failed to start lab';
            toast.error(errorMsg);
            console.error(error);
        } finally {
            setStartingLab(false);
        }
    };

    const handleSubmitFlag = async (challengeId: number) => {
        const flag = flagInputs[challengeId]?.trim();
        if (!flag) {
            toast.error('Please enter a flag');
            return;
        }

        if (!lab) return;

        setSubmittingFlag(challengeId);
        try {
            const response = await axios.post(
                `${API}/student/certification-exams/attempts/${lab.attempt_id}/submit`,
                {
                    challenge_id: challengeId,
                    flag: flag
                }
            );

            if (response.data.correct) {
                toast.success(`Correct! +${response.data.points} points`);
                setFlagInputs(prev => ({ ...prev, [challengeId]: '' }));
                await fetchLabDetails();
            } else {
                toast.error('Incorrect flag. Try again!');
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || 'Failed to submit flag';
            toast.error(errorMsg);
            console.error(error);
        } finally {
            setSubmittingFlag(null);
        }
    };

    const updateTimer = () => {
        if (!lab?.lab_timer_end) return;
        
        const now = new Date();
        const end = new Date(lab.lab_timer_end);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) {
            setTimeRemaining('Time Expired');
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // Lab not started yet
    if (!lab) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/student/certification-exams')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Certification Exams
                </button>

                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Flag className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Ready to Start Lab?</h1>
                    <p className="text-gray-600 mb-8">
                        You will receive 7 randomly selected challenges from your assigned pool.<br />
                        You have 12 hours to complete as many as possible.<br />
                        The timer starts immediately upon clicking "Start Lab".
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                        <p className="text-sm text-yellow-800">
                            <strong>Important:</strong> Once started, the lab timer cannot be paused or reset.
                            Make sure you have enough time to work on the challenges.
                        </p>
                    </div>
                    <button
                        onClick={handleStartLab}
                        disabled={startingLab}
                        className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg mx-auto disabled:opacity-50"
                    >
                        {startingLab ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Starting Lab...
                            </>
                        ) : (
                            <>
                                <Flag className="w-5 h-5" />
                                Start Lab
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    const isExpired = new Date(lab.lab_timer_end) <= new Date();
    const solvedCount = lab.challenges.filter(c => c.is_solved).length;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/student/certification-exams')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Certification Exams
                </button>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{lab.exam_title}</h1>
                <p className="text-gray-600">Lab Challenges</p>
            </div>

            {/* Stats Bar */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="grid grid-cols-4 gap-6">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Time Remaining</p>
                        <p className={`text-2xl font-bold ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                            <Clock className="inline w-6 h-6 mr-2" />
                            {timeRemaining}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Progress</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {solvedCount} / {lab.challenges.length}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Points</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {lab.earned_points} / {lab.total_points}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Lab Score</p>
                        <p className="text-2xl font-bold text-blue-600">{lab.lab_score}%</p>
                    </div>
                </div>
            </div>

            {/* Report Unlock Notification */}
            {lab.can_upload_report && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-purple-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold text-purple-900 mb-1">
                                Report Upload Unlocked!
                            </p>
                            <p className="text-sm text-purple-800 mb-3">
                                You've reached 80% lab score. You can now upload your penetration testing report.
                            </p>
                            <button
                                onClick={() => navigate(`/student/certification-exams/${examId}/report`)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                            >
                                Upload Report Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expired Warning */}
            {isExpired && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-900 mb-1">Lab Timer Expired</p>
                            <p className="text-sm text-red-800">
                                The 12-hour lab timer has expired. You can no longer submit flags.
                                {lab.can_upload_report 
                                    ? ' Please proceed to upload your report.' 
                                    : ' You did not reach 80% to unlock report upload.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Challenges */}
            <div className="space-y-6">
                {lab.challenges.map((challenge, index) => (
                    <div
                        key={challenge.challenge_id}
                        className={`bg-white rounded-lg shadow-lg p-6 ${
                            challenge.is_solved ? 'border-2 border-green-500' : ''
                        }`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-lg font-mono text-gray-500">#{index + 1}</span>
                                    <h3 className="text-xl font-bold text-gray-900">{challenge.title}</h3>
                                    <Badge className={DIFFICULTY_COLORS[challenge.difficulty]}>
                                        {challenge.difficulty}
                                    </Badge>
                                    <span className="text-sm text-gray-600">{challenge.category}</span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{challenge.description}</p>
                            </div>
                            <div className="flex items-center gap-3 ml-6">
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">Points</p>
                                    <p className="text-2xl font-bold text-gray-900">{challenge.points}</p>
                                </div>
                                {challenge.is_solved ? (
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                ) : (
                                    <XCircle className="w-8 h-8 text-gray-300" />
                                )}
                            </div>
                        </div>

                        {/* Solved Status */}
                        {challenge.is_solved ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-sm text-green-800 font-semibold">
                                    <CheckCircle2 className="inline w-4 h-4 mr-2" />
                                    Solved on {new Date(challenge.solved_at!).toLocaleString()}
                                </p>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={flagInputs[challenge.challenge_id] || ''}
                                    onChange={(e) => setFlagInputs(prev => ({
                                        ...prev,
                                        [challenge.challenge_id]: e.target.value
                                    }))}
                                    placeholder="Enter flag here..."
                                    disabled={isExpired}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSubmitFlag(challenge.challenge_id);
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => handleSubmitFlag(challenge.challenge_id)}
                                    disabled={isExpired || submittingFlag === challenge.challenge_id}
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {submittingFlag === challenge.challenge_id ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Submit
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StudentCertificationLab;
