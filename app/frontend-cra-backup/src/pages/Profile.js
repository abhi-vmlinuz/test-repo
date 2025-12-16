import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Trophy, Target, Calendar, Award, Settings, Shield, Zap } from 'lucide-react';

const Profile = ({ user, logout, setUser }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const [userRes, statsRes] = await Promise.all([
        axios.get(`${API}/auth/me`),
        axios.get(`${API}/stats/me`)
      ]);

      setUser(userRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <Navigation user={user} logout={logout} />
        <main className="w-full px-8 lg:px-16 py-10">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded-xl w-1/3" />
            <div className="grid lg:grid-cols-4 gap-8">
              <div className="h-80 bg-gray-200 rounded-3xl" />
              <div className="lg:col-span-3 h-80 bg-gray-200 rounded-3xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const completionPercentage = stats && stats.total_challenges > 0
    ? Math.round((stats.challenges_solved / stats.total_challenges) * 100)
    : 0;

  // Calculate achievements
  const achievements = [
    {
      name: 'First Blood',
      description: 'Solve your first challenge',
      earned: stats?.challenges_solved > 0,
      icon: Shield
    },
    {
      name: 'Getting Started',
      description: 'Earn 100 points',
      earned: user.score >= 100,
      icon: Zap
    },
    {
      name: 'Halfway There',
      description: 'Complete 50% of challenges',
      earned: completionPercentage >= 50,
      icon: Award
    },
    {
      name: 'Master Hacker',
      description: 'Complete all challenges',
      earned: completionPercentage === 100,
      icon: Trophy
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50/30">
      <Navigation user={user} logout={logout} />

      <main className="w-full px-8 lg:px-16 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-lg text-gray-500">Your hacking journey</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm p-8 sticky top-24">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-6">
                  {user.username.substring(0, 2).toUpperCase()}
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-1" data-testid="profile-username">
                  {user.username}
                </h2>
                <p className="text-gray-400 text-sm mb-6">{user.email}</p>

                <div className="w-full pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Trophy className="w-6 h-6 text-amber-400" fill="currentColor" />
                    <span className="text-5xl font-bold text-gray-900 font-mono" data-testid="profile-score">
                      {user.score}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">Total Points</p>
                </div>

                <div className="w-full pt-6 mt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" strokeWidth={1.5} />
                    Joined {new Date(user.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="lg:col-span-3 space-y-8">
            {/* Overview */}
            <div className="bg-white rounded-3xl shadow-sm p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Overview</h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center p-6 bg-gray-50 rounded-2xl">
                  <Target className="w-8 h-8 text-gray-400 mx-auto mb-3" strokeWidth={1.5} />
                  <div className="text-4xl font-bold text-gray-900">{stats?.challenges_solved || 0}</div>
                  <p className="text-sm text-gray-400 mt-2">Challenges Solved</p>
                </div>

                <div className="text-center p-6 bg-gray-50 rounded-2xl">
                  <Award className="w-8 h-8 text-gray-400 mx-auto mb-3" strokeWidth={1.5} />
                  <div className="text-4xl font-bold text-gray-900">{completionPercentage}%</div>
                  <p className="text-sm text-gray-400 mt-2">Completion Rate</p>
                </div>

                <div className="text-center p-6 bg-gray-50 rounded-2xl">
                  <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-3" strokeWidth={1.5} />
                  <div className="text-4xl font-bold text-gray-900 font-mono">{user.score}</div>
                  <p className="text-sm text-gray-400 mt-2">Total Score</p>
                </div>
              </div>
            </div>

            {/* Category Progress */}
            <div className="bg-white rounded-3xl shadow-sm p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Category Progress</h3>
              <div className="space-y-8">
                {stats?.category_stats?.map((cat, idx) => {
                  const percentage = cat.total > 0 ? (cat.solved / cat.total) * 100 : 0;
                  return (
                    <div key={idx} className="flex items-center gap-8">
                      <div className="w-40 flex-shrink-0">
                        <span className="text-base font-medium text-gray-700">{cat.category}</span>
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${percentage === 100 ? 'bg-emerald-500' : 'bg-gray-900'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-24 text-right flex items-center gap-3">
                        <span className="text-base font-mono text-gray-500">{cat.solved}/{cat.total}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${percentage === 100 ? 'border-emerald-300 text-emerald-600' : 'border-gray-200 text-gray-500'}`}
                        >
                          {Math.round(percentage)}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-3xl shadow-sm p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Achievements</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {achievements.map((achievement, idx) => (
                  <div
                    key={idx}
                    className={`p-6 rounded-2xl text-center transition-all ${achievement.earned
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-50 text-gray-300'
                      }`}
                  >
                    <achievement.icon
                      className={`w-10 h-10 mx-auto mb-3 ${achievement.earned ? 'text-amber-400' : 'text-gray-300'}`}
                      strokeWidth={1.5}
                    />
                    <p className={`font-medium ${achievement.earned ? 'text-white' : 'text-gray-400'}`}>
                      {achievement.name}
                    </p>
                    <p className={`text-xs mt-1 ${achievement.earned ? 'text-gray-400' : 'text-gray-300'}`}>
                      {achievement.earned ? 'Unlocked' : achievement.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Details */}
            <div className="bg-white rounded-3xl shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Account Details</h3>
                <Settings className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  <User className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs text-gray-400">Username</p>
                    <p className="text-gray-900 font-medium">{user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  <Mail className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-gray-900 font-medium truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  <Calendar className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs text-gray-400">Member Since</p>
                    <p className="text-gray-900 font-medium">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
