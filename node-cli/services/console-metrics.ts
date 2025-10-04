/**
 * Console Metrics - In-memory metrics collector for CLI
 *
 * Implements IMetricsCollector interface for tracking CLI operations.
 * Stores metrics in memory and can output summary on demand.
 *
 * @fileoverview Production metrics collector for AIOS CLI
 * @module node-cli/services
 */

import type { IMetricsCollector } from '@aios/shared';

/**
 * Metric entry with metadata
 */
interface MetricEntry {
  readonly name: string;
  readonly type: 'counter' | 'gauge' | 'histogram' | 'timing';
  readonly value: number;
  readonly tags?: Record<string, string> | undefined;
  readonly timestamp: number;
}

/**
 * Aggregated metric statistics
 */
interface MetricStats {
  readonly count: number;
  readonly sum: number;
  readonly min: number;
  readonly max: number;
  readonly avg: number;
  readonly latest: number;
}

/**
 * Production-grade in-memory metrics collector for CLI
 *
 * Features:
 * - Tracks counters, gauges, histograms, and timings
 * - Aggregates metrics for statistical analysis
 * - Tag-based filtering
 * - Memory-efficient circular buffer
 * - Summary reporting
 *
 * @example
 * ```typescript
 * const metrics = new ConsoleMetrics({ maxEntries: 1000 });
 *
 * metrics.increment('deployments.started');
 * metrics.gauge('memory.usage', process.memoryUsage().heapUsed);
 * metrics.timing('analysis.duration', 1234, { type: 'security' });
 *
 * console.log(metrics.getSummary());
 * ```
 */
export class ConsoleMetrics implements IMetricsCollector {
  private readonly metrics: Map<string, MetricEntry[]>;
  private readonly maxEntries: number;
  private readonly enableConsoleOutput: boolean;

  constructor(options?: {
    maxEntries?: number;
    enableConsoleOutput?: boolean;
  }) {
    this.metrics = new Map();
    this.maxEntries = options?.maxEntries ?? 10000;
    this.enableConsoleOutput = options?.enableConsoleOutput ?? false;
  }

  /**
   * Increment a counter metric
   */
  increment(name: string, tags?: Record<string, string>): void {
    this.record({
      name,
      type: 'counter',
      value: 1,
      tags,
      timestamp: Date.now()
    });

    if (this.enableConsoleOutput) {
      console.log(`📊 Counter: ${name} +1`, tags || '');
    }
  }

  /**
   * Set a gauge metric (absolute value)
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record({
      name,
      type: 'gauge',
      value,
      tags,
      timestamp: Date.now()
    });

    if (this.enableConsoleOutput) {
      console.log(`📈 Gauge: ${name} = ${value}`, tags || '');
    }
  }

  /**
   * Record a histogram value (statistical distribution)
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.record({
      name,
      type: 'histogram',
      value,
      tags,
      timestamp: Date.now()
    });

    if (this.enableConsoleOutput) {
      console.log(`📊 Histogram: ${name} = ${value}`, tags || '');
    }
  }

  /**
   * Record a timing metric (duration in milliseconds)
   */
  timing(name: string, value: number, tags?: Record<string, string>): void {
    this.record({
      name,
      type: 'timing',
      value,
      tags,
      timestamp: Date.now()
    });

    if (this.enableConsoleOutput) {
      console.log(`⏱️  Timing: ${name} = ${value}ms`, tags || '');
    }
  }

  /**
   * Record a metric entry
   */
  private record(entry: Omit<MetricEntry, 'tags'> & { tags?: Record<string, string> | undefined }): void {
    const entries = this.metrics.get(entry.name) || [];

    // Normalize entry to match MetricEntry interface
    const normalizedEntry: MetricEntry = {
      ...entry,
      tags: entry.tags || undefined
    };

    // Add new entry
    entries.push(normalizedEntry);

    // Enforce max entries (circular buffer behavior)
    if (entries.length > this.maxEntries) {
      entries.shift(); // Remove oldest entry
    }

    this.metrics.set(entry.name, entries);
  }

  /**
   * Get statistics for a specific metric
   */
  getStats(name: string, tags?: Record<string, string>): MetricStats | undefined {
    const entries = this.metrics.get(name);
    if (!entries || entries.length === 0) {
      return undefined;
    }

    // Filter by tags if provided
    const filteredEntries = tags
      ? entries.filter(entry => this.matchesTags(entry.tags, tags))
      : entries;

    if (filteredEntries.length === 0) {
      return undefined;
    }

    const values = filteredEntries.map(e => e.value);
    const sum = values.reduce((acc, val) => acc + val, 0);

    return {
      count: filteredEntries.length,
      sum,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / filteredEntries.length,
      latest: filteredEntries[filteredEntries.length - 1]?.value ?? 0
    };
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get summary of all metrics
   */
  getSummary(): Record<string, MetricStats> {
    const summary: Record<string, MetricStats> = {};

    for (const name of this.metrics.keys()) {
      const stats = this.getStats(name);
      if (stats) {
        summary[name] = stats;
      }
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Clear metrics for a specific name
   */
  clearMetric(name: string): void {
    this.metrics.delete(name);
  }

  /**
   * Export metrics in a structured format
   */
  export(): {
    timestamp: string;
    summary: Record<string, MetricStats>;
    totalMetrics: number;
    totalEntries: number;
  } {
    const summary = this.getSummary();
    const totalEntries = Array.from(this.metrics.values())
      .reduce((sum, entries) => sum + entries.length, 0);

    return {
      timestamp: new Date().toISOString(),
      summary,
      totalMetrics: this.metrics.size,
      totalEntries
    };
  }

  /**
   * Print metrics summary to console
   */
  printSummary(): void {
    console.log('\n📊 Metrics Summary');
    console.log('═'.repeat(60));

    const summary = this.getSummary();
    const entries = Object.entries(summary);

    if (entries.length === 0) {
      console.log('No metrics recorded');
      return;
    }

    for (const [name, stats] of entries) {
      console.log(`\n📈 ${name}`);
      console.log(`   Count: ${stats.count}`);
      console.log(`   Latest: ${this.formatValue(stats.latest, name)}`);
      if (stats.count > 1) {
        console.log(`   Min: ${this.formatValue(stats.min, name)}`);
        console.log(`   Max: ${this.formatValue(stats.max, name)}`);
        console.log(`   Avg: ${this.formatValue(stats.avg, name)}`);
        console.log(`   Sum: ${this.formatValue(stats.sum, name)}`);
      }
    }

    console.log('\n' + '═'.repeat(60));
  }

  /**
   * Format value based on metric name (e.g., ms for timings)
   */
  private formatValue(value: number, metricName: string): string {
    if (metricName.includes('timing') || metricName.includes('duration')) {
      return `${Math.round(value)}ms`;
    }
    if (metricName.includes('memory') || metricName.includes('size')) {
      return `${this.formatBytes(value)}`;
    }
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(2);
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Check if entry tags match filter tags
   */
  private matchesTags(
    entryTags: Record<string, string> | undefined,
    filterTags: Record<string, string>
  ): boolean {
    if (!entryTags) return false;

    return Object.entries(filterTags).every(
      ([key, value]) => entryTags[key] === value
    );
  }

  /**
   * Create a timer that records duration when stopped
   */
  startTimer(name: string, tags?: Record<string, string>): () => void {
    const start = performance.now();

    return () => {
      const duration = Math.round(performance.now() - start);
      this.timing(name, duration, tags);
    };
  }
}

/**
 * Factory function to create a console metrics collector
 */
export function createConsoleMetrics(options?: {
  maxEntries?: number;
  enableConsoleOutput?: boolean;
}): IMetricsCollector {
  return new ConsoleMetrics(options);
}