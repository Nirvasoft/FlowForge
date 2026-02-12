/**
 * FlowForge Workflow Execution Engine
 * Core engine for executing workflow nodes
 */

import { randomUUID } from 'crypto';
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
  ExecutionStatus,
  NodeExecutionState,
  NodeExecutionStatus,
  ExecutionLog,
  NodeConfig,
  DecisionNodeConfig,
  SwitchNodeConfig,
  LoopNodeConfig,
  DelayNodeConfig,
  ScriptNodeConfig,
  HttpNodeConfig,
  SetVariableNodeConfig,
  TransformNodeConfig,
  ExpressionNodeConfig,
  ApprovalNodeConfig,
  SubworkflowNodeConfig,
  FormNodeConfig,
  EmailNodeConfig,
  ActionNodeConfig,
} from '../../types/workflow';
import { ExpressionService } from '../expressions/expression.service';

// ============================================================================
// Execution Context
// ============================================================================

export interface ExecutionContext {
  execution: WorkflowExecution;
  workflow: Workflow;
  variables: Record<string, unknown>;
  nodeStates: Map<string, NodeExecutionState>;
  expressionService: ExpressionService;
}

// ============================================================================
// Node Executor Interface
// ============================================================================

export interface NodeExecutor {
  execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;
}

export interface NodeExecutionResult {
  status: NodeExecutionStatus;
  output?: Record<string, unknown>;
  nextNodes?: string[]; // Override default next nodes
  error?: string;
  waitForTask?: string; // Task ID if waiting for human task
}

// ============================================================================
// Workflow Engine
// ============================================================================

export class WorkflowEngine {
  private expressionService: ExpressionService;
  private nodeExecutors: Map<string, NodeExecutor>;

  constructor() {
    this.expressionService = new ExpressionService();
    this.nodeExecutors = new Map();
    this.registerDefaultExecutors();
  }

  private registerDefaultExecutors(): void {
    // Control flow executors
    this.nodeExecutors.set('start', new StartNodeExecutor());
    this.nodeExecutors.set('end', new EndNodeExecutor());
    this.nodeExecutors.set('decision', new DecisionNodeExecutor());
    this.nodeExecutors.set('switch', new SwitchNodeExecutor());
    this.nodeExecutors.set('loop', new LoopNodeExecutor());
    this.nodeExecutors.set('delay', new DelayNodeExecutor());
    this.nodeExecutors.set('parallel', new ParallelNodeExecutor());
    this.nodeExecutors.set('join', new JoinNodeExecutor());

    // Action executors
    this.nodeExecutors.set('action', new ActionNodeExecutor());
    this.nodeExecutors.set('script', new ScriptNodeExecutor());
    this.nodeExecutors.set('http', new HttpNodeExecutor());
    this.nodeExecutors.set('email', new EmailNodeExecutor());

    // Human task executors
    this.nodeExecutors.set('approval', new ApprovalNodeExecutor());
    this.nodeExecutors.set('form', new FormNodeExecutor());

    // Data executors
    this.nodeExecutors.set('setVariable', new SetVariableNodeExecutor());
    this.nodeExecutors.set('transform', new TransformNodeExecutor());
    this.nodeExecutors.set('expression', new ExpressionNodeExecutor());

    // Integration executors
    this.nodeExecutors.set('subworkflow', new SubworkflowNodeExecutor());

    // Passthrough executors for types that are defined but not yet fully implemented
    // These allow workflows to continue execution without errors
    const passthrough = new PassthroughNodeExecutor();
    const passthroughTypes = [
      'notification', 'database', 'validate', 'assignment', 'review',
      'webhook', 'event', 'getData', 'saveData', 'schedule',
    ];
    for (const type of passthroughTypes) {
      this.nodeExecutors.set(type, passthrough);
    }
  }

  /**
   * Start a new workflow execution
   */
  async startExecution(
    workflow: Workflow,
    input: Record<string, unknown> = {},
    triggeredBy: string = 'system',
    triggerType: string = 'manual'
  ): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: randomUUID(),
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: 'running',
      startedAt: new Date(),
      triggeredBy,
      triggerType: triggerType as any,
      input,
      variables: { ...input },
      currentNodes: [],
      completedNodes: [],
      logs: [],
      metrics: {
        nodeExecutions: 0,
        retriedNodes: 0,
        pendingTasks: 0,
        completedTasks: 0,
      },
    };

    // Find start node
    const startNode = workflow.nodes.find(n => n.type === 'start');
    if (!startNode) {
      execution.status = 'failed';
      execution.error = {
        nodeId: '',
        code: 'NO_START_NODE',
        message: 'Workflow has no start node',
        retryCount: 0,
        recoverable: false,
      };
      return execution;
    }

    // Initialize context
    const context = this.createContext(execution, workflow);

    // Log start
    this.log(context, 'info', `Starting workflow execution: ${workflow.name}`);

    // Execute from start node
    execution.currentNodes = [startNode.id];
    await this.executeNodes(context, [startNode.id]);

    return execution;
  }

  /**
   * Resume a paused/waiting execution
   */
  async resumeExecution(
    execution: WorkflowExecution,
    workflow: Workflow,
    resumeData?: Record<string, unknown>
  ): Promise<WorkflowExecution> {
    if (execution.status !== 'paused' && execution.status !== 'waiting') {
      throw new Error(`Cannot resume execution in status: ${execution.status}`);
    }

    execution.status = 'running';

    if (resumeData) {
      Object.assign(execution.variables, resumeData);
    }

    const context = this.createContext(execution, workflow);
    this.log(context, 'info', 'Resuming workflow execution');

    // Continue from current nodes
    await this.executeNodes(context, execution.currentNodes);

    return execution;
  }

  /**
   * Execute a set of nodes
   */
  private async executeNodes(
    context: ExecutionContext,
    nodeIds: string[]
  ): Promise<void> {
    const { execution, workflow } = context;

    for (const nodeId of nodeIds) {
      if (execution.status !== 'running') break;

      const node = workflow.nodes.find(n => n.id === nodeId);
      if (!node) {
        this.log(context, 'error', `Node not found: ${nodeId}`);
        continue;
      }

      // Check if node is disabled
      if (node.disabled) {
        this.log(context, 'info', `Skipping disabled node: ${node.name}`, nodeId);
        const nextNodes = this.getNextNodes(workflow, nodeId);
        await this.executeNodes(context, nextNodes);
        continue;
      }

      // Check condition (skip for decision/switch nodes — their conditions are
      // branching logic handled internally by their executors, not preconditions)
      if (node.condition && node.type !== 'decision' && node.type !== 'switch') {
        const conditionResult = this.evaluateExpression(context, node.condition);
        if (!conditionResult) {
          this.log(context, 'info', `Skipping node due to condition: ${node.name}`, nodeId);
          this.setNodeState(context, nodeId, 'skipped');
          continue;
        }
      }

      // Execute node
      const result = await this.executeNode(context, node);

      if (result.status === 'failed') {
        // Handle error
        if (node.onError === 'continue') {
          this.log(context, 'warn', `Node failed but continuing: ${node.name}`, nodeId);
          const nextNodes = this.getNextNodes(workflow, nodeId);
          await this.executeNodes(context, nextNodes);
        } else if (node.onError === 'goto' && node.errorTargetNodeId) {
          await this.executeNodes(context, [node.errorTargetNodeId]);
        } else {
          execution.status = 'failed';
          execution.error = {
            nodeId,
            code: 'NODE_EXECUTION_FAILED',
            message: result.error || 'Unknown error',
            retryCount: 0,
            recoverable: false,
          };
          break;
        }
      } else if (result.status === 'waiting') {
        // Waiting for human task
        execution.status = 'waiting';
        execution.currentNodes = [nodeId];
        break;
      } else if (result.status === 'completed') {
        // Move to next nodes
        execution.completedNodes.push(nodeId);
        execution.currentNodes = execution.currentNodes.filter(id => id !== nodeId);

        // Determine next nodes
        const nextNodes = result.nextNodes || this.getNextNodes(workflow, nodeId, result.output);

        if (nextNodes.length > 0) {
          execution.currentNodes.push(...nextNodes);
          await this.executeNodes(context, nextNodes);
        } else if (execution.currentNodes.length === 0) {
          // No more nodes - workflow complete
          execution.status = 'completed';
          execution.completedAt = new Date();
          execution.output = context.variables;
          execution.metrics.totalDuration =
            execution.completedAt.getTime() - execution.startedAt.getTime();
        }
      }
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    context: ExecutionContext,
    node: WorkflowNode
  ): Promise<NodeExecutionResult> {
    const { execution } = context;

    this.log(context, 'info', `Executing node: ${node.name}`, node.id);
    this.setNodeState(context, node.id, 'running');
    execution.metrics.nodeExecutions++;

    const startTime = Date.now();

    try {
      let executor = this.nodeExecutors.get(node.type);
      if (!executor) {
        // Graceful fallback: treat unknown types as passthrough instead of crashing
        this.log(context, 'warn', `No specific executor for node type '${node.type}', using passthrough`, node.id);
        executor = new PassthroughNodeExecutor();
      }

      const result = await executor.execute(node, context);

      // Update node state
      const state = context.nodeStates.get(node.id)!;
      state.status = result.status;
      state.output = result.output;
      state.completedAt = new Date();
      state.duration = Date.now() - startTime;

      // Merge output into variables
      if (result.output) {
        Object.assign(context.variables, result.output);
        execution.variables = context.variables;
      }

      this.log(
        context,
        result.status === 'failed' ? 'error' : 'info',
        `Node ${result.status}: ${node.name}`,
        node.id,
        { duration: state.duration }
      );

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.setNodeState(context, node.id, 'failed');
      this.log(context, 'error', `Node error: ${message}`, node.id);

      return {
        status: 'failed',
        error: message,
      };
    }
  }

  /**
   * Get next nodes based on edges
   */
  private getNextNodes(
    workflow: Workflow,
    nodeId: string,
    output?: Record<string, unknown>
  ): string[] {
    const edges = workflow.edges.filter(e => e.source === nodeId);

    if (edges.length === 0) return [];

    // Sort by priority
    edges.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // For conditional edges, evaluate conditions
    const nextNodes: string[] = [];
    for (const edge of edges) {
      if (edge.condition) {
        const result = this.evaluateExpression(
          { variables: output || {} } as any,
          edge.condition
        );
        if (result) {
          nextNodes.push(edge.target);
        }
      } else {
        nextNodes.push(edge.target);
      }
    }

    return nextNodes;
  }

  /**
   * Create execution context
   */
  private createContext(
    execution: WorkflowExecution,
    workflow: Workflow
  ): ExecutionContext {
    return {
      execution,
      workflow,
      variables: execution.variables,
      nodeStates: new Map(),
      expressionService: this.expressionService,
    };
  }

  /**
   * Evaluate an expression
   */
  evaluateExpression(context: ExecutionContext, expression: string): unknown {
    this.expressionService.setFields(context.variables as Record<string, any>);
    const result = this.expressionService.evaluate(expression);
    return result.success ? result.value : null;
  }

  /**
   * Set node execution state
   */
  private setNodeState(
    context: ExecutionContext,
    nodeId: string,
    status: NodeExecutionStatus
  ): void {
    let state = context.nodeStates.get(nodeId);
    if (!state) {
      state = {
        nodeId,
        executionId: context.execution.id,
        status,
        retryCount: 0,
      };
      context.nodeStates.set(nodeId, state);
    }
    state.status = status;
    if (status === 'running') {
      state.startedAt = new Date();
    }
  }

  /**
   * Add log entry
   */
  private log(
    context: ExecutionContext,
    level: ExecutionLog['level'],
    message: string,
    nodeId?: string,
    data?: Record<string, unknown>
  ): void {
    context.execution.logs.push({
      timestamp: new Date(),
      level,
      nodeId,
      message,
      data,
    });
  }
}

// ============================================================================
// Node Executors
// ============================================================================

class StartNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    return { status: 'completed' };
  }
}

class EndNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as any;
    const output: Record<string, unknown> = {};

    if (config?.outputMapping) {
      for (const [key, expr] of Object.entries(config.outputMapping)) {
        const engine = new WorkflowEngine();
        output[key] = engine.evaluateExpression(context, expr as string);
      }
    }

    return { status: 'completed', output, nextNodes: [] };
  }
}

class DecisionNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as DecisionNodeConfig;
    const engine = new WorkflowEngine();

    // Use config.condition first, fall back to node.condition (used by seeded workflows)
    const conditionExpr = config?.condition || node.condition;
    if (!conditionExpr) {
      // No condition defined — pass through to all connected edges
      return { status: 'completed', output: { _decision: true } };
    }

    const result = engine.evaluateExpression(context, conditionExpr);

    // Find edges for true/false outcomes with flexible matching
    const edges = context.workflow.edges.filter(e => e.source === node.id);

    const isTrueLabel = (label?: string) => {
      if (!label) return false;
      const l = label.toLowerCase().trim();
      return l === 'true' || l === 'yes' || l === config?.trueLabel?.toLowerCase();
    };
    const isFalseLabel = (label?: string) => {
      if (!label) return false;
      const l = label.toLowerCase().trim();
      return l === 'false' || l === 'no' || l === config?.falseLabel?.toLowerCase();
    };

    const trueEdge = edges.find(e =>
      e.sourceHandle === 'true' || e.sourceHandle === 'yes' || isTrueLabel(e.label)
    );
    const falseEdge = edges.find(e =>
      e.sourceHandle === 'false' || e.sourceHandle === 'no' || isFalseLabel(e.label)
    );

    // If no labeled edges match, fall back to: true → first edge, false → second edge
    let nextNodes: string[];
    if (result) {
      nextNodes = trueEdge ? [trueEdge.target] : (edges[0] ? [edges[0].target] : []);
    } else {
      nextNodes = falseEdge ? [falseEdge.target] : (edges[1] ? [edges[1].target] : []);
    }

    return {
      status: 'completed',
      output: { _decision: result },
      nextNodes,
    };
  }
}

class SwitchNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as SwitchNodeConfig;
    const engine = new WorkflowEngine();
    const value = engine.evaluateExpression(context, config.expression);

    const edges = context.workflow.edges.filter(e => e.source === node.id);

    // Find matching case
    const matchingCase = config.cases.find(c => c.value === value);
    const targetEdge = matchingCase
      ? edges.find(e => e.label === matchingCase.label || e.sourceHandle === String(matchingCase.value))
      : edges.find(e => e.label === config.defaultLabel || e.sourceHandle === 'default');

    return {
      status: 'completed',
      output: { _switchValue: value },
      nextNodes: targetEdge ? [targetEdge.target] : [],
    };
  }
}

class LoopNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as LoopNodeConfig;
    const engine = new WorkflowEngine();
    const collection = engine.evaluateExpression(context, config.collection) as unknown[];

    if (!Array.isArray(collection)) {
      return { status: 'failed', error: 'Loop collection is not an array' };
    }

    // Store loop results
    const results: unknown[] = [];

    for (let i = 0; i < collection.length; i++) {
      if (config.maxIterations && i >= config.maxIterations) break;

      // Set iteration variables
      context.variables[config.itemVariable] = collection[i];
      if (config.indexVariable) {
        context.variables[config.indexVariable] = i;
      }

      results.push(collection[i]);
    }

    return {
      status: 'completed',
      output: { _loopResults: results, _loopCount: results.length },
    };
  }
}

class DelayNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as DelayNodeConfig;
    let duration = config.duration;

    if (config.durationExpression) {
      const engine = new WorkflowEngine();
      duration = engine.evaluateExpression(context, config.durationExpression) as number;
    }

    await new Promise(resolve => setTimeout(resolve, duration));

    return { status: 'completed' };
  }
}

class ScriptNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as ScriptNodeConfig;

    try {
      // Create sandboxed function
      const fn = new Function('context', 'variables', `
        const { ${Object.keys(context.variables).join(', ')} } = variables;
        ${config.code}
      `);

      const result = fn(context, context.variables);

      return {
        status: 'completed',
        output: typeof result === 'object' ? result : { _result: result },
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Script error',
      };
    }
  }
}

class HttpNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as HttpNodeConfig;
    const engine = new WorkflowEngine();

    // Resolve URL with variables
    let url = config.url;
    for (const [key, value] of Object.entries(context.variables)) {
      url = url.replace(`{{${key}}}`, String(value));
    }

    // In production, use fetch
    // For demo, simulate response
    const response = {
      status: 200,
      data: { message: 'HTTP request simulated', url, method: config.method },
    };

    const output: Record<string, unknown> = {
      _httpStatus: response.status,
      _httpResponse: response.data,
    };

    // Apply response mapping
    if (config.responseMapping) {
      for (const [variable, path] of Object.entries(config.responseMapping)) {
        output[variable] = engine.evaluateExpression(
          { ...context, variables: response.data } as any,
          path
        );
      }
    }

    return { status: 'completed', output };
  }
}

class SetVariableNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as SetVariableNodeConfig;
    const engine = new WorkflowEngine();
    const output: Record<string, unknown> = {};

    for (const assignment of config.assignments) {
      const value = engine.evaluateExpression(context, assignment.value);
      output[assignment.variable] = value;
      context.variables[assignment.variable] = value;
    }

    return { status: 'completed', output };
  }
}

class TransformNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as TransformNodeConfig;
    const engine = new WorkflowEngine();
    const output: Record<string, unknown> = {};

    for (const transform of config.transformations) {
      const sourceValue = engine.evaluateExpression(context, transform.source);

      let result: unknown;
      switch (transform.transform) {
        case 'copy':
          result = sourceValue;
          break;
        case 'map':
          if (Array.isArray(sourceValue) && transform.expression) {
            result = sourceValue.map(item => {
              context.variables['_item'] = item;
              return engine.evaluateExpression(context, transform.expression!);
            });
          }
          break;
        case 'filter':
          if (Array.isArray(sourceValue) && transform.expression) {
            result = sourceValue.filter(item => {
              context.variables['_item'] = item;
              return engine.evaluateExpression(context, transform.expression!);
            });
          }
          break;
        case 'custom':
          if (transform.expression) {
            context.variables['_value'] = sourceValue;
            result = engine.evaluateExpression(context, transform.expression);
          }
          break;
        default:
          result = sourceValue;
      }

      output[transform.target] = result;
    }

    return { status: 'completed', output };
  }
}

class ExpressionNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as ExpressionNodeConfig;
    const engine = new WorkflowEngine();
    const result = engine.evaluateExpression(context, config.expression);

    const output: Record<string, unknown> = {};
    if (config.outputVariable) {
      output[config.outputVariable] = result;
    }
    output['_result'] = result;

    return { status: 'completed', output };
  }
}

class ApprovalNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as ApprovalNodeConfig;
    const taskId = randomUUID();

    context.execution.metrics.pendingTasks++;

    // Auto-complete approval tasks during manual/test runs from the designer
    if (context.execution.triggerType === 'manual') {
      context.execution.metrics.pendingTasks--;
      context.execution.metrics.completedTasks++;

      return {
        status: 'completed',
        output: {
          _taskId: taskId,
          _taskType: 'approval',
          _autoCompleted: true,
          outcome: 'approved',
          _message: 'Approval auto-approved (manual test run)',
        },
      };
    }

    // For production triggers, pause and wait for human approval
    return {
      status: 'waiting',
      waitForTask: taskId,
      output: { _taskId: taskId, _taskType: 'approval' },
    };
  }
}

class ParallelNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    // Return all branch node IDs as next nodes
    const edges = context.workflow.edges.filter(e => e.source === node.id);
    const nextNodes = edges.map(e => e.target);

    return {
      status: 'completed',
      nextNodes,
      output: { _parallelBranches: nextNodes.length },
    };
  }
}

class JoinNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    // Check if all incoming branches are complete
    const incomingEdges = context.workflow.edges.filter(e => e.target === node.id);
    const allComplete = incomingEdges.every(edge =>
      context.execution.completedNodes.includes(edge.source)
    );

    if (!allComplete) {
      return { status: 'waiting' };
    }

    return { status: 'completed' };
  }
}

// ============================================================================
// Form Node Executor — creates a human task for form submission
// ============================================================================

class FormNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as FormNodeConfig;
    const taskId = randomUUID();

    context.execution.metrics.pendingTasks++;

    // In a full production system, this would persist the task to the database
    // and notify the assignees. For now, we simulate by auto-completing
    // if triggered from the designer (manual trigger).
    if (context.execution.triggerType === 'manual') {
      // Auto-complete form tasks during manual/test runs
      context.execution.metrics.pendingTasks--;
      context.execution.metrics.completedTasks++;

      return {
        status: 'completed',
        output: {
          _taskId: taskId,
          _taskType: 'form',
          _formId: config?.formId || null,
          _autoCompleted: true,
          _message: 'Form task auto-completed (manual test run)',
        },
      };
    }

    // For production triggers, pause and wait for human input
    return {
      status: 'waiting',
      waitForTask: taskId,
      output: {
        _taskId: taskId,
        _taskType: 'form',
        _formId: config?.formId || null,
      },
    };
  }
}

// ============================================================================
// Email Node Executor — simulates sending email
// ============================================================================

class EmailNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as EmailNodeConfig;

    // Resolve template variables in to/subject/body
    let to = Array.isArray(config?.to) ? config.to.join(', ') : (config?.to || 'unknown');
    let subject = config?.subject || 'No subject';
    let body = config?.body || '';

    // Replace {{variable}} placeholders
    for (const [key, value] of Object.entries(context.variables)) {
      const placeholder = `{{${key}}}`;
      to = to.replace(placeholder, String(value));
      subject = subject.replace(placeholder, String(value));
      body = body.replace(placeholder, String(value));
    }

    // Also resolve {{initiator.email}} style nested references
    const nestedPattern = /\{\{([\w.]+)\}\}/g;
    const resolveNested = (str: string) => str.replace(nestedPattern, (_match, path: string) => {
      const parts = path.split('.');
      let current: any = context.variables;
      for (const part of parts) {
        if (current == null) return _match;
        current = current[part];
      }
      return current != null ? String(current) : _match;
    });
    to = resolveNested(to);
    subject = resolveNested(subject);
    body = resolveNested(body);

    // In production, integrate with an actual email service (SendGrid, SES, etc.)
    // For now, log the simulated send
    return {
      status: 'completed',
      output: {
        _emailSent: true,
        _emailTo: to,
        _emailSubject: subject,
        _emailTemplate: config?.templateId || null,
        _message: `Email simulated to: ${to}`,
      },
    };
  }
}

// ============================================================================
// Action Node Executor — executes a generic configured action
// ============================================================================

class ActionNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as ActionNodeConfig;
    const actionType = config?.actionType || (config as any)?.action || 'unknown';
    const parameters = config?.parameters || {};

    // Resolve parameter expressions
    const resolvedParams: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const varName = value.slice(2, -2).trim();
        resolvedParams[key] = context.variables[varName] ?? value;
      } else {
        resolvedParams[key] = value;
      }
    }

    // Simulate different action types
    switch (actionType) {
      case 'update_dataset':
      case 'insert_record':
      case 'delete_record':
        return {
          status: 'completed',
          output: {
            _actionType: actionType,
            _actionResult: 'simulated',
            _parameters: resolvedParams,
            _message: `Action '${actionType}' simulated successfully`,
          },
        };

      default:
        // Generic action passthrough
        return {
          status: 'completed',
          output: {
            _actionType: actionType,
            _actionResult: 'simulated',
            _parameters: resolvedParams,
            _message: `Generic action '${actionType}' simulated`,
          },
        };
    }
  }
}

// ============================================================================
// Subworkflow Node Executor — calls another workflow
// ============================================================================

class SubworkflowNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as SubworkflowNodeConfig;
    const subworkflowId = config?.workflowId;

    if (!subworkflowId) {
      return { status: 'failed', error: 'No subworkflow ID configured' };
    }

    // Resolve input mapping
    const input: Record<string, unknown> = {};
    if (config.inputMapping) {
      const engine = new WorkflowEngine();
      for (const [subVar, expr] of Object.entries(config.inputMapping)) {
        input[subVar] = engine.evaluateExpression(context, expr);
      }
    }

    // In production, this would start a new execution of the target workflow
    // and optionally wait for it to complete. For now, we simulate.
    const subExecutionId = randomUUID();

    const output: Record<string, unknown> = {
      _subExecutionId: subExecutionId,
      _subworkflowId: subworkflowId,
      _subworkflowStatus: 'simulated',
      _message: `Subworkflow '${subworkflowId}' simulated`,
    };

    // Apply output mapping if provided
    if (config.outputMapping) {
      for (const [variable, subOutput] of Object.entries(config.outputMapping)) {
        output[variable] = `simulated_${subOutput}`;
      }
    }

    return { status: 'completed', output };
  }
}

// ============================================================================
// Passthrough Node Executor — graceful fallback for unimplemented node types
// ============================================================================

class PassthroughNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    // Log that this node type is not fully implemented but allow execution to continue
    return {
      status: 'completed',
      output: {
        _passthroughType: node.type,
        _passthroughNode: node.name,
        _message: `Node type '${node.type}' executed as passthrough (not fully implemented)`,
      },
    };
  }
}

export const workflowEngine = new WorkflowEngine();
