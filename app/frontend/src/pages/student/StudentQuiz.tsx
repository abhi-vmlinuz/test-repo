import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Clock, CheckCircle2, XCircle, AlertTriangle,
    ChevronLeft, ChevronRight, Send, Timer, Award, RotateCcw
} from 'lucide-react';

const StudentQuiz = ({ user }) => {
    const { moduleId, quizId } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Quiz taking state
    const [isTaking, setIsTaking] = useState(false);
    const [attemptId, setAttemptId] = useState(null);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeRemaining, setTimeRemaining] = useState(0);
    const timerRef = useRef(null);

    // Results state
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState(null);

    useEffect(() => {
        fetchQuiz();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [moduleId]);

    const fetchQuiz = async () => {
        try {
            const endpoint = quizId
                ? `${API}/student/courses/${moduleId}/final-quiz`
                : `${API}/student/modules/${moduleId}/quiz`;
            const response = await axios.get(endpoint);
            setQuiz(response.data.quiz);
            setQuestions(response.data.questions || []);
            setAttempts(response.data.attempts || []);
        } catch (error) {
            toast.error('Failed to load quiz');
        } finally {
            setLoading(false);
        }
    };

    const startQuiz = async () => {
        try {
            const response = await axios.post(`${API}/student/quizzes/${quiz.id}/start`);
            setAttemptId(response.data.attempt_id);
            setIsTaking(true);
            setCurrentIdx(0);
            setAnswers({});
            setTimeRemaining(quiz.time_limit);
            setShowResults(false);
            setResults(null);

            // Start countdown timer
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleAutoSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (error) {
            if (error.response?.status === 429) {
                toast.error(error.response.data.detail || 'Cooldown active. Please wait.');
            } else {
                toast.error('Failed to start quiz');
            }
        }
    };

    const handleAutoSubmit = useCallback(async () => {
        toast.warning('Time is up! Submitting your answers...');
        await submitQuiz();
    }, []);

    const selectAnswer = (questionId, answer) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const submitQuiz = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        try {
            const response = await axios.post(`${API}/student/quizzes/${quiz.id}/submit`, {
                attempt_id: attemptId,
                answers,
            });
            setResults(response.data);
            setShowResults(true);
            setIsTaking(false);
            fetchQuiz(); // Refresh attempts
        } catch (error) {
            toast.error('Failed to submit quiz');
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-64" />
                    <div className="h-48 bg-gray-200 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="p-8">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="text-center py-20">
                    <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">No Quiz Available</h2>
                    <p className="text-gray-500">This module doesn't have a quiz yet.</p>
                </div>
            </div>
        );
    }

    // Results view
    if (showResults && results) {
        return (
            <div className="p-8 max-w-3xl mx-auto">
                <div className={`rounded-3xl p-8 mb-8 ${results.passed ? 'bg-gradient-to-r from-green-600 to-emerald-700' : 'bg-gradient-to-r from-gray-700 to-gray-900'}`}>
                    <div className="text-center text-white">
                        {results.passed ? (
                            <Award className="w-16 h-16 mx-auto mb-4" />
                        ) : (
                            <XCircle className="w-16 h-16 mx-auto mb-4 opacity-80" />
                        )}
                        <h1 className="text-3xl font-bold mb-2">
                            {results.passed ? 'Congratulations!' : 'Not Quite There'}
                        </h1>
                        <p className="text-white/80 mb-6">
                            {results.passed
                                ? 'You passed the quiz!'
                                : `You need ${quiz.passing_percentage}% to pass. Try again!`}
                        </p>
                        <div className="flex items-center justify-center gap-8">
                            <div>
                                <div className="text-4xl font-bold">{results.percentage}%</div>
                                <div className="text-sm text-white/70">Score</div>
                            </div>
                            <div className="w-px h-12 bg-white/30" />
                            <div>
                                <div className="text-4xl font-bold">{results.correct_count}/{results.total_questions}</div>
                                <div className="text-sm text-white/70">Correct</div>
                            </div>
                            <div className="w-px h-12 bg-white/30" />
                            <div>
                                <div className="text-4xl font-bold">{formatTime(results.time_spent)}</div>
                                <div className="text-sm text-white/70">Time</div>
                            </div>
                        </div>
                    </div>
                </div>

                {results.cooldown_until && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                        <Timer className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-amber-800">Cooldown Active</p>
                            <p className="text-xs text-amber-600">
                                You've used 3 attempts. You can retry after {new Date(results.cooldown_until).toLocaleString()}.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Back to Module
                    </button>
                    {!results.passed && !results.cooldown_until && (
                        <button
                            onClick={startQuiz}
                            className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" /> Retry Quiz
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Quiz taking view
    if (isTaking && questions.length > 0) {
        const currentQ = questions[currentIdx];
        const isAnswered = !!answers[currentQ.id];
        const answeredCount = Object.keys(answers).length;
        const progressPercent = (answeredCount / questions.length) * 100;
        const isTimeLow = timeRemaining < 120;

        return (
            <div className="min-h-screen bg-gray-50">
                {/* Timer Bar */}
                <div className={`fixed top-0 left-0 right-0 z-50 px-6 py-3 flex items-center justify-between ${isTimeLow ? 'bg-red-600' : 'bg-gray-900'} text-white`}>
                    <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono font-bold text-lg">{formatTime(timeRemaining)}</span>
                    </div>
                    <div className="text-sm font-medium">{quiz.title}</div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">{answeredCount}/{questions.length} answered</span>
                    </div>
                </div>

                <div className="pt-16 pb-8 px-8 max-w-4xl mx-auto">
                    {/* Progress */}
                    <div className="mb-8">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-800 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                                Question {currentIdx + 1} of {questions.length}
                            </span>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${currentQ.question_type === 'true_false' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                {currentQ.question_type === 'true_false' ? 'True/False' : 'Multiple Choice'}
                            </span>
                        </div>

                        <h2 className="text-xl font-semibold text-gray-900 mb-8">
                            {currentQ.question_text}
                        </h2>

                        <div className="space-y-3">
                            {(currentQ.question_type === 'true_false'
                                ? [{ label: 'True', text: 'True' }, { label: 'False', text: 'False' }]
                                : currentQ.options
                            ).map((option) => {
                                const isSelected = answers[currentQ.id] === option.label;
                                return (
                                    <button
                                        key={option.label}
                                        onClick={() => selectAnswer(currentQ.id, option.label)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected
                                            ? 'border-gray-900 bg-gray-50'
                                            : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isSelected
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {option.label}
                                            </div>
                                            <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                                                {option.text}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                            disabled={currentIdx === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" /> Previous
                        </button>

                        {/* Question dots */}
                        <div className="flex gap-1.5 flex-wrap justify-center max-w-md">
                            {questions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentIdx(idx)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${idx === currentIdx
                                        ? 'bg-gray-900 text-white'
                                        : answers[q.id]
                                            ? 'bg-green-100 text-green-700 border border-green-200'
                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                        }`}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>

                        {currentIdx < questions.length - 1 ? (
                            <button
                                onClick={() => setCurrentIdx(currentIdx + 1)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    if (answeredCount < questions.length) {
                                        if (!confirm(`You have ${questions.length - answeredCount} unanswered questions. Submit anyway?`)) return;
                                    }
                                    submitQuiz();
                                }}
                                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
                            >
                                <Send className="w-4 h-4" /> Submit
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Quiz landing view (before starting)
    const bestAttempt = attempts.reduce((best, a) => (!best || a.percentage > best.percentage) ? a : best, null);

    return (
        <div className="p-8">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-r from-gray-700 to-gray-900 rounded-3xl p-8 mb-8 text-white">
                    <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
                    {quiz.description && <p className="text-white/80 mb-6">{quiz.description}</p>}

                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="bg-white/10 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold">{quiz.total_questions}</div>
                            <div className="text-xs text-white/70 mt-1">Questions</div>
                        </div>
                        <div className="bg-white/10 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold">{Math.floor(quiz.time_limit / 60)} min</div>
                            <div className="text-xs text-white/70 mt-1">Time Limit</div>
                        </div>
                        <div className="bg-white/10 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold">{quiz.passing_percentage}%</div>
                            <div className="text-xs text-white/70 mt-1">To Pass</div>
                        </div>
                    </div>
                </div>

                {/* Previous Attempts */}
                {attempts.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Previous Attempts</h3>
                        <div className="space-y-2">
                            {attempts.map((a) => (
                                <div key={a.attempt_number} className={`flex items-center justify-between p-4 rounded-xl border ${a.passed ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
                                    <div className="flex items-center gap-3">
                                        {a.passed ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-gray-400" />
                                        )}
                                        <span className="font-medium text-gray-700">Attempt {a.attempt_number}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-bold ${a.passed ? 'text-green-700' : 'text-gray-500'}`}>
                                            {a.percentage}%
                                        </span>
                                        <span className="text-sm text-gray-400">
                                            {a.time_spent ? formatTime(a.time_spent) : '-'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Start Button */}
                {bestAttempt?.passed ? (
                    <div className="text-center py-8">
                        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Quiz Completed!</h3>
                        <p className="text-gray-500">Best score: {bestAttempt.percentage}%</p>
                    </div>
                ) : (
                    <button
                        onClick={startQuiz}
                        className="w-full py-4 rounded-xl bg-gray-900 text-white text-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-3"
                    >
                        <Clock className="w-5 h-5" />
                        {attempts.length > 0 ? 'Retry Quiz' : 'Start Quiz'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default StudentQuiz;
