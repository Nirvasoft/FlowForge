/**
 * TaskInboxPage - Standalone page wrapper for the TaskInbox component
 */

import { TaskInbox } from '../../components/workflow/TaskInbox';

export function TaskInboxPage() {
    return (
        <div className="animate-in">
            <TaskInbox />
        </div>
    );
}
