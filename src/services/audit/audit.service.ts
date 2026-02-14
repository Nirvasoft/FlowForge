/**
 * FlowForge Audit Service
 * Persistent audit trail for workflow executions and decision table evaluations
 */

import { prisma } from '../../utils/prisma.js';

// ============================================================================
// Types
// ============================================================================

export interface AuditLogEntry {
    id: string;
    action: string;
    resource: string;
    resourceId?: string;
    userId?: string;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    createdAt: Date;
}

export interface AuditLogInput {
    action: string;
    resource: string;
    resourceId?: string;
    userId?: string;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
}

export interface AuditQueryOptions {
    resource?: string;
    action?: string;
    resourceId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ACCOUNT_ID = '56dc14cc-16f6-45ef-9797-c77a648ed6f2';

// ============================================================================
// Audit Service
// ============================================================================

export class AuditService {
    /**
     * Log an audit event (fire-and-forget by default)
     */
    async log(entry: AuditLogInput): Promise<void> {
        try {
            await prisma.auditLog.create({
                data: {
                    accountId: DEFAULT_ACCOUNT_ID,
                    action: entry.action,
                    resource: entry.resource,
                    resourceId: entry.resourceId || null,
                    userId: entry.userId || null,
                    oldData: entry.oldData ? (entry.oldData as any) : undefined,
                    newData: entry.newData ? (entry.newData as any) : undefined,
                },
            });
        } catch (e) {
            console.warn('AuditService.log failed:', (e as Error).message);
        }
    }

    /**
     * Query audit log entries
     */
    async query(options: AuditQueryOptions = {}): Promise<{ entries: AuditLogEntry[]; total: number }> {
        try {
            const where: any = { accountId: DEFAULT_ACCOUNT_ID };
            if (options.resource) where.resource = options.resource;
            if (options.action) where.action = options.action;
            if (options.resourceId) where.resourceId = options.resourceId;
            if (options.userId) where.userId = options.userId;

            const limit = options.limit || 50;
            const offset = options.offset || 0;

            const [entries, total] = await Promise.all([
                prisma.auditLog.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                prisma.auditLog.count({ where }),
            ]);

            return {
                entries: entries.map(e => ({
                    id: e.id,
                    action: e.action,
                    resource: e.resource,
                    resourceId: e.resourceId || undefined,
                    userId: e.userId || undefined,
                    oldData: (e.oldData as Record<string, unknown>) || undefined,
                    newData: (e.newData as Record<string, unknown>) || undefined,
                    createdAt: e.createdAt,
                })),
                total,
            };
        } catch (e) {
            console.warn('AuditService.query failed:', (e as Error).message);
            return { entries: [], total: 0 };
        }
    }
}

// Singleton export
export const auditService = new AuditService();
