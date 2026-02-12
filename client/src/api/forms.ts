import apiClient, { get, post, patch, del } from './client';
import type { Form, PaginatedResponse } from '../types';

interface ListFormsParams {
    page?: number;
    limit?: number;
    status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    search?: string;
}

interface CreateFormData {
    name: string;
    description?: string;
    fields?: Array<{
        name: string;
        label: string;
        type: string;
        required?: boolean;
        config?: Record<string, unknown>;
    }>;
}

interface UpdateFormData {
    name?: string;
    description?: string;
    status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    fields?: Array<{
        id?: string;
        name: string;
        label: string;
        type: string;
        required?: boolean;
        config?: Record<string, unknown>;
    }>;
}

/**
 * List forms with pagination and filtering
 */
export async function listForms(params: ListFormsParams = {}): Promise<PaginatedResponse<Form>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);

    const response = await apiClient.get(`/forms?${searchParams.toString()}`);
    const body = response.data;
    // Backend returns { success: true, data: [...forms], pagination: { total, page, limit, ... } }
    const items = body.data || [];
    const pagination = body.pagination || {};
    return {
        items,
        total: pagination.total ?? items.length,
        page: pagination.page ?? (params.page || 1),
        limit: pagination.limit ?? (params.limit || 20),
        totalPages: pagination.totalPages ?? Math.ceil((pagination.total ?? items.length) / (params.limit || 20)),
    };
}

/**
 * Get a single form by ID
 */
export async function getForm(id: string): Promise<Form> {
    return get<Form>(`/forms/${id}`);
}

/**
 * Create a new form
 */
export async function createForm(data: CreateFormData): Promise<Form> {
    return post<Form>('/forms', data);
}

/**
 * Update a form
 */
export async function updateForm(id: string, data: UpdateFormData): Promise<Form> {
    return patch<Form>(`/forms/${id}`, data);
}

/**
 * Delete a form
 */
export async function deleteForm(id: string): Promise<void> {
    await del(`/forms/${id}`);
}

/**
 * Get form submissions
 */
export async function getFormSubmissions(
    formId: string,
    params: { page?: number; limit?: number; sortOrder?: 'asc' | 'desc' } = {}
): Promise<{ data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const response = await apiClient.get(`/forms/${formId}/submissions?${searchParams.toString()}`);
    const body = response.data;
    return {
        data: body.data || [],
        pagination: body.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
}

/**
 * Delete a form submission
 */
export async function deleteFormSubmission(formId: string, submissionId: string): Promise<void> {
    await del(`/forms/${formId}/submissions/${submissionId}`);
}

/**
 * Submit form data
 */
export async function submitForm(formId: string, data: Record<string, unknown>): Promise<any> {
    return post(`/forms/${formId}/submit`, data);
}

/**
 * Get available field types
 */
export async function getFieldTypes(): Promise<Array<{ type: string; label: string; icon: string }>> {
    return get('/forms/field-types');
}
