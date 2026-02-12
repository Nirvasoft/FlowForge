/**
 * FormBuilderPage - Wrapper that fetches form data and renders FormBuilder
 * Handles both "new form" and "edit existing form" modes.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { FormBuilder } from './FormBuilder';
import { getForm, createForm, updateForm } from '../../api/forms';

export function FormBuilderPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNewForm = !id || id === 'new';

    const [formId, setFormId] = useState<string | undefined>(id);
    const [formName, setFormName] = useState('Untitled Form');
    const [initialFields, setInitialFields] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(!isNewForm);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Load existing form data
    useEffect(() => {
        async function loadForm() {
            if (isNewForm) return;

            try {
                const form = await getForm(id!);
                setFormId(form.id);
                setFormName(form.name || 'Untitled Form');

                // Map form fields to FormBuilder's expected format
                const rawOptions = (opts: any) => {
                    if (!opts) return undefined;
                    if (!Array.isArray(opts)) return undefined;
                    // Normalize options: can be string[] or {label, value}[]
                    return opts.map((o: any) =>
                        typeof o === 'string' ? o : (o?.label ?? o?.value ?? String(o))
                    );
                };
                const fields = (form.fields || []).map((f: any) => ({
                    id: f.id || Math.random().toString(36).substring(7),
                    type: f.type || 'text',
                    label: f.label || f.name || 'Field',
                    name: f.name || `field_${Date.now()}`,
                    required: f.required || false,
                    placeholder: f.config?.placeholder || f.placeholder || '',
                    helpText: f.helpText || f.description || '',
                    options: rawOptions(f.options) || rawOptions(f.config?.options),
                    config: f.config,
                }));
                setInitialFields(fields);
            } catch (error) {
                console.error('Failed to load form:', error);
                setLoadError('Failed to load form. It may not exist or you may not have permission.');
            } finally {
                setIsLoading(false);
            }
        }

        loadForm();
    }, [id, isNewForm]);

    // Save handler
    const handleSave = useCallback(async (fields: any[]) => {
        try {
            if (isNewForm && !formId) {
                // Create new form
                const newForm = await createForm({
                    name: formName,
                    fields: fields.map(f => ({
                        name: f.name,
                        label: f.label,
                        type: f.type,
                        required: f.required,
                        config: {
                            placeholder: f.placeholder,
                            helpText: f.helpText,
                            options: f.options,
                            ...f.config,
                        },
                    })),
                });
                setFormId(newForm.id);
                // Update URL to reflect saved form
                navigate(`/forms/${newForm.id}/edit`, { replace: true });
            } else {
                // Update existing form
                await updateForm(formId || id!, {
                    name: formName,
                    fields: fields.map(f => ({
                        id: f.id,
                        name: f.name,
                        label: f.label,
                        type: f.type,
                        required: f.required,
                        config: {
                            placeholder: f.placeholder,
                            helpText: f.helpText,
                            options: f.options,
                            ...f.config,
                        },
                    })),
                });
            }
        } catch (error) {
            console.error('Failed to save form:', error);
        }
    }, [formId, formName, id, isNewForm, navigate]);

    // Back handler
    const handleBack = useCallback(() => {
        navigate('/forms');
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-surface-400 mb-4">{loadError}</p>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                    >
                        Back to Forms
                    </button>
                </div>
            </div>
        );
    }

    return (
        <FormBuilder
            formId={formId}
            formName={formName}
            initialFields={initialFields}
            onBack={handleBack}
            onSave={handleSave}
        />
    );
}
