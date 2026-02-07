/**
 * FlowForge Field Type Registry API
 * Returns available field types and their configurations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FIELD_TYPE_REGISTRY, type FieldType, type FieldTypeConfig } from '../../types/forms/field-types.js';

/**
 * Get field types grouped by category
 */
function getFieldTypesByCategory(): Record<string, FieldTypeConfig[]> {
  const categories: Record<string, FieldTypeConfig[]> = {
    input: [],
    selection: [],
    date: [],
    file: [],
    advanced: [],
    layout: [],
  };

  for (const config of Object.values(FIELD_TYPE_REGISTRY)) {
    categories[config.category]?.push(config);
  }

  return categories;
}

/**
 * Field type routes
 */
export async function fieldTypeRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get all field types
   * GET /field-types
   */
  fastify.get('/', {
    schema: {
      description: 'Get all available field types',
      tags: ['Field Types'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  label: { type: 'string' },
                  icon: { type: 'string' },
                  category: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const fieldTypes = Object.values(FIELD_TYPE_REGISTRY);

    reply.send({
      success: true,
      data: fieldTypes,
    });
  });

  /**
   * Get field types grouped by category
   * GET /field-types/categories
   */
  fastify.get('/categories', {
    schema: {
      description: 'Get field types grouped by category',
      tags: ['Field Types'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const categories = getFieldTypesByCategory();

    reply.send({
      success: true,
      data: categories,
    });
  });

  /**
   * Get single field type configuration
   * GET /field-types/:type
   */
  fastify.get('/:type', {
    schema: {
      description: 'Get field type configuration',
      tags: ['Field Types'],
      params: {
        type: 'object',
        properties: {
          type: { type: 'string' },
        },
        required: ['type'],
      },
    },
  }, async (request: FastifyRequest<{ Params: { type: string } }>, reply: FastifyReply) => {
    const fieldType = request.params.type as FieldType;
    const config = FIELD_TYPE_REGISTRY[fieldType];

    if (!config) {
      reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Field type "${fieldType}" not found`,
        },
      });
      return;
    }

    reply.send({
      success: true,
      data: config,
    });
  });

  /**
   * Get default field configuration for a type
   * GET /field-types/:type/default
   */
  fastify.get('/:type/default', {
    schema: {
      description: 'Get default field configuration for creating new field',
      tags: ['Field Types'],
      params: {
        type: 'object',
        properties: {
          type: { type: 'string' },
        },
        required: ['type'],
      },
    },
  }, async (request: FastifyRequest<{ Params: { type: string } }>, reply: FastifyReply) => {
    const fieldType = request.params.type as FieldType;
    const config = FIELD_TYPE_REGISTRY[fieldType];

    if (!config) {
      reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Field type "${fieldType}" not found`,
        },
      });
      return;
    }

    // Generate default field configuration
    const defaultField = {
      type: fieldType,
      name: '',
      label: '',
      description: '',
      required: false,
      ...config.defaultConfig,
    };

    reply.send({
      success: true,
      data: defaultField,
    });
  });
}
