/**
 * ProcessDashboard - Process Instance Dashboard
 *
 * Visualizes running workflow instances, execution history, active nodes,
 * and provides controls to cancel or retry failed instances.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Play,
    CheckCircle,
    XCircle,
    Pause,
    StopCircle,
    Timer,
    RefreshCw,
    Activity,
    ChevronRight,
    AlertCircle,
    Filter,
    Layers,
} from 'lucide-react';
import {
    Button,
    Input,
    Card,
    CardHeader,
    CardContent,
    Badge,
} from '../../components/ui';
import { cn } from '../../lib/utils';
import {
    listProcesses,
    listAllInstances,
    cancelProcessInstance,
    startProcess,
} from '../../api/workflows';
import type { Process, ProcessInstance } from '../../types';

// ============================================================================
// Types
// ============================================================================

type StatusFilter = 'all' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface ProcessDashboardProps {
    /** Optionally filter to a single workflow */
    workflowId?: string;
    /** Compact mode for embedding in App Builder */
    compact?: boolean;
}

const statusConfig: Record<string, {
    variant: 'success' | 'warning' | 'info' | 'error';
    icon: typeof Play;
    color: string;
}> = {
    RUNNING: { variant: 'info', icon: Play, color: 'text-blue-400 bg-blue-500/10' },
    COMPLETED: { variant: 'success', icon: CheckCircle, color: 'text-green-400 bg-green-500/10' },
    FAILED: { variant: 'error', icon: XCircle, color: 'text-red-400 bg-red-500/10' },
    CANCELLED: { variant: 'warning', icon: StopCircle, color: 'text-yellow-400 bg-yellow-500/10' },
    SUSPENDED: { variant: 'warning', icon: Pause, color: 'text-yellow-400 bg-yellow-500/10' },
};

// ============================================================================
// Component
// ============================================================================

export function ProcessDashboard({
    workflowId,
    compact = false,
}: ProcessDashboardProps) {
    const [processes, setProcesses] = useState<Process[]>([]);
    const [instances, setInstances] = useState<ProcessInstance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedInstance, setSelectedInstance] = useState<ProcessInstance | null>(null);

    // Load data
    const loadData = useCallback(async () => {
        try {
            setError(null);
            const [processRes, instanceRes] = await Promise.all([
                listProcesses({}),
                listAllInstances({ status: statusFilter !== 'all' ? statusFilter : undefined }),
            ]);
            setProcesses(processRes.items);
            let filtered = instanceRes;
            if (workflowId) {
                filtered = filtered.filter((i: ProcessInstance) => i.processId === workflowId);
            }
            setInstances(filtered);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, workflowId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Auto-refresh running instances every 10s
    useEffect(() => {
        const hasRunning = instances.some((i) => i.status === 'RUNNING' || i.status === 'SUSPENDED');
        if (!hasRunning) return;
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, [instances, loadData]);

    // Filter instances
    const filteredInstances = instances.filter((inst) => {
        const name = inst.workflowName || processes.find((p) => p.id === inst.processId)?.name || '';
        return (
            name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inst.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    // Summary stats
    const stats = {
        running: instances.filter((i) => i.status === 'RUNNING').length,
        completed: instances.filter((i) => i.status === 'COMPLETED').length,
        failed: instances.filter((i) => i.status === 'FAILED').length,
        total: instances.length,
    };

    // Duration helper
    const getDuration = (start: string, end?: string) => {
        const diff = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
        if (diff < 1000) return '<1s';
        if (diff < 60000) return `${Math.round(diff / 1000)}s`;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ${Math.round((diff % 60000) / 1000)}s`;
        return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
    };

    const handleCancel = async (instanceId: string) => {
        try {
            await cancelProcessInstance(instanceId);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to cancel instance');
        }
    };

    const handleStartNew = async (processId: string) => {
        try {
            await startProcess(processId, {});
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start instance');
        }
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
                            <Activity className="h-6 w-6 text-primary-400" />
                            Process Dashboard
                        </h1>
                        <p className="mt-1 text-surface-400">
                            Monitor and manage workflow executions
                        </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={loadData}>
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            )}

            {/* Stats cards */}
            {!compact && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Total', value: stats.total, color: 'text-surface-300', bg: 'bg-surface-800/50' },
                        { label: 'Running', value: stats.running, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { label: 'Completed', value: stats.completed, color: 'text-green-400', bg: 'bg-green-500/10' },
                        { label: 'Failed', value: stats.failed, color: 'text-red-400', bg: 'bg-red-500/10' },
                    ].map((stat) => (
                        <Card key={stat.label}>
                            <CardContent className="p-4 text-center">
                                <p className={cn('text-3xl font-bold', stat.color)}>{stat.value}</p>
                                <p className="text-xs text-surface-500 mt-1">{stat.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Search and filters */}
            <Card>
                <CardContent className="py-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by workflow name or instance ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                leftIcon={<Search className="h-4 w-4" />}
                            />
                        </div>
                        <div className="flex gap-1.5 items-center">
                            <Filter className="h-4 w-4 text-surface-500" />
                            {(['all', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const).map((s) => (
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
                                    {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error */}
            {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">✕</button>
                </div>
            )}

            {/* Instance list */}
            <Card>
                {!compact && (
                    <CardHeader
                        title="Execution Instances"
                        description={`${filteredInstances.length} instance${filteredInstances.length !== 1 ? 's' : ''}`}
                    />
                )}
                <div className="divide-y divide-surface-700/50">
                    {isLoading ? (
                        <div className="px-6 py-12 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent mx-auto" />
                            <p className="text-surface-400 mt-3">Loading instances…</p>
                        </div>
                    ) : filteredInstances.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <Layers className="h-8 w-8 text-surface-500 mx-auto mb-2" />
                            <p className="text-surface-300 font-medium">No instances found</p>
                            <p className="text-sm text-surface-500 mt-1">
                                Run a workflow to see execution history here
                            </p>
                        </div>
                    ) : (
                        filteredInstances.map((instance) => {
                            const wfName =
                                instance.workflowName ||
                                processes.find((p) => p.id === instance.processId)?.name ||
                                'Unknown Workflow';
                            const cfg = statusConfig[instance.status] || statusConfig.RUNNING;
                            const StatusIcon = cfg.icon;

                            return (
                                <div
                                    key={instance.id}
                                    className={cn(
                                        'px-5 py-4 transition-colors cursor-pointer hover:bg-surface-800/40',
                                        selectedInstance?.id === instance.id && 'bg-surface-800/60'
                                    )}
                                    onClick={() =>
                                        setSelectedInstance(
                                            selectedInstance?.id === instance.id ? null : instance
                                        )
                                    }
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn('p-2 rounded-lg', cfg.color)}>
                                                <StatusIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-surface-100">
                                                    {wfName}
                                                </h4>
                                                <div className="flex items-center gap-2 text-sm text-surface-400 mt-0.5">
                                                    <span className="font-mono text-xs text-surface-500">
                                                        {instance.id.substring(0, 8)}…
                                                    </span>
                                                    <span className="text-surface-600">·</span>
                                                    <span>
                                                        {new Date(instance.startedAt).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 text-sm text-surface-400">
                                                <Timer className="h-3.5 w-3.5" />
                                                {getDuration(instance.startedAt, instance.completedAt)}
                                            </div>
                                            <Badge variant={cfg.variant}>{instance.status}</Badge>
                                            {(instance.status === 'RUNNING' ||
                                                instance.status === 'SUSPENDED') && (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="!bg-red-500/10 !text-red-400 !border-red-500/30 hover:!bg-red-500/20"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCancel(instance.id);
                                                        }}
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                        Cancel
                                                    </Button>
                                                )}
                                            <ChevronRight
                                                className={cn(
                                                    'h-4 w-4 text-surface-500 transition-transform',
                                                    selectedInstance?.id === instance.id &&
                                                    'rotate-90'
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* Expanded execution trace */}
                                    {selectedInstance?.id === instance.id && (
                                        <div className="mt-4 pl-12 space-y-2 animate-in">
                                            <div className="bg-surface-800/50 rounded-lg p-4 text-sm space-y-3">
                                                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                                    <div>
                                                        <span className="text-surface-500">Instance ID</span>
                                                        <p className="font-mono text-surface-300">{instance.id}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-surface-500">Workflow ID</span>
                                                        <p className="font-mono text-surface-300">{instance.processId}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-surface-500">Started</span>
                                                        <p className="text-surface-300">
                                                            {new Date(instance.startedAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-surface-500">
                                                            {instance.completedAt ? 'Completed' : 'Duration'}
                                                        </span>
                                                        <p className="text-surface-300">
                                                            {instance.completedAt
                                                                ? new Date(instance.completedAt).toLocaleString()
                                                                : getDuration(instance.startedAt)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-surface-500">Started By</span>
                                                        <p className="text-surface-300">
                                                            {instance.startedBy || 'system'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-surface-500">Trigger</span>
                                                        <p className="text-surface-300">
                                                            {(instance as any).triggerType || 'manual'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Current nodes / execution trace */}
                                                {(instance as any).currentNodes && (instance as any).currentNodes.length > 0 && (
                                                    <div className="border-t border-surface-700/50 pt-3">
                                                        <p className="text-surface-500 mb-1.5">Active Nodes</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(instance as any).currentNodes.map((nodeId: string, idx: number) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-md font-mono"
                                                                >
                                                                    {nodeId}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Quick actions */}
                                                {instance.status === 'FAILED' && (
                                                    <div className="border-t border-surface-700/50 pt-3 flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStartNew(instance.processId);
                                                            }}
                                                        >
                                                            <Play className="h-3.5 w-3.5" />
                                                            Retry (new instance)
                                                        </Button>
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

            {/* Quick-start section */}
            {!compact && processes.filter((p) => p.status === 'ACTIVE').length > 0 && (
                <Card>
                    <CardHeader title="Quick Start" description="Start a new workflow execution" />
                    <CardContent className="pb-4">
                        <div className="flex flex-wrap gap-2">
                            {processes
                                .filter((p) => p.status === 'ACTIVE')
                                .map((process) => (
                                    <Button
                                        key={process.id}
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleStartNew(process.id)}
                                    >
                                        <Play className="h-3.5 w-3.5" />
                                        {process.name}
                                    </Button>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
