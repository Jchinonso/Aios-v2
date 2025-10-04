/**
 * @fileoverview Deployment History Service
 * @description Production-grade service that aggregates deployment history from multiple sources:
 * 1. Cloud provider APIs (Vercel, Netlify, AWS, etc.) - source of truth
 * 2. Local state file (.aios/history.jsonl) - deployments made through AIOS
 * 3. Merged and deduplicated results
 *
 * @module node-cli/services/deployment-history-service
 */

import type {
  CloudProviderType,
  DeploymentSummary,
  CloudManager
} from '@aios/shared';
import { Result } from '@aios/shared';
import type { StateManager, DeploymentRecordType } from '../state/state-manager.js';

/**
 * Unified deployment record from multiple sources
 */
export interface UnifiedDeploymentRecord {
  readonly id: string;
  readonly timestamp: Date;
  readonly service: string;
  readonly environment: string;
  readonly provider: CloudProviderType;
  readonly status: 'pending' | 'success' | 'failed' | 'rolled-back' | 'building' | 'ready';
  readonly url?: string;
  readonly branch?: string;
  readonly commit?: string;
  readonly duration?: number;
  readonly source: 'cloud' | 'local' | 'both';
  readonly metadata?: Record<string, unknown>;
}

/**
 * Deployment history query options
 */
export interface DeploymentHistoryOptions {
  readonly provider?: CloudProviderType;
  readonly service?: string;
  readonly environment?: string;
  readonly since?: Date;
  readonly limit?: number;
  readonly includeCloudData?: boolean; // Default: true
  readonly includeLocalData?: boolean; // Default: true
}

/**
 * Cache entry for deployment history
 */
interface CacheEntry {
  readonly data: UnifiedDeploymentRecord[];
  readonly timestamp: Date;
  readonly ttl: number; // milliseconds
}

/**
 * Deployment History Service
 *
 * Queries real cloud provider APIs to get actual deployment history,
 * merges with local AIOS state, and provides unified view.
 *
 * @example
 * ```typescript
 * const service = new DeploymentHistoryService(stateManager);
 *
 * // Get all deployments from all providers
 * const all = await service.getDeploymentHistory(providers);
 *
 * // Get only production deployments
 * const prod = await service.getDeploymentHistory(providers, {
 *   environment: 'production',
 *   limit: 10
 * });
 *
 * // Get Vercel deployments only
 * const vercel = await service.getDeploymentHistory(providers, {
 *   provider: 'vercel'
 * });
 * ```
 */
export class DeploymentHistoryService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly defaultCacheTTL = 60000; // 1 minute

  constructor(
    private readonly stateManager: StateManager
  ) {}

  /**
   * Get unified deployment history from all sources
   *
   * @param cloudManager - CloudManager instance (optional - if not provided, only local history shown)
   * @param options - Query options for filtering
   * @returns Unified deployment records sorted by timestamp (newest first)
   */
  async getDeploymentHistory(
    cloudManager: CloudManager | null,
    options: DeploymentHistoryOptions = {}
  ): Promise<Result<UnifiedDeploymentRecord[]>> {
    try {
      const {
        provider,
        service,
        environment,
        since,
        limit = 50,
        includeCloudData = true,
        includeLocalData = true
      } = options;

      // Check cache first
      const cacheKey = this.buildCacheKey(options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return Result.success(cached);
      }

      // Fetch from multiple sources concurrently
      const [cloudRecords, localRecords] = await Promise.all([
        includeCloudData && cloudManager
          ? this.fetchFromCloudManager(cloudManager, options)
          : Promise.resolve([]),
        includeLocalData
          ? this.fetchFromLocalState(options)
          : Promise.resolve([])
      ]);

      // Merge and deduplicate
      const merged = this.mergeDeploymentRecords(cloudRecords, localRecords);

      // Apply filters
      let filtered = merged;

      if (provider) {
        filtered = filtered.filter(r => r.provider === provider);
      }

      if (service) {
        filtered = filtered.filter(r =>
          r.service.toLowerCase().includes(service.toLowerCase())
        );
      }

      if (environment) {
        filtered = filtered.filter(r => r.environment === environment);
      }

      if (since) {
        filtered = filtered.filter(r => r.timestamp >= since);
      }

      // Sort by timestamp (newest first) and apply limit
      const sorted = filtered
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      // Cache the results
      this.addToCache(cacheKey, sorted);

      return Result.success(sorted);

    } catch (error) {
      return Result.failure(
        error instanceof Error
          ? error
          : new Error('Failed to fetch deployment history')
      );
    }
  }

  /**
   * Fetch deployment history from CloudManager
   *
   * Queries all configured cloud providers via CloudManager's listDeployments API.
   * If a specific provider is requested in options, only that provider is queried.
   * Otherwise, queries all configured providers concurrently.
   *
   * @private
   */
  private async fetchFromCloudManager(
    cloudManager: CloudManager,
    options: DeploymentHistoryOptions
  ): Promise<UnifiedDeploymentRecord[]> {
    try {
      // Get list of configured providers
      const configuredProviders = await cloudManager.getConfiguredProviders();

      // Filter to specific provider if requested
      const providersToQuery = options.provider
        ? configuredProviders.filter(p => p.type === options.provider)
        : configuredProviders;

      if (providersToQuery.length === 0) {
        if (options.provider) {
          console.warn(`Provider ${options.provider} is not configured. Run 'aios connect ${options.provider}' to configure it.`);
        }
        return [];
      }

      // Query all providers concurrently
      const results = await Promise.allSettled(
        providersToQuery.map(async ({ type: provider }) => {
          try {
            const result = await cloudManager.listDeployments(
              provider,
              options.service,
              options.limit || 50
            );

            if (!result.success) {
              console.warn(`Failed to fetch deployments from ${provider}:`, result.error?.message || 'Unknown error');
              return [];
            }

            if (!result.data) {
              return [];
            }

            // Convert to unified format
            return this.convertCloudDeploymentsToUnified(result.data, provider);

          } catch (error) {
            console.warn(`Error fetching deployments from ${provider}:`, error);
            return [];
          }
        })
      );

      // Flatten all successful results
      return results
        .filter((r): r is PromiseFulfilledResult<UnifiedDeploymentRecord[]> =>
          r.status === 'fulfilled'
        )
        .flatMap(r => r.value);

    } catch (error) {
      console.error('Error fetching from CloudManager:', error);
      return [];
    }
  }

  /**
   * Fetch deployment history from local .aios state
   *
   * @private
   */
  private async fetchFromLocalState(
    options: DeploymentHistoryOptions
  ): Promise<UnifiedDeploymentRecord[]> {
    try {
      const history = await this.stateManager.getHistory(
        options.limit || 100 // Fetch more from local for merging
      );

      return history.map(record => this.convertLocalRecordToUnified(record));

    } catch (error) {
      console.warn('Error fetching local deployment history:', error);
      return [];
    }
  }

  /**
   * Convert cloud provider DeploymentSummary to UnifiedDeploymentRecord
   *
   * @private
   */
  private convertCloudDeploymentsToUnified(
    deployments: DeploymentSummary[],
    provider: CloudProviderType
  ): UnifiedDeploymentRecord[] {
    return deployments.map(deployment => {
      // Calculate duration if we have both timestamps
      const duration = deployment.completedAt
        ? deployment.completedAt.getTime() - deployment.createdAt.getTime()
        : undefined;

      // Base record with required fields
      const baseRecord: UnifiedDeploymentRecord = {
        id: deployment.deploymentId,
        timestamp: deployment.createdAt,
        service: deployment.version || 'unknown', // Use version as service name
        environment: deployment.environment,
        provider,
        status: this.mapDeploymentStatus(deployment.status),
        source: 'cloud' as const
      };

      // Build object with optional fields using conditional spread
      // This avoids mutating readonly properties
      return {
        ...baseRecord,
        ...(deployment.url && { url: deployment.url }),
        ...(deployment.branch && { branch: deployment.branch }),
        ...(deployment.commitHash && { commit: deployment.commitHash }),
        ...(duration !== undefined && { duration })
      };
    });
  }

  /**
   * Convert local DeploymentRecordType to UnifiedDeploymentRecord
   *
   * @private
   */
  private convertLocalRecordToUnified(
    record: DeploymentRecordType
  ): UnifiedDeploymentRecord {
    const baseRecord: UnifiedDeploymentRecord = {
      id: record.id,
      timestamp: record.timestamp,
      service: record.service,
      environment: record.environment,
      provider: (record.provider || 'unknown') as CloudProviderType,
      status: record.status,
      source: 'local' as const
    };

    // Add optional duration if it exists
    if (record.duration !== undefined) {
      return { ...baseRecord, duration: record.duration };
    }

    return baseRecord;
  }

  /**
   * Merge cloud and local records, deduplicating by deployment ID
   *
   * @private
   */
  private mergeDeploymentRecords(
    cloudRecords: UnifiedDeploymentRecord[],
    localRecords: UnifiedDeploymentRecord[]
  ): UnifiedDeploymentRecord[] {
    const recordMap = new Map<string, UnifiedDeploymentRecord>();

    // Add all cloud records first (they're the source of truth)
    for (const record of cloudRecords) {
      recordMap.set(record.id, record);
    }

    // Add local records, merging if same deployment ID exists
    for (const localRecord of localRecords) {
      const existing = recordMap.get(localRecord.id);

      if (existing) {
        // Merge - cloud data is primary, local adds context
        recordMap.set(localRecord.id, {
          ...existing,
          source: 'both' as const,
          metadata: {
            ...localRecord.metadata,
            ...existing.metadata
          }
        });
      } else {
        // Local-only deployment (maybe from different machine or old deployment)
        recordMap.set(localRecord.id, localRecord);
      }
    }

    return Array.from(recordMap.values());
  }

  /**
   * Infer environment from deployment metadata
   *
   * @private
   */
  private inferEnvironment(deployment: DeploymentSummary): string {
    // Check explicit environment field
    if (deployment.environment) {
      return deployment.environment;
    }

    // Infer from branch name
    if (deployment.branch) {
      if (deployment.branch === 'main' || deployment.branch === 'master') {
        return 'production';
      }
      if (deployment.branch.startsWith('staging')) {
        return 'staging';
      }
      if (deployment.branch.startsWith('dev')) {
        return 'development';
      }
    }

    // Check if it's a preview deployment
    if (deployment.url && deployment.url.includes('preview')) {
      return 'preview';
    }

    return 'production'; // Default assumption
  }

  /**
   * Map provider-specific deployment status to unified status
   *
   * @private
   */
  private mapDeploymentStatus(
    status: DeploymentSummary['status']
  ): UnifiedDeploymentRecord['status'] {
    switch (status.toLowerCase()) {
      case 'ready':
      case 'active':
      case 'success':
      case 'succeeded':
        return 'success';

      case 'building':
      case 'queued':
      case 'initializing':
        return 'building';

      case 'error':
      case 'failed':
      case 'failure':
        return 'failed';

      case 'canceled':
      case 'cancelled':
        return 'rolled-back';

      default:
        return 'pending';
    }
  }

  /**
   * Build cache key from options
   *
   * @private
   */
  private buildCacheKey(options: DeploymentHistoryOptions): string {
    return JSON.stringify({
      provider: options.provider,
      service: options.service,
      environment: options.environment,
      limit: options.limit
      // Omit 'since' from cache key as it's time-dependent
    });
  }

  /**
   * Get cached results if still valid
   *
   * @private
   */
  private getFromCache(key: string): UnifiedDeploymentRecord[] | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = new Date().getTime();
    const age = now - entry.timestamp.getTime();

    if (age > entry.ttl) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Add results to cache
   *
   * @private
   */
  private addToCache(key: string, data: UnifiedDeploymentRecord[]): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl: this.defaultCacheTTL
    });

    // Prevent cache from growing unbounded
    if (this.cache.size > 100) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * Clear all cached deployment history
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics (for debugging)
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
