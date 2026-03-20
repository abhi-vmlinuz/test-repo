import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp, Calendar, Clock, Crown, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Leaderboard = ({ user, logout }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
  }, [timeFilter]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const periodMap = { 'all': 'all', 'month': 'month', 'week': 'week' };
      const response = await axios.get(`${API}/leaderboard?limit=50&period=${periodMap[timeFilter]}`);
      setLeaderboard(response.data);
    } catch (error) {
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  // Find current user's rank
  const userRank = leaderboard.findIndex(p => p.id === user.id) + 1;
  const userScore = leaderboard.find(p => p.id === user.id)?.score || 0;

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  // Avatar component
  const UserAvatar = ({ player, size = 'md', className = '' }) => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-16 h-16 text-xl',
      xl: 'w-20 h-20 text-2xl'
    };

    if (player?.avatar_url) {
      return (
        <img
          src={player.avatar_url}
          alt={player.username}
          className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        />
      );
    }

    return (
      <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold ${className}`}>
        {player?.username?.substring(0, 2).toUpperCase() || '??'}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl animate-spin" />
          <p className="text-gray-500 font-mono text-sm">Calculating Rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} logout={logout}>
      <div className="space-y-8 pb-8 px-4 sm:px-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-zinc-900 mb-2 tracking-tight">Global Rankings</h1>
            <p className="text-lg text-gray-500">Top hackers competing for dominance on ZecurX LABS.</p>
          </div>

          {/* Time Filter Toggle */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center">
            {['all', 'month', 'week'].map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${timeFilter === filter
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                {filter === 'all' ? 'All Time' : filter === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8 min-h-[500px] mb-8">
          {/* Your Rank Card */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-zinc-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden lg:sticky lg:top-24">
              {/* Background Effects */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Your Standing</h3>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-black font-mono tracking-tight text-white">#{userRank > 0 ? userRank : '-'}</span>
              </div>

              <div className="mb-8">
                <div className="text-2xl font-bold text-gray-200">{userScore.toLocaleString()}</div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  {timeFilter === 'all' ? 'Total Points' : timeFilter === 'week' ? 'Points This Week' : 'Points This Month'}
                </div>
              </div>

              <div className="py-4 border-t border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-sm text-gray-300 leading-tight">
                  <span className="block font-semibold text-white">Keep going!</span>
                  Top 10 is within reach.
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Content */}
          <div className="lg:col-span-3 order-1 lg:order-2 space-y-8">

            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end mb-8 pt-12 sm:pt-8">
                {/* 2nd Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-6 text-center shadow-sm relative pt-10 sm:pt-12 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewProfile(leaderboard[1]?.id)}
                >
                  <div className="absolute -top-4 sm:-top-6 left-1/2 -translate-x-1/2">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center border-2 sm:border-4 border-white shadow-sm font-bold text-gray-500 text-sm sm:text-lg">2</div>
                  </div>
                  <UserAvatar player={leaderboard[1]} size="md" className="mx-auto mb-2 sm:mb-3 bg-gray-100 text-gray-600" />
                  <div className="font-bold text-xs sm:text-base text-gray-900 truncate px-1">{leaderboard[1]?.username}</div>
                  <div className="font-mono text-gray-500 text-xs sm:text-sm font-medium">{leaderboard[1]?.score} pts</div>
                </motion.div>

                {/* 1st Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-b from-yellow-50 to-white border border-yellow-100 rounded-xl sm:rounded-2xl p-4 sm:p-8 text-center shadow-md relative pt-12 sm:pt-16 z-10 transform -translate-y-2 sm:-translate-y-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleViewProfile(leaderboard[0]?.id)}
                >
                  <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2">
                    <div className="relative">
                      <Crown className="w-5 h-5 sm:w-8 sm:h-8 text-yellow-500 absolute -top-5 sm:-top-8 left-1/2 -translate-x-1/2" fill="currentColor" />
                      <div className="w-10 h-10 sm:w-16 sm:h-16 bg-yellow-400 rounded-full flex items-center justify-center border-2 sm:border-4 border-white shadow-md font-bold text-white text-lg sm:text-2xl">1</div>
                    </div>
                  </div>
                  <UserAvatar player={leaderboard[0]} size="lg" className="mx-auto mb-2 sm:mb-3 bg-yellow-100 text-yellow-600 border border-yellow-200" />
                  <div className="font-bold text-sm sm:text-lg text-gray-900 truncate px-1">{leaderboard[0]?.username}</div>
                  <div className="font-mono text-yellow-600 font-bold text-base sm:text-xl">{leaderboard[0]?.score} pts</div>
                  <Badge className="mt-1 sm:mt-2 text-xs sm:text-sm bg-yellow-400 text-black border-0 hover:bg-yellow-500" variant={undefined}>Champion</Badge>
                </motion.div>

                {/* 3rd Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white border border-orange-100 rounded-xl sm:rounded-2xl p-3 sm:p-6 text-center shadow-sm relative pt-10 sm:pt-12 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewProfile(leaderboard[2]?.id)}
                >
                  <div className="absolute -top-4 sm:-top-6 left-1/2 -translate-x-1/2">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-200 rounded-full flex items-center justify-center border-2 sm:border-4 border-white shadow-sm font-bold text-orange-700 text-sm sm:text-lg">3</div>
                  </div>
                  <UserAvatar player={leaderboard[2]} size="md" className="mx-auto mb-2 sm:mb-3 bg-orange-50 text-orange-500" />
                  <div className="font-bold text-xs sm:text-base text-gray-900 truncate px-1">{leaderboard[2]?.username}</div>
                  <div className="font-mono text-gray-500 text-xs sm:text-sm font-medium">{leaderboard[2]?.score} pts</div>
                </motion.div>
              </div>
            )}

            {/* Full List */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <div className="col-span-2 md:col-span-1 text-center">Rank</div>
                <div className="col-span-7 md:col-span-8">User</div>
                <div className="col-span-3 text-right">Score</div>
              </div>
              <div className="divide-y divide-gray-50">
                {leaderboard.map((player, index) => {
                  const rank = index + 1;
                  const isCurrentUser = player.id === user.id;

                  return (
                    <div
                      key={player.id}
                      className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors hover:bg-gray-50 cursor-pointer ${isCurrentUser ? 'bg-blue-50/30' : ''}`}
                      onClick={() => handleViewProfile(player.id)}
                    >
                      <div className="col-span-2 md:col-span-1 text-center font-mono font-bold text-gray-400">
                        #{rank}
                      </div>
                      <div className="col-span-7 md:col-span-8 flex items-center gap-4">
                        <div className="hidden sm:block">
                          {player.avatar_url ? (
                            <img
                              src={player.avatar_url}
                              alt={player.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border ${isCurrentUser ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-gray-600 border-gray-100'}`}>
                              {player.username.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className={`font-semibold text-sm ${isCurrentUser ? 'text-blue-700' : 'text-zinc-900'}`}>
                            {player.username}
                            {isCurrentUser && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">YOU</span>}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3 text-right font-mono font-bold text-zinc-900">
                        {player.score.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;

