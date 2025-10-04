/**
 * @fileoverview Railway Provider - Implementation for Railway platform deployments
 * @description Concrete implementation of the BaseProvider for Railway's deployment
 * platform. Specializes in containerized applications with built-in database
 * provisioning and Git-based deployments.
 *
 * Railway excels at:
 * - Containerized application deployments
 * - Built-in database provisioning (PostgreSQL, MySQL, Redis, MongoDB)
 * - Git-based continuous deployment
 * - Environment-based staging and production
 * - Simple pricing with resource-based scaling
 * - Team collaboration and project management
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import { GraphQLClient } from 'graphql-request';
import { BaseProvider } from './base-provider.js'
import { DEFAULT_LIMITS, DEFAULT_COSTS, PROGRESS } from '../constants/provider-constants.js'
import {
  createTokenNotConfiguredError,
  createNetworkError
} from '../../constants/errors.js';
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
} from '../types/cost.types.js';

import {
  LOGGING_CONSTANTS
} from '../constants/cloud-constants.js';

import { getCloudConfig } from '../config/cloud-config.js'

/**
 * Railway Provider implementation
 * @class RailwayProvider
 * @extends {BaseProvider}
 * @description Concrete implementation of cloud provider interface for Railway platform.
 * Optimized for full-stack applications with database requirements and containerized deployments.
 */
export class RailwayProvider extends BaseProvider {
  private static readonly API_ENDPOINT = 'https://backboard.railway.app/graphql/v2';
  private client?: GraphQLClient;
  private projectId?: string;
  private environmentId?: string;

  constructor() {
    const railwayConfig = getCloudConfig().providers.railway;

    super(
      'railway' as CloudProviderType,
      railwayConfig.features,
      railwayConfig.regions
    );
  }

  /**
   * Get Railway API token from config or environment
   */
  private getToken(): string {
    const token = process.env['RAILWAY_TOKEN'] || process.env['RAILWAY_API_TOKEN'];
    if (!token) {
      throw createTokenNotConfiguredError('Railway');
    }
    return token;
  }

  /**
   * Get Railway project ID from config or environment
   */
  private getProjectId(): string {
    if (!this.projectId) {
      const envProjectId = process.env['RAILWAY_PROJECT_ID'];
      if (envProjectId) {
        this.projectId = envProjectId;
      }
    }
    if (!this.projectId) {
      throw new Error('Railway project ID is required. Set RAILWAY_PROJECT_ID environment variable.');
    }
    return this.projectId;
  }

  /**
   * Get Railway environment ID (defaults to production)
   */
  private getEnvironmentId(): string {
    if (!this.environmentId) {
      this.environmentId = process.env['RAILWAY_ENVIRONMENT_ID'] || 'production';
    }
    return this.environmentId;
  }

  /**
   * Initialize GraphQL client with authentication
   */
  private getGraphQLClient(): GraphQLClient {
    if (!this.client) {
      const token = this.getToken();
      this.client = new GraphQLClient(RailwayProvider.API_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
    return this.client;
  }

  /**
   * Map Railway deployment status to our standard status
   */
  private mapRailwayStatus(railwayStatus: string): DeploymentStatus['phase'] {
    const statusMap: Record<string, DeploymentStatus['phase']> = {
      'BUILDING': 'building',
      'DEPLOYING': 'deploying',
      'SUCCESS': 'ready',
      'FAILED': 'failed',
      'CRASHED': 'failed',
      'REMOVED': 'cancelled',
      'WAITING': 'queued',
      'INITIALIZING': 'initializing',
    };
    return statusMap[railwayStatus.toUpperCase()] || 'unknown';
  }

  override getCapabilities(): ProviderCapabilities {
    const railwayConfig = getCloudConfig().providers.railway;

    return {
      maxDeployments: railwayConfig.limits.maxDeployments,
      maxBuildTime: railwayConfig.limits.maxBuildTime,
      maxFileSize: railwayConfig.limits.maxFileSize,
      supportedFrameworks: ['react', 'vue', 'angular', 'nextjs', 'nuxt', 'svelte', 'express', 'fastify', 'django', 'flask'],
      supportedLanguages: ['javascript', 'typescript', 'python', 'ruby', 'php', 'go', 'rust'],
      customDomains: true,
      environmentVariables: true,
      teamCollaboration: true,
      apiAccess: true,
    };
  }


  protected async deployImplementation(config: DeploymentConfig): Promise<DeploymentResult> {
    try {
      this.logger.info('Starting Railway deployment', {
        environment: config.environment
      });

      const client = this.getGraphQLClient();
      const projectId = this.getProjectId();
      const environmentId = this.getEnvironmentId();

      // GraphQL mutation to trigger deployment
      const mutation = `
        mutation DeployProject($input: DeploymentCreateInput!) {
          deploymentCreate(input: $input) {
            id
            status
            createdAt
            service {
              id
              name
            }
          }
        }
      `;

      const variables = {
        input: {
          projectId,
          environmentId,
        }
      };

      const startTime = Date.now();
      const data: any = await client.request(mutation, variables);
      const buildTime = Date.now() - startTime;

      const deployment = data.deploymentCreate;

      return {
        deploymentId: deployment.id,
        url: `https://${deployment.service.name}.up.railway.app`,
        status: this.mapRailwayStatus(deployment.status),
        buildTime,
        environment: config.environment || 'production',
        version: '1.0.0',
        metadata: {
          provider: 'railway',
          projectId,
          serviceId: deployment.service.id,
          serviceName: deployment.service.name,
          environmentId,
        }
      };
    } catch (error) {
      this.logger.error('Railway deployment failed');
      throw createNetworkError('Railway deployment');
    }
  }

  protected async getDeploymentStatusImplementation(deploymentId: string): Promise<DeploymentStatus> {
    try {
      const client = this.getGraphQLClient();

      const query = `
        query GetDeployment($id: String!) {
          deployment(id: $id) {
            id
            status
            createdAt
            completedAt
            service {
              name
            }
          }
        }
      `;

      const data: any = await client.request(query, { id: deploymentId });
      const deployment = data.deployment;

      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      const phase = this.mapRailwayStatus(deployment.status);
      const progress = phase === 'ready' ? PROGRESS.COMPLETE :
                       phase === 'building' ? PROGRESS.HALFWAY :
                       phase === 'deploying' ? PROGRESS.NEARLY_DONE : PROGRESS.STARTED;

      return {
        deploymentId: deployment.id,
        phase,
        progress,
        message: `Deployment ${phase}`,
        startTime: new Date(deployment.createdAt),
        ...(deployment.completedAt ? { endTime: new Date(deployment.completedAt) } : {}),
        health: {
          status: phase === 'ready' ? 'healthy' : phase === 'failed' ? 'unhealthy' : 'unknown',
          checks: [],
        },
        url: `https://${deployment.service.name}.up.railway.app`,
      };
    } catch (error) {
      this.logger.error('Failed to get Railway deployment status');
      throw createNetworkError('get deployment status');
    }
  }

  protected async cancelDeploymentImplementation(deploymentId: string): Promise<void> {
    try {
      this.logger.info('Cancelling Railway deployment', { deploymentId });
      const client = this.getGraphQLClient();

      const mutation = `
        mutation CancelDeployment($id: String!) {
          deploymentCancel(id: $id) {
            id
            status
          }
        }
      `;

      await client.request(mutation, { id: deploymentId });
      this.logger.info('Railway deployment cancelled successfully');
    } catch (error) {
      this.logger.error('Failed to cancel Railway deployment');
      throw createNetworkError('cancel deployment');
    }
  }

  protected async getDeploymentLogsImplementation(deploymentId: string, limit?: number): Promise<DeploymentLog[]> {
    try {
      const client = this.getGraphQLClient();

      const query = `
        query GetDeploymentLogs($deploymentId: String!, $limit: Int) {
          deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
            timestamp
            message
            severity
          }
        }
      `;

      const data: any = await client.request(query, {
        deploymentId,
        limit: limit || DEFAULT_LIMITS.LOG_ENTRIES
      });

      const logs = data.deploymentLogs || [];

      return logs.map((log: any) => ({
        timestamp: new Date(log.timestamp),
        level: log.severity?.toLowerCase() || LOGGING_CONSTANTS.LOG_LEVEL_INFO,
        message: log.message,
        source: LOGGING_CONSTANTS.LOG_SOURCE_DEPLOYMENT,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch Railway deployment logs');
      throw createNetworkError('fetch deployment logs');
    }
  }

  protected async listDeploymentsImplementation(_projectId?: string, limit?: number): Promise<DeploymentSummary[]> {
    try {
      const client = this.getGraphQLClient();
      const projectId = _projectId || this.getProjectId();

      const query = `
        query ListDeployments($projectId: String!, $first: Int) {
          deployments(projectId: $projectId, first: $first) {
            edges {
              node {
                id
                status
                createdAt
                completedAt
                service {
                  name
                }
              }
            }
          }
        }
      `;

      const data: any = await client.request(query, {
        projectId,
        first: limit || DEFAULT_LIMITS.DEPLOYMENT_LIST
      });

      const deployments = data.deployments?.edges || [];

      return deployments.map((edge: any) => {
        const deployment = edge.node;
        return {
          deploymentId: deployment.id,
          environment: 'production',
          status: this.mapRailwayStatus(deployment.status),
          url: `https://${deployment.service.name}.up.railway.app`,
          createdAt: new Date(deployment.createdAt),
          completedAt: deployment.completedAt ? new Date(deployment.completedAt) : undefined,
          version: '1.0.0',
        };
      });
    } catch (error) {
      this.logger.error('Failed to list Railway deployments');
      throw createNetworkError('list deployments');
    }
  }

  protected async rollbackImplementation(deploymentId: string): Promise<DeploymentResult> {
    try {
      this.logger.info('Rolling back Railway deployment', { deploymentId });
      const client = this.getGraphQLClient();

      // Railway doesn't have a direct rollback mutation
      // We need to trigger a new deployment with the previous version
      const mutation = `
        mutation RollbackDeployment($deploymentId: String!) {
          deploymentRollback(id: $deploymentId) {
            id
            status
            createdAt
            service {
              id
              name
            }
          }
        }
      `;

      const startTime = Date.now();
      const data: any = await client.request(mutation, { deploymentId });
      const buildTime = Date.now() - startTime;

      const deployment = data.deploymentRollback;

      return {
        deploymentId: deployment.id,
        url: `https://${deployment.service.name}.up.railway.app`,
        status: this.mapRailwayStatus(deployment.status),
        buildTime,
        environment: 'production',
        version: '1.0.0-rollback',
        metadata: {
          provider: 'railway',
          serviceId: deployment.service.id,
          serviceName: deployment.service.name,
          originalDeploymentId: deploymentId,
          rollback: true,
        }
      };
    } catch (error) {
      this.logger.error('Failed to rollback Railway deployment');
      throw createNetworkError('rollback deployment');
    }
  }

  protected async estimateCostImplementation(config: DeploymentConfig): Promise<CostEstimate> {
    // Railway pricing model (resource-based)
    return {
      monthly: {
        freeTier: config.environment !== 'production',
        minimum: DEFAULT_COSTS.railway.starterPlanMonthly,
        typical: config.environment === 'production' ? DEFAULT_COSTS.railway.proPlanMonthly : 0,
        currency: 'USD'
      },
      traffic: {
        freeRequests: Infinity, // No request limits
        costPerAdditionalRequest: 0,
        bandwidthIncluded: Infinity, // No bandwidth limits
        costPerGB: 0
      },
      storage: {
        freeStorage: 1, // 1GB included
        costPerGB: 0.25, // $0.25 per GB per month
      },
      additional: [
        {
          service: 'vCPU Hours',
          description: 'CPU time usage',
          cost: 0.000463, // $10 per month per vCPU
          unit: 'hour'
        },
        {
          service: 'RAM Usage',
          description: 'Memory consumption',
          cost: 0.000231, // $5 per month per GB RAM
          unit: 'gb-hour'
        },
        {
          service: 'Database',
          description: 'Managed PostgreSQL database',
          cost: DEFAULT_COSTS.railway.starterPlanMonthly,
          unit: 'month'
        }
      ]
    };
  }

  /**
   * Get health status implementation
   * @protected
   */
  protected async getHealthStatusImplementation(): Promise<any> {
    try {
      const client = this.getGraphQLClient();

      // Simple health check query
      const query = `
        query HealthCheck {
          me {
            id
          }
        }
      `;

      await client.request(query);

      return {
        healthy: true,
        status: 'operational',
        services: {
          api: 'operational',
          graphql: 'operational',
        }
      };
    } catch (error) {
      this.logger.error('Railway health check failed');
      return {
        healthy: false,
        status: 'degraded',
        services: {
          api: 'degraded',
          graphql: 'degraded',
        }
      };
    }
  }
}