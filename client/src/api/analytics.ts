/**
 * FlowForge Analytics API Client
 * Dashboards, Reports, Process Analytics
 */

import { get, post, patch, del } from './client';

// ============================================================================
// Dashboard Stats (existing)
// ============================================================================

export interface DashboardStats {
    totalUsers: number;
    activeWorkflows: number;
    formsCreated: number;
    tasksPending: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        // Mock for now - backend aggregation not available yet
        return {
            totalUsers: 156,
            activeWorkflows: 24,
            formsCreated: 89,
            tasksPending: 42,
        };
    } catch (error) {
        return { totalUsers: 0, activeWorkflows: 0, formsCreated: 0, tasksPending: 0 };
    }
}

// ============================================================================
// Custom Dashboards
// ============================================================================

export interface Dashboard {
    id: string;
    name: string;
    description?: string;
    widgets: DashboardWidget[];
    filters: DashboardFilter[];
    isDefault?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DashboardWidget {
    id: string;
    type: 'metric' | 'line' | 'bar' | 'pie' | 'table' | 'map';
    title: string;
    config: Record<string, unknown>;
    position: { x: number; y: number; w: number; h: number };
}

export interface DashboardFilter {
    id: string;
    name: string;
    type: 'date' | 'select' | 'multi-select';
    options?: string[];
}

export async function listDashboards(): Promise<{ dashboards: Dashboard[] }> {
    return get('/api/analytics/dashboards');
}

export async function getDashboard(id: string): Promise<Dashboard> {
    return get(`/api/analytics/dashboards/${id}`);
}

export async function createDashboard(data: Partial<Dashboard>): Promise<Dashboard> {
    return post('/api/analytics/dashboards', data);
}

export async function updateDashboard(id: string, data: Partial<Dashboard>): Promise<Dashboard> {
    return patch(`/api/analytics/dashboards/${id}`, data);
}

export async function deleteDashboard(id: string): Promise<{ success: boolean }> {
    return del(`/api/analytics/dashboards/${id}`);
}

export async function executeDashboard(id: string, filters?: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    return post(`/api/analytics/dashboards/${id}/execute`, { filters });
}

// ============================================================================
// Reports
// ============================================================================

export type ReportType = 'tabular' | 'summary' | 'matrix' | 'custom';
export type ReportFormat = 'pdf' | 'excel' | 'csv';

export interface Report {
    id: string;
    name: string;
    description?: string;
    type: ReportType;
    dataSource?: string;
    columns?: ReportColumn[];
    filters?: ReportFilter[];
    schedule?: ReportSchedule;
    createdAt: string;
    updatedAt: string;
}

export interface ReportColumn {
    id: string;
    name: string;
    field: string;
    type: 'text' | 'number' | 'date' | 'currency';
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ReportFilter {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'between';
    value: unknown;
}

export interface ReportSchedule {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: ReportFormat;
}

export interface ReportRun {
    id: string;
    reportId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    format: ReportFormat;
    startedAt: string;
    completedAt?: string;
    downloadUrl?: string;
    error?: string;
}

export async function listReports(type?: string): Promise<{ reports: Report[] }> {
    const query = type ? `?type=${type}` : '';
    return get(`/api/analytics/reports${query}`);
}

export async function getReport(id: string): Promise<Report> {
    return get(`/api/analytics/reports/${id}`);
}

export async function createReport(data: Partial<Report>): Promise<Report> {
    return post('/api/analytics/reports', data);
}

export async function updateReport(id: string, data: Partial<Report>): Promise<Report> {
    return patch(`/api/analytics/reports/${id}`, data);
}

export async function deleteReport(id: string): Promise<{ success: boolean }> {
    return del(`/api/analytics/reports/${id}`);
}

export async function generateReport(id: string, format: ReportFormat): Promise<ReportRun> {
    return post(`/api/analytics/reports/${id}/generate`, { format });
}

export async function getReportRuns(id: string): Promise<{ runs: ReportRun[] }> {
    return get(`/api/analytics/reports/${id}/runs`);
}

export async function setReportSchedule(id: string, schedule: ReportSchedule): Promise<Report> {
    return post(`/api/analytics/reports/${id}/schedule`, schedule);
}

// ============================================================================
// Process Analytics
// ============================================================================

export interface ProcessMetrics {
    totalExecutions: number;
    completedCount: number;
    failedCount: number;
    avgDurationMs: number;
    minDurationMs: number;
    maxDurationMs: number;
}

export interface ExecutionTrend {
    date: string;
    started: number;
    completed: number;
    failed: number;
}

export interface Bottleneck {
    nodeId: string;
    nodeName: string;
    avgDurationMs: number;
    executionCount: number;
    percentageOfTotal: number;
}

export interface DateRange {
    start: string;
    end: string;
}

export async function getProcessAnalytics(workflowId: string, dateRange: DateRange): Promise<ProcessMetrics> {
    return post(`/api/analytics/process/workflows/${workflowId}`, { dateRange });
}

export async function getBottlenecks(workflowId: string, dateRange: DateRange): Promise<{ bottlenecks: Bottleneck[] }> {
    return post(`/api/analytics/process/workflows/${workflowId}/bottlenecks`, { dateRange });
}

export async function getExecutionTrend(workflowId: string, dateRange: DateRange): Promise<{ trend: ExecutionTrend[] }> {
    return post(`/api/analytics/process/workflows/${workflowId}/trend`, { dateRange });
}

export async function getSlaMetrics(workflowId: string, slaThresholdMs: number, dateRange: DateRange): Promise<{
    withinSla: number;
    exceededSla: number;
    slaComplianceRate: number;
}> {
    return post(`/api/analytics/process/workflows/${workflowId}/sla`, { slaThresholdMs, dateRange });
}
