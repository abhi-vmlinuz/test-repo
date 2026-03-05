import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Package, Settings, RefreshCw, Upload, Trash2, Check, AlertCircle, Link2, Eye, EyeOff, Server, Box, Edit2, ExternalLink, X, FileText, FolderOpen, GitBranch, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DockerImage {
    image: string;
    source: 'ghcr' | 'database';
    label: string;
    created_at?: string;
    size?: string;
    tags?: string[];
    in_use?: boolean;
    used_by?: string;
    warning?: string;
    is_orphaned?: boolean;
}

// Multi-container challenge pack
interface ChallengePack {
    id: string;
    pack_name: string;
    display_name: string;
    images: { name: string; image: string; ports: number[] }[];
    combined_ports: number[];
    is_multi_container: boolean;
    created_at: string;
}

interface GHCRConfig {
    username: string;
    token: string;
    connected: boolean;
}

interface GitHubRepo {
    name: string;
    full_name: string;
    html_url: string;
    description?: string;
    private: boolean;
}

interface GitHubFolder {
    name: string;
    path: string;
    type: 'dir' | 'file';
    has_dockerfile?: boolean;
    has_compose?: boolean;
}

const AdminImageRegistry = () => {
    const [images, setImages] = useState<DockerImage[]>([]);
    const [challengePacks, setChallengePacks] = useState<ChallengePack[]>([]);
    const [loading, setLoading] = useState(false);
    const [ghcrConfig, setGhcrConfig] = useState<GHCRConfig>({ username: '', token: '', connected: false });
    const [showToken, setShowToken] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [isEditing, setIsEditing] = useState(false); // Start as false to prevent flash

    // Build section
    const [buildSource, setBuildSource] = useState<'zip' | 'github'>('zip');
    const [buildFile, setBuildFile] = useState<File | null>(null);
    const [buildName, setBuildName] = useState('');
    const [buildProgress, setBuildProgress] = useState<'idle' | 'uploading' | 'building' | 'pushing' | 'done' | 'error'>('idle');
    const [buildLogs, setBuildLogs] = useState<string[]>([]);

    // GitHub integration state
    const [githubConnected, setGithubConnected] = useState(false);
    const [githubUsername, setGithubUsername] = useState('');
    const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
    const [loadingGithub, setLoadingGithub] = useState(false);
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
    const [repoFolders, setRepoFolders] = useState<GitHubFolder[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string>('');
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [folderPreview, setFolderPreview] = useState<{
        has_dockerfile: boolean;
        has_compose: boolean;
        files: string[];
        subdirectories?: string[];
        can_build: boolean;
    } | null>(null);

    // ZIP Preview state
    const [zipPreview, setZipPreview] = useState<{
        files: { name: string; size: number; is_dir: boolean }[];
        total_files: number;
        total_size: number;
        all_files_count: number;
        has_dockerfile: boolean;
        has_docker_compose: boolean;
        dockerfile_content?: string;
        docker_compose_content?: string;
        detected_ports: number[];
        port_detection_info?: {
            sources: string[];
            details: Record<string, number[]>;
        };
        additional_dockerfiles?: string[];  // Paths where extra Dockerfiles were found
        has_wrapper_folder?: boolean;
        wrapper_folder?: string | null;
    } | null>(null);
    const [loadingZipPreview, setLoadingZipPreview] = useState(false);
    const [showFileModal, setShowFileModal] = useState<'dockerfile' | 'compose' | null>(null);

    // Active tab for viewing images vs packs
    const [imagesTab, setImagesTab] = useState<'images' | 'packs'>('images');

    useEffect(() => {
        fetchGHCRConfig();
        fetchImages();
        checkGithubStatus();
    }, []);

    const fetchGHCRConfig = async () => {
        setLoadingConfig(true);
        try {
            const res = await axios.get(`${API}/admin/settings/ghcr`);
            setGhcrConfig(res.data);
            // If not connected, show edit mode
            if (!res.data.connected) {
                setIsEditing(true);
            }
        } catch (err) {
            // Config not set yet
            setIsEditing(true);
        } finally {
            setLoadingConfig(false);
        }
    };

    const fetchImages = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/admin/docker-images`);
            // Show all images (GHCR + Database)
            setImages(res.data.images || []);
            setChallengePacks(res.data.packs || []);
        } catch (err) {
            toast.error('Failed to fetch images');
        }
        setLoading(false);
    };

    // GitHub integration functions
    const checkGithubStatus = async () => {
        try {
            const res = await axios.get(`${API}/admin/github/status`);
            setGithubConnected(res.data.connected);
            setGithubUsername(res.data.username || '');
        } catch (e) {
            setGithubConnected(false);
        }
    };

    const connectGithub = () => {
        const popup = window.open(
            `${API}/oauth/github/authorize/admin`,
            'github-auth',
            'width=600,height=700'
        );
        // Listen for OAuth completion
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'github-oauth-success') {
                checkGithubStatus();
                fetchGithubRepos();
            }
        };
        window.addEventListener('message', handleMessage);
    };

    const disconnectGithub = async () => {
        try {
            await axios.post(`${API}/admin/github/disconnect`);
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
            const res = await axios.get(`${API}/admin/github/repos`);
            setGithubRepos(res.data.repos || []);
        } catch (e) {
            toast.error('Failed to fetch repos');
        } finally {
            setLoadingGithub(false);
        }
    };

    const fetchRepoFolders = async (repo: GitHubRepo, path: string = '') => {
        setLoadingFolders(true);
        try {
            const res = await axios.get(`${API}/admin/github/repo-contents`, {
                params: { repo: repo.full_name, path }
            });
            setRepoFolders(res.data.contents || []);
        } catch (e) {
            toast.error('Failed to fetch folder contents');
        } finally {
            setLoadingFolders(false);
        }
    };

    const previewGithubFolder = async (repo: GitHubRepo, folderPath: string) => {
        try {
            const res = await axios.get(`${API}/admin/github/preview-folder`, {
                params: { repo: repo.full_name, path: folderPath }
            });
            setFolderPreview(res.data);
            setSelectedFolder(folderPath);
        } catch (e) {
            toast.error('Failed to preview folder');
        }
    };

    const buildFromGithub = async () => {
        if (!selectedRepo || !selectedFolder || !buildName.trim()) {
            toast.error('Please select a repo, folder, and enter a name');
            return;
        }

        setBuildProgress('building');
        setBuildLogs(['Starting build from GitHub...']);

        try {
            const res = await axios.post(`${API}/admin/images/build-from-github`, {
                repo: selectedRepo.full_name,
                path: selectedFolder,
                image_name: buildName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
            });

            if (res.data.status === 'success') {
                setBuildProgress('done');
                setBuildLogs(prev => [...prev, '✅ Build complete!', `Image: ${res.data.image_url}`]);
                toast.success('Image built and pushed successfully!');
                fetchImages();
            } else {
                throw new Error(res.data.message || 'Build failed');
            }
        } catch (e: any) {
            setBuildProgress('error');
            setBuildLogs(prev => [...prev, `❌ Error: ${e.message}`]);
            toast.error(e.response?.data?.detail || 'Build failed');
        }
    };

    const saveGHCRConfig = async () => {
        if (ghcrConfig.token === '***') {
            toast.error('Please enter your token again');
            return;
        }
        setSaving(true);
        try {
            await axios.post(`${API}/admin/settings/ghcr`, {
                username: ghcrConfig.username,
                token: ghcrConfig.token
            });
            toast.success('GHCR configuration saved!');
            setGhcrConfig(prev => ({ ...prev, connected: true }));
            setIsEditing(false);
            await fetchImages();
        } catch (err) {
            toast.error('Failed to save configuration');
        }
        setSaving(false);
    };

    const testConnection = async () => {
        if (!ghcrConfig.token || ghcrConfig.token === '***') {
            toast.error('Please enter your token first');
            return;
        }
        setTestingConnection(true);
        try {
            const res = await axios.post(`${API}/admin/settings/ghcr/test`, {
                username: ghcrConfig.username,
                token: ghcrConfig.token
            });
            if (res.data.success) {
                toast.success(res.data.message || 'Connection successful! ✓');
                setGhcrConfig(prev => ({ ...prev, connected: true }));
            } else {
                toast.error(res.data.error || 'Connection failed');
                setGhcrConfig(prev => ({ ...prev, connected: false }));
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Connection test failed');
            setGhcrConfig(prev => ({ ...prev, connected: false }));
        }
        setTestingConnection(false);
    };

    const handleBuildUpload = async () => {
        if (!buildFile) {
            toast.error('Please select a ZIP file');
            return;
        }
        if (!buildName.trim()) {
            toast.error('Please enter an image name');
            return;
        }

        const formData = new FormData();
        formData.append('file', buildFile);
        formData.append('image_name', buildName.toLowerCase().replace(/[^a-z0-9-]/g, '-'));

        setBuildProgress('uploading');
        setBuildLogs(['Uploading ZIP file...']);

        try {
            const res = await axios.post(`${API}/admin/images/build`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setBuildLogs([`Uploading... ${percent}%`]);
                    }
                }
            });

            if (res.data.status === 'success') {
                setBuildProgress('done');
                setBuildLogs(prev => [...prev, `Image built and pushed!`, ` ${res.data.image}`]);
                toast.success('Image built and pushed to GHCR!');
                // Reset form
                setBuildFile(null);
                setBuildName('');
                fetchImages();
            } else {
                throw new Error(res.data.error || 'Build failed');
            }
        } catch (err: any) {
            setBuildProgress('error');
            const errorMsg = err.response?.data?.detail || err.message;
            setBuildLogs(prev => [...prev, ` Error: ${errorMsg}`]);
            toast.error('Build failed');
        }
    };

    const resetBuild = () => {
        setBuildProgress('idle');
        setBuildLogs([]);
        setBuildFile(null);
        setBuildName('');
        setZipPreview(null);
    };

    const deleteImage = async (imageName: string) => {
        if (!confirm(`Delete image reference for ${imageName}? This removes it from the database but not from GHCR.`)) return;

        try {
            const res = await axios.delete(`${API}/admin/images/${encodeURIComponent(imageName)}`);
            if (res.data.success) {
                toast.success('Image reference removed');
                if (res.data.challenges_affected > 0) {
                    toast.info(`Note: ${res.data.challenges_affected} challenge(s) still use this image`);
                }
            } else {
                toast.info(res.data.message);
            }
            fetchImages();
        } catch (err) {
            toast.error('Failed to delete image');
        }
    };

    const cleanupOrphans = async () => {
        const orphanCount = images.filter(img => img.is_orphaned).length;
        if (orphanCount === 0) {
            toast.error('No orphaned images to clean up');
            return;
        }
        if (!confirm(`Clean up ${orphanCount} orphaned image(s)? This will remove references to images deleted from GHCR.`)) return;

        try {
            setLoading(true);
            const res = await axios.post(`${API}/admin/images/cleanup-orphans`);
            if (res.data.success) {
                toast.success(`Cleaned up ${res.data.cleaned_count} orphaned image(s)`);
                fetchImages();
            } else {
                toast.error(res.data.message);
            }
        } catch (err) {
            toast.error('Failed to cleanup orphaned images');
        } finally {
            setLoading(false);
        }
    };

    const deletePack = async (packId: string, packName: string) => {
        if (!confirm(`Delete challenge pack "${packName}"? This will remove the pack configuration but not the images from GHCR.`)) return;

        try {
            const res = await axios.delete(`${API}/admin/challenge-packs/${packId}`);
            if (res.data.success) {
                toast.success('Challenge pack deleted');
                fetchImages();
            } else {
                toast.error(res.data.message || 'Failed to delete pack');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to delete pack');
        }
    };

    const orphanCount = images.filter(img => img.is_orphaned).length;

    if (loadingConfig) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                    <p className="text-gray-500 font-mono text-sm">Loading Configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <img src="/logo.png" alt="ZecurX" className="w-8 h-8" />
                        Image Registry
                    </h1>
                    <p className="text-gray-500 mt-1">Manage Docker images for CTF challenges</p>
                </div>
            </div>

            {/* GHCR Configuration */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                            <img src="/github-mark.svg" alt="GitHub" className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900">GitHub Container Registry</h2>
                            <p className="text-sm text-gray-500">Connect your GitHub account to store images</p>
                        </div>
                    </div>
                    {ghcrConfig.connected && !isEditing && (
                        <Badge className="bg-emerald-100 text-emerald-700" variant={undefined}>
                            <Check className="w-3 h-3 mr-1" /> Connected
                        </Badge>
                    )}
                </div>

                {/* Saved Configuration View (GitHub-style) */}
                {!isEditing && ghcrConfig.connected ? (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-500">Username:</span>
                                    <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{ghcrConfig.username}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-500">Token:</span>
                                    <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">ghp_••••••••••••</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                                    Edit
                                </Button>
                                <a
                                    href={`https://github.com/${ghcrConfig.username}?tab=packages`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    View on GitHub
                                </a>
                            </div>
                        </div>
                        <div className="p-3 bg-emerald-50 border-t border-emerald-100 flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm text-emerald-700">Configuration active and working</span>
                        </div>
                    </div>
                ) : (
                    /* Edit Configuration Form */
                    <>
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Username</label>
                                <Input
                                    value={ghcrConfig.username}
                                    onChange={(e) => setGhcrConfig(prev => ({ ...prev, username: e.target.value }))}
                                    placeholder="e.g., ZecurX"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Personal Access Token
                                    <span className="text-gray-400 font-normal ml-1">(write:packages scope)</span>
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showToken ? 'text' : 'password'}
                                        value={ghcrConfig.token}
                                        onChange={(e) => setGhcrConfig(prev => ({ ...prev, token: e.target.value }))}
                                        placeholder="ghp_xxxxxxxxxxxx"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowToken(!showToken)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <Button
                                onClick={testConnection}
                                disabled={testingConnection || !ghcrConfig.username || !ghcrConfig.token || ghcrConfig.token === '***'}
                                variant="outline"
                            >
                                {testingConnection ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Testing...
                                    </>
                                ) : (
                                    <>
                                        <Link2 className="w-4 h-4 mr-2" />
                                        Test Connection
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={saveGHCRConfig}
                                disabled={saving || !ghcrConfig.username || !ghcrConfig.token || ghcrConfig.token === '***'}
                            >
                                {saving ? 'Saving...' : 'Save Configuration'}
                            </Button>
                            {ghcrConfig.connected && (
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsEditing(false)}
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Build New Image */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <Upload className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900">Build New Image</h2>
                            <p className="text-sm text-gray-500">Upload ZIP or import from GitHub repository</p>
                        </div>
                    </div>
                </div>

                {/* Source Tabs */}
                <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
                    <button
                        onClick={() => { setBuildSource('zip'); setSelectedRepo(null); setSelectedFolder(''); setFolderPreview(null); }}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${buildSource === 'zip' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Upload className="w-4 h-4" />
                        Upload ZIP
                    </button>
                    <button
                        onClick={() => { setBuildSource('github'); if (githubConnected) fetchGithubRepos(); }}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${buildSource === 'github' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <GitBranch className="w-4 h-4" />
                        From GitHub
                    </button>
                </div>

                {/* ZIP Upload Section */}
                {buildSource === 'zip' && (
                    <>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image Name</label>
                                <Input
                                    value={buildName}
                                    onChange={(e) => setBuildName(e.target.value)}
                                    placeholder="e.g., linux-basics, web-exploit"
                                    disabled={buildProgress === 'uploading' || buildProgress === 'building' || buildProgress === 'pushing'}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Will be: ghcr.io/{ghcrConfig.username?.toLowerCase() || 'username'}/{buildName.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'image-name'}:latest
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                                    <span>ZIP File</span>
                                    <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Max 300MB</span>
                                </label>
                                <input
                                    type="file"
                                    accept=".zip"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0] || null;
                                        setBuildFile(file);

                                        if (file) {
                                            // Skip preview for files larger than 50MB
                                            if (file.size > 50 * 1024 * 1024) {
                                                setZipPreview(null);
                                                toast.info('File too large for preview (>50MB). Build will still work.');
                                                return;
                                            }

                                            // Fetch ZIP preview
                                            setLoadingZipPreview(true);
                                            try {
                                                const formData = new FormData();
                                                formData.append('file', file);
                                                const res = await axios.post(`${API}/admin/preview-zip`, formData);
                                                setZipPreview(res.data);
                                            } catch (err) {
                                                console.error('ZIP preview failed', err);
                                                setZipPreview(null);
                                            } finally {
                                                setLoadingZipPreview(false);
                                            }
                                        } else {
                                            setZipPreview(null);
                                        }
                                    }}
                                    disabled={buildProgress === 'uploading' || buildProgress === 'building' || buildProgress === 'pushing'}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    💡 Files over 50MB won't show preview but will still build successfully
                                </p>
                            </div>

                        </div>

                        {/* ZIP Preview Section */}
                        {loadingZipPreview && (
                            <div className="mt-4 text-center py-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm text-gray-500">Scanning ZIP contents...</span>
                            </div>
                        )}

                        {zipPreview && buildFile && !loadingZipPreview && (
                            <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">ZIP Preview</span>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {zipPreview.total_files} files • {zipPreview.total_size < 1024 * 1024
                                            ? `${(zipPreview.total_size / 1024).toFixed(1)} KB`
                                            : `${(zipPreview.total_size / 1024 / 1024).toFixed(1)} MB`
                                        }
                                    </span>
                                </div>
                                <div className="p-3 max-h-40 overflow-y-auto font-mono text-[11px] space-y-1">
                                    {!zipPreview.has_dockerfile && (
                                        <div className="p-2 mb-2 bg-red-50 text-red-600 rounded flex items-center gap-2 border border-red-100">
                                            <AlertCircle className="w-3 h-3" />
                                            <span>No Dockerfile found!</span>
                                        </div>
                                    )}
                                    {zipPreview.files.slice(0, 20).map((file, i) => (
                                        <div key={i} className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 rounded px-1 transition-colors">
                                            <span className="text-gray-300 w-4">{i + 1}.</span>
                                            {file.name.toLowerCase().includes('dockerfile') ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowFileModal('dockerfile')}
                                                    className="text-blue-600 font-medium hover:underline cursor-pointer"
                                                >
                                                    {file.name} 📄
                                                </button>
                                            ) : file.name.toLowerCase().includes('docker-compose') ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowFileModal('compose')}
                                                    className="text-purple-600 font-medium hover:underline cursor-pointer"
                                                >
                                                    {file.name} 📦
                                                </button>
                                            ) : (
                                                <span className={file.is_dir ? 'text-gray-400 italic' : ''}>
                                                    {file.name}{file.is_dir && ' /'}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {zipPreview.files.length > 20 && (
                                        <div className="text-gray-400 text-center pt-2">
                                            ... and {zipPreview.files.length - 20} more files
                                        </div>
                                    )}
                                </div>
                                {/* Detected ports - Enhanced with source info */}
                                {zipPreview.detected_ports.length > 0 && (
                                    <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Check className="w-3 h-3 text-emerald-600" />
                                            <span className="text-xs text-emerald-700 font-semibold">
                                                Detected ports: <strong className="text-emerald-800">{zipPreview.detected_ports.join(', ')}</strong>
                                            </span>
                                        </div>
                                        {zipPreview.port_detection_info?.sources && zipPreview.port_detection_info.sources.length > 0 && (
                                            <div className="text-[10px] text-emerald-600 ml-5">
                                                From: {zipPreview.port_detection_info.sources.join(' + ')}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Additional Dockerfiles found */}
                                {zipPreview.additional_dockerfiles && zipPreview.additional_dockerfiles.length > 0 && (
                                    <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-blue-600" />
                                        <span className="text-xs text-blue-700">
                                            Additional Dockerfiles: <strong>{zipPreview.additional_dockerfiles.join(', ')}</strong>
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Build Log - White Background */}
                        {buildProgress !== 'idle' && (
                            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-sm max-h-40 overflow-y-auto">
                                {buildLogs.map((log, i) => (
                                    <div
                                        key={i}
                                        className={
                                            log.includes('✅') ? 'text-emerald-600' :
                                                log.includes('❌') ? 'text-red-600' :
                                                    log.includes('📦') ? 'text-blue-600 font-medium' :
                                                        'text-gray-600'
                                        }
                                    >
                                        {log}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-4 flex gap-3">
                            <Button
                                onClick={handleBuildUpload}
                                disabled={buildProgress === 'uploading' || buildProgress === 'building' || buildProgress === 'pushing' || !ghcrConfig.connected || !buildFile || !buildName}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {buildProgress === 'uploading' || buildProgress === 'building' || buildProgress === 'pushing' ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        {buildProgress === 'uploading' ? 'Uploading...' : buildProgress === 'building' ? 'Building...' : 'Pushing...'}
                                    </>
                                ) : (
                                    <>
                                        <Server className="w-4 h-4 mr-2" />
                                        Build & Push Image
                                    </>
                                )}
                            </Button>
                            {(buildProgress === 'done' || buildProgress === 'error') && (
                                <Button variant="outline" onClick={resetBuild}>
                                    Build Another
                                </Button>
                            )}
                        </div>

                        {!ghcrConfig.connected && (
                            <p className="text-sm text-amber-600 mt-3">
                                <AlertCircle className="w-4 h-4 inline mr-1" />
                                Connect GHCR above before building
                            </p>
                        )}
                    </>
                )}

                {/* GitHub Source Section */}
                {buildSource === 'github' && (
                    <div className="space-y-4">
                        {!githubConnected ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                                <img src="/github-mark.svg" alt="GitHub" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <h4 className="font-medium text-gray-700 mb-2">Connect GitHub to browse repositories</h4>
                                <p className="text-sm text-gray-500 mb-4">Your GHCR token will be used to access your repos</p>
                                {ghcrConfig.connected ? (
                                    <Button onClick={() => { checkGithubStatus(); fetchGithubRepos(); }}>
                                        <GitBranch className="w-4 h-4 mr-2" />
                                        Load Repositories
                                    </Button>
                                ) : (
                                    <p className="text-sm text-amber-600">
                                        <AlertCircle className="w-4 h-4 inline mr-1" />
                                        Configure GHCR first
                                    </p>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Repo Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Repository</label>
                                    {loadingGithub ? (
                                        <div className="text-center py-4 text-gray-400">Loading repos...</div>
                                    ) : (
                                        <select
                                            value={selectedRepo?.full_name || ''}
                                            onChange={(e) => {
                                                const repo = githubRepos.find(r => r.full_name === e.target.value);
                                                setSelectedRepo(repo || null);
                                                setRepoFolders([]);
                                                setSelectedFolder('');
                                                setFolderPreview(null);
                                                if (repo) fetchRepoFolders(repo, '');
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">-- Select a repository --</option>
                                            {githubRepos.map(repo => (
                                                <option key={repo.full_name} value={repo.full_name}>
                                                    {repo.private && '🔒 '}{repo.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Folder Browser */}
                                {selectedRepo && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Challenge Folder
                                            <span className="text-gray-400 font-normal ml-2">
                                                (must contain Dockerfile or docker-compose.yml)
                                            </span>
                                        </label>
                                        {loadingFolders ? (
                                            <div className="text-center py-4 text-gray-400">Loading folders...</div>
                                        ) : (
                                            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                                {repoFolders.filter(f => f.type === 'dir').map(folder => (
                                                    <button
                                                        key={folder.path}
                                                        type="button"
                                                        onClick={() => previewGithubFolder(selectedRepo, folder.path)}
                                                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 border-b last:border-b-0 ${selectedFolder === folder.path ? 'bg-blue-50 text-blue-700' : ''
                                                            }`}
                                                    >
                                                        <FolderOpen className="w-4 h-4 text-amber-500" />
                                                        <span className="font-mono text-sm">{folder.name}</span>
                                                    </button>
                                                ))}
                                                {repoFolders.filter(f => f.type === 'dir').length === 0 && (
                                                    <p className="p-3 text-sm text-gray-500 text-center">No folders found in root</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Folder Preview */}
                                {folderPreview && (
                                    <div className={`p-4 rounded-lg border ${folderPreview.can_build ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {folderPreview.can_build ? (
                                                <Check className="w-5 h-5 text-emerald-600" />
                                            ) : (
                                                <AlertCircle className="w-5 h-5 text-red-600" />
                                            )}
                                            <span className={`font-medium ${folderPreview.can_build ? 'text-emerald-700' : 'text-red-700'}`}>
                                                {folderPreview.has_compose ? '🧩 Docker Compose Pack' : folderPreview.has_dockerfile ? '📦 Single Image' : 'No build files found'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            Files: {folderPreview.files.slice(0, 5).join(', ')}{folderPreview.files.length > 5 && '...'}
                                        </p>
                                    </div>
                                )}

                                {/* Image Name & Build Button */}
                                {folderPreview?.can_build && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Image/Pack Name</label>
                                            <Input
                                                value={buildName}
                                                onChange={(e) => setBuildName(e.target.value)}
                                                placeholder="e.g., web-challenge, multi-service-ctf"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <Button
                                                onClick={buildFromGithub}
                                                disabled={!buildName.trim() || buildProgress !== 'idle'}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                {buildProgress === 'building' ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                        Building...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Server className="w-4 h-4 mr-2" />
                                                        Build from GitHub
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Build Logs */}
                                {buildLogs.length > 0 && (
                                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 max-h-40 overflow-y-auto">
                                        {buildLogs.map((log, i) => (
                                            <div key={i}>{log}</div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Image Library */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                            {imagesTab === 'images' ? (
                                <Box className="w-5 h-5 text-white" />
                            ) : (
                                <Layers className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900">
                                {imagesTab === 'images' ? 'Your Images' : 'Your Challenge Packs'}
                            </h2>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-500">
                                    {imagesTab === 'images' ? `${images.length} images` : `${challengePacks.length} packs`}
                                </p>
                                {imagesTab === 'images' && orphanCount > 0 && (
                                    <span className="text-xs text-amber-600 font-medium">
                                        ({orphanCount} orphaned)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        {/* Tab Switcher */}
                        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mr-2">
                            <button
                                onClick={() => setImagesTab('images')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${imagesTab === 'images' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Box className="w-3.5 h-3.5" />
                                Images
                            </button>
                            <button
                                onClick={() => setImagesTab('packs')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${imagesTab === 'packs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                Packs ({challengePacks.length})
                            </button>
                        </div>
                        {imagesTab === 'images' && orphanCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={cleanupOrphans}
                                disabled={loading}
                                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clean {orphanCount} Orphan{orphanCount > 1 ? 's' : ''}
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={fetchImages} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>


                {/* Images Tab Content */}
                {imagesTab === 'images' && (
                    <>
                        {loading ? (
                            <div className="text-center py-12 text-gray-500">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                                Loading images...
                            </div>
                        ) : images.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No images in your registry yet</p>
                                <p className="text-sm text-gray-400 mt-1">Build your first image above</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {images.map((img, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-4 rounded-xl transition-colors ${img.warning ? 'bg-amber-50 border border-amber-200' :
                                        img.in_use ? 'bg-emerald-50 border border-emerald-200' :
                                            'bg-gray-50 hover:bg-gray-100'
                                        }`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${img.warning ? 'bg-amber-100' :
                                                img.in_use ? 'bg-emerald-100' :
                                                    'bg-gray-200'
                                                }`}>
                                                <Box className={`w-5 h-5 ${img.warning ? 'text-amber-600' :
                                                    img.in_use ? 'text-emerald-600' :
                                                        'text-gray-600'
                                                    }`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-gray-900">
                                                        {img.in_use && img.used_by ? img.used_by : img.label}
                                                    </p>
                                                    {img.in_use && (
                                                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                                                            In Use
                                                        </Badge>
                                                    )}
                                                    {img.source === 'ghcr' && (
                                                        <Badge variant="outline" className="text-[10px]">
                                                            GHCR
                                                        </Badge>
                                                    )}
                                                    {img.warning && (
                                                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                                                            ⚠️ {img.warning}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 font-mono">{img.image}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {img.created_at && (
                                                <span className="text-xs text-gray-400">
                                                    {new Date(img.created_at).toLocaleDateString()}
                                                </span>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteImage(img.image)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Packs Tab Content */}
                {imagesTab === 'packs' && (
                    <>
                        {loading ? (
                            <div className="text-center py-12 text-gray-500">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                                Loading packs...
                            </div>
                        ) : challengePacks.length === 0 ? (
                            <div className="text-center py-12">
                                <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No challenge packs yet</p>
                                <p className="text-sm text-gray-400 mt-1">Build a docker-compose.yml based challenge above</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {challengePacks.map((pack) => (
                                    <div key={pack.id} className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-lg">🧩</span>
                                                    <h4 className="font-semibold text-gray-900">{pack.display_name}</h4>
                                                    <Badge className="bg-purple-100 text-purple-700" variant={undefined}>
                                                        {pack.images.length} container{pack.images.length !== 1 ? 's' : ''}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-gray-500 font-mono mb-3">{pack.pack_name}</p>

                                                {/* Container list */}
                                                <div className="flex flex-wrap gap-2">
                                                    {pack.images.map((img, i) => (
                                                        <div key={i} className="bg-white/70 border border-purple-100 rounded-lg px-3 py-1.5 text-xs">
                                                            <span className="font-medium text-gray-700">{img.name}</span>
                                                            {img.ports.length > 0 && (
                                                                <span className="text-gray-400 ml-2">
                                                                    :{img.ports.join(', :')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <span>{pack.combined_ports.length} port{pack.combined_ports.length !== 1 ? 's' : ''}</span>
                                                </div>
                                                {pack.created_at && (
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(pack.created_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => deletePack(pack.id, pack.display_name)}
                                                    className="mt-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete pack"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Dockerfile/Compose Viewer Modal */}
            {
                showFileModal && zipPreview && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
                        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                            {/* Header */}
                            <div className="bg-gray-100 px-6 py-4 flex items-center justify-between border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${showFileModal === 'dockerfile' ? 'bg-blue-100' : 'bg-purple-100'
                                        }`}>
                                        <Package className={`w-4 h-4 ${showFileModal === 'dockerfile' ? 'text-blue-600' : 'text-purple-600'
                                            }`} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">
                                            {showFileModal === 'dockerfile' ? 'Dockerfile' : 'docker-compose.yml'}
                                        </h3>
                                        <p className="text-xs text-gray-500">View contents for verification</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowFileModal(null)}
                                    className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-auto bg-gray-900 p-4">
                                <div className="font-mono text-sm">
                                    {(showFileModal === 'dockerfile'
                                        ? zipPreview.dockerfile_content
                                        : zipPreview.docker_compose_content
                                    )?.split('\n').map((line, i) => (
                                        <div key={i} className="flex hover:bg-gray-800/50 rounded px-2 -mx-2">
                                            <span className="w-10 text-gray-500 text-right mr-4 select-none flex-shrink-0">
                                                {i + 1}
                                            </span>
                                            <span className={
                                                showFileModal === 'dockerfile' ? (
                                                    line.startsWith('FROM') ? 'text-purple-400' :
                                                        line.startsWith('RUN') ? 'text-green-400' :
                                                            line.startsWith('COPY') || line.startsWith('ADD') ? 'text-blue-400' :
                                                                line.startsWith('EXPOSE') ? 'text-yellow-400 font-bold' :
                                                                    line.startsWith('CMD') || line.startsWith('ENTRYPOINT') ? 'text-orange-400' :
                                                                        line.startsWith('ENV') ? 'text-cyan-400' :
                                                                            line.startsWith('WORKDIR') ? 'text-pink-400' :
                                                                                line.startsWith('#') ? 'text-gray-500 italic' :
                                                                                    'text-gray-100'
                                                ) : (
                                                    // YAML syntax highlighting for docker-compose
                                                    line.match(/^\s*#/) ? 'text-gray-500 italic' :
                                                        line.match(/^\s*[a-z_]+:/) ? 'text-cyan-400' :
                                                            line.match(/^\s*-\s/) ? 'text-yellow-400' :
                                                                line.match(/:\s*$/) ? 'text-purple-400' :
                                                                    'text-gray-100'
                                                )
                                            }>
                                                {line || '\u00A0'}
                                            </span>
                                        </div>
                                    )) || (
                                            <div className="text-center text-gray-500 py-8">
                                                No content available
                                            </div>
                                        )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="bg-gray-100 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                                <div className="text-xs text-gray-500">
                                    {showFileModal === 'dockerfile' && zipPreview.detected_ports.length > 0 ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                            Detected ports: <strong className="text-gray-700">{zipPreview.detected_ports.join(', ')}</strong>
                                        </span>
                                    ) : showFileModal === 'dockerfile' ? (
                                        <span className="text-amber-600">No EXPOSE statements found</span>
                                    ) : null}
                                </div>
                                <button
                                    onClick={() => setShowFileModal(null)}
                                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminImageRegistry;
