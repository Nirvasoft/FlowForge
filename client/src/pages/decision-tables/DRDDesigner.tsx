/**
 * DRDDesigner — Visual Decision Requirements Diagram canvas
 * Full-screen React Flow editor for DRD diagrams (DMN standard)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
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
    type NodeTypes,
    ReactFlowProvider,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Save, Loader2, Table2, Database, BookOpen } from 'lucide-react';
import { Button } from '../../components/ui';
import { getDRD, updateDRD, createDRD } from '../../api/drd-api';
import type { DRDNode as DRDNodeData, DRDEdge as DRDEdgeData } from '../../api/drd-api';

// ============================================================================
// Custom Node Components
// ============================================================================

function DecisionDRDNode({ data }: { data: { label: string; decisionTableId?: string } }) {
    return (
        <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 6,
            border: '2px solid #1d4ed8',
            minWidth: 160,
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            fontSize: 13,
            fontWeight: 600,
        }}>
            <Handle type="target" position={Position.Top} style={{ background: '#93c5fd' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Table2 size={14} />
                <span>{data.label}</span>
            </div>
            {data.decisionTableId && (
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>linked table</div>
            )}
            <Handle type="source" position={Position.Bottom} style={{ background: '#93c5fd' }} />
        </div>
    );
}

function InputDataDRDNode({ data }: { data: { label: string } }) {
    return (
        <div style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 24,
            border: '2px solid #047857',
            minWidth: 140,
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
            fontSize: 13,
            fontWeight: 600,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Database size={14} />
                <span>{data.label}</span>
            </div>
            <Handle type="source" position={Position.Bottom} style={{ background: '#6ee7b7' }} />
        </div>
    );
}

function KnowledgeSourceDRDNode({ data }: { data: { label: string } }) {
    return (
        <div style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 6,
            borderTop: '2px solid #b45309',
            borderLeft: '2px solid #b45309',
            borderRight: '2px solid #b45309',
            borderBottom: '4px solid #b45309',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            minWidth: 150,
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
            fontSize: 13,
            fontWeight: 600,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <BookOpen size={14} />
                <span>{data.label}</span>
            </div>
            <Handle type="source" position={Position.Bottom} style={{ background: '#fcd34d' }} />
        </div>
    );
}

const nodeTypes: NodeTypes = {
    decision: DecisionDRDNode,
    inputData: InputDataDRDNode,
    knowledgeSource: KnowledgeSourceDRDNode,
};

// ============================================================================
// DRD Designer Inner
// ============================================================================

function DRDDesignerInner() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [diagramName, setDiagramName] = useState('');
    const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load diagram
    useEffect(() => {
        async function load() {
            if (!id || id === 'new') {
                setLoading(false);
                return;
            }
            try {
                const diagram = await getDRD(id);
                setDiagramName(diagram.name);
                // Convert DRD nodes → React Flow nodes
                setNodes(diagram.nodes.map(n => ({
                    id: n.id,
                    type: n.type,
                    position: n.position,
                    data: { label: n.label, decisionTableId: n.decisionTableId, description: n.description },
                })));
                // Convert DRD edges → React Flow edges
                setEdges(diagram.edges.map(e => ({
                    id: e.id,
                    source: e.sourceNodeId,
                    target: e.targetNodeId,
                    label: e.label,
                    animated: e.type === 'knowledgeRequirement',
                    style: e.type === 'knowledgeRequirement'
                        ? { strokeDasharray: '5 5', stroke: '#f59e0b' }
                        : { stroke: '#3b82f6' },
                })));
            } catch {
                console.warn('Could not load DRD');
            }
            setLoading(false);
        }
        load();
    }, [id]);

    // Auto-save
    const autoSave = useCallback(() => {
        if (!id || id === 'new') return;
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(async () => {
            setSaving(true);
            const drdNodes: DRDNodeData[] = nodes.map(n => ({
                id: n.id,
                type: (n.type || 'decision') as DRDNodeData['type'],
                label: (n.data as any).label || 'Untitled',
                position: n.position,
                decisionTableId: (n.data as any).decisionTableId,
                description: (n.data as any).description,
            }));
            const drdEdges: DRDEdgeData[] = edges.map(e => ({
                id: e.id,
                type: (e.animated ? 'knowledgeRequirement' : 'informationRequirement') as DRDEdgeData['type'],
                sourceNodeId: e.source,
                targetNodeId: e.target,
                label: e.label as string | undefined,
            }));
            try {
                await updateDRD(id, { name: diagramName, nodes: drdNodes, edges: drdEdges });
            } catch { }
            setSaving(false);
        }, 800);
    }, [id, nodes, edges, diagramName]);

    useEffect(() => { autoSave(); }, [nodes, edges]);

    const onConnect = useCallback((connection: Connection) => {
        setEdges(eds => addEdge(connection, eds));
    }, [setEdges]);

    // Add node
    const addNode = useCallback((type: 'decision' | 'inputData' | 'knowledgeSource') => {
        const labels: Record<string, string> = {
            decision: 'New Decision',
            inputData: 'Input Data',
            knowledgeSource: 'Knowledge Source',
        };
        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type,
            position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
            data: { label: labels[type] },
        };
        setNodes(nds => [...nds, newNode]);
    }, [setNodes]);

    // Save manually
    const handleSave = useCallback(async () => {
        setSaving(true);
        const drdNodes: DRDNodeData[] = nodes.map(n => ({
            id: n.id,
            type: (n.type || 'decision') as DRDNodeData['type'],
            label: (n.data as any).label || 'Untitled',
            position: n.position,
            decisionTableId: (n.data as any).decisionTableId,
            description: (n.data as any).description,
        }));
        const drdEdges: DRDEdgeData[] = edges.map(e => ({
            id: e.id,
            type: (e.animated ? 'knowledgeRequirement' : 'informationRequirement') as DRDEdgeData['type'],
            sourceNodeId: e.source,
            targetNodeId: e.target,
            label: e.label as string | undefined,
        }));

        try {
            if (!id || id === 'new') {
                const created = await createDRD({ name: diagramName || 'Untitled DRD' });
                await updateDRD(created.id, { nodes: drdNodes, edges: drdEdges });
                navigate(`/decision-tables/drd/${created.id}`, { replace: true });
            } else {
                await updateDRD(id, { name: diagramName, nodes: drdNodes, edges: drdEdges });
            }
        } catch { }
        setSaving(false);
    }, [id, diagramName, nodes, edges, navigate]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#94a3b8' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ marginLeft: 12, fontSize: 16 }}>Loading DRD…</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                background: '#1e293b', borderBottom: '1px solid #334155', zIndex: 10,
            }}>
                <Button variant="ghost" size="sm" onClick={() => navigate('/decision-tables')}
                    style={{ color: '#94a3b8' }}>
                    <ArrowLeft size={16} />
                </Button>
                <input
                    value={diagramName}
                    onChange={e => setDiagramName(e.target.value)}
                    onBlur={autoSave}
                    placeholder="Untitled DRD"
                    style={{
                        background: 'transparent', border: 'none', color: '#f1f5f9',
                        fontSize: 16, fontWeight: 600, outline: 'none', width: 260,
                    }}
                />

                <div style={{ flex: 1 }} />

                {/* Add nodes toolbar */}
                <div style={{ display: 'flex', gap: 6, background: '#0f172a', borderRadius: 8, padding: '4px 8px' }}>
                    <button onClick={() => addNode('decision')} title="Add Decision"
                        style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Table2 size={14} /> Decision
                    </button>
                    <button onClick={() => addNode('inputData')} title="Add Input Data"
                        style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Database size={14} /> Input
                    </button>
                    <button onClick={() => addNode('knowledgeSource')} title="Add Knowledge Source"
                        style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={14} /> Knowledge
                    </button>
                </div>

                <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving}
                    style={{ minWidth: 80 }}>
                    {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                    <span style={{ marginLeft: 4 }}>{saving ? 'Saving…' : 'Save'}</span>
                </Button>
            </div>

            {/* Canvas */}
            <div style={{ flex: 1 }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    defaultEdgeOptions={{ style: { stroke: '#3b82f6', strokeWidth: 2 } }}
                    style={{ background: '#0f172a' }}
                >
                    <Background color="#1e293b" gap={20} />
                    <Controls style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                    <MiniMap
                        style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                        nodeColor={(node) => {
                            switch (node.type) {
                                case 'decision': return '#3b82f6';
                                case 'inputData': return '#10b981';
                                case 'knowledgeSource': return '#f59e0b';
                                default: return '#64748b';
                            }
                        }}
                    />
                </ReactFlow>
            </div>

            {/* Footer legend */}
            <div style={{
                display: 'flex', gap: 20, padding: '8px 16px',
                background: '#1e293b', borderTop: '1px solid #334155',
                fontSize: 11, color: '#64748b',
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 2, background: '#3b82f6', display: 'inline-block' }} />
                    Decision
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 12, background: '#10b981', display: 'inline-block' }} />
                    Input Data
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 12, height: 8, borderRadius: '2px 2px 0 0', background: '#f59e0b', display: 'inline-block' }} />
                    Knowledge Source
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 20, borderTop: '2px solid #3b82f6', display: 'inline-block' }} />
                    Information Req.
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 20, borderTop: '2px dashed #f59e0b', display: 'inline-block' }} />
                    Knowledge Req.
                </span>
            </div>
        </div>
    );
}

// ============================================================================
// Wrapped Export
// ============================================================================

export function DRDDesigner() {
    return (
        <ReactFlowProvider>
            <DRDDesignerInner />
        </ReactFlowProvider>
    );
}
