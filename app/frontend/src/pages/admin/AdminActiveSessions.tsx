
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Shield, Trash2, Search, Monitor, Globe, Clock, Calendar, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Session {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    user_avatar: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
    last_activity_at: string;
    expires_at: string;
}

const AdminActiveSessions = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            // Note: Ensure the backend endpoint /api/admin/sessions/active returns the expected data structure
            const res = await axios.get(`${API}/admin/sessions/active`);
            setSessions(res.data);
        } catch (err) {
            toast.error('Failed to load active sessions');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async (sessionId) => {
        if (!confirm('Are you sure you want to force logout this session? The user will be logged out immediately.')) return;

        try {
            await axios.delete(`${API}/admin/sessions/active/${sessionId}`);
            toast.success('Session terminated successfully');
            setSessions(sessions.filter(s => s.id !== sessionId));
        } catch (err) {
            toast.error('Failed to terminate session');
            console.error(err);
        }
    };

    const filteredSessions = sessions.filter(s => {
        const query = search.toLowerCase();
        return (
            (s.user_name && s.user_name.toLowerCase().includes(query)) ||
            (s.user_email && s.user_email.toLowerCase().includes(query)) ||
            (s.ip_address && s.ip_address.includes(query))
        );
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-black" />
                        Active Sessions
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Monitor and manage active user sessions. Superadmin access only.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 text-sm font-medium rounded-full border border-zinc-200">
                        <Users className="w-4 h-4" />
                        {sessions.length} Active Users
                    </span>
                    <button
                        onClick={fetchSessions}
                        className="p-2.5 text-gray-500 hover:text-zinc-900 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200"
                        title="Refresh"
                    >
                        <Monitor className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-zinc-800 transition-colors" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all shadow-sm group-hover:shadow-md"
                    placeholder="Search by user, email, or IP address..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Table Card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
                                <th className="px-6 py-4 font-semibold">User Identity</th>
                                <th className="px-6 py-4 font-semibold">Network Info</th>
                                <th className="px-6 py-4 font-semibold">Timestamps</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <AnimatePresence mode="popLayout">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-gray-500 text-sm">Loading session data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredSessions.length === 0 ? (
                                    <tr className="bg-gray-50">
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <p className="text-gray-500 font-medium">No active sessions found matching your search.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSessions.map((session) => (
                                        <motion.tr
                                            key={session.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="group hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <img
                                                            src={session.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user_name || 'U')}&background=18181b&color=fff`}
                                                            className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-sm"
                                                            alt=""
                                                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user_name || 'U')}&background=18181b&color=fff`; }}
                                                        />
                                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-zinc-900">{session.user_name || 'Unknown'}</div>
                                                        <div className="text-xs text-gray-500 font-mono mt-0.5">{session.user_email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-sm text-zinc-700">
                                                        <Globe className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="font-mono bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-xs text-zinc-600">
                                                            {session.ip_address}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 truncate max-w-[200px] flex items-center gap-2" title={session.user_agent}>
                                                        <Monitor className="w-3.5 h-3.5" />
                                                        {session.user_agent.split(')')[0] + ')'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-xs text-zinc-600" title="Last Active">
                                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                        <span className="font-medium">Active:</span> {new Date(session.last_activity_at).toLocaleTimeString()}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-400" title="Login Time">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>Login:</span> {new Date(session.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleLogout(session.id)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100 hover:border-red-200"
                                                    title="Force logout this user"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Terminate
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminActiveSessions;
