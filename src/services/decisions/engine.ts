/**
 * FlowForge Decision Table Evaluation Engine
 * Evaluates decision tables with DMN-style hit policies
 */

import type {
  DecisionTable,
  DecisionRule,
  DecisionInput,
  DecisionOutput,
  ConditionExpression,
  EvaluationContext,
  EvaluationResult,
  MatchedRule,
  EvaluationError,
  HitPolicy,
} from '../../types/decisions';

// ============================================================================
// Decision Engine
// ============================================================================

export class DecisionEngine {

  /**
   * Evaluate a decision table with given inputs
   */
  evaluate(table: DecisionTable, context: EvaluationContext): EvaluationResult {
    const startTime = Date.now();
    const errors: EvaluationError[] = [];
    const warnings: string[] = [];

    // Validate inputs
    if (table.settings.validateInputs) {
      const inputErrors = this.validateInputs(table.inputs, context.inputs);
      if (inputErrors.length > 0) {
        if (table.settings.strictMode) {
          return {
            success: false,
            matchedRules: [],
            outputs: {},
            evaluatedAt: new Date(),
            durationMs: Date.now() - startTime,
            errors: inputErrors,
          };
        }
        warnings.push(...inputErrors.map(e => e.message));
      }
    }

    // Find matching rules
    const matchedRules: MatchedRule[] = [];
    const enabledRules = table.rules.filter(r => r.enabled);

    for (let i = 0; i < enabledRules.length; i++) {
      const rule = enabledRules[i]!;
      if (this.ruleMatches(rule!, table.inputs, context.inputs)) {
        matchedRules.push({
          ruleId: rule!.id,
          ruleIndex: i,
          outputs: this.extractOutputs(rule!, table.outputs, context),
          priority: rule!.priority,
        });
      }
    }

    // Apply hit policy
    const { outputs, hitPolicyErrors } = this.applyHitPolicy(
      table.hitPolicy,
      matchedRules,
      table.outputs,
      table.settings.defaultOutputs
    );

    errors.push(...hitPolicyErrors);

    return {
      success: errors.length === 0,
      matchedRules,
      outputs,
      evaluatedAt: new Date(),
      durationMs: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate inputs against schema
   */
  private validateInputs(
    inputs: DecisionInput[],
    values: Record<string, unknown>
  ): EvaluationError[] {
    const errors: EvaluationError[] = [];

    for (const input of inputs) {
      const value = values[input.name];

      // Check required
      if (input.required && (value === undefined || value === null)) {
        errors.push({
          type: 'input_missing',
          message: `Required input '${input.name}' is missing`,
          field: input.name,
        });
        continue;
      }

      // Check type
      if (value !== undefined && value !== null) {
        const typeValid = this.validateType(value, input.type);
        if (!typeValid) {
          errors.push({
            type: 'input_invalid',
            message: `Input '${input.name}' has invalid type. Expected ${input.type}`,
            field: input.name,
            details: { value, expectedType: input.type },
          });
        }

        // Check allowed values
        if (input.allowedValues && !input.allowedValues.includes(value)) {
          errors.push({
            type: 'input_invalid',
            message: `Input '${input.name}' value not in allowed values`,
            field: input.name,
            details: { value, allowedValues: input.allowedValues },
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate value type
   */
  private validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
      case 'datetime':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'list':
        return Array.isArray(value);
      case 'any':
        return true;
      default:
        return true;
    }
  }

  /**
   * Check if a rule matches the given inputs
   */
  private ruleMatches(
    rule: DecisionRule,
    inputDefs: DecisionInput[],
    values: Record<string, unknown>
  ): boolean {
    for (const input of inputDefs) {
      const entry = rule.inputEntries[input.id];
      if (!entry) continue;

      const value = values[input.name];
      if (!this.conditionMatches(entry.condition, value)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if a condition matches a value
   */
  private conditionMatches(condition: ConditionExpression, value: unknown): boolean {
    switch (condition.type) {
      case 'any':
        return true;

      case 'equals':
        return value === condition.value;

      case 'notEquals':
        return value !== condition.value;

      case 'lessThan':
        return typeof value === 'number' && value < condition.value;

      case 'lessThanOrEqual':
        return typeof value === 'number' && value <= condition.value;

      case 'greaterThan':
        return typeof value === 'number' && value > condition.value;

      case 'greaterThanOrEqual':
        return typeof value === 'number' && value >= condition.value;

      case 'between':
        return typeof value === 'number' && value >= condition.min && value <= condition.max;

      case 'in':
        return condition.values.includes(value);

      case 'notIn':
        return !condition.values.includes(value);

      case 'contains':
        return typeof value === 'string' && value.includes(condition.value);

      case 'startsWith':
        return typeof value === 'string' && value.startsWith(condition.value);

      case 'endsWith':
        return typeof value === 'string' && value.endsWith(condition.value);

      case 'matches':
        return typeof value === 'string' && new RegExp(condition.pattern).test(value);

      case 'isNull':
        return value === null || value === undefined;

      case 'isNotNull':
        return value !== null && value !== undefined;

      case 'expression':
        return this.evaluateExpression(condition.expr, value);

      default:
        return false;
    }
  }

  /**
   * Evaluate a custom expression
   */
  private evaluateExpression(expr: string, value: unknown): boolean {
    try {
      const fn = new Function('value', `return ${expr}`);
      return Boolean(fn(value));
    } catch {
      return false;
    }
  }

  /**
   * Extract outputs from a matched rule
   */
  private extractOutputs(
    rule: DecisionRule,
    outputDefs: DecisionOutput[],
    context: EvaluationContext
  ): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};

    for (const output of outputDefs) {
      const entry = rule.outputEntries[output.id];
      if (entry) {
        if (entry.expression) {
          try {
            const fn = new Function('inputs', `return ${entry.expression}`);
            outputs[output.name] = fn(context.inputs);
          } catch {
            outputs[output.name] = entry.value;
          }
        } else {
          outputs[output.name] = entry.value;
        }
      } else if (output.defaultValue !== undefined) {
        outputs[output.name] = output.defaultValue;
      }
    }

    return outputs;
  }

  /**
   * Apply hit policy to matched rules
   */
  private applyHitPolicy(
    policy: HitPolicy,
    matchedRules: MatchedRule[],
    outputDefs: DecisionOutput[],
    defaultOutputs?: Record<string, unknown>
  ): { outputs: Record<string, unknown> | Record<string, unknown>[]; hitPolicyErrors: EvaluationError[] } {
    const errors: EvaluationError[] = [];

    if (matchedRules.length === 0) {
      if (defaultOutputs) {
        return { outputs: defaultOutputs, hitPolicyErrors: [] };
      }
      errors.push({
        type: 'no_match',
        message: 'No rules matched the input',
      });
      return { outputs: {}, hitPolicyErrors: errors };
    }

    switch (policy) {
      case 'UNIQUE':
        if (matchedRules.length > 1) {
          errors.push({
            type: 'multiple_matches',
            message: `UNIQUE hit policy violated: ${matchedRules.length} rules matched`,
            details: { matchedRuleIds: matchedRules.map(r => r.ruleId) },
          });
        }
        return { outputs: matchedRules[0]?.outputs || {}, hitPolicyErrors: errors };

      case 'FIRST':
        return { outputs: matchedRules[0]!.outputs, hitPolicyErrors: [] };

      case 'PRIORITY':
        const prioritySorted = [...matchedRules].sort((a, b) =>
          (b.priority || 0) - (a.priority || 0)
        );
        return { outputs: prioritySorted[0]!.outputs, hitPolicyErrors: [] };

      case 'ANY':
        // All matched rules must have same output
        const first = JSON.stringify(matchedRules[0]!.outputs);
        const allSame = matchedRules.every(r => JSON.stringify(r.outputs) === first);
        if (!allSame) {
          errors.push({
            type: 'multiple_matches',
            message: 'ANY hit policy violated: matched rules have different outputs',
          });
        }
        return { outputs: matchedRules[0]!.outputs, hitPolicyErrors: errors };

      case 'COLLECT':
      case 'RULE_ORDER':
        return {
          outputs: matchedRules.map(r => r.outputs),
          hitPolicyErrors: []
        };

      case 'OUTPUT_ORDER':
        const outputSorted = [...matchedRules].sort((a, b) => {
          for (const output of outputDefs) {
            const aVal = a.outputs[output.name];
            const bVal = b.outputs[output.name];
            const aPriority = output.allowedValues?.indexOf(aVal) ?? 0;
            const bPriority = output.allowedValues?.indexOf(bVal) ?? 0;
            if (aPriority !== bPriority) return aPriority - bPriority;
          }
          return 0;
        });
        return {
          outputs: outputSorted.map(r => r.outputs),
          hitPolicyErrors: []
        };

      default:
        return { outputs: matchedRules[0]?.outputs || {}, hitPolicyErrors: [] };
    }
  }

  /**
   * Apply collect aggregation
   */
  aggregateCollect(
    outputs: Record<string, unknown>[],
    outputName: string,
    operator: 'SUM' | 'MIN' | 'MAX' | 'COUNT'
  ): number {
    const values = outputs.map(o => o[outputName]).filter(v => typeof v === 'number') as number[];

    switch (operator) {
      case 'SUM':
        return values.reduce((a, b) => a + b, 0);
      case 'MIN':
        return Math.min(...values);
      case 'MAX':
        return Math.max(...values);
      case 'COUNT':
        return values.length;
      default:
        return values.length;
    }
  }
}

export const decisionEngine = new DecisionEngine();
