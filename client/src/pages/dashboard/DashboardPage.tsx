import { useState, useEffect } from 'react';
import {
    Users,
    FileText,
    GitBranch,
    CheckSquare,
    TrendingUp,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardStats, type DashboardStats } from '../../api/analytics';
import { cn } from '../../lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color: string;
    isLoading?: boolean;
}

function StatCard({ title, value, change, icon, color, isLoading }: StatCardProps) {
    const isPositive = change && change > 0;

    return (
        <Card className="relative overflow-hidden">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-surface-400">{title}</p>
                        {isLoading ? (
                            <div className="mt-2 flex items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
                            </div>
                        ) : (
                            <>
                                <p className="mt-2 text-3xl font-bold text-surface-100">{value}</p>
                                {change !== undefined && (
                                    <div className={cn(
                                        'flex items-center gap-1 mt-2 text-sm font-medium',
                                        isPositive ? 'text-green-400' : 'text-red-400'
                                    )}>
                                        {isPositive ? (
                                            <ArrowUpRight className="h-4 w-4" />
                                        ) : (
                                            <ArrowDownRight className="h-4 w-4" />
                                        )}
                                        <span>{Math.abs(change)}% from last month</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className={cn(
                        'p-3 rounded-lg',
                        color
                    )}>
                        {icon}
                    </div>
                </div>
                {/* Decorative gradient */}
                <div className={cn(
                    'absolute -right-8 -bottom-8 w-24 h-24 rounded-full opacity-20 blur-2xl',
                    color.replace('bg-', 'bg-').replace('/20', '')
                )}></div>
            </CardContent>
        </Card>
    );
}

interface ActivityItem {
    id: string;
    type: 'user' | 'form' | 'workflow' | 'task';
    message: string;
    time: string;
}

const recentActivity: ActivityItem[] = [
    { id: '1', type: 'user', message: 'New user John Doe registered', time: '5 minutes ago' },
    { id: '2', type: 'workflow', message: 'Purchase Approval workflow completed', time: '12 minutes ago' },
    { id: '3', type: 'form', message: 'Employee Onboarding form submitted', time: '25 minutes ago' },
    { id: '4', type: 'task', message: 'Review request assigned to you', time: '1 hour ago' },
    { id: '5', type: 'workflow', message: 'Leave Request workflow started', time: '2 hours ago' },
];

const activityIcons = {
    user: Users,
    form: FileText,
    workflow: GitBranch,
    task: CheckSquare,
};

export function DashboardPage() {
    const { user } = useAuth();
    const firstName = user?.firstName || 'User';
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                const data = await getDashboardStats();
                setStats(data);
            } catch (error) {
                console.error('Failed to load dashboard stats:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadStats();
    }, []);

    return (
        <div className="space-y-6 animate-in">
            {/* Welcome header */}
            <div>
                <h1 className="text-2xl font-bold text-surface-100">
                    Welcome back, {firstName}! 👋
                </h1>
                <p className="mt-1 text-surface-400">
                    Here's what's happening with your workflows today.
                </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Users"
                    value={stats?.totalUsers ?? 0}
                    icon={<Users className="h-6 w-6 text-blue-400" />}
                    color="bg-blue-500/20"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Active Workflows"
                    value={stats?.activeWorkflows ?? 0}
                    icon={<GitBranch className="h-6 w-6 text-purple-400" />}
                    color="bg-purple-500/20"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Forms Created"
                    value={stats?.formsCreated ?? 0}
                    icon={<FileText className="h-6 w-6 text-green-400" />}
                    color="bg-green-500/20"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Tasks Pending"
                    value={stats?.tasksPending ?? 0}
                    icon={<CheckSquare className="h-6 w-6 text-orange-400" />}
                    color="bg-orange-500/20"
                    isLoading={isLoading}
                />
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <Card className="lg:col-span-2">
                    <CardHeader
                        title="Recent Activity"
                        description="Latest updates across your workspace"
                    />
                    <CardContent className="p-0">
                        <div className="divide-y divide-surface-700/50">
                            {recentActivity.map((item) => {
                                const Icon = activityIcons[item.type];
                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-4 px-6 py-4 hover:bg-surface-800/30 transition-colors"
                                    >
                                        <div className="p-2 rounded-lg bg-surface-800/50">
                                            <Icon className="h-5 w-5 text-surface-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-surface-200">{item.message}</p>
                                            <p className="text-xs text-surface-500 mt-0.5 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {item.time}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                    <CardHeader
                        title="Performance"
                        description="This month's metrics"
                    />
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-surface-400">Workflow Completion Rate</span>
                                <span className="text-sm font-medium text-surface-200">94.2%</span>
                            </div>
                            <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
                                <div className="h-full w-[94%] bg-gradient-to-r from-green-500 to-green-400 rounded-full"></div>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <span className="text-sm text-surface-400">SLA Compliance</span>
                                <span className="text-sm font-medium text-surface-200">87.8%</span>
                            </div>
                            <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
                                <div className="h-full w-[88%] bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"></div>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <span className="text-sm text-surface-400">Form Submission Rate</span>
                                <span className="text-sm font-medium text-surface-200">76.5%</span>
                            </div>
                            <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
                                <div className="h-full w-[76%] bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"></div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-surface-700/50">
                                <div className="flex items-center gap-2 text-green-400">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-sm font-medium">Overall metrics are up 12% this month</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
