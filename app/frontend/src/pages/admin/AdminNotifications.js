import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import {
    Bell, Send, Users, User, Search, X, Check, MessageCircle,
    Megaphone, Clock, ChevronDown, Trash2, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const AdminNotifications = ({ user }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('announcement');
    const [targetType, setTargetType] = useState('all');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [sending, setSending] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await axios.get(`${API}/admin/notifications`);
            setNotifications(response.data || []);
        } catch (error) {
            console.log('Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async (query) => {
        setSearchQuery(query);
        setSearching(true);
        try {
            // Always search - even with empty query to show initial users
            const response = await axios.get(`${API}/admin/users/search?q=${encodeURIComponent(query)}`);
            // Filter out already selected users
            const filtered = (response.data || []).filter(
                u => !selectedUsers.find(s => s.id === u.id)
            );
            setSearchResults(filtered);
        } catch (error) {
            console.log('Search failed', error);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    // Load initial users when search field is focused
    const handleSearchFocus = () => {
        setSearchFocused(true);
        if (searchResults.length === 0) {
            searchUsers('');
        }
    };

    const addUser = (selectedUser) => {
        setSelectedUsers([...selectedUsers, selectedUser]);
        setSearchQuery('');
        setSearchResults(searchResults.filter(u => u.id !== selectedUser.id));
    };

    const removeUser = (userId) => {
        setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
    };

    const sendNotification = async () => {
        if (!title.trim() || !message.trim()) {
            toast.error('Please fill in title and message');
            return;
        }

        if (targetType === 'specific' && selectedUsers.length === 0) {
            toast.error('Please select at least one user');
            return;
        }

        setSending(true);
        try {
            await axios.post(`${API}/admin/notifications`, {
                title,
                message,
                type,
                target_type: targetType,
                target_user_ids: targetType === 'specific' ? selectedUsers.map(u => u.id) : null
            });
            toast.success('Notification sent successfully!');
            setShowCreateModal(false);
            resetForm();
            fetchNotifications();
        } catch (error) {
            toast.error('Failed to send notification');
        } finally {
            setSending(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setMessage('');
        setType('announcement');
        setTargetType('all');
        setSelectedUsers([]);
        setSearchQuery('');
        setSearchResults([]);
        setSearchFocused(false);
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-48" />
                    <div className="h-64 bg-gray-200 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-500 mt-1">Send announcements and messages to users</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="bg-gray-900 hover:bg-gray-800">
                    <Send className="w-4 h-4 mr-2" /> Send Notification
                </Button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div
                    onClick={() => { setShowCreateModal(true); setTargetType('all'); setType('announcement'); }}
                    className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-shadow"
                >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                        <Megaphone className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Broadcast Announcement</h3>
                    <p className="text-sm text-white/80">Send a message to all users at once</p>
                </div>

                <div
                    onClick={() => { setShowCreateModal(true); setTargetType('specific'); setType('message'); }}
                    className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-shadow"
                >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                        <MessageCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Direct Message</h3>
                    <p className="text-sm text-white/80">Send a message to specific users</p>
                </div>
            </div>

            {/* Sent Notifications */}
            <div className="bg-white rounded-2xl border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Sent Notifications</h2>
                </div>

                {notifications.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((notif) => (
                            <div key={notif._id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.type === 'announcement' ? 'bg-purple-100' : 'bg-blue-100'
                                        }`}>
                                        {notif.type === 'announcement' ? (
                                            <Megaphone className="w-5 h-5 text-purple-600" />
                                        ) : (
                                            <MessageCircle className="w-5 h-5 text-blue-600" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-medium text-gray-900">{notif.title}</h3>
                                            <Badge variant="outline" className="text-xs">
                                                {notif.target_type === 'all' ? 'All Users' : 'Specific Users'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-500 line-clamp-2">{notif.message}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {notif.recipient_count} recipients
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Check className="w-3 h-3" />
                                                {notif.read_count} read
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(notif.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-400">No notifications sent yet</p>
                        <p className="text-sm text-gray-400 mt-1">Click "Send Notification" to get started</p>
                    </div>
                )}
            </div>

            {/* Create Notification Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="border-b border-gray-100 p-6 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-900">Send Notification</h2>
                            <button
                                onClick={() => { setShowCreateModal(false); resetForm(); }}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setType('announcement')}
                                        className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${type === 'announcement'
                                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Megaphone className="w-4 h-4" />
                                        Announcement
                                    </button>
                                    <button
                                        onClick={() => setType('message')}
                                        className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${type === 'message'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Message
                                    </button>
                                </div>
                            </div>

                            {/* Target Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setTargetType('all')}
                                        className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${targetType === 'all'
                                            ? 'border-gray-900 bg-gray-900 text-white'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Users className="w-4 h-4" />
                                        All Users
                                    </button>
                                    <button
                                        onClick={() => setTargetType('specific')}
                                        className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${targetType === 'specific'
                                            ? 'border-gray-900 bg-gray-900 text-white'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <User className="w-4 h-4" />
                                        Specific Users
                                    </button>
                                </div>
                            </div>

                            {/* User Search (for specific users) */}
                            {targetType === 'specific' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
                                    <div className="relative">
                                        {searching ? (
                                            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                                        ) : (
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        )}
                                        <Input
                                            value={searchQuery}
                                            onChange={(e) => searchUsers(e.target.value)}
                                            onFocus={handleSearchFocus}
                                            placeholder="Click here to search users..."
                                            className="pl-10"
                                        />
                                    </div>

                                    {/* Search Results */}
                                    {searchResults.length > 0 && (
                                        <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                            {searchResults.map((resultUser) => (
                                                <div
                                                    key={resultUser.id}
                                                    onClick={() => addUser(resultUser)}
                                                    className="p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-0"
                                                >
                                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                                        {resultUser.username.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{resultUser.username}</p>
                                                        <p className="text-xs text-gray-400">{resultUser.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* No results message */}
                                    {searchFocused && !searching && searchResults.length === 0 && (
                                        <div className="mt-2 p-4 border border-gray-200 rounded-xl text-center text-sm text-gray-400">
                                            No users found
                                        </div>
                                    )}

                                    {/* Selected Users */}
                                    {selectedUsers.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {selectedUsers.map((user) => (
                                                <Badge
                                                    key={user.id}
                                                    className="bg-gray-100 text-gray-700 flex items-center gap-1 pr-1"
                                                >
                                                    {user.username}
                                                    <button
                                                        onClick={() => removeUser(user.id)}
                                                        className="p-0.5 hover:bg-gray-200 rounded"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Notification title..."
                                />
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Write your message here..."
                                    className="w-full border border-gray-200 rounded-xl p-3 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-100 p-6 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => { setShowCreateModal(false); resetForm(); }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={sendNotification}
                                disabled={sending}
                                className="bg-gray-900 hover:bg-gray-800"
                            >
                                {sending ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Send Notification
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminNotifications;
