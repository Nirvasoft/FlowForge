/**
 * FlowForge Dashboard API Routes
 */
import type { FastifyInstance } from 'fastify';
import { dashboardStatsService } from '../../services/dashboard/dashboard.service.js';
import { authenticate } from '../../middleware/auth.js';

export async function dashboardStatsRoutes(fastify: FastifyInstance) {
    // All dashboard routes require authentication (for accountId scoping)
    fastify.addHook('onRequest', authenticate);

    // GET / – Full dashboard data (stats + activity + performance)
    fastify.get('/', async (request) => {
        return dashboardStatsService.getDashboard(request.accountId!);
    });

    // GET /stats – Just the stat cards
    fastify.get('/stats', async (request) => {
        return dashboardStatsService.getStats(request.accountId!);
    });

    // GET /activity – Recent activity feed
    fastify.get('/activity', async (request) => {
        const { limit } = request.query as { limit?: string };
        return dashboardStatsService.getRecentActivity(request.accountId!, limit ? parseInt(limit, 10) : 10);
    });

    // GET /performance – Performance metrics
    fastify.get('/performance', async (request) => {
        return dashboardStatsService.getPerformance(request.accountId!);
    });
}
