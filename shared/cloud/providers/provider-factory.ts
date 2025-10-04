/**
 * @fileoverview Provider Factory - Factory for creating provider instances
 * @description Factory pattern implementation for creating cloud provider instances
 * with proper configuration and validation. This is now a thin wrapper around
 * ProviderRegistry for backward compatibility.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 * @deprecated Use ProviderRegistry directly for new code
 *
 * @example
 * ```typescript
 * const factory = new ProviderFactory();
 * const vercel = await factory.createProvider('vercel', {
 *   type: 'vercel',
 *   accessToken: 'your-token'
 * });
 * ```
 */

import type {
  CloudProvider,
  CloudProviderType,
  CloudProviderConfig,
} from '../types/cloud-provider.types.js';

import { ProviderRegistry } from './provider-registry.js';
import { registerAllProviders } from './provider-catalog.js';

import {
  createLogger,
  type ILogger,
} from '../../utils/logger.js';

import { createProviderNotFoundError } from '../../constants/errors.js';

/**
 * Provider factory configuration options
 * @interface ProviderFactoryOptions
 * @description Configuration options for customizing factory behavior
 */
interface ProviderFactoryOptions {
  /** Whether to enable caching */
  readonly enableCaching?: boolean;
  /** Default timeout for provider operations in milliseconds */
  readonly defaultTimeout?: number;
  /** Whether to validate configurations strictly */
  readonly strictValidation?: boolean;
}

/**
 * Provider Factory for creating cloud provider instances
 * @class ProviderFactory
 * @description Factory implementation for creating cloud provider instances.
 * This is a thin wrapper around ProviderRegistry for backward compatibility.
 *
 * @deprecated Use ProviderRegistry directly for new code
 */
export class ProviderFactory {
  private readonly logger: ILogger;
  private readonly registry: ProviderRegistry;

  /**
   * Creates a new ProviderFactory instance
   * @constructor
   * @param {ProviderFactoryOptions} options - Factory configuration options
   */
  constructor(_options: ProviderFactoryOptions = {}) {
    this.logger = createLogger('ProviderFactory');
    this.registry = new ProviderRegistry();

    // Register all providers asynchronously
    void this.registerProviders();
  }

  /**
   * Register all available providers from catalog
   * @private
   */
  private async registerProviders(): Promise<void> {
    await registerAllProviders(this.registry);
    this.logger.info('Registered all cloud providers from catalog');
  }

  /**
   * Create a provider instance
   * @method createProvider
   * @param {CloudProviderType} type - Type of provider to create
   * @param {CloudProviderConfig} config - Provider configuration
   * @returns {Promise<CloudProvider>} Configured provider instance
   * @deprecated Use ProviderRegistry.getProvider() instead
   */
  async createProvider(type: CloudProviderType, config?: CloudProviderConfig): Promise<CloudProvider> {
    try {
      this.logger.info('Creating provider instance', { type });

      // Configure provider if config provided
      if (config) {
        await this.registry.configureProvider(type, config);
      }

      // Get provider instance
      const provider = await this.registry.getProvider(type);

      if (!provider) {
        throw createProviderNotFoundError(type);
      }

      this.logger.info('Provider instance created successfully', { type });
      return provider;
    } catch (error) {
      this.logger.error('Failed to create provider', error as Error, { type });
      throw error;
    }
  }

  /**
   * Check if a provider type is supported
   * @method isSupported
   * @param {CloudProviderType} type - Provider type to check
   * @returns {boolean} True if provider is supported
   */
  isSupported(type: CloudProviderType): boolean {
    return this.registry.hasProvider(type);
  }

  /**
   * Get list of supported providers
   * @method getSupportedProviders
   * @returns {CloudProviderType[]} Array of supported provider types
   */
  getSupportedProviders(): CloudProviderType[] {
    return this.registry.getRegisteredTypes();
  }

  /**
   * Get the underlying registry instance
   * @method getRegistry
   * @returns {ProviderRegistry} The provider registry
   */
  getRegistry(): ProviderRegistry {
    return this.registry;
  }
}

/**
 * Create a provider factory instance
 * @function createProviderFactory
 * @param {ProviderFactoryOptions} options - Factory options
 * @returns {ProviderFactory} New factory instance
 * @deprecated Use ProviderRegistry directly
 *
 * @example
 * ```typescript
 * const factory = createProviderFactory({ enableCaching: true });
 * const vercel = await factory.createProvider('vercel', config);
 * ```
 */
export function createProviderFactory(options?: ProviderFactoryOptions): ProviderFactory {
  return new ProviderFactory(options);
}
