/**
 * FlowForge Decision Tables Tests
 */

import { DecisionEngine } from '../src/services/decisions/engine';
import { DecisionTableService } from '../src/services/decisions/decision-table.service';
import type { DecisionTable, ConditionExpression } from '../src/types/decisions';

describe('Decision Engine', () => {
  const engine = new DecisionEngine();

  const createTable = (
    rules: Array<{
      conditions: Record<string, ConditionExpression>;
      outputs: Record<string, unknown>;
    }>,
    hitPolicy: DecisionTable['hitPolicy'] = 'FIRST'
  ): DecisionTable => ({
    id: 'test',
    name: 'Test',
    slug: 'test',
    inputs: [
      { id: 'in1', name: 'age', label: 'Age', type: 'number', required: false },
      { id: 'in2', name: 'status', label: 'Status', type: 'string', required: false },
    ],
    outputs: [
      { id: 'out1', name: 'discount', label: 'Discount', type: 'number' },
      { id: 'out2', name: 'message', label: 'Message', type: 'string' },
    ],
    rules: rules.map((r, i) => ({
      id: `rule-${i}`,
      inputEntries: {
        in1: { condition: r.conditions.age || { type: 'any' } },
        in2: { condition: r.conditions.status || { type: 'any' } },
      },
      outputEntries: {
        out1: { value: r.outputs.discount },
        out2: { value: r.outputs.message },
      },
      enabled: true,
    })),
    hitPolicy,
    settings: { validateInputs: true, strictMode: false, cacheEnabled: false, logEvaluations: false },
    version: 1,
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test',
    evaluationCount: 0,
  });

  describe('Condition Matching', () => {
    test('matches equals condition', () => {
      const table = createTable([
        { conditions: { age: { type: 'equals', value: 25 } }, outputs: { discount: 10, message: 'Young' } },
      ]);

      const result = engine.evaluate(table, { inputs: { age: 25 } });
      expect(result.success).toBe(true);
      expect(result.matchedRules).toHaveLength(1);
    });

    test('matches greaterThan condition', () => {
      const table = createTable([
        { conditions: { age: { type: 'greaterThan', value: 60 } }, outputs: { discount: 20, message: 'Senior' } },
      ]);

      const result = engine.evaluate(table, { inputs: { age: 65 } });
      expect(result.success).toBe(true);
      expect((result.outputs as any).discount).toBe(20);
    });

    test('matches between condition', () => {
      const table = createTable([
        { conditions: { age: { type: 'between', min: 18, max: 30 } }, outputs: { discount: 15, message: 'Young Adult' } },
      ]);

      const result = engine.evaluate(table, { inputs: { age: 25 } });
      expect(result.success).toBe(true);
      expect((result.outputs as any).discount).toBe(15);

      const result2 = engine.evaluate(table, { inputs: { age: 35 } });
      expect(result2.matchedRules).toHaveLength(0);
    });

    test('matches in condition', () => {
      const table = createTable([
        { conditions: { status: { type: 'in', values: ['gold', 'platinum'] } }, outputs: { discount: 25, message: 'VIP' } },
      ]);

      const result = engine.evaluate(table, { inputs: { status: 'gold' } });
      expect(result.success).toBe(true);
      expect((result.outputs as any).discount).toBe(25);
    });

    test('matches contains condition', () => {
      const table = createTable([
        { conditions: { status: { type: 'contains', value: 'premium' } }, outputs: { discount: 30, message: 'Premium' } },
      ]);

      const result = engine.evaluate(table, { inputs: { status: 'premium_plus' } });
      expect(result.success).toBe(true);
    });

    test('matches any condition', () => {
      const table = createTable([
        { conditions: { age: { type: 'any' } }, outputs: { discount: 5, message: 'Default' } },
      ]);

      const result = engine.evaluate(table, { inputs: { age: 999 } });
      expect(result.success).toBe(true);
      expect((result.outputs as any).discount).toBe(5);
    });

    test('matches isNull condition', () => {
      const table = createTable([
        { conditions: { status: { type: 'isNull' } }, outputs: { discount: 0, message: 'No status' } },
      ]);

      const result = engine.evaluate(table, { inputs: { age: 30 } });
      expect(result.success).toBe(true);
    });
  });

  describe('Hit Policies', () => {
    test('FIRST returns first matching rule', () => {
      const table = createTable([
        { conditions: { age: { type: 'greaterThan', value: 20 } }, outputs: { discount: 10, message: 'First' } },
        { conditions: { age: { type: 'greaterThan', value: 30 } }, outputs: { discount: 20, message: 'Second' } },
      ], 'FIRST');

      const result = engine.evaluate(table, { inputs: { age: 35 } });
      expect((result.outputs as any).message).toBe('First');
    });

    test('UNIQUE errors on multiple matches', () => {
      const table = createTable([
        { conditions: { age: { type: 'greaterThan', value: 20 } }, outputs: { discount: 10, message: 'First' } },
        { conditions: { age: { type: 'greaterThan', value: 25 } }, outputs: { discount: 20, message: 'Second' } },
      ], 'UNIQUE');

      const result = engine.evaluate(table, { inputs: { age: 30 } });
      expect(result.errors?.some(e => e.type === 'multiple_matches')).toBe(true);
    });

    test('COLLECT returns all matching outputs', () => {
      const table = createTable([
        { conditions: { age: { type: 'greaterThan', value: 20 } }, outputs: { discount: 10, message: 'A' } },
        { conditions: { age: { type: 'greaterThan', value: 25 } }, outputs: { discount: 20, message: 'B' } },
        { conditions: { age: { type: 'greaterThan', value: 30 } }, outputs: { discount: 30, message: 'C' } },
      ], 'COLLECT');

      const result = engine.evaluate(table, { inputs: { age: 35 } });
      expect(Array.isArray(result.outputs)).toBe(true);
      expect(result.outputs).toHaveLength(3);
    });

    test('PRIORITY returns highest priority rule', () => {
      const table = createTable([
        { conditions: { age: { type: 'greaterThan', value: 20 } }, outputs: { discount: 10, message: 'Low' } },
        { conditions: { age: { type: 'greaterThan', value: 20 } }, outputs: { discount: 30, message: 'High' } },
      ], 'PRIORITY');

      table.rules[0].priority = 1;
      table.rules[1].priority = 10;

      const result = engine.evaluate(table, { inputs: { age: 25 } });
      expect((result.outputs as any).message).toBe('High');
    });

    test('ANY allows same outputs', () => {
      const table = createTable([
        { conditions: { age: { type: 'greaterThan', value: 20 } }, outputs: { discount: 10, message: 'Same' } },
        { conditions: { status: { type: 'equals', value: 'active' } }, outputs: { discount: 10, message: 'Same' } },
      ], 'ANY');

      const result = engine.evaluate(table, { inputs: { age: 25, status: 'active' } });
      expect(result.success).toBe(true);
    });

    test('ANY errors on different outputs', () => {
      const table = createTable([
        { conditions: { age: { type: 'greaterThan', value: 20 } }, outputs: { discount: 10, message: 'A' } },
        { conditions: { status: { type: 'equals', value: 'active' } }, outputs: { discount: 20, message: 'B' } },
      ], 'ANY');

      const result = engine.evaluate(table, { inputs: { age: 25, status: 'active' } });
      expect(result.errors?.some(e => e.type === 'multiple_matches')).toBe(true);
    });
  });

  describe('Aggregation', () => {
    test('aggregates SUM', () => {
      const outputs = [{ discount: 10 }, { discount: 20 }, { discount: 30 }];
      const sum = engine.aggregateCollect(outputs, 'discount', 'SUM');
      expect(sum).toBe(60);
    });

    test('aggregates MIN', () => {
      const outputs = [{ discount: 10 }, { discount: 20 }, { discount: 5 }];
      const min = engine.aggregateCollect(outputs, 'discount', 'MIN');
      expect(min).toBe(5);
    });

    test('aggregates MAX', () => {
      const outputs = [{ discount: 10 }, { discount: 50 }, { discount: 30 }];
      const max = engine.aggregateCollect(outputs, 'discount', 'MAX');
      expect(max).toBe(50);
    });

    test('aggregates COUNT', () => {
      const outputs = [{ discount: 10 }, { discount: 20 }, { discount: 30 }];
      const count = engine.aggregateCollect(outputs, 'discount', 'COUNT');
      expect(count).toBe(3);
    });
  });
});

describe('Decision Table Service', () => {
  let service: DecisionTableService;

  beforeEach(() => {
    service = new DecisionTableService();
  });

  describe('Table CRUD', () => {
    test('creates a table', async () => {
      const table = await service.createTable({
        name: 'Discount Rules',
        description: 'Calculate customer discounts',
        hitPolicy: 'FIRST',
        createdBy: 'user-1',
      });

      expect(table.id).toBeDefined();
      expect(table.name).toBe('Discount Rules');
      expect(table.hitPolicy).toBe('FIRST');
      expect(table.status).toBe('draft');
    });

    test('adds inputs and outputs', async () => {
      const table = await service.createTable({ name: 'Test', createdBy: 'user-1' });

      const input = await service.addInput(table.id, {
        name: 'customerAge',
        label: 'Customer Age',
        type: 'number',
        required: true,
      });

      const output = await service.addOutput(table.id, {
        name: 'discountPercent',
        label: 'Discount %',
        type: 'number',
      });

      expect(input?.name).toBe('customerAge');
      expect(output?.name).toBe('discountPercent');

      const updated = await service.getTable(table.id);
      expect(updated?.inputs).toHaveLength(1);
      expect(updated?.outputs).toHaveLength(1);
    });

    test('adds and manages rules', async () => {
      const table = await service.createTable({ name: 'Test', createdBy: 'user-1' });
      const input = await service.addInput(table.id, { name: 'age', label: 'Age', type: 'number', required: false });
      const output = await service.addOutput(table.id, { name: 'discount', label: 'Discount', type: 'number' });

      const rule = await service.addRule(table.id, {
        inputEntries: {},
        outputEntries: {},
        enabled: true,
      });

      await service.setRuleCondition(table.id, rule!.id, input!.id, { type: 'greaterThan', value: 60 });
      await service.setRuleOutput(table.id, rule!.id, output!.id, 20);

      const updated = await service.getTable(table.id);
      expect(updated?.rules).toHaveLength(1);
      expect(updated?.rules[0].inputEntries[input!.id].condition).toEqual({ type: 'greaterThan', value: 60 });
    });

    test('publishes and validates table', async () => {
      const table = await service.createTable({ name: 'Test', createdBy: 'user-1' });
      
      // Should fail validation without inputs/outputs/rules
      await expect(service.publishTable(table.id, 'user-1')).rejects.toThrow();

      // Add required elements
      const input = await service.addInput(table.id, { name: 'x', label: 'X', type: 'number', required: false });
      const output = await service.addOutput(table.id, { name: 'y', label: 'Y', type: 'number' });
      await service.addRule(table.id, {
        inputEntries: { [input!.id]: { condition: { type: 'any' } } },
        outputEntries: { [output!.id]: { value: 1 } },
        enabled: true,
      });

      const published = await service.publishTable(table.id, 'user-1');
      expect(published?.status).toBe('published');
      expect(published?.version).toBe(2);
    });
  });

  describe('Evaluation', () => {
    test('evaluates published table', async () => {
      const table = await service.createQuickTable({
        name: 'Age Discount',
        createdBy: 'user-1',
        inputs: [{ name: 'age', label: 'Age', type: 'number' }],
        outputs: [{ name: 'discount', label: 'Discount', type: 'number' }],
        rules: [
          { conditions: { age: { type: 'lessThan', value: 18 } }, outputs: { discount: 0 } },
          { conditions: { age: { type: 'between', min: 18, max: 65 } }, outputs: { discount: 10 } },
          { conditions: { age: { type: 'greaterThan', value: 65 } }, outputs: { discount: 20 } },
        ],
        hitPolicy: 'FIRST',
      });

      await service.publishTable(table.id, 'user-1');

      const result = await service.evaluate(table.id, { inputs: { age: 70 } });
      expect(result.success).toBe(true);
      expect((result.outputs as any).discount).toBe(20);
    });

    test('logs evaluations', async () => {
      const table = await service.createQuickTable({
        name: 'Test',
        createdBy: 'user-1',
        inputs: [{ name: 'x', label: 'X', type: 'number' }],
        outputs: [{ name: 'y', label: 'Y', type: 'number' }],
        rules: [{ conditions: { x: { type: 'any' } }, outputs: { y: 1 } }],
      });

      await service.publishTable(table.id, 'user-1');

      await service.evaluate(table.id, { inputs: { x: 1 } });
      await service.evaluate(table.id, { inputs: { x: 2 } });

      const logs = await service.getEvaluationLogs(table.id);
      expect(logs.total).toBe(2);
    });
  });

  describe('Testing', () => {
    test('runs test cases', async () => {
      const table = await service.createQuickTable({
        name: 'Test',
        createdBy: 'user-1',
        inputs: [{ name: 'score', label: 'Score', type: 'number' }],
        outputs: [{ name: 'grade', label: 'Grade', type: 'string' }],
        rules: [
          { conditions: { score: { type: 'greaterThanOrEqual', value: 90 } }, outputs: { grade: 'A' } },
          { conditions: { score: { type: 'greaterThanOrEqual', value: 80 } }, outputs: { grade: 'B' } },
          { conditions: { score: { type: 'greaterThanOrEqual', value: 70 } }, outputs: { grade: 'C' } },
          { conditions: { score: { type: 'any' } }, outputs: { grade: 'F' } },
        ],
      });

      const testCase = await service.addTestCase(table.id, {
        name: 'A grade test',
        inputs: { score: 95 },
        expectedOutputs: { grade: 'A' },
      });

      const result = await service.runTestCase(table.id, testCase!.id);
      expect(result?.passed).toBe(true);
    });

    test('runs all tests', async () => {
      const table = await service.createQuickTable({
        name: 'Test',
        createdBy: 'user-1',
        inputs: [{ name: 'x', label: 'X', type: 'number' }],
        outputs: [{ name: 'y', label: 'Y', type: 'number' }],
        rules: [
          { conditions: { x: { type: 'greaterThan', value: 0 } }, outputs: { y: 1 } },
          { conditions: { x: { type: 'any' } }, outputs: { y: 0 } },
        ],
      });

      await service.addTestCase(table.id, { name: 'Positive', inputs: { x: 5 }, expectedOutputs: { y: 1 } });
      await service.addTestCase(table.id, { name: 'Negative', inputs: { x: -5 }, expectedOutputs: { y: 0 } });
      await service.addTestCase(table.id, { name: 'Wrong', inputs: { x: 5 }, expectedOutputs: { y: 999 } });

      const results = await service.runAllTests(table.id);
      expect(results.passed).toBe(2);
      expect(results.failed).toBe(1);
    });
  });
});
