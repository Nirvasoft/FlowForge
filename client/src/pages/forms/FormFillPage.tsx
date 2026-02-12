/**
 * FormFillPage - Fill out and submit a form
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Loader2,
    Send,
    CheckCircle2,
    AlertCircle,
    FileText,
} from 'lucide-react';
import {
    Button,
    Card,
    CardContent,
} from '../../components/ui';
import { getForm, submitForm } from '../../api/forms';
import type { Form } from '../../types';

type FieldOption = string | { label: string; value: string };

function getOptionLabel(opt: FieldOption): string {
    return typeof opt === 'string' ? opt : opt.label;
}

function getOptionValue(opt: FieldOption): string {
    return typeof opt === 'string' ? opt : opt.value;
}

export function FormFillPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState<Form | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        async function loadForm() {
            if (!id) return;
            try {
                setIsLoading(true);
                const formData = await getForm(id);
                setForm(formData);

                // Initialize default values
                const defaults: Record<string, unknown> = {};
                (formData.fields || []).forEach((field: any) => {
                    const defaultVal = field.config?.defaultValue ?? field.defaultValue;
                    if (defaultVal !== undefined) {
                        defaults[field.name] = defaultVal;
                    } else if (field.type === 'checkbox') {
                        defaults[field.name] = [];
                    } else if (field.type === 'toggle') {
                        defaults[field.name] = false;
                    } else {
                        defaults[field.name] = '';
                    }
                });
                setFormData(defaults);
            } catch (err) {
                console.error('Failed to load form:', err);
                setLoadError('Form not found or you don\'t have access.');
            } finally {
                setIsLoading(false);
            }
        }
        loadForm();
    }, [id]);

    const updateField = (name: string, value: unknown) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear validation error on change
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleCheckboxChange = (name: string, optionValue: string, checked: boolean) => {
        setFormData(prev => {
            const current = (prev[name] as string[]) || [];
            if (checked) {
                return { ...prev, [name]: [...current, optionValue] };
            }
            return { ...prev, [name]: current.filter(v => v !== optionValue) };
        });
    };

    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        (form?.fields || []).forEach((field: any) => {
            if (field.required) {
                const val = formData[field.name];
                if (val === undefined || val === null || val === '') {
                    errors[field.name] = `${field.label} is required`;
                } else if (Array.isArray(val) && val.length === 0) {
                    errors[field.name] = `${field.label} is required`;
                }
            }
        });
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !form) return;

        if (!validate()) return;

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            await submitForm(id, formData);
            setSubmitted(true);
        } catch (err: any) {
            console.error('Failed to submit form:', err);
            const message = err?.response?.data?.error?.message || 'Failed to submit form. Please try again.';
            setSubmitError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get sorted fields
    const sortedFields = [...(form?.fields || [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

    // Get field options (handles both config.options and top-level options)
    const getFieldOptions = (field: any): FieldOption[] => {
        return field.config?.options || field.options || [];
    };

    const inputClass = "w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all";
    const errorInputClass = "w-full px-4 py-2.5 bg-surface-800/50 border border-red-500/50 rounded-lg text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all";

    // Loading
    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    <p className="text-surface-400 text-sm">Loading form...</p>
                </div>
            </div>
        );
    }

    // Error
    if (loadError || !form) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                    <p className="text-surface-300 mb-4">{loadError || 'Form not found'}</p>
                    <Button onClick={() => navigate('/forms')}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to Forms
                    </Button>
                </div>
            </div>
        );
    }

    // Success
    if (submitted) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md animate-in">
                    <div className="p-4 rounded-full bg-emerald-500/10 inline-flex mb-4">
                        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-surface-100 mb-2">
                        Submission Received!
                    </h2>
                    <p className="text-surface-400 mb-6">
                        Your response to <span className="text-surface-200 font-medium">"{form.name}"</span> has been successfully submitted.
                    </p>
                    <div className="flex items-center gap-3 justify-center">
                        <Button variant="ghost" onClick={() => navigate('/forms')}>
                            Back to Forms
                        </Button>
                        <Button onClick={() => {
                            setSubmitted(false);
                            setFormData({});
                            // Re-initialize defaults
                            const defaults: Record<string, unknown> = {};
                            sortedFields.forEach((field: any) => {
                                if (field.type === 'checkbox') defaults[field.name] = [];
                                else if (field.type === 'toggle') defaults[field.name] = false;
                                else defaults[field.name] = '';
                            });
                            setFormData(defaults);
                        }}>
                            <Send className="h-4 w-4" />
                            Submit Another
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/forms')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-surface-100">{form.name}</h1>
                    {form.description && (
                        <p className="mt-0.5 text-surface-400">{form.description}</p>
                    )}
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardContent className="space-y-6 py-6">
                        {sortedFields.map((field: any) => {
                            const fieldName = field.name;
                            const options = getFieldOptions(field);
                            const hasError = !!validationErrors[fieldName];
                            const cls = hasError ? errorInputClass : inputClass;

                            return (
                                <div key={field.id || fieldName}>
                                    <label className="block text-sm font-medium text-surface-200 mb-1.5">
                                        {field.label}
                                        {field.required && <span className="text-red-400 ml-1">*</span>}
                                    </label>
                                    {(field.helpText || field.description) && (
                                        <p className="text-xs text-surface-500 mb-2">{field.helpText || field.description}</p>
                                    )}

                                    {/* Text / Email / Phone / URL */}
                                    {['text', 'email', 'phone', 'url'].includes(field.type) && (
                                        <input
                                            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
                                            className={cls}
                                            placeholder={field.config?.placeholder || field.placeholder || ''}
                                            value={(formData[fieldName] as string) || ''}
                                            onChange={e => updateField(fieldName, e.target.value)}
                                        />
                                    )}

                                    {/* Number */}
                                    {field.type === 'number' && (
                                        <input
                                            type="number"
                                            className={cls}
                                            placeholder={field.config?.placeholder || field.placeholder || ''}
                                            value={(formData[fieldName] as string) || ''}
                                            onChange={e => updateField(fieldName, e.target.value ? Number(e.target.value) : '')}
                                        />
                                    )}

                                    {/* Date */}
                                    {field.type === 'date' && (
                                        <input
                                            type="date"
                                            className={cls}
                                            value={(formData[fieldName] as string) || ''}
                                            onChange={e => updateField(fieldName, e.target.value)}
                                        />
                                    )}

                                    {/* Time */}
                                    {field.type === 'time' && (
                                        <input
                                            type="time"
                                            className={cls}
                                            value={(formData[fieldName] as string) || ''}
                                            onChange={e => updateField(fieldName, e.target.value)}
                                        />
                                    )}

                                    {/* Textarea */}
                                    {field.type === 'textarea' && (
                                        <textarea
                                            className={`${cls} resize-none`}
                                            rows={4}
                                            placeholder={field.config?.placeholder || field.placeholder || ''}
                                            value={(formData[fieldName] as string) || ''}
                                            onChange={e => updateField(fieldName, e.target.value)}
                                        />
                                    )}

                                    {/* Select */}
                                    {field.type === 'select' && (
                                        <select
                                            className={cls}
                                            value={(formData[fieldName] as string) || ''}
                                            onChange={e => updateField(fieldName, e.target.value)}
                                        >
                                            <option value="">{field.config?.placeholder || field.placeholder || 'Select an option'}</option>
                                            {options.map((opt: FieldOption, i: number) => (
                                                <option key={i} value={getOptionValue(opt)}>{getOptionLabel(opt)}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Radio */}
                                    {field.type === 'radio' && (
                                        <div className="space-y-2 mt-1">
                                            {options.map((opt: FieldOption, i: number) => (
                                                <label key={i} className="flex items-center gap-2.5 text-sm text-surface-300 cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        name={fieldName}
                                                        value={getOptionValue(opt)}
                                                        checked={formData[fieldName] === getOptionValue(opt)}
                                                        onChange={e => updateField(fieldName, e.target.value)}
                                                        className="text-primary-500 focus:ring-primary-500/40"
                                                    />
                                                    <span className="group-hover:text-surface-200 transition-colors">{getOptionLabel(opt)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {/* Checkbox */}
                                    {field.type === 'checkbox' && (
                                        <div className="space-y-2 mt-1">
                                            {options.map((opt: FieldOption, i: number) => (
                                                <label key={i} className="flex items-center gap-2.5 text-sm text-surface-300 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        value={getOptionValue(opt)}
                                                        checked={((formData[fieldName] as string[]) || []).includes(getOptionValue(opt))}
                                                        onChange={e => handleCheckboxChange(fieldName, getOptionValue(opt), e.target.checked)}
                                                        className="text-primary-500 focus:ring-primary-500/40 rounded"
                                                    />
                                                    <span className="group-hover:text-surface-200 transition-colors">{getOptionLabel(opt)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {/* Toggle */}
                                    {field.type === 'toggle' && (
                                        <label className="relative inline-flex items-center cursor-pointer mt-1">
                                            <input
                                                type="checkbox"
                                                checked={!!formData[fieldName]}
                                                onChange={e => updateField(fieldName, e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-surface-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 transition-colors"></div>
                                        </label>
                                    )}

                                    {/* File upload placeholder */}
                                    {field.type === 'file' && (
                                        <div className={`${cls} flex items-center gap-2`}>
                                            <FileText className="h-4 w-4 text-surface-500" />
                                            <span className="text-surface-500 text-sm">File upload</span>
                                        </div>
                                    )}

                                    {/* Validation error */}
                                    {hasError && (
                                        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            {validationErrors[fieldName]}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Submit Error */}
                {submitError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {submitError}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button variant="ghost" type="button" onClick={() => navigate('/forms')}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        <Send className="h-4 w-4" />
                        Submit
                    </Button>
                </div>
            </form>
        </div>
    );
}
