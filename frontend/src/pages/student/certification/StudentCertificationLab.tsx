import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API, toast } from '../../../App';
import {
    ArrowLeft, Clock, Flag, CheckCircle2, Loader2, AlertCircle,
    Send, Terminal, RefreshCw, Square, Download, FileText,
    Paperclip, HelpCircle, ChevronRight, Trophy
} from 'lucide-react';

const CONDUCTOR_URL = import.meta.env.VITE_CONDUCTOR_URL || 'http://localhost:8080';

interface Task {
    question: string;
    points: number;
}

interface Challenge {
    challenge_id: string;
    title: string;
    description: string;
    difficulty: string;
    points: number;
    task_points: number;
    total_points: number;
    category: string;
    has_docker: boolean;
    docker_image: string | null;
    is_multi_container: boolean;
    tasks: Task[];
    tasks_solved: number[];
    is_solved: boolean;
    solved_at: string | null;
}

interface Artifact {
    id: string;
    filename: string;
    file_size: number;
    mime_type: string;
}

interface LabDetails {
    exam_id: string;
    exam_title: string;
    attempt_id: string;
    status: string;
    challenges: Challenge[];
    lab_score: number;
    total_points: number;
    earned_points: number;
    lab_timer_end: string;
    can_upload_report: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
    EASY: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
    HARD: 'bg-red-100 text-red-700 border-red-200',
};

function formatTime(diffMs: number): string {
    if (diffMs <= 0) return 'Expired';
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    const s = Math.floor((diffMs % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
}

const StudentCertificationLab = () => {
    const navigate = useNavigate();
    const { examId } = useParams<{ examId: string }>();

    const [lab, setLab] = useState<LabDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [startingLab, setStartingLab] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState('');

    // Submission state
    const [flagInput, setFlagInput] = useState('');
    const [submittingFlag, setSubmittingFlag] = useState(false);
    const [taskInputs, setTaskInputs] = useState<Record<number, string>>({});
    const [submittingTask, setSubmittingTask] = useState<number | null>(null);
    const [endingLab, setEndingLab] = useState(false);

    // Docker state
    const [dockerInstance, setDockerInstance] = useState<any>(null);
    const [startingDocker, setStartingDocker] = useState(false);
    const [stoppingDocker, setStoppingDocker] = useState(false);
    const [dockerTimer, setDockerTimer] = useState({ mins: 60, secs: 0 });

    // Artifacts
    const [artifacts, setArtifacts] = useState<Record<string, Artifact[]>>({});

    const fetchLabDetails = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/student/certification-exams/${examId}/lab`);
            setLab(res.data);
        } catch (err: any) {
            if (err.response?.status === 404) setLab(null);
            else toast.error('Failed to load lab');
        } finally {
            setLoading(false);
        }
    }, [examId]);

    const fetchArtifacts = useCallback(async (challengeId: string) => {
        if (artifacts[challengeId]) return;
        try {
            const res = await axios.get(`${API}/challenges/${challengeId}/artifacts`);
            setArtifacts(prev => ({ ...prev, [challengeId]: res.data }));
        } catch { /* ignore */ }
    }, [artifacts]);

    useEffect(() => { fetchLabDetails(); }, [fetchLabDetails]);

    // When selected challenge changes, fetch its artifacts + check docker session
    const selectedChallenge = lab?.challenges[selectedIdx] ?? null;
    useEffect(() => {
        if (!selectedChallenge) return;
        fetchArtifacts(selectedChallenge.challenge_id);
        // Reset inputs on challenge switch
        setFlagInput('');
        setDockerInstance(null);
        // Check existing docker session
        if (selectedChallenge.has_docker) {
            axios.get(`${API}/docker/challenge-session/${selectedChallenge.challenge_id}`)
                .then(r => {
                    if (r.data?.status === 'running' && r.data?.target_ip) setDockerInstance(r.data);
                    else if (r.data?.status === 'pending') setStartingDocker(true);
                }).catch(() => {});
        }
    }, [selectedChallenge?.challenge_id]);

    // Poll docker status while starting
    useEffect(() => {
        if (!startingDocker || !selectedChallenge?.challenge_id) return;
        let cancelled = false;
        let polls = 0;
        const iv = setInterval(async () => {
            if (cancelled || ++polls > 60) { setStartingDocker(false); return; }
            try {
                const r = await axios.get(`${API}/docker/challenge-session/${selectedChallenge.challenge_id}`);
                if (!cancelled && r.data?.status === 'running' && r.data?.target_ip) {
                    setDockerInstance(r.data);
                    setStartingDocker(false);
                    toast.success('Instance ready!');
                }
            } catch {}
        }, 3000);
        return () => { cancelled = true; clearInterval(iv); };
    }, [startingDocker, selectedChallenge?.challenge_id]);

    // Keep UI in sync if instance was auto-terminated externally
    useEffect(() => {
        if (!dockerInstance?.session_id || !selectedChallenge?.challenge_id || startingDocker || stoppingDocker) return;
        let cancelled = false;
        const iv = setInterval(async () => {
            try {
                const r = await axios.get(`${API}/docker/challenge-session/${selectedChallenge.challenge_id}`);
                if (cancelled) return;
                if (r.data?.status === 'running' && r.data?.session_id) {
                    setDockerInstance((prev: any) => {
                        if (!prev) return r.data;
                        if (
                            prev.session_id !== r.data.session_id ||
                            prev.target_ip !== r.data.target_ip ||
                            prev.expires_at !== r.data.expires_at
                        ) {
                            return r.data;
                        }
                        return prev;
                    });
                } else {
                    setDockerInstance(null);
                }
            } catch {
                // Keep existing UI state on transient network errors
            }
        }, 10000);
        return () => { cancelled = true; clearInterval(iv); };
    }, [
        dockerInstance?.session_id,
        selectedChallenge?.challenge_id,
        startingDocker,
        stoppingDocker
    ]);

    // Docker countdown timer
    useEffect(() => {
        if (!dockerInstance?.expires_at) return;
        const iv = setInterval(() => {
            const diff = new Date(dockerInstance.expires_at).getTime() - Date.now();
            setDockerTimer({ mins: Math.floor(Math.max(0, diff) / 60000), secs: Math.floor((Math.max(0, diff) % 60000) / 1000) });
            if (diff <= 0) {
                setDockerInstance(null);
            }
        }, 1000);
        return () => clearInterval(iv);
    }, [dockerInstance?.expires_at]);

    // Lab countdown timer
    useEffect(() => {
        if (!lab?.lab_timer_end) return;
        const iv = setInterval(() => {
            setTimeRemaining(formatTime(new Date(lab.lab_timer_end).getTime() - Date.now()));
        }, 1000);
        setTimeRemaining(formatTime(new Date(lab.lab_timer_end).getTime() - Date.now()));
        return () => clearInterval(iv);
    }, [lab?.lab_timer_end]);

    const handleSubmitFlag = async () => {
        if (!flagInput.trim() || !lab || !selectedChallenge) return;
        setSubmittingFlag(true);
        try {
            const res = await axios.post(`${API}/student/certification-exams/attempts/${lab.attempt_id}/submit`, {
                challenge_id: selectedChallenge.challenge_id,
                flag: flagInput.trim(),
            });
            if (res.data.correct) {
                toast.success(`Correct! +${res.data.points} pts`);
                setFlagInput('');
                await fetchLabDetails();
            } else {
                toast.error(res.data.message || 'Incorrect flag');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to submit');
        } finally {
            setSubmittingFlag(false);
        }
    };

    const handleStartLab = async () => {
        setStartingLab(true);
        try {
            await axios.post(`${API}/student/certification-exams/${examId}/start-lab`);
            toast.success('Lab started! Good luck!');
            await fetchLabDetails();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to start lab');
        } finally {
            setStartingLab(false);
        }
    };


    const handleSubmitTask = async (taskIdx: number) => {
        const answer = taskInputs[taskIdx]?.trim();
        if (!answer || !lab || !selectedChallenge) return;
        setSubmittingTask(taskIdx);
        try {
            const res = await axios.post(`${API}/student/certification-exams/attempts/${lab.attempt_id}/submit`, {
                challenge_id: selectedChallenge.challenge_id,
                flag: answer,
                question_index: taskIdx,
            });
            if (res.data.correct) {
                toast.success(`Correct! +${res.data.points} pts`);
                setTaskInputs(prev => ({ ...prev, [taskIdx]: '' }));
                await fetchLabDetails();
            } else {
                toast.error(res.data.message || 'Incorrect answer');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to submit');
        } finally {
            setSubmittingTask(null);
        }
    };

    const handleStartDocker = async () => {
        if (!selectedChallenge?.has_docker || startingDocker) return;
        setStartingDocker(true);
        try {
            const res = await axios.post(`${API}/docker/start/${selectedChallenge.challenge_id}`, {}, { timeout: 15000 });
            if (res.data?.status === 'running' && res.data?.target_ip) {
                setDockerInstance(res.data);
                setStartingDocker(false);
                toast.success('Instance ready!');
            }
        } catch (err: any) {
            if (err.code === 'ECONNABORTED') {
                // expected timeout — polling continues
            } else if (err.response?.status >= 400 && err.response?.status < 500) {
                setStartingDocker(false);
                toast.error(err.response?.data?.detail || 'Failed to start instance');
            }
        }
    };

    const handleStopDocker = async () => {
        if (!dockerInstance?.session_id) return;
        setStoppingDocker(true);
        try {
            const sessionCheck = await axios.get(`${API}/docker/challenge-session/${selectedChallenge?.challenge_id}`);
            if (sessionCheck.data?.status !== 'running' || !sessionCheck.data?.session_id) {
                setDockerInstance(null);
                return;
            }
            await axios.delete(`${API}/docker/stop/${dockerInstance.session_id}`);
            setDockerInstance(null);
            toast.success('Instance stopped');
        } catch (err: any) {
            if (err.response?.status === 404) setDockerInstance(null);
            else toast.error('Failed to stop instance');
        } finally {
            setStoppingDocker(false);
        }
    };

    const handleExtendDocker = async () => {
        if (!dockerInstance?.session_id) return;
        try {
            const res = await axios.post(`${API}/docker/extend/${dockerInstance.session_id}`);
            if (res.data.expires_at) {
                setDockerInstance((prev: any) => ({ ...prev, expires_at: res.data.expires_at }));
                toast.success('Extended by 30 minutes');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Extension failed');
        }
    };

    const handleEndLab = async () => {
        if (!lab || endingLab) return;
        if (!confirm('End lab early? Your current score will be finalised.')) return;
        setEndingLab(true);
        try {
            const res = await axios.post(`${API}/student/certification-exams/attempts/${lab.attempt_id}/end-lab`);
            toast.success(`Lab ended. Final score: ${res.data.lab_score}%`);
            navigate(`/student/certification-exams/${examId}/status`);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to end lab');
        } finally {
            setEndingLab(false);
        }
    };

    // ─── Loading ────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // ─── Not started yet ────────────────────────────────────────────────────
    if (!lab) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <button onClick={() => navigate('/student/certification-exams')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Flag className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">Ready to Start Lab?</h1>
                    <p className="text-gray-500 mb-2">You will receive 7 randomly selected challenges from your assigned pool.</p>
                    <p className="text-gray-500 mb-8">You have 12 hours to complete as many as possible.</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
                        <strong>Important:</strong> Once started, the lab timer cannot be paused or reset.
                    </div>
                    <button onClick={handleStartLab} disabled={startingLab}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-lg disabled:opacity-50">
                        {startingLab ? <><Loader2 className="w-5 h-5 animate-spin" /> Starting...</> : <><Flag className="w-5 h-5" /> Start Lab</>}
                    </button>
                </div>
            </div>
        );
    }

    const isExpired = new Date(lab.lab_timer_end) <= new Date();
    const solvedCount = lab.challenges.filter(c => c.is_solved).length;
    const challenge = selectedChallenge;
    const challengeArtifacts = artifacts[challenge?.challenge_id ?? ''] ?? [];
    const hasFlag = challenge && challenge.tasks.length === 0; // Main flag only (no sub-tasks)
    const hasTasks = (challenge?.tasks.length ?? 0) > 0;

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
            {/* ── Top Bar ─────────────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/student/certification-exams')}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="h-4 w-px bg-gray-200" />
                    <h1 className="text-gray-900 font-bold text-sm">{lab.exam_title}</h1>
                </div>
                <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold">{lab.earned_points}</span>
                        <span className="text-gray-400">/ {lab.total_points} pts</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold">{solvedCount}</span>
                        <span className="text-gray-400">/ {lab.challenges.length}</span>
                    </div>
                    <div className={`flex items-center gap-2 font-mono font-bold ${isExpired ? 'text-red-500' : timeRemaining.startsWith('0h') ? 'text-amber-500' : 'text-emerald-600'}`}>
                        <Clock className="w-4 h-4" />
                        {timeRemaining || '...'}
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1">
                        <span className="text-blue-700 font-bold text-xs">LAB SCORE: {lab.lab_score}%</span>
                    </div>
                    {!isExpired && (
                        <button onClick={handleEndLab} disabled={endingLab}
                            className="flex items-center gap-2 px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                            {endingLab ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                            End Lab
                        </button>
                    )}
                </div>
            </div>

            {/* Expired / report banner */}
            {(isExpired || lab.can_upload_report) && (
                <div className={`shrink-0 px-6 py-2.5 flex items-center gap-3 text-sm ${lab.can_upload_report ? 'bg-emerald-50 border-b border-emerald-200 text-emerald-800' : 'bg-red-50 border-b border-red-200 text-red-800'}`}>
                    {lab.can_upload_report ? (
                        <>
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>🎉 Report upload unlocked — you've reached 80%+ lab score!</span>
                            <button onClick={() => navigate(`/student/certification-exams/${examId}/report`)}
                                className="ml-auto px-4 py-1 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700">
                                Upload Report
                            </button>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Lab timer expired. You can no longer submit flags.</span>
                        </>
                    )}
                </div>
            )}

            {/* ── Main Split Layout ────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">
                {/* LHS: Challenge List */}
                <div className="w-72 shrink-0 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Challenges</p>
                    </div>
                    {lab.challenges.map((ch, idx) => {
                        const active = idx === selectedIdx;
                        const allTasksSolved = ch.tasks.length === 0 || ch.tasks_solved.length === ch.tasks.length;
                        const partial = !ch.is_solved && (ch.tasks_solved.length > 0);
                        return (
                            <button key={ch.challenge_id} onClick={() => setSelectedIdx(idx)}
                                className={`w-full text-left px-4 py-4 border-b border-gray-50 transition-colors flex items-start gap-3
                                    ${active ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'}`}>
                                <div className={`mt-0.5 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
                                    ${ch.is_solved ? 'bg-emerald-100 text-emerald-700' : partial ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {ch.is_solved ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate ${ch.is_solved ? 'text-emerald-700' : 'text-gray-900'}`}>
                                        {ch.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DIFFICULTY_COLORS[ch.difficulty] || DIFFICULTY_COLORS.MEDIUM}`}>
                                            {ch.difficulty}
                                        </span>
                                        <span className="text-[11px] text-gray-400">{ch.total_points} pts</span>
                                        {ch.has_docker && <Terminal className="w-3 h-3 text-gray-400" />}
                                        {ch.tasks.length > 0 && (
                                            <span className="text-[10px] text-gray-400">{ch.tasks_solved.length}/{ch.tasks.length} tasks</span>
                                        )}
                                    </div>
                                </div>
                                {active && <ChevronRight className="w-4 h-4 text-blue-400 mt-1 shrink-0" />}
                            </button>
                        );
                    })}
                </div>

                {/* RHS: Challenge Detail */}
                {challenge ? (
                    <div className="flex-1 overflow-y-auto bg-gray-50">
                        <div className="max-w-4xl mx-auto p-6 space-y-6">

                            {/* Header */}
                            <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden
                                ${challenge.is_solved ? 'border-emerald-200' : 'border-gray-200'}`}>
                                {challenge.is_solved && (
                                    <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2.5 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span className="text-emerald-800 font-bold text-sm tracking-wide">Challenge Complete</span>
                                        <span className="ml-auto text-emerald-600 font-mono font-bold text-sm">+{challenge.total_points} PTS</span>
                                    </div>
                                )}
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">{challenge.title}</h2>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span className={`font-bold px-2 py-0.5 rounded border text-xs ${DIFFICULTY_COLORS[challenge.difficulty] || DIFFICULTY_COLORS.MEDIUM}`}>
                                                    {challenge.difficulty}
                                                </span>
                                                <span>{challenge.category}</span>
                                                <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-amber-500" />{challenge.total_points} pts</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{challenge.description}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Docker Lab */}
                            {challenge.has_docker && (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 flex items-center gap-3">
                                        <Terminal className="w-5 h-5 text-white" />
                                        <div>
                                            <h3 className="text-white font-bold">Challenge Lab</h3>
                                            <p className="text-gray-400 text-xs">Interactive environment</p>
                                        </div>
                                        {dockerInstance && (
                                            <div className="ml-auto flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                <span className="text-gray-300 text-xs">Running</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6">
                                        {!dockerInstance ? (
                                            <div className="space-y-4">
                                                <p className="text-gray-600 text-sm">
                                                    {startingDocker
                                                        ? 'Preparing your lab environment — this may take a minute...'
                                                        : 'Start a private instance to access the challenge environment.'}
                                                </p>
                                                <p className="text-gray-400 text-xs italic">
                                                    Note: This instance is accessible only via VPN.{' '}
                                                    <a href="/access" className="underline font-medium">Download config here</a>.
                                                </p>
                                                <button onClick={handleStartDocker} disabled={startingDocker}
                                                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold disabled:bg-gray-300 transition-colors">
                                                    {startingDocker ? <><RefreshCw className="w-4 h-4 animate-spin" /> Initializing...</> : <><Terminal className="w-4 h-4" /> Start Instance</>}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs uppercase text-gray-400 mb-1 font-medium">Target IP</p>
                                                        {dockerInstance.target_ip ? (
                                                            <p className="font-mono font-bold text-gray-900 text-lg cursor-pointer hover:text-blue-600"
                                                                onClick={() => { navigator.clipboard.writeText(dockerInstance.target_ip); toast.success('IP copied!'); }}>
                                                                {dockerInstance.target_ip}
                                                            </p>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-amber-600 animate-pulse">
                                                                <RefreshCw className="w-3 h-3 animate-spin" /><span className="text-sm">Pending...</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs uppercase text-gray-400 mb-1 font-medium">Timer</p>
                                                        <p className={`font-mono font-bold text-lg ${dockerTimer.mins < 20 ? 'text-amber-600' : 'text-gray-700'}`}>
                                                            {dockerTimer.mins}m {dockerTimer.secs}s
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={handleStopDocker} disabled={stoppingDocker}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold disabled:opacity-50">
                                                        {stoppingDocker ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />} Stop
                                                    </button>
                                                    <button onClick={handleExtendDocker}
                                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold
                                                            ${dockerTimer.mins < 20 ? 'border-amber-300 text-amber-600 hover:bg-amber-50 animate-pulse' : 'border-blue-200 text-blue-600 hover:bg-blue-50'}`}>
                                                        <Clock className="w-4 h-4" /> +30 min
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Artifacts */}
                            {challengeArtifacts.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                                        <Paperclip className="w-4 h-4 text-indigo-500" />
                                        <h3 className="font-bold text-gray-900">Challenge Files</h3>
                                        <span className="ml-auto text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-2 py-0.5 font-medium">
                                            {challengeArtifacts.length} files
                                        </span>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {challengeArtifacts.map(art => (
                                            <div key={art.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-white transition-all group">
                                                <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center group-hover:border-indigo-100 group-hover:bg-indigo-50 transition-all">
                                                    <FileText className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{art.filename}</p>
                                                    <p className="text-xs text-gray-400">{(art.file_size / 1024).toFixed(1)} KB · {art.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                                                </div>
                                                <a href={`${API}/artifacts/download/${art.id}`} target="_blank" rel="noreferrer"
                                                    className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all">
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tasks */}
                            {hasTasks && (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4 text-blue-500" />
                                        <h3 className="font-bold text-gray-900">Tasks</h3>
                                        <span className="ml-auto text-xs text-gray-400">
                                            {challenge.tasks_solved.length}/{challenge.tasks.length} completed
                                        </span>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {challenge.tasks.map((task, ti) => {
                                            const solved = challenge.tasks_solved.includes(ti);
                                            return (
                                                <div key={ti} className={`p-6 ${solved ? 'bg-emerald-50/40' : ''}`}>
                                                    <div className="flex items-start gap-4 mb-4">
                                                        <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5
                                                            ${solved ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {solved ? <CheckCircle2 className="w-4 h-4" /> : ti + 1}
                                                        </div>
                                                        <div className="flex-1 pt-0.5">
                                                            <p className={`font-semibold ${solved ? 'text-emerald-800' : 'text-gray-900'}`}>{task.question}</p>
                                                            <p className="text-xs text-gray-400 mt-0.5 font-mono">{task.points} pts</p>
                                                        </div>
                                                    </div>
                                                    {!solved && (
                                                        <div className="flex gap-2 pl-11">
                                                            <input
                                                                type="text"
                                                                value={taskInputs[ti] || ''}
                                                                onChange={e => !isExpired && setTaskInputs(prev => ({ ...prev, [ti]: e.target.value }))}
                                                                onKeyDown={e => !isExpired && e.key === 'Enter' && handleSubmitTask(ti)}
                                                                placeholder={isExpired ? 'Lab expired' : 'Enter answer...'}
                                                                readOnly={isExpired}
                                                                className={`flex-1 px-4 py-2 border rounded-xl text-sm outline-none ${
                                                                    isExpired ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' :
                                                                    'border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white'
                                                                }`}
                                                            />
                                                            {!isExpired && (
                                                                <button
                                                                    onClick={() => handleSubmitTask(ti)}
                                                                    disabled={submittingTask === ti || !taskInputs[ti]?.trim()}
                                                                    className="flex items-center gap-2 px-5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-semibold disabled:bg-gray-300 transition-colors">
                                                                    {submittingTask === ti ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                                    Submit
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {solved && (
                                                        <div className="pl-11">
                                                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Solved
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Main Flag Input — for challenges with a flag but NO tasks */}
                            {hasFlag && !challenge.is_solved && (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                                        <Flag className="w-4 h-4 text-blue-500" />
                                        <h3 className="font-bold text-gray-900">Submit Flag</h3>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={flagInput}
                                                onChange={e => !isExpired && setFlagInput(e.target.value)}
                                                onKeyDown={e => !isExpired && e.key === 'Enter' && handleSubmitFlag()}
                                                placeholder={isExpired ? 'Lab expired' : 'CTF{...}'}
                                                readOnly={isExpired}
                                                className={`flex-1 px-4 py-3 border rounded-xl text-sm outline-none font-mono ${
                                                    isExpired ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' :
                                                    'border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white'
                                                }`}
                                            />
                                            {!isExpired && (
                                                <button
                                                    onClick={handleSubmitFlag}
                                                    disabled={submittingFlag || !flagInput.trim()}
                                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:bg-gray-300 transition-colors">
                                                    {submittingFlag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    Submit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {challenge.is_solved && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                                    <p className="text-emerald-800 font-bold text-lg">Challenge Solved!</p>
                                    <p className="text-emerald-600 text-sm mt-1">Pick the next challenge from the left panel.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <p>Select a challenge from the left</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentCertificationLab;
