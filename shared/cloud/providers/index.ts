/**
 * @fileoverview Cloud Providers - Unified interface for cloud platform integrations
 * @description Exports all cloud provider implementations and management utilities
 *
 * This module provides a unified abstraction layer for multiple cloud platforms,
 * following the Strategy pattern and SOLID principles to ensure consistent
 * deployment experiences across different providers.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

// =====================================
// CORE PROVIDER INFRASTRUCTURE
// =====================================

/**
 * Base provider abstract class that all providers must extend
 */
export { BaseProvider } from './base-provider.js'

/**
 * Provider registry for dynamic discovery and management
 */
export { ProviderRegistry } from './provider-registry.js'

/**
 * Factory for creating provider instances
 */
export { ProviderFactory } from './provider-factory.js'

// =====================================
// PLATFORM IMPLEMENTATIONS
// =====================================

/**
 * Vercel platform provider
 * - Zero-config Next.js deployments
 * - Edge function support
 * - Preview deployments
 * - Domain management
 */
export { VercelProvider } from './vercel-provider.js'

/**
 * Netlify platform provider
 * - Static site optimization
 * - Form handling and serverless functions
 * - Split testing capabilities
 * - Build plugins ecosystem
 */
export { NetlifyProvider } from './netlify-provider.js'

/**
 * Amazon Web Services provider
 * - EC2, Lambda, S3 orchestration
 * - Auto-scaling groups
 * - Load balancer configuration
 * - CloudFormation templates
 */
export { AWSProvider } from './aws-provider.js'

/**
 * Railway platform provider
 * - Container deployments
 * - Database provisioning
 * - Environment management
 * - Git-based deployments
 */
export { RailwayProvider } from './railway-provider.js'

/**
 * Render platform provider
 * - Docker support
 * - Managed databases
 * - Static site hosting
 * - Background services
 */
export { RenderProvider } from './render-provider.js'

// =====================================
// TYPE EXPORTS
// =====================================

/**
 * Core provider types and interfaces
 */
export type {
  CloudProvider,
  CloudProviderType,
  CloudProviderConfig,
  ProviderCapabilities,
  ProviderFeature,
} from '../types/cloud-provider.types.js';

/**
 * Deployment-related types
 */
export type {
  DeploymentConfig,
  DeploymentResult,
  DeploymentStatus,
  DeploymentLog,
  DeploymentSummary,
} from '../types/deployment.types.js';

// =====================================
// UTILITY EXPORTS
// =====================================

/**
 * Provider selector utility for intelligent provider recommendation
 */
export { ProviderSelector } from '../utils/provider-selector.js'

// =====================================
// CATALOG & DISCOVERY
// =====================================

/**
 * Provider catalog for centralized provider discovery
 * Eliminates hardcoding and provides metadata-driven provider management
 */
export { ProviderCatalog, getProviderCatalog, registerAllProviders } from './provider-catalog.js'
export type { ProviderMetadata, ProviderCatalogEntry } from './provider-catalog.js'

/**
 * Get supported cloud providers dynamically from catalog
 * @returns {CloudProviderType[]} List of registered provider types
 * @example
 * ```typescript
 * import { getSupportedProviders } from '@aios/cloud/providers';
 * const providers = getSupportedProviders();
 * ```
 */
export function getSupportedProviders(): string[] {
  const { getProviderCatalog } = require('./provider-catalog.js');
  return getProviderCatalog().getTypes();
}

/**
 * Get providers that support a specific feature
 * @param {string} feature - Feature to search for
 * @returns {CloudProviderType[]} Providers supporting this feature
 * @example
 * ```typescript
 * import { getProvidersByFeature } from '@aios/cloud/providers';
 * const zeroConfigProviders = getProvidersByFeature('zero-config');
 * ```
 */
export function getProvidersByFeature(feature: string): string[] {
  const { getProviderCatalog } = require('./provider-catalog.js');
  type CatalogEntry = import('./provider-catalog.js').ProviderCatalogEntry;
  const catalog = getProviderCatalog();

  // Get providers that support the feature as an operation type
  return catalog.getAll()
    .filter((entry: CatalogEntry) => {
      const operations = entry.metadata.supportedOperations || [];
      return operations.includes(feature as any);
    })
    .map((entry: CatalogEntry) => entry.type);
}