/**
 * ComponentPalette - Sidebar with draggable components organized by category
 */

import { useState, useEffect } from 'react';
import {
    Box,
    CreditCard,
    Folder,
    Maximize2,
    Grid3X3,
    Table,
    List,
    FileText,
    Columns,
    Type,
    AlignLeft,
    Image,
    AlertCircle,
    Minus,
    BarChart2,
    TrendingUp,
    PieChart,
    Hash,
    Edit3,
    ChevronDown,
    ChevronRight,
    MousePointer,
    ChevronDownIcon,
    Calendar,
    CheckSquare,
    Loader2,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getComponents } from '../../../api/apps';
import type { ComponentDefinition, ComponentCategory } from '../../../types';

interface ComponentPaletteProps {
    onDragComponent: (component: ComponentDefinition, position: { row: number; column: number }) => void;
}

const categoryLabels: Record<ComponentCategory, string> = {
    layout: 'Layout',
    'data-display': 'Data Display',
    input: 'Input',
    charts: 'Charts',
    content: 'Content',
    media: 'Media',
    feedback: 'Feedback',
    navigation: 'Navigation',
};

const categoryIcons: Record<ComponentCategory, React.ReactNode> = {
    layout: <Grid3X3 className="w-4 h-4" />,
    'data-display': <Table className="w-4 h-4" />,
    input: <Edit3 className="w-4 h-4" />,
    charts: <BarChart2 className="w-4 h-4" />,
    content: <AlignLeft className="w-4 h-4" />,
    media: <Image className="w-4 h-4" />,
    feedback: <AlertCircle className="w-4 h-4" />,
    navigation: <MousePointer className="w-4 h-4" />,
};

// Icon mapping for component types
const componentIcons: Record<string, React.ReactNode> = {
    container: <Box className="w-4 h-4" />,
    card: <CreditCard className="w-4 h-4" />,
    tabs: <Folder className="w-4 h-4" />,
    modal: <Maximize2 className="w-4 h-4" />,
    grid: <Grid3X3 className="w-4 h-4" />,
    table: <Table className="w-4 h-4" />,
    list: <List className="w-4 h-4" />,
    'detail-view': <FileText className="w-4 h-4" />,
    kanban: <Columns className="w-4 h-4" />,
    form: <Edit3 className="w-4 h-4" />,
    'text-input': <Type className="w-4 h-4" />,
    select: <ChevronDownIcon className="w-4 h-4" />,
    'date-picker': <Calendar className="w-4 h-4" />,
    checkbox: <CheckSquare className="w-4 h-4" />,
    button: <MousePointer className="w-4 h-4" />,
    'bar-chart': <BarChart2 className="w-4 h-4" />,
    'line-chart': <TrendingUp className="w-4 h-4" />,
    'pie-chart': <PieChart className="w-4 h-4" />,
    'kpi-card': <Hash className="w-4 h-4" />,
    text: <AlignLeft className="w-4 h-4" />,
    heading: <Type className="w-4 h-4" />,
    image: <Image className="w-4 h-4" />,
    alert: <AlertCircle className="w-4 h-4" />,
    divider: <Minus className="w-4 h-4" />,
};

export function ComponentPalette({ onDragComponent }: ComponentPaletteProps) {
    const [components, setComponents] = useState<ComponentDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(['layout', 'content', 'input'])
    );

    useEffect(() => {
        async function loadComponents() {
            try {
                const loadedComponents = await getComponents();
                setComponents(loadedComponents);
            } catch (error) {
                console.error('Failed to load components:', error);
                // Fallback to built-in components
                setComponents(getBuiltInComponents());
            } finally {
                setIsLoading(false);
            }
        }

        loadComponents();
    }, []);

    const toggleCategory = (category: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    // Group components by category
    const componentsByCategory = components.reduce((acc, comp) => {
        if (!acc[comp.category]) {
            acc[comp.category] = [];
        }
        acc[comp.category].push(comp);
        return acc;
    }, {} as Record<string, ComponentDefinition[]>);

    const handleDragStart = (e: React.DragEvent, component: ComponentDefinition) => {
        e.dataTransfer.setData('application/json', JSON.stringify(component));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleClick = (component: ComponentDefinition) => {
        // Add component at the end
        const nextRow = 100; // Will be calculated properly in PageCanvas
        onDragComponent(component, { row: nextRow, column: 0 });
    };

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-surface-500" />
            </div>
        );
    }

    return (
        <div className="p-2 space-y-1">
            <h3 className="px-2 py-1 text-xs font-semibold text-surface-400 uppercase tracking-wide">
                Components
            </h3>

            {Object.entries(componentsByCategory).map(([category, categoryComponents]) => (
                <div key={category} className="mb-1">
                    {/* Category Header */}
                    <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-surface-300 hover:bg-surface-800 rounded"
                    >
                        <span className="text-surface-500">
                            {expandedCategories.has(category) ? (
                                <ChevronDown className="w-3 h-3" />
                            ) : (
                                <ChevronRight className="w-3 h-3" />
                            )}
                        </span>
                        <span className="text-surface-500">
                            {categoryIcons[category as ComponentCategory]}
                        </span>
                        <span className="flex-1 text-left">
                            {categoryLabels[category as ComponentCategory] || category}
                        </span>
                        <span className="text-xs text-surface-600">{categoryComponents.length}</span>
                    </button>

                    {/* Category Components */}
                    {expandedCategories.has(category) && (
                        <div className="ml-4 mt-1 space-y-0.5">
                            {categoryComponents.map((component) => (
                                <div
                                    key={component.type}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, component)}
                                    onClick={() => handleClick(component)}
                                    className={cn(
                                        'flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer',
                                        'text-surface-400 hover:text-surface-200 hover:bg-surface-800',
                                        'transition-colors'
                                    )}
                                    title={component.description}
                                >
                                    <span className="text-surface-500">
                                        {componentIcons[component.type] || <Box className="w-4 h-4" />}
                                    </span>
                                    <span className="truncate">{component.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// Fallback built-in components if API fails
function getBuiltInComponents(): ComponentDefinition[] {
    return [
        { type: 'container', name: 'Container', category: 'layout', icon: 'box', description: 'A flexible container', defaultProps: {}, propDefinitions: [], isContainer: true },
        { type: 'card', name: 'Card', category: 'layout', icon: 'credit-card', description: 'A card container', defaultProps: { title: 'Card' }, propDefinitions: [], isContainer: true },
        { type: 'heading', name: 'Heading', category: 'content', icon: 'type', description: 'A heading', defaultProps: { content: 'Heading', level: 'h2' }, propDefinitions: [], isContainer: false },
        { type: 'text', name: 'Text', category: 'content', icon: 'align-left', description: 'A text block', defaultProps: { content: 'Text content' }, propDefinitions: [], isContainer: false },
        { type: 'button', name: 'Button', category: 'navigation', icon: 'mouse-pointer', description: 'A button', defaultProps: { label: 'Button', variant: 'primary' }, propDefinitions: [], isContainer: false },
        { type: 'text-input', name: 'Text Input', category: 'input', icon: 'type', description: 'A text input', defaultProps: { label: 'Label', placeholder: 'Enter text...' }, propDefinitions: [], isContainer: false },
        { type: 'table', name: 'Table', category: 'data-display', icon: 'table', description: 'A data table', defaultProps: { columns: [], data: [] }, propDefinitions: [], isContainer: false },
        { type: 'bar-chart', name: 'Bar Chart', category: 'charts', icon: 'bar-chart-2', description: 'A bar chart', defaultProps: { data: [] }, propDefinitions: [], isContainer: false },
    ];
}
