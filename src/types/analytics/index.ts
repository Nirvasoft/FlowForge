/**
 * FlowForge Analytics Types
 * Complete type definitions for dashboards, reports, and visualizations
 */

// ============================================================================
// Dashboard Types
// ============================================================================

export interface Dashboard {
  id: string;
  name: string;
  slug: string;
  description?: string;
  
  // Layout
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  
  // Filters
  globalFilters: DashboardFilter[];
  dateRange?: DateRangeConfig;
  
  // Settings
  settings: DashboardSettings;
  
  // Sharing
  isPublic: boolean;
  sharedWith?: string[];
  embedEnabled: boolean;
  embedToken?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  folder?: string;
  tags?: string[];
}

export interface DashboardLayout {
  type: 'grid' | 'freeform';
  columns: number;
  rowHeight: number;
  gap: number;
  breakpoints?: Record<string, number>;
}

export interface DashboardSettings {
  refreshInterval?: number; // Auto-refresh in seconds
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
  defaultDateRange?: string;
  showFilters: boolean;
  showTitle: boolean;
  allowExport: boolean;
  allowFullscreen: boolean;
}

// ============================================================================
// Widget Types
// ============================================================================

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  
  // Position & Size
  position: WidgetPosition;
  
  // Data
  dataSource: WidgetDataSource;
  
  // Visualization
  visualization: VisualizationConfig;
  
  // Interactivity
  drilldown?: DrilldownConfig;
  clickAction?: WidgetClickAction;
  
  // Display
  showHeader: boolean;
  showBorder: boolean;
  backgroundColor?: string;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
}

export type WidgetType =
  | 'chart'
  | 'table'
  | 'metric'
  | 'gauge'
  | 'map'
  | 'text'
  | 'image'
  | 'filter'
  | 'list'
  | 'heatmap'
  | 'funnel'
  | 'pivot'
  | 'timeline';

// ============================================================================
// Data Source Types
// ============================================================================

export interface WidgetDataSource {
  type: 'query' | 'dataset' | 'api' | 'static' | 'workflow';
  
  // Query-based
  query?: AnalyticsQuery;
  
  // Dataset-based
  datasetId?: string;
  
  // API-based
  apiEndpoint?: string;
  apiMethod?: 'GET' | 'POST';
  apiHeaders?: Record<string, string>;
  
  // Static data
  staticData?: unknown[];
  
  // Workflow-based
  workflowId?: string;
  
  // Caching
  cacheEnabled: boolean;
  cacheDuration?: number;
  
  // Transform
  transform?: DataTransform[];
}

export interface AnalyticsQuery {
  source: string; // Table/collection name
  
  // SELECT
  select: QuerySelect[];
  
  // WHERE
  filters?: QueryFilter[];
  
  // GROUP BY
  groupBy?: string[];
  
  // HAVING
  having?: QueryFilter[];
  
  // ORDER BY
  orderBy?: QueryOrderBy[];
  
  // LIMIT
  limit?: number;
  offset?: number;
  
  // Time dimension
  timeDimension?: TimeDimension;
}

export interface QuerySelect {
  field: string;
  alias?: string;
  aggregate?: AggregateFunction;
  expression?: string;
}

export type AggregateFunction = 
  | 'count'
  | 'countDistinct'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'first'
  | 'last'
  | 'median'
  | 'percentile';

export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
  or?: QueryFilter[];
}

export type FilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'notContains'
  | 'startsWith' | 'endsWith'
  | 'in' | 'notIn'
  | 'isNull' | 'isNotNull'
  | 'between';

export interface QueryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TimeDimension {
  field: string;
  granularity: TimeGranularity;
  dateRange?: DateRange;
}

export type TimeGranularity = 
  | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface DateRange {
  type: 'relative' | 'absolute';
  // Relative
  relative?: string; // 'last7days', 'thisMonth', etc.
  // Absolute
  start?: string;
  end?: string;
}

export interface DataTransform {
  type: 'filter' | 'map' | 'sort' | 'limit' | 'pivot' | 'unpivot' | 'join' | 'calculate';
  config: Record<string, unknown>;
}

// ============================================================================
// Visualization Types
// ============================================================================

export interface VisualizationConfig {
  type: ChartType;
  options: ChartOptions;
}

export type ChartType =
  | 'bar'
  | 'stackedBar'
  | 'line'
  | 'area'
  | 'stackedArea'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'bubble'
  | 'radar'
  | 'treemap'
  | 'sunburst'
  | 'sankey'
  | 'waterfall'
  | 'boxplot'
  | 'candlestick'
  | 'gauge'
  | 'number'
  | 'table'
  | 'heatmap'
  | 'map'
  | 'funnel';

export interface ChartOptions {
  // Data mapping
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  series?: SeriesConfig[];
  
  // Colors
  colorScheme?: string;
  colors?: string[];
  
  // Legend
  legend?: LegendConfig;
  
  // Tooltip
  tooltip?: TooltipConfig;
  
  // Labels
  dataLabels?: DataLabelConfig;
  
  // Grid
  grid?: GridConfig;
  
  // Animation
  animation?: boolean;
  animationDuration?: number;
  
  // Specific chart options
  stacked?: boolean;
  horizontal?: boolean;
  smooth?: boolean;
  showArea?: boolean;
  innerRadius?: number; // For donut
  
  // Number/Metric options
  prefix?: string;
  suffix?: string;
  decimals?: number;
  comparisonValue?: number;
  comparisonLabel?: string;
  trendField?: string;
  
  // Table options
  columns?: TableColumn[];
  pageSize?: number;
  sortable?: boolean;
  filterable?: boolean;
  
  // Map options
  mapType?: 'world' | 'usa' | 'europe' | 'custom';
  geoField?: string;
  valueField?: string;
}

export interface AxisConfig {
  field: string;
  label?: string;
  type?: 'category' | 'value' | 'time' | 'log';
  format?: string;
  min?: number;
  max?: number;
  tickCount?: number;
  gridLines?: boolean;
}

export interface SeriesConfig {
  field: string;
  name?: string;
  type?: ChartType;
  color?: string;
  yAxisIndex?: number;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export interface TooltipConfig {
  show: boolean;
  format?: string;
  shared?: boolean;
}

export interface DataLabelConfig {
  show: boolean;
  position?: 'inside' | 'outside' | 'top' | 'bottom';
  format?: string;
  rotation?: number;
}

export interface GridConfig {
  show: boolean;
  strokeDasharray?: string;
  color?: string;
}

export interface TableColumn {
  field: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: string;
  sortable?: boolean;
  filterable?: boolean;
  cellRenderer?: string;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface DashboardFilter {
  id: string;
  name: string;
  field: string;
  type: FilterType;
  operator: FilterOperator;
  defaultValue?: unknown;
  options?: FilterOption[];
  dataSource?: string;
  required?: boolean;
  visible?: boolean;
  affectsWidgets?: string[]; // Widget IDs, empty = all
}

export type FilterType =
  | 'text'
  | 'number'
  | 'date'
  | 'dateRange'
  | 'select'
  | 'multiSelect'
  | 'checkbox'
  | 'slider';

export interface FilterOption {
  label: string;
  value: unknown;
}

export interface DateRangeConfig {
  enabled: boolean;
  defaultRange: string;
  allowCustom: boolean;
  presets: DateRangePreset[];
}

export interface DateRangePreset {
  label: string;
  value: string;
  start: string; // Expression like 'now-7d'
  end: string;
}

// ============================================================================
// Drilldown & Actions
// ============================================================================

export interface DrilldownConfig {
  enabled: boolean;
  type: 'dashboard' | 'report' | 'url' | 'modal';
  targetId?: string;
  url?: string;
  parameters?: Record<string, string>;
}

export interface WidgetClickAction {
  type: 'drilldown' | 'filter' | 'navigate' | 'modal' | 'none';
  config: Record<string, unknown>;
}

// ============================================================================
// Report Types
// ============================================================================

export interface Report {
  id: string;
  name: string;
  description?: string;
  
  // Type
  type: 'tabular' | 'summary' | 'matrix' | 'custom';
  
  // Data
  dataSource: ReportDataSource;
  
  // Layout
  layout: ReportLayout;
  sections: ReportSection[];
  
  // Scheduling
  schedule?: ReportSchedule;
  
  // Export
  exportFormats: ExportFormat[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ReportDataSource {
  type: 'query' | 'dataset' | 'multiple';
  queries?: Record<string, AnalyticsQuery>;
  datasetIds?: string[];
}

export interface ReportLayout {
  pageSize: 'A4' | 'Letter' | 'Legal' | 'custom';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  header?: ReportHeader;
  footer?: ReportFooter;
}

export interface ReportHeader {
  show: boolean;
  height: number;
  content: string;
  showLogo: boolean;
  showDate: boolean;
  showPageNumber: boolean;
}

export interface ReportFooter {
  show: boolean;
  height: number;
  content: string;
  showPageNumber: boolean;
}

export interface ReportSection {
  id: string;
  type: 'text' | 'table' | 'chart' | 'summary' | 'pageBreak';
  title?: string;
  content?: string;
  dataKey?: string;
  config?: Record<string, unknown>;
}

export interface ReportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  cron?: string;
  timezone: string;
  recipients: string[];
  format: ExportFormat;
  subject?: string;
  message?: string;
  lastRun?: Date;
  nextRun?: Date;
}

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'png' | 'json';

// ============================================================================
// Process Analytics Types
// ============================================================================

export interface ProcessAnalytics {
  workflowId: string;
  period: DateRange;
  
  // Overview metrics
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  activeExecutions: number;
  
  // Performance
  avgCycleTime: number;
  medianCycleTime: number;
  p95CycleTime: number;
  
  // SLA
  slaCompliance: number;
  slaBreach: number;
  
  // Bottlenecks
  bottlenecks: BottleneckAnalysis[];
  
  // Trends
  executionTrend: TimeSeriesData[];
  cycleTimeTrend: TimeSeriesData[];
}

export interface BottleneckAnalysis {
  nodeId: string;
  nodeName: string;
  avgDuration: number;
  waitTime: number;
  processTime: number;
  frequency: number;
  impactScore: number;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

// ============================================================================
// Real-time Types
// ============================================================================

export interface RealtimeSubscription {
  id: string;
  dashboardId: string;
  widgetIds?: string[];
  userId: string;
  createdAt: Date;
}

export interface RealtimeUpdate {
  type: 'widget' | 'filter' | 'refresh';
  widgetId?: string;
  data: unknown;
  timestamp: Date;
}

// ============================================================================
// Analytics Events
// ============================================================================

export type AnalyticsEventType =
  | 'dashboard.viewed'
  | 'dashboard.created'
  | 'dashboard.updated'
  | 'widget.clicked'
  | 'filter.applied'
  | 'report.generated'
  | 'report.scheduled'
  | 'export.completed';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  timestamp: Date;
  userId: string;
  dashboardId?: string;
  widgetId?: string;
  reportId?: string;
  metadata?: Record<string, unknown>;
}
