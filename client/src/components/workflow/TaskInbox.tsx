/**
 * TaskInbox - Standalone task inbox component
 *
 * Reusable component that displays pending/claimed/completed tasks with
 * full lifecycle actions (claim, approve/reject, complete, delegate).
 * Can be used as a standalone page OR embedded inside App Builder pages.
 *
 * Enhanced with:
 * - Expandable task detail panel (description, form data, checklist)
 * - Improved "Take" (claim) UX with prominent action button
 * - Task priority and overdue indicators
 * - Workflow context (which workflow, which step)
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    CheckCircle,
    Clock,
    AlertCircle,
    ThumbsUp,
    ThumbsDown,
    Eye,
    Users,
    RefreshCw,
    Inbox,
    Filter,
    MessageSquare,
    ChevronDown,
    ChevronRight,
    FileText,
    ClipboardList,
    Calendar,
    Zap,
    Hand,
    AlertTriangle,
    Info,
} from 'lucide-react';
import {
    Button,
    Input,
    Card,
    CardHeader,
    CardContent,
    Badge,
    Modal,
    ModalFooter,
} from '../../components/ui';
import { cn } from '../../lib/utils';
import { listTasks, claimTask, completeTask, assignTask } from '../../api/workflows';
import type { Task } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface TaskInboxProps {
    /** Optional filter: only show tasks of this type */
    filterType?: 'APPROVAL' | 'FORM' | 'REVIEW' | 'ASSIGNMENT';
    /** Optional filter: only show tasks for this workflow */
    filterWorkflowId?: string;
    /** Show as compact card (for embedding) vs full page */
    compact?: boolean;
    /** Callback when a task action completes */
    onTaskAction?: (taskId: string, action: string) => void;
}

type StatusFilter = 'all' | 'PENDING' | 'CLAIMED' | 'IN_PROGRESS' | 'COMPLETED';

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'info' | 'error'; label: string }> = {
    PENDING: { variant: 'warning', label: 'Pending' },
    CLAIMED: { variant: 'info', label: 'Claimed' },
    IN_PROGRESS: { variant: 'info', label: 'In Progress' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    CANCELLED: { variant: 'error', label: 'Cancelled' },
    ESCALATED: { variant: 'error', label: 'Escalated' },
};

// ============================================================================
// Component
// ============================================================================

export function TaskInbox({
    filterType,
    filterWorkflowId,
    compact = false,
    onTaskAction,
}: TaskInboxProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [actionModal, setActionModal] = useState<{
        task: Task;
        action: 'approve' | 'reject' | 'complete' | 'delegate';
    } | null>(null);
    const [comments, setComments] = useState('');
    const [delegateUserId, setDelegateUserId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

    // Load tasks
    const loadTasks = useCallback(async () => {
        try {
            setError(null);
            const response = await listTasks({
                status: statusFilter !== 'all' ? statusFilter : undefined,
            });
            let filtered = response.items;
            if (filterType) {
                filtered = filtered.filter((t) => t.type === filterType);
            }
            if (filterWorkflowId) {
                filtered = filtered.filter((t) => (t as any).workflowId === filterWorkflowId);
            }
            setTasks(filtered);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tasks');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, filterType, filterWorkflowId]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    // Auto-refresh every 15s
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(loadTasks, 15000);
        return () => clearInterval(interval);
    }, [autoRefresh, loadTasks]);

    // Filter tasks by search
    const filteredTasks = tasks.filter((task) => {
        const matchesSearch =
            task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task as any).workflowName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    // Counts for badges
    const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
    const claimedCount = tasks.filter(
        (t) => t.status === 'CLAIMED' || t.status === 'IN_PROGRESS'
    ).length;
    const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

    // Action handlers
    const handleClaim = async (taskId: string) => {
        setClaimingTaskId(taskId);
        try {
            await claimTask(taskId);
            onTaskAction?.(taskId, 'claimed');
            await loadTasks();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to claim task');
        } finally {
            setClaimingTaskId(null);
        }
    };

    const handleComplete = async (taskId: string, outcome: string) => {
        setIsSubmitting(true);
        try {
            await completeTask(taskId, outcome, undefined, comments || undefined);
            onTaskAction?.(taskId, outcome);
            setActionModal(null);
            setComments('');
            await loadTasks();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelegate = async (taskId: string) => {
        if (!delegateUserId.trim()) return;
        setIsSubmitting(true);
        try {
            await assignTask(taskId, delegateUserId);
            onTaskAction?.(taskId, 'delegated');
            setActionModal(null);
            setDelegateUserId('');
            await loadTasks();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delegate task');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Task type icon
    const getTaskIcon = (task: Task) => {
        const isRejected = task.status === 'COMPLETED' && task.outcome === 'rejected';
        if (isRejected) return <ThumbsDown className="h-5 w-5" />;
        if (task.type === 'APPROVAL') return <ThumbsUp className="h-5 w-5" />;
        if (task.type === 'REVIEW') return <Eye className="h-5 w-5" />;
        return <ClipboardList className="h-5 w-5" />;
    };

    const getTaskIconBg = (task: Task) => {
        const isRejected = task.status === 'COMPLETED' && task.outcome === 'rejected';
        const isApproved = task.status === 'COMPLETED' && task.outcome === 'approved';
        if (isRejected) return 'bg-red-500/10 text-red-400';
        if (isApproved) return 'bg-green-500/10 text-green-400';
        if (task.status === 'COMPLETED') return 'bg-green-500/10 text-green-400';
        if (task.status === 'IN_PROGRESS' || task.status === 'CLAIMED')
            return 'bg-blue-500/10 text-blue-400';
        if (task.dueAt && new Date(task.dueAt) < new Date()) return 'bg-red-500/10 text-red-400';
        return 'bg-yellow-500/10 text-yellow-400';
    };

    // Relative time
    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        if (diff < 0) return 'just now';
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    };

    // Check if task is overdue
    const isOverdue = (task: Task) => task.dueAt && new Date(task.dueAt) < new Date();

    // Priority label
    const getPriorityLabel = (task: Task) => {
        if ((task as any).priority === 0) return { label: 'High', color: 'text-red-400 bg-red-500/10' };
        if ((task as any).priority === 1) return { label: 'Medium', color: 'text-yellow-400 bg-yellow-500/10' };
        return { label: 'Normal', color: 'text-surface-400 bg-surface-700/50' };
    };

    // Render form data fields nicely
    const renderFormData = (formData: Record<string, any>) => {
        if (!formData || Object.keys(formData).length === 0) return null;
        return (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {Object.entries(formData).map(([key, value]) => {
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                    const displayValue = Array.isArray(value)
                        ? value.join(', ')
                        : typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value);
                    return (
                        <div key={key} className="flex flex-col">
                            <span className="text-[11px] uppercase tracking-wider text-surface-500 font-medium">{label}</span>
                            <span className="text-sm text-surface-200 truncate">{displayValue}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <div className={cn('space-y-4', compact && 'space-y-3')}>
            {/* Header */}
            {!compact && (
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
                            <Inbox className="h-6 w-6 text-primary-400" />
                            Task Inbox
                        </h1>
                        <p className="mt-1 text-surface-400">
                            {pendingCount} pending · {claimedCount} in progress · {completedCount} completed
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={cn(
                                'p-2 rounded-lg transition-colors',
                                autoRefresh
                                    ? 'text-primary-400 bg-primary-500/10'
                                    : 'text-surface-400 hover:text-surface-200'
                            )}
                            title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
                        >
                            <RefreshCw className={cn('h-4 w-4', autoRefresh && 'animate-spin-slow')} />
                        </button>
                        <Button variant="secondary" size="sm" onClick={() => loadTasks()}>
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            {!compact && (
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'Pending', count: pendingCount, icon: Clock, color: 'text-yellow-400', bg: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20' },
                        { label: 'In Progress', count: claimedCount, icon: Zap, color: 'text-blue-400', bg: 'from-blue-500/10 to-blue-600/5 border-blue-500/20' },
                        { label: 'Completed', count: completedCount, icon: CheckCircle, color: 'text-green-400', bg: 'from-green-500/10 to-green-600/5 border-green-500/20' },
                        { label: 'Overdue', count: tasks.filter(t => isOverdue(t) && t.status !== 'COMPLETED').length, icon: AlertTriangle, color: 'text-red-400', bg: 'from-red-500/10 to-red-600/5 border-red-500/20' },
                    ].map(stat => (
                        <div
                            key={stat.label}
                            className={cn(
                                'px-4 py-3 rounded-xl border bg-gradient-to-br transition-all',
                                stat.bg
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-surface-400 uppercase tracking-wide">{stat.label}</span>
                                <stat.icon className={cn('h-4 w-4', stat.color)} />
                            </div>
                            <p className={cn('text-2xl font-bold mt-1', stat.color)}>{stat.count}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Search and Filters */}
            <Card>
                <CardContent className="py-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <Input
                                placeholder="Search tasks by name, description, or workflow..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                leftIcon={<Search className="h-4 w-4" />}
                            />
                        </div>
                        <div className="flex gap-1.5 items-center">
                            <Filter className="h-4 w-4 text-surface-500" />
                            {(['all', 'PENDING', 'CLAIMED', 'COMPLETED'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={cn(
                                        'px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                                        statusFilter === s
                                            ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                            : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'
                                    )}
                                >
                                    {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
                                    {s === 'PENDING' && pendingCount > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-yellow-500/20 text-yellow-400">
                                            {pendingCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error Banner */}
            {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">
                        ✕
                    </button>
                </div>
            )}

            {/* Task List */}
            <Card>
                {!compact && (
                    <CardHeader
                        title="Tasks"
                        description={`${filteredTasks.length} task${filteredTasks.length !== 1 ? 's' : ''}`}
                    />
                )}
                <div className="divide-y divide-surface-700/50">
                    {isLoading ? (
                        <div className="px-6 py-12 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent mx-auto" />
                            <p className="text-surface-400 mt-3">Loading tasks…</p>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                            <p className="text-surface-300 font-medium">All caught up!</p>
                            <p className="text-sm text-surface-500 mt-1">
                                No tasks matching your filters
                            </p>
                        </div>
                    ) : (
                        filteredTasks.map((task) => {
                            const isActionable =
                                task.status === 'PENDING' ||
                                task.status === 'CLAIMED' ||
                                task.status === 'IN_PROGRESS';
                            const isExpanded = expandedTaskId === task.id;
                            const isClaiming = claimingTaskId === task.id;
                            const overdue = isOverdue(task) && task.status !== 'COMPLETED';
                            const priority = getPriorityLabel(task);

                            return (
                                <div
                                    key={task.id}
                                    className={cn(
                                        'transition-colors',
                                        isActionable && 'hover:bg-surface-800/40',
                                        isExpanded && 'bg-surface-800/20',
                                        overdue && isActionable && 'border-l-2 border-l-red-500/60'
                                    )}
                                >
                                    {/* Main Row */}
                                    <div
                                        className="px-5 py-4 cursor-pointer"
                                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            {/* Left: icon + info */}
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                <div className={cn('p-2 rounded-lg flex-shrink-0', getTaskIconBg(task))}>
                                                    {getTaskIcon(task)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded
                                                            ? <ChevronDown className="h-4 w-4 text-surface-400 flex-shrink-0" />
                                                            : <ChevronRight className="h-4 w-4 text-surface-500 flex-shrink-0" />
                                                        }
                                                        <h4 className="font-medium text-surface-100 truncate">
                                                            {task.name}
                                                        </h4>
                                                        {overdue && (
                                                            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                OVERDUE
                                                            </span>
                                                        )}
                                                        {(task as any).priority === 0 && !overdue && (
                                                            <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                                HIGH
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5 text-sm text-surface-400 ml-6">
                                                        <span className="uppercase text-[10px] tracking-wider font-semibold text-surface-500">
                                                            {task.type || 'TASK'}
                                                        </span>
                                                        <span className="text-surface-600">·</span>
                                                        <span>{timeAgo(task.createdAt)}</span>
                                                        {(task as any).workflowName && (
                                                            <>
                                                                <span className="text-surface-600">·</span>
                                                                <span className="text-surface-500 truncate max-w-[200px]">
                                                                    {(task as any).workflowName}
                                                                </span>
                                                            </>
                                                        )}
                                                        {task.dueAt && !overdue && (
                                                            <>
                                                                <span className="text-surface-600">·</span>
                                                                <span className="flex items-center gap-1 text-yellow-400">
                                                                    <Calendar className="h-3 w-3" />
                                                                    Due {new Date(task.dueAt).toLocaleDateString()}
                                                                </span>
                                                            </>
                                                        )}
                                                        {task.dueAt && overdue && (
                                                            <>
                                                                <span className="text-surface-600">·</span>
                                                                <span className="flex items-center gap-1 text-red-400">
                                                                    <AlertCircle className="h-3 w-3" />
                                                                    Was due {new Date(task.dueAt).toLocaleDateString()}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: status + actions */}
                                            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <Badge
                                                    variant={
                                                        task.status === 'COMPLETED' && task.outcome === 'rejected'
                                                            ? 'error'
                                                            : task.status === 'COMPLETED' && task.outcome === 'approved'
                                                                ? 'success'
                                                                : statusConfig[task.status]?.variant ?? 'info'
                                                    }
                                                >
                                                    {task.status === 'COMPLETED' && task.outcome
                                                        ? task.outcome.toUpperCase()
                                                        : statusConfig[task.status]?.label ?? task.status}
                                                </Badge>

                                                {/* Take / Claim button — prominent with animation */}
                                                {task.status === 'PENDING' && (
                                                    <Button
                                                        size="sm"
                                                        className="!bg-gradient-to-r !from-primary-600 !to-violet-600 hover:!from-primary-500 hover:!to-violet-500 !border-0 !shadow-lg !shadow-primary-500/20 transition-all hover:!shadow-primary-500/40 hover:!scale-105"
                                                        onClick={() => handleClaim(task.id)}
                                                        isLoading={isClaiming}
                                                    >
                                                        <Hand className="h-3.5 w-3.5" />
                                                        Take
                                                    </Button>
                                                )}

                                                {/* Approval actions */}
                                                {(task.status === 'CLAIMED' || task.status === 'IN_PROGRESS') &&
                                                    task.type === 'APPROVAL' && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="!bg-green-500/10 !text-green-400 !border-green-500/30 hover:!bg-green-500/20"
                                                                onClick={() =>
                                                                    setActionModal({ task, action: 'approve' })
                                                                }
                                                            >
                                                                <ThumbsUp className="h-3.5 w-3.5" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="!bg-red-500/10 !text-red-400 !border-red-500/30 hover:!bg-red-500/20"
                                                                onClick={() =>
                                                                    setActionModal({ task, action: 'reject' })
                                                                }
                                                            >
                                                                <ThumbsDown className="h-3.5 w-3.5" />
                                                                Reject
                                                            </Button>
                                                            <button
                                                                onClick={() =>
                                                                    setActionModal({ task, action: 'delegate' })
                                                                }
                                                                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-colors"
                                                                title="Delegate"
                                                            >
                                                                <Users className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}

                                                {/* Review action */}
                                                {(task.status === 'CLAIMED' || task.status === 'IN_PROGRESS') &&
                                                    task.type === 'REVIEW' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                setActionModal({ task, action: 'complete' })
                                                            }
                                                        >
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                            Mark Reviewed
                                                        </Button>
                                                    )}

                                                {/* Generic complete */}
                                                {(task.status === 'CLAIMED' || task.status === 'IN_PROGRESS') &&
                                                    task.type !== 'APPROVAL' &&
                                                    task.type !== 'REVIEW' && (
                                                        <Button
                                                            size="sm"
                                                            className="!bg-gradient-to-r !from-green-600 !to-emerald-600 hover:!from-green-500 hover:!to-emerald-500 !border-0"
                                                            onClick={() =>
                                                                setActionModal({ task, action: 'complete' })
                                                            }
                                                        >
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                            Complete
                                                        </Button>
                                                    )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Detail Panel */}
                                    {isExpanded && (
                                        <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="ml-[52px] space-y-4">
                                                {/* Description */}
                                                {task.description && (
                                                    <div className="flex gap-2">
                                                        <Info className="h-4 w-4 text-surface-500 mt-0.5 flex-shrink-0" />
                                                        <p className="text-sm text-surface-300 leading-relaxed">
                                                            {task.description}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Task Details Grid */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    <div className="px-3 py-2 bg-surface-800/50 rounded-lg border border-surface-700/50">
                                                        <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium block">Status</span>
                                                        <span className="text-sm text-surface-200">{statusConfig[task.status]?.label ?? task.status}</span>
                                                    </div>
                                                    <div className="px-3 py-2 bg-surface-800/50 rounded-lg border border-surface-700/50">
                                                        <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium block">Type</span>
                                                        <span className="text-sm text-surface-200">{task.type || 'Task'}</span>
                                                    </div>
                                                    <div className="px-3 py-2 bg-surface-800/50 rounded-lg border border-surface-700/50">
                                                        <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium block">Priority</span>
                                                        <span className={cn('text-sm font-medium', priority.color.split(' ')[0])}>{priority.label}</span>
                                                    </div>
                                                    <div className="px-3 py-2 bg-surface-800/50 rounded-lg border border-surface-700/50">
                                                        <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium block">Created</span>
                                                        <span className="text-sm text-surface-200">{new Date(task.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    {task.dueAt && (
                                                        <div className={cn(
                                                            'px-3 py-2 rounded-lg border',
                                                            overdue
                                                                ? 'bg-red-500/10 border-red-500/30'
                                                                : 'bg-surface-800/50 border-surface-700/50'
                                                        )}>
                                                            <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium block">Due Date</span>
                                                            <span className={cn('text-sm', overdue ? 'text-red-400 font-medium' : 'text-surface-200')}>
                                                                {new Date(task.dueAt).toLocaleDateString()}
                                                                {overdue && ' (overdue)'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {task.completedAt && (
                                                        <div className="px-3 py-2 bg-surface-800/50 rounded-lg border border-surface-700/50">
                                                            <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium block">Completed</span>
                                                            <span className="text-sm text-green-400">{new Date(task.completedAt).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                    {task.outcome && (
                                                        <div className="px-3 py-2 bg-surface-800/50 rounded-lg border border-surface-700/50">
                                                            <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium block">Outcome</span>
                                                            <span className={cn(
                                                                'text-sm font-medium capitalize',
                                                                task.outcome === 'approved' ? 'text-green-400'
                                                                    : task.outcome === 'rejected' ? 'text-red-400'
                                                                        : 'text-surface-200'
                                                            )}>{task.outcome}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Form Data / Requirements */}
                                                {(task as any).formData && Object.keys((task as any).formData).length > 0 && (
                                                    <div className="bg-surface-800/30 border border-surface-700/50 rounded-lg p-4">
                                                        <h5 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                            <FileText className="h-3.5 w-3.5 text-primary-400" />
                                                            Task Requirements
                                                        </h5>
                                                        {renderFormData((task as any).formData)}
                                                    </div>
                                                )}

                                                {/* Comments (if completed with comments) */}
                                                {(task as any).comments && (
                                                    <div className="bg-surface-800/30 border border-surface-700/50 rounded-lg p-4">
                                                        <h5 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                            <MessageSquare className="h-3.5 w-3.5 text-primary-400" />
                                                            Comments
                                                        </h5>
                                                        <p className="text-sm text-surface-300 italic">"{(task as any).comments}"</p>
                                                    </div>
                                                )}

                                                {/* Action buttons row at bottom of expanded panel */}
                                                {isActionable && (
                                                    <div className="flex items-center gap-2 pt-2 border-t border-surface-700/50">
                                                        {task.status === 'PENDING' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    className="!bg-gradient-to-r !from-primary-600 !to-violet-600 hover:!from-primary-500 hover:!to-violet-500 !border-0 !shadow-lg !shadow-primary-500/20"
                                                                    onClick={() => handleClaim(task.id)}
                                                                    isLoading={isClaiming}
                                                                >
                                                                    <Hand className="h-4 w-4" />
                                                                    Take This Task
                                                                </Button>
                                                                <span className="text-xs text-surface-500">
                                                                    Claim this task to start working on it
                                                                </span>
                                                            </>
                                                        )}
                                                        {(task.status === 'CLAIMED' || task.status === 'IN_PROGRESS') && task.type === 'APPROVAL' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    className="!bg-green-600 hover:!bg-green-500 !border-0"
                                                                    onClick={() => setActionModal({ task, action: 'approve' })}
                                                                >
                                                                    <ThumbsUp className="h-4 w-4" />
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="danger"
                                                                    onClick={() => setActionModal({ task, action: 'reject' })}
                                                                >
                                                                    <ThumbsDown className="h-4 w-4" />
                                                                    Reject
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => setActionModal({ task, action: 'delegate' })}
                                                                >
                                                                    <Users className="h-4 w-4" />
                                                                    Delegate
                                                                </Button>
                                                            </>
                                                        )}
                                                        {(task.status === 'CLAIMED' || task.status === 'IN_PROGRESS') && task.type !== 'APPROVAL' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    className="!bg-gradient-to-r !from-green-600 !to-emerald-600 hover:!from-green-500 hover:!to-emerald-500 !border-0"
                                                                    onClick={() => setActionModal({ task, action: 'complete' })}
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
                                                                    Mark Complete
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => setActionModal({ task, action: 'delegate' })}
                                                                >
                                                                    <Users className="h-4 w-4" />
                                                                    Delegate
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </Card>

            {/* Action Confirmation Modal */}
            {actionModal && (
                <Modal
                    isOpen={!!actionModal}
                    onClose={() => {
                        setActionModal(null);
                        setComments('');
                        setDelegateUserId('');
                    }}
                    title={
                        actionModal.action === 'approve'
                            ? 'Approve Task'
                            : actionModal.action === 'reject'
                                ? 'Reject Task'
                                : actionModal.action === 'delegate'
                                    ? 'Delegate Task'
                                    : 'Complete Task'
                    }
                    description={`${actionModal.task.name}`}
                >
                    <div className="space-y-4 py-2">
                        {/* Task summary in modal */}
                        {actionModal.task.description && (
                            <div className="bg-surface-800/50 border border-surface-700/50 rounded-lg p-3">
                                <p className="text-sm text-surface-300">{actionModal.task.description}</p>
                            </div>
                        )}

                        {actionModal.action === 'delegate' ? (
                            <Input
                                label="Delegate to User ID"
                                placeholder="Enter user ID to delegate to..."
                                value={delegateUserId}
                                onChange={(e) => setDelegateUserId(e.target.value)}
                            />
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-surface-200 mb-1.5">
                                    <MessageSquare className="h-4 w-4 inline mr-1" />
                                    Comments {actionModal.action === 'reject' ? '(recommended)' : '(optional)'}
                                </label>
                                <textarea
                                    className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors resize-none"
                                    rows={3}
                                    placeholder={
                                        actionModal.action === 'reject'
                                            ? 'Please provide a reason for rejection...'
                                            : 'Add any comments...'
                                    }
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                    <ModalFooter>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setActionModal(null);
                                setComments('');
                                setDelegateUserId('');
                            }}
                        >
                            Cancel
                        </Button>
                        {actionModal.action === 'delegate' ? (
                            <Button
                                onClick={() => handleDelegate(actionModal.task.id)}
                                isLoading={isSubmitting}
                            >
                                <Users className="h-4 w-4" />
                                Delegate
                            </Button>
                        ) : actionModal.action === 'approve' ? (
                            <Button
                                className="!bg-green-600 hover:!bg-green-700"
                                onClick={() => handleComplete(actionModal.task.id, 'approved')}
                                isLoading={isSubmitting}
                            >
                                <ThumbsUp className="h-4 w-4" />
                                Approve
                            </Button>
                        ) : actionModal.action === 'reject' ? (
                            <Button
                                variant="danger"
                                onClick={() => handleComplete(actionModal.task.id, 'rejected')}
                                isLoading={isSubmitting}
                            >
                                <ThumbsDown className="h-4 w-4" />
                                Reject
                            </Button>
                        ) : (
                            <Button
                                onClick={() =>
                                    handleComplete(
                                        actionModal.task.id,
                                        actionModal.task.type === 'REVIEW' ? 'reviewed' : 'completed'
                                    )
                                }
                                isLoading={isSubmitting}
                            >
                                <CheckCircle className="h-4 w-4" />
                                Complete
                            </Button>
                        )}
                    </ModalFooter>
                </Modal>
            )}
        </div>
    );
}
