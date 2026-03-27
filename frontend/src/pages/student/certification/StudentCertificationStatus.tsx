import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API, toast } from '../../../App';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Award, Loader2, FileText, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AttemptStatus {
    exam_id: number;
    exam_title: string;
    exam_description: string;
    status: string;
    mcq_score: number | null;
    mcq_correct: number | null;
    mcq_wrong: number | null;
    lab_score: number | null;
    earned_points: number | null;
    total_points: number | null;
    report_score: number | null;
    final_score: number | null;
    certification_level: string | null;
    global_timer_end: string;
    lab_timer_end: string | null;
    report_timer_end: string | null;
    report_uploaded_at: string | null;
    graded_at: string | null;
    grader_comments: string | null;
    created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-gray-500',
    MCQ_COMPLETED: 'bg-blue-500',
    LAB_IN_PROGRESS: 'bg-yellow-500',
    LAB_COMPLETED: 'bg-green-500',
    REPORT_UNLOCKED: 'bg-purple-500',
    REPORT_UPLOADED: 'bg-indigo-500',
    GRADING_PENDING: 'bg-orange-500',
    PASSED: 'bg-green-600',
    FAILED: 'bg-red-600'
};

const StudentCertificationStatus = () => {
    const navigate = useNavigate();
    const { examId } = useParams();
    const [status, setStatus] = useState<AttemptStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatus();
    }, [examId]);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/student/certification-exams/${examId}/status`);
            setStatus(response.data);
        } catch (error: any) {
            toast.error('Failed to load exam status');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getTimerStatus = (timerEnd: string | null): { label: string; color: string } => {
        if (!timerEnd) return { label: 'Not Started', color: 'text-gray-500' };
        
        const now = new Date();
        const end = new Date(timerEnd);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) return { label: 'Expired', color: 'text-red-600' };
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        return { 
            label: `${hours}h ${minutes}m remaining`, 
            color: 'text-green-600' 
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!status) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/student/certification-exams')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Certification Exams
                </button>
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <p className="text-gray-600">Unable to load exam status</p>
                </div>
            </div>
        );
    }

    const globalTimer = getTimerStatus(status.global_timer_end);
    const labTimer = getTimerStatus(status.lab_timer_end);
    const reportTimer = getTimerStatus(status.report_timer_end);

    const isPassed = status.status === 'PASSED';
    const isFailed = status.status === 'FAILED';
    const isGraded = isPassed || isFailed;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/student/certification-exams')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Certification Exams
                </button>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{status.exam_title}</h1>
                        <p className="text-gray-600">{status.exam_description}</p>
                    </div>
                    <Badge className={STATUS_COLORS[status.status]}>
                        {status.status.replace(/_/g, ' ')}
                    </Badge>
                </div>
            </div>

            {/* Result Banner */}
            {isPassed && (
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-8 text-white mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <CheckCircle2 className="w-16 h-16" />
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Congratulations!</h2>
                                <p className="text-lg">You passed the ZXCPPT certification exam</p>
                            </div>
                        </div>
                        {status.certification_level && (
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4 text-center">
                                <Award className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-2xl font-bold">{status.certification_level}</p>
                                <p className="text-sm">Certification Level</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isFailed && (
                <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-8 text-white mb-6">
                    <div className="flex items-center gap-4">
                        <XCircle className="w-16 h-16" />
                        <div>
                            <h2 className="text-3xl font-bold mb-2">Not Passed</h2>
                            <p className="text-lg">Unfortunately, you did not meet the passing criteria</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Scores */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Score Breakdown</h2>
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">MCQ Score (30%)</p>
                        <p className="text-3xl font-bold text-gray-900 mb-1">
                            {status.mcq_score !== null ? `${status.mcq_score}%` : '-'}
                        </p>
                        {status.mcq_correct !== null && status.mcq_wrong !== null && (
                            <p className="text-xs text-gray-600">
                                <span className="text-green-600">{status.mcq_correct} correct</span> / 
                                <span className="text-red-600"> {status.mcq_wrong} wrong</span>
                            </p>
                        )}
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">Lab Score (50%)</p>
                        <p className="text-3xl font-bold text-gray-900 mb-1">
                            {status.lab_score !== null ? `${status.lab_score}%` : '-'}
                        </p>
                        {status.earned_points !== null && status.total_points !== null && (
                            <p className="text-xs text-gray-600">
                                {status.earned_points} / {status.total_points} points
                            </p>
                        )}
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">Report Score (20%)</p>
                        <p className="text-3xl font-bold text-gray-900 mb-1">
                            {status.report_score !== null ? `${status.report_score}%` : '-'}
                        </p>
                        {status.report_uploaded_at && (
                            <p className="text-xs text-gray-600">Submitted</p>
                        )}
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">Final Score</p>
                        <p className="text-4xl font-bold text-blue-600">
                            {status.final_score !== null ? `${status.final_score}%` : '-'}
                        </p>
                    </div>
                </div>

                {/* Passing Criteria */}
                {isGraded && (
                    <div className="mt-6 pt-6 border-t">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Passing Criteria:</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                {(status.final_score ?? 0) >= 75 ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span>Final Score ≥ 75%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span>Lab Score: Informational</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span>Report Score: Informational</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Timers */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Timers</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-5 h-5 text-gray-600" />
                            <p className="text-sm font-semibold text-gray-700">Global Window (48h)</p>
                        </div>
                        <p className={`text-lg font-bold ${globalTimer.color}`}>{globalTimer.label}</p>
                        <p className="text-xs text-gray-600 mt-1">
                            Started: {new Date(status.created_at).toLocaleString()}
                        </p>
                    </div>
                    
                    {status.lab_timer_end && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Flag className="w-5 h-5 text-gray-600" />
                                <p className="text-sm font-semibold text-gray-700">Lab Timer (12h)</p>
                            </div>
                            <p className={`text-lg font-bold ${labTimer.color}`}>{labTimer.label}</p>
                        </div>
                    )}
                    
                    {status.report_timer_end && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-5 h-5 text-gray-600" />
                                <p className="text-sm font-semibold text-gray-700">Report Timer (3h)</p>
                            </div>
                            <p className={`text-lg font-bold ${reportTimer.color}`}>{reportTimer.label}</p>
                            {status.report_uploaded_at && (
                                <p className="text-xs text-gray-600 mt-1">
                                    Uploaded: {new Date(status.report_uploaded_at).toLocaleString()}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Grader Comments */}
            {status.grader_comments && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Feedback from Instructor</h2>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-800 whitespace-pre-wrap">{status.grader_comments}</p>
                    </div>
                    {status.graded_at && (
                        <p className="text-sm text-gray-600 mt-3">
                            Graded on: {new Date(status.graded_at).toLocaleString()}
                        </p>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
                {status.status === 'LAB_IN_PROGRESS' && !labTimer.label.includes('Expired') && (
                    <button
                        onClick={() => navigate(`/student/certification-exams/${examId}/lab`)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                        <Flag className="w-5 h-5" />
                        Continue Lab
                    </button>
                )}

                {status.status === 'LAB_IN_PROGRESS' && labTimer.label.includes('Expired') && (
                    <button
                        onClick={() => navigate(`/student/certification-exams/${examId}/lab`)}
                        className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold"
                    >
                        <Flag className="w-5 h-5" />
                        View Lab Results
                    </button>
                )}

                {(status.status === 'REPORT_UNLOCKED' || status.status === 'REPORT_UPLOADED' ||
                  (status.status === 'LAB_COMPLETED' && (status.lab_score ?? 0) >= 80)) && (
                    <button
                        onClick={() => navigate(`/student/certification-exams/${examId}/report`)}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                    >
                        <FileText className="w-5 h-5" />
                        {status.status === 'REPORT_UPLOADED' ? 'View Report Status' : 'Upload Report'}
                    </button>
                )}
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Progress Timeline</h2>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status.mcq_score !== null ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {status.mcq_score !== null ? (
                                <CheckCircle2 className="w-5 h-5 text-white" />
                            ) : (
                                <span className="text-white text-sm font-bold">1</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900">MCQ Exam</p>
                            <p className="text-sm text-gray-600">
                                {status.mcq_score !== null ? `Completed with ${status.mcq_score}%` : 'Not completed'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status.lab_score !== null ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {status.lab_score !== null ? (
                                <CheckCircle2 className="w-5 h-5 text-white" />
                            ) : (
                                <span className="text-white text-sm font-bold">2</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900">Lab Challenges</p>
                            <p className="text-sm text-gray-600">
                                {status.lab_score !== null ? `Completed with ${status.lab_score}%` : 'Not started'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status.report_uploaded_at ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {status.report_uploaded_at ? (
                                <CheckCircle2 className="w-5 h-5 text-white" />
                            ) : (
                                <span className="text-white text-sm font-bold">3</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900">Report Submission</p>
                            <p className="text-sm text-gray-600">
                                {status.report_uploaded_at 
                                    ? `Uploaded on ${new Date(status.report_uploaded_at).toLocaleString()}`
                                    : 'Not uploaded'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isGraded ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {isGraded ? (
                                <CheckCircle2 className="w-5 h-5 text-white" />
                            ) : (
                                <span className="text-white text-sm font-bold">4</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900">Grading</p>
                            <p className="text-sm text-gray-600">
                                {isGraded 
                                    ? `${isPassed ? 'Passed' : 'Failed'} - Graded on ${new Date(status.graded_at!).toLocaleString()}`
                                    : 'Pending'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentCertificationStatus;
