import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Plus, Edit2, Trash2, Search, Eye, EyeOff, Save, X, Container, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const AdminChallenges = () => {
    const [challenges, setChallenges] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category_id: '',
        difficulty: 'easy',
        points: 100,
        has_main_flag: true,  // Toggle for main flag
        flag: '',
        has_docker: false,
        docker_image: '',
        docker_command: '',
        hints: [],
        questions: [], // Multiple questions support
        is_published: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [challengesRes, categoriesRes] = await Promise.all([
                axios.get(`${API}/admin/challenges`),
                axios.get(`${API}/admin/categories`)
            ]);
            setChallenges(challengesRes.data);
            setCategories(categoriesRes.data);
        } catch (error) {
            toast.error('Failed to load challenges');
        } finally {
            setLoading(false);
        }
    };

    const filteredChallenges = challenges.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCategoryName = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat ? cat.name : 'Unknown';
    };

    const getDifficultyStyle = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'bg-emerald-100 text-emerald-700';
            case 'medium': return 'bg-amber-100 text-amber-700';
            case 'hard': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const openCreateModal = () => {
        setEditingChallenge(null);
        setFormData({
            title: '',
            description: '',
            category_id: categories[0]?.id || '',
            difficulty: 'easy',
            points: 100,
            has_main_flag: true,
            flag: '',
            has_docker: false,
            docker_image: '',
            docker_command: '',
            hints: [],
            questions: [],
            is_published: true
        });
        setShowModal(true);
    };

    const openEditModal = (challenge) => {
        setEditingChallenge(challenge);
        setFormData({
            title: challenge.title,
            description: challenge.description,
            category_id: challenge.category_id,
            difficulty: challenge.difficulty,
            points: challenge.points,
            has_main_flag: !!(challenge.flag && challenge.flag.trim()),
            flag: challenge.flag || '',
            has_docker: !!(challenge.docker_image),
            docker_image: challenge.docker_image || '',
            docker_command: challenge.docker_command || '',
            hints: challenge.hints || [],
            questions: challenge.questions || [],
            is_published: challenge.is_published !== false
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prepare data - only include docker fields if has_docker is true
        // Only include flag if has_main_flag is true
        const submitData = {
            ...formData,
            flag: formData.has_main_flag ? formData.flag : '',
            docker_image: formData.has_docker ? formData.docker_image : null,
            docker_command: formData.has_docker ? formData.docker_command : null,
        };
        delete submitData.has_docker;
        delete submitData.has_main_flag;

        try {
            if (editingChallenge) {
                await axios.put(`${API}/admin/challenges/${editingChallenge.id}`, submitData);
                toast.success('Challenge updated');
            } else {
                await axios.post(`${API}/admin/challenges`, submitData);
                toast.success('Challenge created');
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save challenge');
        }
    };

    const handleDelete = async (challenge) => {
        if (!confirm(`Delete "${challenge.title}"? This will also delete all user progress for this challenge.`)) {
            return;
        }
        try {
            await axios.delete(`${API}/admin/challenges/${challenge.id}`);
            toast.success('Challenge deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete challenge');
        }
    };

    // Hints management
    const addHint = () => {
        setFormData(prev => ({
            ...prev,
            hints: [...prev.hints, { text: '', cost: 10 }]
        }));
    };

    const updateHint = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            hints: prev.hints.map((h, i) => i === index ? { ...h, [field]: value } : h)
        }));
    };

    const removeHint = (index) => {
        setFormData(prev => ({
            ...prev,
            hints: prev.hints.filter((_, i) => i !== index)
        }));
    };

    // Questions management (multi-flag support)
    const addQuestion = () => {
        setFormData(prev => ({
            ...prev,
            questions: [...prev.questions, { question: '', flag: '', points: 25 }]
        }));
    };

    const updateQuestion = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) => i === index ? { ...q, [field]: value } : q)
        }));
    };

    const removeQuestion = (index) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-gray-200 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Challenges</h1>
                    <p className="text-gray-500 mt-1">{challenges.length} challenges total</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    New Challenge
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                    type="text"
                    placeholder="Search challenges..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12"
                />
            </div>

            {/* Challenges Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Title</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Category</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Difficulty</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Points</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Docker</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredChallenges.map(challenge => (
                            <tr key={challenge.id} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <p className="font-medium text-gray-900">{challenge.title}</p>
                                    <p className="text-xs text-gray-400 truncate max-w-xs">{challenge.description.substring(0, 50)}...</p>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {getCategoryName(challenge.category_id)}
                                </td>
                                <td className="px-6 py-4">
                                    <Badge className={getDifficultyStyle(challenge.difficulty)}>
                                        {challenge.difficulty}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 font-mono text-gray-900">{challenge.points}</td>
                                <td className="px-6 py-4">
                                    {challenge.docker_image ? (
                                        <span className="flex items-center gap-1 text-indigo-600 text-sm">
                                            <Container className="w-4 h-4" /> Yes
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-sm">No</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {challenge.is_published !== false ? (
                                        <span className="flex items-center gap-1 text-emerald-600 text-sm">
                                            <Eye className="w-4 h-4" /> Published
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-gray-400 text-sm">
                                            <EyeOff className="w-4 h-4" /> Draft
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => openEditModal(challenge)}
                                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(challenge)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredChallenges.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        No challenges found
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingChallenge ? 'Edit Challenge' : 'New Challenge'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <Input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    required
                                    placeholder="SQL Injection Basics"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    required
                                    rows={6}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                    placeholder="A vulnerable login form..."
                                />
                            </div>

                            {/* Category & Difficulty Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                    <select
                                        value={formData.category_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                                        required
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            {/* Points */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Base Points</label>
                                <Input
                                    type="number"
                                    value={formData.points}
                                    onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                                    min={0}
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1">Points awarded for solving the main flag (0 if no main flag)</p>
                            </div>

                            {/* Main Flag Toggle */}
                            <div className="bg-indigo-50 rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Flag className="w-5 h-5 text-indigo-600" />
                                        <div>
                                            <h3 className="font-medium text-gray-700">Main Flag</h3>
                                            <p className="text-xs text-gray-400">Enable if challenge has a main flag to submit</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.has_main_flag}
                                            onChange={(e) => setFormData(prev => ({ ...prev, has_main_flag: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                {/* Main Flag field - only show if toggle is on */}
                                {formData.has_main_flag && (
                                    <div className="pt-4 border-t border-indigo-100">
                                        <label className="block text-sm text-gray-500 mb-1">Flag Value</label>
                                        <Input
                                            type="text"
                                            value={formData.flag}
                                            onChange={(e) => setFormData(prev => ({ ...prev, flag: e.target.value }))}
                                            required
                                            placeholder="CTF{example_flag}"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Docker Toggle */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Container className="w-5 h-5 text-gray-600" />
                                        <div>
                                            <h3 className="font-medium text-gray-700">Docker Lab</h3>
                                            <p className="text-xs text-gray-400">Enable for challenges that need a container</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.has_docker}
                                            onChange={(e) => setFormData(prev => ({ ...prev, has_docker: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                                    </label>
                                </div>

                                {/* Docker fields - only show if toggle is on */}
                                {formData.has_docker && (
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                                        <div>
                                            <label className="block text-sm text-gray-500 mb-1">Docker Image</label>
                                            <Input
                                                type="text"
                                                value={formData.docker_image}
                                                onChange={(e) => setFormData(prev => ({ ...prev, docker_image: e.target.value }))}
                                                placeholder="vulnerables/web-dvwa"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-500 mb-1">Docker Command</label>
                                            <Input
                                                type="text"
                                                value={formData.docker_command}
                                                onChange={(e) => setFormData(prev => ({ ...prev, docker_command: e.target.value }))}
                                                placeholder="bash -c 'sleep 3600'"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Questions (Multi-flag support) */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-700">Additional Questions</h3>
                                        <p className="text-xs text-gray-400">Add sub-questions with their own flags and points</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addQuestion}
                                        className="text-sm text-gray-900 hover:text-gray-700 font-medium"
                                    >
                                        + Add Question
                                    </button>
                                </div>
                                {formData.questions.map((q, idx) => (
                                    <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-600">Question {idx + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeQuestion(idx)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div>
                                            <Input
                                                type="text"
                                                value={q.question}
                                                onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                                                placeholder="What is the database name?"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-400">Flag</label>
                                                <Input
                                                    type="text"
                                                    value={q.flag}
                                                    onChange={(e) => updateQuestion(idx, 'flag', e.target.value)}
                                                    placeholder="CTF{answer}"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">Points</label>
                                                <Input
                                                    type="number"
                                                    value={q.points}
                                                    onChange={(e) => updateQuestion(idx, 'points', parseInt(e.target.value))}
                                                    min={0}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {formData.questions.length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-4">
                                        No additional questions. Click "Add Question" to create sub-tasks.
                                    </p>
                                )}
                            </div>

                            {/* Hints */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium text-gray-700">Hints</h3>
                                    <button
                                        type="button"
                                        onClick={addHint}
                                        className="text-sm text-gray-900 hover:text-gray-700 font-medium"
                                    >
                                        + Add Hint
                                    </button>
                                </div>
                                {formData.hints.map((hint, idx) => (
                                    <div key={idx} className="flex gap-4 items-start">
                                        <div className="flex-1">
                                            <Input
                                                type="text"
                                                value={hint.text}
                                                onChange={(e) => updateHint(idx, 'text', e.target.value)}
                                                placeholder="Hint text..."
                                            />
                                        </div>
                                        <div className="w-24">
                                            <Input
                                                type="number"
                                                value={hint.cost}
                                                onChange={(e) => updateHint(idx, 'cost', parseInt(e.target.value))}
                                                min={0}
                                                placeholder="Cost"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeHint(idx)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Published Toggle */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="is_published"
                                    checked={formData.is_published}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                                />
                                <label htmlFor="is_published" className="text-sm text-gray-700">
                                    Publish immediately (visible to users)
                                </label>
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingChallenge ? 'Save Changes' : 'Create Challenge'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminChallenges;
