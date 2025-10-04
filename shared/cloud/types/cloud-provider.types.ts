/**
 * @fileoverview Cloud Provider Types - Provider configurations and capabilities
 * @description Comprehensive type definitions for cloud provider abstractions,
 * capabilities, and configurations. These types form the foundation of the
 * provider-agnostic cloud deployment system, enabling consistent interfaces
 * across different cloud platforms.
 *
 * This module follows the Strategy pattern by defining common interfaces that
 * all cloud providers must implement, allowing for interchangeable provider
 * implementations without changing client code.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import type { Result, FrameworkType, ProgrammingLanguage } from '../../types/common.types.js'
import type { ProjectAnalysis, DeploymentConfig, DeploymentResult, DeploymentStatus, DeploymentLog, DeploymentSummary } from './deployment.types.js'
import type { CostEstimate } from './cost.types.js'

/**
 * Supported cloud providers
 * @typedef {string} CloudProviderType
 * @description Union type representing all supported cloud platform providers.
 * Each provider implements the CloudProvider interface with platform-specific
 * deployment, monitoring, and management capabilities.
 *
 * @example
 * ```typescript
 * const provider: CloudProviderType = 'vercel';
 * const deployment = await cloudManager.deploy({ provider, config, analysis });
 * ```
 */
export type CloudProviderType =
  | 'vercel'     // Vercel platform - Next.js optimized
  | 'netlify'    // Netlify - JAMstack focused
  | 'aws'        // Amazon Web Services - Full cloud platform
  | 'azure'      // Microsoft Azure - Enterprise cloud platform
  | 'gcp'        // Google Cloud Platform - Machine learning and scale
  | 'railway'    // Railway - Developer-friendly platform
  | 'render'     // Render - Modern cloud platform
  | 'digitalocean' // DigitalOcean - Simple cloud computing
  | 'linode'     // Linode - High performance cloud
  | 'vultr'      // Vultr - High frequency compute
  | 'fly'        // Fly.io - Edge-first platform
  | 'cloudflare'; // Cloudflare Workers

/**
 * Provider features
 * @typedef {string} ProviderFeature
 * @description Union type representing all possible features that cloud providers
 * can support. Used for capability discovery and provider recommendation logic.
 * Features are categorized by deployment, infrastructure, and platform capabilities.
 *
 * @example
 * ```typescript
 * const requiredFeatures: ProviderFeature[] = ['zero-config', 'preview-deployments'];
 * const compatibleProviders = await findProvidersWithFeatures(requiredFeatures);
 * ```
 */
export type ProviderFeature =
  // Deployment Features
  | 'zero-config'            // Minimal configuration required
  | 'auto-scaling'           // Automatic resource scaling
  | 'blue-green-deployment'  // Zero-downtime deployment strategy
  | 'canary-deployment'      // Gradual traffic shifting
  | 'preview-deployments'    // Branch-based preview environments
  | 'rollback'               // Easy rollback to previous versions
  // Infrastructure Features
  | 'custom-domains'         // Custom domain support
  | 'ssl-certificates'       // SSL/TLS certificate management
  | 'cdn'                    // Content delivery network
  | 'edge-functions'         // Edge computing capabilities
  | 'load-balancing'         // Traffic distribution
  // Platform Features
  | 'analytics'              // Built-in analytics
  | 'monitoring'             // Application monitoring
  | 'logs'                   // Centralized logging
  | 'database'               // Managed database services
  | 'file-storage'           // Object/file storage
  | 'authentication'         // User authentication services
  | 'ci-cd'                  // Continuous integration/deployment
  | 'environment-variables'  // Environment configuration
  | 'team-collaboration'     // Multi-user workspace
  // Technical Features
  | 'api-routes'             // API endpoint hosting
  | 'serverless-functions'   // Function-as-a-Service
  | 'docker-support'         // Container deployment
  | 'kubernetes'             // Kubernetes orchestration
  | 'backup'                 // Data backup services
  | 'disaster-recovery'      // Disaster recovery capabilities
  // Enterprise Features
  | 'machine-learning'       // ML/AI service integration
  | 'big-data'               // Big data processing capabilities
  | 'active-directory-integration' // Microsoft AD integration
  | 'enterprise-security'    // Advanced security features
  | 'compliance'             // Regulatory compliance support
  | 'multi-region'           // Multi-region deployment
  | 'private-networking'     // VPC/private network support
  | 'managed-databases'      // Fully managed database services
  | 'data-warehousing'       // Data warehouse solutions
  // Additional Features
  | 'automatic-ssl'          // Automatic SSL certificate provisioning
  | 'static-hosting'         // Static site hosting
  | 'form-handling'          // Form submission processing
  | 'identity'               // Identity management
  | 'functions'              // Serverless functions
  | 'split-testing'          // A/B testing capabilities
  | 'edge-handlers'          // Edge computing handlers
  | 'full-stack-deployment'  // Full-stack application deployment
  | 'database-provisioning'  // Database provisioning
  | 'environment-management' // Environment variable management
  | 'auto-scaling'           // Automatic scaling
  | 'team-collaboration'     // Team collaboration features
  | 'enterprise-support'     // Enterprise support
  | 'compliance-certifications' // Compliance certifications
  | 'container-orchestration' // Advanced container management
  | 'api-gateway'            // API management and gateway
  | 'message-queuing'        // Managed message queue services
  | 'cache-services'         // Managed caching solutions
  | 'secret-management'      // Enterprise secret management
  // AWS Specific Features
  | 'ec2'                    // Elastic Compute Cloud
  | 'lambda'                 // AWS Lambda functions
  | 's3'                     // Simple Storage Service
  | 'cloudfront'             // CloudFront CDN
  | 'rds'                    // Relational Database Service
  | 'elastic-beanstalk'      // Elastic Beanstalk
  | 'ecs'                    // Elastic Container Service
  | 'eks'                    // Elastic Kubernetes Service
  // GCP Specific Features
  | 'compute-engine'         // Google Compute Engine
  | 'cloud-functions'        // Google Cloud Functions
  | 'cloud-storage'          // Google Cloud Storage
  | 'cloud-cdn'              // Google Cloud CDN
  | 'cloud-sql'              // Google Cloud SQL
  | 'app-engine'             // Google App Engine
  | 'cloud-run'              // Google Cloud Run
  | 'gke'                    // Google Kubernetes Engine
  // Azure Specific Features
  | 'virtual-machines'       // Azure Virtual Machines
  | 'azure-functions'        // Azure Functions
  | 'blob-storage'           // Azure Blob Storage
  | 'sql-database'           // Azure SQL Database
  | 'app-service'            // Azure App Service
  | 'container-instances'    // Azure Container Instances
  | 'aks'                    // Azure Kubernetes Service
  | 'cost-optimization'      // Advanced cost optimization tools
  | 'governance'             // Resource governance and policies
  | 'hybrid-cloud'           // Hybrid cloud capabilities
  | 'devops-integration'     // Advanced DevOps tooling
  | 'infrastructure-as-code' // IaC support and templates
  | 'global-deployment'      // Global deployment capabilities
  | 'global-distribution'    // Global content distribution
  | 'performance-optimization'; // Advanced performance tuning

/**
 * Setup complexity levels
 * @typedef {string} SetupComplexity
 * @description Indicates the complexity level of setting up and configuring
 * a cloud provider. Used for user guidance and provider recommendations.
 *
 * - minimal: No configuration needed, works out of the box
 * - easy: Basic configuration required (API token, etc.)
 * - moderate: Some technical configuration needed
 * - complex: Advanced configuration, requires expertise
 */
export type SetupComplexity = 'minimal' | 'easy' | 'moderate' | 'complex';

/**
 * Cloud provider interface
 * @interface CloudProvider
 * @description Core interface that all cloud providers must implement.
 * Follows the Strategy pattern to enable interchangeable provider implementations.
 * Each provider offers the same interface but with platform-specific implementations.
 *
 * This interface follows SOLID principles:
 * - SRP: Single responsibility for cloud deployment operations
 * - OCP: Open for extension with new providers
 * - LSP: All implementations are substitutable
 * - ISP: Interface is focused and cohesive
 * - DIP: Clients depend on this abstraction, not concrete providers
 *
 * @example
 * ```typescript
 * class VercelProvider implements CloudProvider {
 *   async deploy(config: DeploymentConfig): Promise<Result<DeploymentResult>> {
 *     // Vercel-specific deployment logic
 *   }
 * }
 * ```
 */
export interface CloudProvider {
  readonly name: CloudProviderType;
  readonly features: ProviderFeature[];
  readonly regions: string[];

  /**
   * Analyze project and provide deployment recommendations
   * @method analyzeProject
   * @param {string} projectPath - Absolute path to the project directory
   * @returns {Promise<Result<ProjectAnalysis>>} Project analysis results
   * @description Analyzes the project structure, dependencies, and configuration
   * to provide platform-specific deployment recommendations and requirements.
   */
  analyzeProject(projectPath: string): Promise<Result<ProjectAnalysis>>;

  /**
   * Deploy project to the cloud provider
   * @method deploy
   * @param {DeploymentConfig} config - Deployment configuration settings
   * @returns {Promise<Result<DeploymentResult>>} Deployment operation result
   * @description Executes the deployment process using provider-specific APIs
   * and deployment strategies. Handles build, upload, and activation phases.
   */
  deploy(config: DeploymentConfig): Promise<Result<DeploymentResult>>;

  /**
   * Get deployment status
   * @method getDeploymentStatus
   * @param {string} deploymentId - Unique identifier of the deployment
   * @returns {Promise<Result<DeploymentStatus>>} Current deployment status
   * @description Retrieves real-time status information for a specific deployment,
   * including phase, progress, health metrics, and any error details.
   */
  getDeploymentStatus(deploymentId: string): Promise<Result<DeploymentStatus>>;

  /**
   * Cancel an ongoing deployment
   * @method cancelDeployment
   * @param {string} deploymentId - Unique identifier of the deployment to cancel
   * @returns {Promise<Result<void>>} Cancellation operation result
   * @description Attempts to cancel an in-progress deployment. Success depends on
   * the current deployment phase and provider capabilities.
   */
  cancelDeployment(deploymentId: string): Promise<Result<void>>;

  /**
   * Get deployment logs
   * @method getDeploymentLogs
   * @param {string} deploymentId - Unique identifier of the deployment
   * @param {number} [limit] - Maximum number of log entries to retrieve
   * @returns {Promise<Result<DeploymentLog[]>>} Array of deployment log entries
   * @description Retrieves deployment logs for debugging and monitoring purposes.
   * Logs are returned in chronological order with timestamps and severity levels.
   */
  getDeploymentLogs(deploymentId: string, limit?: number): Promise<Result<DeploymentLog[]>>;

  /**
   * List all deployments for a project
   * @method listDeployments
   * @param {string} [projectId] - Optional project identifier to filter deployments
   * @param {number} [limit] - Maximum number of deployments to retrieve
   * @returns {Promise<Result<DeploymentSummary[]>>} Array of deployment summaries
   * @description Retrieves a list of deployments, optionally filtered by project.
   * Returns summary information suitable for listing views and selection interfaces.
   */
  listDeployments(projectId?: string, limit?: number): Promise<Result<DeploymentSummary[]>>;

  /**
   * Rollback to a previous deployment
   * @method rollback
   * @param {string} deploymentId - Identifier of the deployment to rollback to
   * @returns {Promise<Result<DeploymentResult>>} Rollback operation result
   * @description Reverts the application to a previous deployment state.
   * This operation creates a new deployment with the previous version's configuration.
   */
  rollback(deploymentId: string): Promise<Result<DeploymentResult>>;

  /**
   * Check if provider is properly configured
   * @method isConfigured
   * @returns {boolean} True if provider is ready for operations
   * @description Validates that all required credentials and configuration
   * are present and valid for deployment operations.
   */
  isConfigured(): boolean;

  /**
   * Validate connection to the cloud provider
   * @method validateConnection
   * @returns {Promise<{success: boolean; error?: Error}>} Connection validation result
   * @description Tests the connection to the provider's API using configured credentials
   */
  validateConnection?(): Promise<{success: boolean; error?: Error}>;

  /**
   * Get provider capabilities
   * @method getCapabilities
   * @returns {ProviderCapabilities} Provider capability information
   * @description Returns detailed information about provider limitations,
   * supported features, and technical specifications.
   */
  getCapabilities(): ProviderCapabilities;

  /**
   * Estimate deployment cost
   * @method estimateCost
   * @param {DeploymentConfig} config - Deployment configuration for cost calculation
   * @returns {Promise<Result<CostEstimate>>} Detailed cost estimation
   * @description Calculates estimated costs for deployment based on resource
   * requirements, usage patterns, and provider pricing models.
   */
  estimateCost(config: DeploymentConfig): Promise<Result<CostEstimate>>;
}

/**
 * Provider capabilities
 * @interface ProviderCapabilities
 * @description Defines the technical capabilities and limitations of a cloud provider.
 * Used for provider selection, validation, and feature compatibility checking.
 * These capabilities help determine if a provider can handle specific project requirements.
 *
 * @example
 * ```typescript
 * const capabilities = provider.getCapabilities();
 * if (capabilities.maxFileSize < projectSize) {\n *   console.warn('Project may exceed provider file size limits');\n * }\n * ```
 */
export interface ProviderCapabilities {
  /** Maximum number of deployments allowed per account/project */
  readonly maxDeployments: number;

  /** Maximum build time allowed in minutes */
  readonly maxBuildTime: number;

  /** Maximum file size allowed in MB */
  readonly maxFileSize: number;

  /** List of supported framework types */
  readonly supportedFrameworks: FrameworkType[];

  /** List of supported programming languages */
  readonly supportedLanguages: ProgrammingLanguage[];

  /** Whether custom domains are supported */
  readonly customDomains: boolean;

  /** Whether environment variables are supported */
  readonly environmentVariables: boolean;

  /** Whether team collaboration features are available */
  readonly teamCollaboration: boolean;

  /** Whether API access is available for programmatic control */
  readonly apiAccess: boolean;
}

/**
 * Cloud provider configuration
 * @interface CloudProviderConfig
 * @description Configuration object for initializing and authenticating with
 * a specific cloud provider. Contains provider-specific credentials, regional
 * settings, and operational parameters.
 *
 * @example
 * ```typescript
 * const vercelConfig: CloudProviderConfig = {
 *   type: 'vercel',
 *   accessToken: process.env.VERCEL_TOKEN,
 *   region: 'us-east-1',
 *   timeout: 30000
 * };
 * ```
 */
export interface CloudProviderConfig {
  /** The type of cloud provider */
  readonly type: CloudProviderType;

  /** API key for authentication (provider-specific) */
  readonly apiKey?: string;

  /** Secret key for authentication (AWS, etc.) */
  readonly secretKey?: string;

  /** Access token for authentication (OAuth-based providers) */
  readonly accessToken?: string;

  /** Preferred deployment region */
  readonly region?: string;

  /** Custom base URL for API endpoints */
  readonly baseUrl?: string;

  /** Request timeout in milliseconds */
  readonly timeout?: number;

  /** Maximum number of retries for failed requests */
  readonly maxRetries?: number;

  /** Rate limiting configuration */
  readonly rateLimits?: {
    /** Maximum requests per minute */
    readonly requestsPerMinute: number;
    /** Maximum concurrent requests */
    readonly maxConcurrentRequests: number;
  };
}

/**
 * Cloud provider recommendation
 * @interface CloudProviderRecommendation
 * @description Represents an intelligent recommendation for a cloud provider
 * based on project analysis, user preferences, and provider capabilities.
 * Includes scoring, reasoning, and cost estimates to help users make informed decisions.
 *
 * @example
 * ```typescript
 * const recommendation: CloudProviderRecommendation = {
 *   provider: 'vercel',
 *   score: 92,
 *   reasoning: 'Excellent Next.js support with zero-config deployment',
 *   costEstimate: { monthly: { typical: 20 } },
 *   setupComplexity: 'easy'
 * };
 * ```
 */

/**
 * Provider health status
 */
export interface ProviderHealthStatus {
  /** Overall health status */
  readonly status: 'healthy' | 'unhealthy' | 'degraded';
  
  /** Health check details */
  readonly details: Record<string, any>;
  
  /** Last health check timestamp */
  readonly lastChecked: Date;
  
  /** Health check duration in milliseconds */
  readonly checkDuration: number;
}

export interface CloudProviderRecommendation {
  /** The recommended cloud provider */
  readonly provider: CloudProviderType;

  /** Overall recommendation score (0-100, higher is better) */
  readonly score: number;

  /** Human-readable explanation for the recommendation */
  readonly reasoning: string;

  /** Estimated costs for this provider */
  readonly costEstimate: CostEstimate;

  /** List of supported features relevant to the project */
  readonly features: ProviderFeature[];

  /** Known limitations or considerations for this provider */
  readonly limitations?: string[];

  /** Complexity level of setting up this provider */
  readonly setupComplexity: SetupComplexity;

  /** How well the provider handles scaling (0-100) */
  readonly scalabilityScore: number;

  /** Performance characteristics score (0-100) */
  readonly performanceScore: number;
}

