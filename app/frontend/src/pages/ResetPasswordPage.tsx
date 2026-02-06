import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { API, toast } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Eye, EyeOff, Lock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [maskedEmail, setMaskedEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);

    // Verify token on mount
    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        const verifyToken = async () => {
            try {
                const response = await axios.get(`${API}/auth/password-reset/verify?token=${token}`);
                setTokenValid(true);
                setMaskedEmail(response.data.email);
            } catch (error) {
                setTokenValid(false);
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API}/auth/password-reset/confirm`, {
                token,
                new_password: newPassword
            });
            setSuccess(true);
            toast.success('Password reset successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (loading && !success) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
                    <p className="text-gray-500">Verifying reset link...</p>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full text-center"
                >
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Complete</h1>
                    <p className="text-gray-500 mb-8">
                        Your password has been successfully reset. You can now log in with your new password.
                    </p>
                    <Button
                        onClick={() => navigate('/login')}
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white h-11"
                    >
                        Go to Login
                    </Button>
                </motion.div>
            </div>
        );
    }

    // No token or invalid token
    if (!token || !tokenValid) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full text-center"
                >
                    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h1>
                    <p className="text-gray-500 mb-8">
                        This password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={() => navigate('/login')}
                            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white h-11"
                        >
                            Back to Login
                        </Button>
                        <p className="text-sm text-gray-400">
                            Click "Forgot?" on the login page to request a new reset link.
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Valid token - show reset form
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full"
            >
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-gray-500 mb-8 font-medium text-sm hover:text-gray-700"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>

                <div className="mb-8">
                    <div className="w-14 h-14 rounded-xl bg-zinc-900 flex items-center justify-center mb-6">
                        <Lock className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Password</h1>
                    <p className="text-gray-500">
                        Enter a new password for <span className="font-medium text-gray-700">{maskedEmail}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label>New Password</Label>
                        <div className="relative">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                                minLength={8}
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
                        <p className="text-xs text-gray-400">Must be at least 8 characters</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Confirm Password</Label>
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                            className="bg-white"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading || !newPassword || !confirmPassword}
                        className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            'Reset Password'
                        )}
                    </Button>
                </form>
            </motion.div>
        </div>
    );
};

export default ResetPasswordPage;
