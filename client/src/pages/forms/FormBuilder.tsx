import { useState, useCallback } from 'react';
import {
    Type,
    AlignLeft,
    Hash,
    Calendar,
    ToggleLeft,
    List,
    Radio,
    CheckSquare,
    Mail,
    Phone,
    Link2,
    Upload,
    Clock,
    GripVertical,
    Trash2,
    Eye,
    Save,
    ArrowLeft,
    Plus
} from 'lucide-react';
import {
    Button,
    Input,
    Card,
    CardHeader,
    CardContent,
    Badge
} from '../../components/ui';
import { cn } from '../../lib/utils';

// Field type definitions
const FIELD_TYPES = [
    { type: 'text', label: 'Text', icon: Type, description: 'Single-line text input' },
    { type: 'textarea', label: 'Text Area', icon: AlignLeft, description: 'Multi-line text input' },
    { type: 'number', label: 'Number', icon: Hash, description: 'Numeric input' },
    { type: 'email', label: 'Email', icon: Mail, description: 'Email address input' },
    { type: 'phone', label: 'Phone', icon: Phone, description: 'Phone number input' },
    { type: 'url', label: 'URL', icon: Link2, description: 'Web URL input' },
    { type: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
    { type: 'time', label: 'Time', icon: Clock, description: 'Time picker' },
    { type: 'select', label: 'Dropdown', icon: List, description: 'Single selection dropdown' },
    { type: 'radio', label: 'Radio', icon: Radio, description: 'Single choice from options' },
    { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Multiple choice' },
    { type: 'toggle', label: 'Toggle', icon: ToggleLeft, description: 'Boolean on/off switch' },
    { type: 'file', label: 'File Upload', icon: Upload, description: 'File attachment' },
] as const;

interface FormField {
    id: string;
    type: string;
    label: string;
    name: string;
    required: boolean;
    placeholder?: string;
    helpText?: string;
    options?: string[];
    config?: Record<string, unknown>;
}

interface FormBuilderProps {
    formId?: string;
    formName?: string;
    initialFields?: FormField[];
    onBack?: () => void;
    onSave?: (fields: FormField[]) => void;
}

export function FormBuilder({
    formId,
    formName = 'Untitled Form',
    initialFields = [],
    onBack,
    onSave
}: FormBuilderProps) {
    const [fields, setFields] = useState<FormField[]>(initialFields);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [draggedType, setDraggedType] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const selectedField = fields.find(f => f.id === selectedFieldId);

    // Add field from palette
    const handleAddField = useCallback((type: string) => {
        const fieldType = FIELD_TYPES.find(ft => ft.type === type);
        if (!fieldType) return;

        const newField: FormField = {
            id: Math.random().toString(36).substring(7),
            type,
            label: fieldType.label,
            name: `field_${Date.now()}`,
            required: false,
            placeholder: '',
            helpText: '',
            options: type === 'select' || type === 'radio' || type === 'checkbox'
                ? ['Option 1', 'Option 2', 'Option 3']
                : undefined,
        };

        setFields(prev => [...prev, newField]);
        setSelectedFieldId(newField.id);
    }, []);

    // Drag handlers
    const handleDragStart = (type: string) => {
        setDraggedType(type);
    };

    const handleDragEnd = () => {
        setDraggedType(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedType) {
            handleAddField(draggedType);
            setDraggedType(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Update field
    const handleUpdateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
        setFields(prev => prev.map(f =>
            f.id === fieldId ? { ...f, ...updates } : f
        ));
    }, []);

    // Delete field
    const handleDeleteField = useCallback((fieldId: string) => {
        setFields(prev => prev.filter(f => f.id !== fieldId));
        if (selectedFieldId === fieldId) {
            setSelectedFieldId(null);
        }
    }, [selectedFieldId]);

    // Move field up/down
    const handleMoveField = useCallback((fieldId: string, direction: 'up' | 'down') => {
        setFields(prev => {
            const index = prev.findIndex(f => f.id === fieldId);
            if (index === -1) return prev;

            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) return prev;

            const newFields = [...prev];
            [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
            return newFields;
        });
    }, []);

    // Save form
    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        onSave?.(fields);
        setIsSaving(false);
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <Button variant="ghost" size="sm" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-surface-100">{formName}</h1>
                        <p className="text-sm text-surface-400">
                            {fields.length} field{fields.length !== 1 ? 's' : ''}
                            {formId && ` • ${formId}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                    >
                        <Eye className="h-4 w-4" />
                        {isPreviewMode ? 'Edit' : 'Preview'}
                    </Button>
                    <Button onClick={handleSave} isLoading={isSaving}>
                        <Save className="h-4 w-4" />
                        Save Form
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Field Palette */}
                {!isPreviewMode && (
                    <div className="w-64 flex-shrink-0 overflow-y-auto">
                        <Card className="h-full">
                            <CardHeader title="Fields" description="Drag to add fields" />
                            <CardContent className="p-2 space-y-1">
                                {FIELD_TYPES.map((fieldType) => {
                                    const Icon = fieldType.icon;
                                    return (
                                        <div
                                            key={fieldType.type}
                                            draggable
                                            onDragStart={() => handleDragStart(fieldType.type)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => handleAddField(fieldType.type)}
                                            className="flex items-center gap-3 p-2.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-surface-700/50 border border-transparent hover:border-surface-600 transition-colors group"
                                        >
                                            <div className="p-1.5 rounded-md bg-primary-500/10 text-primary-400 group-hover:bg-primary-500/20">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-surface-200">{fieldType.label}</p>
                                                <p className="text-xs text-surface-500 truncate">{fieldType.description}</p>
                                            </div>
                                            <Plus className="h-4 w-4 text-surface-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Form Canvas */}
                <div className="flex-1 overflow-y-auto">
                    <Card
                        className={cn(
                            "h-full transition-colors",
                            draggedType && "border-primary-500/50 bg-primary-500/5"
                        )}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <CardContent className="p-6">
                            {fields.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                                    <div className="p-4 rounded-full bg-surface-800/50 mb-4">
                                        <Plus className="h-8 w-8 text-surface-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-surface-200">No fields yet</h3>
                                    <p className="mt-1 text-surface-400 max-w-sm">
                                        {isPreviewMode
                                            ? 'Switch to edit mode to add fields'
                                            : 'Drag fields from the palette or click to add them'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {fields.map((field, index) => (
                                        <FieldCard
                                            key={field.id}
                                            field={field}
                                            index={index}
                                            totalFields={fields.length}
                                            isSelected={selectedFieldId === field.id}
                                            isPreviewMode={isPreviewMode}
                                            onSelect={() => setSelectedFieldId(field.id)}
                                            onDelete={() => handleDeleteField(field.id)}
                                            onMove={(dir) => handleMoveField(field.id, dir)}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Properties Panel */}
                {!isPreviewMode && selectedField && (
                    <div className="w-80 flex-shrink-0 overflow-y-auto">
                        <Card className="h-full">
                            <CardHeader
                                title="Field Properties"
                                description={`Configure "${selectedField.label}"`}
                            />
                            <CardContent className="p-4 space-y-4">
                                <Input
                                    label="Label"
                                    value={selectedField.label}
                                    onChange={(e) => handleUpdateField(selectedField.id, { label: e.target.value })}
                                />
                                <Input
                                    label="Field Name"
                                    value={selectedField.name}
                                    onChange={(e) => handleUpdateField(selectedField.id, {
                                        name: e.target.value.replace(/\s+/g, '_').toLowerCase()
                                    })}
                                />
                                <Input
                                    label="Placeholder"
                                    value={selectedField.placeholder || ''}
                                    onChange={(e) => handleUpdateField(selectedField.id, { placeholder: e.target.value })}
                                />
                                <Input
                                    label="Help Text"
                                    value={selectedField.helpText || ''}
                                    onChange={(e) => handleUpdateField(selectedField.id, { helpText: e.target.value })}
                                />
                                <div className="flex items-center gap-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedField.required}
                                            onChange={(e) => handleUpdateField(selectedField.id, { required: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                                    </label>
                                    <span className="text-sm text-surface-200">Required field</span>
                                </div>

                                {/* Options for select/radio/checkbox */}
                                {(selectedField.type === 'select' || selectedField.type === 'radio' || selectedField.type === 'checkbox') && (
                                    <div>
                                        <label className="block text-sm font-medium text-surface-200 mb-2">Options</label>
                                        <div className="space-y-2">
                                            {(selectedField.options || []).map((option, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <Input
                                                        value={option}
                                                        onChange={(e) => {
                                                            const newOptions = [...(selectedField.options || [])];
                                                            newOptions[i] = e.target.value;
                                                            handleUpdateField(selectedField.id, { options: newOptions });
                                                        }}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const newOptions = (selectedField.options || []).filter((_, idx) => idx !== i);
                                                            handleUpdateField(selectedField.id, { options: newOptions });
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => {
                                                    const newOptions = [...(selectedField.options || []), `Option ${(selectedField.options?.length || 0) + 1}`];
                                                    handleUpdateField(selectedField.id, { options: newOptions });
                                                }}
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add Option
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}

// Field Card Component
interface FieldCardProps {
    field: FormField;
    index: number;
    totalFields: number;
    isSelected: boolean;
    isPreviewMode: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onMove: (direction: 'up' | 'down') => void;
}

function FieldCard({
    field,
    index,
    totalFields,
    isSelected,
    isPreviewMode,
    onSelect,
    onDelete,
    onMove
}: FieldCardProps) {
    const fieldType = FIELD_TYPES.find(ft => ft.type === field.type);
    const Icon = fieldType?.icon || Type;

    if (isPreviewMode) {
        return (
            <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-sm font-medium text-surface-200">
                    {field.label}
                    {field.required && <span className="text-red-400">*</span>}
                </label>
                {renderFieldPreview(field)}
                {field.helpText && (
                    <p className="text-xs text-surface-500">{field.helpText}</p>
                )}
            </div>
        );
    }

    return (
        <div
            onClick={onSelect}
            className={cn(
                "group p-3 rounded-lg border transition-all cursor-pointer",
                isSelected
                    ? "border-primary-500 bg-primary-500/5"
                    : "border-surface-700 hover:border-surface-600 bg-surface-800/30"
            )}
        >
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0 text-surface-500 cursor-grab">
                    <GripVertical className="h-4 w-4" />
                </div>
                <div className="p-1.5 rounded-md bg-surface-700/50">
                    <Icon className="h-4 w-4 text-surface-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-surface-100 truncate">{field.label}</span>
                        {field.required && <Badge variant="error">Required</Badge>}
                    </div>
                    <p className="text-xs text-surface-500 truncate">
                        {field.name} • {fieldType?.label}
                    </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onMove('up'); }}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200 disabled:opacity-30"
                    >
                        ↑
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onMove('down'); }}
                        disabled={index === totalFields - 1}
                        className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200 disabled:opacity-30"
                    >
                        ↓
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1 rounded hover:bg-red-500/20 text-surface-400 hover:text-red-400"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Preview renderer
function renderFieldPreview(field: FormField) {
    const baseClass = "w-full px-3 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 placeholder-surface-500";

    switch (field.type) {
        case 'textarea':
            return <textarea className={cn(baseClass, "resize-none")} rows={3} placeholder={field.placeholder} disabled />;
        case 'select':
            return (
                <select className={baseClass} disabled>
                    <option value="">{field.placeholder || 'Select an option'}</option>
                    {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                </select>
            );
        case 'radio':
            return (
                <div className="space-y-2">
                    {field.options?.map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 text-sm text-surface-300">
                            <input type="radio" name={field.name} disabled className="text-primary-500" />
                            {opt}
                        </label>
                    ))}
                </div>
            );
        case 'checkbox':
            return (
                <div className="space-y-2">
                    {field.options?.map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 text-sm text-surface-300">
                            <input type="checkbox" disabled className="text-primary-500" />
                            {opt}
                        </label>
                    ))}
                </div>
            );
        case 'toggle':
            return (
                <label className="relative inline-flex items-center cursor-not-allowed">
                    <input type="checkbox" disabled className="sr-only peer" />
                    <div className="w-9 h-5 bg-surface-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
            );
        default:
            return (
                <input
                    type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
                    className={baseClass}
                    placeholder={field.placeholder}
                    disabled
                />
            );
    }
}

export default FormBuilder;
