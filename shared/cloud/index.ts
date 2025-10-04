/**
 * @fileoverview Cloud Module - Main Export
 * @description Main export file for the AIOS Cloud Module providing comprehensive
 * cloud deployment and infrastructure management capabilities. Follows modular
 * architecture with clear separation of concerns and SOLID principles.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

// =====================================
// PRIMARY SERVICES
// =====================================

/**
 * Main cloud orchestrator - Central entry point for all cloud operations
 */
export { CloudManager } from './cloud-manager.js'

// Deployment orchestration services removed - unused files deleted

/**
 * Cost estimation and optimization services
 */
export { CostEstimator } from './cost/cost-estimator.js'

/**
 * Provider management and selection services
 */
export {
  ProviderRegistry,
  ProviderFactory,
} from './providers/index.js';

export { ProviderSelector } from './utils/provider-selector.js'

// =====================================
// UTILITY MODULES
// =====================================

/**
 * Configuration validation utilities
 */
export {
  ConfigValidator,
  createConfigValidator,
  validateProviderConfig,
  validateDeploymentConfig,
} from './utils/config-validator.js';

export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './utils/config-validator.js';

// Import missing types and classes for function signatures
import type { CloudProviderType, DeploymentConfig, CostEstimate } from './types/index.js'
import { CostEstimator } from './cost/cost-estimator.js'
import { CloudManager } from './cloud-manager.js'
import { ProviderFactory } from './providers/provider-factory.js'

/**
 * Deployment helper utilities
 */
export {
  generateDeploymentConfig,
  calculateHealthScore,
  estimateDeploymentDuration,
  generateDeploymentSummary,
  detectFrameworkFromDependencies,
  validateDeploymentReadiness,
} from './utils/deployment-helpers.js';

/**
 * Project analysis utilities
 */
export {
  ProjectAnalyzer,
  createProjectAnalyzer,
  analyzeProject,
} from './utils/project-analyzer.js';

/**
 * Provider selection utilities
 */
export {
  createProviderSelector,
  getProviderRecommendations,
} from './utils/provider-selector.js';

export type {
  ProviderSelectionPreferences,
} from './utils/provider-selector.js';

/**
 * Error handling utilities
 */
export {
  CloudErrorHandler,
  globalCloudErrorHandler,
  createCloudErrorHandler,
  createCloudError,
  handleCloudError,
  withErrorHandling,
} from './utils/error-handler.js';

export {
  CloudErrorCode,
  ErrorSeverity,
  ErrorCategory,
} from './utils/error-handler.js';

export type {
  CloudError,
  ErrorRecoveryStrategy,
} from './utils/error-handler.js';

/**
 * Retry handling utilities
 */
export {
  RetryHandler,
  CircuitBreaker,
  RetryStrategy,
  CircuitState,
  DefaultRetryConfigs,
  globalRetryHandler,
  createRetryHandler,
  retry,
} from './utils/retry-handler.js';

export type {
  RetryConfig,
  RetryAttempt,
  RetryResult,
  CircuitBreakerConfig,
} from './utils/retry-handler.js';

// =====================================
// CLOUD PROVIDERS
// =====================================

/**
 * Base provider abstract class
 */
export { BaseProvider } from './providers/base-provider.js'

/**
 * Concrete provider implementations
 */
export { VercelProvider } from './providers/vercel-provider.js'
export { NetlifyProvider } from './providers/netlify-provider.js'
export { RailwayProvider } from './providers/railway-provider.js'
export { RenderProvider } from './providers/render-provider.js'
export { AWSProvider } from './providers/aws-provider.js'
// Azure and GCP providers are in subdirectories - no direct provider files

// =====================================
// TYPE EXPORTS
// =====================================

/**
 * Core cloud provider types
 */
export type {
  CloudProvider,
  CloudProviderType,
  CloudProviderConfig,
  ProviderCapabilities,
  ProviderFeature,
  CloudProviderRecommendation,
  SetupComplexity,
} from './types/cloud-provider.types.js';

/**
 * Deployment configuration and result types
 */
export type {
  DeploymentConfig,
  DeploymentResult,
  DeploymentStatus,
  DeploymentStrategy,
  DeploymentEnvironment,
  DeploymentLog,
  DeploymentMetadata,
  DeploymentSummary,
  ProjectAnalysis,
  FrameworkType,
  ProgrammingLanguage,
  PackageManager,
  ProjectDependency,
  EnvironmentVariable,
  ProjectSize,
  ProjectComplexity,
} from './types/deployment.types.js';

/**
 * Cost estimation and tracking types
 */
export type {
  CostEstimate,
  MonthlyEstimate,
  TrafficEstimate,
  StorageEstimate,
  AdditionalCost,
  CostOptimization,
  UsageMetrics,
  BudgetConfig,
  CostBreakdown,
  ServiceCost,
} from './types/cost.types.js';

/**
 * Infrastructure configuration types
 */
export type {
  InfrastructureConfig,
  ComputeConfig,
  StorageConfig,
  NetworkConfig,
  SecurityConfig,
  ResourceDefinition,
} from './types/infrastructure.types.js';

/**
 * Monitoring and observability types
 */
export type {
  MonitoringConfig,
  MetricsConfig,
  LoggingConfig,
  AlertingConfig,
  HealthCheckConfig,
  PerformanceMetrics,
  ApplicationMetrics,
  Alert,
  DashboardConfig,
} from './types/monitoring.types.js';

// =====================================
// CONSTANTS
// =====================================

/**
 * Supported cloud providers
 * @deprecated Use getSupportedProviders() from providers/index.ts instead
 */
export const SUPPORTED_PROVIDERS = [
  'vercel',
  'netlify',
  'aws',
  'azure',
  'gcp',
  'railway',
  'render',
  'digitalocean',
  'linode',
  'vultr',
  'fly',
  'cloudflare',
] as const;

/**
 * Supported deployment strategies
 */
export const SUPPORTED_DEPLOYMENT_STRATEGIES = [
  'rolling',
  'blue-green',
  'canary',
  'recreate',
] as const;

/**
 * Supported deployment environments
 */
export const SUPPORTED_ENVIRONMENTS = [
  'development',
  'staging',
  'production',
  'preview',
] as const;

/**
 * Provider feature capabilities mapping
 * @deprecated Use functions from './constants/provider-capabilities.js' instead
 */
export {
  PROVIDER_FEATURE_MAP,
  getProvidersByFeature,
  providerSupportsFeature,
  getProviderFeatures,
  getProvidersWithAllFeatures,
  getProvidersWithAnyFeature,
  compareProviderFeatures,
} from './constants/provider-capabilities.js';

// =====================================
// CONVENIENCE FACTORY FUNCTIONS
// =====================================

/**
 * Create a configured cloud manager instance
 * @param config - Optional cloud manager configuration
 * @returns Configured CloudManager instance
 *
 * @example
 * ```typescript
 * const cloudManager = createCloudManager({
 *   providers: {
 *     vercel: { type: 'vercel', accessToken: 'your-token' }
 *   }
 * });
 * ```
 */
export const createCloudManager = (config?: any): CloudManager => {
  return new CloudManager(config);
};

/**
 * Create a provider factory instance
 * @param options - Optional factory configuration
 * @returns Configured ProviderFactory instance
 *
 * @example
 * ```typescript
 * const factory = createProviderFactory({ enableCaching: true });
 * const vercel = await factory.createProvider('vercel', config);
 * ```
 */
export const createProviderFactory = (options?: any): ProviderFactory => {
  return new ProviderFactory(options);
};


/**
 * Estimate deployment costs for a provider
 * @param provider - Cloud provider type
 * @param config - Deployment configuration
 * @returns Promise resolving to cost estimate
 *
 * @example
 * ```typescript
 * const costEstimate = await estimateDeploymentCosts('vercel', deployConfig);
 * console.log('Monthly cost:', costEstimate.monthly.typical);
 * ```
 */
export const estimateDeploymentCosts = async (
  provider: CloudProviderType,
  config: DeploymentConfig
): Promise<CostEstimate> => {
  const estimator = new CostEstimator();
  return estimator.estimate(provider, config);
};

// =====================================
// MODULE METADATA
// =====================================

/**
 * Cloud module version
 */
export const CLOUD_MODULE_VERSION = '2.0.0';

/**
 * Module build timestamp
 */
export const BUILD_TIMESTAMP = new Date().toISOString();

/**
 * Feature flags for experimental features
 */
export const FEATURE_FLAGS = {
  EXPERIMENTAL_PROVIDERS: false,
  ADVANCED_COST_MODELING: true,
  MULTI_REGION_DEPLOYMENT: false,
  AI_POWERED_OPTIMIZATION: false,
} as const;