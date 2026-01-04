
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { API, toast } from '../App';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Target, Shield, Zap, Award, Github, Twitter, Linkedin, Globe, MapPin, User, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const PublicProfile = ({ user, logout }) => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    const fetchProfile = async () => {
        setLoading(true);
        setError(false);
        try {
            const response = await axios.get(`${API}/profile/${userId}`);
            setProfile(response.data);
        } catch (error) {
            console.error('Failed to load profile:', error);
            setError(true);
            toast.error('User not found or profile is private');
        } finally {
            setLoading(false);
        }
    };

    // Activity Calendar Component
    const ActivityCalendar = ({ data }) => {
        const today = new Date();
        // Generate dates for the last 365 days
        const dates = [];
        for (let i = 364; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }

        const getColor = (count) => {
            if (!count) return 'bg-gray-100'; // 0
            if (count === 1) return 'bg-emerald-200'; // 1
            if (count <= 3) return 'bg-emerald-300'; // 2-3
            if (count <= 6) return 'bg-emerald-400'; // 4-6
            return 'bg-emerald-500'; // 7+
        };

        return (
            <div className="w-full overflow-x-auto pb-2">
                <div className="flex gap-1 min-w-max">
                    {Array.from({ length: 53 }).map((_, weekIndex) => (
                        <div key={weekIndex} className="grid grid-rows-7 gap-1">
                            {Array.from({ length: 7 }).map((_, dayIndex) => {
                                const dateIndex = weekIndex * 7 + dayIndex;
                                if (dateIndex >= dates.length) return null;
                                const date = dates[dateIndex];
                                const count = data[date] || 0;

                                return (
                                    <div
                                        key={date}
                                        className={`w-3 h-3 rounded-[2px] ${getColor(count)}`}
                                        title={`${date}: ${count} contributions`}
                                    ></div>
                                );
                            })}
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 justify-end">
                    <span>Less</span>
                    <div className="w-3 h-3 bg-gray-100 rounded-[2px]"></div>
                    <div className="w-3 h-3 bg-emerald-200 rounded-[2px]"></div>
                    <div className="w-3 h-3 bg-emerald-300 rounded-[2px]"></div>
                    <div className="w-3 h-3 bg-emerald-400 rounded-[2px]"></div>
                    <div className="w-3 h-3 bg-emerald-500 rounded-[2px]"></div>
                    <span>More</span>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-900 rounded-xl animate-spin" />
                    <p className="text-gray-500 font-mono text-sm">Loading Profile...</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <Layout user={user} logout={logout}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
                    <User className="w-16 h-16 text-gray-200 mb-4" />
                    <h2 className="text-xl font-bold text-zinc-900 mb-2">User Not Found</h2>
                    <p className="text-gray-500 mb-6">The user profile you are looking for does not exist or may have been removed.</p>
                    <button
                        onClick={() => navigate('/leaderboard')}
                        className="px-6 py-2 bg-zinc-900 text-white rounded-lg font-bold hover:bg-black transition-colors"
                    >
                        Back to Leaderboard
                    </button>
                </div>
            </Layout>
        )
    }

    const socialIcons = {
        github: Github,
        twitter: Twitter,
        linkedin: Linkedin,
        website: Globe,
        instagram: null  // Will use img tag instead
    };

    return (
        <Layout user={user} logout={logout}>
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-zinc-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                {/* Profile Header */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8 relative">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-zinc-900 via-gray-800 to-zinc-900"></div>

                    <div className="relative flex flex-col md:flex-row items-end gap-6 pt-16 -mb-2">
                        {/* Avatar */}
                        <div className="relative">
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.username}
                                    className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg object-cover bg-white"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg bg-zinc-900 flex items-center justify-center text-4xl font-bold text-white">
                                    {profile.username.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 mb-2">
                            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">{profile.username}</h1>
                            <p className="text-gray-500 font-medium flex items-center gap-2">
                                User joined {profile.member_since}
                            </p>
                        </div>

                        {/* Stats Cards */}
                        <div className="flex gap-4 mb-2">
                            <div className="text-center px-6 py-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Rank</div>
                                <div className="text-2xl font-black text-zinc-900 font-mono">#{profile.rank}</div>
                            </div>
                            <div className="text-center px-6 py-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Score</div>
                                <div className="text-2xl font-black text-zinc-900 font-mono">{profile.score.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Bio & Links */}
                    <div className="mt-8 grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-4">
                            {profile.bio ? (
                                <p className="text-gray-600 leading-relaxed text-lg">{profile.bio}</p>
                            ) : (
                                <p className="text-gray-400 italic">No bio available.</p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                            {profile.social_links && Object.entries(profile.social_links).map(([platform, url]) => {
                                if (!url) return null;
                                const Icon = socialIcons[platform];
                                return (
                                    <a
                                        key={platform}
                                        href={url as string}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                                        title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                                    >
                                        {platform === 'instagram' ? (
                                            <img src="/instagram-mono.svg" className="w-5 h-5 opacity-70" alt="Instagram" />
                                        ) : platform === 'github' ? (
                                            <img src="/github-mark.svg" className="w-5 h-5 opacity-70" alt="GitHub" />
                                        ) : platform === 'linkedin' ? (
                                            <img src="/linkedin.svg" className="w-5 h-5 opacity-90" alt="LinkedIn" />
                                        ) : platform === 'twitter' ? (
                                            <img src="/x.svg" className="w-5 h-5 opacity-70" alt="X" />
                                        ) : Icon ? (
                                            <Icon className="w-5 h-5 text-gray-600" />
                                        ) : (
                                            <Globe className="w-5 h-5 text-gray-600" />
                                        )}
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Left Col: Activity & Achievements */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Activity Calendar */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-500" />
                                Activity Log
                            </h3>
                            <ActivityCalendar data={profile.activity} />
                        </div>

                        {/* Achievements */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                Achievements
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {profile.achievements.map((achievement, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${achievement.earned
                                            ? 'bg-zinc-900 border-zinc-900 text-white'
                                            : 'bg-gray-50 border-gray-100 text-gray-400 grayscale opacity-50'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${achievement.earned ? 'bg-white/10' : 'bg-gray-200'}`}>
                                            <Award className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm">{achievement.name}</div>
                                            <div className="text-xs opacity-70 mt-1">{achievement.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Stats Breakdown */}
                    <div className="space-y-8">
                        {/* Category Progress */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                                <Target className="w-5 h-5 text-red-500" />
                                Skill Breakdown
                            </h3>
                            <div className="space-y-5">
                                {profile.category_stats.map((cat, idx) => {
                                    const percentage = cat.total > 0 ? (cat.solved / cat.total) * 100 : 0;
                                    return (
                                        <div key={idx}>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-sm font-bold text-gray-700">{cat.category}</span>
                                                <span className="text-xs font-mono text-gray-500">{cat.solved}/{cat.total}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-zinc-900 rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Overall Completion */}
                        <div className="bg-zinc-900 text-white rounded-2xl shadow-xl p-8 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                            <div className="relative z-10">
                                <div className="text-5xl font-black font-mono mb-2">{profile.completion_percentage}%</div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Platform Completion</div>

                                <div className="flex justify-center gap-4 text-sm font-medium text-gray-300">
                                    <div>
                                        <span className="text-white font-bold block text-lg">{profile.challenges_solved}</span>
                                        Solved
                                    </div>
                                    <div className="w-px bg-white/10"></div>
                                    <div>
                                        <span className="text-white font-bold block text-lg">{profile.score}</span>
                                        Points
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </Layout >
    );
};

export default PublicProfile;
