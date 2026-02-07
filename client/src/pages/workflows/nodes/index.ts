/**
 * Workflow Designer Node Components
 * Custom node types for React Flow workflow canvas
 */

import { StartNode } from './StartNode';
import { EndNode } from './EndNode';
import { ActionNode } from './ActionNode';
import { DecisionNode } from './DecisionNode';
import { ApprovalNode } from './ApprovalNode';
import type { NodeType } from '../../../types';

// Node type registry for React Flow
export const nodeTypes = {
    start: StartNode,
    end: EndNode,
    action: ActionNode,
    decision: DecisionNode,
    approval: ApprovalNode,
    // Generic nodes use ActionNode as fallback
    http: ActionNode,
    email: ActionNode,
    script: ActionNode,
    form: ActionNode,
    delay: ActionNode,
    setVariable: ActionNode,
    parallel: ActionNode,
    join: ActionNode,
    subworkflow: ActionNode,
};

// Node palette items for drag-drop
export interface PaletteItem {
    type: NodeType;
    label: string;
    icon: string;
    category: 'control' | 'action' | 'human' | 'data';
    description: string;
}

export const paletteItems: PaletteItem[] = [
    // Control Flow
    { type: 'start', label: 'Start', icon: 'play', category: 'control', description: 'Workflow entry point' },
    { type: 'end', label: 'End', icon: 'stop', category: 'control', description: 'Workflow termination' },
    { type: 'decision', label: 'Decision', icon: 'git-branch', category: 'control', description: 'If/else branching' },
    { type: 'parallel', label: 'Parallel', icon: 'git-merge', category: 'control', description: 'Fork parallel paths' },
    { type: 'join', label: 'Join', icon: 'git-pull-request', category: 'control', description: 'Wait for branches' },
    { type: 'delay', label: 'Delay', icon: 'clock', category: 'control', description: 'Wait for duration' },

    // Actions
    { type: 'action', label: 'Action', icon: 'zap', category: 'action', description: 'Generic action' },
    { type: 'http', label: 'HTTP Request', icon: 'globe', category: 'action', description: 'Make HTTP call' },
    { type: 'email', label: 'Send Email', icon: 'mail', category: 'action', description: 'Send email notification' },
    { type: 'script', label: 'Script', icon: 'code', category: 'action', description: 'Execute JavaScript' },

    // Human Tasks
    { type: 'approval', label: 'Approval', icon: 'check-circle', category: 'human', description: 'Request approval' },
    { type: 'form', label: 'Form Task', icon: 'file-text', category: 'human', description: 'Fill form' },

    // Data
    { type: 'setVariable', label: 'Set Variable', icon: 'edit', category: 'data', description: 'Set workflow variable' },
    { type: 'subworkflow', label: 'Subworkflow', icon: 'layers', category: 'data', description: 'Call another workflow' },
];

export { StartNode, EndNode, ActionNode, DecisionNode, ApprovalNode };
