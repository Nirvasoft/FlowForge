/**
 * FlowForge SCIM Filter Parser
 * Parses SCIM 2.0 filter expressions (RFC 7644 Section 3.4.2.2)
 */

import type { SCIMFilter, SCIMFilterOperator } from '../../types/scim';

// ============================================================================
// Filter AST Types
// ============================================================================

export type FilterExpression =
  | AttributeExpression
  | LogicalExpression
  | NotExpression
  | ValuePathExpression;

export interface AttributeExpression {
  type: 'attribute';
  attributePath: string;
  operator: SCIMFilterOperator;
  value: string | number | boolean | null;
}

export interface LogicalExpression {
  type: 'logical';
  operator: 'and' | 'or';
  left: FilterExpression;
  right: FilterExpression;
}

export interface NotExpression {
  type: 'not';
  expression: FilterExpression;
}

export interface ValuePathExpression {
  type: 'valuePath';
  attributePath: string;
  filter: FilterExpression;
}

// ============================================================================
// Tokenizer
// ============================================================================

enum TokenType {
  ATTRIBUTE = 'ATTRIBUTE',
  OPERATOR = 'OPERATOR',
  VALUE = 'VALUE',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  EOF = 'EOF',
}

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

class Tokenizer {
  private input: string;
  private position: number = 0;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;

    while (this.position < this.input.length) {
      this.skipWhitespace();
      if (this.position >= this.input.length) break;

      const char = this.input[this.position];

      if (char === '(') {
        this.tokens.push({ type: TokenType.LPAREN, value: '(', position: this.position });
        this.position++;
      } else if (char === ')') {
        this.tokens.push({ type: TokenType.RPAREN, value: ')', position: this.position });
        this.position++;
      } else if (char === '[') {
        this.tokens.push({ type: TokenType.LBRACKET, value: '[', position: this.position });
        this.position++;
      } else if (char === ']') {
        this.tokens.push({ type: TokenType.RBRACKET, value: ']', position: this.position });
        this.position++;
      } else if (char === '"') {
        this.readString();
      } else if (this.isDigit(char!) || (char === '-' && this.isDigit(this.peek()!))) {
        this.readNumber();
      } else if (this.isIdentifierStart(char!)) {
        this.readIdentifierOrKeyword();
      } else {
        throw new Error(`Unexpected character at position ${this.position}: ${char}`);
      }
    }

    this.tokens.push({ type: TokenType.EOF, value: '', position: this.position });
    return this.tokens;
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.input[this.position]!)) {
      this.position++;
    }
  }

  private peek(offset: number = 1): string {
    return this.input[this.position + offset] || '';
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isIdentifierStart(char: string): boolean {
    return /[a-zA-Z_]/.test(char);
  }

  private isIdentifierPart(char: string): boolean {
    return /[a-zA-Z0-9_:.\-]/.test(char);
  }

  private readString(): void {
    const start = this.position;
    this.position++; // Skip opening quote
    let value = '';

    while (this.position < this.input.length && this.input[this.position] !== '"') {
      if (this.input[this.position] === '\\') {
        this.position++;
        if (this.position < this.input.length) {
          value += this.input[this.position];
        }
      } else {
        value += this.input[this.position];
      }
      this.position++;
    }

    if (this.input[this.position] !== '"') {
      throw new Error(`Unterminated string at position ${start}`);
    }

    this.position++; // Skip closing quote
    this.tokens.push({ type: TokenType.VALUE, value, position: start });
  }

  private readNumber(): void {
    const start = this.position;
    let value = '';

    if (this.input[this.position] === '-') {
      value += '-';
      this.position++;
    }

    while (this.position < this.input.length && /[0-9.]/.test(this.input[this.position]!)) {
      value += this.input[this.position]!;
      this.position++;
    }

    this.tokens.push({ type: TokenType.VALUE, value, position: start });
  }

  private readIdentifierOrKeyword(): void {
    const start = this.position;
    let value = '';

    while (this.position < this.input.length && this.isIdentifierPart(this.input[this.position]!)) {
      value += this.input[this.position]!;
      this.position++;
    }

    const upper = value.toUpperCase();

    // Check for keywords
    if (upper === 'AND') {
      this.tokens.push({ type: TokenType.AND, value: 'and', position: start });
    } else if (upper === 'OR') {
      this.tokens.push({ type: TokenType.OR, value: 'or', position: start });
    } else if (upper === 'NOT') {
      this.tokens.push({ type: TokenType.NOT, value: 'not', position: start });
    } else if (upper === 'TRUE') {
      this.tokens.push({ type: TokenType.VALUE, value: 'true', position: start });
    } else if (upper === 'FALSE') {
      this.tokens.push({ type: TokenType.VALUE, value: 'false', position: start });
    } else if (upper === 'NULL') {
      this.tokens.push({ type: TokenType.VALUE, value: 'null', position: start });
    } else if (this.isOperator(upper)) {
      this.tokens.push({ type: TokenType.OPERATOR, value: upper.toLowerCase(), position: start });
    } else {
      this.tokens.push({ type: TokenType.ATTRIBUTE, value, position: start });
    }
  }

  private isOperator(value: string): boolean {
    return ['EQ', 'NE', 'CO', 'SW', 'EW', 'PR', 'GT', 'GE', 'LT', 'LE'].includes(value);
  }
}

// ============================================================================
// Parser
// ============================================================================

export class SCIMFilterParser {
  private tokens: Token[] = [];
  private current: number = 0;

  parse(filter: string): FilterExpression {
    if (!filter || !filter.trim()) {
      throw new Error('Empty filter expression');
    }

    const tokenizer = new Tokenizer(filter);
    this.tokens = tokenizer.tokenize();
    this.current = 0;

    const expression = this.parseExpression();

    if (!this.isAtEnd()) {
      throw new Error(`Unexpected token: ${this.peek().value}`);
    }

    return expression;
  }

  private parseExpression(): FilterExpression {
    return this.parseOr();
  }

  private parseOr(): FilterExpression {
    let left = this.parseAnd();

    while (this.match(TokenType.OR)) {
      const right = this.parseAnd();
      left = { type: 'logical', operator: 'or', left, right };
    }

    return left;
  }

  private parseAnd(): FilterExpression {
    let left = this.parseUnary();

    while (this.match(TokenType.AND)) {
      const right = this.parseUnary();
      left = { type: 'logical', operator: 'and', left, right };
    }

    return left;
  }

  private parseUnary(): FilterExpression {
    if (this.match(TokenType.NOT)) {
      const expression = this.parseUnary();
      return { type: 'not', expression };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): FilterExpression {
    // Grouped expression
    if (this.match(TokenType.LPAREN)) {
      const expression = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression");
      return expression;
    }

    // Attribute expression
    if (this.check(TokenType.ATTRIBUTE)) {
      return this.parseAttributeExpression();
    }

    throw new Error(`Unexpected token: ${this.peek().value}`);
  }

  private parseAttributeExpression(): FilterExpression {
    const attribute = this.consume(TokenType.ATTRIBUTE, 'Expected attribute name');

    // Check for value path (e.g., emails[type eq "work"])
    if (this.match(TokenType.LBRACKET)) {
      const filter = this.parseExpression();
      this.consume(TokenType.RBRACKET, "Expected ']' after value path filter");
      return { type: 'valuePath', attributePath: attribute.value, filter };
    }

    // Regular attribute expression
    const operator = this.consume(TokenType.OPERATOR, 'Expected operator');
    const op = operator.value as SCIMFilterOperator;

    // 'pr' operator doesn't have a value
    if (op === 'pr') {
      return {
        type: 'attribute',
        attributePath: attribute.value,
        operator: op,
        value: null,
      };
    }

    const valueToken = this.consume(TokenType.VALUE, 'Expected value');
    const value = this.parseValue(valueToken.value);

    return {
      type: 'attribute',
      attributePath: attribute.value,
      operator: op,
      value,
    };
  }

  private parseValue(raw: string): string | number | boolean | null {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw === 'null') return null;
    if (/^-?\d+\.?\d*$/.test(raw)) return parseFloat(raw);
    return raw;
  }

  // Token helpers
  private peek(): Token {
    return this.tokens[this.current]!;
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.current++;
      return true;
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      const token = this.peek();
      this.current++;
      return token;
    }
    throw new Error(`${message}, got ${this.peek().type}`);
  }
}

// ============================================================================
// Filter Matcher
// ============================================================================

export class SCIMFilterMatcher {
  match(resource: Record<string, unknown>, expression: FilterExpression): boolean {
    switch (expression.type) {
      case 'attribute':
        return this.matchAttribute(resource, expression);
      case 'logical':
        return this.matchLogical(resource, expression);
      case 'not':
        return !this.match(resource, expression.expression);
      case 'valuePath':
        return this.matchValuePath(resource, expression);
      default:
        return false;
    }
  }

  private matchAttribute(resource: Record<string, unknown>, expr: AttributeExpression): boolean {
    const value = this.getNestedValue(resource, expr.attributePath);

    switch (expr.operator) {
      case 'eq':
        return this.equals(value, expr.value);
      case 'ne':
        return !this.equals(value, expr.value);
      case 'co':
        return this.contains(value, expr.value);
      case 'sw':
        return this.startsWith(value, expr.value);
      case 'ew':
        return this.endsWith(value, expr.value);
      case 'pr':
        return value !== null && value !== undefined;
      case 'gt':
        return this.compare(value, expr.value) > 0;
      case 'ge':
        return this.compare(value, expr.value) >= 0;
      case 'lt':
        return this.compare(value, expr.value) < 0;
      case 'le':
        return this.compare(value, expr.value) <= 0;
      default:
        return false;
    }
  }

  private matchLogical(resource: Record<string, unknown>, expr: LogicalExpression): boolean {
    const left = this.match(resource, expr.left);
    const right = this.match(resource, expr.right);

    if (expr.operator === 'and') {
      return left && right;
    } else {
      return left || right;
    }
  }

  private matchValuePath(resource: Record<string, unknown>, expr: ValuePathExpression): boolean {
    const value = this.getNestedValue(resource, expr.attributePath);

    if (Array.isArray(value)) {
      return value.some(item =>
        typeof item === 'object' && item !== null &&
        this.match(item as Record<string, unknown>, expr.filter)
      );
    }

    return false;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private equals(a: unknown, b: unknown): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase() === b.toLowerCase();
    }
    return a === b;
  }

  private contains(a: unknown, b: unknown): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase().includes(b.toLowerCase());
    }
    return false;
  }

  private startsWith(a: unknown, b: unknown): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase().startsWith(b.toLowerCase());
    }
    return false;
  }

  private endsWith(a: unknown, b: unknown): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase().endsWith(b.toLowerCase());
    }
    return false;
  }

  private compare(a: unknown, b: unknown): number {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }
    return 0;
  }
}

// Convenience exports
export const parseFilter = (filter: string) => new SCIMFilterParser().parse(filter);
export const matchFilter = (resource: Record<string, unknown>, expression: FilterExpression) =>
  new SCIMFilterMatcher().match(resource, expression);
