import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Package, Settings, RefreshCw, Upload, Trash2, Check, AlertCircle, Link2, Eye, EyeOff, Server, Box } from 'lucide-react';
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
}

interface GHCRConfig {
    username: string;
    token: string;
    connected: boolean;
}

const AdminImageRegistry = () => {
    const [images, setImages] = useState<DockerImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [ghcrConfig, setGhcrConfig] = useState<GHCRConfig>({ username: '', token: '', connected: false });
    const [showToken, setShowToken] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);

    // Build section
    const [buildFile, setBuildFile] = useState<File | null>(null);
    const [buildName, setBuildName] = useState('');
    const [buildProgress, setBuildProgress] = useState<'idle' | 'uploading' | 'building' | 'pushing' | 'done' | 'error'>('idle');
    const [buildLogs, setBuildLogs] = useState<string[]>([]);

    useEffect(() => {
        fetchGHCRConfig();
        fetchImages();
    }, []);

    const fetchGHCRConfig = async () => {
        try {
            const res = await axios.get(`${API}/admin/settings/ghcr`);
            setGhcrConfig(res.data);
        } catch (err) {
            // Config not set yet
        }
    };

    const fetchImages = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/admin/docker-images`);
            // Filter to only show GHCR images
            const ghcrImages = res.data.images.filter((img: DockerImage) => img.source === 'ghcr');
            setImages(ghcrImages);
        } catch (err) {
            toast.error('Failed to fetch images');
        }
        setLoading(false);
    };

    const saveGHCRConfig = async () => {
        setSaving(true);
        try {
            await axios.post(`${API}/admin/settings/ghcr`, {
                username: ghcrConfig.username,
                token: ghcrConfig.token
            });
            toast.success('GHCR configuration saved!');
            await fetchGHCRConfig();
            await fetchImages();
        } catch (err) {
            toast.error('Failed to save configuration');
        }
        setSaving(false);
    };

    const testConnection = async () => {
        setTestingConnection(true);
        try {
            const res = await axios.post(`${API}/admin/settings/ghcr/test`, {
                username: ghcrConfig.username,
                token: ghcrConfig.token
            });
            if (res.data.success) {
                toast.success('Connection successful! ✓');
                setGhcrConfig(prev => ({ ...prev, connected: true }));
            } else {
                toast.error(res.data.error || 'Connection failed');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Connection test failed');
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
                        setBuildLogs(prev => [...prev.slice(0, -1), `Uploading... ${percent}%`]);
                    }
                }
            });

            if (res.data.status === 'building') {
                setBuildProgress('building');
                setBuildLogs(prev => [...prev, 'Building Docker image...']);
                // Poll for build status
                pollBuildStatus(res.data.build_id);
            } else if (res.data.status === 'success') {
                setBuildProgress('done');
                setBuildLogs(prev => [...prev, `✓ Image built: ${res.data.image}`]);
                toast.success('Image built and pushed to GHCR!');
                fetchImages();
            } else {
                throw new Error(res.data.error || 'Build failed');
            }
        } catch (err: any) {
            setBuildProgress('error');
            setBuildLogs(prev => [...prev, `✗ Error: ${err.response?.data?.detail || err.message}`]);
            toast.error('Build failed');
        }
    };

    const pollBuildStatus = async (buildId: string) => {
        const checkStatus = async () => {
            try {
                const res = await axios.get(`${API}/admin/images/build/${buildId}/status`);
                if (res.data.status === 'building') {
                    setBuildLogs(prev => [...prev, res.data.log || 'Building...']);
                    setTimeout(checkStatus, 2000);
                } else if (res.data.status === 'pushing') {
                    setBuildProgress('pushing');
                    setBuildLogs(prev => [...prev, 'Pushing to GHCR...']);
                    setTimeout(checkStatus, 2000);
                } else if (res.data.status === 'success') {
                    setBuildProgress('done');
                    setBuildLogs(prev => [...prev, `✓ Image ready: ${res.data.image}`]);
                    toast.success('Image built and pushed!');
                    fetchImages();
                } else {
                    setBuildProgress('error');
                    setBuildLogs(prev => [...prev, `✗ ${res.data.error}`]);
                }
            } catch (err) {
                setBuildProgress('error');
                setBuildLogs(prev => [...prev, '✗ Failed to check build status']);
            }
        };
        checkStatus();
    };

    const deleteImage = async (imageName: string) => {
        if (!confirm(`Delete image ${imageName}? This cannot be undone.`)) return;

        try {
            await axios.delete(`${API}/admin/images/${encodeURIComponent(imageName)}`);
            toast.success('Image deleted');
            fetchImages();
        } catch (err) {
            toast.error('Failed to delete image');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Package className="w-7 h-7" />
                    Image Registry
                </h1>
                <p className="text-gray-500 mt-1">Manage Docker images for CTF challenges</p>
            </div>

            {/* GHCR Configuration */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                            <Settings className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900">GitHub Container Registry</h2>
                            <p className="text-sm text-gray-500">Connect your GitHub account to store images</p>
                        </div>
                    </div>
                    {ghcrConfig.connected && (
                        <Badge className="bg-emerald-100 text-emerald-700" variant={undefined}>
                            <Check className="w-3 h-3 mr-1" /> Connected
                        </Badge>
                    )}
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Username</label>
                        <Input
                            value={ghcrConfig.username}
                            onChange={(e) => setGhcrConfig(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="e.g., Abhizzz123"
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
                        disabled={testingConnection || !ghcrConfig.username || !ghcrConfig.token}
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
                        disabled={saving || !ghcrConfig.username || !ghcrConfig.token}
                    >
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </div>

            {/* Build New Image */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900">Build New Image</h2>
                        <p className="text-sm text-gray-500">Upload a ZIP with Dockerfile to build and push</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image Name</label>
                        <Input
                            value={buildName}
                            onChange={(e) => setBuildName(e.target.value)}
                            placeholder="e.g., linux-basics, web-exploit"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Will be: ghcr.io/{ghcrConfig.username || 'username'}/{buildName || 'image-name'}:latest
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP File</label>
                        <input
                            type="file"
                            accept=".zip"
                            onChange={(e) => setBuildFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                        />
                    </div>
                </div>

                {buildProgress !== 'idle' && (
                    <div className="mt-4 bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 max-h-40 overflow-y-auto">
                        {buildLogs.map((log, i) => (
                            <div key={i} className={log.startsWith('✓') ? 'text-emerald-400' : log.startsWith('✗') ? 'text-red-400' : ''}>
                                {log}
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-4">
                    <Button
                        onClick={handleBuildUpload}
                        disabled={buildProgress === 'uploading' || buildProgress === 'building' || buildProgress === 'pushing' || !ghcrConfig.connected}
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
                    {!ghcrConfig.connected && (
                        <p className="text-sm text-amber-600 mt-2">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            Connect GHCR above before building
                        </p>
                    )}
                </div>
            </div>

            {/* Image Library */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                            <Box className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900">Your Images</h2>
                            <p className="text-sm text-gray-500">{images.length} images in GHCR</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchImages} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

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
                            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                        <Box className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{img.label}</p>
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
            </div>
        </div>
    );
};

export default AdminImageRegistry;
