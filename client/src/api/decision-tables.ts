/**
 * Decision Tables API Client
 */

import apiClient from './client';
import { get, post, patch, del } from './client';
import type { DecisionTable, TableInput, TableOutput, TableRule, TestCase, HitPolicy } from '../types';

// ============================================================================
// Tables
// ============================================================================

export async function listTables(options?: { status?: string; search?: string }): Promise<{ tables: DecisionTable[] }> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.search) params.set('search', options.search);
    const query = params.toString();
    const response = await apiClient.get(`/decision-tables${query ? `?${query}` : ''}`);
    return response.data;
}

export async function getTable(id: string): Promise<DecisionTable> {
    const response = await apiClient.get(`/decision-tables/${id}`);
    return response.data;
}

export async function createTable(data: {
    name: string;
    description?: string;
    hitPolicy?: HitPolicy;
}): Promise<DecisionTable> {
    return post('/decision-tables', data);
}

export async function updateTable(id: string, data: Partial<DecisionTable>): Promise<DecisionTable> {
    return patch(`/decision-tables/${id}`, data);
}

export async function deleteTable(id: string): Promise<{ success: boolean }> {
    return del(`/decision-tables/${id}`);
}

export async function validateTable(id: string): Promise<{ valid: boolean; errors: string[] }> {
    return post(`/decision-tables/${id}/validate`, {});
}

export async function publishTable(id: string): Promise<DecisionTable> {
    return post(`/decision-tables/${id}/publish`, {});
}

export async function unpublishTable(id: string): Promise<DecisionTable> {
    return post(`/decision-tables/${id}/unpublish`, {});
}

// ============================================================================
// Inputs
// ============================================================================

export async function addInput(tableId: string, data: Omit<TableInput, 'id'>): Promise<TableInput> {
    return post(`/decision-tables/${tableId}/inputs`, data);
}

export async function updateInput(tableId: string, inputId: string, data: Partial<TableInput>): Promise<TableInput> {
    return patch(`/decision-tables/${tableId}/inputs/${inputId}`, data);
}

export async function deleteInput(tableId: string, inputId: string): Promise<{ success: boolean }> {
    return del(`/decision-tables/${tableId}/inputs/${inputId}`);
}

// ============================================================================
// Outputs
// ============================================================================

export async function addOutput(tableId: string, data: Omit<TableOutput, 'id'>): Promise<TableOutput> {
    return post(`/decision-tables/${tableId}/outputs`, data);
}

export async function updateOutput(tableId: string, outputId: string, data: Partial<TableOutput>): Promise<TableOutput> {
    return patch(`/decision-tables/${tableId}/outputs/${outputId}`, data);
}

export async function deleteOutput(tableId: string, outputId: string): Promise<{ success: boolean }> {
    return del(`/decision-tables/${tableId}/outputs/${outputId}`);
}

// ============================================================================
// Rules
// ============================================================================

export async function addRule(tableId: string, data: Partial<TableRule>): Promise<TableRule> {
    return post(`/decision-tables/${tableId}/rules`, data);
}

export async function updateRule(tableId: string, ruleId: string, data: Partial<TableRule>): Promise<TableRule> {
    return patch(`/decision-tables/${tableId}/rules/${ruleId}`, data);
}

export async function deleteRule(tableId: string, ruleId: string): Promise<{ success: boolean }> {
    return del(`/decision-tables/${tableId}/rules/${ruleId}`);
}

export async function reorderRules(tableId: string, ruleIds: string[]): Promise<{ success: boolean }> {
    return patch(`/decision-tables/${tableId}/rules/order`, { ruleIds });
}

export async function setRuleCondition(
    tableId: string,
    ruleId: string,
    inputId: string,
    condition: unknown
): Promise<TableRule> {
    return patch(`/decision-tables/${tableId}/rules/${ruleId}/condition`, { inputId, condition });
}

export async function setRuleOutput(
    tableId: string,
    ruleId: string,
    outputId: string,
    value: unknown,
    expression?: string
): Promise<TableRule> {
    return patch(`/decision-tables/${tableId}/rules/${ruleId}/output`, { outputId, value, expression });
}

// ============================================================================
// Evaluation
// ============================================================================

export async function evaluate(
    tableId: string,
    inputs: Record<string, unknown>
): Promise<{ outputs: Record<string, unknown>; matchedRules: string[] }> {
    return post(`/decision-tables/${tableId}/evaluate`, { inputs });
}

export async function getEvaluationLogs(
    tableId: string,
    options?: { limit?: number; offset?: number }
): Promise<{ logs: unknown[] }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    const query = params.toString();
    return get(`/decision-tables/${tableId}/logs${query ? `?${query}` : ''}`);
}

// ============================================================================
// Test Cases
// ============================================================================

export async function getTestCases(tableId: string): Promise<{ testCases: TestCase[] }> {
    return get(`/decision-tables/${tableId}/tests`);
}

export async function addTestCase(tableId: string, data: Omit<TestCase, 'id'>): Promise<TestCase> {
    return post(`/decision-tables/${tableId}/tests`, data);
}

export async function runTestCase(
    tableId: string,
    testId: string
): Promise<{ passed: boolean; actualOutputs: Record<string, unknown> }> {
    return post(`/decision-tables/${tableId}/tests/${testId}/run`, {});
}

export async function runAllTests(tableId: string): Promise<{ passed: number; failed: number; results: unknown[] }> {
    return post(`/decision-tables/${tableId}/tests/run-all`, {});
}

export async function deleteTestCase(tableId: string, testId: string): Promise<{ success: boolean }> {
    return del(`/decision-tables/${tableId}/tests/${testId}`);
}
