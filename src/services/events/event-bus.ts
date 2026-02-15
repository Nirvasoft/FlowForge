/**
 * FlowForge Event Bus
 * Typed pub/sub system connecting Forms, Workflows, Tasks, and Apps.
 * 
 * This is the backbone that lets any service react to events from any other
 * service without tight coupling or circular imports.
 */

// ============================================================================
// Event Type Definitions
// ============================================================================

export interface FormSubmittedEvent {
    type: 'form.submitted';
    formId: string;
    submissionId: string;
    accountId: string;
    data: Record<string, unknown>;
    submittedBy?: string;
    timestamp: Date;
}

export interface FormUpdatedEvent {
    type: 'form.updated';
    formId: string;
    submissionId: string;
    accountId: string;
    data: Record<string, unknown>;
    updatedBy?: string;
    timestamp: Date;
}

export interface TaskCreatedEvent {
    type: 'task.created';
    taskId: string;
    executionId: string;
    workflowId: string;
    nodeId: string;
    taskType: 'approval' | 'form' | 'assignment' | 'review';
    assignees: string[];
    title: string;
    timestamp: Date;
}

export interface TaskClaimedEvent {
    type: 'task.claimed';
    taskId: string;
    executionId: string;
    claimedBy: string;
    timestamp: Date;
}

export interface TaskCompletedEvent {
    type: 'task.completed';
    taskId: string;
    executionId: string;
    workflowId: string;
    nodeId: string;
    outcome: string;
    responseData?: Record<string, unknown>;
    completedBy: string;
    timestamp: Date;
}

export interface WorkflowStartedEvent {
    type: 'workflow.started';
    workflowId: string;
    executionId: string;
    triggeredBy: string;
    triggerType: string;
    input: Record<string, unknown>;
    timestamp: Date;
}

export interface WorkflowCompletedEvent {
    type: 'workflow.completed';
    workflowId: string;
    executionId: string;
    output?: Record<string, unknown>;
    timestamp: Date;
}

export interface WorkflowFailedEvent {
    type: 'workflow.failed';
    workflowId: string;
    executionId: string;
    error: string;
    nodeId?: string;
    timestamp: Date;
}

export interface AppActionExecutedEvent {
    type: 'app.action.executed';
    actionType: string;
    appId?: string;
    sourceComponentId?: string;
    result: Record<string, unknown>;
    timestamp: string;
}

// Union of all event types
export type FlowForgeEvent =
    | FormSubmittedEvent
    | FormUpdatedEvent
    | TaskCreatedEvent
    | TaskClaimedEvent
    | TaskCompletedEvent
    | WorkflowStartedEvent
    | WorkflowCompletedEvent
    | WorkflowFailedEvent
    | AppActionExecutedEvent;

// Extract event type string literals
export type EventType = FlowForgeEvent['type'];

// Map event type to event interface
type EventMap = {
    'form.submitted': FormSubmittedEvent;
    'form.updated': FormUpdatedEvent;
    'task.created': TaskCreatedEvent;
    'task.claimed': TaskClaimedEvent;
    'task.completed': TaskCompletedEvent;
    'workflow.started': WorkflowStartedEvent;
    'workflow.completed': WorkflowCompletedEvent;
    'workflow.failed': WorkflowFailedEvent;
    'app.action.executed': AppActionExecutedEvent;
};

// Handler type
type EventHandler<T extends EventType> = (event: EventMap[T]) => void | Promise<void>;

// Subscription handle for unsubscribing
export interface Subscription {
    unsubscribe: () => void;
}

// ============================================================================
// Event Bus Implementation
// ============================================================================

export class EventBus {
    private handlers = new Map<EventType, Set<EventHandler<any>>>();
    private history: FlowForgeEvent[] = [];
    private maxHistory = 1000;

    /**
     * Subscribe to an event type.
     * Returns a Subscription handle you can call .unsubscribe() on.
     */
    on<T extends EventType>(type: T, handler: EventHandler<T>): Subscription {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type)!.add(handler);

        return {
            unsubscribe: () => {
                this.handlers.get(type)?.delete(handler);
            },
        };
    }

    /**
     * Subscribe to an event type for a single occurrence.
     */
    once<T extends EventType>(type: T, handler: EventHandler<T>): Subscription {
        const wrappedHandler: EventHandler<T> = (event) => {
            sub.unsubscribe();
            return handler(event);
        };
        const sub = this.on(type, wrappedHandler);
        return sub;
    }

    /**
     * Emit an event. All registered handlers are called.
     * Errors in handlers are caught and logged (never break the emitter).
     */
    async emit<T extends EventType>(event: EventMap[T]): Promise<void> {
        // Store in history
        this.history.push(event as FlowForgeEvent);
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }

        const handlers = this.handlers.get(event.type as EventType);
        if (!handlers || handlers.size === 0) return;

        const promises: Promise<void>[] = [];
        for (const handler of handlers) {
            try {
                const result = handler(event);
                if (result instanceof Promise) {
                    promises.push(
                        result.catch((err) => {
                            console.error(`[EventBus] Handler error for "${event.type}":`, err);
                        })
                    );
                }
            } catch (err) {
                console.error(`[EventBus] Sync handler error for "${event.type}":`, err);
            }
        }

        if (promises.length > 0) {
            await Promise.all(promises);
        }
    }

    /**
     * Remove all handlers for a given event type, or all handlers if no type given.
     */
    off(type?: EventType): void {
        if (type) {
            this.handlers.delete(type);
        } else {
            this.handlers.clear();
        }
    }

    /**
     * Get the count of handlers for a given event type.
     */
    listenerCount(type: EventType): number {
        return this.handlers.get(type)?.size ?? 0;
    }

    /**
     * Get recent event history (for debugging / dashboards).
     */
    getHistory(type?: EventType, limit = 50): FlowForgeEvent[] {
        const filtered = type
            ? this.history.filter((e) => e.type === type)
            : this.history;
        return filtered.slice(-limit);
    }

    /**
     * Clear all history.
     */
    clearHistory(): void {
        this.history = [];
    }
}

// ============================================================================
// Singleton instance
// ============================================================================

export const eventBus = new EventBus();
