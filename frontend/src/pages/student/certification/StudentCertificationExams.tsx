import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, toast } from '../../../App';
import { Clock, PlayCircle, FileText, CheckCircle2, XCircle, AlertCircle, Award, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CertificationExam {
    exam_id: string;
    exam_title: string;
    exam_description: string;
    attempt_id: string | null;
    status: string | null;
    mcq_score: number | null;
    lab_score: number | null;
    report_score: number | null;
    final_score: number | null;
    certification_level: string | null;
    global_timer_end?: string | null;
    lab_timer_end?: string | null;
    report_timer_end?: string | null;
    time_remaining?: {
        global?: number | null;
        lab?: number | null;
        report?: number | null;
    };
    can_start_lab: boolean;
    can_upload_report: boolean;
    created_at: string | null;
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

const StudentCertificationExams = () => {
    const navigate = useNavigate();
    const [exams, setExams] = useState<CertificationExam[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/student/certification-exams`);
            const raw = response.data?.exams || response.data || [];
            const normalized: CertificationExam[] = raw.map((exam: any) => ({
                exam_id: String(exam.exam_id || exam.id || exam.examConfigId || ''),
                exam_title: exam.exam_title || exam.name || exam.exam_name || '',
                exam_description: exam.exam_description || exam.description || '',
                attempt_id: exam.attempt_id ? String(exam.attempt_id) : exam.attemptId ? String(exam.attemptId) : null,
                status: exam.status || null,
                mcq_score: exam.mcq_score ?? exam.components?.mcq?.score ?? null,
                lab_score: exam.lab_score ?? exam.components?.lab?.score ?? null,
                report_score: exam.report_score ?? exam.components?.report?.score ?? null,
                final_score: exam.final_score ?? null,
                certification_level: exam.certification_level ?? exam.certificationLevel ?? null,
                global_timer_end: exam.global_timer_end ?? null,
                lab_timer_end: exam.lab_timer_end ?? null,
                report_timer_end: exam.report_timer_end ?? null,
                time_remaining: exam.time_remaining ?? null,
                can_start_lab: exam.can_start_lab ?? exam.components?.lab?.started === false,
                can_upload_report: exam.can_upload_report ?? exam.components?.report?.unlocked ?? false,
                created_at: exam.created_at || exam.redeemed_at || null,
            }));
            setExams(normalized);
        } catch (error: any) {
            toast.error('Failed to load certification exams');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getTimerStatus = (timerEnd: string | null, secondsRemaining?: number | null): { label: string; color: string; expired: boolean } => {
        if (secondsRemaining != null) {
            if (secondsRemaining <= 0) return { label: 'Expired', color: 'text-red-600', expired: true };
            const hours = Math.floor(secondsRemaining / 3600);
            const minutes = Math.floor((secondsRemaining % 3600) / 60);
            return {
                label: `${hours}h ${minutes}m remaining`,
                color: hours < 6 ? 'text-orange-600' : 'text-green-600',
                expired: false
            };
        }

        if (!timerEnd) return { label: 'Not Started', color: 'text-gray-500', expired: false };

        const now = new Date();
        const end = new Date(timerEnd);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) return { label: 'Expired', color: 'text-red-600', expired: true };
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        return { 
            label: `${hours}h ${minutes}m remaining`, 
            color: hours < 6 ? 'text-orange-600' : 'text-green-600',
            expired: false
        };
    };

    const handleStartLab = (examId: number) => {
        navigate(`/student/certification-exams/${examId}/lab`);
    };

    const handleUploadReport = (examId: number) => {
        navigate(`/student/certification-exams/${examId}/report`);
    };

    const handleViewStatus = (examId: number) => {
        navigate(`/student/certification-exams/${examId}/status`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">ZXCPPT Certification Exams</h1>
                <p className="text-gray-600">
                    Complete MCQ (30%), Lab Challenges (50%), and Report (20%) to earn your certification
                </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <h2 className="text-lg font-semibold text-blue-900 mb-3">Exam Instructions</h2>
                <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start gap-2">
                        <span className="font-bold">1.</span>
                        <span>Complete the MCQ exam in the LMS platform first (30% weight)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-bold">2.</span>
                        <span>Start the Lab when ready - you'll get 7 challenges to solve in 12 hours (50% weight)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-bold">3.</span>
                        <span>Report upload unlocks at 80% lab score - submit within 3 hours (20% weight)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-bold">4.</span>
                        <span>Passing: ≥70% total AND ≥60% lab AND ≥60% report</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="font-bold">5.</span>
                        <span>Certification levels: Associate (70-80%), Professional (80-90%), Elite (90%+)</span>
                    </li>
                </ul>
            </div>

            {/* Exams List */}
            {exams.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No certification exams available</p>
                    <p className="text-sm text-gray-500">Check with your instructor or redeem an exam code in the LMS</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {exams.map(exam => {
                        const globalTimer = getTimerStatus(exam.global_timer_end || null, exam.time_remaining?.global ?? null);
                        const labTimer = getTimerStatus(exam.lab_timer_end || null, exam.time_remaining?.lab ?? null);
                        const reportTimer = getTimerStatus(exam.report_timer_end || null, exam.time_remaining?.report ?? null);
                        
                        return (
                            <div key={exam.exam_id} className="bg-white rounded-lg shadow-lg p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{exam.exam_title}</h2>
                                        <p className="text-gray-600 mb-3">{exam.exam_description}</p>
                                        
                                        {exam.status && (
                                            <div className="flex items-center gap-3">
                                                <Badge className={STATUS_COLORS[exam.status]}>
                                                    {exam.status.replace(/_/g, ' ')}
                                                </Badge>
                                                {exam.certification_level && (
                                                    <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
                                                        {exam.certification_level}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {exam.status === 'PASSED' && (
                                        <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
                                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                                            <span className="text-green-800 font-semibold">PASSED</span>
                                        </div>
                                    )}
                                    
                                    {exam.status === 'FAILED' && (
                                        <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg">
                                            <XCircle className="w-6 h-6 text-red-600" />
                                            <span className="text-red-800 font-semibold">FAILED</span>
                                        </div>
                                    )}
                                </div>

                                {/* Scores */}
                                {exam.status && exam.status !== 'PENDING' && (
                                    <div className="grid grid-cols-4 gap-4 mb-4">
                                        <div className="bg-gray-50 rounded p-3">
                                            <p className="text-xs text-gray-600 mb-1">MCQ (30%)</p>
                                            <p className="text-xl font-bold text-gray-900">
                                                {exam.mcq_score !== null ? `${exam.mcq_score}%` : '-'}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 rounded p-3">
                                            <p className="text-xs text-gray-600 mb-1">Lab (50%)</p>
                                            <p className="text-xl font-bold text-gray-900">
                                                {exam.lab_score !== null ? `${exam.lab_score}%` : '-'}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 rounded p-3">
                                            <p className="text-xs text-gray-600 mb-1">Report (20%)</p>
                                            <p className="text-xl font-bold text-gray-900">
                                                {exam.report_score !== null ? `${exam.report_score}%` : '-'}
                                            </p>
                                        </div>
                                        <div className="bg-blue-50 rounded p-3">
                                            <p className="text-xs text-gray-600 mb-1">Final Score</p>
                                            <p className="text-xl font-bold text-blue-600">
                                                {exam.final_score !== null ? `${exam.final_score}%` : '-'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Timers */}
                                    {(exam.global_timer_end || exam.time_remaining?.global != null) && (
                                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-600 mb-1 flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    Global Window (48h)
                                                </p>
                                                <p className={`font-semibold ${globalTimer.color}`}>
                                                    {globalTimer.label}
                                                </p>
                                            </div>
                                            {exam.lab_timer_end && (
                                                <div>
                                                    <p className="text-gray-600 mb-1 flex items-center gap-2">
                                                        <Clock className="w-4 h-4" />
                                                        Lab Timer (12h)
                                                    </p>
                                                    <p className={`font-semibold ${labTimer.color}`}>
                                                        {labTimer.label}
                                                    </p>
                                                </div>
                                            )}
                                            {exam.report_timer_end && (
                                                <div>
                                                    <p className="text-gray-600 mb-1 flex items-center gap-2">
                                                        <Clock className="w-4 h-4" />
                                                        Report Timer (3h)
                                                    </p>
                                                    <p className={`font-semibold ${reportTimer.color}`}>
                                                        {reportTimer.label}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap gap-3">
                                    {/* Start Lab — MCQ done, lab not started */}
                                    {exam.status === 'MCQ_COMPLETED' && exam.can_start_lab && !globalTimer.expired && (
                                        <button
                                            onClick={() => handleStartLab(exam.exam_id)}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                                        >
                                            <PlayCircle className="w-5 h-5" />
                                            Start Lab Challenges
                                        </button>
                                    )}
                                    
                                    {/* Continue Lab — lab active and timer not expired */}
                                    {exam.status === 'LAB_IN_PROGRESS' && !labTimer.expired && (
                                        <button
                                            onClick={() => handleStartLab(exam.exam_id)}
                                            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                                        >
                                            <PlayCircle className="w-5 h-5" />
                                            Continue Lab
                                        </button>
                                    )}

                                    {/* End Exam — lab in progress, let user finalize */}
                                    {exam.status === 'LAB_IN_PROGRESS' && exam.attempt_id && (
                                        <button
                                            onClick={async () => {
                                                if (!confirm('Are you sure you want to end the exam? This will finalize your lab score.')) return;
                                                try {
                                                    await axios.post(`${API}/student/certification-exams/attempts/${exam.attempt_id}/end-lab`);
                                                    toast.success('Lab finalized! Check your results.');
                                                    fetchExams();
                                                } catch (err: any) {
                                                    toast.error(err.response?.data?.detail || 'Failed to end exam');
                                                }
                                            }}
                                            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                                        >
                                            <AlertCircle className="w-5 h-5" />
                                            End Exam
                                        </button>
                                    )}

                                    {/* Upload Report — always visible once lab started, locked until exam ends + score qualifies */}
                                    {exam.status && ['LAB_IN_PROGRESS', 'LAB_COMPLETED', 'REPORT_UNLOCKED', 'REPORT_UPLOADED', 'GRADING_PENDING'].includes(exam.status) && (
                                        <button
                                            onClick={() => exam.can_upload_report ? handleUploadReport(exam.exam_id) : null}
                                            disabled={!exam.can_upload_report}
                                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold ${
                                                exam.can_upload_report
                                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                            }`}
                                            title={!exam.can_upload_report ? 'End your exam and reach 80% lab score to unlock report upload' : ''}
                                        >
                                            <FileText className="w-5 h-5" />
                                            {exam.status === 'REPORT_UPLOADED' ? 'View Report Status' : 'Upload Report'}
                                        </button>
                                    )}

                                    {/* View Lab Results — expired or completed, report not unlocked */}
                                    {(exam.status === 'LAB_COMPLETED' || (exam.status === 'LAB_IN_PROGRESS' && labTimer.expired)) && !exam.can_upload_report && (
                                        <button
                                            onClick={() => handleViewStatus(exam.exam_id)}
                                            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-semibold"
                                        >
                                            <Award className="w-5 h-5" />
                                            View Lab Results
                                        </button>
                                    )}
                                    
                                    {/* View Status — always available */}
                                    {exam.status && exam.status !== 'PENDING' && (
                                        <button
                                            onClick={() => handleViewStatus(exam.exam_id)}
                                            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                                        >
                                            <Award className="w-5 h-5" />
                                            View Status
                                        </button>
                                    )}
                                </div>

                                {/* Warnings */}
                                {globalTimer.expired && exam.status !== 'PASSED' && exam.status !== 'FAILED' && (
                                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                                        <p className="text-sm text-red-800 font-semibold">
                                            Global timer expired. Your exam has been automatically submitted for grading.
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentCertificationExams;
