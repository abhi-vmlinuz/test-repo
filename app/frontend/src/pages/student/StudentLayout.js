import { useState, useEffect } from 'react';
import axios from 'axios';
import { API, toast } from '../../App';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    GraduationCap, BookOpen, Trophy, User, LogOut, ChevronRight,
    LayoutDashboard, Award, Target
} from 'lucide-react';

const StudentLayout = ({ user, logout }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // Check if user is logged in
    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    // Nav items with icon colors (Dashboard has no special color)
    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/student', iconColor: null },
        { id: 'courses', icon: BookOpen, label: 'My Courses', path: '/student/courses', iconColor: 'text-blue-500' },
        { id: 'progress', icon: Target, label: 'Progress', path: '/student/progress', iconColor: 'text-green-500' },
        { id: 'achievements', icon: Award, label: 'Achievements', path: '/student/achievements', iconColor: 'text-yellow-500' },
    ];

    const isActive = (path) => {
        if (path === '/student') return location.pathname === '/student';
        return location.pathname.startsWith(path);
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar - White theme */}
            <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-20">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <img src="/logo.png" alt="ZecurX" className="w-10 h-10" />
                        <div>
                            <h1 className="font-bold text-lg text-gray-900">ZecurX Learn</h1>
                            <p className="text-xs text-gray-400">Student Portal</p>
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
                                    <Icon className={`w-5 h-5 ${active ? 'text-white' : (item.iconColor || '')
                                        }`} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Back to CTF Platform */}
                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
                        >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                            <span className="font-medium">CTF Platform</span>
                        </Link>
                    </div>
                </div>

                {/* User info at bottom - Gray gradient */}
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center font-bold text-sm text-white">
                            {user.username?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{user.username}</p>
                            <p className="text-xs text-gray-500">Student</p>
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

export default StudentLayout;
