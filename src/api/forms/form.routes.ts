/**
 * FlowForge Form Builder API Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { formService } from '../../services/forms/form.service.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import type { FormStatus } from '@prisma/client';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const fieldDefinitionSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  width: z.enum(['full', 'half', 'third', 'quarter']).optional(),
  order: z.number().optional(),
  required: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  hidden: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  defaultExpression: z.string().optional(),
  conditions: z.array(z.object({
    id: z.string(),
    field: z.string(),
    operator: z.string(),
    value: z.unknown().optional(),
    values: z.array(z.unknown()).optional(),
    action: z.enum(['show', 'hide', 'require', 'optional', 'enable', 'disable']),
    logic: z.enum(['and', 'or']).optional(),
  })).optional(),
  validationRules: z.array(z.object({
    id: z.string(),
    type: z.string(),
    value: z.unknown().optional(),
    expression: z.string().optional(),
    message: z.string(),
    severity: z.enum(['error', 'warning']).optional(),
  })).optional(),
}).passthrough(); // Allow additional type-specific properties

const formLayoutSchema = z.object({
  type: z.enum(['default', 'wizard', 'tabs', 'accordion']).optional(),
  columns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  labelPosition: z.enum(['top', 'left', 'inline']).optional(),
  labelWidth: z.string().optional(),
  spacing: z.enum(['compact', 'normal', 'relaxed']).optional(),
});

const formSettingsSchema = z.object({
  submitLabel: z.string().optional(),
  resetLabel: z.string().optional(),
  showReset: z.boolean().optional(),
  autosave: z.boolean().optional(),
  autosaveInterval: z.number().optional(),
  submitOnEnter: z.boolean().optional(),
  scrollToError: z.boolean().optional(),
  showProgressBar: z.boolean().optional(),
  confirmOnLeave: z.boolean().optional(),
});

const createFormSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  fields: z.array(fieldDefinitionSchema).optional(),
  layout: formLayoutSchema.optional(),
  settings: formSettingsSchema.optional(),
});

const updateFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  fields: z.array(fieldDefinitionSchema).optional(),
  layout: formLayoutSchema.optional(),
  settings: formSettingsSchema.optional(),
});

const reorderFieldsSchema = z.object({
  fieldOrder: z.array(z.string()),
});

const submitFormSchema = z.record(z.unknown());

const listQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  search: z.string().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

export async function formRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // ============================================================================
  // FORM CRUD
  // ============================================================================

  /**
   * List forms
   * GET /forms
   */
  fastify.get('/', {
    onRequest: [requirePermission('forms:read')],
    schema: {
      description: 'List forms in the account',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', default: '1' },
          limit: { type: 'string', default: '20' },
          sortBy: { type: 'string', default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] },
          search: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listQuerySchema.parse(request.query);
    const result = await formService.listForms(request.accountId!, {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      status: query.status as FormStatus | undefined,
      search: query.search,
    });

    reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get form by ID
   * GET /forms/:id
   */
  fastify.get('/:id', {
    onRequest: [requirePermission('forms:read')],
    schema: {
      description: 'Get form by ID',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const form = await formService.getFormById(request.accountId!, id);

    reply.send({
      success: true,
      data: form,
    });
  });

  /**
   * Get form definition (with parsed fields)
   * GET /forms/:id/definition
   */
  fastify.get('/:id/definition', {
    onRequest: [requirePermission('forms:read')],
    schema: {
      description: 'Get form definition with parsed fields',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const definition = await formService.getFormDefinition(request.accountId!, id);

    reply.send({
      success: true,
      data: definition,
    });
  });

  /**
   * Create form
   * POST /forms
   */
  fastify.post('/', {
    onRequest: [requirePermission('forms:create')],
    schema: {
      description: 'Create a new form',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string' },
          fields: { type: 'array' },
          layout: { type: 'object' },
          settings: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const input = createFormSchema.parse(request.body);
    const form = await formService.createForm(request.accountId!, input as any, request.user!.id);

    reply.status(201).send({
      success: true,
      data: form,
    });
  });

  /**
   * Update form
   * PATCH /forms/:id
   */
  fastify.patch('/:id', {
    onRequest: [requirePermission('forms:update')],
    schema: {
      description: 'Update form',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string' },
          fields: { type: 'array' },
          layout: { type: 'object' },
          settings: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateFormSchema.parse(request.body);
    const form = await formService.updateForm(request.accountId!, id, input as any);

    reply.send({
      success: true,
      data: form,
    });
  });

  /**
   * Delete form
   * DELETE /forms/:id
   */
  fastify.delete('/:id', {
    onRequest: [requirePermission('forms:delete')],
    schema: {
      description: 'Delete form',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await formService.deleteForm(request.accountId!, id);

    reply.send({
      success: true,
      message: 'Form deleted successfully',
    });
  });

  // ============================================================================
  // FORM LIFECYCLE
  // ============================================================================

  /**
   * Publish form
   * POST /forms/:id/publish
   */
  fastify.post('/:id/publish', {
    onRequest: [requirePermission('forms:update')],
    schema: {
      description: 'Publish form (set status to ACTIVE)',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const form = await formService.publishForm(request.accountId!, id);

    reply.send({
      success: true,
      data: form,
      message: 'Form published successfully',
    });
  });

  /**
   * Archive form
   * POST /forms/:id/archive
   */
  fastify.post('/:id/archive', {
    onRequest: [requirePermission('forms:update')],
    schema: {
      description: 'Archive form',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const form = await formService.archiveForm(request.accountId!, id);

    reply.send({
      success: true,
      data: form,
      message: 'Form archived successfully',
    });
  });

  /**
   * Duplicate form
   * POST /forms/:id/duplicate
   */
  fastify.post('/:id/duplicate', {
    onRequest: [requirePermission('forms:create')],
    schema: {
      description: 'Duplicate form',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name } = z.object({ name: z.string() }).parse(request.body);
    const form = await formService.duplicateForm(
      request.accountId!,
      id,
      name,
      request.user!.id
    );

    reply.status(201).send({
      success: true,
      data: form,
      message: 'Form duplicated successfully',
    });
  });

  // ============================================================================
  // FIELD MANAGEMENT
  // ============================================================================

  /**
   * Add field to form
   * POST /forms/:id/fields
   */
  fastify.post('/:id/fields', {
    onRequest: [requirePermission('forms:update')],
    schema: {
      description: 'Add field to form',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['type', 'name', 'label'],
        properties: {
          type: { type: 'string' },
          name: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const field = fieldDefinitionSchema.omit({ id: true, order: true }).parse(request.body);
    const form = await formService.addField(request.accountId!, id, field as any);

    reply.status(201).send({
      success: true,
      data: form,
    });
  });

  /**
   * Update field
   * PATCH /forms/:id/fields/:fieldId
   */
  fastify.patch('/:id/fields/:fieldId', {
    onRequest: [requirePermission('forms:update')],
    schema: {
      description: 'Update field in form',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fieldId: { type: 'string' },
        },
        required: ['id', 'fieldId'],
      },
    },
  }, async (request, reply) => {
    const { id, fieldId } = request.params as { id: string; fieldId: string };
    const updates = fieldDefinitionSchema.partial().parse(request.body);
    const form = await formService.updateField(
      request.accountId!,
      id,
      fieldId,
      updates as any
    );

    reply.send({
      success: true,
      data: form,
    });
  });

  /**
   * Delete field
   * DELETE /forms/:id/fields/:fieldId
   */
  fastify.delete('/:id/fields/:fieldId', {
    onRequest: [requirePermission('forms:update')],
    schema: {
      description: 'Delete field from form',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fieldId: { type: 'string' },
        },
        required: ['id', 'fieldId'],
      },
    },
  }, async (request, reply) => {
    const { id, fieldId } = request.params as { id: string; fieldId: string };
    const form = await formService.deleteField(
      request.accountId!,
      id,
      fieldId
    );

    reply.send({
      success: true,
      data: form,
    });
  });

  /**
   * Reorder fields
   * PUT /forms/:id/fields/reorder
   */
  fastify.put('/:id/fields/reorder', {
    onRequest: [requirePermission('forms:update')],
    schema: {
      description: 'Reorder fields in form',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['fieldOrder'],
        properties: {
          fieldOrder: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { fieldOrder } = reorderFieldsSchema.parse(request.body);
    const form = await formService.reorderFields(request.accountId!, id, fieldOrder);

    reply.send({
      success: true,
      data: form,
    });
  });

  // ============================================================================
  // FORM SUBMISSIONS
  // ============================================================================

  /**
   * Submit form
   * POST /forms/:id/submit
   */
  fastify.post('/:id/submit', {
    schema: {
      description: 'Submit form data',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = submitFormSchema.parse(request.body);
    const result = await formService.submitForm(
      request.accountId!,
      id,
      data,
      request.user?.id
    );

    reply.status(201).send({
      success: true,
      data: result.submission,
      validation: result.validation,
    });
  });

  /**
   * Validate form data (without submitting)
   * POST /forms/:id/validate
   */
  fastify.post('/:id/validate', {
    onRequest: [requirePermission('forms:read')],
    schema: {
      description: 'Validate form data without submitting',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = submitFormSchema.parse(request.body);
    const validation = await formService.validateFormData(request.accountId!, id, data);

    reply.send({
      success: true,
      data: validation,
    });
  });

  /**
   * Get form submissions
   * GET /forms/:id/submissions
   */
  fastify.get('/:id/submissions', {
    onRequest: [requirePermission('forms:read')],
    schema: {
      description: 'Get form submissions',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', default: '1' },
          limit: { type: 'string', default: '20' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = z.object({
      page: z.string().transform(Number).default('1'),
      limit: z.string().transform(Number).default('20'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }).parse(request.query);

    const result = await formService.getFormSubmissions(request.accountId!, id, query);

    reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get single submission
   * GET /forms/:id/submissions/:submissionId
   */
  fastify.get('/:id/submissions/:submissionId', {
    onRequest: [requirePermission('forms:read')],
    schema: {
      description: 'Get single form submission',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          submissionId: { type: 'string', format: 'uuid' },
        },
        required: ['id', 'submissionId'],
      },
    },
  }, async (request, reply) => {
    const { id, submissionId } = request.params as { id: string; submissionId: string };
    const submission = await formService.getSubmission(
      request.accountId!,
      id,
      submissionId
    );

    reply.send({
      success: true,
      data: submission,
    });
  });

  /**
   * Delete submission
   * DELETE /forms/:id/submissions/:submissionId
   */
  fastify.delete('/:id/submissions/:submissionId', {
    onRequest: [requirePermission('forms:delete')],
    schema: {
      description: 'Delete form submission',
      tags: ['Forms'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          submissionId: { type: 'string', format: 'uuid' },
        },
        required: ['id', 'submissionId'],
      },
    },
  }, async (request, reply) => {
    const { id, submissionId } = request.params as { id: string; submissionId: string };
    await formService.deleteSubmission(
      request.accountId!,
      id,
      submissionId
    );

    reply.send({
      success: true,
      message: 'Submission deleted successfully',
    });
  });
}
