/**
 * FlowForge Analytics Tests
 */

import { QueryBuilder, QueryExecutor } from '../src/services/analytics/query-builder';
import { DashboardService } from '../src/services/analytics/dashboard.service';
import { ReportService } from '../src/services/analytics/report.service';
import { ProcessAnalyticsService } from '../src/services/analytics/process-analytics.service';

describe('Query Builder', () => {
  test('builds simple select query', () => {
    const query = QueryBuilder.from('orders')
      .select('id')
      .select('customer_name')
      .select('total')
      .build();

    expect(query.source).toBe('orders');
    expect(query.select).toHaveLength(3);
  });

  test('builds aggregation query', () => {
    const query = QueryBuilder.from('orders')
      .select('status')
      .count('*', 'order_count')
      .sum('total', 'total_value')
      .avg('total', 'avg_value')
      .groupBy('status')
      .build();

    expect(query.select).toHaveLength(4);
    expect(query.groupBy).toEqual(['status']);
  });

  test('builds filtered query', () => {
    const query = QueryBuilder.from('orders')
      .select('id')
      .whereEq('status', 'completed')
      .whereBetween('total', 100, 1000)
      .orderByDesc('created_at')
      .limit(10)
      .build();

    expect(query.filters).toHaveLength(2);
    expect(query.orderBy).toEqual([{ field: 'created_at', direction: 'desc' }]);
    expect(query.limit).toBe(10);
  });

  test('builds time dimension query', () => {
    const query = QueryBuilder.from('orders')
      .count('*', 'count')
      .timeDimension('created_at', 'day')
      .dateRange('relative', { relative: 'last7days' })
      .build();

    expect(query.timeDimension?.field).toBe('created_at');
    expect(query.timeDimension?.granularity).toBe('day');
  });
});

describe('Query Executor', () => {
  const executor = new QueryExecutor();

  beforeEach(() => {
    executor.setData('orders', [
      { id: 1, customer: 'Alice', total: 100, status: 'completed' },
      { id: 2, customer: 'Bob', total: 200, status: 'pending' },
      { id: 3, customer: 'Charlie', total: 150, status: 'completed' },
      { id: 4, customer: 'David', total: 300, status: 'completed' },
      { id: 5, customer: 'Eve', total: 50, status: 'cancelled' },
    ]);
  });

  test('executes simple select', async () => {
    const query = QueryBuilder.from('orders').select('id').select('customer').build();
    const results = await executor.execute(query);

    expect(results).toHaveLength(5);
    expect(results[0]).toHaveProperty('id');
    expect(results[0]).toHaveProperty('customer');
  });

  test('executes with filter', async () => {
    const query = QueryBuilder.from('orders')
      .select('id')
      .whereEq('status', 'completed')
      .build();

    const results = await executor.execute(query);
    expect(results).toHaveLength(3);
  });

  test('executes aggregation', async () => {
    const query = QueryBuilder.from('orders')
      .count('*', 'count')
      .sum('total', 'sum')
      .avg('total', 'avg')
      .build();

    const results = await executor.execute(query);
    expect(results).toHaveLength(1);
    expect(results[0].count).toBe(5);
    expect(results[0].sum).toBe(800);
    expect(results[0].avg).toBe(160);
  });

  test('executes group by', async () => {
    const query = QueryBuilder.from('orders')
      .select('status')
      .count('*', 'count')
      .sum('total', 'sum')
      .groupBy('status')
      .build();

    const results = await executor.execute(query);
    expect(results).toHaveLength(3);

    const completed = results.find((r: any) => r.status === 'completed');
    expect(completed?.count).toBe(3);
  });

  test('executes with ordering', async () => {
    const query = QueryBuilder.from('orders')
      .select('id')
      .select('total')
      .orderByDesc('total')
      .build();

    const results = await executor.execute(query);
    expect((results[0] as any).total).toBe(300);
    expect((results[4] as any).total).toBe(50);
  });

  test('executes with limit and offset', async () => {
    const query = QueryBuilder.from('orders')
      .select('id')
      .limit(2)
      .offset(1)
      .build();

    const results = await executor.execute(query);
    expect(results).toHaveLength(2);
  });
});

describe('Dashboard Service', () => {
  let service: DashboardService;

  beforeEach(() => {
    service = new DashboardService();
  });

  test('creates a dashboard', async () => {
    const dashboard = await service.createDashboard({
      name: 'Sales Dashboard',
      description: 'Overview of sales metrics',
      createdBy: 'user-1',
    });

    expect(dashboard.id).toBeDefined();
    expect(dashboard.name).toBe('Sales Dashboard');
    expect(dashboard.widgets).toEqual([]);
    expect(dashboard.globalFilters).toEqual([]);
  });

  test('adds widgets to dashboard', async () => {
    const dashboard = await service.createDashboard({ name: 'Test', createdBy: 'user-1' });

    const widget = await service.addWidget(dashboard.id, {
      type: 'metric',
      title: 'Total Sales',
      position: { x: 0, y: 0, width: 3, height: 2 },
      showHeader: true,
      showBorder: true,
      dataSource: {
        type: 'query',
        query: QueryBuilder.from('orders').sum('total', 'value').build(),
        cacheEnabled: true,
      },
      visualization: {
        type: 'number',
        options: { prefix: '$', decimals: 2 },
      },
    });

    expect(widget?.id).toBeDefined();
    expect(widget?.title).toBe('Total Sales');

    const updated = await service.getDashboard(dashboard.id);
    expect(updated?.widgets).toHaveLength(1);
  });

  test('adds filters to dashboard', async () => {
    const dashboard = await service.createDashboard({ name: 'Test', createdBy: 'user-1' });

    const filter = await service.addFilter(dashboard.id, {
      name: 'Status',
      field: 'status',
      type: 'select',
      operator: 'eq',
      options: [
        { label: 'Completed', value: 'completed' },
        { label: 'Pending', value: 'pending' },
      ],
    });

    expect(filter?.id).toBeDefined();

    const updated = await service.getDashboard(dashboard.id);
    expect(updated?.globalFilters).toHaveLength(1);
  });

  test('duplicates a dashboard', async () => {
    const original = await service.createDashboard({ name: 'Original', createdBy: 'user-1' });
    await service.addWidget(original.id, {
      type: 'chart',
      title: 'Chart',
      position: { x: 0, y: 0, width: 6, height: 4 },
      showHeader: true,
      showBorder: true,
      dataSource: { type: 'static', staticData: [], cacheEnabled: false },
      visualization: { type: 'bar', options: {} },
    });

    const duplicate = await service.duplicateDashboard(original.id, 'Copy', 'user-2');

    expect(duplicate?.id).not.toBe(original.id);
    expect(duplicate?.name).toBe('Copy');
    expect(duplicate?.widgets).toHaveLength(1);
    expect(duplicate?.widgets[0].id).not.toBe(original.id);
  });

  test('enables embedding', async () => {
    const dashboard = await service.createDashboard({ name: 'Test', createdBy: 'user-1' });

    const result = await service.enableEmbed(dashboard.id);
    expect(result?.token).toBeDefined();

    const updated = await service.getDashboard(dashboard.id);
    expect(updated?.embedEnabled).toBe(true);
  });

  test('creates metric widget helper', () => {
    const widget = service.createMetricWidget({
      title: 'Revenue',
      field: 'amount',
      aggregate: 'sum',
      source: 'transactions',
      position: { x: 0, y: 0, width: 3, height: 2 },
      prefix: '$',
    });

    expect(widget.type).toBe('metric');
    expect(widget.title).toBe('Revenue');
    expect(widget.dataSource.query).toBeDefined();
  });

  test('creates chart widget helper', () => {
    const widget = service.createChartWidget({
      title: 'Sales by Category',
      chartType: 'bar',
      source: 'sales',
      xField: 'category',
      yField: 'amount',
      aggregate: 'sum',
      position: { x: 0, y: 0, width: 6, height: 4 },
    });

    expect(widget.type).toBe('chart');
    expect(widget.visualization.type).toBe('bar');
  });
});

describe('Report Service', () => {
  let service: ReportService;

  beforeEach(() => {
    service = new ReportService();
  });

  test('creates a report', async () => {
    const report = await service.createReport({
      name: 'Monthly Report',
      type: 'tabular',
      createdBy: 'user-1',
    });

    expect(report.id).toBeDefined();
    expect(report.name).toBe('Monthly Report');
    expect(report.type).toBe('tabular');
  });

  test('adds sections to report', async () => {
    const report = await service.createReport({ name: 'Test', type: 'custom', createdBy: 'user-1' });

    await service.addSection(report.id, { type: 'text', title: 'Intro', content: 'Welcome' });
    await service.addSection(report.id, { type: 'table', title: 'Data', dataKey: 'orders' });

    const updated = await service.getReport(report.id);
    expect(updated?.sections).toHaveLength(2);
  });

  test('sets schedule', async () => {
    const report = await service.createReport({ name: 'Test', type: 'summary', createdBy: 'user-1' });

    const scheduled = await service.setSchedule(report.id, {
      enabled: true,
      frequency: 'weekly',
      timezone: 'UTC',
      recipients: ['user@example.com'],
      format: 'pdf',
    });

    expect(scheduled?.schedule?.enabled).toBe(true);
    expect(scheduled?.schedule?.nextRun).toBeDefined();
  });

  test('generates report', async () => {
    const report = await service.createReport({ name: 'Test', type: 'tabular', createdBy: 'user-1' });
    await service.addSection(report.id, { type: 'text', title: 'Summary', content: 'Report content' });

    const run = await service.generateReport(report.id, 'pdf', { userId: 'user-1' });

    expect(run.id).toBeDefined();
    expect(run.status).toBe('completed');
    expect(run.fileUrl).toBeDefined();
  });
});

describe('Process Analytics Service', () => {
  let service: ProcessAnalyticsService;

  beforeEach(() => {
    service = new ProcessAnalyticsService();
    service.clearExecutions();
  });

  test('calculates process analytics', async () => {
    // Add test data
    const now = new Date();
    service.addExecution({
      id: 'exec-1',
      workflowId: 'wf-1',
      status: 'completed',
      startedAt: new Date(now.getTime() - 3600000),
      completedAt: now,
      nodeExecutions: [],
    });

    const analytics = await service.getProcessAnalytics('wf-1', {
      type: 'relative',
      relative: 'last7days',
    });

    expect(analytics.totalExecutions).toBe(1);
    expect(analytics.completedExecutions).toBe(1);
  });

  test('calculates SLA metrics', async () => {
    const now = new Date();

    // Within SLA
    service.addExecution({
      id: 'exec-1',
      workflowId: 'wf-1',
      status: 'completed',
      startedAt: new Date(now.getTime() - 1800000), // 30 min ago
      completedAt: now,
      nodeExecutions: [],
    });

    // Breached SLA
    service.addExecution({
      id: 'exec-2',
      workflowId: 'wf-1',
      status: 'completed',
      startedAt: new Date(now.getTime() - 7200000), // 2 hours ago
      completedAt: now,
      nodeExecutions: [],
    });

    const sla = await service.getSlaMetrics('wf-1', 3600000, {
      type: 'relative',
      relative: 'last7days',
    });

    expect(sla.totalExecutions).toBe(2);
    expect(sla.withinSla).toBe(1);
    expect(sla.breached).toBe(1);
    expect(sla.complianceRate).toBe(0.5);
  });
});
