/**
 * PropertiesPanel - Right sidebar for editing selected node
 */

import { X, AlertCircle, Trash2 } from 'lucide-react';
import { Input, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { Node } from '@xyflow/react';

interface PropertiesPanelProps {
    node: Node | null;
    onClose: () => void;
    onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
    onDelete?: () => void;
    className?: string;
}

export function PropertiesPanel({ node, onClose, onUpdate, onDelete, className }: PropertiesPanelProps) {
    if (!node) return null;

    const handleChange = (field: string, value: unknown) => {
        onUpdate(node.id, { ...node.data, [field]: value });
    };

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-surface-700">
                <div>
                    <h3 className="text-sm font-semibold text-surface-100">
                        Node Properties
                    </h3>
                    <p className="text-xs text-surface-400 capitalize">
                        {node.type} Node
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {/* Basic Info */}
                <div className="space-y-3">
                    <Input
                        label="Label"
                        value={(node.data?.label as string) || ''}
                        onChange={(e) => handleChange('label', e.target.value)}
                        placeholder="Node label"
                    />
                    <Input
                        label="Description"
                        value={(node.data?.description as string) || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Optional description"
                    />
                </div>

                {/* Type-specific settings */}
                {node.type === 'decision' && (
                    <div className="pt-4 border-t border-surface-700">
                        <h4 className="text-xs font-medium text-surface-400 mb-3">
                            Condition
                        </h4>
                        <Input
                            value={(node.data?.condition as string) || ''}
                            onChange={(e) => handleChange('condition', e.target.value)}
                            placeholder="e.g., amount > 1000"
                        />
                    </div>
                )}

                {node.type === 'http' && (
                    <div className="pt-4 border-t border-surface-700 space-y-3">
                        <h4 className="text-xs font-medium text-surface-400 mb-3">
                            HTTP Request
                        </h4>
                        <div>
                            <label className="text-xs text-surface-400">Method</label>
                            <select
                                value={(node.data?.method as string) || 'GET'}
                                onChange={(e) => handleChange('method', e.target.value)}
                                className="mt-1 w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-sm text-surface-100"
                            >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="PATCH">PATCH</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                        </div>
                        <Input
                            label="URL"
                            value={(node.data?.url as string) || ''}
                            onChange={(e) => handleChange('url', e.target.value)}
                            placeholder="https://api.example.com/..."
                        />
                    </div>
                )}

                {node.type === 'delay' && (
                    <div className="pt-4 border-t border-surface-700">
                        <h4 className="text-xs font-medium text-surface-400 mb-3">
                            Delay Settings
                        </h4>
                        <Input
                            label="Duration (seconds)"
                            type="number"
                            value={(node.data?.duration as number) || 0}
                            onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
                        />
                    </div>
                )}

                {node.type === 'approval' && (
                    <div className="pt-4 border-t border-surface-700">
                        <h4 className="text-xs font-medium text-surface-400 mb-3">
                            Approval Settings
                        </h4>
                        <Input
                            label="Approvers (comma-separated)"
                            value={((node.data?.approvers as string[]) || []).join(', ')}
                            onChange={(e) => handleChange('approvers', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            placeholder="user1, user2"
                        />
                    </div>
                )}

                {/* Error handling section */}
                <div className="pt-4 border-t border-surface-700">
                    <h4 className="text-xs font-medium text-surface-400 mb-3">
                        Error Handling
                    </h4>
                    <select
                        value={(node.data?.onError as string) || 'stop'}
                        onChange={(e) => handleChange('onError', e.target.value)}
                        className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-sm text-surface-100"
                    >
                        <option value="stop">Stop workflow</option>
                        <option value="continue">Continue to next node</option>
                        <option value="goto">Go to specific node</option>
                    </select>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-surface-700 space-y-3">
                {onDelete && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onDelete}
                        className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Node
                    </Button>
                )}
                <div className="flex items-center gap-2 text-xs text-surface-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>Changes are saved automatically</span>
                </div>
            </div>
        </div>
    );
}
