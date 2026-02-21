/**
 * TaskInbox - Standalone task inbox component
 *
 * Reusable component that displays pending/claimed/completed tasks with
 * full lifecycle actions (claim, approve/reject, complete, delegate).
 * Can be used as a standalone page OR embedded inside App Builder pages.
 *
 * Enhanced with:
 * - Take confirmation modal with requirements preview
 * - Expandable task detail panel (description, form data, checklist)
 * - Post-claim auto-expansion with next-step guidance
 * - Improved "Take" (claim) UX with prominent action button
 * - Task priority and overdue indicators
 * - Workflow context (which workflow, which step)
 * - Requirements checklist with interactive formatting
 * - Monetary value highlighting
 * - Smart sorting (overdue → high priority → due soon → rest)
 * - Batch selection and bulk claim
 * - SLA / time-remaining indicator
 * - Requirement completion validation before task completion
 * - Contract-aware value rendering (dates, parties, amounts)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
    ArrowRight,
    DollarSign,
    Hash,
    Tag,
    Sparkles,
    CheckSquare,
    Square,
    ListChecks,
    Clock3,
    Shield,
    ArrowUpDown,
    SquareCheck,
    Paperclip,
    UserCircle2,
    Plane,
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
type SortBy = 'urgency' | 'newest' | 'oldest' | 'name';

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'info' | 'error'; label: string }> = {
    PENDING: { variant: 'warning', label: 'Pending' },
    CLAIMED: { variant: 'info', label: 'Claimed' },
    IN_PROGRESS: { variant: 'info', label: 'In Progress' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    CANCELLED: { variant: 'error', label: 'Cancelled' },
    ESCALATED: { variant: 'error', label: 'Escalated' },
};

const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'urgency', label: 'Urgency' },
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'name', label: 'Name' },
];

// ============================================================================
// Helpers
// ============================================================================

/** Detect if a value looks like a monetary amount */
const isMonetary = (key: string, value: unknown): boolean => {
    const moneyKeys = ['amount', 'total', 'price', 'cost', 'subtotal', 'tax', 'shipping', 'variance', 'budget', 'value', 'fee'];
    return moneyKeys.some(k => key.toLowerCase().includes(k)) && typeof value === 'number';
};

/** Detect if a value looks like a date */
const isDateValue = (key: string, value: unknown): boolean => {
    const dateKeys = ['date', 'start', 'end', 'expires', 'expiry', 'effective', 'signed', 'created', 'deadline', 'renewal'];
    if (typeof value === 'string' && dateKeys.some(k => key.toLowerCase().includes(k))) {
        return !isNaN(Date.parse(value));
    }
    return false;
};

/** Detect party/person fields */
const isPartyField = (key: string): boolean => {
    const partyKeys = ['vendor', 'supplier', 'client', 'party', 'owner', 'manager', 'contact', 'assignee', 'requestor', 'approver'];
    return partyKeys.some(k => key.toLowerCase().includes(k));
};

/** Detect attachment/file fields */
const isAttachmentField = (key: string, value: unknown): boolean => {
    const attachKeys = ['attach', 'file', 'document', 'report', 'upload', 'pdf'];
    if (attachKeys.some(k => key.toLowerCase().includes(k))) return true;
    if (typeof value === 'string' && /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|zip|png|jpg)$/i.test(value)) return true;
    return false;
};

/** Detect employee/initiator/person name fields */
const isEmployeeField = (key: string): boolean => {
    const empKeys = ['initiator', 'employee', 'name', 'fullname', 'submitter', 'applicant', 'traveler'];
    return empKeys.some(k => key.toLowerCase().includes(k)) && !key.toLowerCase().includes('company');
};

/** Detect travel/trip date pair fields */
const isTravelField = (key: string): boolean => {
    const travelKeys = ['arrival', 'departure', 'trip', 'travel', 'flight', 'dispatched', 'destination', 'scope'];
    return travelKeys.some(k => key.toLowerCase().includes(k));
};

/** Format a monetary value */
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

/** Format a date value */
const formatDate = (value: string): string => {
    try {
        return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return value;
    }
};

/** Prettify a camelCase/snake_case key into a label */
const prettifyKey = (key: string): string =>
    key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();

/** Calculate SLA time remaining as a human-readable string */
const getSlaInfo = (dueAt: string | null | undefined): { text: string; urgency: 'overdue' | 'critical' | 'warning' | 'ok' | 'none' } => {
    if (!dueAt) return { text: '', urgency: 'none' };
    const now = Date.now();
    const due = new Date(dueAt).getTime();
    const diffMs = due - now;
    const absDiffMs = Math.abs(diffMs);

    const hours = Math.floor(absDiffMs / 3600000);
    const days = Math.floor(hours / 24);
    const remainingHrs = hours % 24;

    if (diffMs < 0) {
        // Overdue
        if (days > 0) return { text: `${days}d ${remainingHrs}h overdue`, urgency: 'overdue' };
        if (hours > 0) return { text: `${hours}h overdue`, urgency: 'overdue' };
        return { text: `${Math.floor(absDiffMs / 60000)}m overdue`, urgency: 'overdue' };
    }

    // Remaining
    if (days > 0) {
        if (days <= 1) return { text: `${days}d ${remainingHrs}h left`, urgency: 'warning' };
        return { text: `${days}d left`, urgency: days <= 3 ? 'warning' : 'ok' };
    }
    if (hours > 0) return { text: `${hours}h left`, urgency: hours <= 4 ? 'critical' : 'warning' };
    return { text: `${Math.floor(diffMs / 60000)}m left`, urgency: 'critical' };
};

/** Smart sort: overdue first → high priority → due soon → rest */
const smartSort = (tasks: Task[], sortBy: SortBy): Task[] => {
    const sorted = [...tasks];
    switch (sortBy) {
        case 'urgency':
            return sorted.sort((a, b) => {
                // Completed tasks go to the bottom
                if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
                if (b.status === 'COMPLETED' && a.status !== 'COMPLETED') return -1;

                const now = Date.now();
                const aOverdue = a.dueAt ? new Date(a.dueAt).getTime() < now : false;
                const bOverdue = b.dueAt ? new Date(b.dueAt).getTime() < now : false;

                // Overdue first
                if (aOverdue && !bOverdue) return -1;
                if (bOverdue && !aOverdue) return 1;

                // Both overdue: more overdue first
                if (aOverdue && bOverdue) {
                    return new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime();
                }

                // High priority (0) before others
                const aPri = (a as any).priority ?? 99;
                const bPri = (b as any).priority ?? 99;
                if (aPri !== bPri) return aPri - bPri;

                // Due sooner first
                if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
                if (a.dueAt && !b.dueAt) return -1;
                if (!a.dueAt && b.dueAt) return 1;

                // Newest first as tiebreaker
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        case 'newest':
            return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        case 'oldest':
            return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'name':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        default:
            return sorted;
    }
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
    const [sortBy, setSortBy] = useState<SortBy>('urgency');
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

    // Take confirmation modal state
    const [takeModal, setTakeModal] = useState<Task | null>(null);
    // Recently claimed task (for post-claim guidance)
    const [justClaimedId, setJustClaimedId] = useState<string | null>(null);
    // Checked requirements (local UI state, not persisted)
    const [checkedRequirements, setCheckedRequirements] = useState<Set<string>>(new Set());
    // Batch selection
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [isBatchClaiming, setIsBatchClaiming] = useState(false);
    // Completion validation warning
    const [completionWarning, setCompletionWarning] = useState<{
        task: Task;
        action: string;
        checked: number;
        total: number;
    } | null>(null);

    const taskListRef = useRef<HTMLDivElement>(null);

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

    // Filter + sort tasks
    const filteredTasks = smartSort(
        tasks.filter((task) => {
            const matchesSearch =
                task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task as any).workflowName?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        }),
        sortBy
    );

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
            setTakeModal(null);
            setJustClaimedId(taskId);
            setExpandedTaskId(taskId); // Auto-expand after claim
            setSelectedTaskIds(prev => { const next = new Set(prev); next.delete(taskId); return next; });
            await loadTasks();
            // Auto-clear the just-claimed banner after 8 seconds
            setTimeout(() => setJustClaimedId(prev => prev === taskId ? null : prev), 8000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to claim task');
        } finally {
            setClaimingTaskId(null);
        }
    };

    // Batch claim
    const handleBatchClaim = async () => {
        setIsBatchClaiming(true);
        const ids = Array.from(selectedTaskIds);
        let claimed = 0;
        for (const taskId of ids) {
            try {
                await claimTask(taskId);
                onTaskAction?.(taskId, 'claimed');
                claimed++;
            } catch {
                // Continue claiming others
            }
        }
        setSelectedTaskIds(new Set());
        setIsBatchClaiming(false);
        if (claimed > 0) {
            setJustClaimedId(ids[0]); // Highlight first
            setExpandedTaskId(ids[0]);
            await loadTasks();
            setTimeout(() => setJustClaimedId(null), 8000);
        }
    };

    // Toggle task selection for batch operations
    const toggleTaskSelection = (taskId: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    // Select all pending tasks
    const selectAllPending = () => {
        const pendingIds = filteredTasks.filter(t => t.status === 'PENDING').map(t => t.id);
        if (selectedTaskIds.size === pendingIds.length && pendingIds.every(id => selectedTaskIds.has(id))) {
            setSelectedTaskIds(new Set()); // Deselect all
        } else {
            setSelectedTaskIds(new Set(pendingIds));
        }
    };

    const handleComplete = async (taskId: string, outcome: string) => {
        setIsSubmitting(true);
        try {
            await completeTask(taskId, outcome, undefined, comments || undefined);
            onTaskAction?.(taskId, outcome);
            setActionModal(null);
            setCompletionWarning(null);
            setComments('');
            setJustClaimedId(null);
            await loadTasks();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete task');
        } finally {
            setIsSubmitting(false);
        }
    };

    /** Open action modal with completion validation */
    const openActionWithValidation = (task: Task, action: 'approve' | 'reject' | 'complete' | 'delegate') => {
        // Check requirement completion for non-delegate actions
        if (action !== 'delegate' && task.formData && Object.keys(task.formData).length > 0) {
            const total = Object.keys(task.formData).length;
            const checked = Object.keys(task.formData).filter(k => checkedRequirements.has(`${task.id}:${k}`)).length;
            if (checked < total) {
                setCompletionWarning({ task, action, checked, total });
                return;
            }
        }
        setActionModal({ task, action });
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

    // Toggle requirement checkbox
    const toggleRequirement = (taskId: string, key: string) => {
        const id = `${taskId}:${key}`;
        setCheckedRequirements(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
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

    // Render form data fields with enhanced contract-aware formatting
    const renderRequirementsChecklist = (formData: Record<string, any>, taskId: string, interactive = true) => {
        if (!formData || Object.keys(formData).length === 0) return null;
        const entries = Object.entries(formData);
        return (
            <div className="space-y-1.5">
                {entries.map(([key, value]) => {
                    const label = prettifyKey(key);
                    const isMoney = isMonetary(key, value);
                    const isDate = isDateValue(key, value);
                    const isParty = isPartyField(key);
                    const isAttach = isAttachmentField(key, value);
                    const isEmployee = !isParty && isEmployeeField(key);
                    const isTravel = !isDate && isTravelField(key);
                    const displayValue = isMoney
                        ? formatCurrency(value as number)
                        : isDate
                            ? formatDate(value as string)
                            : isAttach && typeof value === 'string'
                                ? `📎 ${value}`
                                : Array.isArray(value)
                                    ? value.join(', ')
                                    : typeof value === 'object'
                                        ? JSON.stringify(value)
                                        : String(value);
                    const checkId = `${taskId}:${key}`;
                    const isChecked = checkedRequirements.has(checkId);

                    // Context-aware icon
                    const ValueIcon = isMoney ? DollarSign
                        : isAttach ? Paperclip
                            : isEmployee ? UserCircle2
                                : isTravel ? Plane
                                    : isDate ? Calendar
                                        : isParty ? Shield
                                            : typeof value === 'number' ? Hash : Tag;

                    const valueColor = isMoney ? 'text-emerald-400'
                        : isAttach ? 'text-amber-400'
                            : isEmployee ? 'text-cyan-400'
                                : isTravel ? 'text-sky-400'
                                    : isDate ? 'text-blue-400'
                                        : isParty ? 'text-violet-400'
                                            : 'text-surface-500';

                    const textColor = isMoney ? 'text-emerald-300 font-semibold'
                        : isAttach ? 'text-amber-300 underline'
                            : isEmployee ? 'text-cyan-300 font-medium'
                                : isTravel ? 'text-sky-300'
                                    : isDate ? 'text-blue-300'
                                        : isParty ? 'text-violet-300 font-medium'
                                            : 'text-surface-200';

                    return (
                        <div
                            key={key}
                            className={cn(
                                'flex items-start gap-2.5 px-3 py-2 rounded-lg transition-all cursor-pointer group',
                                isChecked
                                    ? 'bg-green-500/5 border border-green-500/20'
                                    : isMoney ? 'bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30'
                                        : isAttach ? 'bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/30'
                                            : isEmployee ? 'bg-cyan-500/5 border border-cyan-500/10 hover:border-cyan-500/30'
                                                : isTravel ? 'bg-sky-500/5 border border-sky-500/10 hover:border-sky-500/30'
                                                    : isDate ? 'bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30'
                                                        : isParty ? 'bg-violet-500/5 border border-violet-500/10 hover:border-violet-500/30'
                                                            : 'bg-surface-800/30 border border-surface-700/30 hover:border-surface-600/50'
                            )}
                            onClick={() => interactive && toggleRequirement(taskId, key)}
                        >
                            {interactive && (
                                <div className="mt-0.5 flex-shrink-0">
                                    {isChecked ? (
                                        <CheckSquare className="h-4 w-4 text-green-400" />
                                    ) : (
                                        <Square className="h-4 w-4 text-surface-500 group-hover:text-surface-300" />
                                    )}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <span className="text-[11px] uppercase tracking-wider text-surface-500 font-medium">
                                    {label}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <ValueIcon className={cn('h-3.5 w-3.5 flex-shrink-0', valueColor)} />
                                    <span className={cn(
                                        'text-sm truncate',
                                        textColor,
                                        isChecked && 'line-through text-surface-500'
                                    )}>
                                        {displayValue}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    /** Render requirements as a compact preview (for Take modal) */
    const renderRequirementsPreview = (formData: Record<string, any>) => {
        if (!formData || Object.keys(formData).length === 0) return null;
        return (
            <div className="grid grid-cols-2 gap-2">
                {Object.entries(formData).map(([key, value]) => {
                    const label = prettifyKey(key);
                    const isMoney = isMonetary(key, value);
                    const isDate = isDateValue(key, value);
                    const isParty = isPartyField(key);
                    const displayValue = isMoney
                        ? formatCurrency(value as number)
                        : isDate
                            ? formatDate(value as string)
                            : Array.isArray(value)
                                ? value.join(', ')
                                : typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value);

                    const bgClass = isMoney ? 'bg-emerald-500/10 border-emerald-500/20'
                        : isDate ? 'bg-blue-500/10 border-blue-500/20'
                            : isParty ? 'bg-violet-500/10 border-violet-500/20'
                                : 'bg-surface-800/50 border-surface-700/50';

                    const textClass = isMoney ? 'text-emerald-300 font-bold'
                        : isDate ? 'text-blue-300'
                            : isParty ? 'text-violet-300 font-medium'
                                : 'text-surface-200';

                    return (
                        <div key={key} className={cn('px-3 py-2 rounded-lg border', bgClass)}>
                            <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium block">
                                {label}
                            </span>
                            <span className={cn('text-sm', textClass)}>
                                {displayValue}
                            </span>
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

            {/* Search, Filters, Sort */}
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
                            {/* Sort selector */}
                            <span className="text-surface-600 mx-1">|</span>
                            <ArrowUpDown className="h-3.5 w-3.5 text-surface-500" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortBy)}
                                className="text-xs font-medium bg-transparent text-surface-300 border-none outline-none cursor-pointer"
                            >
                                {sortOptions.map(opt => (
                                    <option key={opt.value} value={opt.value} className="bg-surface-800">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Batch Actions Toolbar */}
            {selectedTaskIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-500/10 border border-primary-500/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                    <SquareCheck className="h-4 w-4 text-primary-400" />
                    <span className="text-sm font-medium text-primary-300">
                        {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                        size="sm"
                        className="!bg-gradient-to-r !from-primary-600 !to-violet-600 hover:!from-primary-500 hover:!to-violet-500 !border-0 !shadow-lg !shadow-primary-500/20"
                        onClick={handleBatchClaim}
                        isLoading={isBatchClaiming}
                    >
                        <ListChecks className="h-3.5 w-3.5" />
                        Claim Selected
                    </Button>
                    <button
                        onClick={selectAllPending}
                        className="text-xs text-surface-400 hover:text-surface-200 transition-colors ml-auto"
                    >
                        {selectedTaskIds.size === filteredTasks.filter(t => t.status === 'PENDING').length
                            ? 'Deselect All'
                            : 'Select All Pending'}
                    </button>
                    <button
                        onClick={() => setSelectedTaskIds(new Set())}
                        className="text-xs text-surface-400 hover:text-red-400 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            )}

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
                <div className="divide-y divide-surface-700/50" ref={taskListRef}>
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
                            const overdue = isOverdue(task) && task.status !== 'COMPLETED';
                            const priority = getPriorityLabel(task);
                            const wasJustClaimed = justClaimedId === task.id;
                            const reqCount = task.formData ? Object.keys(task.formData).length : 0;
                            const checkedCount = task.formData
                                ? Object.keys(task.formData).filter(k => checkedRequirements.has(`${task.id}:${k}`)).length
                                : 0;
                            const sla = getSlaInfo(task.dueAt);
                            const isSelected = selectedTaskIds.has(task.id);

                            return (
                                <div
                                    key={task.id}
                                    className={cn(
                                        'transition-all',
                                        isActionable && 'hover:bg-surface-800/40',
                                        isExpanded && 'bg-surface-800/20',
                                        overdue && isActionable && 'border-l-2 border-l-red-500/60',
                                        wasJustClaimed && 'border-l-2 border-l-green-500/60 bg-green-500/5',
                                        isSelected && 'bg-primary-500/5 border-l-2 border-l-primary-500/60'
                                    )}
                                >
                                    {/* Just-claimed success banner */}
                                    {wasJustClaimed && (
                                        <div className="px-5 pt-3 pb-0">
                                            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                <Sparkles className="h-4 w-4 flex-shrink-0" />
                                                <span className="font-medium">Task claimed!</span>
                                                <span className="text-green-500">
                                                    {task.type === 'APPROVAL'
                                                        ? 'Review the details below then approve or reject.'
                                                        : 'Review the requirements below and complete when done.'}
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setJustClaimedId(null); }}
                                                    className="ml-auto text-green-500 hover:text-green-300 text-xs"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Main Row */}
                                    <div
                                        className="px-5 py-4 cursor-pointer"
                                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            {/* Left: icon + info */}
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                {/* Batch selection checkbox */}
                                                {task.status === 'PENDING' && (
                                                    <div
                                                        className="mt-2 flex-shrink-0 cursor-pointer"
                                                        onClick={(e) => { e.stopPropagation(); toggleTaskSelection(task.id); }}
                                                    >
                                                        {isSelected ? (
                                                            <SquareCheck className="h-4 w-4 text-primary-400" />
                                                        ) : (
                                                            <Square className="h-4 w-4 text-surface-600 hover:text-surface-400 transition-colors" />
                                                        )}
                                                    </div>
                                                )}
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
                                                    <div className="flex items-center gap-2 mt-0.5 text-sm text-surface-400 ml-6 overflow-hidden">
                                                        <span className="uppercase text-[10px] tracking-wider font-semibold text-surface-500 whitespace-nowrap">
                                                            {task.type || 'TASK'}
                                                        </span>
                                                        <span className="text-surface-600">·</span>
                                                        <span className="whitespace-nowrap">{timeAgo(task.createdAt)}</span>
                                                        {(task as any).workflowName && (
                                                            <>
                                                                <span className="text-surface-600">·</span>
                                                                <span className="text-surface-500 truncate max-w-[180px] inline-block align-bottom">
                                                                    {(task as any).workflowName}
                                                                </span>
                                                            </>
                                                        )}
                                                        {task.dueAt && !overdue && (
                                                            <>
                                                                <span className="text-surface-600">·</span>
                                                                <span className="flex items-center gap-1 text-yellow-400 whitespace-nowrap">
                                                                    <Calendar className="h-3 w-3 flex-shrink-0" />
                                                                    Due {new Date(task.dueAt).toLocaleDateString()}
                                                                </span>
                                                            </>
                                                        )}
                                                        {task.dueAt && overdue && (
                                                            <>
                                                                <span className="text-surface-600">·</span>
                                                                <span className="flex items-center gap-1 text-red-400 whitespace-nowrap">
                                                                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                                                    Was due {new Date(task.dueAt).toLocaleDateString()}
                                                                </span>
                                                            </>
                                                        )}
                                                        {/* Requirements progress indicator */}
                                                        {reqCount > 0 && (task.status === 'CLAIMED' || task.status === 'IN_PROGRESS') && (
                                                            <>
                                                                <span className="text-surface-600">·</span>
                                                                <span className={cn(
                                                                    'flex items-center gap-1 text-xs',
                                                                    checkedCount === reqCount ? 'text-green-400' : 'text-surface-500'
                                                                )}>
                                                                    <CheckSquare className="h-3 w-3" />
                                                                    {checkedCount}/{reqCount}
                                                                </span>
                                                            </>
                                                        )}
                                                        {/* SLA indicator */}
                                                        {sla.urgency !== 'none' && task.status !== 'COMPLETED' && (
                                                            <>
                                                                <span className="text-surface-600">·</span>
                                                                <span className={cn(
                                                                    'flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap',
                                                                    sla.urgency === 'overdue' ? 'text-red-400 bg-red-500/10'
                                                                        : sla.urgency === 'critical' ? 'text-orange-400 bg-orange-500/10'
                                                                            : sla.urgency === 'warning' ? 'text-yellow-400 bg-yellow-500/10'
                                                                                : 'text-surface-400 bg-surface-700/50'
                                                                )}>
                                                                    <Clock3 className="h-3 w-3 flex-shrink-0" />
                                                                    {sla.text}
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

                                                {/* Take / Claim button — opens confirmation modal */}
                                                {task.status === 'PENDING' && (
                                                    <Button
                                                        size="sm"
                                                        className="!bg-gradient-to-r !from-primary-600 !to-violet-600 hover:!from-primary-500 hover:!to-violet-500 !border-0 !shadow-lg !shadow-primary-500/20 transition-all hover:!shadow-primary-500/40 hover:!scale-105"
                                                        onClick={() => setTakeModal(task)}
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
                                                                    openActionWithValidation(task, 'approve')
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
                                                                    openActionWithValidation(task, 'reject')
                                                                }
                                                            >
                                                                <ThumbsDown className="h-3.5 w-3.5" />
                                                                Reject
                                                            </Button>
                                                            <button
                                                                onClick={() =>
                                                                    openActionWithValidation(task, 'delegate')
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
                                                                openActionWithValidation(task, 'complete')
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
                                                                openActionWithValidation(task, 'complete')
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

                                                {/* Requirements Checklist */}
                                                {task.formData && Object.keys(task.formData).length > 0 && (
                                                    <div className="bg-surface-800/30 border border-surface-700/50 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h5 className="text-xs font-semibold text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
                                                                <FileText className="h-3.5 w-3.5 text-primary-400" />
                                                                Task Requirements
                                                            </h5>
                                                            {(task.status === 'CLAIMED' || task.status === 'IN_PROGRESS') && reqCount > 0 && (
                                                                <span className={cn(
                                                                    'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                                                                    checkedCount === reqCount
                                                                        ? 'bg-green-500/20 text-green-400'
                                                                        : 'bg-surface-700/50 text-surface-400'
                                                                )}>
                                                                    {checkedCount}/{reqCount} verified
                                                                </span>
                                                            )}
                                                        </div>
                                                        {renderRequirementsChecklist(
                                                            task.formData,
                                                            task.id,
                                                            task.status === 'CLAIMED' || task.status === 'IN_PROGRESS'
                                                        )}
                                                        {/* Progress bar for requirements */}
                                                        {(task.status === 'CLAIMED' || task.status === 'IN_PROGRESS') && reqCount > 0 && (
                                                            <div className="mt-3 pt-3 border-t border-surface-700/30">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 h-1.5 bg-surface-700/50 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={cn(
                                                                                'h-full rounded-full transition-all duration-500',
                                                                                checkedCount === reqCount
                                                                                    ? 'bg-green-500'
                                                                                    : 'bg-gradient-to-r from-primary-500 to-violet-500'
                                                                            )}
                                                                            style={{ width: `${(checkedCount / reqCount) * 100}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] text-surface-500 font-medium">
                                                                        {Math.round((checkedCount / reqCount) * 100)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
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
                                                                    onClick={() => setTakeModal(task)}
                                                                >
                                                                    <Hand className="h-4 w-4" />
                                                                    Take This Task
                                                                </Button>
                                                                <span className="text-xs text-surface-500">
                                                                    Review requirements and claim this task
                                                                </span>
                                                            </>
                                                        )}
                                                        {(task.status === 'CLAIMED' || task.status === 'IN_PROGRESS') && task.type === 'APPROVAL' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    className="!bg-green-600 hover:!bg-green-500 !border-0"
                                                                    onClick={() => openActionWithValidation(task, 'approve')}
                                                                >
                                                                    <ThumbsUp className="h-4 w-4" />
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="danger"
                                                                    onClick={() => openActionWithValidation(task, 'reject')}
                                                                >
                                                                    <ThumbsDown className="h-4 w-4" />
                                                                    Reject
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => openActionWithValidation(task, 'delegate')}
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
                                                                    onClick={() => openActionWithValidation(task, 'complete')}
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
                                                                    Mark Complete
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => openActionWithValidation(task, 'delegate')}
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

            {/* ================================================================
                Take Confirmation Modal — shows requirements before claiming
               ================================================================ */}
            {takeModal && (
                <Modal
                    isOpen={!!takeModal}
                    onClose={() => setTakeModal(null)}
                    title="Take Task"
                    description="Review the task details before claiming it"
                >
                    <div className="space-y-4 py-2">
                        {/* Task Info Header */}
                        <div className="flex items-start gap-3 px-4 py-3 bg-surface-800/50 border border-surface-700/50 rounded-xl">
                            <div className={cn('p-2.5 rounded-lg flex-shrink-0', getTaskIconBg(takeModal))}>
                                {getTaskIcon(takeModal)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-surface-100 text-base">{takeModal.name}</h3>
                                <div className="flex items-center gap-2 mt-1 text-sm text-surface-400">
                                    <Badge variant={statusConfig[takeModal.type]?.variant ?? 'info'} className="!text-[10px]">
                                        {takeModal.type || 'TASK'}
                                    </Badge>
                                    {(takeModal as any).workflowName && (
                                        <span className="text-surface-500">{(takeModal as any).workflowName}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {takeModal.description && (
                            <div className="flex gap-2 px-1">
                                <Info className="h-4 w-4 text-surface-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-surface-300 leading-relaxed">
                                    {takeModal.description}
                                </p>
                            </div>
                        )}

                        {/* Due date warning */}
                        {takeModal.dueAt && (
                            <div className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                                isOverdue(takeModal)
                                    ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                                    : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                            )}>
                                <Calendar className="h-4 w-4 flex-shrink-0" />
                                {isOverdue(takeModal)
                                    ? `⚠ This task was due on ${new Date(takeModal.dueAt).toLocaleDateString()}`
                                    : `Due by ${new Date(takeModal.dueAt).toLocaleDateString()}`}
                            </div>
                        )}

                        {/* Requirements Preview */}
                        {takeModal.formData && Object.keys(takeModal.formData).length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <ClipboardList className="h-3.5 w-3.5 text-primary-400" />
                                    Requirements ({Object.keys(takeModal.formData).length} items)
                                </h4>
                                {renderRequirementsPreview(takeModal.formData)}
                            </div>
                        )}

                        {/* What happens next */}
                        <div className="bg-primary-500/5 border border-primary-500/20 rounded-lg px-4 py-3">
                            <h4 className="text-xs font-semibold text-primary-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <ArrowRight className="h-3.5 w-3.5" />
                                What happens next
                            </h4>
                            <ul className="text-sm text-surface-400 space-y-1">
                                <li className="flex items-center gap-2">
                                    <span className="text-primary-400">1.</span>
                                    Task will be assigned to you
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-primary-400">2.</span>
                                    {takeModal.type === 'APPROVAL'
                                        ? 'Review requirements and approve or reject'
                                        : 'Complete the requirements checklist'}
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-primary-400">3.</span>
                                    {takeModal.type === 'APPROVAL'
                                        ? 'Workflow continues based on your decision'
                                        : 'Mark the task as complete'}
                                </li>
                            </ul>
                        </div>
                    </div>
                    <ModalFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setTakeModal(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="!bg-gradient-to-r !from-primary-600 !to-violet-600 hover:!from-primary-500 hover:!to-violet-500 !border-0 !shadow-lg !shadow-primary-500/20 transition-all hover:!shadow-primary-500/40 hover:!scale-105"
                            onClick={() => handleClaim(takeModal.id)}
                            isLoading={claimingTaskId === takeModal.id}
                        >
                            <Hand className="h-4 w-4" />
                            Take This Task
                        </Button>
                    </ModalFooter>
                </Modal>
            )}

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

                        {/* Show requirements summary in action modal */}
                        {actionModal.task.formData && Object.keys(actionModal.task.formData).length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                                    Requirements Summary
                                </h4>
                                {renderRequirementsPreview(actionModal.task.formData)}
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

            {/* ================================================================
                Requirement Completion Warning Modal
               ================================================================ */}
            {completionWarning && (
                <Modal
                    isOpen={!!completionWarning}
                    onClose={() => setCompletionWarning(null)}
                    title="Incomplete Requirements"
                    description="Some requirements haven't been checked off yet"
                >
                    <div className="space-y-4 py-2">
                        <div className="flex items-center gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-yellow-300">
                                    {completionWarning.checked} of {completionWarning.total} requirements verified
                                </p>
                                <p className="text-xs text-yellow-400/70 mt-0.5">
                                    You can still proceed, but unchecked items may need attention.
                                </p>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div>
                            <div className="flex items-center justify-between text-xs text-surface-400 mb-1.5">
                                <span>Verification Progress</span>
                                <span className="font-medium">{Math.round((completionWarning.checked / completionWarning.total) * 100)}%</span>
                            </div>
                            <div className="h-2 bg-surface-700/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all"
                                    style={{ width: `${(completionWarning.checked / completionWarning.total) * 100}%` }}
                                />
                            </div>
                        </div>

                        <p className="text-sm text-surface-400">
                            Do you want to continue with <strong className="text-surface-200">
                                {completionWarning.action === 'approve' ? 'approving'
                                    : completionWarning.action === 'reject' ? 'rejecting'
                                        : 'completing'}
                            </strong> this task anyway?
                        </p>
                    </div>
                    <ModalFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setCompletionWarning(null)}
                        >
                            Go Back
                        </Button>
                        <Button
                            className="!bg-yellow-600 hover:!bg-yellow-500 !border-0"
                            onClick={() => {
                                const { task, action } = completionWarning;
                                setCompletionWarning(null);
                                setActionModal({ task, action: action as any });
                            }}
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Continue Anyway
                        </Button>
                    </ModalFooter>
                </Modal>
            )}
        </div>
    );
}
