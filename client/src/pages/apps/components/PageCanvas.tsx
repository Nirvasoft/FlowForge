/**
 * PageCanvas - Visual canvas for rendering and editing page components
 */

import { useState, useCallback } from 'react';
import { Trash2, Move } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { AppPage, PageComponent } from '../../../types';

interface PageCanvasProps {
    page: AppPage;
    selectedComponent: PageComponent | null;
    onSelectComponent: (component: PageComponent | null) => void;
    onDeleteComponent: (componentId: string) => void;
}

export function PageCanvas({
    page,
    selectedComponent,
    onSelectComponent,
    onDeleteComponent,
}: PageCanvasProps) {
    const [dragOverRow, setDragOverRow] = useState<number | null>(null);

    const handleDrop = useCallback((e: React.DragEvent, _row: number) => {
        e.preventDefault();
        setDragOverRow(null);
        // Component adding is handled by AppBuilder through onDragComponent
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, row: number) => {
        e.preventDefault();
        setDragOverRow(row);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverRow(null);
    }, []);

    // Sort components by row
    const sortedComponents = [...page.components].sort((a, b) => a.position.row - b.position.row);

    return (
        <div className="min-h-full p-8">
            {/* Page Header */}
            <div className="mb-6">
                <h2 className="text-lg font-medium text-surface-200">{page.name}</h2>
                <p className="text-sm text-surface-500">/{page.slug}</p>
            </div>

            {/* Canvas Grid */}
            <div className="bg-surface-900 border border-surface-700 rounded-lg min-h-[400px] p-4">
                {sortedComponents.length === 0 ? (
                    <div
                        className={cn(
                            'h-32 border-2 border-dashed rounded-lg flex items-center justify-center',
                            'text-surface-500 hover:border-surface-500 transition-colors',
                            dragOverRow !== null && 'border-primary-500 bg-primary-500/10'
                        )}
                        onDrop={(e) => handleDrop(e, 0)}
                        onDragOver={(e) => handleDragOver(e, 0)}
                        onDragLeave={handleDragLeave}
                    >
                        Drag components here or click to add
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sortedComponents.map((component) => (
                            <ComponentWrapper
                                key={component.id}
                                component={component}
                                isSelected={selectedComponent?.id === component.id}
                                onSelect={() => onSelectComponent(component)}
                                onDelete={() => onDeleteComponent(component.id)}
                            />
                        ))}

                        {/* Drop zone at the end */}
                        <div
                            className={cn(
                                'h-16 border-2 border-dashed border-surface-700 rounded-lg',
                                'flex items-center justify-center text-surface-600',
                                dragOverRow !== null && 'border-primary-500 bg-primary-500/10'
                            )}
                            onDrop={(e) => handleDrop(e, sortedComponents.length)}
                            onDragOver={(e) => handleDragOver(e, sortedComponents.length)}
                            onDragLeave={handleDragLeave}
                        >
                            + Add component
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface ComponentWrapperProps {
    component: PageComponent;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

function ComponentWrapper({ component, isSelected, onSelect, onDelete }: ComponentWrapperProps) {
    return (
        <div
            className={cn(
                'relative group rounded-lg border transition-all cursor-pointer',
                isSelected
                    ? 'border-primary-500 ring-2 ring-primary-500/20'
                    : 'border-surface-700 hover:border-surface-600'
            )}
            onClick={onSelect}
        >
            {/* Selection Toolbar */}
            {isSelected && (
                <div className="absolute -top-3 left-2 flex items-center gap-1 bg-primary-600 text-white text-xs px-2 py-0.5 rounded">
                    <span>{component.name || component.type}</span>
                </div>
            )}

            {/* Actions */}
            <div className={cn(
                'absolute -top-2 right-2 flex items-center gap-1',
                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}>
                <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="p-1 bg-surface-800 border border-surface-600 rounded text-surface-400 hover:text-surface-200"
                >
                    <Move className="w-3 h-3" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1 bg-surface-800 border border-surface-600 rounded text-surface-400 hover:text-red-400"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>

            {/* Component Preview */}
            <div className="p-4">
                <ComponentPreview component={component} />
            </div>
        </div>
    );
}

interface ComponentPreviewProps {
    component: PageComponent;
}

function ComponentPreview({ component }: ComponentPreviewProps) {
    const { type, props } = component;

    switch (type) {
        case 'heading':
            const HeadingTag = (props.level as 'h1' | 'h2' | 'h3' | 'h4') || 'h2';
            return (
                <HeadingTag className={cn(
                    'text-surface-100',
                    HeadingTag === 'h1' && 'text-2xl font-bold',
                    HeadingTag === 'h2' && 'text-xl font-semibold',
                    HeadingTag === 'h3' && 'text-lg font-medium',
                    HeadingTag === 'h4' && 'text-base font-medium',
                )}>
                    {String(props.content || 'Heading')}
                </HeadingTag>
            );

        case 'text':
            return (
                <p className="text-surface-300 text-sm">
                    {String(props.content || 'Text content')}
                </p>
            );

        case 'button':
            return (
                <button className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    props.variant === 'primary' && 'bg-primary-600 text-white',
                    props.variant === 'secondary' && 'bg-surface-700 text-surface-200',
                    props.variant === 'outline' && 'border border-surface-600 text-surface-200',
                )}>
                    {String(props.label || 'Button')}
                </button>
            );

        case 'text-input':
            return (
                <div>
                    {props.label ? (
                        <label className="block text-sm text-surface-400 mb-1">
                            {String(props.label)}
                        </label>
                    ) : null}
                    <input
                        type="text"
                        placeholder={(props.placeholder as string) || ''}
                        className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-surface-200 text-sm"
                        disabled
                    />
                </div>
            );

        case 'card':
            return (
                <div className="bg-surface-800 border border-surface-700 rounded-lg p-4">
                    {props.title ? (
                        <h4 className="text-surface-200 font-medium mb-2">{String(props.title)}</h4>
                    ) : null}
                    <p className="text-surface-500 text-sm">Card content</p>
                </div>
            );

        case 'table':
            return (
                <div className="border border-surface-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-800">
                            <tr>
                                <th className="px-4 py-2 text-left text-surface-400">Column 1</th>
                                <th className="px-4 py-2 text-left text-surface-400">Column 2</th>
                                <th className="px-4 py-2 text-left text-surface-400">Column 3</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-t border-surface-700">
                                <td className="px-4 py-2 text-surface-300">Data</td>
                                <td className="px-4 py-2 text-surface-300">Data</td>
                                <td className="px-4 py-2 text-surface-300">Data</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            );

        case 'container':
            return (
                <div className="border border-dashed border-surface-600 rounded-lg p-4 min-h-[60px]">
                    <p className="text-surface-600 text-xs text-center">Container</p>
                </div>
            );

        case 'kpi-card':
            return (
                <div className="bg-surface-800 border border-surface-700 rounded-lg p-4">
                    <p className="text-surface-500 text-sm">{String(props.title || 'KPI')}</p>
                    <p className="text-2xl font-bold text-surface-100 mt-1">
                        {String(props.prefix || '')}{Number(props.value) || 0}{String(props.suffix || '')}
                    </p>
                </div>
            );

        case 'bar-chart':
        case 'line-chart':
        case 'pie-chart':
            return (
                <div className="h-32 bg-surface-800 border border-surface-700 rounded-lg flex items-center justify-center">
                    <span className="text-surface-500 text-sm">
                        {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Preview
                    </span>
                </div>
            );

        case 'alert':
            const alertColors: Record<string, string> = {
                info: 'bg-blue-900/30 border-blue-700/50 text-blue-300',
                success: 'bg-green-900/30 border-green-700/50 text-green-300',
                warning: 'bg-amber-900/30 border-amber-700/50 text-amber-300',
                error: 'bg-red-900/30 border-red-700/50 text-red-300',
            };
            return (
                <div className={cn(
                    'px-4 py-3 rounded-lg border',
                    alertColors[(props.variant as string) || 'info']
                )}>
                    {props.title ? <p className="font-medium">{String(props.title)}</p> : null}
                    <p className="text-sm opacity-80">{String(props.message || 'Alert message')}</p>
                </div>
            );

        case 'divider':
            return <hr className="border-surface-600" />;

        default:
            return (
                <div className="p-4 bg-surface-800/50 rounded text-center">
                    <p className="text-surface-500 text-sm">{component.name || type}</p>
                </div>
            );
    }
}
