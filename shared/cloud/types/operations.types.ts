/**
 * @fileoverview Cloud Operations Types - Extensible operation abstractions
 * @description Type-safe abstractions for all cloud operations beyond deployment.
 * Enables plugin-based architecture for future DevOps operations.
 *
 * Design Principles:
 * - Open/Closed: Easy to add new operations without modifying existing code
 * - Strategy Pattern: Each operation type is a pluggable strategy
 * - Type Safety: Full TypeScript coverage with discriminated unions
 * - Versioning: Operation contracts are versioned for backward compatibility
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

import type { Result } from '../../types/common.types.js';

/**
 * Supported cloud operation types
 * Extensible union for all DevOps operations
 */
export type CloudOperationType =
  // Deployment Operations
  | 'deployment'
  | 'rollback'
  | 'preview'
  // Infrastructure Operations
  | 'infrastructure:provision'
  | 'infrastructure:destroy'
  | 'infrastructure:update'
  | 'infrastructure:drift-detection'
  // Monitoring & Observability
  | 'monitoring:metrics'
  | 'monitoring:logs'
  | 'monitoring:traces'
  | 'monitoring:alerts'
  // Scaling & Performance
  | 'scaling:auto-scale'
  | 'scaling:manual-scale'
  | 'scaling:load-balancing'
  // Security & Compliance
  | 'security:secrets'
  | 'security:certificates'
  | 'security:access-control'
  | 'security:vulnerability-scan'
  | 'security:compliance-audit'
  // Database Operations
  | 'database:provision'
  | 'database:backup'
  | 'database:restore'
  | 'database:migration'
  | 'database:scaling'
  // Networking
  | 'network:dns'
  | 'network:cdn'
  | 'network:firewall'
  | 'network:vpn'
  // Cost Management
  | 'cost:analysis'
  | 'cost:optimization'
  | 'cost:budgets'
  | 'cost:forecasting'
  // CI/CD Operations
  | 'cicd:pipeline'
  | 'cicd:build'
  | 'cicd:test'
  | 'cicd:release'
  // Container Operations
  | 'container:build'
  | 'container:registry'
  | 'container:orchestration'
  | 'container:health-check'
  // Backup & Recovery
  | 'backup:create'
  | 'backup:restore'
  | 'backup:schedule'
  | 'disaster-recovery:failover'
  | 'disaster-recovery:test';

/**
 * Operation capability metadata
 * Describes what a provider can do for a specific operation
 */
export interface OperationCapability {
  /** Operation type identifier */
  readonly type: CloudOperationType;
  /** Whether this operation is supported */
  readonly supported: boolean;
  /** Operation maturity level */
  readonly maturity: 'alpha' | 'beta' | 'stable' | 'deprecated';
  /** API version for this operation */
  readonly apiVersion?: string;
  /** Required permissions/scopes */
  readonly requiredPermissions?: readonly string[];
  /** Operation-specific limitations */
  readonly limitations?: {
    readonly maxConcurrent?: number;
    readonly rateLimit?: { readonly requests: number; readonly period: 'second' | 'minute' | 'hour' };
    readonly maxResourceSize?: number;
    readonly regions?: readonly string[];
  };
  /** Estimated cost per operation */
  readonly costPerOperation?: {
    readonly amount: number;
    readonly currency: string;
    readonly unit?: string;
  };
}

/**
 * Base operation request
 * All operation requests extend this
 */
export interface BaseOperationRequest {
  /** Operation type */
  readonly type: CloudOperationType;
  /** Operation ID for tracking */
  readonly operationId?: string;
  /** Idempotency key for safe retries */
  readonly idempotencyKey?: string;
  /** Operation timeout in milliseconds */
  readonly timeout?: number;
  /** Dry run mode (preview without execution) */
  readonly dryRun?: boolean;
  /** Tags for organization and cost tracking */
  readonly tags?: Record<string, string>;
}

/**
 * Base operation result
 * All operation results extend this
 */
export interface BaseOperationResult {
  /** Operation ID */
  readonly operationId: string;
  /** Operation type that was executed */
  readonly type: CloudOperationType;
  /** Execution status */
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** Start timestamp */
  readonly startedAt: Date;
  /** End timestamp (if completed) */
  readonly completedAt?: Date;
  /** Duration in milliseconds */
  readonly durationMs?: number;
  /** Cost incurred for this operation */
  readonly cost?: {
    readonly amount: number;
    readonly currency: string;
  };
  /** Resource identifiers created/modified */
  readonly resourceIds?: string[];
  /** Error details if failed */
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

/**
 * Infrastructure provisioning request
 */
export interface InfrastructureProvisionRequest extends BaseOperationRequest {
  readonly type: 'infrastructure:provision';
  /** Infrastructure as Code template */
  readonly template: {
    readonly format: 'terraform' | 'cloudformation' | 'pulumi' | 'cdk' | 'bicep';
    readonly source: string; // File path or inline template
    readonly variables?: Record<string, unknown>;
  };
  /** Resource naming convention */
  readonly naming?: {
    readonly prefix?: string;
    readonly suffix?: string;
    readonly environment?: string;
  };
}

/**
 * Monitoring metrics request
 */
export interface MonitoringMetricsRequest extends BaseOperationRequest {
  readonly type: 'monitoring:metrics';
  /** Resource to monitor */
  readonly resourceId: string;
  /** Metric names to retrieve */
  readonly metrics: readonly string[];
  /** Time range */
  readonly timeRange: {
    readonly start: Date;
    readonly end: Date;
  };
  /** Aggregation period */
  readonly aggregation?: {
    readonly period: number; // seconds
    readonly function: 'avg' | 'sum' | 'min' | 'max' | 'count';
  };
}

/**
 * Monitoring metrics result
 */
export interface MonitoringMetricsResult extends BaseOperationResult {
  readonly type: 'monitoring:metrics';
  /** Metric data points */
  readonly metrics: ReadonlyArray<{
    readonly name: string;
    readonly unit: string;
    readonly dataPoints: ReadonlyArray<{
      readonly timestamp: Date;
      readonly value: number;
    }>;
  }>;
}

/**
 * Database provisioning request
 */
export interface DatabaseProvisionRequest extends BaseOperationRequest {
  readonly type: 'database:provision';
  /** Database engine */
  readonly engine: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'dynamodb' | 'firestore';
  /** Engine version */
  readonly version?: string;
  /** Instance specifications */
  readonly instance: {
    readonly type: string; // Provider-specific instance type
    readonly storage: {
      readonly size: number; // GB
      readonly type?: 'ssd' | 'hdd' | 'nvme';
    };
    readonly backup?: {
      readonly enabled: boolean;
      readonly retentionDays?: number;
      readonly schedule?: string; // Cron expression
    };
  };
  /** High availability configuration */
  readonly highAvailability?: {
    readonly enabled: boolean;
    readonly replicas?: number;
    readonly multiRegion?: boolean;
  };
}

/**
 * Secret management request
 */
export interface SecretManagementRequest extends BaseOperationRequest {
  readonly type: 'security:secrets';
  /** Action to perform */
  readonly action: 'create' | 'read' | 'update' | 'delete' | 'rotate';
  /** Secret identifier */
  readonly secretId?: string;
  /** Secret value (for create/update) */
  readonly value?: string;
  /** Secret metadata */
  readonly metadata?: {
    readonly description?: string;
    readonly tags?: Record<string, string>;
    readonly rotationPolicy?: {
      readonly enabled: boolean;
      readonly intervalDays?: number;
    };
  };
}

/**
 * Scaling operation request
 */
export interface ScalingOperationRequest extends BaseOperationRequest {
  readonly type: 'scaling:auto-scale' | 'scaling:manual-scale';
  /** Resource to scale */
  readonly resourceId: string;
  /** Target configuration */
  readonly target: {
    readonly min?: number;
    readonly max?: number;
    readonly desired?: number;
  };
  /** Scaling triggers (for auto-scale) */
  readonly triggers?: ReadonlyArray<{
    readonly metric: string;
    readonly threshold: number;
    readonly comparison: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
    readonly scaleBy: number;
  }>;
}

/**
 * Cost analysis request
 */
export interface CostAnalysisRequest extends BaseOperationRequest {
  readonly type: 'cost:analysis' | 'cost:optimization' | 'cost:forecasting';
  /** Time period to analyze */
  readonly period: {
    readonly start: Date;
    readonly end: Date;
  };
  /** Grouping dimensions */
  readonly groupBy?: readonly ('service' | 'region' | 'tag' | 'resource')[];
  /** Cost filters */
  readonly filters?: {
    readonly services?: readonly string[];
    readonly regions?: readonly string[];
    readonly tags?: Record<string, string>;
  };
}

/**
 * Cost analysis result
 */
export interface CostAnalysisResult extends BaseOperationResult {
  readonly type: 'cost:analysis';
  /** Total cost */
  readonly total: {
    readonly amount: number;
    readonly currency: string;
  };
  /** Cost breakdown */
  readonly breakdown: ReadonlyArray<{
    readonly dimension: string;
    readonly value: string;
    readonly cost: number;
    readonly percentage: number;
  }>;
  /** Cost trends */
  readonly trends?: {
    readonly daily: ReadonlyArray<{ readonly date: Date; readonly cost: number }>;
    readonly projectedNextMonth?: number;
  };
  /** Optimization recommendations */
  readonly recommendations?: ReadonlyArray<{
    readonly type: string;
    readonly description: string;
    readonly estimatedSavings: number;
    readonly effort: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Union type of all operation requests
 */
export type CloudOperationRequest =
  | BaseOperationRequest
  | InfrastructureProvisionRequest
  | MonitoringMetricsRequest
  | DatabaseProvisionRequest
  | SecretManagementRequest
  | ScalingOperationRequest
  | CostAnalysisRequest;

/**
 * Union type of all operation results
 */
export type CloudOperationResult =
  | BaseOperationResult
  | MonitoringMetricsResult
  | CostAnalysisResult;

/**
 * Cloud operation executor interface
 * Providers implement this to support various operations
 */
export interface CloudOperationExecutor {
  /**
   * Execute a cloud operation
   * @param request Operation request
   * @returns Operation result
   */
  executeOperation<T extends CloudOperationRequest>(
    request: T
  ): Promise<Result<CloudOperationResult>>;

  /**
   * Get supported operations and their capabilities
   * @returns Map of operation types to capabilities
   */
  getSupportedOperations(): ReadonlyMap<CloudOperationType, OperationCapability>;

  /**
   * Check if an operation is supported
   * @param type Operation type
   * @returns True if supported
   */
  supportsOperation(type: CloudOperationType): boolean;

  /**
   * Get operation status
   * @param operationId Operation identifier
   * @returns Current operation status
   */
  getOperationStatus(operationId: string): Promise<Result<BaseOperationResult>>;

  /**
   * Cancel an ongoing operation
   * @param operationId Operation identifier
   * @returns Cancellation result
   */
  cancelOperation(operationId: string): Promise<Result<void>>;
}
