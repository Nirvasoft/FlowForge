/**
 * FlowForge Decision Table Service
 * CRUD operations and evaluation
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
import { DecisionEngine, decisionEngine } from './engine';

// ============================================================================
// In-Memory Storage
// ============================================================================

const tables = new Map<string, DecisionTable>();
const evaluationLogs = new Map<string, EvaluationLog[]>();
const testCases = new Map<string, TestCase[]>();

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

    return table;
  }

  async getTable(id: string): Promise<DecisionTable | null> {
    return tables.get(id) || null;
  }

  async getTableBySlug(slug: string): Promise<DecisionTable | null> {
    for (const table of tables.values()) {
      if (table.slug === slug) return table;
    }
    return null;
  }

  async listTables(options: {
    status?: 'draft' | 'published' | 'archived';
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ tables: DecisionTable[]; total: number }> {
    let items = Array.from(tables.values());

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
    return table;
  }

  async deleteTable(id: string): Promise<boolean> {
    evaluationLogs.delete(id);
    testCases.delete(id);
    return tables.delete(id);
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
    return table;
  }

  async unpublishTable(id: string): Promise<DecisionTable | null> {
    const table = tables.get(id);
    if (!table) return null;

    table.status = 'draft';
    table.updatedAt = new Date();
    tables.set(id, table);
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
    return true;
  }

  async reorderRules(tableId: string, ruleIds: string[]): Promise<boolean> {
    const table = tables.get(tableId);
    if (!table) return false;

    const ruleMap = new Map(table.rules.map(r => [r.id, r]));
    table.rules = ruleIds.map(id => ruleMap.get(id)).filter(Boolean) as DecisionRule[];
    table.updatedAt = new Date();
    tables.set(tableId, table);
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
}

export const decisionTableService = new DecisionTableService();
