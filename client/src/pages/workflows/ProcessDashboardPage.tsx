/**
 * ProcessDashboardPage - Standalone page wrapper for the ProcessDashboard
 */

import { ProcessDashboard } from '../../components/workflow/ProcessDashboard';

export function ProcessDashboardPage() {
    return (
        <div className="animate-in">
            <ProcessDashboard />
        </div>
    );
}
