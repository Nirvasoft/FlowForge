/**
 * FlowForge Expression Parser
 * Recursive descent parser that builds an AST from tokens
 */

import { Tokenizer, Token, TokenType } from './tokenizer';
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
  ParseResult,
  ParseError,
  BinaryOperator,
  UnaryOperator,
} from '../../types/expressions';

export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;
  private input: string;

  constructor(input: string) {
    this.input = input;
  }

  parse(): ParseResult {
    try {
      const { tokens, errors } = new Tokenizer(this.input).tokenize();

      if (errors.length > 0) {
        const firstError = errors[0]!;
        return {
          success: false,
          error: {
            message: firstError.message,
            position: firstError.position,
            line: firstError.line,
            column: firstError.column,
            snippet: this.getSnippet(firstError.position),
          },
        };
      }

      this.tokens = tokens;
      this.current = 0;

      const ast = this.parseExpression();

      if (!this.isAtEnd()) {
        const token = this.peek();
        return {
          success: false,
          error: {
            message: `Unexpected token: ${token.value}`,
            position: token.start,
            line: token.line,
            column: token.column,
            snippet: this.getSnippet(token.start),
          },
        };
      }

      return { success: true, ast };
    } catch (error) {
      if (error instanceof ParserError) {
        return {
          success: false,
          error: {
            message: error.message,
            position: error.position,
            line: error.line,
            column: error.column,
            snippet: this.getSnippet(error.position),
          },
        };
      }
      throw error;
    }
  }

  private getSnippet(position: number): string {
    const start = Math.max(0, position - 20);
    const end = Math.min(this.input.length, position + 20);
    const before = this.input.slice(start, position);
    const after = this.input.slice(position, end);
    return `${start > 0 ? '...' : ''}${before}→${after}${end < this.input.length ? '...' : ''}`;
  }

  // ============================================================================
  // Token helpers
  // ============================================================================

  private peek(): Token {
    return this.tokens[this.current]!;
  }

  private previous(): Token {
    return this.tokens[this.current - 1]!;
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new ParserError(message, token.start, token.line, token.column);
  }

  // ============================================================================
  // Expression parsing (ordered by precedence, lowest to highest)
  // ============================================================================

  private parseExpression(): ASTNode {
    return this.parseTernary();
  }

  // Ternary: condition ? consequent : alternate
  private parseTernary(): ASTNode {
    let expr = this.parseOr();

    if (this.match(TokenType.QUESTION)) {
      const consequent = this.parseExpression();
      this.consume(TokenType.COLON, "Expected ':' in ternary expression");
      const alternate = this.parseExpression();

      expr = {
        type: 'ConditionalExpression',
        test: expr,
        consequent,
        alternate,
        start: expr.start,
        end: alternate.end,
      } as ConditionalExpressionNode;
    }

    return expr;
  }

  // Logical OR: a || b, a or b
  private parseOr(): ASTNode {
    let left = this.parseAnd();

    while (this.match(TokenType.OR)) {
      const operator = '||' as BinaryOperator;
      const right = this.parseAnd();
      left = {
        type: 'BinaryExpression',
        operator,
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpressionNode;
    }

    return left;
  }

  // Logical AND: a && b, a and b
  private parseAnd(): ASTNode {
    let left = this.parseEquality();

    while (this.match(TokenType.AND)) {
      const operator = '&&' as BinaryOperator;
      const right = this.parseEquality();
      left = {
        type: 'BinaryExpression',
        operator,
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpressionNode;
    }

    return left;
  }

  // Equality: a == b, a != b, a === b, a !== b
  private parseEquality(): ASTNode {
    let left = this.parseComparison();

    while (this.match(TokenType.EQ, TokenType.NEQ, TokenType.STRICT_EQ, TokenType.STRICT_NEQ)) {
      const operatorToken = this.previous();
      const operatorMap: Record<TokenType, BinaryOperator> = {
        [TokenType.EQ]: '==',
        [TokenType.NEQ]: '!=',
        [TokenType.STRICT_EQ]: '===',
        [TokenType.STRICT_NEQ]: '!==',
      } as Record<TokenType, BinaryOperator>;
      const operator = operatorMap[operatorToken.type];
      const right = this.parseComparison();
      left = {
        type: 'BinaryExpression',
        operator,
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpressionNode;
    }

    return left;
  }

  // Comparison: a < b, a > b, a <= b, a >= b
  private parseComparison(): ASTNode {
    let left = this.parseConcatenation();

    while (this.match(TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE)) {
      const operatorToken = this.previous();
      const operatorMap: Record<TokenType, BinaryOperator> = {
        [TokenType.LT]: '<',
        [TokenType.GT]: '>',
        [TokenType.LTE]: '<=',
        [TokenType.GTE]: '>=',
      } as Record<TokenType, BinaryOperator>;
      const operator = operatorMap[operatorToken.type];
      const right = this.parseConcatenation();
      left = {
        type: 'BinaryExpression',
        operator,
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpressionNode;
    }

    return left;
  }

  // String concatenation: a & b
  private parseConcatenation(): ASTNode {
    let left = this.parseAdditive();

    while (this.match(TokenType.CONCAT)) {
      const right = this.parseAdditive();
      left = {
        type: 'BinaryExpression',
        operator: '&' as BinaryOperator,
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpressionNode;
    }

    return left;
  }

  // Addition/Subtraction: a + b, a - b
  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parseMultiplicative();
      left = {
        type: 'BinaryExpression',
        operator,
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpressionNode;
    }

    return left;
  }

  // Multiplication/Division/Modulo: a * b, a / b, a % b
  private parseMultiplicative(): ASTNode {
    let left = this.parsePower();

    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parsePower();
      left = {
        type: 'BinaryExpression',
        operator,
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpressionNode;
    }

    return left;
  }

  // Exponentiation: a ** b (right-associative)
  private parsePower(): ASTNode {
    const left = this.parseUnary();

    if (this.match(TokenType.POWER)) {
      const right = this.parsePower(); // Right-associative
      return {
        type: 'BinaryExpression',
        operator: '**' as BinaryOperator,
        left,
        right,
        start: left.start,
        end: right.end,
      } as BinaryExpressionNode;
    }

    return left;
  }

  // Unary: -a, !a, +a, not a
  private parseUnary(): ASTNode {
    if (this.match(TokenType.MINUS, TokenType.NOT, TokenType.PLUS)) {
      const operatorToken = this.previous();
      const operatorMap: Record<string, UnaryOperator> = {
        '-': '-',
        '!': '!',
        '+': '+',
        'not': '!',
        'NOT': '!',
      };
      const operator = operatorMap[operatorToken.value] || (operatorToken.value as UnaryOperator);
      const argument = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator,
        argument,
        prefix: true,
        start: operatorToken.start,
        end: argument.end,
      } as UnaryExpressionNode;
    }

    return this.parseCall();
  }

  // Function calls and member access: fn(args), obj.prop, arr[index]
  private parseCall(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenType.LPAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'");
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: {
            type: 'Identifier',
            name: name.value,
            start: name.start,
            end: name.end,
          } as IdentifierNode,
          computed: false,
          start: expr.start,
          end: name.end,
        } as MemberExpressionNode;
      } else if (this.match(TokenType.LBRACKET)) {
        const property = this.parseExpression();
        const bracket = this.consume(TokenType.RBRACKET, "Expected ']' after index");
        expr = {
          type: 'MemberExpression',
          object: expr,
          property,
          computed: true,
          start: expr.start,
          end: bracket.end,
        } as MemberExpressionNode;
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: ASTNode): CallExpressionNode {
    const args: ASTNode[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    const paren = this.consume(TokenType.RPAREN, "Expected ')' after arguments");

    return {
      type: 'CallExpression',
      callee: callee as IdentifierNode | MemberExpressionNode,
      arguments: args,
      start: callee.start,
      end: paren.end,
    };
  }

  // Primary expressions: literals, identifiers, arrays, objects, grouped
  private parsePrimary(): ASTNode {
    // Boolean literals
    if (this.match(TokenType.BOOLEAN)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: token.value.toLowerCase() === 'true',
        raw: token.value,
        start: token.start,
        end: token.end,
      } as LiteralNode;
    }

    // Null literal
    if (this.match(TokenType.NULL)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: null,
        raw: token.value,
        start: token.start,
        end: token.end,
      } as LiteralNode;
    }

    // Number literal
    if (this.match(TokenType.NUMBER)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: parseFloat(token.value),
        raw: token.value,
        start: token.start,
        end: token.end,
      } as LiteralNode;
    }

    // String literal
    if (this.match(TokenType.STRING)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: token.value,
        raw: `"${token.value}"`,
        start: token.start,
        end: token.end,
      } as LiteralNode;
    }

    // Identifier
    if (this.match(TokenType.IDENTIFIER)) {
      const token = this.previous();
      return {
        type: 'Identifier',
        name: token.value,
        start: token.start,
        end: token.end,
      } as IdentifierNode;
    }

    // Array literal
    if (this.match(TokenType.LBRACKET)) {
      const start = this.previous().start;
      const elements: ASTNode[] = [];

      if (!this.check(TokenType.RBRACKET)) {
        do {
          elements.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }

      const bracket = this.consume(TokenType.RBRACKET, "Expected ']' after array elements");

      return {
        type: 'ArrayExpression',
        elements,
        start,
        end: bracket.end,
      } as ArrayExpressionNode;
    }

    // Object literal
    if (this.match(TokenType.LBRACE)) {
      const start = this.previous().start;
      const properties: Array<{ key: IdentifierNode | LiteralNode; value: ASTNode }> = [];

      if (!this.check(TokenType.RBRACE)) {
        do {
          let key: IdentifierNode | LiteralNode;

          if (this.match(TokenType.IDENTIFIER)) {
            const token = this.previous();
            key = {
              type: 'Identifier',
              name: token.value,
              start: token.start,
              end: token.end,
            } as IdentifierNode;
          } else if (this.match(TokenType.STRING)) {
            const token = this.previous();
            key = {
              type: 'Literal',
              value: token.value,
              raw: `"${token.value}"`,
              start: token.start,
              end: token.end,
            } as LiteralNode;
          } else {
            const token = this.peek();
            throw new ParserError('Expected property name', token.start, token.line, token.column);
          }

          this.consume(TokenType.COLON, "Expected ':' after property name");
          const value = this.parseExpression();
          properties.push({ key, value });
        } while (this.match(TokenType.COMMA));
      }

      const brace = this.consume(TokenType.RBRACE, "Expected '}' after object properties");

      return {
        type: 'ObjectExpression',
        properties,
        start,
        end: brace.end,
      } as ObjectExpressionNode;
    }

    // Grouped expression
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }

    const token = this.peek();
    throw new ParserError(`Unexpected token: ${token.value || token.type}`, token.start, token.line, token.column);
  }
}

class ParserError extends Error {
  constructor(
    message: string,
    public position: number,
    public line: number,
    public column: number
  ) {
    super(message);
    this.name = 'ParserError';
  }
}
