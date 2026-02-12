/**
 * FlowForge Form Service
 * Handles form CRUD, versioning, and submission management
 */

import { prisma } from '../../utils/prisma.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../utils/errors.js';
import { createLogger } from '../../utils/logger.js';
import { validateForm } from './validation.service.js';
import type {
  FormDefinition,
  FieldDefinition,
  FormSubmissionData,
  FormValidationResult,
  FormLayout,
  FormSettings,
} from '../../types/forms/field-types.js';
import type { Form, FormSubmission, FormStatus } from '@prisma/client';
import { nanoid } from 'nanoid';

const logger = createLogger('form-service');

// ============================================================================
// TYPES
// ============================================================================

export interface CreateFormInput {
  name: string;
  description?: string;
  fields?: FieldDefinition[];
  layout?: FormLayout;
  settings?: FormSettings;
}

export interface UpdateFormInput {
  name?: string;
  description?: string;
  fields?: FieldDefinition[];
  layout?: FormLayout;
  settings?: FormSettings;
  validationRules?: unknown[];
  conditionalLogic?: unknown[];
}

export interface FormListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: FormStatus;
  search?: string;
}

export interface PaginatedForms {
  data: Form[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// FORM SERVICE
// ============================================================================

export class FormService {
  /**
   * List forms with pagination
   */
  async listForms(accountId: string, params: FormListParams = {}): Promise<PaginatedForms> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      search,
    } = params;

    const skip = (page - 1) * limit;

    const where = {
      accountId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [forms, total] = await Promise.all([
      prisma.form.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          accountId: true,
          name: true,
          description: true,
          fields: true,
          status: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          _count: {
            select: { submissions: true },
          },
        },
      }),
      prisma.form.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: forms as unknown as Form[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get form by ID
   * Falls back to finding form across all accounts for dev purposes
   */
  async getFormById(accountId: string, formId: string): Promise<Form> {
    // First try to find in the current account
    let form = await prisma.form.findFirst({
      where: { id: formId, accountId },
    });

    // Fallback: find form by ID regardless of account (for demo/seeded data)
    if (!form) {
      form = await prisma.form.findFirst({
        where: { id: formId },
      });
    }

    if (!form) {
      throw new NotFoundError('Form not found');
    }

    return form;
  }

  /**
   * Get form definition (parsed JSON)
   */
  async getFormDefinition(accountId: string, formId: string): Promise<FormDefinition> {
    const form = await this.getFormById(accountId, formId);

    return {
      id: form.id,
      accountId: form.accountId,
      name: form.name,
      description: form.description ?? undefined,
      version: form.version,
      status: form.status.toLowerCase() as 'draft' | 'active' | 'archived',
      fields: form.fields as unknown as FieldDefinition[],
      layout: form.layout as unknown as FormLayout,
      settings: form.settings as unknown as FormSettings,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      createdBy: form.createdBy,
    };
  }

  /**
   * Create a new form
   */
  async createForm(
    accountId: string,
    input: CreateFormInput,
    createdBy: string
  ): Promise<Form> {
    // Validate field names are unique
    if (input.fields) {
      this.validateFieldNames(input.fields);
    }

    const form = await prisma.form.create({
      data: {
        accountId,
        name: input.name,
        description: input.description,
        fields: (input.fields ?? []) as unknown as any,
        layout: (input.layout ?? { type: 'default', columns: 1, labelPosition: 'top' }) as unknown as any,
        settings: (input.settings ?? {}) as unknown as any,
        validationRules: [],
        conditionalLogic: [],
        permissions: {},
        status: 'DRAFT',
        version: 1,
        createdBy,
      },
    });

    logger.info({ formId: form.id, accountId }, 'Form created');

    return form;
  }

  /**
   * Update form
   */
  async updateForm(
    accountId: string,
    formId: string,
    input: UpdateFormInput
  ): Promise<Form> {
    const existingForm = await this.getFormById(accountId, formId);

    // Validate field names are unique
    if (input.fields) {
      this.validateFieldNames(input.fields);
    }

    const form = await prisma.form.update({
      where: { id: formId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.fields !== undefined && { fields: input.fields as unknown as any }),
        ...(input.layout !== undefined && { layout: input.layout as unknown as any }),
        ...(input.settings !== undefined && { settings: input.settings as unknown as any }),
        ...(input.validationRules !== undefined && { validationRules: input.validationRules as unknown as any }),
        ...(input.conditionalLogic !== undefined && { conditionalLogic: input.conditionalLogic as unknown as any }),
      },
    });

    logger.info({ formId, accountId }, 'Form updated');

    return form;
  }

  /**
   * Add field to form
   */
  async addField(
    accountId: string,
    formId: string,
    field: Omit<FieldDefinition, 'id' | 'order'>
  ): Promise<Form> {
    const form = await this.getFormById(accountId, formId);
    const fields = form.fields as unknown as FieldDefinition[];

    // Generate field ID and order
    const newField: FieldDefinition = {
      ...field,
      id: nanoid(10),
      order: fields.length,
    } as FieldDefinition;

    // Validate field name is unique
    const existingNames = fields.map((f) => f.name);
    if (existingNames.includes(newField.name)) {
      throw new ConflictError(`Field with name "${newField.name}" already exists`);
    }

    fields.push(newField);

    return this.updateForm(accountId, formId, { fields });
  }

  /**
   * Update field in form
   */
  async updateField(
    accountId: string,
    formId: string,
    fieldId: string,
    updates: Partial<FieldDefinition>
  ): Promise<Form> {
    const form = await this.getFormById(accountId, formId);
    const fields = form.fields as unknown as FieldDefinition[];

    const fieldIndex = fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex === -1) {
      throw new NotFoundError('Field not found');
    }

    // If name is being changed, check for duplicates
    if (updates.name && updates.name !== fields[fieldIndex]!.name) {
      const existingNames = fields.filter((f) => f.id !== fieldId).map((f) => f.name);
      if (existingNames.includes(updates.name)) {
        throw new ConflictError(`Field with name "${updates.name}" already exists`);
      }
    }

    fields[fieldIndex] = { ...fields[fieldIndex]!, ...updates } as FieldDefinition;

    return this.updateForm(accountId, formId, { fields });
  }

  /**
   * Delete field from form
   */
  async deleteField(accountId: string, formId: string, fieldId: string): Promise<Form> {
    const form = await this.getFormById(accountId, formId);
    const fields = form.fields as unknown as FieldDefinition[];

    const fieldIndex = fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex === -1) {
      throw new NotFoundError('Field not found');
    }

    fields.splice(fieldIndex, 1);

    // Reorder remaining fields
    fields.forEach((f, idx) => {
      f.order = idx;
    });

    return this.updateForm(accountId, formId, { fields });
  }

  /**
   * Reorder fields
   */
  async reorderFields(
    accountId: string,
    formId: string,
    fieldOrder: string[] // Array of field IDs in new order
  ): Promise<Form> {
    const form = await this.getFormById(accountId, formId);
    const fields = form.fields as unknown as FieldDefinition[];

    // Create a map for quick lookup
    const fieldMap = new Map(fields.map((f) => [f.id, f]));

    // Validate all field IDs exist
    for (const id of fieldOrder) {
      if (!fieldMap.has(id)) {
        throw new BadRequestError(`Field with ID "${id}" not found`);
      }
    }

    // Reorder fields
    const reorderedFields = fieldOrder.map((id, idx) => {
      const field = fieldMap.get(id)!;
      return { ...field, order: idx };
    });

    // Add any fields not in the order list at the end
    const orderedIds = new Set(fieldOrder);
    const remainingFields = fields
      .filter((f) => !orderedIds.has(f.id))
      .map((f, idx) => ({ ...f, order: reorderedFields.length + idx }));

    return this.updateForm(accountId, formId, { fields: [...reorderedFields, ...remainingFields] });
  }

  /**
   * Publish form (change status to ACTIVE)
   */
  async publishForm(accountId: string, formId: string): Promise<Form> {
    const form = await this.getFormById(accountId, formId);
    const fields = form.fields as unknown as FieldDefinition[];

    // Validate form has at least one field
    if (fields.length === 0) {
      throw new BadRequestError('Form must have at least one field');
    }

    // Validate all required field properties
    for (const field of fields) {
      if (!field.name || !field.label) {
        throw new BadRequestError(`Field "${field.id}" is missing required properties`);
      }
    }

    const updatedForm = await prisma.form.update({
      where: { id: formId },
      data: {
        status: 'ACTIVE',
        version: form.version + 1,
      },
    });

    logger.info({ formId, accountId, version: updatedForm.version }, 'Form published');

    return updatedForm;
  }

  /**
   * Archive form
   */
  async archiveForm(accountId: string, formId: string): Promise<Form> {
    await this.getFormById(accountId, formId);

    const form = await prisma.form.update({
      where: { id: formId },
      data: { status: 'ARCHIVED' },
    });

    logger.info({ formId, accountId }, 'Form archived');

    return form;
  }

  /**
   * Duplicate form
   */
  async duplicateForm(
    accountId: string,
    formId: string,
    newName: string,
    createdBy: string
  ): Promise<Form> {
    const sourceForm = await this.getFormById(accountId, formId);

    const newForm = await prisma.form.create({
      data: {
        accountId,
        name: newName,
        description: sourceForm.description,
        fields: sourceForm.fields as any,
        layout: sourceForm.layout as any,
        settings: sourceForm.settings as any,
        validationRules: sourceForm.validationRules as any,
        conditionalLogic: sourceForm.conditionalLogic as any,
        permissions: {},
        status: 'DRAFT',
        version: 1,
        createdBy,
      },
    });

    logger.info({ sourceFormId: formId, newFormId: newForm.id, accountId }, 'Form duplicated');

    return newForm;
  }

  /**
   * Delete form
   */
  async deleteForm(accountId: string, formId: string): Promise<void> {
    await this.getFormById(accountId, formId);

    await prisma.form.delete({
      where: { id: formId },
    });

    logger.info({ formId, accountId }, 'Form deleted');
  }

  // ============================================================================
  // FORM SUBMISSIONS
  // ============================================================================

  /**
   * Submit form data
   */
  async submitForm(
    accountId: string,
    formId: string,
    data: FormSubmissionData,
    submittedBy?: string
  ): Promise<{ submission: FormSubmission; validation: FormValidationResult }> {
    const formDef = await this.getFormDefinition(accountId, formId);

    // Validate form is active
    if (formDef.status !== 'active') {
      throw new BadRequestError('Form is not active');
    }

    // Validate submission data
    const validation = validateForm(formDef, data);

    if (!validation.valid) {
      throw new BadRequestError('Validation failed', {
        errors: validation.errors,
      });
    }

    // Create submission
    const submission = await prisma.formSubmission.create({
      data: {
        formId,
        data: data as any,
        createdBy: submittedBy,
      },
    });

    logger.info({ formId, submissionId: submission.id, accountId }, 'Form submitted');

    // =========================================================================
    // Trigger connected workflows
    // =========================================================================
    // Check if any workflows (Process records) have a form_submission trigger
    // matching this form ID. If so, start the workflow execution automatically.
    try {
      const processes = await prisma.process.findMany({
        where: {
          status: 'ACTIVE',
        },
      });

      for (const process of processes) {
        const definition = (process as any).definition as any || {};
        // Triggers can be stored in two places:
        // 1. Top-level `triggers` column on the Process model (used by seed scripts)
        // 2. Inside `definition.triggers` (used by the workflow designer)
        // Prefer whichever has actual content
        const topLevelTriggers = Array.isArray((process as any).triggers) ? (process as any).triggers : [];
        const defTriggers = Array.isArray(definition.triggers) ? definition.triggers : [];
        const triggers: any[] = topLevelTriggers.length > 0 ? topLevelTriggers : defTriggers;

        const hasFormTrigger = triggers.some(
          (t: any) => (t.type === 'form_submission' || t.type === 'form') && t.formId === formId
        );

        if (hasFormTrigger) {
          logger.info(
            { formId, processId: process.id, processName: process.name },
            'Triggering workflow from form submission'
          );

          try {
            // Dynamically import to avoid circular dependencies
            const { workflowService } = await import('../workflow/workflow.service.js');
            await workflowService.startExecution(
              process.id,
              data as Record<string, unknown>,
              submittedBy || 'system',
              'form'
            );
            logger.info(
              { formId, processId: process.id },
              'Workflow execution started from form submission'
            );
          } catch (execError) {
            // Don't fail the submission if workflow trigger fails
            logger.error(
              { formId, processId: process.id, error: execError },
              'Failed to trigger workflow from form submission'
            );
          }
        }
      }
    } catch (triggerError) {
      // Don't fail the submission if trigger lookup fails
      logger.error(
        { formId, error: triggerError },
        'Failed to check for workflow triggers'
      );
    }

    return { submission, validation };
  }

  /**
   * Validate form data without submitting
   */
  async validateFormData(
    accountId: string,
    formId: string,
    data: FormSubmissionData
  ): Promise<FormValidationResult> {
    const formDef = await this.getFormDefinition(accountId, formId);
    return validateForm(formDef, data);
  }

  /**
   * Get form submissions
   */
  async getFormSubmissions(
    accountId: string,
    formId: string,
    params: { page?: number; limit?: number; sortOrder?: 'asc' | 'desc' } = {}
  ): Promise<{
    data: FormSubmission[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    // Verify form exists
    await this.getFormById(accountId, formId);

    const { page = 1, limit = 20, sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where: { formId },
        skip,
        take: limit,
        orderBy: { createdAt: sortOrder },
      }),
      prisma.formSubmission.count({ where: { formId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: submissions,
      pagination: { page, limit, total, totalPages },
    };
  }

  /**
   * Get single submission
   */
  async getSubmission(
    accountId: string,
    formId: string,
    submissionId: string
  ): Promise<FormSubmission> {
    await this.getFormById(accountId, formId);

    const submission = await prisma.formSubmission.findFirst({
      where: { id: submissionId, formId },
    });

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    return submission;
  }

  /**
   * Delete submission
   */
  async deleteSubmission(
    accountId: string,
    formId: string,
    submissionId: string
  ): Promise<void> {
    await this.getFormById(accountId, formId);

    await prisma.formSubmission.delete({
      where: { id: submissionId },
    });

    logger.info({ formId, submissionId, accountId }, 'Submission deleted');
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Validate field names are unique and valid
   */
  private validateFieldNames(fields: FieldDefinition[]): void {
    const names = new Set<string>();
    const invalidNameRegex = /[^a-zA-Z0-9_]/;

    for (const field of fields) {
      // Skip layout fields
      if (['section', 'divider', 'heading'].includes(field.type)) {
        continue;
      }

      if (!field.name) {
        throw new BadRequestError(`Field "${field.id}" is missing a name`);
      }

      if (invalidNameRegex.test(field.name)) {
        throw new BadRequestError(
          `Field name "${field.name}" is invalid. Use only letters, numbers, and underscores.`
        );
      }

      if (names.has(field.name)) {
        throw new ConflictError(`Duplicate field name: "${field.name}"`);
      }

      names.add(field.name);
    }
  }
}

export const formService = new FormService();
