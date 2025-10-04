/**
 * Cloud Types - Comprehensive type system for cloud operations
 */

// Re-export cloud provider types
export * from './cloud-provider.types.js'

// Re-export deployment types (which includes re-exports from common.types)
export * from './deployment.types.js'

// Re-export infrastructure types (rename conflicting exports)
export type {
  InfrastructureConfig,
  NetworkConfig,
  SecurityConfig,
  RouteConfig,
  BackupConfig,
  HealthCheckConfig as InfrastructureHealthCheckConfig
} from './infrastructure.types.js';

// Re-export cost types (AlertChannel imported from monitoring)
export * from './cost.types.js'

// Re-export monitoring types (rename conflicting exports)
export type {
  PerformanceMetrics,
  AlertingConfig,
  LoggingConfig,
  AlertRule,
  AlertChannel,
  MonitoringConfig as CloudMonitoringConfig
} from './monitoring.types.js';

// Re-export shared types from other modules
export type {
  ProjectAnalysis,
  FrameworkType,
  ProgrammingLanguage,
  PackageManager,
  ProjectDependency,
  EnvironmentVariable,
  ProjectSize,
  ProjectComplexity,
} from '../../types/common.types.js';

export type {
  Result,
  AppError,
  LogLevel,
  Environment,
  OperationStatus,
} from '../../types/common.types.js';