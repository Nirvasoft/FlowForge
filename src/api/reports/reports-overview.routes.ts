/**
 * FlowForge Reports Overview Routes
 * Endpoints for real-time analytics data
 */
import type { FastifyInstance } from 'fastify';
import { reportsOverviewService } from '../../services/reports/reports-overview.service.js';

export async function reportsOverviewRoutes(fastify: FastifyInstance) {
    // Full overview data
    fastify.get('/', async () => {
        return reportsOverviewService.getOverview();
    });

    // KPI stats only
    fastify.get('/stats', async () => {
        return reportsOverviewService.getOverviewStats();
    });

    // Workflow trend (6 months)
    fastify.get('/trend', async () => {
        return reportsOverviewService.getWorkflowTrend();
    });

    // Task distribution
    fastify.get('/task-distribution', async () => {
        return reportsOverviewService.getTaskDistribution();
    });

    // Form rankings
    fastify.get('/form-rankings', async () => {
        return reportsOverviewService.getFormRankings();
    });
}
