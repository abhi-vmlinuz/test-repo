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
import { ArrowLeft, Flag, Lightbulb, Play, CheckCircle2, Container, Sparkles, HelpCircle, Send, Terminal, Hash, ChevronRight, Trophy, X, RefreshCw, Square, Clock, FileText, Download, Paperclip, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import TerminalComponent from '@/components/TerminalComponent';
import BetaFeature from '@/components/BetaFeature';

// Conductor URL: set via VITE_CONDUCTOR_URL for production (Cloudflare Tunnel)
const CONDUCTOR_URL = import.meta.env.VITE_CONDUCTOR_URL || 'http://localhost:8080';

const ChallengeDetail = ({ user, logout }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [flagInput, setFlagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unlockedHints, setUnlockedHints] = useState([]);
  const [dockerInstance, setDockerInstance] = useState(null);
  // Check sessionStorage for pending start state - persists across navigation
  const [startingDocker, setStartingDocker] = useState(() => {
    const storedStarting = sessionStorage.getItem(`docker-starting-${id}`);
    return storedStarting === 'true';
  });
  const [stoppingDocker, setStoppingDocker] = useState(false);
  const [extendingDocker, setExtendingDocker] = useState(false);
  const [remainingTime, setRemainingTime] = useState({ mins: 60, secs: 0 });
  const [submitResult, setSubmitResult] = useState(null);

  // Question states
  const [questionInputs, setQuestionInputs] = useState({});
  const [solvedQuestions, setSolvedQuestions] = useState([]);
  const [submittingQuestion, setSubmittingQuestion] = useState(null);
  const [artifacts, setArtifacts] = useState([]);
  const [visibleHints, setVisibleHints] = useState<number[]>([]); // Track which unlocked hints are currently visible

  // Persist startingDocker state to sessionStorage

  // Terminal State
  const [terminalVmId, setTerminalVmId] = useState<string | null>(null);
  const [startingTerminal, setStartingTerminal] = useState(false);
  const [showOsModal, setShowOsModal] = useState(false);
  const [selectedDistro, setSelectedDistro] = useState('kali');
  const [availableDistros, setAvailableDistros] = useState<{ name: string, default: boolean }[]>([]);

  const fetchDistros = async () => {
    try {
      const res = await axios.get(`${CONDUCTOR_URL}/api/v1/distros`);
      if (res.data.success) {
        setAvailableDistros(res.data.data);
        const defaultDistro = res.data.data.find(d => d.default);
        if (defaultDistro) setSelectedDistro(defaultDistro.name);
      }
    } catch (e) {
      console.error("Failed to fetch distros:", e);
      // Fallback if conductor offline
      setAvailableDistros([{ name: 'kali', default: true }, { name: 'ubuntu', default: false }]);
    }
  };

  const handleOpenTerminalModal = () => {
    fetchDistros();
    setShowOsModal(true);
  };

  const handleStartTerminal = async () => {
    setStartingTerminal(true);
    try {
      // Get artifact URLs to inject
      const artifactUrls = artifacts.map(a => `${API}/artifacts/download/${a.id}`);

      const res = await axios.post(`${CONDUCTOR_URL}/api/v1/vms`, {
        challenge_id: id,
        user_id: user?.id || 'anonymous',
        distro: selectedDistro,
        artifacts: artifactUrls
      });

      if (res.data.success) {
        setTerminalVmId(res.data.data.id);
        setShowOsModal(false);
        toast.success(`Terminal environment started (${selectedDistro})`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to start terminal environment. Is the conductor running?");
    } finally {
      setStartingTerminal(false);
    }
  };

  const handleStopTerminal = async () => {
    if (!terminalVmId) return;
    try {
      await axios.delete(`${CONDUCTOR_URL}/api/v1/vms/${terminalVmId}`);
      setTerminalVmId(null);
      toast.info("Terminal session ended");
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    if (startingDocker) {
      sessionStorage.setItem(`docker-starting-${id}`, 'true');
    } else {
      sessionStorage.removeItem(`docker-starting-${id}`);
    }
  }, [startingDocker, id]);

  useEffect(() => {
    fetchChallenge();
    fetchArtifacts();
    // Check for existing docker session - backend is the source of truth
    // This works even after logout/login since state is in the database
    checkExistingSession();
  }, [id]);

  // Poll for session status while starting
  useEffect(() => {
    if (!startingDocker) return;

    let cancelled = false;
    let pollCount = 0;
    const maxPolls = 60; // 3 minutes max (60 * 3s)

    const pollInterval = setInterval(async () => {
      if (cancelled) return;
      pollCount++;

      try {
        const response = await axios.get(`${API}/docker/challenge-session/${id}`);
        if (!cancelled && response.data) {
          if (response.data.status === 'running' && response.data.target_ip) {
            // Instance is fully ready - only show toast if we didn't already have it
            if (!dockerInstance?.target_ip) {
              toast.success('Instance is ready!');
            }
            setDockerInstance(response.data);
            setStartingDocker(false);
          } else if (response.data.status === 'pending') {
            // Still starting - keep polling
          } else if (pollCount >= maxPolls) {
            // Timeout after 3 minutes
            setStartingDocker(false);
            toast.error('Instance startup timed out. Please try again.');
          }
        }
      } catch (error) {
        // Keep polling unless we've exceeded max attempts
        if (pollCount >= maxPolls) {
          setStartingDocker(false);
          toast.error('Failed to verify instance status');
        }
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [startingDocker, id]);

  // Timer to update remaining time with seconds
  useEffect(() => {
    if (!dockerInstance?.expires_at) return;

    const calculateTime = () => {
      const diff = new Date(dockerInstance.expires_at).getTime() - Date.now();
      const totalSecs = Math.max(0, Math.floor(diff / 1000));
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      setRemainingTime({ mins, secs });
    };

    const interval = setInterval(calculateTime, 1000);
    calculateTime();
    return () => clearInterval(interval);
  }, [dockerInstance?.expires_at]);

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

  const fetchArtifacts = async () => {
    try {
      const response = await axios.get(`${API}/challenges/${id}/artifacts`);
      setArtifacts(response.data);
    } catch (error) {
      console.error('Failed to fetch artifacts', error);
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

        // Auto-stop the instance if running (save resources after solving)
        if (dockerInstance?.session_id) {
          try {
            await axios.delete(`${API}/docker/stop/${dockerInstance.session_id}`);
            setDockerInstance(null);
            toast.info('Lab instance stopped - challenge complete! 🎉');
          } catch (e) {
            // Instance might already be stopped
          }
        }
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
        toast.success('Hint unlocked!');
      }

      setUnlockedHints([...new Set([...unlockedHints, hintIndex])]);
    } catch (error) {
      toast.error('Failed to unlock hint');
    }
  };

  const checkExistingSession = async () => {
    console.log('[Nexus] Checking existing session for challenge:', id);
    try {
      const response = await axios.get(`${API}/docker/challenge-session/${id}`);
      console.log('[Nexus] Session check response:', response.data);

      if (response.data && response.data.status === 'running') {
        console.log('[Nexus] Found running session with IP:', response.data.target_ip);
        // Instance is running with IP
        if (response.data.target_ip) {
          setDockerInstance(response.data);
          setStartingDocker(false);
        } else {
          // Running but no IP yet - continue polling
          console.log('[Nexus] Session running but no IP yet - starting poll');
          setStartingDocker(true);
        }
      } else if (response.data && response.data.status === 'pending') {
        console.log('[Nexus] Session pending - starting poll');
        setStartingDocker(true);
      } else {
        console.log('[Nexus] No active session found, status:', response.data?.status);
      }
    } catch (error: any) {
      console.log('[Nexus] Session check error:', error.response?.status, error.message);
    }
  };

  const handleStartDocker = async () => {
    if (!challenge?.docker_image && !challenge?.has_docker && !challenge?.is_multi_container) return;
    if (startingDocker) return; // Prevent double-clicks

    // Set loading state IMMEDIATELY for instant visual feedback
    setStartingDocker(true);

    // First check if there's already a running instance
    try {
      const existingCheck = await axios.get(`${API}/docker/challenge-session/${id}`);
      if (existingCheck.data && existingCheck.data.status === 'running' && existingCheck.data.target_ip) {
        setDockerInstance(existingCheck.data);
        setStartingDocker(false);
        toast.info('Instance already running!');
        return;
      }
    } catch (e) {
      // No existing session, proceed to start
    }

    // Fire the start request but don't wait for full response
    // The polling mechanism will pick up the result
    try {
      // Use a short timeout - if the backend responds quickly, great!
      // Otherwise, polling will handle it
      const response = await axios.post(`${API}/docker/start/${id}`, {}, { timeout: 15000 });
      if (response.data && response.data.status === 'running' && response.data.target_ip) {
        // Immediate success - instance started quickly (cached or fast provision)
        setDockerInstance(response.data);
        setStartingDocker(false);
        toast.success('Instance is ready!');
        return;
      }
      // If we get here, session was started but still provisioning - polling will handle it
    } catch (error: any) {
      // Only show error for non-timeout errors
      // Timeouts are expected since provisioning takes 1-2 minutes
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // Timeout is expected - polling will continue checking
        console.log('[Nexus] Initial request timed out - polling will continue');
      } else if (error.response?.status === 429) {
        setStartingDocker(false);
        toast.error(error.response?.data?.detail || 'Please wait before starting another instance');
      } else if (error.response?.status === 503) {
        setStartingDocker(false);
        toast.error(error.response?.data?.detail || 'Container service unavailable. Please try again later.');
      } else if (error.response?.status >= 400 && error.response?.status < 500) {
        // Client errors should stop polling
        setStartingDocker(false);
        toast.error(error.response?.data?.detail || 'Failed to start instance');
      } else {
        // Network/server errors - keep polling as backend might still be processing
        console.log('[Nexus] Request error, polling will continue:', error.message);
      }
    }
  };

  const handleStopDocker = async () => {
    if (!dockerInstance?.session_id) return;

    setStoppingDocker(true);
    try {
      await axios.delete(`${API}/docker/stop/${dockerInstance.session_id}`);
      setDockerInstance(null);
      toast.success('Instance stopped');
    } catch (error: any) {
      // If 404, the instance is already gone
      if (error.response?.status === 404) {
        setDockerInstance(null);
        toast.info('Instance already terminated');
      } else {
        toast.error('Failed to stop instance');
      }
    } finally {
      setStoppingDocker(false);
    }
  };

  const handleExtendDocker = async () => {
    if (!dockerInstance?.session_id) return;

    setExtendingDocker(true);
    try {
      const response = await axios.post(`${API}/docker/extend/${dockerInstance.session_id}`);
      // Backend now returns expires_at directly
      const newExpiresAt = response.data.expires_at;
      if (newExpiresAt) {
        setDockerInstance(prev => ({ ...prev, expires_at: newExpiresAt }));
        toast.success('Extended by 30 minutes');
      } else {
        toast.warning('Extension applied but could not refresh timer');
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Extension available when less than 30 minutes remain on timer');
      } else if (error.response?.status === 404) {
        toast.error('Session expired or not found. Please start a new instance.');
        setDockerInstance(null);
      } else {
        toast.error(error.response?.data?.detail || 'Extension failed - try again later');
      }
    } finally {
      setExtendingDocker(false);
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
          <p className="text-gray-500 font-mono text-sm">Loading Challenge...</p>
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

      <div className={`${terminalVmId ? '-mx-6 lg:-mx-10 px-6 lg:px-6 grid grid-cols-1 lg:grid-cols-2 gap-4' : 'grid lg:grid-cols-12 gap-8'} relative`}>

        {/* Main Content Column */}
        <div className={`${terminalVmId ? 'h-[calc(100vh-6rem)] overflow-y-auto pr-2 scrollbar-thin' : 'lg:col-span-8'} space-y-8 transition-all duration-300`}>

          {/* Header Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-white rounded-2xl border ${isSolved ? 'border-emerald-200 shadow-emerald-50' : 'border-gray-200'} shadow-sm overflow-hidden relative`}>


            {isSolved && (
              <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-3 flex items-center gap-2">
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <span className="text-emerald-800 font-bold text-sm tracking-wide uppercase">Challenge Complete</span>
                <span className="text-emerald-600 font-mono font-bold ml-auto">+{pointsEarned} PTS</span>
              </div>
            )}

            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight leading-tight">{challenge.title}</h1>
                <Badge variant="outline" className={`${getDifficultyStyle(challenge.difficulty)} px-3 py-1 font-bold uppercase tracking-wider border`}>
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
                {challenge.author && (
                  <>
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">by</span>
                      <span className="font-medium text-gray-700">{challenge.author}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="prose prose-sm max-w-none">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <p className="font-sans text-base leading-relaxed text-gray-600">{challenge.description?.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Lab Environment - Gray/Black Theme */}
          {(challenge.docker_image || challenge.has_docker || challenge.is_multi_container) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center shadow-md">
                    <Terminal className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Challenge Lab</h3>
                    <p className="text-xs text-gray-500">Interactive environment</p>
                  </div>
                </div>
                {dockerInstance && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Running</span>
                    <div className="w-2 h-2 rounded-full bg-gray-600 animate-pulse"></div>
                  </div>
                )}
              </div>

              <div className="p-6">
                {!dockerInstance ? (
                  <div className="space-y-4">
                    <p className="text-gray-600 text-sm">
                      {startingDocker
                        ? "Preparing your lab environment. It'd take a minute for the machine IP..."
                        : 'Start a private lab instance to access the challenge environment.'}
                    </p>
                    <Button
                      onClick={handleStartDocker}
                      disabled={startingDocker}
                      className="bg-gray-900 hover:bg-gray-800 text-white font-semibold px-8 py-6 rounded-xl w-full sm:w-auto shadow-lg disabled:bg-gray-400"
                    >
                      {startingDocker ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        <>
                          <Terminal className="w-4 h-4 mr-2" />
                          Start Instance
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-500 text-xs uppercase mb-1">Target IP</p>
                          <div className="flex items-center gap-2">
                            {dockerInstance.target_ip ? (
                              <>
                                <p
                                  className="text-gray-900 select-all cursor-pointer hover:text-gray-600 transition-colors text-lg font-bold font-mono"
                                  onClick={() => {
                                    navigator.clipboard.writeText(dockerInstance.target_ip);
                                    toast.success('IP copied!');
                                  }}
                                >
                                  {dockerInstance.target_ip}
                                </p>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(dockerInstance.target_ip);
                                    toast.success('IP copied!');
                                  }}
                                  className="text-gray-400 hover:text-gray-600 text-xs"
                                >
                                  Copy
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 text-amber-600 font-medium animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span className="text-sm">Pending...</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs uppercase mb-1">Expires At</p>
                          <div className="flex items-baseline gap-2">
                            <p className={`text-lg font-bold font-mono ${remainingTime.mins < 20 ? 'text-amber-600' : 'text-gray-700'}`}>
                              {dockerInstance.expires_at ? new Date(dockerInstance.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                            </p>
                            <span className="text-xs text-gray-400">
                              ({remainingTime.mins}m {remainingTime.secs}s)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleStopDocker}
                        disabled={stoppingDocker}
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      >
                        {stoppingDocker ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Square className="w-4 h-4 mr-2" />
                        )}
                        Stop Instance
                      </Button>
                      {/* Always show extend button when instance is running */}
                      <Button
                        variant="outline"
                        onClick={handleExtendDocker}
                        disabled={extendingDocker}
                        className={`flex-1 transition-all ${remainingTime.mins < 20
                          ? 'border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-400 animate-pulse'
                          : 'border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300'
                          }`}
                      >
                        {extendingDocker ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4 mr-2" />
                        )}
                        Extend +30m
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Challenge Artifacts Section */}
          {artifacts && artifacts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
            >
              <div className="bg-white px-8 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Paperclip className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-lg font-bold text-zinc-900 uppercase tracking-wide">Challenge Artifacts</h2>
                </div>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100">
                  {artifacts.length} {artifacts.length === 1 ? 'FILE' : 'FILES'}
                </Badge>
              </div>
              <div className="p-8 bg-white">
                <p className="text-sm text-gray-500 mb-6 font-medium">
                  The following files are provided for this challenge. Download them to analyze and find the flag.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {artifacts.map((art) => (
                    <div
                      key={art.id}
                      className="group flex items-center justify-between p-4 bg-gray-50 hover:bg-white hover:shadow-md hover:border-indigo-200 border border-gray-100 rounded-xl transition-all duration-200 cursor-default"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                          <FileText className="w-6 h-6 text-gray-400 group-hover:text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{art.filename}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono uppercase">
                              {(art.file_size / 1024).toFixed(1)} KB
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium">
                              {art.mime_type?.split('/')[1]?.toUpperCase() || 'DATA'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <a
                        href={`${API}/artifacts/download/${art.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-full transition-all flex items-center justify-center border border-transparent hover:border-indigo-100 hover:shadow-sm"
                        title="Download Artifact"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  ))}
                </div>
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


        {/* Terminal Column */}
        {terminalVmId && (
          <div className="h-[calc(100vh-6rem)] sticky top-20">
            <TerminalComponent
              vmId={terminalVmId}
              onClose={handleStopTerminal}
            />
          </div>
        )}

        {/* Sidebar Column - Hide when terminal is open to make space */}
        {!terminalVmId && (
          <div className="lg:col-span-4 space-y-8">

            {/* Internal Terminal Launch Card (Beta) */}
            <BetaFeature name="firecracker_terminal">
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="p-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700 shadow-inner">
                      <Terminal className="w-5 h-5 text-emerald-400" />
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase text-[10px] tracking-wider font-bold">
                      Beta Access
                    </Badge>
                  </div>

                  <h3 className="text-white font-bold text-lg mb-2">Internal Terminal</h3>
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                    Launch a pro-grade Kali Linux environment directly in your browser. No VPN required.
                  </p>

                  <Button
                    onClick={handleOpenTerminalModal}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-0 shadow-lg shadow-emerald-900/20"
                  >
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    Launch Terminal
                  </Button>
                </div>
              </div>
            </BetaFeature>

            {/* Intel / Hints Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">Hints</h2>
                </div>
              </div>

              <div className="p-0">
                {challenge.hints && challenge.hints.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {challenge.hints.map((hint, index) => {
                      const isVisible = visibleHints.includes(index);
                      return (
                        <div key={index} className="p-4">
                          <div
                            className="flex items-center justify-between cursor-pointer group"
                            onClick={() => {
                              if (isVisible) {
                                setVisibleHints(prev => prev.filter(i => i !== index));
                              } else {
                                setVisibleHints(prev => [...prev, index]);
                              }
                            }}
                          >
                            <span className="font-bold text-sm text-gray-700">Hint #{index + 1}</span>
                            <button
                              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-400 group-hover:text-gray-600"
                              title={isVisible ? 'Hide hint' : 'Show hint'}
                            >
                              {isVisible ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {isVisible && (
                            <div className="mt-3 bg-amber-50/50 p-3 rounded-lg border border-amber-100 text-sm text-gray-700 animate-in fade-in slide-in-from-top-1 duration-200">
                              {hint.text}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-400 text-sm italic">No hints available for this challenge.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Challenge IP for Docker challenges */}
            {(challenge.docker_image || challenge.has_docker || challenge.is_multi_container) && dockerInstance && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Challenge IP</h3>
                <div
                  className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
                  onClick={() => {
                    navigator.clipboard.writeText(dockerInstance.target_ip);
                    toast.success('IP copied!');
                  }}
                >
                  <p className="text-gray-900 font-mono text-xl font-bold text-center">{dockerInstance.target_ip}</p>
                  <p className="text-gray-400 text-xs text-center mt-2">Click to copy</p>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Time left:</span>
                  <span className={`font-mono font-medium ${remainingTime.mins < 20 ? 'text-amber-600' : 'text-gray-700'}`}>
                    {remainingTime.mins}m {remainingTime.secs}s
                  </span>
                </div>
              </div>
            )}

            {/* Tags Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Challenge Tags</h3>
              <div className="flex flex-wrap gap-2">
                {challenge.category_name && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                    {challenge.category_name}
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                  {challenge.difficulty}
                </Badge>
                {(challenge.docker_image || challenge.has_docker || challenge.is_multi_container) && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                    Lab
                  </Badge>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
      {/* OS Picker Modal */}
      {showOsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-zinc-200"
          >
            <div className="p-6 border-b border-zinc-100">
              <h3 className="text-xl font-bold text-zinc-900">Start Terminal Environment</h3>
              <p className="text-sm text-zinc-500 mt-1">Select an operating system to launch.</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {availableDistros.map(distro => (
                  <button
                    key={distro.name}
                    onClick={() => setSelectedDistro(distro.name)}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${selectedDistro === distro.name
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedDistro === distro.name ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                        <Terminal className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className={`font-bold capitalize ${selectedDistro === distro.name ? 'text-emerald-900' : 'text-zinc-900'}`}>
                          {distro.name} Linux
                        </p>
                        <p className="text-xs text-zinc-500">Standard Environment</p>
                      </div>
                    </div>
                    {selectedDistro === distro.name && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  </button>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-3 text-sm text-amber-800">
                <Lightbulb className="w-5 h-5 flex-shrink-0 text-amber-600" />
                <p>This will launch a temporary VM. Artifacts from this challenge will be automatically injected into <code>/root/</code>.</p>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowOsModal(false)}>Cancel</Button>
              <Button
                onClick={handleStartTerminal}
                className="bg-zinc-900 text-white hover:bg-zinc-800"
                disabled={startingTerminal}
              >
                {startingTerminal ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                Launch Environment
              </Button>
            </div>
          </motion.div>
        </div>
      )}

    </Layout>
  );
};

export default ChallengeDetail;
