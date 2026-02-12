/**
 * FlowForge Dataset API Routes
 * REST endpoints for dataset management, records, and import/export
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatasetService, datasetService } from '../../services/datasets/dataset.service';
import { prisma } from '../../utils/prisma.js';
import type {
  Dataset,
  DatasetColumn,
  DatasetQuery,
  ImportOptions,
  ExportOptions,
  BulkOperation,
  AggregateQuery,
} from '../../types/datasets';

// ============================================================================
// Request Types
// ============================================================================

interface CreateDatasetBody {
  name: string;
  description?: string;
  columns: Array<{
    name: string;
    slug?: string;
    type: string;
    required?: boolean;
    unique?: boolean;
    settings?: Record<string, unknown>;
    defaultValue?: unknown;
  }>;
  settings?: Record<string, unknown>;
}

interface UpdateDatasetBody {
  name?: string;
  description?: string;
  settings?: Record<string, unknown>;
}

interface CreateColumnBody {
  name: string;
  slug?: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  settings?: Record<string, unknown>;
  defaultValue?: unknown;
}

interface QueryBody {
  filter?: {
    logic: 'and' | 'or';
    conditions: Array<{
      column: string;
      operator: string;
      value: unknown;
    }>;
  };
  sort?: Array<{ column: string; direction: 'asc' | 'desc' }>;
  page?: number;
  pageSize?: number;
  select?: string[];
  search?: string;
  searchColumns?: string[];
}

interface ImportBody {
  content: string;
  format: 'csv' | 'json' | 'tsv';
  delimiter?: string;
  hasHeader?: boolean;
  columnMapping?: Record<string, string>;
  mode?: 'insert' | 'upsert' | 'replace';
  upsertKey?: string;
  skipInvalidRows?: boolean;
  dryRun?: boolean;
}

// ============================================================================
// Route Registration
// ============================================================================

export async function datasetRoutes(fastify: FastifyInstance) {
  const service = datasetService;

  // ============================================================================
  // Dataset CRUD
  // ============================================================================

  // List datasets
  fastify.get(
    '/',
    {
      schema: {
        description: 'List all datasets',
        tags: ['Datasets'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            pageSize: { type: 'number', default: 20 },
            search: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { page?: number; pageSize?: number; search?: string } }>, reply) => {
      // First try the in-memory service
      const result = await service.listDatasets(request.query);

      // If in-memory store has datasets, return them
      if (result.data && result.data.length > 0) {
        return result;
      }

      // Fallback: query Prisma Dataset table for seeded/DB-stored datasets
      const query = request.query;
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 20;
      const where: any = {};
      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [datasets, total] = await Promise.all([
        prisma.dataset.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { records: true } },
          },
        }),
        prisma.dataset.count({ where }),
      ]);

      return {
        data: datasets.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          schema: d.schema || {},
          rowCount: d._count?.records || Number(d.rowCount) || 0,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: (page - 1) * pageSize + pageSize < total,
      };
    }
  );

  // Create dataset
  fastify.post<{ Body: CreateDatasetBody }>(
    '/',
    {
      schema: {
        description: 'Create a new dataset',
        tags: ['Datasets'],
        body: {
          type: 'object',
          required: ['name', 'columns'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            columns: { type: 'array' },
            settings: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = 'user-1'; // TODO: Get from auth
      const dataset = await service.createDataset({
        ...request.body,
        columns: request.body.columns as any,
        createdBy: userId,
      });
      return reply.status(201).send(dataset);
    }
  );

  // Get dataset
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Get a dataset by ID',
        tags: ['Datasets'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      // Try in-memory first
      const dataset = await service.getDataset(request.params.id);
      if (dataset) {
        return dataset;
      }

      // Fallback: query Prisma for DB-stored/seeded datasets
      const dbDataset = await prisma.dataset.findUnique({
        where: { id: request.params.id },
        include: {
          _count: { select: { records: true } },
        },
      });

      if (!dbDataset) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }

      return {
        id: dbDataset.id,
        name: dbDataset.name,
        description: dbDataset.description,
        schema: dbDataset.schema || {},
        rowCount: (dbDataset as any)._count?.records || Number(dbDataset.rowCount) || 0,
        createdAt: dbDataset.createdAt,
        updatedAt: dbDataset.updatedAt,
      };
    }
  );

  // Update dataset
  fastify.patch<{ Params: { id: string }; Body: UpdateDatasetBody }>(
    '/:id',
    {
      schema: {
        description: 'Update a dataset',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const dataset = await service.updateDataset(request.params.id, request.body);
      if (!dataset) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }
      return dataset;
    }
  );

  // Delete dataset
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Delete a dataset',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const deleted = await service.deleteDataset(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }
      return { success: true };
    }
  );

  // ============================================================================
  // Column Management
  // ============================================================================

  // Add column
  fastify.post<{ Params: { id: string }; Body: CreateColumnBody }>(
    '/:id/columns',
    {
      schema: {
        description: 'Add a column to a dataset',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const column = await service.addColumn(request.params.id, request.body as any);
      if (!column) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }
      return reply.status(201).send(column);
    }
  );

  // Update column
  fastify.patch<{ Params: { id: string; columnId: string }; Body: Partial<CreateColumnBody> }>(
    '/:id/columns/:columnId',
    {
      schema: {
        description: 'Update a column',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const column = await service.updateColumn(
        request.params.id,
        request.params.columnId,
        request.body as any
      );
      if (!column) {
        return reply.status(404).send({ error: 'Column not found' });
      }
      return column;
    }
  );

  // Delete column
  fastify.delete<{ Params: { id: string; columnId: string } }>(
    '/:id/columns/:columnId',
    {
      schema: {
        description: 'Delete a column',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const deleted = await service.deleteColumn(request.params.id, request.params.columnId);
      if (!deleted) {
        return reply.status(404).send({ error: 'Column not found' });
      }
      return { success: true };
    }
  );

  // Reorder columns
  fastify.put<{ Params: { id: string }; Body: { columnIds: string[] } }>(
    '/:id/columns/order',
    {
      schema: {
        description: 'Reorder columns',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const success = await service.reorderColumns(request.params.id, request.body.columnIds);
      if (!success) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }
      return { success: true };
    }
  );

  // ============================================================================
  // Record CRUD
  // ============================================================================

  // Query records
  fastify.post<{ Params: { id: string }; Body: QueryBody }>(
    '/:id/records/query',
    {
      schema: {
        description: 'Query records with filtering and pagination',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const result = await service.queryRecords(request.params.id, request.body as DatasetQuery);
      return result;
    }
  );

  // Get records (simple GET with query params)
  fastify.get<{ Params: { id: string }; Querystring: { page?: number; pageSize?: number; search?: string } }>(
    '/:id/records',
    {
      schema: {
        description: 'Get records with simple pagination',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      // Try in-memory first
      const result = await service.queryRecords(request.params.id, {
        page: request.query.page,
        pageSize: request.query.pageSize,
        search: request.query.search,
      });

      // If in-memory has data, return it
      if (result.data && result.data.length > 0) {
        return result;
      }

      // Fallback: query Prisma for DB-stored records
      const page = Number(request.query.page) || 1;
      const pageSize = Number(request.query.pageSize) || 20;

      // Verify dataset exists
      const dbDataset = await prisma.dataset.findUnique({
        where: { id: request.params.id },
      });

      if (!dbDataset) {
        // Dataset doesn't exist at all — return empty result
        return {
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          hasMore: false,
        };
      }

      const [dbRecords, total] = await Promise.all([
        prisma.datasetRecord.findMany({
          where: { datasetId: request.params.id },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.datasetRecord.count({
          where: { datasetId: request.params.id },
        }),
      ]);

      return {
        data: dbRecords.map((r: any) => ({
          id: r.id,
          datasetId: r.datasetId,
          data: r.data || {},
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          createdBy: r.createdBy,
          updatedBy: r.updatedBy,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      };
    }
  );

  // Create record
  fastify.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/:id/records',
    {
      schema: {
        description: 'Create a new record',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const userId = 'user-1'; // TODO: Get from auth
      const result = await service.createRecord(request.params.id, request.body, userId);

      if (!result.validation.valid) {
        return reply.status(400).send({
          error: 'Validation failed',
          errors: result.validation.errors,
        });
      }

      return reply.status(201).send(result.record);
    }
  );

  // Get record
  fastify.get<{ Params: { id: string; recordId: string } }>(
    '/:id/records/:recordId',
    {
      schema: {
        description: 'Get a record by ID',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const record = await service.getRecord(request.params.id, request.params.recordId);
      if (!record) {
        return reply.status(404).send({ error: 'Record not found' });
      }
      return record;
    }
  );

  // Update record
  fastify.patch<{ Params: { id: string; recordId: string }; Body: Record<string, unknown> }>(
    '/:id/records/:recordId',
    {
      schema: {
        description: 'Update a record',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const userId = 'user-1'; // TODO: Get from auth
      const result = await service.updateRecord(
        request.params.id,
        request.params.recordId,
        request.body,
        userId
      );

      if (!result.validation.valid) {
        return reply.status(400).send({
          error: 'Validation failed',
          errors: result.validation.errors,
        });
      }

      return result.record;
    }
  );

  // Delete record
  fastify.delete<{ Params: { id: string; recordId: string }; Querystring: { hard?: boolean } }>(
    '/:id/records/:recordId',
    {
      schema: {
        description: 'Delete a record',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const userId = 'user-1'; // TODO: Get from auth
      const deleted = await service.deleteRecord(
        request.params.id,
        request.params.recordId,
        userId,
        request.query.hard
      );

      if (!deleted) {
        return reply.status(404).send({ error: 'Record not found' });
      }

      return { success: true };
    }
  );

  // Restore record
  fastify.post<{ Params: { id: string; recordId: string } }>(
    '/:id/records/:recordId/restore',
    {
      schema: {
        description: 'Restore a soft-deleted record',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const userId = 'user-1'; // TODO: Get from auth
      const restored = await service.restoreRecord(
        request.params.id,
        request.params.recordId,
        userId
      );

      if (!restored) {
        return reply.status(404).send({ error: 'Record not found or not deleted' });
      }

      return { success: true };
    }
  );

  // Get record history
  fastify.get<{ Params: { id: string; recordId: string } }>(
    '/:id/records/:recordId/history',
    {
      schema: {
        description: 'Get record change history',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const history = await service.getRecordHistory(request.params.id, request.params.recordId);
      return { history };
    }
  );

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  // Bulk operation
  fastify.post<{ Params: { id: string }; Body: BulkOperation }>(
    '/:id/records/bulk',
    {
      schema: {
        description: 'Perform bulk insert/update/delete',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const userId = 'user-1'; // TODO: Get from auth
      const result = await service.bulkOperation(request.params.id, request.body, userId);

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return result;
    }
  );

  // ============================================================================
  // Aggregation
  // ============================================================================

  // Aggregate records
  fastify.post<{ Params: { id: string }; Body: AggregateQuery }>(
    '/:id/records/aggregate',
    {
      schema: {
        description: 'Aggregate records with grouping',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const result = await service.aggregateRecords(request.params.id, request.body);
      return result;
    }
  );

  // ============================================================================
  // Import/Export
  // ============================================================================

  // Import data
  fastify.post<{ Params: { id: string }; Body: ImportBody }>(
    '/:id/import',
    {
      schema: {
        description: 'Import data from CSV/JSON',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const userId = 'user-1'; // TODO: Get from auth
      const { content, ...options } = request.body;

      const result = await service.importData(
        request.params.id,
        content,
        options as ImportOptions,
        userId
      );

      if (!result.success && !result.dryRun) {
        return reply.status(400).send(result);
      }

      return result;
    }
  );

  // Export data
  fastify.post<{ Params: { id: string }; Body: ExportOptions }>(
    '/:id/export',
    {
      schema: {
        description: 'Export data to CSV/JSON',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      try {
        const { content, mimeType, filename } = await service.exportData(
          request.params.id,
          request.body
        );

        reply
          .header('Content-Type', mimeType)
          .header('Content-Disposition', `attachment; filename="${filename}"`);

        return content;
      } catch (error) {
        return reply.status(404).send({
          error: error instanceof Error ? error.message : 'Export failed'
        });
      }
    }
  );

  // ============================================================================
  // Relationships
  // ============================================================================

  // Add relationship
  fastify.post<{
    Params: { id: string }; Body: {
      name: string;
      type: 'one-to-one' | 'one-to-many' | 'many-to-many';
      sourceColumnId: string;
      targetDatasetId: string;
      targetColumnId: string;
      onDelete?: string;
      onUpdate?: string;
    }
  }>(
    '/:id/relationships',
    {
      schema: {
        description: 'Add a relationship to another dataset',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const relationship = await service.addRelationship(request.params.id, {
        ...request.body,
        sourceDatasetId: request.params.id,
        onDelete: (request.body.onDelete || 'no-action') as any,
        onUpdate: (request.body.onUpdate || 'no-action') as any,
      });

      if (!relationship) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }

      return reply.status(201).send(relationship);
    }
  );

  // Delete relationship
  fastify.delete<{ Params: { id: string; relationshipId: string } }>(
    '/:id/relationships/:relationshipId',
    {
      schema: {
        description: 'Remove a relationship',
        tags: ['Datasets'],
      },
    },
    async (request, reply) => {
      const deleted = await service.removeRelationship(
        request.params.id,
        request.params.relationshipId
      );

      if (!deleted) {
        return reply.status(404).send({ error: 'Relationship not found' });
      }

      return { success: true };
    }
  );
}
