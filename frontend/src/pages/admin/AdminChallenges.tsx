import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Plus, Edit2, Trash2, Search, Eye, EyeOff, Save, X, Container, Flag, Paperclip, Download, FileText, Upload, FolderOpen, GitBranch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface DockerImage {
    image: string;
    source: 'database' | 'ghcr' | 'dockerhub';
    label: string;
    created_at?: string;
}

// Multi-container challenge pack (from docker-compose builds)
interface ChallengePack {
    id: string;
    pack_name: string;
    display_name: string;
    images: { name: string; image: string; ports: number[] }[];
    combined_ports: number[];
    is_multi_container: boolean;
    created_at: string;
}

const AdminChallenges = () => {
    const [challenges, setChallenges] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState(null);
    const [dockerImages, setDockerImages] = useState<DockerImage[]>([]);
    const [challengePacks, setChallengePacks] = useState<ChallengePack[]>([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        author: '',  // Challenge builder/author name
        category_id: '',
        difficulty: 'easy',
        points: 100,
        has_main_flag: true,  // Toggle for main flag
        flag: '',
        has_docker: false,
        docker_image: '',
        docker_source: 'image' as 'image' | 'upload' | 'github' | 'pack',  // Added 'pack' option
        docker_port: null as number | null,
        ports: [] as number[],  // Ports to expose for container challenges
        uploadedFile: null as File | null,
        github_repo: '',
        github_path: '',
        hints: [] as { text: string; cost?: number }[],
        questions: [] as { question: string; flag: string; points: number }[],
        tags: [] as string[],
        is_published: true,
        // Multi-container pack support
        challenge_pack_id: '' as string,
        is_multi_container: false
    });

    const [artifacts, setArtifacts] = useState<any[]>([]);
    const [uploadingArtifact, setUploadingArtifact] = useState(false);
    const [zipPreview, setZipPreview] = useState<{
        files: { name: string; size: number; is_dir: boolean }[];
        total_files: number;
        total_size: number;
        has_dockerfile: boolean;
        dockerfile_content?: string;
        detected_ports: number[];
    } | null>(null);
    const [loadingZipPreview, setLoadingZipPreview] = useState(false);
    const [saving, setSaving] = useState(false);  // Prevent double-click on save
    const [showDockerfileModal, setShowDockerfileModal] = useState(false);
    const [imageNotFoundWarning, setImageNotFoundWarning] = useState(false);

    // GitHub OAuth state
    const [githubConnected, setGithubConnected] = useState(false);
    const [githubUsername, setGithubUsername] = useState('');
    const [githubRepos, setGithubRepos] = useState<any[]>([]);
    const [loadingGithub, setLoadingGithub] = useState(false);

    // GitHub artifact import state
    const [showGithubArtifactModal, setShowGithubArtifactModal] = useState(false);
    const [artifactSelectedRepo, setArtifactSelectedRepo] = useState<any>(null);
    const [artifactRepoContents, setArtifactRepoContents] = useState<any[]>([]);
    const [artifactCurrentPath, setArtifactCurrentPath] = useState('');
    const [artifactSelectedFile, setArtifactSelectedFile] = useState<any>(null);
    const [loadingArtifactContents, setLoadingArtifactContents] = useState(false);
    const [importingArtifact, setImportingArtifact] = useState(false);

    useEffect(() => {
        fetchData();
        checkGithubStatus();

        // Listen for OAuth callback messages
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'github-oauth-success') {
                setGithubConnected(true);
                setGithubUsername(event.data.username);
                toast.success(`Connected to GitHub as ${event.data.username}`);
                fetchGithubRepos();
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const checkGithubStatus = async () => {
        try {
            const res = await axios.get(`${API}/auth/github/status`);
            if (res.data.connected) {
                setGithubConnected(true);
                setGithubUsername(res.data.username);
            }
        } catch (e) {
            // GitHub not connected
        }
    };

    const connectGithub = async () => {
        try {
            const res = await axios.get(`${API}/auth/github`);
            // Open popup for OAuth
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            window.open(
                res.data.url,
                'github-oauth',
                `width=${width},height=${height},left=${left},top=${top}`
            );
        } catch (e) {
            toast.error('Failed to initiate GitHub connection');
        }
    };

    const disconnectGithub = async () => {
        try {
            await axios.delete(`${API}/auth/github/disconnect`);
            setGithubConnected(false);
            setGithubUsername('');
            setGithubRepos([]);
            toast.success('GitHub disconnected');
        } catch (e) {
            toast.error('Failed to disconnect GitHub');
        }
    };

    const fetchGithubRepos = async () => {
        setLoadingGithub(true);
        try {
            const res = await axios.get(`${API}/github/repos`);
            setGithubRepos(res.data.repos || []);
        } catch (e) {
            console.error('Failed to fetch repos');
        } finally {
            setLoadingGithub(false);
        }
    };

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

    // Fetch docker images and challenge packs when modal opens with Docker enabled
    const fetchDockerImages = async () => {
        setLoadingImages(true);
        try {
            const res = await axios.get(`${API}/admin/docker-images`);
            setDockerImages(res.data.images || []);
            setChallengePacks(res.data.packs || []);  // Also fetch challenge packs
        } catch (e) {
            console.error('Failed to fetch docker images:', e);
            toast.error('Could not load images from registry');
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

    // Check if docker image exists AFTER images are loaded
    useEffect(() => {
        if (!showModal || !editingChallenge || dockerImages.length === 0) {
            return;
        }

        const dockerImage = editingChallenge.docker_image;
        if (dockerImage && dockerImage.trim()) {
            const normalizeImageName = (url: string) => {
                // Remove tag (:latest, :v1, etc.)
                const noTag = url.split(':')[0];
                // Get just the image name (last part of path)
                const parts = noTag.split('/');
                return parts[parts.length - 1].toLowerCase();
            };

            const targetImageName = normalizeImageName(dockerImage);
            const imageExists = dockerImages.some(
                img => normalizeImageName(img.image) === targetImageName
            );
            setImageNotFoundWarning(!imageExists);
        }
    }, [dockerImages, showModal, editingChallenge]);

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
            author: '',
            category_id: categories[0]?.id || '',
            difficulty: 'easy',
            points: 100,
            has_main_flag: true,
            flag: '',
            has_docker: false,
            docker_image: '',
            docker_source: 'image',
            docker_port: null,
            ports: [],
            uploadedFile: null,
            github_repo: '',
            github_path: '',
            hints: [],
            questions: [],
            tags: [],
            is_published: true,
            challenge_pack_id: '',
            is_multi_container: false
        });
        setArtifacts([]);
        setImageNotFoundWarning(false);
        setShowModal(true);
    };

    const openEditModal = (challenge) => {
        setEditingChallenge(challenge);

        // Determine docker_source based on stored data
        let dockerSource: 'image' | 'pack' | 'github' | 'upload' = 'image';
        if (challenge.is_multi_container || challenge.challenge_pack_id) {
            dockerSource = 'pack';
        } else if (challenge.github_repo) {
            dockerSource = 'github';
        }

        setFormData({
            title: challenge.title,
            description: challenge.description,
            author: challenge.author || '',
            category_id: challenge.category_id,
            difficulty: challenge.difficulty,
            points: challenge.points,
            has_main_flag: !!(challenge.flag && challenge.flag.trim()),
            flag: challenge.flag || '',
            has_docker: challenge.has_docker || !!(challenge.docker_image) || !!(challenge.challenge_pack_id),
            docker_image: challenge.docker_image || '',
            docker_source: dockerSource,
            docker_port: challenge.docker_port || null,
            ports: challenge.ports || [],
            uploadedFile: null,
            github_repo: challenge.github_repo || '',
            github_path: challenge.github_path || '',
            hints: challenge.hints || [],
            questions: challenge.questions || [],
            tags: challenge.tags || [],
            is_published: challenge.is_published !== false,
            // Pack support
            challenge_pack_id: challenge.challenge_pack_id || '',
            is_multi_container: challenge.is_multi_container || false
        });

        // Image check is now done in useEffect after dockerImages are loaded
        // Reset warning - the useEffect will update it once images load
        setImageNotFoundWarning(false);

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

    // Fetch repo contents for artifact browser
    const fetchArtifactRepoContents = async (repo: any, path: string = '') => {
        setLoadingArtifactContents(true);
        setArtifactCurrentPath(path);
        setArtifactSelectedFile(null);
        try {
            const res = await axios.get(`${API}/admin/github/repo-contents`, {
                params: { repo: repo.full_name, path }
            });
            setArtifactRepoContents(res.data.contents || []);
        } catch (e) {
            toast.error('Failed to load folder contents');
        } finally {
            setLoadingArtifactContents(false);
        }
    };

    const handleGithubArtifactImport = async () => {
        if (!editingChallenge || !artifactSelectedRepo || !artifactSelectedFile) {
            toast.error('Please select a file to import');
            return;
        }

        setImportingArtifact(true);
        try {
            const formData = new FormData();
            formData.append('repo', artifactSelectedRepo.full_name);
            formData.append('path', artifactSelectedFile.path);
            formData.append('branch', 'main');

            const res = await axios.post(
                `${API}/admin/challenges/${editingChallenge.id}/artifacts/from-github`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            if (res.data.success) {
                toast.success(`Imported: ${res.data.filename} (${(res.data.size / 1024).toFixed(1)} KB)`);
                fetchArtifacts(editingChallenge.id);
                setShowGithubArtifactModal(false);
                // Reset state
                setArtifactSelectedRepo(null);
                setArtifactRepoContents([]);
                setArtifactCurrentPath('');
                setArtifactSelectedFile(null);
            } else {
                toast.error(res.data.detail || 'Import failed');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to import from GitHub');
        } finally {
            setImportingArtifact(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prevent double-click
        if (saving) return;
        setSaving(true);

        // Prepare data - only include docker fields if has_docker is true
        // Only include flag if has_main_flag is true
        const submitData = {
            ...formData,
            flag: formData.has_main_flag ? formData.flag : '',
            // For packs, docker_image stays empty but we use challenge_pack_id
            docker_image: formData.has_docker && formData.docker_source !== 'pack' ? formData.docker_image : null,
            docker_port: formData.has_docker ? formData.docker_port : null,
            ports: formData.has_docker ? formData.ports : [],
            github_repo: formData.has_docker && formData.docker_source === 'github' ? formData.github_repo : null,
            github_path: formData.has_docker && formData.docker_source === 'github' ? formData.github_path : null,
            // Include pack data if selecting a pack
            challenge_pack_id: formData.has_docker && formData.docker_source === 'pack' ? formData.challenge_pack_id : null,
            is_multi_container: formData.has_docker && formData.docker_source === 'pack' ? formData.is_multi_container : false,
        };
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
        } catch (error: any) {
            if (error.response?.status === 409) {
                toast.error('A challenge with this title already exists');
            } else {
                toast.error(error.response?.data?.detail || 'Failed to save challenge');
            }
        } finally {
            setSaving(false);
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
            hints: [...prev.hints, { text: '' }]
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
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[900px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Title</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Author</th>
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
                                    {challenge.author || <span className="text-gray-300 italic">—</span>}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {getCategoryName(challenge.category_id)}
                                </td>
                                <td className="px-6 py-4">
                                    <Badge className={getDifficultyStyle(challenge.difficulty)} variant={undefined}>
                                        {challenge.difficulty}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 font-mono text-gray-900">
                                    {challenge.total_points ?? (challenge.points + (challenge.questions?.reduce((sum: number, q: { points?: number }) => sum + (q.points || 0), 0) || 0))}
                                </td>
                                <td className="px-6 py-4">
                                    {(challenge.docker_image || challenge.has_docker || challenge.is_multi_container || challenge.challenge_pack_id) ? (
                                        <span className="flex items-center gap-1 text-indigo-600 text-sm">
                                            <Container className="w-4 h-4" />
                                            {challenge.is_multi_container ? 'Pack' : 'Yes'}
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
                        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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

                            {/* Author */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Author </label>
                                <Input
                                    type="text"
                                    value={formData.author}
                                    onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                                    placeholder="John Doe"
                                />
                                <p className="text-xs text-gray-400 mt-1">Name of the person who built this challenge</p>
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
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                setFormData(prev => ({ ...prev, has_docker: isChecked }));

                                                // Re-check image warning when enabling Docker
                                                // Use lenient matching: compare just image names (without registry/tag)
                                                if (isChecked && formData.docker_image && formData.docker_image.trim()) {
                                                    const normalizeImageName = (url: string) => {
                                                        const noTag = url.split(':')[0];
                                                        const parts = noTag.split('/');
                                                        return parts[parts.length - 1].toLowerCase();
                                                    };
                                                    const targetImageName = normalizeImageName(formData.docker_image);
                                                    const imageExists = dockerImages.some(
                                                        img => normalizeImageName(img.image) === targetImageName
                                                    );
                                                    setImageNotFoundWarning(!imageExists);
                                                } else if (!isChecked) {
                                                    setImageNotFoundWarning(false);
                                                }
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                                    </label>
                                </div>

                                {/* Docker fields - only show if toggle is on */}
                                {formData.has_docker && (
                                    <div className="pt-4 border-t border-gray-200 space-y-4">

                                        {/* Image Not Found Warning */}
                                        {imageNotFoundWarning && formData.docker_image && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xl">⚠️</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-amber-800 mb-1">Docker Image Not Found</h4>
                                                        <p className="text-sm text-amber-700 mb-2">
                                                            The configured image <code className="bg-amber-100 px-1 rounded text-xs font-mono">{formData.docker_image}</code> was not found in the registry.
                                                            It may have been deleted.
                                                        </p>
                                                        <div className="flex gap-2 mt-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData(prev => ({ ...prev, docker_image: '', docker_source: 'image' }))}
                                                                className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
                                                            >
                                                                Select New Image
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData(prev => ({ ...prev, has_docker: false, docker_image: '' }));
                                                                    setImageNotFoundWarning(false);
                                                                }}
                                                                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 text-sm rounded-lg hover:bg-amber-50 transition-colors"
                                                            >
                                                                Disable Docker
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Source Type Tabs */}
                                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, docker_source: 'image', challenge_pack_id: '', is_multi_container: false }))}
                                                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${(!formData.docker_source || formData.docker_source === 'image')
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                📦 Single Container
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, docker_source: 'pack', docker_image: '', is_multi_container: true }))}
                                                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${formData.docker_source === 'pack'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                🧩 Multi-Container
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, docker_source: 'github' }))}
                                                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${formData.docker_source === 'github'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                <img src="/github-mark.svg" alt="" className="w-4 h-4" />
                                                GitHub
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
                                                                        onClick={async () => {
                                                                            setFormData(prev => ({ ...prev, docker_image: img.image }));
                                                                            setImageNotFoundWarning(false); // Clear warning when selecting valid image

                                                                            // Fetch stored ports for this image
                                                                            try {
                                                                                const formData = new FormData();
                                                                                formData.append('image_url', img.image);
                                                                                const res = await axios.post(`${API}/admin/images/metadata`, formData);
                                                                                if (res.data.found && res.data.ports?.length > 0) {
                                                                                    setFormData(prev => ({ ...prev, docker_image: img.image, ports: res.data.ports }));
                                                                                    toast.info(`Auto-detected ${res.data.ports.length} ports from image`);
                                                                                }
                                                                            } catch (e) {
                                                                                // Silent fail - ports can be set manually
                                                                            }
                                                                        }}
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

                                        {/* Multi-Container Pack Source */}
                                        {formData.docker_source === 'pack' && (
                                            <div className="space-y-4">
                                                {/* Pack Selection Header */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-700">Select Challenge Pack</h4>
                                                        <p className="text-xs text-gray-400 mt-0.5">Multi-container bundles built from docker-compose</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={fetchDockerImages}
                                                        className="text-xs text-gray-500 hover:text-gray-700"
                                                    >
                                                        🔄 Refresh
                                                    </button>
                                                </div>

                                                {/* Pack Grid */}
                                                {loadingImages ? (
                                                    <div className="text-center py-8 text-gray-400">Loading packs...</div>
                                                ) : challengePacks.length > 0 ? (
                                                    <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                                                        {challengePacks.map((pack) => (
                                                            <button
                                                                key={pack.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        challenge_pack_id: pack.id,
                                                                        docker_image: '',  // Clear single image
                                                                        is_multi_container: true,
                                                                        ports: pack.combined_ports  // Auto-fill ports!
                                                                    }));
                                                                    toast.info(`Selected pack with ${pack.images.length} containers, ${pack.combined_ports.length} ports auto-filled`);
                                                                }}
                                                                className={`p-4 text-left rounded-xl border-2 transition-all ${formData.challenge_pack_id === pack.id
                                                                    ? 'border-indigo-500 bg-indigo-50'
                                                                    : 'border-gray-200 hover:border-gray-400 bg-white'
                                                                    }`}
                                                            >
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-2xl">🧩</span>
                                                                        <div>
                                                                            <span className="font-semibold text-gray-900">{pack.display_name || pack.pack_name}</span>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                                                                                    {pack.images.length} containers
                                                                                </span>
                                                                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                                                                    {pack.combined_ports.length} ports
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {formData.challenge_pack_id === pack.id && (
                                                                        <span className="text-indigo-600 text-sm font-medium">✓ Selected</span>
                                                                    )}
                                                                </div>

                                                                {/* Container breakdown */}
                                                                <div className="mt-3 space-y-1 text-xs border-t border-gray-100 pt-2">
                                                                    {pack.images.map((img, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between text-gray-600">
                                                                            <span className="flex items-center gap-1">
                                                                                <Container className="w-3 h-3" />
                                                                                {img.name}
                                                                            </span>
                                                                            <span className="font-mono text-gray-400">
                                                                                {img.ports.map(p => `:${p}`).join(' ')}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                                                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                            <span className="text-3xl">🧩</span>
                                                        </div>
                                                        <h4 className="font-medium text-gray-700 mb-2">No Challenge Packs Yet</h4>
                                                        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                                                            Upload a ZIP containing <code className="bg-gray-100 px-1 rounded text-xs">docker-compose.yml</code> in the Image Registry to create a multi-container pack.
                                                        </p>
                                                        <a
                                                            href="/admin/registry"
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                                        >
                                                            <Upload className="w-4 h-4" />
                                                            Open Image Registry
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Selected pack info */}
                                                {formData.challenge_pack_id && (
                                                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 text-indigo-700 mb-2">
                                                            <span className="text-lg">✅</span>
                                                            <span className="font-medium">Pack Selected</span>
                                                        </div>
                                                        <p className="text-sm text-indigo-600">
                                                            When a player starts this challenge, all containers will run together in a single pod with a shared IP address.
                                                            Ports have been auto-filled from the pack configuration.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* GitHub Source - Redirects to Image Registry */}
                                        {formData.docker_source === 'github' && (
                                            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6 text-center">
                                                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 border border-gray-200 shadow-sm">
                                                    <img src="/github-mark.svg" alt="GitHub" className="w-8 h-8" />
                                                </div>
                                                <h4 className="font-semibold text-gray-900 mb-2">Build from GitHub Repository</h4>
                                                <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                                                    To build images from GitHub repositories, use the Image Registry.
                                                    Once built, your images will appear in the "Single Container" tab above.
                                                </p>
                                                <a
                                                    href="/admin/image-registry"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
                                                >
                                                    <img src="/github-mark.svg" alt="" className="w-4 h-4 invert" />
                                                    Open Image Registry
                                                </a>
                                                <p className="text-xs text-gray-400 mt-3">
                                                    Switch to the "From GitHub" tab to browse repositories
                                                </p>
                                            </div>
                                        )}

                                        {/* Port Selection */}
                                        <div className="pt-4 border-t border-gray-200">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Container Ports
                                                </label>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            ports: [22, 80, 443, 3000, 8000, 8080]
                                                        }))}
                                                        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                                    >
                                                        Select All
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, ports: [] }))}
                                                        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Common port checkboxes */}
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                {[
                                                    { port: 22, label: 'SSH' },
                                                    { port: 80, label: 'HTTP' },
                                                    { port: 443, label: 'HTTPS' },
                                                    { port: 3000, label: 'Node.js' },
                                                    { port: 8000, label: 'Python' },
                                                    { port: 8080, label: 'Alt HTTP' }
                                                ].map(({ port, label }) => (
                                                    <label
                                                        key={port}
                                                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${formData.ports.includes(port)
                                                            ? 'border-gray-900 bg-gray-900 text-white'
                                                            : 'border-gray-200 hover:border-gray-400'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.ports.includes(port)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        ports: [...prev.ports, port].sort((a, b) => a - b)
                                                                    }));
                                                                } else {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        ports: prev.ports.filter(p => p !== port)
                                                                    }));
                                                                }
                                                            }}
                                                            className="sr-only"
                                                        />
                                                        <span className="text-sm font-medium">{port}</span>
                                                        <span className={`text-xs ${formData.ports.includes(port) ? 'text-gray-300' : 'text-gray-400'}`}>
                                                            {label}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>

                                            {/* Custom port input */}
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="65535"
                                                    placeholder="Custom port..."
                                                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const port = parseInt((e.target as HTMLInputElement).value);
                                                            if (port >= 1 && port <= 65535 && !formData.ports.includes(port)) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    ports: [...prev.ports, port].sort((a, b) => a - b)
                                                                }));
                                                                (e.target as HTMLInputElement).value = '';
                                                            }
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                                                        const port = parseInt(input.value);
                                                        if (port >= 1 && port <= 65535 && !formData.ports.includes(port)) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                ports: [...prev.ports, port].sort((a, b) => a - b)
                                                            }));
                                                            input.value = '';
                                                        }
                                                    }}
                                                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                >
                                                    Add
                                                </button>
                                            </div>

                                            {/* Selected ports display */}
                                            {formData.ports.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-1">
                                                    {formData.ports.map(port => (
                                                        <span
                                                            key={port}
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                                        >
                                                            :{port}
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData(prev => ({
                                                                    ...prev,
                                                                    ports: prev.ports.filter(p => p !== port)
                                                                }))}
                                                                className="hover:text-red-500"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <p className="text-xs text-gray-400 mt-2">
                                                Select which ports to expose when spawning this challenge
                                            </p>
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

                            {/* Tags */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <div>
                                    <h3 className="font-medium text-gray-700">Tags</h3>
                                    <p className="text-xs text-gray-400">Add tags to help categorize this challenge</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-900 text-white text-sm rounded-full"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    tags: formData.tags.filter((_, i) => i !== idx)
                                                })}
                                                className="ml-1 hover:text-red-300"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        placeholder="Add tag..."
                                        className="px-3 py-1 text-sm bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-zinc-500 w-28"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ',') {
                                                e.preventDefault();
                                                const value = (e.target as HTMLInputElement).value.trim().toLowerCase();
                                                if (value && !formData.tags.includes(value)) {
                                                    setFormData({ ...formData, tags: [...formData.tags, value] });
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    <span className="text-xs text-gray-400">Suggestions:</span>
                                    {['web', 'crypto', 'forensics', 'pwn', 'reverse', 'misc', 'osint', 'network'].map(tag => (
                                        !formData.tags.includes(tag) && (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, tags: [...formData.tags, tag] })}
                                                className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300"
                                            >
                                                + {tag}
                                            </button>
                                        )
                                    ))}
                                </div>
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
                                        <div className="flex items-center gap-2">
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
                                                Upload
                                            </label>
                                            {githubConnected && (
                                                <button
                                                    type="button"
                                                    onClick={() => { fetchGithubRepos(); setShowGithubArtifactModal(true); }}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                                                    title="Import from GitHub"
                                                >
                                                    <GitBranch className="w-3 h-3" />
                                                    GitHub
                                                </button>
                                            )}
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
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {editingChallenge ? 'Save Changes' : 'Create Challenge'}
                                        </>
                                    )}
                                </button>

                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Dockerfile Viewer Modal */}
            {showDockerfileModal && zipPreview?.dockerfile_content && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-8">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="bg-gray-100 px-6 py-4 flex items-center justify-between border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Dockerfile</h3>
                                    <p className="text-xs text-gray-500">View contents for verification</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDockerfileModal(false)}
                                className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto bg-gray-900 p-4">
                            <div className="font-mono text-sm">
                                {zipPreview.dockerfile_content.split('\n').map((line, i) => (
                                    <div key={i} className="flex hover:bg-gray-800/50 rounded px-2 -mx-2">
                                        <span className="w-10 text-gray-500 text-right mr-4 select-none flex-shrink-0">
                                            {i + 1}
                                        </span>
                                        <span className={
                                            line.startsWith('FROM') ? 'text-purple-400' :
                                                line.startsWith('RUN') ? 'text-green-400' :
                                                    line.startsWith('COPY') || line.startsWith('ADD') ? 'text-blue-400' :
                                                        line.startsWith('EXPOSE') ? 'text-yellow-400 font-bold' :
                                                            line.startsWith('CMD') || line.startsWith('ENTRYPOINT') ? 'text-orange-400' :
                                                                line.startsWith('ENV') ? 'text-cyan-400' :
                                                                    line.startsWith('WORKDIR') ? 'text-pink-400' :
                                                                        line.startsWith('#') ? 'text-gray-500 italic' :
                                                                            line.startsWith('ARG') ? 'text-indigo-400' :
                                                                                line.startsWith('LABEL') ? 'text-teal-400' :
                                                                                    line.startsWith('USER') ? 'text-rose-400' :
                                                                                        'text-gray-100'
                                        }>
                                            {line || '\u00A0'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-100 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                            <div className="text-xs text-gray-500">
                                {zipPreview.detected_ports.length > 0 ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                        Detected ports: <strong className="text-gray-700">{zipPreview.detected_ports.join(', ')}</strong>
                                    </span>
                                ) : (
                                    <span className="text-amber-600">No EXPOSE statements found</span>
                                )}
                            </div>
                            <button
                                onClick={() => setShowDockerfileModal(false)}
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GitHub Artifact Import Modal */}
            {showGithubArtifactModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <GitBranch className="w-5 h-5 text-white" />
                                    <h3 className="text-lg font-semibold text-white">Import Artifact from GitHub</h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowGithubArtifactModal(false);
                                        setArtifactSelectedRepo(null);
                                        setArtifactRepoContents([]);
                                        setArtifactCurrentPath('');
                                        setArtifactSelectedFile(null);
                                    }}
                                    className="text-white/70 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4 flex-1 overflow-auto">
                            {/* Repository Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Repository</label>
                                <select
                                    value={artifactSelectedRepo?.full_name || ''}
                                    onChange={(e) => {
                                        const repo = githubRepos.find(r => r.full_name === e.target.value);
                                        setArtifactSelectedRepo(repo || null);
                                        setArtifactRepoContents([]);
                                        setArtifactCurrentPath('');
                                        setArtifactSelectedFile(null);
                                        if (repo) fetchArtifactRepoContents(repo, '');
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="">-- Choose a repository --</option>
                                    {githubRepos.map(repo => (
                                        <option key={repo.full_name} value={repo.full_name}>{repo.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Breadcrumb Path */}
                            {artifactSelectedRepo && (
                                <div className="flex items-center gap-1 text-sm text-gray-500 flex-wrap">
                                    <button
                                        onClick={() => fetchArtifactRepoContents(artifactSelectedRepo, '')}
                                        className="text-purple-600 hover:underline font-medium"
                                    >
                                        {artifactSelectedRepo.name}
                                    </button>
                                    {artifactCurrentPath && artifactCurrentPath.split('/').map((part, idx, arr) => {
                                        const pathUpTo = arr.slice(0, idx + 1).join('/');
                                        return (
                                            <span key={idx} className="flex items-center gap-1">
                                                <span>/</span>
                                                <button
                                                    onClick={() => fetchArtifactRepoContents(artifactSelectedRepo, pathUpTo)}
                                                    className="text-purple-600 hover:underline"
                                                >
                                                    {part}
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {/* File Browser */}
                            {artifactSelectedRepo && (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    {loadingArtifactContents ? (
                                        <div className="p-8 text-center">
                                            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">Loading...</p>
                                        </div>
                                    ) : artifactRepoContents.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400">
                                            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No files in this folder</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100 max-h-64 overflow-auto">
                                            {artifactRepoContents.map((item: any) => (
                                                <div
                                                    key={item.path}
                                                    onClick={() => {
                                                        if (item.type === 'dir') {
                                                            fetchArtifactRepoContents(artifactSelectedRepo, item.path);
                                                        } else {
                                                            setArtifactSelectedFile(
                                                                artifactSelectedFile?.path === item.path ? null : item
                                                            );
                                                        }
                                                    }}
                                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${artifactSelectedFile?.path === item.path
                                                        ? 'bg-purple-50 border-l-4 border-purple-500'
                                                        : 'hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {item.type === 'dir' ? (
                                                        <FolderOpen className="w-5 h-5 text-amber-500" />
                                                    ) : (
                                                        <FileText className="w-5 h-5 text-gray-400" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-700 truncate">{item.name}</p>
                                                        {item.size && (
                                                            <p className="text-xs text-gray-400">{(item.size / 1024).toFixed(1)} KB</p>
                                                        )}
                                                    </div>
                                                    {item.type === 'dir' && (
                                                        <span className="text-gray-300">→</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Selected File Preview */}
                            {artifactSelectedFile && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-purple-600" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-purple-800">{artifactSelectedFile.name}</p>
                                        <p className="text-xs text-purple-600">{artifactSelectedFile.path}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-between border-t">
                            <div className="text-xs text-gray-500">
                                {artifactSelectedFile ? `Selected: ${artifactSelectedFile.name}` : 'Select a file to import'}
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setShowGithubArtifactModal(false);
                                        setArtifactSelectedRepo(null);
                                        setArtifactRepoContents([]);
                                        setArtifactCurrentPath('');
                                        setArtifactSelectedFile(null);
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGithubArtifactImport}
                                    disabled={importingArtifact || !artifactSelectedFile}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {importingArtifact ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            Import File
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminChallenges;
