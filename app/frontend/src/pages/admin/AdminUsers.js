import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Search, Shield, Ban, RotateCcw, ChevronDown, Crown, UserCog, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const AdminUsers = ({ user: currentAdmin }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserDetail, setShowUserDetail] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(null); // Track which dropdown is open

    useEffect(() => {
        fetchUsers();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.dropdown-container')) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API}/admin/users`);
            setUsers(response.data);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleBadge = (role) => {
        switch (role) {
            case 'superadmin':
                return <Badge className="bg-purple-100 text-purple-700"><Crown className="w-3 h-3 mr-1" />Superadmin</Badge>;
            case 'admin':
                return <Badge className="bg-indigo-100 text-indigo-700"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-600">User</Badge>;
        }
    };

    const handleBanToggle = async (targetUser) => {
        setOpenDropdown(null);
        const action = targetUser.is_banned ? 'unban' : 'ban';
        if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user "${targetUser.username}"?`)) {
            return;
        }
        try {
            await axios.put(`${API}/admin/users/${targetUser.id}`, {
                is_banned: !targetUser.is_banned
            });
            toast.success(`User ${action}ned`);
            fetchUsers();
        } catch (error) {
            toast.error(`Failed to ${action} user`);
        }
    };

    const handleResetProgress = async (targetUser) => {
        setOpenDropdown(null);
        if (!confirm(`Reset all progress for "${targetUser.username}"? This cannot be undone.`)) {
            return;
        }
        try {
            await axios.post(`${API}/admin/users/${targetUser.id}/reset-progress`);
            toast.success('Progress reset');
            fetchUsers();
            if (selectedUser?.id === targetUser.id) {
                viewUserDetail(targetUser.id);
            }
        } catch (error) {
            toast.error('Failed to reset progress');
        }
    };

    const handleRoleChange = async (targetUser, newRole) => {
        setOpenDropdown(null);
        if (currentAdmin?.role !== 'superadmin') {
            toast.error('Only superadmin can change roles');
            return;
        }
        try {
            await axios.put(`${API}/admin/users/${targetUser.id}`, {
                role: newRole
            });
            toast.success(`Role updated to ${newRole}`);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update role');
        }
    };

    const viewUserDetail = async (userId) => {
        try {
            const response = await axios.get(`${API}/admin/users/${userId}`);
            setSelectedUser(response.data);
            setShowUserDetail(true);
        } catch (error) {
            toast.error('Failed to load user details');
        }
    };

    const toggleDropdown = (userId, e) => {
        e.stopPropagation();
        setOpenDropdown(openDropdown === userId ? null : userId);
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-gray-200 rounded-xl" />
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
                    <h1 className="text-3xl font-bold text-gray-900">Users</h1>
                    <p className="text-gray-500 mt-1">{users.length} registered users</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                    type="text"
                    placeholder="Search by username or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-visible">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">User</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Role</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Score</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Joined</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                                            {u.username.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{u.username}</p>
                                            <p className="text-xs text-gray-400">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {getRoleBadge(u.role || 'user')}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-gray-900">{u.score || 0}</td>
                                <td className="px-6 py-4">
                                    {u.is_banned ? (
                                        <Badge className="bg-red-100 text-red-700">Banned</Badge>
                                    ) : (
                                        <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => viewUserDetail(u.id)}
                                            className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        >
                                            View
                                        </button>
                                        <div className="relative dropdown-container">
                                            <button
                                                onClick={(e) => toggleDropdown(u.id, e)}
                                                className={`p-2 rounded-lg transition-colors ${openDropdown === u.id
                                                        ? 'bg-gray-200 text-gray-700'
                                                        : 'text-gray-400 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === u.id ? 'rotate-180' : ''
                                                    }`} />
                                            </button>
                                            {openDropdown === u.id && (
                                                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-2 w-48 z-50">
                                                    <button
                                                        onClick={() => handleBanToggle(u)}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                        {u.is_banned ? 'Unban User' : 'Ban User'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetProgress(u)}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                        Reset Progress
                                                    </button>
                                                    {currentAdmin?.role === 'superadmin' && u.role !== 'superadmin' && (
                                                        <>
                                                            <hr className="my-2 border-gray-100" />
                                                            <button
                                                                onClick={() => handleRoleChange(u, u.role === 'admin' ? 'user' : 'admin')}
                                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                <UserCog className="w-4 h-4" />
                                                                {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        No users found
                    </div>
                )}
            </div>

            {/* User Detail Modal */}
            {showUserDetail && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                                    {selectedUser.username.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedUser.username}</h2>
                                    <p className="text-gray-400">{selectedUser.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUserDetail(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-900">{selectedUser.score || 0}</p>
                                    <p className="text-xs text-gray-400">Total Score</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-900">{selectedUser.solved_challenges?.length || 0}</p>
                                    <p className="text-xs text-gray-400">Solved</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-900 capitalize">{selectedUser.role || 'user'}</p>
                                    <p className="text-xs text-gray-400">Role</p>
                                </div>
                            </div>

                            {/* Solved Challenges */}
                            <h3 className="font-semibold text-gray-900 mb-4">Solved Challenges</h3>
                            {selectedUser.solved_challenges?.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedUser.solved_challenges.map((progress, idx) => (
                                        <div key={idx} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
                                            <span className="text-gray-900">{progress.challenge_title}</span>
                                            <span className="font-mono text-sm text-gray-500">+{progress.score_earned} pts</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8">No challenges solved yet</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
