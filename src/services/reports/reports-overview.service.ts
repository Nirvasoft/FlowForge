/**
 * FlowForge Reports Overview Service
 * Real-time analytics data for the Reports Overview tab
 */
import { prisma } from '../../utils/prisma.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface OverviewStats {
    totalWorkflows: number;
    tasksCompleted: number;
    pendingApprovals: number;
    avgCompletionHours: number;
}

export interface WorkflowTrendItem {
    month: string;
    completed: number;
    failed: number;
}

export interface TaskDistributionItem {
    name: string;
    value: number;
    color: string;
}

export interface FormRankingItem {
    form: string;
    count: number;
}

export interface ReportsOverviewData {
    stats: OverviewStats;
    workflowTrend: WorkflowTrendItem[];
    taskDistribution: TaskDistributionItem[];
    formRankings: FormRankingItem[];
}

// ── Service ──────────────────────────────────────────────────────────────────

async function getOverviewStats(): Promise<OverviewStats> {
    const [
        totalWorkflows,
        tasksCompleted,
        pendingApprovals,
    ] = await Promise.all([
        prisma.process.count(),
        prisma.taskInstance.count({ where: { status: 'COMPLETED' } }),
        prisma.taskInstance.count({
            where: { status: { in: ['PENDING', 'CLAIMED'] } },
        }),
    ]);

    // Avg completion time: average duration of completed process instances
    const completedInstances = await prisma.processInstance.findMany({
        where: {
            status: 'COMPLETED',
            completedAt: { not: null },
        },
        select: { startedAt: true, completedAt: true },
    });

    let avgCompletionHours = 0;
    if (completedInstances.length > 0) {
        const totalMs = completedInstances.reduce((sum, inst) => {
            if (inst.completedAt) {
                return sum + (inst.completedAt.getTime() - inst.startedAt.getTime());
            }
            return sum;
        }, 0);
        avgCompletionHours = Math.max(0, Math.round((totalMs / completedInstances.length / (1000 * 60 * 60)) * 10) / 10);
    }

    return {
        totalWorkflows,
        tasksCompleted,
        pendingApprovals,
        avgCompletionHours,
    };
}

async function getWorkflowTrend(months = 6): Promise<WorkflowTrendItem[]> {
    const result: WorkflowTrendItem[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        const monthLabel = start.toLocaleString('en-US', { month: 'short' });

        const [completed, failed] = await Promise.all([
            prisma.processInstance.count({
                where: {
                    status: 'COMPLETED',
                    completedAt: { gte: start, lte: end },
                },
            }),
            prisma.processInstance.count({
                where: {
                    status: 'FAILED',
                    completedAt: { gte: start, lte: end },
                },
            }),
        ]);

        result.push({ month: monthLabel, completed, failed });
    }

    return result;
}

async function getTaskDistribution(): Promise<TaskDistributionItem[]> {
    const now = new Date();

    const [completed, pending, overdue] = await Promise.all([
        prisma.taskInstance.count({ where: { status: 'COMPLETED' } }),
        prisma.taskInstance.count({
            where: {
                status: { in: ['PENDING', 'CLAIMED', 'IN_PROGRESS'] },
            },
        }),
        prisma.taskInstance.count({
            where: {
                status: { in: ['PENDING', 'CLAIMED', 'IN_PROGRESS'] },
                dueAt: { lt: now },
            },
        }),
    ]);

    return [
        { name: 'Completed', value: completed, color: '#22c55e' },
        { name: 'Pending', value: Math.max(0, pending - overdue), color: '#f59e0b' },
        { name: 'Overdue', value: overdue, color: '#ef4444' },
    ];
}

async function getFormRankings(limit = 6): Promise<FormRankingItem[]> {
    // Get all forms with their submission counts
    const forms = await prisma.form.findMany({
        select: {
            name: true,
            _count: {
                select: { submissions: true },
            },
        },
        orderBy: {
            submissions: { _count: 'desc' },
        },
        take: limit,
    });

    return forms.map((f) => ({
        form: f.name,
        count: f._count.submissions,
    }));
}

async function getOverview(): Promise<ReportsOverviewData> {
    const [stats, workflowTrend, taskDistribution, formRankings] = await Promise.all([
        getOverviewStats(),
        getWorkflowTrend(),
        getTaskDistribution(),
        getFormRankings(),
    ]);

    return { stats, workflowTrend, taskDistribution, formRankings };
}

export const reportsOverviewService = {
    getOverviewStats,
    getWorkflowTrend,
    getTaskDistribution,
    getFormRankings,
    getOverview,
};
