/**
 * FlowForge Form Validation Engine
 * Validates form submissions against field definitions and rules
 */

import type {
  FieldDefinition,
  FormDefinition,
  FormSubmissionData,
  FormValidationResult,
  FormValidationError,
  ValidationRule,
  ValidationType,
  FieldCondition,
  ConditionOperator,
} from '../../types/forms/field-types.js';

/**
 * Main form validator class
 */
export class FormValidator {
  private form: FormDefinition;
  private data: FormSubmissionData;
  private errors: FormValidationError[] = [];
  private warnings: FormValidationError[] = [];

  constructor(form: FormDefinition, data: FormSubmissionData) {
    this.form = form;
    this.data = data;
  }

  /**
   * Validate the entire form
   */
  validate(): FormValidationResult {
    this.errors = [];
    this.warnings = [];

    for (const field of this.form.fields) {
      // Skip layout fields
      if (['section', 'divider', 'heading'].includes(field.type)) {
        continue;
      }

      // Check if field is visible based on conditions
      if (!this.isFieldVisible(field)) {
        continue;
      }

      // Determine if field is required (could be conditional)
      const isRequired = this.isFieldRequired(field);

      const value = this.data[field.name];

      // Required validation
      if (isRequired && this.isEmpty(value)) {
        this.addError(field.name, 'required', `${field.label} is required`);
        continue; // Skip other validations if required field is empty
      }

      // Skip other validations if field is empty and not required
      if (this.isEmpty(value)) {
        continue;
      }

      // Field-specific validations
      this.validateFieldType(field, value);

      // Custom validation rules
      if (field.validationRules) {
        for (const rule of field.validationRules) {
          this.validateRule(field, value, rule);
        }
      }
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Check if field is visible based on conditions
   */
  private isFieldVisible(field: FieldDefinition): boolean {
    if (field.hidden) {
      return false;
    }

    if (!field.conditions || field.conditions.length === 0) {
      return true;
    }

    // Filter show/hide conditions
    const visibilityConditions = field.conditions.filter(
      (c) => c.action === 'show' || c.action === 'hide'
    );

    if (visibilityConditions.length === 0) {
      return true;
    }

    // Evaluate conditions
    const showConditions = visibilityConditions.filter((c) => c.action === 'show');
    const hideConditions = visibilityConditions.filter((c) => c.action === 'hide');

    // If there are show conditions, field is hidden by default
    if (showConditions.length > 0) {
      const anyShowMatch = this.evaluateConditions(showConditions);
      if (!anyShowMatch) {
        return false;
      }
    }

    // Check hide conditions
    if (hideConditions.length > 0) {
      const anyHideMatch = this.evaluateConditions(hideConditions);
      if (anyHideMatch) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if field is required based on conditions
   */
  private isFieldRequired(field: FieldDefinition): boolean {
    const baseRequired = field.required ?? false;

    if (!field.conditions || field.conditions.length === 0) {
      return baseRequired;
    }

    const requireConditions = field.conditions.filter((c) => c.action === 'require');
    const optionalConditions = field.conditions.filter((c) => c.action === 'optional');

    if (requireConditions.length > 0) {
      const anyRequireMatch = this.evaluateConditions(requireConditions);
      if (anyRequireMatch) {
        return true;
      }
    }

    if (optionalConditions.length > 0) {
      const anyOptionalMatch = this.evaluateConditions(optionalConditions);
      if (anyOptionalMatch) {
        return false;
      }
    }

    return baseRequired;
  }

  /**
   * Evaluate a group of conditions (OR by default)
   */
  private evaluateConditions(conditions: FieldCondition[]): boolean {
    if (conditions.length === 0) {
      return true;
    }

    // Group by logic operator
    let result = this.evaluateCondition(conditions[0]!);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i]!;
      const conditionResult = this.evaluateCondition(condition);
      const logic = conditions[i - 1]?.logic ?? 'or';

      if (logic === 'and') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
    }

    return result;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: FieldCondition): boolean {
    const fieldValue = this.data[condition.field];
    return this.compareValues(fieldValue, condition.operator, condition.value, condition.values);
  }

  /**
   * Compare values using operator
   */
  private compareValues(
    fieldValue: unknown,
    operator: ConditionOperator,
    value?: unknown,
    values?: unknown[]
  ): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === value;

      case 'notEquals':
        return fieldValue !== value;

      case 'contains':
        return typeof fieldValue === 'string' && 
               typeof value === 'string' && 
               fieldValue.toLowerCase().includes(value.toLowerCase());

      case 'notContains':
        return typeof fieldValue === 'string' && 
               typeof value === 'string' && 
               !fieldValue.toLowerCase().includes(value.toLowerCase());

      case 'startsWith':
        return typeof fieldValue === 'string' && 
               typeof value === 'string' && 
               fieldValue.toLowerCase().startsWith(value.toLowerCase());

      case 'endsWith':
        return typeof fieldValue === 'string' && 
               typeof value === 'string' && 
               fieldValue.toLowerCase().endsWith(value.toLowerCase());

      case 'greaterThan':
        return typeof fieldValue === 'number' && 
               typeof value === 'number' && 
               fieldValue > value;

      case 'lessThan':
        return typeof fieldValue === 'number' && 
               typeof value === 'number' && 
               fieldValue < value;

      case 'greaterOrEqual':
        return typeof fieldValue === 'number' && 
               typeof value === 'number' && 
               fieldValue >= value;

      case 'lessOrEqual':
        return typeof fieldValue === 'number' && 
               typeof value === 'number' && 
               fieldValue <= value;

      case 'isEmpty':
        return this.isEmpty(fieldValue);

      case 'isNotEmpty':
        return !this.isEmpty(fieldValue);

      case 'in':
        return Array.isArray(values) && values.includes(fieldValue);

      case 'notIn':
        return Array.isArray(values) && !values.includes(fieldValue);

      case 'between':
        if (Array.isArray(values) && values.length === 2 && typeof fieldValue === 'number') {
          const [min, max] = values as [number, number];
          return fieldValue >= min && fieldValue <= max;
        }
        return false;

      case 'matches':
        if (typeof fieldValue === 'string' && typeof value === 'string') {
          try {
            const regex = new RegExp(value);
            return regex.test(fieldValue);
          } catch {
            return false;
          }
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Validate field based on its type
   */
  private validateFieldType(field: FieldDefinition, value: unknown): void {
    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'password':
        this.validateText(field, value);
        break;

      case 'number':
      case 'slider':
      case 'rating':
        this.validateNumber(field, value);
        break;

      case 'email':
        this.validateEmail(field, value);
        break;

      case 'phone':
        this.validatePhone(field, value);
        break;

      case 'url':
        this.validateUrl(field, value);
        break;

      case 'date':
      case 'datetime':
        this.validateDate(field, value);
        break;

      case 'currency':
        this.validateCurrency(field, value);
        break;

      case 'select':
      case 'radio':
        this.validateSelect(field, value);
        break;

      case 'multiselect':
      case 'checkbox':
        this.validateMultiSelect(field, value);
        break;

      case 'file':
      case 'image':
        this.validateFile(field, value);
        break;

      default:
        // No specific validation
        break;
    }
  }

  /**
   * Validate text fields
   */
  private validateText(field: FieldDefinition, value: unknown): void {
    if (typeof value !== 'string') {
      this.addError(field.name, 'pattern', `${field.label} must be a text value`);
      return;
    }

    const textField = field as { minLength?: number; maxLength?: number; pattern?: string; patternMessage?: string };

    if (textField.minLength !== undefined && value.length < textField.minLength) {
      this.addError(
        field.name,
        'minLength',
        `${field.label} must be at least ${textField.minLength} characters`
      );
    }

    if (textField.maxLength !== undefined && value.length > textField.maxLength) {
      this.addError(
        field.name,
        'maxLength',
        `${field.label} must be at most ${textField.maxLength} characters`
      );
    }

    if (textField.pattern) {
      try {
        const regex = new RegExp(textField.pattern);
        if (!regex.test(value)) {
          this.addError(
            field.name,
            'pattern',
            textField.patternMessage ?? `${field.label} format is invalid`
          );
        }
      } catch {
        // Invalid regex pattern, skip validation
      }
    }
  }

  /**
   * Validate number fields
   */
  private validateNumber(field: FieldDefinition, value: unknown): void {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (typeof numValue !== 'number' || isNaN(numValue)) {
      this.addError(field.name, 'pattern', `${field.label} must be a valid number`);
      return;
    }

    const numField = field as { min?: number; max?: number; precision?: number };

    if (numField.min !== undefined && numValue < numField.min) {
      this.addError(field.name, 'min', `${field.label} must be at least ${numField.min}`);
    }

    if (numField.max !== undefined && numValue > numField.max) {
      this.addError(field.name, 'max', `${field.label} must be at most ${numField.max}`);
    }
  }

  /**
   * Validate email fields
   */
  private validateEmail(field: FieldDefinition, value: unknown): void {
    if (typeof value !== 'string') {
      this.addError(field.name, 'email', `${field.label} must be a valid email`);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      this.addError(field.name, 'email', `${field.label} must be a valid email address`);
      return;
    }

    const emailField = field as { domains?: string[]; blockDomains?: string[] };
    const domain = value.split('@')[1]?.toLowerCase();

    if (domain && emailField.domains && emailField.domains.length > 0) {
      if (!emailField.domains.map((d) => d.toLowerCase()).includes(domain)) {
        this.addError(
          field.name,
          'email',
          `${field.label} must use an allowed domain: ${emailField.domains.join(', ')}`
        );
      }
    }

    if (domain && emailField.blockDomains && emailField.blockDomains.length > 0) {
      if (emailField.blockDomains.map((d) => d.toLowerCase()).includes(domain)) {
        this.addError(field.name, 'email', `${field.label} cannot use this domain`);
      }
    }
  }

  /**
   * Validate phone fields
   */
  private validatePhone(field: FieldDefinition, value: unknown): void {
    if (typeof value !== 'string') {
      this.addError(field.name, 'phone', `${field.label} must be a valid phone number`);
      return;
    }

    // Basic phone validation - digits, spaces, dashes, parentheses, plus sign
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    const digitsOnly = value.replace(/\D/g, '');

    if (!phoneRegex.test(value) || digitsOnly.length < 7 || digitsOnly.length > 15) {
      this.addError(field.name, 'phone', `${field.label} must be a valid phone number`);
    }
  }

  /**
   * Validate URL fields
   */
  private validateUrl(field: FieldDefinition, value: unknown): void {
    if (typeof value !== 'string') {
      this.addError(field.name, 'url', `${field.label} must be a valid URL`);
      return;
    }

    try {
      const url = new URL(value);
      const urlField = field as { allowedProtocols?: string[] };

      if (urlField.allowedProtocols && urlField.allowedProtocols.length > 0) {
        const protocol = url.protocol.replace(':', '');
        if (!urlField.allowedProtocols.includes(protocol)) {
          this.addError(
            field.name,
            'url',
            `${field.label} must use protocol: ${urlField.allowedProtocols.join(', ')}`
          );
        }
      }
    } catch {
      this.addError(field.name, 'url', `${field.label} must be a valid URL`);
    }
  }

  /**
   * Validate date fields
   */
  private validateDate(field: FieldDefinition, value: unknown): void {
    if (typeof value !== 'string' && !(value instanceof Date)) {
      this.addError(field.name, 'date', `${field.label} must be a valid date`);
      return;
    }

    const dateValue = value instanceof Date ? value : new Date(value);

    if (isNaN(dateValue.getTime())) {
      this.addError(field.name, 'date', `${field.label} must be a valid date`);
      return;
    }

    const dateField = field as { minDate?: string; maxDate?: string };

    if (dateField.minDate) {
      const minDate = new Date(dateField.minDate);
      if (dateValue < minDate) {
        this.addError(
          field.name,
          'date',
          `${field.label} must be on or after ${minDate.toLocaleDateString()}`
        );
      }
    }

    if (dateField.maxDate) {
      const maxDate = new Date(dateField.maxDate);
      if (dateValue > maxDate) {
        this.addError(
          field.name,
          'date',
          `${field.label} must be on or before ${maxDate.toLocaleDateString()}`
        );
      }
    }
  }

  /**
   * Validate currency fields
   */
  private validateCurrency(field: FieldDefinition, value: unknown): void {
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;

    if (typeof numValue !== 'number' || isNaN(numValue)) {
      this.addError(field.name, 'pattern', `${field.label} must be a valid amount`);
      return;
    }

    const currencyField = field as { min?: number; max?: number };

    if (currencyField.min !== undefined && numValue < currencyField.min) {
      this.addError(field.name, 'min', `${field.label} must be at least ${currencyField.min}`);
    }

    if (currencyField.max !== undefined && numValue > currencyField.max) {
      this.addError(field.name, 'max', `${field.label} must be at most ${currencyField.max}`);
    }
  }

  /**
   * Validate select fields
   */
  private validateSelect(field: FieldDefinition, value: unknown): void {
    const selectField = field as { options?: { value: string }[] };

    if (selectField.options && selectField.options.length > 0) {
      const validValues = selectField.options.map((o) => o.value);
      if (!validValues.includes(value as string)) {
        this.addError(field.name, 'pattern', `${field.label} must be a valid option`);
      }
    }
  }

  /**
   * Validate multi-select fields
   */
  private validateMultiSelect(field: FieldDefinition, value: unknown): void {
    if (!Array.isArray(value)) {
      this.addError(field.name, 'pattern', `${field.label} must be an array`);
      return;
    }

    const multiField = field as { options?: { value: string }[]; minSelections?: number; maxSelections?: number };

    if (multiField.options && multiField.options.length > 0) {
      const validValues = multiField.options.map((o) => o.value);
      for (const v of value) {
        if (!validValues.includes(v as string)) {
          this.addError(field.name, 'pattern', `${field.label} contains invalid options`);
          break;
        }
      }
    }

    if (multiField.minSelections !== undefined && value.length < multiField.minSelections) {
      this.addError(
        field.name,
        'min',
        `${field.label} requires at least ${multiField.minSelections} selection(s)`
      );
    }

    if (multiField.maxSelections !== undefined && value.length > multiField.maxSelections) {
      this.addError(
        field.name,
        'max',
        `${field.label} allows at most ${multiField.maxSelections} selection(s)`
      );
    }
  }

  /**
   * Validate file fields
   */
  private validateFile(field: FieldDefinition, value: unknown): void {
    // File validation would typically happen on the server with actual file metadata
    const fileField = field as { maxFiles?: number; maxSize?: number; accept?: string[] };

    if (Array.isArray(value)) {
      if (fileField.maxFiles !== undefined && value.length > fileField.maxFiles) {
        this.addError(
          field.name,
          'max',
          `${field.label} allows at most ${fileField.maxFiles} file(s)`
        );
      }
    }
  }

  /**
   * Validate custom validation rule
   */
  private validateRule(field: FieldDefinition, value: unknown, rule: ValidationRule): void {
    let isValid = true;

    switch (rule.type) {
      case 'required':
        isValid = !this.isEmpty(value);
        break;

      case 'minLength':
        isValid = typeof value === 'string' && value.length >= (rule.value as number);
        break;

      case 'maxLength':
        isValid = typeof value === 'string' && value.length <= (rule.value as number);
        break;

      case 'min':
        isValid = typeof value === 'number' && value >= (rule.value as number);
        break;

      case 'max':
        isValid = typeof value === 'number' && value <= (rule.value as number);
        break;

      case 'pattern':
        if (typeof value === 'string' && typeof rule.value === 'string') {
          try {
            const regex = new RegExp(rule.value);
            isValid = regex.test(value);
          } catch {
            isValid = true; // Invalid regex, skip
          }
        }
        break;

      case 'custom':
      case 'expression':
        // Would need expression evaluator
        isValid = true;
        break;

      default:
        isValid = true;
    }

    if (!isValid) {
      if (rule.severity === 'warning') {
        this.addWarning(field.name, rule.type, rule.message);
      } else {
        this.addError(field.name, rule.type, rule.message);
      }
    }
  }

  /**
   * Check if value is empty
   */
  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return true;
    }
    if (Array.isArray(value) && value.length === 0) {
      return true;
    }
    return false;
  }

  /**
   * Add validation error
   */
  private addError(field: string, type: ValidationType, message: string): void {
    this.errors.push({ field, type, message, severity: 'error' });
  }

  /**
   * Add validation warning
   */
  private addWarning(field: string, type: ValidationType, message: string): void {
    this.warnings.push({ field, type, message, severity: 'warning' });
  }
}

/**
 * Validate form submission
 */
export function validateForm(
  form: FormDefinition,
  data: FormSubmissionData
): FormValidationResult {
  const validator = new FormValidator(form, data);
  return validator.validate();
}

/**
 * Validate a single field
 */
export function validateField(
  field: FieldDefinition,
  value: unknown,
  allData: FormSubmissionData = {}
): FormValidationError[] {
  const mockForm: FormDefinition = {
    id: 'temp',
    accountId: 'temp',
    name: 'temp',
    version: 1,
    status: 'active',
    fields: [field],
    layout: { type: 'default' },
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'temp',
  };

  const validator = new FormValidator(mockForm, { ...allData, [field.name]: value });
  const result = validator.validate();
  return result.errors;
}
