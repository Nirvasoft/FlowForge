/**
 * FlowForge Dataset Service
 * Main service for dataset CRUD, querying, and record management
 */

import { randomUUID } from 'crypto';
import type {
  Dataset,
  DatasetColumn,
  DatasetRecord,
  DatasetSettings,
  DatasetRelationship,
  DatasetQuery,
  QueryResult,
  QueryFilter,
  QueryCondition,
  AggregateQuery,
  AggregateResult,
  BulkOperation,
  BulkResult,
  RecordHistory,
  ImportOptions,
  ImportResult,
  ExportOptions,
  ValidationResult,
} from '../../types/datasets';
import { DatasetValidationService, datasetValidationService } from './validation.service';
import { ImportExportService, importExportService } from './import-export.service';

// ============================================================================
// In-Memory Storage (Replace with Prisma in production)
// ============================================================================

const datasets = new Map<string, Dataset>();
const records = new Map<string, Map<string, DatasetRecord>>(); // datasetId -> recordId -> record
const history = new Map<string, RecordHistory[]>(); // datasetId -> history entries

// ============================================================================
// Dataset Service
// ============================================================================

export class DatasetService {
  private validationService: DatasetValidationService;
  private importExportService: ImportExportService;

  constructor() {
    this.validationService = datasetValidationService;
    this.importExportService = importExportService;
  }

  // ============================================================================
  // Dataset CRUD
  // ============================================================================

  /**
   * Create a new dataset
   */
  async createDataset(input: {
    name: string;
    description?: string;
    columns: Omit<DatasetColumn, 'id' | 'displayOrder'>[];
    settings?: Partial<DatasetSettings>;
    createdBy: string;
  }): Promise<Dataset> {
    const id = randomUUID();
    const slug = this.generateSlug(input.name);

    const columns: DatasetColumn[] = input.columns.map((col, index) => ({
      ...col,
      id: randomUUID(),
      slug: col.slug || this.generateSlug(col.name),
      displayOrder: index,
      hidden: col.hidden ?? false,
      required: col.required ?? false,
      unique: col.unique ?? false,
      settings: col.settings || {},
    }));

    const dataset: Dataset = {
      id,
      name: input.name,
      slug,
      description: input.description,
      columns,
      recordCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.createdBy,
      settings: {
        allowDuplicates: true,
        enforceTypes: true,
        trackHistory: true,
        softDelete: true,
        readRoles: [],
        writeRoles: [],
        deleteRoles: [],
        ...input.settings,
      },
      relationships: [],
    };

    datasets.set(id, dataset);
    records.set(id, new Map());
    history.set(id, []);

    return dataset;
  }

  /**
   * Get a dataset by ID
   */
  async getDataset(id: string): Promise<Dataset | null> {
    return datasets.get(id) || null;
  }

  /**
   * Get a dataset by slug
   */
  async getDatasetBySlug(slug: string): Promise<Dataset | null> {
    for (const dataset of datasets.values()) {
      if (dataset.slug === slug) return dataset;
    }
    return null;
  }

  /**
   * List all datasets
   */
  async listDatasets(options: {
    page?: number;
    pageSize?: number;
    search?: string;
  } = {}): Promise<QueryResult<Dataset>> {
    const { page = 1, pageSize = 20, search } = options;

    let items = Array.from(datasets.values());

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(d =>
        d.name.toLowerCase().includes(searchLower) ||
        d.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by name
    items.sort((a, b) => a.name.localeCompare(b.name));

    // Paginate
    const total = items.length;
    const start = (page - 1) * pageSize;
    const data = items.slice(start, start + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: start + pageSize < total,
    };
  }

  /**
   * Update a dataset
   */
  async updateDataset(
    id: string,
    input: {
      name?: string;
      description?: string;
      settings?: Partial<DatasetSettings>;
    }
  ): Promise<Dataset | null> {
    const dataset = datasets.get(id);
    if (!dataset) return null;

    if (input.name) {
      dataset.name = input.name;
      dataset.slug = this.generateSlug(input.name);
    }
    if (input.description !== undefined) {
      dataset.description = input.description;
    }
    if (input.settings) {
      dataset.settings = { ...dataset.settings, ...input.settings };
    }

    dataset.updatedAt = new Date();
    datasets.set(id, dataset);

    return dataset;
  }

  /**
   * Delete a dataset
   */
  async deleteDataset(id: string): Promise<boolean> {
    if (!datasets.has(id)) return false;

    datasets.delete(id);
    records.delete(id);
    history.delete(id);

    return true;
  }

  // ============================================================================
  // Column Management
  // ============================================================================

  /**
   * Add a column to a dataset
   */
  async addColumn(
    datasetId: string,
    column: Omit<DatasetColumn, 'id' | 'displayOrder'>
  ): Promise<DatasetColumn | null> {
    const dataset = datasets.get(datasetId);
    if (!dataset) return null;

    const newColumn: DatasetColumn = {
      ...column,
      id: randomUUID(),
      slug: column.slug || this.generateSlug(column.name),
      displayOrder: dataset.columns.length,
      hidden: column.hidden ?? false,
      required: column.required ?? false,
      unique: column.unique ?? false,
      settings: column.settings || {},
    };

    dataset.columns.push(newColumn);
    dataset.updatedAt = new Date();
    datasets.set(datasetId, dataset);

    return newColumn;
  }

  /**
   * Update a column
   */
  async updateColumn(
    datasetId: string,
    columnId: string,
    input: Partial<Omit<DatasetColumn, 'id'>>
  ): Promise<DatasetColumn | null> {
    const dataset = datasets.get(datasetId);
    if (!dataset) return null;

    const columnIndex = dataset.columns.findIndex(c => c.id === columnId);
    if (columnIndex === -1) return null;

    const column = dataset.columns[columnIndex]!;
    Object.assign(column, input);

    if (input.name && !input.slug) {
      column.slug = this.generateSlug(input.name);
    }

    dataset.updatedAt = new Date();
    datasets.set(datasetId, dataset);

    return column;
  }

  /**
   * Delete a column
   */
  async deleteColumn(datasetId: string, columnId: string): Promise<boolean> {
    const dataset = datasets.get(datasetId);
    if (!dataset) return false;

    const columnIndex = dataset.columns.findIndex(c => c.id === columnId);
    if (columnIndex === -1) return false;

    const column = dataset.columns[columnIndex]!;
    dataset.columns.splice(columnIndex, 1);

    // Remove column data from all records
    const datasetRecords = records.get(datasetId);
    if (datasetRecords) {
      for (const record of datasetRecords.values()) {
        delete record.data[column.slug];
      }
    }

    dataset.updatedAt = new Date();
    datasets.set(datasetId, dataset);

    return true;
  }

  /**
   * Reorder columns
   */
  async reorderColumns(datasetId: string, columnIds: string[]): Promise<boolean> {
    const dataset = datasets.get(datasetId);
    if (!dataset) return false;

    const columnMap = new Map(dataset.columns.map(c => [c.id, c]));

    dataset.columns = columnIds.map((id, index) => {
      const column = columnMap.get(id);
      if (column) {
        column.displayOrder = index;
        return column;
      }
      return null;
    }).filter(Boolean) as DatasetColumn[];

    dataset.updatedAt = new Date();
    datasets.set(datasetId, dataset);

    return true;
  }

  // ============================================================================
  // Record CRUD
  // ============================================================================

  /**
   * Create a record
   */
  async createRecord(
    datasetId: string,
    data: Record<string, unknown>,
    userId: string
  ): Promise<{ record?: DatasetRecord; validation: ValidationResult }> {
    const dataset = datasets.get(datasetId);
    if (!dataset) {
      return { validation: { valid: false, errors: [{ column: '', message: 'Dataset not found' }] } };
    }

    // Coerce and validate
    const coercedData = this.validationService.coerceRecord(data, dataset);
    const validation = this.validationService.validateRecord(coercedData, dataset);

    if (!validation.valid) {
      return { validation };
    }

    const record: DatasetRecord = {
      id: randomUUID(),
      datasetId,
      data: coercedData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
    };

    const datasetRecords = records.get(datasetId)!;
    datasetRecords.set(record.id, record);

    // Update record count
    dataset.recordCount++;
    datasets.set(datasetId, dataset);

    // Track history
    if (dataset.settings.trackHistory) {
      this.addHistory(datasetId, record.id, 'create', [], userId);
    }

    return { record, validation };
  }

  /**
   * Get a record by ID
   */
  async getRecord(datasetId: string, recordId: string): Promise<DatasetRecord | null> {
    const datasetRecords = records.get(datasetId);
    if (!datasetRecords) return null;

    const record = datasetRecords.get(recordId);
    if (!record || record.deletedAt) return null;

    return record;
  }

  /**
   * Update a record
   */
  async updateRecord(
    datasetId: string,
    recordId: string,
    data: Record<string, unknown>,
    userId: string
  ): Promise<{ record?: DatasetRecord; validation: ValidationResult }> {
    const dataset = datasets.get(datasetId);
    if (!dataset) {
      return { validation: { valid: false, errors: [{ column: '', message: 'Dataset not found' }] } };
    }

    const datasetRecords = records.get(datasetId);
    const existingRecord = datasetRecords?.get(recordId);
    if (!existingRecord || existingRecord.deletedAt) {
      return { validation: { valid: false, errors: [{ column: '', message: 'Record not found' }] } };
    }

    // Merge with existing data
    const mergedData = { ...existingRecord.data, ...data };
    const coercedData = this.validationService.coerceRecord(mergedData, dataset);
    const validation = this.validationService.validateRecord(coercedData, dataset, { partial: true });

    if (!validation.valid) {
      return { validation };
    }

    // Track changes for history
    const changes = this.getChanges(existingRecord.data, coercedData, dataset);

    existingRecord.data = coercedData;
    existingRecord.updatedAt = new Date();
    existingRecord.updatedBy = userId;

    datasetRecords!.set(recordId, existingRecord);

    // Track history
    if (dataset.settings.trackHistory && changes.length > 0) {
      this.addHistory(datasetId, recordId, 'update', changes, userId);
    }

    return { record: existingRecord, validation };
  }

  /**
   * Delete a record
   */
  async deleteRecord(
    datasetId: string,
    recordId: string,
    userId: string,
    hard: boolean = false
  ): Promise<boolean> {
    const dataset = datasets.get(datasetId);
    if (!dataset) return false;

    const datasetRecords = records.get(datasetId);
    const record = datasetRecords?.get(recordId);
    if (!record) return false;

    if (hard || !dataset.settings.softDelete) {
      datasetRecords!.delete(recordId);
    } else {
      record.deletedAt = new Date();
      record.deletedBy = userId;
      datasetRecords!.set(recordId, record);
    }

    dataset.recordCount--;
    datasets.set(datasetId, dataset);

    // Track history
    if (dataset.settings.trackHistory) {
      this.addHistory(datasetId, recordId, 'delete', [], userId);
    }

    return true;
  }

  /**
   * Restore a soft-deleted record
   */
  async restoreRecord(datasetId: string, recordId: string, userId: string): Promise<boolean> {
    const dataset = datasets.get(datasetId);
    if (!dataset) return false;

    const datasetRecords = records.get(datasetId);
    const record = datasetRecords?.get(recordId);
    if (!record || !record.deletedAt) return false;

    delete record.deletedAt;
    delete record.deletedBy;
    record.updatedAt = new Date();
    record.updatedBy = userId;

    datasetRecords!.set(recordId, record);

    dataset.recordCount++;
    datasets.set(datasetId, dataset);

    // Track history
    if (dataset.settings.trackHistory) {
      this.addHistory(datasetId, recordId, 'restore', [], userId);
    }

    return true;
  }

  // ============================================================================
  // Query Records
  // ============================================================================

  /**
   * Query records with filtering, sorting, and pagination
   */
  async queryRecords(datasetId: string, query: DatasetQuery = {}): Promise<QueryResult<DatasetRecord>> {
    const dataset = datasets.get(datasetId);
    if (!dataset) {
      return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
    }

    const datasetRecords = records.get(datasetId);
    if (!datasetRecords) {
      return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false };
    }

    let items = Array.from(datasetRecords.values()).filter(r => !r.deletedAt);

    // Apply text search
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      const searchCols = query.searchColumns || dataset.columns.map(c => c.slug);

      items = items.filter(record => {
        for (const col of searchCols) {
          const value = record.data[col];
          if (value && String(value).toLowerCase().includes(searchLower)) {
            return true;
          }
        }
        return false;
      });
    }

    // Apply filter
    if (query.filter) {
      items = items.filter(record => this.matchesFilter(record.data, query.filter!));
    }

    // Apply sort
    if (query.sort && query.sort.length > 0) {
      items.sort((a, b) => {
        for (const sort of query.sort!) {
          const aVal = a.data[sort.column];
          const bVal = b.data[sort.column];
          const cmp = this.compareValues(aVal, bVal);
          if (cmp !== 0) {
            return sort.direction === 'desc' ? -cmp : cmp;
          }
        }
        return 0;
      });
    }

    // Paginate
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const total = items.length;
    const start = (page - 1) * pageSize;
    const data = items.slice(start, start + pageSize);

    // Select specific fields
    if (query.select && query.select.length > 0) {
      for (const record of data) {
        const filtered: Record<string, unknown> = {};
        for (const col of query.select) {
          filtered[col] = record.data[col];
        }
        record.data = filtered;
      }
    }

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: start + pageSize < total,
    };
  }

  /**
   * Aggregate records
   */
  async aggregateRecords(datasetId: string, query: AggregateQuery): Promise<AggregateResult> {
    const dataset = datasets.get(datasetId);
    if (!dataset) {
      return { data: [], total: 0 };
    }

    const datasetRecords = records.get(datasetId);
    if (!datasetRecords) {
      return { data: [], total: 0 };
    }

    let items = Array.from(datasetRecords.values()).filter(r => !r.deletedAt);

    // Apply filter
    if (query.filter) {
      items = items.filter(record => this.matchesFilter(record.data, query.filter!));
    }

    // Group by
    const groups = new Map<string, DatasetRecord[]>();

    if (query.groupBy && query.groupBy.length > 0) {
      for (const record of items) {
        const key = query.groupBy.map(col => String(record.data[col] ?? 'null')).join('|');
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(record);
      }
    } else {
      groups.set('__all__', items);
    }

    // Calculate aggregates
    const results: Record<string, unknown>[] = [];

    for (const [key, groupRecords] of groups) {
      const row: Record<string, unknown> = {};

      // Add group by values
      if (query.groupBy) {
        const keyParts = key.split('|');
        for (let i = 0; i < query.groupBy.length; i++) {
          row[query.groupBy[i]!] = keyParts[i] === 'null' ? null : keyParts[i];
        }
      }

      // Calculate aggregates
      for (const agg of query.aggregates) {
        const alias = agg.alias || `${agg.function}_${agg.column}`;
        row[alias] = this.calculateAggregate(groupRecords, agg.column, agg.function);
      }

      results.push(row);
    }

    // Apply having filter
    let filteredResults = results;
    if (query.having) {
      filteredResults = results.filter(row => this.matchesFilter(row, query.having!));
    }

    // Apply sort
    if (query.sort && query.sort.length > 0) {
      filteredResults.sort((a, b) => {
        for (const sort of query.sort!) {
          const cmp = this.compareValues(a[sort.column], b[sort.column]);
          if (cmp !== 0) {
            return sort.direction === 'desc' ? -cmp : cmp;
          }
        }
        return 0;
      });
    }

    // Apply limit
    if (query.limit) {
      filteredResults = filteredResults.slice(0, query.limit);
    }

    return {
      data: filteredResults,
      total: filteredResults.length,
    };
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Perform bulk operations
   */
  async bulkOperation(
    datasetId: string,
    operation: BulkOperation,
    userId: string
  ): Promise<BulkResult> {
    const dataset = datasets.get(datasetId);
    if (!dataset) {
      return {
        success: false,
        totalOperations: 0,
        successCount: 0,
        errorCount: 1,
        errors: [{ index: -1, message: 'Dataset not found' }],
      };
    }

    const errors: Array<{ index: number; message: string }> = [];
    let successCount = 0;

    for (let i = 0; i < operation.records.length; i++) {
      const record = operation.records[i]!

      try {
        switch (operation.type) {
          case 'insert':
            if (!record!.data) {
              errors.push({ index: i, message: 'Data is required for insert' });
              continue;
            }
            const insertResult = await this.createRecord(datasetId, record.data, userId);
            if (!insertResult.validation.valid) {
              errors.push({ index: i, message: insertResult.validation.errors[0]?.message || 'Validation failed' });
              continue;
            }
            break;

          case 'update':
            if (!record!.id || !record!.data) {
              errors.push({ index: i, message: 'ID and data are required for update' });
              continue;
            }
            const updateResult = await this.updateRecord(datasetId, record!.id, record!.data, userId);
            if (!updateResult.validation.valid) {
              errors.push({ index: i, message: updateResult.validation.errors[0]?.message || 'Validation failed' });
              continue;
            }
            break;

          case 'delete':
            if (!record!.id) {
              errors.push({ index: i, message: 'ID is required for delete' });
              continue;
            }
            const deleted = await this.deleteRecord(datasetId, record!.id, userId);
            if (!deleted) {
              errors.push({ index: i, message: 'Record not found' });
              continue;
            }
            break;
        }

        successCount++;
      } catch (error) {
        errors.push({ index: i, message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return {
      success: errors.length === 0,
      totalOperations: operation.records.length,
      successCount,
      errorCount: errors.length,
      errors,
    };
  }

  // ============================================================================
  // Import/Export
  // ============================================================================

  /**
   * Import data from CSV/JSON
   */
  async importData(
    datasetId: string,
    content: string,
    options: ImportOptions,
    userId: string
  ): Promise<ImportResult> {
    const dataset = datasets.get(datasetId);
    if (!dataset) {
      return {
        success: false,
        totalRows: 0,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        errors: [{ row: 0, message: 'Dataset not found' }],
        warnings: [],
        dryRun: false,
        duration: 0,
      };
    }

    let data: Record<string, unknown>[];

    try {
      switch (options.format) {
        case 'csv':
        case 'tsv':
          const { headers, rows } = this.importExportService.parseCSV(content, {
            delimiter: options.format === 'tsv' ? '\t' : options.delimiter,
            hasHeader: options.hasHeader,
          });
          data = rows.map(row => {
            const obj: Record<string, unknown> = {};
            headers.forEach((header, i) => {
              obj[header] = row[i];
            });
            return obj;
          });
          break;

        case 'json':
          data = this.importExportService.parseJSON(content);
          break;

        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }
    } catch (error) {
      return {
        success: false,
        totalRows: 0,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        errors: [{ row: 0, message: `Parse error: ${error instanceof Error ? error.message : 'Unknown'}` }],
        warnings: [],
        dryRun: false,
        duration: 0,
      };
    }

    const existingRecords = Array.from(records.get(datasetId)?.values() || []);
    const result = await this.importExportService.processImport(data, dataset, options, existingRecords);

    // If not dry run, actually insert/update records
    if (!options.dryRun && result.success) {
      // Re-process and save (simplified)
      for (const row of data) {
        await this.createRecord(datasetId, row, userId);
      }
    }

    return result;
  }

  /**
   * Export data to CSV/JSON
   */
  async exportData(
    datasetId: string,
    options: ExportOptions
  ): Promise<{ content: string | Buffer; mimeType: string; filename: string }> {
    const dataset = datasets.get(datasetId);
    if (!dataset) {
      throw new Error('Dataset not found');
    }

    // Get records with optional filter
    const queryResult = await this.queryRecords(datasetId, {
      filter: options.filter,
      pageSize: 100000, // Export all
    });

    const content = this.importExportService.generateExport(queryResult.data, dataset, options);
    const mimeType = this.importExportService.getMimeType(options.format);
    const extension = this.importExportService.getFileExtension(options.format);
    const filename = `${dataset.slug}_export_${Date.now()}${extension}`;

    return { content, mimeType, filename };
  }

  // ============================================================================
  // Relationship Management
  // ============================================================================

  /**
   * Add a relationship between datasets
   */
  async addRelationship(
    datasetId: string,
    relationship: Omit<DatasetRelationship, 'id'>
  ): Promise<DatasetRelationship | null> {
    const dataset = datasets.get(datasetId);
    if (!dataset) return null;

    const newRelationship: DatasetRelationship = {
      ...relationship,
      id: randomUUID(),
    };

    dataset.relationships.push(newRelationship);
    dataset.updatedAt = new Date();
    datasets.set(datasetId, dataset);

    return newRelationship;
  }

  /**
   * Remove a relationship
   */
  async removeRelationship(datasetId: string, relationshipId: string): Promise<boolean> {
    const dataset = datasets.get(datasetId);
    if (!dataset) return false;

    const index = dataset.relationships.findIndex(r => r.id === relationshipId);
    if (index === -1) return false;

    dataset.relationships.splice(index, 1);
    dataset.updatedAt = new Date();
    datasets.set(datasetId, dataset);

    return true;
  }

  // ============================================================================
  // History
  // ============================================================================

  /**
   * Get record history
   */
  async getRecordHistory(datasetId: string, recordId: string): Promise<RecordHistory[]> {
    const datasetHistory = history.get(datasetId) || [];
    return datasetHistory.filter(h => h.recordId === recordId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private matchesFilter(data: Record<string, unknown>, filter: QueryFilter): boolean {
    const results = filter.conditions.map(cond => this.matchesCondition(data, cond));

    if (filter.logic === 'and') {
      return results.every(Boolean);
    } else {
      return results.some(Boolean);
    }
  }

  private matchesCondition(data: Record<string, unknown>, condition: QueryCondition): boolean {
    const value = data[condition.column];
    const target = condition.value;

    switch (condition.operator) {
      case 'eq': return value === target;
      case 'neq': return value !== target;
      case 'gt': return Number(value) > Number(target);
      case 'gte': return Number(value) >= Number(target);
      case 'lt': return Number(value) < Number(target);
      case 'lte': return Number(value) <= Number(target);
      case 'contains': return String(value).toLowerCase().includes(String(target).toLowerCase());
      case 'starts': return String(value).toLowerCase().startsWith(String(target).toLowerCase());
      case 'ends': return String(value).toLowerCase().endsWith(String(target).toLowerCase());
      case 'in': return Array.isArray(target) && target.includes(value);
      case 'nin': return Array.isArray(target) && !target.includes(value);
      case 'null': return value === null || value === undefined;
      case 'notnull': return value !== null && value !== undefined;
      case 'between':
        if (Array.isArray(target) && target.length === 2) {
          const num = Number(value);
          return num >= Number(target[0]) && num <= Number(target[1]);
        }
        return false;
      case 'regex':
        try {
          return new RegExp(String(target)).test(String(value));
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private compareValues(a: unknown, b: unknown): number {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;

    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    return String(a).localeCompare(String(b));
  }

  private calculateAggregate(
    records: DatasetRecord[],
    column: string,
    fn: string
  ): unknown {
    const values = records.map(r => r.data[column]).filter(v => v !== null && v !== undefined);

    switch (fn) {
      case 'count':
        return values.length;
      case 'sum':
        return values.reduce((sum: number, v) => sum + Number(v), 0);
      case 'avg':
        if (values.length === 0) return null;
        return values.reduce((sum: number, v) => sum + Number(v), 0) / values.length;
      case 'min':
        return values.length ? Math.min(...values.map(Number)) : null;
      case 'max':
        return values.length ? Math.max(...values.map(Number)) : null;
      case 'distinct':
        return new Set(values).size;
      default:
        return null;
    }
  }

  private getChanges(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    dataset: Dataset
  ): Array<{ columnId: string; oldValue: unknown; newValue: unknown }> {
    const changes: Array<{ columnId: string; oldValue: unknown; newValue: unknown }> = [];

    for (const column of dataset.columns) {
      const oldVal = oldData[column.slug];
      const newVal = newData[column.slug];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          columnId: column.id,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }

    return changes;
  }

  private addHistory(
    datasetId: string,
    recordId: string,
    action: RecordHistory['action'],
    changes: Array<{ columnId: string; oldValue: unknown; newValue: unknown }>,
    userId: string
  ): void {
    const datasetHistory = history.get(datasetId) || [];

    datasetHistory.push({
      id: randomUUID(),
      recordId,
      datasetId,
      action,
      changes,
      timestamp: new Date(),
      userId,
    });

    history.set(datasetId, datasetHistory);
  }
}

export const datasetService = new DatasetService();
