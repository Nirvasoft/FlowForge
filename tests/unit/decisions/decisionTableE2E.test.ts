/**
 * End-to-end Decision Table Service Test
 * Creates its own data, exercises full CRUD → Publish → Evaluate → Audit → DRD flow
 * No seeding or server needed.
 */

// Mock Prisma (DB calls are fire-and-forget, so we just stub them)
jest.mock('../../../src/utils/prisma.js', () => ({
    prisma: {
        decisionTable: {
            upsert: jest.fn().mockResolvedValue({}),
            findUnique: jest.fn().mockResolvedValue(null),
            findMany: jest.fn().mockResolvedValue([]),
            delete: jest.fn().mockResolvedValue({}),
        },
        auditLog: {
            create: jest.fn().mockResolvedValue({}),
        },
    },
}));

import { DecisionTableService } from '../../../src/services/decisions/decision-table.service';

describe('DecisionTableService — Full E2E Flow', () => {
    const service = new DecisionTableService();
    let tableId: string;

    // ========================
    // 1. CRUD
    // ========================

    test('creates a decision table', async () => {
        const table = await service.createTable({
            name: 'Expense Approval',
            description: 'Route expense claims by amount',
            hitPolicy: 'FIRST',
            createdBy: 'test-user',
        });

        expect(table).toBeDefined();
        expect(table.id).toBeDefined();
        expect(table.name).toBe('Expense Approval');
        expect(table.status).toBe('draft');
        expect(table.inputs).toEqual([]);
        expect(table.outputs).toEqual([]);
        expect(table.rules).toEqual([]);

        tableId = table.id;
    });

    test('adds input columns', async () => {
        const amount = await service.addInput(tableId, {
            name: 'amount',
            label: 'Amount ($)',
            type: 'number',
            required: true,
        });
        expect(amount).toBeDefined();
        expect(amount!.name).toBe('amount');

        const dept = await service.addInput(tableId, {
            name: 'department',
            label: 'Department',
            type: 'string',
            required: true,
        });
        expect(dept).toBeDefined();
        expect(dept!.name).toBe('department');

        const table = await service.getTable(tableId);
        expect(table!.inputs).toHaveLength(2);
    });

    test('adds output columns', async () => {
        const approver = await service.addOutput(tableId, {
            name: 'approver',
            label: 'Approver',
            type: 'string',
        });
        expect(approver).toBeDefined();

        const level = await service.addOutput(tableId, {
            name: 'level',
            label: 'Approval Level',
            type: 'string',
        });
        expect(level).toBeDefined();

        const table = await service.getTable(tableId);
        expect(table!.outputs).toHaveLength(2);
    });

    test('adds rules', async () => {
        const table = await service.getTable(tableId);
        const [amountInput, deptInput] = table!.inputs;
        const [approverOutput, levelOutput] = table!.outputs;

        // Rule 1: amount <= 500 → auto-approved
        const rule1 = await service.addRule(tableId, {
            inputEntries: {
                [amountInput!.id]: { condition: { type: 'lessThanOrEqual', value: 500 } },
                [deptInput!.id]: { condition: { type: 'any' } },
            },
            outputEntries: {
                [approverOutput!.id]: { value: 'auto-approved' },
                [levelOutput!.id]: { value: 'none' },
            },
            enabled: true,
        });
        expect(rule1).toBeDefined();

        // Rule 2: amount 501-5000 → manager
        const rule2 = await service.addRule(tableId, {
            inputEntries: {
                [amountInput!.id]: { condition: { type: 'between', min: 501, max: 5000 } },
                [deptInput!.id]: { condition: { type: 'any' } },
            },
            outputEntries: {
                [approverOutput!.id]: { value: 'manager' },
                [levelOutput!.id]: { value: 'department' },
            },
            enabled: true,
        });
        expect(rule2).toBeDefined();

        // Rule 3: amount > 5000, Engineering → VP Engineering
        const rule3 = await service.addRule(tableId, {
            inputEntries: {
                [amountInput!.id]: { condition: { type: 'greaterThan', value: 5000 } },
                [deptInput!.id]: { condition: { type: 'equals', value: 'Engineering' } },
            },
            outputEntries: {
                [approverOutput!.id]: { value: 'VP Engineering' },
                [levelOutput!.id]: { value: 'executive' },
            },
            enabled: true,
        });
        expect(rule3).toBeDefined();

        // Rule 4: amount > 5000, any dept → CFO
        const rule4 = await service.addRule(tableId, {
            inputEntries: {
                [amountInput!.id]: { condition: { type: 'greaterThan', value: 5000 } },
                [deptInput!.id]: { condition: { type: 'any' } },
            },
            outputEntries: {
                [approverOutput!.id]: { value: 'CFO' },
                [levelOutput!.id]: { value: 'executive' },
            },
            enabled: true,
        });
        expect(rule4).toBeDefined();

        const updated = await service.getTable(tableId);
        expect(updated!.rules).toHaveLength(4);
    });

    // ========================
    // 2. Publish + Evaluate
    // ========================

    test('publishes the table', async () => {
        const published = await service.publishTable(tableId, 'test-user');
        expect(published).toBeDefined();
        expect(published!.status).toBe('published');
        expect(published!.publishedAt).toBeDefined();
    });

    test('evaluates: small amount → auto-approved', async () => {
        const result = await service.evaluate(tableId, { inputs: { amount: 200, department: 'Marketing' } });
        expect(result.success).toBe(true);
        expect(result.matchedRules.length).toBeGreaterThanOrEqual(1);
        const out = result.outputs as Record<string, unknown>;
        expect(out.approver).toBe('auto-approved');
        expect(out.level).toBe('none');
    });

    test('evaluates: mid amount → manager', async () => {
        const result = await service.evaluate(tableId, { inputs: { amount: 2500, department: 'Sales' } });
        expect(result.success).toBe(true);
        const out = result.outputs as Record<string, unknown>;
        expect(out.approver).toBe('manager');
        expect(out.level).toBe('department');
    });

    test('evaluates: large amount + Engineering → VP Engineering', async () => {
        const result = await service.evaluate(tableId, { inputs: { amount: 10000, department: 'Engineering' } });
        expect(result.success).toBe(true);
        const out = result.outputs as Record<string, unknown>;
        expect(out.approver).toBe('VP Engineering');
        expect(out.level).toBe('executive');
    });

    test('evaluates: large amount + other dept → CFO', async () => {
        const result = await service.evaluate(tableId, { inputs: { amount: 10000, department: 'HR' } });
        expect(result.success).toBe(true);
        const out = result.outputs as Record<string, unknown>;
        // FIRST hit policy: Engineering-specific rule won't match HR, so CFO rule fires
        expect(out.approver).toBe('CFO');
    });

    test('evaluation count increments', async () => {
        const table = await service.getTable(tableId);
        expect(table!.evaluationCount).toBe(4); // 4 evaluations above
        expect(table!.lastEvaluatedAt).toBeDefined();
    });

    // ========================
    // 3. List + Update + Delete
    // ========================

    test('lists tables', async () => {
        const result = await service.listTables();
        expect(result.tables.length).toBeGreaterThanOrEqual(1);
        const found = result.tables.find(t => t.id === tableId);
        expect(found).toBeDefined();
    });

    test('updates table name', async () => {
        const updated = await service.updateTable(tableId, { name: 'Expense Approval v2' });
        expect(updated).toBeDefined();
        expect(updated!.name).toBe('Expense Approval v2');
    });

    test('unpublishes table', async () => {
        const draft = await service.unpublishTable(tableId);
        expect(draft!.status).toBe('draft');
    });

    test('cannot evaluate draft table', async () => {
        await expect(
            service.evaluate(tableId, { inputs: { amount: 100 } })
        ).rejects.toThrow('Can only evaluate published tables');
    });

    // ========================
    // 4. DRD CRUD
    // ========================

    test('creates and manages a DRD', async () => {
        const drd = await service.createDRD({ name: 'Expense DRD', description: 'Maps expense flow' });
        expect(drd.id).toBeDefined();
        expect(drd.nodes).toEqual([]);

        // Add decision node
        const decision = await service.addDRDNode(drd.id, {
            type: 'decision',
            label: 'Expense Approval',
            position: { x: 300, y: 200 },
            decisionTableId: tableId,
        });
        expect(decision).toBeDefined();

        // Add input data node
        const input = await service.addDRDNode(drd.id, {
            type: 'inputData',
            label: 'Expense Claim',
            position: { x: 300, y: 50 },
        });
        expect(input).toBeDefined();

        // Add edge
        const edge = await service.addDRDEdge(drd.id, {
            type: 'informationRequirement',
            sourceNodeId: input!.id,
            targetNodeId: decision!.id,
        });
        expect(edge).toBeDefined();

        // Verify diagram
        const loaded = await service.getDRD(drd.id);
        expect(loaded!.nodes).toHaveLength(2);
        expect(loaded!.edges).toHaveLength(1);

        // List
        const list = await service.listDRDs();
        expect(list.length).toBeGreaterThanOrEqual(1);

        // Remove node (should cascade edges)
        await service.removeDRDNode(drd.id, input!.id);
        const after = await service.getDRD(drd.id);
        expect(after!.nodes).toHaveLength(1);
        expect(after!.edges).toHaveLength(0); // edge removed with node

        // Delete DRD
        expect(await service.deleteDRD(drd.id)).toBe(true);
        expect(await service.getDRD(drd.id)).toBeNull();
    });

    // ========================
    // 5. Cleanup
    // ========================

    test('deletes the table', async () => {
        expect(await service.deleteTable(tableId)).toBe(true);
        expect(await service.getTable(tableId)).toBeNull();
    });
});
