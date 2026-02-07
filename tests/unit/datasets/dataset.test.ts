/**
 * FlowForge Dataset Tests
 * Comprehensive test suite for datasets, records, and import/export
 */

import { DatasetService } from '../src/services/datasets/dataset.service';
import { DatasetValidationService } from '../src/services/datasets/validation.service';
import { ImportExportService } from '../src/services/datasets/import-export.service';
import type { Dataset, DatasetColumn, ColumnType } from '../src/types/datasets';

describe('Dataset Service', () => {
  let service: DatasetService;

  beforeEach(() => {
    service = new DatasetService();
  });

  describe('Dataset CRUD', () => {
    test('creates a dataset', async () => {
      const dataset = await service.createDataset({
        name: 'Employees',
        description: 'Employee directory',
        columns: [
          { name: 'Name', type: 'text', required: true },
          { name: 'Email', type: 'email', required: true, unique: true },
          { name: 'Age', type: 'number' },
        ],
        createdBy: 'user-1',
      });

      expect(dataset.id).toBeDefined();
      expect(dataset.name).toBe('Employees');
      expect(dataset.slug).toBe('employees');
      expect(dataset.columns).toHaveLength(3);
    });

    test('gets a dataset by ID', async () => {
      const created = await service.createDataset({
        name: 'Test',
        columns: [{ name: 'Field', type: 'text' }],
        createdBy: 'user-1',
      });

      const dataset = await service.getDataset(created.id);
      expect(dataset?.name).toBe('Test');
    });

    test('updates a dataset', async () => {
      const created = await service.createDataset({
        name: 'Test',
        columns: [],
        createdBy: 'user-1',
      });

      const updated = await service.updateDataset(created.id, {
        name: 'Updated',
        description: 'New description',
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.description).toBe('New description');
    });

    test('deletes a dataset', async () => {
      const created = await service.createDataset({
        name: 'Test',
        columns: [],
        createdBy: 'user-1',
      });

      const deleted = await service.deleteDataset(created.id);
      expect(deleted).toBe(true);

      const found = await service.getDataset(created.id);
      expect(found).toBeNull();
    });
  });

  describe('Record CRUD', () => {
    let dataset: Dataset;

    beforeEach(async () => {
      dataset = await service.createDataset({
        name: 'Products',
        columns: [
          { name: 'Name', slug: 'name', type: 'text', required: true },
          { name: 'Price', slug: 'price', type: 'number', required: true },
        ],
        createdBy: 'user-1',
      });
    });

    test('creates a record', async () => {
      const result = await service.createRecord(dataset.id, {
        name: 'Widget',
        price: 9.99,
      }, 'user-1');

      expect(result.validation.valid).toBe(true);
      expect(result.record?.data.name).toBe('Widget');
    });

    test('validates required fields', async () => {
      const result = await service.createRecord(dataset.id, {}, 'user-1');

      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThan(0);
    });

    test('updates a record', async () => {
      const { record } = await service.createRecord(dataset.id, {
        name: 'Widget',
        price: 9.99,
      }, 'user-1');

      const updated = await service.updateRecord(dataset.id, record!.id, {
        price: 14.99,
      }, 'user-1');

      expect(updated.record?.data.price).toBe(14.99);
      expect(updated.record?.data.name).toBe('Widget');
    });

    test('soft deletes a record', async () => {
      const { record } = await service.createRecord(dataset.id, {
        name: 'Widget',
        price: 9.99,
      }, 'user-1');

      await service.deleteRecord(dataset.id, record!.id, 'user-1');
      const found = await service.getRecord(dataset.id, record!.id);
      expect(found).toBeNull();
    });

    test('restores a deleted record', async () => {
      const { record } = await service.createRecord(dataset.id, {
        name: 'Widget',
        price: 9.99,
      }, 'user-1');

      await service.deleteRecord(dataset.id, record!.id, 'user-1');
      await service.restoreRecord(dataset.id, record!.id, 'user-1');
      
      const found = await service.getRecord(dataset.id, record!.id);
      expect(found).not.toBeNull();
    });
  });

  describe('Querying', () => {
    let dataset: Dataset;

    beforeEach(async () => {
      dataset = await service.createDataset({
        name: 'Products',
        columns: [
          { name: 'Name', slug: 'name', type: 'text' },
          { name: 'Price', slug: 'price', type: 'number' },
          { name: 'Category', slug: 'category', type: 'text' },
        ],
        createdBy: 'user-1',
      });

      await service.createRecord(dataset.id, { name: 'Apple', price: 1.50, category: 'fruit' }, 'user-1');
      await service.createRecord(dataset.id, { name: 'Banana', price: 0.75, category: 'fruit' }, 'user-1');
      await service.createRecord(dataset.id, { name: 'Carrot', price: 0.50, category: 'vegetable' }, 'user-1');
    });

    test('queries all records', async () => {
      const result = await service.queryRecords(dataset.id);
      expect(result.data).toHaveLength(3);
    });

    test('filters by equality', async () => {
      const result = await service.queryRecords(dataset.id, {
        filter: {
          logic: 'and',
          conditions: [{ column: 'category', operator: 'eq', value: 'fruit' }],
        },
      });
      expect(result.data).toHaveLength(2);
    });

    test('sorts results', async () => {
      const result = await service.queryRecords(dataset.id, {
        sort: [{ column: 'price', direction: 'asc' }],
      });
      expect(result.data[0].data.name).toBe('Carrot');
    });

    test('searches text', async () => {
      const result = await service.queryRecords(dataset.id, { search: 'ban' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].data.name).toBe('Banana');
    });
  });

  describe('Aggregation', () => {
    let dataset: Dataset;

    beforeEach(async () => {
      dataset = await service.createDataset({
        name: 'Sales',
        columns: [
          { name: 'Product', slug: 'product', type: 'text' },
          { name: 'Amount', slug: 'amount', type: 'number' },
        ],
        createdBy: 'user-1',
      });

      await service.createRecord(dataset.id, { product: 'A', amount: 100 }, 'user-1');
      await service.createRecord(dataset.id, { product: 'A', amount: 150 }, 'user-1');
      await service.createRecord(dataset.id, { product: 'B', amount: 200 }, 'user-1');
    });

    test('sums values', async () => {
      const result = await service.aggregateRecords(dataset.id, {
        aggregates: [{ column: 'amount', function: 'sum', alias: 'total' }],
      });
      expect(result.data[0].total).toBe(450);
    });

    test('groups by column', async () => {
      const result = await service.aggregateRecords(dataset.id, {
        groupBy: ['product'],
        aggregates: [{ column: 'amount', function: 'sum', alias: 'total' }],
      });
      expect(result.data).toHaveLength(2);
    });
  });
});

describe('Validation Service', () => {
  const service = new DatasetValidationService();

  const createColumn = (type: ColumnType, settings: any = {}, required = false): DatasetColumn => ({
    id: '1',
    name: 'Test',
    slug: 'test',
    type,
    required,
    unique: false,
    settings,
    displayOrder: 0,
    hidden: false,
  });

  test('validates text length', () => {
    const column = createColumn('text', { minLength: 3, maxLength: 10 });
    expect(service.validateColumn('ab', column)).toHaveLength(1);
    expect(service.validateColumn('abc', column)).toHaveLength(0);
  });

  test('validates number range', () => {
    const column = createColumn('number', { min: 0, max: 100 });
    expect(service.validateColumn(-1, column)).toHaveLength(1);
    expect(service.validateColumn(50, column)).toHaveLength(0);
  });

  test('validates email format', () => {
    const column = createColumn('email');
    expect(service.validateColumn('invalid', column)).toHaveLength(1);
    expect(service.validateColumn('test@example.com', column)).toHaveLength(0);
  });

  test('coerces values', () => {
    expect(service.coerceValue('123', createColumn('number'))).toBe(123);
    expect(service.coerceValue(123, createColumn('text'))).toBe('123');
    expect(service.coerceValue('true', createColumn('boolean'))).toBe(true);
  });
});

describe('Import/Export Service', () => {
  const service = new ImportExportService();

  test('parses CSV', () => {
    const csv = `name,age\nJohn,30\nJane,25`;
    const { headers, rows } = service.parseCSV(csv);
    
    expect(headers).toEqual(['name', 'age']);
    expect(rows).toHaveLength(2);
  });

  test('handles quoted CSV', () => {
    const csv = `name,desc\n"Widget","A small, useful item"`;
    const { rows } = service.parseCSV(csv);
    expect(rows[0][1]).toBe('A small, useful item');
  });

  test('parses JSON', () => {
    const json = '[{"name":"John"},{"name":"Jane"}]';
    const data = service.parseJSON(json);
    expect(data).toHaveLength(2);
  });

  test('generates CSV', () => {
    const dataset: any = {
      columns: [{ slug: 'name', name: 'Name', type: 'text' }],
    };
    const records: any[] = [
      { id: '1', data: { name: 'John' } },
    ];

    const csv = service.generateCSV(records, dataset);
    expect(csv).toContain('Name');
    expect(csv).toContain('John');
  });
});
