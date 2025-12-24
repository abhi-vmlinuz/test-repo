import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Flag, Lightbulb, Play, CheckCircle2, Container, Sparkles, HelpCircle, Send, Terminal, Hash, ChevronRight, Trophy, X } from 'lucide-react';
import { motion } from 'framer-motion';

const ChallengeDetail = ({ user, logout }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [flagInput, setFlagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unlockedHints, setUnlockedHints] = useState([]);
  const [dockerInstance, setDockerInstance] = useState(null);
  const [startingDocker, setStartingDocker] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Question states
  const [questionInputs, setQuestionInputs] = useState({});
  const [solvedQuestions, setSolvedQuestions] = useState([]);
  const [submittingQuestion, setSubmittingQuestion] = useState(null);

  useEffect(() => {
    fetchChallenge();
  }, [id]);

  const fetchChallenge = async () => {
    try {
      const response = await axios.get(`${API}/challenges/${id}`);
      setChallenge(response.data);

      if (response.data.user_progress) {
        setUnlockedHints(response.data.user_progress.hints_used || []);
        setSolvedQuestions(response.data.user_progress.solved_questions || []);
      }
    } catch (error) {
      toast.error('Failed to load challenge');
      navigate('/challenges');
    }
  };

  const handleSubmitFlag = async (e) => {
    e.preventDefault();
    if (!flagInput.trim()) return;

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await axios.post(`${API}/submit`, {
        challenge_id: id,
        flag: flagInput
      });

      if (response.data.correct) {
        setSubmitResult('correct');
        toast.success(`${response.data.message} (+${response.data.points} points)`);
        fetchChallenge();
        setFlagInput('');
      } else {
        setSubmitResult('incorrect');
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to submit flag');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSubmitResult(null), 2000);
    }
  };

  const handleSubmitQuestion = async (questionIndex) => {
    const flagValue = questionInputs[questionIndex];
    if (!flagValue?.trim()) return;

    setSubmittingQuestion(questionIndex);

    try {
      const response = await axios.post(`${API}/submit-question`, {
        challenge_id: id,
        question_index: questionIndex,
        flag: flagValue
      });

      if (response.data.correct) {
        toast.success(`Correct! (+${response.data.points} points)`);
        setSolvedQuestions(prev => [...prev, questionIndex]);
        setQuestionInputs(prev => ({ ...prev, [questionIndex]: '' }));
        fetchChallenge();
      } else {
        toast.error('Incorrect answer');
      }
    } catch (error) {
      toast.error('Failed to submit answer');
    } finally {
      setSubmittingQuestion(null);
    }
  };

  const handleUnlockHint = async (hintIndex) => {
    try {
      const response = await axios.post(`${API}/hints`, {
        challenge_id: id,
        hint_index: hintIndex
      });

      if (!response.data.already_unlocked) {
        toast.info(`Hint unlocked (-${response.data.cost} points)`);
      }

      setUnlockedHints([...new Set([...unlockedHints, hintIndex])]);
    } catch (error) {
      toast.error('Failed to unlock hint');
    }
  };

  const handleStartDocker = async () => {
    if (!challenge.docker_image) return;

    setStartingDocker(true);
    try {
      const response = await axios.post(`${API}/docker/start/${id}`);
      setDockerInstance(response.data);
      toast.success('Docker instance started!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start Docker instance');
    } finally {
      setStartingDocker(false);
    }
  };

  const getDifficultyStyle = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTotalPoints = () => {
    let total = challenge?.points || 0;
    if (challenge?.questions) {
      total += challenge.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    }
    return total;
  };

  if (!challenge) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl animate-spin" />
          <p className="text-gray-500 font-mono text-sm">Decryping Mission Data...</p>
        </div>
      </div>
    );
  }

  const isSolved = challenge.user_progress?.solved;
  const pointsEarned = challenge.user_progress?.score_earned || 0;

  return (
    <Layout user={user} logout={logout}>
      {/* Breadcrumbs / Back */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/challenges')}
          className="text-gray-500 hover:text-zinc-900 flex items-center gap-2 text-sm font-medium transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Challenges
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 relative">

        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-8">

          {/* Header Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-white rounded-2xl border ${isSolved ? 'border-emerald-200 shadow-emerald-50' : 'border-gray-200'} shadow-sm overflow-hidden relative`}>
            {/* Decorative Gradient */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-900 via-gray-700 to-zinc-900"></div>

            {isSolved && (
              <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-3 flex items-center gap-2">
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <span className="text-emerald-800 font-bold text-sm tracking-wide uppercase">Mission Complete</span>
                <span className="text-emerald-600 font-mono font-bold ml-auto">+{pointsEarned} PTS</span>
              </div>
            )}

            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight leading-tight">{challenge.title}</h1>
                <Badge className={`${getDifficultyStyle(challenge.difficulty)} px-3 py-1 font-bold uppercase tracking-wider border`}>
                  {challenge.difficulty}
                </Badge>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-500 mb-6">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-gray-900">{getTotalPoints()} Points</span>
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{challenge.solves} Solves</span>
                </div>
              </div>

              <div className="prose prose-sm max-w-none text-gray-600">
                <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed bg-transparent p-0 text-gray-600">{challenge.description}</pre>
              </div>
            </div>
          </motion.div>

          {/* Docker Environment */}
          {challenge.docker_image && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900 text-white rounded-2xl shadow-xl overflow-hidden border border-zinc-800">
              <div className="bg-black/50 border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-green-400" />
                  <h3 className="font-mono font-bold text-sm tracking-wider uppercase">Terminal Environment</h3>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
              </div>

              <div className="p-8">
                <p className="text-gray-400 mb-6 text-sm">Deploy a private container instance to access the challenge environment.</p>

                {!dockerInstance ? (
                  <Button
                    onClick={handleStartDocker}
                    disabled={startingDocker}
                    className="bg-white text-black hover:bg-gray-200 font-bold px-8 py-6 rounded-xl w-full sm:w-auto"
                  >
                    <Play className="w-4 h-4 mr-2" fill="currentColor" />
                    {startingDocker ? 'Initializing Sequence...' : 'Initialize Instance'}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-black rounded-lg border border-white/10 p-4 font-mono text-sm">
                      <div className="flex justify-between items-center text-gray-400 mb-2">
                        <span>STATUS</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                          {dockerInstance.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-gray-500 text-xs uppercase mb-1">Host</p>
                          <p className="text-white select-all cursor-text">{user.username}-lab.zecurx.io</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs uppercase mb-1">Port</p>
                          <p className="text-white select-all cursor-text">{dockerInstance.port || 'TCP/8080'}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-center text-gray-500 mt-4">This instance will automatically terminate after 30 minutes of inactivity.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Questions Section */}
          {challenge.questions && challenge.questions.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-2">
                <HelpCircle className="w-5 h-5 text-zinc-900" />
                <h2 className="text-lg font-bold text-zinc-900 uppercase tracking-wide">Tasks</h2>
              </div>

              <div className="space-y-4">
                {challenge.questions.map((question, idx) => {
                  const isQuestionSolved = solvedQuestions.includes(idx);
                  return (
                    <Card key={idx} className={`border transition-all ${isQuestionSolved ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200'}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-sm ${isQuestionSolved ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {isQuestionSolved ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className={`font-semibold ${isQuestionSolved ? 'text-emerald-800' : 'text-zinc-900'}`}>{question.question}</p>
                            <p className="text-xs font-mono text-gray-500 mt-1">{question.points} PTS</p>
                          </div>
                        </div>

                        {!isQuestionSolved && (
                          <div className="flex gap-3 pl-12">
                            <Input
                              placeholder="Answer..."
                              value={questionInputs[idx] || ''}
                              onChange={(e) => setQuestionInputs(prev => ({ ...prev, [idx]: e.target.value }))}
                              className="bg-gray-50 border-gray-200"
                            />
                            <Button
                              onClick={() => handleSubmitQuestion(idx)}
                              disabled={submittingQuestion === idx || !questionInputs[idx]?.trim()}
                              className="bg-zinc-900 hover:bg-black text-white px-6 w-32"
                            >
                              {submittingQuestion === idx ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : 'Submit'}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Flag Submission */}
          {(challenge.has_main_flag !== false) && (
            <div className="mt-8">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="bg-gray-50/50 px-8 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-zinc-900" />
                    <h2 className="text-lg font-bold text-zinc-900 uppercase tracking-wide">Final Flag</h2>
                  </div>
                </div>
                <div className="p-8">
                  <form onSubmit={handleSubmitFlag} className="relative">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Flag className="w-5 h-5 text-gray-400" />
                      </div>
                      <Input
                        placeholder="CTF{...}"
                        value={flagInput}
                        onChange={(e) => setFlagInput(e.target.value)}
                        disabled={isSolved || submitting}
                        className="pl-12 h-16 bg-gray-50 border-gray-200 rounded-xl font-mono text-lg transition-all focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                        data-testid="flag-input"
                      />
                      <Button
                        type="submit"
                        disabled={isSolved || submitting || !flagInput.trim()}
                        className="absolute right-2 top-2 bottom-2 h-auto px-6 bg-zinc-900 hover:bg-black text-white rounded-lg font-bold"
                        data-testid="submit-flag-button"
                      >
                        {submitting ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : 'Submit Flag'}
                      </Button>
                    </div>
                    {submitResult === 'correct' && (
                      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-emerald-600 font-bold mt-3 pl-4 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Flag Accepted! Well done.
                      </motion.p>
                    )}
                    {submitResult === 'incorrect' && (
                      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 font-bold mt-3 pl-4 flex items-center gap-2">
                        <X className="w-4 h-4" /> Incorrect Flag. Try again.
                      </motion.p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">

          {/* Intel / Hints Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">Intelligence</h2>
              </div>
            </div>

            <div className="p-0">
              {challenge.hints && challenge.hints.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {challenge.hints.map((hint, index) => {
                    const isUnlocked = unlockedHints.includes(index);
                    return (
                      <div key={index} className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-sm text-gray-700">Hint #{index + 1}</span>
                          {isUnlocked ? (
                            <Badge className="bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100">Unlocked</Badge>
                          ) : (
                            <Badge variant="outline" className="border-zinc-200 text-zinc-500">
                              Cost: {hint.cost} PTS
                            </Badge>
                          )}
                        </div>

                        {isUnlocked ? (
                          <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100 text-sm text-gray-700">
                            {hint.text}
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50"
                            onClick={() => handleUnlockHint(index)}
                          >
                            Decrypt Hint
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-400 text-sm italic">No intelligence available for this mission.</p>
                </div>
              )}
            </div>
          </div>

          {/* Tags Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Mission Metadata</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                Binary Exploitation
              </Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                Linux
              </Badge>
              {challenge.docker_image && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100">
                  Docker Environment
                </Badge>
              )}
            </div>
          </div>

        </div>

      </div>
    </Layout>
  );
};

export default ChallengeDetail;
