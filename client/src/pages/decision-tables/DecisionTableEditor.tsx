/**
 * DecisionTableEditor - Visual editor for decision table rules
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Play,
    Upload,
    Plus,
    Trash2,
    GripVertical,
    Loader2,
    CheckCircle,
    TestTube,
    AlertCircle,
} from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { cn } from '../../lib/utils';
import {
    getTable,
    updateTable,
    publishTable,
    validateTable,
    addInput,
    deleteInput,
    addOutput,
    deleteOutput,
    addRule,
    updateRule,
    deleteRule,
    evaluate,
    runAllTests,
} from '../../api/decision-tables';
import type { DecisionTable, TableInput, TableOutput, TableRule, RuleCondition } from '../../types';

const OPERATORS = [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'in', label: 'in' },
    { value: 'between', label: 'between' },
    { value: 'contains', label: 'contains' },
    { value: 'any', label: '-' },
];

export function DecisionTableEditor() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [table, setTable] = useState<DecisionTable | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showTestPanel, setShowTestPanel] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [testInputs, setTestInputs] = useState<Record<string, string>>({});
    const [testResult, setTestResult] = useState<{ outputs: Record<string, unknown>; matchedRules: string[] } | null>(null);

    // Load table
    useEffect(() => {
        async function loadTable() {
            if (!id) {
                setIsLoading(false);
                return;
            }
            try {
                const loaded = await getTable(id);
                setTable(loaded);
            } catch (error) {
                console.error('Failed to load table:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadTable();
    }, [id]);

    // Save
    const handleSave = useCallback(async () => {
        if (!table || !id) return;
        setIsSaving(true);
        try {
            await updateTable(id, {
                name: table.name,
                description: table.description,
                hitPolicy: table.hitPolicy,
            });
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    }, [table, id]);

    // Validate
    const handleValidate = async () => {
        if (!id) return;
        try {
            const result = await validateTable(id);
            setValidationErrors(result.errors || []);
            if (result.valid) {
                alert('Table is valid!');
            }
        } catch (error) {
            console.error('Failed to validate:', error);
        }
    };

    // Publish
    const handlePublish = async () => {
        if (!id || !table) return;
        try {
            const updated = await publishTable(id);
            setTable(updated);
        } catch (error) {
            console.error('Failed to publish:', error);
        }
    };

    // Add input column
    const handleAddInput = async () => {
        if (!id || !table) return;
        try {
            const newInput = await addInput(id, {
                name: `input_${table.inputs.length + 1}`,
                label: `Input ${table.inputs.length + 1}`,
                type: 'string',
                required: true,
            });
            setTable({ ...table, inputs: [...table.inputs, newInput] });
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to add input:', error);
        }
    };

    // Add output column
    const handleAddOutput = async () => {
        if (!id || !table) return;
        try {
            const newOutput = await addOutput(id, {
                name: `output_${table.outputs.length + 1}`,
                label: `Output ${table.outputs.length + 1}`,
                type: 'string',
            });
            setTable({ ...table, outputs: [...table.outputs, newOutput] });
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to add output:', error);
        }
    };

    // Delete input
    const handleDeleteInput = async (inputId: string) => {
        if (!id || !table) return;
        try {
            await deleteInput(id, inputId);
            setTable({ ...table, inputs: table.inputs.filter((i) => i.id !== inputId) });
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to delete input:', error);
        }
    };

    // Delete output
    const handleDeleteOutput = async (outputId: string) => {
        if (!id || !table) return;
        try {
            await deleteOutput(id, outputId);
            setTable({ ...table, outputs: table.outputs.filter((o) => o.id !== outputId) });
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to delete output:', error);
        }
    };

    // Add rule
    const handleAddRule = async () => {
        if (!id || !table) return;
        try {
            const conditions: Record<string, RuleCondition> = {};
            table.inputs.forEach((input) => {
                conditions[input.id] = { operator: 'any' };
            });
            const outputs: Record<string, { value: unknown }> = {};
            table.outputs.forEach((output) => {
                outputs[output.id] = { value: '' };
            });
            const newRule = await addRule(id, {
                priority: table.rules.length + 1,
                conditions,
                outputs,
                enabled: true,
            });
            setTable({ ...table, rules: [...table.rules, newRule] });
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to add rule:', error);
        }
    };

    // Update rule condition
    const handleUpdateCondition = async (ruleId: string, inputId: string, condition: RuleCondition) => {
        if (!id || !table) return;
        const rule = table.rules.find((r) => r.id === ruleId);
        if (!rule) return;
        try {
            const updated = await updateRule(id, ruleId, {
                conditions: { ...rule.conditions, [inputId]: condition },
            });
            setTable({
                ...table,
                rules: table.rules.map((r) => (r.id === ruleId ? updated : r)),
            });
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to update condition:', error);
        }
    };

    // Update rule output
    const handleUpdateOutput = async (ruleId: string, outputId: string, value: unknown) => {
        if (!id || !table) return;
        const rule = table.rules.find((r) => r.id === ruleId);
        if (!rule) return;
        try {
            const updated = await updateRule(id, ruleId, {
                outputs: { ...rule.outputs, [outputId]: { value } },
            });
            setTable({
                ...table,
                rules: table.rules.map((r) => (r.id === ruleId ? updated : r)),
            });
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to update output:', error);
        }
    };

    // Delete rule
    const handleDeleteRule = async (ruleId: string) => {
        if (!id || !table) return;
        try {
            await deleteRule(id, ruleId);
            setTable({ ...table, rules: table.rules.filter((r) => r.id !== ruleId) });
            setHasUnsavedChanges(true);
        } catch (error) {
            console.error('Failed to delete rule:', error);
        }
    };

    // Test
    const handleTest = async () => {
        if (!id) return;
        try {
            const inputs: Record<string, unknown> = {};
            Object.entries(testInputs).forEach(([k, v]) => {
                inputs[k] = v;
            });
            const result = await evaluate(id, inputs);
            setTestResult(result);
        } catch (error) {
            console.error('Test failed:', error);
        }
    };

    // Run all tests
    const handleRunAllTests = async () => {
        if (!id) return;
        try {
            const result = await runAllTests(id);
            alert(`Tests: ${result.passed} passed, ${result.failed} failed`);
        } catch (error) {
            console.error('Failed to run tests:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-surface-950">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (!table) {
        return (
            <div className="h-screen flex items-center justify-center bg-surface-950">
                <div className="text-center">
                    <h2 className="text-xl font-medium text-surface-200 mb-2">Table not found</h2>
                    <Button variant="secondary" onClick={() => navigate('/decision-tables')}>
                        Back to Tables
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-surface-950">
            {/* Toolbar */}
            <div className="h-14 bg-surface-900 border-b border-surface-700 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/decision-tables')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-surface-700" />
                    <div className="flex items-center gap-2">
                        <Input
                            value={table.name}
                            onChange={(e) => {
                                setTable({ ...table, name: e.target.value });
                                setHasUnsavedChanges(true);
                            }}
                            className="bg-transparent border-transparent hover:border-surface-600 focus:border-primary-500 text-surface-100 font-medium w-64"
                        />
                        {hasUnsavedChanges && (
                            <span className="text-xs text-amber-400">Unsaved</span>
                        )}
                        <span className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            table.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                        )}>
                            {table.status}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowTestPanel(!showTestPanel)}>
                        <TestTube className="w-4 h-4 mr-2" />
                        Test
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleValidate}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Validate
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || !hasUnsavedChanges}
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save
                    </Button>
                    <Button variant="primary" size="sm" onClick={handlePublish}>
                        <Upload className="w-4 h-4 mr-2" />
                        Publish
                    </Button>
                </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
                <div className="bg-red-900/20 border-b border-red-700/50 px-4 py-2">
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">Validation errors:</span>
                    </div>
                    <ul className="mt-1 text-sm text-red-300 list-disc list-inside">
                        {validationErrors.map((error, i) => (
                            <li key={i}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Table Editor */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="bg-surface-900 border border-surface-700 rounded-lg overflow-hidden">
                        {/* Table Header */}
                        <div className="flex bg-surface-800/50 border-b border-surface-700">
                            {/* Priority col */}
                            <div className="w-12 px-2 py-3 text-xs font-semibold text-surface-400 uppercase border-r border-surface-700">
                                #
                            </div>

                            {/* Input columns */}
                            {table.inputs.map((input) => (
                                <div
                                    key={input.id}
                                    className="flex-1 min-w-[150px] px-3 py-2 border-r border-surface-700 group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-blue-400 uppercase">
                                            {input.label}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteInput(input.id)}
                                            className="p-1 rounded text-surface-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="text-xs text-surface-500">{input.type}</div>
                                </div>
                            ))}

                            {/* Add Input */}
                            <button
                                onClick={handleAddInput}
                                className="w-10 flex items-center justify-center border-r border-surface-700 text-surface-500 hover:text-primary-400 hover:bg-surface-800"
                            >
                                <Plus className="w-4 h-4" />
                            </button>

                            {/* Output columns */}
                            {table.outputs.map((output) => (
                                <div
                                    key={output.id}
                                    className="flex-1 min-w-[150px] px-3 py-2 border-r border-surface-700 bg-green-900/10 group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-green-400 uppercase">
                                            {output.label}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteOutput(output.id)}
                                            className="p-1 rounded text-surface-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="text-xs text-surface-500">{output.type}</div>
                                </div>
                            ))}

                            {/* Add Output */}
                            <button
                                onClick={handleAddOutput}
                                className="w-10 flex items-center justify-center text-surface-500 hover:text-green-400 hover:bg-green-900/10"
                            >
                                <Plus className="w-4 h-4" />
                            </button>

                            {/* Actions col */}
                            <div className="w-10"></div>
                        </div>

                        {/* Rules */}
                        {table.rules.length === 0 ? (
                            <div className="p-8 text-center text-surface-500">
                                No rules yet. Click "Add Rule" to create one.
                            </div>
                        ) : (
                            table.rules.map((rule) => (
                                <RuleRow
                                    key={rule.id}
                                    rule={rule}
                                    inputs={table.inputs}
                                    outputs={table.outputs}
                                    onUpdateCondition={handleUpdateCondition}
                                    onUpdateOutput={handleUpdateOutput}
                                    onDelete={() => handleDeleteRule(rule.id)}
                                />
                            ))
                        )}

                        {/* Add Rule */}
                        <button
                            onClick={handleAddRule}
                            className="w-full flex items-center justify-center gap-2 py-3 text-surface-400 hover:text-primary-400 hover:bg-surface-800/50 border-t border-surface-700"
                        >
                            <Plus className="w-4 h-4" />
                            Add Rule
                        </button>
                    </div>
                </div>

                {/* Test Panel */}
                {showTestPanel && (
                    <div className="w-80 bg-surface-900 border-l border-surface-700 flex flex-col">
                        <div className="p-4 border-b border-surface-700">
                            <h3 className="text-sm font-semibold text-surface-200">Test Evaluation</h3>
                        </div>
                        <div className="flex-1 overflow-auto p-4 space-y-4">
                            {table.inputs.map((input) => (
                                <div key={input.id}>
                                    <label className="block text-xs text-surface-400 mb-1">{input.label}</label>
                                    <Input
                                        value={testInputs[input.id] || ''}
                                        onChange={(e) => setTestInputs({ ...testInputs, [input.id]: e.target.value })}
                                        placeholder={`Enter ${input.type}`}
                                    />
                                </div>
                            ))}
                            <Button onClick={handleTest} className="w-full">
                                <Play className="w-4 h-4 mr-2" />
                                Evaluate
                            </Button>
                            {testResult && (
                                <div className="mt-4 p-3 bg-surface-800 rounded-lg">
                                    <h4 className="text-xs font-semibold text-surface-400 mb-2">Result</h4>
                                    <pre className="text-xs text-surface-200 overflow-auto">
                                        {JSON.stringify(testResult.outputs, null, 2)}
                                    </pre>
                                    <p className="text-xs text-surface-500 mt-2">
                                        Matched: {testResult.matchedRules.length} rule(s)
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-surface-700">
                            <Button variant="secondary" onClick={handleRunAllTests} className="w-full">
                                <TestTube className="w-4 h-4 mr-2" />
                                Run All Tests
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Rule Row Component
function RuleRow({
    rule,
    inputs,
    outputs,
    onUpdateCondition,
    onUpdateOutput,
    onDelete,
}: {
    rule: TableRule;
    inputs: TableInput[];
    outputs: TableOutput[];
    onUpdateCondition: (ruleId: string, inputId: string, condition: RuleCondition) => void;
    onUpdateOutput: (ruleId: string, outputId: string, value: unknown) => void;
    onDelete: () => void;
}) {
    return (
        <div className={cn(
            'flex border-b border-surface-700 hover:bg-surface-800/30',
            !rule.enabled && 'opacity-50'
        )}>
            {/* Priority */}
            <div className="w-12 flex items-center justify-center text-surface-500 border-r border-surface-700">
                <GripVertical className="w-4 h-4 cursor-grab" />
            </div>

            {/* Conditions */}
            {inputs.map((input) => {
                const condition = rule.conditions[input.id] || { operator: 'any' };
                return (
                    <div key={input.id} className="flex-1 min-w-[150px] p-2 border-r border-surface-700">
                        <div className="flex gap-1">
                            <select
                                value={condition.operator}
                                onChange={(e) => onUpdateCondition(rule.id, input.id, { ...condition, operator: e.target.value as RuleCondition['operator'] })}
                                className="w-14 px-1 py-1 bg-surface-800 border border-surface-600 rounded text-xs text-surface-200"
                            >
                                {OPERATORS.map((op) => (
                                    <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                            </select>
                            {condition.operator !== 'any' && (
                                <input
                                    type="text"
                                    value={String(condition.value || '')}
                                    onChange={(e) => onUpdateCondition(rule.id, input.id, { ...condition, value: e.target.value })}
                                    className="flex-1 px-2 py-1 bg-surface-800 border border-surface-600 rounded text-xs text-surface-200"
                                    placeholder="value"
                                />
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Spacer for add input button */}
            <div className="w-10 border-r border-surface-700"></div>

            {/* Outputs */}
            {outputs.map((output) => {
                const outputVal = rule.outputs[output.id]?.value || '';
                return (
                    <div key={output.id} className="flex-1 min-w-[150px] p-2 bg-green-900/5 border-r border-surface-700">
                        <input
                            type="text"
                            value={String(outputVal)}
                            onChange={(e) => onUpdateOutput(rule.id, output.id, e.target.value)}
                            className="w-full px-2 py-1 bg-surface-800 border border-green-700/30 rounded text-xs text-surface-200"
                            placeholder="output"
                        />
                    </div>
                );
            })}

            {/* Spacer for add output button */}
            <div className="w-10"></div>

            {/* Actions */}
            <div className="w-10 flex items-center justify-center">
                <button
                    onClick={onDelete}
                    className="p-1 rounded text-surface-500 hover:text-red-400"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
