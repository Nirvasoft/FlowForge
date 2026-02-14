/**
 * BusinessRuleNode - Decision table evaluation node (rectangle with teal theme)
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { TableProperties } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface BusinessRuleNodeData extends Record<string, unknown> {
    label: string;
    description?: string;
    decisionTableId?: string;
    decisionTableName?: string;
    disabled?: boolean;
    hasError?: boolean;
}

interface BusinessRuleNodeProps {
    data: BusinessRuleNodeData;
    selected?: boolean;
}

export const BusinessRuleNode = memo(function BusinessRuleNode({ data, selected }: BusinessRuleNodeProps) {
    return (
        <div
            className={cn(
                'relative px-4 py-3 rounded-lg border-2 shadow-lg min-w-[180px]',
                'bg-gradient-to-br from-teal-500/20 to-teal-600/20 border-teal-500/50',
                selected && 'ring-2 ring-teal-400/50',
                data.disabled && 'opacity-50',
                data.hasError && 'border-red-500'
            )}
        >
            {/* Input handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-surface-400 !border-2 !border-surface-600 hover:!bg-teal-400"
            />

            <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-teal-500/20 text-teal-300">
                    <TableProperties className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-100 truncate">
                        {data.label}
                    </div>
                    {data.decisionTableName ? (
                        <div className="text-xs text-teal-400 truncate">
                            📋 {data.decisionTableName}
                        </div>
                    ) : data.description ? (
                        <div className="text-xs text-surface-400 truncate">
                            {data.description}
                        </div>
                    ) : (
                        <div className="text-xs text-surface-500 italic">
                            No table selected
                        </div>
                    )}
                </div>
            </div>

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-surface-400 !border-2 !border-surface-600 hover:!bg-teal-400"
            />

            {/* Error indicator */}
            {data.hasError && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            )}
        </div>
    );
});
