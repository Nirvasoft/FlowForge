/**
 * BusinessRuleNodeExecutor Tests
 *
 * Tests the integration between workflow engine and decision table service
 * via the businessRule node type.
 */

import { WorkflowEngine } from '../../../src/services/workflow/engine';
import type { Workflow } from '../../../src/types/workflow';

// ---------------------------------------------------------------------------
// Mock the decision table service
// ---------------------------------------------------------------------------

const mockEvaluate = jest.fn();

// Mock prisma (engine imports it at top level)
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
        id: 'wf-br-test',
        name: 'BR Test',
        slug: 'br-test',
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

function brWorkflow(brConfig: Record<string, unknown>, extraEdges: any[] = []) {
    return createWorkflow(
        [
            { id: 'start', type: 'start', name: 'Start', position: { x: 0, y: 0 }, config: { type: 'start' } },
            { id: 'br', type: 'businessRule', name: 'Business Rule', position: { x: 0, y: 50 }, config: brConfig },
            { id: 'end', type: 'end', name: 'End', position: { x: 0, y: 100 }, config: { type: 'end' } },
        ],
        [
            { id: 'e1', source: 'start', target: 'br' },
            { id: 'e2', source: 'br', target: 'end' },
            ...extraEdges,
        ],
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BusinessRuleNodeExecutor', () => {
    let engine: WorkflowEngine;

    beforeEach(() => {
        engine = new WorkflowEngine();
        mockEvaluate.mockReset();
    });

    // -----------------------------------------------------------------------
    // Config validation
    // -----------------------------------------------------------------------

    test('fails when decisionTableId is missing', async () => {
        const wf = brWorkflow({ type: 'businessRule' }); // no decisionTableId
        const exec = await engine.startExecution(wf, {});
        expect(exec.status).toBe('failed');
        expect(exec.error?.message).toContain('decision table ID');
    });

    // -----------------------------------------------------------------------
    // Successful evaluation
    // -----------------------------------------------------------------------

    test('evaluates decision table with explicit input mapping', async () => {
        mockEvaluate.mockResolvedValue({
            success: true,
            matchedRules: [{ id: 'r1' }],
            outputs: { discount: 20, tier: 'gold' },
        });

        const wf = brWorkflow({
            type: 'businessRule',
            decisionTableId: 'dt-1',
            inputMapping: { age: 'customerAge', status: 'memberStatus' },
            outputVariable: 'result',
        });

        const exec = await engine.startExecution(wf, { customerAge: 30, memberStatus: 'active' });

        expect(exec.status).toBe('completed');
        expect(mockEvaluate).toHaveBeenCalledWith(
            'dt-1',
            { inputs: { age: 30, status: 'active' } },
            expect.objectContaining({ source: expect.stringContaining('workflow:') }),
        );
        // Result stored under outputVariable
        expect(exec.variables.result).toEqual({ discount: 20, tier: 'gold' });
    });

    // -----------------------------------------------------------------------
    // Dot-path input resolution
    // -----------------------------------------------------------------------

    test('resolves dot-path expressions in input mapping', async () => {
        mockEvaluate.mockResolvedValue({
            success: true,
            matchedRules: [{ id: 'r1' }],
            outputs: { approved: true },
        });

        const wf = brWorkflow({
            type: 'businessRule',
            decisionTableId: 'dt-2',
            inputMapping: { amount: 'order.total' },
            outputVariable: 'out',
        });

        const exec = await engine.startExecution(wf, { order: { total: 500 } });

        expect(exec.status).toBe('completed');
        expect(mockEvaluate).toHaveBeenCalledWith(
            'dt-2',
            { inputs: { amount: 500 } },
            expect.anything(),
        );
    });

    // -----------------------------------------------------------------------
    // No explicit mapping – passes all variables
    // -----------------------------------------------------------------------

    test('passes all workflow variables when inputMapping is absent', async () => {
        mockEvaluate.mockResolvedValue({
            success: true,
            matchedRules: [{ id: 'r1' }],
            outputs: { result: 'ok' },
        });

        const wf = brWorkflow({
            type: 'businessRule',
            decisionTableId: 'dt-3',
            // no inputMapping
        });

        const exec = await engine.startExecution(wf, { x: 1, y: 2 });

        expect(exec.status).toBe('completed');
        // The inputs passed to evaluate should contain the workflow variables
        const callArgs = mockEvaluate.mock.calls[0];
        expect(callArgs[1].inputs).toMatchObject({ x: 1, y: 2 });
    });

    // -----------------------------------------------------------------------
    // failOnNoMatch
    // -----------------------------------------------------------------------

    test('fails when failOnNoMatch is true and no rules match', async () => {
        mockEvaluate.mockResolvedValue({
            success: true,
            matchedRules: [],
            outputs: {},
        });

        const wf = brWorkflow({
            type: 'businessRule',
            decisionTableId: 'dt-4',
            failOnNoMatch: true,
        });

        const exec = await engine.startExecution(wf, {});

        expect(exec.status).toBe('failed');
        expect(exec.error?.message).toContain('No rules matched');
    });

    test('succeeds when failOnNoMatch is false and no rules match', async () => {
        mockEvaluate.mockResolvedValue({
            success: true,
            matchedRules: [],
            outputs: {},
        });

        const wf = brWorkflow({
            type: 'businessRule',
            decisionTableId: 'dt-5',
            failOnNoMatch: false,
        });

        const exec = await engine.startExecution(wf, {});
        expect(exec.status).toBe('completed');
    });

    // -----------------------------------------------------------------------
    // Output variable naming
    // -----------------------------------------------------------------------

    test('uses default _businessRuleResult when outputVariable is absent', async () => {
        mockEvaluate.mockResolvedValue({
            success: true,
            matchedRules: [{ id: 'r1' }],
            outputs: { level: 'high' },
        });

        const wf = brWorkflow({
            type: 'businessRule',
            decisionTableId: 'dt-6',
            // no outputVariable
        });

        const exec = await engine.startExecution(wf, {});

        expect(exec.status).toBe('completed');
        expect(exec.variables._businessRuleResult).toEqual({ level: 'high' });
    });

    // -----------------------------------------------------------------------
    // Output spreading
    // -----------------------------------------------------------------------

    test('spreads top-level outputs into workflow variables', async () => {
        mockEvaluate.mockResolvedValue({
            success: true,
            matchedRules: [{ id: 'r1' }],
            outputs: { discount: 15, message: 'Applied' },
        });

        const wf = brWorkflow({
            type: 'businessRule',
            decisionTableId: 'dt-7',
            outputVariable: 'res',
        });

        const exec = await engine.startExecution(wf, {});

        expect(exec.status).toBe('completed');
        // Individual outputs accessible directly
        expect(exec.variables.discount).toBe(15);
        expect(exec.variables.message).toBe('Applied');
    });

    // -----------------------------------------------------------------------
    // Service error handling
    // -----------------------------------------------------------------------

    test('fails gracefully when decision table service throws', async () => {
        mockEvaluate.mockRejectedValue(new Error('Table not found'));

        const wf = brWorkflow({
            type: 'businessRule',
            decisionTableId: 'dt-missing',
        });

        const exec = await engine.startExecution(wf, {});

        expect(exec.status).toBe('failed');
        expect(exec.error?.message).toContain('Decision table evaluation failed');
    });
});
