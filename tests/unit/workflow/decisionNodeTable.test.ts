/**
 * DecisionNode Table Mode Tests
 *
 * Tests the enhanced DecisionNodeExecutor when mode='table',
 * which evaluates a decision table and uses a branch field for routing.
 */

import { WorkflowEngine } from '../../../src/services/workflow/engine';
import type { Workflow } from '../../../src/types/workflow';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockEvaluate = jest.fn();

jest.mock('../../../src/utils/prisma', () => ({
    prisma: {
        process: { findUnique: jest.fn(), update: jest.fn() },
    },
}));

jest.mock('../../../src/services/decisions/decision-table.service', () => ({
    decisionTableService: {
        evaluate: (...args: unknown[]) => mockEvaluate(...args),
    },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWorkflow(nodes: any[], edges: any[]): Workflow {
    return {
        id: 'wf-dn-test',
        name: 'Decision Node Test',
        slug: 'dn-test',
        version: 1,
        status: 'published',
        nodes,
        edges,
        triggers: [],
        variables: [],
        settings: {
            timeout: 3600,
            retryPolicy: { enabled: false, maxAttempts: 1, backoffType: 'fixed', initialDelay: 1000, maxDelay: 1000 },
            errorHandling: 'stop',
            logging: 'standard',
            concurrency: 1,
            priority: 'normal',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
    };
}

function decisionWorkflow(decisionConfig: Record<string, unknown>) {
    return createWorkflow(
        [
            { id: 'start', type: 'start', name: 'Start', position: { x: 0, y: 0 }, config: { type: 'start' } },
            { id: 'dec', type: 'decision', name: 'Decision', position: { x: 0, y: 50 }, config: decisionConfig },
            { id: 'yes', type: 'end', name: 'Yes End', position: { x: 100, y: 50 }, config: { type: 'end' } },
            { id: 'no', type: 'end', name: 'No End', position: { x: 0, y: 100 }, config: { type: 'end' } },
        ],
        [
            { id: 'e1', source: 'start', target: 'dec' },
            { id: 'e2', source: 'dec', target: 'yes', sourceHandle: 'true' },
            { id: 'e3', source: 'dec', target: 'no', sourceHandle: 'false' },
        ],
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DecisionNodeExecutor — Table Mode', () => {
    let engine: WorkflowEngine;

    beforeEach(() => {
        engine = new WorkflowEngine();
        mockEvaluate.mockReset();
    });

    test('routes to true edge when branchField is truthy', async () => {
        mockEvaluate.mockResolvedValue({
            success: true,
            matchedRules: [{ id: 'r1' }],
            outputs: { approved: true, level: 'manager' },
        });

        const wf = decisionWorkflow({
            type: 'decision',
            mode: 'table',
            decisionTableId: 'dt-approval',
            branchField: 'approved',
        });

        const exec = await engine.startExecution(wf, { amount: 500 });

        expect(exec.status).toBe('completed');
        expect(exec.variables._decisionResult).toEqual({ approved: true, level: 'manager' });
        // Should have gone through "yes" end node
        expect(exec.completedNodes).toContain('yes');
        expect(exec.completedNodes).not.toContain('no');
    });

    test('routes to false edge when branchField is falsy', async () => {
        mockEvaluate.mockResolvedValue({
            success: true,
            matchedRules: [{ id: 'r1' }],
            outputs: { approved: false, reason: 'Insufficient budget' },
        });

        const wf = decisionWorkflow({
            type: 'decision',
            mode: 'table',
            decisionTableId: 'dt-approval',
            branchField: 'approved',
        });

        const exec = await engine.startExecution(wf, { amount: 99999 });

        expect(exec.status).toBe('completed');
        expect(exec.completedNodes).toContain('no');
        expect(exec.completedNodes).not.toContain('yes');
    });

    test('falls back to first boolean output when branchField not specified', async () => {
        mockEvaluate.mockResolvedValue({
            success: true,
            matchedRules: [{ id: 'r1' }],
            outputs: { eligible: true, score: 85 },
        });

        const wf = decisionWorkflow({
            type: 'decision',
            mode: 'table',
            decisionTableId: 'dt-eligibility',
            // no branchField — should use first boolean output ('eligible')
        });

        const exec = await engine.startExecution(wf, {});

        expect(exec.status).toBe('completed');
        expect(exec.completedNodes).toContain('yes');
    });

    test('expression mode still works unchanged (regression)', async () => {
        const wf = decisionWorkflow({
            type: 'decision',
            mode: 'expression',
            condition: 'amount > 100',
        });

        const exec = await engine.startExecution(wf, { amount: 200 });

        expect(exec.status).toBe('completed');
        expect(exec.completedNodes).toContain('yes');
        // Should NOT have called the decision table service
        expect(mockEvaluate).not.toHaveBeenCalled();
    });

    test('expression mode works when mode is not set (backward compat)', async () => {
        const wf = decisionWorkflow({
            type: 'decision',
            condition: 'total < 50',
            // no mode field — should default to expression
        });

        const exec = await engine.startExecution(wf, { total: 10 });

        expect(exec.status).toBe('completed');
        expect(exec.completedNodes).toContain('yes');
        expect(mockEvaluate).not.toHaveBeenCalled();
    });

    test('fails when decisionTableId is missing in table mode', async () => {
        const wf = decisionWorkflow({
            type: 'decision',
            mode: 'table',
            // no decisionTableId
        });

        const exec = await engine.startExecution(wf, {});

        expect(exec.status).toBe('failed');
        expect(exec.error?.message).toContain('decision table ID');
    });

    test('fails gracefully when table service throws', async () => {
        mockEvaluate.mockRejectedValue(new Error('Table not found'));

        const wf = decisionWorkflow({
            type: 'decision',
            mode: 'table',
            decisionTableId: 'dt-missing',
            branchField: 'result',
        });

        const exec = await engine.startExecution(wf, {});

        expect(exec.status).toBe('failed');
        expect(exec.error?.message).toContain('Decision table evaluation failed');
    });
});
