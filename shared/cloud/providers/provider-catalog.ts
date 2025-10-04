/**
 * @fileoverview Provider Catalog - Centralized provider registration and metadata
 * @description Single source of truth for all cloud providers. Eliminates duplication
 * and provides type-safe provider discovery with automatic registration.
 *
 * This module follows these principles:
 * - DRY: Single registration point eliminates duplication across CloudManager, ProviderFactory, etc.
 * - Type Safety: Compile-time guarantees via const assertions and generics
 * - Open/Closed: Easy to add new providers without modifying consumer code
 * - Dependency Inversion: Consumers depend on abstractions, not concrete classes
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

import type { CloudProvider, CloudProviderType } from '../types/cloud-provider.types.js';
import type { CloudOperationType, OperationCapability } from '../types/operations.types.js';

/**
 * Provider constructor signature
 * All providers must implement a no-arg constructor
 */
export type ProviderConstructor = new () => CloudProvider;

/**
 * Provider metadata for discovery and documentation
 */
export interface ProviderMetadata {
  /** Display name for UI/CLI */
  readonly displayName: string;
  /** Short description of provider capabilities */
  readonly description: string;
  /** Provider tier (free, pro, enterprise) */
  readonly tier: 'free' | 'starter' | 'pro' | 'enterprise';
  /** Whether provider is production-ready */
  readonly stable: boolean;
  /** Minimum Node.js version required */
  readonly minNodeVersion?: string;
  /** Required environment variables */
  readonly requiredEnvVars: readonly string[];
  /** Optional environment variables */
  readonly optionalEnvVars?: readonly string[];
  /** Documentation URL */
  readonly docsUrl?: string;
  /** API version */
  readonly apiVersion?: string;
  /** Supported cloud operations beyond deployment */
  readonly supportedOperations?: readonly CloudOperationType[];
  /** Operation-specific capabilities */
  readonly operationCapabilities?: ReadonlyMap<CloudOperationType, OperationCapability>;
}

/**
 * Provider catalog entry with constructor and metadata
 */
export interface ProviderCatalogEntry {
  /** Provider type identifier */
  readonly type: CloudProviderType;
  /** Provider constructor */
  readonly constructor: ProviderConstructor;
  /** Provider metadata */
  readonly metadata: ProviderMetadata;
  /** Registration order (for prioritization) */
  readonly priority: number;
}

/**
 * Type-safe provider catalog map
 * Uses const assertion for strict typing
 */
export type ProviderCatalogMap = ReadonlyMap<CloudProviderType, ProviderCatalogEntry>;

/**
 * Provider catalog configuration
 * Define all providers in one place with full metadata
 */
const PROVIDER_CATALOG_CONFIG = [
  {
    type: 'vercel' as const,
    priority: 1,
    metadata: {
      displayName: 'Vercel',
      description: 'Edge-first platform optimized for Next.js and modern web frameworks',
      tier: 'pro' as const,
      stable: true,
      minNodeVersion: '18.0.0',
      requiredEnvVars: ['VERCEL_TOKEN'] as const,
      optionalEnvVars: ['VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'] as const,
      docsUrl: 'https://vercel.com/docs',
      apiVersion: 'v13',
    },
  },
  {
    type: 'netlify' as const,
    priority: 2,
    metadata: {
      displayName: 'Netlify',
      description: 'JAMstack platform with edge functions and form handling',
      tier: 'pro' as const,
      stable: true,
      minNodeVersion: '18.0.0',
      requiredEnvVars: ['NETLIFY_TOKEN', 'NETLIFY_SITE_ID'] as const,
      optionalEnvVars: ['NETLIFY_TEAM_ID'] as const,
      docsUrl: 'https://docs.netlify.com',
      apiVersion: 'v1',
    },
  },
  {
    type: 'aws' as const,
    priority: 3,
    metadata: {
      displayName: 'AWS',
      description: 'Amazon Web Services - comprehensive cloud platform',
      tier: 'enterprise' as const,
      stable: true,
      minNodeVersion: '18.0.0',
      requiredEnvVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] as const,
      optionalEnvVars: ['AWS_REGION', 'AWS_SESSION_TOKEN'] as const,
      docsUrl: 'https://docs.aws.amazon.com',
      apiVersion: 'v3',
    },
  },
  {
    type: 'railway' as const,
    priority: 4,
    metadata: {
      displayName: 'Railway',
      description: 'Developer-friendly deployment platform with database provisioning',
      tier: 'starter' as const,
      stable: true,
      minNodeVersion: '18.0.0',
      requiredEnvVars: ['RAILWAY_TOKEN'] as const,
      optionalEnvVars: ['RAILWAY_PROJECT_ID'] as const,
      docsUrl: 'https://docs.railway.app',
      apiVersion: 'v1',
    },
  },
  {
    type: 'render' as const,
    priority: 5,
    metadata: {
      displayName: 'Render',
      description: 'Modern cloud platform with auto-deploy from Git',
      tier: 'starter' as const,
      stable: true,
      minNodeVersion: '18.0.0',
      requiredEnvVars: ['RENDER_API_KEY'] as const,
      optionalEnvVars: ['RENDER_SERVICE_ID'] as const,
      docsUrl: 'https://render.com/docs',
      apiVersion: 'v1',
    },
  },
] as const;

/**
 * Provider catalog class - Singleton registry of all available providers
 * @class ProviderCatalog
 * @description Centralized, type-safe catalog of cloud providers with metadata.
 * Provides discovery, filtering, and validation capabilities.
 *
 * Benefits:
 * - Single source of truth for provider registration
 * - Type-safe provider discovery
 * - Automatic metadata management
 * - Plugin-ready architecture for dynamic loading
 *
 * @example
 * ```typescript
 * // Get catalog instance
 * const catalog = ProviderCatalog.getInstance();
 *
 * // Get all stable providers
 * const stable = catalog.getStableProviders();
 *
 * // Check if provider is registered
 * if (catalog.has('vercel')) {
 *   const entry = catalog.get('vercel');
 * }
 * ```
 */
export class ProviderCatalog {
  private static instance: ProviderCatalog | null = null;
  private readonly catalog: Map<CloudProviderType, ProviderCatalogEntry>;
  private providerConstructorsLoaded = false;

  /**
   * Private constructor enforces singleton pattern
   * @private
   */
  private constructor() {
    this.catalog = new Map();
    this.initializeCatalog();
  }

  /**
   * Get singleton instance
   * @static
   * @returns {ProviderCatalog} Catalog instance
   */
  public static getInstance(): ProviderCatalog {
    if (!ProviderCatalog.instance) {
      ProviderCatalog.instance = new ProviderCatalog();
    }
    return ProviderCatalog.instance;
  }

  /**
   * Reset singleton (for testing)
   * @static
   * @internal
   */
  public static resetInstance(): void {
    ProviderCatalog.instance = null;
  }

  /**
   * Initialize catalog from configuration
   * Lazy-loads provider constructors to avoid circular dependencies
   * @private
   */
  private initializeCatalog(): void {
    for (const config of PROVIDER_CATALOG_CONFIG) {
      // Store configuration without constructor initially
      // Constructor will be loaded on first access via loadProviderConstructors()
      this.catalog.set(config.type, {
        type: config.type,
        constructor: null as any, // Will be loaded lazily
        metadata: config.metadata,
        priority: config.priority,
      });
    }
  }

  /**
   * Lazy load provider constructors
   * Avoids circular dependency issues during module initialization
   * @private
   */
  private async loadProviderConstructors(): Promise<void> {
    if (this.providerConstructorsLoaded) return;

    // Dynamic imports to break circular dependencies
    const [
      { VercelProvider },
      { NetlifyProvider },
      { AWSProvider },
      { RailwayProvider },
      { RenderProvider },
    ] = await Promise.all([
      import('./vercel-provider.js'),
      import('./netlify-provider.js'),
      import('./aws-provider.js'),
      import('./railway-provider.js'),
      import('./render-provider.js'),
    ]);

    // Map constructors to catalog entries
    const constructorMap: Record<CloudProviderType, ProviderConstructor> = {
      vercel: VercelProvider,
      netlify: NetlifyProvider,
      aws: AWSProvider,
      railway: RailwayProvider,
      render: RenderProvider,
      // Stub entries for other provider types
      azure: null as any,
      gcp: null as any,
      digitalocean: null as any,
      linode: null as any,
      vultr: null as any,
      fly: null as any,
      cloudflare: null as any,
    };

    // Update catalog entries with constructors
    for (const [type, entry] of this.catalog.entries()) {
      const constructor = constructorMap[type];
      if (constructor) {
        this.catalog.set(type, {
          ...entry,
          constructor,
        });
      }
    }

    this.providerConstructorsLoaded = true;
  }

  /**
   * Get provider catalog entry
   * @param {CloudProviderType} type - Provider type
   * @returns {ProviderCatalogEntry | undefined} Catalog entry
   */
  public get(type: CloudProviderType): ProviderCatalogEntry | undefined {
    return this.catalog.get(type);
  }

  /**
   * Check if provider exists in catalog
   * @param {CloudProviderType} type - Provider type
   * @returns {boolean} True if provider is registered
   */
  public has(type: CloudProviderType): boolean {
    return this.catalog.has(type);
  }

  /**
   * Get all registered provider types
   * @returns {CloudProviderType[]} Array of provider types
   */
  public getTypes(): CloudProviderType[] {
    return Array.from(this.catalog.keys());
  }

  /**
   * Get all catalog entries
   * @returns {ProviderCatalogEntry[]} Array of catalog entries
   */
  public getAll(): ProviderCatalogEntry[] {
    return Array.from(this.catalog.values());
  }

  /**
   * Get catalog entries sorted by priority
   * @returns {ProviderCatalogEntry[]} Sorted entries
   */
  public getAllSorted(): ProviderCatalogEntry[] {
    return this.getAll().sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get only stable providers
   * @returns {ProviderCatalogEntry[]} Stable providers
   */
  public getStableProviders(): ProviderCatalogEntry[] {
    return this.getAll().filter(entry => entry.metadata.stable);
  }

  /**
   * Get providers by tier
   * @param {string} tier - Provider tier
   * @returns {ProviderCatalogEntry[]} Matching providers
   */
  public getByTier(tier: 'free' | 'starter' | 'pro' | 'enterprise'): ProviderCatalogEntry[] {
    return this.getAll().filter(entry => entry.metadata.tier === tier);
  }

  /**
   * Get provider count
   * @returns {number} Number of registered providers
   */
  public get size(): number {
    return this.catalog.size;
  }

  /**
   * Register providers with a registry
   * @param {object} registry - Provider registry with register method
   * @returns {Promise<void>}
   */
  public async registerAll(registry: { register: (type: CloudProviderType, constructor: ProviderConstructor) => void }): Promise<void> {
    // Ensure constructors are loaded
    await this.loadProviderConstructors();

    // Register all providers
    for (const entry of this.catalog.values()) {
      if (entry.constructor) {
        registry.register(entry.type, entry.constructor);
      }
    }
  }

  /**
   * Get provider constructor (with lazy loading)
   * @param {CloudProviderType} type - Provider type
   * @returns {Promise<ProviderConstructor | undefined>} Provider constructor
   */
  public async getConstructor(type: CloudProviderType): Promise<ProviderConstructor | undefined> {
    await this.loadProviderConstructors();
    return this.catalog.get(type)?.constructor;
  }

  /**
   * Validate environment variables for a provider
   * @param {CloudProviderType} type - Provider type
   * @param {Record<string, string>} env - Environment variables
   * @returns {object} Validation result
   */
  public validateEnvironment(type: CloudProviderType, env: Record<string, string>): {
    valid: boolean;
    missing: string[];
    present: string[];
  } {
    const entry = this.catalog.get(type);
    if (!entry) {
      return { valid: false, missing: [], present: [] };
    }

    const required = entry.metadata.requiredEnvVars;
    const missing: string[] = [];
    const present: string[] = [];

    for (const envVar of required) {
      if (env[envVar]) {
        present.push(envVar);
      } else {
        missing.push(envVar);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      present,
    };
  }

  /**
   * Get catalog statistics
   * @returns {object} Catalog stats
   */
  public getStats(): {
    total: number;
    stable: number;
    byTier: Record<string, number>;
  } {
    const all = this.getAll();
    return {
      total: all.length,
      stable: all.filter(e => e.metadata.stable).length,
      byTier: {
        free: all.filter(e => e.metadata.tier === 'free').length,
        starter: all.filter(e => e.metadata.tier === 'starter').length,
        pro: all.filter(e => e.metadata.tier === 'pro').length,
        enterprise: all.filter(e => e.metadata.tier === 'enterprise').length,
      },
    };
  }

  /**
   * Find providers that support a specific operation
   * @param {CloudOperationType} operation - Operation type to search for
   * @returns {ProviderCatalogEntry[]} Providers supporting this operation
   */
  public findProvidersByOperation(operation: CloudOperationType): ProviderCatalogEntry[] {
    return this.getAll().filter(entry =>
      entry.metadata.supportedOperations?.includes(operation)
    );
  }

  /**
   * Get all supported operations across all providers
   * @returns {CloudOperationType[]} Unique list of supported operations
   */
  public getAllSupportedOperations(): CloudOperationType[] {
    const operations = new Set<CloudOperationType>();
    for (const entry of this.catalog.values()) {
      entry.metadata.supportedOperations?.forEach(op => operations.add(op));
    }
    return Array.from(operations);
  }

  /**
   * Get operation capability matrix
   * @returns {Map<CloudOperationType, Map<CloudProviderType, OperationCapability>>}
   * Matrix of operation type → provider → capability
   */
  public getOperationCapabilityMatrix(): Map<CloudOperationType, Map<CloudProviderType, OperationCapability>> {
    const matrix = new Map<CloudOperationType, Map<CloudProviderType, OperationCapability>>();

    for (const entry of this.catalog.values()) {
      if (entry.metadata.operationCapabilities) {
        for (const [opType, capability] of entry.metadata.operationCapabilities) {
          if (!matrix.has(opType)) {
            matrix.set(opType, new Map());
          }
          matrix.get(opType)!.set(entry.type, capability);
        }
      }
    }

    return matrix;
  }

  /**
   * Recommend best provider for a specific operation
   * @param {CloudOperationType} operation - Operation type
   * @param {object} criteria - Selection criteria
   * @returns {ProviderCatalogEntry | null} Best matching provider
   */
  public recommendProviderForOperation(
    operation: CloudOperationType,
    criteria?: {
      tier?: 'free' | 'starter' | 'pro' | 'enterprise';
      stable?: boolean;
      maxCost?: number;
    }
  ): ProviderCatalogEntry | null {
    let candidates = this.findProvidersByOperation(operation);

    // Apply filters
    if (criteria?.tier) {
      candidates = candidates.filter(c => c.metadata.tier === criteria.tier);
    }
    if (criteria?.stable !== undefined) {
      candidates = candidates.filter(c => c.metadata.stable === criteria.stable);
    }
    if (criteria?.maxCost !== undefined) {
      candidates = candidates.filter(c => {
        const cap = c.metadata.operationCapabilities?.get(operation);
        return !cap?.costPerOperation || cap.costPerOperation.amount <= criteria.maxCost!;
      });
    }

    // Sort by priority and maturity
    candidates.sort((a, b) => {
      const aMaturity = a.metadata.operationCapabilities?.get(operation)?.maturity || 'alpha';
      const bMaturity = b.metadata.operationCapabilities?.get(operation)?.maturity || 'alpha';
      const maturityScore = { stable: 3, beta: 2, alpha: 1, deprecated: 0 };

      const maturityDiff = maturityScore[bMaturity] - maturityScore[aMaturity];
      if (maturityDiff !== 0) return maturityDiff;

      return a.priority - b.priority;
    });

    return candidates[0] || null;
  }
}

/**
 * Get global provider catalog instance
 * @returns {ProviderCatalog} Catalog singleton
 */
export const getProviderCatalog = (): ProviderCatalog => ProviderCatalog.getInstance();

/**
 * Convenience function to register all providers
 * @param {object} registry - Provider registry
 * @returns {Promise<void>}
 */
export const registerAllProviders = async (
  registry: { register: (type: CloudProviderType, constructor: ProviderConstructor) => void }
): Promise<void> => {
  const catalog = getProviderCatalog();
  await catalog.registerAll(registry);
};
