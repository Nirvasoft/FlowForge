/**
 * FlowForge Expression Engine API Routes
 * REST endpoints for formula parsing, evaluation, and function discovery
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ExpressionService } from '../../services/expressions/expression.service';
import type { EvaluationContext, FunctionCategory } from '../../types/expressions';

// ============================================================================
// Request/Response Types
// ============================================================================

interface EvaluateRequest {
  formula: string;
  context?: {
    fields?: Record<string, unknown>;
    variables?: Record<string, unknown>;
    datasets?: Record<string, Record<string, unknown>[]>;
  };
}

interface ValidateRequest {
  formula: string;
  availableFields?: string[];
}

interface ParseRequest {
  formula: string;
}

interface SuggestionsRequest {
  formula: string;
  position: number;
  availableFields?: string[];
}

interface TokenizeRequest {
  formula: string;
}

interface BatchEvaluateRequest {
  formulas: Array<{
    id: string;
    formula: string;
  }>;
  context?: EvaluateRequest['context'];
}

// ============================================================================
// Route Registration
// ============================================================================

export async function expressionRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // Evaluate a formula
  // ============================================================================
  fastify.post<{ Body: EvaluateRequest }>(
    '/evaluate',
    {
      schema: {
        description: 'Evaluate a formula expression',
        tags: ['Expressions'],
        body: {
          type: 'object',
          required: ['formula'],
          properties: {
            formula: { type: 'string', description: 'Formula to evaluate' },
            context: {
              type: 'object',
              properties: {
                fields: { type: 'object', description: 'Field values' },
                variables: { type: 'object', description: 'Custom variables' },
                datasets: { type: 'object', description: 'Dataset records' },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              value: {},
              type: { type: 'string' },
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  functionName: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: EvaluateRequest }>, reply: FastifyReply) => {
      const { formula, context } = request.body;

      const evalContext: Partial<EvaluationContext> = {};
      if (context?.fields) {
        evalContext.fields = context.fields as EvaluationContext['fields'];
      }
      if (context?.variables) {
        evalContext.variables = context.variables as EvaluationContext['variables'];
      }
      if (context?.datasets) {
        evalContext.datasets = context.datasets as EvaluationContext['datasets'];
      }

      const service = new ExpressionService(evalContext);
      const result = service.evaluate(formula);

      return result;
    }
  );

  // ============================================================================
  // Batch evaluate multiple formulas
  // ============================================================================
  fastify.post<{ Body: BatchEvaluateRequest }>(
    '/evaluate/batch',
    {
      schema: {
        description: 'Evaluate multiple formulas with shared context',
        tags: ['Expressions'],
        body: {
          type: 'object',
          required: ['formulas'],
          properties: {
            formulas: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'formula'],
                properties: {
                  id: { type: 'string' },
                  formula: { type: 'string' },
                },
              },
            },
            context: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: BatchEvaluateRequest }>, reply: FastifyReply) => {
      const { formulas, context } = request.body;

      const evalContext: Partial<EvaluationContext> = {};
      if (context?.fields) {
        evalContext.fields = context.fields as EvaluationContext['fields'];
      }
      if (context?.variables) {
        evalContext.variables = context.variables as EvaluationContext['variables'];
      }

      const service = new ExpressionService(evalContext);
      const results: Record<string, { success: boolean; value?: unknown; error?: string }> = {};

      for (const { id, formula } of formulas) {
        const result = service.evaluate(formula);
        results[id] = {
          success: result.success,
          value: result.value,
          error: result.error?.message,
        };
        // Update context with result for dependent calculations
        if (result.success) {
          service.setField(id, result.value!);
        }
      }

      return { results };
    }
  );

  // ============================================================================
  // Validate a formula
  // ============================================================================
  fastify.post<{ Body: ValidateRequest }>(
    '/validate',
    {
      schema: {
        description: 'Validate a formula without evaluating',
        tags: ['Expressions'],
        body: {
          type: 'object',
          required: ['formula'],
          properties: {
            formula: { type: 'string' },
            availableFields: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ValidateRequest }>, reply: FastifyReply) => {
      const { formula, availableFields } = request.body;

      const service = new ExpressionService();
      const result = service.validate(formula, availableFields);

      return result;
    }
  );

  // ============================================================================
  // Parse a formula to AST
  // ============================================================================
  fastify.post<{ Body: ParseRequest }>(
    '/parse',
    {
      schema: {
        description: 'Parse a formula into an AST',
        tags: ['Expressions'],
        body: {
          type: 'object',
          required: ['formula'],
          properties: {
            formula: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ParseRequest }>, reply: FastifyReply) => {
      const { formula } = request.body;

      const service = new ExpressionService();
      const result = service.parse(formula);

      return result;
    }
  );

  // ============================================================================
  // Get autocomplete suggestions
  // ============================================================================
  fastify.post<{ Body: SuggestionsRequest }>(
    '/suggestions',
    {
      schema: {
        description: 'Get autocomplete suggestions at cursor position',
        tags: ['Expressions'],
        body: {
          type: 'object',
          required: ['formula', 'position'],
          properties: {
            formula: { type: 'string' },
            position: { type: 'number' },
            availableFields: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: SuggestionsRequest }>, reply: FastifyReply) => {
      const { formula, position, availableFields } = request.body;

      const service = new ExpressionService();
      const suggestions = service.getSuggestions(formula, position, availableFields);

      return { suggestions };
    }
  );

  // ============================================================================
  // Tokenize formula for syntax highlighting
  // ============================================================================
  fastify.post<{ Body: TokenizeRequest }>(
    '/tokenize',
    {
      schema: {
        description: 'Tokenize a formula for syntax highlighting',
        tags: ['Expressions'],
        body: {
          type: 'object',
          required: ['formula'],
          properties: {
            formula: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: TokenizeRequest }>, reply: FastifyReply) => {
      const { formula } = request.body;

      const service = new ExpressionService();
      const tokens = service.tokenize(formula);

      return { tokens };
    }
  );

  // ============================================================================
  // List all functions
  // ============================================================================
  fastify.get(
    '/functions',
    {
      schema: {
        description: 'List all available functions',
        tags: ['Expressions'],
        response: {
          200: {
            type: 'object',
            properties: {
              count: { type: 'number' },
              functions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    category: { type: 'string' },
                    description: { type: 'string' },
                    parameters: { type: 'array' },
                    returnType: { type: 'string' },
                    examples: { type: 'array' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const service = new ExpressionService();
      const functions = service.getFunctions().map(fn => ({
        name: fn.name,
        category: fn.category,
        description: fn.description,
        parameters: fn.parameters,
        returnType: fn.returnType,
        examples: fn.examples,
      }));

      return {
        count: functions.length,
        functions,
      };
    }
  );

  // ============================================================================
  // List functions by category
  // ============================================================================
  fastify.get<{ Params: { category: FunctionCategory } }>(
    '/functions/category/:category',
    {
      schema: {
        description: 'List functions in a category',
        tags: ['Expressions'],
        params: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['math', 'text', 'date', 'logic', 'lookup', 'aggregate', 'array', 'conversion', 'user', 'system'],
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { category: FunctionCategory } }>, reply: FastifyReply) => {
      const { category } = request.params;

      const service = new ExpressionService();
      const functions = service.getFunctionsByCategory(category).map(fn => ({
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
        returnType: fn.returnType,
        examples: fn.examples,
      }));

      return {
        category,
        count: functions.length,
        functions,
      };
    }
  );

  // ============================================================================
  // Get function categories
  // ============================================================================
  fastify.get(
    '/functions/categories',
    {
      schema: {
        description: 'List all function categories',
        tags: ['Expressions'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const service = new ExpressionService();
      const allFunctions = service.getFunctions();

      const categories = new Map<string, number>();
      for (const fn of allFunctions) {
        categories.set(fn.category, (categories.get(fn.category) || 0) + 1);
      }

      return {
        categories: Array.from(categories.entries()).map(([name, count]) => ({
          name,
          count,
        })),
      };
    }
  );

  // ============================================================================
  // Get specific function details
  // ============================================================================
  fastify.get<{ Params: { name: string } }>(
    '/functions/:name',
    {
      schema: {
        description: 'Get details for a specific function',
        tags: ['Expressions'],
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
      const { name } = request.params;

      const service = new ExpressionService();
      const fn = service.getFunction(name);

      if (!fn) {
        return reply.status(404).send({
          error: 'Function not found',
          message: `No function named "${name}" exists`,
        });
      }

      return {
        name: fn.name,
        category: fn.category,
        description: fn.description,
        parameters: fn.parameters,
        returnType: fn.returnType,
        examples: fn.examples,
      };
    }
  );
}
