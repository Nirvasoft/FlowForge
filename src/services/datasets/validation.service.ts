/**
 * FlowForge Dataset Validation Service
 * Validates records against dataset schema
 */

import type {
  Dataset,
  DatasetColumn,
  DatasetRecord,
  ValidationResult,
  ValidationError,
  ColumnType,
} from '../../types/datasets';

export class DatasetValidationService {
  
  /**
   * Validate a record against a dataset schema
   */
  validateRecord(
    data: Record<string, unknown>,
    dataset: Dataset,
    options: { partial?: boolean } = {}
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const column of dataset.columns) {
      const value = data[column.slug];
      const columnErrors = this.validateColumn(value, column, options.partial);
      errors.push(...columnErrors);
    }

    // Check for unknown columns
    const columnSlugs = new Set(dataset.columns.map(c => c.slug));
    for (const key of Object.keys(data)) {
      if (!columnSlugs.has(key)) {
        errors.push({
          column: key,
          message: `Unknown column: ${key}`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single column value
   */
  validateColumn(
    value: unknown,
    column: DatasetColumn,
    partial: boolean = false
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required
    if (column.required && !partial) {
      if (value === undefined || value === null || value === '') {
        errors.push({
          column: column.slug,
          message: `${column.name} is required`,
          constraint: 'required',
        });
        return errors; // Skip other validations if required and missing
      }
    }

    // Skip validation if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return errors;
    }

    // Type-specific validation
    const typeErrors = this.validateType(value, column);
    errors.push(...typeErrors);

    return errors;
  }

  /**
   * Validate value against column type
   */
  private validateType(value: unknown, column: DatasetColumn): ValidationError[] {
    const errors: ValidationError[] = [];
    const settings = column.settings || {};

    switch (column.type) {
      case 'text':
        if (typeof value !== 'string') {
          errors.push({ column: column.slug, message: 'Must be a string', value });
          break;
        }
        if (settings.minLength && value.length < settings.minLength) {
          errors.push({
            column: column.slug,
            message: `Must be at least ${settings.minLength} characters`,
            value,
            constraint: 'minLength',
          });
        }
        if (settings.maxLength && value.length > settings.maxLength) {
          errors.push({
            column: column.slug,
            message: `Must be at most ${settings.maxLength} characters`,
            value,
            constraint: 'maxLength',
          });
        }
        if (settings.pattern) {
          const regex = new RegExp(settings.pattern);
          if (!regex.test(value)) {
            errors.push({
              column: column.slug,
              message: `Does not match required pattern`,
              value,
              constraint: 'pattern',
            });
          }
        }
        break;

      case 'number':
      case 'currency':
      case 'percent':
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        if (isNaN(num)) {
          errors.push({ column: column.slug, message: 'Must be a number', value });
          break;
        }
        if (settings.min !== undefined && num < settings.min) {
          errors.push({
            column: column.slug,
            message: `Must be at least ${settings.min}`,
            value,
            constraint: 'min',
          });
        }
        if (settings.max !== undefined && num > settings.max) {
          errors.push({
            column: column.slug,
            message: `Must be at most ${settings.max}`,
            value,
            constraint: 'max',
          });
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 0 && value !== 1) {
          errors.push({ column: column.slug, message: 'Must be a boolean', value });
        }
        break;

      case 'date':
      case 'datetime':
        const date = value instanceof Date ? value : new Date(String(value));
        if (isNaN(date.getTime())) {
          errors.push({ column: column.slug, message: 'Must be a valid date', value });
          break;
        }
        if (settings.minDate) {
          const minDate = new Date(settings.minDate);
          if (date < minDate) {
            errors.push({
              column: column.slug,
              message: `Must be after ${settings.minDate}`,
              value,
              constraint: 'minDate',
            });
          }
        }
        if (settings.maxDate) {
          const maxDate = new Date(settings.maxDate);
          if (date > maxDate) {
            errors.push({
              column: column.slug,
              message: `Must be before ${settings.maxDate}`,
              value,
              constraint: 'maxDate',
            });
          }
        }
        break;

      case 'email':
        if (typeof value !== 'string') {
          errors.push({ column: column.slug, message: 'Must be a string', value });
          break;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push({ column: column.slug, message: 'Must be a valid email address', value });
        }
        break;

      case 'url':
        if (typeof value !== 'string') {
          errors.push({ column: column.slug, message: 'Must be a string', value });
          break;
        }
        try {
          new URL(value);
        } catch {
          errors.push({ column: column.slug, message: 'Must be a valid URL', value });
        }
        break;

      case 'phone':
        if (typeof value !== 'string') {
          errors.push({ column: column.slug, message: 'Must be a string', value });
          break;
        }
        // Basic phone validation - digits, spaces, dashes, parens, plus
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 7) {
          errors.push({ column: column.slug, message: 'Must be a valid phone number', value });
        }
        break;

      case 'json':
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            errors.push({ column: column.slug, message: 'Must be valid JSON', value });
          }
        } else if (typeof value !== 'object') {
          errors.push({ column: column.slug, message: 'Must be a JSON object', value });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({ column: column.slug, message: 'Must be an array', value });
          break;
        }
        if (settings.maxItems && value.length > settings.maxItems) {
          errors.push({
            column: column.slug,
            message: `Must have at most ${settings.maxItems} items`,
            value,
            constraint: 'maxItems',
          });
        }
        break;

      case 'reference':
        // Reference validation happens at service level (needs DB access)
        break;

      case 'formula':
        // Formula columns are computed, not validated
        break;

      case 'attachment':
        // Attachment validation happens at upload level
        break;
    }

    return errors;
  }

  /**
   * Coerce a value to the expected type
   */
  coerceValue(value: unknown, column: DatasetColumn): unknown {
    if (value === undefined || value === null || value === '') {
      return column.defaultValue ?? null;
    }

    switch (column.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
        return String(value);

      case 'number':
      case 'currency':
      case 'percent':
        const num = parseFloat(String(value));
        if (isNaN(num)) return null;
        if (column.settings?.precision !== undefined) {
          return parseFloat(num.toFixed(column.settings.precision));
        }
        return num;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (value === 'true' || value === 1 || value === '1') return true;
        if (value === 'false' || value === 0 || value === '0') return false;
        return Boolean(value);

      case 'date':
      case 'datetime':
        if (value instanceof Date) return value;
        const date = new Date(String(value));
        return isNaN(date.getTime()) ? null : date;

      case 'json':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        }
        return value;

      case 'array':
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [value];
          } catch {
            return value.split(',').map(s => s.trim());
          }
        }
        return [value];

      default:
        return value;
    }
  }

  /**
   * Coerce all values in a record
   */
  coerceRecord(
    data: Record<string, unknown>,
    dataset: Dataset
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const column of dataset.columns) {
      if (column.type === 'formula') continue; // Skip formula columns
      
      const value = data[column.slug];
      result[column.slug] = this.coerceValue(value, column);
    }

    return result;
  }

  /**
   * Check if a value is unique in the dataset
   */
  async checkUnique(
    value: unknown,
    column: DatasetColumn,
    existingRecords: DatasetRecord[],
    excludeId?: string
  ): Promise<boolean> {
    for (const record of existingRecords) {
      if (excludeId && record.id === excludeId) continue;
      if (record.data[column.slug] === value) {
        return false;
      }
    }
    return true;
  }
}

export const datasetValidationService = new DatasetValidationService();
