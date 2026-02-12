/**
 * FlowForge Workflow API Routes
 * REST endpoints for workflow management, execution, and tasks
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WorkflowService, workflowService } from '../../services/workflow/workflow.service';
import type { WorkflowNode, WorkflowEdge, WorkflowTrigger, WorkflowVariable } from '../../types/workflow';
import { prisma } from '../../utils/prisma.js';

interface IdParams {
  id: string;
}

interface NodeParams extends IdParams {
  nodeId: string;
}

interface EdgeParams extends IdParams {
  edgeId: string;
}

interface TriggerParams extends IdParams {
  triggerId: string;
}

interface TaskParams {
  taskId: string;
}

export async function workflowRoutes(fastify: FastifyInstance) {
  const service = workflowService;

  // ============================================================================
  // Workflow CRUD
  // ============================================================================

  // List workflows
  fastify.get('/', {
    schema: { description: 'List workflows', tags: ['Workflows'] },
  }, async (request: FastifyRequest<{ Querystring: { status?: string; search?: string; page?: number; pageSize?: number } }>, reply) => {
    // First try the in-memory service
    const result = await service.listWorkflows(request.query as any);

    // If in-memory store has workflows, return them
    if (result.workflows.length > 0) {
      return result;
    }

    // Fallback: also query Prisma Process table for seeded/DB-stored workflows
    const query = request.query;
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [processes, total] = await Promise.all([
      prisma.process.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.process.count({ where }),
    ]);

    return {
      workflows: processes.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status?.toLowerCase() || 'draft',
        version: p.version,
        nodes: [],
        edges: [],
        triggers: [],
        variables: [],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        createdBy: p.createdBy,
      })),
      total,
    };
  });

  // Create workflow
  fastify.post<{ Body: { name: string; description?: string } }>('/', {
    schema: { description: 'Create a workflow', tags: ['Workflows'] },
  }, async (request, reply) => {
    const userId = 'user-1'; // TODO: Get from auth
    const workflow = await service.createWorkflow({
      ...request.body,
      createdBy: userId,
    });
    reply.status(201);
    return workflow;
  });

  // Get workflow
  fastify.get<{ Params: IdParams }>('/:id', {
    schema: { description: 'Get a workflow', tags: ['Workflows'] },
  }, async (request, reply) => {
    // Try in-memory service first
    const workflow = await service.getWorkflow(request.params.id);
    if (workflow) {
      return workflow;
    }

    // Fallback: query Prisma Process table for seeded/DB-stored workflows
    const process = await prisma.process.findUnique({
      where: { id: request.params.id },
    });
    if (!process) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }

    // Parse the definition JSON to extract nodes and edges
    const definition = (process as any).definition as any || {};
    const nodes = Array.isArray(definition.nodes) ? definition.nodes : [];
    const edges = Array.isArray(definition.edges) ? definition.edges : [];

    return {
      id: process.id,
      name: process.name,
      description: process.description,
      status: process.status?.toLowerCase() || 'draft',
      version: process.version,
      nodes,
      edges,
      triggers: definition.triggers || [],
      variables: definition.variables || [],
      createdAt: process.createdAt,
      updatedAt: process.updatedAt,
      createdBy: process.createdBy,
    };
  });

  // Update workflow
  fastify.patch<{ Params: IdParams; Body: { name?: string; description?: string; settings?: any; nodes?: any[]; edges?: any[] } }>('/:id', {
    schema: { description: 'Update a workflow', tags: ['Workflows'] },
  }, async (request, reply) => {
    const { nodes: bodyNodes, edges: bodyEdges, ...metadataUpdates } = request.body;

    // Try the in-memory service first
    let workflow = await service.updateWorkflow(request.params.id, metadataUpdates);

    // If not in memory, load from DB and populate in-memory store
    if (!workflow) {
      const process = await prisma.process.findUnique({
        where: { id: request.params.id },
      });
      if (!process) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }

      const definition = (process as any).definition as any || {};
      const existingNodes = Array.isArray(definition.nodes) ? definition.nodes : [];
      const existingEdges = Array.isArray(definition.edges) ? definition.edges : [];

      // Build in-memory workflow object
      workflow = {
        id: process.id,
        name: metadataUpdates.name || process.name,
        slug: (metadataUpdates.name || process.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        description: metadataUpdates.description || process.description || undefined,
        version: process.version,
        status: (process.status?.toLowerCase() as any) || 'draft',
        nodes: bodyNodes || existingNodes,
        edges: bodyEdges || existingEdges,
        triggers: definition.triggers || [],
        variables: definition.variables || [],
        settings: metadataUpdates.settings || { timeout: 3600, retryPolicy: { enabled: true, maxAttempts: 3, backoffType: 'exponential', initialDelay: 1000, maxDelay: 60000 }, errorHandling: 'stop', logging: 'standard', concurrency: 10, priority: 'normal' },
        createdAt: process.createdAt,
        updatedAt: new Date(),
        createdBy: process.createdBy || 'system',
      } as any;

      // Also update Prisma with the new definition
      await prisma.process.update({
        where: { id: request.params.id },
        data: {
          name: workflow!.name,
          description: workflow!.description || null,
          definition: { nodes: workflow!.nodes, edges: workflow!.edges, triggers: workflow!.triggers || [], variables: workflow!.variables || [] } as any,
          updatedAt: new Date(),
        },
      });
    } else if (bodyNodes || bodyEdges) {
      // In-memory workflow exists, update its nodes/edges
      if (bodyNodes) workflow.nodes = bodyNodes;
      if (bodyEdges) workflow.edges = bodyEdges;
      workflow.updatedAt = new Date();
    }

    return workflow;
  });

  // Delete workflow
  fastify.delete<{ Params: IdParams }>('/:id', {
    schema: { description: 'Delete a workflow', tags: ['Workflows'] },
  }, async (request, reply) => {
    const deleted = await service.deleteWorkflow(request.params.id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    return { success: true };
  });

  // Validate workflow
  fastify.post<{ Params: IdParams }>('/:id/validate', {
    schema: { description: 'Validate a workflow', tags: ['Workflows'] },
  }, async (request, reply) => {
    const workflow = await service.getWorkflow(request.params.id);
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    return service.validateWorkflow(workflow);
  });

  // Publish workflow
  fastify.post<{ Params: IdParams }>('/:id/publish', {
    schema: { description: 'Publish a workflow', tags: ['Workflows'] },
  }, async (request, reply) => {
    const userId = 'user-1';
    try {
      const workflow = await service.publishWorkflow(request.params.id, userId);
      if (!workflow) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }
      return workflow;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Unpublish workflow
  fastify.post<{ Params: IdParams }>('/:id/unpublish', {
    schema: { description: 'Unpublish a workflow', tags: ['Workflows'] },
  }, async (request, reply) => {
    const workflow = await service.unpublishWorkflow(request.params.id);
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    return workflow;
  });

  // Archive workflow
  fastify.post<{ Params: IdParams }>('/:id/archive', {
    schema: { description: 'Archive a workflow', tags: ['Workflows'] },
  }, async (request, reply) => {
    const workflow = await service.archiveWorkflow(request.params.id);
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    return workflow;
  });

  // ============================================================================
  // Node Management
  // ============================================================================

  // Add node
  fastify.post<{ Params: IdParams; Body: Omit<WorkflowNode, 'id'> }>('/:id/nodes', {
    schema: { description: 'Add a node to workflow', tags: ['Workflows'] },
  }, async (request, reply) => {
    const node = await service.addNode(request.params.id, request.body);
    if (!node) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    reply.status(201);
    return node;
  });

  // Update node
  fastify.patch<{ Params: NodeParams; Body: Partial<Omit<WorkflowNode, 'id'>> }>('/:id/nodes/:nodeId', {
    schema: { description: 'Update a node', tags: ['Workflows'] },
  }, async (request, reply) => {
    const node = await service.updateNode(request.params.id, request.params.nodeId, request.body);
    if (!node) {
      return reply.status(404).send({ error: 'Node not found' });
    }
    return node;
  });

  // Delete node
  fastify.delete<{ Params: NodeParams }>('/:id/nodes/:nodeId', {
    schema: { description: 'Delete a node', tags: ['Workflows'] },
  }, async (request, reply) => {
    const deleted = await service.deleteNode(request.params.id, request.params.nodeId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Node not found' });
    }
    return { success: true };
  });

  // ============================================================================
  // Edge Management
  // ============================================================================

  // Add edge
  fastify.post<{ Params: IdParams; Body: Omit<WorkflowEdge, 'id'> }>('/:id/edges', {
    schema: { description: 'Add an edge to workflow', tags: ['Workflows'] },
  }, async (request, reply) => {
    const edge = await service.addEdge(request.params.id, request.body);
    if (!edge) {
      return reply.status(400).send({ error: 'Invalid edge or workflow not found' });
    }
    reply.status(201);
    return edge;
  });

  // Update edge
  fastify.patch<{ Params: EdgeParams; Body: Partial<Omit<WorkflowEdge, 'id'>> }>('/:id/edges/:edgeId', {
    schema: { description: 'Update an edge', tags: ['Workflows'] },
  }, async (request, reply) => {
    const edge = await service.updateEdge(request.params.id, request.params.edgeId, request.body);
    if (!edge) {
      return reply.status(404).send({ error: 'Edge not found' });
    }
    return edge;
  });

  // Delete edge
  fastify.delete<{ Params: EdgeParams }>('/:id/edges/:edgeId', {
    schema: { description: 'Delete an edge', tags: ['Workflows'] },
  }, async (request, reply) => {
    const deleted = await service.deleteEdge(request.params.id, request.params.edgeId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Edge not found' });
    }
    return { success: true };
  });

  // ============================================================================
  // Trigger Management
  // ============================================================================

  // Add trigger
  fastify.post<{ Params: IdParams; Body: Omit<WorkflowTrigger, 'id'> }>('/:id/triggers', {
    schema: { description: 'Add a trigger to workflow', tags: ['Workflows'] },
  }, async (request, reply) => {
    const trigger = await service.addTrigger(request.params.id, request.body);
    if (!trigger) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    reply.status(201);
    return trigger;
  });

  // Update trigger
  fastify.patch<{ Params: TriggerParams; Body: Partial<Omit<WorkflowTrigger, 'id'>> }>('/:id/triggers/:triggerId', {
    schema: { description: 'Update a trigger', tags: ['Workflows'] },
  }, async (request, reply) => {
    const trigger = await service.updateTrigger(request.params.id, request.params.triggerId, request.body);
    if (!trigger) {
      return reply.status(404).send({ error: 'Trigger not found' });
    }
    return trigger;
  });

  // Delete trigger
  fastify.delete<{ Params: TriggerParams }>('/:id/triggers/:triggerId', {
    schema: { description: 'Delete a trigger', tags: ['Workflows'] },
  }, async (request, reply) => {
    const deleted = await service.deleteTrigger(request.params.id, request.params.triggerId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Trigger not found' });
    }
    return { success: true };
  });

  // ============================================================================
  // Variable Management
  // ============================================================================

  // Set variables
  fastify.put<{ Params: IdParams; Body: { variables: WorkflowVariable[] } }>('/:id/variables', {
    schema: { description: 'Set workflow variables', tags: ['Workflows'] },
  }, async (request, reply) => {
    const success = await service.setVariables(request.params.id, request.body.variables);
    if (!success) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    return { success: true };
  });

  // ============================================================================
  // Execution
  // ============================================================================

  // Start execution
  fastify.post<{ Params: IdParams; Body: { input?: Record<string, unknown> } }>('/:id/execute', {
    schema: { description: 'Start workflow execution', tags: ['Executions'] },
  }, async (request, reply) => {
    const userId = 'user-1';
    try {
      const execution = await service.startExecution(
        request.params.id,
        request.body.input,
        userId,
        'manual'
      );
      reply.status(201);
      return execution;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // List executions
  fastify.get<{ Params: IdParams; Querystring: { status?: string; page?: number; pageSize?: number } }>('/:id/executions', {
    schema: { description: 'List workflow executions', tags: ['Executions'] },
  }, async (request, reply) => {
    const result = await service.listExecutions({
      workflowId: request.params.id,
      ...request.query as any,
    });
    return result;
  });
}

// ============================================================================
// Execution Routes (separate prefix)
// ============================================================================

export async function executionRoutes(fastify: FastifyInstance) {
  const service = workflowService;

  // List all executions
  fastify.get('/', {
    schema: { description: 'List all executions', tags: ['Executions'] },
  }, async (request: FastifyRequest<{ Querystring: { workflowId?: string; status?: string; page?: number; pageSize?: number } }>, reply) => {
    const result = await service.listExecutions(request.query as any);

    // If in-memory has data, return it
    if (result.executions && result.executions.length > 0) {
      return result;
    }

    // Fallback: query Prisma ProcessInstance table
    const query = request.query;
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};
    if (query.workflowId) where.processId = query.workflowId;
    if (query.status) where.status = query.status;

    const [instances, total] = await Promise.all([
      prisma.processInstance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startedAt: 'desc' },
        include: { process: { select: { name: true } } },
      }),
      prisma.processInstance.count({ where }),
    ]);

    return {
      executions: instances.map(inst => ({
        id: inst.id,
        workflowId: inst.processId,
        workflowName: (inst as any).process?.name,
        status: inst.status,
        currentNodes: inst.currentNodes,
        variables: inst.variables,
        startedBy: inst.startedBy,
        startedAt: inst.startedAt,
        completedAt: inst.completedAt,
        dueAt: inst.dueAt,
      })),
      total,
      page,
      pageSize,
    };
  });

  // Get execution
  fastify.get<{ Params: IdParams }>('/:id', {
    schema: { description: 'Get an execution', tags: ['Executions'] },
  }, async (request, reply) => {
    const execution = await service.getExecution(request.params.id);
    if (!execution) {
      return reply.status(404).send({ error: 'Execution not found' });
    }
    return execution;
  });

  // Cancel execution
  fastify.post<{ Params: IdParams }>('/:id/cancel', {
    schema: { description: 'Cancel an execution', tags: ['Executions'] },
  }, async (request, reply) => {
    try {
      const execution = await service.cancelExecution(request.params.id);
      if (!execution) {
        return reply.status(404).send({ error: 'Execution not found' });
      }
      return execution;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Pause execution
  fastify.post<{ Params: IdParams }>('/:id/pause', {
    schema: { description: 'Pause an execution', tags: ['Executions'] },
  }, async (request, reply) => {
    try {
      const execution = await service.pauseExecution(request.params.id);
      if (!execution) {
        return reply.status(404).send({ error: 'Execution not found' });
      }
      return execution;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Resume execution
  fastify.post<{ Params: IdParams; Body: { data?: Record<string, unknown> } }>('/:id/resume', {
    schema: { description: 'Resume an execution', tags: ['Executions'] },
  }, async (request, reply) => {
    try {
      const execution = await service.resumeExecution(request.params.id, request.body.data);
      if (!execution) {
        return reply.status(404).send({ error: 'Execution not found' });
      }
      return execution;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });
}

// ============================================================================
// Task Routes (separate prefix)
// ============================================================================

export async function taskRoutes(fastify: FastifyInstance) {
  const service = workflowService;

  // List tasks
  fastify.get('/', {
    schema: { description: 'List tasks', tags: ['Tasks'] },
  }, async (request: FastifyRequest<{ Querystring: { assigneeId?: string; status?: string; workflowId?: string; page?: number; pageSize?: number } }>, reply) => {
    const result = await service.listTasks(request.query as any);

    // If in-memory has data, return it
    if (result.tasks && result.tasks.length > 0) {
      return result;
    }

    // Fallback: query Prisma TaskInstance table
    const query = request.query;
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.status) where.status = query.status;

    const [tasks, total] = await Promise.all([
      prisma.taskInstance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          instance: {
            select: { process: { select: { name: true } } },
          },
        },
      }),
      prisma.taskInstance.count({ where }),
    ]);

    return {
      tasks: tasks.map(task => ({
        id: task.id,
        instanceId: task.instanceId,
        nodeId: task.nodeId,
        name: task.name,
        description: task.description,
        taskType: task.taskType,
        assigneeId: task.assigneeId,
        assigneeType: task.assigneeType,
        formData: task.formData,
        status: task.status,
        priority: task.priority,
        outcome: task.outcome,
        comments: task.comments,
        dueAt: task.dueAt,
        completedAt: task.completedAt,
        completedBy: task.completedBy,
        createdAt: task.createdAt,
        workflowName: (task as any).instance?.process?.name,
      })),
      total,
      page,
      pageSize,
    };
  });

  // Get my tasks
  fastify.get('/my', {
    schema: { description: 'Get my tasks', tags: ['Tasks'] },
  }, async (request, reply) => {
    const userId = 'user-1'; // TODO: Get from auth
    const result = await service.listTasks({ assigneeId: userId });
    return result;
  });

  // Get task
  fastify.get<{ Params: TaskParams }>('/:taskId', {
    schema: { description: 'Get a task', tags: ['Tasks'] },
  }, async (request, reply) => {
    const task = await service.getTask(request.params.taskId);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }
    return task;
  });

  // Claim task
  fastify.post<{ Params: TaskParams }>('/:taskId/claim', {
    schema: { description: 'Claim a task', tags: ['Tasks'] },
  }, async (request, reply) => {
    const userId = 'user-1';
    try {
      // Try in-memory first
      const task = await service.claimTask(request.params.taskId, userId);
      if (task) return task;

      // Fallback: update in Prisma
      const dbTask = await prisma.taskInstance.findUnique({ where: { id: request.params.taskId } });
      if (!dbTask) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      if (dbTask.status !== 'PENDING') {
        return reply.status(400).send({ error: 'Can only claim pending tasks' });
      }
      const updated = await prisma.taskInstance.update({
        where: { id: request.params.taskId },
        data: { status: 'CLAIMED', assigneeId: dbTask.assigneeId },
      });
      return updated;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Release task
  fastify.post<{ Params: TaskParams }>('/:taskId/release', {
    schema: { description: 'Release a claimed task', tags: ['Tasks'] },
  }, async (request, reply) => {
    const userId = 'user-1';
    try {
      const task = await service.releaseTask(request.params.taskId, userId);
      if (task) return task;

      // Fallback: update in Prisma
      const dbTask = await prisma.taskInstance.findUnique({ where: { id: request.params.taskId } });
      if (!dbTask) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      const updated = await prisma.taskInstance.update({
        where: { id: request.params.taskId },
        data: { status: 'PENDING' },
      });
      return updated;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Complete task
  fastify.post<{ Params: TaskParams; Body: { outcome: string; data?: Record<string, unknown>; comments?: string } }>('/:taskId/complete', {
    schema: { description: 'Complete a task', tags: ['Tasks'] },
  }, async (request, reply) => {
    const userId = 'user-1';
    try {
      // Try in-memory first
      const task = await service.completeTask(
        request.params.taskId,
        userId,
        request.body.outcome,
        request.body.data,
        request.body.comments
      );
      if (task) return task;

      // Fallback: update in Prisma
      const dbTask = await prisma.taskInstance.findUnique({ where: { id: request.params.taskId } });
      if (!dbTask) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      if (dbTask.status === 'COMPLETED' || dbTask.status === 'CANCELLED') {
        return reply.status(400).send({ error: 'Task is not in a completable state' });
      }
      const updated = await prisma.taskInstance.update({
        where: { id: request.params.taskId },
        data: {
          status: 'COMPLETED',
          outcome: request.body.outcome,
          comments: request.body.comments,
          completedAt: new Date(),
          completedBy: dbTask.assigneeId,
        },
      });
      return updated;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Delegate task
  fastify.post<{ Params: TaskParams; Body: { toUserId: string } }>('/:taskId/delegate', {
    schema: { description: 'Delegate a task', tags: ['Tasks'] },
  }, async (request, reply) => {
    const userId = 'user-1';
    try {
      const task = await service.delegateTask(
        request.params.taskId,
        userId,
        request.body.toUserId
      );
      if (!task) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      return task;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });
}
