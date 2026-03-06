import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import {
    HelpCircle, Plus, Edit, Trash2, Save, X, ChevronDown, ChevronRight,
    CheckCircle2, Circle, Eye, EyeOff, Clock, Award, ArrowLeft
} from 'lucide-react';

const AdminQuizManagement = ({ user }) => {
    const [lmsCourses, setLmsCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Quiz form
    const [quizForm, setQuizForm] = useState({
        title: 'Module Quiz',
        description: '',
        time_limit: 3600,
        passing_percentage: 80,
        is_published: false
    });

    // Question form
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [questionForm, setQuestionForm] = useState({
        question_type: 'multiple_choice',
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: '',
        explanation: ''
    });

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await axios.get(`${API}/admin/lms-courses`);
            setLmsCourses(res.data);
        } catch (err) {
            console.error('Failed to load courses:', err);
        } finally {
            setLoading(false);
        }
    };

    const selectCourse = async (course) => {
        setSelectedCourse(course);
        setSelectedModule(null);
        setQuiz(null);
        setQuestions([]);
        try {
            const res = await axios.get(`${API}/admin/lms-modules/${course.id}`);
            setModules(res.data);
        } catch (err) {
            toast.error('Failed to load modules');
        }
    };

    const selectModule = async (mod) => {
        setSelectedModule(mod);
        setShowQuestionForm(false);
        setEditingQuestion(null);
        try {
            const res = await axios.get(`${API}/admin/modules/${mod.id}/quiz`);
            if (res.data.quiz) {
                setQuiz(res.data.quiz);
                setQuestions(res.data.questions);
                setQuizForm({
                    title: res.data.quiz.title || 'Module Quiz',
                    description: res.data.quiz.description || '',
                    time_limit: res.data.quiz.time_limit || 3600,
                    passing_percentage: res.data.quiz.passing_percentage || 80,
                    is_published: res.data.quiz.is_published || false
                });
            } else {
                setQuiz(null);
                setQuestions([]);
                setQuizForm({
                    title: 'Module Quiz',
                    description: '',
                    time_limit: 3600,
                    passing_percentage: 80,
                    is_published: false
                });
            }
        } catch (err) {
            toast.error('Failed to load quiz');
        }
    };

    const handleSaveQuiz = async () => {
        if (!selectedModule) return;
        try {
            const res = await axios.post(`${API}/admin/modules/${selectedModule.id}/quiz`, quizForm);
            toast.success(res.data.updated ? 'Quiz updated' : 'Quiz created');
            await selectModule(selectedModule);
            // Refresh modules
            const modsRes = await axios.get(`${API}/admin/lms-modules/${selectedCourse.id}`);
            setModules(modsRes.data);
        } catch (err) {
            toast.error('Failed to save quiz');
        }
    };

    const handleTogglePublish = async () => {
        if (!quiz) return;
        try {
            await axios.patch(`${API}/admin/quizzes/${quiz.id}/publish`);
            toast.success(quiz.is_published ? 'Quiz unpublished' : 'Quiz published');
            await selectModule(selectedModule);
            const modsRes = await axios.get(`${API}/admin/lms-modules/${selectedCourse.id}`);
            setModules(modsRes.data);
        } catch (err) {
            toast.error('Failed to toggle publish');
        }
    };

    const resetQuestionForm = () => {
        setQuestionForm({
            question_type: 'multiple_choice',
            question_text: '',
            options: ['', '', '', ''],
            correct_answer: '',
            explanation: ''
        });
        setEditingQuestion(null);
    };

    const handleSaveQuestion = async () => {
        if (!quiz) return;
        if (!questionForm.question_text.trim()) {
            toast.error('Question text is required');
            return;
        }
        if (!questionForm.correct_answer.trim()) {
            toast.error('Correct answer is required');
            return;
        }

        const payload = {
            ...questionForm,
            options: questionForm.question_type === 'true_false'
                ? ['True', 'False']
                : questionForm.options.filter(o => o.trim() !== '')
        };

        try {
            if (editingQuestion) {
                await axios.put(`${API}/admin/quizzes/${quiz.id}/questions/${editingQuestion.id}`, payload);
                toast.success('Question updated');
            } else {
                await axios.post(`${API}/admin/quizzes/${quiz.id}/questions`, payload);
                toast.success('Question added');
            }
            setShowQuestionForm(false);
            resetQuestionForm();
            await selectModule(selectedModule);
        } catch (err) {
            toast.error('Failed to save question');
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (!confirm('Delete this question?')) return;
        try {
            await axios.delete(`${API}/admin/quizzes/${quiz.id}/questions/${questionId}`);
            toast.success('Question deleted');
            await selectModule(selectedModule);
        } catch (err) {
            toast.error('Failed to delete question');
        }
    };

    const editQuestion = (q) => {
        setEditingQuestion(q);
        setQuestionForm({
            question_type: q.question_type,
            question_text: q.question_text,
            options: q.question_type === 'true_false'
                ? ['True', 'False']
                : [...(Array.isArray(q.options) ? q.options : []), '', '', '', ''].slice(0, 4),
            correct_answer: q.correct_answer,
            explanation: q.explanation || ''
        });
        setShowQuestionForm(true);
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
                </div>
            </div>
        );
    }

    // Course selection view
    if (!selectedCourse) {
        return (
            <div>
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Select a Course</h2>
                    <p className="text-sm text-gray-500 mt-1">Choose an LMS course to manage its module quizzes</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lmsCourses.map(course => (
                        <button
                            key={course.id}
                            onClick={() => selectCourse(course)}
                            className="text-left p-5 bg-white rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                                    <HelpCircle className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{course.title}</p>
                                    <p className="text-xs text-gray-400">{course.courseCode || '—'}</p>
                                </div>
                            </div>
                            {course.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 mt-2">{course.description}</p>
                            )}
                        </button>
                    ))}
                    {lmsCourses.length === 0 && (
                        <div className="col-span-2 text-center py-12 text-gray-400">
                            No LMS courses available
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Module list + quiz editor view
    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
                <button
                    onClick={() => { setSelectedCourse(null); setSelectedModule(null); setModules([]); }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Courses
                </button>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <span className="text-sm font-medium text-gray-900">{selectedCourse.title}</span>
                {selectedModule && (
                    <>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                        <span className="text-sm font-medium text-gray-700">{selectedModule.title}</span>
                    </>
                )}
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left: Module list */}
                <div className="col-span-4">
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900 text-sm">Modules</h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {modules.map((mod) => (
                                <button
                                    key={mod.id}
                                    onClick={() => selectModule(mod)}
                                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedModule?.id === mod.id ? 'bg-gray-50 border-l-2 border-gray-900' : ''
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                                                {mod.orderIndex + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 text-sm truncate">{mod.title}</p>
                                                <p className="text-xs text-gray-400">
                                                    {mod.quiz_id ? (
                                                        <span className="flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                            {mod.question_count} questions
                                                            {mod.quiz_published ? '' : ' · Draft'}
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1">
                                                            <Circle className="w-3 h-3 text-gray-300" />
                                                            No quiz
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                    </div>
                                </button>
                            ))}
                            {modules.length === 0 && (
                                <div className="p-6 text-center text-gray-400 text-sm">
                                    No modules in this course
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Quiz editor */}
                <div className="col-span-8">
                    {!selectedModule ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                            <HelpCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-500">Select a module to manage its quiz</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Quiz Settings */}
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Quiz Settings</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {quiz ? `Quiz ID: ${quiz.id}` : 'No quiz created yet'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {quiz && (
                                            <button
                                                onClick={handleTogglePublish}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${quiz.is_published
                                                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {quiz.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                {quiz.is_published ? 'Published' : 'Draft'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-5 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                                            <input
                                                type="text"
                                                value={quizForm.title}
                                                onChange={(e) => setQuizForm(p => ({ ...p, title: e.target.value }))}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                                placeholder="Module Quiz"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                            <input
                                                type="text"
                                                value={quizForm.description}
                                                onChange={(e) => setQuizForm(p => ({ ...p, description: e.target.value }))}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                                placeholder="Optional description..."
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                <Clock className="w-3.5 h-3.5 inline mr-1" /> Time Limit (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                value={Math.floor(quizForm.time_limit / 60)}
                                                onChange={(e) => setQuizForm(p => ({ ...p, time_limit: parseInt(e.target.value || '60') * 60 }))}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                <Award className="w-3.5 h-3.5 inline mr-1" /> Passing % (min: 50)
                                            </label>
                                            <input
                                                type="number"
                                                min={50}
                                                max={100}
                                                value={quizForm.passing_percentage}
                                                onChange={(e) => setQuizForm(p => ({ ...p, passing_percentage: parseInt(e.target.value || '80') }))}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSaveQuiz}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                                    >
                                        <Save className="w-4 h-4" />
                                        {quiz ? 'Update Quiz' : 'Create Quiz'}
                                    </button>
                                </div>
                            </div>

                            {/* Questions */}
                            {quiz && (
                                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900">
                                            Questions ({questions.length})
                                        </h3>
                                        <button
                                            onClick={() => { resetQuestionForm(); setShowQuestionForm(true); }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add Question
                                        </button>
                                    </div>

                                    {/* Question List */}
                                    <div className="divide-y divide-gray-50">
                                        {questions.map((q, idx) => (
                                            <div key={q.id} className="p-4 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <span className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 mt-0.5">
                                                            {idx + 1}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900">{q.question_text}</p>
                                                            <div className="flex items-center gap-3 mt-1.5">
                                                                <span className={`text-xs px-2 py-0.5 rounded-full ${q.question_type === 'true_false'
                                                                        ? 'bg-blue-50 text-blue-600'
                                                                        : 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                    {q.question_type === 'true_false' ? 'True/False' : 'Multiple Choice'}
                                                                </span>
                                                                <span className="text-xs text-green-600 flex items-center gap-1">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    {q.correct_answer}
                                                                </span>
                                                            </div>
                                                            {q.question_type === 'multiple_choice' && Array.isArray(q.options) && (
                                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                                    {q.options.map((opt, i) => (
                                                                        <span
                                                                            key={i}
                                                                            className={`text-xs px-2 py-1 rounded-lg ${opt === q.correct_answer
                                                                                    ? 'bg-green-50 text-green-700 font-medium'
                                                                                    : 'bg-gray-50 text-gray-600'
                                                                                }`}
                                                                        >
                                                                            {opt}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <button
                                                            onClick={() => editQuestion(q)}
                                                            className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteQuestion(q.id)}
                                                            className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {questions.length === 0 && (
                                            <div className="p-8 text-center text-gray-400 text-sm">
                                                No questions yet. Click "Add Question" to get started.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Question Form Modal */}
                            {showQuestionForm && quiz && (
                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
                                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
                                        <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900">
                                                {editingQuestion ? 'Edit Question' : 'Add Question'}
                                            </h3>
                                            <button
                                                onClick={() => { setShowQuestionForm(false); resetQuestionForm(); }}
                                                className="p-2 hover:bg-gray-100 rounded-lg"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="p-5 space-y-4">
                                            {/* Question Type */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => setQuestionForm(p => ({ ...p, question_type: 'multiple_choice', options: ['', '', '', ''], correct_answer: '' }))}
                                                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${questionForm.question_type === 'multiple_choice'
                                                                ? 'border-gray-900 bg-gray-900 text-white'
                                                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        Multiple Choice
                                                    </button>
                                                    <button
                                                        onClick={() => setQuestionForm(p => ({ ...p, question_type: 'true_false', options: ['True', 'False'], correct_answer: '' }))}
                                                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${questionForm.question_type === 'true_false'
                                                                ? 'border-gray-900 bg-gray-900 text-white'
                                                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        True / False
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Question Text */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Question *</label>
                                                <textarea
                                                    value={questionForm.question_text}
                                                    onChange={(e) => setQuestionForm(p => ({ ...p, question_text: e.target.value }))}
                                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm h-24 resize-none"
                                                    placeholder="Enter your question..."
                                                />
                                            </div>

                                            {/* Options (MCQ only) */}
                                            {questionForm.question_type === 'multiple_choice' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Options</label>
                                                    <div className="space-y-2">
                                                        {questionForm.options.map((opt, idx) => (
                                                            <div key={idx} className="flex items-center gap-2">
                                                                <span className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center text-xs font-bold text-gray-500">
                                                                    {String.fromCharCode(65 + idx)}
                                                                </span>
                                                                <input
                                                                    type="text"
                                                                    value={opt}
                                                                    onChange={(e) => {
                                                                        const newOpts = [...questionForm.options];
                                                                        newOpts[idx] = e.target.value;
                                                                        setQuestionForm(p => ({ ...p, options: newOpts }));
                                                                    }}
                                                                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                                                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Correct Answer */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Correct Answer *</label>
                                                {questionForm.question_type === 'true_false' ? (
                                                    <div className="flex gap-3">
                                                        {['True', 'False'].map(val => (
                                                            <button
                                                                key={val}
                                                                onClick={() => setQuestionForm(p => ({ ...p, correct_answer: val }))}
                                                                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${questionForm.correct_answer === val
                                                                        ? 'border-green-500 bg-green-50 text-green-700'
                                                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                                                    }`}
                                                            >
                                                                {val}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={questionForm.correct_answer}
                                                        onChange={(e) => setQuestionForm(p => ({ ...p, correct_answer: e.target.value }))}
                                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                                    >
                                                        <option value="">Select correct answer...</option>
                                                        {questionForm.options.filter(o => o.trim()).map((opt, idx) => (
                                                            <option key={idx} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>

                                            {/* Explanation */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Explanation (shown after submit)</label>
                                                <textarea
                                                    value={questionForm.explanation}
                                                    onChange={(e) => setQuestionForm(p => ({ ...p, explanation: e.target.value }))}
                                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm h-20 resize-none"
                                                    placeholder="Optional: Explain why this answer is correct..."
                                                />
                                            </div>
                                        </div>

                                        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-5 flex justify-end gap-3">
                                            <button
                                                onClick={() => { setShowQuestionForm(false); resetQuestionForm(); }}
                                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveQuestion}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                                            >
                                                <Save className="w-4 h-4" />
                                                {editingQuestion ? 'Update' : 'Add'} Question
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminQuizManagement;
