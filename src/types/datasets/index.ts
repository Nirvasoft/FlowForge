/**
 * FlowForge Dataset Types
 * Complete type definitions for dataset management, import/export, and relationships
 */

// ============================================================================
// Core Dataset Types
// ============================================================================

export interface Dataset {
  id: string;
  name: string;
  slug: string;
  description?: string;
  
  // Schema definition
  columns: DatasetColumn[];
  primaryKey?: string;  // Column ID that is the primary key
  
  // Metadata
  recordCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Settings
  settings: DatasetSettings;
  
  // Relationships
  relationships: DatasetRelationship[];
}

export interface DatasetSettings {
  allowDuplicates: boolean;
  enforceTypes: boolean;
  trackHistory: boolean;
  softDelete: boolean;
  maxRecords?: number;
  
  // Access control
  readRoles: string[];
  writeRoles: string[];
  deleteRoles: string[];
}

// ============================================================================
// Column Types
// ============================================================================

export type ColumnType = 
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'url'
  | 'phone'
  | 'currency'
  | 'percent'
  | 'json'
  | 'array'
  | 'reference'  // Foreign key to another dataset
  | 'formula'    // Calculated from expression
  | 'attachment';

export interface DatasetColumn {
  id: string;
  name: string;
  slug: string;
  type: ColumnType;
  
  // Validation
  required: boolean;
  unique: boolean;
  
  // Type-specific settings
  settings: ColumnSettings;
  
  // Display
  displayOrder: number;
  width?: number;
  hidden: boolean;
  
  // Default value
  defaultValue?: unknown;
  
  // For formula columns
  formula?: string;
  
  // For reference columns
  referenceDatasetId?: string;
  referenceColumnId?: string;
  referenceDisplayColumnId?: string;
}

export interface ColumnSettings {
  // Text
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  
  // Number
  min?: number;
  max?: number;
  precision?: number;
  
  // Currency
  currencyCode?: string;
  
  // Date
  dateFormat?: string;
  minDate?: string;
  maxDate?: string;
  
  // Array
  itemType?: ColumnType;
  maxItems?: number;
  
  // Reference
  allowMultiple?: boolean;
  cascadeDelete?: boolean;
  
  // Attachment
  allowedExtensions?: string[];
  maxFileSize?: number;
}

// ============================================================================
// Record Types
// ============================================================================

export interface DatasetRecord {
  id: string;
  datasetId: string;
  data: Record<string, unknown>;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  
  // Soft delete
  deletedAt?: Date;
  deletedBy?: string;
}

export interface RecordHistory {
  id: string;
  recordId: string;
  datasetId: string;
  action: 'create' | 'update' | 'delete' | 'restore';
  changes: RecordChange[];
  timestamp: Date;
  userId: string;
}

export interface RecordChange {
  columnId: string;
  oldValue: unknown;
  newValue: unknown;
}

// ============================================================================
// Relationship Types
// ============================================================================

export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-many';

export interface DatasetRelationship {
  id: string;
  name: string;
  type: RelationshipType;
  
  // Source (this dataset)
  sourceDatasetId: string;
  sourceColumnId: string;
  
  // Target
  targetDatasetId: string;
  targetColumnId: string;
  
  // Behavior
  onDelete: 'cascade' | 'set-null' | 'restrict' | 'no-action';
  onUpdate: 'cascade' | 'set-null' | 'restrict' | 'no-action';
}

// ============================================================================
// Query Types
// ============================================================================

export interface DatasetQuery {
  // Filtering
  filter?: QueryFilter;
  
  // Sorting
  sort?: QuerySort[];
  
  // Pagination
  page?: number;
  pageSize?: number;
  
  // Field selection
  select?: string[];
  
  // Related data
  include?: string[];  // Relationship names to include
  
  // Search
  search?: string;
  searchColumns?: string[];
}

export interface QueryFilter {
  logic: 'and' | 'or';
  conditions: QueryCondition[];
}

export interface QueryCondition {
  column: string;
  operator: QueryOperator;
  value: unknown;
}

export type QueryOperator = 
  | 'eq'        // equals
  | 'neq'       // not equals
  | 'gt'        // greater than
  | 'gte'       // greater than or equal
  | 'lt'        // less than
  | 'lte'       // less than or equal
  | 'contains'  // string contains
  | 'starts'    // starts with
  | 'ends'      // ends with
  | 'in'        // in array
  | 'nin'       // not in array
  | 'null'      // is null
  | 'notnull'   // is not null
  | 'between'   // between two values
  | 'regex';    // regex match

export interface QuerySort {
  column: string;
  direction: 'asc' | 'desc';
}

export interface QueryResult<T = DatasetRecord> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================================================
// Import/Export Types
// ============================================================================

export type ImportFormat = 'csv' | 'json' | 'xlsx' | 'tsv';
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'tsv' | 'pdf';

export interface ImportOptions {
  format: ImportFormat;
  
  // CSV/TSV options
  delimiter?: string;
  hasHeader?: boolean;
  encoding?: string;
  
  // Column mapping
  columnMapping?: Record<string, string>;  // source column -> dataset column
  
  // Behavior
  mode: 'insert' | 'upsert' | 'replace';
  upsertKey?: string;  // Column to match on for upsert
  skipInvalidRows?: boolean;
  dryRun?: boolean;
  
  // Validation
  validateTypes?: boolean;
  validateRequired?: boolean;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  dryRun: boolean;
  duration: number;
}

export interface ImportError {
  row: number;
  column?: string;
  value?: unknown;
  message: string;
}

export interface ImportWarning {
  row: number;
  column?: string;
  message: string;
}

export interface ExportOptions {
  format: ExportFormat;
  
  // Column selection
  columns?: string[];  // Column IDs to export
  
  // Filtering
  filter?: QueryFilter;
  
  // CSV/TSV options
  delimiter?: string;
  includeHeader?: boolean;
  
  // Excel options
  sheetName?: string;
  
  // Date formatting
  dateFormat?: string;
  timezone?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  column: string;
  message: string;
  value?: unknown;
  constraint?: string;
}

// ============================================================================
// Aggregation Types
// ============================================================================

export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';

export interface AggregateQuery {
  groupBy?: string[];
  aggregates: AggregateSpec[];
  filter?: QueryFilter;
  having?: QueryFilter;
  sort?: QuerySort[];
  limit?: number;
}

export interface AggregateSpec {
  column: string;
  function: AggregateFunction;
  alias?: string;
}

export interface AggregateResult {
  data: Record<string, unknown>[];
  total: number;
}

// ============================================================================
// Bulk Operation Types
// ============================================================================

export interface BulkOperation {
  type: 'insert' | 'update' | 'delete';
  records: Array<{
    id?: string;  // Required for update/delete
    data?: Record<string, unknown>;  // Required for insert/update
  }>;
}

export interface BulkResult {
  success: boolean;
  totalOperations: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    index: number;
    message: string;
  }>;
}

// ============================================================================
// Dataset Events
// ============================================================================

export type DatasetEventType = 
  | 'record.created'
  | 'record.updated'
  | 'record.deleted'
  | 'record.restored'
  | 'dataset.created'
  | 'dataset.updated'
  | 'dataset.deleted'
  | 'import.completed'
  | 'export.completed';

export interface DatasetEvent {
  type: DatasetEventType;
  datasetId: string;
  recordId?: string;
  userId: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}
