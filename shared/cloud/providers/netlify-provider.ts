/**
 * @fileoverview Netlify Provider - Implementation for Netlify platform deployments
 * @description Concrete implementation of the BaseProvider for Netlify's JAMstack
 * deployment platform. Specializes in static sites, serverless functions, and
 * form handling with integrated CI/CD workflows.
 *
 * Netlify excels at:
 * - Static site generation and deployment
 * - JAMstack applications with serverless functions
 * - Form handling and submission processing
 * - Split testing and feature flags
 * - Branch-based preview deployments
 * - Built-in CI/CD with Git integration
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import { NetlifyAPI } from '@netlify/api';
import { BaseProvider } from './base-provider.js'
import { extractToken } from '../types/provider-config.types.js'
import { TIME_CONSTANTS, DEFAULT_LIMITS, DEFAULT_COSTS, PROGRESS, POLLING_INTERVALS } from '../constants/provider-constants.js'
import { NETLIFY_REGIONS } from '../../constants/regions.js'
import {
  createTokenNotConfiguredError,
  createDeploymentFailedError,
  createTimeoutError,
  createNetworkError
} from '../../constants/errors.js'
import type { NetlifyProviderConfig } from '../types/provider-config.types.js'
import type {
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
  FrameworkType,
  ProgrammingLanguage,
} from '../types/deployment.types.js';

import type {
  CostEstimate,
} from '../types/cost.types.js';

// No mock utilities needed - using real implementations

/**
 * Netlify Provider implementation
 * @class NetlifyProvider
 */
export class NetlifyProvider extends BaseProvider {
  private netlifyClient?: NetlifyAPI;

  private static readonly SUPPORTED_FRAMEWORKS: FrameworkType[] = [
    'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'gatsby', 'hugo', 'jekyll', 'eleventy'
  ];

  private static readonly SUPPORTED_LANGUAGES: ProgrammingLanguage[] = [
    'javascript', 'typescript', 'python', 'ruby', 'go', 'rust', 'php'
  ];

  private static readonly NETLIFY_FEATURES: ProviderFeature[] = [
    'zero-config', 'preview-deployments', 'edge-functions', 'form-handling',
    'split-testing', 'custom-domains', 'ssl-certificates',
    'cdn', 'analytics', 'serverless-functions', 'team-collaboration'
  ];

  constructor() {
    super(
      'netlify',
      NetlifyProvider.NETLIFY_FEATURES,
      NETLIFY_REGIONS as unknown as string[]
    );
  }

  /**
   * Get Netlify SDK client
   * @private
   */
  private getNetlifyClient(): NetlifyAPI {
    if (!this.netlifyClient) {
      const token = extractToken(this.config) || process.env['NETLIFY_TOKEN'];
      if (!token) {
        throw createTokenNotConfiguredError('Netlify');
      }
      this.netlifyClient = new NetlifyAPI(token);
    }
    return this.netlifyClient;
  }

  /**
   * Validate connection to Netlify API
   * @method validateConnection
   */
  async validateConnection(): Promise<{ success: boolean; error?: Error }> {
    try {
      const client = this.getNetlifyClient();

      // Test connection by listing sites
      await client.listSites({ per_page: 1 });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Check if the provider is properly configured
   */
  public override isConfigured(): boolean {
    // Check for required Netlify credentials
    const hasToken = process.env['NETLIFY_TOKEN'] || extractToken(this.config);
    const config = this.config as NetlifyProviderConfig | undefined;
    const hasSiteId = process.env['NETLIFY_SITE_ID'] || config?.siteId;

    return Boolean(hasToken && hasSiteId);
  }

  /**
   * Get provider capabilities
   */
  public getCapabilities(): ProviderCapabilities {
    return {
      maxDeployments: 1000, // Centralized in thresholds.ts: PROVIDER_CAPABILITY_LIMITS.netlify
      maxBuildTime: 15, // Centralized in thresholds.ts: PROVIDER_CAPABILITY_LIMITS.netlify
      maxFileSize: 32, // Centralized in thresholds.ts: PROVIDER_CAPABILITY_LIMITS.netlify
      customDomains: true,
      environmentVariables: true,
      teamCollaboration: true,
      apiAccess: true,
      supportedFrameworks: NetlifyProvider.SUPPORTED_FRAMEWORKS,
      supportedLanguages: NetlifyProvider.SUPPORTED_LANGUAGES
    };
  }

  /**
   * Deploy application to Netlify using file digest method
   */
  protected async deployImplementation(config: DeploymentConfig): Promise<DeploymentResult> {
    try {
      this.logger.info('Starting Netlify deployment', {
        environment: config.environment
      });

      const client = this.getNetlifyClient();
      const providerConfig = this.config as NetlifyProviderConfig | undefined;
      const siteId = process.env['NETLIFY_SITE_ID'] || providerConfig?.siteId;

      if (!siteId) {
        throw new Error('Netlify site ID not configured');
      }

      // Step 1: Collect and hash all files
      this.logger.info('Collecting project files');
      const files = await this.collectFiles(config.projectPath);

      // Step 2: Create file digest (file path -> SHA1 hash)
      this.logger.info('Creating file digest', { fileCount: files.length });
      const fileDigest = await this.createFileDigest(files);

      // Step 3: Create deploy with file digest
      this.logger.info('Creating deployment');
      const deploy = await client.createSiteDeploy({
        siteId,
        body: {
          files: fileDigest
        }
      });

      // Step 4: Upload required files
      const requiredFiles = deploy.required || [];
      this.logger.info('Uploading files', { requiredCount: requiredFiles.length });

      for (const sha of requiredFiles) {
        const file = files.find(f => f.sha === sha);
        if (file && deploy.id) {
          const { Readable } = await import('stream');
          const stream = Readable.from(file.content);
          await client.uploadDeployFile({
            deployId: deploy.id,
            path: file.path,
            body: stream as unknown as any
          });
        }
      }

      // Step 5: Wait for deployment to be ready
      if (!deploy.id) {
        throw new Error('Deploy ID not returned from Netlify');
      }

      this.logger.info('Waiting for deployment to complete');
      await this.waitForDeploy(client, deploy.id);

      // Get final deployment info
      const finalDeploy = await client.getDeploy({ deployId: deploy.id });

      const result: DeploymentResult = {
        deploymentId: deploy.id,
        url: finalDeploy.ssl_url || finalDeploy.deploy_ssl_url || deploy.url || `https://${deploy.id}.netlify.app`,
        status: 'ready',
        buildTime: 0, // Netlify doesn't expose build time in seconds
        environment: config.environment,
        version: '1.0.0',
        metadata: {
          provider: 'netlify',
          siteId: siteId,
          deployUrl: finalDeploy.deploy_url
        }
      };

      this.logger.info('Netlify deployment completed', {
        deploymentId: result.deploymentId,
        url: result.url
      });

      return result;
    } catch (error) {
      throw createDeploymentFailedError('Netlify', (error as Error).message);
    }
  }

  /**
   * Collect all files from project directory
   * Uses centralized FileCollectionService for consistent file handling
   * @private
   */
  private async collectFiles(projectPath: string): Promise<Array<{path: string; content: Buffer; sha: string}>> {
    const { collectProjectFiles } = await import('../utils/file-collection.service.js');
    const crypto = await import('crypto');

    const result = await collectProjectFiles(projectPath, {
      skipDirs: [
        'node_modules',
        '.git',
        '.netlify',
        'dist',
        'build',
        '.env'
      ],
      includeHidden: false,
    });

    if (result.errors.length > 0) {
      this.logger.warn('Errors during file collection', { errors: result.errors });
    }

    this.logger.info('Collected files for Netlify deployment', {
      fileCount: result.fileCount,
      totalSize: result.totalSize,
      skipped: result.skippedCount
    });

    // Convert to format expected by Netlify (uses SHA-1 instead of SHA-256)
    return result.files.map(file => ({
      path: file.path.replace(/\\/g, '/'), // Normalize path separators for Netlify
      content: file.content,
      sha: crypto.createHash('sha1').update(file.content).digest('hex')
    }));
  }

  /**
   * Create file digest mapping paths to SHA1 hashes
   * @private
   */
  private async createFileDigest(files: Array<{path: string; sha: string}>): Promise<Record<string, string>> {
    const digest: Record<string, string> = {};
    for (const file of files) {
      digest[file.path] = file.sha;
    }
    return digest;
  }

  /**
   * Wait for deployment to complete
   * @private
   */
  private async waitForDeploy(client: NetlifyAPI, deployId: string): Promise<void> {
    const maxAttempts = TIME_CONSTANTS.FIVE_MINUTES / POLLING_INTERVALS.NORMAL;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const deploy = await client.getDeploy({ deployId });

      if (deploy.state === 'ready') {
        return;
      } else if (deploy.state === 'error') {
        throw new Error('Deployment failed');
      }

      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVALS.NORMAL));
      attempts++;
    }

    throw createTimeoutError('Deployment', TIME_CONSTANTS.FIVE_MINUTES);
  }

  /**
   * Get deployment status from Netlify
   */
  protected async getDeploymentStatusImplementation(deploymentId: string): Promise<DeploymentStatus> {
    try {
      const client = this.getNetlifyClient();
      const deploy = await client.getDeploy({ deployId: deploymentId });

      // Map Netlify state to our phase
      const phaseMap: Record<string, DeploymentStatus['phase']> = {
        'new': 'queued',
        'building': 'building',
        'ready': 'ready',
        'error': 'failed',
        'enqueued': 'queued',
        'preparing': 'preparing',
        'processing': 'building'
      };

      const phase = phaseMap[deploy.state || 'new'] || 'unknown';

      const status: DeploymentStatus = {
        deploymentId,
        phase,
        progress: phase === 'ready' ? PROGRESS.COMPLETE : phase === 'building' ? PROGRESS.HALFWAY : PROGRESS.STARTED,
        message: deploy.error_message || `Deployment is ${deploy.state}`,
        startTime: deploy.created_at ? new Date(deploy.created_at) : new Date(),
        ...(deploy.published_at && { endTime: new Date(deploy.published_at) }),
        ...(deploy.ssl_url || deploy.deploy_ssl_url ? { url: deploy.ssl_url || deploy.deploy_ssl_url! } : {}),
        health: {
          status: phase === 'ready' ? 'healthy' : 'unknown',
          checks: []
        }
      };

      return status;
    } catch (error) {
      throw createNetworkError('status check', error as Error);
    }
  }

  /**
   * Get deployment logs
   */
  protected async getDeploymentLogsImplementation(deploymentId: string, limit?: number): Promise<DeploymentLog[]> {
    try {
      const client = this.getNetlifyClient();

      // Get deploy to access log_access_attributes
      const deploy = await client.getDeploy({ deployId: deploymentId });

      // Netlify doesn't provide a direct log API endpoint in the SDK
      // Logs are typically accessed via the build log URL
      // For now, we'll return basic deploy information as logs
      const logs: DeploymentLog[] = [];

      if (deploy.created_at) {
        logs.push({
          timestamp: new Date(deploy.created_at),
          level: 'info',
          message: 'Deployment created',
          source: 'netlify'
        });
      }

      if (deploy.published_at) {
        logs.push({
          timestamp: new Date(deploy.published_at),
          level: 'info',
          message: 'Deployment published',
          source: 'netlify'
        });
      }

      if (deploy.error_message) {
        logs.push({
          timestamp: deploy.updated_at ? new Date(deploy.updated_at) : new Date(),
          level: 'error',
          message: deploy.error_message,
          source: 'netlify'
        });
      }

      return logs.slice(0, limit || DEFAULT_LIMITS.LOG_ENTRIES);
    } catch (error) {
      throw createNetworkError('log retrieval', error as Error);
    }
  }

  /**
   * Cancel a deployment
   */
  protected async cancelDeploymentImplementation(deploymentId: string): Promise<void> {
    try {
      this.logger.info('Cancelling Netlify deployment', { deploymentId });

      const client = this.getNetlifyClient();

      // Cancel the deployment using Netlify API
      await client.cancelSiteDeploy({
        deploy_id: deploymentId
      });

      this.logger.info('Netlify deployment cancelled successfully', { deploymentId });
    } catch (error) {
      throw createNetworkError('deployment cancellation', error as Error);
    }
  }

  /**
   * List deployments
   */
  protected async listDeploymentsImplementation(_projectId?: string, limit?: number): Promise<DeploymentSummary[]> {
    try {
      const client = this.getNetlifyClient();
      const providerConfig = this.config as NetlifyProviderConfig | undefined;
      const siteId = process.env['NETLIFY_SITE_ID'] || providerConfig?.siteId;

      if (!siteId) {
        throw new Error('Netlify site ID not configured');
      }

      // List deployments for the site
      const deploys = await client.listSiteDeploys({
        site_id: siteId,
        per_page: limit || DEFAULT_LIMITS.DEPLOYMENT_LIST
      });

      // Map Netlify deploys to our DeploymentSummary format
      const deployments: DeploymentSummary[] = deploys.map(deploy => ({
        deploymentId: deploy.id || '',
        status: this.mapDeployState(deploy.state),
        environment: deploy.context === 'production' ? 'production' : 'preview',
        createdAt: deploy.created_at ? new Date(deploy.created_at) : new Date(),
        ...(deploy.published_at && { completedAt: new Date(deploy.published_at) }),
        url: deploy.ssl_url || deploy.deploy_ssl_url || `https://${deploy.id}.netlify.app`,
        version: deploy.commit_ref || '1.0.0'
      }));

      return deployments;
    } catch (error) {
      throw createNetworkError('deployment listing', error as Error);
    }
  }

  /**
   * Map Netlify deploy state to our status
   * @private
   */
  private mapDeployState(state: string | undefined): DeploymentSummary['status'] {
    const stateMap: Record<string, DeploymentSummary['status']> = {
      'ready': 'ready',
      'building': 'building',
      'error': 'failed',
      'new': 'queued',
      'enqueued': 'queued',
      'preparing': 'preparing',
      'processing': 'building'
    };

    return stateMap[state || 'new'] || 'ready';
  }

  /**
   * Rollback deployment
   */
  protected async rollbackImplementation(deploymentId: string): Promise<DeploymentResult> {
    try {
      this.logger.info('Rolling back Netlify deployment', { deploymentId });

      const client = this.getNetlifyClient();
      const deploy = await client.getDeploy({ deployId: deploymentId });

      if (!deploy.site_id) {
        throw new Error('Deploy site ID not found');
      }

      // Restore the deployment (Netlify's rollback mechanism)
      const restoredDeploy = await client.restoreSiteDeploy({
        site_id: deploy.site_id,
        deploy_id: deploymentId
      });

      this.logger.info('Netlify deployment rolled back successfully', {
        deploymentId,
        restoredId: restoredDeploy.id
      });

      const result: DeploymentResult = {
        deploymentId: restoredDeploy.id || deploymentId,
        url: restoredDeploy.ssl_url || restoredDeploy.deploy_ssl_url || `https://${restoredDeploy.id}.netlify.app`,
        status: 'ready',
        buildTime: 0, // No build time for rollback
        environment: 'production',
        version: restoredDeploy.commit_ref || '1.0.0-rollback',
        metadata: {
          provider: 'netlify',
          siteId: deploy.site_id,
          rollbackFrom: deploymentId
        }
      };

      return result;
    } catch (error) {
      throw createNetworkError('rollback', error as Error);
    }
  }

  /**
   * Estimate deployment cost
   *
   * Netlify Pricing (as of 2024):
   * - Free Tier: 100GB bandwidth, 300 build minutes/month
   * - Pro Plan: $19/month - 1TB bandwidth, 25,000 build minutes
   * - Enterprise: Custom pricing
   */
  protected async estimateCostImplementation(config: DeploymentConfig): Promise<CostEstimate> {
    try {
      // Determine plan based on environment or project requirements
      const isProd = config.environment === 'production';

      const estimate: CostEstimate = {
        monthly: {
          typical: isProd ? DEFAULT_COSTS.netlify.proPlanMonthly : 0.00,
          minimum: 0.00,
          maximum: DEFAULT_COSTS.netlify.enterprisePlanMonthly,
          freeTier: !isProd,
          currency: 'USD'
        },
        traffic: {
          freeRequests: DEFAULT_COSTS.netlify.freeTierRequests,
          costPerAdditionalRequest: 0.000001, // Netlify charges per GB, not per request
          bandwidthIncluded: DEFAULT_COSTS.netlify.freeTierBandwidthGB,
          costPerGB: 0.20 // $20 per 100GB overage
        },
        storage: {
          freeStorage: DEFAULT_COSTS.netlify.freeTierBandwidthGB,
          costPerGB: 0.08 // Large Media storage cost
        },
        additional: [
          {
            service: 'Build Minutes',
            cost: 0.007,
            description: `Beyond ${isProd ? '25,000' : '300'} minutes/month`,
            unit: 'minute'
          },
          {
            service: 'Serverless Functions',
            cost: 0.0000025,
            description: `Beyond ${isProd ? '2M' : '125K'} invocations/month`,
            unit: 'invocation'
          },
          {
            service: 'Form Submissions',
            cost: 0.000019,
            description: 'Beyond 100 submissions/month (Pro plan)',
            unit: 'submission'
          }
        ]
      };

      return estimate;
    } catch (error) {
      throw createNetworkError('cost estimation', error as Error);
    }
  }

  /**
   * Get provider health status
   *
   * Checks Netlify API connectivity and account status
   */
  protected async getHealthStatusImplementation(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      const client = this.getNetlifyClient();

      // Test API connectivity by listing sites (minimal resource operation)
      await client.listSites({ per_page: 1 });

      const checkDuration = Date.now() - startTime;

      const healthStatus: ProviderHealthStatus = {
        status: 'healthy',
        details: {
          api: { status: 'healthy', responseTime: checkDuration },
          authentication: { status: 'healthy', message: 'Token valid' }
        },
        lastChecked: new Date(),
        checkDuration
      };

      return healthStatus;
    } catch (error) {
      const checkDuration = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      // Determine if it's an auth issue or API issue
      const isAuthError = errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('token');

      return {
        status: 'unhealthy',
        details: {
          api: {
            status: isAuthError ? 'healthy' : 'unhealthy',
            message: isAuthError ? 'API accessible' : 'API request failed'
          },
          authentication: {
            status: isAuthError ? 'unhealthy' : 'healthy',
            message: isAuthError ? 'Invalid or expired token' : 'Token valid'
          },
          error: errorMessage
        },
        lastChecked: new Date(),
        checkDuration
      };
    }
  }
}