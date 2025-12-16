import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, LayoutDashboard, Flag, Trophy, User, Settings,
  LogOut, ChevronRight, Zap, Target, Award, TrendingUp,
  Globe, Key, Search, Binary, Bell, MessageCircle, ExternalLink, Lightbulb, GraduationCap, X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RainbowButton } from '@/components/ui/rainbow-button';
import FloatingParticles from '@/components/FloatingParticles';

const iconMap = {
  'Globe': Globe,
  'Key': Key,
  'Search': Search,
  'Binary': Binary,
  'Lightbulb': Lightbulb  // General Skills
};

const Dashboard = ({ user, logout }) => {
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [recentChallenges, setRecentChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const notificationRef = useRef(null);

  // Click outside handler for notifications
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
      setCategories(categoriesRes.data);
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
      // Notifications not available yet
      console.log('Notifications not available');
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/${notificationId}/read`);
      fetchNotifications();
    } catch (error) {
      console.log('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API}/notifications/read-all`);
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getDifficultyStyle = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'hard': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  // Sidebar navigation items - conditionally include Admin for admin users
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { id: 'challenges', icon: Flag, label: 'Challenges', path: '/challenges' },
    { id: 'leaderboard', icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
    // Student Portal link
    { id: 'student', icon: GraduationCap, label: 'Student Portal', path: '/student' },
    // Admin Panel link - only shown for admin/superadmin
    ...(user.role === 'admin' || user.role === 'superadmin'
      ? [{ id: 'admin', icon: Settings, label: 'Admin Panel', path: '/admin' }]
      : []),
  ];

  // Calculate skill data for radar chart based on category progress
  const getSkillData = () => {
    if (!stats?.category_stats) return [];
    return stats.category_stats.map(cat => ({
      name: cat.category.substring(0, 8),
      value: cat.total > 0 ? Math.round((cat.solved / cat.total) * 100) : 0
    }));
  };

  // Challenge type data - Use actual category colors from database
  const getChallengeTypeData = () => {
    if (!categories.length) return [];
    return categories.map(cat => ({
      name: cat.name,
      color: cat.color || '#64748b'  // Use category's color or default gray
    }));
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex">
        <div className="w-64 bg-white border-r border-gray-100 p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-32" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 p-8">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded-xl w-1/3" />
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const skillData = getSkillData();
  const challengeTypes = getChallengeTypeData();

  return (
    <div className="min-h-screen bg-gray-50/30 flex relative">
      {/* Floating Particles in Background */}
      <FloatingParticles particleCount={80} />

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-full z-20">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="ZecurX" className="w-8 h-8" />
            <span className="text-xl font-bold text-gray-900">ZecurX LABS</span>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              onClick={() => setActiveNav(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeNav === item.id
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={1.5} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Go Premium Card - Black/Gray theme */}
        <div className="p-4">
          <div className="bg-gray-900 rounded-2xl p-5 text-white">
            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold mb-1 text-white">Go Premium</h4>
            <p className="text-xs text-gray-400 mb-4">Unlock all challenges and features</p>
            <Link to="/pricing">
              <RainbowButton className="w-full text-sm py-2.5">
                Upgrade Now
              </RainbowButton>
            </Link>
          </div>
        </div>

        {/* User Profile - Always visible */}
        <div className="p-4 border-t border-gray-100">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-gray-700">{user.username}</p>
              <p className="text-xs text-gray-400">{user.score} pts</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2 mt-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 relative z-10">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
              <p className="text-gray-500 mt-1">Welcome back, {user.username}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Notification Bell with Dropdown */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-3 bg-white rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors relative"
                >
                  <Bell className="w-5 h-5" strokeWidth={1.5} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-lg z-50 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllAsRead();
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id)}
                            className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50/50' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${notification.type === 'announcement' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                {notification.type === 'announcement' ? (
                                  <Bell className="w-4 h-4 text-purple-600" />
                                ) : (
                                  <MessageCircle className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                <p className="text-xs text-gray-500 line-clamp-2">{notification.message}</p>
                                <p className="text-xs text-gray-400 mt-1">{notification.time_ago}</p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">No notifications yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="p-3 bg-white rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Main Stats & Progress */}
            <div className="lg:col-span-2 space-y-8">
              {/* Stats Row */}
              {stats && (
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 card-hover-delay hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">Total Score</span>
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 font-mono">{stats.total_score}</div>
                    <div className="flex items-center gap-1 mt-2 text-gray-400 text-sm">
                      <Award className="w-4 h-4" />
                      <span>Rank #{stats.rank || '—'}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-gray-100 card-hover-delay hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">Completion</span>
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Target className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {stats.total_challenges > 0 ? Math.round((stats.challenges_solved / stats.total_challenges) * 100) : 0}%
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-gray-400 text-sm">
                      <span>{stats.challenges_solved} solved</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-gray-100 card-hover-delay hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">Challenges</span>
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <Flag className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.challenges_solved}</div>
                    <div className="flex items-center gap-1 mt-2 text-gray-400 text-sm">
                      <span>of {stats.total_challenges}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Chart - Dynamic based on real stats */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-900">Progress Overview</h3>
                  <span className="text-sm text-gray-500">
                    {stats?.challenges_solved || 0} of {stats?.total_challenges || 0} completed
                  </span>
                </div>

                {/* Progress Bar Visualization */}
                <div className="space-y-6">
                  {/* Overall Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall Completion</span>
                      <span className="text-sm font-bold text-indigo-600">
                        {stats?.total_challenges > 0
                          ? Math.round((stats?.challenges_solved / stats?.total_challenges) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${stats?.total_challenges > 0
                            ? (stats?.challenges_solved / stats?.total_challenges) * 100
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Category Progress Bars */}
                  {stats?.category_stats?.map((cat, index) => {
                    const colors = [
                      'from-blue-500 to-indigo-500',
                      'from-green-500 to-emerald-500',
                      'from-cyan-500 to-teal-500',
                      'from-orange-500 to-amber-500',
                      'from-pink-500 to-rose-500'
                    ];
                    const percentage = cat.total > 0 ? Math.round((cat.solved / cat.total) * 100) : 0;

                    return (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">{cat.category}</span>
                          <span className="text-xs text-gray-500">{cat.solved}/{cat.total}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Score Summary */}
                <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{stats?.total_score || user.score || 0}</p>
                    <p className="text-xs text-gray-500">Total Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">{stats?.challenges_solved || 0}</p>
                    <p className="text-xs text-gray-500">Solved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-400">{(stats?.total_challenges || 0) - (stats?.challenges_solved || 0)}</p>
                    <p className="text-xs text-gray-500">Remaining</p>
                  </div>
                </div>
              </div>

              {/* Available Challenges */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-900">Available Challenges</h3>
                  <button
                    onClick={() => navigate('/challenges')}
                    className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                  >
                    View all
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {recentChallenges.map((challenge) => {
                    const category = categories.find(c => c.id === challenge.category_id);
                    return (
                      <div
                        key={challenge.id}
                        onClick={() => navigate(`/challenges/${challenge.id}`)}
                        className="p-4 bg-gray-50 rounded-xl cursor-pointer card-hover-delay hover:bg-gray-100 group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 group-hover:text-gray-700 truncate">
                            {challenge.title}
                          </h4>
                          <Badge className={`${getDifficultyStyle(challenge.difficulty)} border text-xs`}>
                            {challenge.difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{challenge.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-mono font-semibold text-gray-900">{challenge.points} pts</span>
                          <span className="text-gray-400">{challenge.solves} solves</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar Charts */}
            <div className="space-y-8">
              {/* Category Success Rates */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-6">Success Rate</h3>
                <div className="space-y-4">
                  {stats?.category_stats?.map((cat, idx) => {
                    const percentage = cat.total > 0 ? Math.round((cat.solved / cat.total) * 100) : 0;
                    const colors = ['bg-gray-900', 'bg-gray-700', 'bg-gray-500', 'bg-gray-400'];
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">{cat.category}</span>
                          <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colors[idx % colors.length]} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skill Radar Chart */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-6">Skill Matrix</h3>
                <div className="relative aspect-square">
                  {/* Radar Chart Background */}
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {/* Concentric hexagons */}
                    {[1, 0.75, 0.5, 0.25].map((scale, i) => (
                      <polygon
                        key={i}
                        points={skillData.length > 0
                          ? skillData.map((_, idx) => {
                            const angle = (idx * 360 / skillData.length - 90) * Math.PI / 180;
                            const x = 100 + 80 * scale * Math.cos(angle);
                            const y = 100 + 80 * scale * Math.sin(angle);
                            return `${x},${y}`;
                          }).join(' ')
                          : "100,20 180,100 100,180 20,100"
                        }
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Data polygon - Gray fill */}
                    <polygon
                      points={skillData.map((skill, idx) => {
                        const angle = (idx * 360 / skillData.length - 90) * Math.PI / 180;
                        const radius = 80 * (skill.value / 100);
                        const x = 100 + radius * Math.cos(angle);
                        const y = 100 + radius * Math.sin(angle);
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="rgba(107, 114, 128, 0.2)"
                      stroke="rgb(55, 65, 81)"
                      strokeWidth="2"
                    />

                    {/* Data points - Gray */}
                    {skillData.map((skill, idx) => {
                      const angle = (idx * 360 / skillData.length - 90) * Math.PI / 180;
                      const radius = 80 * (skill.value / 100);
                      const x = 100 + radius * Math.cos(angle);
                      const y = 100 + radius * Math.sin(angle);
                      return (
                        <circle key={idx} cx={x} cy={y} r="4" fill="rgb(55, 65, 81)" />
                      );
                    })}
                  </svg>

                  {/* Labels */}
                  {skillData.map((skill, idx) => {
                    const angle = (idx * 360 / skillData.length - 90) * Math.PI / 180;
                    const x = 50 + 45 * Math.cos(angle);
                    const y = 50 + 45 * Math.sin(angle);
                    return (
                      <div
                        key={idx}
                        className="absolute text-xs text-gray-500 font-medium transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${x}%`, top: `${y}%` }}
                      >
                        {skill.name}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Challenge Types Distribution */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-6">Challenge Types</h3>

                {/* Donut Chart - Gray tones */}
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {challengeTypes.map((type, idx) => {
                      const percent = 100 / challengeTypes.length;
                      const offset = idx * percent;
                      return (
                        <circle
                          key={idx}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={type.color}
                          strokeWidth="20"
                          strokeDasharray={`${percent * 2.51} ${100 * 2.51}`}
                          strokeDashoffset={-offset * 2.51}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
                      <div className="text-xs text-gray-400">Types</div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  {challengeTypes.map((type, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                        <span className="text-sm text-gray-600">{type.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {Math.round(100 / challengeTypes.length)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-6">Most Activity</h3>
                <div className="space-y-4">
                  {stats?.category_stats?.slice(0, 3).map((cat, idx) => {
                    const percentage = cat.total > 0 ? Math.round((cat.solved / cat.total) * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                          {iconMap[categories.find(c => c.name === cat.category)?.icon] ? (
                            React.createElement(iconMap[categories.find(c => c.name === cat.category)?.icon], {
                              className: "w-5 h-5 text-gray-500"
                            })
                          ) : (
                            <Globe className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{cat.category}</p>
                          <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="h-full bg-gray-700 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
