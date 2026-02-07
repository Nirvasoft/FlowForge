/**
 * FlowForge Process Analytics Service
 * Workflow performance metrics and bottleneck analysis
 */

import type {
  ProcessAnalytics,
  BottleneckAnalysis,
  TimeSeriesData,
  DateRange,
} from '../../types/analytics';

// ============================================================================
// Mock Execution Data (Replace with real data in production)
// ============================================================================

interface ExecutionRecord {
  id: string;
  workflowId: string;
  status: 'completed' | 'failed' | 'running';
  startedAt: Date;
  completedAt?: Date;
  nodeExecutions: NodeExecutionRecord[];
}

interface NodeExecutionRecord {
  nodeId: string;
  nodeName: string;
  startedAt: Date;
  completedAt: Date;
  waitTime: number;
  processTime: number;
}

const executions: ExecutionRecord[] = [];

// ============================================================================
// Process Analytics Service
// ============================================================================

export class ProcessAnalyticsService {

  // ============================================================================
  // Overview Metrics
  // ============================================================================

  async getProcessAnalytics(
    workflowId: string,
    dateRange: DateRange
  ): Promise<ProcessAnalytics> {
    const { start, end } = this.resolveDateRange(dateRange);

    // Filter executions for this workflow and date range
    const filtered = executions.filter(e =>
      e.workflowId === workflowId &&
      e.startedAt >= start &&
      e.startedAt <= end
    );

    const completed = filtered.filter(e => e.status === 'completed');
    const failed = filtered.filter(e => e.status === 'failed');
    const running = filtered.filter(e => e.status === 'running');

    // Calculate cycle times
    const cycleTimes = completed
      .filter(e => e.completedAt)
      .map(e => e.completedAt!.getTime() - e.startedAt.getTime());

    const avgCycleTime = cycleTimes.length > 0
      ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
      : 0;

    const sortedCycleTimes = [...cycleTimes].sort((a, b) => a - b);
    const medianCycleTime = sortedCycleTimes.length > 0
      ? sortedCycleTimes[Math.floor(sortedCycleTimes.length / 2)]
      : 0;
    const p95CycleTime = sortedCycleTimes.length > 0
      ? sortedCycleTimes[Math.floor(sortedCycleTimes.length * 0.95)]
      : 0;

    // SLA (assuming 1 hour SLA for demo)
    const slaThreshold = 3600000; // 1 hour in ms
    const withinSla = cycleTimes.filter(t => t <= slaThreshold).length;
    const slaCompliance = cycleTimes.length > 0 ? withinSla / cycleTimes.length : 1;

    return {
      workflowId,
      period: dateRange,
      totalExecutions: filtered.length,
      completedExecutions: completed.length,
      failedExecutions: failed.length,
      activeExecutions: running.length,
      avgCycleTime,
      medianCycleTime: medianCycleTime ?? 0,
      p95CycleTime: p95CycleTime ?? 0,
      slaCompliance,
      slaBreach: cycleTimes.length - withinSla,
      bottlenecks: await this.getBottlenecks(workflowId, dateRange),
      executionTrend: await this.getExecutionTrend(workflowId, dateRange),
      cycleTimeTrend: await this.getCycleTimeTrend(workflowId, dateRange),
    };
  }

  // ============================================================================
  // Bottleneck Analysis
  // ============================================================================

  async getBottlenecks(
    workflowId: string,
    dateRange: DateRange
  ): Promise<BottleneckAnalysis[]> {
    const { start, end } = this.resolveDateRange(dateRange);

    const filtered = executions.filter(e =>
      e.workflowId === workflowId &&
      e.startedAt >= start &&
      e.startedAt <= end &&
      e.status === 'completed'
    );

    // Aggregate node execution stats
    const nodeStats = new Map<string, {
      nodeName: string;
      totalDuration: number;
      totalWait: number;
      totalProcess: number;
      count: number;
    }>();

    for (const exec of filtered) {
      for (const node of exec.nodeExecutions) {
        const duration = node.completedAt.getTime() - node.startedAt.getTime();
        const existing = nodeStats.get(node.nodeId) || {
          nodeName: node.nodeName,
          totalDuration: 0,
          totalWait: 0,
          totalProcess: 0,
          count: 0,
        };

        existing.totalDuration += duration;
        existing.totalWait += node.waitTime;
        existing.totalProcess += node.processTime;
        existing.count++;

        nodeStats.set(node.nodeId, existing);
      }
    }

    // Calculate bottleneck scores
    const bottlenecks: BottleneckAnalysis[] = [];
    const totalDuration = Array.from(nodeStats.values())
      .reduce((sum, n) => sum + n.totalDuration, 0);

    for (const [nodeId, stats] of nodeStats) {
      const avgDuration = stats.totalDuration / stats.count;
      const waitTime = stats.totalWait / stats.count;
      const processTime = stats.totalProcess / stats.count;
      const impactScore = totalDuration > 0
        ? (stats.totalDuration / totalDuration) * 100
        : 0;

      bottlenecks.push({
        nodeId,
        nodeName: stats.nodeName,
        avgDuration,
        waitTime,
        processTime,
        frequency: stats.count,
        impactScore,
      });
    }

    // Sort by impact score descending
    return bottlenecks.sort((a, b) => b.impactScore - a.impactScore);
  }

  // ============================================================================
  // Trend Analysis
  // ============================================================================

  async getExecutionTrend(
    workflowId: string,
    dateRange: DateRange
  ): Promise<TimeSeriesData[]> {
    const { start, end } = this.resolveDateRange(dateRange);
    const granularity = this.getGranularity(start, end);

    const filtered = executions.filter(e =>
      e.workflowId === workflowId &&
      e.startedAt >= start &&
      e.startedAt <= end
    );

    // Group by time bucket
    const buckets = new Map<string, number>();
    for (const exec of filtered) {
      const bucket = this.getBucket(exec.startedAt, granularity);
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    // Convert to time series
    const result: TimeSeriesData[] = [];
    const current = new Date(start);
    while (current <= end) {
      const bucket = this.getBucket(current, granularity);
      result.push({
        timestamp: new Date(current),
        value: buckets.get(bucket) || 0,
      });
      this.incrementDate(current, granularity);
    }

    return result;
  }

  async getCycleTimeTrend(
    workflowId: string,
    dateRange: DateRange
  ): Promise<TimeSeriesData[]> {
    const { start, end } = this.resolveDateRange(dateRange);
    const granularity = this.getGranularity(start, end);

    const filtered = executions.filter(e =>
      e.workflowId === workflowId &&
      e.startedAt >= start &&
      e.startedAt <= end &&
      e.status === 'completed' &&
      e.completedAt
    );

    // Group by time bucket
    const buckets = new Map<string, number[]>();
    for (const exec of filtered) {
      const bucket = this.getBucket(exec.startedAt, granularity);
      const cycleTime = exec.completedAt!.getTime() - exec.startedAt.getTime();
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket)!.push(cycleTime);
    }

    // Calculate averages
    const result: TimeSeriesData[] = [];
    const current = new Date(start);
    while (current <= end) {
      const bucket = this.getBucket(current, granularity);
      const times = buckets.get(bucket) || [];
      const avg = times.length > 0
        ? times.reduce((a, b) => a + b, 0) / times.length
        : 0;

      result.push({
        timestamp: new Date(current),
        value: avg,
      });
      this.incrementDate(current, granularity);
    }

    return result;
  }

  // ============================================================================
  // Node-Level Analytics
  // ============================================================================

  async getNodeAnalytics(
    workflowId: string,
    nodeId: string,
    dateRange: DateRange
  ): Promise<{
    executions: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    errorRate: number;
    trend: TimeSeriesData[];
  }> {
    const { start, end } = this.resolveDateRange(dateRange);

    const filtered = executions.filter(e =>
      e.workflowId === workflowId &&
      e.startedAt >= start &&
      e.startedAt <= end
    );

    const nodeExecutions: NodeExecutionRecord[] = [];
    for (const exec of filtered) {
      const nodeExec = exec.nodeExecutions.find(n => n.nodeId === nodeId);
      if (nodeExec) nodeExecutions.push(nodeExec);
    }

    const durations = nodeExecutions.map(n =>
      n.completedAt.getTime() - n.startedAt.getTime()
    );

    const sortedDurations = [...durations].sort((a, b) => a - b);

    return {
      executions: nodeExecutions.length,
      avgDuration: durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
      minDuration: sortedDurations[0] || 0,
      maxDuration: sortedDurations[sortedDurations.length - 1] || 0,
      p95Duration: sortedDurations[Math.floor(sortedDurations.length * 0.95)] || 0,
      errorRate: 0, // Would calculate from actual error data
      trend: [], // Would generate actual trend data
    };
  }

  // ============================================================================
  // SLA Monitoring
  // ============================================================================

  async getSlaMetrics(
    workflowId: string,
    slaThresholdMs: number,
    dateRange: DateRange
  ): Promise<{
    totalExecutions: number;
    withinSla: number;
    breached: number;
    complianceRate: number;
    avgBreachAmount: number;
    breachTrend: TimeSeriesData[];
  }> {
    const { start, end } = this.resolveDateRange(dateRange);

    const completed = executions.filter(e =>
      e.workflowId === workflowId &&
      e.startedAt >= start &&
      e.startedAt <= end &&
      e.status === 'completed' &&
      e.completedAt
    );

    const cycleTimes = completed.map(e =>
      e.completedAt!.getTime() - e.startedAt.getTime()
    );

    const withinSla = cycleTimes.filter(t => t <= slaThresholdMs).length;
    const breached = cycleTimes.filter(t => t > slaThresholdMs);
    const avgBreachAmount = breached.length > 0
      ? breached.reduce((a, b) => a + b - slaThresholdMs, 0) / breached.length
      : 0;

    return {
      totalExecutions: completed.length,
      withinSla,
      breached: breached.length,
      complianceRate: completed.length > 0 ? withinSla / completed.length : 1,
      avgBreachAmount,
      breachTrend: [], // Would generate actual trend
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private resolveDateRange(range: DateRange): { start: Date; end: Date } {
    if (range.type === 'absolute') {
      return {
        start: new Date(range.start!),
        end: new Date(range.end!),
      };
    }

    const end = new Date();
    const start = new Date();

    switch (range.relative) {
      case 'last7days':
        start.setDate(start.getDate() - 7);
        break;
      case 'last30days':
        start.setDate(start.getDate() - 30);
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    return { start, end };
  }

  private getGranularity(start: Date, end: Date): 'hour' | 'day' | 'week' | 'month' {
    const diff = end.getTime() - start.getTime();
    const days = diff / (1000 * 60 * 60 * 24);

    if (days <= 2) return 'hour';
    if (days <= 60) return 'day';
    if (days <= 180) return 'week';
    return 'month';
  }

  private getBucket(date: Date, granularity: string): string {
    const d = new Date(date);
    switch (granularity) {
      case 'hour':
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
      case 'day':
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      case 'week':
        const week = Math.floor(d.getDate() / 7);
        return `${d.getFullYear()}-${d.getMonth()}-W${week}`;
      case 'month':
        return `${d.getFullYear()}-${d.getMonth()}`;
      default:
        return d.toISOString().split('T')[0] ?? d.toISOString();
    }
  }

  private incrementDate(date: Date, granularity: string): void {
    switch (granularity) {
      case 'hour':
        date.setHours(date.getHours() + 1);
        break;
      case 'day':
        date.setDate(date.getDate() + 1);
        break;
      case 'week':
        date.setDate(date.getDate() + 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() + 1);
        break;
    }
  }

  // ============================================================================
  // Add Test Data
  // ============================================================================

  addExecution(execution: ExecutionRecord): void {
    executions.push(execution);
  }

  clearExecutions(): void {
    executions.length = 0;
  }
}

export const processAnalyticsService = new ProcessAnalyticsService();
