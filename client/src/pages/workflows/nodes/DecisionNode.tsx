/**
 * DecisionNode - If/else branching (diamond shape)
 * Supports expression mode (inline JS) and table mode (decision table evaluation)
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Table2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface DecisionNodeData extends Record<string, unknown> {
    label: string;
    condition?: string;
    mode?: 'expression' | 'table';
    decisionTableName?: string;
    disabled?: boolean;
}

interface DecisionNodeProps {
    data: DecisionNodeData;
    selected?: boolean;
}

export const DecisionNode = memo(function DecisionNode({ data, selected }: DecisionNodeProps) {
    const isTableMode = data.mode === 'table';

    return (
        <div className="relative">
            {/* Diamond shape */}
            <div
                className={cn(
                    'w-24 h-24 rotate-45 flex items-center justify-center',
                    isTableMode
                        ? 'bg-gradient-to-br from-teal-500/20 to-teal-600/20 border-2 border-teal-500/50'
                        : 'bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-2 border-amber-500/50',
                    'shadow-lg',
                    selected && (isTableMode
                        ? 'ring-2 ring-teal-400/50 ring-offset-2 ring-offset-surface-900'
                        : 'ring-2 ring-amber-400/50 ring-offset-2 ring-offset-surface-900'),
                    data.disabled && 'opacity-50'
                )}
            >
                <div className={cn('-rotate-45', isTableMode ? 'text-teal-400' : 'text-amber-400')}>
                    {isTableMode ? <Table2 className="w-6 h-6" /> : <GitBranch className="w-6 h-6" />}
                </div>
            </div>

            {/* Label (outside diamond) */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
                <div className="text-sm font-medium text-surface-100 whitespace-nowrap">
                    {data.label}
                </div>
                {isTableMode && data.decisionTableName ? (
                    <div className="text-xs text-teal-400 truncate max-w-[120px]">
                        {data.decisionTableName}
                    </div>
                ) : data.condition ? (
                    <div className="text-xs text-surface-400 truncate max-w-[120px]">
                        {data.condition}
                    </div>
                ) : null}
            </div>

            {/* Input handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                style={{ top: '-8px', left: '50%', transform: 'translateX(-50%)' }}
                className={cn('!w-3 !h-3 !border-2', isTableMode ? '!bg-teal-400 !border-teal-600' : '!bg-amber-400 !border-amber-600')}
            />

            {/* True output (right) */}
            <Handle
                id="true"
                type="source"
                position={Position.Right}
                style={{ right: '-8px', top: '50%', transform: 'translateY(-50%)' }}
                className="!w-3 !h-3 !bg-green-400 !border-2 !border-green-600"
            />

            {/* False output (bottom) */}
            <Handle
                id="false"
                type="source"
                position={Position.Bottom}
                style={{ bottom: '-8px', left: '50%', transform: 'translateX(-50%)' }}
                className="!w-3 !h-3 !bg-red-400 !border-2 !border-red-600"
            />

            {/* Labels for outputs */}
            <div className="absolute top-1/2 -right-12 -translate-y-1/2 text-xs text-green-400">
                Yes
            </div>
            <div className="absolute -bottom-4 left-1/2 translate-x-4 text-xs text-red-400">
                No
            </div>
        </div>
    );
});

