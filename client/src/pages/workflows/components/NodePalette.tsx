/**
 * NodePalette - Sidebar with draggable node types
 */

import { useState, type DragEvent } from 'react';
import {
    Play,
    Square,
    GitBranch,
    GitMerge,
    GitPullRequest,
    Clock,
    Zap,
    Globe,
    Mail,
    Code,
    CheckCircle,
    FileText,
    Edit,
    Layers,
    GripVertical
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { NodeType } from '../../../types';

interface PaletteCategory {
    name: string;
    items: {
        type: NodeType;
        label: string;
        icon: React.ReactNode;
        description: string;
        color: string;
    }[];
}

const categories: PaletteCategory[] = [
    {
        name: 'Control Flow',
        items: [
            { type: 'start', label: 'Start', icon: <Play className="w-4 h-4" />, description: 'Entry point', color: 'bg-green-500' },
            { type: 'end', label: 'End', icon: <Square className="w-4 h-4" />, description: 'Termination', color: 'bg-red-500' },
            { type: 'decision', label: 'Decision', icon: <GitBranch className="w-4 h-4" />, description: 'If/else branch', color: 'bg-amber-500' },
            { type: 'parallel', label: 'Parallel', icon: <GitMerge className="w-4 h-4" />, description: 'Fork paths', color: 'bg-cyan-500' },
            { type: 'join', label: 'Join', icon: <GitPullRequest className="w-4 h-4" />, description: 'Wait for all', color: 'bg-cyan-500' },
            { type: 'delay', label: 'Delay', icon: <Clock className="w-4 h-4" />, description: 'Wait duration', color: 'bg-orange-500' },
        ],
    },
    {
        name: 'Actions',
        items: [
            { type: 'action', label: 'Action', icon: <Zap className="w-4 h-4" />, description: 'Generic action', color: 'bg-blue-500' },
            { type: 'http', label: 'HTTP', icon: <Globe className="w-4 h-4" />, description: 'HTTP request', color: 'bg-purple-500' },
            { type: 'email', label: 'Email', icon: <Mail className="w-4 h-4" />, description: 'Send email', color: 'bg-cyan-500' },
            { type: 'script', label: 'Script', icon: <Code className="w-4 h-4" />, description: 'Run script', color: 'bg-yellow-500' },
        ],
    },
    {
        name: 'Human Tasks',
        items: [
            { type: 'approval', label: 'Approval', icon: <CheckCircle className="w-4 h-4" />, description: 'Get approval', color: 'bg-violet-500' },
            { type: 'form', label: 'Form', icon: <FileText className="w-4 h-4" />, description: 'Fill form', color: 'bg-pink-500' },
        ],
    },
    {
        name: 'Data',
        items: [
            { type: 'setVariable', label: 'Set Variable', icon: <Edit className="w-4 h-4" />, description: 'Set value', color: 'bg-emerald-500' },
            { type: 'subworkflow', label: 'Subworkflow', icon: <Layers className="w-4 h-4" />, description: 'Call workflow', color: 'bg-indigo-500' },
        ],
    },
];

interface NodePaletteProps {
    className?: string;
}

export function NodePalette({ className }: NodePaletteProps) {
    const [draggingItem, setDraggingItem] = useState<string | null>(null);

    const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: NodeType, label: string) => {
        // Set drag data
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('text/plain', label);
        event.dataTransfer.effectAllowed = 'move';

        // Create custom drag image
        const dragPreview = document.createElement('div');
        dragPreview.className = 'fixed pointer-events-none bg-surface-800 border border-accent-500 rounded-lg px-3 py-2 shadow-xl text-surface-100 text-sm font-medium';
        dragPreview.textContent = label;
        dragPreview.style.top = '-1000px';
        dragPreview.style.left = '-1000px';
        document.body.appendChild(dragPreview);
        event.dataTransfer.setDragImage(dragPreview, 0, 0);

        // Clean up after a brief delay
        setTimeout(() => {
            document.body.removeChild(dragPreview);
        }, 0);

        setDraggingItem(nodeType);
    };

    const onDragEnd = () => {
        setDraggingItem(null);
    };

    return (
        <div className={cn('p-4 space-y-6 overflow-y-auto h-full', className)}>
            <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Node Palette
                </div>
                <div className="text-xs text-surface-500">
                    Drag to canvas
                </div>
            </div>

            {categories.map((category) => (
                <div key={category.name}>
                    <div className="text-xs font-medium text-surface-400 mb-2">
                        {category.name}
                    </div>
                    <div className="space-y-1">
                        {category.items.map((item) => (
                            <div
                                key={item.type}
                                draggable
                                onDragStart={(e) => onDragStart(e, item.type, item.label)}
                                onDragEnd={onDragEnd}
                                className={cn(
                                    'group flex items-center gap-3 p-2 rounded-lg cursor-grab transition-all duration-200',
                                    'bg-surface-800/50 hover:bg-surface-700/70 border border-transparent',
                                    'hover:border-surface-600 active:cursor-grabbing',
                                    'hover:shadow-md hover:scale-[1.02]',
                                    draggingItem === item.type && 'opacity-50 scale-95 border-accent-500'
                                )}
                            >
                                {/* Drag handle indicator */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-surface-500">
                                    <GripVertical className="w-3 h-3" />
                                </div>

                                {/* Icon with color accent */}
                                <div className={cn(
                                    'p-1.5 rounded text-white transition-transform',
                                    item.color,
                                    'group-hover:scale-110'
                                )}>
                                    {item.icon}
                                </div>

                                {/* Label and description */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-surface-200 group-hover:text-surface-100">
                                        {item.label}
                                    </div>
                                    <div className="text-xs text-surface-500 truncate">
                                        {item.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Help text at bottom */}
            <div className="pt-4 border-t border-surface-700">
                <p className="text-xs text-surface-500 text-center">
                    Drag nodes onto the canvas to add them to your workflow
                </p>
            </div>
        </div>
    );
}
