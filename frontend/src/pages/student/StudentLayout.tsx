import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Shield, BookOpen, Target, Award, LogOut, ChevronRight, LayoutDashboard, Menu, X, User, GraduationCap } from 'lucide-react';
import CreativeBackground from '../../components/CreativeBackground';

const StudentLayout = ({ user, logout }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Check if user is logged in
    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    // Nav items
    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/student' },
        { id: 'courses', icon: BookOpen, label: 'My Courses', path: '/student/courses' },
        { id: 'progress', icon: Target, label: 'Progress', path: '/student/progress' },
        { id: 'achievements', icon: Award, label: 'Achievements', path: '/student/achievements' },
        { id: 'certification', icon: GraduationCap, label: 'Certification Exams', path: '/student/certification-exams' },
    ];

    const isActive = (path) => {
        if (path === '/student') return location.pathname === '/student';
        return location.pathname.startsWith(path);
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-white flex text-slate-900 font-sans selection:bg-zinc-800 selection:text-white relative overflow-x-hidden">
            {/* Background Grid */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:16px_24px] pointer-events-none z-0"></div>

            {/* Creative Background Elements */}
            <CreativeBackground />

            {/* Sidebar - Desktop */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-gray-200/50 bg-white/80 backdrop-blur-xl z-40 hidden lg:flex flex-col px-6 py-8">
                {/* Logo */}
                <div className="mb-10 px-2">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-200 to-cyan-400 rounded-lg opacity-0 group-hover:opacity-50 blur transition duration-500" />
                            <div className="relative w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" fill="white" />
                            </div>
                        </div>
                        <div>
                            <span className="block text-lg font-bold tracking-tight text-zinc-900 leading-none">ZecurX</span>
                            <span className="text-xs uppercase font-bold text-blue-600 tracking-wider">Student Portal</span>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="space-y-2 flex-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden ${isActive(item.path)
                                ? 'bg-zinc-900 text-white shadow-md'
                                : 'text-gray-500 hover:text-zinc-900 hover:bg-gray-100/80'
                                }`}
                        >
                            <item.icon className={`w-4 h-4 transition-colors ${isActive(item.path) ? 'text-white' : 'text-gray-400 group-hover:text-zinc-900'}`} />
                            {item.label}
                            {isActive(item.path) && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Separator */}
                <div className="pt-6 mt-6 border-t border-gray-100">
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-zinc-900 hover:bg-gray-100/80 transition-all"
                    >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Back to CTF Platform
                    </Link>
                </div>

                {/* User Profile Snippet */}
                <div className="mt-auto pt-6 pb-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-200/50 hover:border-gray-300/50 transition-colors group cursor-pointer relative">
                        <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm text-zinc-900">
                            <span className="font-bold text-xs text-gray-700">{user?.username?.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-800 truncate">{user?.username}</p>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                                <p className="text-xs text-gray-500 truncate" title={`Global ID: ${user?.id}`}>
                                    Global ID: <span className="font-mono">{user?.id?.toString().slice(0, 8)}...</span>
                                </p>
                            </div>
                        </div>

                        {/* Logout Button */}
                        <button onClick={logout} className="absolute right-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 flex items-center justify-between px-4">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" fill="white" />
                    </div>
                    <div>
                        <span className="block text-lg font-bold tracking-tight text-zinc-900 leading-none">ZecurX</span>
                        <span className="text-xs uppercase font-bold text-blue-600 tracking-wider">Student</span>
                    </div>
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
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-4 px-4 py-3 rounded-xl text-lg font-medium text-gray-500 bg-gray-50 mt-4"
                        >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                            Back to CTF
                        </Link>
                        <button onClick={logout} className="flex w-full items-center gap-4 px-4 py-3 rounded-xl text-lg font-medium text-red-500 bg-red-50 mt-8">
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </nav>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-64 relative z-10 w-full pt-16 lg:pt-0">
                <div className="p-8 lg:p-12 max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default StudentLayout;
