/**
 * @fileoverview Render Provider - Implementation for Render platform deployments
 * @description Concrete implementation of the BaseProvider for Render's cloud
 * platform. Specializes in web services, static sites, databases, and background
 * services with Docker support and automatic SSL.
 *
 * Render excels at:
 * - Web services and APIs with Docker support
 * - Static site hosting with global CDN
 * - Managed databases (PostgreSQL)
 * - Background workers and cron jobs
 * - Automatic SSL certificates
 * - Git-based deployments with preview environments
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import { BaseProvider } from './base-provider.js'
import { DEFAULT_LIMITS, DEFAULT_COSTS, PROGRESS } from '../constants/provider-constants.js'
import type {
  CloudProviderType,
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

import type { RenderProviderConfig } from '../types/provider-config.types.js';

import {
  createTokenNotConfiguredError,
  createDeploymentFailedError,
  createNetworkError,
  createMissingRequiredFieldError
} from '../../constants/errors.js';


/**
 * Render Provider implementation
 * @class RenderProvider
 * @extends {BaseProvider}
 * @description Concrete implementation of cloud provider interface for Render platform.
 * Focused on simplicity and developer experience with strong Docker support.
 */
export class RenderProvider extends BaseProvider {
  private static readonly API_BASE_URL = 'https://api.render.com/v1';

  private static readonly SUPPORTED_FEATURES: ProviderFeature[] = [
    'auto-scaling',
    'custom-domains',
    'ssl-certificates',
    'monitoring',
    'logs',
    'database',
    'file-storage',
    'ci-cd',
    'rollback',
    'environment-variables',
    'team-collaboration',
    'docker-support',
    'backup',
  ];

  private static readonly SUPPORTED_REGIONS: string[] = [
    'oregon',      // Oregon, USA
    'ohio',        // Ohio, USA
    'virginia',    // Virginia, USA
    'frankfurt',   // Frankfurt, Germany
    'singapore',   // Singapore
  ];

  private static readonly SUPPORTED_FRAMEWORKS: FrameworkType[] = [
    'nextjs',
    'react',
    'vue',
    'nuxt',
    'svelte',
    'sveltekit',
    'angular',
    'static',
    'express',
    'fastify',
    'nestjs',
    'django',
    'flask',
    'rails',
    'spring',
    'gin',
    'fiber',
  ];

  private static readonly SUPPORTED_LANGUAGES: ProgrammingLanguage[] = [
    'typescript',
    'javascript',
    'python',
    'ruby',
    'go',
    'rust',
    'java',
    'php',
  ];

  constructor() {
    super(
      'render' as CloudProviderType,
      RenderProvider.SUPPORTED_FEATURES,
      RenderProvider.SUPPORTED_REGIONS
    );
  }

  /**
   * Get Render API key from config or environment
   * @private
   */
  private getApiKey(): string {
    const config = this.config as RenderProviderConfig | undefined;
    const apiKey = config?.apiKey || process.env['RENDER_API_KEY'];

    if (!apiKey) {
      throw createTokenNotConfiguredError('Render');
    }

    return apiKey;
  }

  /**
   * Get service ID from config or environment
   * @private
   */
  private getServiceId(): string {
    const config = this.config as RenderProviderConfig | undefined;
    const serviceId = config?.serviceId || process.env['RENDER_SERVICE_ID'];

    if (!serviceId) {
      throw createMissingRequiredFieldError('RENDER_SERVICE_ID');
    }

    return serviceId;
  }

  /**
   * Make authenticated API request to Render
   * @private
   */
  private async makeRenderRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const apiKey = this.getApiKey();
    const url = `${RenderProvider.API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Render API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Check if provider is configured
   */
  public override isConfigured(): boolean {
    const config = this.config as RenderProviderConfig | undefined;
    const hasApiKey = Boolean(config?.apiKey || process.env['RENDER_API_KEY']);
    const hasServiceId = Boolean(config?.serviceId || process.env['RENDER_SERVICE_ID']);

    return hasApiKey && hasServiceId;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxDeployments: 100, // Per account for free tier
      maxBuildTime: 90, // minutes
      maxFileSize: 500, // MB per file
      supportedFrameworks: RenderProvider.SUPPORTED_FRAMEWORKS,
      supportedLanguages: RenderProvider.SUPPORTED_LANGUAGES,
      customDomains: true,
      environmentVariables: true,
      teamCollaboration: true,
      apiAccess: true,
    };
  }


  protected async deployImplementation(config: DeploymentConfig): Promise<DeploymentResult> {
    try {
      this.logger.info('Starting Render deployment', {
        environment: config.environment
      });

      const serviceId = this.getServiceId();

      // Trigger a new deploy for the service
      interface RenderDeploy {
        id: string;
        status: string;
        createdAt: string;
        finishedAt?: string;
        commit?: {
          id: string;
          message: string;
        };
      }

      const deploy = await this.makeRenderRequest<RenderDeploy>(
        `/services/${serviceId}/deploys`,
        { method: 'POST' }
      );

      this.logger.info('Render deployment created', {
        deploymentId: deploy.id,
        status: deploy.status
      });

      // Wait for deployment to complete
      await this.waitForDeployment(serviceId, deploy.id);

      // Get final deploy status
      const finalDeploy = await this.makeRenderRequest<RenderDeploy>(
        `/services/${serviceId}/deploys/${deploy.id}`
      );

      // Get service details for URL
      interface RenderService {
        id: string;
        name: string;
        serviceDetails: {
          url?: string;
        };
      }

      const service = await this.makeRenderRequest<RenderService>(
        `/services/${serviceId}`
      );

      const result: DeploymentResult = {
        deploymentId: deploy.id,
        url: service.serviceDetails.url || `https://${service.name}.onrender.com`,
        status: this.mapRenderStatus(finalDeploy.status),
        buildTime: finalDeploy.finishedAt && deploy.createdAt
          ? Math.floor((new Date(finalDeploy.finishedAt).getTime() - new Date(deploy.createdAt).getTime()) / 1000)
          : 0,
        environment: config.environment || 'production',
        version: deploy.commit?.id || '1.0.0',
        metadata: {
          provider: 'render',
          serviceId,
          serviceName: service.name,
          commit: deploy.commit
        }
      };

      return result;
    } catch (error) {
      throw createDeploymentFailedError('Render', (error as Error).message);
    }
  }

  /**
   * Wait for deployment to complete
   * @private
   */
  private async waitForDeployment(serviceId: string, deployId: string): Promise<void> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      interface RenderDeploy {
        status: string;
      }

      const deploy = await this.makeRenderRequest<RenderDeploy>(
        `/services/${serviceId}/deploys/${deployId}`
      );

      if (deploy.status === 'live') {
        return;
      } else if (deploy.status === 'build_failed' || deploy.status === 'update_failed' || deploy.status === 'canceled') {
        throw new Error(`Deployment ${deploy.status}`);
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Deployment timed out after 5 minutes');
  }

  /**
   * Map Render status to our deployment status
   * @private
   */
  private mapRenderStatus(status: string): DeploymentResult['status'] {
    const statusMap: Record<string, DeploymentResult['status']> = {
      'live': 'ready',
      'building': 'building',
      'build_failed': 'failed',
      'update_failed': 'failed',
      'canceled': 'cancelled',
      'pre_deploy': 'preparing',
      'deploying': 'deploying'
    };

    return statusMap[status] || 'ready';
  }

  protected async getDeploymentStatusImplementation(deploymentId: string): Promise<DeploymentStatus> {
    try {
      const serviceId = this.getServiceId();

      interface RenderDeploy {
        id: string;
        status: string;
        createdAt: string;
        updatedAt: string;
        finishedAt?: string;
      }

      const deploy = await this.makeRenderRequest<RenderDeploy>(
        `/services/${serviceId}/deploys/${deploymentId}`
      );

      // Get service details for URL
      interface RenderService {
        name: string;
        serviceDetails: {
          url?: string;
        };
      }

      const service = await this.makeRenderRequest<RenderService>(
        `/services/${serviceId}`
      );

      // Map status to phase
      const phaseMap: Record<string, DeploymentStatus['phase']> = {
        'created': 'queued',
        'build_in_progress': 'building',
        'pre_deploy_in_progress': 'preparing',
        'update_in_progress': 'deploying',
        'live': 'ready',
        'deactivated': 'cancelled',
        'build_failed': 'failed',
        'update_failed': 'failed',
        'canceled': 'cancelled'
      };

      const phase = phaseMap[deploy.status] || 'unknown';
      const progress = phase === 'ready' ? PROGRESS.COMPLETE :
                      phase === 'building' ? PROGRESS.HALFWAY :
                      phase === 'deploying' ? PROGRESS.NEARLY_DONE : PROGRESS.STARTED;

      return {
        deploymentId,
        phase,
        progress,
        message: `Deployment is ${deploy.status}`,
        startTime: new Date(deploy.createdAt),
        ...(deploy.finishedAt && { endTime: new Date(deploy.finishedAt) }),
        url: service.serviceDetails.url || `https://${service.name}.onrender.com`,
        health: {
          status: phase === 'ready' ? 'healthy' : 'unknown',
          checks: []
        }
      };
    } catch (error) {
      throw createNetworkError('deployment status check', error as Error);
    }
  }

  protected async cancelDeploymentImplementation(deploymentId: string): Promise<void> {
    try {
      this.logger.info('Cancelling Render deployment', { deploymentId });

      const serviceId = this.getServiceId();

      await this.makeRenderRequest(
        `/services/${serviceId}/deploys/${deploymentId}/cancel`,
        { method: 'POST' }
      );

      this.logger.info('Render deployment cancelled successfully', { deploymentId });
    } catch (error) {
      throw createNetworkError('deployment cancellation', error as Error);
    }
  }

  protected async getDeploymentLogsImplementation(deploymentId: string, limit?: number): Promise<DeploymentLog[]> {
    try {
      const serviceId = this.getServiceId();

      // Get deploy info to determine time range
      interface RenderDeploy {
        createdAt: string;
        finishedAt?: string;
      }

      const deploy = await this.makeRenderRequest<RenderDeploy>(
        `/services/${serviceId}/deploys/${deploymentId}`
      );

      // Query logs for this deployment
      interface RenderLogEntry {
        timestamp: string;
        message: string;
        type?: string;
      }

      const startTime = new Date(deploy.createdAt).toISOString();
      const endTime = deploy.finishedAt ? new Date(deploy.finishedAt).toISOString() : new Date().toISOString();

      const logsResponse = await this.makeRenderRequest<RenderLogEntry[]>(
        `/logs?deployId=${deploymentId}&startTime=${startTime}&endTime=${endTime}&limit=${limit || DEFAULT_LIMITS.LOG_ENTRIES}`
      );

      // Map Render logs to our format
      const logs: DeploymentLog[] = logsResponse.map(log => ({
        timestamp: new Date(log.timestamp),
        level: log.type === 'error' ? 'error' : 'info',
        message: log.message,
        source: 'render'
      }));

      return logs;
    } catch (error) {
      throw createNetworkError('log retrieval', error as Error);
    }
  }

  protected async listDeploymentsImplementation(_projectId?: string, limit?: number): Promise<DeploymentSummary[]> {
    try {
      const serviceId = this.getServiceId();

      interface RenderDeploy {
        id: string;
        status: string;
        createdAt: string;
        finishedAt?: string;
        commit?: {
          id: string;
          message: string;
        };
      }

      const deploys = await this.makeRenderRequest<RenderDeploy[]>(
        `/services/${serviceId}/deploys?limit=${limit || DEFAULT_LIMITS.DEPLOYMENT_LIST}`
      );

      // Get service details for URL
      interface RenderService {
        name: string;
        serviceDetails: {
          url?: string;
        };
      }

      const service = await this.makeRenderRequest<RenderService>(
        `/services/${serviceId}`
      );

      // Map Render deploys to our format
      const deployments: DeploymentSummary[] = deploys.map(deploy => ({
        deploymentId: deploy.id,
        status: this.mapDeploymentStatus(deploy.status),
        environment: 'production',
        createdAt: new Date(deploy.createdAt),
        ...(deploy.finishedAt && { completedAt: new Date(deploy.finishedAt) }),
        url: service.serviceDetails.url || `https://${service.name}.onrender.com`,
        version: deploy.commit?.id || '1.0.0'
      }));

      return deployments;
    } catch (error) {
      throw createNetworkError('deployment listing', error as Error);
    }
  }

  /**
   * Map Render deploy status to our DeploymentSummary status
   * @private
   */
  private mapDeploymentStatus(status: string): DeploymentSummary['status'] {
    const statusMap: Record<string, DeploymentSummary['status']> = {
      'created': 'queued',
      'build_in_progress': 'building',
      'pre_deploy_in_progress': 'preparing',
      'update_in_progress': 'deploying',
      'live': 'ready',
      'deactivated': 'cancelled',
      'build_failed': 'failed',
      'update_failed': 'failed',
      'canceled': 'cancelled'
    };

    return statusMap[status] || 'ready';
  }

  protected async rollbackImplementation(deploymentId: string): Promise<DeploymentResult> {
    try {
      this.logger.info('Rolling back Render deployment', { deploymentId });

      // Render doesn't have a direct rollback API
      // Instead, trigger a new deployment (which will use the previous code)
      // In a real implementation, you might need to track the previous commit and redeploy that

      const serviceId = this.getServiceId();

      // Trigger a new deploy (rollback by redeploying)
      interface RenderDeploy {
        id: string;
        status: string;
        createdAt: string;
      }

      const newDeploy = await this.makeRenderRequest<RenderDeploy>(
        `/services/${serviceId}/deploys`,
        { method: 'POST' }
      );

      // Get service details
      interface RenderService {
        name: string;
        serviceDetails: {
          url?: string;
        };
      }

      const service = await this.makeRenderRequest<RenderService>(
        `/services/${serviceId}`
      );

      this.logger.info('Render rollback deployment created', {
        newDeploymentId: newDeploy.id,
        originalDeploymentId: deploymentId
      });

      return {
        deploymentId: newDeploy.id,
        url: service.serviceDetails.url || `https://${service.name}.onrender.com`,
        status: 'building',
        buildTime: 0,
        environment: 'production',
        version: '1.0.0-rollback',
        metadata: {
          provider: 'render',
          serviceId,
          rollbackFrom: deploymentId
        }
      };
    } catch (error) {
      throw createNetworkError('rollback', error as Error);
    }
  }

  protected async estimateCostImplementation(config: DeploymentConfig): Promise<CostEstimate> {
    // Render pricing model
    const isProduction = config.environment === 'production';

    return {
      monthly: {
        freeTier: !isProduction,
        minimum: 0,
        typical: isProduction ? DEFAULT_COSTS.render.starterPlanMonthly : 0,
        maximum: DEFAULT_COSTS.render.proPlanMonthly,
        currency: 'USD'
      },
      traffic: {
        freeRequests: Infinity, // No request limits
        costPerAdditionalRequest: 0,
        bandwidthIncluded: 100, // GB per month
        costPerGB: 0.10 // Additional bandwidth
      },
      storage: {
        freeStorage: 1, // 1GB SSD included
        costPerGB: 0.25, // Additional storage
      },
      additional: [
        {
          service: 'Web Service',
          description: 'Starter instance (512MB RAM, 0.1 CPU)',
          cost: DEFAULT_COSTS.render.starterPlanMonthly,
          unit: 'month'
        },
        {
          service: 'PostgreSQL Database',
          description: 'Managed PostgreSQL database',
          cost: DEFAULT_COSTS.render.starterPlanMonthly,
          unit: 'month'
        },
        {
          service: 'Background Worker',
          description: 'Background service for async tasks',
          cost: DEFAULT_COSTS.render.starterPlanMonthly,
          unit: 'month'
        },
        {
          service: 'Disk Storage',
          description: 'Additional SSD storage',
          cost: 0.25, // $0.25 per GB per month
          unit: 'gb-month'
        }
      ]
    };
  }

  /**
   * Get health status implementation
   * Tests Render API connectivity and authentication
   */
  protected async getHealthStatusImplementation(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      const serviceId = this.getServiceId();

      // Test API connectivity by getting service details
      await this.makeRenderRequest(`/services/${serviceId}`);

      const checkDuration = Date.now() - startTime;

      return {
        status: 'healthy',
        lastChecked: new Date(),
        checkDuration,
        details: {
          api: { status: 'healthy', responseTime: checkDuration },
          authentication: { status: 'healthy', message: 'API key valid' }
        }
      };
    } catch (error) {
      const checkDuration = Date.now() - startTime;
      const errorMessage = (error as Error).message;
      const isAuthError = errorMessage.includes('401') || errorMessage.includes('403');

      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        checkDuration,
        details: {
          api: {
            status: isAuthError ? 'healthy' : 'unhealthy',
            message: isAuthError ? 'API accessible' : 'API request failed'
          },
          authentication: {
            status: isAuthError ? 'unhealthy' : 'healthy',
            message: isAuthError ? 'Invalid or expired API key' : 'API key valid'
          },
          error: errorMessage
        }
      };
    }
  }
}