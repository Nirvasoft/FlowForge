/**
 * ComponentPropertiesPanel - Right sidebar for editing component properties
 */

import { useState, useEffect } from 'react';
import { X, Trash2, Settings, Palette, Database } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { getComponents } from '../../../api/apps';
import type { PageComponent, PropDefinition, ComponentDefinition } from '../../../types';

interface ComponentPropertiesPanelProps {
    component: PageComponent;
    onUpdate: (updates: Partial<PageComponent>) => void;
    onDelete: () => void;
    onClose: () => void;
}

export function ComponentPropertiesPanel({
    component,
    onUpdate,
    onDelete,
    onClose,
}: ComponentPropertiesPanelProps) {
    const [activeTab, setActiveTab] = useState<'content' | 'style' | 'data'>('content');
    const [componentDef, setComponentDef] = useState<ComponentDefinition | null>(null);

    // Load component definition for prop definitions
    useEffect(() => {
        async function loadDef() {
            try {
                const components = await getComponents();
                const def = components.find((c) => c.type === component.type);
                setComponentDef(def || null);
            } catch {
                setComponentDef(null);
            }
        }
        loadDef();
    }, [component.type]);

    const handlePropChange = (propName: string, value: unknown) => {
        onUpdate({
            props: { ...component.props, [propName]: value },
        });
    };

    const handleNameChange = (name: string) => {
        onUpdate({ name });
    };

    // Group props by type
    const contentProps = componentDef?.propDefinitions.filter(
        (p) => !p.group || p.group === 'Content'
    ) || [];
    const styleProps = componentDef?.propDefinitions.filter(
        (p) => p.group === 'Style'
    ) || [];

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-surface-700">
                <div>
                    <h3 className="text-sm font-semibold text-surface-100">{component.name || component.type}</h3>
                    <p className="text-xs text-surface-500 capitalize">{component.type}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-surface-700">
                <button
                    onClick={() => setActiveTab('content')}
                    className={cn(
                        'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                        activeTab === 'content'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                    )}
                >
                    <Settings className="w-3 h-3 inline mr-1" />
                    Content
                </button>
                <button
                    onClick={() => setActiveTab('style')}
                    className={cn(
                        'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                        activeTab === 'style'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                    )}
                >
                    <Palette className="w-3 h-3 inline mr-1" />
                    Style
                </button>
                <button
                    onClick={() => setActiveTab('data')}
                    className={cn(
                        'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                        activeTab === 'data'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                    )}
                >
                    <Database className="w-3 h-3 inline mr-1" />
                    Data
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Name field (always shown) */}
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">
                        Component Name
                    </label>
                    <Input
                        value={component.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="text-sm"
                    />
                </div>

                {activeTab === 'content' && (
                    <>
                        {contentProps.length > 0 ? (
                            contentProps.map((prop) => (
                                <PropertyField
                                    key={prop.name}
                                    definition={prop}
                                    value={component.props[prop.name]}
                                    onChange={(value) => handlePropChange(prop.name, value)}
                                />
                            ))
                        ) : (
                            // Fallback for components without definitions
                            <FallbackProperties
                                component={component}
                                onChange={handlePropChange}
                            />
                        )}
                    </>
                )}

                {activeTab === 'style' && (
                    <>
                        {styleProps.length > 0 ? (
                            styleProps.map((prop) => (
                                <PropertyField
                                    key={prop.name}
                                    definition={prop}
                                    value={component.props[prop.name]}
                                    onChange={(value) => handlePropChange(prop.name, value)}
                                />
                            ))
                        ) : (
                            <p className="text-sm text-surface-500 text-center py-4">
                                No style properties available
                            </p>
                        )}
                    </>
                )}

                {activeTab === 'data' && (
                    <div className="text-center py-4">
                        <Database className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                        <p className="text-sm text-surface-500">
                            Data binding coming soon
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-surface-700">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={onDelete}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Component
                </Button>
            </div>
        </div>
    );
}

interface PropertyFieldProps {
    definition: PropDefinition;
    value: unknown;
    onChange: (value: unknown) => void;
}

function PropertyField({ definition, value, onChange }: PropertyFieldProps) {
    const { label, type, options } = definition;

    switch (type) {
        case 'string':
            return (
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">
                        {label}
                    </label>
                    <Input
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="text-sm"
                    />
                </div>
            );

        case 'number':
            return (
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">
                        {label}
                    </label>
                    <Input
                        type="number"
                        value={(value as number) || 0}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className="text-sm"
                    />
                </div>
            );

        case 'boolean':
            return (
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-surface-400">
                        {label}
                    </label>
                    <input
                        type="checkbox"
                        checked={(value as boolean) || false}
                        onChange={(e) => onChange(e.target.checked)}
                        className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500"
                    />
                </div>
            );

        case 'select':
            return (
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">
                        {label}
                    </label>
                    <select
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-200 text-sm"
                    >
                        {options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            );

        case 'color':
            return (
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">
                        {label}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={(value as string) || '#000000'}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-10 h-10 rounded border border-surface-700 bg-surface-800 cursor-pointer"
                        />
                        <Input
                            value={(value as string) || ''}
                            onChange={(e) => onChange(e.target.value)}
                            className="text-sm flex-1"
                            placeholder="#000000"
                        />
                    </div>
                </div>
            );

        case 'json':
            return (
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">
                        {label}
                    </label>
                    <textarea
                        value={typeof value === 'object' ? JSON.stringify(value, null, 2) : ''}
                        onChange={(e) => {
                            try {
                                onChange(JSON.parse(e.target.value));
                            } catch {
                                // Invalid JSON, ignore
                            }
                        }}
                        className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-200 text-sm font-mono h-24 resize-none"
                        placeholder="{}"
                    />
                </div>
            );

        default:
            return (
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">
                        {label}
                    </label>
                    <Input
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        className="text-sm"
                    />
                </div>
            );
    }
}

// Fallback properties for common component types
function FallbackProperties({
    component,
    onChange,
}: {
    component: PageComponent;
    onChange: (name: string, value: unknown) => void;
}) {
    const commonFields: Record<string, string[]> = {
        heading: ['content', 'level'],
        text: ['content'],
        button: ['label', 'variant'],
        'text-input': ['label', 'placeholder'],
        card: ['title', 'subtitle'],
        alert: ['title', 'message', 'variant'],
        'kpi-card': ['title', 'value', 'prefix', 'suffix'],
    };

    const fields = commonFields[component.type] || Object.keys(component.props);

    return (
        <>
            {fields.map((field) => (
                <div key={field}>
                    <label className="block text-xs font-medium text-surface-400 mb-1 capitalize">
                        {field.replace(/([A-Z])/g, ' $1')}
                    </label>
                    <Input
                        value={String(component.props[field] || '')}
                        onChange={(e) => onChange(field, e.target.value)}
                        className="text-sm"
                    />
                </div>
            ))}
        </>
    );
}
