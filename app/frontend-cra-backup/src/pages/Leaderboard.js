import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

const Leaderboard = ({ user, logout }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API}/leaderboard?limit=50`);
      setLeaderboard(response.data);
    } catch (error) {
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  // Find current user's rank
  const userRank = leaderboard.findIndex(p => p.id === user.id) + 1;

  return (
    <div className="min-h-screen bg-gray-50/30">
      <Navigation user={user} logout={logout} />

      <main className="w-full px-8 lg:px-16 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <Trophy className="w-10 h-10 text-amber-400" fill="currentColor" />
            <h1 className="text-4xl font-bold text-gray-900">Leaderboard</h1>
          </div>
          <p className="text-lg text-gray-500">Top hackers on ZecurX LABS</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Your Rank Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm p-8 sticky top-24">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Your Position</h3>
              <div className="text-6xl font-bold text-gray-900 mb-2">
                #{userRank || '-'}
              </div>
              <p className="text-gray-500 mb-6">{user.score} points</p>

              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>Keep solving challenges!</span>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-3">
            {/* Time Filter */}
            <div className="flex gap-3 mb-8">
              {['all', 'month', 'week'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-5 py-3 rounded-full text-sm font-medium transition-all ${timeFilter === filter
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                    }`}
                >
                  {filter === 'all' ? 'All Time' : filter === 'month' ? 'This Month' : 'This Week'}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                {/* Top 3 Podium */}
                {leaderboard.length >= 3 && (
                  <div className="grid grid-cols-3 gap-6 p-10 bg-gray-50 border-b border-gray-100">
                    {/* 2nd Place */}
                    <div className="text-center pt-12">
                      <div className="relative inline-block">
                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500 mb-4 mx-auto">
                          {leaderboard[1]?.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold text-white">
                          2
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900 truncate">{leaderboard[1]?.username}</p>
                      <p className="text-2xl font-bold text-gray-400 font-mono">{leaderboard[1]?.score}</p>
                    </div>

                    {/* 1st Place */}
                    <div className="text-center">
                      <div className="relative inline-block">
                        <Trophy className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 text-amber-400" fill="currentColor" />
                        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center text-3xl font-bold text-amber-600 mb-4 mx-auto border-4 border-amber-300">
                          {leaderboard[0]?.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-sm font-bold text-white">
                          1
                        </div>
                      </div>
                      <p className="font-bold text-gray-900 text-lg truncate">{leaderboard[0]?.username}</p>
                      <p className="text-3xl font-bold text-amber-500 font-mono">{leaderboard[0]?.score}</p>
                      <Badge className="mt-2 bg-amber-100 text-amber-600 border-0">Champion</Badge>
                    </div>

                    {/* 3rd Place */}
                    <div className="text-center pt-16">
                      <div className="relative inline-block">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-xl font-bold text-orange-500 mb-4 mx-auto">
                          {leaderboard[2]?.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-sm font-bold text-white">
                          3
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900 truncate">{leaderboard[2]?.username}</p>
                      <p className="text-xl font-bold text-orange-400 font-mono">{leaderboard[2]?.score}</p>
                    </div>
                  </div>
                )}

                {/* Rest of Leaderboard */}
                <div data-testid="leaderboard-table">
                  {leaderboard.slice(3).map((player, index) => {
                    const rank = index + 4;
                    const isCurrentUser = player.id === user.id;

                    return (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between px-8 py-6 border-b border-gray-100 transition-colors ${isCurrentUser ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'
                          }`}
                        data-testid={`leaderboard-row-${rank}`}
                      >
                        <div className="flex items-center gap-6">
                          <span className={`font-mono text-lg w-12 ${isCurrentUser ? 'text-gray-400' : 'text-gray-400'}`}>
                            #{rank}
                          </span>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${isCurrentUser ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {player.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className={`font-medium text-lg ${isCurrentUser ? 'text-white' : 'text-gray-900'}`}>
                              {player.username}
                              {isCurrentUser && (
                                <span className="ml-3 text-xs bg-white text-gray-900 px-2 py-1 rounded-full">You</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold font-mono ${isCurrentUser ? 'text-white' : 'text-gray-900'}`} data-testid={`score-${rank}`}>
                            {player.score}
                          </p>
                          <p className={`text-sm ${isCurrentUser ? 'text-gray-400' : 'text-gray-400'}`}>points</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {leaderboard.length === 0 && (
                  <div className="text-center py-20">
                    <Award className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No players on the leaderboard yet</p>
                    <p className="text-gray-400 mt-2">Be the first to solve a challenge!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
