/**
 * ApprovalNode - Human approval task node
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CheckCircle, User } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface ApprovalNodeData extends Record<string, unknown> {
    label: string;
    description?: string;
    approvers?: string[];
    disabled?: boolean;
    hasError?: boolean;
}

interface ApprovalNodeProps {
    data: ApprovalNodeData;
    selected?: boolean;
}

export const ApprovalNode = memo(function ApprovalNode({ data, selected }: ApprovalNodeProps) {
    return (
        <div
            className={cn(
                'relative px-4 py-3 rounded-xl border-2 shadow-lg min-w-[180px]',
                'bg-gradient-to-br from-violet-500/20 to-violet-600/20 border-violet-500/50',
                selected && 'ring-2 ring-violet-400/50',
                data.disabled && 'opacity-50',
                data.hasError && 'border-red-500'
            )}
        >
            {/* Input handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-violet-400 !border-2 !border-violet-600"
            />

            {/* Header with icon */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-violet-500/30">
                    <CheckCircle className="w-5 h-5 text-violet-300" />
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

            {/* Approvers indicator */}
            <div className="flex items-center gap-1.5 text-xs text-surface-400">
                <User className="w-3 h-3" />
                <span>{data.approvers?.length || 0} approver(s)</span>
            </div>

            {/* Approved output */}
            <Handle
                id="approved"
                type="source"
                position={Position.Right}
                style={{ right: '-6px', top: '50%', transform: 'translateY(-50%)' }}
                className="!w-3 !h-3 !bg-green-400 !border-2 !border-green-600"
            />

            {/* Rejected output */}
            <Handle
                id="rejected"
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-red-400 !border-2 !border-red-600"
            />

            {/* Labels */}
            <div className="absolute top-1/2 -right-16 -translate-y-1/2 text-xs text-green-400">
                Approved
            </div>

            {/* Error indicator */}
            {data.hasError && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            )}
        </div>
    );
});
