import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API, toast } from '../../../App';
import { ArrowLeft, Edit, Users, Eye, EyeOff, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Challenge {
    challenge_id: number;
    title: string;
    difficulty: string;
    points: number;
    category: string;
}

interface ExamDetails {
    id: number;
    lms_final_exam_id: number;
    lms_exam_title: string;
    lms_exam_description: string;
    is_published: boolean;
    pool_a: Challenge[];
    pool_b: Challenge[];
    pool_c: Challenge[];
    total_attempts: number;
    passed_attempts: number;
    created_at: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
    EASY: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HARD: 'bg-red-100 text-red-800'
};

const POINTS_MAP: Record<string, number> = {
    EASY: 10,
    MEDIUM: 20,
    HARD: 30
};

const CertificationExamDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [exam, setExam] = useState<ExamDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        fetchExamDetails();
    }, [id]);

    const fetchExamDetails = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/admin/certification-exams/${id}`);
            setExam(response.data);
        } catch (error: any) {
            toast('Failed to load exam details', 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePublish = async () => {
        if (!exam) return;
        setToggling(true);
        try {
            await axios.put(`${API}/admin/certification-exams/${id}/publish`, {
                is_published: !exam.is_published
            });
            toast(`Exam ${exam.is_published ? 'unpublished' : 'published'} successfully`, 'success');
            fetchExamDetails();
        } catch (error: any) {
            toast('Failed to update publish status', 'error');
            console.error(error);
        } finally {
            setToggling(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await axios.delete(`${API}/admin/certification-exams/${id}`);
            toast('Exam deleted successfully', 'success');
            navigate('/admin/certification-exams');
        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || 'Failed to delete exam';
            toast(errorMsg, 'error');
            console.error(error);
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const renderPool = (poolName: string, challenges: Challenge[]) => {
        const totalPoints = challenges.reduce((sum, c) => sum + POINTS_MAP[c.difficulty], 0);
        const countByDifficulty = challenges.reduce((acc, c) => {
            acc[c.difficulty] = (acc[c.difficulty] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Pool {poolName}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>{challenges.length} challenges</span>
                        <span>•</span>
                        <span className="font-semibold">{totalPoints} points</span>
                    </div>
                </div>

                {/* Difficulty Breakdown */}
                <div className="flex gap-2 mb-4">
                    {Object.entries(countByDifficulty).map(([diff, count]) => (
                        <Badge key={diff} className={DIFFICULTY_COLORS[diff]}>
                            {count} × {diff}
                        </Badge>
                    ))}
                </div>

                {/* Challenges List */}
                <div className="space-y-2">
                    {challenges.map((challenge, idx) => (
                        <div
                            key={challenge.challenge_id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <span className="text-sm text-gray-500 font-mono">#{idx + 1}</span>
                                <Badge className={DIFFICULTY_COLORS[challenge.difficulty]}>
                                    {challenge.difficulty}
                                </Badge>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{challenge.title}</p>
                                    <p className="text-xs text-gray-500">{challenge.category}</p>
                                </div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                                {POINTS_MAP[challenge.difficulty]} pts
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="p-8">
                <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Exam not found</p>
                    <button
                        onClick={() => navigate('/admin/certification-exams')}
                        className="mt-4 text-blue-600 hover:text-blue-700"
                    >
                        Back to Certification Exams
                    </button>
                </div>
            </div>
        );
    }

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

                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">{exam.lms_exam_title}</h1>
                            <Badge className={exam.is_published ? 'bg-green-500' : 'bg-gray-500'}>
                                {exam.is_published ? 'Published' : 'Draft'}
                            </Badge>
                        </div>
                        <p className="text-gray-600">{exam.lms_exam_description}</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Created on {new Date(exam.created_at).toLocaleDateString()}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate(`/admin/certification-exams/${id}/attempts`)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Users className="w-4 h-4" />
                            View Attempts ({exam.total_attempts})
                        </button>
                        <button
                            onClick={() => navigate(`/admin/certification-exams/edit/${id}`)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <Edit className="w-4 h-4" />
                            Edit
                        </button>
                        <button
                            onClick={handleTogglePublish}
                            disabled={toggling}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            {toggling ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : exam.is_published ? (
                                <EyeOff className="w-4 h-4" />
                            ) : (
                                <Eye className="w-4 h-4" />
                            )}
                            {exam.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm text-gray-600 mb-1">Total Attempts</p>
                    <p className="text-3xl font-bold text-gray-900">{exam.total_attempts}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm text-gray-600 mb-1">Passed</p>
                    <p className="text-3xl font-bold text-green-600">{exam.passed_attempts}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm text-gray-600 mb-1">Pass Rate</p>
                    <p className="text-3xl font-bold text-gray-900">
                        {exam.total_attempts > 0 
                            ? `${Math.round((exam.passed_attempts / exam.total_attempts) * 100)}%`
                            : 'N/A'}
                    </p>
                </div>
            </div>

            {/* Pools */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Challenge Pools</h2>
                {renderPool('A', exam.pool_a)}
                {renderPool('B', exam.pool_b)}
                {renderPool('C', exam.pool_c)}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Certification Exam?</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this exam? This action cannot be undone.
                            {exam.total_attempts > 0 && (
                                <span className="block mt-2 text-red-600 font-semibold">
                                    Warning: This exam has {exam.total_attempts} student attempt(s).
                                </span>
                            )}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleting}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CertificationExamDetails;
