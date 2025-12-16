import { useState } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Key, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const StudentLogin = ({ setUser }) => {
    const navigate = useNavigate();
    const [mode, setMode] = useState('login'); // login or register
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: '',
        invite_code: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === 'login') {
                // Login
                const response = await axios.post(`${API}/student/login`, {
                    email: formData.email,
                    password: formData.password
                });
                localStorage.setItem('token', response.data.access_token);
                setUser(response.data.user);
                toast.success('Welcome back!');
                navigate('/student');
            } else {
                // Register with invite code
                const response = await axios.post(`${API}/student/register`, {
                    email: formData.email,
                    password: formData.password,
                    username: formData.username,
                    invite_code: formData.invite_code
                });
                localStorage.setItem('token', response.data.access_token);
                setUser(response.data.user);
                toast.success('Registration successful! Welcome to ZecurX Learn.');
                navigate('/student');
            }
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-12 flex-col justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">ZecurX Learn</h1>
                            <p className="text-indigo-200 text-sm">Student Portal</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h2 className="text-4xl font-bold text-white mb-4">
                                Master Cybersecurity<br />Through Practice
                            </h2>
                            <p className="text-indigo-200 text-lg">
                                Hands-on challenges designed to complement your course curriculum.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 text-white/80">
                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">✓</div>
                                <span>Module-aligned practical challenges</span>
                            </div>
                            <div className="flex items-center gap-4 text-white/80">
                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">✓</div>
                                <span>Docker-based lab environments</span>
                            </div>
                            <div className="flex items-center gap-4 text-white/80">
                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">✓</div>
                                <span>Capstone projects for each module</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-indigo-200 text-sm">
                    © {new Date().getFullYear()} ZecurX Labs. All rights reserved.
                </div>
            </div>

            {/* Right side - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">ZecurX Learn</h1>
                            <p className="text-gray-500 text-sm">Student Portal</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                        {/* Mode Toggle */}
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-8">
                            <button
                                onClick={() => setMode('login')}
                                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${mode === 'login'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setMode('register')}
                                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${mode === 'register'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Register
                            </button>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {mode === 'login' ? 'Welcome back' : 'Join the course'}
                        </h2>
                        <p className="text-gray-500 mb-8">
                            {mode === 'login'
                                ? 'Sign in to continue your learning'
                                : 'Use your invite code to register'}
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {mode === 'register' && (
                                <>
                                    {/* Invite Code */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Invite Code *
                                        </label>
                                        <div className="relative">
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input
                                                type="text"
                                                value={formData.invite_code}
                                                onChange={(e) => setFormData(prev => ({ ...prev, invite_code: e.target.value.toUpperCase() }))}
                                                placeholder="Enter your invite code"
                                                className="pl-12 h-12"
                                                required
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Provided by your course administrator
                                        </p>
                                    </div>

                                    {/* Username */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Username *
                                        </label>
                                        <Input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                            placeholder="Choose a username"
                                            className="h-12"
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email *
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="you@example.com"
                                        className="pl-12 h-12"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                        placeholder="••••••••"
                                        className="pl-12 pr-12 h-12"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {mode === 'login' ? 'Sign In' : 'Register'}
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </Button>
                        </form>

                        {/* CTF Platform Link */}
                        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                            <p className="text-gray-500 text-sm">
                                Looking for the CTF Platform?{' '}
                                <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                                    Go to CTF
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentLogin;
