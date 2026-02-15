/**
 * FlowForge Dashboard API Routes
 */
import type { FastifyInstance } from 'fastify';
import { dashboardStatsService } from '../../services/dashboard/dashboard.service.js';

export async function dashboardStatsRoutes(fastify: FastifyInstance) {
    // GET / – Full dashboard data (stats + activity + performance)
    fastify.get('/', async () => {
        return dashboardStatsService.getDashboard();
    });

    // GET /stats – Just the stat cards
    fastify.get('/stats', async () => {
        return dashboardStatsService.getStats();
    });

    // GET /activity – Recent activity feed
    fastify.get('/activity', async (request) => {
        const { limit } = request.query as { limit?: string };
        return dashboardStatsService.getRecentActivity(limit ? parseInt(limit, 10) : 10);
    });

    // GET /performance – Performance metrics
    fastify.get('/performance', async () => {
        return dashboardStatsService.getPerformance();
    });
}
