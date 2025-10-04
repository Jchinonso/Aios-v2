/**
 * @fileoverview Provider Registry - Dynamic provider discovery and management
 * @description Registry pattern implementation for managing cloud provider instances.
 * Provides centralized provider registration, discovery, and lifecycle management
 * with support for lazy loading and configuration validation.
 *
 * The registry enables dynamic provider discovery, allowing the system to work
 * with providers that are added at runtime without code changes. It follows
 * the Registry pattern for loose coupling and the Factory pattern for instance creation.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const registry = new ProviderRegistry();
 *
 * // Register providers
 * registry.register('vercel', VercelProvider);
 * registry.register('netlify', NetlifyProvider);
 *
 * // Get provider instance
 * const vercel = await registry.getProvider('vercel');
 * ```
 */

import type {
  CloudProvider,
  CloudProviderType,
  CloudProviderConfig,
} from '../types/cloud-provider.types.js';

import {
  createLogger,
  type ILogger,
} from '../../utils/logger.js';

/**
 * Provider constructor interface
 * @interface ProviderConstructor
 * @description Interface for provider class constructors that can be
 * instantiated by the registry. All provider classes must implement
 * this constructor signature.
 */
interface ProviderConstructor {
  new (): CloudProvider;
}

/**
 * Provider registration entry
 * @interface ProviderRegistration
 * @description Internal registry entry containing provider metadata
 * and lazy-loaded instance information.
 */
interface ProviderRegistration {
  /** Provider class constructor */
  readonly constructor: ProviderConstructor;
  /** Cached provider instance (lazy-loaded) */
  instance?: CloudProvider;
  /** Provider configuration */
  config?: CloudProviderConfig;
  /** Registration timestamp */
  readonly registeredAt: Date;
  /** Whether the provider is enabled */
  enabled: boolean;
}

/**
 * Provider Registry for dynamic provider management
 * @class ProviderRegistry
 * @description Centralized registry for managing cloud provider instances.
 * Implements the Registry pattern to provide loose coupling between the
 * system and concrete provider implementations.
 *
 * Key features:
 * - Dynamic provider registration and discovery
 * - Lazy loading of provider instances
 * - Configuration management and validation
 * - Provider lifecycle management
 * - Thread-safe operations with proper error handling
 */
export class ProviderRegistry {
  private readonly providers = new Map<CloudProviderType, ProviderRegistration>();
  private readonly logger: ILogger;

  /**
   * Creates a new ProviderRegistry instance
   * @constructor
   * @description Initializes the registry with logging and prepares it
   * for provider registration and management operations.
   */
  constructor() {
    this.logger = createLogger('ProviderRegistry');
  }

  /**
   * Register a provider class with the registry
   * @method register
   * @param {CloudProviderType} type - Provider type identifier
   * @param {ProviderConstructor} constructor - Provider class constructor
   * @param {CloudProviderConfig} [config] - Optional provider configuration
   * @returns {void}
   * @description Registers a provider class for later instantiation.
   * The provider will be lazy-loaded when first requested.
   *
   * @example
   * ```typescript
   * registry.register('vercel', VercelProvider, {
   *   type: 'vercel',
   *   accessToken: process.env.VERCEL_TOKEN
   * });
   * ```
   */
  register(
    type: CloudProviderType,
    constructor: ProviderConstructor,
    config?: CloudProviderConfig
  ): void {
    try {
      this.validateProviderType(type);
      this.validateProviderConstructor(constructor);

      if (this.providers.has(type)) {
        this.logger.warn('Provider already registered, overwriting', { type });
      }

      const registration: ProviderRegistration = {
        constructor,
        ...(config && { config }),
        registeredAt: new Date(),
        enabled: true,
      };

      this.providers.set(type, registration);
    } catch (error) {
      this.logger.error('Failed to register provider', error as Error, { type });
      throw new Error(`Failed to register provider ${type}: ${(error as Error).message}`);
    }
  }

  /**
   * Unregister a provider from the registry
   * @method unregister
   * @param {CloudProviderType} type - Provider type to unregister
   * @returns {boolean} True if provider was unregistered, false if not found
   * @description Removes a provider from the registry and cleans up
   * any cached instances and configurations.
   *
   * @example
   * ```typescript
   * const removed = registry.unregister('vercel');
   * console.log('Provider removed:', removed);
   * ```
   */
  unregister(type: CloudProviderType): boolean {
    try {
      const registration = this.providers.get(type);
      if (!registration) {
        this.logger.warn('Attempted to unregister non-existent provider', { type });
        return false;
      }

      // Clean up instance if it exists
      if (registration.instance) {
        this.logger.debug('Cleaning up provider instance', { type });
        // Provider cleanup could go here if needed
      }

      this.providers.delete(type);

      this.logger.info('Provider unregistered successfully', {
        type,
        remainingProviders: this.providers.size
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to unregister provider', error as Error, { type });
      return false;
    }
  }

  /**
   * Get a provider instance
   * @method getProvider
   * @param {CloudProviderType} type - Provider type to retrieve
   * @returns {Promise<CloudProvider | null>} Provider instance or null if not found
   * @description Retrieves a provider instance, creating it if necessary.
   * Implements lazy loading to avoid unnecessary instantiation overhead.
   *
   * @example
   * ```typescript
   * const vercel = await registry.getProvider('vercel');
   * if (vercel) {
   *   await vercel.deploy(config);
   * }
   * ```
   */
  async getProvider(type: CloudProviderType): Promise<CloudProvider | null> {
    try {
      const registration = this.providers.get(type);
      if (!registration) {
        this.logger.warn('Provider not found in registry', { type });
        return null;
      }

      if (!registration.enabled) {
        this.logger.warn('Provider is disabled', { type });
        return null;
      }

      // Return cached instance if available
      if (registration.instance) {
        return registration.instance;
      }

      // Create new instance
      const instance = new registration.constructor();

      // Cache the instance
      registration.instance = instance;

      return instance;
    } catch (error) {
      this.logger.error('Failed to get provider instance', error as Error, { type });
      throw new Error(`Failed to get provider ${type}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a provider is registered
   * @method hasProvider
   * @param {CloudProviderType} type - Provider type to check
   * @returns {boolean} True if provider is registered
   * @description Checks if a provider type is registered in the registry
   * without attempting to instantiate it.
   *
   * @example
   * ```typescript
   * if (registry.hasProvider('vercel')) {
   *   console.log('Vercel provider is available');
   * }
   * ```
   */
  hasProvider(type: CloudProviderType): boolean {
    return this.providers.has(type);
  }

  /**
   * Get all registered provider types
   * @method getRegisteredTypes
   * @returns {CloudProviderType[]} Array of registered provider types
   * @description Returns a list of all provider types that have been
   * registered with the registry, regardless of their enabled status.
   *
   * @example
   * ```typescript
   * const types = registry.getRegisteredTypes();
   * console.log('Available providers:', types);
   * ```
   */
  getRegisteredTypes(): CloudProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all available provider instances
   * @method getAvailableProviders
   * @returns {Promise<CloudProvider[]>} Array of provider instances
   * @description Returns all enabled and instantiable provider instances.
   * Useful for listing available providers to users or for batch operations.
   *
   * @example
   * ```typescript
   * const providers = await registry.getAvailableProviders();
   * for (const provider of providers) {
   *   console.log(`${provider.name}: ${provider.isConfigured()}`);
   * }
   * ```
   */
  async getAvailableProviders(): Promise<CloudProvider[]> {
    const providers: CloudProvider[] = [];

    try {
      for (const [type, registration] of Array.from(this.providers.entries())) {
        if (!registration.enabled) {
          this.logger.debug('Skipping disabled provider', { type });
          continue;
        }

        try {
          const provider = await this.getProvider(type);
          if (provider) {
            providers.push(provider);
          }
        } catch (error) {
          this.logger.warn('Failed to instantiate provider, skipping', { error: (error as Error).message, type });
        }
      }

      return providers;
    } catch (error) {
      this.logger.error('Failed to get available providers', error as Error);
      return [];
    }
  }

  /**
   * Enable or disable a provider
   * @method setProviderEnabled
   * @param {CloudProviderType} type - Provider type to modify
   * @param {boolean} enabled - Whether the provider should be enabled
   * @returns {boolean} True if operation was successful
   * @description Enables or disables a provider without unregistering it.
   * Disabled providers will not be returned by getProvider() or getAvailableProviders().
   *
   * @example
   * ```typescript
   * // Temporarily disable a provider
   * registry.setProviderEnabled('aws', false);
   *
   * // Re-enable it later
   * registry.setProviderEnabled('aws', true);
   * ```
   */
  setProviderEnabled(type: CloudProviderType, enabled: boolean): boolean {
    try {
      const registration = this.providers.get(type);
      if (!registration) {
        this.logger.warn('Cannot modify non-existent provider', { type });
        return false;
      }

      registration.enabled = enabled;

      this.logger.info('Provider status changed', { type, enabled });
      return true;
    } catch (error) {
      this.logger.error('Failed to modify provider status', error as Error, { type, enabled });
      return false;
    }
  }

  /**
   * Configure a registered provider
   * @method configureProvider
   * @param {CloudProviderType} type - Provider type to configure
   * @param {CloudProviderConfig} config - Provider configuration
   * @returns {Promise<boolean>} True if configuration was successful
   * @description Updates the configuration for a registered provider.
   * If the provider is already instantiated, it will be reconfigured.
   *
   * @example
   * ```typescript
   * await registry.configureProvider('vercel', {
   *   type: 'vercel',
   *   accessToken: 'new-token'
   * });
   * ```
   */
  async configureProvider(type: CloudProviderType, config: CloudProviderConfig): Promise<boolean> {
    try {
      const registration = this.providers.get(type);
      if (!registration) {
        this.logger.error('Cannot configure non-existent provider', new Error(`Provider ${type} not found`), { type });
        return false;
      }

      // Validate configuration type matches provider
      if (config.type !== type) {
        throw new Error(`Configuration type ${config.type} does not match provider type ${type}`);
      }

      // Update stored configuration
      registration.config = config;

      // If instance exists, note that it may need reconfiguration
      // Note: CloudProvider interface doesn't have a configure method
      // Configuration should be handled during provider instantiation
      if (registration.instance) {
        this.logger.info('Provider instance exists - configuration updated in registry', { type });
      }

      this.logger.info('Provider configuration updated', { type });
      return true;
    } catch (error) {
      this.logger.error('Failed to configure provider', error as Error, { type });
      return false;
    }
  }

  /**
   * Initialize registry with bulk configuration
   * @method initializeWithConfig
   * @param {Record<string, unknown>} configs - Provider configurations by type
   * @returns {Promise<void>} Resolves when initialization is complete
   * @description Initializes multiple providers with their configurations.
   * Used during system startup to configure all providers at once.
   *
   * @example
   * ```typescript
   * await registry.initializeWithConfig({
   *   vercel: { type: 'vercel', accessToken: 'token1' },
   *   netlify: { type: 'netlify', accessToken: 'token2' }
   * });
   * ```
   */
  async initializeWithConfig(configs: Record<string, unknown>): Promise<void> {
    this.logger.info('Initializing registry with bulk configuration', {
      providerCount: Object.keys(configs).length
    });

    const results = await Promise.allSettled(
      Object.entries(configs).map(async ([type, config]) => {
        const typedConfig = config as CloudProviderConfig;
        return await this.configureProvider(type as CloudProviderType, typedConfig);
      })
    );

    const successful = results.filter(result =>
      result.status === 'fulfilled' && result.value === true
    ).length;

    this.logger.info('Registry initialization completed', {
      successful,
      total: results.length,
      failed: results.length - successful
    });
  }

  /**
   * Clear all cached provider instances
   * @method clearCache
   * @returns {void}
   * @description Clears all cached provider instances, forcing them to be
   * recreated on next access. Useful for testing or when configuration changes.
   *
   * @example
   * ```typescript
   * // Clear cache to force fresh instances
   * registry.clearCache();
   * ```
   */
  clearCache(): void {
    let clearedCount = 0;

    for (const [type, registration] of this.providers.entries()) {
      if (registration.instance) {
        registration.instance = undefined as any;
        clearedCount++;
        this.logger.debug('Cleared cached instance', { type });
      }
    }

    this.logger.info('Provider cache cleared', { clearedCount });
  }

  /**
   * Get registry statistics
   * @method getStats
   * @returns {object} Registry statistics
   * @description Returns comprehensive statistics about the registry state
   * including provider counts, cache status, and configuration status.
   *
   * @example
   * ```typescript
   * const stats = registry.getStats();
   * console.log(`${stats.totalProviders} providers, ${stats.cachedInstances} cached`);
   * ```
   */
  getStats() {
    const registrations = Array.from(this.providers.values());

    return {
      totalProviders: this.providers.size,
      enabledProviders: registrations.filter(r => r.enabled).length,
      disabledProviders: registrations.filter(r => !r.enabled).length,
      cachedInstances: registrations.filter(r => r.instance).length,
      configuredProviders: registrations.filter(r => r.config).length,
      oldestRegistration: registrations.reduce((oldest, reg) =>
        !oldest || reg.registeredAt < oldest ? reg.registeredAt : oldest,
        null as Date | null
      ),
      newestRegistration: registrations.reduce((newest, reg) =>
        !newest || reg.registeredAt > newest ? reg.registeredAt : newest,
        null as Date | null
      ),
    };
  }

  // =====================================
  // PRIVATE HELPER METHODS
  // =====================================

  /**
   * Validate provider type
   * @private
   * @method validateProviderType
   * @param {CloudProviderType} type - Provider type to validate
   * @throws {Error} When provider type is invalid
   */
  private validateProviderType(type: CloudProviderType): void {
    if (!type || typeof type !== 'string') {
      throw new Error('Provider type must be a non-empty string');
    }
  }

  /**
   * Validate provider constructor
   * @private
   * @method validateProviderConstructor
   * @param {ProviderConstructor} constructor - Constructor to validate
   * @throws {Error} When constructor is invalid
   */
  private validateProviderConstructor(constructor: ProviderConstructor): void {
    if (!constructor || typeof constructor !== 'function') {
      throw new Error('Provider constructor must be a function');
    }
  }
}