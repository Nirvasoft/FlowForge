import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Sun, Moon, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui';
import { cn } from '../../lib/utils';

interface HeaderProps {
    onMenuClick?: () => void;
}

export function Header({ onMenuClick: _onMenuClick }: HeaderProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isDark, setIsDark] = useState(() => {
        // Initialize from localStorage or default to dark
        const stored = localStorage.getItem('theme');
        if (stored) return stored === 'dark';
        return true; // default dark
    });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Apply theme on mount and when changed
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Toggle theme
    const toggleTheme = () => {
        setIsDark(!isDark);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const userName = user ? `${user.firstName} ${user.lastName}` : 'User';

    return (
        <header className="sticky top-0 z-30 h-16 bg-surface-900/80 backdrop-blur-md border-b border-surface-700/50 transition-colors duration-300">
            <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
                {/* Search */}
                <div className="flex-1 max-w-xl">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-10 pr-4 py-2 bg-surface-800/50 border border-surface-700 rounded-lg
                       text-surface-200 placeholder-surface-500 text-sm
                       focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30
                       transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Right section */}
                <div className="flex items-center gap-2">
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-colors"
                        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>

                    {/* Notifications */}
                    <button
                        className="relative p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-colors"
                        title="Notifications"
                    >
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* User dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-800/50 transition-colors"
                        >
                            <Avatar name={userName} size="sm" />
                            <span className="hidden md:block text-sm font-medium text-surface-200">
                                {userName}
                            </span>
                        </button>

                        {/* Dropdown menu */}
                        {isDropdownOpen && (
                            <div
                                className={cn(
                                    'absolute right-0 top-full mt-2 w-48',
                                    'bg-surface-800 border border-surface-700 rounded-lg shadow-xl',
                                    'animate-fade-in origin-top-right'
                                )}
                            >
                                <div className="p-2 border-b border-surface-700">
                                    <p className="text-sm font-medium text-surface-100">{userName}</p>
                                    <p className="text-xs text-surface-400">{user?.email}</p>
                                </div>
                                <div className="p-1">
                                    <button
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            navigate('/settings');
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 rounded-lg transition-colors"
                                    >
                                        <User className="h-4 w-4" />
                                        Profile
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            navigate('/settings');
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 rounded-lg transition-colors"
                                    >
                                        <Settings className="h-4 w-4" />
                                        Settings
                                    </button>
                                    <hr className="my-1 border-surface-700" />
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
