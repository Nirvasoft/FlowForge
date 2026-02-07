/**
 * FlowForge Function Registry
 * 50+ built-in functions for formula evaluation
 */

import type {
  FunctionSignature,
  FunctionCategory,
  FunctionParameter,
  ExpressionValue,
  FunctionRegistry as IFunctionRegistry,
} from '../../types/expressions';

// ============================================================================
// Function Registry Implementation
// ============================================================================

class FunctionRegistryImpl implements IFunctionRegistry {
  functions: Map<string, FunctionSignature> = new Map();

  register(fn: FunctionSignature): void {
    this.functions.set(fn.name.toUpperCase(), fn);
  }

  get(name: string): FunctionSignature | undefined {
    return this.functions.get(name.toUpperCase());
  }

  getByCategory(category: FunctionCategory): FunctionSignature[] {
    return Array.from(this.functions.values()).filter(fn => fn.category === category);
  }

  list(): FunctionSignature[] {
    return Array.from(this.functions.values());
  }
}

export const functionRegistry = new FunctionRegistryImpl();

// ============================================================================
// Helper Functions
// ============================================================================

function toNumber(value: ExpressionValue): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();
  return 0;
}

function toString(value: ExpressionValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function toBoolean(value: ExpressionValue): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  if (value === null || value === undefined) return false;
  return true;
}

function toDate(value: ExpressionValue): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') return new Date(value);
  return new Date();
}

function toArray(value: ExpressionValue): ExpressionValue[] {
  if (Array.isArray(value)) return value;
  return [value];
}

// ============================================================================
// MATH FUNCTIONS
// ============================================================================

functionRegistry.register({
  name: 'SUM',
  category: 'math',
  description: 'Adds all numbers together',
  parameters: [{ name: 'values', type: 'number', required: true, description: 'Numbers to sum', variadic: true }],
  returnType: 'number',
  examples: [
    { formula: 'SUM(1, 2, 3)', result: '6' },
    { formula: 'SUM(field1, field2)', result: 'Sum of fields' },
  ],
  implementation: (...args) => args.reduce((sum: number, val) => sum + toNumber(val), 0),
});

functionRegistry.register({
  name: 'AVERAGE',
  category: 'math',
  description: 'Calculates the average of numbers',
  parameters: [{ name: 'values', type: 'number', required: true, description: 'Numbers to average', variadic: true }],
  returnType: 'number',
  examples: [{ formula: 'AVERAGE(1, 2, 3, 4)', result: '2.5' }],
  implementation: (...args) => {
    const nums = args.filter(v => v !== null && v !== undefined);
    if (nums.length === 0) return 0;
    return nums.reduce((sum: number, val) => sum + toNumber(val), 0) / nums.length;
  },
});

functionRegistry.register({
  name: 'MIN',
  category: 'math',
  description: 'Returns the smallest number',
  parameters: [{ name: 'values', type: 'number', required: true, description: 'Numbers to compare', variadic: true }],
  returnType: 'number',
  examples: [{ formula: 'MIN(5, 2, 8, 1)', result: '1' }],
  implementation: (...args) => Math.min(...args.map(toNumber)),
});

functionRegistry.register({
  name: 'MAX',
  category: 'math',
  description: 'Returns the largest number',
  parameters: [{ name: 'values', type: 'number', required: true, description: 'Numbers to compare', variadic: true }],
  returnType: 'number',
  examples: [{ formula: 'MAX(5, 2, 8, 1)', result: '8' }],
  implementation: (...args) => Math.max(...args.map(toNumber)),
});

functionRegistry.register({
  name: 'ABS',
  category: 'math',
  description: 'Returns the absolute value',
  parameters: [{ name: 'number', type: 'number', required: true, description: 'Number to get absolute value of' }],
  returnType: 'number',
  examples: [{ formula: 'ABS(-5)', result: '5' }],
  implementation: (n) => Math.abs(toNumber(n)),
});

functionRegistry.register({
  name: 'ROUND',
  category: 'math',
  description: 'Rounds a number to specified decimal places',
  parameters: [
    { name: 'number', type: 'number', required: true, description: 'Number to round' },
    { name: 'decimals', type: 'number', required: false, description: 'Decimal places', default: 0 },
  ],
  returnType: 'number',
  examples: [
    { formula: 'ROUND(3.7)', result: '4' },
    { formula: 'ROUND(3.14159, 2)', result: '3.14' },
  ],
  implementation: (n, decimals = 0) => {
    const factor = Math.pow(10, toNumber(decimals));
    return Math.round(toNumber(n) * factor) / factor;
  },
});

functionRegistry.register({
  name: 'FLOOR',
  category: 'math',
  description: 'Rounds down to the nearest integer',
  parameters: [{ name: 'number', type: 'number', required: true, description: 'Number to round down' }],
  returnType: 'number',
  examples: [{ formula: 'FLOOR(3.7)', result: '3' }],
  implementation: (n) => Math.floor(toNumber(n)),
});

functionRegistry.register({
  name: 'CEIL',
  category: 'math',
  description: 'Rounds up to the nearest integer',
  parameters: [{ name: 'number', type: 'number', required: true, description: 'Number to round up' }],
  returnType: 'number',
  examples: [{ formula: 'CEIL(3.2)', result: '4' }],
  implementation: (n) => Math.ceil(toNumber(n)),
});

functionRegistry.register({
  name: 'POWER',
  category: 'math',
  description: 'Raises a number to a power',
  parameters: [
    { name: 'base', type: 'number', required: true, description: 'Base number' },
    { name: 'exponent', type: 'number', required: true, description: 'Exponent' },
  ],
  returnType: 'number',
  examples: [{ formula: 'POWER(2, 3)', result: '8' }],
  implementation: (base, exp) => Math.pow(toNumber(base), toNumber(exp)),
});

functionRegistry.register({
  name: 'SQRT',
  category: 'math',
  description: 'Returns the square root',
  parameters: [{ name: 'number', type: 'number', required: true, description: 'Number to get square root of' }],
  returnType: 'number',
  examples: [{ formula: 'SQRT(16)', result: '4' }],
  implementation: (n) => Math.sqrt(toNumber(n)),
});

functionRegistry.register({
  name: 'MOD',
  category: 'math',
  description: 'Returns the remainder after division',
  parameters: [
    { name: 'dividend', type: 'number', required: true, description: 'Number to divide' },
    { name: 'divisor', type: 'number', required: true, description: 'Number to divide by' },
  ],
  returnType: 'number',
  examples: [{ formula: 'MOD(10, 3)', result: '1' }],
  implementation: (a, b) => toNumber(a) % toNumber(b),
});

functionRegistry.register({
  name: 'RANDOM',
  category: 'math',
  description: 'Returns a random number between 0 and 1, or within a range',
  parameters: [
    { name: 'min', type: 'number', required: false, description: 'Minimum value', default: 0 },
    { name: 'max', type: 'number', required: false, description: 'Maximum value', default: 1 },
  ],
  returnType: 'number',
  examples: [
    { formula: 'RANDOM()', result: '0.xxx' },
    { formula: 'RANDOM(1, 100)', result: 'Random number 1-100' },
  ],
  implementation: (min = 0, max = 1) => {
    const minNum = toNumber(min);
    const maxNum = toNumber(max);
    return Math.random() * (maxNum - minNum) + minNum;
  },
});

// ============================================================================
// TEXT FUNCTIONS
// ============================================================================

functionRegistry.register({
  name: 'CONCAT',
  category: 'text',
  description: 'Concatenates text strings',
  parameters: [{ name: 'values', type: 'string', required: true, description: 'Strings to join', variadic: true }],
  returnType: 'string',
  examples: [{ formula: 'CONCAT("Hello", " ", "World")', result: 'Hello World' }],
  implementation: (...args) => args.map(toString).join(''),
});

functionRegistry.register({
  name: 'UPPER',
  category: 'text',
  description: 'Converts text to uppercase',
  parameters: [{ name: 'text', type: 'string', required: true, description: 'Text to convert' }],
  returnType: 'string',
  examples: [{ formula: 'UPPER("hello")', result: 'HELLO' }],
  implementation: (text) => toString(text).toUpperCase(),
});

functionRegistry.register({
  name: 'LOWER',
  category: 'text',
  description: 'Converts text to lowercase',
  parameters: [{ name: 'text', type: 'string', required: true, description: 'Text to convert' }],
  returnType: 'string',
  examples: [{ formula: 'LOWER("HELLO")', result: 'hello' }],
  implementation: (text) => toString(text).toLowerCase(),
});

functionRegistry.register({
  name: 'TRIM',
  category: 'text',
  description: 'Removes leading and trailing whitespace',
  parameters: [{ name: 'text', type: 'string', required: true, description: 'Text to trim' }],
  returnType: 'string',
  examples: [{ formula: 'TRIM("  hello  ")', result: 'hello' }],
  implementation: (text) => toString(text).trim(),
});

functionRegistry.register({
  name: 'LEFT',
  category: 'text',
  description: 'Returns leftmost characters',
  parameters: [
    { name: 'text', type: 'string', required: true, description: 'Source text' },
    { name: 'count', type: 'number', required: true, description: 'Number of characters' },
  ],
  returnType: 'string',
  examples: [{ formula: 'LEFT("Hello", 3)', result: 'Hel' }],
  implementation: (text, count) => toString(text).slice(0, toNumber(count)),
});

functionRegistry.register({
  name: 'RIGHT',
  category: 'text',
  description: 'Returns rightmost characters',
  parameters: [
    { name: 'text', type: 'string', required: true, description: 'Source text' },
    { name: 'count', type: 'number', required: true, description: 'Number of characters' },
  ],
  returnType: 'string',
  examples: [{ formula: 'RIGHT("Hello", 3)', result: 'llo' }],
  implementation: (text, count) => toString(text).slice(-toNumber(count)),
});

functionRegistry.register({
  name: 'MID',
  category: 'text',
  description: 'Returns characters from the middle',
  parameters: [
    { name: 'text', type: 'string', required: true, description: 'Source text' },
    { name: 'start', type: 'number', required: true, description: 'Starting position (1-based)' },
    { name: 'count', type: 'number', required: true, description: 'Number of characters' },
  ],
  returnType: 'string',
  examples: [{ formula: 'MID("Hello", 2, 3)', result: 'ell' }],
  implementation: (text, start, count) => toString(text).slice(toNumber(start) - 1, toNumber(start) - 1 + toNumber(count)),
});

functionRegistry.register({
  name: 'LEN',
  category: 'text',
  description: 'Returns the length of text',
  parameters: [{ name: 'text', type: 'string', required: true, description: 'Text to measure' }],
  returnType: 'number',
  examples: [{ formula: 'LEN("Hello")', result: '5' }],
  implementation: (text) => toString(text).length,
});

functionRegistry.register({
  name: 'FIND',
  category: 'text',
  description: 'Finds position of text within text (case-sensitive)',
  parameters: [
    { name: 'search', type: 'string', required: true, description: 'Text to find' },
    { name: 'within', type: 'string', required: true, description: 'Text to search within' },
    { name: 'start', type: 'number', required: false, description: 'Starting position', default: 1 },
  ],
  returnType: 'number',
  examples: [{ formula: 'FIND("l", "Hello")', result: '3' }],
  implementation: (search, within, start = 1) => {
    const pos = toString(within).indexOf(toString(search), toNumber(start) - 1);
    return pos === -1 ? 0 : pos + 1;
  },
});

functionRegistry.register({
  name: 'REPLACE',
  category: 'text',
  description: 'Replaces text',
  parameters: [
    { name: 'text', type: 'string', required: true, description: 'Original text' },
    { name: 'search', type: 'string', required: true, description: 'Text to find' },
    { name: 'replacement', type: 'string', required: true, description: 'Replacement text' },
  ],
  returnType: 'string',
  examples: [{ formula: 'REPLACE("Hello World", "World", "Universe")', result: 'Hello Universe' }],
  implementation: (text, search, replacement) => toString(text).replace(new RegExp(toString(search), 'g'), toString(replacement)),
});

functionRegistry.register({
  name: 'SPLIT',
  category: 'text',
  description: 'Splits text by delimiter',
  parameters: [
    { name: 'text', type: 'string', required: true, description: 'Text to split' },
    { name: 'delimiter', type: 'string', required: true, description: 'Delimiter' },
  ],
  returnType: 'array',
  examples: [{ formula: 'SPLIT("a,b,c", ",")', result: '["a", "b", "c"]' }],
  implementation: (text, delimiter) => toString(text).split(toString(delimiter)),
});

functionRegistry.register({
  name: 'JOIN',
  category: 'text',
  description: 'Joins array elements with delimiter',
  parameters: [
    { name: 'array', type: 'array', required: true, description: 'Array to join' },
    { name: 'delimiter', type: 'string', required: false, description: 'Delimiter', default: ',' },
  ],
  returnType: 'string',
  examples: [{ formula: 'JOIN(["a", "b", "c"], "-")', result: 'a-b-c' }],
  implementation: (arr, delimiter = ',') => toArray(arr).map(toString).join(toString(delimiter)),
});

functionRegistry.register({
  name: 'PROPER',
  category: 'text',
  description: 'Capitalizes the first letter of each word',
  parameters: [{ name: 'text', type: 'string', required: true, description: 'Text to convert' }],
  returnType: 'string',
  examples: [{ formula: 'PROPER("hello world")', result: 'Hello World' }],
  implementation: (text) => toString(text).replace(/\b\w/g, c => c.toUpperCase()),
});

functionRegistry.register({
  name: 'TEXT',
  category: 'text',
  description: 'Formats a value as text with a format string',
  parameters: [
    { name: 'value', type: 'any', required: true, description: 'Value to format' },
    { name: 'format', type: 'string', required: true, description: 'Format string' },
  ],
  returnType: 'string',
  examples: [
    { formula: 'TEXT(1234.5, "#,##0.00")', result: '1,234.50' },
    { formula: 'TEXT(NOW(), "YYYY-MM-DD")', result: '2024-01-15' },
  ],
  implementation: (value, format) => {
    const fmt = toString(format);
    if (value instanceof Date) {
      // Simple date formatting
      return fmt
        .replace('YYYY', value.getFullYear().toString())
        .replace('MM', String(value.getMonth() + 1).padStart(2, '0'))
        .replace('DD', String(value.getDate()).padStart(2, '0'))
        .replace('HH', String(value.getHours()).padStart(2, '0'))
        .replace('mm', String(value.getMinutes()).padStart(2, '0'))
        .replace('ss', String(value.getSeconds()).padStart(2, '0'));
    }
    if (typeof value === 'number') {
      // Simple number formatting
      if (fmt.includes('#,##')) {
        const decimals = (fmt.match(/0+$/)?.[0] || '').length;
        return value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      }
    }
    return toString(value);
  },
});

// ============================================================================
// DATE FUNCTIONS
// ============================================================================

functionRegistry.register({
  name: 'NOW',
  category: 'date',
  description: 'Returns the current date and time',
  parameters: [],
  returnType: 'date',
  examples: [{ formula: 'NOW()', result: 'Current datetime' }],
  implementation: () => new Date(),
});

functionRegistry.register({
  name: 'TODAY',
  category: 'date',
  description: 'Returns today\'s date (at midnight)',
  parameters: [],
  returnType: 'date',
  examples: [{ formula: 'TODAY()', result: 'Today\'s date' }],
  implementation: () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  },
});

functionRegistry.register({
  name: 'DATE',
  category: 'date',
  description: 'Creates a date from year, month, day',
  parameters: [
    { name: 'year', type: 'number', required: true, description: 'Year' },
    { name: 'month', type: 'number', required: true, description: 'Month (1-12)' },
    { name: 'day', type: 'number', required: true, description: 'Day' },
  ],
  returnType: 'date',
  examples: [{ formula: 'DATE(2024, 6, 15)', result: 'June 15, 2024' }],
  implementation: (year, month, day) => new Date(toNumber(year), toNumber(month) - 1, toNumber(day)),
});

functionRegistry.register({
  name: 'YEAR',
  category: 'date',
  description: 'Returns the year from a date',
  parameters: [{ name: 'date', type: 'date', required: true, description: 'Date' }],
  returnType: 'number',
  examples: [{ formula: 'YEAR(NOW())', result: 'Current year' }],
  implementation: (date) => toDate(date).getFullYear(),
});

functionRegistry.register({
  name: 'MONTH',
  category: 'date',
  description: 'Returns the month from a date (1-12)',
  parameters: [{ name: 'date', type: 'date', required: true, description: 'Date' }],
  returnType: 'number',
  examples: [{ formula: 'MONTH(NOW())', result: 'Current month' }],
  implementation: (date) => toDate(date).getMonth() + 1,
});

functionRegistry.register({
  name: 'DAY',
  category: 'date',
  description: 'Returns the day of month from a date',
  parameters: [{ name: 'date', type: 'date', required: true, description: 'Date' }],
  returnType: 'number',
  examples: [{ formula: 'DAY(NOW())', result: 'Current day of month' }],
  implementation: (date) => toDate(date).getDate(),
});

functionRegistry.register({
  name: 'WEEKDAY',
  category: 'date',
  description: 'Returns the day of week (1=Sunday, 7=Saturday)',
  parameters: [{ name: 'date', type: 'date', required: true, description: 'Date' }],
  returnType: 'number',
  examples: [{ formula: 'WEEKDAY(NOW())', result: 'Day of week' }],
  implementation: (date) => toDate(date).getDay() + 1,
});

functionRegistry.register({
  name: 'HOUR',
  category: 'date',
  description: 'Returns the hour from a datetime',
  parameters: [{ name: 'date', type: 'date', required: true, description: 'Date' }],
  returnType: 'number',
  examples: [{ formula: 'HOUR(NOW())', result: 'Current hour' }],
  implementation: (date) => toDate(date).getHours(),
});

functionRegistry.register({
  name: 'MINUTE',
  category: 'date',
  description: 'Returns the minute from a datetime',
  parameters: [{ name: 'date', type: 'date', required: true, description: 'Date' }],
  returnType: 'number',
  examples: [{ formula: 'MINUTE(NOW())', result: 'Current minute' }],
  implementation: (date) => toDate(date).getMinutes(),
});

functionRegistry.register({
  name: 'DATEADD',
  category: 'date',
  description: 'Adds a time interval to a date',
  parameters: [
    { name: 'date', type: 'date', required: true, description: 'Starting date' },
    { name: 'amount', type: 'number', required: true, description: 'Amount to add' },
    { name: 'unit', type: 'string', required: true, description: 'Unit: years, months, days, hours, minutes' },
  ],
  returnType: 'date',
  examples: [{ formula: 'DATEADD(TODAY(), 7, "days")', result: 'Date 7 days from now' }],
  implementation: (date, amount, unit) => {
    const d = new Date(toDate(date));
    const n = toNumber(amount);
    const u = toString(unit).toLowerCase();
    
    switch (u) {
      case 'years': case 'year': d.setFullYear(d.getFullYear() + n); break;
      case 'months': case 'month': d.setMonth(d.getMonth() + n); break;
      case 'days': case 'day': d.setDate(d.getDate() + n); break;
      case 'hours': case 'hour': d.setHours(d.getHours() + n); break;
      case 'minutes': case 'minute': d.setMinutes(d.getMinutes() + n); break;
      case 'seconds': case 'second': d.setSeconds(d.getSeconds() + n); break;
    }
    return d;
  },
});

functionRegistry.register({
  name: 'DATEDIFF',
  category: 'date',
  description: 'Returns the difference between two dates',
  parameters: [
    { name: 'startDate', type: 'date', required: true, description: 'Start date' },
    { name: 'endDate', type: 'date', required: true, description: 'End date' },
    { name: 'unit', type: 'string', required: false, description: 'Unit: years, months, days, hours, minutes', default: 'days' },
  ],
  returnType: 'number',
  examples: [{ formula: 'DATEDIFF(startDate, endDate, "days")', result: 'Days between dates' }],
  implementation: (start, end, unit = 'days') => {
    const d1 = toDate(start);
    const d2 = toDate(end);
    const diffMs = d2.getTime() - d1.getTime();
    const u = toString(unit).toLowerCase();
    
    switch (u) {
      case 'years': case 'year': return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
      case 'months': case 'month': return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
      case 'weeks': case 'week': return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
      case 'days': case 'day': return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      case 'hours': case 'hour': return Math.floor(diffMs / (1000 * 60 * 60));
      case 'minutes': case 'minute': return Math.floor(diffMs / (1000 * 60));
      default: return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }
  },
});

// ============================================================================
// LOGIC FUNCTIONS
// ============================================================================

functionRegistry.register({
  name: 'IF',
  category: 'logic',
  description: 'Returns one value if condition is true, another if false',
  parameters: [
    { name: 'condition', type: 'boolean', required: true, description: 'Condition to test' },
    { name: 'trueValue', type: 'any', required: true, description: 'Value if true' },
    { name: 'falseValue', type: 'any', required: false, description: 'Value if false', default: null },
  ],
  returnType: 'any',
  examples: [{ formula: 'IF(score > 90, "A", "B")', result: 'Grade based on score' }],
  implementation: (condition, trueVal, falseVal = null) => toBoolean(condition) ? trueVal : falseVal,
});

functionRegistry.register({
  name: 'IFS',
  category: 'logic',
  description: 'Tests multiple conditions, returns first match',
  parameters: [{ name: 'pairs', type: 'any', required: true, description: 'Condition/value pairs', variadic: true }],
  returnType: 'any',
  examples: [{ formula: 'IFS(score >= 90, "A", score >= 80, "B", true, "C")', result: 'Grade based on score' }],
  implementation: (...args) => {
    for (let i = 0; i < args.length - 1; i += 2) {
      if (toBoolean(args[i])) return args[i + 1];
    }
    return null;
  },
});

functionRegistry.register({
  name: 'SWITCH',
  category: 'logic',
  description: 'Compares expression against values, returns matching result',
  parameters: [
    { name: 'expression', type: 'any', required: true, description: 'Value to match' },
    { name: 'cases', type: 'any', required: true, description: 'Value/result pairs', variadic: true },
  ],
  returnType: 'any',
  examples: [{ formula: 'SWITCH(status, "A", "Active", "I", "Inactive", "Unknown")', result: 'Status text' }],
  implementation: (expr, ...cases) => {
    for (let i = 0; i < cases.length - 1; i += 2) {
      if (expr === cases[i]) return cases[i + 1];
    }
    // Last value is default if odd number of case args
    return cases.length % 2 === 1 ? cases[cases.length - 1] : null;
  },
});

functionRegistry.register({
  name: 'AND',
  category: 'logic',
  description: 'Returns true if all arguments are true',
  parameters: [{ name: 'values', type: 'boolean', required: true, description: 'Values to test', variadic: true }],
  returnType: 'boolean',
  examples: [{ formula: 'AND(a > 0, b > 0)', result: 'true if both positive' }],
  implementation: (...args) => args.every(toBoolean),
});

functionRegistry.register({
  name: 'OR',
  category: 'logic',
  description: 'Returns true if any argument is true',
  parameters: [{ name: 'values', type: 'boolean', required: true, description: 'Values to test', variadic: true }],
  returnType: 'boolean',
  examples: [{ formula: 'OR(a > 0, b > 0)', result: 'true if either positive' }],
  implementation: (...args) => args.some(toBoolean),
});

functionRegistry.register({
  name: 'NOT',
  category: 'logic',
  description: 'Returns the opposite boolean value',
  parameters: [{ name: 'value', type: 'boolean', required: true, description: 'Value to negate' }],
  returnType: 'boolean',
  examples: [{ formula: 'NOT(true)', result: 'false' }],
  implementation: (val) => !toBoolean(val),
});

functionRegistry.register({
  name: 'ISBLANK',
  category: 'logic',
  description: 'Returns true if value is empty/null/undefined',
  parameters: [{ name: 'value', type: 'any', required: true, description: 'Value to test' }],
  returnType: 'boolean',
  examples: [{ formula: 'ISBLANK(field)', result: 'true if empty' }],
  implementation: (val) => val === null || val === undefined || val === '',
});

functionRegistry.register({
  name: 'COALESCE',
  category: 'logic',
  description: 'Returns the first non-null value',
  parameters: [{ name: 'values', type: 'any', required: true, description: 'Values to check', variadic: true }],
  returnType: 'any',
  examples: [{ formula: 'COALESCE(field1, field2, "default")', result: 'First non-null value' }],
  implementation: (...args) => args.find(v => v !== null && v !== undefined) ?? null,
});

// ============================================================================
// AGGREGATE FUNCTIONS
// ============================================================================

functionRegistry.register({
  name: 'COUNT',
  category: 'aggregate',
  description: 'Counts non-null values',
  parameters: [{ name: 'values', type: 'any', required: true, description: 'Values to count', variadic: true }],
  returnType: 'number',
  examples: [{ formula: 'COUNT(field1, field2, field3)', result: 'Number of non-null fields' }],
  implementation: (...args) => args.filter(v => v !== null && v !== undefined).length,
});

functionRegistry.register({
  name: 'COUNTIF',
  category: 'aggregate',
  description: 'Counts values matching a condition',
  parameters: [
    { name: 'array', type: 'array', required: true, description: 'Array to search' },
    { name: 'condition', type: 'any', required: true, description: 'Value to match or function' },
  ],
  returnType: 'number',
  examples: [{ formula: 'COUNTIF(items, "completed")', result: 'Count of "completed" items' }],
  implementation: (arr, condition) => toArray(arr).filter(v => v === condition).length,
});

functionRegistry.register({
  name: 'SUMIF',
  category: 'aggregate',
  description: 'Sums values where condition is met',
  parameters: [
    { name: 'values', type: 'array', required: true, description: 'Values to sum' },
    { name: 'conditions', type: 'array', required: true, description: 'Parallel conditions' },
    { name: 'matchValue', type: 'any', required: true, description: 'Value to match in conditions' },
  ],
  returnType: 'number',
  examples: [{ formula: 'SUMIF(amounts, statuses, "approved")', result: 'Sum of approved amounts' }],
  implementation: (values, conditions, matchValue) => {
    const valArr = toArray(values);
    const condArr = toArray(conditions);
    return valArr.reduce((sum: number, val, i) => 
      condArr[i] === matchValue ? sum + toNumber(val) : sum, 0);
  },
});

// ============================================================================
// ARRAY FUNCTIONS
// ============================================================================

functionRegistry.register({
  name: 'FIRST',
  category: 'array',
  description: 'Returns the first element of an array',
  parameters: [{ name: 'array', type: 'array', required: true, description: 'Array' }],
  returnType: 'any',
  examples: [{ formula: 'FIRST(items)', result: 'First item' }],
  implementation: (arr) => toArray(arr)[0] ?? null,
});

functionRegistry.register({
  name: 'LAST',
  category: 'array',
  description: 'Returns the last element of an array',
  parameters: [{ name: 'array', type: 'array', required: true, description: 'Array' }],
  returnType: 'any',
  examples: [{ formula: 'LAST(items)', result: 'Last item' }],
  implementation: (arr) => {
    const a = toArray(arr);
    return a[a.length - 1] ?? null;
  },
});

functionRegistry.register({
  name: 'INDEX',
  category: 'array',
  description: 'Returns element at index',
  parameters: [
    { name: 'array', type: 'array', required: true, description: 'Array' },
    { name: 'index', type: 'number', required: true, description: 'Index (0-based)' },
  ],
  returnType: 'any',
  examples: [{ formula: 'INDEX(items, 2)', result: 'Third item' }],
  implementation: (arr, index) => toArray(arr)[toNumber(index)] ?? null,
});

functionRegistry.register({
  name: 'LENGTH',
  category: 'array',
  description: 'Returns the length of an array',
  parameters: [{ name: 'array', type: 'array', required: true, description: 'Array' }],
  returnType: 'number',
  examples: [{ formula: 'LENGTH(items)', result: 'Number of items' }],
  implementation: (arr) => toArray(arr).length,
});

functionRegistry.register({
  name: 'CONTAINS',
  category: 'array',
  description: 'Checks if array contains a value',
  parameters: [
    { name: 'array', type: 'array', required: true, description: 'Array to search' },
    { name: 'value', type: 'any', required: true, description: 'Value to find' },
  ],
  returnType: 'boolean',
  examples: [{ formula: 'CONTAINS(tags, "urgent")', result: 'true if found' }],
  implementation: (arr, value) => toArray(arr).includes(value),
});

functionRegistry.register({
  name: 'UNIQUE',
  category: 'array',
  description: 'Returns unique values from an array',
  parameters: [{ name: 'array', type: 'array', required: true, description: 'Array' }],
  returnType: 'array',
  examples: [{ formula: 'UNIQUE([1, 2, 2, 3])', result: '[1, 2, 3]' }],
  implementation: (arr) => [...new Set(toArray(arr))],
});

functionRegistry.register({
  name: 'SORT',
  category: 'array',
  description: 'Sorts an array',
  parameters: [
    { name: 'array', type: 'array', required: true, description: 'Array to sort' },
    { name: 'descending', type: 'boolean', required: false, description: 'Sort descending', default: false },
  ],
  returnType: 'array',
  examples: [{ formula: 'SORT([3, 1, 2])', result: '[1, 2, 3]' }],
  implementation: (arr, desc = false) => {
    const sorted = [...toArray(arr)].sort((a, b) => {
      if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
      return toNumber(a) - toNumber(b);
    });
    return toBoolean(desc) ? sorted.reverse() : sorted;
  },
});

functionRegistry.register({
  name: 'FILTER',
  category: 'array',
  description: 'Filters array to items matching a value',
  parameters: [
    { name: 'array', type: 'array', required: true, description: 'Array to filter' },
    { name: 'value', type: 'any', required: true, description: 'Value to match' },
  ],
  returnType: 'array',
  examples: [{ formula: 'FILTER(statuses, "active")', result: 'Only "active" items' }],
  implementation: (arr, value) => toArray(arr).filter(v => v === value),
});

// ============================================================================
// LOOKUP FUNCTIONS
// ============================================================================

functionRegistry.register({
  name: 'LOOKUP',
  category: 'lookup',
  description: 'Looks up a value in a dataset',
  parameters: [
    { name: 'dataset', type: 'string', required: true, description: 'Dataset name' },
    { name: 'searchField', type: 'string', required: true, description: 'Field to search' },
    { name: 'searchValue', type: 'any', required: true, description: 'Value to find' },
    { name: 'returnField', type: 'string', required: true, description: 'Field to return' },
  ],
  returnType: 'any',
  examples: [{ formula: 'LOOKUP("employees", "id", empId, "name")', result: 'Employee name' }],
  implementation: () => {
    // This needs context - implemented in evaluator
    throw new Error('LOOKUP requires evaluation context');
  },
});

functionRegistry.register({
  name: 'VLOOKUP',
  category: 'lookup',
  description: 'Vertical lookup in array of arrays',
  parameters: [
    { name: 'searchValue', type: 'any', required: true, description: 'Value to find' },
    { name: 'table', type: 'array', required: true, description: '2D array' },
    { name: 'colIndex', type: 'number', required: true, description: 'Column to return (1-based)' },
    { name: 'exactMatch', type: 'boolean', required: false, description: 'Exact match only', default: true },
  ],
  returnType: 'any',
  examples: [{ formula: 'VLOOKUP(id, data, 2, true)', result: 'Value from column 2' }],
  implementation: (searchValue, table, colIndex, exactMatch = true) => {
    const arr = toArray(table);
    const col = toNumber(colIndex) - 1;
    for (const row of arr) {
      const rowArr = toArray(row);
      if (toBoolean(exactMatch) ? rowArr[0] === searchValue : rowArr[0] == searchValue) {
        return rowArr[col] ?? null;
      }
    }
    return null;
  },
});

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

functionRegistry.register({
  name: 'NUMBER',
  category: 'conversion',
  description: 'Converts a value to a number',
  parameters: [{ name: 'value', type: 'any', required: true, description: 'Value to convert' }],
  returnType: 'number',
  examples: [{ formula: 'NUMBER("123")', result: '123' }],
  implementation: (val) => toNumber(val),
});

functionRegistry.register({
  name: 'STRING',
  category: 'conversion',
  description: 'Converts a value to a string',
  parameters: [{ name: 'value', type: 'any', required: true, description: 'Value to convert' }],
  returnType: 'string',
  examples: [{ formula: 'STRING(123)', result: '"123"' }],
  implementation: (val) => toString(val),
});

functionRegistry.register({
  name: 'BOOLEAN',
  category: 'conversion',
  description: 'Converts a value to a boolean',
  parameters: [{ name: 'value', type: 'any', required: true, description: 'Value to convert' }],
  returnType: 'boolean',
  examples: [{ formula: 'BOOLEAN(1)', result: 'true' }],
  implementation: (val) => toBoolean(val),
});

functionRegistry.register({
  name: 'JSON_PARSE',
  category: 'conversion',
  description: 'Parses a JSON string',
  parameters: [{ name: 'text', type: 'string', required: true, description: 'JSON string' }],
  returnType: 'any',
  examples: [{ formula: 'JSON_PARSE(\'{"a": 1}\')', result: '{ a: 1 }' }],
  implementation: (text) => {
    try {
      return JSON.parse(toString(text));
    } catch {
      return null;
    }
  },
});

functionRegistry.register({
  name: 'JSON_STRINGIFY',
  category: 'conversion',
  description: 'Converts a value to a JSON string',
  parameters: [{ name: 'value', type: 'any', required: true, description: 'Value to stringify' }],
  returnType: 'string',
  examples: [{ formula: 'JSON_STRINGIFY({ a: 1 })', result: '{"a":1}' }],
  implementation: (val) => JSON.stringify(val),
});

// ============================================================================
// Export function count for validation
// ============================================================================

export const FUNCTION_COUNT = functionRegistry.list().length;
