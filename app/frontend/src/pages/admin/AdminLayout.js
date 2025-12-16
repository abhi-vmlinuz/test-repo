import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Flag, FolderOpen, Users, FileText, Settings,
    LogOut, Shield, ChevronRight, Plus, Search, MoreVertical, GraduationCap, Bell
} from 'lucide-react';

const AdminLayout = ({ user, logout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Check if user is admin
    useEffect(() => {
        if (!user || !['admin', 'superadmin'].includes(user.role)) {
            toast.error('Admin access required');
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { id: 'challenges', icon: Flag, label: 'Challenges', path: '/admin/challenges' },
        { id: 'categories', icon: FolderOpen, label: 'Categories', path: '/admin/categories' },
        { id: 'users', icon: Users, label: 'Users', path: '/admin/users' },
        { id: 'submissions', icon: FileText, label: 'Submissions', path: '/admin/submissions' },
        { id: 'notifications', icon: Bell, label: 'Notifications', path: '/admin/notifications' },
        { id: 'student-portal', icon: GraduationCap, label: 'Student Portal', path: '/admin/student-portal' },
    ];

    const isActive = (path) => {
        if (path === '/admin') return location.pathname === '/admin';
        return location.pathname.startsWith(path);
    };

    if (!user || !['admin', 'superadmin'].includes(user.role)) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar - White theme matching main dashboard */}
            <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-20">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <img src="/logo.png" alt="ZecurX" className="w-10 h-10" />
                        <div>
                            <h1 className="font-bold text-lg text-gray-900">ZecurX LABS</h1>
                            <p className="text-xs text-gray-400">Admin Panel</p>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.id}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
                                        ? 'bg-gray-900 text-white'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Back to Platform */}
                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
                        >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                            <span className="font-medium">Back to Platform</span>
                        </Link>
                    </div>
                </div>

                {/* User info at bottom - Gray gradient */}
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center font-bold text-sm text-white">
                            {user.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{user.username}</p>
                            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 ml-64">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
