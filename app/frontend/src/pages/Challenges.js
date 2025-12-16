import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Globe, Key, Search, Binary, CheckCircle2, Container, Filter, Lightbulb } from 'lucide-react';

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

      // Get solved challenge IDs
      const solvedIds = new Set();
      for (const challenge of challengesRes.data) {
        try {
          const detailRes = await axios.get(`${API}/challenges/${challenge.id}`);
          if (detailRes.data.user_progress?.solved) {
            solvedIds.add(challenge.id);
          }
        } catch (err) {
          // Ignore errors for individual challenges
        }
      }
      setSolvedChallenges(solvedIds);
    } catch (error) {
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  // Filter by category and search
  const filteredChallenges = challenges.filter(c => {
    const matchesCategory = selectedCategory === 'all' || c.category_id === selectedCategory;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getDifficultyStyle = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'hard': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <Navigation user={user} logout={logout} />
        <main className="w-full px-8 lg:px-16 py-10">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-gray-200 rounded-xl w-1/4" />
            <div className="h-14 bg-gray-200 rounded-2xl w-full max-w-md" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-56 bg-gray-200 rounded-3xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <Navigation user={user} logout={logout} />

      <main className="w-full px-8 lg:px-16 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Challenges</h1>
          <p className="text-lg text-gray-500">Test your skills across multiple categories</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col lg:flex-row gap-6 mb-10">
          {/* Search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search challenges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-14 h-14 bg-white border-gray-200 rounded-2xl text-base focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0">
            <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              data-testid="category-all"
            >
              All Challenges
            </button>
            {categories.map((cat) => {
              const Icon = iconMap[cat.icon] || Globe;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-5 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${selectedCategory === cat.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                    }`}
                  data-testid={`category-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        <p className="text-base text-gray-400 mb-8">
          {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? 's' : ''} found
        </p>

        {/* Challenges Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8" data-testid="challenges-grid">
          {filteredChallenges.map((challenge) => {
            const category = categories.find(c => c.id === challenge.category_id);
            const Icon = category ? iconMap[category.icon] || Globe : Globe;
            const isSolved = solvedChallenges.has(challenge.id);

            return (
              <Card
                key={challenge.id}
                onClick={() => navigate(`/challenges/${challenge.id}`)}
                className={`bg-white border-0 rounded-3xl cursor-pointer card-hover-delay hover:shadow-xl group ${isSolved ? 'ring-2 ring-emerald-200 bg-emerald-50/30' : 'shadow-sm hover:shadow-lg'
                  }`}
                data-testid={`challenge-${challenge.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <CardContent className="p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-gray-900 transition-colors">
                      <Icon className="w-7 h-7 text-gray-500 group-hover:text-white transition-colors" strokeWidth={1.5} />
                    </div>
                    {isSolved && (
                      <div className="flex items-center gap-2 text-emerald-500">
                        <CheckCircle2 className="w-6 h-6" fill="currentColor" stroke="white" />
                        <span className="text-sm font-medium">Solved</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-gray-700">
                    {challenge.title}
                  </h3>
                  <p className="text-gray-500 line-clamp-2 mb-6 leading-relaxed">
                    {challenge.description}
                  </p>

                  {/* Tags */}
                  <div className="flex items-center gap-3 mb-6">
                    <Badge className={`${getDifficultyStyle(challenge.difficulty)} font-medium border px-3 py-1`}>
                      {challenge.difficulty}
                    </Badge>
                    {category && (
                      <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                        {category.name}
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <span className="text-xl text-gray-900 font-mono font-bold">{challenge.total_points || challenge.points} pts</span>
                    <span className="text-gray-400">{challenge.solves} solves</span>
                  </div>

                  {challenge.docker_image && (
                    <div className="flex items-center text-sm text-gray-400 mt-4">
                      <Container className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Docker available
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredChallenges.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-xl text-gray-500 mb-2">No challenges found</p>
            <p className="text-gray-400">Try adjusting your search or filter</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Challenges;
