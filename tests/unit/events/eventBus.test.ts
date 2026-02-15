import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../../src/services/events/event-bus';
import type {
    FormSubmittedEvent,
    TaskCompletedEvent,
    WorkflowStartedEvent,
} from '../../../src/services/events/event-bus';

describe('EventBus', () => {
    let bus: EventBus;

    beforeEach(() => {
        bus = new EventBus();
    });

    it('should subscribe and receive events', async () => {
        const handler = vi.fn();
        bus.on('form.submitted', handler);

        const event: FormSubmittedEvent = {
            type: 'form.submitted',
            formId: 'form-1',
            submissionId: 'sub-1',
            accountId: 'acc-1',
            data: { name: 'Test' },
            submittedBy: 'user-1',
            timestamp: new Date(),
        };

        await bus.emit(event);
        expect(handler).toHaveBeenCalledWith(event);
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support multiple handlers for the same event', async () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        bus.on('task.completed', handler1);
        bus.on('task.completed', handler2);

        const event: TaskCompletedEvent = {
            type: 'task.completed',
            taskId: 'task-1',
            executionId: 'exec-1',
            workflowId: 'wf-1',
            nodeId: 'node-1',
            outcome: 'approved',
            completedBy: 'user-1',
            timestamp: new Date(),
        };

        await bus.emit(event);
        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not call handlers for different event types', async () => {
        const formHandler = vi.fn();
        const taskHandler = vi.fn();
        bus.on('form.submitted', formHandler);
        bus.on('task.completed', taskHandler);

        await bus.emit({
            type: 'form.submitted',
            formId: 'form-1',
            submissionId: 'sub-1',
            accountId: 'acc-1',
            data: {},
            timestamp: new Date(),
        });

        expect(formHandler).toHaveBeenCalledTimes(1);
        expect(taskHandler).not.toHaveBeenCalled();
    });

    it('should support unsubscribe', async () => {
        const handler = vi.fn();
        const sub = bus.on('form.submitted', handler);

        await bus.emit({
            type: 'form.submitted',
            formId: 'f1',
            submissionId: 's1',
            accountId: 'a1',
            data: {},
            timestamp: new Date(),
        });
        expect(handler).toHaveBeenCalledTimes(1);

        sub.unsubscribe();

        await bus.emit({
            type: 'form.submitted',
            formId: 'f2',
            submissionId: 's2',
            accountId: 'a2',
            data: {},
            timestamp: new Date(),
        });
        expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should support once() — fire-and-forget subscription', async () => {
        const handler = vi.fn();
        bus.once('workflow.started', handler);

        const event: WorkflowStartedEvent = {
            type: 'workflow.started',
            workflowId: 'wf-1',
            executionId: 'exec-1',
            triggeredBy: 'user-1',
            triggerType: 'manual',
            input: {},
            timestamp: new Date(),
        };

        await bus.emit(event);
        expect(handler).toHaveBeenCalledTimes(1);

        await bus.emit(event);
        expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should catch and isolate handler errors', async () => {
        const errorHandler = vi.fn().mockRejectedValue(new Error('kaboom'));
        const goodHandler = vi.fn();
        bus.on('form.submitted', errorHandler);
        bus.on('form.submitted', goodHandler);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        await bus.emit({
            type: 'form.submitted',
            formId: 'f1',
            submissionId: 's1',
            accountId: 'a1',
            data: {},
            timestamp: new Date(),
        });

        // Both handlers were called; error didn't break the good one
        expect(errorHandler).toHaveBeenCalledTimes(1);
        expect(goodHandler).toHaveBeenCalledTimes(1);

        consoleSpy.mockRestore();
    });

    it('should track event history', async () => {
        await bus.emit({
            type: 'form.submitted',
            formId: 'f1',
            submissionId: 's1',
            accountId: 'a1',
            data: {},
            timestamp: new Date(),
        });

        await bus.emit({
            type: 'task.completed',
            taskId: 't1',
            executionId: 'e1',
            workflowId: 'w1',
            nodeId: 'n1',
            outcome: 'approved',
            completedBy: 'u1',
            timestamp: new Date(),
        });

        const allHistory = bus.getHistory();
        expect(allHistory).toHaveLength(2);

        const formHistory = bus.getHistory('form.submitted');
        expect(formHistory).toHaveLength(1);
        expect(formHistory[0]!.type).toBe('form.submitted');
    });

    it('should report listener count', () => {
        expect(bus.listenerCount('form.submitted')).toBe(0);

        bus.on('form.submitted', () => { });
        bus.on('form.submitted', () => { });
        expect(bus.listenerCount('form.submitted')).toBe(2);
    });

    it('should clear handlers with off()', () => {
        bus.on('form.submitted', () => { });
        bus.on('task.completed', () => { });

        bus.off('form.submitted');
        expect(bus.listenerCount('form.submitted')).toBe(0);
        expect(bus.listenerCount('task.completed')).toBe(1);

        bus.off();
        expect(bus.listenerCount('task.completed')).toBe(0);
    });
});
