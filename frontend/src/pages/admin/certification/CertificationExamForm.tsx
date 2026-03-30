import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API, toast } from '../../../App';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PoolSelector } from './PoolSelector';

interface Challenge {
    id: string;
    title: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    points: number;
    category: string;
}

interface LMSExam {
    id: string;
    title: string;
    description: string;
}

interface PoolData {
    challengeIds: string[];
}

const CertificationExamForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [availableChallenges, setAvailableChallenges] = useState<Challenge[]>([]);
    const [lmsExams, setLmsExams] = useState<LMSExam[]>([]);

    const [formData, setFormData] = useState({
        lmsFinalExamId: '',
        poolA: [] as string[],
        poolB: [] as string[],
        poolC: [] as string[],
        isPublished: false
    });

    useEffect(() => {
        fetchAvailableChallenges();
        fetchLMSExams();
        if (isEditMode) {
            fetchExamData();
        }
    }, [id]);

    const fetchAvailableChallenges = async () => {
        try {
            const response = await axios.get(`${API}/admin/certification-exams/available-challenges`);
            const data = response.data || {};
            const merged = [
                ...(data.easy || []),
                ...(data.medium || []),
                ...(data.hard || [])
            ];
            setAvailableChallenges(merged);
        } catch (error: any) {
            const message = error?.response?.data?.detail || error?.response?.data?.message || 'Failed to load challenges';
            toast(message, 'error');
            console.error(error);
        }
    };

    const fetchLMSExams = async () => {
        try {
            const response = await axios.get(`${API}/admin/certification-exams/lms-final-exams`);
            setLmsExams(response.data.final_exams || response.data || []);
        } catch (error: any) {
            toast('Failed to load LMS exams', 'error');
            console.error(error);
        }
    };

    const fetchExamData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/admin/certification-exams/${id}`);
            const exam = response.data;
            setFormData({
                lmsFinalExamId: String(exam.lms_final_exam_id || ''),
                poolA: (exam.pool_a_challenge_ids || exam.pool_a || []).map((c: any) => String(c.challenge_id || c.id || c)),
                poolB: (exam.pool_b_challenge_ids || exam.pool_b || []).map((c: any) => String(c.challenge_id || c.id || c)),
                poolC: (exam.pool_c_challenge_ids || exam.pool_c || []).map((c: any) => String(c.challenge_id || c.id || c)),
                isPublished: exam.is_published
            });
        } catch (error: any) {
            toast('Failed to load exam data', 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const validatePools = (): boolean => {
        const validatePool = (challengeIds: string[]): boolean => {
            if (challengeIds.length === 0) return false;
            const challenges = availableChallenges.filter(c => challengeIds.includes(c.id));
            const totalPoints = challenges.reduce((sum, c) => {
                const pointsMap: Record<string, number> = { EASY: 10, MEDIUM: 20, HARD: 30 };
                return sum + pointsMap[c.difficulty];
            }, 0);
            return totalPoints === 120;
        };

        return validatePool(formData.poolA) && 
               validatePool(formData.poolB) && 
               validatePool(formData.poolC);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.lmsFinalExamId) {
            toast('Please select an LMS Final Exam', 'error');
            return;
        }

        if (!validatePools()) {
            toast('All pools must have at least one challenge totaling 120 points', 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                lms_final_exam_id: formData.lmsFinalExamId,
                pool_a_challenge_ids: formData.poolA,
                pool_b_challenge_ids: formData.poolB,
                pool_c_challenge_ids: formData.poolC,
                is_published: formData.isPublished,
                name: isEditMode
                    ? undefined
                    : formData.lmsFinalExamId
                        ? `ZXCPPT - ${lmsExams.find(exam => exam.id === formData.lmsFinalExamId)?.title || 'Certification Exam'}`
                        : 'ZXCPPT Certification Exam'
            };

            if (isEditMode) {
                await axios.put(`${API}/admin/certification-exams/${id}`, payload);
                toast('Certification exam updated successfully', 'success');
            } else {
                await axios.post(`${API}/admin/certification-exams`, payload);
                toast('Certification exam created successfully', 'success');
            }

            navigate('/admin/certification-exams');
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || 'Failed to save certification exam';
            toast(errorMsg, 'error');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const isFormValid = validatePools() && formData.lmsFinalExamId;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/admin/certification-exams')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Certification Exams
                </button>
                <h1 className="text-3xl font-bold text-gray-900">
                    {isEditMode ? 'Edit Certification Exam' : 'Create Certification Exam'}
                </h1>
                <p className="text-gray-600 mt-2">
                    Configure the three challenge pools for ZXCPPT certification exam
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* LMS Exam Selection */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Link to LMS Final Exam</h2>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Select LMS Final Exam *
                        </label>
                        <select
                            value={formData.lmsFinalExamId}
                            onChange={(e) => setFormData({ ...formData, lmsFinalExamId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                            disabled={isEditMode} // Cannot change LMS exam in edit mode
                        >
                            <option value="">-- Select an LMS Final Exam --</option>
                            {lmsExams.map(exam => (
                                <option key={exam.id} value={exam.id}>
                                    {exam.title} - {exam.description}
                                </option>
                            ))}
                        </select>
                        {isEditMode && (
                            <p className="text-xs text-gray-500">
                                LMS exam cannot be changed after creation
                            </p>
                        )}
                    </div>
                </div>

                {/* Pool A */}
                <div className="bg-white rounded-lg shadow p-6">
                    <PoolSelector
                        poolName="A"
                        selectedChallenges={formData.poolA}
                        availableChallenges={availableChallenges}
                        onChange={(challenges) => setFormData({ ...formData, poolA: challenges })}
                    />
                </div>

                {/* Pool B */}
                <div className="bg-white rounded-lg shadow p-6">
                    <PoolSelector
                        poolName="B"
                        selectedChallenges={formData.poolB}
                        availableChallenges={availableChallenges}
                        onChange={(challenges) => setFormData({ ...formData, poolB: challenges })}
                    />
                </div>

                {/* Pool C */}
                <div className="bg-white rounded-lg shadow p-6">
                    <PoolSelector
                        poolName="C"
                        selectedChallenges={formData.poolC}
                        availableChallenges={availableChallenges}
                        onChange={(challenges) => setFormData({ ...formData, poolC: challenges })}
                    />
                </div>

                {/* Publish Toggle */}
                <div className="bg-white rounded-lg shadow p-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isPublished}
                            onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                            <span className="text-sm font-medium text-gray-900">Publish Exam</span>
                            <p className="text-xs text-gray-500">
                                Published exams are visible to students who have redeemed the exam code
                            </p>
                        </div>
                    </label>
                </div>

                {/* Validation Warning */}
                {!isFormValid && (formData.poolA.length > 0 || formData.poolB.length > 0 || formData.poolC.length > 0) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div className="text-sm text-red-800">
                                <p className="font-semibold mb-1">Cannot save exam:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {!formData.lmsFinalExamId && <li>LMS Final Exam is required</li>}
                                    {!validatePools() && <li>All three pools must total 120 points each</li>}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/certification-exams')}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!isFormValid || saving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isEditMode ? 'Update Exam' : 'Create Exam'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CertificationExamForm;
