import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Plus, Edit2, Trash2, Search, Eye, EyeOff, Save, X, Container, Flag, Paperclip, Download, FileText, Upload, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface DockerImage {
    image: string;
    source: 'database' | 'ghcr' | 'dockerhub';
    label: string;
    created_at?: string;
}

const AdminChallenges = () => {
    const [challenges, setChallenges] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState(null);
    const [dockerImages, setDockerImages] = useState<DockerImage[]>([]);
    const [loadingImages, setLoadingImages] = useState(false);
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
        docker_source: 'image' as 'image' | 'upload' | 'github',
        docker_port: null as number | null,
        uploadedFile: null as File | null,
        github_repo: '',
        github_path: '',
        hints: [] as { text: string; cost: number }[],
        questions: [] as { question: string; flag: string; points: number }[],
        is_published: true
    });
    const [artifacts, setArtifacts] = useState<any[]>([]);
    const [uploadingArtifact, setUploadingArtifact] = useState(false);
    const [zipPreview, setZipPreview] = useState<{ files: string[]; count: number } | null>(null);
    const [loadingZipPreview, setLoadingZipPreview] = useState(false);

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

    // Fetch docker images when modal opens with Docker enabled
    const fetchDockerImages = async () => {
        if (dockerImages.length > 0) return; // Already loaded
        setLoadingImages(true);
        try {
            const res = await axios.get(`${API}/admin/docker-images`);
            setDockerImages(res.data.images || []);
        } catch (e) {
            console.error('Failed to fetch docker images');
        } finally {
            setLoadingImages(false);
        }
    };

    // Load images when Docker tab is active
    useEffect(() => {
        if (showModal && formData.has_docker) {
            fetchDockerImages();
        }
    }, [showModal, formData.has_docker]);

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

            docker_source: 'image',
            docker_port: null,
            uploadedFile: null,
            github_repo: '',
            github_path: '',
            hints: [],
            questions: [],
            is_published: true
        });
        setArtifacts([]);
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

            docker_source: 'image',
            docker_port: challenge.docker_port || null,
            uploadedFile: null,
            github_repo: challenge.github_repo || '',
            github_path: challenge.github_path || '',
            hints: challenge.hints || [],
            questions: challenge.questions || [],
            is_published: challenge.is_published !== false
        });
        setShowModal(true);
        fetchArtifacts(challenge.id);
    };

    const fetchArtifacts = async (challengeId) => {
        try {
            const res = await axios.get(`${API}/challenges/${challengeId}/artifacts`);
            setArtifacts(res.data);
        } catch (error) {
            console.error('Failed to fetch artifacts', error);
        }
    };

    const handleUploadArtifact = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !editingChallenge) return;

        const file = e.target.files[0];

        // 300MB Check
        if (file.size > 300 * 1024 * 1024) {
            toast.error('File exceeds 300MB limit');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploadingArtifact(true);
        try {
            await axios.post(`${API}/admin/challenges/${editingChallenge.id}/artifacts`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Artifact uploaded successfully');
            fetchArtifacts(editingChallenge.id);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to upload artifact');
        } finally {
            setUploadingArtifact(false);
            e.target.value = '';
        }
    };

    const handleDeleteArtifact = async (artifactId) => {
        if (!window.confirm('Are you sure you want to delete this artifact?')) return;

        try {
            await axios.delete(`${API}/admin/artifacts/${artifactId}`);
            toast.success('Artifact deleted');
            if (editingChallenge) fetchArtifacts(editingChallenge.id);
        } catch (error) {
            toast.error('Failed to delete artifact');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prepare data - only include docker fields if has_docker is true
        // Only include flag if has_main_flag is true
        const submitData = {
            ...formData,
            flag: formData.has_main_flag ? formData.flag : '',
            docker_image: formData.has_docker ? formData.docker_image : null,

            docker_port: formData.has_docker ? formData.docker_port : null,
            github_repo: formData.has_docker && formData.docker_source === 'github' ? formData.github_repo : null,
            github_path: formData.has_docker && formData.docker_source === 'github' ? formData.github_path : null,
        };
        delete submitData.has_docker;
        delete submitData.has_main_flag;
        delete submitData.docker_source;
        delete submitData.uploadedFile;

        try {
            // If there's an uploaded file, we need to upload it separately
            if (formData.has_docker && formData.docker_source === 'upload' && formData.uploadedFile) {
                toast.info('Uploading and building Docker image...');

                const fileData = new FormData();
                fileData.append('file', formData.uploadedFile);
                fileData.append('challenge_data', JSON.stringify(submitData));

                let response;
                if (editingChallenge) {
                    response = await axios.put(`${API}/admin/challenges/${editingChallenge.id}/upload`, fileData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                } else {
                    response = await axios.post(`${API}/admin/challenges/upload`, fileData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }

                // Show build status
                if (response.data.build_status === 'success') {
                    toast.success(`Challenge saved! Docker image: ${response.data.docker_image}`);
                } else {
                    toast.warning('Challenge saved. Docker image pending build.');
                }
            } else {
                // Regular JSON save
                if (editingChallenge) {
                    await axios.put(`${API}/admin/challenges/${editingChallenge.id}`, submitData);
                    toast.success('Challenge updated');
                } else {
                    await axios.post(`${API}/admin/challenges`, submitData);
                    toast.success('Challenge created');
                }
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
                                    <Badge className={getDifficultyStyle(challenge.difficulty)} variant={undefined}>
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
                                            <h3 className="font-medium text-gray-700">Lab Environment</h3>
                                            <p className="text-xs text-gray-400">Enable for challenges that need a live machine</p>
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
                                    <div className="pt-4 border-t border-gray-200 space-y-4">
                                        {/* Source Type Tabs */}
                                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, docker_source: 'image' }))}
                                                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${(!formData.docker_source || formData.docker_source === 'image')
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                📦 From Registry
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, docker_source: 'upload' }))}
                                                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${formData.docker_source === 'upload'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                📁 Upload Files
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, docker_source: 'github' }))}
                                                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${formData.docker_source === 'github'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                🐙 GitHub
                                            </button>
                                        </div>

                                        {/* Docker Image Source */}
                                        {(!formData.docker_source || formData.docker_source === 'image') && (
                                            <div className="space-y-4">
                                                {/* Image Library from GHCR */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="block text-sm text-gray-500">Select from your image library</label>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                setLoadingImages(true);
                                                                try {
                                                                    const res = await axios.get(`${API}/admin/docker-images`);
                                                                    setDockerImages(res.data.images || []);
                                                                    if (res.data.images?.length === 0) {
                                                                        toast.info('No images found. Upload a challenge to create one.');
                                                                    }
                                                                } catch (e) {
                                                                    toast.error('Failed to fetch images');
                                                                } finally {
                                                                    setLoadingImages(false);
                                                                }
                                                            }}
                                                            className="text-xs text-gray-500 hover:text-gray-700"
                                                        >
                                                            🔄 Refresh
                                                        </button>
                                                    </div>

                                                    {/* Image library grid */}
                                                    {loadingImages ? (
                                                        <div className="text-center py-4 text-gray-400">Loading images...</div>
                                                    ) : dockerImages.length > 0 ? (
                                                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto mb-3">
                                                            {/* Filter out duplicates by image URL, prioritizing database (In Use) entries */}
                                                            {(() => {
                                                                const seen = new Set();
                                                                return dockerImages.filter(img => {
                                                                    const key = img.image.toLowerCase();
                                                                    if (seen.has(key)) return false;
                                                                    seen.add(key);
                                                                    return true;
                                                                }).map((img, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        type="button"
                                                                        onClick={() => setFormData(prev => ({ ...prev, docker_image: img.image }))}
                                                                        className={`p-3 text-left text-sm rounded-lg border transition-all ${formData.docker_image === img.image
                                                                            ? 'border-gray-900 bg-gray-900 text-white'
                                                                            : 'border-gray-200 hover:border-gray-400 bg-white'
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="font-medium truncate">📦 {img.label || img.image.split('/').pop()}</span>
                                                                            <span className={`text-xs px-2 py-0.5 rounded ${img.source === 'ghcr' ? 'bg-purple-100 text-purple-700' :
                                                                                img.source === 'database' ? 'bg-blue-100 text-blue-700' :
                                                                                    'bg-gray-100 text-gray-600'
                                                                                }`}>
                                                                                {img.source === 'ghcr' ? 'GHCR' : img.source === 'database' ? 'In Use' : 'Public'}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs opacity-70 truncate mt-1">{img.image}</p>
                                                                    </button>
                                                                ));
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-6 bg-gray-50 rounded-lg mb-3">
                                                            <p className="text-sm text-gray-500">No images in library yet</p>
                                                            <p className="text-xs text-gray-400 mt-1">Upload a ZIP file to create your first image</p>
                                                        </div>
                                                    )}

                                                    {/* Custom image input */}
                                                    <Input
                                                        type="text"
                                                        value={formData.docker_image}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, docker_image: e.target.value }))}
                                                        placeholder="Or enter any Docker image URL..."
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">ghcr.io/..., dockerhub/..., or any registry</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* File Upload Source */}
                                        {formData.docker_source === 'upload' && (
                                            <div className="space-y-4">
                                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors cursor-pointer relative">
                                                    <input
                                                        type="file"
                                                        accept=".zip"
                                                        className="hidden"
                                                        id="docker-upload"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                if (file.size > 300 * 1024 * 1024) {
                                                                    toast.error('File exceeds 300MB limit');
                                                                    return;
                                                                }
                                                                setFormData(prev => ({ ...prev, uploadedFile: file }));
                                                                toast.success(`Selected: ${file.name}`);

                                                                // Fetch ZIP preview
                                                                setLoadingZipPreview(true);
                                                                try {
                                                                    const zipData = new FormData();
                                                                    zipData.append('file', file);
                                                                    const zipRes = await axios.post(`${API}/admin/zip-info`, zipData);
                                                                    setZipPreview(zipRes.data);
                                                                } catch (err) {
                                                                    console.error('ZIP preview failed', err);
                                                                } finally {
                                                                    setLoadingZipPreview(false);
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor="docker-upload" className="cursor-pointer">
                                                        {formData.uploadedFile ? (
                                                            <>
                                                                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                                                    <FileText className="w-8 h-8 text-blue-600" />
                                                                </div>
                                                                <p className="font-medium text-gray-900">{formData.uploadedFile.name}</p>
                                                                <p className="text-xs text-gray-400 mt-1">{(formData.uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                                                                <p className="text-sm text-blue-600 mt-2 font-medium">Click to replace</p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                                                    <Upload className="w-8 h-8 text-gray-500" />
                                                                </div>
                                                                <p className="font-medium text-gray-900">Upload Challenge Files</p>
                                                                <p className="text-sm text-gray-500 mt-1">ZIP file containing Dockerfile and resources</p>
                                                                <p className="text-xs text-gray-400 mt-3 font-medium text-amber-600">Max 300MB • Requires Dockerfile in root</p>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>

                                                {/* ZIP Preview Section */}
                                                {loadingZipPreview && (
                                                    <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                        <span className="text-sm text-gray-500">Scanning ZIP contents...</span>
                                                    </div>
                                                )}

                                                {zipPreview && formData.uploadedFile && (
                                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <FolderOpen className="w-4 h-4 text-gray-500" />
                                                                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">ZIP Preview</span>
                                                            </div>
                                                            <Badge variant="outline" className="text-[10px] bg-white">
                                                                {zipPreview.count} Files
                                                            </Badge>
                                                        </div>
                                                        <div className="p-3 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1">
                                                            {!zipPreview.files.some(f => f.toLowerCase().includes('dockerfile')) && (
                                                                <div className="p-2 mb-2 bg-red-50 text-red-600 rounded flex items-center gap-2 border border-red-100">
                                                                    <X className="w-3 h-3" />
                                                                    <span>No Dockerfile found in root!</span>
                                                                </div>
                                                            )}
                                                            {zipPreview.files.map((file, i) => (
                                                                <div key={i} className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 rounded px-1 transition-colors">
                                                                    <span className="text-gray-300 w-4 font-mono">{i + 1}.</span>
                                                                    <span className={file.toLowerCase().includes('dockerfile') ? 'text-blue-600 font-bold' : ''}>
                                                                        {file}
                                                                        {file.toLowerCase().includes('dockerfile') && ' 🔨'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                                    <p className="text-xs text-blue-700">
                                                        <strong>ZIP Structure:</strong> Your ZIP should contain a Dockerfile at the root level,
                                                        along with any source files, config, or data the challenge needs.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* GitHub Source */}
                                        {formData.docker_source === 'github' && (
                                            <div className="space-y-4">
                                                {/* GitHub Connect Status */}
                                                <div className="bg-white border border-gray-200 rounded-xl p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                                                                <span className="text-xl">🐙</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900">GitHub Integration</p>
                                                                <p className="text-sm text-gray-500">Connect to import challenges from repos</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => toast.info('GitHub OAuth coming soon!')}
                                                            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
                                                        >
                                                            Connect GitHub
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Repo Browser Placeholder */}
                                                <div className="border border-gray-200 rounded-xl p-6 text-center">
                                                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                                        <span className="text-3xl text-gray-400">🔒</span>
                                                    </div>
                                                    <p className="text-gray-500">Connect your GitHub account to browse repos</p>
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        Once connected, you can select any repo and folder containing a Dockerfile
                                                    </p>
                                                </div>

                                                {/* Manual GitHub URL fallback */}
                                                <div className="pt-4 border-t border-gray-200">
                                                    <p className="text-sm text-gray-600 mb-2 font-medium">Or enter GitHub repo URL directly:</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Input
                                                                type="text"
                                                                value={formData.github_repo || ''}
                                                                onChange={(e) => setFormData(prev => ({ ...prev, github_repo: e.target.value }))}
                                                                placeholder="https://github.com/user/repo"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Input
                                                                type="text"
                                                                value={formData.github_path || ''}
                                                                onChange={(e) => setFormData(prev => ({ ...prev, github_path: e.target.value }))}
                                                                placeholder="challenges/sqli (optional)"
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-2">Public repos only. For private repos, connect GitHub above.</p>
                                                </div>
                                            </div>
                                        )}
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

                            {/* Challenge Artifacts */}
                            <div className="bg-white border rounded-xl p-4 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <div className="flex items-center gap-2">
                                        <Paperclip className="w-5 h-5 text-gray-600" />
                                        <div>
                                            <h3 className="font-medium text-gray-700">Challenge Artifacts</h3>
                                            <p className="text-xs text-gray-400">Files for users to download and analyze</p>
                                        </div>
                                    </div>
                                    {editingChallenge ? (
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id="artifact-upload"
                                                className="hidden"
                                                onChange={handleUploadArtifact}
                                                disabled={uploadingArtifact}
                                            />
                                            <label
                                                htmlFor="artifact-upload"
                                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
                                            >
                                                {uploadingArtifact ? (
                                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Upload className="w-3 h-3" />
                                                )}
                                                Add Artifact
                                            </label>
                                        </div>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] text-gray-400">Save Challenge First</Badge>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {artifacts.map((art) => (
                                        <div key={art.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded border border-gray-200">
                                                    <FileText className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">{art.filename}</p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {(art.file_size / 1024).toFixed(1)} KB • {art.mime_type || 'Unknown type'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={`${API}/artifacts/download/${art.id}`}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteArtifact(art.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {artifacts.length === 0 && editingChallenge && (
                                        <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-lg">
                                            <p className="text-sm text-gray-400 italic">No artifacts uploaded yet</p>
                                        </div>
                                    )}
                                </div>
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
