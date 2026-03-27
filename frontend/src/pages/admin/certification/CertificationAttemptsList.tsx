import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API, toast } from '../../../App';
import { ArrowLeft, Search, Filter, FileText, Loader2, AlertCircle, CheckCircle2, XCircle, Clock, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Attempt {
    attempt_id: number;
    student_id: number;
    student_name: string;
    student_email: string;
    assigned_pool: string;
    status: string;
    mcq_score: number | null;
    lab_score: number | null;
    report_score: number | null;
    final_score: number | null;
    certification_level: string | null;
    global_timer_end: string;
    lab_timer_end: string | null;
    report_timer_end: string | null;
    report_uploaded_at: string | null;
    graded_at: string | null;
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

const CERTIFICATION_COLORS: Record<string, string> = {
    ASSOCIATE: 'bg-bronze-100 text-bronze-800',
    PROFESSIONAL: 'bg-silver-100 text-silver-800',
    ELITE: 'bg-gold-100 text-gold-800'
};

const CertificationAttemptsList = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [examTitle, setExamTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [resettingId, setResettingId] = useState<number | null>(null);

    useEffect(() => {
        fetchAttempts();
    }, [id]);

    const fetchAttempts = async () => {
        setLoading(true);
        try {
            const [attemptsRes, examRes] = await Promise.all([
                axios.get(`${API}/admin/certification-exams/${id}/attempts`),
                axios.get(`${API}/admin/certification-exams/${id}`)
            ]);
            const rawAttempts = attemptsRes.data.attempts || attemptsRes.data || [];
            // Normalize: backend returns `id` but frontend uses `attempt_id`
            const normalized = rawAttempts.map((a: any) => ({
                ...a,
                attempt_id: a.attempt_id || a.id,
                student_id: a.student_id || a.user_id,
                global_timer_end: a.global_timer_end || a.global_expires_at,
                lab_timer_end: a.lab_timer_end || a.lab_expires_at,
                report_timer_end: a.report_timer_end || a.report_expires_at,
                created_at: a.created_at || a.redeemed_at,
                graded_at: a.graded_at || a.report_graded_at,
            }));
            setAttempts(normalized);
            setExamTitle(examRes.data.lms_exam_title || examRes.data.name || '');
        } catch (error: any) {
            toast.error('Failed to load attempts');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (attemptId: number, studentName: string) => {
        if (!confirm(`Reset lab progress for ${studentName}? They will be able to restart the lab from scratch. MCQ score is preserved.`)) return;
        setResettingId(attemptId);
        try {
            await axios.post(`${API}/admin/certification-exams/attempts/${attemptId}/reset`);
            toast.success(`Reset successful — ${studentName} can now restart the lab.`);
            fetchAttempts();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to reset attempt');
        } finally {
            setResettingId(null);
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

    const filteredAttempts = attempts.filter(attempt => {
        const matchesSearch = 
            attempt.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            attempt.student_email.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || attempt.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate(`/admin/certification-exams/${id}`)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Exam Details
                </button>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Attempts</h1>
                <p className="text-gray-600">{examTitle}</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by student name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="MCQ_COMPLETED">MCQ Completed</option>
                            <option value="LAB_IN_PROGRESS">Lab In Progress</option>
                            <option value="LAB_COMPLETED">Lab Completed</option>
                            <option value="REPORT_UNLOCKED">Report Unlocked</option>
                            <option value="REPORT_UPLOADED">Report Uploaded</option>
                            <option value="GRADING_PENDING">Grading Pending</option>
                            <option value="PASSED">Passed</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Attempts List */}
            {filteredAttempts.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                        {searchQuery || statusFilter !== 'all' 
                            ? 'No attempts match your filters' 
                            : 'No student attempts yet'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAttempts.map(attempt => {
                        const globalTimer = getTimerStatus(attempt.global_timer_end);
                        const labTimer = getTimerStatus(attempt.lab_timer_end);
                        const reportTimer = getTimerStatus(attempt.report_timer_end);
                        
                        return (
                            <div key={attempt.attempt_id} className="bg-white rounded-lg shadow p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{attempt.student_name}</h3>
                                        <p className="text-sm text-gray-600">{attempt.student_email}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Started: {new Date(attempt.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={STATUS_COLORS[attempt.status]}>
                                            {attempt.status.replace(/_/g, ' ')}
                                        </Badge>
                                        {attempt.certification_level && (
                                            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
                                                {attempt.certification_level}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Scores */}
                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    <div className="bg-gray-50 rounded p-3">
                                        <p className="text-xs text-gray-600 mb-1">MCQ Score</p>
                                        <p className="text-xl font-bold text-gray-900">
                                            {attempt.mcq_score !== null ? `${attempt.mcq_score}%` : '-'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded p-3">
                                        <p className="text-xs text-gray-600 mb-1">Lab Score</p>
                                        <p className="text-xl font-bold text-gray-900">
                                            {attempt.lab_score !== null ? `${attempt.lab_score}%` : '-'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded p-3">
                                        <p className="text-xs text-gray-600 mb-1">Report Score</p>
                                        <p className="text-xl font-bold text-gray-900">
                                            {attempt.report_score !== null ? `${attempt.report_score}%` : '-'}
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 rounded p-3">
                                        <p className="text-xs text-gray-600 mb-1">Final Score</p>
                                        <p className="text-xl font-bold text-blue-600">
                                            {attempt.final_score !== null ? `${attempt.final_score}%` : '-'}
                                        </p>
                                    </div>
                                </div>

                                {/* Timers */}
                                <div className="flex items-center gap-6 text-sm mb-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-gray-500" />
                                        <span className="text-gray-600">Global:</span>
                                        <span className={globalTimer.color}>{globalTimer.label}</span>
                                    </div>
                                    {attempt.lab_timer_end && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-500" />
                                            <span className="text-gray-600">Lab:</span>
                                            <span className={labTimer.color}>{labTimer.label}</span>
                                        </div>
                                    )}
                                    {attempt.report_timer_end && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-500" />
                                            <span className="text-gray-600">Report:</span>
                                            <span className={reportTimer.color}>{reportTimer.label}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span>Pool: <span className="font-semibold">{attempt.assigned_pool}</span></span>
                                        {attempt.report_uploaded_at && (
                                            <span>Report uploaded: {new Date(attempt.report_uploaded_at).toLocaleString()}</span>
                                        )}
                                        {attempt.graded_at && (
                                            <span>Graded: {new Date(attempt.graded_at).toLocaleString()}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!['PASSED', 'FAILED'].includes(attempt.status) && (
                                            <button
                                                onClick={() => handleReset(attempt.attempt_id, attempt.student_name)}
                                                disabled={resettingId === attempt.attempt_id}
                                                className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 text-sm font-semibold disabled:opacity-50"
                                                title="Reset lab progress — student can restart the lab"
                                            >
                                                {resettingId === attempt.attempt_id
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : <RotateCcw className="w-4 h-4" />}
                                                Reset Lab
                                            </button>
                                        )}
                                        {(attempt.status === 'REPORT_UPLOADED' || attempt.status === 'GRADING_PENDING') && (
                                            <button
                                                onClick={() => navigate(`/admin/certification-exams/grade-report/${attempt.attempt_id}`)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                                            >
                                                <FileText className="w-4 h-4" />
                                                Grade Report
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CertificationAttemptsList;
