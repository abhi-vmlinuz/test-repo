import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { API, toast } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft, Eye, EyeOff, Mail, Lock, User,
    ArrowRight, Globe, Github, AlertTriangle, Shield, X, Loader2
} from 'lucide-react';
import { FloatingElement } from '@/components/landing/FloatingElement';

const LoginPage = ({ setUser }) => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    // Form mechanics
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Session conflict state
    const [sessionConflict, setSessionConflict] = useState<{
        show: boolean;
        sessionInfo?: any;
        step: 'confirm' | 'otp';
    }>({ show: false, step: 'confirm' });
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [otpExpiry, setOtpExpiry] = useState(0);
    const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        setFormData({ username: '', email: '', password: '' });
        setShowForgotPassword(false);
    }, [isLogin]);

    // OTP countdown timer
    useEffect(() => {
        if (otpExpiry > 0) {
            const timer = setInterval(() => setOtpExpiry(prev => Math.max(0, prev - 1)), 1000);
            return () => clearInterval(timer);
        }
    }, [otpExpiry]);

    // Listen for OAuth callbacks (GitHub and Google)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'github-login-success' || event.data?.type === 'google-login-success') {
                const { token, user, session_token } = event.data.data;
                localStorage.setItem('token', token);
                if (session_token) localStorage.setItem('session_token', session_token);
                // Ensure username is set (OAuth might only return name)
                const userData = {
                    ...user,
                    username: user.username || user.name
                };
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                const provider = event.data.type === 'github-login-success' ? 'GitHub' : 'Google';
                toast.success(`Logged in with ${provider}!`);
                navigate('/dashboard');
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [setUser, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const data = isLogin ? { email: formData.email, password: formData.password } : formData;
            const response = await axios.post(`${API}${endpoint}`, data);
            localStorage.setItem('token', response.data.token);
            if (response.data.session_token) {
                localStorage.setItem('session_token', response.data.session_token);
            }
            setUser(response.data.user);
            toast.success(isLogin ? "Welcome back." : "Account created.");
            navigate('/dashboard');
        } catch (error: any) {
            // Handle session conflict (409)
            if (error.response?.status === 409) {
                const detail = error.response?.data?.detail;
                if (detail?.code === 'SESSION_CONFLICT') {
                    setSessionConflict({
                        show: true,
                        sessionInfo: detail.session_info,
                        step: 'confirm'
                    });
                    return;
                }
            }
            toast.error(error.response?.data?.detail || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleForceLogoutRequest = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API}/auth/force-logout/request`, {
                email: formData.email,
                password: formData.password
            });
            toast.success('Verification code sent!');
            setSessionConflict(prev => ({ ...prev, step: 'otp' }));
            setOtpExpiry(response.data.expires_in || 300);
            setOtpCode(['', '', '', '', '', '']);
            // Focus first OTP input
            setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only digits

        const newOtp = [...otpCode];
        newOtp[index] = value.slice(-1); // Only last digit
        setOtpCode(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otpCode];
        pasted.split('').forEach((char, i) => {
            if (i < 6) newOtp[i] = char;
        });
        setOtpCode(newOtp);
        if (pasted.length === 6) {
            otpInputRefs.current[5]?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const code = otpCode.join('');
        if (code.length !== 6) {
            toast.error('Please enter the complete 6-digit code');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API}/auth/force-logout/verify`, {
                email: formData.email,
                password: formData.password,
                otp_code: code
            });

            localStorage.setItem('token', response.data.token);
            if (response.data.session_token) {
                localStorage.setItem('session_token', response.data.session_token);
            }
            setUser(response.data.user);
            toast.success('Logged in successfully!');
            setSessionConflict({ show: false, step: 'confirm' });
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API}/auth/password-reset/request`, {
                email: formData.email
            });
            toast.success('Reset instructions sent to your email!');
            setShowForgotPassword(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const res = await axios.get(`${API}/auth/google/login`);
            // Open popup for OAuth
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            window.open(
                res.data.url,
                'google-login',
                `width=${width},height=${height},left=${left},top=${top}`
            );
        } catch (e) {
            toast.error('Failed to initiate Google login');
        }
    };

    const handleGithubLogin = async () => {
        try {
            const res = await axios.get(`${API}/auth/github/login`);
            // Open popup for OAuth
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            window.open(
                res.data.url,
                'github-login',
                `width=${width},height=${height},left=${left},top=${top}`
            );
        } catch (e) {
            toast.error('Failed to initiate GitHub login');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-white flex overflow-hidden relative selection:bg-zinc-900 selection:text-white">

            {/* === SESSION CONFLICT MODAL === */}
            <AnimatePresence>
                {sessionConflict.show && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSessionConflict({ show: false, step: 'confirm' })}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-zinc-50 to-gray-100 border-b border-zinc-200/50 px-6 py-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0">
                                        <Shield className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Active Session Detected</h3>
                                        <p className="text-sm text-gray-600 mt-0.5">This account is already logged in elsewhere</p>
                                    </div>
                                    <button
                                        onClick={() => setSessionConflict({ show: false, step: 'confirm' })}
                                        className="ml-auto p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {sessionConflict.step === 'confirm' ? (
                                    <>
                                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                            <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                                                <Shield className="w-4 h-4 text-gray-400" />
                                                <span>Current active session:</span>
                                            </div>
                                            <div className="space-y-1.5 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">IP Address:</span>
                                                    <span className="font-mono text-gray-900">{sessionConflict.sessionInfo?.ip_address || 'Unknown'}</span>
                                                </div>
                                                {sessionConflict.sessionInfo?.created_at && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Logged in:</span>
                                                        <span className="text-gray-900">
                                                            {new Date(sessionConflict.sessionInfo.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-600 mb-6">
                                            To prevent data conflicts, only one session is allowed at a time.
                                            We'll send a verification code to your email to confirm it's you.
                                        </p>

                                        <div className="flex gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={() => setSessionConflict({ show: false, step: 'confirm' })}
                                                className="flex-1"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleForceLogoutRequest}
                                                disabled={loading}
                                                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white"
                                            >
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Force Logout & Login'}
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center mb-6">
                                            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                                                <Mail className="w-8 h-8 text-zinc-700" />
                                            </div>
                                            <h4 className="text-lg font-semibold text-gray-900">Check your email</h4>
                                            <p className="text-sm text-gray-500 mt-1">
                                                We sent a 6-digit code to {formData.email?.slice(0, 3)}***@{formData.email?.split('@')[1]}
                                            </p>
                                        </div>

                                        {/* OTP Input */}
                                        <div className="flex justify-center gap-2 mb-4" onPaste={handleOtpPaste}>
                                            {otpCode.map((digit, index) => (
                                                <input
                                                    key={index}
                                                    ref={(el) => otpInputRefs.current[index] = el}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                    className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20 outline-none transition-all"
                                                />
                                            ))}
                                        </div>

                                        {/* Timer */}
                                        {otpExpiry > 0 && (
                                            <p className="text-center text-sm text-gray-500 mb-6">
                                                Code expires in <span className="font-mono font-medium text-zinc-700">{formatTime(otpExpiry)}</span>
                                            </p>
                                        )}

                                        <Button
                                            onClick={handleVerifyOtp}
                                            disabled={loading || otpCode.join('').length !== 6}
                                            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white h-11"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Login'}
                                        </Button>

                                        <button
                                            onClick={() => setSessionConflict(prev => ({ ...prev, step: 'confirm' }))}
                                            className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
                                        >
                                            ← Go back
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* === LEFT SIDE: HERO-STYLE CREATIVE === */}
            <div className="hidden lg:flex w-1/2 relative bg-gray-50/50 overflow-hidden items-center justify-center p-16 border-r border-gray-100">
                {/* Background Grid & Noise (Matches Landing Page) */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
                <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none mix-blend-overlay"></div>

                <div className="relative z-10 w-full max-w-xl">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm hover:shadow-md text-gray-600 rounded-full mb-12 transition-all hover:pr-6 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-semibold">Back to Home</span>
                    </Link>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-6xl font-black text-gray-950 mb-6 leading-none tracking-tight">
                            SECURE <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600">
                                ACCESS
                            </span>
                        </h1>
                        <p className="text-lg text-gray-500 leading-relaxed max-w-md font-medium">
                            Enter the ZecurX ecosystem. Advanced CTF simulations await.
                        </p>
                    </motion.div>

                    {/* Floating Vinyl Stickers (Reused from Hero) */}
                    <div className="relative h-64 w-full perspective-1000 mt-10">
                        {/* Sticker 1: Terminal */}
                        <FloatingElement depth={1} floatDuration={6} initialX={-40} initialY={0} className="absolute left-0 top-0">
                            <div className="relative group transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                                <div className="absolute -inset-[3px] bg-white rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.15)]"></div>
                                <div className="relative w-64 bg-[#0f0f0f] rounded-lg shadow-sm overflow-hidden border border-zinc-900/5">
                                    <div className="flex px-4 py-3 bg-[#1a1a1a] items-center gap-2 border-b border-gray-800/50">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                    </div>
                                    <div className="p-4 font-mono text-[10px] text-gray-400 space-y-2">
                                        <div className="flex gap-2">
                                            <span className="text-green-400">➜</span>
                                            <span className="text-blue-400">~</span>
                                            <span>./auth_sequence.sh</span>
                                        </div>
                                        <div className="text-gray-500">Initializing handshake...</div>
                                        <div className="text-green-500">Connection established.</div>
                                    </div>
                                </div>
                            </div>
                        </FloatingElement>

                        {/* Sticker 2: High Voltage */}
                        <FloatingElement depth={2} floatDuration={8} initialX={140} initialY={-60} className="absolute right-10 -top-10">
                            <div className="relative group transform rotate-12 hover:rotate-6 transition-transform duration-300">
                                <div className="absolute -inset-[3px] bg-white rounded-lg shadow-[0_8px_16px_rgba(0,0,0,0.15)]"></div>
                                <div className="relative w-28 h-24 bg-yellow-400 rounded-md flex flex-col items-center justify-center p-2 border-4 border-zinc-900 shadow-sm overflow-hidden">
                                    <div className="text-zinc-900 font-black text-2xl mb-1">⚠</div>
                                    <div className="text-zinc-900 text-[9px] font-bold uppercase tracking-tighter leading-3 text-center border-t-2 border-zinc-900 pt-1 w-full">
                                        RESTRICTED<br />AREA
                                    </div>
                                </div>
                            </div>
                        </FloatingElement>

                        {/* Sticker 3: Chip */}
                        <FloatingElement depth={0.5} floatDuration={5} initialX={80} initialY={80} className="absolute right-20 bottom-0">
                            <div className="relative group transform -rotate-12 hover:rotate-0 transition-transform duration-300">
                                <div className="absolute -inset-[3px] bg-white rounded-md shadow-[0_8px_16px_rgba(0,0,0,0.15)]"></div>
                                <div className="relative w-20 h-20 bg-zinc-900 rounded-md flex items-center justify-center border border-gray-800">
                                    <div className="grid grid-cols-2 gap-1 opacity-50">
                                        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </FloatingElement>
                    </div>
                </div>
            </div>

            {/* === RIGHT SIDE: CLEAN FORM === */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white relative">
                <div className="w-full max-w-[400px]">
                    {/* Mobile Header */}
                    <div className="lg:hidden mb-10">
                        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 mb-6 font-medium text-sm">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </Link>
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="ZecurX" className="w-8 h-8" />
                            <span className="text-xl font-bold tracking-tight text-gray-900">ZecurX</span>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
                            {showForgotPassword ? 'Reset Password' : (isLogin ? 'Sign In' : 'Create Account')}
                        </h2>
                        <p className="text-gray-500 text-sm">
                            {showForgotPassword
                                ? 'Enter your email to receive instructions.'
                                : (isLogin ? 'Enter your credentials to continue.' : 'Join the platform to start hacking.')}
                        </p>
                    </div>

                    {!showForgotPassword && (
                        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100/50 rounded-xl mb-8 border border-gray-100">
                            <button
                                onClick={() => setIsLogin(true)}
                                className={`py-2 text-sm font-semibold rounded-lg transition-all ${isLogin ? 'bg-white text-zinc-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setIsLogin(false)}
                                className={`py-2 text-sm font-semibold rounded-lg transition-all ${!isLogin ? 'bg-white text-zinc-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Sign Up
                            </button>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.form
                            key={showForgotPassword ? 'forgot' : (isLogin ? 'login' : 'register')}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={showForgotPassword ? handleForgotPassword : handleSubmit}
                            className="space-y-5"
                        >
                            {/* Form Fields */}
                            {showForgotPassword ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Email Address</Label>
                                        <Input
                                            placeholder="name@example.com"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)} className="flex-1">Cancel</Button>
                                        <Button type="submit" disabled={loading} className="flex-1 bg-zinc-900 text-white hover:bg-gray-800">Send Link</Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {!isLogin && (
                                        <div className="space-y-2">
                                            <Label>Username</Label>
                                            <Input
                                                placeholder="Pick a username"
                                                value={formData.username}
                                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                                required
                                                className="bg-white"
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input
                                            type="email"
                                            placeholder="name@example.com"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label>Password</Label>
                                            {isLogin && (
                                                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs font-medium text-gray-500 hover:text-zinc-900">
                                                    Forgot?
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                required
                                                className="bg-white pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-2.5 text-gray-400 hover:text-zinc-900"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-11 bg-zinc-900 text-white hover:bg-gray-800 rounded-lg font-medium shadow-lg shadow-zinc-900/5"
                                    >
                                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
                                    </Button>
                                </>
                            )}
                        </motion.form>
                    </AnimatePresence>

                    {!showForgotPassword && (
                        <div className="mt-8">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-100"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-400 font-medium">Continue with</span>
                                </div>
                            </div>
                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button onClick={handleGoogleLogin} className="flex items-center justify-center gap-2 h-10 bg-white border border-gray-200 hover:border-gray-300 rounded-lg transition-all shadow-sm">
                                    <img src="/google-logo.svg" alt="Google" className="w-4 h-4" />
                                    <span className="text-sm font-medium text-gray-700">Google</span>
                                </button>
                                <button onClick={handleGithubLogin} className="flex items-center justify-center gap-2 h-10 bg-white border border-gray-200 hover:border-gray-300 rounded-lg transition-all shadow-sm">
                                    <img src="/github-mark.svg" alt="GitHub" className="w-4 h-4" />
                                    <span className="text-sm font-medium text-gray-700">GitHub</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
