/**
 * StartNode - Workflow entry point (green circle)
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface StartNodeData extends Record<string, unknown> {
    label?: string;
}

interface StartNodeProps {
    data: StartNodeData;
    selected?: boolean;
}

export const StartNode = memo(function StartNode({ data, selected }: StartNodeProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-center w-16 h-16 rounded-full',
                'bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30',
                'border-2 border-green-400',
                selected && 'ring-2 ring-green-300 ring-offset-2 ring-offset-surface-900'
            )}
        >
            <Play className="w-6 h-6 text-white fill-white" />

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-green-300 !border-2 !border-green-500"
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
