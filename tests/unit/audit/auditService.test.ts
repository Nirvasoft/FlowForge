/**
 * Unit tests for AuditService
 */

// Mock Prisma before any imports
const mockCreate = jest.fn().mockResolvedValue({});
const mockFindMany = jest.fn().mockResolvedValue([]);
const mockCount = jest.fn().mockResolvedValue(0);

jest.mock('../../../src/utils/prisma.js', () => ({
    prisma: {
        auditLog: {
            create: (...args: any[]) => mockCreate(...args),
            findMany: (...args: any[]) => mockFindMany(...args),
            count: (...args: any[]) => mockCount(...args),
        },
    },
}));

import { AuditService } from '../../../src/services/audit/audit.service';

describe('AuditService', () => {
    let service: AuditService;

    beforeEach(() => {
        service = new AuditService();
        jest.clearAllMocks();
    });

    describe('log', () => {
        it('creates an audit log entry via Prisma', async () => {
            await service.log({
                action: 'workflow.execution.started',
                resource: 'workflow',
                resourceId: '123e4567-e89b-12d3-a456-426614174000',
                userId: '30620aae-f229-40f0-8f3d-31704087fed4',
                newData: { workflowName: 'Test Workflow', status: 'running' },
            });

            expect(mockCreate).toHaveBeenCalledTimes(1);
            const callArgs = mockCreate.mock.calls[0][0];
            expect(callArgs.data.action).toBe('workflow.execution.started');
            expect(callArgs.data.resource).toBe('workflow');
            expect(callArgs.data.resourceId).toBe('123e4567-e89b-12d3-a456-426614174000');
            expect(callArgs.data.userId).toBe('30620aae-f229-40f0-8f3d-31704087fed4');
            expect(callArgs.data.newData.workflowName).toBe('Test Workflow');
        });

        it('handles missing optional fields gracefully', async () => {
            await service.log({
                action: 'decision_table.evaluated',
                resource: 'decision_table',
            });

            expect(mockCreate).toHaveBeenCalledTimes(1);
            const callArgs = mockCreate.mock.calls[0][0];
            expect(callArgs.data.resourceId).toBeNull();
            expect(callArgs.data.userId).toBeNull();
        });

        it('does not throw when Prisma fails', async () => {
            mockCreate.mockRejectedValueOnce(new Error('DB down'));

            // Should not throw
            await expect(
                service.log({ action: 'test', resource: 'test' })
            ).resolves.toBeUndefined();
        });
    });

    describe('query', () => {
        it('queries with filters and pagination', async () => {
            const mockEntry = {
                id: 'abc',
                action: 'workflow.execution.started',
                resource: 'workflow',
                resourceId: '123',
                userId: '456',
                oldData: null,
                newData: { status: 'running' },
                createdAt: new Date('2026-01-01'),
            };
            mockFindMany.mockResolvedValueOnce([mockEntry]);
            mockCount.mockResolvedValueOnce(1);

            const result = await service.query({
                resource: 'workflow',
                action: 'workflow.execution.started',
                limit: 10,
                offset: 0,
            });

            expect(result.entries).toHaveLength(1);
            expect(result.entries[0]!.action).toBe('workflow.execution.started');
            expect(result.total).toBe(1);

            // Verify filter was passed
            const whereArg = mockFindMany.mock.calls[0][0].where;
            expect(whereArg.resource).toBe('workflow');
            expect(whereArg.action).toBe('workflow.execution.started');
        });

        it('returns empty array when Prisma fails', async () => {
            mockFindMany.mockRejectedValueOnce(new Error('DB down'));

            const result = await service.query({});
            expect(result.entries).toEqual([]);
            expect(result.total).toBe(0);
        });
    });
});
