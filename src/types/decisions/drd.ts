/**
 * Decision Requirements Diagram (DRD) Types
 * DMN-standard visual representation of decision dependencies
 */

// ============================================================================
// DRD Node Types
// ============================================================================

export type DRDNodeType = 'decision' | 'inputData' | 'knowledgeSource';

export interface DRDNodePosition {
    x: number;
    y: number;
}

export interface DRDNode {
    id: string;
    type: DRDNodeType;
    label: string;
    position: DRDNodePosition;

    /** For 'decision' nodes: links to a DecisionTable by ID */
    decisionTableId?: string;

    /** Optional description / annotation */
    description?: string;
}

// ============================================================================
// DRD Edge Types
// ============================================================================

export type DRDEdgeType = 'informationRequirement' | 'knowledgeRequirement';

export interface DRDEdge {
    id: string;
    type: DRDEdgeType;
    sourceNodeId: string;
    targetNodeId: string;
    label?: string;
}

// ============================================================================
// DRD Diagram
// ============================================================================

export interface DRDDiagram {
    id: string;
    name: string;
    description?: string;
    nodes: DRDNode[];
    edges: DRDEdge[];
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
}
