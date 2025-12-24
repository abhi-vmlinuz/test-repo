import { Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Flag, Trophy, User, LogOut, Zap, Menu, X } from 'lucide-react';
import { useState } from 'react';
import CreativeBackground from './CreativeBackground';

const Layout = ({ user, children, logout }) => {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'challenges', label: 'Challenges', icon: Flag, path: '/challenges' },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
        { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
        { id: 'student', label: 'Student Portal', icon: Flag, path: '/student' },
        ...(user?.role === 'admin' || user?.role === 'superadmin'
            ? [{ id: 'admin', label: 'Admin Panel', icon: Zap, path: '/admin' }]
            : [])
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-white flex text-slate-900 font-sans selection:bg-zinc-800 selection:text-white relative overflow-x-hidden">
            {/* Background Grid */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none z-0"></div>

            {/* Creative Background Elements */}
            <CreativeBackground />

            {/* Sidebar - Desktop */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-gray-100 bg-white/50 backdrop-blur-xl z-40 hidden lg:flex flex-col p-6">
                {/* Logo */}
                <div className="mb-10 px-2">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-gray-200 to-gray-400 rounded-lg opacity-0 group-hover:opacity-50 blur transition duration-500" />
                            <div className="relative w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" fill="white" />
                            </div>
                        </div>
                        <span className="text-lg font-bold tracking-tight text-zinc-900">ZecurX</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="space-y-1.5 flex-1 mt-6">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group relative overflow-hidden ${isActive(item.path)
                                ? 'bg-zinc-900 text-white shadow-sm'
                                : 'text-gray-500 hover:text-zinc-900 hover:bg-gray-100/80'
                                }`}
                        >
                            <item.icon className={`w-4 h-4 transition-colors ${isActive(item.path) ? 'text-white' : 'text-gray-400 group-hover:text-zinc-900'}`} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* User Profile Snippet */}
                <div className="border-t border-gray-100 pt-4 mt-auto">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer relative">
                        <div className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-zinc-900 shadow-sm">
                            {user?.username?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate">{user?.username}</p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <p className="text-[10px] text-gray-500">{user?.role === 'superadmin' ? 'ROOT' : 'USER'}</p>
                            </div>
                        </div>

                        {/* Logout Button */}
                        <button onClick={logout} className="ml-2 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="mt-4 px-1">
                        <p className="text-[10px] text-gray-300 font-mono text-center">v2.0.4</p>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 flex items-center justify-between px-4">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" fill="white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-zinc-900">ZecurX</span>
                </Link>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-500">
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40 bg-white/95 backdrop-blur-sm pt-20 px-6">
                    <nav className="space-y-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.id}
                                to={item.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-lg font-medium ${isActive(item.path)
                                    ? 'bg-zinc-900 text-white'
                                    : 'text-gray-500 bg-gray-50'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        ))}
                        <button onClick={logout} className="flex w-full items-center gap-4 px-4 py-3 rounded-xl text-lg font-medium text-red-500 bg-red-50 mt-8">
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </nav>
                </div>
            )}


            {/* Main Content Area */}
            <main className="flex-1 lg:ml-64 relative z-10 w-full pt-16 lg:pt-0 bg-white min-h-screen">
                <div className="py-8 px-6 lg:px-10 lg:py-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
