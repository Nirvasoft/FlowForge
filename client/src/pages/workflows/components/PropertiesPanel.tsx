/**
 * PropertiesPanel - Right sidebar for editing selected node
 */

import { useState, useEffect } from 'react';
import { X, AlertCircle, Trash2, ExternalLink } from 'lucide-react';
import { Input, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { Node } from '@xyflow/react';
import type { DecisionTable } from '../../../types';

interface PropertiesPanelProps {
    node: Node | null;
    onClose: () => void;
    onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
    onDelete?: () => void;
    className?: string;
}

export function PropertiesPanel({ node, onClose, onUpdate, onDelete, className }: PropertiesPanelProps) {
    const [decisionTables, setDecisionTables] = useState<DecisionTable[]>([]);
    const [tablesLoading, setTablesLoading] = useState(false);

    // Fetch decision tables when a businessRule or decision node is selected
    useEffect(() => {
        if ((node?.type === 'businessRule' || node?.type === 'decision') && decisionTables.length === 0) {
            setTablesLoading(true);
            fetch('/api/v1/decision-tables')
                .then(res => res.json())
                .then(data => setDecisionTables(Array.isArray(data) ? data : []))
                .catch(() => setDecisionTables([]))
                .finally(() => setTablesLoading(false));
        }
    }, [node?.type, node?.id]);

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
                {node.type === 'decision' && (() => {
                    const mode = (node.data?.mode as string) || 'expression';
                    return (
                        <div className="pt-4 border-t border-surface-700 space-y-4">
                            {/* Mode Toggle */}
                            <div>
                                <label className="text-xs font-medium text-surface-400 mb-2 block">Mode</label>
                                <div className="flex rounded-lg overflow-hidden border border-surface-600">
                                    <button
                                        onClick={() => handleChange('mode', 'expression')}
                                        className={cn(
                                            'flex-1 px-3 py-1.5 text-xs font-medium transition-colors',
                                            mode === 'expression'
                                                ? 'bg-amber-500/20 text-amber-300 border-r border-surface-600'
                                                : 'bg-surface-800 text-surface-400 hover:text-surface-200 border-r border-surface-600'
                                        )}
                                    >
                                        Expression
                                    </button>
                                    <button
                                        onClick={() => handleChange('mode', 'table')}
                                        className={cn(
                                            'flex-1 px-3 py-1.5 text-xs font-medium transition-colors',
                                            mode === 'table'
                                                ? 'bg-teal-500/20 text-teal-300'
                                                : 'bg-surface-800 text-surface-400 hover:text-surface-200'
                                        )}
                                    >
                                        Decision Table
                                    </button>
                                </div>
                            </div>

                            {mode === 'expression' ? (
                                /* Expression mode */
                                <div>
                                    <h4 className="text-xs font-medium text-surface-400 mb-2">Condition</h4>
                                    <Input
                                        value={(node.data?.condition as string) || ''}
                                        onChange={(e) => handleChange('condition', e.target.value)}
                                        placeholder="e.g., amount > 1000"
                                    />
                                </div>
                            ) : (
                                /* Table mode */
                                <>
                                    {/* Table Selector */}
                                    <div>
                                        <label className="text-xs text-surface-400">Decision Table</label>
                                        <select
                                            value={(node.data?.decisionTableId as string) || ''}
                                            onChange={(e) => {
                                                const table = decisionTables.find(t => t.id === e.target.value);
                                                onUpdate(node.id, {
                                                    ...node.data,
                                                    decisionTableId: e.target.value,
                                                    decisionTableName: table?.name || '',
                                                });
                                            }}
                                            className="mt-1 w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-sm text-surface-100"
                                        >
                                            <option value="">{tablesLoading ? 'Loading...' : 'Select a table...'}</option>
                                            {decisionTables.filter(t => t.status === 'published').map(table => (
                                                <option key={table.id} value={table.id}>{table.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Branch Field */}
                                    <Input
                                        label="Branch Field"
                                        value={(node.data?.branchField as string) || ''}
                                        onChange={(e) => handleChange('branchField', e.target.value)}
                                        placeholder="e.g., approved"
                                    />
                                    <p className="text-xs text-surface-500 -mt-2">
                                        Output field from the table that determines Yes/No branching
                                    </p>

                                    {/* Link to editor */}
                                    {(node.data?.decisionTableId as string) && (
                                        <a
                                            href={`/decision-tables/${node.data.decisionTableId}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Open table editor
                                        </a>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })()}

                {node.type === 'businessRule' && (
                    <div className="pt-4 border-t border-surface-700 space-y-4">
                        <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                            Decision Table
                        </h4>

                        {/* Table Selector */}
                        <div>
                            <label className="text-xs text-surface-400">Table</label>
                            <select
                                value={(node.data?.decisionTableId as string) || ''}
                                onChange={(e) => {
                                    const table = decisionTables.find(t => t.id === e.target.value);
                                    handleChange('decisionTableId', e.target.value);
                                    if (table) {
                                        handleChange('decisionTableName', table.name);
                                        // Auto-create input mappings for each table input
                                        const currentMapping = (node.data?.inputMapping as Record<string, string>) || {};
                                        const newMapping: Record<string, string> = {};
                                        table.inputs?.forEach(inp => {
                                            newMapping[inp.name] = currentMapping[inp.name] || inp.name;
                                        });
                                        onUpdate(node.id, {
                                            ...node.data,
                                            decisionTableId: e.target.value,
                                            decisionTableName: table.name,
                                            inputMapping: newMapping,
                                        });
                                    }
                                }}
                                className="mt-1 w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-sm text-surface-100"
                            >
                                <option value="">{tablesLoading ? 'Loading...' : 'Select a table...'}</option>
                                {decisionTables.filter(t => t.status === 'published').map(table => (
                                    <option key={table.id} value={table.id}>{table.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Link to editor */}
                        {(node.data?.decisionTableId as string) && (
                            <a
                                href={`/decision-tables/${node.data.decisionTableId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Open table editor
                            </a>
                        )}

                        {/* Input Mapping */}
                        {(node.data?.decisionTableId as string) && (() => {
                            const selectedTable = decisionTables.find(t => t.id === node.data?.decisionTableId);
                            const mapping = (node.data?.inputMapping as Record<string, string>) || {};
                            return (
                                <div>
                                    <label className="text-xs text-surface-400">Input Mapping</label>
                                    <div className="mt-1 space-y-2">
                                        {selectedTable?.inputs?.map(inp => (
                                            <div key={inp.id} className="flex items-center gap-2">
                                                <span className="text-xs text-teal-300 w-24 truncate flex-shrink-0" title={inp.name}>
                                                    {inp.name}
                                                </span>
                                                <span className="text-xs text-surface-500">←</span>
                                                <input
                                                    value={mapping[inp.name] || ''}
                                                    onChange={(e) => {
                                                        const newMapping = { ...mapping, [inp.name]: e.target.value };
                                                        handleChange('inputMapping', newMapping);
                                                    }}
                                                    className="flex-1 px-2 py-1 bg-surface-800 border border-surface-600 rounded text-xs text-surface-100"
                                                    placeholder={`variable name`}
                                                />
                                            </div>
                                        )) || (
                                                <p className="text-xs text-surface-500 italic">Select a table first</p>
                                            )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Output Variable */}
                        <Input
                            label="Output Variable"
                            value={(node.data?.outputVariable as string) || ''}
                            onChange={(e) => handleChange('outputVariable', e.target.value)}
                            placeholder="e.g., approvalResult"
                        />

                        {/* Fail on No Match */}
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={(node.data?.failOnNoMatch as boolean) || false}
                                onChange={(e) => handleChange('failOnNoMatch', e.target.checked)}
                                className="w-4 h-4 rounded bg-surface-800 border-surface-600 text-teal-500"
                            />
                            <span className="text-xs text-surface-300">Fail if no rules match</span>
                        </label>
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
