import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Trophy, Target, Calendar, Award, Edit3, X, Shield, Zap, LogOut, Camera, Github, Twitter, Linkedin, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Assuming Textarea exists or I use textarea
import { motion } from 'framer-motion';

const Profile = ({ user, logout, setUser }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    current_password: '',
    new_password: '',
    bio: '',
    social_links: {
      github: '',
      twitter: '',
      linkedin: '',
      website: ''
    }
  });

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (user) {
      setEditForm(prev => ({
        ...prev,
        username: user.username || user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        social_links: user.social_links || { github: '', twitter: '', linkedin: '', website: '' }
      }));
    }
  }, [user]);


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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/auth/me/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(prev => ({ ...prev, avatar_url: response.data.avatar_url }));
      toast.success('Avatar updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      // 1. Update Bio and Social Links
      const simpleLinks = {};
      // Filter out empty links
      if (editForm.social_links) {
        Object.entries(editForm.social_links).forEach(([k, v]) => {
          simpleLinks[k] = v || '';
        });
      }

      const updateData = {
        bio: editForm.bio,
        social_links: simpleLinks
      };

      const res = await axios.patch(`${API}/auth/me`, updateData);
      setUser(prev => ({ ...prev, ...res.data }));

      // 2. Note about username/email
      if (editForm.username !== user.username || editForm.email !== user.email) {
        toast.info('Username and email changes are not fully supported yet in this update.');
      }

      toast.success('Profile updated successfully');
      setShowEditModal(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl animate-spin" />
          <p className="text-gray-500 font-mono text-sm">Loading Identity...</p>
        </div>
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
    <Layout user={user} logout={logout}>
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-zinc-900 mb-2 tracking-tight">User Profile</h1>
        <p className="text-lg text-gray-500">Manage your identity and track your progress.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Identity Card */}
        <div className="lg:col-span-4">
          <div className="bg-zinc-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden sticky top-24">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex flex-col items-center text-center relative z-10">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username || user.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-white/20 shadow-2xl mb-6"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-black rounded-2xl flex items-center justify-center text-white text-3xl font-bold mb-6 border border-white/10 shadow-2xl">
                  {(user.username || user.name)?.substring(0, 2).toUpperCase()}
                </div>
              )}

              <h2 className="text-2xl font-bold text-white mb-1 tracking-tight" data-testid="profile-username">
                {user.username || user.name}
              </h2>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-gray-300 text-xs font-mono">{user.role === 'superadmin' ? 'ROOT ACCESS' : 'OPERATIVE'}</p>
              </div>

              <div className="w-full pt-8 border-t border-white/10">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Trophy className="w-8 h-8 text-yellow-400" fill="currentColor" />
                  <span className="text-5xl font-black font-mono tracking-tighter" data-testid="profile-score">
                    {user.score}
                  </span>
                </div>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Total Reputation Points</p>
              </div>

              <div className="w-full pt-6 mt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats?.challenges_solved || 0}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Solved</p>
                </div>
                <div className="text-center border-l border-white/10">
                  <p className="text-2xl font-bold text-white">{completionPercentage}%</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Complete</p>
                </div>
              </div>

              <div className="w-full mt-8 space-y-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white text-black hover:bg-gray-100 rounded-xl transition-all font-bold text-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
                <button
                  onClick={logout}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all font-bold text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Details */}
        <div className="lg:col-span-8 space-y-8">

          {/* Category Progress */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h3 className="text-lg font-bold text-zinc-900 mb-6 uppercase tracking-wide flex items-center gap-2">
              <Target className="w-5 h-5 text-zinc-900" />
              Skill Proficiency
            </h3>
            <div className="space-y-6">
              {stats?.category_stats?.map((cat, idx) => {
                const percentage = cat.total > 0 ? (cat.solved / cat.total) * 100 : 0;
                return (
                  <div key={idx} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gray-700">{cat.category}</span>
                      <span className="text-xs font-mono text-gray-400">{cat.solved} / {cat.total}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                        className={`h-full rounded-full ${percentage === 100 ? 'bg-emerald-500' : 'bg-zinc-900'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h3 className="text-lg font-bold text-zinc-900 mb-6 uppercase tracking-wide flex items-center gap-2">
              <Award className="w-5 h-5 text-zinc-900" />
              Achievements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${achievement.earned
                    ? 'bg-zinc-900 border-zinc-900 text-white'
                    : 'bg-gray-50 border-gray-100 text-gray-400 grayscale'
                    }`}
                >
                  <div className={`p-2 rounded-lg ${achievement.earned ? 'bg-white/10' : 'bg-gray-200'}`}>
                    <achievement.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${achievement.earned ? 'text-white' : 'text-gray-500'}`}>{achievement.name}</p>
                    <p className="text-xs mt-1 opacity-80">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h3 className="text-lg font-bold text-zinc-900 mb-6 uppercase tracking-wide flex items-center gap-2">
              <User className="w-5 h-5 text-zinc-900" />
              Account Data
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <p className="text-xs font-bold text-gray-500 uppercase">Email Address</p>
                </div>
                <p className="text-gray-900 font-medium pl-7">{user.email}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-xs font-bold text-gray-500 uppercase">Member Since</p>
                </div>
                <p className="text-gray-900 font-medium pl-7">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })
                    : 'Not available'
                  }
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="border-b border-gray-100 p-6 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-xl font-bold text-zinc-900">Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Identity Section */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group cursor-pointer mb-3">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 group-hover:border-zinc-200 transition-colors bg-gray-50">
                    {(user.avatar_url || uploadingAvatar) ? (
                      <img src={user.avatar_url} className={`w-full h-full object-cover ${uploadingAvatar ? 'opacity-50' : ''}`} />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white text-2xl font-bold">
                        {(user.username || user.name)?.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                    <Camera className="w-8 h-8 text-white" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                  {uploadingAvatar && <div className="absolute inset-0 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div></div>}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Profile Picture</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Username</label>
                    <Input
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="bg-gray-50 border-gray-200"
                      placeholder="Username"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Email</label>
                    <Input
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="bg-gray-50 border-gray-200"
                      placeholder="Email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Bio</label>
                  <Textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="bg-gray-50 border-gray-200 min-h-[100px] resize-none"
                    placeholder="Tell the world about yourself..."
                    maxLength={500}
                  />
                  <p className="text-right text-[10px] text-gray-400 mt-1">{editForm.bio?.length || 0}/500</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Social Connections</label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                        <img src="/github-mark.svg" className="w-4 h-4 opacity-70" alt="GitHub" />
                      </div>
                      <Input
                        value={editForm.social_links?.github || ''}
                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, github: e.target.value } })}
                        className="pl-10 bg-gray-50 border-gray-200"
                        placeholder="GitHub URL"
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                        <img src="/linkedin.svg" className="w-4 h-4 opacity-70" alt="LinkedIn" />
                      </div>
                      <Input
                        value={editForm.social_links?.linkedin || ''}
                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, linkedin: e.target.value } })}
                        className="pl-10 bg-gray-50 border-gray-200"
                        placeholder="LinkedIn URL"
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                        <img src="/x.svg" className="w-4 h-4 opacity-70" alt="X (Twitter)" />
                      </div>
                      <Input
                        value={editForm.social_links?.twitter || ''}
                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, twitter: e.target.value } })}
                        className="pl-10 bg-gray-50 border-gray-200"
                        placeholder="X (Twitter) URL"
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-gray-400" />
                      </div>
                      <Input
                        value={editForm.social_links?.website || ''}
                        onChange={(e) => setEditForm({ ...editForm, social_links: { ...editForm.social_links, website: e.target.value } })}
                        className="pl-10 bg-gray-50 border-gray-200"
                        placeholder="Personal Website URL"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 p-6 flex justify-end gap-3 bg-gray-50/50">
              <Button
                variant="ghost"
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateProfile}
                disabled={saving}
                className="bg-zinc-900 hover:bg-black text-white px-6 font-bold"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </Layout>
  );
};

export default Profile;
