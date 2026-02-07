/**
 * FlowForge Dashboard Service
 * CRUD operations for dashboards, widgets, and filters
 */

import { randomUUID } from 'crypto';
import type {
  Dashboard,
  DashboardWidget,
  DashboardFilter,
  DashboardLayout,
  DashboardSettings,
  WidgetPosition,
  WidgetDataSource,
  VisualizationConfig,
  DateRangeConfig,
} from '../../types/analytics';
import { QueryBuilder, queryExecutor } from './query-builder';

// ============================================================================
// In-Memory Storage
// ============================================================================

const dashboards = new Map<string, Dashboard>();

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_LAYOUT: DashboardLayout = {
  type: 'grid',
  columns: 12,
  rowHeight: 80,
  gap: 16,
};

const DEFAULT_SETTINGS: DashboardSettings = {
  refreshInterval: 0,
  theme: 'system',
  showFilters: true,
  showTitle: true,
  allowExport: true,
  allowFullscreen: true,
};

const DEFAULT_DATE_RANGE: DateRangeConfig = {
  enabled: true,
  defaultRange: 'last7days',
  allowCustom: true,
  presets: [
    { label: 'Today', value: 'today', start: 'now/d', end: 'now' },
    { label: 'Yesterday', value: 'yesterday', start: 'now-1d/d', end: 'now-1d/d' },
    { label: 'Last 7 days', value: 'last7days', start: 'now-7d', end: 'now' },
    { label: 'Last 30 days', value: 'last30days', start: 'now-30d', end: 'now' },
    { label: 'This month', value: 'thisMonth', start: 'now/M', end: 'now' },
    { label: 'Last month', value: 'lastMonth', start: 'now-1M/M', end: 'now-1M/M' },
    { label: 'This year', value: 'thisYear', start: 'now/y', end: 'now' },
  ],
};

// ============================================================================
// Dashboard Service
// ============================================================================

export class DashboardService {

  // ============================================================================
  // Dashboard CRUD
  // ============================================================================

  async createDashboard(input: {
    name: string;
    description?: string;
    createdBy: string;
  }): Promise<Dashboard> {
    const id = randomUUID();
    const now = new Date();

    const dashboard: Dashboard = {
      id,
      name: input.name,
      slug: this.generateSlug(input.name),
      description: input.description,
      layout: { ...DEFAULT_LAYOUT },
      widgets: [],
      globalFilters: [],
      dateRange: { ...DEFAULT_DATE_RANGE },
      settings: { ...DEFAULT_SETTINGS },
      isPublic: false,
      embedEnabled: false,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    dashboards.set(id, dashboard);
    return dashboard;
  }

  async getDashboard(id: string): Promise<Dashboard | null> {
    return dashboards.get(id) || null;
  }

  async getDashboardBySlug(slug: string): Promise<Dashboard | null> {
    for (const dashboard of dashboards.values()) {
      if (dashboard.slug === slug) return dashboard;
    }
    return null;
  }

  async listDashboards(options: {
    createdBy?: string;
    folder?: string;
    tags?: string[];
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ dashboards: Dashboard[]; total: number }> {
    let items = Array.from(dashboards.values());

    if (options.createdBy) {
      items = items.filter(d => d.createdBy === options.createdBy);
    }
    if (options.folder) {
      items = items.filter(d => d.folder === options.folder);
    }
    if (options.tags?.length) {
      items = items.filter(d => options.tags!.some(t => d.tags?.includes(t)));
    }
    if (options.search) {
      const search = options.search.toLowerCase();
      items = items.filter(d =>
        d.name.toLowerCase().includes(search) ||
        d.description?.toLowerCase().includes(search)
      );
    }

    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const start = (page - 1) * pageSize;

    return {
      dashboards: items.slice(start, start + pageSize),
      total: items.length,
    };
  }

  async updateDashboard(
    id: string,
    input: Partial<Pick<Dashboard, 'name' | 'description' | 'layout' | 'settings' | 'dateRange' | 'folder' | 'tags'>>
  ): Promise<Dashboard | null> {
    const dashboard = dashboards.get(id);
    if (!dashboard) return null;

    if (input.name) {
      dashboard.name = input.name;
      dashboard.slug = this.generateSlug(input.name);
    }
    if (input.description !== undefined) dashboard.description = input.description;
    if (input.layout) dashboard.layout = { ...dashboard.layout, ...input.layout };
    if (input.settings) dashboard.settings = { ...dashboard.settings, ...input.settings };
    if (input.dateRange) dashboard.dateRange = { ...dashboard.dateRange, ...input.dateRange };
    if (input.folder !== undefined) dashboard.folder = input.folder;
    if (input.tags) dashboard.tags = input.tags;

    dashboard.updatedAt = new Date();
    dashboards.set(id, dashboard);
    return dashboard;
  }

  async deleteDashboard(id: string): Promise<boolean> {
    return dashboards.delete(id);
  }

  async duplicateDashboard(id: string, newName: string, createdBy: string): Promise<Dashboard | null> {
    const original = dashboards.get(id);
    if (!original) return null;

    const duplicate: Dashboard = JSON.parse(JSON.stringify(original));
    duplicate.id = randomUUID();
    duplicate.name = newName;
    duplicate.slug = this.generateSlug(newName);
    duplicate.createdAt = new Date();
    duplicate.updatedAt = new Date();
    duplicate.createdBy = createdBy;
    duplicate.isPublic = false;
    duplicate.embedEnabled = false;
    delete duplicate.embedToken;

    // Regenerate widget IDs
    duplicate.widgets = duplicate.widgets.map(w => ({ ...w, id: randomUUID() }));

    dashboards.set(duplicate.id, duplicate);
    return duplicate;
  }

  // ============================================================================
  // Widget Management
  // ============================================================================

  async addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): Promise<DashboardWidget | null> {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) return null;

    const newWidget: DashboardWidget = {
      ...widget,
      id: randomUUID(),
      showHeader: widget.showHeader ?? true,
      showBorder: widget.showBorder ?? true,
    };

    dashboard.widgets.push(newWidget);
    dashboard.updatedAt = new Date();
    dashboards.set(dashboardId, dashboard);
    return newWidget;
  }

  async getWidget(dashboardId: string, widgetId: string): Promise<DashboardWidget | null> {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) return null;
    return dashboard.widgets.find(w => w.id === widgetId) || null;
  }

  async updateWidget(
    dashboardId: string,
    widgetId: string,
    updates: Partial<Omit<DashboardWidget, 'id'>>
  ): Promise<DashboardWidget | null> {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) return null;

    const widget = dashboard.widgets.find(w => w.id === widgetId);
    if (!widget) return null;

    Object.assign(widget, updates);
    dashboard.updatedAt = new Date();
    dashboards.set(dashboardId, dashboard);
    return widget;
  }

  async deleteWidget(dashboardId: string, widgetId: string): Promise<boolean> {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) return false;

    const index = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (index === -1) return false;

    dashboard.widgets.splice(index, 1);
    dashboard.updatedAt = new Date();
    dashboards.set(dashboardId, dashboard);
    return true;
  }

  async moveWidget(
    dashboardId: string,
    widgetId: string,
    position: Partial<WidgetPosition>
  ): Promise<DashboardWidget | null> {
    return this.updateWidget(dashboardId, widgetId, {
      position: { ...position } as WidgetPosition,
    });
  }

  async resizeWidget(
    dashboardId: string,
    widgetId: string,
    size: { width: number; height: number }
  ): Promise<DashboardWidget | null> {
    const widget = await this.getWidget(dashboardId, widgetId);
    if (!widget) return null;

    return this.updateWidget(dashboardId, widgetId, {
      position: { ...widget.position, ...size },
    });
  }

  // ============================================================================
  // Filter Management
  // ============================================================================

  async addFilter(dashboardId: string, filter: Omit<DashboardFilter, 'id'>): Promise<DashboardFilter | null> {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) return null;

    const newFilter: DashboardFilter = {
      ...filter,
      id: randomUUID(),
    };

    dashboard.globalFilters.push(newFilter);
    dashboard.updatedAt = new Date();
    dashboards.set(dashboardId, dashboard);
    return newFilter;
  }

  async updateFilter(
    dashboardId: string,
    filterId: string,
    updates: Partial<Omit<DashboardFilter, 'id'>>
  ): Promise<DashboardFilter | null> {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) return null;

    const filter = dashboard.globalFilters.find(f => f.id === filterId);
    if (!filter) return null;

    Object.assign(filter, updates);
    dashboard.updatedAt = new Date();
    dashboards.set(dashboardId, dashboard);
    return filter;
  }

  async deleteFilter(dashboardId: string, filterId: string): Promise<boolean> {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) return false;

    const index = dashboard.globalFilters.findIndex(f => f.id === filterId);
    if (index === -1) return false;

    dashboard.globalFilters.splice(index, 1);
    dashboard.updatedAt = new Date();
    dashboards.set(dashboardId, dashboard);
    return true;
  }

  // ============================================================================
  // Data Execution
  // ============================================================================

  async executeWidgetQuery(
    dashboardId: string,
    widgetId: string,
    filterValues?: Record<string, unknown>
  ): Promise<unknown[]> {
    const widget = await this.getWidget(dashboardId, widgetId);
    if (!widget) throw new Error('Widget not found');

    const { dataSource } = widget;

    if (dataSource.type === 'static') {
      return dataSource.staticData || [];
    }

    if (dataSource.type === 'query' && dataSource.query) {
      // Apply filter values to query
      const query = { ...dataSource.query };
      if (filterValues) {
        query.filters = [
          ...(query.filters || []),
          ...Object.entries(filterValues).map(([field, value]) => ({
            field,
            operator: 'eq' as const,
            value,
          })),
        ];
      }

      return queryExecutor.execute(query);
    }

    return [];
  }

  async executeAllWidgets(
    dashboardId: string,
    filterValues?: Record<string, unknown>
  ): Promise<Record<string, unknown[]>> {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');

    const results: Record<string, unknown[]> = {};

    for (const widget of dashboard.widgets) {
      try {
        results[widget.id] = await this.executeWidgetQuery(dashboardId, widget.id, filterValues);
      } catch (error) {
        results[widget.id] = [];
      }
    }

    return results;
  }

  // ============================================================================
  // Sharing & Embedding
  // ============================================================================

  async shareDashboard(id: string, userIds: string[]): Promise<Dashboard | null> {
    const dashboard = dashboards.get(id);
    if (!dashboard) return null;

    dashboard.sharedWith = [...new Set([...(dashboard.sharedWith || []), ...userIds])];
    dashboard.updatedAt = new Date();
    dashboards.set(id, dashboard);
    return dashboard;
  }

  async unshareDashboard(id: string, userIds: string[]): Promise<Dashboard | null> {
    const dashboard = dashboards.get(id);
    if (!dashboard) return null;

    dashboard.sharedWith = (dashboard.sharedWith || []).filter(uid => !userIds.includes(uid));
    dashboard.updatedAt = new Date();
    dashboards.set(id, dashboard);
    return dashboard;
  }

  async enableEmbed(id: string): Promise<{ token: string } | null> {
    const dashboard = dashboards.get(id);
    if (!dashboard) return null;

    dashboard.embedEnabled = true;
    dashboard.embedToken = randomUUID();
    dashboard.updatedAt = new Date();
    dashboards.set(id, dashboard);

    return { token: dashboard.embedToken };
  }

  async disableEmbed(id: string): Promise<boolean> {
    const dashboard = dashboards.get(id);
    if (!dashboard) return false;

    dashboard.embedEnabled = false;
    delete dashboard.embedToken;
    dashboard.updatedAt = new Date();
    dashboards.set(id, dashboard);

    return true;
  }

  async getDashboardByEmbedToken(token: string): Promise<Dashboard | null> {
    for (const dashboard of dashboards.values()) {
      if (dashboard.embedEnabled && dashboard.embedToken === token) {
        return dashboard;
      }
    }
    return null;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // ============================================================================
  // Quick Widget Builders
  // ============================================================================

  createMetricWidget(config: {
    title: string;
    field: string;
    aggregate: 'sum' | 'avg' | 'count' | 'min' | 'max';
    source: string;
    position: WidgetPosition;
    prefix?: string;
    suffix?: string;
  }): Omit<DashboardWidget, 'id'> {
    return {
      type: 'metric',
      title: config.title,
      position: config.position,
      showHeader: true,
      showBorder: true,
      dataSource: {
        type: 'query',
        query: QueryBuilder.from(config.source)
          .aggregate(config.field, config.aggregate, 'value')
          .build(),
        cacheEnabled: true,
        cacheDuration: 60000,
      },
      visualization: {
        type: 'number',
        options: {
          prefix: config.prefix,
          suffix: config.suffix,
          decimals: 2,
        },
      },
    };
  }

  createChartWidget(config: {
    title: string;
    chartType: 'bar' | 'line' | 'pie' | 'area';
    source: string;
    xField: string;
    yField: string;
    aggregate?: 'sum' | 'avg' | 'count';
    position: WidgetPosition;
  }): Omit<DashboardWidget, 'id'> {
    const builder = QueryBuilder.from(config.source)
      .select(config.xField)
      .groupBy(config.xField);

    if (config.aggregate) {
      builder.aggregate(config.yField, config.aggregate, 'value');
    } else {
      builder.select(config.yField, 'value');
    }

    return {
      type: 'chart',
      title: config.title,
      position: config.position,
      showHeader: true,
      showBorder: true,
      dataSource: {
        type: 'query',
        query: builder.build(),
        cacheEnabled: true,
        cacheDuration: 60000,
      },
      visualization: {
        type: config.chartType,
        options: {
          xAxis: { field: config.xField },
          yAxis: { field: 'value' },
          legend: { show: true, position: 'bottom' },
          tooltip: { show: true },
        },
      },
    };
  }

  createTableWidget(config: {
    title: string;
    source: string;
    columns: Array<{ field: string; header: string }>;
    position: WidgetPosition;
    pageSize?: number;
  }): Omit<DashboardWidget, 'id'> {
    const builder = QueryBuilder.from(config.source);
    config.columns.forEach(c => builder.select(c.field));

    return {
      type: 'table',
      title: config.title,
      position: config.position,
      showHeader: true,
      showBorder: true,
      dataSource: {
        type: 'query',
        query: builder.build(),
        cacheEnabled: true,
        cacheDuration: 60000,
      },
      visualization: {
        type: 'table',
        options: {
          columns: config.columns.map(c => ({
            field: c.field,
            header: c.header,
            sortable: true,
          })),
          pageSize: config.pageSize || 10,
          sortable: true,
          filterable: true,
        },
      },
    };
  }
}

export const dashboardService = new DashboardService();
