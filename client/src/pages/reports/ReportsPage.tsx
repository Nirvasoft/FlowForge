/**
 * ReportsPage - Analytics reports with real-time data and enhanced visualizations
 */

import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    BarChart3,
    PieChart,
    TrendingUp,
    FileText,
    Download,
    Play,
    MoreVertical,
    Trash2,
    Clock,
    Loader2,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Activity,
} from 'lucide-react';
import { Button, Input, Card, CardHeader, CardContent } from '../../components/ui';
import { cn } from '../../lib/utils';
import {
    listReports,
    createReport,
    deleteReport,
    generateReport,
    getReportsOverview,
    type Report,
    type ReportType,
    type ReportFormat,
    type ReportsOverviewData,
} from '../../api/analytics';

export function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [generatingReport, setGeneratingReport] = useState<string | null>(null);

    useEffect(() => {
        async function loadReports() {
            try {
                const result = await listReports();
                setReports(result.reports || []);
            } catch (error) {
                console.error('Failed to load reports:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadReports();
    }, []);

    const handleCreate = async (name: string, type: ReportType) => {
        try {
            const report = await createReport({ name, type });
            setReports((prev) => [...prev, report]);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Failed to create report:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this report?')) return;
        try {
            await deleteReport(id);
            setReports((prev) => prev.filter((r) => r.id !== id));
        } catch (error) {
            console.error('Failed to delete report:', error);
        }
    };

    const handleGenerate = async (id: string, format: ReportFormat) => {
        setGeneratingReport(id);
        try {
            await generateReport(id, format);
            alert('Report generation started. You will be notified when ready.');
        } catch (error) {
            console.error('Failed to generate report:', error);
        } finally {
            setGeneratingReport(null);
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-surface-100">Reports & Analytics</h1>
                    <p className="text-surface-400 mt-1">View insights and generate custom reports</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Report
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-surface-700">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={cn(
                        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                        activeTab === 'overview'
                            ? 'border-primary-500 text-primary-400'
                            : 'border-transparent text-surface-400 hover:text-surface-200'
                    )}
                >
                    <BarChart3 className="w-4 h-4" />
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={cn(
                        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                        activeTab === 'reports'
                            ? 'border-primary-500 text-primary-400'
                            : 'border-transparent text-surface-400 hover:text-surface-200'
                    )}
                >
                    <FileText className="w-4 h-4" />
                    Reports
                </button>
            </div>

            {activeTab === 'overview' ? (
                <OverviewTab />
            ) : (
                <ReportsTab
                    reports={reports}
                    isLoading={isLoading}
                    onDelete={handleDelete}
                    onGenerate={handleGenerate}
                    generatingReport={generatingReport}
                    onCreateClick={() => setShowCreateModal(true)}
                />
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateReportModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreate}
                />
            )}
        </div>
    );
}

// ============================================================================
// Overview Tab with Real Data
// ============================================================================

function OverviewTab() {
    const [data, setData] = useState<ReportsOverviewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadOverview() {
            try {
                const result = await getReportsOverview();
                setData(result);
            } catch (err) {
                console.error('Failed to load overview:', err);
                setError('Failed to load analytics data');
            } finally {
                setIsLoading(false);
            }
        }
        loadOverview();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-3" />
                    <p className="text-surface-400 text-sm">Loading analytics…</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <p className="text-surface-300 font-medium">{error || 'No data available'}</p>
                    <p className="text-surface-500 text-sm mt-1">Please try again later</p>
                </div>
            </div>
        );
    }

    const { stats, workflowTrend, taskDistribution, formRankings } = data;

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Total Workflows"
                    value={String(stats.totalWorkflows)}
                    subtitle="Process definitions"
                    icon={<Activity className="w-5 h-5" />}
                    gradient="from-violet-600/20 to-purple-600/20"
                    iconBg="bg-violet-500/20 text-violet-400"
                />
                <KpiCard
                    title="Tasks Completed"
                    value={String(stats.tasksCompleted)}
                    subtitle="All time"
                    icon={<CheckCircle className="w-5 h-5" />}
                    gradient="from-emerald-600/20 to-green-600/20"
                    iconBg="bg-emerald-500/20 text-emerald-400"
                />
                <KpiCard
                    title="Pending Approvals"
                    value={String(stats.pendingApprovals)}
                    subtitle="Awaiting action"
                    icon={<Clock className="w-5 h-5" />}
                    gradient="from-amber-600/20 to-orange-600/20"
                    iconBg="bg-amber-500/20 text-amber-400"
                />
                <KpiCard
                    title="Avg. Completion"
                    value={stats.avgCompletionHours > 24
                        ? `${(stats.avgCompletionHours / 24).toFixed(1)} days`
                        : `${stats.avgCompletionHours.toFixed(1)}h`}
                    subtitle="Per workflow instance"
                    icon={<RefreshCw className="w-5 h-5" />}
                    gradient="from-blue-600/20 to-cyan-600/20"
                    iconBg="bg-blue-500/20 text-blue-400"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Workflow Trend Chart */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-surface-100">Workflow Executions</h3>
                                <p className="text-sm text-surface-400">Last 6 months</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-primary-500" />
                                    <span className="text-surface-400">Completed</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-red-500/60" />
                                    <span className="text-surface-400">Failed</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <BarChart data={workflowTrend} />
                    </CardContent>
                </Card>

                {/* Task Distribution */}
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-surface-100">Task Status Distribution</h3>
                        <p className="text-sm text-surface-400">Current status breakdown</p>
                    </CardHeader>
                    <CardContent>
                        <PieChartComponent data={taskDistribution} />
                    </CardContent>
                </Card>
            </div>

            {/* Form Submissions */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold text-surface-100">Top Form Submissions</h3>
                    <p className="text-sm text-surface-400">Most used forms</p>
                </CardHeader>
                <CardContent>
                    {formRankings.length === 0 ? (
                        <p className="text-surface-500 text-sm text-center py-6">No form submissions yet</p>
                    ) : (
                        <HorizontalBarChart data={formRankings} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================================================
// Reports Tab
// ============================================================================

interface ReportsTabProps {
    reports: Report[];
    isLoading: boolean;
    onDelete: (id: string) => void;
    onGenerate: (id: string, format: ReportFormat) => void;
    generatingReport: string | null;
    onCreateClick: () => void;
}

function ReportsTab({ reports, isLoading, onDelete, onGenerate, generatingReport, onCreateClick }: ReportsTabProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const filteredReports = reports.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    const typeIcons: Record<ReportType, React.ReactNode> = {
        tabular: <FileText className="w-5 h-5" />,
        summary: <BarChart3 className="w-5 h-5" />,
        matrix: <PieChart className="w-5 h-5" />,
        custom: <TrendingUp className="w-5 h-5" />,
    };

    return (
        <div>
            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <Input
                        placeholder="Search reports..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {filteredReports.length === 0 ? (
                <div className="text-center py-16 bg-surface-900 border border-surface-700 rounded-lg">
                    <FileText className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-surface-300 mb-2">No reports yet</h3>
                    <p className="text-surface-500 mb-6">Create custom reports to track your metrics</p>
                    <Button onClick={onCreateClick}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Report
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredReports.map((report) => (
                        <div
                            key={report.id}
                            className="bg-surface-900 border border-surface-700 rounded-lg p-4 hover:border-surface-600 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400">
                                        {typeIcons[report.type]}
                                    </div>
                                    <div>
                                        <h4 className="text-surface-100 font-medium">{report.name}</h4>
                                        <p className="text-surface-500 text-xs capitalize">{report.type} Report</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === report.id ? null : report.id)}
                                        className="p-1 rounded hover:bg-surface-700 text-surface-400"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                    {activeMenu === report.id && (
                                        <div className="absolute right-0 top-full mt-1 w-40 bg-surface-800 border border-surface-600 rounded-lg shadow-lg z-10">
                                            <button
                                                onClick={() => { onGenerate(report.id, 'pdf'); setActiveMenu(null); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-200 hover:bg-surface-700"
                                            >
                                                <Download className="w-4 h-4" />
                                                Export PDF
                                            </button>
                                            <button
                                                onClick={() => { onGenerate(report.id, 'excel'); setActiveMenu(null); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-200 hover:bg-surface-700"
                                            >
                                                <Download className="w-4 h-4" />
                                                Export Excel
                                            </button>
                                            <hr className="border-surface-600 my-1" />
                                            <button
                                                onClick={() => { onDelete(report.id); setActiveMenu(null); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-surface-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-surface-500">
                                    Updated {new Date(report.updatedAt).toLocaleDateString()}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onGenerate(report.id, 'pdf')}
                                    disabled={generatingReport === report.id}
                                >
                                    {generatingReport === report.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Play className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Chart Components (CSS-based visualization)
// ============================================================================

function KpiCard({
    title,
    value,
    subtitle,
    icon,
    gradient,
    iconBg,
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    gradient: string;
    iconBg: string;
}) {
    return (
        <div className={cn(
            'rounded-xl border border-surface-700/50 p-5 bg-gradient-to-br transition-all duration-200 hover:border-surface-600/70 hover:shadow-lg',
            gradient
        )}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">{title}</p>
                    <p className="text-3xl font-bold text-surface-100 mt-2">{value}</p>
                    <p className="text-sm text-surface-500 mt-1">{subtitle}</p>
                </div>
                <div className={cn('p-2.5 rounded-xl', iconBg)}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function BarChart({ data }: { data: { month: string; completed: number; failed: number }[] }) {
    const maxValue = Math.max(...data.map((d) => d.completed + d.failed), 1);
    const totalCompleted = data.reduce((sum, d) => sum + d.completed, 0);
    const totalFailed = data.reduce((sum, d) => sum + d.failed, 0);

    return (
        <div>
            <div className="flex items-center gap-4 mb-4 text-sm">
                <span className="text-surface-300">
                    <span className="font-semibold text-surface-100">{totalCompleted}</span> completed
                </span>
                <span className="text-surface-300">
                    <span className="font-semibold text-red-400">{totalFailed}</span> failed
                </span>
            </div>
            <div className="h-48 flex items-end gap-3">
                {data.map((item) => (
                    <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col gap-0.5 items-center" style={{ height: '160px' }}>
                            <div className="w-full flex flex-col justify-end h-full gap-0.5">
                                {item.failed > 0 && (
                                    <div
                                        className="w-full bg-red-500/60 rounded-t transition-all duration-700"
                                        style={{ height: `${(item.failed / maxValue) * 100}%` }}
                                    />
                                )}
                                <div
                                    className="w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t transition-all duration-700"
                                    style={{ height: `${(item.completed / maxValue) * 100}%` }}
                                />
                            </div>
                        </div>
                        <span className="text-xs text-surface-500 font-medium">{item.month}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PieChartComponent({ data }: { data: { name: string; value: number; color: string }[] }) {
    const total = data.reduce((sum, d) => sum + d.value, 0);

    if (total === 0) {
        return <p className="text-surface-500 text-sm text-center py-6">No task data yet</p>;
    }

    return (
        <div className="flex items-center gap-8">
            {/* SVG Donut */}
            <div className="relative w-36 h-36">
                <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
                    {data.reduce((acc: { offset: number; elements: React.ReactElement[] }, item, i) => {
                        const percentage = (item.value / total) * 100;
                        const circumference = 2 * Math.PI * 10;
                        const dashLength = (percentage / 100) * circumference;
                        const element = (
                            <circle
                                key={i}
                                cx="16"
                                cy="16"
                                r="10"
                                fill="transparent"
                                stroke={item.color}
                                strokeWidth="5"
                                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                                strokeDashoffset={-acc.offset}
                                className="transition-all duration-700"
                            />
                        );
                        return {
                            offset: acc.offset + dashLength,
                            elements: [...acc.elements, element],
                        };
                    }, { offset: 0, elements: [] }).elements}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-xl font-bold text-surface-100">{total}</p>
                        <p className="text-[10px] text-surface-400">Total</p>
                    </div>
                </div>
            </div>
            {/* Legend */}
            <div className="space-y-3">
                {data.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <div>
                            <span className="text-sm text-surface-300">{item.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-surface-100">{item.value}</span>
                                <span className="text-xs text-surface-500">
                                    ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function HorizontalBarChart({ data }: { data: { form: string; count: number }[] }) {
    const maxValue = Math.max(...data.map((d) => d.count), 1);

    const barColors = [
        'from-primary-600 to-primary-400',
        'from-emerald-600 to-emerald-400',
        'from-amber-600 to-amber-400',
        'from-blue-600 to-blue-400',
        'from-pink-600 to-pink-400',
        'from-cyan-600 to-cyan-400',
    ];

    return (
        <div className="space-y-4">
            {data.map((item, i) => (
                <div key={item.form} className="flex items-center gap-3">
                    <span className="w-36 text-sm text-surface-300 truncate">{item.form}</span>
                    <div className="flex-1 bg-surface-800 rounded-full h-5 overflow-hidden">
                        <div
                            className={cn(
                                'h-full bg-gradient-to-r rounded-full transition-all duration-700',
                                barColors[i % barColors.length]
                            )}
                            style={{ width: `${(item.count / maxValue) * 100}%` }}
                        />
                    </div>
                    <span className="w-12 text-sm font-semibold text-surface-200 text-right">{item.count}</span>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// Create Modal
// ============================================================================

function CreateReportModal({
    onClose,
    onCreate,
}: {
    onClose: () => void;
    onCreate: (name: string, type: ReportType) => void;
}) {
    const [name, setName] = useState('');
    const [type, setType] = useState<ReportType>('tabular');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-semibold text-surface-100 mb-6">Create Report</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-surface-400 mb-1.5">Report Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Monthly Workflow Summary"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-surface-400 mb-1.5">Report Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as ReportType)}
                            className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-surface-200"
                        >
                            <option value="tabular">Tabular - Row-based data table</option>
                            <option value="summary">Summary - Aggregated metrics</option>
                            <option value="matrix">Matrix - Cross-tab analysis</option>
                            <option value="custom">Custom - Flexible layout</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onCreate(name, type)} disabled={!name.trim()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create
                    </Button>
                </div>
            </div>
        </div>
    );
}
