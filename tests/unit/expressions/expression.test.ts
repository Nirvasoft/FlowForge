/**
 * FlowForge Expression Engine Tests
 * Comprehensive test suite for parsing, evaluation, and functions
 */

import { ExpressionService, evaluate, parse, validate } from '../src/services/expressions';
import { Tokenizer, TokenType } from '../src/services/expressions/tokenizer';
import { FUNCTION_COUNT } from '../src/services/expressions/functions';

describe('Expression Engine', () => {
  // ============================================================================
  // Tokenizer Tests
  // ============================================================================
  describe('Tokenizer', () => {
    test('tokenizes numbers', () => {
      const { tokens } = new Tokenizer('123 45.67 1e10').tokenize();
      expect(tokens.filter(t => t.type === TokenType.NUMBER)).toHaveLength(3);
      expect(tokens[0].value).toBe('123');
      expect(tokens[1].value).toBe('45.67');
      expect(tokens[2].value).toBe('1e10');
    });

    test('tokenizes strings', () => {
      const { tokens } = new Tokenizer('"hello" \'world\'').tokenize();
      expect(tokens.filter(t => t.type === TokenType.STRING)).toHaveLength(2);
      expect(tokens[0].value).toBe('hello');
      expect(tokens[1].value).toBe('world');
    });

    test('tokenizes identifiers', () => {
      const { tokens } = new Tokenizer('foo bar_123 $test').tokenize();
      expect(tokens.filter(t => t.type === TokenType.IDENTIFIER)).toHaveLength(3);
    });

    test('tokenizes operators', () => {
      const { tokens } = new Tokenizer('+ - * / % ** == != < > <= >= && ||').tokenize();
      const opTypes = [
        TokenType.PLUS, TokenType.MINUS, TokenType.MULTIPLY, TokenType.DIVIDE,
        TokenType.MODULO, TokenType.POWER, TokenType.EQ, TokenType.NEQ,
        TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE,
        TokenType.AND, TokenType.OR
      ];
      opTypes.forEach((type, i) => {
        expect(tokens[i].type).toBe(type);
      });
    });

    test('tokenizes punctuation', () => {
      const { tokens } = new Tokenizer('( ) [ ] { } , . : ?').tokenize();
      const punctTypes = [
        TokenType.LPAREN, TokenType.RPAREN, TokenType.LBRACKET, TokenType.RBRACKET,
        TokenType.LBRACE, TokenType.RBRACE, TokenType.COMMA, TokenType.DOT,
        TokenType.COLON, TokenType.QUESTION
      ];
      punctTypes.forEach((type, i) => {
        expect(tokens[i].type).toBe(type);
      });
    });

    test('handles escape sequences in strings', () => {
      const { tokens } = new Tokenizer('"hello\\nworld"').tokenize();
      expect(tokens[0].value).toBe('hello\nworld');
    });
  });

  // ============================================================================
  // Parser Tests
  // ============================================================================
  describe('Parser', () => {
    test('parses literals', () => {
      expect(parse('123').success).toBe(true);
      expect(parse('"hello"').success).toBe(true);
      expect(parse('true').success).toBe(true);
      expect(parse('null').success).toBe(true);
    });

    test('parses binary expressions', () => {
      const result = parse('1 + 2 * 3');
      expect(result.success).toBe(true);
      expect(result.ast?.type).toBe('BinaryExpression');
    });

    test('parses function calls', () => {
      const result = parse('SUM(1, 2, 3)');
      expect(result.success).toBe(true);
      expect(result.ast?.type).toBe('CallExpression');
    });

    test('parses ternary expressions', () => {
      const result = parse('x > 0 ? "positive" : "negative"');
      expect(result.success).toBe(true);
      expect(result.ast?.type).toBe('ConditionalExpression');
    });

    test('parses array expressions', () => {
      const result = parse('[1, 2, 3]');
      expect(result.success).toBe(true);
      expect(result.ast?.type).toBe('ArrayExpression');
    });

    test('parses object expressions', () => {
      const result = parse('{ a: 1, b: 2 }');
      expect(result.success).toBe(true);
      expect(result.ast?.type).toBe('ObjectExpression');
    });

    test('parses member expressions', () => {
      const result = parse('user.name');
      expect(result.success).toBe(true);
      expect(result.ast?.type).toBe('MemberExpression');
    });

    test('reports syntax errors', () => {
      const result = parse('1 + + 2');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('respects operator precedence', () => {
      // 1 + 2 * 3 should be 1 + (2 * 3) = 7, not (1 + 2) * 3 = 9
      const result = evaluate('1 + 2 * 3');
      expect(result.value).toBe(7);
    });
  });

  // ============================================================================
  // Evaluator Tests - Arithmetic
  // ============================================================================
  describe('Evaluator - Arithmetic', () => {
    test('addition', () => {
      expect(evaluate('1 + 2').value).toBe(3);
      expect(evaluate('1.5 + 2.5').value).toBe(4);
    });

    test('subtraction', () => {
      expect(evaluate('5 - 3').value).toBe(2);
    });

    test('multiplication', () => {
      expect(evaluate('4 * 3').value).toBe(12);
    });

    test('division', () => {
      expect(evaluate('10 / 4').value).toBe(2.5);
    });

    test('modulo', () => {
      expect(evaluate('10 % 3').value).toBe(1);
    });

    test('power', () => {
      expect(evaluate('2 ** 3').value).toBe(8);
    });

    test('unary minus', () => {
      expect(evaluate('-5').value).toBe(-5);
    });

    test('complex expression', () => {
      expect(evaluate('(1 + 2) * 3 - 4 / 2').value).toBe(7);
    });

    test('division by zero throws error', () => {
      expect(evaluate('1 / 0').success).toBe(false);
    });
  });

  // ============================================================================
  // Evaluator Tests - Comparison
  // ============================================================================
  describe('Evaluator - Comparison', () => {
    test('equality', () => {
      expect(evaluate('1 == 1').value).toBe(true);
      expect(evaluate('1 == 2').value).toBe(false);
      expect(evaluate('"a" == "a"').value).toBe(true);
    });

    test('inequality', () => {
      expect(evaluate('1 != 2').value).toBe(true);
      expect(evaluate('1 != 1').value).toBe(false);
    });

    test('less than', () => {
      expect(evaluate('1 < 2').value).toBe(true);
      expect(evaluate('2 < 1').value).toBe(false);
    });

    test('greater than', () => {
      expect(evaluate('2 > 1').value).toBe(true);
      expect(evaluate('1 > 2').value).toBe(false);
    });

    test('less than or equal', () => {
      expect(evaluate('1 <= 1').value).toBe(true);
      expect(evaluate('1 <= 2').value).toBe(true);
    });

    test('greater than or equal', () => {
      expect(evaluate('2 >= 2').value).toBe(true);
      expect(evaluate('2 >= 1').value).toBe(true);
    });
  });

  // ============================================================================
  // Evaluator Tests - Logical
  // ============================================================================
  describe('Evaluator - Logical', () => {
    test('and', () => {
      expect(evaluate('true && true').value).toBe(true);
      expect(evaluate('true && false').value).toBe(false);
    });

    test('or', () => {
      expect(evaluate('true || false').value).toBe(true);
      expect(evaluate('false || false').value).toBe(false);
    });

    test('not', () => {
      expect(evaluate('!true').value).toBe(false);
      expect(evaluate('!false').value).toBe(true);
    });

    test('complex logical', () => {
      expect(evaluate('(1 > 0) && (2 > 1)').value).toBe(true);
    });
  });

  // ============================================================================
  // Evaluator Tests - String
  // ============================================================================
  describe('Evaluator - String', () => {
    test('concatenation with &', () => {
      expect(evaluate('"hello" & " " & "world"').value).toBe('hello world');
    });

    test('concatenation with +', () => {
      expect(evaluate('"hello" + " world"').value).toBe('hello world');
    });
  });

  // ============================================================================
  // Evaluator Tests - Ternary
  // ============================================================================
  describe('Evaluator - Ternary', () => {
    test('true condition', () => {
      expect(evaluate('true ? "yes" : "no"').value).toBe('yes');
    });

    test('false condition', () => {
      expect(evaluate('false ? "yes" : "no"').value).toBe('no');
    });

    test('with expression condition', () => {
      expect(evaluate('5 > 3 ? "bigger" : "smaller"').value).toBe('bigger');
    });
  });

  // ============================================================================
  // Function Tests - Math
  // ============================================================================
  describe('Functions - Math', () => {
    test('SUM', () => {
      expect(evaluate('SUM(1, 2, 3)').value).toBe(6);
      expect(evaluate('SUM(10)').value).toBe(10);
    });

    test('AVERAGE', () => {
      expect(evaluate('AVERAGE(1, 2, 3, 4)').value).toBe(2.5);
    });

    test('MIN', () => {
      expect(evaluate('MIN(5, 2, 8, 1)').value).toBe(1);
    });

    test('MAX', () => {
      expect(evaluate('MAX(5, 2, 8, 1)').value).toBe(8);
    });

    test('ABS', () => {
      expect(evaluate('ABS(-5)').value).toBe(5);
      expect(evaluate('ABS(5)').value).toBe(5);
    });

    test('ROUND', () => {
      expect(evaluate('ROUND(3.7)').value).toBe(4);
      expect(evaluate('ROUND(3.14159, 2)').value).toBe(3.14);
    });

    test('FLOOR', () => {
      expect(evaluate('FLOOR(3.7)').value).toBe(3);
    });

    test('CEIL', () => {
      expect(evaluate('CEIL(3.2)').value).toBe(4);
    });

    test('POWER', () => {
      expect(evaluate('POWER(2, 3)').value).toBe(8);
    });

    test('SQRT', () => {
      expect(evaluate('SQRT(16)').value).toBe(4);
    });

    test('MOD', () => {
      expect(evaluate('MOD(10, 3)').value).toBe(1);
    });
  });

  // ============================================================================
  // Function Tests - Text
  // ============================================================================
  describe('Functions - Text', () => {
    test('CONCAT', () => {
      expect(evaluate('CONCAT("Hello", " ", "World")').value).toBe('Hello World');
    });

    test('UPPER', () => {
      expect(evaluate('UPPER("hello")').value).toBe('HELLO');
    });

    test('LOWER', () => {
      expect(evaluate('LOWER("HELLO")').value).toBe('hello');
    });

    test('TRIM', () => {
      expect(evaluate('TRIM("  hello  ")').value).toBe('hello');
    });

    test('LEFT', () => {
      expect(evaluate('LEFT("Hello", 3)').value).toBe('Hel');
    });

    test('RIGHT', () => {
      expect(evaluate('RIGHT("Hello", 3)').value).toBe('llo');
    });

    test('MID', () => {
      expect(evaluate('MID("Hello", 2, 3)').value).toBe('ell');
    });

    test('LEN', () => {
      expect(evaluate('LEN("Hello")').value).toBe(5);
    });

    test('FIND', () => {
      expect(evaluate('FIND("l", "Hello")').value).toBe(3);
      expect(evaluate('FIND("x", "Hello")').value).toBe(0);
    });

    test('REPLACE', () => {
      expect(evaluate('REPLACE("Hello World", "World", "Universe")').value).toBe('Hello Universe');
    });

    test('PROPER', () => {
      expect(evaluate('PROPER("hello world")').value).toBe('Hello World');
    });
  });

  // ============================================================================
  // Function Tests - Logic
  // ============================================================================
  describe('Functions - Logic', () => {
    test('IF', () => {
      expect(evaluate('IF(true, "yes", "no")').value).toBe('yes');
      expect(evaluate('IF(false, "yes", "no")').value).toBe('no');
    });

    test('AND', () => {
      expect(evaluate('AND(true, true)').value).toBe(true);
      expect(evaluate('AND(true, false)').value).toBe(false);
    });

    test('OR', () => {
      expect(evaluate('OR(true, false)').value).toBe(true);
      expect(evaluate('OR(false, false)').value).toBe(false);
    });

    test('NOT', () => {
      expect(evaluate('NOT(true)').value).toBe(false);
    });

    test('ISBLANK', () => {
      expect(evaluate('ISBLANK(null)').value).toBe(true);
      expect(evaluate('ISBLANK("")').value).toBe(true);
      expect(evaluate('ISBLANK("text")').value).toBe(false);
    });

    test('COALESCE', () => {
      expect(evaluate('COALESCE(null, null, "value")').value).toBe('value');
    });
  });

  // ============================================================================
  // Function Tests - Date
  // ============================================================================
  describe('Functions - Date', () => {
    test('NOW returns a date', () => {
      const result = evaluate('NOW()');
      expect(result.success).toBe(true);
      expect(result.value).toBeInstanceOf(Date);
    });

    test('TODAY returns a date', () => {
      const result = evaluate('TODAY()');
      expect(result.success).toBe(true);
      expect(result.value).toBeInstanceOf(Date);
    });

    test('DATE creates a date', () => {
      const result = evaluate('DATE(2024, 6, 15)');
      expect(result.success).toBe(true);
      const date = result.value as Date;
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(5); // 0-indexed
      expect(date.getDate()).toBe(15);
    });

    test('YEAR extracts year', () => {
      expect(evaluate('YEAR(DATE(2024, 6, 15))').value).toBe(2024);
    });

    test('MONTH extracts month', () => {
      expect(evaluate('MONTH(DATE(2024, 6, 15))').value).toBe(6);
    });

    test('DAY extracts day', () => {
      expect(evaluate('DAY(DATE(2024, 6, 15))').value).toBe(15);
    });
  });

  // ============================================================================
  // Function Tests - Array
  // ============================================================================
  describe('Functions - Array', () => {
    test('FIRST', () => {
      expect(evaluate('FIRST([1, 2, 3])').value).toBe(1);
    });

    test('LAST', () => {
      expect(evaluate('LAST([1, 2, 3])').value).toBe(3);
    });

    test('INDEX', () => {
      expect(evaluate('INDEX([1, 2, 3], 1)').value).toBe(2);
    });

    test('LENGTH', () => {
      expect(evaluate('LENGTH([1, 2, 3])').value).toBe(3);
    });

    test('CONTAINS', () => {
      expect(evaluate('CONTAINS([1, 2, 3], 2)').value).toBe(true);
      expect(evaluate('CONTAINS([1, 2, 3], 5)').value).toBe(false);
    });

    test('UNIQUE', () => {
      expect(evaluate('UNIQUE([1, 2, 2, 3, 3, 3])').value).toEqual([1, 2, 3]);
    });

    test('SORT', () => {
      expect(evaluate('SORT([3, 1, 2])').value).toEqual([1, 2, 3]);
    });
  });

  // ============================================================================
  // Context Tests
  // ============================================================================
  describe('Context', () => {
    test('resolves field values', () => {
      const result = evaluate('price * quantity', {
        fields: { price: 10, quantity: 5 }
      });
      expect(result.value).toBe(50);
    });

    test('resolves nested fields', () => {
      const service = new ExpressionService({
        fields: { 
          order: { total: 100, discount: 10 } as unknown as string
        }
      });
      const result = service.evaluate('order.total - order.discount');
      expect(result.value).toBe(90);
    });

    test('resolves datasets with LOOKUP', () => {
      const service = new ExpressionService({
        datasets: {
          employees: [
            { id: 1, name: 'Alice', department: 'Engineering' },
            { id: 2, name: 'Bob', department: 'Sales' },
          ]
        }
      });
      const result = service.evaluate('LOOKUP("employees", "id", 1, "name")');
      expect(result.value).toBe('Alice');
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================
  describe('Validation', () => {
    test('validates correct formulas', () => {
      const result = validate('SUM(a, b) * 2', ['a', 'b']);
      expect(result.valid).toBe(true);
      expect(result.referencedFields).toContain('a');
      expect(result.referencedFields).toContain('b');
      expect(result.referencedFunctions).toContain('SUM');
    });

    test('catches unknown fields', () => {
      const result = validate('unknownField + 1', ['knownField']);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('unknownField'))).toBe(true);
    });

    test('catches unknown functions', () => {
      const result = validate('UNKNOWNFUNC(1)');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('UNKNOWNFUNC'))).toBe(true);
    });

    test('catches syntax errors', () => {
      const result = validate('1 + + 2');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'syntax')).toBe(true);
    });
  });

  // ============================================================================
  // Function Count
  // ============================================================================
  describe('Function Registry', () => {
    test('has 50+ functions', () => {
      expect(FUNCTION_COUNT).toBeGreaterThanOrEqual(50);
    });

    test('all functions have required properties', () => {
      const service = new ExpressionService();
      const functions = service.getFunctions();
      
      for (const fn of functions) {
        expect(fn.name).toBeDefined();
        expect(fn.category).toBeDefined();
        expect(fn.description).toBeDefined();
        expect(fn.parameters).toBeDefined();
        expect(fn.returnType).toBeDefined();
        expect(fn.examples.length).toBeGreaterThan(0);
        expect(typeof fn.implementation).toBe('function');
      }
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    test('handles empty string', () => {
      const result = parse('');
      expect(result.success).toBe(false);
    });

    test('handles whitespace only', () => {
      const result = parse('   ');
      expect(result.success).toBe(false);
    });

    test('handles very long formulas', () => {
      const longFormula = Array(100).fill('1').join(' + ');
      const result = evaluate(longFormula);
      expect(result.success).toBe(true);
      expect(result.value).toBe(100);
    });

    test('handles deeply nested expressions', () => {
      const result = evaluate('((((1 + 2) + 3) + 4) + 5)');
      expect(result.value).toBe(15);
    });

    test('handles unicode in strings', () => {
      const result = evaluate('"Hello 世界 🌍"');
      expect(result.value).toBe('Hello 世界 🌍');
    });
  });
});
