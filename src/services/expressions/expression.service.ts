/**
 * FlowForge Expression Service
 * Main entry point for formula parsing, validation, and evaluation
 */

import { Parser } from './parser';
import { Evaluator } from './evaluator';
import { functionRegistry, FUNCTION_COUNT } from './functions';
import type {
  ParseResult,
  EvaluationResult,
  EvaluationContext,
  ValidationResult,
  ExpressionValue,
  ExpressionSuggestion,
  ExpressionToken,
  ASTNode,
  IdentifierNode,
  CallExpressionNode,
  FunctionCategory,
  CalculatedFieldConfig,
  CalculationDependencyGraph,
} from '../../types/expressions';
import { Tokenizer, TokenType } from './tokenizer';

// ============================================================================
// Expression Service
// ============================================================================

export class ExpressionService {
  private evaluator: Evaluator;

  constructor(context?: Partial<EvaluationContext>) {
    this.evaluator = new Evaluator(context);
  }

  /**
   * Parse a formula string into an AST
   */
  parse(formula: string): ParseResult {
    const parser = new Parser(formula);
    return parser.parse();
  }

  /**
   * Evaluate a formula string and return the result
   */
  evaluate(formula: string): EvaluationResult {
    const parseResult = this.parse(formula);
    if (!parseResult.success || !parseResult.ast) {
      return {
        success: false,
        error: {
          message: parseResult.error?.message || 'Parse error',
        },
      };
    }
    return this.evaluator.evaluate(parseResult.ast);
  }

  /**
   * Evaluate a pre-parsed AST
   */
  evaluateAst(ast: ASTNode): EvaluationResult {
    return this.evaluator.evaluate(ast);
  }

  /**
   * Validate a formula without evaluating it
   */
  validate(formula: string, availableFields?: string[]): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      referencedFields: [],
      referencedFunctions: [],
    };

    // Parse the formula
    const parseResult = this.parse(formula);
    if (!parseResult.success) {
      result.valid = false;
      result.errors.push({
        message: parseResult.error?.message || 'Syntax error',
        position: parseResult.error ? { start: parseResult.error.position, end: parseResult.error.position + 1 } : undefined,
        type: 'syntax',
      });
      return result;
    }

    // Walk the AST to find references
    const ast = parseResult.ast!;
    this.walkAst(ast, (node) => {
      if (node.type === 'Identifier') {
        const name = (node as IdentifierNode).name;
        // Check if it's a field reference
        if (availableFields && !availableFields.includes(name)) {
          // Could be a function or system variable
          if (!functionRegistry.get(name) && !['true', 'false', 'null', 'undefined', 'now', 'today', 'user', 'system'].includes(name.toLowerCase())) {
            result.errors.push({
              message: `Unknown field: ${name}`,
              position: { start: node.start, end: node.end },
              type: 'reference',
            });
            result.valid = false;
          }
        } else if (!result.referencedFields.includes(name)) {
          result.referencedFields.push(name);
        }
      }
      if (node.type === 'CallExpression') {
        const callee = (node as CallExpressionNode).callee;
        if (callee.type === 'Identifier') {
          const fnName = callee.name.toUpperCase();
          if (!functionRegistry.get(fnName)) {
            result.errors.push({
              message: `Unknown function: ${callee.name}`,
              position: { start: callee.start, end: callee.end },
              type: 'function',
            });
            result.valid = false;
          } else if (!result.referencedFunctions.includes(fnName)) {
            result.referencedFunctions.push(fnName);
          }
        }
      }
    });

    return result;
  }

  /**
   * Get autocomplete suggestions at a position in the formula
   */
  getSuggestions(formula: string, position: number, availableFields: string[] = []): ExpressionSuggestion[] {
    const suggestions: ExpressionSuggestion[] = [];
    
    // Get the partial text before cursor
    const beforeCursor = formula.slice(0, position);
    const match = beforeCursor.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
    const partial = match ? match[0].toLowerCase() : '';

    // Add matching functions
    for (const fn of functionRegistry.list()) {
      if (fn.name.toLowerCase().startsWith(partial)) {
        suggestions.push({
          type: 'function',
          label: fn.name,
          value: fn.name,
          description: fn.description,
          category: fn.category,
          insertText: `${fn.name}(`,
          cursorOffset: 1,
        });
      }
    }

    // Add matching fields
    for (const field of availableFields) {
      if (field.toLowerCase().startsWith(partial)) {
        suggestions.push({
          type: 'field',
          label: field,
          value: field,
          insertText: field,
        });
      }
    }

    // Add system variables
    const systemVars = ['NOW', 'TODAY', 'user', 'system'];
    for (const varName of systemVars) {
      if (varName.toLowerCase().startsWith(partial)) {
        suggestions.push({
          type: 'variable',
          label: varName,
          value: varName,
          description: `System variable: ${varName}`,
          insertText: varName,
        });
      }
    }

    return suggestions.sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Tokenize a formula for syntax highlighting
   */
  tokenize(formula: string): ExpressionToken[] {
    const { tokens } = new Tokenizer(formula).tokenize();
    return tokens
      .filter(t => t.type !== TokenType.EOF)
      .map(t => ({
        type: this.getTokenCategory(t.type),
        value: t.value,
        start: t.start,
        end: t.end,
      }));
  }

  private getTokenCategory(type: TokenType): ExpressionToken['type'] {
    switch (type) {
      case TokenType.IDENTIFIER:
        return 'field';
      case TokenType.NUMBER:
      case TokenType.STRING:
      case TokenType.BOOLEAN:
      case TokenType.NULL:
        return 'literal';
      case TokenType.PLUS:
      case TokenType.MINUS:
      case TokenType.MULTIPLY:
      case TokenType.DIVIDE:
      case TokenType.MODULO:
      case TokenType.POWER:
      case TokenType.EQ:
      case TokenType.NEQ:
      case TokenType.LT:
      case TokenType.GT:
      case TokenType.LTE:
      case TokenType.GTE:
      case TokenType.AND:
      case TokenType.OR:
      case TokenType.NOT:
      case TokenType.CONCAT:
        return 'operator';
      case TokenType.LPAREN:
      case TokenType.RPAREN:
      case TokenType.LBRACKET:
      case TokenType.RBRACKET:
      case TokenType.LBRACE:
      case TokenType.RBRACE:
      case TokenType.COMMA:
      case TokenType.DOT:
      case TokenType.COLON:
      case TokenType.QUESTION:
        return 'punctuation';
      default:
        return 'literal';
    }
  }

  /**
   * Get all available functions
   */
  getFunctions() {
    return functionRegistry.list();
  }

  /**
   * Get functions by category
   */
  getFunctionsByCategory(category: FunctionCategory) {
    return functionRegistry.getByCategory(category);
  }

  /**
   * Get a specific function signature
   */
  getFunction(name: string) {
    return functionRegistry.get(name);
  }

  /**
   * Get function count
   */
  getFunctionCount(): number {
    return FUNCTION_COUNT;
  }

  // ============================================================================
  // Context Management
  // ============================================================================

  setField(name: string, value: ExpressionValue): void {
    this.evaluator.setField(name, value);
  }

  setFields(fields: Record<string, ExpressionValue>): void {
    this.evaluator.setFields(fields);
  }

  setVariable(name: string, value: ExpressionValue): void {
    this.evaluator.setVariable(name, value);
  }

  setDataset(name: string, records: Record<string, ExpressionValue>[]): void {
    this.evaluator.setDataset(name, records);
  }

  setUser(user: Partial<EvaluationContext['user']>): void {
    this.evaluator.setUser(user);
  }

  // ============================================================================
  // Calculated Fields
  // ============================================================================

  /**
   * Build a dependency graph for calculated fields
   */
  buildDependencyGraph(calculatedFields: CalculatedFieldConfig[]): CalculationDependencyGraph {
    const nodes = new Map<string, CalculatedFieldConfig>();
    const edges = new Map<string, Set<string>>();

    // Build nodes
    for (const field of calculatedFields) {
      nodes.set(field.id, field);
      edges.set(field.id, new Set());
    }

    // Build edges (field -> fields that depend on it)
    for (const field of calculatedFields) {
      const validation = this.validate(field.formula);
      field.dependencies = validation.referencedFields;
      
      for (const dep of validation.referencedFields) {
        if (edges.has(dep)) {
          edges.get(dep)!.add(field.id);
        }
      }
    }

    // Topological sort
    const order = this.topologicalSort(calculatedFields, edges);

    return { nodes, edges, order };
  }

  private topologicalSort(fields: CalculatedFieldConfig[], edges: Map<string, Set<string>>): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const field = fields.find(f => f.id === id);
      if (field) {
        for (const dep of field.dependencies) {
          visit(dep);
        }
        result.push(id);
      }
    };

    for (const field of fields) {
      visit(field.id);
    }

    return result;
  }

  /**
   * Recalculate all calculated fields in dependency order
   */
  recalculateAll(
    calculatedFields: CalculatedFieldConfig[],
    fieldValues: Record<string, ExpressionValue>
  ): Record<string, ExpressionValue> {
    const graph = this.buildDependencyGraph(calculatedFields);
    const results: Record<string, ExpressionValue> = { ...fieldValues };

    // Update context with current field values
    this.setFields(fieldValues);

    // Calculate in dependency order
    for (const fieldId of graph.order) {
      const field = graph.nodes.get(fieldId);
      if (field) {
        const evalResult = this.evaluate(field.formula);
        if (evalResult.success) {
          results[fieldId] = evalResult.value!;
          this.setField(fieldId, evalResult.value!);
        } else if (field.fallbackValue !== undefined) {
          results[fieldId] = field.fallbackValue;
          this.setField(fieldId, field.fallbackValue);
        }
      }
    }

    return results;
  }

  // ============================================================================
  // AST Utilities
  // ============================================================================

  private walkAst(node: ASTNode, callback: (node: ASTNode) => void): void {
    callback(node);

    switch (node.type) {
      case 'BinaryExpression':
        this.walkAst(node.left, callback);
        this.walkAst(node.right, callback);
        break;
      case 'UnaryExpression':
        this.walkAst(node.argument, callback);
        break;
      case 'CallExpression':
        this.walkAst(node.callee, callback);
        for (const arg of node.arguments) {
          this.walkAst(arg, callback);
        }
        break;
      case 'MemberExpression':
        this.walkAst(node.object, callback);
        this.walkAst(node.property, callback);
        break;
      case 'ConditionalExpression':
        this.walkAst(node.test, callback);
        this.walkAst(node.consequent, callback);
        this.walkAst(node.alternate, callback);
        break;
      case 'ArrayExpression':
        for (const el of node.elements) {
          this.walkAst(el, callback);
        }
        break;
      case 'ObjectExpression':
        for (const prop of node.properties) {
          this.walkAst(prop.key, callback);
          this.walkAst(prop.value, callback);
        }
        break;
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick evaluate a formula with optional context
 */
export function evaluate(formula: string, context?: Partial<EvaluationContext>): EvaluationResult {
  const service = new ExpressionService(context);
  return service.evaluate(formula);
}

/**
 * Quick parse a formula
 */
export function parse(formula: string): ParseResult {
  const service = new ExpressionService();
  return service.parse(formula);
}

/**
 * Quick validate a formula
 */
export function validate(formula: string, availableFields?: string[]): ValidationResult {
  const service = new ExpressionService();
  return service.validate(formula, availableFields);
}

// Export types and classes
export { Parser } from './parser';
export { Evaluator } from './evaluator';
export { Tokenizer, TokenType } from './tokenizer';
export { functionRegistry, FUNCTION_COUNT } from './functions';
