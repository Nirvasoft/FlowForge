/**
 * FlowForge Workflow Service
 * CRUD operations for workflows and executions
 */

import { randomUUID } from 'crypto';
import type {
  Workflow,
  WorkflowStatus,
  WorkflowNode,
  WorkflowEdge,
  WorkflowTrigger,
  WorkflowVariable,
  WorkflowSettings,
  WorkflowExecution,
  ExecutionStatus,
  HumanTask,
  TaskStatus,
} from '../../types/workflow';
import { WorkflowEngine, workflowEngine } from './engine';

// ============================================================================
// In-Memory Storage (Replace with Prisma in production)
// ============================================================================

const workflows = new Map<string, Workflow>();
const executions = new Map<string, WorkflowExecution>();
const tasks = new Map<string, HumanTask>();

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: WorkflowSettings = {
  timeout: 3600,
  retryPolicy: {
    enabled: true,
    maxAttempts: 3,
    backoffType: 'exponential',
    initialDelay: 1000,
    maxDelay: 60000,
  },
  errorHandling: 'stop',
  logging: 'standard',
  concurrency: 10,
  priority: 'normal',
};

// ============================================================================
// Workflow Service
// ============================================================================

export class WorkflowService {
  private engine: WorkflowEngine;

  constructor() {
    this.engine = workflowEngine;
  }

  // ============================================================================
  // Workflow CRUD
  // ============================================================================

  async createWorkflow(input: {
    name: string;
    description?: string;
    createdBy: string;
  }): Promise<Workflow> {
    const id = randomUUID();
    const now = new Date();

    const workflow: Workflow = {
      id,
      name: input.name,
      slug: this.generateSlug(input.name),
      description: input.description,
      version: 1,
      status: 'draft',
      nodes: [
        {
          id: randomUUID(),
          type: 'start',
          name: 'Start',
          position: { x: 250, y: 50 },
          config: { type: 'start' },
        },
        {
          id: randomUUID(),
          type: 'end',
          name: 'End',
          position: { x: 250, y: 300 },
          config: { type: 'end' },
        },
      ],
      edges: [],
      triggers: [],
      variables: [],
      settings: { ...DEFAULT_SETTINGS },
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    // Connect start to end
    workflow.edges.push({
      id: randomUUID(),
      source: workflow.nodes[0]!.id,
      target: workflow.nodes[1]!.id,
    });

    workflows.set(id, workflow);
    return workflow;
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    return workflows.get(id) || null;
  }

  async getWorkflowBySlug(slug: string): Promise<Workflow | null> {
    for (const workflow of workflows.values()) {
      if (workflow.slug === slug) return workflow;
    }
    return null;
  }

  async listWorkflows(options: {
    status?: WorkflowStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ workflows: Workflow[]; total: number }> {
    let items = Array.from(workflows.values());

    if (options.status) {
      items = items.filter(w => w.status === options.status);
    }

    if (options.search) {
      const search = options.search.toLowerCase();
      items = items.filter(w =>
        w.name.toLowerCase().includes(search) ||
        w.description?.toLowerCase().includes(search)
      );
    }

    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const start = (page - 1) * pageSize;

    return {
      workflows: items.slice(start, start + pageSize),
      total: items.length,
    };
  }

  async updateWorkflow(
    id: string,
    input: Partial<Pick<Workflow, 'name' | 'description' | 'settings'>>
  ): Promise<Workflow | null> {
    const workflow = workflows.get(id);
    if (!workflow) return null;

    if (input.name) {
      workflow.name = input.name;
      workflow.slug = this.generateSlug(input.name);
    }
    if (input.description !== undefined) {
      workflow.description = input.description;
    }
    if (input.settings) {
      workflow.settings = { ...workflow.settings, ...input.settings };
    }

    workflow.updatedAt = new Date();
    workflows.set(id, workflow);

    return workflow;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    return workflows.delete(id);
  }

  // ============================================================================
  // Node Management
  // ============================================================================

  async addNode(workflowId: string, node: Omit<WorkflowNode, 'id'>): Promise<WorkflowNode | null> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return null;

    const newNode: WorkflowNode = {
      ...node,
      id: randomUUID(),
    };

    workflow.nodes.push(newNode);
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);

    return newNode;
  }

  async updateNode(
    workflowId: string,
    nodeId: string,
    updates: Partial<Omit<WorkflowNode, 'id'>>
  ): Promise<WorkflowNode | null> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return null;

    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) return null;

    Object.assign(node, updates);
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);

    return node;
  }

  async deleteNode(workflowId: string, nodeId: string): Promise<boolean> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return false;

    const index = workflow.nodes.findIndex(n => n.id === nodeId);
    if (index === -1) return false;

    workflow.nodes.splice(index, 1);
    // Remove connected edges
    workflow.edges = workflow.edges.filter(
      e => e.source !== nodeId && e.target !== nodeId
    );

    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);

    return true;
  }

  // ============================================================================
  // Edge Management
  // ============================================================================

  async addEdge(workflowId: string, edge: Omit<WorkflowEdge, 'id'>): Promise<WorkflowEdge | null> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return null;

    // Validate nodes exist
    const sourceExists = workflow.nodes.some(n => n.id === edge.source);
    const targetExists = workflow.nodes.some(n => n.id === edge.target);
    if (!sourceExists || !targetExists) return null;

    const newEdge: WorkflowEdge = {
      ...edge,
      id: randomUUID(),
    };

    workflow.edges.push(newEdge);
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);

    return newEdge;
  }

  async updateEdge(
    workflowId: string,
    edgeId: string,
    updates: Partial<Omit<WorkflowEdge, 'id'>>
  ): Promise<WorkflowEdge | null> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return null;

    const edge = workflow.edges.find(e => e.id === edgeId);
    if (!edge) return null;

    Object.assign(edge, updates);
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);

    return edge;
  }

  async deleteEdge(workflowId: string, edgeId: string): Promise<boolean> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return false;

    const index = workflow.edges.findIndex(e => e.id === edgeId);
    if (index === -1) return false;

    workflow.edges.splice(index, 1);
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);

    return true;
  }

  // ============================================================================
  // Trigger Management
  // ============================================================================

  async addTrigger(
    workflowId: string,
    trigger: Omit<WorkflowTrigger, 'id'>
  ): Promise<WorkflowTrigger | null> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return null;

    const newTrigger: WorkflowTrigger = {
      ...trigger,
      id: randomUUID(),
    };

    workflow.triggers.push(newTrigger);
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);

    return newTrigger;
  }

  async updateTrigger(
    workflowId: string,
    triggerId: string,
    updates: Partial<Omit<WorkflowTrigger, 'id'>>
  ): Promise<WorkflowTrigger | null> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return null;

    const trigger = workflow.triggers.find(t => t.id === triggerId);
    if (!trigger) return null;

    Object.assign(trigger, updates);
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);

    return trigger;
  }

  async deleteTrigger(workflowId: string, triggerId: string): Promise<boolean> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return false;

    const index = workflow.triggers.findIndex(t => t.id === triggerId);
    if (index === -1) return false;

    workflow.triggers.splice(index, 1);
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);

    return true;
  }

  // ============================================================================
  // Variable Management
  // ============================================================================

  async setVariables(workflowId: string, variables: WorkflowVariable[]): Promise<boolean> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return false;

    workflow.variables = variables;
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);

    return true;
  }

  // ============================================================================
  // Publishing
  // ============================================================================

  async publishWorkflow(workflowId: string, publishedBy: string): Promise<Workflow | null> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return null;

    // Validate workflow
    const validation = this.validateWorkflow(workflow);
    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    workflow.status = 'published';
    workflow.version++;
    workflow.publishedAt = new Date();
    workflow.publishedBy = publishedBy;
    workflow.updatedAt = new Date();

    workflows.set(workflowId, workflow);

    return workflow;
  }

  async unpublishWorkflow(workflowId: string): Promise<Workflow | null> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return null;

    workflow.status = 'draft';
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);

    return workflow;
  }

  async archiveWorkflow(workflowId: string): Promise<Workflow | null> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return null;

    workflow.status = 'archived';
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);

    return workflow;
  }

  validateWorkflow(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for start node
    const startNodes = workflow.nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('Workflow must have a start node');
    } else if (startNodes.length > 1) {
      errors.push('Workflow can only have one start node');
    }

    // Check for end node
    const endNodes = workflow.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('Workflow must have at least one end node');
    }

    // Check all nodes are connected
    const connectedNodes = new Set<string>();
    for (const edge of workflow.edges) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }

    for (const node of workflow.nodes) {
      if (!connectedNodes.has(node.id) && node.type !== 'start' && workflow.nodes.length > 1) {
        errors.push(`Node "${node.name}" is not connected`);
      }
    }

    // Check for cycles (simplified)
    // In production, implement proper cycle detection

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // Execution Management
  // ============================================================================

  async startExecution(
    workflowId: string,
    input: Record<string, unknown> = {},
    triggeredBy: string = 'system',
    triggerType: string = 'manual'
  ): Promise<WorkflowExecution> {
    const workflow = workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'published') {
      throw new Error('Can only execute published workflows');
    }

    const execution = await this.engine.startExecution(
      workflow,
      input,
      triggeredBy,
      triggerType
    );

    executions.set(execution.id, execution);

    return execution;
  }

  async getExecution(id: string): Promise<WorkflowExecution | null> {
    return executions.get(id) || null;
  }

  async listExecutions(options: {
    workflowId?: string;
    status?: ExecutionStatus;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ executions: WorkflowExecution[]; total: number }> {
    let items = Array.from(executions.values());

    if (options.workflowId) {
      items = items.filter(e => e.workflowId === options.workflowId);
    }

    if (options.status) {
      items = items.filter(e => e.status === options.status);
    }

    items.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const start = (page - 1) * pageSize;

    return {
      executions: items.slice(start, start + pageSize),
      total: items.length,
    };
  }

  async cancelExecution(id: string): Promise<WorkflowExecution | null> {
    const execution = executions.get(id);
    if (!execution) return null;

    if (execution.status === 'completed' || execution.status === 'failed') {
      throw new Error('Cannot cancel completed or failed execution');
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    executions.set(id, execution);

    return execution;
  }

  async pauseExecution(id: string): Promise<WorkflowExecution | null> {
    const execution = executions.get(id);
    if (!execution) return null;

    if (execution.status !== 'running') {
      throw new Error('Can only pause running executions');
    }

    execution.status = 'paused';
    executions.set(id, execution);

    return execution;
  }

  async resumeExecution(
    id: string,
    resumeData?: Record<string, unknown>
  ): Promise<WorkflowExecution | null> {
    const execution = executions.get(id);
    if (!execution) return null;

    const workflow = workflows.get(execution.workflowId);
    if (!workflow) return null;

    const resumed = await this.engine.resumeExecution(execution, workflow, resumeData);
    executions.set(id, resumed);

    return resumed;
  }

  // ============================================================================
  // Human Task Management
  // ============================================================================

  async createTask(input: {
    executionId: string;
    nodeId: string;
    workflowId: string;
    type: HumanTask['type'];
    title: string;
    description?: string;
    assignees: string[];
    dueDate?: Date;
    formData?: Record<string, unknown>;
  }): Promise<HumanTask> {
    const task: HumanTask = {
      id: randomUUID(),
      executionId: input.executionId,
      nodeId: input.nodeId,
      workflowId: input.workflowId,
      type: input.type,
      status: 'pending',
      assignees: input.assignees,
      title: input.title,
      description: input.description,
      formData: input.formData,
      createdAt: new Date(),
      dueDate: input.dueDate,
      escalationLevel: 0,
      history: [
        {
          timestamp: new Date(),
          action: 'created',
        },
      ],
    };

    tasks.set(task.id, task);

    return task;
  }

  async getTask(id: string): Promise<HumanTask | null> {
    return tasks.get(id) || null;
  }

  async listTasks(options: {
    assigneeId?: string;
    status?: TaskStatus;
    workflowId?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ tasks: HumanTask[]; total: number }> {
    let items = Array.from(tasks.values());

    if (options.assigneeId) {
      items = items.filter(t =>
        t.assignees.includes(options.assigneeId!) ||
        t.claimedBy === options.assigneeId
      );
    }

    if (options.status) {
      items = items.filter(t => t.status === options.status);
    }

    if (options.workflowId) {
      items = items.filter(t => t.workflowId === options.workflowId);
    }

    items.sort((a, b) => {
      // Pending first, then by due date
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const start = (page - 1) * pageSize;

    return {
      tasks: items.slice(start, start + pageSize),
      total: items.length,
    };
  }

  async claimTask(taskId: string, userId: string): Promise<HumanTask | null> {
    const task = tasks.get(taskId);
    if (!task) return null;

    if (task.status !== 'pending') {
      throw new Error('Can only claim pending tasks');
    }

    if (!task.assignees.includes(userId)) {
      throw new Error('User is not an assignee of this task');
    }

    task.status = 'claimed';
    task.claimedBy = userId;
    task.claimedAt = new Date();
    task.history.push({
      timestamp: new Date(),
      action: 'claimed',
      userId,
    });

    tasks.set(taskId, task);

    return task;
  }

  async releaseTask(taskId: string, userId: string): Promise<HumanTask | null> {
    const task = tasks.get(taskId);
    if (!task) return null;

    if (task.claimedBy !== userId) {
      throw new Error('Task is not claimed by this user');
    }

    task.status = 'pending';
    task.claimedBy = undefined;
    task.claimedAt = undefined;
    task.history.push({
      timestamp: new Date(),
      action: 'released',
      userId,
    });

    tasks.set(taskId, task);

    return task;
  }

  async completeTask(
    taskId: string,
    userId: string,
    outcome: string,
    responseData?: Record<string, unknown>,
    comments?: string
  ): Promise<HumanTask | null> {
    const task = tasks.get(taskId);
    if (!task) return null;

    if (task.status !== 'claimed' && task.status !== 'pending') {
      throw new Error('Task is not in a completable state');
    }

    task.status = 'completed';
    task.completedAt = new Date();
    task.outcome = outcome;
    task.responseData = responseData;
    task.comments = comments;
    task.history.push({
      timestamp: new Date(),
      action: 'completed',
      userId,
      data: { outcome, responseData },
    });

    tasks.set(taskId, task);

    // Resume workflow execution
    const execution = executions.get(task.executionId);
    if (execution && execution.status === 'waiting') {
      const workflow = workflows.get(execution.workflowId);
      if (workflow) {
        // Add task result to variables
        const resumeData = {
          [`_task_${task.nodeId}_outcome`]: outcome,
          [`_task_${task.nodeId}_response`]: responseData,
        };
        await this.resumeExecution(execution.id, resumeData);
      }
    }

    return task;
  }

  async delegateTask(
    taskId: string,
    fromUserId: string,
    toUserId: string
  ): Promise<HumanTask | null> {
    const task = tasks.get(taskId);
    if (!task) return null;

    task.assignees = task.assignees.filter(id => id !== fromUserId);
    task.assignees.push(toUserId);

    if (task.claimedBy === fromUserId) {
      task.claimedBy = undefined;
      task.claimedAt = undefined;
      task.status = 'pending';
    }

    task.history.push({
      timestamp: new Date(),
      action: 'delegated',
      userId: fromUserId,
      data: { delegatedTo: toUserId },
    });

    tasks.set(taskId, task);

    return task;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

export const workflowService = new WorkflowService();
