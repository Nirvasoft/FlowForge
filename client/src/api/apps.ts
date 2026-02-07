/**
 * Apps API Client
 * CRUD operations for applications, pages, and components
 */

import apiClient from './client';
import { get, post, patch, del } from './client';
import type { Application, AppPage, PageComponent, ComponentDefinition, AppType, AppStatus } from '../types';

// ============================================================================
// Application CRUD
// ============================================================================

interface ListAppsParams {
    type?: AppType;
    status?: AppStatus;
    search?: string;
    page?: number;
    pageSize?: number;
}

interface ListAppsResponse {
    apps: Application[];
    total: number;
}

export async function listApps(params: ListAppsParams = {}): Promise<ListAppsResponse> {
    const searchParams = new URLSearchParams();
    if (params.type) searchParams.set('type', params.type);
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const response = await apiClient.get(`/apps?${searchParams.toString()}`);
    return response.data;
}

export async function getApp(id: string): Promise<Application> {
    const response = await apiClient.get(`/apps/${id}`);
    return response.data;
}

export async function createApp(data: { name: string; description?: string; type?: AppType }): Promise<Application> {
    const response = await apiClient.post('/apps', data);
    return response.data;
}

export async function updateApp(id: string, data: Partial<Application>): Promise<Application> {
    const response = await apiClient.patch(`/apps/${id}`, data);
    return response.data;
}

export async function deleteApp(id: string): Promise<void> {
    await apiClient.delete(`/apps/${id}`);
}

export async function publishApp(id: string): Promise<Application> {
    const response = await apiClient.post(`/apps/${id}/publish`, {});
    return response.data;
}

export async function unpublishApp(id: string): Promise<Application> {
    const response = await apiClient.post(`/apps/${id}/unpublish`, {});
    return response.data;
}

export async function duplicateApp(id: string, name: string): Promise<Application> {
    const response = await apiClient.post(`/apps/${id}/duplicate`, { name });
    return response.data;
}

// ============================================================================
// Page Management
// ============================================================================

interface CreatePageData {
    name: string;
    slug?: string;
    icon?: string;
    layout?: AppPage['layout'];
}

export async function addPage(appId: string, data: CreatePageData): Promise<AppPage> {
    return post<AppPage>(`/apps/${appId}/pages`, data);
}

export async function getPage(appId: string, pageId: string): Promise<AppPage> {
    return get<AppPage>(`/apps/${appId}/pages/${pageId}`);
}

export async function updatePage(appId: string, pageId: string, data: Partial<AppPage>): Promise<AppPage> {
    return patch<AppPage>(`/apps/${appId}/pages/${pageId}`, data);
}

export async function deletePage(appId: string, pageId: string): Promise<void> {
    await del(`/apps/${appId}/pages/${pageId}`);
}

// ============================================================================
// Component Management
// ============================================================================

interface AddComponentData {
    type: string;
    name: string;
    position: { row: number; column: number; width: number };
    props?: Record<string, unknown>;
}

export async function addComponent(appId: string, pageId: string, data: AddComponentData): Promise<PageComponent> {
    return post<PageComponent>(`/apps/${appId}/pages/${pageId}/components`, data);
}

export async function updateComponent(
    appId: string,
    pageId: string,
    componentId: string,
    data: Partial<PageComponent>
): Promise<PageComponent> {
    return patch<PageComponent>(`/apps/${appId}/pages/${pageId}/components/${componentId}`, data);
}

export async function deleteComponent(appId: string, pageId: string, componentId: string): Promise<void> {
    await del(`/apps/${appId}/pages/${pageId}/components/${componentId}`);
}

export async function moveComponent(
    appId: string,
    pageId: string,
    componentId: string,
    position: { row: number; column: number; width?: number }
): Promise<PageComponent> {
    return patch<PageComponent>(`/apps/${appId}/pages/${pageId}/components/${componentId}/position`, position);
}

// ============================================================================
// Component Registry
// ============================================================================

interface ComponentsResponse {
    components: ComponentDefinition[];
}

interface CategoriesResponse {
    categories: string[];
}

export async function getComponents(): Promise<ComponentDefinition[]> {
    const response = await get<ComponentsResponse>('/components');
    return response.components;
}

export async function getComponentCategories(): Promise<string[]> {
    const response = await get<CategoriesResponse>('/components/categories');
    return response.categories;
}

export async function getComponentsByCategory(category: string): Promise<ComponentDefinition[]> {
    const response = await get<ComponentsResponse>(`/components/category/${category}`);
    return response.components;
}
