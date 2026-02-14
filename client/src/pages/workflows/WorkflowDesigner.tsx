/**
 * WorkflowDesigner - Visual workflow canvas using React Flow
 */

import { useState, useCallback, useRef, useEffect, type DragEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    type Connection,
    ReactFlowProvider,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Save, Play, Undo, Redo, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui';
import { nodeTypes } from './nodes';
import { NodePalette } from './components/NodePalette';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ValidationPanel } from './components/ValidationPanel';
import { cn } from '../../lib/utils';
import {
    getWorkflow,
    createWorkflow,
    saveWorkflowDefinition,
    executeWorkflow,
} from '../../api/workflows';
import { validateWorkflow, type ValidationResult } from './utils/validation';
import type { NodeType, Workflow } from '../../types';

// Initial sample workflow for demo
const initialNodes: Node[] = [
    {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Start' },
    },
    {
        id: 'action-1',
        type: 'action',
        position: { x: 200, y: 180 },
        data: { label: 'Process Request', description: 'Initial processing', nodeType: 'action' },
    },
    {
        id: 'decision-1',
        type: 'decision',
        position: { x: 200, y: 320 },
        data: { label: 'Check Amount', condition: 'amount > 1000' },
    },
    {
        id: 'approval-1',
        type: 'approval',
        position: { x: 400, y: 420 },
        data: { label: 'Manager Approval', description: 'Requires approval', approvers: ['manager'] },
    },
    {
        id: 'end-1',
        type: 'end',
        position: { x: 250, y: 550 },
        data: { label: 'End' },
    },
];

const initialEdges: Edge[] = [
    { id: 'e1', source: 'start-1', target: 'action-1', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
    { id: 'e2', source: 'action-1', target: 'decision-1', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
    { id: 'e3', source: 'decision-1', sourceHandle: 'true', target: 'approval-1', label: 'Yes', animated: true, style: { stroke: '#22c55e', strokeWidth: 2 } },
    { id: 'e4', source: 'decision-1', sourceHandle: 'false', target: 'end-1', label: 'No', animated: true, style: { stroke: '#ef4444', strokeWidth: 2 } },
    { id: 'e5', source: 'approval-1', sourceHandle: 'approved', target: 'end-1', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
];

let nodeId = 100;
const getNodeId = () => `node-${nodeId++}`;

function WorkflowDesignerInner() {
    const { id } = useParams();
    const navigate = useNavigate();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition } = useReactFlow();

    // Workflow state
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [workflowName, setWorkflowName] = useState(id ? 'Loading...' : 'New Workflow');

    // UI state
    const [isLoading, setIsLoading] = useState(!!id);
    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [executionResult, setExecutionResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null);

    // Validation state
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [showValidation, setShowValidation] = useState(false);

    // Load workflow on mount if editing existing
    useEffect(() => {
        async function loadWorkflow() {
            if (!id || id === 'new') {
                setIsLoading(false);
                return;
            }

            try {
                const wf = await getWorkflow(id);
                setWorkflow(wf);
                setWorkflowName(wf.name);

                // Convert backend nodes to React Flow format
                if (wf.nodes && wf.nodes.length > 0) {
                    const rfNodes: Node[] = wf.nodes.map((node) => ({
                        id: node.id,
                        type: node.type,
                        position: node.position,
                        data: {
                            label: node.name,
                            description: node.description,
                            nodeType: node.type,
                            ...node.config,
                        },
                    }));
                    setNodes(rfNodes);
                }

                // Convert backend edges to React Flow format
                if (wf.edges && wf.edges.length > 0) {
                    const rfEdges: Edge[] = wf.edges.map((edge) => ({
                        id: edge.id,
                        source: edge.source,
                        target: edge.target,
                        sourceHandle: edge.sourceHandle,
                        targetHandle: edge.targetHandle,
                        label: edge.label,
                        animated: true,
                        style: { stroke: '#6366f1', strokeWidth: 2 },
                    }));
                    setEdges(rfEdges);
                }
            } catch (error) {
                console.error('Failed to load workflow:', error);
                setSaveError('Failed to load workflow');
            } finally {
                setIsLoading(false);
            }
        }

        loadWorkflow();
    }, [id, setNodes, setEdges]);

    // Track unsaved changes
    useEffect(() => {
        if (!isLoading) {
            setHasUnsavedChanges(true);
        }
    }, [nodes, edges, isLoading]);

    // Handle node selection
    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    // Handle canvas click (deselect)
    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    // Handle edge connection
    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) =>
                addEdge(
                    {
                        ...params,
                        animated: true,
                        style: { stroke: '#6366f1', strokeWidth: 2 },
                    },
                    eds
                )
            );
        },
        [setEdges]
    );

    // Handle drag over - visual feedback
    const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    }, []);

    // Handle drag leave
    const onDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    // Handle drop from palette
    const onDrop = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragOver(false);

            const type = event.dataTransfer.getData('application/reactflow') as NodeType;
            const label = event.dataTransfer.getData('text/plain');

            if (!type) return;

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: getNodeId(),
                type,
                position,
                data: { label, nodeType: type },
            };

            setNodes((nds) => nds.concat(newNode));

            // Auto-select the new node
            setSelectedNode(newNode);
        },
        [screenToFlowPosition, setNodes]
    );

    // Handle keyboard deletion - filter out protected nodes (start)
    const onNodesDelete = useCallback(
        (nodesToDelete: Node[]) => {
            // Filter out start nodes - they can't be deleted
            const deletableNodes = nodesToDelete.filter((node) => node.type !== 'start');

            if (deletableNodes.length === 0) return;

            // Delete the nodes
            setNodes((nds) => nds.filter((node) =>
                !deletableNodes.some((n) => n.id === node.id)
            ));

            // Remove connected edges
            const deletedIds = new Set(deletableNodes.map((n) => n.id));
            setEdges((eds) => eds.filter((edge) =>
                !deletedIds.has(edge.source) && !deletedIds.has(edge.target)
            ));

            // Clear selection if selected node was deleted
            if (selectedNode && deletedIds.has(selectedNode.id)) {
                setSelectedNode(null);
            }
        },
        [setNodes, setEdges, selectedNode]
    );

    // Delete selected node (from button/toolbar)
    const handleDeleteNode = useCallback(() => {
        if (!selectedNode) return;

        // Don't allow deleting start node
        if (selectedNode.type === 'start') return;

        setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
        setEdges((eds) => eds.filter((edge) =>
            edge.source !== selectedNode.id && edge.target !== selectedNode.id
        ));
        setSelectedNode(null);
    }, [selectedNode, setNodes, setEdges]);

    // Update node data
    const handleNodeUpdate = useCallback(
        (nodeId: string, data: Record<string, unknown>) => {
            setNodes((nds) =>
                nds.map((node) => (node.id === nodeId ? { ...node, data } : node))
            );
            // Update selected node reference
            setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data } : prev));
        },
        [setNodes]
    );

    // Save workflow
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        setSaveError(null);

        try {
            let workflowId = workflow?.id || id;

            // Create new workflow if needed
            if (!workflowId || workflowId === 'new') {
                const newWorkflow = await createWorkflow({
                    name: workflowName === 'New Workflow' ? 'Untitled Workflow' : workflowName,
                });
                workflowId = newWorkflow.id;
                setWorkflow(newWorkflow);

                // Update URL to reflect new workflow ID
                navigate(`/workflows/${workflowId}/design`, { replace: true });
            }

            // Save workflow definition (nodes and edges)
            await saveWorkflowDefinition(workflowId, {
                nodes: nodes.map((node) => ({
                    id: node.id,
                    type: node.type || 'action',
                    position: node.position,
                    data: node.data as Record<string, unknown>,
                })),
                edges: edges.map((edge) => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    sourceHandle: edge.sourceHandle || undefined,
                    targetHandle: edge.targetHandle || undefined,
                    label: edge.label as string | undefined,
                    style: edge.style as Record<string, unknown> | undefined,
                })),
            });

            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Failed to save workflow:', error);
            setSaveError('Failed to save workflow');
        } finally {
            setIsSaving(false);
        }
    }, [workflow, id, workflowName, nodes, edges, navigate]);

    // Run workflow
    const handleRun = useCallback(async () => {
        setIsRunning(true);
        setSaveError(null);
        setExecutionResult(null);

        try {
            // Auto-save before running
            let workflowId = workflow?.id || id;

            if (!workflowId || workflowId === 'new') {
                // Need to create + save first
                await handleSave();
                workflowId = workflow?.id || id;
            } else if (hasUnsavedChanges) {
                await handleSave();
            }

            if (!workflowId || workflowId === 'new') {
                setSaveError('Could not determine workflow ID. Please save first.');
                setIsRunning(false);
                return;
            }

            const result = await executeWorkflow(workflowId);
            setExecutionResult({ success: true, data: result });
        } catch (error: any) {
            const message = error?.response?.data?.error || error?.message || 'Execution failed';
            setExecutionResult({ success: false, error: message });
        } finally {
            setIsRunning(false);
        }
    }, [workflow, id, hasUnsavedChanges, handleSave]);

    return (
        <div className="h-screen flex flex-col bg-surface-950">
            {/* Error Banner */}
            {saveError && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-900/50 border-b border-red-700 text-red-200">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{saveError}</span>
                    <button
                        onClick={() => setSaveError(null)}
                        className="ml-auto text-red-300 hover:text-red-100"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface-900 border-b border-surface-700">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/workflows')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-surface-700" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold text-surface-100">{workflowName}</h1>
                            {hasUnsavedChanges && (
                                <span className="text-xs text-amber-400">• Unsaved</span>
                            )}
                        </div>
                        <p className="text-xs text-surface-400">Visual Designer</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" disabled>
                        <Undo className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" disabled>
                        <Redo className="w-4 h-4" />
                    </Button>
                    {selectedNode && selectedNode.type !== 'start' && (
                        <>
                            <div className="h-6 w-px bg-surface-700" />
                            <Button variant="ghost" size="sm" onClick={handleDeleteNode} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                    <div className="h-6 w-px bg-surface-700" />
                    <Button variant="secondary" size="sm" onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                        variant={validationResult?.valid ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                            const result = validateWorkflow(nodes, edges);
                            setValidationResult(result);
                            setShowValidation(true);
                        }}
                        disabled={isLoading}
                        className={cn(
                            validationResult?.valid === true && 'text-green-400',
                            validationResult?.valid === false && 'text-red-400'
                        )}
                    >
                        {validationResult?.valid === true ? (
                            <CheckCircle className="w-4 h-4 mr-2" />
                        ) : validationResult?.valid === false ? (
                            <AlertCircle className="w-4 h-4 mr-2" />
                        ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Validate
                    </Button>
                    <Button variant="primary" size="sm" disabled={isLoading || isRunning} onClick={handleRun}>
                        {isRunning ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4 mr-2" />
                        )}
                        {isRunning ? 'Running...' : 'Run'}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Palette */}
                <div className="w-64 bg-surface-900 border-r border-surface-700 flex-shrink-0">
                    <NodePalette />
                </div>

                {/* Canvas */}
                <div
                    className={cn(
                        "flex-1 relative transition-all duration-200",
                        isDragOver && "ring-2 ring-accent-500 ring-inset bg-accent-500/5"
                    )}
                    ref={reactFlowWrapper}
                >
                    {/* Drop zone indicator */}
                    {isDragOver && (
                        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                            <div className="bg-accent-500/20 backdrop-blur-sm border-2 border-dashed border-accent-500 rounded-xl px-8 py-4">
                                <p className="text-accent-300 font-medium">Drop here to add node</p>
                            </div>
                        </div>
                    )}

                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodesDelete={onNodesDelete}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        nodeTypes={nodeTypes}
                        fitView
                        snapToGrid
                        snapGrid={[15, 15]}
                        deleteKeyCode={['Backspace', 'Delete']}
                        defaultEdgeOptions={{
                            animated: true,
                            style: { stroke: '#6366f1', strokeWidth: 2 },
                        }}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background color="#334155" gap={20} size={1} />
                        <Controls
                            className="!bg-surface-800 !border-surface-600 !shadow-lg [&>button]:!bg-surface-700 [&>button]:!border-surface-600 [&>button]:!text-surface-300 [&>button:hover]:!bg-surface-600"
                        />
                        <MiniMap
                            className="!bg-surface-800 !border-surface-600"
                            nodeColor={(node) => {
                                switch (node.type) {
                                    case 'start': return '#22c55e';
                                    case 'end': return '#ef4444';
                                    case 'decision': return '#f59e0b';
                                    case 'approval': return '#8b5cf6';
                                    case 'businessRule': return '#14b8a6';
                                    default: return '#6366f1';
                                }
                            }}
                        />
                    </ReactFlow>
                </div>

                {/* Right Panel - Properties or Validation */}
                {showValidation && validationResult ? (
                    <div className="w-80 bg-surface-900 border-l border-surface-700 flex-shrink-0">
                        <ValidationPanel
                            result={validationResult}
                            onClose={() => setShowValidation(false)}
                            onNodeClick={(nodeId) => {
                                const node = nodes.find((n) => n.id === nodeId);
                                if (node) {
                                    setSelectedNode(node);
                                    setShowValidation(false);
                                }
                            }}
                        />
                    </div>
                ) : selectedNode && (
                    <div className="w-80 bg-surface-900 border-l border-surface-700 flex-shrink-0">
                        <PropertiesPanel
                            node={selectedNode}
                            onClose={() => setSelectedNode(null)}
                            onUpdate={handleNodeUpdate}
                            onDelete={selectedNode.type !== 'start' ? handleDeleteNode : undefined}
                        />
                    </div>
                )}
            </div>

            {/* Execution Result Modal */}
            {executionResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            {executionResult.success ? (
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                </div>
                            )}
                            <h2 className="text-lg font-semibold text-surface-100">
                                {executionResult.success ? 'Workflow Executed' : 'Execution Failed'}
                            </h2>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-4">
                            {executionResult.success && executionResult.data && (
                                <>
                                    {/* Basic Info */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-surface-400">Execution ID</span>
                                            <span className="text-surface-200 font-mono text-xs">
                                                {executionResult.data.id?.slice(0, 8) || '—'}...
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-surface-400">Status</span>
                                            <span className={cn(
                                                'px-2 py-0.5 rounded-full text-xs font-medium',
                                                executionResult.data.status === 'completed' && 'bg-green-500/20 text-green-300',
                                                executionResult.data.status === 'running' && 'bg-blue-500/20 text-blue-300',
                                                executionResult.data.status === 'failed' && 'bg-red-500/20 text-red-300',
                                                executionResult.data.status === 'waiting' && 'bg-amber-500/20 text-amber-300',
                                                !['completed', 'running', 'failed', 'waiting'].includes(executionResult.data.status) && 'bg-surface-600 text-surface-300'
                                            )}>
                                                {executionResult.data.status || 'unknown'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Metrics */}
                                    {executionResult.data.metrics && (
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-surface-700/50 rounded-lg p-2.5 text-center">
                                                <div className="text-lg font-bold text-surface-100">{executionResult.data.metrics.nodeExecutions || 0}</div>
                                                <div className="text-xs text-surface-400">Nodes Run</div>
                                            </div>
                                            <div className="bg-surface-700/50 rounded-lg p-2.5 text-center">
                                                <div className="text-lg font-bold text-green-400">{executionResult.data.metrics.completedTasks || 0}</div>
                                                <div className="text-xs text-surface-400">Tasks Done</div>
                                            </div>
                                            <div className="bg-surface-700/50 rounded-lg p-2.5 text-center">
                                                <div className="text-lg font-bold text-amber-400">{executionResult.data.metrics.pendingTasks || 0}</div>
                                                <div className="text-xs text-surface-400">Pending</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Completed Nodes */}
                                    {executionResult.data.completedNodes && executionResult.data.completedNodes.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Node Progress</h3>
                                            <div className="space-y-1">
                                                {executionResult.data.completedNodes.map((nodeId: string, index: number) => {
                                                    const node = nodes.find(n => n.id === nodeId);
                                                    return (
                                                        <div key={nodeId} className="flex items-center gap-2 text-sm">
                                                            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                                                <CheckCircle className="w-3 h-3 text-green-400" />
                                                            </div>
                                                            <span className="text-surface-300">{String(node?.data?.label || nodeId)}</span>
                                                            {index < (executionResult.data.completedNodes?.length || 0) - 1 && (
                                                                <span className="text-surface-600 ml-auto">→</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Execution Log */}
                                    {executionResult.data.logs && executionResult.data.logs.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Execution Log</h3>
                                            <div className="bg-surface-900/50 rounded-lg p-2 max-h-40 overflow-y-auto space-y-0.5">
                                                {executionResult.data.logs.map((log: { level: string; nodeId?: string; message: string }, i: number) => (
                                                    <div key={i} className="flex items-start gap-1.5 text-xs font-mono">
                                                        <span className={cn(
                                                            'flex-shrink-0 px-1 rounded',
                                                            log.level === 'info' && 'text-blue-400 bg-blue-400/10',
                                                            log.level === 'warn' && 'text-amber-400 bg-amber-400/10',
                                                            log.level === 'error' && 'text-red-400 bg-red-400/10',
                                                        )}>
                                                            {log.level}
                                                        </span>
                                                        {log.nodeId && (
                                                            <span className="text-surface-500 flex-shrink-0">[{log.nodeId}]</span>
                                                        )}
                                                        <span className="text-surface-300 break-all">{log.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {!executionResult.success && executionResult.error && (
                                <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                                    <p className="text-sm text-red-300">{executionResult.error}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-surface-700">
                            <Button variant="secondary" size="sm" onClick={() => setExecutionResult(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function WorkflowDesigner() {
    return (
        <ReactFlowProvider>
            <WorkflowDesignerInner />
        </ReactFlowProvider>
    );
}
