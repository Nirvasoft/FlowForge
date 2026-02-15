import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    FileText,
    GitBranch,
    CheckSquare,
    TrendingUp,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Play,
    Database,
    Table2,
    Zap,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Plus,
    ArrowRight,
    Activity,
    BarChart3,
    Shield,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardData, type DashboardData, type RecentActivityItem } from '../../api/analytics';
import { cn } from '../../lib/utils';

// ── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    gradientFrom: string;
    gradientTo: string;
    isLoading?: boolean;
    onClick?: () => void;
}

function StatCard({ title, value, subtitle, icon, color, gradientFrom, gradientTo, isLoading, onClick }: StatCardProps) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-xl border border-surface-700/50 bg-surface-800/60 backdrop-blur-sm p-5 transition-all duration-300',
                onClick && 'cursor-pointer hover:border-surface-600 hover:bg-surface-800/80 hover:scale-[1.02] hover:shadow-xl'
            )}
            onClick={onClick}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">{title}</p>
                    {isLoading ? (
                        <div className="mt-3 flex items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
                        </div>
                    ) : (
                        <>
                            <p className="mt-2 text-3xl font-bold text-surface-50">{value}</p>
                            {subtitle && (
                                <p className="mt-1 text-xs text-surface-400">{subtitle}</p>
                            )}
                        </>
                    )}
                </div>
                <div className={cn('p-3 rounded-xl', color)}>
                    {icon}
                </div>
            </div>
            {/* Decorative gradient blob */}
            <div
                className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full opacity-15 blur-2xl"
                style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
            />
        </div>
    );
}

// ── Activity Icon ────────────────────────────────────────────────────────────

function ActivityIcon({ type, status }: { type: string; status?: string }) {
    if (type === 'workflow') {
        if (status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 text-green-400" />;
        if (status === 'FAILED') return <XCircle className="h-4 w-4 text-red-400" />;
        if (status === 'RUNNING') return <Play className="h-4 w-4 text-blue-400" />;
        return <GitBranch className="h-4 w-4 text-purple-400" />;
    }
    if (type === 'task') {
        if (status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 text-green-400" />;
        return <CheckSquare className="h-4 w-4 text-orange-400" />;
    }
    if (type === 'form') return <FileText className="h-4 w-4 text-cyan-400" />;
    return <Users className="h-4 w-4 text-surface-400" />;
}

function StatusBadge({ status }: { status?: string }) {
    if (!status) return null;
    const styles: Record<string, string> = {
        RUNNING: 'bg-blue-500/20 text-blue-300  border-blue-500/30',
        COMPLETED: 'bg-green-500/20 text-green-300 border-green-500/30',
        FAILED: 'bg-red-500/20 text-red-300 border-red-500/30',
        PENDING: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        CANCELLED: 'bg-surface-600/30 text-surface-400 border-surface-500/30',
    };
    return (
        <span className={cn(
            'px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full border',
            styles[status] || 'bg-surface-700 text-surface-300 border-surface-600'
        )}>
            {status}
        </span>
    );
}

function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// ── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ label, value, max, color }: { label: string; value: number; max?: number; color: string }) {
    const pct = max ? Math.min((value / max) * 100, 100) : value;
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-surface-400">{label}</span>
                <span className="text-sm font-semibold text-surface-200">{pct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all duration-1000 ease-out', color)}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ── Quick Action Button ──────────────────────────────────────────────────────

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50 hover:bg-surface-700/50 hover:border-surface-600 transition-all duration-200 group w-full"
        >
            <div className="p-2 rounded-lg bg-surface-700/50 group-hover:bg-surface-600/50 transition-colors">
                {icon}
            </div>
            <span className="text-sm font-medium text-surface-300 group-hover:text-surface-100 transition-colors">{label}</span>
            <ArrowRight className="h-4 w-4 text-surface-500 group-hover:text-surface-300 ml-auto transition-colors" />
        </button>
    );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const firstName = user?.firstName || 'User';
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const result = await getDashboardData();
                setData(result);
            } catch (err) {
                console.error('Failed to load dashboard:', err);
                setError('Failed to load dashboard data');
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    const stats = data?.stats;
    const activity = data?.recentActivity || [];
    const perf = data?.performance;

    // Greeting based on time of day
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="space-y-6 animate-in">
            {/* Welcome header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-50">
                        {greeting}, {firstName}! 👋
                    </h1>
                    <p className="mt-1 text-surface-400">
                        Here's what's happening across your workspace today.
                    </p>
                </div>
                {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {error}
                    </div>
                )}
            </div>

            {/* Stats grid — 4 primary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Users"
                    value={stats?.totalUsers ?? 0}
                    subtitle="Registered accounts"
                    icon={<Users className="h-5 w-5 text-blue-400" />}
                    color="bg-blue-500/20"
                    gradientFrom="#3b82f6"
                    gradientTo="#6366f1"
                    isLoading={isLoading}
                    onClick={() => navigate('/users')}
                />
                <StatCard
                    title="Active Workflows"
                    value={stats?.activeWorkflows ?? 0}
                    subtitle={`${stats?.runningExecutions ?? 0} running now`}
                    icon={<GitBranch className="h-5 w-5 text-purple-400" />}
                    color="bg-purple-500/20"
                    gradientFrom="#8b5cf6"
                    gradientTo="#a855f7"
                    isLoading={isLoading}
                    onClick={() => navigate('/workflows')}
                />
                <StatCard
                    title="Forms Created"
                    value={stats?.formsCreated ?? 0}
                    subtitle="Active form templates"
                    icon={<FileText className="h-5 w-5 text-cyan-400" />}
                    color="bg-cyan-500/20"
                    gradientFrom="#06b6d4"
                    gradientTo="#22d3ee"
                    isLoading={isLoading}
                    onClick={() => navigate('/forms')}
                />
                <StatCard
                    title="Tasks Pending"
                    value={stats?.tasksPending ?? 0}
                    subtitle="Awaiting action"
                    icon={<CheckSquare className="h-5 w-5 text-orange-400" />}
                    color="bg-orange-500/20"
                    gradientFrom="#f97316"
                    gradientTo="#fb923c"
                    isLoading={isLoading}
                    onClick={() => navigate('/workflows')}
                />
            </div>

            {/* Secondary stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Total Executions"
                    value={stats?.totalExecutions ?? 0}
                    subtitle={`${stats?.runningExecutions ?? 0} in progress`}
                    icon={<Activity className="h-5 w-5 text-emerald-400" />}
                    color="bg-emerald-500/20"
                    gradientFrom="#10b981"
                    gradientTo="#34d399"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Datasets"
                    value={stats?.datasetsCount ?? 0}
                    subtitle="Data collections"
                    icon={<Database className="h-5 w-5 text-indigo-400" />}
                    color="bg-indigo-500/20"
                    gradientFrom="#6366f1"
                    gradientTo="#818cf8"
                    isLoading={isLoading}
                    onClick={() => navigate('/datasets')}
                />
                <StatCard
                    title="Decision Tables"
                    value={stats?.decisionTablesCount ?? 0}
                    subtitle="Active rule tables"
                    icon={<Table2 className="h-5 w-5 text-rose-400" />}
                    color="bg-rose-500/20"
                    gradientFrom="#f43f5e"
                    gradientTo="#fb7185"
                    isLoading={isLoading}
                    onClick={() => navigate('/decision-tables')}
                />
            </div>

            {/* Main content: Activity + Performance + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <Card className="lg:col-span-2 border-surface-700/50">
                    <CardHeader
                        title="Recent Activity"
                        description="Latest updates across your workspace"
                    />
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
                            </div>
                        ) : activity.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-surface-400">
                                <Activity className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">No recent activity</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-surface-700/30">
                                {activity.map((item: RecentActivityItem) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-4 px-6 py-3.5 hover:bg-surface-800/30 transition-colors group"
                                    >
                                        <div className="p-2 rounded-lg bg-surface-800/80 group-hover:bg-surface-700/50 transition-colors">
                                            <ActivityIcon type={item.type} status={item.status} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-surface-200 truncate">
                                                    {item.title}
                                                </p>
                                                <StatusBadge status={item.status} />
                                            </div>
                                            <p className="text-xs text-surface-500 mt-0.5">{item.description}</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-surface-500 whitespace-nowrap">
                                            <Clock className="h-3 w-3" />
                                            {timeAgo(item.timestamp)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right column: Performance + Quick Actions */}
                <div className="space-y-6">
                    {/* Performance */}
                    <Card className="border-surface-700/50">
                        <CardHeader
                            title="Performance"
                            description="Real-time metrics"
                        />
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <ProgressBar
                                        label="Workflow Completion"
                                        value={perf?.workflowCompletionRate ?? 0}
                                        color="bg-gradient-to-r from-green-500 to-emerald-400"
                                    />
                                    <ProgressBar
                                        label="SLA Compliance"
                                        value={perf?.slaComplianceRate ?? 0}
                                        color="bg-gradient-to-r from-blue-500 to-cyan-400"
                                    />

                                    <div className="pt-4 border-t border-surface-700/50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-surface-400 text-sm">
                                                <Clock className="h-4 w-4" />
                                                <span>Avg Resolution</span>
                                            </div>
                                            <span className="text-sm font-semibold text-surface-200">
                                                {perf?.avgResolutionHours ? `${perf.avgResolutionHours}h` : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-green-400 text-sm">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span>Completed (month)</span>
                                            </div>
                                            <span className="text-sm font-semibold text-surface-200">
                                                {perf?.totalCompletedThisMonth ?? 0}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-red-400 text-sm">
                                                <XCircle className="h-4 w-4" />
                                                <span>Failed (month)</span>
                                            </div>
                                            <span className="text-sm font-semibold text-surface-200">
                                                {perf?.totalFailedThisMonth ?? 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="border-surface-700/50">
                        <CardHeader
                            title="Quick Actions"
                            description="Common tasks"
                        />
                        <CardContent>
                            <div className="space-y-2">
                                <QuickAction
                                    icon={<Plus className="h-4 w-4 text-purple-400" />}
                                    label="Create Workflow"
                                    onClick={() => navigate('/workflows')}
                                />
                                <QuickAction
                                    icon={<CheckSquare className="h-4 w-4 text-orange-400" />}
                                    label="View My Tasks"
                                    onClick={() => navigate('/workflows')}
                                />
                                <QuickAction
                                    icon={<FileText className="h-4 w-4 text-cyan-400" />}
                                    label="Create Form"
                                    onClick={() => navigate('/forms')}
                                />
                                <QuickAction
                                    icon={<BarChart3 className="h-4 w-4 text-emerald-400" />}
                                    label="View Reports"
                                    onClick={() => navigate('/reports')}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
