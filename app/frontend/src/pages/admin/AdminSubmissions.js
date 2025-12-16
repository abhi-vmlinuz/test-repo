import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Search, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const AdminSubmissions = () => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, correct, incorrect

    useEffect(() => {
        fetchSubmissions();
    }, [filter]);

    const fetchSubmissions = async () => {
        try {
            const params = new URLSearchParams({ limit: '200' });
            if (filter === 'correct') params.append('solved_only', 'true');

            const response = await axios.get(`${API}/admin/submissions?${params}`);
            let data = response.data;

            // Client-side filter for incorrect if needed
            if (filter === 'incorrect') {
                data = data.filter(s => !s.solved);
            }

            setSubmissions(data);
        } catch (error) {
            toast.error('Failed to load submissions');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
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
                    <h1 className="text-3xl font-bold text-gray-900">Submissions</h1>
                    <p className="text-gray-500 mt-1">User progress and solve history</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                {['all', 'correct', 'incorrect'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {f === 'all' ? 'All' : f === 'correct' ? 'Solved' : 'In Progress'}
                    </button>
                ))}
            </div>

            {/* Submissions Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">User</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Challenge</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Points</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Hints Used</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {submissions.map((sub, idx) => (
                            <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <p className="font-medium text-gray-900">{sub.username}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-gray-900">{sub.challenge_title}</p>
                                </td>
                                <td className="px-6 py-4">
                                    {sub.solved ? (
                                        <span className="flex items-center gap-1 text-emerald-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Solved
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <XCircle className="w-4 h-4" />
                                            In Progress
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 font-mono text-gray-900">
                                    {sub.solved ? `+${sub.score_earned || 0}` : '—'}
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {sub.hints_used?.length || 0} hints
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {sub.solved_at ? new Date(sub.solved_at).toLocaleString() : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {submissions.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        No submissions found
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
                    <p className="text-xs text-gray-400">Total Records</p>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                        {submissions.filter(s => s.solved).length}
                    </p>
                    <p className="text-xs text-emerald-600">Solved</p>
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-600">
                        {submissions.filter(s => !s.solved).length}
                    </p>
                    <p className="text-xs text-gray-400">In Progress</p>
                </div>
            </div>
        </div>
    );
};

export default AdminSubmissions;
