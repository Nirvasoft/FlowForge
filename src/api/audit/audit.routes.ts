/**
 * FlowForge Audit Log API Routes
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { auditService } from '../../services/audit/audit.service';

interface QueryParams {
    resource?: string;
    action?: string;
    resourceId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
}

export async function auditRoutes(fastify: FastifyInstance): Promise<void> {
    // GET /api/v1/audit — query audit log entries
    fastify.get('/', async (request: FastifyRequest<{ Querystring: QueryParams }>) => {
        const { resource, action, resourceId, userId, limit, offset } = request.query;
        const result = await auditService.query({
            resource,
            action,
            resourceId,
            userId,
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });

        return {
            success: true,
            data: result.entries,
            pagination: {
                total: result.total,
                limit: limit ? Number(limit) : 50,
                offset: offset ? Number(offset) : 0,
            },
        };
    });

    // GET /api/v1/audit/resource/:resourceId — shorthand for filtering by resourceId
    fastify.get<{ Params: { resourceId: string }; Querystring: QueryParams }>(
        '/resource/:resourceId',
        async (request) => {
            const { limit, offset } = request.query;
            const result = await auditService.query({
                resourceId: request.params.resourceId,
                limit: limit ? Number(limit) : undefined,
                offset: offset ? Number(offset) : undefined,
            });

            return {
                success: true,
                data: result.entries,
                pagination: {
                    total: result.total,
                    limit: limit ? Number(limit) : 50,
                    offset: offset ? Number(offset) : 0,
                },
            };
        }
    );
}
