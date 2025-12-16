import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, LayoutDashboard, Flag, Trophy, User, Settings,
  LogOut, ChevronRight, Zap, Target, Award, TrendingUp,
  Globe, Key, Search, Binary, Bell, MessageCircle, ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RainbowButton } from '@/components/ui/rainbow-button';
import FloatingParticles from '@/components/FloatingParticles';

const iconMap = {
  'Globe': Globe,
  'Key': Key,
  'Search': Search,
  'Binary': Binary
};

const Dashboard = ({ user, logout }) => {
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [recentChallenges, setRecentChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
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

  const getDifficultyStyle = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'hard': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  // Sidebar navigation items
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { id: 'challenges', icon: Flag, label: 'Challenges', path: '/challenges' },
    { id: 'leaderboard', icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
  ];

  const insightItems = [
    { icon: Bell, label: 'Notifications', count: 3 },
    { icon: MessageCircle, label: 'Messages', count: 2 },
  ];

  // Calculate skill data for radar chart based on category progress
  const getSkillData = () => {
    if (!stats?.category_stats) return [];
    return stats.category_stats.map(cat => ({
      name: cat.category.substring(0, 8),
      value: cat.total > 0 ? Math.round((cat.solved / cat.total) * 100) : 0
    }));
  };

  // Challenge type data (mock based on categories) - Colorful palette
  const getChallengeTypeData = () => {
    if (!categories.length) return [];
    return categories.map(cat => ({
      name: cat.name,
      color: cat.name === 'Web Exploitation' ? '#6366f1' :
        cat.name === 'Cryptography' ? '#21f505ff' :
          cat.name === 'Forensics' ? '#06b6d4' :
            cat.name === 'Binary Exploitation' ? '#f19d00ff' : '#64748b'
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
            <Shield className="w-8 h-8 text-gray-900" strokeWidth={1.5} />
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

        {/* Insights Section */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider px-4 mb-3">Insights</p>
          {insightItems.map((item) => (
            <button
              key={item.label}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                {item.label}
              </div>
              {item.count > 0 && (
                <span className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full text-xs flex items-center justify-center font-medium">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

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

        {/* User Profile - With clickable link to profile */}
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
              <button className="p-3 bg-white rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                <Bell className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <button className="p-3 bg-white rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
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
                    <div className="flex items-center gap-1 mt-2 text-emerald-500 text-sm">
                      <TrendingUp className="w-4 h-4" />
                      <span>+12%</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-gray-100 card-hover-delay hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">Avg. Activity</span>
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Target className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {stats.total_challenges > 0 ? Math.round((stats.challenges_solved / stats.total_challenges) * 100) : 0}%
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-emerald-500 text-sm">
                      <TrendingUp className="w-4 h-4" />
                      <span>+8%</span>
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

              {/* Progress Chart - Activity Graph */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-900">Progress Overview</h3>
                  <select className="text-sm text-gray-500 bg-transparent border-0 focus:ring-0 cursor-pointer">
                    <option>This Week</option>
                    <option>This Month</option>
                    <option>This Year</option>
                  </select>
                </div>

                {/* Simple Line Chart Visualization */}
                <div className="h-48 relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-400 py-2">
                    <span>100</span>
                    <span>70</span>
                    <span>40</span>
                    <span>10</span>
                  </div>

                  {/* Chart area */}
                  <div className="ml-12 h-full relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="border-b border-gray-100" />
                      ))}
                    </div>

                    {/* Line chart - SVG */}
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Area fill */}
                      <path
                        d="M0,140 L60,120 L120,100 L180,80 L240,60 L300,70 L360,50 L360,180 L0,180 Z"
                        fill="url(#lineGradient)"
                      />
                      {/* Line */}
                      <path
                        d="M0,140 L60,120 L120,100 L180,80 L240,60 L300,70 L360,50"
                        fill="none"
                        stroke="rgb(99, 102, 241)"
                        strokeWidth="2"
                      />
                      {/* Data point */}
                      <circle cx="240" cy="60" r="6" fill="white" stroke="rgb(99, 102, 241)" strokeWidth="2" />
                    </svg>

                    {/* Tooltip - Indigo background for better visibility */}
                    <div className="absolute top-8 right-24 bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs shadow-lg">
                      <p className="text-indigo-100">Score: 87%</p>
                      <p className="text-indigo-100">Performance</p>
                    </div>
                  </div>

                  {/* X-axis labels */}
                  <div className="ml-12 flex justify-between text-xs text-gray-400 mt-2">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
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
