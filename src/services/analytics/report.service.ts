/**
 * FlowForge Report Service
 * Report generation, scheduling, and export
 */

import { randomUUID } from 'crypto';
import type {
  Report,
  ReportDataSource,
  ReportLayout,
  ReportSection,
  ReportSchedule,
  ExportFormat,
  AnalyticsQuery,
} from '../../types/analytics';
import { queryExecutor } from './query-builder';

// ============================================================================
// In-Memory Storage
// ============================================================================

const reports = new Map<string, Report>();
const reportRuns = new Map<string, ReportRun[]>();

export interface ReportRun {
  id: string;
  reportId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  format: ExportFormat;
  startedAt: Date;
  completedAt?: Date;
  fileUrl?: string;
  error?: string;
  triggeredBy: 'manual' | 'schedule';
  userId?: string;
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_LAYOUT: ReportLayout = {
  pageSize: 'A4',
  orientation: 'portrait',
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  header: {
    show: true,
    height: 50,
    content: '',
    showLogo: true,
    showDate: true,
    showPageNumber: false,
  },
  footer: {
    show: true,
    height: 30,
    content: '',
    showPageNumber: true,
  },
};

// ============================================================================
// Report Service
// ============================================================================

export class ReportService {

  // ============================================================================
  // Report CRUD
  // ============================================================================

  async createReport(input: {
    name: string;
    description?: string;
    type: Report['type'];
    createdBy: string;
  }): Promise<Report> {
    const id = randomUUID();
    const now = new Date();

    const report: Report = {
      id,
      name: input.name,
      description: input.description,
      type: input.type,
      dataSource: { type: 'query', queries: {} },
      layout: { ...DEFAULT_LAYOUT },
      sections: [],
      exportFormats: ['pdf', 'excel'],
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    reports.set(id, report);
    reportRuns.set(id, []);
    return report;
  }

  async getReport(id: string): Promise<Report | null> {
    return reports.get(id) || null;
  }

  async listReports(options: {
    type?: Report['type'];
    createdBy?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ reports: Report[]; total: number }> {
    let items = Array.from(reports.values());

    if (options.type) {
      items = items.filter(r => r.type === options.type);
    }
    if (options.createdBy) {
      items = items.filter(r => r.createdBy === options.createdBy);
    }
    if (options.search) {
      const search = options.search.toLowerCase();
      items = items.filter(r =>
        r.name.toLowerCase().includes(search) ||
        r.description?.toLowerCase().includes(search)
      );
    }

    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const start = (page - 1) * pageSize;

    return {
      reports: items.slice(start, start + pageSize),
      total: items.length,
    };
  }

  async updateReport(
    id: string,
    input: Partial<Pick<Report, 'name' | 'description' | 'type' | 'layout' | 'exportFormats'>>
  ): Promise<Report | null> {
    const report = reports.get(id);
    if (!report) return null;

    Object.assign(report, input);
    report.updatedAt = new Date();
    reports.set(id, report);
    return report;
  }

  async deleteReport(id: string): Promise<boolean> {
    reportRuns.delete(id);
    return reports.delete(id);
  }

  // ============================================================================
  // Data Source Management
  // ============================================================================

  async setDataSource(id: string, dataSource: ReportDataSource): Promise<Report | null> {
    const report = reports.get(id);
    if (!report) return null;

    report.dataSource = dataSource;
    report.updatedAt = new Date();
    reports.set(id, report);
    return report;
  }

  async addQuery(id: string, key: string, query: AnalyticsQuery): Promise<Report | null> {
    const report = reports.get(id);
    if (!report) return null;

    if (!report.dataSource.queries) {
      report.dataSource.queries = {};
    }
    report.dataSource.queries[key] = query;
    report.updatedAt = new Date();
    reports.set(id, report);
    return report;
  }

  async removeQuery(id: string, key: string): Promise<Report | null> {
    const report = reports.get(id);
    if (!report || !report.dataSource.queries) return null;

    delete report.dataSource.queries[key];
    report.updatedAt = new Date();
    reports.set(id, report);
    return report;
  }

  // ============================================================================
  // Section Management
  // ============================================================================

  async addSection(id: string, section: Omit<ReportSection, 'id'>): Promise<ReportSection | null> {
    const report = reports.get(id);
    if (!report) return null;

    const newSection: ReportSection = {
      ...section,
      id: randomUUID(),
    };

    report.sections.push(newSection);
    report.updatedAt = new Date();
    reports.set(id, report);
    return newSection;
  }

  async updateSection(
    id: string,
    sectionId: string,
    updates: Partial<Omit<ReportSection, 'id'>>
  ): Promise<ReportSection | null> {
    const report = reports.get(id);
    if (!report) return null;

    const section = report.sections.find(s => s.id === sectionId);
    if (!section) return null;

    Object.assign(section, updates);
    report.updatedAt = new Date();
    reports.set(id, report);
    return section;
  }

  async deleteSection(id: string, sectionId: string): Promise<boolean> {
    const report = reports.get(id);
    if (!report) return false;

    const index = report.sections.findIndex(s => s.id === sectionId);
    if (index === -1) return false;

    report.sections.splice(index, 1);
    report.updatedAt = new Date();
    reports.set(id, report);
    return true;
  }

  async reorderSections(id: string, sectionIds: string[]): Promise<boolean> {
    const report = reports.get(id);
    if (!report) return false;

    const sectionMap = new Map(report.sections.map(s => [s.id, s]));
    report.sections = sectionIds.map(sid => sectionMap.get(sid)).filter(Boolean) as ReportSection[];
    report.updatedAt = new Date();
    reports.set(id, report);
    return true;
  }

  // ============================================================================
  // Scheduling
  // ============================================================================

  async setSchedule(id: string, schedule: Omit<ReportSchedule, 'lastRun' | 'nextRun'>): Promise<Report | null> {
    const report = reports.get(id);
    if (!report) return null;

    const nextRun = this.calculateNextRun(schedule);

    report.schedule = {
      ...schedule,
      nextRun,
    };
    report.updatedAt = new Date();
    reports.set(id, report);
    return report;
  }

  async disableSchedule(id: string): Promise<Report | null> {
    const report = reports.get(id);
    if (!report || !report.schedule) return null;

    report.schedule.enabled = false;
    report.updatedAt = new Date();
    reports.set(id, report);
    return report;
  }

  async getScheduledReports(): Promise<Report[]> {
    const now = new Date();
    return Array.from(reports.values()).filter(
      r => r.schedule?.enabled && r.schedule.nextRun && r.schedule.nextRun <= now
    );
  }

  private calculateNextRun(schedule: Omit<ReportSchedule, 'lastRun' | 'nextRun'>): Date {
    const now = new Date();

    switch (schedule.frequency) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        now.setHours(8, 0, 0, 0);
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        now.setHours(8, 0, 0, 0);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        now.setDate(1);
        now.setHours(8, 0, 0, 0);
        break;
      default:
        now.setDate(now.getDate() + 1);
    }

    return now;
  }

  // ============================================================================
  // Report Generation
  // ============================================================================

  async generateReport(
    id: string,
    format: ExportFormat,
    options: {
      filters?: Record<string, unknown>;
      userId?: string;
    } = {}
  ): Promise<ReportRun> {
    const report = reports.get(id);
    if (!report) throw new Error('Report not found');

    const run: ReportRun = {
      id: randomUUID(),
      reportId: id,
      status: 'running',
      format,
      startedAt: new Date(),
      triggeredBy: options.userId ? 'manual' : 'schedule',
      userId: options.userId,
    };

    const runs = reportRuns.get(id) || [];
    runs.push(run);
    reportRuns.set(id, runs);

    try {
      // Execute all queries
      const data: Record<string, unknown[]> = {};
      if (report.dataSource.queries) {
        for (const [key, query] of Object.entries(report.dataSource.queries)) {
          data[key] = await queryExecutor.execute(query);
        }
      }

      // Generate output based on format
      const output = await this.renderReport(report, data, format);

      run.status = 'completed';
      run.completedAt = new Date();
      run.fileUrl = output.url;

    } catch (error) {
      run.status = 'failed';
      run.completedAt = new Date();
      run.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return run;
  }

  private async renderReport(
    report: Report,
    data: Record<string, unknown[]>,
    format: ExportFormat
  ): Promise<{ url: string; content?: string }> {
    // In production, this would use a proper PDF/Excel generation library
    // For now, return a simulated output

    const content = this.generateContent(report, data, format);

    return {
      url: `/reports/${report.id}/${randomUUID()}.${format}`,
      content,
    };
  }

  private generateContent(
    report: Report,
    data: Record<string, unknown[]>,
    format: ExportFormat
  ): string {
    const lines: string[] = [];

    lines.push(`# ${report.name}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    for (const section of report.sections) {
      switch (section.type) {
        case 'text':
          lines.push(`## ${section.title || ''}`);
          lines.push(section.content || '');
          lines.push('');
          break;

        case 'table':
          if (section.dataKey && data[section.dataKey]) {
            lines.push(`## ${section.title || 'Data Table'}`);
            const rows = data[section.dataKey] as Record<string, unknown>[];
            if (rows.length > 0) {
              const firstRow = rows[0]!;
              const headers = Object.keys(firstRow);
              lines.push('| ' + headers.join(' | ') + ' |');
              lines.push('| ' + headers.map(() => '---').join(' | ') + ' |');
              for (const row of rows) {
                lines.push('| ' + headers.map(h => String(row[h] ?? '')).join(' | ') + ' |');
              }
            }
            lines.push('');
          }
          break;

        case 'summary':
          if (section.dataKey && data[section.dataKey]) {
            lines.push(`## ${section.title || 'Summary'}`);
            const summaryData = data[section.dataKey]?.[0] as Record<string, unknown> | undefined;
            if (summaryData) {
              for (const [key, value] of Object.entries(summaryData)) {
                lines.push(`- ${key}: ${value}`);
              }
            }
            lines.push('');
          }
          break;

        case 'pageBreak':
          lines.push('---');
          lines.push('');
          break;
      }
    }

    return lines.join('\n');
  }

  // ============================================================================
  // Report Runs
  // ============================================================================

  async getReportRuns(
    reportId: string,
    options: { limit?: number } = {}
  ): Promise<ReportRun[]> {
    const runs = reportRuns.get(reportId) || [];
    const sorted = [...runs].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    return options.limit ? sorted.slice(0, options.limit) : sorted;
  }

  async getReportRun(reportId: string, runId: string): Promise<ReportRun | null> {
    const runs = reportRuns.get(reportId) || [];
    return runs.find(r => r.id === runId) || null;
  }
}

export const reportService = new ReportService();
