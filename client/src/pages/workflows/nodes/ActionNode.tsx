/**
 * ActionNode - Generic action/task node (rectangle)
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, Globe, Mail, Code, Clock, Edit, Layers } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { NodeType } from '../../../types';

export interface ActionNodeData extends Record<string, unknown> {
    label: string;
    description?: string;
    nodeType?: NodeType;
    disabled?: boolean;
    hasError?: boolean;
}

interface ActionNodeProps {
    data: ActionNodeData;
    selected?: boolean;
}

const nodeIcons: Record<string, React.ReactNode> = {
    action: <Zap className="w-4 h-4" />,
    http: <Globe className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    script: <Code className="w-4 h-4" />,
    delay: <Clock className="w-4 h-4" />,
    setVariable: <Edit className="w-4 h-4" />,
    subworkflow: <Layers className="w-4 h-4" />,
};

const nodeColors: Record<string, string> = {
    action: 'from-blue-500/20 to-blue-600/20 border-blue-500/50',
    http: 'from-purple-500/20 to-purple-600/20 border-purple-500/50',
    email: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/50',
    script: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/50',
    delay: 'from-orange-500/20 to-orange-600/20 border-orange-500/50',
    setVariable: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/50',
    subworkflow: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/50',
};

export const ActionNode = memo(function ActionNode({ data, selected }: ActionNodeProps) {
    const nodeType = data.nodeType || 'action';
    const icon = nodeIcons[nodeType] || nodeIcons.action;
    const colorClass = nodeColors[nodeType] || nodeColors.action;

    return (
        <div
            className={cn(
                'relative px-4 py-3 rounded-lg border-2 shadow-lg min-w-[160px]',
                'bg-gradient-to-br',
                colorClass,
                selected && 'ring-2 ring-accent-500/50',
                data.disabled && 'opacity-50',
                data.hasError && 'border-red-500'
            )}
        >
            {/* Input handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-surface-400 !border-2 !border-surface-600 hover:!bg-accent-400"
            />

            <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-surface-800/50 text-surface-200">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-100 truncate">
                        {data.label}
                    </div>
                    {data.description && (
                        <div className="text-xs text-surface-400 truncate">
                            {data.description}
                        </div>
                    )}
                </div>
            </div>

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-surface-400 !border-2 !border-surface-600 hover:!bg-accent-400"
            />

            {/* Error indicator */}
            {data.hasError && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            )}
        </div>
    );
});
