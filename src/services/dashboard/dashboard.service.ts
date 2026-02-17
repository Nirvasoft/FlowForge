/**
 * FlowForge Dashboard Service
 * Aggregates real-time stats from Prisma for the main dashboard
 */
import { prisma } from '../../utils/prisma.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
    totalUsers: number;
    activeWorkflows: number;
    formsCreated: number;
    tasksPending: number;
    totalExecutions: number;
    runningExecutions: number;
    datasetsCount: number;
    decisionTablesCount: number;
}

export interface RecentActivityItem {
    id: string;
    type: 'workflow' | 'task' | 'form' | 'user';
    title: string;
    description: string;
    status?: string;
    timestamp: string;
}

export interface PerformanceMetrics {
    workflowCompletionRate: number;
    slaComplianceRate: number;
    avgResolutionHours: number;
    totalCompletedThisMonth: number;
    totalFailedThisMonth: number;
}

export interface DashboardData {
    stats: DashboardStats;
    recentActivity: RecentActivityItem[];
    performance: PerformanceMetrics;
}

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * Resolve the effective accountId for dashboard queries.
 * If the user's own account has minimal data (< 2 users), fall back to the
 * demo account so the dashboard matches what list pages display (they also
 * merge/fallback to demo data).
 */
async function resolveAccountId(accountId: string): Promise<string> {
    const userCount = await prisma.user.count({ where: { accountId } });
    if (userCount > 1) return accountId;

    // Try demo account
    const demo = await prisma.account.findFirst({ where: { slug: 'demo' } });
    if (demo) return demo.id;
    return accountId;
}

async function getStats(accountId: string): Promise<DashboardStats> {
    const effectiveId = await resolveAccountId(accountId);

    // ── Users: mirror user.routes fallback logic ──
    // If user's own account has <= 1 user, merge with demo account (same as user list page)
    let totalUsers = await prisma.user.count({ where: { accountId } });
    if (totalUsers <= 1) {
        const demoAccount = await prisma.account.findFirst({ where: { slug: 'demo' } });
        if (demoAccount && demoAccount.id !== accountId) {
            const demoUsers = await prisma.user.count({ where: { accountId: demoAccount.id } });
            totalUsers = totalUsers + demoUsers;
        }
    }

    // ── Datasets: check in-memory service first (same as dataset.routes) ──
    let datasetsCount: number;
    try {
        const { datasetService } = await import('../datasets/dataset.service.js');
        const inMemory = await datasetService.listDatasets({});
        if (inMemory.data && inMemory.data.length > 0) {
            datasetsCount = inMemory.total || inMemory.data.length;
        } else {
            datasetsCount = await prisma.dataset.count({ where: { accountId: effectiveId } });
        }
    } catch {
        datasetsCount = await prisma.dataset.count({ where: { accountId: effectiveId } });
    }

    // ── Other stats: use effective (demo-fallback) account ──
    const [
        activeWorkflows,
        formsCreated,
        tasksPending,
        totalExecutions,
        runningExecutions,
    ] = await Promise.all([
        prisma.process.count({ where: { accountId: effectiveId, status: 'ACTIVE' } }),
        prisma.form.count({ where: { accountId: effectiveId } }),
        prisma.taskInstance.count({ where: { status: 'PENDING', instance: { process: { accountId: effectiveId } } } }),
        prisma.processInstance.count({ where: { process: { accountId: effectiveId } } }),
        prisma.processInstance.count({ where: { status: 'RUNNING', process: { accountId: effectiveId } } }),
    ]);

    // Count decision tables for this account
    const decisionTablesCount = await prisma.decisionTable.count({ where: { accountId: effectiveId } }).catch(() => 0);

    return {
        totalUsers,
        activeWorkflows,
        formsCreated,
        tasksPending,
        totalExecutions,
        runningExecutions,
        datasetsCount,
        decisionTablesCount,
    };
}

async function getRecentActivity(accountId: string, limit = 10): Promise<RecentActivityItem[]> {
    const effectiveId = await resolveAccountId(accountId);
    const items: RecentActivityItem[] = [];

    // Recent process instances
    const recentInstances = await prisma.processInstance.findMany({
        where: { process: { accountId: effectiveId } },
        orderBy: { startedAt: 'desc' },
        take: limit,
        include: {
            process: { select: { name: true } },
        },
    });

    for (const inst of recentInstances) {
        const statusMap: Record<string, string> = {
            RUNNING: 'started',
            COMPLETED: 'completed',
            FAILED: 'failed',
            CANCELLED: 'cancelled',
        };
        items.push({
            id: inst.id,
            type: 'workflow',
            title: inst.process?.name || 'Workflow',
            description: `Workflow ${statusMap[inst.status] || inst.status.toLowerCase()}`,
            status: inst.status,
            timestamp: (inst.completedAt || inst.startedAt).toISOString(),
        });
    }

    // Recent tasks
    const recentTasks = await prisma.taskInstance.findMany({
        where: { instance: { process: { accountId: effectiveId } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            assignee: { select: { firstName: true, lastName: true } },
        },
    });

    for (const task of recentTasks) {
        const assigneeName = task.assignee
            ? `${task.assignee.firstName} ${task.assignee.lastName}`
            : 'Unassigned';
        items.push({
            id: task.id,
            type: 'task',
            title: task.name,
            description: task.status === 'COMPLETED'
                ? `Completed by ${assigneeName}`
                : `Assigned to ${assigneeName}`,
            status: task.status,
            timestamp: (task.completedAt || task.createdAt).toISOString(),
        });
    }

    // Recent form submissions
    const recentSubmissions = await prisma.formSubmission.findMany({
        where: { form: { accountId: effectiveId } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            form: { select: { name: true } },
        },
    });

    for (const sub of recentSubmissions) {
        // Try to look up the creator name from createdBy
        let submitterName = 'Unknown';
        if (sub.createdBy) {
            const creator = await prisma.user.findUnique({
                where: { id: sub.createdBy },
                select: { firstName: true, lastName: true },
            });
            if (creator) {
                submitterName = `${creator.firstName} ${creator.lastName}`;
            }
        }
        items.push({
            id: sub.id,
            type: 'form',
            title: sub.form?.name || 'Form',
            description: `Submitted by ${submitterName}`,
            timestamp: sub.createdAt.toISOString(),
        });
    }

    // Sort by timestamp descending, take limit
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items.slice(0, limit);
}

async function getPerformance(accountId: string): Promise<PerformanceMetrics> {
    const effectiveId = await resolveAccountId(accountId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
        totalInstances,
        completedInstances,
        completedThisMonth,
        failedThisMonth,
        totalTasks,
        slaBreachedTasks,
    ] = await Promise.all([
        prisma.processInstance.count({ where: { process: { accountId: effectiveId } } }),
        prisma.processInstance.count({ where: { status: 'COMPLETED', process: { accountId: effectiveId } } }),
        prisma.processInstance.count({
            where: { status: 'COMPLETED', completedAt: { gte: startOfMonth }, process: { accountId: effectiveId } },
        }),
        prisma.processInstance.count({
            where: { status: 'FAILED', completedAt: { gte: startOfMonth }, process: { accountId: effectiveId } },
        }),
        prisma.taskInstance.count({ where: { instance: { process: { accountId: effectiveId } } } }),
        prisma.taskInstance.count({ where: { slaBreached: true, instance: { process: { accountId: effectiveId } } } }),
    ]);

    // Avg resolution: completed tasks this month
    const completedTasks = await prisma.taskInstance.findMany({
        where: {
            status: 'COMPLETED',
            completedAt: { gte: startOfMonth },
            instance: { process: { accountId: effectiveId } },
        },
        select: { createdAt: true, completedAt: true },
    });

    let avgResolutionHours = 0;
    if (completedTasks.length > 0) {
        const totalHours = completedTasks.reduce((sum, t) => {
            if (t.completedAt) {
                return sum + (t.completedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
            }
            return sum;
        }, 0);
        avgResolutionHours = Math.round((totalHours / completedTasks.length) * 10) / 10;
    }

    const workflowCompletionRate = totalInstances > 0
        ? Math.round((completedInstances / totalInstances) * 1000) / 10
        : 0;

    const slaComplianceRate = totalTasks > 0
        ? Math.round(((totalTasks - slaBreachedTasks) / totalTasks) * 1000) / 10
        : 100;

    return {
        workflowCompletionRate,
        slaComplianceRate,
        avgResolutionHours,
        totalCompletedThisMonth: completedThisMonth,
        totalFailedThisMonth: failedThisMonth,
    };
}

async function getDashboard(accountId: string): Promise<DashboardData> {
    const [stats, recentActivity, performance] = await Promise.all([
        getStats(accountId),
        getRecentActivity(accountId),
        getPerformance(accountId),
    ]);

    return { stats, recentActivity, performance };
}

export const dashboardStatsService = {
    getStats,
    getRecentActivity,
    getPerformance,
    getDashboard,
};
