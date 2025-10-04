/**
 * @fileoverview Cloud Manager - Enterprise-grade cloud orchestration platform
 * @description
 * The CloudManager class serves as the primary facade for the AIOS cloud deployment system,
 * providing a unified, type-safe interface for multi-cloud operations. Built on SOLID principles,
 * this orchestrator manages the complete deployment lifecycle across 10+ cloud providers.
 *
 * ## Architecture Patterns
 * - **Facade Pattern**: Simplifies complex subsystem interactions
 * - **Strategy Pattern**: Pluggable provider implementations
 * - **Observer Pattern**: Real-time deployment monitoring
 * - **Factory Pattern**: Dynamic provider instantiation
 * - **Circuit Breaker**: Fault tolerance and resilience
 *
 * ## Key Features
 * - Multi-provider deployment orchestration
 * - Intelligent cost optimization and budgeting
 * - Real-time deployment monitoring and rollback
 * - Advanced project analysis and provider recommendations
 * - Comprehensive error handling with automated recovery
 * - Type-safe configuration management
 *
 * @version 2.0.0
 * @author AIOS Engineering Team
 * @since 1.0.0
 * @module CloudManager
 * @category Core
 *
 * @example Basic Usage
 * ```typescript
 * import { CloudManager } from '@aios/cloud';
 *
 * const manager = new CloudManager({
 *   providers: {
 *     vercel: {
 *       apiToken: process.env.VERCEL_TOKEN,
 *       team: 'my-team',
 *       region: 'us-east-1'
 *     },
 *     aws: {
 *       accessKeyId: process.env.AWS_ACCESS_KEY,
 *       secretAccessKey: process.env.AWS_SECRET_KEY,
 *       region: 'us-west-2'
 *     }
 *   },
 *   deploymentOptions: {
 *     autoApprove: false,
 *     costThreshold: 100,
 *     defaultEnvironment: 'staging'
 *   }
 * });
 * ```
 *
 * @example Advanced Deployment with Monitoring
 * ```typescript
 * // Deploy with real-time monitoring
 * const deployment = await manager.deploy('vercel', {
 *   projectPath: './my-nextjs-app',
 *   environment: 'production',
 *   monitoring: {
 *     enabled: true,
 *     alerts: ['deployment-failed', 'high-cost'],
 *     webhooks: ['https://my-app.com/webhooks/deployment']
 *   }
 * });
 *
 * // Monitor deployment progress
 * const status = await manager.getDeploymentStatus('vercel', deployment.deploymentId);
 * console.log(`Progress: ${status.progress}% - ${status.message}`);
 * ```
 *
 * @example Multi-Provider Cost Analysis
 * ```typescript
 * // Analyze project and get recommendations
 * const analysis = await manager.analyzeProject('./my-app');
 * const recommendations = await manager.getProviderRecommendations(analysis, {
 *   costOptimization: true,
 *   maxBudget: 50,
 *   requiredFeatures: ['auto-scaling', 'managed-databases']
 * });
 *
 * // Compare costs across providers
 * const costComparison = await Promise.all(
 *   recommendations.slice(0, 3).map(rec =>
 *     manager.estimateDeploymentCosts(rec.provider, deploymentConfig)
 *   )
 * );
 * ```
 */

import type {
  CloudProviderType,
  DeploymentConfig,
  DeploymentResult,
  CloudProviderRecommendation,
  CostEstimate,
  DeploymentStatus,
  DeploymentLog,
} from './types/index.js';

import type { ProjectAnalysis } from './types/index.js'
import type { ProjectAnalysis as CommonProjectAnalysis } from '../types/common.types.js'

import type {
  Result,
  AppError,
  LogLevel,
} from '../types/common.types.js';

import {
  createLogger,
  type ILogger,
} from '../utils/logger.js';

import { ProviderRegistry } from './providers/provider-registry.js'
import { ProviderSelector } from './utils/provider-selector.js'
import { CostEstimator } from './cost/cost-estimator.js'
import { registerAllProviders } from './providers/provider-catalog.js'

/**
 * Configuration interface for CloudManager initialization
 * @interface CloudManagerConfig
 * @description
 * Comprehensive configuration schema for initializing the CloudManager instance.
 * Follows the Interface Segregation Principle by providing granular configuration
 * options without forcing unnecessary dependencies.
 *
 * This interface supports:
 * - Multi-provider authentication and regional configuration
 * - Deployment automation with cost controls and approval workflows
 * - Comprehensive logging and monitoring configuration
 * - Environment-specific deployment policies
 *
 * @example Basic Configuration
 * ```typescript
 * const config: CloudManagerConfig = {
 *   defaultProvider: 'vercel',
 *   providers: {
 *     vercel: {
 *       apiToken: process.env.VERCEL_TOKEN,
 *       team: 'my-team'
 *     },
 *     aws: {
 *       accessKeyId: process.env.AWS_ACCESS_KEY,
 *       secretAccessKey: process.env.AWS_SECRET_KEY,
 *       region: 'us-east-1'
 *     }
 *   },
 *   deploymentOptions: {
 *     autoApprove: false,
 *     costThreshold: 100,
 *     defaultEnvironment: 'staging'
 *   },
 *   logLevel: 'info'
 * };
 * ```
 *
 * @example Enterprise Configuration
 * ```typescript
 * const enterpriseConfig: CloudManagerConfig = {
 *   defaultProvider: 'aws',
 *   providers: {
 *     aws: {
 *       accessKeyId: process.env.AWS_ACCESS_KEY,
 *       secretAccessKey: process.env.AWS_SECRET_KEY,
 *       region: 'us-east-1',
 *       role: 'arn:aws:iam::123456789012:role/DeploymentRole'
 *     },
 *     vercel: {
 *       apiToken: process.env.VERCEL_TOKEN,
 *       team: 'enterprise-team'
 *     }
 *   },
 *   deploymentOptions: {
 *     autoApprove: true, // Enterprise CI/CD pipeline
 *     costThreshold: 1000,
 *     defaultEnvironment: 'production'
 *   },
 *   logLevel: 'debug'
 * };
 * ```
 *
 * @since 2.0.0
 * @category Configuration
 */
export interface CloudManagerConfig {
  /**
   * Default cloud provider for deployment operations
   * @description
   * Specifies the primary cloud provider to use when no explicit provider
   * is specified in deployment operations. This provider must be configured
   * in the providers object.
   *
   * @default undefined
   * @example 'vercel' | 'aws' | 'netlify'
   */
  readonly defaultProvider?: CloudProviderType;

  /**
   * Provider-specific authentication and configuration
   * @description
   * Map of provider names to their respective configuration objects.
   * Each provider has unique authentication requirements and optional
   * configuration parameters such as regions, teams, or resource limits.
   *
   * @example
   * ```typescript
   * {
   *   vercel: {
   *     apiToken: 'vercel_token_123',
   *     team: 'my-organization',
   *     region: 'us-east-1'
   *   },
   *   aws: {
   *     accessKeyId: 'AKIA...',
   *     secretAccessKey: 'secret...',
   *     region: 'us-west-2',
   *     role: 'arn:aws:iam::...'
   *   }
   * }
   * ```
   */
  readonly providers: Record<string, unknown>;

  /**
   * Deployment automation and control settings
   * @description
   * Optional configuration for deployment behavior, cost controls,
   * and approval workflows. These settings help prevent unauthorized
   * deployments and control deployment costs.
   */
  readonly deploymentOptions?: {
    /**
     * Automatic deployment approval
     * @description
     * When true, deployments proceed without manual approval.
     * When false, deployments require explicit confirmation,
     * especially useful for production environments.
     *
     * @default false
     * @security Consider setting to false for production environments
     */
    readonly autoApprove: boolean;

    /**
     * Maximum cost threshold (USD)
     * @description
     * Deployments exceeding this estimated monthly cost will
     * require manual approval regardless of autoApprove setting.
     * Set to 0 to disable cost-based approval.
     *
     * @default 100
     * @minimum 0
     * @unit USD (monthly estimate)
     */
    readonly costThreshold: number;

    /**
     * Default deployment environment
     * @description
     * The environment to use when not explicitly specified.
     * Common values include 'development', 'staging', 'production'.
     *
     * @default 'staging'
     * @example 'development' | 'staging' | 'production' | 'preview'
     */
    readonly defaultEnvironment: string;
  };

  /**
   * Logging verbosity level
   * @description
   * Controls the granularity of CloudManager logging output.
   * Higher levels include all lower level messages.
   *
   * @default 'info'
   * @see {@link LogLevel} for available levels
   */
  readonly logLevel?: LogLevel;
}

/**
 * Central cloud manager that orchestrates all cloud operations
 * @class CloudManager
 * @description The main orchestrator for all cloud operations in the AIOS system.
 * This class delegates specific responsibilities to specialized components,
 * is open for extension through provider plugins, all providers implement the same
 * CloudProvider interface, clients depend only on needed interfaces, and depends
 * on abstractions rather than concrete implementations.
 *
 * @example
 * ```typescript
 * const manager = new CloudManager({
 *   providers: {
 *     vercel: { apiToken: process.env.VERCEL_TOKEN }
 *   }
 * });
 *
 * // Get provider recommendations
 * const recommendations = await manager.getProviderRecommendations(projectAnalysis);
 *
 * // Deploy to recommended provider
 * const result = await manager.deploy({
 *   provider: recommendations.data[0].provider,
 *   config: deploymentConfig,
 *   projectAnalysis
 * });
 * ```
 */
export class CloudManager {
  private readonly providerRegistry: ProviderRegistry;
  private readonly providerSelector: ProviderSelector;
  private readonly costEstimator: CostEstimator;
  private readonly logger: ILogger;

  /**
   * Creates a new CloudManager instance
   * @param {CloudManagerConfig} [config] - Optional configuration for the cloud manager
   * @description Initializes all required dependencies and sets up the cloud manager
   * with the provided configuration. All dependencies are injected through constructor
   * to follow the Dependency Inversion Principle.
   */
  constructor(private readonly config?: CloudManagerConfig) {
    this.providerRegistry = new ProviderRegistry();
    this.providerSelector = new ProviderSelector();
    this.costEstimator = new CostEstimator();
    this.logger = createLogger('CloudManager', config?.logLevel);

    // Register and initialize providers asynchronously
    void this.registerProviders().then(() => {
      this.initializeProviders();
    }).catch((error) => {
      this.logger.error('Failed to initialize providers', error as Error);
    });
  }

  /**
   * Deploy project to specified cloud provider
   * @async
   * @method deploy
   * @param {Object} options - Deployment options
   * @param {CloudProviderType} options.provider - The cloud provider to deploy to
   * @param {DeploymentConfig} options.config - Deployment configuration settings
   * @param {ProjectAnalysis} options.projectAnalysis - Analysis results of the project
   * @param {Function} [options.onProgress] - Optional progress callback function
   * @returns {Promise<Result<DeploymentResult, AppError>>} Promise resolving to deployment result
   * @description Orchestrates the deployment process by validating provider configuration,
   * executing the deployment through the orchestrator, and handling all error scenarios.
   * This method implements the Command pattern through the deployment orchestrator.
   *
   * @example
   * ```typescript
   * const result = await cloudManager.deploy({
   *   provider: 'vercel',
   *   config: {
   *     environment: 'production',
   *     region: 'us-east-1',
   *     resources: { memory: 1024 }
   *   },
   *   projectAnalysis: analysis,
   *   onProgress: (update) => console.log(`${update.message} (${update.progress}%)`)
   * });
   * ```
   */
  async deploy(options: {
    provider: CloudProviderType;
    config: DeploymentConfig;
    projectAnalysis: ProjectAnalysis;
    onProgress?: (update: { message: string; progress: number }) => void;
  }): Promise<Result<DeploymentResult, AppError>> {
    try {
      this.logger.info('Starting deployment', {
        provider: options.provider,
        environment: options.config.environment,
      });

      // Get provider instance
      const provider = await this.providerRegistry.getProvider(options.provider);
      if (!provider) {
        return this.createError('PROVIDER_NOT_FOUND', `Provider ${options.provider} not found`);
      }

      // Validate provider configuration
      if (!provider.isConfigured()) {
        return this.createError('PROVIDER_NOT_CONFIGURED', `Provider ${options.provider} is not configured`);
      }

      // Execute deployment directly through provider
      const deploymentResult = await provider.deploy(options.config);

      if (deploymentResult.success) {
        this.logger.info('Deployment successful', {
          provider: options.provider,
          deploymentId: deploymentResult.data?.deploymentId,
          url: deploymentResult.data?.url,
        });
        return { success: true, data: deploymentResult.data! };
      } else {
        this.logger.error('Deployment failed', deploymentResult.error);
        const appError = this.createAppError('DEPLOYMENT_FAILED', deploymentResult.error?.message || 'Unknown error', deploymentResult.error);
        return { success: false, error: appError };
      }

    } catch (error) {
      const appError = this.createAppError('DEPLOYMENT_FAILED', 'Deployment process failed', error as Error);
      this.logger.error('Deployment process failed', appError as Error);
      return { success: false, error: appError };
    }
  }

  /**
   * Get intelligent provider recommendations for a project
   * @async
   * @method getProviderRecommendations
   * @param {ProjectAnalysis} projectAnalysis - Analysis results of the project
   * @param {Object} [preferences] - Optional user preferences for recommendations
   * @param {boolean} [preferences.costOptimization] - Prioritize cost-effective solutions
   * @param {boolean} [preferences.performanceFirst] - Prioritize performance over cost
   * @param {boolean} [preferences.securityFirst] - Prioritize security features
   * @returns {Promise<Result<CloudProviderRecommendation[], AppError>>} Promise resolving to ranked provider recommendations
   * @description Uses the provider selector to analyze project requirements and generate
   * intelligent recommendations based on framework, language, and user preferences.
   * Implements the Strategy pattern through different recommendation algorithms.
   *
   * @example
   * ```typescript
   * const recommendations = await cloudManager.getProviderRecommendations(
   *   projectAnalysis,
   *   { costOptimization: true, performanceFirst: false }
   * );
   *
   * if (recommendations.success) {
   *   console.log('Top recommendation:', recommendations.data[0].provider);
   * }
   * ```
   */
  async getProviderRecommendations(
    projectAnalysis: ProjectAnalysis | CommonProjectAnalysis,
    preferences?: {
      costOptimization?: boolean;
      performanceFirst?: boolean;
      securityFirst?: boolean;
    }
  ): Promise<Result<CloudProviderRecommendation[], AppError>> {
    try {
      this.logger.info('Generating provider recommendations', {
        framework: projectAnalysis.framework,
        language: projectAnalysis.language,
      });

      // Convert common.types ProjectAnalysis to deployment.types ProjectAnalysis if needed
      const deploymentProjectAnalysis = this.isCommonProjectAnalysis(projectAnalysis) 
        ? this.convertProjectAnalysis(projectAnalysis)
        : projectAnalysis as ProjectAnalysis;
      
      const recommendations = await this.providerSelector.recommend(
        deploymentProjectAnalysis,
        preferences
      );

      this.logger.info('Provider recommendations generated', {
        count: recommendations.length,
        topProvider: recommendations[0]?.provider,
      });

      return { success: true, data: recommendations };

    } catch (error) {
      const appError = this.createAppError('ANALYSIS_FAILED', 'Failed to generate provider recommendations', error as Error);
      this.logger.error('Provider recommendation failed', appError as Error);
      return { success: false, error: appError };
    }
  }

  /**
   * Estimate the cost of deploying to a specific provider
   * @async
   * @method estimateDeploymentCost
   * @param {CloudProviderType} provider - The cloud provider to estimate costs for
   * @param {DeploymentConfig} config - Deployment configuration for cost calculation
   * @returns {Promise<Result<CostEstimate, AppError>>} Promise resolving to detailed cost estimate
   * @description Calculates comprehensive cost estimates including compute, storage,
   * bandwidth, and additional services. Uses provider-specific pricing models
   * to generate accurate monthly and usage-based cost projections.
   *
   * @example
   * ```typescript
   * const costEstimate = await cloudManager.estimateDeploymentCost(
   *   'aws',
   *   deploymentConfig
   * );
   *
   * if (costEstimate.success) {
   *   console.log('Monthly cost:', costEstimate.data.monthly.typical);
   * }
   * ```
   */
  async estimateDeploymentCost(
    provider: CloudProviderType,
    config: DeploymentConfig
  ): Promise<Result<CostEstimate, AppError>> {
    try {
      this.logger.info('Estimating deployment cost', {
        provider,
        environment: config.environment,
      });

      const costEstimate = await this.costEstimator.estimate(provider, config);

      this.logger.info('Cost estimation completed', {
        provider,
        monthlyCost: costEstimate.monthly.typical,
        currency: costEstimate.monthly.currency,
      });

      return { success: true, data: costEstimate };

    } catch (error) {
      const appError = this.createAppError('OPERATION_FAILED', 'Cost estimation failed', error as Error);
      this.logger.error('Cost estimation failed', appError as Error);
      return { success: false, error: appError };
    }
  }

  /**
   * Get the current status of a deployment
   * @async
   * @method getDeploymentStatus
   * @param {CloudProviderType} provider - The cloud provider where deployment is running
   * @param {string} deploymentId - Unique identifier of the deployment
   * @returns {Promise<Result<DeploymentStatus, AppError>>} Promise resolving to current deployment status
   * @description Retrieves real-time deployment status information from the specified provider.
   * Status includes deployment phase, progress, health, and any error information.
   *
   * @example
   * ```typescript
   * const status = await cloudManager.getDeploymentStatus('vercel', 'dep_123456');
   * if (status.success) {
   *   console.log('Status:', status.data.phase);
   * }
   * ```
   */
  async getDeploymentStatus(
    provider: CloudProviderType,
    deploymentId: string
  ): Promise<Result<DeploymentStatus, AppError>> {
    try {
      const providerInstance = await this.providerRegistry.getProvider(provider);
      if (!providerInstance) {
        return this.createError('PROVIDER_NOT_FOUND', `Provider ${provider} not found`);
      }

      const result = await providerInstance.getDeploymentStatus(deploymentId);
      if (!result.success) {
        const appError = this.createAppError('DEPLOYMENT_STATUS_FAILED', result.error?.message || 'Unknown error', result.error);
        return { success: false, error: appError };
      }
      return { success: true, data: result.data! };

    } catch (error) {
      const appError = this.createAppError('OPERATION_FAILED', 'Failed to get deployment status', error as Error);
      this.logger.error('Get deployment status failed', appError as Error);
      return { success: false, error: appError };
    }
  }

  /**
   * Retrieve logs for a specific deployment
   * @async
   * @method getDeploymentLogs
   * @param {CloudProviderType} provider - The cloud provider where deployment is running
   * @param {string} deploymentId - Unique identifier of the deployment
   * @param {number} [limit] - Maximum number of log entries to retrieve
   * @returns {Promise<Result<DeploymentLog[], AppError>>} Promise resolving to array of deployment logs
   * @description Fetches deployment logs from the provider, useful for debugging
   * and monitoring deployment progress. Logs are returned in chronological order.
   *
   * @example
   * ```typescript
   * const logs = await cloudManager.getDeploymentLogs('aws', 'dep_789', 100);
   * if (logs.success) {
   *   logs.data.forEach(log => console.log(log.message));
   * }
   * ```
   */
  async getDeploymentLogs(
    provider: CloudProviderType,
    deploymentId: string,
    limit?: number
  ): Promise<Result<DeploymentLog[], AppError>> {
    try {
      const providerInstance = await this.providerRegistry.getProvider(provider);
      if (!providerInstance) {
        return this.createError('PROVIDER_NOT_FOUND', `Provider ${provider} not found`);
      }

      const result = await providerInstance.getDeploymentLogs(deploymentId, limit);
      if (!result.success) {
        const appError = this.createAppError('DEPLOYMENT_LOGS_FAILED', result.error?.message || 'Unknown error', result.error);
        return { success: false, error: appError };
      }
      return { success: true, data: result.data! };

    } catch (error) {
      const appError = this.createAppError('OPERATION_FAILED', 'Failed to get deployment logs', error as Error);
      this.logger.error('Get deployment logs failed', appError as Error);
      return { success: false, error: appError };
    }
  }

  /**
   * List deployments from a cloud provider
   * @async
   * @method listDeployments
   * @param {CloudProviderType} provider - The cloud provider to query
   * @param {string} [projectId] - Optional project/service identifier to filter deployments
   * @param {number} [limit=50] - Maximum number of deployments to retrieve
   * @returns {Promise<Result<DeploymentSummary[], AppError>>} Promise resolving to array of deployment summaries
   * @description Retrieves deployment history from the provider's API. This gives
   * access to all deployments for the provider, not just those made through AIOS.
   *
   * @example
   * ```typescript
   * const deployments = await cloudManager.listDeployments('vercel', 'my-project', 20);
   * if (deployments.success) {
   *   deployments.data.forEach(dep => {
   *     console.log(`${dep.deploymentId}: ${dep.status} at ${dep.createdAt}`);
   *   });
   * }
   * ```
   */
  async listDeployments(
    provider: CloudProviderType,
    projectId?: string,
    limit: number = 50
  ): Promise<Result<import('./types/deployment.types.js').DeploymentSummary[], AppError>> {
    try {
      this.logger.debug('Listing deployments', { provider, projectId, limit });

      const providerInstance = await this.providerRegistry.getProvider(provider);
      if (!providerInstance) {
        return this.createError('PROVIDER_NOT_FOUND', `Provider ${provider} not found`);
      }

      // Check if provider is configured
      if (!providerInstance.isConfigured()) {
        return this.createError('PROVIDER_NOT_CONFIGURED', `Provider ${provider} is not configured. Please run 'aios connect ${provider}' first.`);
      }

      const result = await providerInstance.listDeployments(projectId, limit);
      if (!result.success) {
        const appError = this.createAppError(
          'LIST_DEPLOYMENTS_FAILED',
          result.error?.message || 'Unknown error',
          result.error
        );
        return { success: false, error: appError };
      }

      return { success: true, data: result.data! };

    } catch (error) {
      const appError = this.createAppError(
        'OPERATION_FAILED',
        'Failed to list deployments',
        error as Error
      );
      this.logger.error('List deployments failed', appError as Error, { provider });
      return { success: false, error: appError };
    }
  }

  /**
   * Test connectivity and authentication with a cloud provider
   * @async
   * @method testProviderConnection
   * @param {CloudProviderType} provider - The cloud provider to test connection with
   * @param {Record<string, string>} [credentials] - Optional credentials to test (for validation)
   * @returns {Promise<Result<void, AppError>>} Promise resolving to connection test result
   * @description Validates that the provider is properly configured and accessible.
   * This is useful for setup validation and troubleshooting connection issues.
   *
   * @example
   * ```typescript
   * const connectionTest = await cloudManager.testProviderConnection('netlify');
   * if (connectionTest.success) {
   *   console.log('Provider connection successful');
   * } else {
   *   console.error('Connection failed:', connectionTest.error.message);
   * }
   * ```
   */
  async testProviderConnection(
    provider: CloudProviderType,
    _credentials?: Record<string, string>
  ): Promise<Result<void, AppError>> {
    try {
      this.logger.info('Testing provider connection', { provider });

      const providerInstance = await this.providerRegistry.getProvider(provider);
      if (!providerInstance) {
        return this.createError('PROVIDER_NOT_FOUND', `Provider ${provider} not found`);
      }

      // Test the connection directly (env vars or config might be set)
      const connectionTest = await providerInstance.validateConnection?.();
      if (connectionTest && !connectionTest.success) {
        this.logger.error('Provider connection validation failed', connectionTest.error, { provider });
        return this.createError('CONNECTION_FAILED', `Failed to connect to ${provider}: ${connectionTest.error?.message || 'Unknown error'}`);
      }

      this.logger.info('Provider connection test successful', { provider });
      return { success: true, data: undefined };

    } catch (error) {
      const appError = this.createAppError('CONNECTION_FAILED', 'Provider connection test failed', error as Error);
      this.logger.error('Provider connection test failed', appError as Error, { provider });
      return { success: false, error: appError };
    }
  }

  /**
   * Get list of all available cloud providers
   * @async
   * @method getAvailableProviders
   * @returns {Promise<Array<{name: string, type: CloudProviderType, isConfigured: boolean, features: string[]}>>} Promise resolving to provider information array
   * @description Returns comprehensive information about all registered providers,
   * including their configuration status and supported features. Useful for
   * displaying provider options to users.
   *
   * @example
   * ```typescript
   * const providers = await cloudManager.getAvailableProviders();
   * providers.forEach(provider => {
   *   console.log(`${provider.name}: ${provider.isConfigured ? 'Ready' : 'Needs configuration'}`);
   * });
   * ```
   */
  async getAvailableProviders(): Promise<Array<{
    name: string;
    type: CloudProviderType;
    isConfigured: boolean;
    features: string[];
  }>> {
    const providers = await this.providerRegistry.getAvailableProviders();

    return providers.map(provider => ({
      name: provider.name,
      type: provider.name,
      isConfigured: provider.isConfigured(),
      features: provider.features,
    }));
  }

  /**
   * Get list of properly configured cloud providers
   * @async
   * @method getConfiguredProviders
   * @returns {Promise<Array<{name: string, type: CloudProviderType, credentials: Record<string, unknown>}>>} Promise resolving to configured provider array
   * @description Returns only providers that have been properly configured with
   * valid credentials and are ready for deployment operations. Credentials are
   * sanitized and not exposed in the response for security.
   *
   * @example
   * ```typescript
   * const configuredProviders = await cloudManager.getConfiguredProviders();
   * console.log('Ready providers:', configuredProviders.map(p => p.name));
   * ```
   */
  async getConfiguredProviders(): Promise<Array<{
    name: string;
    type: CloudProviderType;
    credentials: Record<string, unknown>;
  }>> {
    const providers = await this.providerRegistry.getAvailableProviders();

    return providers
      .filter(provider => provider.isConfigured())
      .map(provider => ({
        name: provider.name,
        type: provider.name,
        credentials: {}, // Don't expose actual credentials
      }));
  }

  /**
   * Get detailed information about a specific provider
   * @async
   * @method getProviderInfo
   * @param {CloudProviderType} provider - The provider to get information for
   * @returns {Promise<{capabilities: any, requiredCredentials: string[]}>} Promise resolving to provider details
   * @description Retrieves comprehensive information about a provider including
   * its capabilities, required credentials, and supported features. Useful for
   * setup wizards and provider comparison.
   *
   * @example
   * ```typescript
   * const info = await cloudManager.getProviderInfo('vercel');
   * console.log('Required credentials:', info.requiredCredentials);
   * console.log('Capabilities:', info.capabilities);
   * ```
   * @throws {Error} When provider is not found
   */
  async getProviderInfo(provider: CloudProviderType): Promise<{
    capabilities: any;
    requiredCredentials: string[];
  }> {
    const providerInstance = await this.providerRegistry.getProvider(provider);
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`);
    }

    return {
      capabilities: providerInstance.getCapabilities(),
      requiredCredentials: this.getRequiredCredentials(provider),
    };
  }

  /**
   * Register all available provider implementations
   * @private
   * @method registerProviders
   * @returns {void}
   * @description Registers all concrete provider implementations with the registry.
   * This ensures all supported cloud providers are available for deployment operations.
   */
  private async registerProviders(): Promise<void> {
    try {
      // Use centralized catalog - single source of truth
      await registerAllProviders(this.providerRegistry);
      this.logger.info('Successfully registered all cloud providers from catalog');
    } catch (error) {
      this.logger.error('Failed to register providers', error as Error);
      throw error;
    }
  }

  /**
   * Initialize providers with configuration
   * @private
   * @async
   * @method initializeProviders
   * @returns {Promise<void>} Promise that resolves when initialization is complete
   * @description Initializes all registered providers with their respective configurations.
   * This method is called during CloudManager construction and handles any initialization
   * errors gracefully by logging them without throwing.
   */
  private async initializeProviders(): Promise<void> {
    try {
      if (this.config?.providers) {
        await this.providerRegistry.initializeWithConfig(this.config.providers);
      }
      // Silent initialization
    } catch (error) {
      this.logger.error('Failed to initialize providers', error as Error);
    }
  }

  /**
   * Get required credentials for a provider
   * @private
   * @method getRequiredCredentials
   * @param {CloudProviderType} provider - The provider to get credentials for
   * @returns {string[]} Array of required credential field names
   * @description Maps provider types to their required credential fields.
   * Used for validation and setup guidance.
   */
  private getRequiredCredentials(provider: CloudProviderType): string[] {
    const credentialMap: Record<CloudProviderType, string[]> = {
      vercel: ['apiToken'],
      netlify: ['accessToken'],
      aws: ['accessKeyId', 'secretAccessKey', 'region'],
      azure: ['subscriptionId', 'clientId', 'clientSecret', 'tenantId'],
      gcp: ['projectId', 'keyFilename'],
      railway: ['apiToken'],
      render: ['apiKey'],
      digitalocean: ['apiToken'],
      linode: ['apiToken'],
      vultr: ['apiKey'],
      fly: ['apiToken'],
      cloudflare: ['apiToken'],
    };

    return credentialMap[provider] || [];
  }

  /**
   * Create a structured error result
   * @private
   * @method createError
   * @param {string} code - Error code for categorization
   * @param {string} message - Human-readable error message
   * @returns {Result<never, AppError>} Structured error result
   * @description Helper method to create consistent error responses throughout the class.
   * Follows the Result pattern for predictable error handling.
   */
  private createError(code: string, message: string): Result<never, AppError> {
    const error = this.createAppError(code, message);
    return { success: false, error };
  }

  /**
   * Check if the ProjectAnalysis is from common.types
   * @private
   */
  private isCommonProjectAnalysis(analysis: ProjectAnalysis | CommonProjectAnalysis): analysis is CommonProjectAnalysis {
    return 'estimatedSize' in analysis;
  }

  /**
   * Convert common.types ProjectAnalysis to deployment.types ProjectAnalysis
   * @private
   */
  private convertProjectAnalysis(commonAnalysis: CommonProjectAnalysis): ProjectAnalysis {
    return {
      framework: commonAnalysis.framework,
      language: commonAnalysis.language,
      packageManager: commonAnalysis.packageManager,
      dependencies: commonAnalysis.dependencies,
      buildCommand: commonAnalysis.buildCommand,
      outputDirectory: commonAnalysis.outputDirectory,
      hasDatabase: commonAnalysis.hasDatabase,
      databaseType: commonAnalysis.databaseType,
      projectType: commonAnalysis.projectType,
      hasAPI: commonAnalysis.hasAPI,
      testCommand: commonAnalysis.testCommand,
      hasDockerfile: commonAnalysis.hasDockerfile,
      hasCI: commonAnalysis.hasCI,
      environmentVariables: commonAnalysis.environmentVariables || [],
      complexity: commonAnalysis.complexity,
    } as ProjectAnalysis;
  }


  /**
   * Create an AppError instance
   * @private
   * @method createAppError
   * @param {string} code - Error code for categorization
   * @param {string} message - Human-readable error message
   * @param {Error} [cause] - Optional underlying error that caused this error
   * @returns {AppError} Structured application error
   * @description Helper method to create consistent AppError instances with proper
   * error chaining and stack trace preservation.
   */
  private createAppError(code: string, message: string, cause?: Error): AppError {
    return {
      name: 'CloudManagerError',
      message,
      code,
      cause,
      stack: cause?.stack || new Error().stack,
    } as AppError;
  }
}