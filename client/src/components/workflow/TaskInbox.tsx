/**
 * TaskInbox - Standalone task inbox component
 *
 * Reusable component that displays pending/claimed/completed tasks with
 * full lifecycle actions (claim, approve/reject, complete, delegate).
 * Can be used as a standalone page OR embedded inside App Builder pages.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    CheckCircle,
    Clock,
    AlertCircle,
    ThumbsUp,
    ThumbsDown,
    UserCheck,
    Eye,
    Users,
    ArrowRight,
    RefreshCw,
    Inbox,
    Filter,
    MessageSquare,
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
            (task as any).workflowName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    // Counts for badges
    const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
    const claimedCount = tasks.filter(
        (t) => t.status === 'CLAIMED' || t.status === 'IN_PROGRESS'
    ).length;

    // Action handlers
    const handleClaim = async (taskId: string) => {
        try {
            await claimTask(taskId);
            onTaskAction?.(taskId, 'claimed');
            await loadTasks();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to claim task');
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
        return <Clock className="h-5 w-5" />;
    };

    const getTaskIconBg = (task: Task) => {
        const isRejected = task.status === 'COMPLETED' && task.outcome === 'rejected';
        const isApproved = task.status === 'COMPLETED' && task.outcome === 'approved';
        if (isRejected) return 'bg-red-500/10 text-red-400';
        if (isApproved) return 'bg-green-500/10 text-green-400';
        if (task.status === 'COMPLETED') return 'bg-green-500/10 text-green-400';
        if (task.status === 'IN_PROGRESS' || task.status === 'CLAIMED')
            return 'bg-blue-500/10 text-blue-400';
        return 'bg-yellow-500/10 text-yellow-400';
    };

    // Relative time
    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
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
                            {pendingCount} pending · {claimedCount} in progress
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

            {/* Search and Filters */}
            <Card>
                <CardContent className="py-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <Input
                                placeholder="Search tasks..."
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

                            return (
                                <div
                                    key={task.id}
                                    className={cn(
                                        'px-5 py-4 transition-colors',
                                        isActionable && 'hover:bg-surface-800/40'
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Left: icon + info */}
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className={cn('p-2 rounded-lg flex-shrink-0', getTaskIconBg(task))}>
                                                {getTaskIcon(task)}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-medium text-surface-100 truncate">
                                                    {task.name}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5 text-sm text-surface-400">
                                                    <span className="uppercase text-[10px] tracking-wider font-semibold text-surface-500">
                                                        {task.type}
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
                                                </div>
                                                {/* Due date warning */}
                                                {task.dueAt && new Date(task.dueAt) < new Date() && (
                                                    <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Overdue · was due {new Date(task.dueAt).toLocaleDateString()}
                                                    </div>
                                                )}
                                                {task.dueAt && new Date(task.dueAt) >= new Date() && (
                                                    <div className="flex items-center gap-1 mt-1 text-xs text-yellow-400">
                                                        <Clock className="h-3 w-3" />
                                                        Due {new Date(task.dueAt).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: status + actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
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

                                            {/* Claim button */}
                                            {task.status === 'PENDING' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleClaim(task.id)}
                                                >
                                                    <UserCheck className="h-3.5 w-3.5" />
                                                    Claim
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
                                                        onClick={() =>
                                                            setActionModal({ task, action: 'complete' })
                                                        }
                                                    >
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                        Complete
                                                    </Button>
                                                )}
                                        </div>
                                    </div>
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
                                    Comments (optional)
                                </label>
                                <textarea
                                    className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors resize-none"
                                    rows={3}
                                    placeholder="Add any comments..."
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
