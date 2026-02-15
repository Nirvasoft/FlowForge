/**
 * FlowForge App Actions Service
 *
 * Executes workflow-related actions triggered by App Builder component events.
 * This bridges the gap between the App Builder UI layer and the Workflow engine,
 * allowing buttons, forms, and other components to start workflows, claim tasks,
 * and complete tasks directly from within a built application.
 */

import { workflowService } from '../workflow/workflow.service';
import { eventBus } from '../events/event-bus';
import pino from 'pino';

const logger = pino({ name: 'app-actions' });

// ============================================================================
// Types
// ============================================================================

export type AppActionType =
    | 'startWorkflow'
    | 'claimTask'
    | 'completeTask'
    | 'triggerWorkflow'
    | 'refreshData'
    | 'navigate'
    | 'showNotification';

export interface AppActionPayload {
    type: AppActionType;
    config: Record<string, unknown>;
    /** User who triggered the action */
    userId?: string;
    /** Source component ID in the app */
    sourceComponentId?: string;
    /** App ID where the action was triggered */
    appId?: string;
}

export interface AppActionResult {
    success: boolean;
    data?: unknown;
    error?: string;
}

// ============================================================================
// Action Handlers
// ============================================================================

const actionHandlers: Record<string, (payload: AppActionPayload) => Promise<AppActionResult>> = {

    /**
     * Start a new workflow execution
     * config: { workflowId: string, variables?: Record<string, unknown> }
     */
    async startWorkflow(payload) {
        const { workflowId, variables } = payload.config as {
            workflowId: string;
            variables?: Record<string, unknown>;
        };

        if (!workflowId) {
            return { success: false, error: 'workflowId is required' };
        }

        try {
            const execution = await workflowService.startExecution(
                workflowId,
                variables || {},
                payload.userId || 'app-action',
                'manual'
            );

            if (!execution) {
                return { success: false, error: 'Failed to start workflow — not found or inactive' };
            }

            logger.info({ workflowId, executionId: execution.id, appId: payload.appId }, 'App action: workflow started');

            eventBus.emit({
                type: 'app.action.executed',
                actionType: 'startWorkflow',
                appId: payload.appId,
                sourceComponentId: payload.sourceComponentId,
                result: { executionId: execution.id },
                timestamp: new Date().toISOString(),
            });

            return { success: true, data: { executionId: execution.id, status: execution.status } };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            logger.error({ workflowId, error: message }, 'App action: startWorkflow failed');
            return { success: false, error: message };
        }
    },

    /**
     * Claim a pending task
     * config: { taskId: string }
     */
    async claimTask(payload) {
        const { taskId } = payload.config as { taskId: string };

        if (!taskId) {
            return { success: false, error: 'taskId is required' };
        }

        try {
            const task = await workflowService.claimTask(taskId, payload.userId || 'app-action');

            if (!task) {
                return { success: false, error: 'Task not found or already claimed' };
            }

            logger.info({ taskId, userId: payload.userId }, 'App action: task claimed');

            eventBus.emit({
                type: 'app.action.executed',
                actionType: 'claimTask',
                appId: payload.appId,
                sourceComponentId: payload.sourceComponentId,
                result: { taskId: task.id, status: task.status },
                timestamp: new Date().toISOString(),
            });

            return { success: true, data: { taskId: task.id, status: task.status } };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            logger.error({ taskId, error: message }, 'App action: claimTask failed');
            return { success: false, error: message };
        }
    },

    /**
     * Complete a task with outcome
     * config: { taskId: string, outcome: string, responseData?: Record<string, unknown>, comments?: string }
     */
    async completeTask(payload) {
        const { taskId, outcome, responseData, comments } = payload.config as {
            taskId: string;
            outcome: string;
            responseData?: Record<string, unknown>;
            comments?: string;
        };

        if (!taskId || !outcome) {
            return { success: false, error: 'taskId and outcome are required' };
        }

        try {
            const task = await workflowService.completeTask(
                taskId,
                payload.userId || 'app-action',
                outcome,
                responseData,
                comments
            );

            if (!task) {
                return { success: false, error: 'Task not found or cannot be completed' };
            }

            logger.info({ taskId, outcome, userId: payload.userId }, 'App action: task completed');

            eventBus.emit({
                type: 'app.action.executed',
                actionType: 'completeTask',
                appId: payload.appId,
                sourceComponentId: payload.sourceComponentId,
                result: { taskId: task.id, outcome },
                timestamp: new Date().toISOString(),
            });

            return { success: true, data: { taskId: task.id, outcome } };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            logger.error({ taskId, error: message }, 'App action: completeTask failed');
            return { success: false, error: message };
        }
    },

    /**
     * Trigger a workflow by name (resolves workflow ID from name/slug)
     * config: { workflowName: string, variables?: Record<string, unknown> }
     */
    async triggerWorkflow(payload) {
        const { workflowName, workflowId, variables } = payload.config as {
            workflowName?: string;
            workflowId?: string;
            variables?: Record<string, unknown>;
        };

        const id = workflowId || workflowName;
        if (!id) {
            return { success: false, error: 'workflowId or workflowName is required' };
        }

        // Delegate to startWorkflow handler
        const handler = actionHandlers.startWorkflow;
        if (!handler) {
            return { success: false, error: 'startWorkflow handler not found' };
        }
        return handler({
            ...payload,
            config: { ...payload.config, workflowId: id },
        });
    },

    /**
     * Placeholder for client-side actions that are resolved on the frontend
     */
    async refreshData() {
        return { success: true, data: { action: 'refreshData' } };
    },

    async navigate() {
        return { success: true, data: { action: 'navigate' } };
    },

    async showNotification() {
        return { success: true, data: { action: 'showNotification' } };
    },
};

// ============================================================================
// App Actions Runner
// ============================================================================

export class AppActionsService {
    /**
     * Execute a single action
     */
    async execute(payload: AppActionPayload): Promise<AppActionResult> {
        const handler = actionHandlers[payload.type];
        if (!handler) {
            return { success: false, error: `Unknown action type: ${payload.type}` };
        }

        try {
            return await handler(payload);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Action execution failed';
            logger.error({ actionType: payload.type, error: message }, 'App action: execution error');
            return { success: false, error: message };
        }
    }

    /**
     * Execute multiple actions sequentially (action chain)
     */
    async executeChain(
        actions: AppActionPayload[],
        stopOnError = true
    ): Promise<AppActionResult[]> {
        const results: AppActionResult[] = [];

        for (const action of actions) {
            const result = await this.execute(action);
            results.push(result);

            if (!result.success && stopOnError) {
                break;
            }
        }

        return results;
    }

    /**
     * List available action types with metadata
     */
    getAvailableActions(): Array<{ type: AppActionType; label: string; description: string }> {
        return [
            { type: 'startWorkflow', label: 'Start Workflow', description: 'Start a new workflow execution' },
            { type: 'claimTask', label: 'Claim Task', description: 'Claim a pending task for the current user' },
            { type: 'completeTask', label: 'Complete Task', description: 'Complete a task with an outcome' },
            { type: 'triggerWorkflow', label: 'Trigger Workflow', description: 'Trigger a workflow by name or ID' },
            { type: 'refreshData', label: 'Refresh Data', description: 'Refresh component data bindings' },
            { type: 'navigate', label: 'Navigate', description: 'Navigate to a page or URL' },
            { type: 'showNotification', label: 'Show Notification', description: 'Display a notification message' },
        ];
    }
}

export const appActionsService = new AppActionsService();
