/**
 * @fileoverview Base Provider - Abstract foundation for cloud provider implementations
 * @description
 * Enterprise-grade abstract base class that establishes the contract and shared functionality
 * for all cloud provider implementations. Built on the Template Method pattern to ensure
 * consistent behavior across providers while enabling platform-specific customization.
 *
 * ## Design Principles (SOLID)
 * - **Single Responsibility**: Manages provider abstraction and common functionality
 * - **Open/Closed**: Open for extension via concrete providers, closed for modification
 * - **Liskov Substitution**: All provider implementations are fully substitutable
 * - **Interface Segregation**: Focused interface without unnecessary dependencies
 * - **Dependency Inversion**: Concrete providers depend on this abstraction
 *
 * ## Key Features
 * - **Standardized Error Handling**: Consistent error reporting across all providers
 * - **Automatic Retry Logic**: Built-in resilience with configurable retry strategies
 * - **Performance Monitoring**: Real-time metrics and deployment tracking
 * - **Configuration Validation**: Type-safe provider configuration management
 * - **Logging Integration**: Structured logging with provider-specific context
 * - **Cost Tracking**: Unified cost estimation and budgeting across providers
 *
 * ## Template Methods
 * This class defines several abstract methods that concrete providers must implement:
 * - `analyzeProjectImplementation()` - Provider-specific project analysis
 * - `deployImplementation()` - Core deployment logic
 * - `getDeploymentStatusImplementation()` - Status monitoring implementation
 * - `getDeploymentLogsImplementation()` - Log retrieval implementation
 *
 * @version 2.0.0
 * @author AIOS Engineering Team
 * @since 1.0.0
 * @module BaseProvider
 * @category Providers
 * @abstract
 *
 * @example Basic Provider Implementation
 * ```typescript
 * import { BaseProvider } from '@aios/cloud/providers';
 *
 * class VercelProvider extends BaseProvider {
 *   constructor() {
 *     super(
 *       'vercel',
 *       ['zero-config', 'preview-deployments', 'edge-functions'],
 *       ['us-east-1', 'us-west-2', 'eu-west-1']
 *     );
 *   }
 *
 *   protected async deployImplementation(
 *     config: DeploymentConfig
 *   ): Promise<DeploymentResult> {
 *     // Vercel-specific deployment logic
 *     const deployment = await this.callVercelAPI('/deployments', {
 *       method: 'POST',
 *       body: this.buildDeploymentPayload(config)
 *     });
 *
 *     return {
 *       deploymentId: deployment.id,
 *       url: deployment.url,
 *       status: 'deploying',
 *       buildTime: 0,
 *       environment: config.environment,
 *       version: deployment.meta.version
 *     };
 *   }
 *
 *   protected async analyzeProjectImplementation(
 *     projectPath: string
 *   ): Promise<ProjectAnalysis> {
 *     // Vercel-specific project analysis
 *     return await this.detectFrameworkAndDependencies(projectPath);
 *   }
 * }
 * ```
 *
 * @example Advanced Provider with Custom Features
 * ```typescript
 * class EnterpriseAWSProvider extends BaseProvider {
 *   private readonly ssmClient: SSMClient;
 *   private readonly cloudFormationClient: CloudFormationClient;
 *
 *   constructor(config: AWSProviderConfig) {
 *     super('aws', AWS_FEATURES, AWS_REGIONS);
 *     this.initializeAWSClients(config);
 *   }
 *
 *   protected async deployImplementation(
 *     config: DeploymentConfig
 *   ): Promise<DeploymentResult> {
 *     // Multi-stage AWS deployment with infrastructure provisioning
 *     const stack = await this.provisionInfrastructure(config);
 *     const application = await this.deployApplication(config, stack);
 *
 *     return this.aggregateDeploymentResult(stack, application);
 *   }
 *
 *   // Provider-specific method for infrastructure provisioning
 *   private async provisionInfrastructure(
 *     config: DeploymentConfig
 *   ): Promise<CloudFormationStack> {
 *     // AWS CloudFormation stack deployment
 *   }
 * }
 * ```
 */

import type {
  CloudProvider,
  CloudProviderType,
  CloudProviderConfig,
  ProviderCapabilities,
  ProviderFeature,
  ProviderHealthStatus,
} from '../types/cloud-provider.types.js';

import type {
  DeploymentConfig,
  DeploymentResult,
  DeploymentStatus,
  DeploymentLog,
  DeploymentSummary,
  ProjectAnalysis,
} from '../types/deployment.types.js';

import type {
  CostEstimate,
} from '../types/cost.types.js';

import type {
  Result,
  AppError,
} from '../../types/common.types.js';

import {
  createLogger,
  type ILogger,
} from '../../utils/logger.js';

import {
  CloudErrorCode,
  createCloudError,
} from '../utils/error-handler.js';

import {
  globalRetryHandler,
  DefaultRetryConfigs,
} from '../utils/retry-handler.js';

import {
  createProviderNotConfiguredError,
  createMissingRequiredFieldError,
  createInvalidConfigurationError
} from '../../constants/errors.js';

import { UnifiedProjectAnalyzerService } from '../services/unified-project-analyzer.service.js';
import type { IMetricsCollector } from '../../core/metrics/metrics.interface.js';

/**
 * Abstract base provider class implementing common functionality
 * @abstract
 * @class BaseProvider
 * @implements {CloudProvider}
 * @description Provides a foundation for all cloud provider implementations with
 * common functionality, error handling, logging, and validation. Uses the Template
 * Method pattern to define the deployment workflow while allowing concrete providers
 * to customize specific steps.
 *
 * Key features:
 * - Consistent error handling and logging across all providers
 * - Template method pattern for deployment operations
 * - Configuration validation and credential management
 * - Provider capability declaration and validation
 * - Standardized cost estimation framework
 */
export abstract class BaseProvider implements CloudProvider {
  protected readonly logger: ILogger;
  protected readonly projectAnalyzer: UnifiedProjectAnalyzerService;
  protected config?: CloudProviderConfig;

  /**
   * Creates a new BaseProvider instance
   * @param {CloudProviderType} name - The provider name/type
   * @param {ProviderFeature[]} features - List of supported features
   * @param {string[]} regions - List of supported regions
   * @param {IMetricsCollector} metrics - Metrics collector for monitoring
   * @description Initializes the base provider with essential configuration.
   * Sets up logging and validates basic provider parameters.
   */
  constructor(
    public readonly name: CloudProviderType,
    public readonly features: ProviderFeature[],
    public readonly regions: string[],
    metrics?: IMetricsCollector
  ) {
    this.logger = createLogger(`${name}Provider`);
    const metricsCollector = metrics || this.createNoopMetrics();
    this.projectAnalyzer = new UnifiedProjectAnalyzerService(undefined, this.logger, metricsCollector);
    this.validateProviderSetup();
  }

  private createNoopMetrics(): IMetricsCollector {
    return {
      increment: () => {},
      gauge: () => {},
      histogram: () => {},
      timing: () => {}
    };
  }

  /**
   * Configure the provider with credentials and settings
   * @method configure
   * @param {CloudProviderConfig} config - Provider configuration
   * @returns {Promise<void>} Promise that resolves when configuration is complete
   * @description Sets up the provider with authentication credentials and
   * operational parameters. Validates configuration before storing.
   *
   * @example
   * ```typescript
   * await provider.configure({
   *   type: 'vercel',
   *   accessToken: 'your-token',
   *   region: 'us-east-1'
   * });
   * ```
   */
  async configure(config: CloudProviderConfig): Promise<void> {
    try {
      await this.validateConfiguration(config);
      this.config = config;
      this.logger.info('Provider configured successfully', { provider: this.name });
    } catch (error) {
      this.logger.error('Provider configuration failed', error as Error, { provider: this.name });
      throw error;
    }
  }

  /**
   * Analyze project and provide deployment recommendations
   * @method analyzeProject
   * @param {string} projectPath - Absolute path to the project directory
   * @returns {Promise<Result<ProjectAnalysis>>} Project analysis results
   * @description Analyzes the project structure, dependencies, and configuration
   * to provide provider-specific deployment recommendations. Uses the Template
   * Method pattern to allow provider-specific analysis while maintaining consistency.
   */
  async analyzeProject(projectPath: string): Promise<Result<ProjectAnalysis>> {
    try {
      this.ensureConfigured();
      this.logger.info('Starting project analysis', { projectPath, provider: this.name });

      // Use unified analyzer instead of provider-specific implementation
      const retryResult = await globalRetryHandler.retry(
        () => this.projectAnalyzer.analyzeForDeployment(projectPath),
        DefaultRetryConfigs.STANDARD,
        `analyzeProject-${this.name}`
      );

      if (!retryResult.success || !retryResult.result) {
        throw retryResult.error || new Error('Analysis failed');
      }

      const analysis = retryResult.result;

      this.logger.info('Project analysis completed', {
        framework: analysis.framework,
        language: analysis.language,
        provider: this.name
      });

      return { success: true, data: analysis };
    } catch (error) {
      const cloudError = createCloudError(
        CloudErrorCode.PROJECT_ANALYSIS_FAILED,
        'Project analysis failed',
        {
          provider: this.name,
          context: { projectPath },
          cause: error as Error
        }
      );
      this.logger.error('Project analysis failed', cloudError as Error);
      return { success: false, error: cloudError as Error };
    }
  }

  /**
   * Deploy project to the cloud provider
   * @method deploy
   * @param {DeploymentConfig} config - Deployment configuration settings
   * @returns {Promise<Result<DeploymentResult>>} Deployment operation result
   * @description Executes the deployment process using the Template Method pattern.
   * Handles pre-deployment validation, deployment execution, and post-deployment
   * verification in a consistent manner across all providers.
   */
  async deploy(config: DeploymentConfig): Promise<Result<DeploymentResult>> {
    try {
      this.ensureConfigured();
      this.logger.info('Starting deployment', {
        environment: config.environment,
        provider: this.name
      });

      // Pre-deployment validation
      await this.validateDeploymentConfig(config);

      // Execute provider-specific deployment with retry logic
      const retryResult = await globalRetryHandler.retry(
        () => this.deployImplementation(config),
        DefaultRetryConfigs.DEPLOYMENT,
        `deploy-${this.name}`
      );

      if (!retryResult.success || !retryResult.result) {
        throw retryResult.error || new Error('Deployment failed');
      }

      const result = retryResult.result;

      // Post-deployment verification
      await this.verifyDeployment(result);

      this.logger.info('Deployment completed successfully', {
        deploymentId: result.deploymentId,
        url: result.url,
        provider: this.name
      });

      return { success: true, data: result };
    } catch (error) {
      const cloudError = createCloudError(
        CloudErrorCode.DEPLOYMENT_FAILED,
        'Deployment failed',
        {
          provider: this.name,
          context: { environment: config.environment },
          cause: error as Error
        }
      );
      this.logger.error('Deployment failed', cloudError as Error);
      return { success: false, error: cloudError as Error };
    }
  }

  /**
   * Get deployment status
   * @method getDeploymentStatus
   * @param {string} deploymentId - Unique identifier of the deployment
   * @returns {Promise<Result<DeploymentStatus>>} Current deployment status
   * @description Retrieves real-time status information for a specific deployment.
   * Delegates to provider-specific implementation while ensuring consistent error handling.
   */
  async getDeploymentStatus(deploymentId: string): Promise<Result<DeploymentStatus>> {
    try {
      this.ensureConfigured();
      const status = await this.getDeploymentStatusImplementation(deploymentId);
      return { success: true, data: status };
    } catch (error) {
      const appError = this.createAppError(
        'STATUS_FETCH_FAILED',
        'Failed to fetch deployment status',
        error as Error
      );
      return { success: false, error: appError as Error };
    }
  }

  /**
   * Cancel an ongoing deployment
   * @method cancelDeployment
   * @param {string} deploymentId - Unique identifier of the deployment to cancel
   * @returns {Promise<Result<void>>} Cancellation operation result
   * @description Attempts to cancel an in-progress deployment. Success depends on
   * the current deployment phase and provider capabilities.
   */
  async cancelDeployment(deploymentId: string): Promise<Result<void>> {
    try {
      this.ensureConfigured();
      await this.cancelDeploymentImplementation(deploymentId);
      this.logger.info('Deployment cancelled successfully', { deploymentId, provider: this.name });
      return { success: true, data: undefined };
    } catch (error) {
      const appError = this.createAppError(
        'CANCELLATION_FAILED',
        'Failed to cancel deployment',
        error as Error
      );
      return { success: false, error: appError as Error };
    }
  }

  /**
   * Get deployment logs
   * @method getDeploymentLogs
   * @param {string} deploymentId - Unique identifier of the deployment
   * @param {number} [limit] - Maximum number of log entries to retrieve
   * @returns {Promise<Result<DeploymentLog[]>>} Array of deployment log entries
   * @description Retrieves deployment logs for debugging and monitoring purposes.
   * Logs are returned in chronological order with timestamps and severity levels.
   */
  async getDeploymentLogs(deploymentId: string, limit?: number): Promise<Result<DeploymentLog[]>> {
    try {
      this.ensureConfigured();
      const logs = await this.getDeploymentLogsImplementation(deploymentId, limit);
      return { success: true, data: logs };
    } catch (error) {
      const appError = this.createAppError(
        'LOGS_FETCH_FAILED',
        'Failed to fetch deployment logs',
        error as Error
      );
      return { success: false, error: appError as Error };
    }
  }

  /**
   * List all deployments for a project
   * @method listDeployments
   * @param {string} [projectId] - Optional project identifier to filter deployments
   * @param {number} [limit] - Maximum number of deployments to retrieve
   * @returns {Promise<Result<DeploymentSummary[]>>} Array of deployment summaries
   * @description Retrieves a list of deployments, optionally filtered by project.
   * Returns summary information suitable for listing views and selection interfaces.
   */
  async listDeployments(projectId?: string, limit?: number): Promise<Result<DeploymentSummary[]>> {
    try {
      this.ensureConfigured();
      const deployments = await this.listDeploymentsImplementation(projectId, limit);
      return { success: true, data: deployments };
    } catch (error) {
      const appError = this.createAppError(
        'DEPLOYMENTS_FETCH_FAILED',
        'Failed to fetch deployments',
        error as Error
      );
      return { success: false, error: appError as Error };
    }
  }

  /**
   * Rollback to a previous deployment
   * @method rollback
   * @param {string} deploymentId - Identifier of the deployment to rollback to
   * @returns {Promise<Result<DeploymentResult>>} Rollback operation result
   * @description Reverts the application to a previous deployment state.
   * This operation creates a new deployment with the previous version's configuration.
   */
  async rollback(deploymentId: string): Promise<Result<DeploymentResult>> {
    try {
      this.ensureConfigured();
      this.logger.info('Starting rollback', { deploymentId, provider: this.name });

      const result = await this.rollbackImplementation(deploymentId);

      this.logger.info('Rollback completed', {
        originalDeploymentId: deploymentId,
        newDeploymentId: result.deploymentId,
        provider: this.name
      });

      return { success: true, data: result };
    } catch (error) {
      const appError = this.createAppError(
        'ROLLBACK_FAILED',
        'Rollback operation failed',
        error as Error
      );
      this.logger.error('Rollback failed', appError as Error);
      return { success: false, error: appError as Error };
    }
  }

  /**
   * Check if provider is properly configured
   * @method isConfigured
   * @returns {boolean} True if provider is ready for operations
   * @description Validates that all required credentials and configuration
   * are present and valid for deployment operations.
   */
  isConfigured(): boolean {
    return this.config !== undefined && this.validateConfigurationSync(this.config);
  }

  // getCapabilities() is defined as abstract method below

  /**
   * Estimate deployment cost
   * @method estimateCost
   * @param {DeploymentConfig} config - Deployment configuration for cost calculation
   * @returns {Promise<Result<CostEstimate>>} Detailed cost estimation
   * @description Calculates estimated costs for deployment based on resource
   * requirements, usage patterns, and provider pricing models.
   */
  async estimateCost(config: DeploymentConfig): Promise<Result<CostEstimate>> {
    try {
      this.ensureConfigured();
      const estimate = await this.estimateCostImplementation(config);
      return { success: true, data: estimate };
    } catch (error) {
      const appError = this.createAppError(
        'COST_ESTIMATION_FAILED',
        'Cost estimation failed',
        error as Error
      );
      return { success: false, error: appError as Error };
    }
  }

  /**
   * Get provider health status
   * @method getHealthStatus
   * @returns {Promise<Result<ProviderHealthStatus>>} Health status information
   * @description Checks the health and connectivity of the provider services.
   * Returns detailed status information including service availability,
   * response times, and any detected issues.
   */
  async getHealthStatus(): Promise<Result<ProviderHealthStatus>> {
    try {
      const startTime = Date.now();
      const healthStatus = await this.getHealthStatusImplementation();
      const checkDuration = Date.now() - startTime;

      return {
        success: true,
        data: {
          ...healthStatus,
          checkDuration,
          lastChecked: new Date()
        }
      };
    } catch (error) {
      const appError = this.createAppError(
        'HEALTH_CHECK_FAILED',
        'Health status check failed',
        error as Error
      );
      return {
        success: false,
        error: appError as Error
      };
    }
  }

  // =====================================
  // ABSTRACT METHODS - Must be implemented by concrete providers
  // =====================================

  /**
   * Provider-specific deployment implementation
   * @abstract
   * @protected
   * @method deployImplementation
   * @param {DeploymentConfig} config - Deployment configuration
   * @returns {Promise<DeploymentResult>} Deployment result
   * @description Concrete providers must implement this method to handle
   * the actual deployment process using provider-specific APIs and workflows.
   */
  protected abstract deployImplementation(config: DeploymentConfig): Promise<DeploymentResult>;

  /**
   * Provider-specific deployment status implementation
   * @abstract
   * @protected
   * @method getDeploymentStatusImplementation
   * @param {string} deploymentId - Deployment identifier
   * @returns {Promise<DeploymentStatus>} Deployment status
   * @description Concrete providers must implement this method to retrieve
   * deployment status from provider-specific APIs.
   */
  protected abstract getDeploymentStatusImplementation(deploymentId: string): Promise<DeploymentStatus>;

  /**
   * Provider-specific deployment cancellation implementation
   * @abstract
   * @protected
   * @method cancelDeploymentImplementation
   * @param {string} deploymentId - Deployment identifier
   * @returns {Promise<void>} Cancellation completion
   * @description Concrete providers must implement this method to handle
   * deployment cancellation through provider-specific APIs.
   */
  protected abstract cancelDeploymentImplementation(deploymentId: string): Promise<void>;

  /**
   * Provider-specific deployment logs implementation
   * @abstract
   * @protected
   * @method getDeploymentLogsImplementation
   * @param {string} deploymentId - Deployment identifier
   * @param {number} [limit] - Maximum log entries to retrieve
   * @returns {Promise<DeploymentLog[]>} Deployment logs
   * @description Concrete providers must implement this method to retrieve
   * deployment logs from provider-specific logging systems.
   */
  protected abstract getDeploymentLogsImplementation(deploymentId: string, limit?: number): Promise<DeploymentLog[]>;

  /**
   * Provider-specific deployments listing implementation
   * @abstract
   * @protected
   * @method listDeploymentsImplementation
   * @param {string} [projectId] - Optional project filter
   * @param {number} [limit] - Maximum deployments to retrieve
   * @returns {Promise<DeploymentSummary[]>} Deployment summaries
   * @description Concrete providers must implement this method to list
   * deployments from provider-specific APIs.
   */
  protected abstract listDeploymentsImplementation(projectId?: string, limit?: number): Promise<DeploymentSummary[]>;

  /**
   * Provider-specific rollback implementation
   * @abstract
   * @protected
   * @method rollbackImplementation
   * @param {string} deploymentId - Deployment to rollback to
   * @returns {Promise<DeploymentResult>} Rollback result
   * @description Concrete providers must implement this method to handle
   * rollback operations through provider-specific mechanisms.
   */
  protected abstract rollbackImplementation(deploymentId: string): Promise<DeploymentResult>;

  /**
   * Provider-specific cost estimation implementation
   * @abstract
   * @protected
   * @method estimateCostImplementation
   * @param {DeploymentConfig} config - Deployment configuration
   * @returns {Promise<CostEstimate>} Cost estimate
   * @description Concrete providers must implement this method to calculate
   * costs using provider-specific pricing models and resource requirements.
   */
  protected abstract estimateCostImplementation(config: DeploymentConfig): Promise<CostEstimate>;

  // =====================================
  // PROTECTED HELPER METHODS
  // =====================================

  /**
   * Ensure provider is configured before operations
   * @protected
   * @method ensureConfigured
   * @throws {Error} When provider is not configured
   * @description Validates that the provider has been properly configured
   * with required credentials before allowing operations to proceed.
   */
  protected ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw createProviderNotConfiguredError(this.name);
    }
  }

  /**
   * Validate provider setup during construction
   * @private
   * @method validateProviderSetup
   * @throws {Error} When provider setup is invalid
   * @description Validates that the provider was initialized with valid
   * parameters including name, features, and regions.
   */
  private validateProviderSetup(): void {
    if (!this.name) {
      throw createMissingRequiredFieldError('provider name');
    }
    if (!Array.isArray(this.features)) {
      throw createInvalidConfigurationError('Provider features must be an array');
    }
    if (!Array.isArray(this.regions)) {
      throw createInvalidConfigurationError('Provider regions must be an array');
    }
  }

  /**
   * Validate provider configuration asynchronously
   * @protected
   * @method validateConfiguration
   * @param {CloudProviderConfig} config - Configuration to validate
   * @returns {Promise<void>} Validation completion
   * @description Validates provider configuration including credentials,
   * regions, and other provider-specific settings. Can be overridden by
   * concrete providers for custom validation logic.
   */
  protected async validateConfiguration(config: CloudProviderConfig): Promise<void> {
    if (!config) {
      throw createMissingRequiredFieldError('configuration');
    }
    if (config.type !== this.name) {
      throw createInvalidConfigurationError(`Configuration type ${config.type} does not match provider ${this.name}`);
    }
    // Additional validation can be implemented by concrete providers
  }

  /**
   * Validate provider configuration synchronously
   * @protected
   * @method validateConfigurationSync
   * @param {CloudProviderConfig} config - Configuration to validate
   * @returns {boolean} True if configuration is valid
   * @description Synchronous version of configuration validation for
   * use in isConfigured() and other synchronous contexts.
   */
  protected validateConfigurationSync(config: CloudProviderConfig): boolean {
    try {
      if (!config || config.type !== this.name) {
        return false;
      }
      // Additional validation can be implemented by concrete providers
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate deployment configuration
   * @protected
   * @method validateDeploymentConfig
   * @param {DeploymentConfig} config - Deployment configuration
   * @returns {Promise<void>} Validation completion
   * @description Validates deployment configuration before deployment.
   * Can be overridden by concrete providers for custom validation.
   */
  protected async validateDeploymentConfig(config: DeploymentConfig): Promise<void> {
    if (!config) {
      throw createMissingRequiredFieldError('deployment configuration');
    }
    // Additional validation can be implemented by concrete providers
  }

  /**
   * Verify deployment after completion
   * @protected
   * @method verifyDeployment
   * @param {DeploymentResult} result - Deployment result to verify
   * @returns {Promise<void>} Verification completion
   * @description Performs post-deployment verification to ensure the
   * deployment was successful. Can be overridden by concrete providers.
   */
  protected async verifyDeployment(result: DeploymentResult): Promise<void> {
    if (!result.deploymentId) {
      throw createInvalidConfigurationError('Deployment result must include deployment ID');
    }
    // Additional verification can be implemented by concrete providers
  }

  /**
   * Create a structured AppError instance
   * @protected
   * @method createAppError
   * @param {string} code - Error code for categorization
   * @param {string} message - Human-readable error message
   * @param {Error} [cause] - Optional underlying error
   * @returns {AppError} Structured application error
   * @description Creates consistent error objects with proper error chaining
   * and stack trace preservation for debugging and error handling.
   */
  protected createAppError(code: string, message: string, cause?: Error): AppError {
    return {
      name: `${this.name}ProviderError`,
      message,
      code,
      cause,
      stack: cause?.stack || new Error().stack,
    } as AppError;
  }




  /**
   * Provider-specific capabilities definition
   * @abstract
   * @returns {ProviderCapabilities} Provider capabilities
   * @description Concrete providers must implement this method to define
   * their specific capabilities and limitations.
   */
  public abstract getCapabilities(): ProviderCapabilities;

  /**
   * Provider-specific health status check implementation
   * @abstract
   * @protected
   * @returns {Promise<ProviderHealthStatus>} Health status result
   * @description Concrete providers must implement this method to check
   * their health status and connectivity.
   */
  protected abstract getHealthStatusImplementation(): Promise<ProviderHealthStatus>;

  /**
   * Cleanup resources
   * @method cleanup
   * @returns {Promise<void>} Cleanup completion
   * @description Performs cleanup of any resources held by the provider.
   * Called when the provider is being disposed or shutdown.
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up provider resources', { provider: this.name });
    // Base implementation does nothing - concrete providers can override
  }
}