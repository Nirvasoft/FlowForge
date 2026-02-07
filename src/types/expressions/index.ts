/**
 * FlowForge Expression Engine Types
 * Complete type definitions for formula parsing, evaluation, and function registry
 */

// ============================================================================
// Core Expression Types
// ============================================================================

export type ExpressionValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | ExpressionValue[]
  | { [key: string]: ExpressionValue };

export type ExpressionType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'null'
  | 'any';

// ============================================================================
// AST Node Types
// ============================================================================

export type ASTNodeType =
  | 'Literal'
  | 'Identifier'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'CallExpression'
  | 'MemberExpression'
  | 'ConditionalExpression'
  | 'ArrayExpression'
  | 'ObjectExpression';

export interface BaseNode {
  type: ASTNodeType;
  start: number;
  end: number;
}

export interface LiteralNode extends BaseNode {
  type: 'Literal';
  value: string | number | boolean | null;
  raw: string;
}

export interface IdentifierNode extends BaseNode {
  type: 'Identifier';
  name: string;
}

export interface BinaryExpressionNode extends BaseNode {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpressionNode extends BaseNode {
  type: 'UnaryExpression';
  operator: UnaryOperator;
  argument: ASTNode;
  prefix: boolean;
}

export interface CallExpressionNode extends BaseNode {
  type: 'CallExpression';
  callee: IdentifierNode | MemberExpressionNode;
  arguments: ASTNode[];
}

export interface MemberExpressionNode extends BaseNode {
  type: 'MemberExpression';
  object: ASTNode;
  property: ASTNode;
  computed: boolean;
}

export interface ConditionalExpressionNode extends BaseNode {
  type: 'ConditionalExpression';
  test: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}

export interface ArrayExpressionNode extends BaseNode {
  type: 'ArrayExpression';
  elements: ASTNode[];
}

export interface ObjectExpressionNode extends BaseNode {
  type: 'ObjectExpression';
  properties: Array<{
    key: IdentifierNode | LiteralNode;
    value: ASTNode;
  }>;
}

export type ASTNode =
  | LiteralNode
  | IdentifierNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | CallExpressionNode
  | MemberExpressionNode
  | ConditionalExpressionNode
  | ArrayExpressionNode
  | ObjectExpressionNode;

// ============================================================================
// Operators
// ============================================================================

export type BinaryOperator =
  // Arithmetic
  | '+' | '-' | '*' | '/' | '%' | '**'
  // Comparison
  | '==' | '!=' | '===' | '!==' | '<' | '>' | '<=' | '>='
  // Logical
  | '&&' | '||'
  // String
  | '&';  // Concatenation

export type UnaryOperator = '-' | '!' | '+';

// ============================================================================
// Function Registry Types
// ============================================================================

export type FunctionCategory =
  | 'math'
  | 'text'
  | 'date'
  | 'logic'
  | 'lookup'
  | 'aggregate'
  | 'array'
  | 'conversion'
  | 'user'
  | 'system';

export interface FunctionParameter {
  name: string;
  type: ExpressionType | ExpressionType[];
  required: boolean;
  description: string;
  default?: ExpressionValue;
  variadic?: boolean;  // Can accept multiple values
}

export interface FunctionSignature {
  name: string;
  category: FunctionCategory;
  description: string;
  parameters: FunctionParameter[];
  returnType: ExpressionType;
  examples: Array<{
    formula: string;
    result: string;
    description?: string;
  }>;
  implementation: (...args: ExpressionValue[]) => ExpressionValue;
}

export interface FunctionRegistry {
  functions: Map<string, FunctionSignature>;
  register(fn: FunctionSignature): void;
  get(name: string): FunctionSignature | undefined;
  getByCategory(category: FunctionCategory): FunctionSignature[];
  list(): FunctionSignature[];
}

// ============================================================================
// Evaluation Context
// ============================================================================

export interface EvaluationContext {
  // Form field values
  fields: Record<string, ExpressionValue>;

  // Dataset records
  datasets: Record<string, Record<string, ExpressionValue>[]>;

  // Current user info
  user: {
    id: string;
    email: string;
    name: string;
    groups: string[];
    roles: string[];
    metadata: Record<string, ExpressionValue>;
  };

  // System variables
  system: {
    now: Date;
    today: Date;
    currentFormId?: string;
    currentRecordId?: string;
    timezone: string;
    locale: string;
  };

  // Custom variables
  variables: Record<string, ExpressionValue>;
}

// ============================================================================
// Parser & Evaluator Types
// ============================================================================

export interface ParseResult {
  success: boolean;
  ast?: ASTNode;
  error?: ParseError;
}

export interface ParseError {
  message: string;
  position: number;
  line: number;
  column: number;
  snippet: string;
}

export interface EvaluationResult {
  success: boolean;
  value?: ExpressionValue;
  type?: ExpressionType;
  error?: EvaluationError;
}

export interface EvaluationError {
  message: string;
  node?: ASTNode;
  functionName?: string;
  argumentIndex?: number;
}

// ============================================================================
// Expression Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  returnType?: ExpressionType;
  referencedFields: string[];
  referencedFunctions: string[];
}

export interface ValidationError {
  message: string;
  position?: { start: number; end: number };
  type: 'syntax' | 'reference' | 'type' | 'function';
}

export interface ValidationWarning {
  message: string;
  position?: { start: number; end: number };
  type: 'deprecation' | 'performance' | 'suggestion';
}

// ============================================================================
// Expression Builder (for UI)
// ============================================================================

export interface ExpressionSuggestion {
  type: 'function' | 'field' | 'operator' | 'variable';
  label: string;
  value: string;
  description?: string;
  category?: string;
  insertText: string;
  cursorOffset?: number;
}

export interface ExpressionToken {
  type: 'function' | 'field' | 'operator' | 'literal' | 'punctuation' | 'error';
  value: string;
  start: number;
  end: number;
}

// ============================================================================
// Calculated Field Integration
// ============================================================================

export interface CalculatedFieldConfig {
  id: string;
  name: string;
  formula: string;
  resultType: ExpressionType;
  precision?: number;  // For numbers
  format?: string;     // For dates/numbers
  fallbackValue?: ExpressionValue;
  recalculateOn: 'change' | 'blur' | 'submit' | 'manual';
  dependencies: string[];  // Field IDs this calculation depends on
}

export interface CalculationDependencyGraph {
  nodes: Map<string, CalculatedFieldConfig>;
  edges: Map<string, Set<string>>;  // fieldId -> Set of fields that depend on it
  order: string[];  // Topologically sorted calculation order
}
