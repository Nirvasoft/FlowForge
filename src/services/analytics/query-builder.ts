/**
 * FlowForge Query Builder Service
 * Build and execute analytics queries
 */

import type {
  AnalyticsQuery,
  QuerySelect,
  QueryFilter,
  QueryOrderBy,
  TimeDimension,
  AggregateFunction,
  FilterOperator,
  DataTransform,
} from '../../types/analytics';

// ============================================================================
// Query Builder
// ============================================================================

export class QueryBuilder {
  private query: AnalyticsQuery;

  constructor(source: string) {
    this.query = {
      source,
      select: [],
    };
  }

  static from(source: string): QueryBuilder {
    return new QueryBuilder(source);
  }

  select(field: string, alias?: string): this {
    this.query.select.push({ field, alias });
    return this;
  }

  selectAs(field: string, alias: string): this {
    return this.select(field, alias);
  }

  aggregate(field: string, fn: AggregateFunction, alias?: string): this {
    this.query.select.push({ field, aggregate: fn, alias: alias || `${fn}_${field}` });
    return this;
  }

  count(field: string = '*', alias: string = 'count'): this {
    return this.aggregate(field, 'count', alias);
  }

  sum(field: string, alias?: string): this {
    return this.aggregate(field, 'sum', alias);
  }

  avg(field: string, alias?: string): this {
    return this.aggregate(field, 'avg', alias);
  }

  min(field: string, alias?: string): this {
    return this.aggregate(field, 'min', alias);
  }

  max(field: string, alias?: string): this {
    return this.aggregate(field, 'max', alias);
  }

  where(field: string, operator: FilterOperator, value: unknown): this {
    if (!this.query.filters) this.query.filters = [];
    this.query.filters.push({ field, operator, value });
    return this;
  }

  whereEq(field: string, value: unknown): this {
    return this.where(field, 'eq', value);
  }

  whereIn(field: string, values: unknown[]): this {
    return this.where(field, 'in', values);
  }

  whereBetween(field: string, start: unknown, end: unknown): this {
    return this.where(field, 'between', [start, end]);
  }

  whereNull(field: string): this {
    return this.where(field, 'isNull', null);
  }

  whereNotNull(field: string): this {
    return this.where(field, 'isNotNull', null);
  }

  groupBy(...fields: string[]): this {
    this.query.groupBy = fields;
    return this;
  }

  having(field: string, operator: FilterOperator, value: unknown): this {
    if (!this.query.having) this.query.having = [];
    this.query.having.push({ field, operator, value });
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    if (!this.query.orderBy) this.query.orderBy = [];
    this.query.orderBy.push({ field, direction });
    return this;
  }

  orderByDesc(field: string): this {
    return this.orderBy(field, 'desc');
  }

  limit(count: number): this {
    this.query.limit = count;
    return this;
  }

  offset(count: number): this {
    this.query.offset = count;
    return this;
  }

  timeDimension(field: string, granularity: TimeDimension['granularity']): this {
    this.query.timeDimension = { field, granularity };
    return this;
  }

  dateRange(type: 'relative' | 'absolute', config: { relative?: string; start?: string; end?: string }): this {
    if (!this.query.timeDimension) {
      throw new Error('Set timeDimension before dateRange');
    }
    this.query.timeDimension.dateRange = { type, ...config };
    return this;
  }

  build(): AnalyticsQuery {
    return { ...this.query };
  }
}

// ============================================================================
// Query Executor (In-Memory)
// ============================================================================

export class QueryExecutor {
  private data: Map<string, Record<string, unknown>[]> = new Map();

  setData(source: string, records: Record<string, unknown>[]): void {
    this.data.set(source, records);
  }

  async execute(query: AnalyticsQuery): Promise<Record<string, unknown>[]> {
    let records = this.data.get(query.source) || [];

    // Apply filters
    if (query.filters?.length) {
      records = records.filter(record => this.matchesFilters(record, query.filters!));
    }

    // Apply time dimension filter
    if (query.timeDimension?.dateRange) {
      records = this.filterByDateRange(records, query.timeDimension);
    }

    // Apply grouping and aggregation
    if (query.groupBy?.length) {
      records = this.groupAndAggregate(records, query);
    } else if (query.select.some(s => s.aggregate)) {
      records = [this.aggregateAll(records, query)];
    } else {
      // Simple select
      records = records.map(r => this.projectFields(r, query.select));
    }

    // Apply having
    if (query.having?.length) {
      records = records.filter(record => this.matchesFilters(record, query.having!));
    }

    // Apply ordering
    if (query.orderBy?.length) {
      records = this.sortRecords(records, query.orderBy);
    }

    // Apply offset and limit
    if (query.offset) {
      records = records.slice(query.offset);
    }
    if (query.limit) {
      records = records.slice(0, query.limit);
    }

    return records;
  }

  private matchesFilters(record: Record<string, unknown>, filters: QueryFilter[]): boolean {
    return filters.every(filter => this.matchesFilter(record, filter));
  }

  private matchesFilter(record: Record<string, unknown>, filter: QueryFilter): boolean {
    const value = this.getNestedValue(record, filter.field);
    const filterValue = filter.value;

    switch (filter.operator) {
      case 'eq': return value === filterValue;
      case 'neq': return value !== filterValue;
      case 'gt': return (value as number) > (filterValue as number);
      case 'gte': return (value as number) >= (filterValue as number);
      case 'lt': return (value as number) < (filterValue as number);
      case 'lte': return (value as number) <= (filterValue as number);
      case 'contains': return String(value).includes(String(filterValue));
      case 'notContains': return !String(value).includes(String(filterValue));
      case 'startsWith': return String(value).startsWith(String(filterValue));
      case 'endsWith': return String(value).endsWith(String(filterValue));
      case 'in': return (filterValue as unknown[]).includes(value);
      case 'notIn': return !(filterValue as unknown[]).includes(value);
      case 'isNull': return value === null || value === undefined;
      case 'isNotNull': return value !== null && value !== undefined;
      case 'between': {
        const [start, end] = filterValue as [number, number];
        return (value as number) >= start && (value as number) <= end;
      }
      default: return true;
    }
  }

  private filterByDateRange(records: Record<string, unknown>[], timeDim: TimeDimension): Record<string, unknown>[] {
    if (!timeDim.dateRange) return records;

    const { type, relative, start, end } = timeDim.dateRange;
    let startDate: Date;
    let endDate: Date = new Date();

    if (type === 'relative' && relative) {
      startDate = this.parseRelativeDate(relative);
    } else if (type === 'absolute') {
      startDate = new Date(start!);
      endDate = new Date(end!);
    } else {
      return records;
    }

    return records.filter(r => {
      const date = new Date(r[timeDim.field] as string);
      return date >= startDate && date <= endDate;
    });
  }

  private parseRelativeDate(relative: string): Date {
    const now = new Date();
    const match = relative.match(/^last(\d+)(days?|weeks?|months?|years?)$/i);

    if (match) {
      const [, num, unit] = match;
      const amount = parseInt(num!);

      switch (unit!.toLowerCase().replace(/s$/, '')) {
        case 'day': now.setDate(now.getDate() - amount); break;
        case 'week': now.setDate(now.getDate() - amount * 7); break;
        case 'month': now.setMonth(now.getMonth() - amount); break;
        case 'year': now.setFullYear(now.getFullYear() - amount); break;
      }
    }

    return now;
  }

  private groupAndAggregate(records: Record<string, unknown>[], query: AnalyticsQuery): Record<string, unknown>[] {
    const groups = new Map<string, Record<string, unknown>[]>();

    // Group records
    for (const record of records) {
      const key = query.groupBy!.map(f => String(record[f])).join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(record);
    }

    // Aggregate each group
    const results: Record<string, unknown>[] = [];
    for (const [, groupRecords] of groups) {
      const result: Record<string, unknown> = {};

      // Add group by fields
      for (const field of query.groupBy!) {
        result[field] = groupRecords[0]![field];
      }

      // Add aggregates
      for (const select of query.select) {
        if (select.aggregate) {
          const alias = select.alias || `${select.aggregate}_${select.field}`;
          result[alias] = this.computeAggregate(groupRecords, select.field, select.aggregate);
        }
      }

      results.push(result);
    }

    return results;
  }

  private aggregateAll(records: Record<string, unknown>[], query: AnalyticsQuery): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const select of query.select) {
      if (select.aggregate) {
        const alias = select.alias || `${select.aggregate}_${select.field}`;
        result[alias] = this.computeAggregate(records, select.field, select.aggregate);
      }
    }

    return result;
  }

  private computeAggregate(records: Record<string, unknown>[], field: string, fn: AggregateFunction): unknown {
    if (records.length === 0) return fn === 'count' ? 0 : null;

    const values = records.map(r => r[field]).filter(v => v !== null && v !== undefined);

    switch (fn) {
      case 'count': return field === '*' ? records.length : values.length;
      case 'countDistinct': return new Set(values).size;
      case 'sum': return values.reduce((a, b) => (a as number) + (b as number), 0);
      case 'avg': {
        const sum = values.reduce((a, b) => (a as number) + (b as number), 0) as number;
        return sum / values.length;
      }
      case 'min': return Math.min(...values.map(Number));
      case 'max': return Math.max(...values.map(Number));
      case 'first': return values[0];
      case 'last': return values[values.length - 1];
      case 'median': {
        const sorted = [...values].sort((a, b) => Number(a) - Number(b));
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
      }
      default: return null;
    }
  }

  private projectFields(record: Record<string, unknown>, selects: QuerySelect[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const select of selects) {
      const alias = select.alias || select.field;
      result[alias] = this.getNestedValue(record, select.field);
    }
    return result;
  }

  private sortRecords(records: Record<string, unknown>[], orderBy: QueryOrderBy[]): Record<string, unknown>[] {
    return [...records].sort((a, b) => {
      for (const order of orderBy) {
        const aVal = a[order.field];
        const bVal = b[order.field];

        let cmp = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          cmp = aVal.localeCompare(bVal);
        } else {
          cmp = (aVal as number) - (bVal as number);
        }

        if (cmp !== 0) {
          return order.direction === 'desc' ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((o, k) => (o as any)?.[k], obj);
  }
}

export const queryExecutor = new QueryExecutor();
