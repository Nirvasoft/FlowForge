/**
 * FlowForge Analytics API Routes
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { dashboardService } from '../../services/analytics/dashboard.service';
import { reportService } from '../../services/analytics/report.service';
import { processAnalyticsService } from '../../services/analytics/process-analytics.service';
import { QueryBuilder, queryExecutor } from '../../services/analytics/query-builder';

interface IdParams { id: string; }
interface WidgetParams extends IdParams { widgetId: string; }
interface FilterParams extends IdParams { filterId: string; }

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { search?: string } }>) => {
    return dashboardService.listDashboards(request.query);
  });

  fastify.post<{ Body: { name: string; description?: string } }>('/', async (request, reply) => {
    const dashboard = await dashboardService.createDashboard({ ...request.body, createdBy: 'user-1' });
    return reply.status(201).send(dashboard);
  });

  fastify.get<{ Params: IdParams }>('/:id', async (request, reply) => {
    const dashboard = await dashboardService.getDashboard(request.params.id);
    if (!dashboard) return reply.status(404).send({ error: 'Dashboard not found' });
    return dashboard;
  });

  fastify.patch<{ Params: IdParams; Body: any }>('/:id', async (request, reply) => {
    const dashboard = await dashboardService.updateDashboard(request.params.id, request.body as any);
    if (!dashboard) return reply.status(404).send({ error: 'Dashboard not found' });
    return dashboard;
  });

  fastify.delete<{ Params: IdParams }>('/:id', async (request, reply) => {
    if (!await dashboardService.deleteDashboard(request.params.id)) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }
    return { success: true };
  });

  fastify.post<{ Params: IdParams; Body: { name: string } }>('/:id/duplicate', async (request, reply) => {
    const dashboard = await dashboardService.duplicateDashboard(request.params.id, request.body.name, 'user-1');
    if (!dashboard) return reply.status(404).send({ error: 'Dashboard not found' });
    return reply.status(201).send(dashboard);
  });

  // Widgets
  fastify.post<{ Params: IdParams; Body: any }>('/:id/widgets', async (request, reply) => {
    const widget = await dashboardService.addWidget(request.params.id, request.body as any);
    if (!widget) return reply.status(404).send({ error: 'Dashboard not found' });
    return reply.status(201).send(widget);
  });

  fastify.patch<{ Params: WidgetParams; Body: any }>('/:id/widgets/:widgetId', async (request, reply) => {
    const widget = await dashboardService.updateWidget(request.params.id, request.params.widgetId, request.body as any);
    if (!widget) return reply.status(404).send({ error: 'Widget not found' });
    return widget;
  });

  fastify.delete<{ Params: WidgetParams }>('/:id/widgets/:widgetId', async (request, reply) => {
    if (!await dashboardService.deleteWidget(request.params.id, request.params.widgetId)) {
      return reply.status(404).send({ error: 'Widget not found' });
    }
    return { success: true };
  });

  // Filters
  fastify.post<{ Params: IdParams; Body: any }>('/:id/filters', async (request, reply) => {
    const filter = await dashboardService.addFilter(request.params.id, request.body as any);
    if (!filter) return reply.status(404).send({ error: 'Dashboard not found' });
    return reply.status(201).send(filter);
  });

  fastify.delete<{ Params: FilterParams }>('/:id/filters/:filterId', async (request, reply) => {
    if (!await dashboardService.deleteFilter(request.params.id, request.params.filterId)) {
      return reply.status(404).send({ error: 'Filter not found' });
    }
    return { success: true };
  });

  // Execute
  fastify.post<{ Params: IdParams; Body: { filters?: Record<string, unknown> } }>('/:id/execute', async (request, reply) => {
    try {
      const results = await dashboardService.executeAllWidgets(request.params.id, request.body.filters);
      return results;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Sharing
  fastify.post<{ Params: IdParams }>('/:id/embed/enable', async (request, reply) => {
    const result = await dashboardService.enableEmbed(request.params.id);
    if (!result) return reply.status(404).send({ error: 'Dashboard not found' });
    return result;
  });
}

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { type?: string } }>) => {
    return reportService.listReports(request.query as any);
  });

  fastify.post<{ Body: { name: string; type: 'tabular' | 'summary' | 'matrix' | 'custom' } }>('/', async (request, reply) => {
    const report = await reportService.createReport({ ...request.body, createdBy: 'user-1' });
    return reply.status(201).send(report);
  });

  fastify.get<{ Params: IdParams }>('/:id', async (request, reply) => {
    const report = await reportService.getReport(request.params.id);
    if (!report) return reply.status(404).send({ error: 'Report not found' });
    return report;
  });

  fastify.patch<{ Params: IdParams; Body: any }>('/:id', async (request, reply) => {
    const report = await reportService.updateReport(request.params.id, request.body as any);
    if (!report) return reply.status(404).send({ error: 'Report not found' });
    return report;
  });

  fastify.delete<{ Params: IdParams }>('/:id', async (request, reply) => {
    if (!await reportService.deleteReport(request.params.id)) {
      return reply.status(404).send({ error: 'Report not found' });
    }
    return { success: true };
  });

  // Sections
  fastify.post<{ Params: IdParams; Body: any }>('/:id/sections', async (request, reply) => {
    const section = await reportService.addSection(request.params.id, request.body as any);
    if (!section) return reply.status(404).send({ error: 'Report not found' });
    return reply.status(201).send(section);
  });

  // Schedule
  fastify.post<{ Params: IdParams; Body: any }>('/:id/schedule', async (request, reply) => {
    const report = await reportService.setSchedule(request.params.id, request.body as any);
    if (!report) return reply.status(404).send({ error: 'Report not found' });
    return report;
  });

  // Generate
  fastify.post<{ Params: IdParams; Body: { format: 'pdf' | 'excel' | 'csv' } }>('/:id/generate', async (request, reply) => {
    try {
      const run = await reportService.generateReport(request.params.id, request.body.format, { userId: 'user-1' });
      return run;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  fastify.get<{ Params: IdParams }>('/:id/runs', async (request) => {
    const runs = await reportService.getReportRuns(request.params.id);
    return { runs };
  });
}

export async function processAnalyticsRoutes(fastify: FastifyInstance) {
  fastify.post<{ Params: { workflowId: string }; Body: { dateRange: any } }>('/workflows/:workflowId', async (request) => {
    return processAnalyticsService.getProcessAnalytics(request.params.workflowId, request.body.dateRange);
  });

  fastify.post<{ Params: { workflowId: string }; Body: { dateRange: any } }>('/workflows/:workflowId/bottlenecks', async (request) => {
    const bottlenecks = await processAnalyticsService.getBottlenecks(request.params.workflowId, request.body.dateRange);
    return { bottlenecks };
  });

  fastify.post<{ Params: { workflowId: string }; Body: { dateRange: any } }>('/workflows/:workflowId/trend', async (request) => {
    const trend = await processAnalyticsService.getExecutionTrend(request.params.workflowId, request.body.dateRange);
    return { trend };
  });

  fastify.post<{ Params: { workflowId: string }; Body: { dateRange: any; slaThresholdMs: number } }>('/workflows/:workflowId/sla', async (request) => {
    return processAnalyticsService.getSlaMetrics(request.params.workflowId, request.body.slaThresholdMs, request.body.dateRange);
  });
}

export async function queryRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: any }>('/execute', async (request, reply) => {
    try {
      const results = await queryExecutor.execute(request.body as any);
      return { data: results, count: results.length };
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });
}
