/**
 * FlowForge App Builder API Routes
 * REST endpoints for apps, pages, components, and themes
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { appBuilderService } from '../../services/apps/app-builder.service';
import { appActionsService } from '../../services/apps/app-actions.service';
import { componentRegistry } from '../../services/apps/component-registry';
import { prisma } from '../../utils/prisma.js';

interface IdParams { id: string; }
interface PageParams extends IdParams { pageId: string; }
interface ComponentParams extends PageParams { componentId: string; }
interface DataSourceParams extends IdParams { dataSourceId: string; }

// Cache demo account ID to avoid repeated DB lookups
let demoAccountId: string | null = null;

async function getAccountId(request: any): Promise<string> {
  if (request.accountId) return request.accountId;
  if (demoAccountId) return demoAccountId;
  const demo = await prisma.account.findFirst({ where: { slug: 'demo' } });
  if (demo) { demoAccountId = demo.id; return demo.id; }
  return 'demo'; // last resort
}

export async function appRoutes(fastify: FastifyInstance) {
  const service = appBuilderService;

  // App CRUD
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { type?: string; status?: string; search?: string } }>) => {
    const accountId = await getAccountId(request);
    return service.listApps(accountId, request.query as any);
  });

  fastify.post<{ Body: { name: string; description?: string; type?: 'internal' | 'portal' } }>('/', async (request, reply) => {
    const accountId = await getAccountId(request);
    const userId = (request as any).user?.id || 'system';
    const app = await service.createApp({ accountId, ...request.body, createdBy: userId });
    return reply.status(201).send(app);
  });

  fastify.get<{ Params: IdParams }>('/:id', async (request, reply) => {
    const app = await service.getApp(request.params.id);
    if (!app) return reply.status(404).send({ error: 'App not found' });
    return app;
  });

  fastify.patch<{ Params: IdParams; Body: any }>('/:id', async (request, reply) => {
    const app = await service.updateApp(request.params.id, request.body as any);
    if (!app) return reply.status(404).send({ error: 'App not found' });
    return app;
  });

  fastify.delete<{ Params: IdParams }>('/:id', async (request, reply) => {
    if (!await service.deleteApp(request.params.id)) return reply.status(404).send({ error: 'App not found' });
    return { success: true };
  });

  fastify.post<{ Params: IdParams }>('/:id/publish', async (request, reply) => {
    const userId = (request as any).user?.id || 'system';
    const app = await service.publishApp(request.params.id, userId);
    if (!app) return reply.status(404).send({ error: 'App not found' });
    return app;
  });

  fastify.post<{ Params: IdParams }>('/:id/unpublish', async (request, reply) => {
    const app = await service.unpublishApp(request.params.id);
    if (!app) return reply.status(404).send({ error: 'App not found' });
    return app;
  });

  fastify.post<{ Params: IdParams; Body: { name: string } }>('/:id/duplicate', async (request, reply) => {
    const accountId = await getAccountId(request);
    const userId = (request as any).user?.id || 'system';
    const app = await service.duplicateApp(request.params.id, request.body.name, accountId, userId);
    if (!app) return reply.status(404).send({ error: 'App not found' });
    return reply.status(201).send(app);
  });

  // Pages
  fastify.post<{ Params: IdParams; Body: any }>('/:id/pages', async (request, reply) => {
    const page = await service.addPage(request.params.id, request.body as any);
    if (!page) return reply.status(404).send({ error: 'App not found' });
    return reply.status(201).send(page);
  });

  fastify.get<{ Params: PageParams }>('/:id/pages/:pageId', async (request, reply) => {
    const page = await service.getPage(request.params.id, request.params.pageId);
    if (!page) return reply.status(404).send({ error: 'Page not found' });
    return page;
  });

  fastify.patch<{ Params: PageParams; Body: any }>('/:id/pages/:pageId', async (request, reply) => {
    const page = await service.updatePage(request.params.id, request.params.pageId, request.body as any);
    if (!page) return reply.status(404).send({ error: 'Page not found' });
    return page;
  });

  fastify.delete<{ Params: PageParams }>('/:id/pages/:pageId', async (request, reply) => {
    if (!await service.deletePage(request.params.id, request.params.pageId)) {
      return reply.status(404).send({ error: 'Page not found' });
    }
    return { success: true };
  });

  // Components
  fastify.post<{ Params: PageParams; Body: any }>('/:id/pages/:pageId/components', async (request, reply) => {
    const component = await service.addComponent(request.params.id, request.params.pageId, request.body as any);
    if (!component) return reply.status(404).send({ error: 'Page not found' });
    return reply.status(201).send(component);
  });

  fastify.patch<{ Params: ComponentParams; Body: any }>('/:id/pages/:pageId/components/:componentId', async (request, reply) => {
    const component = await service.updateComponent(request.params.id, request.params.pageId, request.params.componentId, request.body as any);
    if (!component) return reply.status(404).send({ error: 'Component not found' });
    return component;
  });

  fastify.delete<{ Params: ComponentParams }>('/:id/pages/:pageId/components/:componentId', async (request, reply) => {
    if (!await service.deleteComponent(request.params.id, request.params.pageId, request.params.componentId)) {
      return reply.status(404).send({ error: 'Component not found' });
    }
    return { success: true };
  });

  fastify.patch<{ Params: ComponentParams; Body: { row: number; column: number; width?: number } }>(
    '/:id/pages/:pageId/components/:componentId/position',
    async (request, reply) => {
      const component = await service.moveComponent(request.params.id, request.params.pageId, request.params.componentId, request.body);
      if (!component) return reply.status(404).send({ error: 'Component not found' });
      return component;
    }
  );

  // Data Sources
  fastify.post<{ Params: IdParams; Body: any }>('/:id/datasources', async (request, reply) => {
    const ds = await service.addDataSource(request.params.id, request.body as any);
    if (!ds) return reply.status(404).send({ error: 'App not found' });
    return reply.status(201).send(ds);
  });

  fastify.patch<{ Params: DataSourceParams; Body: any }>('/:id/datasources/:dataSourceId', async (request, reply) => {
    const ds = await service.updateDataSource(request.params.id, request.params.dataSourceId, request.body as any);
    if (!ds) return reply.status(404).send({ error: 'Data source not found' });
    return ds;
  });

  fastify.delete<{ Params: DataSourceParams }>('/:id/datasources/:dataSourceId', async (request, reply) => {
    if (!await service.deleteDataSource(request.params.id, request.params.dataSourceId)) {
      return reply.status(404).send({ error: 'Data source not found' });
    }
    return { success: true };
  });

  /*
   * POST /api/apps/:id/datasources/resolve
   * Resolves a workflow-aware data source at runtime and returns live data.
   * Body: { type: 'tasks' | 'instances' | 'formData', config: { ... } }
   */
  fastify.post<{ Params: IdParams; Body: { type: string; config: Record<string, unknown> } }>(
    '/:id/datasources/resolve',
    async (request, reply) => {
      try {
        const result = await service.resolveDataSource(request.body);
        return result;
      } catch (err) {
        return reply.status(500).send({ error: 'Failed to resolve data source' });
      }
    }
  );

  // Theme
  fastify.patch<{ Params: IdParams; Body: any }>('/:id/theme', async (request, reply) => {
    const theme = await service.updateTheme(request.params.id, request.body as any);
    if (!theme) return reply.status(404).send({ error: 'App not found' });
    return theme;
  });

  fastify.post<{ Params: IdParams }>('/:id/theme/reset', async (request, reply) => {
    const theme = await service.resetTheme(request.params.id);
    if (!theme) return reply.status(404).send({ error: 'App not found' });
    return theme;
  });

  // Portal
  fastify.post<{ Body: { name: string; description?: string; customDomain?: string } }>('/portals', async (request, reply) => {
    const accountId = await getAccountId(request);
    const userId = (request as any).user?.id || 'system';
    const portal = await service.createPortal({ accountId, ...request.body, createdBy: userId });
    return reply.status(201).send(portal);
  });

  fastify.patch<{ Params: IdParams; Body: any }>('/:id/portal-settings', async (request, reply) => {
    const settings = await service.updatePortalSettings(request.params.id, request.body as any);
    if (!settings) return reply.status(404).send({ error: 'Portal not found' });
    return settings;
  });

  // App Actions
  fastify.post<{ Params: IdParams; Body: { type: string; config: Record<string, unknown> } }>(
    '/:id/actions/execute',
    async (request, reply) => {
      const userId = (request as any).user?.id || 'system';
      try {
        const result = await appActionsService.execute({
          ...(request.body as any),
          userId,
          appId: request.params.id,
        });
        return result;
      } catch (err) {
        return reply.status(500).send({ error: 'Action execution failed' });
      }
    }
  );

  fastify.get('/actions/available', async () => {
    return { actions: appActionsService.getAvailableActions() };
  });
}

// Component Registry Routes
export async function componentRoutes(fastify: FastifyInstance) {
  const registry = componentRegistry;

  fastify.get('/', async () => {
    return { components: registry.getAllComponents() };
  });

  fastify.get('/categories', async () => {
    return { categories: registry.getCategories() };
  });

  fastify.get<{ Params: { category: string } }>('/category/:category', async (request) => {
    return { components: registry.getComponentsByCategory(request.params.category as any) };
  });

  fastify.get<{ Params: { type: string } }>('/:type', async (request, reply) => {
    const component = registry.getComponent(request.params.type as any);
    if (!component) return reply.status(404).send({ error: 'Component not found' });
    return component;
  });

  fastify.get('/containers', async () => {
    return { components: registry.getContainerComponents() };
  });
}
