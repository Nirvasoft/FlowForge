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
  BusinessRuleNodeConfig,
} from '../../types/workflow';
import { ExpressionService } from '../expressions/expression.service';
import { prisma } from '../../utils/prisma.js';

// Simple UUID v4 format check
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(val: unknown): val is string {
  return typeof val === 'string' && UUID_RE.test(val);
}

// ============================================================================
// Execution Context
// ============================================================================

export interface ExecutionContext {
  execution: WorkflowExecution;
  workflow: Workflow;
  variables: Record<string, unknown>;
  nodeStates: Map<string, NodeExecutionState>;
  expressionService: ExpressionService;
  onTaskCreated?: (task: any) => void;
}

export interface EngineCallbacks {
  onTaskCreated?: (task: any) => void;
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

    // Decision table executor
    this.nodeExecutors.set('businessRule', new BusinessRuleNodeExecutor());

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
    triggerType: string = 'manual',
    callbacks?: EngineCallbacks
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
    const context = this.createContext(execution, workflow, callbacks);

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
    resumeData?: Record<string, unknown>,
    callbacks?: EngineCallbacks
  ): Promise<WorkflowExecution> {
    if (execution.status !== 'paused' && execution.status !== 'waiting') {
      throw new Error(`Cannot resume execution in status: ${execution.status}`);
    }

    execution.status = 'running';

    if (resumeData) {
      Object.assign(execution.variables, resumeData);
    }

    const context = this.createContext(execution, workflow, callbacks);
    this.log(context, 'info', 'Resuming workflow execution');

    // When resuming from a waiting node (e.g. approval), don't re-execute that node.
    // Instead, mark it as completed and continue to the next nodes.
    const waitingNodeIds = [...execution.currentNodes];
    const nextNodesAfterWait: string[] = [];

    for (const nodeId of waitingNodeIds) {
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Mark as completed
      execution.completedNodes.push(nodeId);
      execution.currentNodes = execution.currentNodes.filter(id => id !== nodeId);

      // Update node state
      this.setNodeState(context, nodeId, 'completed');

      // Add the outcome to variables (for decision nodes downstream)
      if (resumeData) {
        // Extract outcome for convenience
        const outcomeKey = `_task_${nodeId}_outcome`;
        if (resumeData[outcomeKey]) {
          context.variables['outcome'] = resumeData[outcomeKey];
          execution.variables['outcome'] = resumeData[outcomeKey];
        }
      }

      // Get next nodes
      const nodeNextNodes = this.getNextNodes(workflow, nodeId, context.variables);
      nextNodesAfterWait.push(...nodeNextNodes);
    }

    // Continue executing from the next nodes
    if (nextNodesAfterWait.length > 0) {
      execution.currentNodes.push(...nextNodesAfterWait);
      await this.executeNodes(context, nextNodesAfterWait);
    } else if (execution.currentNodes.length === 0) {
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.output = context.variables;
      execution.metrics.totalDuration =
        execution.completedAt.getTime() - execution.startedAt.getTime();
    }

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
    workflow: Workflow,
    callbacks?: EngineCallbacks
  ): ExecutionContext {
    return {
      execution,
      workflow,
      variables: execution.variables,
      nodeStates: new Map(),
      expressionService: this.expressionService,
      onTaskCreated: callbacks?.onTaskCreated,
    };
  }

  /**
   * Evaluate an expression
   */
  evaluateExpression(context: ExecutionContext, expression: string): unknown {
    // Make variables accessible both directly (e.g. `totalDays`) and nested (e.g. `variables.totalDays`)
    const fields = {
      ...context.variables,
      variables: context.variables,
    } as Record<string, any>;
    this.expressionService.setFields(fields);
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

    // -----------------------------------------------------------------------
    // Table-backed branching mode
    // -----------------------------------------------------------------------
    if (config?.mode === 'table') {
      if (!config.decisionTableId) {
        return {
          status: 'failed',
          error: 'Decision node in table mode requires a decision table ID',
          output: {},
        };
      }

      try {
        // Lazy import to avoid circular dependency
        const { decisionTableService } = await import('../decisions/decision-table.service.js');

        // Pass all workflow variables as inputs to the table
        const tableInputs: Record<string, unknown> = { ...context.variables };

        const result = await decisionTableService.evaluate(
          config.decisionTableId,
          { inputs: tableInputs },
          { source: `workflow:${context.execution.workflowId}:${context.execution.id}` }
        );

        // Store full result in context for downstream access
        context.variables['_decisionResult'] = result.outputs;

        // Determine the branch value from outputs
        let branchValue: unknown;
        if (config.branchField && result.outputs && typeof result.outputs === 'object' && !Array.isArray(result.outputs)) {
          branchValue = (result.outputs as Record<string, unknown>)[config.branchField];
        } else if (result.outputs && typeof result.outputs === 'object' && !Array.isArray(result.outputs)) {
          // Fallback: use the first boolean-valued output
          for (const [, val] of Object.entries(result.outputs as Record<string, unknown>)) {
            if (typeof val === 'boolean') {
              branchValue = val;
              break;
            }
          }
          // If no boolean found, use truthiness of first output
          if (branchValue === undefined) {
            const firstVal = Object.values(result.outputs as Record<string, unknown>)[0];
            branchValue = firstVal;
          }
        }

        // Route using the same true/false edge logic as expression mode
        const isTruthy = Boolean(branchValue);

        const edges = context.workflow.edges.filter(e => e.source === node.id);
        const trueEdge = edges.find(e =>
          e.sourceHandle === 'true' || e.sourceHandle === 'yes'
        );
        const falseEdge = edges.find(e =>
          e.sourceHandle === 'false' || e.sourceHandle === 'no'
        );

        let nextNodes: string[];
        if (isTruthy) {
          nextNodes = trueEdge ? [trueEdge.target] : (edges[0] ? [edges[0].target] : []);
        } else {
          nextNodes = falseEdge ? [falseEdge.target] : (edges[1] ? [edges[1].target] : []);
        }

        return {
          status: 'completed',
          output: { _decision: isTruthy, _branchField: config.branchField, _branchValue: branchValue, ...result.outputs as Record<string, unknown> },
          nextNodes,
        };
      } catch (err) {
        return {
          status: 'failed',
          error: `Decision table evaluation failed: ${(err as Error).message}`,
          output: {},
        };
      }
    }

    // -----------------------------------------------------------------------
    // Expression mode (existing behavior, unchanged)
    // -----------------------------------------------------------------------

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

    // Check if edges have their own conditions (multi-way switch pattern)
    // If no labeled true/false edges are found, evaluate each edge's condition
    const hasConditionalEdges = edges.some(e => e.condition);
    if (hasConditionalEdges && !trueEdge && !falseEdge) {
      // Multi-way routing: evaluate each edge's condition against current variables
      const nextNodes: string[] = [];
      for (const edge of edges) {
        if (edge.condition) {
          const edgeResult = engine.evaluateExpression(context, edge.condition);
          if (edgeResult) {
            nextNodes.push(edge.target);
          }
        } else {
          // Unconditional edge — always include
          nextNodes.push(edge.target);
        }
      }
      return {
        status: 'completed',
        output: { _decision: result },
        nextNodes,
      };
    }

    // Standard true/false binary routing
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
    const config = node.config as any; // Seed data uses different field names than ApprovalNodeConfig type
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

    // For form-triggered and production workflows: create a real human task
    // and pause execution until it is claimed & completed.
    // Always include 'user-1' so the demo user can claim tasks (route handlers hardcode userId='user-1')
    const configAssignees = config?.assignTo ? [config.assignTo] : [];
    const assignees = ['user-1', ...configAssignees.filter((a: string) => a !== 'user-1')];
    const taskTitle = node.name || 'Approval Required';
    const taskDescription = node.description || `Please review and approve/reject this request.`;

    // Create the task via the callback (connects to the in-memory task store)
    if (context.onTaskCreated) {
      context.onTaskCreated({
        id: taskId,
        executionId: context.execution.id,
        nodeId: node.id,
        workflowId: context.workflow.id,
        type: 'approval',
        status: 'pending',
        assignees,
        title: taskTitle,
        description: taskDescription,
        formData: { ...context.variables },
        createdAt: new Date(),
        dueDate: config?.timeoutDays
          ? new Date(Date.now() + config.timeoutDays * 86400000)
          : undefined,
        escalationLevel: 0,
        history: [{ timestamp: new Date(), action: 'created' }],
      });
    }

    // Pause and wait for human approval
    return {
      status: 'waiting',
      waitForTask: taskId,
      output: {
        _taskId: taskId,
        _taskType: 'approval',
        _taskTitle: taskTitle,
        _assignees: assignees,
      },
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

    // Auto-complete form tasks during manual/test runs and form-triggered executions.
    // When triggered by a form submission, the form data is already in the execution input.
    if (context.execution.triggerType === 'manual' || context.execution.triggerType === 'form') {
      context.execution.metrics.pendingTasks--;
      context.execution.metrics.completedTasks++;

      // When triggered by form submission, the actual form data is already in context.variables
      const formData = context.execution.triggerType === 'form'
        ? { ...context.execution.input }
        : {};

      return {
        status: 'completed',
        output: {
          _taskId: taskId,
          _taskType: 'form',
          _formId: config?.formId || null,
          _autoCompleted: true,
          _message: context.execution.triggerType === 'form'
            ? 'Form task completed with submitted data'
            : 'Form task auto-completed (manual test run)',
          ...formData,
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

    // If the recipient is still an unresolved template, use a fallback
    if (to.includes('{{') || to === 'unknown') {
      to = 'admin@demo.com';
    }

    // Send real email via the email service
    try {
      const { emailService } = await import('../email/email.service.js');
      const result = await emailService.sendWorkflowNotification({
        to,
        subject,
        workflowName: context.workflow.name,
        taskName: node.name,
        body,
        variables: context.variables,
      });

      return {
        status: 'completed',
        output: {
          _emailSent: true,
          _emailTo: to,
          _emailSubject: subject,
          _emailMessageId: result.messageId,
          _emailPreviewUrl: result.previewUrl,
          _emailTemplate: config?.templateId || null,
          _message: result.previewUrl
            ? `Email sent! Preview: ${result.previewUrl}`
            : `Email sent to: ${to}`,
        },
      };
    } catch (emailError: any) {
      // Don't fail the workflow if email fails — log and continue
      return {
        status: 'completed',
        output: {
          _emailSent: false,
          _emailTo: to,
          _emailSubject: subject,
          _emailError: emailError?.message || 'Email send failed',
          _message: `Email send failed: ${emailError?.message}`,
        },
      };
    }
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

    // Execute action types
    switch (actionType) {
      case 'update_dataset':
      case 'insert_record': {
        const datasetName = (config as any)?.datasetName || resolvedParams.datasetName || 'Leave Records';

        try {
          // Look up the dataset by name
          const dataset = await prisma.dataset.findFirst({
            where: { name: datasetName as string },
          });

          if (!dataset) {
            return {
              status: 'completed',
              output: {
                _actionType: actionType,
                _actionResult: 'skipped',
                _message: `Dataset '${datasetName}' not found — skipping insert`,
              },
            };
          }

          // Build record data from workflow variables
          // Map known workflow variables to dataset column slugs
          const vars = context.variables;
          const recordData: Record<string, unknown> = {
            employee: vars.employeeName || '',
            department: vars.department || '',
            leave_type: vars.leaveType || '',
            start_date: vars.startDate || '',
            end_date: vars.endDate || '',
            total_days: vars.totalDays || 0,
            reason: vars.reason || '',
            status: vars.approvalStatus || 'Approved',
            approved_by: vars.approvedBy || 'System',
            comments: vars.approvalComments || '',
            // Also include any explicit parameters from the node config
            ...resolvedParams,
          };

          // Insert the record
          const newRecord = await prisma.datasetRecord.create({
            data: {
              datasetId: dataset.id,
              data: recordData as any,
              // createdBy must be a valid UUID or undefined (column is nullable @db.Uuid)
              createdBy: isValidUUID(context.execution.triggeredBy)
                ? context.execution.triggeredBy
                : undefined,
            },
          });

          // Update the dataset row count
          await prisma.dataset.update({
            where: { id: dataset.id },
            data: { rowCount: { increment: 1 } },
          });

          return {
            status: 'completed',
            output: {
              _actionType: actionType,
              _actionResult: 'success',
              _recordId: newRecord.id,
              _datasetId: dataset.id,
              _datasetName: datasetName,
              _message: `Record inserted into dataset '${datasetName}'`,
            },
          };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          return {
            status: 'completed',
            output: {
              _actionType: actionType,
              _actionResult: 'error',
              _message: `Failed to insert record: ${errMsg}`,
            },
          };
        }
      }

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
// Business Rule Node Executor — evaluates a decision table
// ============================================================================

class BusinessRuleNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const config = node.config as BusinessRuleNodeConfig;

    if (!config?.decisionTableId) {
      return {
        status: 'failed',
        error: 'Business Rule node requires a decision table ID',
        output: {},
      };
    }

    try {
      // Lazy import to avoid circular dependency
      const { decisionTableService } = await import('../decisions/decision-table.service.js');

      // Resolve input mappings: map workflow variables to table inputs
      const tableInputs: Record<string, unknown> = {};
      if (config.inputMapping) {
        for (const [tableInputName, expression] of Object.entries(config.inputMapping)) {
          // If expression is a simple variable name, look it up directly
          if (expression in context.variables) {
            tableInputs[tableInputName] = context.variables[expression];
          } else {
            // Try dot-path resolution (e.g. "input.category" → context.variables.input.category)
            try {
              const parts = expression.split('.');
              let val: unknown = context.variables;
              for (const part of parts) {
                val = (val as Record<string, unknown>)?.[part];
              }
              tableInputs[tableInputName] = val !== undefined ? val : expression;
            } catch {
              // Fall back to using expression as literal value
              tableInputs[tableInputName] = expression;
            }
          }
        }
      } else {
        // No explicit mapping — pass all workflow variables as inputs
        Object.assign(tableInputs, context.variables);
      }

      // Evaluate the decision table
      const result = await decisionTableService.evaluate(
        config.decisionTableId,
        { inputs: tableInputs },
        { source: `workflow:${context.execution.workflowId}:${context.execution.id}` }
      );

      // Check for no-match failures
      if (config.failOnNoMatch && result.matchedRules.length === 0) {
        return {
          status: 'failed',
          error: `No rules matched in decision table ${config.decisionTableId}`,
          output: { _decisionResult: result },
        };
      }

      // Store outputs in workflow variables
      const outputVar = config.outputVariable || '_businessRuleResult';
      context.variables[outputVar] = result.outputs;

      // Also spread top-level outputs into variables for easy downstream access
      if (result.outputs && typeof result.outputs === 'object' && !Array.isArray(result.outputs)) {
        for (const [key, value] of Object.entries(result.outputs)) {
          context.variables[key] = value;
        }
      }

      return {
        status: 'completed',
        output: {
          _decisionTableId: config.decisionTableId,
          _matchedRules: result.matchedRules.length,
          ...result.outputs as Record<string, unknown>,
        },
      };
    } catch (err) {
      return {
        status: 'failed',
        error: `Decision table evaluation failed: ${(err as Error).message}`,
        output: {},
      };
    }
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
