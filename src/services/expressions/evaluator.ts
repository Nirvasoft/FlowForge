/**
 * FlowForge Expression Evaluator
 * Walks the AST and computes values with context resolution
 */

import type {
  ASTNode,
  LiteralNode,
  IdentifierNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  CallExpressionNode,
  MemberExpressionNode,
  ConditionalExpressionNode,
  ArrayExpressionNode,
  ObjectExpressionNode,
  EvaluationContext,
  EvaluationResult,
  ExpressionValue,
  ExpressionType,
} from '../../types/expressions';
import { functionRegistry } from './functions';

export class Evaluator {
  private context: EvaluationContext;

  constructor(context?: Partial<EvaluationContext>) {
    this.context = {
      fields: {},
      datasets: {},
      user: {
        id: '',
        email: '',
        name: '',
        groups: [],
        roles: [],
        metadata: {},
      },
      system: {
        now: new Date(),
        today: new Date(new Date().setHours(0, 0, 0, 0)),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: 'en-US',
      },
      variables: {},
      ...context,
    };
  }

  evaluate(ast: ASTNode): EvaluationResult {
    try {
      const value = this.evaluateNode(ast);
      return {
        success: true,
        value,
        type: this.getType(value),
      };
    } catch (error) {
      if (error instanceof EvaluatorError) {
        return {
          success: false,
          error: {
            message: error.message,
            node: error.node,
            functionName: error.functionName,
            argumentIndex: error.argumentIndex,
          },
        };
      }
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private evaluateNode(node: ASTNode): ExpressionValue {
    switch (node.type) {
      case 'Literal':
        return this.evaluateLiteral(node);
      case 'Identifier':
        return this.evaluateIdentifier(node);
      case 'BinaryExpression':
        return this.evaluateBinaryExpression(node);
      case 'UnaryExpression':
        return this.evaluateUnaryExpression(node);
      case 'CallExpression':
        return this.evaluateCallExpression(node);
      case 'MemberExpression':
        return this.evaluateMemberExpression(node);
      case 'ConditionalExpression':
        return this.evaluateConditionalExpression(node);
      case 'ArrayExpression':
        return this.evaluateArrayExpression(node);
      case 'ObjectExpression':
        return this.evaluateObjectExpression(node);
      default:
        throw new EvaluatorError(`Unknown node type: ${(node as ASTNode).type}`, node);
    }
  }

  private evaluateLiteral(node: LiteralNode): ExpressionValue {
    return node.value;
  }

  private evaluateIdentifier(node: IdentifierNode): ExpressionValue {
    const name = node.name;

    // Check fields first
    if (name in this.context.fields) {
      return this.context.fields[name];
    }

    // Check variables
    if (name in this.context.variables) {
      return this.context.variables[name];
    }

    // Check special identifiers
    switch (name.toLowerCase()) {
      case 'true':
        return true;
      case 'false':
        return false;
      case 'null':
        return null;
      case 'undefined':
        return undefined;
      case 'now':
        return this.context.system.now;
      case 'today':
        return this.context.system.today;
      case 'user':
        return this.context.user as unknown as Record<string, ExpressionValue>;
      case 'system':
        return this.context.system as unknown as Record<string, ExpressionValue>;
    }

    return undefined;
  }

  private evaluateBinaryExpression(node: BinaryExpressionNode): ExpressionValue {
    const left = this.evaluateNode(node.left);
    const right = this.evaluateNode(node.right);

    switch (node.operator) {
      // Arithmetic
      case '+':
        if (typeof left === 'string' || typeof right === 'string') {
          return String(left ?? '') + String(right ?? '');
        }
        return this.toNumber(left) + this.toNumber(right);
      case '-':
        return this.toNumber(left) - this.toNumber(right);
      case '*':
        return this.toNumber(left) * this.toNumber(right);
      case '/':
        const divisor = this.toNumber(right);
        if (divisor === 0) {
          throw new EvaluatorError('Division by zero', node);
        }
        return this.toNumber(left) / divisor;
      case '%':
        return this.toNumber(left) % this.toNumber(right);
      case '**':
        return Math.pow(this.toNumber(left), this.toNumber(right));

      // Comparison
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '===':
        return left === right;
      case '!==':
        return left !== right;
      case '<':
        return this.toNumber(left) < this.toNumber(right);
      case '>':
        return this.toNumber(left) > this.toNumber(right);
      case '<=':
        return this.toNumber(left) <= this.toNumber(right);
      case '>=':
        return this.toNumber(left) >= this.toNumber(right);

      // Logical
      case '&&':
        return this.toBoolean(left) && this.toBoolean(right);
      case '||':
        return this.toBoolean(left) || this.toBoolean(right);

      // String concatenation
      case '&':
        return String(left ?? '') + String(right ?? '');

      default:
        throw new EvaluatorError(`Unknown operator: ${node.operator}`, node);
    }
  }

  private evaluateUnaryExpression(node: UnaryExpressionNode): ExpressionValue {
    const argument = this.evaluateNode(node.argument);

    switch (node.operator) {
      case '-':
        return -this.toNumber(argument);
      case '+':
        return +this.toNumber(argument);
      case '!':
        return !this.toBoolean(argument);
      default:
        throw new EvaluatorError(`Unknown unary operator: ${node.operator}`, node);
    }
  }

  private evaluateCallExpression(node: CallExpressionNode): ExpressionValue {
    let functionName: string;
    if (node.callee.type === 'Identifier') {
      functionName = node.callee.name;
    } else if (node.callee.type === 'MemberExpression') {
      const obj = this.evaluateNode(node.callee.object);
      const prop = node.callee.computed
        ? this.evaluateNode(node.callee.property)
        : (node.callee.property as IdentifierNode).name;
      
      if (obj && typeof obj === 'object' && typeof prop === 'string') {
        const method = (obj as Record<string, unknown>)[prop];
        if (typeof method === 'function') {
          const args = node.arguments.map(arg => this.evaluateNode(arg));
          return (method as (...args: ExpressionValue[]) => ExpressionValue).apply(obj, args);
        }
      }
      throw new EvaluatorError(`Cannot call method on ${typeof obj}`, node);
    } else {
      throw new EvaluatorError('Invalid function call', node);
    }

    const fn = functionRegistry.get(functionName);
    if (!fn) {
      throw new EvaluatorError(`Unknown function: ${functionName}`, node, functionName);
    }

    const args = node.arguments.map(arg => this.evaluateNode(arg));

    // Handle special functions that need context
    if (functionName.toUpperCase() === 'LOOKUP') {
      return this.handleLookup(args, node);
    }

    try {
      return fn.implementation(...args);
    } catch (error) {
      throw new EvaluatorError(
        `Error in ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        node,
        functionName
      );
    }
  }

  private handleLookup(args: ExpressionValue[], node: ASTNode): ExpressionValue {
    if (args.length < 4) {
      throw new EvaluatorError('LOOKUP requires 4 arguments: dataset, searchField, searchValue, returnField', node, 'LOOKUP');
    }

    const [datasetName, searchField, searchValue, returnField] = args;
    const dataset = this.context.datasets[String(datasetName)];

    if (!dataset) {
      throw new EvaluatorError(`Dataset not found: ${datasetName}`, node, 'LOOKUP');
    }

    const record = dataset.find(r => r[String(searchField)] === searchValue);
    if (!record) {
      return null;
    }

    return record[String(returnField)] ?? null;
  }

  private evaluateMemberExpression(node: MemberExpressionNode): ExpressionValue {
    const object = this.evaluateNode(node.object);

    if (object === null || object === undefined) {
      return undefined;
    }

    let property: string | number;
    if (node.computed) {
      const prop = this.evaluateNode(node.property);
      property = typeof prop === 'number' ? prop : String(prop);
    } else {
      property = (node.property as IdentifierNode).name;
    }

    if (Array.isArray(object)) {
      if (typeof property === 'number') {
        return object[property];
      }
      switch (property) {
        case 'length':
          return object.length;
        case 'first':
          return object[0];
        case 'last':
          return object[object.length - 1];
      }
    }

    if (typeof object === 'object') {
      return (object as Record<string, ExpressionValue>)[String(property)];
    }

    if (typeof object === 'string') {
      switch (property) {
        case 'length':
          return object.length;
      }
      if (typeof property === 'number') {
        return object[property];
      }
    }

    return undefined;
  }

  private evaluateConditionalExpression(node: ConditionalExpressionNode): ExpressionValue {
    const test = this.evaluateNode(node.test);
    if (this.toBoolean(test)) {
      return this.evaluateNode(node.consequent);
    } else {
      return this.evaluateNode(node.alternate);
    }
  }

  private evaluateArrayExpression(node: ArrayExpressionNode): ExpressionValue {
    return node.elements.map(el => this.evaluateNode(el));
  }

  private evaluateObjectExpression(node: ObjectExpressionNode): ExpressionValue {
    const result: Record<string, ExpressionValue> = {};
    for (const prop of node.properties) {
      const key = prop.key.type === 'Identifier' 
        ? prop.key.name 
        : String(prop.key.value);
      result[key] = this.evaluateNode(prop.value);
    }
    return result;
  }

  // ============================================================================
  // Type Coercion Helpers
  // ============================================================================

  private toNumber(value: ExpressionValue): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (value instanceof Date) return value.getTime();
    return 0;
  }

  private toBoolean(value: ExpressionValue): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (value === null || value === undefined) return false;
    return true;
  }

  private getType(value: ExpressionValue): ExpressionType {
    if (value === null) return 'null';
    if (value === undefined) return 'null';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'any';
  }

  // ============================================================================
  // Context Management
  // ============================================================================

  setField(name: string, value: ExpressionValue): void {
    this.context.fields[name] = value;
  }

  setFields(fields: Record<string, ExpressionValue>): void {
    Object.assign(this.context.fields, fields);
  }

  setVariable(name: string, value: ExpressionValue): void {
    this.context.variables[name] = value;
  }

  setDataset(name: string, records: Record<string, ExpressionValue>[]): void {
    this.context.datasets[name] = records;
  }

  setUser(user: Partial<EvaluationContext['user']>): void {
    Object.assign(this.context.user, user);
  }

  getContext(): EvaluationContext {
    return this.context;
  }
}

class EvaluatorError extends Error {
  constructor(
    message: string,
    public node?: ASTNode,
    public functionName?: string,
    public argumentIndex?: number
  ) {
    super(message);
    this.name = 'EvaluatorError';
  }
}
