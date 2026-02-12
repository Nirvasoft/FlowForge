import apiClient, { get, post, patch, del } from './client';
import type { Process, ProcessInstance, Task, PaginatedResponse, Workflow, WorkflowNode, WorkflowEdge } from '../types';

interface ListProcessesParams {
    page?: number;
    limit?: number;
    status?: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
    search?: string;
}

interface CreateProcessData {
    name: string;
    description?: string;
    definition?: Record<string, unknown>;
}

interface UpdateProcessData {
    name?: string;
    description?: string;
    status?: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
    definition?: Record<string, unknown>;
}

interface ListTasksParams {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'CLAIMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED';
    assigneeId?: string;
}

/**
 * List workflow processes
 */
export async function listProcesses(params: ListProcessesParams = {}): Promise<PaginatedResponse<Process>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);

    const response = await apiClient.get(`/workflows?${searchParams.toString()}`);
    const body = response.data;
    // Backend may return { workflows: [...], total } or { success, data, pagination }
    const items = body.workflows || body.data || [];
    const total = body.total ?? body.pagination?.total ?? items.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

/**
 * Get a single process by ID
 */
export async function getProcess(id: string): Promise<Process> {
    return get<Process>(`/workflows/${id}`);
}

/**
 * Create a new process
 */
export async function createProcess(data: CreateProcessData): Promise<Process> {
    return post<Process>('/workflows', data);
}

/**
 * Update a process
 */
export async function updateProcess(id: string, data: UpdateProcessData): Promise<Process> {
    return patch<Process>(`/workflows/${id}`, data);
}

/**
 * Delete a process
 */
export async function deleteProcess(id: string): Promise<void> {
    await del(`/workflows/${id}`);
}

/**
 * Start a process instance
 */
export async function startProcess(
    processId: string,
    variables?: Record<string, unknown>
): Promise<ProcessInstance> {
    return post<ProcessInstance>(`/workflows/${processId}/start`, { variables });
}

/**
 * Execute a workflow (via the designer's /execute endpoint)
 */
export async function executeWorkflow(
    workflowId: string,
    input?: Record<string, unknown>
): Promise<any> {
    const response = await apiClient.post(`/workflows/${workflowId}/execute`, { input });
    return response.data;
}

/**
 * List process instances
 */
export async function listProcessInstances(processId: string): Promise<ProcessInstance[]> {
    return get<ProcessInstance[]>(`/workflows/${processId}/instances`);
}

/**
 * List all process instances across all workflows
 */
export async function listAllInstances(params: { status?: string } = {}): Promise<ProcessInstance[]> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);

    const response = await apiClient.get(`/executions?${searchParams.toString()}`);
    const body = response.data;
    // Backend returns { executions: [...], total, page, pageSize }
    return body.executions || body.data || [];
}

/**
 * Get a process instance
 */
export async function getProcessInstance(instanceId: string): Promise<ProcessInstance> {
    return get<ProcessInstance>(`/executions/${instanceId}`);
}

/**
 * Cancel a process instance
 */
export async function cancelProcessInstance(instanceId: string): Promise<void> {
    await post(`/executions/${instanceId}/cancel`);
}

/**
 * List tasks
 */
export async function listTasks(params: ListTasksParams = {}): Promise<PaginatedResponse<Task>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.assigneeId) searchParams.set('assigneeId', params.assigneeId);

    const response = await apiClient.get(`/tasks?${searchParams.toString()}`);
    const body = response.data;
    // Backend may return { tasks: [...], total } or { success, data, pagination }
    const items = body.tasks || body.data || [];
    const total = body.total ?? body.pagination?.total ?? items.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

/**
 * Get a task by ID
 */
export async function getTask(taskId: string): Promise<Task> {
    return get<Task>(`/tasks/${taskId}`);
}

/**
 * Complete a task
 */
export async function completeTask(
    taskId: string,
    output?: Record<string, unknown>
): Promise<void> {
    await post(`/tasks/${taskId}/complete`, { output });
}

/**
 * Assign a task
 */
export async function assignTask(taskId: string, assigneeId: string): Promise<void> {
    await post(`/tasks/${taskId}/assign`, { assigneeId });
}

// ============================================================================
// Workflow Designer API (for visual designer with nodes/edges)
// ============================================================================

interface CreateWorkflowData {
    name: string;
    description?: string;
}

interface UpdateWorkflowData {
    name?: string;
    description?: string;
    settings?: Record<string, unknown>;
}

interface WorkflowDefinition {
    nodes: Array<{
        id: string;
        type: string;
        position: { x: number; y: number };
        data: Record<string, unknown>;
    }>;
    edges: Array<{
        id: string;
        source: string;
        target: string;
        sourceHandle?: string;
        targetHandle?: string;
        label?: string;
        style?: Record<string, unknown>;
    }>;
}

/**
 * Get a workflow with its full definition (nodes/edges)
 */
export async function getWorkflow(id: string): Promise<Workflow> {
    const response = await apiClient.get(`/workflows/${id}`);
    return response.data;
}

/**
 * Create a new workflow
 */
export async function createWorkflow(data: CreateWorkflowData): Promise<Workflow> {
    const response = await apiClient.post('/workflows', data);
    return response.data;
}

/**
 * Update workflow metadata
 */
export async function updateWorkflow(id: string, data: UpdateWorkflowData): Promise<Workflow> {
    const response = await apiClient.patch(`/workflows/${id}`, data);
    return response.data;
}

/**
 * Save workflow definition (nodes and edges) via bulk update
 * This sends a PUT request to update all nodes and edges at once
 */
export async function saveWorkflowDefinition(
    workflowId: string,
    definition: WorkflowDefinition
): Promise<Workflow> {
    // Convert React Flow nodes/edges to backend format
    const nodes: WorkflowNode[] = definition.nodes.map((node) => ({
        id: node.id,
        type: node.type as any,
        name: (node.data.label as string) || node.type,
        description: node.data.description as string | undefined,
        position: node.position,
        config: node.data,
        onError: node.data.onError as 'stop' | 'continue' | 'goto' | undefined,
    }));

    const edges: WorkflowEdge[] = definition.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label,
    }));

    // Send bulk update
    const response = await apiClient.patch(`/workflows/${workflowId}`, {
        nodes,
        edges,
    });
    return response.data;
}

/**
 * Export workflow definition types for use in components
 */
export type { WorkflowDefinition, CreateWorkflowData, UpdateWorkflowData };
