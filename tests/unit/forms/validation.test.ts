/**
 * Form Validation Tests
 */

import { FormValidator, validateForm, validateField } from '../../../src/services/forms/validation.service';
import type { FormDefinition, FieldDefinition, TextFieldDefinition, NumberFieldDefinition, EmailFieldDefinition, SelectFieldDefinition } from '../../../src/types/forms/field-types';

// Helper to create a minimal form definition
function createForm(fields: FieldDefinition[]): FormDefinition {
  return {
    id: 'test-form',
    accountId: 'test-account',
    name: 'Test Form',
    version: 1,
    status: 'active',
    fields,
    layout: { type: 'default' },
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test-user',
  };
}

describe('FormValidator', () => {
  describe('Required Validation', () => {
    it('should fail when required field is empty', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'text',
          name: 'firstName',
          label: 'First Name',
          order: 0,
          required: true,
        } as TextFieldDefinition,
      ];

      const form = createForm(fields);
      const result = validateForm(form, {});

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('firstName');
      expect(result.errors[0]?.type).toBe('required');
    });

    it('should pass when required field has value', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'text',
          name: 'firstName',
          label: 'First Name',
          order: 0,
          required: true,
        } as TextFieldDefinition,
      ];

      const form = createForm(fields);
      const result = validateForm(form, { firstName: 'John' });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip validation for non-required empty fields', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'text',
          name: 'middleName',
          label: 'Middle Name',
          order: 0,
          required: false,
        } as TextFieldDefinition,
      ];

      const form = createForm(fields);
      const result = validateForm(form, {});

      expect(result.valid).toBe(true);
    });
  });

  describe('Text Validation', () => {
    it('should validate minLength', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'text',
          name: 'password',
          label: 'Password',
          order: 0,
          minLength: 8,
        } as TextFieldDefinition,
      ];

      const form = createForm(fields);
      
      const failResult = validateForm(form, { password: 'short' });
      expect(failResult.valid).toBe(false);
      expect(failResult.errors[0]?.type).toBe('minLength');

      const passResult = validateForm(form, { password: 'longenough' });
      expect(passResult.valid).toBe(true);
    });

    it('should validate maxLength', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'text',
          name: 'code',
          label: 'Code',
          order: 0,
          maxLength: 5,
        } as TextFieldDefinition,
      ];

      const form = createForm(fields);
      
      const failResult = validateForm(form, { code: 'toolong' });
      expect(failResult.valid).toBe(false);
      expect(failResult.errors[0]?.type).toBe('maxLength');

      const passResult = validateForm(form, { code: 'ok' });
      expect(passResult.valid).toBe(true);
    });

    it('should validate pattern', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'text',
          name: 'zipCode',
          label: 'Zip Code',
          order: 0,
          pattern: '^\\d{5}$',
          patternMessage: 'Must be 5 digits',
        } as TextFieldDefinition,
      ];

      const form = createForm(fields);
      
      const failResult = validateForm(form, { zipCode: 'abc' });
      expect(failResult.valid).toBe(false);

      const passResult = validateForm(form, { zipCode: '12345' });
      expect(passResult.valid).toBe(true);
    });
  });

  describe('Number Validation', () => {
    it('should validate min value', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'number',
          name: 'age',
          label: 'Age',
          order: 0,
          min: 18,
        } as NumberFieldDefinition,
      ];

      const form = createForm(fields);
      
      const failResult = validateForm(form, { age: 15 });
      expect(failResult.valid).toBe(false);
      expect(failResult.errors[0]?.type).toBe('min');

      const passResult = validateForm(form, { age: 25 });
      expect(passResult.valid).toBe(true);
    });

    it('should validate max value', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'number',
          name: 'quantity',
          label: 'Quantity',
          order: 0,
          max: 100,
        } as NumberFieldDefinition,
      ];

      const form = createForm(fields);
      
      const failResult = validateForm(form, { quantity: 150 });
      expect(failResult.valid).toBe(false);
      expect(failResult.errors[0]?.type).toBe('max');

      const passResult = validateForm(form, { quantity: 50 });
      expect(passResult.valid).toBe(true);
    });

    it('should reject non-numeric values', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'number',
          name: 'amount',
          label: 'Amount',
          order: 0,
        } as NumberFieldDefinition,
      ];

      const form = createForm(fields);
      const result = validateForm(form, { amount: 'not a number' });

      expect(result.valid).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should validate email format', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'email',
          name: 'email',
          label: 'Email',
          order: 0,
        } as EmailFieldDefinition,
      ];

      const form = createForm(fields);
      
      const failResult = validateForm(form, { email: 'invalid-email' });
      expect(failResult.valid).toBe(false);
      expect(failResult.errors[0]?.type).toBe('email');

      const passResult = validateForm(form, { email: 'test@example.com' });
      expect(passResult.valid).toBe(true);
    });

    it('should validate allowed domains', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'email',
          name: 'email',
          label: 'Work Email',
          order: 0,
          domains: ['company.com', 'corp.company.com'],
        } as EmailFieldDefinition,
      ];

      const form = createForm(fields);
      
      const failResult = validateForm(form, { email: 'test@gmail.com' });
      expect(failResult.valid).toBe(false);

      const passResult = validateForm(form, { email: 'test@company.com' });
      expect(passResult.valid).toBe(true);
    });

    it('should validate blocked domains', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'email',
          name: 'email',
          label: 'Email',
          order: 0,
          blockDomains: ['spam.com', 'temp.com'],
        } as EmailFieldDefinition,
      ];

      const form = createForm(fields);
      
      const failResult = validateForm(form, { email: 'test@spam.com' });
      expect(failResult.valid).toBe(false);

      const passResult = validateForm(form, { email: 'test@gmail.com' });
      expect(passResult.valid).toBe(true);
    });
  });

  describe('Select Validation', () => {
    it('should validate option exists', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'select',
          name: 'status',
          label: 'Status',
          order: 0,
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        } as SelectFieldDefinition,
      ];

      const form = createForm(fields);
      
      const failResult = validateForm(form, { status: 'invalid' });
      expect(failResult.valid).toBe(false);

      const passResult = validateForm(form, { status: 'active' });
      expect(passResult.valid).toBe(true);
    });
  });

  describe('Conditional Logic', () => {
    it('should hide field when condition is met', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'select',
          name: 'hasCompany',
          label: 'Do you have a company?',
          order: 0,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
        } as SelectFieldDefinition,
        {
          id: 'f2',
          type: 'text',
          name: 'companyName',
          label: 'Company Name',
          order: 1,
          required: true,
          conditions: [
            {
              id: 'c1',
              field: 'hasCompany',
              operator: 'equals',
              value: 'no',
              action: 'hide',
            },
          ],
        } as TextFieldDefinition,
      ];

      const form = createForm(fields);
      
      // When hasCompany is 'no', companyName should be hidden and not required
      const result = validateForm(form, { hasCompany: 'no' });
      expect(result.valid).toBe(true);
    });

    it('should show field when condition is met', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'select',
          name: 'type',
          label: 'Type',
          order: 0,
          options: [
            { value: 'personal', label: 'Personal' },
            { value: 'business', label: 'Business' },
          ],
        } as SelectFieldDefinition,
        {
          id: 'f2',
          type: 'text',
          name: 'businessId',
          label: 'Business ID',
          order: 1,
          hidden: true,
          required: true,
          conditions: [
            {
              id: 'c1',
              field: 'type',
              operator: 'equals',
              value: 'business',
              action: 'show',
            },
          ],
        } as TextFieldDefinition,
      ];

      const form = createForm(fields);
      
      // When type is 'business', businessId should be shown and required
      const failResult = validateForm(form, { type: 'business' });
      expect(failResult.valid).toBe(false);
      expect(failResult.errors[0]?.field).toBe('businessId');

      const passResult = validateForm(form, { type: 'business', businessId: 'BIZ123' });
      expect(passResult.valid).toBe(true);
    });

    it('should make field conditionally required', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'number',
          name: 'amount',
          label: 'Amount',
          order: 0,
        } as NumberFieldDefinition,
        {
          id: 'f2',
          type: 'text',
          name: 'approverNotes',
          label: 'Approver Notes',
          order: 1,
          required: false,
          conditions: [
            {
              id: 'c1',
              field: 'amount',
              operator: 'greaterThan',
              value: 1000,
              action: 'require',
            },
          ],
        } as TextFieldDefinition,
      ];

      const form = createForm(fields);
      
      // When amount > 1000, approverNotes should be required
      const failResult = validateForm(form, { amount: 1500 });
      expect(failResult.valid).toBe(false);
      expect(failResult.errors[0]?.field).toBe('approverNotes');

      // When amount <= 1000, approverNotes is optional
      const passResult = validateForm(form, { amount: 500 });
      expect(passResult.valid).toBe(true);
    });
  });

  describe('Multiple Fields', () => {
    it('should validate all fields and collect all errors', () => {
      const fields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'text',
          name: 'firstName',
          label: 'First Name',
          order: 0,
          required: true,
        } as TextFieldDefinition,
        {
          id: 'f2',
          type: 'email',
          name: 'email',
          label: 'Email',
          order: 1,
          required: true,
        } as EmailFieldDefinition,
        {
          id: 'f3',
          type: 'number',
          name: 'age',
          label: 'Age',
          order: 2,
          required: true,
          min: 18,
        } as NumberFieldDefinition,
      ];

      const form = createForm(fields);
      const result = validateForm(form, { age: 15 });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
      
      const errorFields = result.errors.map(e => e.field);
      expect(errorFields).toContain('firstName');
      expect(errorFields).toContain('email');
      expect(errorFields).toContain('age');
    });
  });

  describe('validateField helper', () => {
    it('should validate a single field', () => {
      const field: TextFieldDefinition = {
        id: 'f1',
        type: 'text',
        name: 'test',
        label: 'Test',
        order: 0,
        required: true,
        minLength: 5,
      };

      const errors = validateField(field, 'hi');
      expect(errors.length).toBe(1);
      expect(errors[0]?.type).toBe('minLength');
    });
  });
});
