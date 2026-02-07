/**
 * FlowForge Expression Tokenizer
 * Lexical analysis for formula expressions
 */

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  NULL = 'NULL',
  
  // Identifiers
  IDENTIFIER = 'IDENTIFIER',
  
  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  MODULO = 'MODULO',
  POWER = 'POWER',
  
  // Comparison
  EQ = 'EQ',
  NEQ = 'NEQ',
  STRICT_EQ = 'STRICT_EQ',
  STRICT_NEQ = 'STRICT_NEQ',
  LT = 'LT',
  GT = 'GT',
  LTE = 'LTE',
  GTE = 'GTE',
  
  // Logical
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  
  // String
  CONCAT = 'CONCAT',
  
  // Punctuation
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  COMMA = 'COMMA',
  DOT = 'DOT',
  COLON = 'COLON',
  QUESTION = 'QUESTION',
  
  // Special
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  line: number;
  column: number;
}

export interface TokenizerError {
  message: string;
  position: number;
  line: number;
  column: number;
}

export class Tokenizer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private errors: TokenizerError[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): { tokens: Token[]; errors: TokenizerError[] } {
    this.tokens = [];
    this.errors = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;

    while (this.position < this.input.length) {
      const char = this.current();

      // Skip whitespace
      if (this.isWhitespace(char)) {
        this.advance();
        continue;
      }

      // Numbers
      if (this.isDigit(char) || (char === '.' && this.isDigit(this.peek()))) {
        this.readNumber();
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        this.readString(char);
        continue;
      }

      // Identifiers and keywords
      if (this.isIdentifierStart(char)) {
        this.readIdentifier();
        continue;
      }

      // Operators and punctuation
      if (this.readOperator()) {
        continue;
      }

      // Unknown character
      this.errors.push({
        message: `Unexpected character: ${char}`,
        position: this.position,
        line: this.line,
        column: this.column,
      });
      this.advance();
    }

    // Add EOF token
    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      start: this.position,
      end: this.position,
      line: this.line,
      column: this.column,
    });

    return { tokens: this.tokens, errors: this.errors };
  }

  private current(): string {
    return this.input[this.position] || '';
  }

  private peek(offset: number = 1): string {
    return this.input[this.position + offset] || '';
  }

  private advance(): string {
    const char = this.current();
    this.position++;
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  private addToken(type: TokenType, value: string, start: number, startLine: number, startColumn: number): void {
    this.tokens.push({
      type,
      value,
      start,
      end: this.position,
      line: startLine,
      column: startColumn,
    });
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isIdentifierStart(char: string): boolean {
    return /[a-zA-Z_$]/.test(char);
  }

  private isIdentifierPart(char: string): boolean {
    return /[a-zA-Z0-9_$]/.test(char);
  }

  private readNumber(): void {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    let value = '';
    let hasDecimal = false;
    let hasExponent = false;

    // Integer part
    while (this.isDigit(this.current())) {
      value += this.advance();
    }

    // Decimal part
    if (this.current() === '.' && this.isDigit(this.peek())) {
      hasDecimal = true;
      value += this.advance(); // consume '.'
      while (this.isDigit(this.current())) {
        value += this.advance();
      }
    }

    // Exponent part
    if (this.current() === 'e' || this.current() === 'E') {
      hasExponent = true;
      value += this.advance();
      if (this.current() === '+' || this.current() === '-') {
        value += this.advance();
      }
      if (!this.isDigit(this.current())) {
        this.errors.push({
          message: 'Invalid number: expected digit after exponent',
          position: this.position,
          line: this.line,
          column: this.column,
        });
        return;
      }
      while (this.isDigit(this.current())) {
        value += this.advance();
      }
    }

    this.addToken(TokenType.NUMBER, value, start, startLine, startColumn);
  }

  private readString(quote: string): void {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    let value = '';

    this.advance(); // consume opening quote

    while (this.position < this.input.length && this.current() !== quote) {
      if (this.current() === '\\') {
        this.advance();
        const escaped = this.current();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default: value += escaped;
        }
        this.advance();
      } else if (this.current() === '\n') {
        this.errors.push({
          message: 'Unterminated string: unexpected newline',
          position: this.position,
          line: this.line,
          column: this.column,
        });
        return;
      } else {
        value += this.advance();
      }
    }

    if (this.current() !== quote) {
      this.errors.push({
        message: 'Unterminated string',
        position: this.position,
        line: this.line,
        column: this.column,
      });
      return;
    }

    this.advance(); // consume closing quote
    this.addToken(TokenType.STRING, value, start, startLine, startColumn);
  }

  private readIdentifier(): void {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    let value = '';

    while (this.isIdentifierPart(this.current())) {
      value += this.advance();
    }

    // Check for keywords
    const keywords: Record<string, TokenType> = {
      'true': TokenType.BOOLEAN,
      'false': TokenType.BOOLEAN,
      'null': TokenType.NULL,
      'and': TokenType.AND,
      'or': TokenType.OR,
      'not': TokenType.NOT,
    };

    const type = keywords[value.toLowerCase()] || TokenType.IDENTIFIER;
    this.addToken(type, value, start, startLine, startColumn);
  }

  private readOperator(): boolean {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    const char = this.current();
    const next = this.peek();

    // Two-character operators
    const twoChar = char + next;
    const twoCharOps: Record<string, TokenType> = {
      '==': TokenType.EQ,
      '!=': TokenType.NEQ,
      '<=': TokenType.LTE,
      '>=': TokenType.GTE,
      '&&': TokenType.AND,
      '||': TokenType.OR,
      '**': TokenType.POWER,
    };

    if (twoCharOps[twoChar]) {
      this.advance();
      this.advance();
      this.addToken(twoCharOps[twoChar], twoChar, start, startLine, startColumn);
      return true;
    }

    // Three-character operators
    const threeChar = char + next + this.peek(2);
    const threeCharOps: Record<string, TokenType> = {
      '===': TokenType.STRICT_EQ,
      '!==': TokenType.STRICT_NEQ,
    };

    if (threeCharOps[threeChar]) {
      this.advance();
      this.advance();
      this.advance();
      this.addToken(threeCharOps[threeChar], threeChar, start, startLine, startColumn);
      return true;
    }

    // Single-character operators
    const singleCharOps: Record<string, TokenType> = {
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '*': TokenType.MULTIPLY,
      '/': TokenType.DIVIDE,
      '%': TokenType.MODULO,
      '<': TokenType.LT,
      '>': TokenType.GT,
      '!': TokenType.NOT,
      '&': TokenType.CONCAT,
      '(': TokenType.LPAREN,
      ')': TokenType.RPAREN,
      '[': TokenType.LBRACKET,
      ']': TokenType.RBRACKET,
      '{': TokenType.LBRACE,
      '}': TokenType.RBRACE,
      ',': TokenType.COMMA,
      '.': TokenType.DOT,
      ':': TokenType.COLON,
      '?': TokenType.QUESTION,
    };

    if (singleCharOps[char]) {
      this.advance();
      this.addToken(singleCharOps[char], char, start, startLine, startColumn);
      return true;
    }

    return false;
  }
}
