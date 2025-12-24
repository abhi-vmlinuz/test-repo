import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, Flag, Zap, Award, TrendingUp, Bell, Terminal, Shield, ArrowRight, Target
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';

const Dashboard = ({ user, logout }) => {
  const [stats, setStats] = useState(null);
  const [recentChallenges, setRecentChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, categoriesRes, challengesRes] = await Promise.all([
        axios.get(`${API}/stats/me`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/challenges`)
      ]);
      setStats(statsRes.data);
      setRecentChallenges(challengesRes.data.slice(0, 4));
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.log('Notifications error');
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/${notificationId}/read`);
      fetchNotifications();
    } catch (error) { }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API}/notifications/read-all`);
      await fetchNotifications();
    } catch (error) { }
  };

  const getDifficultyStyle = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSkillData = () => {
    if (!stats?.category_stats) return [];
    return stats.category_stats.map(cat => ({
      name: cat.category.substring(0, 8),
      value: cat.total > 0 ? Math.round((cat.solved / cat.total) * 100) : 0
    }));
  };
  const skillData = getSkillData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl animate-spin" />
          <p className="text-gray-500 font-mono text-sm">Initializing Secure Environment...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} logout={logout}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-50 border border-emerald-100/50 rounded-full mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-700 tracking-wide uppercase">System Operational</span>
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
              Welcome back, {user?.username}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Overview of your security clearance and performance.</p>
          </div>

          {/* Notification Center */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-9 h-9 bg-white border border-gray-200 text-gray-500 rounded-lg flex items-center justify-center hover:bg-gray-50 hover:text-zinc-900 transition-all active:scale-95"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden ring-1 ring-black/5">
                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Notifications</h3>
                  {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-zinc-900 font-medium hover:underline">Mark read</button>}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">All caught up</p>
                    </div>
                  ) : notifications.map(n => (
                    <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-3 ${!n.read ? 'bg-blue-50/30' : ''}`}>
                      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{n.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5 font-mono">{n.time_ago}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* LEFT COLUMN (STATS & CONTENT) */}
          <div className="lg:col-span-3 space-y-6">

            {/* Main Stats Row */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-none border-gray-200">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                        <Trophy className="w-4 h-4 text-zinc-900" />
                      </div>
                      {stats.rank && (
                        <div className="px-2 py-1 bg-amber-50 border border-amber-100 rounded text-[10px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                          <Award className="w-3 h-3" /> Rank #{stats.rank}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">Total Score</p>
                      <p className="text-2xl font-bold text-zinc-900 font-mono tracking-tight">{stats.total_score}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-none border-gray-200">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                        <Flag className="w-4 h-4 text-zinc-900" />
                      </div>
                      <div className="px-2 py-1 bg-gray-50 border border-gray-100 rounded text-[10px] font-bold text-gray-600 uppercase tracking-wide">
                        {stats.total_challenges} Total
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">Solved Challenges</p>
                      <p className="text-2xl font-bold text-zinc-900 font-mono tracking-tight">{stats.challenges_solved}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-none bg-zinc-900 border-zinc-800 text-white">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Global Progress</p>
                        <p className="text-2xl font-bold text-white font-mono tracking-tight">
                          {stats.total_challenges > 0 ? Math.round((stats.challenges_solved / stats.total_challenges) * 100) : 0}%
                        </p>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="bg-white h-full rounded-full transition-all duration-1000"
                          style={{ width: `${stats.total_challenges > 0 ? (stats.challenges_solved / stats.total_challenges) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Performance & Challenges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Performance */}
              <Card className="shadow-none border-gray-200 h-full">
                <CardHeader className="px-6 py-4 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Category Skill
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-50">
                    {stats?.category_stats?.map((cat, i) => (
                      <div key={i} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex justify-between text-xs font-medium mb-2.5">
                          <span className="text-zinc-700 font-semibold">{cat.category}</span>
                          <span className="text-zinc-500 font-mono">{cat.solved} / {cat.total}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-900 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${(cat.solved / Math.max(cat.total, 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {(!stats?.category_stats || stats.category_stats.length === 0) && (
                      <div className="p-8 text-center text-sm text-gray-400">No data available yet.</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Available Deployments */}
              <Card className="shadow-none border-gray-200 h-full">
                <CardHeader className="px-6 py-4 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-bold text-zinc-900 uppercase tracking-wide flex items-center gap-2">
                      <Terminal className="w-4 h-4" /> Deployments
                    </CardTitle>
                    <Link to="/challenges" className="text-xs font-medium text-gray-500 hover:text-zinc-900 transition-colors flex items-center gap-1 group">
                      View All <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-50">
                    {recentChallenges.length > 0 ? recentChallenges.map(challenge => (
                      <div key={challenge.id} onClick={() => navigate(`/challenges/${challenge.id}`)} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3.5">
                            <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:border-zinc-200 transition-colors">
                              <Shield className="w-4 h-4 text-gray-400 group-hover:text-zinc-900 transition-colors" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-zinc-900 group-hover:text-blue-600 transition-colors">{challenge.title}</h4>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{challenge.description}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={`${getDifficultyStyle(challenge.difficulty)} border rounded px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider`}>
                            {challenge.difficulty}
                          </Badge>
                        </div>
                      </div>
                    )) : (
                      <div className="p-8 text-center">
                        <Terminal className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No active deployments</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>

          {/* RIGHT COLUMN (SIDEBAR WIDGETS) */}
          <div className="space-y-6">

            {/* Minimal Radar Chart */}
            <Card className="shadow-none border-gray-200 overflow-hidden">
              <CardHeader className="px-6 py-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-zinc-900 uppercase tracking-wide text-center">Skill Matrix</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center justify-center relative min-h-[260px]">
                {skillData.length > 0 && skillData.some(s => s.value > 0) ? (
                  <div className="relative w-full aspect-square max-w-[200px]">
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      {/* Grid */}
                      {[1, 0.75, 0.5, 0.25].map((scale, i) => (
                        <polygon key={i}
                          points="100,20 176,64 176,152 100,196 24,152 24,64"
                          transform={`translate(100, 108) scale(${scale}) translate(-100, -108)`}
                          fill="none" stroke="#f3f4f6" strokeWidth="1"
                          className="text-gray-100"
                        />
                      ))}
                      {/* Data */}
                      <polygon
                        points={skillData.map((s, i) => {
                          const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
                          const r = 88 * (s.value / 100);
                          return `${100 + r * Math.cos(angle)},${108 + r * Math.sin(angle)}`;
                        }).join(' ')}
                        fill="rgba(24, 24, 27, 0.05)" stroke="#18181b" strokeWidth="2"
                      />
                    </svg>
                    {/* Labels - Simplified */}
                    {skillData.map((s, i) => {
                      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
                      return (
                        <div key={i} className="absolute text-[10px] font-bold text-gray-400 transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
                          style={{ left: `${50 + 42 * Math.cos(angle)}%`, top: `${54 + 42 * Math.sin(angle)}%` }}>
                          {s.name}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-xs text-gray-400">Solve challenges to generate your matrix</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Premium Upsell - Minimal */}
            <div className="mx-1">
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl p-6 text-white relative overflow-hidden ring-1 ring-zinc-800">
                <div className="absolute top-0 right-0 p-4">
                  <Zap className="w-24 h-24 text-white opacity-[0.03] transform rotate-12 -translate-y-4 translate-x-4" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">Pro Access</h3>
                <p className="text-zinc-400 text-xs leading-relaxed mb-6 max-w-[200px]">Unlock private instances, advanced analytics, and exclusive CTF challenges.</p>
                <Link to="/pricing">
                  <button className="w-full py-2.5 bg-white hover:bg-gray-50 text-zinc-950 font-semibold text-xs rounded-lg transition-colors border border-gray-200">
                    Upgrade Plan
                  </button>
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
