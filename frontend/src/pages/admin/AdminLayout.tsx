import { useState, useEffect } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { toast } from '../../App';
import {
    LayoutDashboard, Flag, FolderOpen, Users, FileText,
    LogOut, Shield, ChevronRight, Menu, X, Zap, Cloud, Package
} from 'lucide-react';
import CreativeBackground from '../../components/CreativeBackground';

const AdminLayout = ({ user, logout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        { id: 'registry', icon: Package, label: 'Image Registry', path: '/admin/registry' },
        { id: 'nexus', icon: Cloud, label: 'Nexus Engine', path: '/admin/nexus' },
        ...(user?.role === 'superadmin' ? [
            { id: 'active-sessions', icon: Shield, label: 'Active Sessions', path: '/admin/sessions' },
        ] : []),
    ];

    const isActive = (path) => {
        if (path === '/admin') return location.pathname === '/admin';
        return location.pathname.startsWith(path);
    };

    if (!user || !['admin', 'superadmin'].includes(user.role)) {
        return null;
    }

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
                            <img src="/logo.png" alt="RLabZ" className="w-8 h-8 object-contain" />
                        </div>
                        <div>
                            <span className="block text-lg font-bold tracking-tight text-zinc-900 leading-none">RLabZ</span>
                            <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Admin Panel</span>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="space-y-1.5 flex-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden ${isActive(item.path)
                                ? 'bg-zinc-900 text-white shadow-md'
                                : 'text-gray-500 hover:text-zinc-900 hover:bg-gray-100'
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
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-zinc-900 hover:bg-gray-100 transition-all"
                    >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Back to Platform
                    </Link>
                </div>

                {/* User Profile Snippet */}
                <div className="border-t border-gray-100 pt-6 mt-6">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors group cursor-pointer relative">
                        <div className="w-9 h-9 rounded-lg bg-white border border-gray-150 flex items-center justify-center shadow-sm">
                            <span className="font-bold text-xs text-gray-700">{user?.username?.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-800 truncate">{user?.username}</p>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <p className="text-xs text-gray-500 uppercase tracking-wider">{user?.role}</p>
                            </div>
                        </div>

                        {/* Logout Button */}
                        <button onClick={logout} className="absolute right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 flex items-center justify-between px-4">
                <Link to="/" className="flex items-center gap-2">
                    <img src="/logo.png" alt="RLabZ" className="w-7 h-7 object-contain" />
                    <div>
                        <span className="block text-lg font-bold tracking-tight text-zinc-900 leading-none">RLabZ</span>
                        <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Admin</span>
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
                            Back to Platform
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
                <div className="p-8 lg:p-12 max-w-[1600px] mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
