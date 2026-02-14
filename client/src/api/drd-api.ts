/**
 * Client API for Decision Requirements Diagrams (DRD)
 */

const API_BASE = '/api/v1/decision-tables/drds';

export interface DRDDiagram {
    id: string;
    name: string;
    description?: string;
    nodes: DRDNode[];
    edges: DRDEdge[];
    createdAt: string;
    updatedAt: string;
}

export interface DRDNode {
    id: string;
    type: 'decision' | 'inputData' | 'knowledgeSource';
    label: string;
    position: { x: number; y: number };
    decisionTableId?: string;
    description?: string;
}

export interface DRDEdge {
    id: string;
    type: 'informationRequirement' | 'knowledgeRequirement';
    sourceNodeId: string;
    targetNodeId: string;
    label?: string;
}

export async function listDRDs(): Promise<DRDDiagram[]> {
    const res = await fetch(API_BASE);
    const data = await res.json();
    return data.diagrams;
}

export async function createDRD(input: { name: string; description?: string }): Promise<DRDDiagram> {
    const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    return res.json();
}

export async function getDRD(id: string): Promise<DRDDiagram> {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error('DRD not found');
    return res.json();
}

export async function updateDRD(
    id: string,
    updates: { name?: string; description?: string; nodes?: DRDNode[]; edges?: DRDEdge[] }
): Promise<DRDDiagram> {
    const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    return res.json();
}

export async function deleteDRD(id: string): Promise<void> {
    await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
}
