import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    FileText,
    Database,
    GitBranch,
    Settings,
    ChevronLeft,
    Workflow,
    AppWindow,
    Table2,
    Plug,
    BarChart3
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/forms', icon: FileText, label: 'Forms' },
    { path: '/datasets', icon: Database, label: 'Datasets' },
    { path: '/workflows', icon: GitBranch, label: 'Workflows' },
    { path: '/apps', icon: AppWindow, label: 'Apps' },
    { path: '/decision-tables', icon: Table2, label: 'Decision Tables' },
    { path: '/integrations', icon: Plug, label: 'Integrations' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const location = useLocation();

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 z-40 h-screen',
                'bg-surface-900/80 backdrop-blur-md border-r border-surface-700/50',
                'transition-all duration-300 ease-out',
                isCollapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center px-4 border-b border-surface-700/50">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                        <Workflow className="h-5 w-5 text-white" />
                    </div>
                    {!isCollapsed && (
                        <span className="text-lg font-bold gradient-text">FlowForge</span>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="p-3 space-y-1">
                {navItems.map(({ path, icon: Icon, label }) => {
                    const isActive = location.pathname === path || location.pathname.startsWith(path + '/');

                    return (
                        <NavLink
                            key={path}
                            to={path}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                                'text-surface-400 transition-all duration-200',
                                'hover:bg-surface-800/50 hover:text-surface-200',
                                isActive && 'bg-primary-500/10 text-primary-400 border-l-2 border-primary-500 -ml-[2px] pl-[14px]',
                                isCollapsed && 'justify-center px-0'
                            )}
                            title={isCollapsed ? label : undefined}
                        >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            {!isCollapsed && <span className="font-medium">{label}</span>}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Collapse button */}
            <button
                onClick={onToggle}
                className={cn(
                    'absolute -right-3 top-20 z-50',
                    'h-6 w-6 rounded-full bg-surface-800 border border-surface-600',
                    'flex items-center justify-center',
                    'text-surface-400 hover:text-surface-200 hover:bg-surface-700',
                    'transition-all duration-200',
                    isCollapsed && 'rotate-180'
                )}
            >
                <ChevronLeft className="h-4 w-4" />
            </button>
        </aside>
    );
}
