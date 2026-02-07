/**
 * FlowForge Workflow Engine Types
 * Complete type definitions for workflow design, execution, and tasks
 */

// ============================================================================
// Workflow Definition Types
// ============================================================================

export interface Workflow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  version: number;
  status: WorkflowStatus;
  
  // Visual designer data
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  
  // Triggers
  triggers: WorkflowTrigger[];
  
  // Variables and context
  variables: WorkflowVariable[];
  inputSchema?: JSONSchema;
  outputSchema?: JSONSchema;
  
  // Settings
  settings: WorkflowSettings;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  publishedAt?: Date;
  publishedBy?: string;
}

export type WorkflowStatus = 'draft' | 'published' | 'archived' | 'disabled';

export interface WorkflowSettings {
  timeout: number; // Max execution time in seconds
  retryPolicy: RetryPolicy;
  errorHandling: 'stop' | 'continue' | 'rollback';
  logging: 'minimal' | 'standard' | 'verbose';
  concurrency: number; // Max parallel executions
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential' | 'linear';
  initialDelay: number; // milliseconds
  maxDelay: number;
  retryableErrors?: string[];
}

// ============================================================================
// Node Types (Visual Designer)
// ============================================================================

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  
  // Position in visual designer
  position: { x: number; y: number };
  
  // Node-specific configuration
  config: NodeConfig;
  
  // Conditional execution
  condition?: string; // Expression that evaluates to boolean
  
  // Error handling
  onError?: 'stop' | 'continue' | 'goto';
  errorTargetNodeId?: string;
  
  // Metadata
  disabled?: boolean;
  notes?: string;
}

export type NodeType =
  // Control flow
  | 'start'
  | 'end'
  | 'decision'      // If/else branching
  | 'switch'        // Multi-way branching
  | 'parallel'      // Fork into parallel branches
  | 'join'          // Wait for parallel branches
  | 'loop'          // Iterate over array
  | 'delay'         // Wait for duration
  | 'schedule'      // Wait until specific time
  
  // Actions
  | 'action'        // Generic action
  | 'script'        // Custom JavaScript/TypeScript
  | 'http'          // HTTP request
  | 'email'         // Send email
  | 'notification'  // Push notification
  | 'database'      // Database operation
  | 'transform'     // Data transformation
  | 'validate'      // Data validation
  
  // Human tasks
  | 'approval'      // Approval request
  | 'form'          // Form submission
  | 'assignment'    // Task assignment
  | 'review'        // Review task
  
  // Integrations
  | 'webhook'       // Outgoing webhook
  | 'subworkflow'   // Call another workflow
  | 'event'         // Emit/listen for events
  
  // Data
  | 'setVariable'   // Set workflow variable
  | 'getData'       // Get data from dataset
  | 'saveData'      // Save data to dataset
  | 'expression';   // Evaluate expression

export type NodeConfig =
  | StartNodeConfig
  | EndNodeConfig
  | DecisionNodeConfig
  | SwitchNodeConfig
  | ParallelNodeConfig
  | JoinNodeConfig
  | LoopNodeConfig
  | DelayNodeConfig
  | ScheduleNodeConfig
  | ActionNodeConfig
  | ScriptNodeConfig
  | HttpNodeConfig
  | EmailNodeConfig
  | ApprovalNodeConfig
  | FormNodeConfig
  | SubworkflowNodeConfig
  | SetVariableNodeConfig
  | TransformNodeConfig
  | ExpressionNodeConfig;

// ============================================================================
// Node Configuration Types
// ============================================================================

export interface StartNodeConfig {
  type: 'start';
}

export interface EndNodeConfig {
  type: 'end';
  outputMapping?: Record<string, string>;
}

export interface DecisionNodeConfig {
  type: 'decision';
  condition: string; // Expression
  trueLabel?: string;
  falseLabel?: string;
}

export interface SwitchNodeConfig {
  type: 'switch';
  expression: string;
  cases: Array<{
    value: unknown;
    label?: string;
  }>;
  defaultLabel?: string;
}

export interface ParallelNodeConfig {
  type: 'parallel';
  branches: string[]; // Node IDs to execute in parallel
}

export interface JoinNodeConfig {
  type: 'join';
  waitFor: 'all' | 'any' | 'first';
  timeout?: number;
}

export interface LoopNodeConfig {
  type: 'loop';
  collection: string; // Expression returning array
  itemVariable: string;
  indexVariable?: string;
  maxIterations?: number;
  parallel?: boolean;
  batchSize?: number;
}

export interface DelayNodeConfig {
  type: 'delay';
  duration: number; // milliseconds
  durationExpression?: string;
}

export interface ScheduleNodeConfig {
  type: 'schedule';
  datetime?: string; // ISO datetime
  datetimeExpression?: string;
  timezone?: string;
}

export interface ActionNodeConfig {
  type: 'action';
  actionType: string;
  parameters: Record<string, unknown>;
}

export interface ScriptNodeConfig {
  type: 'script';
  language: 'javascript' | 'typescript';
  code: string;
  timeout?: number;
  sandbox?: boolean;
}

export interface HttpNodeConfig {
  type: 'http';
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  bodyType?: 'json' | 'form' | 'text' | 'xml';
  timeout?: number;
  retries?: number;
  validateStatus?: string; // Expression
  responseMapping?: Record<string, string>;
}

export interface EmailNodeConfig {
  type: 'email';
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  bodyType: 'text' | 'html' | 'template';
  templateId?: string;
  templateData?: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

export interface ApprovalNodeConfig {
  type: 'approval';
  approvers: ApproverConfig;
  title: string;
  description?: string;
  dueDate?: string;
  dueDateExpression?: string;
  escalation?: EscalationConfig;
  requiredApprovals?: number;
  allowDelegation?: boolean;
  allowComments?: boolean;
  formFields?: Array<{
    name: string;
    label: string;
    type: string;
    required?: boolean;
  }>;
}

export interface ApproverConfig {
  type: 'users' | 'roles' | 'groups' | 'expression' | 'manager';
  userIds?: string[];
  roleIds?: string[];
  groupIds?: string[];
  expression?: string;
  managerOf?: string; // User ID expression
}

export interface EscalationConfig {
  enabled: boolean;
  afterDuration: number; // milliseconds
  escalateTo: ApproverConfig;
  maxEscalations?: number;
  notifyOnEscalation?: boolean;
}

export interface FormNodeConfig {
  type: 'form';
  formId: string;
  assignees: ApproverConfig;
  title: string;
  description?: string;
  dueDate?: string;
  prefillData?: Record<string, string>; // Field -> expression mapping
}

export interface SubworkflowNodeConfig {
  type: 'subworkflow';
  workflowId: string;
  version?: number; // Specific version or latest
  inputMapping: Record<string, string>; // Subworkflow input -> expression
  outputMapping?: Record<string, string>; // Variable -> subworkflow output
  waitForCompletion: boolean;
  timeout?: number;
}

export interface SetVariableNodeConfig {
  type: 'setVariable';
  assignments: Array<{
    variable: string;
    value: string; // Expression
  }>;
}

export interface TransformNodeConfig {
  type: 'transform';
  transformations: Array<{
    source: string;
    target: string;
    transform: 'copy' | 'map' | 'filter' | 'reduce' | 'custom';
    expression?: string;
  }>;
}

export interface ExpressionNodeConfig {
  type: 'expression';
  expression: string;
  outputVariable?: string;
}

// ============================================================================
// Edge Types
// ============================================================================

export interface WorkflowEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  sourceHandle?: string; // For nodes with multiple outputs
  targetHandle?: string; // For nodes with multiple inputs
  label?: string;
  condition?: string; // Expression for conditional edges
  priority?: number; // For decision nodes
}

// ============================================================================
// Trigger Types
// ============================================================================

export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  name: string;
  enabled: boolean;
  config: TriggerConfig;
}

export type TriggerType =
  | 'manual'
  | 'schedule'
  | 'webhook'
  | 'event'
  | 'form'
  | 'dataset'
  | 'email';

export type TriggerConfig =
  | ManualTriggerConfig
  | ScheduleTriggerConfig
  | WebhookTriggerConfig
  | EventTriggerConfig
  | FormTriggerConfig
  | DatasetTriggerConfig;

export interface ManualTriggerConfig {
  type: 'manual';
  allowedRoles?: string[];
  requireInput?: boolean;
}

export interface ScheduleTriggerConfig {
  type: 'schedule';
  cron: string;
  timezone?: string;
  startDate?: string;
  endDate?: string;
  maxRuns?: number;
}

export interface WebhookTriggerConfig {
  type: 'webhook';
  path: string;
  method: 'GET' | 'POST' | 'PUT';
  authentication?: 'none' | 'apiKey' | 'basic' | 'bearer';
  secretKey?: string;
  validatePayload?: boolean;
  payloadSchema?: JSONSchema;
}

export interface EventTriggerConfig {
  type: 'event';
  eventType: string;
  filter?: string; // Expression to filter events
}

export interface FormTriggerConfig {
  type: 'form';
  formId: string;
  onEvent: 'submit' | 'update';
}

export interface DatasetTriggerConfig {
  type: 'dataset';
  datasetId: string;
  onEvent: 'create' | 'update' | 'delete';
  filter?: string;
}

// ============================================================================
// Variable Types
// ============================================================================

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'any';
  defaultValue?: unknown;
  description?: string;
  required?: boolean;
  scope: 'input' | 'local' | 'output';
}

// ============================================================================
// Execution Types
// ============================================================================

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  
  // Status
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  
  // Context
  triggeredBy: string; // User ID or 'system'
  triggerType: TriggerType;
  triggerData?: Record<string, unknown>;
  
  // Input/Output
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  
  // State
  variables: Record<string, unknown>;
  currentNodes: string[]; // Active node IDs
  completedNodes: string[];
  
  // Logging
  logs: ExecutionLog[];
  
  // Error info
  error?: ExecutionError;
  
  // Metrics
  metrics: ExecutionMetrics;
  
  // Parent execution (for subworkflows)
  parentExecutionId?: string;
  parentNodeId?: string;
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'waiting'     // Waiting for human task
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface ExecutionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  nodeId?: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ExecutionError {
  nodeId: string;
  code: string;
  message: string;
  stack?: string;
  retryCount: number;
  recoverable: boolean;
}

export interface ExecutionMetrics {
  totalDuration?: number;
  nodeExecutions: number;
  retriedNodes: number;
  pendingTasks: number;
  completedTasks: number;
}

// ============================================================================
// Node Execution State
// ============================================================================

export interface NodeExecutionState {
  nodeId: string;
  executionId: string;
  status: NodeExecutionStatus;
  startedAt?: Date;
  completedAt?: Date;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  duration?: number;
}

export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting';

// ============================================================================
// Human Task Types
// ============================================================================

export interface HumanTask {
  id: string;
  executionId: string;
  nodeId: string;
  workflowId: string;
  
  // Task type
  type: 'approval' | 'form' | 'assignment' | 'review';
  
  // Status
  status: TaskStatus;
  
  // Assignment
  assignees: string[]; // User IDs
  assignedRoles?: string[];
  assignedGroups?: string[];
  claimedBy?: string;
  
  // Content
  title: string;
  description?: string;
  formData?: Record<string, unknown>;
  
  // Timing
  createdAt: Date;
  dueDate?: Date;
  claimedAt?: Date;
  completedAt?: Date;
  
  // Result
  outcome?: string; // 'approved', 'rejected', etc.
  comments?: string;
  responseData?: Record<string, unknown>;
  
  // Escalation
  escalationLevel: number;
  escalatedAt?: Date;
  
  // History
  history: TaskHistoryEntry[];
}

export type TaskStatus =
  | 'pending'
  | 'claimed'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'escalated';

export interface TaskHistoryEntry {
  timestamp: Date;
  action: 'created' | 'assigned' | 'claimed' | 'released' | 'completed' | 'escalated' | 'delegated' | 'commented';
  userId?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// JSON Schema (simplified)
// ============================================================================

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  default?: unknown;
  description?: string;
}

// ============================================================================
// Workflow Events
// ============================================================================

export type WorkflowEventType =
  | 'workflow.created'
  | 'workflow.updated'
  | 'workflow.published'
  | 'workflow.archived'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.paused'
  | 'execution.resumed'
  | 'node.started'
  | 'node.completed'
  | 'node.failed'
  | 'task.created'
  | 'task.claimed'
  | 'task.completed'
  | 'task.escalated';

export interface WorkflowEvent {
  type: WorkflowEventType;
  timestamp: Date;
  workflowId: string;
  executionId?: string;
  nodeId?: string;
  taskId?: string;
  userId?: string;
  data?: Record<string, unknown>;
}
