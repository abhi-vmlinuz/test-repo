import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import {
    ToggleLeft, ToggleRight, Plus, Trash2, Shield, Pencil,
    FlaskConical, Eye, EyeOff, X, Check, AlertTriangle
} from 'lucide-react';

const STATUS_CONFIG = {
    disabled: {
        label: 'Disabled',
        color: 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-zinc-700',
        dot: 'bg-gray-400',
        description: 'Hidden from everyone',
    },
    beta: {
        label: 'Beta',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        description: 'Superadmin only',
    },
    enabled: {
        label: 'Enabled',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        description: 'Available to everyone',
    },
};

const AdminFeatureFlags = ({ user }) => {
    const [flags, setFlags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editingKey, setEditingKey] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Create form state
    const [newFlag, setNewFlag] = useState({
        key: '', name: '', description: '', status: 'disabled'
    });

    useEffect(() => {
        fetchFlags();
    }, []);

    const fetchFlags = async () => {
        try {
            const response = await axios.get(`${API}/admin/features`);
            setFlags(response.data);
        } catch (error: any) {
            if (error.response?.status === 403) {
                toast.error('Superadmin access required');
            } else {
                toast.error('Failed to load feature flags');
            }
        } finally {
            setLoading(false);
        }
    };

    const createFlag = async () => {
        if (!newFlag.key || !newFlag.name) {
            toast.error('Key and name are required');
            return;
        }

        // Validate key format
        if (!/^[a-z][a-z0-9_]*$/.test(newFlag.key)) {
            toast.error('Key must be lowercase with underscores (e.g. firecracker_terminal)');
            return;
        }

        try {
            await axios.post(`${API}/admin/features`, newFlag);
            toast.success(`Feature "${newFlag.name}" created`);
            setNewFlag({ key: '', name: '', description: '', status: 'disabled' });
            setShowCreate(false);
            fetchFlags();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to create feature flag');
        }
    };

    const updateStatus = async (key: string, newStatus: string) => {
        try {
            await axios.put(`${API}/admin/features/${key}`, { status: newStatus });
            toast.success(`Feature "${key}" set to ${newStatus}`);
            fetchFlags();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to update feature flag');
        }
    };

    const deleteFlag = async (key: string) => {
        try {
            await axios.delete(`${API}/admin/features/${key}`);
            toast.success(`Feature "${key}" deleted`);
            setDeleteConfirm(null);
            fetchFlags();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to delete feature flag');
        }
    };

    if (user?.role !== 'superadmin') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Superadmin access required</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                            <FlaskConical className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Feature Flags</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Control feature availability across the platform</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
                >
                    {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showCreate ? 'Cancel' : 'New Flag'}
                </button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="mb-6 p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-sm dark:shadow-none">
                    <h3 className="text-sm font-semibold text-zinc-900 mb-4">Create Feature Flag</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Key (unique identifier)</label>
                            <input
                                type="text"
                                value={newFlag.key}
                                onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                placeholder="firecracker_terminal"
                                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Display Name</label>
                            <input
                                type="text"
                                value={newFlag.name}
                                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                                placeholder="Firecracker VM Terminal"
                                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Description</label>
                            <input
                                type="text"
                                value={newFlag.description}
                                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                                placeholder="MicroVM-based terminals for challenge environments"
                                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Initial Status</label>
                            <select
                                value={newFlag.status}
                                onChange={(e) => setNewFlag({ ...newFlag, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 bg-white dark:bg-zinc-900"
                            >
                                <option value="disabled">Disabled</option>
                                <option value="beta">Beta (Superadmin only)</option>
                                <option value="enabled">Enabled (Everyone)</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={createFlag}
                                className="flex items-center gap-2 px-5 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
                            >
                                <Check className="w-4 h-4" />
                                Create Flag
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status legend */}
            <div className="flex items-center gap-6 mb-6 px-1">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                        <span className="font-medium">{config.label}</span>
                        <span className="hidden sm:inline">— {config.description}</span>
                    </div>
                ))}
            </div>

            {/* Flags Table */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-6 h-6 border-2 border-gray-200 dark:border-zinc-700 border-t-zinc-900 rounded-full animate-spin" />
                </div>
            ) : flags.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl">
                    <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">No feature flags yet</p>
                    <p className="text-sm text-gray-400">Create your first flag to control feature visibility</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {flags.map((flag: any) => {
                        const statusConfig = STATUS_CONFIG[flag.status] || STATUS_CONFIG.disabled;

                        return (
                            <div
                                key={flag.key}
                                className="group bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-5 hover:border-gray-200 dark:border-zinc-700 hover:shadow-sm dark:shadow-none transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-semibold text-zinc-900">{flag.name}</h3>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{flag.description || 'No description'}</p>
                                        <code className="text-xs text-gray-400 bg-gray-50 dark:bg-zinc-800/50 px-2 py-1 rounded font-mono">{flag.key}</code>
                                    </div>

                                    <div className="flex items-center gap-1 ml-4">
                                        {/* Status toggle buttons */}
                                        <button
                                            onClick={() => updateStatus(flag.key, 'disabled')}
                                            className={`p-2 rounded-lg transition-colors ${flag.status === 'disabled' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300' : 'text-gray-300 hover:text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-zinc-800/50'}`}
                                            title="Disable"
                                        >
                                            <EyeOff className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => updateStatus(flag.key, 'beta')}
                                            className={`p-2 rounded-lg transition-colors ${flag.status === 'beta' ? 'bg-amber-50 text-amber-600' : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'}`}
                                            title="Beta (Superadmin only)"
                                        >
                                            <FlaskConical className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => updateStatus(flag.key, 'enabled')}
                                            className={`p-2 rounded-lg transition-colors ${flag.status === 'enabled' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-300 hover:text-emerald-500 hover:bg-emerald-50'}`}
                                            title="Enable for everyone"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>

                                        <div className="w-px h-5 bg-gray-100 dark:bg-zinc-800 mx-1" />

                                        {/* Delete */}
                                        {deleteConfirm === flag.key ? (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => deleteFlag(flag.key)}
                                                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                    title="Confirm delete"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-zinc-800/50 transition-colors"
                                                    title="Cancel"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(flag.key)}
                                                className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete flag"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info box */}
            <div className="mt-8 p-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-xl">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <p className="font-medium text-gray-600 dark:text-gray-400">How feature flags work</p>
                        <p><strong>Disabled</strong> — Feature is completely hidden. No one can access it.</p>
                        <p><strong>Beta</strong> — Only you (superadmin) can see and test the feature on production.</p>
                        <p><strong>Enabled</strong> — Feature is live for all users. Safe to merge into mainline.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminFeatureFlags;
