/**
 * EndNode - Workflow termination (red circle)
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Square } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface EndNodeData extends Record<string, unknown> {
    label?: string;
}

interface EndNodeProps {
    data: EndNodeData;
    selected?: boolean;
}

export const EndNode = memo(function EndNode({ data, selected }: EndNodeProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-center w-16 h-16 rounded-full',
                'bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30',
                'border-2 border-red-400',
                selected && 'ring-2 ring-red-300 ring-offset-2 ring-offset-surface-900'
            )}
        >
            <Square className="w-5 h-5 text-white fill-white" />

            {/* Input handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-red-300 !border-2 !border-red-500"
            />

            {/* Label below */}
            {data?.label && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-surface-400 whitespace-nowrap">
                    {data.label}
                </div>
            )}
        </div>
    );
});
