/**
 * FlowForge Decision Tables API Routes
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { decisionTableService } from '../../services/decisions/decision-table.service';
import type { DecisionTable } from '../../types/decisions';

interface IdParams { id: string; }
interface InputParams extends IdParams { inputId: string; }
interface OutputParams extends IdParams { outputId: string; }
interface RuleParams extends IdParams { ruleId: string; }
interface TestParams extends IdParams { testId: string; }

// ============================================================================
// Backend → Frontend type transformation
// ============================================================================

const HIT_POLICY_MAP: Record<string, string> = {
  'UNIQUE': 'unique',
  'FIRST': 'first',
  'PRIORITY': 'priority',
  'ANY': 'any',
  'COLLECT': 'collect',
  'RULE_ORDER': 'first',
  'OUTPUT_ORDER': 'first',
};

const CONDITION_TYPE_TO_OPERATOR: Record<string, string> = {
  'any': 'any',
  'equals': 'eq',
  'notEquals': 'neq',
  'greaterThan': 'gt',
  'greaterThanOrEqual': 'gte',
  'lessThan': 'lt',
  'lessThanOrEqual': 'lte',
  'between': 'between',
  'in': 'in',
  'contains': 'contains',
  'startsWith': 'starts',
  'endsWith': 'ends',
  'matches': 'regex',
  'isNull': 'empty',
  'isNotNull': 'any',
  'expression': 'any',
};

function toFrontendTable(table: DecisionTable): unknown {
  return {
    id: table.id,
    name: table.name,
    slug: table.slug,
    description: table.description,
    hitPolicy: HIT_POLICY_MAP[table.hitPolicy] || table.hitPolicy?.toLowerCase() || 'first',
    status: table.status,
    version: table.version,
    inputs: table.inputs.map(inp => ({
      id: inp.id,
      name: inp.name,
      label: inp.label,
      type: inp.type,
      required: inp.required,
      allowedValues: inp.allowedValues,
      defaultValue: undefined,
    })),
    outputs: table.outputs.map(out => ({
      id: out.id,
      name: out.name,
      label: out.label,
      type: out.type,
      defaultValue: out.defaultValue,
    })),
    rules: table.rules.map((rule, idx) => {
      // Convert inputEntries → conditions
      const conditions: Record<string, unknown> = {};
      if (rule.inputEntries) {
        for (const [inputId, entry] of Object.entries(rule.inputEntries)) {
          const cond = entry.condition;
          const condType = cond?.type ?? 'any';
          const operator = CONDITION_TYPE_TO_OPERATOR[condType] || 'any';

          // Extract value based on condition type
          let value: unknown;
          if (condType === 'between') {
            value = `${(cond as any).min}-${(cond as any).max}`;
          } else if (condType === 'in' || condType === 'notIn') {
            value = (cond as any).values?.join(', ');
          } else if (condType === 'any' || condType === 'isNull' || condType === 'isNotNull') {
            value = undefined;
          } else {
            value = (cond as any).value;
          }

          conditions[inputId] = { operator, value };
        }
      }

      // Convert outputEntries → outputs
      const outputs: Record<string, unknown> = {};
      if (rule.outputEntries) {
        for (const [outputId, entry] of Object.entries(rule.outputEntries)) {
          outputs[outputId] = {
            value: entry.value,
            expression: entry.expression,
          };
        }
      }

      return {
        id: rule.id,
        priority: rule.priority ?? idx + 1,
        description: rule.annotation,
        conditions,
        outputs,
        enabled: rule.enabled,
      };
    }),
    createdAt: table.createdAt instanceof Date ? table.createdAt.toISOString() : table.createdAt,
    updatedAt: table.updatedAt instanceof Date ? table.updatedAt.toISOString() : table.updatedAt,
    publishedAt: table.publishedAt
      ? (table.publishedAt instanceof Date ? table.publishedAt.toISOString() : table.publishedAt)
      : undefined,
  };
}

export async function decisionTableRoutes(fastify: FastifyInstance) {
  const service = decisionTableService;

  // List tables
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { status?: string; search?: string } }>) => {
    const result = await service.listTables(request.query as any);
    return {
      tables: result.tables.map(t => toFrontendTable(t)),
      total: result.total,
    };
  });

  // Create table
  fastify.post<{ Body: { name: string; description?: string; hitPolicy?: string } }>('/', async (request, reply) => {
    const table = await service.createTable({ ...request.body as any, createdBy: 'user-1' });
    return reply.status(201).send(toFrontendTable(table));
  });

  // Get table
  fastify.get<{ Params: IdParams }>('/:id', async (request, reply) => {
    const table = await service.getTable(request.params.id);
    if (!table) return reply.status(404).send({ error: 'Table not found' });
    return toFrontendTable(table);
  });

  // Update table
  fastify.patch<{ Params: IdParams; Body: any }>('/:id', async (request, reply) => {
    const table = await service.updateTable(request.params.id, request.body as any);
    if (!table) return reply.status(404).send({ error: 'Table not found' });
    return toFrontendTable(table);
  });

  // Delete table
  fastify.delete<{ Params: IdParams }>('/:id', async (request, reply) => {
    if (!await service.deleteTable(request.params.id)) {
      return reply.status(404).send({ error: 'Table not found' });
    }
    return { success: true };
  });

  // Validate table
  fastify.post<{ Params: IdParams }>('/:id/validate', async (request, reply) => {
    const table = await service.getTable(request.params.id);
    if (!table) return reply.status(404).send({ error: 'Table not found' });
    return service.validateTable(table);
  });

  // Publish table
  fastify.post<{ Params: IdParams }>('/:id/publish', async (request, reply) => {
    try {
      const table = await service.publishTable(request.params.id, 'user-1');
      if (!table) return reply.status(404).send({ error: 'Table not found' });
      return toFrontendTable(table);
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Unpublish table
  fastify.post<{ Params: IdParams }>('/:id/unpublish', async (request, reply) => {
    const table = await service.unpublishTable(request.params.id);
    if (!table) return reply.status(404).send({ error: 'Table not found' });
    return toFrontendTable(table);
  });

  // ============================================================================
  // Inputs
  // ============================================================================

  fastify.post<{ Params: IdParams; Body: any }>('/:id/inputs', async (request, reply) => {
    const input = await service.addInput(request.params.id, request.body as any);
    if (!input) return reply.status(404).send({ error: 'Table not found' });
    return reply.status(201).send(input);
  });

  fastify.patch<{ Params: InputParams; Body: any }>('/:id/inputs/:inputId', async (request, reply) => {
    const input = await service.updateInput(request.params.id, request.params.inputId, request.body as any);
    if (!input) return reply.status(404).send({ error: 'Input not found' });
    return input;
  });

  fastify.delete<{ Params: InputParams }>('/:id/inputs/:inputId', async (request, reply) => {
    if (!await service.deleteInput(request.params.id, request.params.inputId)) {
      return reply.status(404).send({ error: 'Input not found' });
    }
    return { success: true };
  });

  // ============================================================================
  // Outputs
  // ============================================================================

  fastify.post<{ Params: IdParams; Body: any }>('/:id/outputs', async (request, reply) => {
    const output = await service.addOutput(request.params.id, request.body as any);
    if (!output) return reply.status(404).send({ error: 'Table not found' });
    return reply.status(201).send(output);
  });

  fastify.patch<{ Params: OutputParams; Body: any }>('/:id/outputs/:outputId', async (request, reply) => {
    const output = await service.updateOutput(request.params.id, request.params.outputId, request.body as any);
    if (!output) return reply.status(404).send({ error: 'Output not found' });
    return output;
  });

  fastify.delete<{ Params: OutputParams }>('/:id/outputs/:outputId', async (request, reply) => {
    if (!await service.deleteOutput(request.params.id, request.params.outputId)) {
      return reply.status(404).send({ error: 'Output not found' });
    }
    return { success: true };
  });

  // ============================================================================
  // Rules
  // ============================================================================

  fastify.post<{ Params: IdParams; Body: any }>('/:id/rules', async (request, reply) => {
    const rule = await service.addRule(request.params.id, request.body as any);
    if (!rule) return reply.status(404).send({ error: 'Table not found' });
    return reply.status(201).send(rule);
  });

  fastify.patch<{ Params: RuleParams; Body: any }>('/:id/rules/:ruleId', async (request, reply) => {
    const rule = await service.updateRule(request.params.id, request.params.ruleId, request.body as any);
    if (!rule) return reply.status(404).send({ error: 'Rule not found' });
    return rule;
  });

  fastify.delete<{ Params: RuleParams }>('/:id/rules/:ruleId', async (request, reply) => {
    if (!await service.deleteRule(request.params.id, request.params.ruleId)) {
      return reply.status(404).send({ error: 'Rule not found' });
    }
    return { success: true };
  });

  fastify.put<{ Params: IdParams; Body: { ruleIds: string[] } }>('/:id/rules/order', async (request, reply) => {
    if (!await service.reorderRules(request.params.id, request.body.ruleIds)) {
      return reply.status(404).send({ error: 'Table not found' });
    }
    return { success: true };
  });

  fastify.put<{ Params: RuleParams; Body: { inputId: string; condition: any } }>(
    '/:id/rules/:ruleId/condition',
    async (request, reply) => {
      const rule = await service.setRuleCondition(
        request.params.id,
        request.params.ruleId,
        request.body.inputId,
        request.body.condition
      );
      if (!rule) return reply.status(404).send({ error: 'Rule not found' });
      return rule;
    }
  );

  fastify.put<{ Params: RuleParams; Body: { outputId: string; value: unknown; expression?: string } }>(
    '/:id/rules/:ruleId/output',
    async (request, reply) => {
      const rule = await service.setRuleOutput(
        request.params.id,
        request.params.ruleId,
        request.body.outputId,
        request.body.value,
        request.body.expression
      );
      if (!rule) return reply.status(404).send({ error: 'Rule not found' });
      return rule;
    }
  );

  // ============================================================================
  // Evaluation
  // ============================================================================

  fastify.post<{ Params: IdParams; Body: { inputs: Record<string, unknown> } }>(
    '/:id/evaluate',
    async (request, reply) => {
      try {
        const result = await service.evaluate(
          request.params.id,
          { inputs: request.body.inputs },
          { userId: 'user-1', source: 'api' }
        );
        return result;
      } catch (error) {
        return reply.status(400).send({ error: (error as Error).message });
      }
    }
  );

  fastify.get<{ Params: IdParams; Querystring: { limit?: number; offset?: number } }>(
    '/:id/logs',
    async (request, reply) => {
      const table = await service.getTable(request.params.id);
      if (!table) return reply.status(404).send({ error: 'Table not found' });
      return service.getEvaluationLogs(request.params.id, request.query);
    }
  );

  // ============================================================================
  // Testing
  // ============================================================================

  fastify.get<{ Params: IdParams }>('/:id/tests', async (request, reply) => {
    const table = await service.getTable(request.params.id);
    if (!table) return reply.status(404).send({ error: 'Table not found' });
    const cases = await service.getTestCases(request.params.id);
    return { testCases: cases };
  });

  fastify.post<{ Params: IdParams; Body: any }>('/:id/tests', async (request, reply) => {
    const testCase = await service.addTestCase(request.params.id, request.body as any);
    if (!testCase) return reply.status(404).send({ error: 'Table not found' });
    return reply.status(201).send(testCase);
  });

  fastify.post<{ Params: TestParams }>('/:id/tests/:testId/run', async (request, reply) => {
    const result = await service.runTestCase(request.params.id, request.params.testId);
    if (!result) return reply.status(404).send({ error: 'Test case not found' });
    return result;
  });

  fastify.post<{ Params: IdParams }>('/:id/tests/run-all', async (request, reply) => {
    const table = await service.getTable(request.params.id);
    if (!table) return reply.status(404).send({ error: 'Table not found' });
    return service.runAllTests(request.params.id);
  });

  fastify.delete<{ Params: TestParams }>('/:id/tests/:testId', async (request, reply) => {
    if (!await service.deleteTestCase(request.params.id, request.params.testId)) {
      return reply.status(404).send({ error: 'Test case not found' });
    }
    return { success: true };
  });

  // ============================================================================
  // DRD — Decision Requirements Diagrams
  // ============================================================================

  // List DRDs
  fastify.get('/drds', async () => {
    const diagrams = await service.listDRDs();
    return { diagrams };
  });

  // Create DRD
  fastify.post<{ Body: { name: string; description?: string } }>('/drds', async (request, reply) => {
    const diagram = await service.createDRD({ ...request.body, createdBy: 'user-1' });
    return reply.status(201).send(diagram);
  });

  // Get DRD
  fastify.get<{ Params: { drdId: string } }>('/drds/:drdId', async (request, reply) => {
    const diagram = await service.getDRD(request.params.drdId);
    if (!diagram) return reply.status(404).send({ error: 'DRD not found' });
    return diagram;
  });

  // Update DRD (full save — nodes + edges + metadata)
  fastify.put<{ Params: { drdId: string }; Body: any }>('/drds/:drdId', async (request, reply) => {
    const diagram = await service.updateDRD(request.params.drdId, request.body as any);
    if (!diagram) return reply.status(404).send({ error: 'DRD not found' });
    return diagram;
  });

  // Delete DRD
  fastify.delete<{ Params: { drdId: string } }>('/drds/:drdId', async (request, reply) => {
    if (!await service.deleteDRD(request.params.drdId)) {
      return reply.status(404).send({ error: 'DRD not found' });
    }
    return { success: true };
  });
}
