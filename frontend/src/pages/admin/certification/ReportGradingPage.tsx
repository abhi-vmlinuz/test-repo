import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API, toast } from '../../../App';
import { ArrowLeft, Save, Loader2, AlertCircle, Download, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AttemptDetails {
    attempt_id: string;
    exam_id?: string;
    student_id: string;
    student_name: string;
    student_email: string;
    exam_title: string;
    assigned_pool: string;
    status: string;
    mcq_score: number;
    lab_score: number;
    report_filename: string | null;
    report_file_url?: string | null;
    report_uploaded_at: string | null;
}

interface GradingCriteria {
    technical_accuracy: number;
    methodology: number;
    documentation_quality: number;
    completeness: number;
    professionalism: number;
}

const ReportGradingPage = () => {
    const navigate = useNavigate();
    const { attemptId } = useParams();
    const [attempt, setAttempt] = useState<AttemptDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [criteria, setCriteria] = useState<GradingCriteria>({
        technical_accuracy: 0,
        methodology: 0,
        documentation_quality: 0,
        completeness: 0,
        professionalism: 0
    });

    const [comments, setComments] = useState('');

    useEffect(() => {
        fetchAttemptDetails();
    }, [attemptId]);

    const fetchAttemptDetails = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/admin/certification-exams/reports/${attemptId}`);
            const raw = response.data || {};
            const normalized: AttemptDetails = {
                attempt_id: String(raw.attempt_id || raw.id || ''),
                exam_id: raw.exam_id ? String(raw.exam_id) : undefined,
                student_id: String(raw.student_id || raw.user_id || ''),
                student_name: raw.student_name || 'Unknown',
                student_email: raw.student_email || '-',
                exam_title: raw.exam_title || raw.exam_name || 'Certification Exam',
                assigned_pool: raw.assigned_pool || '-',
                status: raw.status || 'REPORT_UPLOADED',
                mcq_score: Number(raw.mcq_score ?? raw.mcq?.score ?? 0),
                lab_score: Number(raw.lab_score ?? raw.lab?.score ?? 0),
                report_filename: raw.report_filename || null,
                report_file_url: raw.report_file_url || raw.report?.file_url || null,
                report_uploaded_at: raw.report_uploaded_at || raw.report?.uploaded_at || null,
            };

            setAttempt(normalized);
        } catch (error: any) {
            toast.error('Failed to load attempt details');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const calculateReportScore = (): number => {
        const total = Object.values(criteria).reduce((sum, val) => sum + val, 0);
        return Math.round((total / 50) * 100); // 5 criteria × 10 points = 50 max, convert to percentage
    };

    const calculateFinalScore = (): number => {
        if (!attempt) return 0;
        const reportScore = calculateReportScore();
        return Math.round((attempt.mcq_score * 0.3) + (attempt.lab_score * 0.5) + (reportScore * 0.2));
    };

    const determineResult = (): { passed: boolean; certLevel: string | null } => {
        if (!attempt) return { passed: false, certLevel: null };
        
        const finalScore = calculateFinalScore();
        const reportScore = calculateReportScore();
        
        const passed = finalScore >= 70 && attempt.lab_score >= 60 && reportScore >= 60;
        
        let certLevel = null;
        if (passed) {
            if (finalScore >= 90) certLevel = 'ELITE';
            else if (finalScore >= 80) certLevel = 'PROFESSIONAL';
            else certLevel = 'ASSOCIATE';
        }
        
        return { passed, certLevel };
    };

    const handleCriteriaChange = (criterion: keyof GradingCriteria, value: number) => {
        setCriteria(prev => ({ ...prev, [criterion]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all criteria are filled
        const allFilled = Object.values(criteria).every(val => val > 0);
        if (!allFilled) {
            toast.error('Please grade all criteria before submitting');
            return;
        }

        setSubmitting(true);
        try {
            await axios.post(`${API}/admin/certification-exams/reports/${attemptId}/grade`, {
                clarity: criteria.technical_accuracy,
                technical: criteria.methodology,
                reproducibility: criteria.documentation_quality,
                impact: criteria.completeness,
                remediation: criteria.professionalism,
                feedback: comments
            });
            
            toast.success('Report graded successfully');
            if (attempt?.exam_id) {
                navigate(`/admin/certification-exams/${attempt.exam_id}/attempts`);
            } else {
                navigate('/admin/certification-exams');
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || 'Failed to grade report';
            toast.error(errorMsg);
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownloadReport = () => {
        if (!attempt?.report_file_url) {
            toast.error('Report file is unavailable');
            return;
        }

        const reportUrl = attempt.report_file_url.startsWith('/')
            ? `${API}${attempt.report_file_url}`
            : attempt.report_file_url;
        window.open(reportUrl, '_blank', 'noopener,noreferrer');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!attempt) {
        return (
            <div className="p-8">
                <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Attempt not found or report not uploaded</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 text-blue-600 hover:text-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const reportScore = calculateReportScore();
    const finalScore = calculateFinalScore();
    const result = determineResult();

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Grade Report</h1>
                <p className="text-gray-600">{attempt.exam_title}</p>
            </div>

            {/* Student Info */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Student Information</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-semibold text-gray-900">{attempt.student_name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold text-gray-900">{attempt.student_email}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Assigned Pool</p>
                        <p className="font-semibold text-gray-900">Pool {attempt.assigned_pool}</p>
                    </div>
                    <div>
                            <p className="text-sm text-gray-600">Report Uploaded</p>
                            <p className="font-semibold text-gray-900">
                                {attempt.report_uploaded_at ? new Date(attempt.report_uploaded_at).toLocaleString() : '-'}
                            </p>
                        </div>
                </div>
            </div>

            {/* Current Scores */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Current Scores</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded p-4">
                        <p className="text-sm text-gray-600 mb-1">MCQ Score (30%)</p>
                        <p className="text-2xl font-bold text-gray-900">{attempt.mcq_score}%</p>
                    </div>
                    <div className="bg-gray-50 rounded p-4">
                        <p className="text-sm text-gray-600 mb-1">Lab Score (50%)</p>
                        <p className="text-2xl font-bold text-gray-900">{attempt.lab_score}%</p>
                    </div>
                    <div className="bg-blue-50 rounded p-4">
                        <p className="text-sm text-gray-600 mb-1">Report Score (20%)</p>
                        <p className="text-2xl font-bold text-blue-600">{reportScore}%</p>
                    </div>
                </div>
            </div>

            {/* Download Report */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Submitted Report</h2>
                        <p className="text-sm text-gray-600">{attempt.report_filename || 'Report file'}</p>
                    </div>
                    <button
                        onClick={handleDownloadReport}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Download className="w-4 h-4" />
                        Download Report
                    </button>
                </div>
            </div>

            {/* Grading Form */}
            <form onSubmit={handleSubmit}>
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Grading Criteria</h2>
                    <p className="text-sm text-gray-600 mb-6">Each criterion is scored out of 10 points</p>
                    
                    <div className="space-y-6">
                        {/* Technical Accuracy */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                1. Technical Accuracy (10 points)
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Correctness of findings, exploit techniques, and technical explanations
                            </p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                                    <button
                                        key={score}
                                        type="button"
                                        onClick={() => handleCriteriaChange('technical_accuracy', score)}
                                        className={`px-4 py-2 rounded border transition-all ${
                                            criteria.technical_accuracy === score
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                                        }`}
                                    >
                                        {score}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Methodology */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                2. Methodology (10 points)
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Clear description of approach, tools used, and step-by-step process
                            </p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                                    <button
                                        key={score}
                                        type="button"
                                        onClick={() => handleCriteriaChange('methodology', score)}
                                        className={`px-4 py-2 rounded border transition-all ${
                                            criteria.methodology === score
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                                        }`}
                                    >
                                        {score}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Documentation Quality */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                3. Documentation Quality (10 points)
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Screenshots, evidence, code snippets, and overall presentation
                            </p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                                    <button
                                        key={score}
                                        type="button"
                                        onClick={() => handleCriteriaChange('documentation_quality', score)}
                                        className={`px-4 py-2 rounded border transition-all ${
                                            criteria.documentation_quality === score
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                                        }`}
                                    >
                                        {score}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Completeness */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                4. Completeness (10 points)
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                All challenges documented, findings explained, remediation suggestions
                            </p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                                    <button
                                        key={score}
                                        type="button"
                                        onClick={() => handleCriteriaChange('completeness', score)}
                                        className={`px-4 py-2 rounded border transition-all ${
                                            criteria.completeness === score
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                                        }`}
                                    >
                                        {score}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Professionalism */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                5. Professionalism (10 points)
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Writing quality, structure, formatting, and overall professionalism
                            </p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                                    <button
                                        key={score}
                                        type="button"
                                        onClick={() => handleCriteriaChange('professionalism', score)}
                                        className={`px-4 py-2 rounded border transition-all ${
                                            criteria.professionalism === score
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                                        }`}
                                    >
                                        {score}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Comments */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Comments (Optional)
                            </label>
                            <textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                rows={4}
                                placeholder="Provide feedback to the student..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Final Score Preview */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Final Result Preview</h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded p-4">
                            <p className="text-sm text-gray-600 mb-2">Final Score</p>
                            <p className="text-4xl font-bold text-gray-900 mb-2">{finalScore}%</p>
                            <div className="flex items-center gap-2">
                                {result.passed ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        <Badge className="bg-green-500">PASSED</Badge>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-5 h-5 text-red-600" />
                                        <Badge className="bg-red-500">FAILED</Badge>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {result.certLevel && (
                            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded p-4">
                                <p className="text-sm text-gray-600 mb-2">Certification Level</p>
                                <p className="text-3xl font-bold text-yellow-800">{result.certLevel}</p>
                            </div>
                        )}
                        
                        {!result.passed && (
                            <div className="bg-red-50 rounded p-4">
                                <p className="text-sm text-red-600 mb-2">Failure Reasons:</p>
                                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                                    {finalScore < 70 && <li>Final score below 70%</li>}
                                    {attempt.lab_score < 60 && <li>Lab score below 60%</li>}
                                    {reportScore < 60 && <li>Report score below 60%</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !Object.values(criteria).every(val => val > 0)}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Submit Grade
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReportGradingPage;
