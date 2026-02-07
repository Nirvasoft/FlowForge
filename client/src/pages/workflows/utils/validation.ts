/**
 * Workflow Validation Utilities
 * Client-side validation for workflow definitions
 */

import type { Node, Edge } from '@xyflow/react';

export interface ValidationError {
    id: string;
    type: 'error' | 'warning';
    message: string;
    nodeId?: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

/**
 * Validate a workflow definition (nodes and edges)
 * Checks for structural issues before saving or publishing
 */
export function validateWorkflow(nodes: Node[], edges: Edge[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let idCounter = 0;
    const nextId = () => `val-${idCounter++}`;

    // Check for start node
    const startNodes = nodes.filter((n) => n.type === 'start');
    if (startNodes.length === 0) {
        errors.push({
            id: nextId(),
            type: 'error',
            message: 'Workflow must have a Start node',
        });
    } else if (startNodes.length > 1) {
        errors.push({
            id: nextId(),
            type: 'error',
            message: 'Workflow can only have one Start node',
        });
    }

    // Check for end node
    const endNodes = nodes.filter((n) => n.type === 'end');
    if (endNodes.length === 0) {
        errors.push({
            id: nextId(),
            type: 'error',
            message: 'Workflow must have at least one End node',
        });
    }

    // Build connectivity graph
    const connectedNodes = new Set<string>();
    const outgoingEdges = new Map<string, string[]>();
    const incomingEdges = new Map<string, string[]>();

    for (const edge of edges) {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);

        if (!outgoingEdges.has(edge.source)) {
            outgoingEdges.set(edge.source, []);
        }
        outgoingEdges.get(edge.source)!.push(edge.target);

        if (!incomingEdges.has(edge.target)) {
            incomingEdges.set(edge.target, []);
        }
        incomingEdges.get(edge.target)!.push(edge.source);
    }

    // Check for disconnected nodes (not connected to anything)
    for (const node of nodes) {
        if (!connectedNodes.has(node.id) && nodes.length > 1) {
            errors.push({
                id: nextId(),
                type: 'error',
                message: `Node "${(node.data?.label as string) || node.type}" is not connected`,
                nodeId: node.id,
            });
        }
    }

    // Check that start node has outgoing edges
    for (const startNode of startNodes) {
        const outgoing = outgoingEdges.get(startNode.id) || [];
        if (outgoing.length === 0 && nodes.length > 1) {
            errors.push({
                id: nextId(),
                type: 'error',
                message: 'Start node must be connected to another node',
                nodeId: startNode.id,
            });
        }
    }

    // Check that end nodes have incoming edges
    for (const endNode of endNodes) {
        const incoming = incomingEdges.get(endNode.id) || [];
        if (incoming.length === 0 && nodes.length > 1) {
            errors.push({
                id: nextId(),
                type: 'error',
                message: 'End node must be connected from another node',
                nodeId: endNode.id,
            });
        }
    }

    // Check for dead-end nodes (non-end nodes with no outgoing edges)
    for (const node of nodes) {
        if (node.type === 'end' || node.type === 'start') continue;

        const outgoing = outgoingEdges.get(node.id) || [];
        const incoming = incomingEdges.get(node.id) || [];

        if (outgoing.length === 0 && incoming.length > 0) {
            warnings.push({
                id: nextId(),
                type: 'warning',
                message: `Node "${(node.data?.label as string) || node.type}" has no outgoing connections`,
                nodeId: node.id,
            });
        }

        if (incoming.length === 0 && outgoing.length > 0) {
            warnings.push({
                id: nextId(),
                type: 'warning',
                message: `Node "${(node.data?.label as string) || node.type}" has no incoming connections`,
                nodeId: node.id,
            });
        }
    }

    // Check for decision nodes - they should have multiple outgoing edges
    const decisionNodes = nodes.filter((n) => n.type === 'decision');
    for (const node of decisionNodes) {
        const outgoing = outgoingEdges.get(node.id) || [];
        if (outgoing.length < 2) {
            warnings.push({
                id: nextId(),
                type: 'warning',
                message: `Decision node "${(node.data?.label as string) || 'Decision'}" should have both Yes and No paths`,
                nodeId: node.id,
            });
        }
    }

    // Check for approval nodes - they should have multiple outgoing edges
    const approvalNodes = nodes.filter((n) => n.type === 'approval');
    for (const node of approvalNodes) {
        const outgoing = outgoingEdges.get(node.id) || [];
        if (outgoing.length < 2) {
            warnings.push({
                id: nextId(),
                type: 'warning',
                message: `Approval node "${(node.data?.label as string) || 'Approval'}" should have both Approved and Rejected paths`,
                nodeId: node.id,
            });
        }
    }

    // Check for path reachability from start to end (BFS)
    if (startNodes.length === 1 && endNodes.length > 0) {
        const reachable = new Set<string>();
        const queue = [startNodes[0].id];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (reachable.has(current)) continue;
            reachable.add(current);

            const outgoing = outgoingEdges.get(current) || [];
            for (const target of outgoing) {
                if (!reachable.has(target)) {
                    queue.push(target);
                }
            }
        }

        // Check if any end node is reachable
        const endReachable = endNodes.some((n) => reachable.has(n.id));
        if (!endReachable && nodes.length > 1) {
            errors.push({
                id: nextId(),
                type: 'error',
                message: 'No path exists from Start to any End node',
            });
        }

        // Check for unreachable nodes
        for (const node of nodes) {
            if (!reachable.has(node.id) && node.type !== 'end') {
                warnings.push({
                    id: nextId(),
                    type: 'warning',
                    message: `Node "${(node.data?.label as string) || node.type}" is not reachable from Start`,
                    nodeId: node.id,
                });
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Get a summary of validation results
 */
export function getValidationSummary(result: ValidationResult): string {
    if (result.valid && result.warnings.length === 0) {
        return 'Workflow is valid';
    }

    const parts: string[] = [];
    if (result.errors.length > 0) {
        parts.push(`${result.errors.length} error${result.errors.length > 1 ? 's' : ''}`);
    }
    if (result.warnings.length > 0) {
        parts.push(`${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}`);
    }

    return parts.join(', ');
}
