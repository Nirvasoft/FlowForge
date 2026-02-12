import apiClient from './client';
import type { Dataset, DatasetRecord, PaginatedResponse } from '../types';

interface ListDatasetsParams {
    page?: number;
    limit?: number;
    search?: string;
}

interface CreateDatasetData {
    name: string;
    description?: string;
    columns?: Array<{
        name: string;
        type: string;
        required?: boolean;
        unique?: boolean;
        settings?: Record<string, unknown>;
    }>;
    schema?: Record<string, unknown>;
}

interface UpdateDatasetData {
    name?: string;
    description?: string;
}

interface RecordsResponse {
    data: DatasetRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
}

/**
 * List datasets with pagination
 */
export async function listDatasets(params: ListDatasetsParams = {}): Promise<PaginatedResponse<Dataset>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.search) searchParams.set('search', params.search);

    const response = await apiClient.get(`/datasets?${searchParams.toString()}`);
    const body = response.data;
    // Backend returns { data: [...datasets], total, page, pageSize, totalPages, hasMore } directly
    return {
        items: body.data || [],
        total: body.total ?? 0,
        page: body.page ?? 1,
        limit: body.pageSize ?? 20,
        totalPages: body.totalPages ?? 1,
    };
}

/**
 * Get a single dataset by ID
 */
export async function getDataset(id: string): Promise<Dataset> {
    const response = await apiClient.get(`/datasets/${id}`);
    return response.data;
}

/**
 * Create a new dataset
 */
export async function createDataset(data: CreateDatasetData): Promise<Dataset> {
    const response = await apiClient.post('/datasets', data);
    return response.data;
}

/**
 * Update a dataset
 */
export async function updateDataset(id: string, data: UpdateDatasetData): Promise<Dataset> {
    const response = await apiClient.patch(`/datasets/${id}`, data);
    return response.data;
}

/**
 * Delete a dataset
 */
export async function deleteDataset(id: string): Promise<void> {
    await apiClient.delete(`/datasets/${id}`);
}

/**
 * Get dataset records using simple GET with pagination
 */
export async function getDatasetRecords(
    datasetId: string,
    params: { page?: number; pageSize?: number; search?: string } = {}
): Promise<RecordsResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.search) searchParams.set('search', params.search);

    const response = await apiClient.get(`/datasets/${datasetId}/records?${searchParams.toString()}`);
    return response.data;
}

/**
 * Query dataset records with filtering
 */
export async function queryDatasetRecords(
    datasetId: string,
    query?: Record<string, unknown>
): Promise<RecordsResponse> {
    const response = await apiClient.post(`/datasets/${datasetId}/records/query`, query || {});
    return response.data;
}

/**
 * Create a dataset record
 */
export async function createDatasetRecord(
    datasetId: string,
    data: Record<string, unknown>
): Promise<DatasetRecord> {
    const response = await apiClient.post(`/datasets/${datasetId}/records`, data);
    return response.data;
}

/**
 * Update a dataset record
 */
export async function updateDatasetRecord(
    datasetId: string,
    recordId: string,
    data: Record<string, unknown>
): Promise<DatasetRecord> {
    const response = await apiClient.patch(`/datasets/${datasetId}/records/${recordId}`, data);
    return response.data;
}

/**
 * Delete a dataset record
 */
export async function deleteDatasetRecord(datasetId: string, recordId: string): Promise<void> {
    await apiClient.delete(`/datasets/${datasetId}/records/${recordId}`);
}

/**
 * Import data into a dataset
 */
export async function importDatasetRecords(
    datasetId: string,
    content: string,
    options: {
        format: 'csv' | 'json' | 'tsv';
        delimiter?: string;
        hasHeader?: boolean;
        columnMapping?: Record<string, string>;
        mode?: 'insert' | 'upsert' | 'replace';
        dryRun?: boolean;
    }
): Promise<{
    success: boolean;
    totalRows: number;
    insertedCount: number;
    updatedCount: number;
    errorCount: number;
    errors: Array<{ row: number; message: string }>;
}> {
    const response = await apiClient.post(`/datasets/${datasetId}/import`, { content, ...options });
    return response.data;
}

/**
 * Export dataset
 */
export async function exportDataset(id: string, options?: { format?: string }): Promise<Blob> {
    const response = await apiClient.post(`/datasets/${id}/export`, options || { format: 'csv' }, {
        responseType: 'blob',
    });
    return response.data;
}
