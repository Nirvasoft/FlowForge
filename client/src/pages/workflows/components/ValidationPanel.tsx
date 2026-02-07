/**
 * ValidationPanel - Displays workflow validation results
 */

import { AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { ValidationResult, ValidationError } from '../utils/validation';

interface ValidationPanelProps {
    result: ValidationResult;
    onClose: () => void;
    onNodeClick?: (nodeId: string) => void;
    className?: string;
}

export function ValidationPanel({ result, onClose, onNodeClick, className }: ValidationPanelProps) {
    const allIssues = [...result.errors, ...result.warnings];

    return (
        <div className={cn(
            'bg-surface-900 border-l border-surface-700 flex flex-col h-full',
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-surface-700">
                <div className="flex items-center gap-2">
                    {result.valid ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                    <div>
                        <h3 className="text-sm font-semibold text-surface-100">
                            Validation Results
                        </h3>
                        <p className="text-xs text-surface-400">
                            {result.valid ? 'Workflow is valid' : `${result.errors.length} errors, ${result.warnings.length} warnings`}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Status Badge */}
            <div className={cn(
                'mx-4 mt-4 px-3 py-2 rounded-lg text-center text-sm font-medium',
                result.valid
                    ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                    : 'bg-red-900/30 border border-red-700/50 text-red-300'
            )}>
                {result.valid ? (
                    <span className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Ready to publish
                    </span>
                ) : (
                    <span className="flex items-center justify-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Fix errors before publishing
                    </span>
                )}
            </div>

            {/* Issues List */}
            <div className="flex-1 p-4 overflow-y-auto">
                {allIssues.length === 0 ? (
                    <p className="text-sm text-surface-400 text-center py-8">
                        No issues found. Great job!
                    </p>
                ) : (
                    <div className="space-y-2">
                        {result.errors.map((error) => (
                            <IssueItem
                                key={error.id}
                                issue={error}
                                onNodeClick={onNodeClick}
                            />
                        ))}
                        {result.warnings.map((warning) => (
                            <IssueItem
                                key={warning.id}
                                issue={warning}
                                onNodeClick={onNodeClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-surface-700 space-y-2">
                <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={onClose}
                >
                    Close
                </Button>
            </div>
        </div>
    );
}

interface IssueItemProps {
    issue: ValidationError;
    onNodeClick?: (nodeId: string) => void;
}

function IssueItem({ issue, onNodeClick }: IssueItemProps) {
    const isError = issue.type === 'error';

    return (
        <div
            className={cn(
                'p-3 rounded-lg border',
                isError
                    ? 'bg-red-900/20 border-red-700/40'
                    : 'bg-amber-900/20 border-amber-700/40',
                issue.nodeId && onNodeClick && 'cursor-pointer hover:bg-opacity-30'
            )}
            onClick={() => issue.nodeId && onNodeClick?.(issue.nodeId)}
        >
            <div className="flex items-start gap-2">
                {isError ? (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                    <p className={cn(
                        'text-sm',
                        isError ? 'text-red-200' : 'text-amber-200'
                    )}>
                        {issue.message}
                    </p>
                    {issue.nodeId && (
                        <p className="text-xs text-surface-500 mt-1">
                            Click to highlight node
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
