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
import { prisma } from '../../utils/prisma.js';
import { auditService } from '../audit/audit.service';
import { eventBus } from '../events/event-bus';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('workflow-service');

// ============================================================================
// In-Memory Storage (acts as a cache; Prisma is the fallback source of truth)
// ============================================================================

const workflows = new Map<string, Workflow>();
const executions = new Map<string, WorkflowExecution>();
const tasks = new Map<string, HumanTask>();

// ============================================================================
// DB → In-Memory Conversion Helpers
// ============================================================================

function dbProcessToWorkflow(process: any): Workflow {
  const definition = process.definition as any || {};
  return {
    id: process.id,
    name: process.name,
    slug: process.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: process.description || undefined,
    version: process.version,
    status: (process.status?.toLowerCase() as any) || 'draft',
    nodes: Array.isArray(definition.nodes) ? definition.nodes : [],
    edges: Array.isArray(definition.edges) ? definition.edges : [],
    triggers: definition.triggers || [],
    variables: definition.variables || [],
    settings: {
      timeout: 3600,
      retryPolicy: { enabled: true, maxAttempts: 3, backoffType: 'exponential' as const, initialDelay: 1000, maxDelay: 60000 },
      errorHandling: 'stop' as const,
      logging: 'standard' as const,
      concurrency: 10,
      priority: 'normal' as const,
    },
    createdAt: process.createdAt,
    updatedAt: process.updatedAt,
    createdBy: process.createdBy || 'system',
  };
}

function dbInstanceToExecution(inst: any): WorkflowExecution {
  return {
    id: inst.id,
    workflowId: inst.processId,
    workflowName: inst.process?.name,
    status: (inst.status?.toLowerCase() as any) || 'running',
    currentNodes: (inst.currentNodes as string[]) || [],
    completedNodes: [],
    variables: (inst.variables as Record<string, unknown>) || {},
    nodeStates: {},
    startedAt: inst.startedAt,
    completedAt: inst.completedAt || undefined,
    triggeredBy: inst.startedBy,
  } as unknown as WorkflowExecution;
}

function dbTaskToHumanTask(t: any): HumanTask {
  return {
    id: t.id,
    executionId: t.instanceId,
    nodeId: t.nodeId,
    workflowId: t.instance?.processId || '',
    type: (t.taskType || 'task').toLowerCase() as any,
    status: (t.status || 'pending').toLowerCase() as any,
    assignees: t.candidateUsers?.length ? t.candidateUsers : (t.assigneeId ? [t.assigneeId] : []),
    claimedBy: t.status === 'CLAIMED' ? t.assigneeId : undefined,
    title: t.name,
    description: t.description || undefined,
    formData: (t.formData as Record<string, unknown>) || undefined,
    createdAt: t.createdAt,
    dueDate: t.dueAt || undefined,
    completedAt: t.completedAt || undefined,
    outcome: t.outcome || undefined,
    comments: t.comments || undefined,
    escalationLevel: 0,
    history: [{ timestamp: t.createdAt, action: 'created' }],
    // Add extra fields the frontend may use
    workflowName: t.instance?.process?.name,
  } as any;
}

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

const DEFAULT_ACCOUNT_ID = '56dc14cc-16f6-45ef-9797-c77a648ed6f2';
const DEFAULT_USER_ID = '30620aae-f229-40f0-8f3d-31704087fed4';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

function statusToDb(s: string): 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED' {
  const map: Record<string, 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED'> = {
    draft: 'DRAFT', published: 'ACTIVE', active: 'ACTIVE', deprecated: 'DEPRECATED', archived: 'ARCHIVED',
  };
  return map[s?.toLowerCase()] || 'DRAFT';
}

async function syncWorkflowToDb(wf: Workflow): Promise<void> {
  try {
    await prisma.process.upsert({
      where: { id: wf.id },
      update: {
        name: wf.name,
        description: wf.description || null,
        definition: { nodes: wf.nodes, edges: wf.edges } as any,
        triggers: (wf.triggers || []) as any,
        variables: (wf.variables || []) as any,
        settings: (wf.settings || {}) as any,
        version: wf.version || 1,
        status: statusToDb(wf.status),
        publishedAt: wf.publishedAt || null,
      },
      create: {
        id: wf.id,
        accountId: DEFAULT_ACCOUNT_ID,
        name: wf.name,
        description: wf.description || null,
        definition: { nodes: wf.nodes, edges: wf.edges } as any,
        triggers: (wf.triggers || []) as any,
        variables: (wf.variables || []) as any,
        settings: (wf.settings || {}) as any,
        version: wf.version || 1,
        status: statusToDb(wf.status),
        createdBy: isUUID(wf.createdBy) ? wf.createdBy : DEFAULT_USER_ID,
      },
    });
  } catch (e) {
    console.warn('syncWorkflowToDb failed:', (e as Error).message);
  }
}

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
    await syncWorkflowToDb(workflow);
    return workflow;
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    const cached = workflows.get(id);
    if (cached) return cached;

    // Fallback: load from Prisma
    try {
      const process = await prisma.process.findUnique({ where: { id } });
      if (!process) return null;
      const wf = dbProcessToWorkflow(process);
      workflows.set(id, wf);
      return wf;
    } catch {
      return null;
    }
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
    // Merge in-memory workflows with DB workflows
    const memItems = Array.from(workflows.values());
    const seenIds = new Set(memItems.map(w => w.id));

    // Load DB workflows that aren't already in memory
    try {
      const where: any = {};
      if (options.status) where.status = options.status.toUpperCase();
      if (options.search) {
        where.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { description: { contains: options.search, mode: 'insensitive' } },
        ];
      }
      const dbProcesses = await prisma.process.findMany({ where, orderBy: { updatedAt: 'desc' } });
      for (const p of dbProcesses) {
        if (!seenIds.has(p.id)) {
          const wf = dbProcessToWorkflow(p);
          memItems.push(wf);
          workflows.set(p.id, wf); // cache
        }
      }
    } catch {
      // DB unavailable — use what's in memory
    }

    let items = memItems;

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
    await syncWorkflowToDb(workflow);

    return workflow;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const deleted = workflows.delete(id);
    try { await prisma.process.delete({ where: { id } }); } catch { }
    return deleted;
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
    await syncWorkflowToDb(workflow);

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
    await syncWorkflowToDb(workflow);

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
    await syncWorkflowToDb(workflow);

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
    await syncWorkflowToDb(workflow);

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
    await syncWorkflowToDb(workflow);

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
    await syncWorkflowToDb(workflow);

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
    await syncWorkflowToDb(workflow);

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
    await syncWorkflowToDb(workflow);

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
    await syncWorkflowToDb(workflow);

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
    await syncWorkflowToDb(workflow);

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
    await syncWorkflowToDb(workflow);

    return workflow;
  }

  async unpublishWorkflow(workflowId: string): Promise<Workflow | null> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return null;

    workflow.status = 'draft';
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);
    await syncWorkflowToDb(workflow);

    return workflow;
  }

  async archiveWorkflow(workflowId: string): Promise<Workflow | null> {
    const workflow = workflows.get(workflowId);
    if (!workflow) return null;

    workflow.status = 'archived';
    workflow.updatedAt = new Date();
    workflows.set(workflowId, workflow);
    await syncWorkflowToDb(workflow);

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
    let workflow = workflows.get(workflowId);

    // If not in memory, try loading from Prisma DB (seeded workflows)
    if (!workflow) {
      try {
        const { prisma } = await import('../../utils/prisma.js');
        const process = await prisma.process.findUnique({
          where: { id: workflowId },
        });

        if (process) {
          const definition = (process as any).definition as any || {};
          const dbNodes = Array.isArray(definition.nodes) ? definition.nodes : [];
          const dbEdges = Array.isArray(definition.edges) ? definition.edges : [];

          workflow = {
            id: process.id,
            name: process.name,
            slug: process.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            description: process.description || undefined,
            version: process.version,
            status: (process.status?.toLowerCase() as any) || 'draft',
            nodes: dbNodes,
            edges: dbEdges,
            triggers: definition.triggers || [],
            variables: definition.variables || [],
            settings: { timeout: 3600, retryPolicy: { enabled: true, maxAttempts: 3, backoffType: 'exponential' as const, initialDelay: 1000, maxDelay: 60000 }, errorHandling: 'stop' as const, logging: 'standard' as const, concurrency: 10, priority: 'normal' as const },
            createdAt: process.createdAt,
            updatedAt: process.updatedAt,
            createdBy: process.createdBy || 'system',
          };

          // Cache it in memory for future use
          workflows.set(workflowId, workflow);
        }
      } catch (err) {
        // DB lookup failed, fall through to error below
      }
    }

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Allow manual/test executions even for draft workflows
    // Also allow 'active' status (from DB/Prisma ACTIVE enum) alongside 'published' (in-memory)
    const wfStatus = workflow.status as string;
    if (wfStatus !== 'published' && wfStatus !== 'active' && triggerType !== 'manual') {
      throw new Error('Can only execute published workflows. Use the designer to test draft workflows.');
    }

    const execution = await this.engine.startExecution(
      workflow,
      input,
      triggeredBy,
      triggerType,
      {
        onTaskCreated: (task) => {
          // Store the task in the in-memory tasks map so it appears in the tasks list
          tasks.set(task.id, task);
          console.log(
            `📋 Human task created: [${task.type}] "${task.title}" (taskId=${task.id}, executionId=${task.executionId})`
          );
        },
      }
    );

    executions.set(execution.id, execution);

    // Persist execution + any created tasks atomically via transaction
    try {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

      await prisma.$transaction(async (tx) => {
        // 1. Persist the execution instance
        await tx.processInstance.create({
          data: {
            id: execution.id,
            processId: workflowId,
            processVersion: workflow.version || 1,
            status: (execution.status || 'running').toUpperCase() === 'WAITING' ? 'RUNNING' : (execution.status || 'running').toUpperCase() as any,
            currentNodes: execution.currentNodes || [],
            variables: (execution.variables || {}) as any,
            startedAt: execution.startedAt || new Date(),
            startedBy: isUUID(triggeredBy) ? triggeredBy : (isUUID(workflow.createdBy) ? workflow.createdBy : undefined as any),
          },
        });

        // 2. Persist any human tasks that were created during execution
        for (const [, task] of tasks) {
          if (task.executionId === execution.id) {
            try {
              await tx.taskInstance.create({
                data: {
                  id: task.id,
                  instanceId: execution.id,
                  nodeId: task.nodeId || 'unknown',
                  name: task.title || 'Task',
                  taskType: (task.type || 'task').toUpperCase() as any,
                  status: (task.status || 'pending').toUpperCase() as any,
                  assigneeId: isUUID(task.assignees?.[0]) ? task.assignees[0] : undefined,
                  candidateUsers: task.assignees || [],
                  formData: (task.formData || {}) as any,
                  dueAt: task.dueDate || null,
                },
              });
            } catch {
              // Task may already exist (idempotent)
            }
          }
        }
      });
    } catch (e) {
      console.warn('Could not persist execution to DB:', (e as Error).message);
    }

    // Audit: log execution event
    const auditAction = execution.status === 'failed'
      ? 'workflow.execution.failed'
      : execution.status === 'completed'
        ? 'workflow.execution.completed'
        : 'workflow.execution.started';

    auditService.log({
      action: auditAction,
      resource: 'workflow',
      resourceId: workflowId,
      userId: isUUID(triggeredBy) ? triggeredBy : undefined,
      newData: {
        executionId: execution.id,
        workflowName: workflow.name,
        status: execution.status,
        triggerType,
        nodeCount: workflow.nodes.length,
      },
    }).catch(() => { });

    return execution;
  }

  async getExecution(id: string): Promise<WorkflowExecution | null> {
    const cached = executions.get(id);
    if (cached) return cached;

    // Fallback: load from Prisma
    try {
      const inst = await prisma.processInstance.findUnique({
        where: { id },
        include: { process: { select: { name: true } } },
      });
      if (!inst) return null;
      const exec = dbInstanceToExecution(inst);
      executions.set(id, exec);
      return exec;
    } catch {
      return null;
    }
  }

  async listExecutions(options: {
    workflowId?: string;
    status?: ExecutionStatus;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ executions: WorkflowExecution[]; total: number }> {
    // Merge in-memory with DB
    const memItems = Array.from(executions.values());
    const seenIds = new Set(memItems.map(e => e.id));

    try {
      const where: any = {};
      if (options.workflowId) where.processId = options.workflowId;
      if (options.status) where.status = options.status.toUpperCase();
      const dbInstances = await prisma.processInstance.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: 100,
        include: { process: { select: { name: true } } },
      });
      for (const inst of dbInstances) {
        if (!seenIds.has(inst.id)) {
          memItems.push(dbInstanceToExecution(inst));
        }
      }
    } catch {
      // DB unavailable
    }

    let items = memItems;

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
    // Try in-memory first
    const execution = executions.get(id);
    if (execution) {
      if (execution.status === 'completed' || execution.status === 'failed') {
        throw new Error('Cannot cancel completed or failed execution');
      }

      execution.status = 'cancelled';
      execution.completedAt = new Date();
      executions.set(id, execution);

      return execution;
    }

    // Fallback: update in Prisma
    const dbInstance = await prisma.processInstance.findUnique({ where: { id } });
    if (!dbInstance) return null;

    if (dbInstance.status === 'COMPLETED' || dbInstance.status === 'FAILED') {
      throw new Error('Cannot cancel completed or failed execution');
    }

    const updated = await prisma.processInstance.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    // Also cancel any pending tasks for this instance
    await prisma.taskInstance.updateMany({
      where: { instanceId: id, status: { in: ['PENDING', 'CLAIMED'] } },
      data: { status: 'CANCELLED' },
    });

    return {
      id: updated.id,
      workflowId: updated.processId,
      status: 'cancelled',
      variables: (updated.variables as Record<string, unknown>) || {},
      completedNodes: [],
      currentNodes: (updated.currentNodes as string[]) || [],
      startedAt: updated.startedAt,
      completedAt: updated.completedAt || undefined,
    } as unknown as WorkflowExecution;
  }

  async pauseExecution(id: string): Promise<WorkflowExecution | null> {
    // Try in-memory first
    const execution = executions.get(id);
    if (execution) {
      if (execution.status !== 'running') {
        throw new Error('Can only pause running executions');
      }
      execution.status = 'paused';
      executions.set(id, execution);
      // Also update DB
      try { await prisma.processInstance.update({ where: { id }, data: { status: 'SUSPENDED' } }); } catch { }
      return execution;
    }

    // Fallback: update in Prisma
    const inst = await prisma.processInstance.findUnique({ where: { id } });
    if (!inst) return null;
    if (inst.status !== 'RUNNING') throw new Error('Can only pause running executions');
    const updated = await prisma.processInstance.update({ where: { id }, data: { status: 'SUSPENDED' } });
    return dbInstanceToExecution(updated);
  }

  async resumeExecution(
    id: string,
    resumeData?: Record<string, unknown>
  ): Promise<WorkflowExecution | null> {
    // Try in-memory first, fall back to DB
    let execution = executions.get(id);
    if (!execution) {
      execution = await this.getExecution(id) || undefined as any;
      if (!execution) return null;
    }

    let workflow = workflows.get(execution.workflowId);
    if (!workflow) {
      workflow = await this.getWorkflow(execution.workflowId) || undefined as any;
      if (!workflow) return null;
    }

    const resumed = await this.engine.resumeExecution(execution, workflow, resumeData, {
      onTaskCreated: (task) => {
        tasks.set(task.id, task);
        console.log(
          `📋 Human task created (on resume): [${task.type}] "${task.title}" (taskId=${task.id})`
        );
      },
    });
    executions.set(id, resumed);

    // Persist execution state to DB
    try {
      await prisma.processInstance.update({
        where: { id },
        data: {
          status: (resumed.status || 'running').toUpperCase() as any,
          currentNodes: resumed.currentNodes || [],
          variables: (resumed.variables || {}) as any,
          completedAt: resumed.completedAt || null,
        },
      });
    } catch (e) {
      console.warn('Could not persist resumed execution to DB:', (e as Error).message);
    }

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

    // Also persist to DB
    try {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);
      await prisma.taskInstance.create({
        data: {
          id: task.id,
          instanceId: input.executionId,
          nodeId: input.nodeId,
          name: input.title,
          description: input.description || null,
          taskType: (input.type || 'TASK').toUpperCase() as any,
          assigneeId: isUUID(input.assignees[0]) ? input.assignees[0] : undefined,
          candidateUsers: input.assignees.filter(a => isUUID(a)),
          formData: (input.formData || {}) as any,
          status: 'PENDING',
          dueAt: input.dueDate || null,
        },
      });
    } catch (e) {
      console.warn('Could not persist task to DB:', (e as Error).message);
    }

    return task;
  }

  async getTask(id: string): Promise<HumanTask | null> {
    const cached = tasks.get(id);
    if (cached) return cached;

    // Fallback: load from Prisma
    try {
      const t = await prisma.taskInstance.findUnique({
        where: { id },
        include: { instance: { select: { processId: true, process: { select: { name: true } } } } },
      });
      if (!t) return null;
      const ht = dbTaskToHumanTask(t);
      tasks.set(id, ht);
      return ht;
    } catch {
      return null;
    }
  }

  async listTasks(options: {
    assigneeId?: string;
    status?: TaskStatus;
    workflowId?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ tasks: HumanTask[]; total: number }> {
    // Merge in-memory with DB
    const memItems = Array.from(tasks.values());
    const seenIds = new Set(memItems.map(t => t.id));

    try {
      const where: any = {};
      if (options.assigneeId) where.assigneeId = options.assigneeId;
      if (options.status) where.status = (options.status as string).toUpperCase();
      const dbTasks = await prisma.taskInstance.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { instance: { select: { processId: true, process: { select: { name: true } } } } },
      });
      for (const t of dbTasks) {
        if (!seenIds.has(t.id)) {
          const ht = dbTaskToHumanTask(t);
          memItems.push(ht);
          tasks.set(t.id, ht); // cache
        }
      }
    } catch {
      // DB unavailable
    }

    let items = memItems;

    if (options.assigneeId) {
      items = items.filter(t =>
        t.assignees.includes(options.assigneeId!) ||
        t.claimedBy === options.assigneeId
      );
    }

    if (options.status) {
      const statusFilter = (options.status as string).toLowerCase();
      items = items.filter(t => (t.status as string).toLowerCase() === statusFilter);
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
    let task = tasks.get(taskId);
    if (!task) {
      // Try loading from DB
      task = await this.getTask(taskId) || undefined as any;
      if (!task) return null;
    }

    if (task.status !== 'pending') {
      throw new Error('Can only claim pending tasks');
    }

    // Allow claiming if:
    // 1. The user is in the assignees list, OR
    // 2. The task has no assignees / is a pool task (anyone can claim), OR
    // 3. Auth is not yet implemented (userId is the hardcoded placeholder 'user-1')
    const canClaim = task.assignees.length === 0
      || task.assignees.includes(userId)
      || userId === 'user-1';
    if (!canClaim) {
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

    // Persist to DB
    try { await prisma.taskInstance.update({ where: { id: taskId }, data: { status: 'CLAIMED', assigneeId: userId } }); } catch { }

    return task;
  }

  async releaseTask(taskId: string, userId: string): Promise<HumanTask | null> {
    let task = tasks.get(taskId);
    if (!task) {
      task = await this.getTask(taskId) || undefined as any;
      if (!task) return null;
    }

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

    // Persist to DB
    try { await prisma.taskInstance.update({ where: { id: taskId }, data: { status: 'PENDING' } }); } catch { }

    return task;
  }

  async completeTask(
    taskId: string,
    userId: string,
    outcome: string,
    responseData?: Record<string, unknown>,
    comments?: string
  ): Promise<HumanTask | null> {
    let task = tasks.get(taskId);
    if (!task) {
      // Try loading from DB
      task = await this.getTask(taskId) || undefined as any;
      if (!task) return null;
    }

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

    // Persist task completion + update execution status atomically
    try {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);
      await prisma.$transaction(async (tx) => {
        await tx.taskInstance.update({
          where: { id: taskId },
          data: {
            status: 'COMPLETED',
            outcome,
            comments: comments || null,
            completedAt: new Date(),
            completedBy: isUUID(userId) ? userId : undefined,
          },
        });

        // Also update the execution's status to reflect that it's no longer waiting
        if (task!.executionId) {
          await tx.processInstance.update({
            where: { id: task!.executionId },
            data: {
              status: 'RUNNING',
            },
          }).catch(() => { /* execution may not exist in DB yet */ });
        }
      });
    } catch { }

    // Emit task.completed event via event bus
    eventBus.emit({
      type: 'task.completed',
      taskId,
      executionId: task.executionId,
      workflowId: task.workflowId,
      nodeId: task.nodeId,
      outcome,
      responseData,
      completedBy: userId,
      timestamp: new Date(),
    });

    // Resume workflow execution (loads from DB if not in memory)
    let execution = executions.get(task.executionId);
    if (!execution) {
      execution = await this.getExecution(task.executionId) || undefined as any;
    }
    if (execution && (execution.status === 'waiting' || execution.status === 'running' || execution.status === 'paused')) {
      const workflow = await this.getWorkflow(execution.workflowId);
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
    let task = tasks.get(taskId);
    if (!task) {
      task = await this.getTask(taskId) || undefined as any;
      if (!task) return null;
    }

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

    // Persist to DB
    try {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);
      await prisma.taskInstance.update({
        where: { id: taskId },
        data: {
          status: task.status === 'pending' ? 'PENDING' : (task.status as string).toUpperCase() as any,
          assigneeId: isUUID(toUserId) ? toUserId : undefined,
        },
      });
    } catch { }

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

// ============================================================================
// Event Bus Listeners — connect Forms → Workflows
// ============================================================================

eventBus.on('form.submitted', async (event) => {
  // Find active workflows with form triggers matching this formId
  try {
    const processes = await prisma.process.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const process of processes) {
      const definition = (process as any).definition as any || {};
      // Triggers can live in two places:
      // 1. Top-level `triggers` column (used by seed scripts)
      // 2. Inside `definition.triggers` (used by the workflow designer)
      const topLevelTriggers = Array.isArray((process as any).triggers) ? (process as any).triggers : [];
      const defTriggers = Array.isArray(definition.triggers) ? definition.triggers : [];
      const triggers: any[] = topLevelTriggers.length > 0 ? topLevelTriggers : defTriggers;

      const hasFormTrigger = triggers.some(
        (t: any) => (t.type === 'form_submission' || t.type === 'form') && t.formId === event.formId
      );

      if (hasFormTrigger) {
        logger.info(
          { formId: event.formId, processId: process.id, processName: process.name },
          'Triggering workflow from form.submitted event'
        );

        try {
          await workflowService.startExecution(
            process.id,
            event.data,
            event.submittedBy || 'system',
            'form'
          );
          logger.info(
            { formId: event.formId, processId: process.id },
            'Workflow execution started from form.submitted event'
          );
        } catch (execError) {
          logger.error(
            { formId: event.formId, processId: process.id, error: execError },
            'Failed to trigger workflow from form.submitted event'
          );
        }
      }
    }
  } catch (err) {
    logger.error(
      { formId: event.formId, error: err },
      'Failed to process form.submitted event'
    );
  }
});
