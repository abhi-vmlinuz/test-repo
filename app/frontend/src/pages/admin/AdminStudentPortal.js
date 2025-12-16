import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import {
    GraduationCap, Plus, Edit, Trash2, BookOpen, Users, Key, X, Save, Clock,
    ChevronDown, ChevronRight, UserPlus, Copy, UserMinus, Link
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const AdminStudentPortal = ({ user: currentAdmin }) => {
    const [activeTab, setActiveTab] = useState('courses');
    const [courses, setCourses] = useState([]);
    const [modules, setModules] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [enrollmentCodes, setEnrollmentCodes] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [lmsCourses, setLmsCourses] = useState([]);  // LMS courses from main database
    const [loading, setLoading] = useState(true);

    // Modals
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [showModuleModal, setShowModuleModal] = useState(false);
    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [showEnrollModal, setShowEnrollModal] = useState(false);

    // Course creation step (1 = select LMS course, 2 = CTF details)
    const [courseStep, setCourseStep] = useState(1);

    // Selected items
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedModule, setSelectedModule] = useState(null);
    const [expandedCourse, setExpandedCourse] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);

    // Form data
    const [courseForm, setCourseForm] = useState({ lms_course_id: '', code: '', name: '', description: '', duration: '40+ hours', color: 'gray' });
    const [moduleForm, setModuleForm] = useState({ name: '', description: '', order: 1, has_capstone: true });
    const [challengeForm, setChallengeForm] = useState({
        title: '', short_description: '', context: '', topic_number: 1, topic_name: '',
        is_capstone: false, docker_image: '', points: 100, order: 0,
        flags: [{ flag: '', points: 50, description: 'Flag 1' }, { flag: '', points: 50, description: 'Flag 2' }],
        hints: []
    });
    const [enrollForm, setEnrollForm] = useState({ user_id: '', course_id: '', expires_days: 2 });
    const [generatedCode, setGeneratedCode] = useState(null);
    const [editingChallenge, setEditingChallenge] = useState(null);

    // Available colors for courses
    const courseColors = [
        { id: 'gray', name: 'Gray', class: 'bg-gray-700' },
        { id: 'blue', name: 'Blue', class: 'bg-blue-600' },
        { id: 'purple', name: 'Purple', class: 'bg-purple-600' },
        { id: 'green', name: 'Green', class: 'bg-green-600' },
        { id: 'red', name: 'Red', class: 'bg-red-600' },
        { id: 'orange', name: 'Orange', class: 'bg-orange-500' },
        { id: 'indigo', name: 'Indigo', class: 'bg-indigo-600' },
        { id: 'teal', name: 'Teal', class: 'bg-teal-600' },
        { id: 'pink', name: 'Pink', class: 'bg-pink-600' },
        { id: 'cyan', name: 'Cyan', class: 'bg-cyan-600' }
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch data with individual error handling
            const [coursesRes, modulesRes, challengesRes, codesRes, enrollRes, usersRes, lmsCoursesRes] = await Promise.allSettled([
                axios.get(`${API}/admin/courses`),
                axios.get(`${API}/admin/modules`),
                axios.get(`${API}/admin/student-challenges`),
                axios.get(`${API}/admin/enrollment-codes`),
                axios.get(`${API}/admin/student-enrollments`),
                axios.get(`${API}/admin/users-list`),
                axios.get(`${API}/admin/lms-courses`)  // Fetch LMS courses from main database
            ]);

            if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value.data);
            if (modulesRes.status === 'fulfilled') setModules(modulesRes.value.data);
            if (challengesRes.status === 'fulfilled') setChallenges(challengesRes.value.data);
            if (codesRes.status === 'fulfilled') setEnrollmentCodes(codesRes.value.data);
            if (enrollRes.status === 'fulfilled') setEnrollments(enrollRes.value.data);
            if (usersRes.status === 'fulfilled') setAllUsers(usersRes.value.data);
            if (lmsCoursesRes.status === 'fulfilled') setLmsCourses(lmsCoursesRes.value.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Course CRUD
    const handleSaveCourse = async () => {
        try {
            if (editingCourse) {
                await axios.put(`${API}/admin/courses/${editingCourse.id}`, courseForm);
                toast.success('Course updated');
            } else {
                await axios.post(`${API}/admin/courses`, courseForm);
                toast.success('Course created');
            }
            setShowCourseModal(false);
            setEditingCourse(null);
            setCourseStep(1);
            setCourseForm({ lms_course_id: '', code: '', name: '', description: '', duration: '40+ hours', color: 'gray' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save course');
        }
    };

    const editCourse = (course) => {
        setEditingCourse(course);
        setCourseForm({
            lms_course_id: course.lms_course_id || '',
            code: course.code,
            name: course.name,
            description: course.description || '',
            duration: course.duration || '40+ hours',
            color: course.color || 'gray'
        });
        setCourseStep(2);  // Go directly to details when editing
        setShowCourseModal(true);
    };

    const deleteCourse = async (courseId) => {
        if (!confirm('Delete this course? This will also delete all modules, challenges, and enrollments.')) return;
        try {
            await axios.delete(`${API}/admin/courses/${courseId}`);
            toast.success('Course deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete course');
        }
    };

    // Module CRUD
    const handleCreateModule = async () => {
        if (!selectedCourse) return;
        try {
            await axios.post(`${API}/admin/modules`, { ...moduleForm, course_id: selectedCourse.id });
            toast.success('Module created');
            setShowModuleModal(false);
            setModuleForm({ name: '', description: '', order: 1, has_capstone: true });
            fetchData();
        } catch (error) {
            toast.error('Failed to create module');
        }
    };

    // Challenge CRUD
    const handleSaveChallenge = async () => {
        if (!selectedModule) return;
        try {
            const data = {
                ...challengeForm,
                course_id: selectedModule.course_id,
                module_id: selectedModule.id
            };

            if (editingChallenge) {
                await axios.put(`${API}/admin/student-challenges/${editingChallenge.id}`, data);
                toast.success('Challenge updated');
            } else {
                await axios.post(`${API}/admin/student-challenges`, data);
                toast.success('Challenge created');
            }

            setShowChallengeModal(false);
            resetChallengeForm();
            fetchData();
        } catch (error) {
            toast.error('Failed to save challenge');
        }
    };

    const handleDeleteChallenge = async (id) => {
        if (!confirm('Delete this challenge?')) return;
        try {
            await axios.delete(`${API}/admin/student-challenges/${id}`);
            toast.success('Challenge deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete challenge');
        }
    };

    const editChallenge = (challenge) => {
        setEditingChallenge(challenge);
        setChallengeForm({
            title: challenge.title,
            short_description: challenge.short_description,
            context: challenge.context || '',
            topic_number: challenge.topic_number,
            topic_name: challenge.topic_name,
            is_capstone: challenge.is_capstone,
            docker_image: challenge.docker_image || '',
            points: challenge.points,
            order: challenge.order,
            flags: challenge.flags || [{ flag: '', points: 50, description: 'Flag 1' }, { flag: '', points: 50, description: 'Flag 2' }],
            hints: challenge.hints || []
        });
        setSelectedModule(modules.find(m => m.id === challenge.module_id));
        setShowChallengeModal(true);
    };

    const resetChallengeForm = () => {
        setEditingChallenge(null);
        setChallengeForm({
            title: '', short_description: '', context: '', topic_number: 1, topic_name: '',
            is_capstone: false, docker_image: '', points: 100, order: 0,
            flags: [{ flag: '', points: 50, description: 'Flag 1' }, { flag: '', points: 50, description: 'Flag 2' }],
            hints: []
        });
    };

    // Enroll User
    const handleEnrollUser = async () => {
        if (!enrollForm.user_id || !enrollForm.course_id) {
            toast.error('Select a user and course');
            return;
        }
        try {
            const response = await axios.post(`${API}/admin/enroll-user`, enrollForm);
            setGeneratedCode(response.data);
            toast.success(`Enrollment code generated: ${response.data.code}`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to enroll user');
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        toast.success('Code copied to clipboard');
    };

    const deleteEnrollmentCode = async (codeId) => {
        if (!confirm('Delete this enrollment code?')) return;
        try {
            await axios.delete(`${API}/admin/enrollment-codes/${codeId}`);
            toast.success('Enrollment code deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete code');
        }
    };

    // Unenroll User
    const handleUnenrollUser = async (userId, courseId, username, courseName) => {
        if (!confirm(`Unenroll ${username} from ${courseName}? This will also delete their progress.`)) return;
        try {
            await axios.post(`${API}/admin/unenroll-user`, { user_id: userId, course_id: courseId });
            toast.success(`${username} unenrolled successfully`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to unenroll user');
        }
    };

    const tabs = [
        { id: 'courses', label: 'Courses & Modules', icon: BookOpen },
        { id: 'challenges', label: 'Student Challenges', icon: GraduationCap },
        { id: 'enroll', label: 'Enroll Users', icon: UserPlus },
        { id: 'enrollments', label: 'Enrollments', icon: Users }
    ];

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Student Portal Management</h1>
                    <p className="text-gray-500 mt-1">Manage courses, modules, and student challenges</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b border-gray-200">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === 'courses' && (
                <div>
                    <div className="flex justify-end mb-6">
                        <Button onClick={() => setShowCourseModal(true)} className="bg-gray-900 hover:bg-gray-800">
                            <Link className="w-4 h-4 mr-2" /> Add New Course
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {courses.map((course) => {
                            const courseModules = modules.filter(m => m.course_id === course.id);
                            const isExpanded = expandedCourse === course.id;

                            return (
                                <div key={course.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                    <div
                                        className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                                        onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${courseColors.find(c => c.id === course.color)?.class || 'bg-gray-700'
                                                }`}>
                                                <BookOpen className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-semibold text-gray-900">{course.name}</h3>
                                                    <Badge className="bg-gray-100 text-gray-700">{course.code}</Badge>
                                                    <Badge variant="outline" className="text-xs capitalize">{course.color || 'gray'}</Badge>
                                                </div>
                                                <p className="text-sm text-gray-500">{courseModules.length} modules</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); editCourse(course); }}
                                                className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
                                                title="Edit course"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteCourse(course.id); }}
                                                className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                                title="Delete course"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-gray-100 p-6 bg-gray-50">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-medium text-gray-900">Modules</h4>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedCourse(course);
                                                        setShowModuleModal(true);
                                                    }}
                                                >
                                                    <Plus className="w-4 h-4 mr-1" /> Add Module
                                                </Button>
                                            </div>

                                            {courseModules.length > 0 ? (
                                                <div className="space-y-2">
                                                    {courseModules.sort((a, b) => a.order - b.order).map((module) => (
                                                        <div key={module.id} className="flex items-center justify-between p-4 bg-white rounded-xl">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-500">
                                                                    {module.order}
                                                                </span>
                                                                <div>
                                                                    <p className="font-medium text-gray-900">{module.name}</p>
                                                                    <p className="text-xs text-gray-400">
                                                                        {challenges.filter(c => c.module_id === module.id).length} challenges
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setSelectedModule(module);
                                                                    resetChallengeForm();
                                                                    setShowChallengeModal(true);
                                                                }}
                                                            >
                                                                <Plus className="w-4 h-4 mr-1" /> Challenge
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-400 text-center py-4">No modules yet</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {courses.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                No courses created yet
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'challenges' && (
                <div>
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Challenge</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Module</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Topic</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Points</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Flags</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {challenges.map((c) => {
                                    const module = modules.find(m => m.id === c.module_id);
                                    return (
                                        <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-gray-900">{c.title}</p>
                                                <p className="text-xs text-gray-400 truncate max-w-xs">{c.short_description}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{module?.name || '—'}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline">{c.topic_name || `Topic ${c.topic_number}`}</Badge>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-gray-900">{c.points}</td>
                                            <td className="px-6 py-4">{c.flags?.length || 0}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => editChallenge(c)} className="text-gray-600 hover:text-gray-900 mr-3">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteChallenge(c.id)} className="text-red-600 hover:text-red-700">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {challenges.length === 0 && (
                            <div className="text-center py-12 text-gray-400">No challenges created yet</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'enroll' && (
                <div className="grid grid-cols-2 gap-8">
                    {/* Enroll User Form */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                                <UserPlus className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Enroll User</h2>
                                <p className="text-sm text-gray-500">Generate enrollment code for a user</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select User *</label>
                                <select
                                    value={enrollForm.user_id}
                                    onChange={(e) => setEnrollForm(prev => ({ ...prev, user_id: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl p-3 text-sm"
                                >
                                    <option value="">Select a user...</option>
                                    {allUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Course *</label>
                                <select
                                    value={enrollForm.course_id}
                                    onChange={(e) => setEnrollForm(prev => ({ ...prev, course_id: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl p-3 text-sm"
                                >
                                    <option value="">Select a course...</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Code Expires In (days)</label>
                                <Input
                                    type="number"
                                    value={enrollForm.expires_days}
                                    onChange={(e) => setEnrollForm(prev => ({ ...prev, expires_days: parseInt(e.target.value) || 30 }))}
                                />
                            </div>

                            <Button onClick={handleEnrollUser} className="w-full bg-gray-900 hover:bg-gray-800">
                                <Key className="w-4 h-4 mr-2" /> Generate Enrollment Code
                            </Button>
                        </div>

                        {/* Generated Code Display */}
                        {generatedCode && (
                            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <p className="text-sm text-gray-600 mb-2">Enrollment code for <strong>{generatedCode.user}</strong>:</p>
                                <div className="flex items-center gap-3">
                                    <code className="flex-1 bg-white px-4 py-3 rounded-lg border border-gray-200 font-mono font-bold text-lg text-center tracking-widest">
                                        {generatedCode.code}
                                    </code>
                                    <Button variant="outline" onClick={() => copyCode(generatedCode.code)}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Course: {generatedCode.course} • Expires: {new Date(generatedCode.expires_at).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Recent Enrollment Codes */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Enrollment Codes</h2>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {enrollmentCodes.map((code) => (
                                <div key={code.id} className={`p-4 rounded-xl border ${code.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono font-bold text-gray-900">{code.code}</code>
                                            <button
                                                onClick={() => copyCode(code.code)}
                                                className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                                                title="Copy code"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={code.is_active ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'}>
                                                {code.is_active ? 'Active' : 'Used'}
                                            </Badge>
                                            <button
                                                onClick={() => deleteEnrollmentCode(code.id)}
                                                className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                                title="Delete code"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600">{code.username} → {code.course_name}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Expires: {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : '—'}
                                    </p>
                                </div>
                            ))}
                            {enrollmentCodes.length === 0 && (
                                <p className="text-center text-gray-400 py-4">No enrollment codes yet</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'enrollments' && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Student</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Course</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Enrolled</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Progress</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrollments.map((e, idx) => (
                                <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-gray-900">{e.username}</p>
                                        <p className="text-xs text-gray-400">{e.email}</p>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{e.course_name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-gray-900" style={{ width: `${e.progress || 0}%` }} />
                                            </div>
                                            <span className="text-sm text-gray-600">{e.progress || 0}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleUnenrollUser(e.user_id, e.course_id, e.username, e.course_name)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Unenroll user"
                                        >
                                            <UserMinus className="w-4 h-4" />
                                            Unenroll
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {enrollments.length === 0 && (
                        <div className="text-center py-12 text-gray-400">No enrollments yet</div>
                    )}
                </div>
            )}

            {/* Course Modal - Two Step Flow */}
            {showCourseModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
                    <div className="bg-white rounded-2xl w-full max-w-lg">
                        <div className="border-b border-gray-100 p-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editingCourse ? 'Edit Course' : 'Link CTF Course'}
                                </h2>
                                {!editingCourse && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        Step {courseStep} of 2: {courseStep === 1 ? 'Select LMS Course' : 'CTF Details'}
                                    </p>
                                )}
                            </div>
                            <button onClick={() => { setShowCourseModal(false); setEditingCourse(null); setCourseStep(1); setCourseForm({ lms_course_id: '', code: '', name: '', description: '', duration: '40+ hours', color: 'gray' }); }} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Step 1: Select LMS Course */}
                        {courseStep === 1 && !editingCourse && (
                            <div className="p-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Select LMS Course to Link</label>
                                <p className="text-sm text-gray-500 mb-4">
                                    Students enrolled in this LMS course will automatically get access to the CTF course.
                                </p>

                                {lmsCourses.filter(c => !c.has_ctf_course).length > 0 ? (
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {lmsCourses.filter(c => !c.has_ctf_course).map((lmsCourse) => (
                                            <div
                                                key={lmsCourse.id}
                                                onClick={() => {
                                                    setCourseForm(prev => ({
                                                        ...prev,
                                                        lms_course_id: lmsCourse.id,
                                                        code: lmsCourse.courseCode || '',
                                                        name: lmsCourse.title || '',
                                                        description: lmsCourse.description || ''
                                                    }));
                                                    setCourseStep(2);
                                                }}
                                                className={`p-4 border rounded-xl cursor-pointer transition-all hover:border-gray-400 hover:bg-gray-50 ${courseForm.lms_course_id === lmsCourse.id
                                                    ? 'border-gray-900 bg-gray-50'
                                                    : 'border-gray-200'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{lmsCourse.title}</p>
                                                        <p className="text-sm text-gray-500">{lmsCourse.courseCode}</p>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs capitalize">{lmsCourse.status}</Badge>
                                                </div>
                                                {lmsCourse.description && (
                                                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">{lmsCourse.description}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No available LMS courses to link</p>
                                        <p className="text-sm mt-1">All courses already have CTF courses linked</p>
                                    </div>
                                )}

                                {/* Show already linked courses */}
                                {lmsCourses.filter(c => c.has_ctf_course).length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-gray-100">
                                        <p className="text-xs text-gray-400 mb-2">Already linked ({lmsCourses.filter(c => c.has_ctf_course).length}):</p>
                                        <div className="flex flex-wrap gap-2">
                                            {lmsCourses.filter(c => c.has_ctf_course).map((c) => (
                                                <Badge key={c.id} className="bg-gray-100 text-gray-500 text-xs">{c.courseCode}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: CTF Course Details */}
                        {(courseStep === 2 || editingCourse) && (
                            <div className="p-6 space-y-4">
                                {!editingCourse && courseForm.lms_course_id && (
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 mb-4">
                                        <p className="text-xs text-gray-500 mb-1">Linking to LMS Course:</p>
                                        <p className="font-medium text-gray-900">{courseForm.name} ({courseForm.code})</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
                                    <Input
                                        value={courseForm.code}
                                        onChange={(e) => setCourseForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        placeholder="e.g., ZxCPENT"
                                        disabled={!editingCourse && courseForm.lms_course_id}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
                                    <Input
                                        value={courseForm.name}
                                        onChange={(e) => setCourseForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., Certified Penetration Tester"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={courseForm.description}
                                        onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl p-3 text-sm h-24"
                                        placeholder="Course description..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                                    <Input
                                        value={courseForm.duration}
                                        onChange={(e) => setCourseForm(prev => ({ ...prev, duration: e.target.value }))}
                                        placeholder="e.g., 40+ hours"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Course Color</label>
                                    <div className="flex flex-wrap gap-2">
                                        {courseColors.map((color) => (
                                            <button
                                                key={color.id}
                                                onClick={() => setCourseForm(prev => ({ ...prev, color: color.id }))}
                                                className={`w-10 h-10 rounded-xl ${color.class} flex items-center justify-center transition-all ${courseForm.color === color.id
                                                    ? 'ring-2 ring-offset-2 ring-gray-900 scale-110'
                                                    : 'opacity-70 hover:opacity-100'
                                                    }`}
                                                title={color.name}
                                            >
                                                {courseForm.color === color.id && (
                                                    <BookOpen className="w-5 h-5 text-white" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Selected: {courseColors.find(c => c.id === courseForm.color)?.name || 'Gray'}</p>
                                </div>
                            </div>
                        )}

                        <div className="border-t border-gray-100 p-6 flex justify-between gap-3">
                            {courseStep === 2 && !editingCourse ? (
                                <Button variant="outline" onClick={() => setCourseStep(1)}>
                                    ← Back
                                </Button>
                            ) : (
                                <Button variant="outline" onClick={() => { setShowCourseModal(false); setEditingCourse(null); setCourseStep(1); setCourseForm({ lms_course_id: '', code: '', name: '', description: '', duration: '40+ hours', color: 'gray' }); }}>
                                    Cancel
                                </Button>
                            )}

                            {(courseStep === 2 || editingCourse) && (
                                <Button onClick={handleSaveCourse} className="bg-gray-900 hover:bg-gray-800">
                                    <Save className="w-4 h-4 mr-2" /> {editingCourse ? 'Update Course' : 'Create CTF Course'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* Module Modal */}
            {showModuleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
                    <div className="bg-white rounded-2xl w-full max-w-lg">
                        <div className="border-b border-gray-100 p-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Add Module to {selectedCourse?.name}</h2>
                            <button onClick={() => setShowModuleModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Module Name</label>
                                <Input
                                    value={moduleForm.name}
                                    onChange={(e) => setModuleForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Web Application Security"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={moduleForm.description}
                                    onChange={(e) => setModuleForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl p-3 text-sm h-24"
                                    placeholder="Module description..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                                    <Input
                                        type="number"
                                        value={moduleForm.order}
                                        onChange={(e) => setModuleForm(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                                    />
                                </div>
                                <div className="flex items-center pt-7">
                                    <input
                                        type="checkbox"
                                        checked={moduleForm.has_capstone}
                                        onChange={(e) => setModuleForm(prev => ({ ...prev, has_capstone: e.target.checked }))}
                                        className="mr-2"
                                    />
                                    <label className="text-sm text-gray-700">Has Capstone Challenge</label>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 p-6 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowModuleModal(false)}>Cancel</Button>
                            <Button onClick={handleCreateModule} className="bg-gray-900 hover:bg-gray-800">
                                <Save className="w-4 h-4 mr-2" /> Create Module
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Challenge Modal */}
            {showChallengeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="border-b border-gray-100 p-6 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingChallenge ? 'Edit Challenge' : 'Create Challenge'}
                            </h2>
                            <button onClick={() => { setShowChallengeModal(false); resetChallengeForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                    <Input
                                        value={challengeForm.title}
                                        onChange={(e) => setChallengeForm(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Challenge title"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Short Description</label>
                                    <Input
                                        value={challengeForm.short_description}
                                        onChange={(e) => setChallengeForm(prev => ({ ...prev, short_description: e.target.value }))}
                                        placeholder="Brief description for listing"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Topic Number</label>
                                    <Input
                                        type="number"
                                        value={challengeForm.topic_number}
                                        onChange={(e) => setChallengeForm(prev => ({ ...prev, topic_number: parseInt(e.target.value) || 1 }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Topic Name</label>
                                    <Input
                                        value={challengeForm.topic_name}
                                        onChange={(e) => setChallengeForm(prev => ({ ...prev, topic_name: e.target.value }))}
                                        placeholder="e.g., SQL Injection"
                                    />
                                </div>
                            </div>

                            {/* Context */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Context / Learning Material</label>
                                <textarea
                                    value={challengeForm.context}
                                    onChange={(e) => setChallengeForm(prev => ({ ...prev, context: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl p-3 text-sm h-40 font-mono"
                                    placeholder="Detailed explanation, learning content, and instructions..."
                                />
                            </div>

                            {/* Points & Docker */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Points</label>
                                    <Input
                                        type="number"
                                        value={challengeForm.points}
                                        onChange={(e) => setChallengeForm(prev => ({ ...prev, points: parseInt(e.target.value) || 100 }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Docker Image</label>
                                    <Input
                                        value={challengeForm.docker_image}
                                        onChange={(e) => setChallengeForm(prev => ({ ...prev, docker_image: e.target.value }))}
                                        placeholder="e.g., vulnerables/web-dvwa"
                                    />
                                </div>
                                <div className="flex items-center pt-7">
                                    <input
                                        type="checkbox"
                                        checked={challengeForm.is_capstone}
                                        onChange={(e) => setChallengeForm(prev => ({ ...prev, is_capstone: e.target.checked }))}
                                        className="mr-2"
                                    />
                                    <label className="text-sm text-gray-700">Capstone Challenge</label>
                                </div>
                            </div>

                            {/* Flags */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-sm font-medium text-gray-700">Flags (2 required)</label>
                                </div>
                                <div className="space-y-4">
                                    {challengeForm.flags.map((flag, idx) => (
                                        <div key={idx} className="p-4 bg-gray-50 rounded-xl space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                                    {idx + 1}
                                                </span>
                                                <span className="font-medium text-gray-700">Flag {idx + 1}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="col-span-2">
                                                    <Input
                                                        value={flag.description}
                                                        onChange={(e) => {
                                                            const newFlags = [...challengeForm.flags];
                                                            newFlags[idx].description = e.target.value;
                                                            setChallengeForm(prev => ({ ...prev, flags: newFlags }));
                                                        }}
                                                        placeholder="Flag description"
                                                    />
                                                </div>
                                                <div>
                                                    <Input
                                                        type="number"
                                                        value={flag.points}
                                                        onChange={(e) => {
                                                            const newFlags = [...challengeForm.flags];
                                                            newFlags[idx].points = parseInt(e.target.value) || 50;
                                                            setChallengeForm(prev => ({ ...prev, flags: newFlags }));
                                                        }}
                                                        placeholder="Points"
                                                    />
                                                </div>
                                            </div>
                                            <Input
                                                value={flag.flag}
                                                onChange={(e) => {
                                                    const newFlags = [...challengeForm.flags];
                                                    newFlags[idx].flag = e.target.value;
                                                    setChallengeForm(prev => ({ ...prev, flags: newFlags }));
                                                }}
                                                placeholder="CTF{flag_value}"
                                                className="font-mono"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 p-6 flex justify-end gap-3 sticky bottom-0 bg-white">
                            <Button variant="outline" onClick={() => { setShowChallengeModal(false); resetChallengeForm(); }}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveChallenge} className="bg-gray-900 hover:bg-gray-800">
                                <Save className="w-4 h-4 mr-2" />
                                {editingChallenge ? 'Update Challenge' : 'Create Challenge'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminStudentPortal;
