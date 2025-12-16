import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../App';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Flag, Lightbulb, Play, CheckCircle2, Container, Sparkles } from 'lucide-react';

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

  useEffect(() => {
    fetchChallenge();
  }, [id]);

  const fetchChallenge = async () => {
    try {
      const response = await axios.get(`${API}/challenges/${id}`);
      setChallenge(response.data);

      if (response.data.user_progress) {
        setUnlockedHints(response.data.user_progress.hints_used || []);
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
      case 'easy': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'hard': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  if (!challenge) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full mb-4" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
      </div>
    );
  }

  const isSolved = challenge.user_progress?.solved;
  const pointsEarned = challenge.user_progress?.score_earned || 0;

  return (
    <div className="min-h-screen bg-gray-50/30">
      <Navigation user={user} logout={logout} />

      <main className="w-full px-8 lg:px-16 py-10">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/challenges')}
          className="mb-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full px-5"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Challenges
        </Button>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Challenge header */}
            <div className={`bg-white rounded-3xl shadow-sm overflow-hidden ${isSolved ? 'ring-2 ring-emerald-200' : ''}`}>
              {isSolved && (
                <div className="bg-emerald-50 border-b border-emerald-100 px-8 py-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" fill="currentColor" stroke="white" />
                  <span className="text-emerald-700 font-medium">Challenge Completed</span>
                  <span className="text-emerald-500 ml-auto">+{pointsEarned} pts</span>
                </div>
              )}
              <div className="p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4" data-testid="challenge-title">
                  {challenge.title}
                </h1>
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge className={`${getDifficultyStyle(challenge.difficulty)} font-medium border px-4 py-1`}>
                    {challenge.difficulty}
                  </Badge>
                  <span className="text-xl text-gray-900 font-mono font-bold">{challenge.points} pts</span>
                  <span className="text-gray-400">{challenge.solves} solves</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-3xl shadow-sm p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
              <pre className="whitespace-pre-wrap text-gray-600 font-sans leading-relaxed text-lg">{challenge.description}</pre>
            </div>

            {/* Docker instance */}
            {challenge.docker_image && (
              <div className="bg-white rounded-3xl shadow-sm p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Container className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                  <h2 className="text-xl font-semibold text-gray-900">Docker Instance</h2>
                </div>
                <p className="text-gray-500 mb-6">Start a containerized environment for this challenge</p>

                {!dockerInstance ? (
                  <Button
                    onClick={handleStartDocker}
                    disabled={startingDocker}
                    className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-8 py-6 text-base"
                    data-testid="start-docker-button"
                  >
                    <Play className="w-5 h-5 mr-2" fill="currentColor" />
                    {startingDocker ? 'Starting...' : 'Start Instance'}
                  </Button>
                ) : (
                  <Alert className="bg-gray-50 border-gray-200 rounded-2xl">
                    <AlertDescription className="text-gray-600">
                      <p className="font-medium mb-1">
                        Status: <span className="text-emerald-500">{dockerInstance.status}</span>
                      </p>
                      <p className="text-sm text-gray-400">
                        Container ID: <code className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{dockerInstance.container_id?.substring(0, 12)}</code>
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Flag submission */}
            <div className={`bg-white rounded-3xl shadow-sm p-8 transition-all ${submitResult === 'correct' ? 'ring-2 ring-emerald-300 bg-emerald-50/50' :
                submitResult === 'incorrect' ? 'ring-2 ring-red-300 bg-red-50/50' : ''
              }`}>
              <div className="flex items-center gap-3 mb-4">
                <Flag className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <h2 className="text-xl font-semibold text-gray-900">Submit Flag</h2>
              </div>
              <p className="text-gray-500 mb-6">Format: CTF{'{...}'}</p>

              <form onSubmit={handleSubmitFlag} className="flex gap-4">
                <Input
                  placeholder="CTF{your_flag_here}"
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  disabled={isSolved || submitting}
                  className="h-14 bg-gray-50 border-gray-200 rounded-2xl font-mono text-base flex-1"
                  data-testid="flag-input"
                />
                <Button
                  type="submit"
                  disabled={isSolved || submitting || !flagInput.trim()}
                  className="h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl px-8 min-w-[120px]"
                  data-testid="submit-flag-button"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Submit'
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Hints */}
            <div className="bg-white rounded-3xl shadow-sm p-8">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="w-6 h-6 text-amber-400" strokeWidth={1.5} />
                <h2 className="text-xl font-semibold text-gray-900">Hints</h2>
              </div>
              <p className="text-gray-500 mb-6">Unlock hints to get help (costs points)</p>

              {challenge.hints && challenge.hints.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {challenge.hints.map((hint, index) => {
                    const isUnlocked = unlockedHints.includes(index);
                    return (
                      <AccordionItem key={index} value={`hint-${index}`} className="border-gray-100">
                        <AccordionTrigger className="text-gray-700 hover:text-gray-900 hover:no-underline py-4">
                          <div className="flex items-center justify-between w-full pr-4">
                            <span className="font-medium">Hint {index + 1}</span>
                            {isUnlocked ? (
                              <Sparkles className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Badge variant="outline" className="border-amber-300 text-amber-600">
                                {hint.cost} pts
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-500">
                          {isUnlocked ? (
                            <p className="bg-amber-50 p-4 rounded-xl border border-amber-100">{hint.text}</p>
                          ) : (
                            <div className="space-y-4">
                              <p>This hint costs {hint.cost} points.</p>
                              <Button
                                onClick={() => handleUnlockHint(index)}
                                size="sm"
                                variant="outline"
                                className="border-amber-300 text-amber-600 hover:bg-amber-50 rounded-full"
                                data-testid={`unlock-hint-${index}`}
                              >
                                <Lightbulb className="w-4 h-4 mr-2" />
                                Unlock Hint
                              </Button>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <p className="text-gray-400">No hints available for this challenge</p>
              )}
            </div>

            {/* Challenge info */}
            <div className="bg-white rounded-3xl shadow-sm p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Challenge Info</h2>
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Difficulty</span>
                  <Badge className={`${getDifficultyStyle(challenge.difficulty)} font-medium border`}>
                    {challenge.difficulty}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Points</span>
                  <span className="text-gray-900 font-mono font-semibold">{challenge.points}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Solves</span>
                  <span className="text-gray-900">{challenge.solves}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Docker</span>
                  <span className="text-gray-900">{challenge.docker_image ? 'Available' : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChallengeDetail;
