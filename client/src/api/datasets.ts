import apiClient, { get, post, patch, del } from './client';
import type { Dataset, PaginatedResponse } from '../types';

interface ListDatasetsParams {
    page?: number;
    limit?: number;
    search?: string;
}

interface CreateDatasetData {
    name: string;
    description?: string;
    schema?: Record<string, unknown>;
}

interface UpdateDatasetData {
    name?: string;
    description?: string;
}

interface DatasetRecord {
    id: string;
    data: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
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
    return get<Dataset>(`/datasets/${id}`);
}

/**
 * Create a new dataset
 */
export async function createDataset(data: CreateDatasetData): Promise<Dataset> {
    return post<Dataset>('/datasets', data);
}

/**
 * Update a dataset
 */
export async function updateDataset(id: string, data: UpdateDatasetData): Promise<Dataset> {
    return patch<Dataset>(`/datasets/${id}`, data);
}

/**
 * Delete a dataset
 */
export async function deleteDataset(id: string): Promise<void> {
    await del(`/datasets/${id}`);
}

/**
 * Query dataset records
 */
export async function queryDatasetRecords(
    datasetId: string,
    query?: Record<string, unknown>
): Promise<DatasetRecord[]> {
    return post<DatasetRecord[]>(`/datasets/${datasetId}/query`, query || {});
}

/**
 * Create a dataset record
 */
export async function createDatasetRecord(
    datasetId: string,
    data: Record<string, unknown>
): Promise<DatasetRecord> {
    return post<DatasetRecord>(`/datasets/${datasetId}/records`, data);
}

/**
 * Update a dataset record
 */
export async function updateDatasetRecord(
    datasetId: string,
    recordId: string,
    data: Record<string, unknown>
): Promise<DatasetRecord> {
    return patch<DatasetRecord>(`/datasets/${datasetId}/records/${recordId}`, data);
}

/**
 * Delete a dataset record
 */
export async function deleteDatasetRecord(datasetId: string, recordId: string): Promise<void> {
    await del(`/datasets/${datasetId}/records/${recordId}`);
}

/**
 * Export dataset
 */
export async function exportDataset(id: string): Promise<Blob> {
    const response = await fetch(`/api/v1/datasets/${id}/export`);
    return response.blob();
}
