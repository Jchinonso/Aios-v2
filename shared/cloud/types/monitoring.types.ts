/**
 * @fileoverview Monitoring Types - Metrics, alerts, and health check types
 * @description Comprehensive type definitions for monitoring, alerting, and
 * observability systems. Enables real-time monitoring, automated alerting,
 * and detailed performance tracking across cloud deployments.
 *
 * Supports metrics collection, log aggregation, distributed tracing,
 * custom dashboards, and intelligent alerting with escalation policies.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  readonly enabled: boolean;
  readonly metrics: MetricsConfig;
  readonly logging: LoggingConfig;
  readonly alerting: AlertingConfig;
  readonly tracing: TracingConfig;
  readonly healthChecks: HealthCheckConfig[];
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  readonly enabled: boolean;
  readonly collection: {
    readonly interval: number; // seconds
    readonly retention: number; // days
    readonly aggregation: AggregationType[];
  };
  readonly export: {
    readonly enabled: boolean;
    readonly destinations: ExportDestination[];
  };
  readonly customMetrics: CustomMetric[];
}

/**
 * Aggregation type
 */
export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile';

/**
 * Export destination
 */
export interface ExportDestination {
  readonly type: 'prometheus' | 'datadog' | 'newrelic' | 'cloudwatch';
  readonly endpoint: string;
  readonly credentials?: Record<string, string>;
  readonly format: 'json' | 'prometheus' | 'statsd';
}

/**
 * Custom metric definition
 */
export interface CustomMetric {
  readonly name: string;
  readonly description: string;
  readonly type: 'counter' | 'gauge' | 'histogram' | 'summary';
  readonly labels: string[];
  readonly unit?: string;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  readonly enabled: boolean;
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly format: 'json' | 'text' | 'structured';
  readonly destinations: LogDestination[];
  readonly retention: number; // days
  readonly sampling?: {
    readonly rate: number; // 0-1
    readonly maxPerSecond?: number;
  };
}

/**
 * Log destination
 */
export interface LogDestination {
  readonly type: 'file' | 'stdout' | 'syslog' | 'elasticsearch' | 'cloudwatch';
  readonly endpoint?: string;
  readonly credentials?: Record<string, string>;
  readonly bufferSize?: number;
  readonly flushInterval?: number; // seconds
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  readonly enabled: boolean;
  readonly rules: AlertRule[];
  readonly channels: AlertChannel[];
  readonly escalation: EscalationPolicy[];
  readonly maintenance: MaintenanceWindow[];
}

/**
 * Alert rule
 */
export interface AlertRule {
  readonly name: string;
  readonly description: string;
  readonly query: string;
  readonly condition: AlertCondition;
  readonly severity: AlertSeverity;
  readonly channels: string[];
  readonly enabled: boolean;
  readonly tags?: Record<string, string>;
}

/**
 * Alert condition
 */
export interface AlertCondition {
  readonly threshold: number;
  readonly comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  readonly duration: number; // seconds
  readonly evaluation: number; // seconds
}

/**
 * Alert severity
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Alert channel
 */
export interface AlertChannel {
  readonly name: string;
  readonly type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  readonly settings: Record<string, unknown>;
  readonly enabled: boolean;
}

/**
 * Escalation policy
 */
export interface EscalationPolicy {
  readonly name: string;
  readonly steps: EscalationStep[];
  readonly repeatInterval?: number; // minutes
}

/**
 * Escalation step
 */
export interface EscalationStep {
  readonly delay: number; // minutes
  readonly channels: string[];
  readonly condition?: 'no-response' | 'not-acknowledged' | 'still-firing';
}

/**
 * Maintenance window
 */
export interface MaintenanceWindow {
  readonly name: string;
  readonly description: string;
  readonly start: Date;
  readonly end: Date;
  readonly recurring?: RecurrenceRule;
  readonly affectedServices: string[];
}

/**
 * Recurrence rule
 */
export interface RecurrenceRule {
  readonly frequency: 'daily' | 'weekly' | 'monthly';
  readonly interval: number;
  readonly daysOfWeek?: number[]; // 0-6, Sunday = 0
  readonly dayOfMonth?: number; // 1-31
}

/**
 * Tracing configuration
 */
export interface TracingConfig {
  readonly enabled: boolean;
  readonly samplingRate: number; // 0-1
  readonly exporter: TracingExporter;
  readonly instrumentation: InstrumentationConfig;
}

/**
 * Tracing exporter
 */
export interface TracingExporter {
  readonly type: 'jaeger' | 'zipkin' | 'otlp' | 'datadog';
  readonly endpoint: string;
  readonly credentials?: Record<string, string>;
  readonly batchSize?: number;
  readonly timeout?: number; // seconds
}

/**
 * Instrumentation configuration
 */
export interface InstrumentationConfig {
  readonly auto: boolean;
  readonly libraries: string[];
  readonly customSpans: CustomSpan[];
}

/**
 * Custom span definition
 */
export interface CustomSpan {
  readonly name: string;
  readonly operation: string;
  readonly tags: Record<string, string>;
  readonly attributes?: Record<string, unknown>;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  readonly name: string;
  readonly type: 'http' | 'tcp' | 'command' | 'database';
  readonly target: string;
  readonly interval: number; // seconds
  readonly timeout: number; // seconds
  readonly retries: number;
  readonly successCodes?: number[];
  readonly headers?: Record<string, string>;
  readonly body?: string;
  readonly expectedResponse?: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  readonly responseTime: {
    readonly average: number;
    readonly p50: number;
    readonly p90: number;
    readonly p95: number;
    readonly p99: number;
  };
  readonly throughput: {
    readonly requestsPerSecond: number;
    readonly errorsPerSecond: number;
    readonly successRate: number;
  };
  readonly resources: {
    readonly cpuUsage: number; // percentage
    readonly memoryUsage: number; // percentage
    readonly diskUsage: number; // percentage
    readonly networkIO: number; // bytes/second
  };
}

/**
 * Application metrics
 */
export interface ApplicationMetrics {
  readonly uptime: number; // seconds
  readonly version: string;
  readonly healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  readonly activeConnections: number;
  readonly queueLength: number;
  readonly cacheHitRate: number; // percentage
  readonly customMetrics: Record<string, number>;
}

/**
 * Infrastructure metrics
 */
export interface InfrastructureMetrics {
  readonly instances: InstanceMetrics[];
  readonly loadBalancers: LoadBalancerMetrics[];
  readonly databases: DatabaseMetrics[];
  readonly storage: StorageMetrics[];
}

/**
 * Instance metrics
 */
export interface InstanceMetrics {
  readonly instanceId: string;
  readonly status: 'running' | 'stopped' | 'pending' | 'terminating';
  readonly cpu: number; // percentage
  readonly memory: number; // percentage
  readonly disk: number; // percentage
  readonly network: {
    readonly inbound: number; // bytes/second
    readonly outbound: number; // bytes/second
  };
}

/**
 * Load balancer metrics
 */
export interface LoadBalancerMetrics {
  readonly name: string;
  readonly activeConnections: number;
  readonly requestsPerSecond: number;
  readonly errorRate: number; // percentage
  readonly responseTime: number; // milliseconds
  readonly healthyTargets: number;
  readonly unhealthyTargets: number;
}

/**
 * Database metrics
 */
export interface DatabaseMetrics {
  readonly name: string;
  readonly connections: {
    readonly active: number;
    readonly idle: number;
    readonly total: number;
  };
  readonly queries: {
    readonly perSecond: number;
    readonly averageTime: number; // milliseconds
    readonly slowQueries: number;
  };
  readonly storage: {
    readonly used: number; // GB
    readonly available: number; // GB
    readonly iops: number;
  };
}

/**
 * Storage metrics
 */
export interface StorageMetrics {
  readonly name: string;
  readonly type: 'block' | 'object' | 'file';
  readonly used: number; // GB
  readonly available: number; // GB
  readonly iops: number;
  readonly throughput: number; // MB/second
}

/**
 * Alert instance
 */
export interface Alert {
  readonly id: string;
  readonly rule: string;
  readonly severity: AlertSeverity;
  readonly status: 'firing' | 'resolved' | 'silenced';
  readonly message: string;
  readonly labels: Record<string, string>;
  readonly annotations: Record<string, string>;
  readonly startsAt: Date;
  readonly endsAt?: Date;
  readonly generatorURL?: string;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  readonly name: string;
  readonly description: string;
  readonly panels: DashboardPanel[];
  readonly timeRange: TimeRange;
  readonly refreshInterval?: number; // seconds
  readonly variables?: DashboardVariable[];
}

/**
 * Dashboard panel
 */
export interface DashboardPanel {
  readonly title: string;
  readonly type: 'graph' | 'table' | 'stat' | 'gauge' | 'heatmap';
  readonly queries: PanelQuery[];
  readonly visualization: VisualizationConfig;
  readonly size: {
    readonly width: number;
    readonly height: number;
  };
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
}

/**
 * Panel query
 */
export interface PanelQuery {
  readonly expression: string;
  readonly legend?: string;
  readonly color?: string;
  readonly hidden?: boolean;
}

/**
 * Visualization configuration
 */
export interface VisualizationConfig {
  readonly axes?: AxesConfig;
  readonly legend?: LegendConfig;
  readonly thresholds?: ThresholdConfig[];
  readonly colors?: ColorConfig;
}

/**
 * Axes configuration
 */
export interface AxesConfig {
  readonly x?: AxisConfig;
  readonly y?: AxisConfig;
}

/**
 * Axis configuration
 */
export interface AxisConfig {
  readonly label?: string;
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  readonly scale?: 'linear' | 'log';
}

/**
 * Legend configuration
 */
export interface LegendConfig {
  readonly show: boolean;
  readonly position: 'top' | 'bottom' | 'left' | 'right';
  readonly columns?: number;
}

/**
 * Threshold configuration
 */
export interface ThresholdConfig {
  readonly value: number;
  readonly color: string;
  readonly op: 'gt' | 'lt';
}

/**
 * Color configuration
 */
export interface ColorConfig {
  readonly mode: 'palette' | 'gradient' | 'single';
  readonly colors: string[];
}

/**
 * Dashboard variable
 */
export interface DashboardVariable {
  readonly name: string;
  readonly type: 'query' | 'custom' | 'constant';
  readonly query?: string;
  readonly options?: string[];
  readonly defaultValue?: string;
  readonly multiSelect?: boolean;
}

/**
 * Time range
 */
export interface TimeRange {
  readonly from: string | Date;
  readonly to: string | Date;
}