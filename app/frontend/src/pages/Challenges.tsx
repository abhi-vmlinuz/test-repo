import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Globe, Key, Search, Binary, CheckCircle2, Container, Filter, Lightbulb, Trophy, X, Shield, Lock, Code, Database, Server, Terminal, Wifi, Bug, Fingerprint } from 'lucide-react';

const iconMap: Record<string, any> = {
  'Globe': Globe,
  'Key': Key,
  'Search': Search,
  'Binary': Binary,
  'Lightbulb': Lightbulb,
  'Shield': Shield,
  'Lock': Lock,
  'Code': Code,
  'Database': Database,
  'Server': Server,
  'Terminal': Terminal,
  'Wifi': Wifi,
  'Bug': Bug,
  'Fingerprint': Fingerprint
};

const Challenges = ({ user, logout }) => {
  const [categories, setCategories] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [solvedChallenges, setSolvedChallenges] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'docker'>('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcut: Press "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to clear and blur
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Advanced filter: search across title, description, tags, author, category name, difficulty
  const filteredChallenges = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();

    return challenges.filter(c => {
      const matchesCategory = selectedCategory === 'all' || c.category_id === selectedCategory;

      // Extended search across multiple fields
      let matchesSearch = true;
      if (query) {
        const category = categories.find(cat => cat.id === c.category_id);
        const categoryName = category?.name?.toLowerCase() || '';
        const tags = (c.tags || []).join(' ').toLowerCase();
        const author = (c.author || '').toLowerCase();
        const title = c.title.toLowerCase();
        const description = c.description.toLowerCase();
        const difficulty = c.difficulty?.toLowerCase() || '';

        // Search across all fields
        matchesSearch =
          title.includes(query) ||
          description.includes(query) ||
          tags.includes(query) ||
          author.includes(query) ||
          categoryName.includes(query) ||
          difficulty.includes(query);
      }

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'solved' && solvedChallenges.has(c.id)) ||
        (statusFilter === 'unsolved' && !solvedChallenges.has(c.id));

      const matchesDifficulty = difficultyFilter === 'all' || c.difficulty?.toLowerCase() === difficultyFilter;

      const matchesType = typeFilter === 'all' || (typeFilter === 'docker' && (c.docker_image || c.has_docker));

      return matchesCategory && matchesSearch && matchesStatus && matchesDifficulty && matchesType;
    });
  }, [challenges, categories, selectedCategory, debouncedSearch, statusFilter, difficultyFilter, typeFilter, solvedChallenges]);

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

        {/* Search Bar - Full Width */}
        <div className="relative w-full group">
          {/* Clickable Search Icon */}
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            className="absolute left-5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 transition-colors z-10"
            tabIndex={-1}
          >
            <Search className="w-5 h-5 text-gray-400 group-focus-within:text-zinc-900 transition-colors" />
          </button>

          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search challenges, difficulty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ color: '#18181b' }}
            className="w-full pl-14 pr-24 h-14 bg-white border border-gray-200 rounded-2xl text-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent shadow-sm focus:outline-none placeholder:text-gray-400"
          />

          {/* Clear Button & Keyboard Hint */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {!searchQuery && (
              <kbd className="hidden sm:inline-flex items-center px-2.5 py-1 text-xs font-mono text-gray-400 bg-gray-100 border border-gray-200 rounded-lg">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
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

        {/* Status & Difficulty Filters Row */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Status Filter */}
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
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Difficulty:</span>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setDifficultyFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${difficultyFilter === 'all'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setDifficultyFilter('easy')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${difficultyFilter === 'easy'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                Easy
              </button>
              <button
                onClick={() => setDifficultyFilter('medium')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${difficultyFilter === 'medium'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                Medium
              </button>
              <button
                onClick={() => setDifficultyFilter('hard')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${difficultyFilter === 'hard'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className="w-2 h-2 rounded-full bg-red-400" />
                Hard
              </button>
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type:</span>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${typeFilter === 'all'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('docker')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${typeFilter === 'docker'
                  ? 'bg-white text-sky-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Container className="w-3 h-3" />
                Docker
              </button>
            </div>
          </div>

          {/* Results count */}
          {(statusFilter !== 'all' || difficultyFilter !== 'all' || typeFilter !== 'all') && (
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
                    {(challenge.docker_image || challenge.has_docker) && (
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
    </Layout >
  );
};

export default Challenges;
