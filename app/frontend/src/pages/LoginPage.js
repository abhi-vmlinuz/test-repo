import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, toast } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import FloatingParticles from '@/components/FloatingParticles';

const LoginPage = ({ setUser }) => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const data = isLogin
                ? { email: formData.email, password: formData.password }
                : formData;

            const response = await axios.post(`${API}${endpoint}`, data);
            localStorage.setItem('token', response.data.token);
            setUser(response.data.user);
            toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!formData.email) {
            toast.error('Please enter your email');
            return;
        }
        toast.success('Password reset link sent to your email!');
        setShowForgotPassword(false);
    };

    const handleGoogleLogin = () => {
        toast.info('Google login coming soon!');
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* Floating Particles Background */}
            <FloatingParticles particleCount={120} />

            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
                <div className="relative z-10 max-w-lg">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl mb-12 transition-colors font-medium text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to home
                    </Link>

                    <div className="flex items-center gap-3 mb-8">
                        <img src="/logo.png" alt="ZecurX" className="w-10 h-10" />
                        <span className="text-3xl font-bold text-gray-900">ZecurX LABS</span>
                    </div>

                    <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
                        Master The Art Of
                        <span className="block text-gray-400">Ethical Hacking</span>
                    </h1>

                    <p className="text-lg text-gray-500 leading-relaxed">
                        Join thousands of security enthusiasts. Practice real-world CTF challenges and level up your cybersecurity skills.
                    </p>

                    <div className="mt-12 flex gap-8">
                        <div>
                            <div className="text-3xl font-bold text-gray-900">8+</div>
                            <div className="text-sm text-gray-400">Challenges</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">4</div>
                            <div className="text-sm text-gray-400">Categories</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">Live</div>
                            <div className="text-sm text-gray-400">Docker</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 relative z-10">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl mb-6 transition-colors font-medium text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </Link>
                        <div className="flex items-center gap-2">
                            <img src="/logo.png" alt="ZecurX" className="w-8 h-8" />
                            <span className="text-2xl font-bold text-gray-900">ZecurX LABS</span>
                        </div>
                    </div>

                    {showForgotPassword ? (
                        // Forgot Password Form
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h2>
                            <p className="text-gray-500 mb-8">Enter your email to receive a reset link</p>

                            <form onSubmit={handleForgotPassword} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="reset-email" className="text-sm font-medium text-gray-700">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="reset-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            className="h-14 pl-12 bg-gray-50 border-gray-200 rounded-2xl text-base"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-medium text-base"
                                >
                                    Send Reset Link
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => setShowForgotPassword(false)}
                                    className="w-full text-center text-gray-500 hover:text-gray-700 text-sm"
                                >
                                    Back to login
                                </button>
                            </form>
                        </div>
                    ) : (
                        // Login/Register Form
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                {isLogin ? 'Welcome back' : 'Create account'}
                            </h2>
                            <p className="text-gray-500 mb-8">
                                {isLogin ? 'Sign in to continue your journey' : 'Start your hacking journey today'}
                            </p>

                            {/* Google Login */}
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full h-14 flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl text-gray-700 font-medium hover:bg-gray-50 transition-colors mb-6"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continue with Google
                            </button>

                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-gray-400">or continue with email</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {!isLogin && (
                                    <div className="space-y-2">
                                        <Label htmlFor="username" className="text-sm font-medium text-gray-700">Username</Label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input
                                                id="username"
                                                type="text"
                                                placeholder="your_username"
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                required
                                                className="h-14 pl-12 bg-gray-50 border-gray-200 rounded-2xl text-base"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            className="h-14 pl-12 bg-gray-50 border-gray-200 rounded-2xl text-base"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                                        {isLogin && (
                                            <button
                                                type="button"
                                                onClick={() => setShowForgotPassword(true)}
                                                className="text-sm text-gray-500 hover:text-gray-700"
                                            >
                                                Forgot password?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                            className="h-14 pl-12 pr-12 bg-gray-50 border-gray-200 rounded-2xl text-base"
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
                                    className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-medium text-base transition-all"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        isLogin ? 'Sign in' : 'Create account'
                                    )}
                                </Button>
                            </form>

                            <p className="mt-8 text-center text-gray-500">
                                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                                <button
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="text-gray-900 font-medium hover:underline"
                                >
                                    {isLogin ? 'Sign up' : 'Sign in'}
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
