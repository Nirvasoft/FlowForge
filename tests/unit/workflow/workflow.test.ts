/**
 * FlowForge Workflow Engine Tests
 */

import { WorkflowService } from '../src/services/workflow/workflow.service';
import { WorkflowEngine } from '../src/services/workflow/engine';
import type { Workflow } from '../src/types/workflow';

describe('Workflow Service', () => {
  let service: WorkflowService;

  beforeEach(() => {
    service = new WorkflowService();
  });

  describe('Workflow CRUD', () => {
    test('creates a workflow with start and end nodes', async () => {
      const workflow = await service.createWorkflow({
        name: 'Test Workflow',
        createdBy: 'user-1',
      });

      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.status).toBe('draft');
      expect(workflow.nodes).toHaveLength(2);
      expect(workflow.edges).toHaveLength(1);
    });

    test('updates a workflow', async () => {
      const created = await service.createWorkflow({ name: 'Test', createdBy: 'user-1' });
      const updated = await service.updateWorkflow(created.id, { name: 'Updated' });
      expect(updated?.name).toBe('Updated');
    });

    test('deletes a workflow', async () => {
      const created = await service.createWorkflow({ name: 'Test', createdBy: 'user-1' });
      expect(await service.deleteWorkflow(created.id)).toBe(true);
      expect(await service.getWorkflow(created.id)).toBeNull();
    });
  });

  describe('Node Management', () => {
    test('adds and removes nodes', async () => {
      const workflow = await service.createWorkflow({ name: 'Test', createdBy: 'user-1' });
      
      const node = await service.addNode(workflow.id, {
        type: 'script',
        name: 'Script',
        position: { x: 100, y: 100 },
        config: { type: 'script', language: 'javascript', code: '' },
      });

      expect(node?.id).toBeDefined();
      
      const updated = await service.getWorkflow(workflow.id);
      expect(updated?.nodes).toHaveLength(3);

      await service.deleteNode(workflow.id, node!.id);
      const afterDelete = await service.getWorkflow(workflow.id);
      expect(afterDelete?.nodes).toHaveLength(2);
    });
  });

  describe('Publishing', () => {
    test('publishes and unpublishes workflow', async () => {
      const workflow = await service.createWorkflow({ name: 'Test', createdBy: 'user-1' });
      
      const published = await service.publishWorkflow(workflow.id, 'user-1');
      expect(published?.status).toBe('published');
      expect(published?.version).toBe(2);

      const unpublished = await service.unpublishWorkflow(workflow.id);
      expect(unpublished?.status).toBe('draft');
    });

    test('validates workflow', async () => {
      const workflow = await service.createWorkflow({ name: 'Test', createdBy: 'user-1' });
      const validation = service.validateWorkflow(workflow);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Execution', () => {
    test('starts and tracks execution', async () => {
      const workflow = await service.createWorkflow({ name: 'Test', createdBy: 'user-1' });
      await service.publishWorkflow(workflow.id, 'user-1');

      const execution = await service.startExecution(workflow.id, { value: 42 });
      expect(execution.id).toBeDefined();
      expect(execution.input).toEqual({ value: 42 });

      const found = await service.getExecution(execution.id);
      expect(found?.id).toBe(execution.id);
    });
  });

  describe('Human Tasks', () => {
    test('creates and completes task', async () => {
      const task = await service.createTask({
        executionId: 'exec-1',
        nodeId: 'node-1',
        workflowId: 'wf-1',
        type: 'approval',
        title: 'Approve Request',
        assignees: ['user-1'],
      });

      expect(task.status).toBe('pending');

      await service.claimTask(task.id, 'user-1');
      const claimed = await service.getTask(task.id);
      expect(claimed?.status).toBe('claimed');

      const completed = await service.completeTask(task.id, 'user-1', 'approved');
      expect(completed?.status).toBe('completed');
      expect(completed?.outcome).toBe('approved');
    });

    test('delegates task', async () => {
      const task = await service.createTask({
        executionId: 'exec-1',
        nodeId: 'node-1',
        workflowId: 'wf-1',
        type: 'approval',
        title: 'Test',
        assignees: ['user-1'],
      });

      const delegated = await service.delegateTask(task.id, 'user-1', 'user-2');
      expect(delegated?.assignees).toContain('user-2');
      expect(delegated?.assignees).not.toContain('user-1');
    });
  });
});

describe('Workflow Engine', () => {
  const engine = new WorkflowEngine();

  const createWorkflow = (nodes: any[], edges: any[]): Workflow => ({
    id: 'test-wf',
    name: 'Test',
    slug: 'test',
    version: 1,
    status: 'published',
    nodes,
    edges,
    triggers: [],
    variables: [],
    settings: {
      timeout: 3600,
      retryPolicy: { enabled: false, maxAttempts: 1, backoffType: 'fixed', initialDelay: 1000, maxDelay: 1000 },
      errorHandling: 'stop',
      logging: 'standard',
      concurrency: 1,
      priority: 'normal',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test',
  });

  test('executes simple workflow', async () => {
    const workflow = createWorkflow(
      [
        { id: 'start', type: 'start', name: 'Start', position: { x: 0, y: 0 }, config: { type: 'start' } },
        { id: 'end', type: 'end', name: 'End', position: { x: 0, y: 100 }, config: { type: 'end' } },
      ],
      [{ id: 'e1', source: 'start', target: 'end' }]
    );

    const execution = await engine.startExecution(workflow, {});
    expect(execution.status).toBe('completed');
  });

  test('executes decision node', async () => {
    const workflow = createWorkflow(
      [
        { id: 'start', type: 'start', name: 'Start', position: { x: 0, y: 0 }, config: { type: 'start' } },
        { id: 'decision', type: 'decision', name: 'Check', position: { x: 0, y: 50 }, 
          config: { type: 'decision', condition: 'value > 10', trueLabel: 'yes', falseLabel: 'no' } },
        { id: 'end-yes', type: 'end', name: 'Yes', position: { x: -50, y: 100 }, config: { type: 'end' } },
        { id: 'end-no', type: 'end', name: 'No', position: { x: 50, y: 100 }, config: { type: 'end' } },
      ],
      [
        { id: 'e1', source: 'start', target: 'decision' },
        { id: 'e2', source: 'decision', target: 'end-yes', sourceHandle: 'true', label: 'yes' },
        { id: 'e3', source: 'decision', target: 'end-no', sourceHandle: 'false', label: 'no' },
      ]
    );

    const execution = await engine.startExecution(workflow, { value: 15 });
    expect(execution.status).toBe('completed');
    expect(execution.completedNodes).toContain('end-yes');
  });

  test('sets variables', async () => {
    const workflow = createWorkflow(
      [
        { id: 'start', type: 'start', name: 'Start', position: { x: 0, y: 0 }, config: { type: 'start' } },
        { id: 'set', type: 'setVariable', name: 'Set', position: { x: 0, y: 50 }, 
          config: { type: 'setVariable', assignments: [{ variable: 'result', value: 'input * 2' }] } },
        { id: 'end', type: 'end', name: 'End', position: { x: 0, y: 100 }, config: { type: 'end' } },
      ],
      [
        { id: 'e1', source: 'start', target: 'set' },
        { id: 'e2', source: 'set', target: 'end' },
      ]
    );

    const execution = await engine.startExecution(workflow, { input: 21 });
    expect(execution.status).toBe('completed');
    expect(execution.variables.result).toBe(42);
  });

  test('handles delay node', async () => {
    const workflow = createWorkflow(
      [
        { id: 'start', type: 'start', name: 'Start', position: { x: 0, y: 0 }, config: { type: 'start' } },
        { id: 'delay', type: 'delay', name: 'Wait', position: { x: 0, y: 50 }, 
          config: { type: 'delay', duration: 10 } },
        { id: 'end', type: 'end', name: 'End', position: { x: 0, y: 100 }, config: { type: 'end' } },
      ],
      [
        { id: 'e1', source: 'start', target: 'delay' },
        { id: 'e2', source: 'delay', target: 'end' },
      ]
    );

    const start = Date.now();
    const execution = await engine.startExecution(workflow, {});
    const duration = Date.now() - start;

    expect(execution.status).toBe('completed');
    expect(duration).toBeGreaterThanOrEqual(10);
  });
});
