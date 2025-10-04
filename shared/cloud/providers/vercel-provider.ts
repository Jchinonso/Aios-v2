/**
 * @fileoverview Vercel Provider - Implementation for Vercel platform deployments
 * @description Concrete implementation of the BaseProvider for Vercel's deployment
 * platform. Specializes in Next.js applications with zero-configuration deployments,
 * preview deployments, and edge function support.
 *
 * Vercel excels at:
 * - Next.js and React applications
 * - Static site generation and deployment
 * - Edge functions and serverless deployments
 * - Automatic preview deployments from Git branches
 * - CDN with global edge locations
 * - Zero-configuration deployments
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const vercel = new VercelProvider();
 * await vercel.configure({
 *   type: 'vercel',
 *   accessToken: process.env['VERCEL_TOKEN']
 * });
 *
 * const result = await vercel.deploy({
 *   environment: 'production',
 *   projectPath: '/path/to/nextjs-app'
 * });
 * ```
 */

// Vercel SDK import removed - using direct fetch API for better reliability
// import { Vercel } from '@vercel/sdk';
import { extractToken } from '../types/provider-config.types.js';
import { DEFAULT_LIMITS, DEFAULT_COSTS, PROGRESS, POLLING_INTERVALS } from '../constants/provider-constants.js';
import {
  createTokenNotConfiguredError,
  createDeploymentFailedError,
  createNetworkError
} from '../../constants/errors.js';
import { BaseProvider } from './base-provider.js'
import type {
  CloudProviderType,
  ProviderCapabilities,
} from '../types/cloud-provider.types.js';

import type {
  DeploymentConfig,
  DeploymentResult,
  DeploymentStatus,
  DeploymentLog,
  DeploymentSummary,
} from '../types/deployment.types.js';

import type {
  CostEstimate,
  MonthlyEstimate,
  TrafficEstimate,
} from '../types/cost.types.js';

import { getCloudConfig } from '../config/cloud-config.js'

/**
 * Vercel-specific deployment configuration
 * @interface VercelDeploymentConfig
 * @description Extended deployment configuration with Vercel-specific options
 * for build settings, environment variables, and deployment preferences.
 */
interface VercelDeploymentConfig extends DeploymentConfig {
  /** Build command override (defaults to package.json scripts) */
  readonly buildCommand?: string;

  /** Output directory for static files (defaults to .next/out for Next.js) */
  readonly outputDirectory?: string;

  /** Install command override (defaults to npm install) */
  readonly installCommand?: string;

  /** Enable/disable automatic deployments from Git */
  readonly gitIntegration?: boolean;

  /** Custom domain settings */
  readonly customDomain?: string;

  /** Edge functions configuration */
  readonly edgeFunctions?: {
    readonly enabled: boolean;
    readonly regions?: string[];
  };
}

/**
 * Vercel Provider implementation
 * @class VercelProvider
 * @extends {BaseProvider}
 * @description Concrete implementation of cloud provider interface for Vercel platform.
 * Provides specialized deployment capabilities for JavaScript/TypeScript applications,
 * particularly Next.js with zero-configuration deployment experience.
 *
 * Features:
 * - Automatic framework detection and optimization
 * - Zero-config deployments for supported frameworks
 * - Instant preview deployments for every Git push
 * - Global CDN with edge functions support
 * - Automatic SSL certificates and custom domains
 * - Built-in analytics and performance monitoring
 */
export class VercelProvider extends BaseProvider {

  /**
   * Creates a new VercelProvider instance
   * @constructor
   * @description Initializes the Vercel provider with platform-specific
   * capabilities, supported features, and available regions.
   */
  constructor() {
    const vercelConfig = getCloudConfig().providers.vercel;

    super(
      'vercel' as CloudProviderType,
      vercelConfig.features,
      vercelConfig.regions
    );

    // SDK client will be initialized when token is configured
  }


  /**
   * Get Vercel provider capabilities
   * @method getCapabilities
   * @returns {ProviderCapabilities} Detailed provider capabilities
   * @description Returns comprehensive information about Vercel's technical
   * limitations, supported frameworks, and platform-specific features.
   */
  override getCapabilities(): ProviderCapabilities {
    const vercelConfig = getCloudConfig().providers.vercel;

    return {
      maxDeployments: vercelConfig.limits.maxDeployments,
      maxBuildTime: vercelConfig.limits.maxBuildTime,
      maxFileSize: vercelConfig.limits.maxFileSize,
      supportedFrameworks: ['react', 'nextjs', 'vue', 'nuxt', 'svelte', 'angular'],
      supportedLanguages: ['javascript', 'typescript', 'python', 'go', 'rust'],
      customDomains: true,
      environmentVariables: true,
      teamCollaboration: true,
      apiAccess: true,
    };
  }

  /**
   * Check if provider is configured
   * Override to check both config object AND environment variables
   */
  override isConfigured(): boolean {
    // Check if token exists in config OR environment
    const hasConfigToken = !!(this.config && extractToken(this.config));
    const hasEnvToken = !!process.env['VERCEL_TOKEN'];

    return hasConfigToken || hasEnvToken;
  }

  /**
   * Validate connection to Vercel API
   * @method validateConnection
   * @returns {Promise<Result<void, Error>>} Connection validation result
   * @description Tests the connection to Vercel API using the configured token via SDK
   */
  async validateConnection(): Promise<{ success: boolean; error?: Error }> {
    try {
      const token = extractToken(this.config) || process.env['VERCEL_TOKEN'];
      if (!token) {
        return { success: false, error: new Error('No Vercel token configured') };
      }

      // Test connection using direct API call (more reliable than SDK)
      const response = await fetch('https://api.vercel.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json() as any;

        if (errorData?.error?.invalidToken || response.status === 403) {
          return {
            success: false,
            error: new Error(`Your Vercel token appears to be invalid or expired. Please create a new token at https://vercel.com/account/tokens`)
          };
        }

        return {
          success: false,
          error: new Error(`Vercel API error: ${errorData?.error?.message || response.statusText}`)
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: new Error(`Network error: ${error?.message || 'Unable to connect to Vercel'}`)
      };
    }
  }

  /**
   * Analyze project for Vercel deployment
   * @protected
   * @method analyzeProjectImplementation
   * @param {string} projectPath - Absolute path to project directory
   * @returns {Promise<ProjectAnalysis>} Detailed project analysis
   * @description Analyzes project structure to detect framework, dependencies,
   * and optimal deployment configuration for Vercel platform.
   */
  // analyzeProjectImplementation removed - now using UnifiedProjectAnalyzerService from BaseProvider

  /**
   * Deploy project to Vercel
   * @protected
   * @method deployImplementation
   * @param {DeploymentConfig} config - Deployment configuration
   * @returns {Promise<DeploymentResult>} Deployment result with Vercel-specific data
   * @description Executes deployment to Vercel platform using their deployment API.
   * Handles build process, file uploads, and deployment activation.
   */
  protected async deployImplementation(config: DeploymentConfig): Promise<DeploymentResult> {
    const vercelConfig = config as VercelDeploymentConfig;

    this.logger.info('Starting Vercel deployment', {
      environment: config.environment,
      projectPath: config.projectPath
    });

    try {
      // Step 1: Prepare deployment package
      const deploymentPackage = await this.prepareDeploymentPackage(vercelConfig);

      // Step 2: Upload files to Vercel
      const uploadResult = await this.uploadFiles(deploymentPackage);

      // Step 3: Create deployment
      const deployment = await this.createDeployment(vercelConfig, uploadResult);

      // Step 4: Monitor deployment progress
      await this.monitorDeployment(deployment.id);

      // Step 5: Configure custom domain if specified
      if (vercelConfig.customDomain) {
        await this.configureDomain(deployment.id, vercelConfig.customDomain);
      }

      const result: DeploymentResult = {
        deploymentId: deployment.id,
        url: deployment.url,
        status: 'ready',
        buildTime: 120,
        environment: config.environment,
        version: deployment.version,
        metadata: {
          provider: 'vercel',
          region: config.region || 'us-east-1',
          buildCommand: vercelConfig.buildCommand,
          framework: deployment.detectedFramework,
          nodeVersion: deployment.nodeVersion,
          previewUrl: deployment.previewUrl,
          inspectorUrl: deployment.inspectorUrl,
        }
      };

      this.logger.info('Vercel deployment completed', {
        deploymentId: result.deploymentId,
        url: result.url,
        buildTime: result.buildTime
      });

      return result;
    } catch (error) {
      this.logger.error('Vercel deployment failed', error as Error);
      throw createDeploymentFailedError('Vercel', (error as Error).message);
    }
  }

  /**
   * Get deployment status from Vercel
   * @protected
   * @method getDeploymentStatusImplementation
   * @param {string} deploymentId - Vercel deployment ID
   * @returns {Promise<DeploymentStatus>} Current deployment status
   * @description Retrieves real-time deployment status from Vercel API
   * including build progress, health checks, and performance metrics.
   */
  protected async getDeploymentStatusImplementation(deploymentId: string): Promise<DeploymentStatus> {
    this.logger.debug('Fetching deployment status from Vercel', { deploymentId });

    try {
      const token = extractToken(this.config) || process.env['VERCEL_TOKEN'];
      if (!token) {
        throw createTokenNotConfiguredError('Vercel');
      }

      // Call Vercel API to get deployment status
      const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get deployment status: ${response.statusText}`);
      }

      const vercelStatus = await response.json();

      const status: DeploymentStatus = {
        deploymentId,
        phase: this.mapVercelPhaseToStatus(vercelStatus.readyState),
        progress: this.calculateProgress(vercelStatus),
        message: vercelStatus.meta?.description || 'Deployment in progress',
        startTime: new Date(vercelStatus.createdAt),
        health: {
          status: vercelStatus.ready ? 'healthy' : 'unknown',
          checks: vercelStatus.checks || [],
          ...(vercelStatus.ready && { lastCheck: new Date() }),
        },
        performance: {
          ...(vercelStatus.buildingAt && {
            buildTime: new Date(vercelStatus.readyAt || Date.now()).getTime() - new Date(vercelStatus.buildingAt).getTime()
          }),
          ...(vercelStatus.responseTime && { responseTime: vercelStatus.responseTime }),
          ...(vercelStatus.throughput && { throughput: vercelStatus.throughput }),
        },
        url: vercelStatus.url,
        previewUrl: vercelStatus.alias?.[0],
      };

      if (vercelStatus.ready && vercelStatus.readyAt) {
        return { ...status, endTime: new Date(vercelStatus.readyAt) };
      }

      return status;
    } catch (error) {
      this.logger.error('Failed to fetch deployment status', error as Error);
      throw createNetworkError('deployment status', error as Error);
    }
  }

  /**
   * Cancel Vercel deployment
   * @protected
   * @method cancelDeploymentImplementation
   * @param {string} deploymentId - Vercel deployment ID
   * @returns {Promise<void>} Cancellation completion
   * @description Attempts to cancel an in-progress Vercel deployment.
   * Note: Vercel deployments can only be cancelled during build phase.
   */
  protected async cancelDeploymentImplementation(deploymentId: string): Promise<void> {
    this.logger.info('Cancelling Vercel deployment', { deploymentId });

    try {
      await this.callVercelAPI(`/deployments/${deploymentId}`, {
        method: 'DELETE'
      });

      this.logger.info('Vercel deployment cancelled successfully', { deploymentId });
    } catch (error) {
      this.logger.error('Failed to cancel deployment', error as Error);
      throw createNetworkError('cancel deployment', error as Error);
    }
  }

  /**
   * Get deployment logs from Vercel
   * @protected
   * @method getDeploymentLogsImplementation
   * @param {string} deploymentId - Vercel deployment ID
   * @param {number} [limit] - Maximum number of log entries
   * @returns {Promise<DeploymentLog[]>} Array of log entries
   * @description Retrieves build and runtime logs from Vercel's logging system.
   */
  protected async getDeploymentLogsImplementation(deploymentId: string, limit?: number): Promise<DeploymentLog[]> {
    this.logger.debug('Fetching deployment logs from Vercel', { deploymentId, limit });

    try {
      const logsResponse = await this.callVercelAPI(`/deployments/${deploymentId}/events?limit=${limit || DEFAULT_LIMITS.LOG_ENTRIES}`);

      return logsResponse.map((logEntry: any) => ({
        timestamp: new Date(logEntry.created),
        level: this.mapVercelLogLevel(logEntry.type),
        message: logEntry.payload.text || logEntry.payload.info,
        source: logEntry.payload.level || 'system',
        metadata: {
          id: logEntry.id,
          type: logEntry.type,
          serial: logEntry.serial,
        }
      }));
    } catch (error) {
      this.logger.error('Failed to fetch deployment logs', error as Error);
      throw createNetworkError('deployment logs', error as Error);
    }
  }

  /**
   * List deployments from Vercel
   * @protected
   * @method listDeploymentsImplementation
   * @param {string} [projectId] - Optional Vercel project ID filter
   * @param {number} [limit] - Maximum deployments to retrieve
   * @returns {Promise<DeploymentSummary[]>} Array of deployment summaries
   * @description Retrieves list of deployments from Vercel, optionally filtered by project.
   */
  protected async listDeploymentsImplementation(projectId?: string, limit?: number): Promise<DeploymentSummary[]> {
    this.logger.debug('Listing deployments from Vercel', { projectId, limit });

    try {
      const queryParams = new URLSearchParams({
        limit: (limit || DEFAULT_LIMITS.DEPLOYMENT_LIST).toString(),
        ...(projectId && { projectId })
      });

      const deploymentsResponse = await this.callVercelAPI(`/deployments?${queryParams}`);

      return deploymentsResponse.deployments.map((deployment: any) => ({
        deploymentId: deployment.uid,
        environment: deployment.target || 'production',
        status: this.mapVercelPhaseToStatus(deployment.readyState),
        url: deployment.url,
        createdAt: new Date(deployment.createdAt),
        completedAt: deployment.ready ? new Date(deployment.readyAt) : undefined,
        version: deployment.meta?.version || deployment.uid.substring(0, 8),
        branch: deployment.meta?.githubCommitRef,
        commitHash: deployment.meta?.githubCommitSha,
        author: deployment.creator?.username,
      }));
    } catch (error) {
      this.logger.error('Failed to list deployments', error as Error);
      throw createNetworkError('list deployments', error as Error);
    }
  }

  /**
   * Rollback Vercel deployment
   * @protected
   * @method rollbackImplementation
   * @param {string} deploymentId - Deployment ID to rollback to
   * @returns {Promise<DeploymentResult>} Rollback deployment result
   * @description Creates a new deployment by promoting a previous deployment
   * to the production domain. Vercel handles this as an alias operation.
   */
  protected async rollbackImplementation(deploymentId: string): Promise<DeploymentResult> {
    this.logger.info('Rolling back Vercel deployment', { deploymentId });

    try {
      // Get deployment details
      const deployment = await this.callVercelAPI(`/deployments/${deploymentId}`);

      // Create alias to promote deployment to production
      const aliasResult = await this.callVercelAPI('/aliases', {
        method: 'POST',
        body: JSON.stringify({
          deploymentId,
          alias: deployment.alias || `${deployment.name}.vercel.app`
        })
      });

      const result: DeploymentResult = {
        deploymentId: aliasResult.uid,
        url: aliasResult.alias,
        status: 'ready',
        buildTime: 0, // Rollback doesn't require build time
        environment: 'production',
        version: deployment.uid.substring(0, 8),
        metadata: {
          provider: 'vercel',
          originalDeploymentId: deploymentId,
          rollback: true,
          aliasId: aliasResult.uid,
        }
      };

      this.logger.info('Vercel rollback completed', {
        originalDeploymentId: deploymentId,
        newAliasId: result.deploymentId
      });

      return result;
    } catch (error) {
      this.logger.error('Vercel rollback failed', error as Error);
      throw createNetworkError('rollback', error as Error);
    }
  }

  /**
   * Estimate Vercel deployment costs
   * @protected
   * @method estimateCostImplementation
   * @param {DeploymentConfig} config - Deployment configuration
   * @returns {Promise<CostEstimate>} Detailed cost estimation
   * @description Calculates estimated costs based on Vercel's pricing model
   * including build time, bandwidth, function invocations, and team features.
   */
  protected async estimateCostImplementation(config: DeploymentConfig): Promise<CostEstimate> {
    this.logger.debug('Estimating Vercel deployment costs', { environment: config.environment });

    const monthly: MonthlyEstimate = {
      freeTier: config.environment !== 'production',
      minimum: 0,
      typical: config.environment === 'production' ? DEFAULT_COSTS.vercel.proPlanMonthly : 0,
      maximum: DEFAULT_COSTS.vercel.enterprisePlanMonthly,
      currency: 'USD'
    };

    const traffic: TrafficEstimate = {
      freeRequests: DEFAULT_COSTS.vercel.freeTierRequests,
      costPerAdditionalRequest: 0.0001,
      bandwidthIncluded: config.environment === 'production' ? 1000 : DEFAULT_COSTS.vercel.freeTierBandwidthGB,
      costPerGB: 0.1
    };

    return {
      monthly,
      traffic,
      storage: {
        freeStorage: 1, // 1GB free
        costPerGB: 0.05, // $0.05 per GB
      },
      additional: [
        { service: 'Edge Functions', cost: 0.02, description: 'Per 1M invocations', unit: '1M invocations' },
        { service: 'Analytics', cost: 0.01, description: 'Per 1M events', unit: '1M events' }
      ]
    };
  }

  // =====================================
  // PRIVATE HELPER METHODS
  // =====================================


  /**
   * Calculate deployment progress percentage
   * @private
   * @method calculateProgress
   * @param {any} vercelStatus - Vercel status object
   * @returns {number} Progress percentage (0-100)
   */
  private calculateProgress(vercelStatus: any): number {
    if (vercelStatus.ready) return PROGRESS.COMPLETE;
    if (vercelStatus.readyState === 'ERROR') return PROGRESS.STARTED;
    if (vercelStatus.readyState === 'BUILDING') return PROGRESS.HALFWAY;
    if (vercelStatus.readyState === 'QUEUED') return PROGRESS.STARTED;
    return PROGRESS.STARTED;
  }

  /**
   * Call Vercel API
   * @private
   */
  private async callVercelAPI(endpoint: string, options?: any): Promise<any> {
    throw new Error(`Vercel API call not yet implemented: ${endpoint} ${JSON.stringify(options)}`);
  }

  /**
   * Map Vercel phase to deployment status
   * @private
   */
  private mapVercelPhaseToStatus(readyState: string): string {
    const mapping: Record<string, string> = {
      'QUEUED': 'pending',
      'BUILDING': 'building',
      'READY': 'success',
      'ERROR': 'failed',
      'CANCELLED': 'cancelled'
    };
    return mapping[readyState] || 'pending';
  }

  /**
   * Map Vercel log level to standard log level
   * @private
   * @method mapVercelLogLevel
   * @param {string} vercelType - Vercel log type
   * @returns {string} Standard log level
   */
  private mapVercelLogLevel(vercelType: string): string {
    const mapping: Record<string, string> = {
      'stdout': 'info',
      'stderr': 'error',
      'command': 'debug',
      'system': 'info'
    };

    return mapping[vercelType] || 'info';
  }

  /**
   * Prepare deployment package by collecting all files
   * Uses centralized FileCollectionService for consistent file handling
   * @private
   */
  private async prepareDeploymentPackage(config: VercelDeploymentConfig): Promise<Array<{path: string; content: Buffer}>> {
    const { collectProjectFiles } = await import('../utils/file-collection.service.js');

    const result = await collectProjectFiles(config.projectPath, {
      skipDirs: [
        'node_modules',
        '.git',
        '.next',
        'dist',
        'build',
        '.vercel',
        '.env'
      ],
      includeHidden: false,
    });

    if (result.errors.length > 0) {
      this.logger.warn('Errors during file collection', { errors: result.errors });
    }

    this.logger.info('Prepared deployment package', {
      fileCount: result.fileCount,
      totalSize: result.totalSize,
      skipped: result.skippedCount
    });

    // Convert to format expected by Vercel API
    return result.files.map(file => ({
      path: file.path,
      content: file.content
    }));
  }

  /**
   * Upload files to Vercel using /v2/files endpoint
   * @private
   */
  private async uploadFiles(files: Array<{path: string; content: Buffer}>): Promise<Array<{file: string; sha: string}>> {
    const crypto = await import('crypto');
    const token = extractToken(this.config) || process.env['VERCEL_TOKEN'];

    if (!token) {
      throw new Error('Vercel token not configured');
    }

    const uploadedFiles: Array<{file: string; sha: string}> = [];
    const totalFiles = files.length;
    let uploadedCount = 0;

    this.logger.info('Starting file upload to Vercel', { totalFiles });

    // Upload files in batches to avoid overwhelming the API
    const batchSize = DEFAULT_LIMITS.MAX_CONCURRENT;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      await Promise.all(batch.map(async (file) => {
        // Generate SHA-1 hash for the file (Vercel API requires SHA-1)
        const sha = crypto.createHash('sha1').update(file.content).digest('hex');

        // Upload file to Vercel
        const response = await fetch('https://api.vercel.com/v2/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
            'x-vercel-digest': sha,
          },
          body: file.content as unknown as BodyInit, // Buffer is compatible with BodyInit at runtime
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to upload ${file.path}: ${error}`);
        }

        uploadedFiles.push({
          file: file.path,
          sha: sha
        });

        uploadedCount++;

        // Log progress every batch
        if (uploadedCount % DEFAULT_LIMITS.MAX_CONCURRENT === 0) {
          this.logger.info('Upload progress', {
            uploaded: uploadedCount,
            total: totalFiles,
            percent: Math.round((uploadedCount / totalFiles) * PROGRESS.COMPLETE)
          });
        }
      }));
    }

    this.logger.info('All files uploaded successfully', { totalFiles: uploadedFiles.length });
    return uploadedFiles;
  }

  /**
   * Monitor deployment progress by polling Vercel API
   * @private
   */
  private async monitorDeployment(deploymentId: string): Promise<void> {
    const token = extractToken(this.config) || process.env['VERCEL_TOKEN'];
    if (!token) {
      throw new Error('Vercel token not configured');
    }

    this.logger.info('Monitoring deployment progress', { deploymentId });

    const maxAttempts = 60; // 5 minutes max (60 * 5 seconds)
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get deployment status: ${response.statusText}`);
      }

      const deployment = await response.json();
      const state = deployment.readyState;

      this.logger.debug('Deployment status', { state, deploymentId });

      if (state === 'READY') {
        this.logger.info('Deployment completed successfully', { url: deployment.url });
        return;
      } else if (state === 'ERROR' || state === 'CANCELED') {
        throw new Error(`Deployment failed with state: ${state}`);
      }

      // States: QUEUED, BUILDING, READY, ERROR, CANCELED
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVALS.NORMAL));
      attempts++;
    }

    throw new Error('Deployment timeout - exceeded maximum wait time');
  }

  /**
   * Configure domain for deployment
   * @private
   */
  private async configureDomain(deploymentId: string, domain: string): Promise<void> {
    const token = extractToken(this.config) || process.env['VERCEL_TOKEN'];
    if (!token) {
      throw new Error('Vercel token not configured');
    }

    this.logger.info('Configuring custom domain', { deploymentId, domain });

    // Assign domain to deployment
    const response = await fetch('https://api.vercel.com/v9/projects/{projectId}/domains', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.warn('Failed to configure custom domain', { error });
      // Don't throw - domain configuration is optional
    } else {
      this.logger.info('Custom domain configured successfully', { domain });
    }
  }

  /**
   * Get project name from package.json or directory
   * @private
   */
  private async getProjectName(projectPath: string): Promise<string> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      return packageJson.name || path.basename(projectPath);
    } catch {
      const path = await import('path');
      return path.basename(projectPath);
    }
  }

  /**
   * Create deployment using Vercel API v13
   * @private
   */
  private async createDeployment(
    config: VercelDeploymentConfig,
    uploadedFiles: Array<{file: string; sha: string}>
  ): Promise<any> {
    const token = extractToken(this.config) || process.env['VERCEL_TOKEN'];

    if (!token) {
      throw new Error('Vercel token not configured');
    }

    const projectName = await this.getProjectName(config.projectPath);

    this.logger.info('Creating Vercel deployment', { projectName, fileCount: uploadedFiles.length });

    // Transform uploaded files to Vercel format
    const files = uploadedFiles.map(f => ({
      file: f.file,
      sha: f.sha,
      size: 0 // Vercel will ignore this since file is already uploaded
    }));

    // Create deployment payload
    const payload: any = {
      name: projectName,
      files: files,
      target: config.environment === 'production' ? 'production' : config.environment || 'staging',
      projectSettings: {
        framework: null, // Auto-detect
      },
    };

    // Add optional settings
    if (config.buildCommand) {
      payload.projectSettings.buildCommand = config.buildCommand;
    }
    if (config.outputDirectory) {
      payload.projectSettings.outputDirectory = config.outputDirectory;
    }
    if (config.installCommand) {
      payload.projectSettings.installCommand = config.installCommand;
    }

    // Create deployment
    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vercel deployment creation failed (${response.status}): ${error}`);
    }

    const deployment = await response.json();

    this.logger.info('Deployment created', {
      id: deployment.id,
      url: deployment.url,
      state: deployment.readyState
    });

    return {
      id: deployment.id,
      url: deployment.url,
      version: '1',
      detectedFramework: deployment.meta?.framework || 'unknown',
      nodeVersion: deployment.meta?.nodeVersion || 'default',
      previewUrl: deployment.alias?.[0] || deployment.url,
      inspectorUrl: deployment.inspectorUrl,
    };
  }

  /**
   * Get health status implementation
   * @protected
   */
  protected async getHealthStatusImplementation(): Promise<any> {
    return {
      healthy: true,
      status: 'operational',
      services: {
        api: 'operational',
        cdn: 'operational',
        functions: 'operational'
      }
    };
  }
}