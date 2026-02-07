/**
 * FlowForge Dataset Import/Export Service
 * Handles CSV, JSON, Excel import and export
 */

import type {
  Dataset,
  DatasetRecord,
  ImportOptions,
  ImportResult,
  ImportError,
  ImportWarning,
  ExportOptions,
  QueryFilter,
} from '../../types/datasets';
import { DatasetValidationService } from './validation.service';

export class ImportExportService {
  private validationService: DatasetValidationService;

  constructor() {
    this.validationService = new DatasetValidationService();
  }

  // ============================================================================
  // CSV Parsing
  // ============================================================================

  /**
   * Parse CSV content into rows
   */
  parseCSV(
    content: string,
    options: { delimiter?: string; hasHeader?: boolean } = {}
  ): { headers: string[]; rows: string[][] } {
    const delimiter = options.delimiter || ',';
    const lines = this.splitCSVLines(content);

    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    const rows = lines.map(line => this.parseCSVLine(line, delimiter));

    if (options.hasHeader !== false && rows.length > 0) {
      const headers = rows[0]!;
      return { headers, rows: rows.slice(1) };
    }

    // Generate default headers
    const maxCols = Math.max(...rows.map(r => r.length));
    const headers = Array.from({ length: maxCols }, (_, i) => `column_${i + 1}`);
    return { headers, rows };
  }

  private splitCSVLines(content: string): string[] {
    const lines: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
        if (current.trim()) {
          lines.push(current);
        }
        current = '';
        if (char === '\r') i++; // Skip \n in \r\n
      } else if (char !== '\r') {
        current += char;
      }
    }

    if (current.trim()) {
      lines.push(current);
    }

    return lines;
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Generate CSV content from records
   */
  generateCSV(
    records: DatasetRecord[],
    dataset: Dataset,
    options: { delimiter?: string; includeHeader?: boolean; columns?: string[] } = {}
  ): string {
    const delimiter = options.delimiter || ',';
    const includeHeader = options.includeHeader !== false;

    // Determine columns to export
    let columns = dataset.columns.filter(c => c.type !== 'formula');
    if (options.columns) {
      columns = columns.filter(c => options.columns!.includes(c.id) || options.columns!.includes(c.slug));
    }

    const lines: string[] = [];

    // Header row
    if (includeHeader) {
      const headerRow = columns.map(c => this.escapeCSVValue(c.name, delimiter));
      lines.push(headerRow.join(delimiter));
    }

    // Data rows
    for (const record of records) {
      const row = columns.map(col => {
        const value = record.data[col.slug];
        return this.escapeCSVValue(this.formatValue(value, col.type), delimiter);
      });
      lines.push(row.join(delimiter));
    }

    return lines.join('\n');
  }

  private escapeCSVValue(value: string, delimiter: string): string {
    if (value.includes('"') || value.includes(delimiter) || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private formatValue(value: unknown, type: string): string {
    if (value === null || value === undefined) return '';

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  // ============================================================================
  // JSON Parsing
  // ============================================================================

  /**
   * Parse JSON content into records
   */
  parseJSON(content: string): Record<string, unknown>[] {
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    // Handle wrapped format { data: [...] }
    if (parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }

    // Single object
    return [parsed];
  }

  /**
   * Generate JSON content from records
   */
  generateJSON(
    records: DatasetRecord[],
    dataset: Dataset,
    options: { columns?: string[]; pretty?: boolean } = {}
  ): string {
    let columns = dataset.columns.filter(c => c.type !== 'formula');
    if (options.columns) {
      columns = columns.filter(c => options.columns!.includes(c.id) || options.columns!.includes(c.slug));
    }

    const data = records.map(record => {
      const obj: Record<string, unknown> = { id: record.id };
      for (const col of columns) {
        obj[col.slug] = record.data[col.slug];
      }
      return obj;
    });

    return options.pretty !== false
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
  }

  // ============================================================================
  // Excel Parsing (Simple XLSX)
  // ============================================================================

  /**
   * Parse XLSX content (simplified - headers + rows)
   * In production, use a library like xlsx or exceljs
   */
  parseXLSX(buffer: Buffer): { headers: string[]; rows: unknown[][] } {
    // This is a placeholder - in production, use xlsx library
    // For now, return empty to show the structure
    throw new Error('XLSX parsing requires xlsx library. Install with: npm install xlsx');
  }

  /**
   * Generate XLSX content
   * In production, use a library like xlsx or exceljs
   */
  generateXLSX(
    records: DatasetRecord[],
    dataset: Dataset,
    options: ExportOptions = { format: 'xlsx' }
  ): Buffer {
    throw new Error('XLSX generation requires xlsx library. Install with: npm install xlsx');
  }

  // ============================================================================
  // Import Processing
  // ============================================================================

  /**
   * Process import data
   */
  async processImport(
    data: Record<string, unknown>[],
    dataset: Dataset,
    options: ImportOptions,
    existingRecords: DatasetRecord[] = []
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const recordsToInsert: Record<string, unknown>[] = [];
    const recordsToUpdate: { id: string; data: Record<string, unknown> }[] = [];

    // Build lookup map for upsert
    const existingMap = new Map<string, DatasetRecord>();
    if (options.mode === 'upsert' && options.upsertKey) {
      for (const record of existingRecords) {
        const key = String(record.data[options.upsertKey]);
        existingMap.set(key, record);
      }
    }

    for (let i = 0; i < data.length; i++) {
      const rowNum = i + 1;
      let rowData = data[i]!;

      // Apply column mapping
      if (options.columnMapping) {
        const mappedData: Record<string, unknown> = {};
        for (const [source, target] of Object.entries(options.columnMapping)) {
          if (source in rowData!) {
            mappedData[target] = rowData![source];
          }
        }
        // Keep unmapped columns if they match dataset columns
        for (const col of dataset.columns) {
          if (col.slug in rowData! && !(col.slug in mappedData)) {
            mappedData[col.slug] = rowData![col.slug];
          }
        }
        rowData = mappedData;
      }

      // Coerce types
      const coercedData = this.validationService.coerceRecord(rowData!, dataset);

      // Validate
      if (options.validateTypes !== false) {
        const validation = this.validationService.validateRecord(coercedData, dataset);
        if (!validation.valid) {
          if (options.skipInvalidRows) {
            for (const error of validation.errors) {
              errors.push({
                row: rowNum,
                column: error.column,
                value: error.value,
                message: error.message,
              });
            }
            skippedCount++;
            continue;
          } else {
            for (const error of validation.errors) {
              errors.push({
                row: rowNum,
                column: error.column,
                value: error.value,
                message: error.message,
              });
            }
          }
        }
      }

      // Handle mode
      if (options.mode === 'upsert' && options.upsertKey) {
        const keyValue = String(coercedData[options.upsertKey]);
        const existing = existingMap.get(keyValue);

        if (existing) {
          recordsToUpdate.push({ id: existing.id, data: coercedData });
          updatedCount++;
        } else {
          recordsToInsert.push(coercedData);
          insertedCount++;
        }
      } else {
        recordsToInsert.push(coercedData);
        insertedCount++;
      }
    }

    // If dry run, don't actually save
    if (options.dryRun) {
      return {
        success: errors.length === 0,
        totalRows: data.length,
        insertedCount,
        updatedCount,
        skippedCount,
        errorCount: errors.length,
        errors,
        warnings,
        dryRun: true,
        duration: Date.now() - startTime,
      };
    }

    return {
      success: errors.length === 0,
      totalRows: data.length,
      insertedCount,
      updatedCount,
      skippedCount,
      errorCount: errors.length,
      errors,
      warnings,
      dryRun: false,
      duration: Date.now() - startTime,
    };
  }

  // ============================================================================
  // Export Processing
  // ============================================================================

  /**
   * Generate export content
   */
  generateExport(
    records: DatasetRecord[],
    dataset: Dataset,
    options: ExportOptions
  ): string | Buffer {
    switch (options.format) {
      case 'csv':
        return this.generateCSV(records, dataset, {
          delimiter: options.delimiter || ',',
          includeHeader: options.includeHeader,
          columns: options.columns,
        });

      case 'tsv':
        return this.generateCSV(records, dataset, {
          delimiter: '\t',
          includeHeader: options.includeHeader,
          columns: options.columns,
        });

      case 'json':
        return this.generateJSON(records, dataset, {
          columns: options.columns,
          pretty: true,
        });

      case 'xlsx':
        return this.generateXLSX(records, dataset, options);

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Get MIME type for export format
   */
  getMimeType(format: string): string {
    switch (format) {
      case 'csv': return 'text/csv';
      case 'tsv': return 'text/tab-separated-values';
      case 'json': return 'application/json';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pdf': return 'application/pdf';
      default: return 'application/octet-stream';
    }
  }

  /**
   * Get file extension for export format
   */
  getFileExtension(format: string): string {
    return `.${format}`;
  }
}

export const importExportService = new ImportExportService();
