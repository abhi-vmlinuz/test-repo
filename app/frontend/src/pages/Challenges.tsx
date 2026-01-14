import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Globe, Key, Search, Binary, CheckCircle2, Container, Filter, Lightbulb, Trophy } from 'lucide-react';

const iconMap = {
  'Globe': Globe,
  'Key': Key,
  'Search': Search,
  'Binary': Binary,
  'Lightbulb': Lightbulb  // General Skills
};

const Challenges = ({ user, logout }) => {
  const [categories, setCategories] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [solvedChallenges, setSolvedChallenges] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, challengesRes, statsRes] = await Promise.all([
        axios.get(`${API}/categories`),
        axios.get(`${API}/challenges`),
        axios.get(`${API}/stats/me`)
      ]);

      setCategories(categoriesRes.data);
      setChallenges(challengesRes.data);

      // Extract solved challenge IDs from the initial list response
      const solvedIds = new Set(
        challengesRes.data
          .filter(c => c.is_solved)
          .map(c => c.id)
      );
      setSolvedChallenges(solvedIds);
    } catch (error) {
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  // Filter by category, search, and solved status
  const filteredChallenges = challenges.filter(c => {
    const matchesCategory = selectedCategory === 'all' || c.category_id === selectedCategory;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'solved' && solvedChallenges.has(c.id)) ||
      (statusFilter === 'unsolved' && !solvedChallenges.has(c.id));
    return matchesCategory && matchesSearch && matchesStatus;
  });

  const getDifficultyStyle = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl animate-spin" />
          <p className="text-gray-500 font-mono text-sm">Loading Challenges...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} logout={logout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Header */}
        <div>
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-2 tracking-tight">Challenge Library</h1>
          <p className="text-lg text-gray-500">Master cybersecurity through hands-on labs and simulations.</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Search */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-white border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-zinc-900 focus:border-transparent shadow-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
            {/* All Button */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${selectedCategory === 'all'
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              All Modules
            </button>

            {/* Categories */}
            {categories.map((cat) => {
              const Icon = iconMap[cat.icon] || Globe;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 border ${selectedCategory === cat.id
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filter (Solved/Unsolved) */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status:</span>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${statusFilter === 'all'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('unsolved')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${statusFilter === 'unsolved'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              Unsolved
            </button>
            <button
              onClick={() => setStatusFilter('solved')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${statusFilter === 'solved'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Solved
            </button>
          </div>
          {statusFilter !== 'all' && (
            <span className="text-xs text-gray-400">
              {filteredChallenges.length} result{filteredChallenges.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Categories Header / Count */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            {selectedCategory === 'all' ? 'All Challenges' : categories.find(c => c.id === selectedCategory)?.name}
          </h2>
          <Badge variant="outline" className="border-gray-200 text-gray-500 bg-white">
            {filteredChallenges.length} Lab{filteredChallenges.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Challenges Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge, index) => {
            const category = categories.find(c => c.id === challenge.category_id);
            const Icon = category ? iconMap[category.icon] || Globe : Globe;
            const isSolved = solvedChallenges.has(challenge.id);

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card
                  onClick={() => navigate(`/challenges/${challenge.id}`)}
                  className={`h-full bg-white border border-gray-200 rounded-xl cursor-pointer transition-all duration-300 group hover:border-zinc-300 hover:shadow-lg relative overflow-hidden ${isSolved ? 'bg-emerald-50/10' : ''}`}
                >
                  {/* Active Hover Gradient Border Effect */}
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-zinc-900/10 rounded-xl pointer-events-none transition-colors duration-300"></div>

                  <CardContent className="p-6 flex flex-col h-full">
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isSolved ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white'}`}>
                        {isSolved ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" strokeWidth={1.5} />}
                      </div>
                      <Badge variant="outline" className={`${getDifficultyStyle(challenge.difficulty)} px-2.5 py-1 text-[10px] uppercase font-bold tracking-wide border`}>
                        {challenge.difficulty}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-zinc-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {challenge.title}
                      </h3>
                      <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-4">
                        {challenge.description}
                      </p>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {category && (
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                            {category.name}
                          </span>
                        )}
                        {challenge.tags && challenge.tags.slice(0, 2).map((tag: string, i: number) => (
                          <span key={i} className="text-[10px] font-medium text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                        {challenge.tags && challenge.tags.length > 2 && (
                          <span className="text-[10px] text-gray-400">+{challenge.tags.length - 2}</span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="block text-lg font-mono font-bold text-zinc-900">{challenge.total_points || challenge.points}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Points</span>
                      </div>
                    </div>

                    {/* Docker Badge if applicable */}
                    {challenge.docker_image && (
                      <div className="absolute top-4 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-100 flex items-center gap-1">
                        <Container className="w-3 h-3" /> DOCKERIZED
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredChallenges.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No challenges found</h3>
            <p className="text-gray-500">Try adjusting your filters or search query.</p>
            <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} className="mt-4 text-blue-600 font-medium hover:underline text-sm">Clear Filters</button>
          </div>
        )}
      </motion.div>
    </Layout>
  );
};

export default Challenges;
