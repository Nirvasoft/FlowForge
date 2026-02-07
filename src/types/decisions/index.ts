/**
 * FlowForge Decision Tables Types
 * DMN-inspired decision table definitions
 */

// ============================================================================
// Decision Table Types
// ============================================================================

export interface DecisionTable {
  id: string;
  name: string;
  slug: string;
  description?: string;
  
  // Structure
  inputs: DecisionInput[];
  outputs: DecisionOutput[];
  rules: DecisionRule[];
  
  // Hit Policy
  hitPolicy: HitPolicy;
  
  // Settings
  settings: DecisionTableSettings;
  
  // Versioning
  version: number;
  status: 'draft' | 'published' | 'archived';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  publishedAt?: Date;
  publishedBy?: string;
  
  // Usage tracking
  lastEvaluatedAt?: Date;
  evaluationCount: number;
}

export interface DecisionTableSettings {
  // Validation
  validateInputs: boolean;
  strictMode: boolean;
  
  // Defaults
  defaultOutputs?: Record<string, unknown>;
  
  // Performance
  cacheEnabled: boolean;
  cacheDuration?: number;
  
  // Audit
  logEvaluations: boolean;
}

// ============================================================================
// Hit Policies (DMN Standard)
// ============================================================================

export type HitPolicy =
  | 'UNIQUE'      // Only one rule can match (error if multiple)
  | 'FIRST'       // Return first matching rule
  | 'PRIORITY'    // Return highest priority rule
  | 'ANY'         // All matching rules must have same output
  | 'COLLECT'     // Return all matching outputs
  | 'RULE_ORDER'  // Return all in rule order
  | 'OUTPUT_ORDER'; // Return all sorted by output priority

export type CollectOperator = 'LIST' | 'SUM' | 'MIN' | 'MAX' | 'COUNT';

// ============================================================================
// Input/Output Definitions
// ============================================================================

export interface DecisionInput {
  id: string;
  name: string;
  label: string;
  type: DataType;
  
  // Expression to extract value from context
  expression?: string;
  
  // Validation
  required: boolean;
  allowedValues?: unknown[];
  
  // Display
  width?: number;
  description?: string;
}

export interface DecisionOutput {
  id: string;
  name: string;
  label: string;
  type: DataType;
  
  // For PRIORITY hit policy
  priority?: number;
  
  // Default value
  defaultValue?: unknown;
  
  // Validation
  allowedValues?: unknown[];
  
  // Display
  width?: number;
  description?: string;
}

export type DataType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'list'
  | 'any';

// ============================================================================
// Rule Definitions
// ============================================================================

export interface DecisionRule {
  id: string;
  
  // Input conditions (keyed by input id)
  inputEntries: Record<string, InputEntry>;
  
  // Output values (keyed by output id)
  outputEntries: Record<string, OutputEntry>;
  
  // Rule metadata
  priority?: number;
  annotation?: string;
  enabled: boolean;
}

export interface InputEntry {
  // Condition expression or value
  condition: ConditionExpression;
}

export interface OutputEntry {
  // Output value or expression
  value: unknown;
  expression?: string;
}

// ============================================================================
// Condition Expressions
// ============================================================================

export type ConditionExpression =
  | { type: 'any' }                                    // Matches any value (-)
  | { type: 'equals'; value: unknown }                 // Exact match
  | { type: 'notEquals'; value: unknown }              // Not equal
  | { type: 'lessThan'; value: number }                // <
  | { type: 'lessThanOrEqual'; value: number }         // <=
  | { type: 'greaterThan'; value: number }             // >
  | { type: 'greaterThanOrEqual'; value: number }      // >=
  | { type: 'between'; min: number; max: number }      // [min..max]
  | { type: 'in'; values: unknown[] }                  // In list
  | { type: 'notIn'; values: unknown[] }               // Not in list
  | { type: 'contains'; value: string }                // String contains
  | { type: 'startsWith'; value: string }              // String starts with
  | { type: 'endsWith'; value: string }                // String ends with
  | { type: 'matches'; pattern: string }               // Regex match
  | { type: 'isNull' }                                 // Is null/undefined
  | { type: 'isNotNull' }                              // Is not null/undefined
  | { type: 'expression'; expr: string };              // Custom expression

// ============================================================================
// Evaluation Types
// ============================================================================

export interface EvaluationContext {
  // Input values (keyed by input name)
  inputs: Record<string, unknown>;
  
  // Optional metadata
  metadata?: Record<string, unknown>;
}

export interface EvaluationResult {
  // Whether evaluation was successful
  success: boolean;
  
  // Matched rules
  matchedRules: MatchedRule[];
  
  // Final outputs (depends on hit policy)
  outputs: Record<string, unknown> | Record<string, unknown>[];
  
  // Evaluation metadata
  evaluatedAt: Date;
  durationMs: number;
  
  // Errors/warnings
  errors?: EvaluationError[];
  warnings?: string[];
}

export interface MatchedRule {
  ruleId: string;
  ruleIndex: number;
  outputs: Record<string, unknown>;
  priority?: number;
}

export interface EvaluationError {
  type: 'input_missing' | 'input_invalid' | 'no_match' | 'multiple_matches' | 'expression_error';
  message: string;
  field?: string;
  details?: unknown;
}

// ============================================================================
// Testing Types
// ============================================================================

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  
  // Test input
  inputs: Record<string, unknown>;
  
  // Expected output
  expectedOutputs: Record<string, unknown> | Record<string, unknown>[];
  
  // Expected matched rules (optional)
  expectedRules?: string[];
  
  // Test result
  lastResult?: TestResult;
}

export interface TestResult {
  passed: boolean;
  executedAt: Date;
  actualOutputs: Record<string, unknown> | Record<string, unknown>[];
  matchedRules: string[];
  error?: string;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface EvaluationLog {
  id: string;
  decisionTableId: string;
  decisionTableVersion: number;
  
  // Request
  inputs: Record<string, unknown>;
  
  // Result
  outputs: Record<string, unknown> | Record<string, unknown>[];
  matchedRuleIds: string[];
  success: boolean;
  error?: string;
  
  // Performance
  durationMs: number;
  
  // Context
  evaluatedAt: Date;
  evaluatedBy?: string;
  source?: string;
}

// ============================================================================
// Import/Export Types
// ============================================================================

export interface DecisionTableExport {
  version: string;
  exportedAt: Date;
  table: DecisionTable;
}

export interface DMNImport {
  definitions: {
    decision: {
      name: string;
      decisionTable: {
        hitPolicy: string;
        input: Array<{ label: string; inputExpression: { text: string; typeRef: string } }>;
        output: Array<{ label: string; name: string; typeRef: string }>;
        rule: Array<{
          inputEntry: Array<{ text: string }>;
          outputEntry: Array<{ text: string }>;
        }>;
      };
    };
  };
}
