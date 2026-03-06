import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Shield, LayoutDashboard, Flag, Trophy, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const Navigation = ({ user, logout }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/challenges', label: 'Challenges', icon: Flag },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="w-full px-8 lg:px-16">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3" data-testid="nav-logo">
            <img src="/logo.png" alt="ZecurX" className="w-7 h-7" />
            <span className="text-xl font-semibold text-gray-900 tracking-tight">ZecurX LABS</span>
          </Link>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive(item.path)
                      ? 'text-gray-900 bg-gray-100'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Right Side - User Menu */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 px-3 py-2 rounded-full hover:bg-gray-50"
                  data-testid="user-menu"
                >
                  <div className="hidden md:block text-right">
                    <div className="text-sm font-medium text-gray-900">{user?.username || user?.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{user?.score} pts</div>
                  </div>
                  <Avatar className="w-9 h-9 border border-gray-200">
                    {user?.avatar_url && (
                      <AvatarImage src={user.avatar_url} alt={user?.username || user?.name} />
                    )}
                    <AvatarFallback className="bg-gray-900 text-white text-sm font-semibold">
                      {(user?.username || user?.name)?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-white border border-gray-100 shadow-lg rounded-2xl p-1"
              >
                <div className="px-3 py-3 border-b border-gray-100 mb-1">
                  <p className="font-medium text-gray-900">{user?.username || user?.name}</p>
                  <p className="text-sm text-gray-400">{user?.email}</p>
                </div>
                <Link to="/profile">
                  <DropdownMenuItem
                    className="cursor-pointer rounded-xl py-3 px-3 focus:bg-gray-50 text-gray-600"
                    data-testid="nav-profile"
                  >
                    <User className="w-4 h-4 mr-3" strokeWidth={1.5} />
                    Profile
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator className="bg-gray-100 my-1" />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer rounded-xl py-3 px-3 focus:bg-red-50 text-red-500"
                  data-testid="nav-logout"
                >
                  <LogOut className="w-4 h-4 mr-3" strokeWidth={1.5} />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start px-4 py-3 rounded-xl text-sm font-medium ${isActive(item.path)
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                      <Icon className="w-4 h-4 mr-3" strokeWidth={1.5} />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
