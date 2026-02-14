/**
 * FlowForge Decision Table Service
 * CRUD operations and evaluation with Prisma persistence
 */

import { randomUUID } from 'crypto';
import type {
  DecisionTable,
  DecisionInput,
  DecisionOutput,
  DecisionRule,
  DecisionTableSettings,
  EvaluationContext,
  EvaluationResult,
  EvaluationLog,
  TestCase,
  TestResult,
  HitPolicy,
  ConditionExpression,
} from '../../types/decisions';
import type { DRDDiagram, DRDNode, DRDEdge } from '../../types/decisions/drd';
import { DecisionEngine, decisionEngine } from './engine';
import { prisma } from '../../utils/prisma.js';
import { auditService } from '../audit/audit.service';

// ============================================================================
// In-Memory Storage (cache; Prisma is the fallback source of truth)
// ============================================================================

const tables = new Map<string, DecisionTable>();
const evaluationLogs = new Map<string, EvaluationLog[]>();
const testCases = new Map<string, TestCase[]>();
const drdDiagrams = new Map<string, DRDDiagram>();

// ============================================================================
// Persistence Helpers
// ============================================================================

const DEFAULT_ACCOUNT_ID = '56dc14cc-16f6-45ef-9797-c77a648ed6f2';
const DEFAULT_USER_ID = '30620aae-f229-40f0-8f3d-31704087fed4';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

function statusToDb(s: string): 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' {
  const map: Record<string, 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'> = {
    draft: 'DRAFT', published: 'PUBLISHED', archived: 'ARCHIVED',
  };
  return map[s?.toLowerCase()] || 'DRAFT';
}

function statusFromDb(s: string): 'draft' | 'published' | 'archived' {
  const map: Record<string, 'draft' | 'published' | 'archived'> = {
    DRAFT: 'draft', PUBLISHED: 'published', ARCHIVED: 'archived',
  };
  return map[s] || 'draft';
}

function dbRecordToTable(record: any): DecisionTable {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug || record.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: record.description || undefined,
    inputs: Array.isArray(record.inputSchema) ? record.inputSchema : [],
    outputs: Array.isArray(record.outputSchema) ? record.outputSchema : [],
    rules: Array.isArray(record.rules) ? record.rules : [],
    hitPolicy: (record.hitPolicy as HitPolicy) || 'FIRST',
    settings: (record.settings as DecisionTableSettings) || {
      validateInputs: true, strictMode: false, cacheEnabled: true, cacheDuration: 60000, logEvaluations: true,
    },
    version: record.version || 1,
    status: statusFromDb(record.status),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy || 'system',
    publishedAt: record.publishedAt || undefined,
    publishedBy: record.publishedBy || undefined,
    evaluationCount: record.evaluationCount || 0,
    lastEvaluatedAt: record.lastEvaluatedAt || undefined,
  };
}

async function syncTableToDb(table: DecisionTable): Promise<void> {
  try {
    await prisma.decisionTable.upsert({
      where: { id: table.id },
      update: {
        name: table.name,
        slug: table.slug,
        description: table.description || null,
        inputSchema: table.inputs as any,
        outputSchema: table.outputs as any,
        rules: table.rules as any,
        hitPolicy: table.hitPolicy as any,
        settings: (table.settings || {}) as any,
        version: table.version || 1,
        status: statusToDb(table.status) as any,
        publishedAt: table.publishedAt || null,
        publishedBy: isUUID(table.publishedBy) ? table.publishedBy : null,
        evaluationCount: table.evaluationCount || 0,
        lastEvaluatedAt: table.lastEvaluatedAt || null,
      } as any,
      create: {
        id: table.id,
        accountId: DEFAULT_ACCOUNT_ID,
        name: table.name,
        slug: table.slug,
        description: table.description || null,
        inputSchema: table.inputs as any,
        outputSchema: table.outputs as any,
        rules: table.rules as any,
        hitPolicy: table.hitPolicy as any,
        settings: (table.settings || {}) as any,
        version: table.version || 1,
        status: statusToDb(table.status) as any,
        publishedAt: table.publishedAt || null,
        publishedBy: isUUID(table.publishedBy) ? table.publishedBy : null,
        evaluationCount: table.evaluationCount || 0,
        lastEvaluatedAt: table.lastEvaluatedAt || null,
        createdBy: isUUID(table.createdBy) ? table.createdBy : DEFAULT_USER_ID,
      } as any,
    });
  } catch (e) {
    console.warn('syncTableToDb failed:', (e as Error).message);
  }
}

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: DecisionTableSettings = {
  validateInputs: true,
  strictMode: false,
  cacheEnabled: true,
  cacheDuration: 60000,
  logEvaluations: true,
};

// ============================================================================
// Decision Table Service
// ============================================================================

export class DecisionTableService {
  private engine: DecisionEngine;

  constructor() {
    this.engine = decisionEngine;
  }

  // ============================================================================
  // Table CRUD
  // ============================================================================

  async createTable(input: {
    name: string;
    description?: string;
    hitPolicy?: HitPolicy;
    createdBy: string;
  }): Promise<DecisionTable> {
    const id = randomUUID();
    const now = new Date();

    const table: DecisionTable = {
      id,
      name: input.name,
      slug: this.generateSlug(input.name),
      description: input.description,
      inputs: [],
      outputs: [],
      rules: [],
      hitPolicy: input.hitPolicy || 'FIRST',
      settings: { ...DEFAULT_SETTINGS },
      version: 1,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
      evaluationCount: 0,
    };

    tables.set(id, table);
    evaluationLogs.set(id, []);
    testCases.set(id, []);
    await syncTableToDb(table);

    return table;
  }

  async getTable(id: string): Promise<DecisionTable | null> {
    const cached = tables.get(id);
    if (cached) return cached;

    // Fallback: load from Prisma
    try {
      const record = await prisma.decisionTable.findUnique({ where: { id } });
      if (!record) return null;
      const table = dbRecordToTable(record);
      tables.set(id, table);
      return table;
    } catch {
      return null;
    }
  }

  async getTableBySlug(slug: string): Promise<DecisionTable | null> {
    for (const table of tables.values()) {
      if (table.slug === slug) return table;
    }

    // Fallback: load from Prisma
    try {
      const records = await prisma.decisionTable.findMany({ where: { slug } as any });
      if (records.length === 0) return null;
      const table = dbRecordToTable(records[0]);
      tables.set(table.id, table);
      return table;
    } catch {
      return null;
    }
  }

  async listTables(options: {
    status?: 'draft' | 'published' | 'archived';
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ tables: DecisionTable[]; total: number }> {
    // Merge in-memory with DB
    const memItems = Array.from(tables.values());
    const seenIds = new Set(memItems.map(t => t.id));

    try {
      const where: any = {};
      if (options.status) where.status = statusToDb(options.status);
      if (options.search) {
        where.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { description: { contains: options.search, mode: 'insensitive' } },
        ];
      }
      const dbRecords = await prisma.decisionTable.findMany({ where, orderBy: { updatedAt: 'desc' } });
      for (const r of dbRecords) {
        if (!seenIds.has(r.id)) {
          const t = dbRecordToTable(r);
          memItems.push(t);
          tables.set(r.id, t); // cache
        }
      }
    } catch {
      // DB unavailable — use what's in memory
    }

    let items = memItems;

    if (options.status) {
      items = items.filter(t => t.status === options.status);
    }
    if (options.search) {
      const search = options.search.toLowerCase();
      items = items.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search)
      );
    }

    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const start = (page - 1) * pageSize;

    return {
      tables: items.slice(start, start + pageSize),
      total: items.length,
    };
  }

  async updateTable(
    id: string,
    input: Partial<Pick<DecisionTable, 'name' | 'description' | 'hitPolicy' | 'settings'>>
  ): Promise<DecisionTable | null> {
    const table = tables.get(id);
    if (!table) return null;

    if (input.name) {
      table.name = input.name;
      table.slug = this.generateSlug(input.name);
    }
    if (input.description !== undefined) table.description = input.description;
    if (input.hitPolicy) table.hitPolicy = input.hitPolicy;
    if (input.settings) table.settings = { ...table.settings, ...input.settings };

    table.updatedAt = new Date();
    tables.set(id, table);
    await syncTableToDb(table);
    return table;
  }

  async deleteTable(id: string): Promise<boolean> {
    evaluationLogs.delete(id);
    testCases.delete(id);
    const deleted = tables.delete(id);
    try { await prisma.decisionTable.delete({ where: { id } }); } catch { }
    return deleted;
  }

  async publishTable(id: string, publishedBy: string): Promise<DecisionTable | null> {
    const table = tables.get(id);
    if (!table) return null;

    // Validate table
    const validation = this.validateTable(table);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    table.status = 'published';
    table.version++;
    table.publishedAt = new Date();
    table.publishedBy = publishedBy;
    table.updatedAt = new Date();

    tables.set(id, table);
    await syncTableToDb(table);
    return table;
  }

  async unpublishTable(id: string): Promise<DecisionTable | null> {
    const table = tables.get(id);
    if (!table) return null;

    table.status = 'draft';
    table.updatedAt = new Date();
    tables.set(id, table);
    await syncTableToDb(table);
    return table;
  }

  validateTable(table: DecisionTable): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (table.inputs.length === 0) {
      errors.push('Table must have at least one input');
    }
    if (table.outputs.length === 0) {
      errors.push('Table must have at least one output');
    }
    if (table.rules.length === 0) {
      errors.push('Table must have at least one rule');
    }

    // Check for duplicate input/output names
    const inputNames = new Set<string>();
    for (const input of table.inputs) {
      if (inputNames.has(input.name)) {
        errors.push(`Duplicate input name: ${input.name}`);
      }
      inputNames.add(input.name);
    }

    const outputNames = new Set<string>();
    for (const output of table.outputs) {
      if (outputNames.has(output.name)) {
        errors.push(`Duplicate output name: ${output.name}`);
      }
      outputNames.add(output.name);
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // Input Management
  // ============================================================================

  async addInput(tableId: string, input: Omit<DecisionInput, 'id'>): Promise<DecisionInput | null> {
    const table = tables.get(tableId);
    if (!table) return null;

    const newInput: DecisionInput = {
      ...input,
      id: randomUUID(),
    };

    table.inputs.push(newInput);
    table.updatedAt = new Date();
    tables.set(tableId, table);
    await syncTableToDb(table);
    return newInput;
  }

  async updateInput(
    tableId: string,
    inputId: string,
    updates: Partial<Omit<DecisionInput, 'id'>>
  ): Promise<DecisionInput | null> {
    const table = tables.get(tableId);
    if (!table) return null;

    const input = table.inputs.find(i => i.id === inputId);
    if (!input) return null;

    Object.assign(input, updates);
    table.updatedAt = new Date();
    tables.set(tableId, table);
    await syncTableToDb(table);
    return input;
  }

  async deleteInput(tableId: string, inputId: string): Promise<boolean> {
    const table = tables.get(tableId);
    if (!table) return false;

    const index = table.inputs.findIndex(i => i.id === inputId);
    if (index === -1) return false;

    table.inputs.splice(index, 1);

    // Remove from rules
    for (const rule of table.rules) {
      delete rule.inputEntries[inputId];
    }

    table.updatedAt = new Date();
    tables.set(tableId, table);
    await syncTableToDb(table);
    return true;
  }

  // ============================================================================
  // Output Management
  // ============================================================================

  async addOutput(tableId: string, output: Omit<DecisionOutput, 'id'>): Promise<DecisionOutput | null> {
    const table = tables.get(tableId);
    if (!table) return null;

    const newOutput: DecisionOutput = {
      ...output,
      id: randomUUID(),
    };

    table.outputs.push(newOutput);
    table.updatedAt = new Date();
    tables.set(tableId, table);
    await syncTableToDb(table);
    return newOutput;
  }

  async updateOutput(
    tableId: string,
    outputId: string,
    updates: Partial<Omit<DecisionOutput, 'id'>>
  ): Promise<DecisionOutput | null> {
    const table = tables.get(tableId);
    if (!table) return null;

    const output = table.outputs.find(o => o.id === outputId);
    if (!output) return null;

    Object.assign(output, updates);
    table.updatedAt = new Date();
    tables.set(tableId, table);
    await syncTableToDb(table);
    return output;
  }

  async deleteOutput(tableId: string, outputId: string): Promise<boolean> {
    const table = tables.get(tableId);
    if (!table) return false;

    const index = table.outputs.findIndex(o => o.id === outputId);
    if (index === -1) return false;

    table.outputs.splice(index, 1);

    // Remove from rules
    for (const rule of table.rules) {
      delete rule.outputEntries[outputId];
    }

    table.updatedAt = new Date();
    tables.set(tableId, table);
    await syncTableToDb(table);
    return true;
  }

  // ============================================================================
  // Rule Management
  // ============================================================================

  async addRule(tableId: string, rule: Omit<DecisionRule, 'id'>): Promise<DecisionRule | null> {
    const table = tables.get(tableId);
    if (!table) return null;

    const newRule: DecisionRule = {
      ...rule,
      id: randomUUID(),
      enabled: rule.enabled ?? true,
    };

    table.rules.push(newRule);
    table.updatedAt = new Date();
    tables.set(tableId, table);
    await syncTableToDb(table);
    return newRule;
  }

  async updateRule(
    tableId: string,
    ruleId: string,
    updates: Partial<Omit<DecisionRule, 'id'>>
  ): Promise<DecisionRule | null> {
    const table = tables.get(tableId);
    if (!table) return null;

    const rule = table.rules.find(r => r.id === ruleId);
    if (!rule) return null;

    Object.assign(rule, updates);
    table.updatedAt = new Date();
    tables.set(tableId, table);
    await syncTableToDb(table);
    return rule;
  }

  async deleteRule(tableId: string, ruleId: string): Promise<boolean> {
    const table = tables.get(tableId);
    if (!table) return false;

    const index = table.rules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;

    table.rules.splice(index, 1);
    table.updatedAt = new Date();
    tables.set(tableId, table);
    await syncTableToDb(table);
    return true;
  }

  async reorderRules(tableId: string, ruleIds: string[]): Promise<boolean> {
    const table = tables.get(tableId);
    if (!table) return false;

    const ruleMap = new Map(table.rules.map(r => [r.id, r]));
    table.rules = ruleIds.map(id => ruleMap.get(id)).filter(Boolean) as DecisionRule[];
    table.updatedAt = new Date();
    tables.set(tableId, table);
    await syncTableToDb(table);
    return true;
  }

  async setRuleCondition(
    tableId: string,
    ruleId: string,
    inputId: string,
    condition: ConditionExpression
  ): Promise<DecisionRule | null> {
    const table = tables.get(tableId);
    if (!table) return null;

    const rule = table.rules.find(r => r.id === ruleId);
    if (!rule) return null;

    rule.inputEntries[inputId] = { condition };
    table.updatedAt = new Date();
    tables.set(tableId, table);
    await syncTableToDb(table);
    return rule;
  }

  async setRuleOutput(
    tableId: string,
    ruleId: string,
    outputId: string,
    value: unknown,
    expression?: string
  ): Promise<DecisionRule | null> {
    const table = tables.get(tableId);
    if (!table) return null;

    const rule = table.rules.find(r => r.id === ruleId);
    if (!rule) return null;

    rule.outputEntries[outputId] = { value, expression };
    table.updatedAt = new Date();
    tables.set(tableId, table);
    await syncTableToDb(table);
    return rule;
  }

  // ============================================================================
  // Evaluation
  // ============================================================================

  async evaluate(
    tableId: string,
    context: EvaluationContext,
    options: { userId?: string; source?: string } = {}
  ): Promise<EvaluationResult> {
    const table = tables.get(tableId);
    if (!table) {
      throw new Error('Decision table not found');
    }

    if (table.status !== 'published') {
      throw new Error('Can only evaluate published tables');
    }

    const result = this.engine.evaluate(table, context);

    // Update stats
    table.lastEvaluatedAt = new Date();
    table.evaluationCount++;
    tables.set(tableId, table);
    // Fire-and-forget sync to persist evaluation stats
    syncTableToDb(table).catch(() => { });

    // Log evaluation
    if (table.settings.logEvaluations) {
      const log: EvaluationLog = {
        id: randomUUID(),
        decisionTableId: tableId,
        decisionTableVersion: table.version,
        inputs: context.inputs,
        outputs: result.outputs,
        matchedRuleIds: result.matchedRules.map(r => r.ruleId),
        success: result.success,
        error: result.errors?.[0]?.message,
        durationMs: result.durationMs,
        evaluatedAt: result.evaluatedAt,
        evaluatedBy: options.userId,
        source: options.source,
      };

      const logs = evaluationLogs.get(tableId) || [];
      logs.push(log);
      // Keep last 1000 logs
      if (logs.length > 1000) logs.shift();
      evaluationLogs.set(tableId, logs);
    }

    // Audit: log evaluation event
    auditService.log({
      action: 'decision_table.evaluated',
      resource: 'decision_table',
      resourceId: tableId,
      userId: options.userId,
      newData: {
        tableName: table.name,
        version: table.version,
        matchedRules: result.matchedRules.length,
        success: result.success,
        durationMs: result.durationMs,
        source: options.source,
      },
    }).catch(() => { });

    return result;
  }

  async getEvaluationLogs(
    tableId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ logs: EvaluationLog[]; total: number }> {
    const logs = evaluationLogs.get(tableId) || [];
    const sorted = [...logs].sort((a, b) =>
      b.evaluatedAt.getTime() - a.evaluatedAt.getTime()
    );

    const offset = options.offset || 0;
    const limit = options.limit || 50;

    return {
      logs: sorted.slice(offset, offset + limit),
      total: sorted.length,
    };
  }

  // ============================================================================
  // Testing
  // ============================================================================

  async addTestCase(tableId: string, testCase: Omit<TestCase, 'id'>): Promise<TestCase | null> {
    const table = tables.get(tableId);
    if (!table) return null;

    const newCase: TestCase = {
      ...testCase,
      id: randomUUID(),
    };

    const cases = testCases.get(tableId) || [];
    cases.push(newCase);
    testCases.set(tableId, cases);
    return newCase;
  }

  async runTestCase(tableId: string, testCaseId: string): Promise<TestResult | null> {
    const table = tables.get(tableId);
    if (!table) return null;

    const cases = testCases.get(tableId) || [];
    const testCase = cases.find(c => c.id === testCaseId);
    if (!testCase) return null;

    const result = this.engine.evaluate(table, { inputs: testCase.inputs });

    const testResult: TestResult = {
      passed: this.compareOutputs(result.outputs, testCase.expectedOutputs),
      executedAt: new Date(),
      actualOutputs: result.outputs,
      matchedRules: result.matchedRules.map(r => r.ruleId),
      error: result.errors?.[0]?.message,
    };

    testCase.lastResult = testResult;
    testCases.set(tableId, cases);

    return testResult;
  }

  async runAllTests(tableId: string): Promise<{ passed: number; failed: number; results: Record<string, TestResult> }> {
    const cases = testCases.get(tableId) || [];
    const results: Record<string, TestResult> = {};
    let passed = 0;
    let failed = 0;

    for (const testCase of cases) {
      const result = await this.runTestCase(tableId, testCase.id);
      if (result) {
        results[testCase.id] = result;
        if (result.passed) passed++;
        else failed++;
      }
    }

    return { passed, failed, results };
  }

  async getTestCases(tableId: string): Promise<TestCase[]> {
    return testCases.get(tableId) || [];
  }

  async deleteTestCase(tableId: string, testCaseId: string): Promise<boolean> {
    const cases = testCases.get(tableId);
    if (!cases) return false;

    const index = cases.findIndex(c => c.id === testCaseId);
    if (index === -1) return false;

    cases.splice(index, 1);
    testCases.set(tableId, cases);
    return true;
  }

  private compareOutputs(actual: unknown, expected: unknown): boolean {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // ============================================================================
  // Quick Table Builder
  // ============================================================================

  async createQuickTable(config: {
    name: string;
    createdBy: string;
    inputs: Array<{ name: string; label: string; type: DecisionInput['type'] }>;
    outputs: Array<{ name: string; label: string; type: DecisionOutput['type'] }>;
    rules: Array<{
      conditions: Record<string, ConditionExpression>;
      outputs: Record<string, unknown>;
    }>;
    hitPolicy?: HitPolicy;
  }): Promise<DecisionTable> {
    const table = await this.createTable({
      name: config.name,
      createdBy: config.createdBy,
      hitPolicy: config.hitPolicy,
    });

    // Add inputs
    const inputMap = new Map<string, string>();
    for (const input of config.inputs) {
      const added = await this.addInput(table.id, {
        name: input.name,
        label: input.label,
        type: input.type,
        required: false,
      });
      if (added) inputMap.set(input.name, added.id);
    }

    // Add outputs
    const outputMap = new Map<string, string>();
    for (const output of config.outputs) {
      const added = await this.addOutput(table.id, {
        name: output.name,
        label: output.label,
        type: output.type,
      });
      if (added) outputMap.set(output.name, added.id);
    }

    // Add rules
    for (const ruleConfig of config.rules) {
      const inputEntries: Record<string, { condition: ConditionExpression }> = {};
      for (const [name, condition] of Object.entries(ruleConfig.conditions)) {
        const inputId = inputMap.get(name);
        if (inputId) {
          inputEntries[inputId] = { condition };
        }
      }

      const outputEntries: Record<string, { value: unknown }> = {};
      for (const [name, value] of Object.entries(ruleConfig.outputs)) {
        const outputId = outputMap.get(name);
        if (outputId) {
          outputEntries[outputId] = { value };
        }
      }

      await this.addRule(table.id, {
        inputEntries,
        outputEntries,
        enabled: true,
      });
    }

    return (await this.getTable(table.id))!;
  }
  // ============================================================================
  // DRD — Decision Requirements Diagrams
  // ============================================================================

  async createDRD(input: { name: string; description?: string; createdBy?: string }): Promise<DRDDiagram> {
    const diagram: DRDDiagram = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      nodes: [],
      edges: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.createdBy,
    };
    drdDiagrams.set(diagram.id, diagram);
    return diagram;
  }

  async getDRD(id: string): Promise<DRDDiagram | null> {
    return drdDiagrams.get(id) || null;
  }

  async listDRDs(): Promise<DRDDiagram[]> {
    return Array.from(drdDiagrams.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async updateDRD(
    id: string,
    updates: { name?: string; description?: string; nodes?: DRDNode[]; edges?: DRDEdge[] }
  ): Promise<DRDDiagram | null> {
    const diagram = drdDiagrams.get(id);
    if (!diagram) return null;

    if (updates.name !== undefined) diagram.name = updates.name;
    if (updates.description !== undefined) diagram.description = updates.description;
    if (updates.nodes !== undefined) diagram.nodes = updates.nodes;
    if (updates.edges !== undefined) diagram.edges = updates.edges;
    diagram.updatedAt = new Date();

    drdDiagrams.set(id, diagram);
    return diagram;
  }

  async deleteDRD(id: string): Promise<boolean> {
    return drdDiagrams.delete(id);
  }

  async addDRDNode(diagramId: string, node: Omit<DRDNode, 'id'>): Promise<DRDNode | null> {
    const diagram = drdDiagrams.get(diagramId);
    if (!diagram) return null;

    const newNode: DRDNode = { ...node, id: randomUUID() };
    diagram.nodes.push(newNode);
    diagram.updatedAt = new Date();
    return newNode;
  }

  async updateDRDNode(
    diagramId: string,
    nodeId: string,
    updates: Partial<Omit<DRDNode, 'id'>>
  ): Promise<DRDNode | null> {
    const diagram = drdDiagrams.get(diagramId);
    if (!diagram) return null;

    const node = diagram.nodes.find(n => n.id === nodeId);
    if (!node) return null;

    Object.assign(node, updates);
    diagram.updatedAt = new Date();
    return node;
  }

  async removeDRDNode(diagramId: string, nodeId: string): Promise<boolean> {
    const diagram = drdDiagrams.get(diagramId);
    if (!diagram) return false;

    const idx = diagram.nodes.findIndex(n => n.id === nodeId);
    if (idx === -1) return false;

    diagram.nodes.splice(idx, 1);
    // Also remove connected edges
    diagram.edges = diagram.edges.filter(
      e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
    );
    diagram.updatedAt = new Date();
    return true;
  }

  async addDRDEdge(diagramId: string, edge: Omit<DRDEdge, 'id'>): Promise<DRDEdge | null> {
    const diagram = drdDiagrams.get(diagramId);
    if (!diagram) return null;

    const newEdge: DRDEdge = { ...edge, id: randomUUID() };
    diagram.edges.push(newEdge);
    diagram.updatedAt = new Date();
    return newEdge;
  }

  async removeDRDEdge(diagramId: string, edgeId: string): Promise<boolean> {
    const diagram = drdDiagrams.get(diagramId);
    if (!diagram) return false;

    const idx = diagram.edges.findIndex(e => e.id === edgeId);
    if (idx === -1) return false;

    diagram.edges.splice(idx, 1);
    diagram.updatedAt = new Date();
    return true;
  }
}

export const decisionTableService = new DecisionTableService();

// ============================================================================
// Seed: Expense Approval Routing Decision Table
// ============================================================================

export async function seedExpenseApprovalTable(): Promise<void> {
  // Check if already seeded
  const existing = await decisionTableService.getTableBySlug('expense-approval-routing');
  if (existing) {
    console.log('  ✅ Expense Approval Routing table already exists');
    return;
  }

  const table = await decisionTableService.createQuickTable({
    name: 'Expense Approval Routing',
    createdBy: 'system',
    hitPolicy: 'FIRST',
    inputs: [
      { name: 'category', label: 'Category', type: 'string' },
      { name: 'amount', label: 'Amount', type: 'number' },
    ],
    outputs: [
      { name: 'approver', label: 'Approver', type: 'string' },
      { name: 'financeReview', label: 'Finance Review?', type: 'boolean' },
    ],
    rules: [
      // Rule 1: Any category, ≤ $100 → Auto-approve
      {
        conditions: {
          category: { type: 'any' },
          amount: { type: 'lessThanOrEqual', value: 100 },
        },
        outputs: { approver: 'auto', financeReview: false },
      },
      // Rule 2: Meals, ≤ $250 → Manager, no finance
      {
        conditions: {
          category: { type: 'equals', value: 'meals' },
          amount: { type: 'lessThanOrEqual', value: 250 },
        },
        outputs: { approver: 'manager', financeReview: false },
      },
      // Rule 3: Meals, > $250 → Manager + finance
      {
        conditions: {
          category: { type: 'equals', value: 'meals' },
          amount: { type: 'greaterThan', value: 250 },
        },
        outputs: { approver: 'manager', financeReview: true },
      },
      // Rule 4: Travel, ≤ $1,000 → Manager, no finance
      {
        conditions: {
          category: { type: 'equals', value: 'travel' },
          amount: { type: 'lessThanOrEqual', value: 1000 },
        },
        outputs: { approver: 'manager', financeReview: false },
      },
      // Rule 5: Travel, $1,001–$5,000 → Director + finance
      {
        conditions: {
          category: { type: 'equals', value: 'travel' },
          amount: { type: 'between', min: 1001, max: 5000 },
        },
        outputs: { approver: 'director', financeReview: true },
      },
      // Rule 6: Travel, > $5,000 → VP + finance
      {
        conditions: {
          category: { type: 'equals', value: 'travel' },
          amount: { type: 'greaterThan', value: 5000 },
        },
        outputs: { approver: 'vp', financeReview: true },
      },
      // Rule 7: Software, ≤ $500 → Manager, no finance
      {
        conditions: {
          category: { type: 'equals', value: 'software' },
          amount: { type: 'lessThanOrEqual', value: 500 },
        },
        outputs: { approver: 'manager', financeReview: false },
      },
      // Rule 8: Software, > $500 → IT Director + finance
      {
        conditions: {
          category: { type: 'equals', value: 'software' },
          amount: { type: 'greaterThan', value: 500 },
        },
        outputs: { approver: 'it_director', financeReview: true },
      },
      // Rule 9: Default → Manager, no finance
      {
        conditions: {
          category: { type: 'any' },
          amount: { type: 'any' },
        },
        outputs: { approver: 'manager', financeReview: false },
      },
    ],
  });

  // Publish the table so it's ready for evaluation
  await decisionTableService.publishTable(table.id, 'system');

  console.log(`  ✅ Created & published: Expense Approval Routing (${table.id})`);
}

// ============================================================================
// Seed: PO Approval Matrix Decision Table
// ============================================================================

export async function seedPOApprovalMatrix(): Promise<void> {
  const existing = await decisionTableService.getTableBySlug('po-approval-matrix');
  if (existing) {
    console.log('  ✅ PO Approval Matrix table already exists');
    return;
  }

  const table = await decisionTableService.createQuickTable({
    name: 'PO Approval Matrix',
    createdBy: 'system',
    hitPolicy: 'COLLECT',
    inputs: [
      { name: 'department', label: 'Department', type: 'string' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'urgency', label: 'Urgency', type: 'string' },
    ],
    outputs: [
      { name: 'approver1', label: 'Approver 1', type: 'string' },
      { name: 'approver2', label: 'Approver 2', type: 'string' },
    ],
    rules: [
      // Rule 1: Any dept, ≤ $500, any urgency → manager only
      {
        conditions: {
          department: { type: 'any' },
          amount: { type: 'lessThanOrEqual', value: 500 },
          urgency: { type: 'any' },
        },
        outputs: { approver1: 'manager', approver2: null },
      },
      // Rule 2: Any dept, $501-$5,000, normal → manager only
      {
        conditions: {
          department: { type: 'any' },
          amount: { type: 'between', min: 501, max: 5000 },
          urgency: { type: 'equals', value: 'normal' },
        },
        outputs: { approver1: 'manager', approver2: null },
      },
      // Rule 3: Any dept, $501-$5,000, urgent → manager + finance
      {
        conditions: {
          department: { type: 'any' },
          amount: { type: 'between', min: 501, max: 5000 },
          urgency: { type: 'equals', value: 'urgent' },
        },
        outputs: { approver1: 'manager', approver2: 'finance' },
      },
      // Rule 4: Any dept, $5,001-$25,000 → director + finance
      {
        conditions: {
          department: { type: 'any' },
          amount: { type: 'between', min: 5001, max: 25000 },
          urgency: { type: 'any' },
        },
        outputs: { approver1: 'director', approver2: 'finance' },
      },
      // Rule 5: Any dept, $25,001-$100,000 → vp + cfo
      {
        conditions: {
          department: { type: 'any' },
          amount: { type: 'between', min: 25001, max: 100000 },
          urgency: { type: 'any' },
        },
        outputs: { approver1: 'vp', approver2: 'cfo' },
      },
      // Rule 6: Any dept, > $100,000 → ceo + board
      {
        conditions: {
          department: { type: 'any' },
          amount: { type: 'greaterThan', value: 100000 },
          urgency: { type: 'any' },
        },
        outputs: { approver1: 'ceo', approver2: 'board' },
      },
      // Rule 7: Engineering, > $10,000 → cto + finance (override)
      {
        conditions: {
          department: { type: 'equals', value: 'engineering' },
          amount: { type: 'greaterThan', value: 10000 },
          urgency: { type: 'any' },
        },
        outputs: { approver1: 'cto', approver2: 'finance' },
      },
    ],
  });

  await decisionTableService.publishTable(table.id, 'system');
  console.log(`  ✅ Created & published: PO Approval Matrix (${table.id})`);
}

// ============================================================================
// Seed: Ticket Routing & SLA Decision Table
// ============================================================================

export async function seedTicketRoutingSLA(): Promise<void> {
  const existing = await decisionTableService.getTableBySlug('ticket-routing-sla');
  if (existing) {
    console.log('  ✅ Ticket Routing & SLA table already exists');
    return;
  }

  const table = await decisionTableService.createQuickTable({
    name: 'Ticket Routing & SLA',
    createdBy: 'system',
    hitPolicy: 'FIRST',
    inputs: [
      { name: 'requestType', label: 'Request Type', type: 'string' },
      { name: 'priority', label: 'Priority', type: 'string' },
      { name: 'category', label: 'Category', type: 'string' },
    ],
    outputs: [
      { name: 'assignTo', label: 'Assign To', type: 'string' },
      { name: 'responseTime', label: 'Response Time', type: 'string' },
      { name: 'resolveTime', label: 'Resolve Time', type: 'string' },
    ],
    rules: [
      // Rule 1: Critical incident + security → security team, 5 min / 1 hour
      {
        conditions: {
          requestType: { type: 'equals', value: 'incident' },
          priority: { type: 'equals', value: 'critical' },
          category: { type: 'equals', value: 'security' },
        },
        outputs: { assignTo: 'security', responseTime: '5 min', resolveTime: '1 hour' },
      },
      // Rule 2: Critical incident (any category) → senior-team, 15 min / 2 hours
      {
        conditions: {
          requestType: { type: 'equals', value: 'incident' },
          priority: { type: 'equals', value: 'critical' },
          category: { type: 'any' },
        },
        outputs: { assignTo: 'senior-team', responseTime: '15 min', resolveTime: '2 hours' },
      },
      // Rule 3: High incident → tier-2, 30 min / 4 hours
      {
        conditions: {
          requestType: { type: 'equals', value: 'incident' },
          priority: { type: 'equals', value: 'high' },
          category: { type: 'any' },
        },
        outputs: { assignTo: 'tier-2', responseTime: '30 min', resolveTime: '4 hours' },
      },
      // Rule 4: Medium incident → tier-1, 2 hours / 1 day
      {
        conditions: {
          requestType: { type: 'equals', value: 'incident' },
          priority: { type: 'equals', value: 'medium' },
          category: { type: 'any' },
        },
        outputs: { assignTo: 'tier-1', responseTime: '2 hours', resolveTime: '1 day' },
      },
      // Rule 5: Low incident → tier-1, 8 hours / 3 days
      {
        conditions: {
          requestType: { type: 'equals', value: 'incident' },
          priority: { type: 'equals', value: 'low' },
          category: { type: 'any' },
        },
        outputs: { assignTo: 'tier-1', responseTime: '8 hours', resolveTime: '3 days' },
      },
      // Rule 6: Service request + access → tier-1, 4 hours / 1 day
      {
        conditions: {
          requestType: { type: 'equals', value: 'service' },
          priority: { type: 'any' },
          category: { type: 'equals', value: 'access' },
        },
        outputs: { assignTo: 'tier-1', responseTime: '4 hours', resolveTime: '1 day' },
      },
      // Rule 7: Service request + hardware → hardware, 4 hours / 2 days
      {
        conditions: {
          requestType: { type: 'equals', value: 'service' },
          priority: { type: 'any' },
          category: { type: 'equals', value: 'hardware' },
        },
        outputs: { assignTo: 'hardware', responseTime: '4 hours', resolveTime: '2 days' },
      },
      // Rule 8: Question (any) → helpdesk, 8 hours / 2 days
      {
        conditions: {
          requestType: { type: 'equals', value: 'question' },
          priority: { type: 'any' },
          category: { type: 'any' },
        },
        outputs: { assignTo: 'helpdesk', responseTime: '8 hours', resolveTime: '2 days' },
      },
      // Rule 9: Catch-all default → tier-1, 4 hours / 2 days
      {
        conditions: {
          requestType: { type: 'any' },
          priority: { type: 'any' },
          category: { type: 'any' },
        },
        outputs: { assignTo: 'tier-1', responseTime: '4 hours', resolveTime: '2 days' },
      },
    ],
  });

  await decisionTableService.publishTable(table.id, 'system');
  console.log(`  ✅ Created & published: Ticket Routing & SLA (${table.id})`);
}

/**
 * Seed: Onboarding Equipment & Access decision table
 * Determines standard equipment, software bundle, and system access based on department + employment type
 */
export async function seedOnboardingEquipmentAccess(): Promise<void> {
  const existing = await decisionTableService.getTableBySlug('onboarding-equipment-access');
  if (existing) {
    console.log('  ✅ Onboarding Equipment & Access table already exists');
    return;
  }

  const table = await decisionTableService.createQuickTable({
    name: 'Onboarding Equipment & Access',
    createdBy: 'system',
    hitPolicy: 'FIRST',
    inputs: [
      { name: 'department', label: 'Department', type: 'string' },
      { name: 'employmentType', label: 'Employment Type', type: 'string' },
    ],
    outputs: [
      { name: 'computer', label: 'Default Computer', type: 'string' },
      { name: 'softwareBundle', label: 'Software Bundle', type: 'string' },
      { name: 'defaultAccess', label: 'Default System Access', type: 'string' },
    ],
    rules: [
      // Rule 1: Engineering fulltime → MacBook Pro, Dev Tools
      {
        conditions: {
          department: { type: 'equals', value: 'Engineering' },
          employmentType: { type: 'equals', value: 'fulltime' },
        },
        outputs: { computer: 'MacBook Pro 14"', softwareBundle: 'Office 365, Slack, GitHub, Jira, VS Code', defaultAccess: 'HR Portal, GitHub, Jira' },
      },
      // Rule 2: Engineering contractor → ThinkPad, limited dev tools
      {
        conditions: {
          department: { type: 'equals', value: 'Engineering' },
          employmentType: { type: 'equals', value: 'contractor' },
        },
        outputs: { computer: 'ThinkPad X1', softwareBundle: 'Slack, GitHub, Jira', defaultAccess: 'GitHub, Jira' },
      },
      // Rule 3: Marketing → MacBook Air, Creative tools
      {
        conditions: {
          department: { type: 'equals', value: 'Marketing' },
          employmentType: { type: 'any' },
        },
        outputs: { computer: 'MacBook Air', softwareBundle: 'Office 365, Adobe Creative Cloud, Slack, Zoom', defaultAccess: 'HR Portal, CRM' },
      },
      // Rule 4: Sales → Dell XPS, CRM tools
      {
        conditions: {
          department: { type: 'equals', value: 'Sales' },
          employmentType: { type: 'any' },
        },
        outputs: { computer: 'Dell XPS 15', softwareBundle: 'Office 365, Slack, Zoom, Salesforce', defaultAccess: 'HR Portal, CRM, ERP' },
      },
      // Rule 5: Finance → Dell XPS, Finance tools
      {
        conditions: {
          department: { type: 'equals', value: 'Finance' },
          employmentType: { type: 'any' },
        },
        outputs: { computer: 'Dell XPS 15', softwareBundle: 'Office 365, Slack, Excel Advanced', defaultAccess: 'HR Portal, Finance System, ERP' },
      },
      // Rule 6: HR → MacBook Air, HR tools
      {
        conditions: {
          department: { type: 'equals', value: 'Human Resources' },
          employmentType: { type: 'any' },
        },
        outputs: { computer: 'MacBook Air', softwareBundle: 'Office 365, Slack, Zoom, BambooHR', defaultAccess: 'HR Portal, Finance System' },
      },
      // Rule 7: IT → ThinkPad, IT admin tools
      {
        conditions: {
          department: { type: 'equals', value: 'IT' },
          employmentType: { type: 'any' },
        },
        outputs: { computer: 'ThinkPad X1', softwareBundle: 'Office 365, Slack, Jira, ServiceNow, Azure AD', defaultAccess: 'HR Portal, All Systems (Admin)' },
      },
      // Rule 8: Catch-all default
      {
        conditions: {
          department: { type: 'any' },
          employmentType: { type: 'any' },
        },
        outputs: { computer: 'Dell XPS 15', softwareBundle: 'Office 365, Slack', defaultAccess: 'HR Portal' },
      },
    ],
  });

  await decisionTableService.publishTable(table.id, 'system');
  console.log(`  ✅ Created & published: Onboarding Equipment & Access (${table.id})`);
}
