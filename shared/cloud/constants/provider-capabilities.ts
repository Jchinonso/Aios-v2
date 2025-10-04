/**
 * @fileoverview Provider Feature Capabilities Mapping
 * @description Centralized mapping of cloud provider features and capabilities
 *
 * This file defines which cloud providers support which features, providing
 * a single source of truth for feature availability across all providers.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

import type { CloudProviderType } from '../types/cloud-provider.types.js';
import type { ProviderFeature } from '../types/cloud-provider.types.js';

/**
 * Provider feature capabilities mapping
 * Maps each feature to the list of providers that support it
 *
 * Note: Only includes features that are commonly mapped across providers.
 * Platform-specific features (e.g., 'ec2', 'lambda') are omitted as they
 * are unique to individual providers.
 */
export const PROVIDER_FEATURE_MAP = {
  // Deployment Features
  'zero-config': ['vercel', 'netlify', 'railway'],
  'auto-scaling': ['vercel', 'aws', 'azure', 'gcp', 'render', 'cloudflare'],
  'blue-green-deployment': ['aws', 'azure', 'gcp'],
  'canary-deployment': ['aws', 'azure', 'gcp'],
  'preview-deployments': ['vercel', 'netlify', 'railway'],
  'rollback': ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'railway', 'render'],

  // Infrastructure Features
  'custom-domains': ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'railway', 'render', 'cloudflare'],
  'ssl-certificates': ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'railway', 'render', 'cloudflare'],
  'cdn': ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'cloudflare'],
  'edge-functions': ['vercel', 'netlify', 'cloudflare'],
  'load-balancing': ['aws', 'azure', 'gcp', 'digitalocean', 'linode'],

  // Platform Features
  'analytics': ['vercel', 'netlify', 'aws', 'azure', 'gcp'],
  'monitoring': ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'railway', 'render'],
  'logs': ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'railway', 'render'],
  'database': ['aws', 'azure', 'gcp', 'railway', 'render'],
  'file-storage': ['aws', 'azure', 'gcp', 'digitalocean', 'vultr'],
  'authentication': ['aws', 'azure', 'gcp', 'netlify'],
  'ci-cd': ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'railway', 'render'],
  'environment-variables': ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'railway', 'render'],
  'team-collaboration': ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'railway', 'render'],

  // Technical Features
  'api-routes': ['vercel', 'netlify', 'aws', 'azure', 'gcp'],
  'serverless-functions': ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'cloudflare'],
  'docker-support': ['railway', 'render', 'aws', 'azure', 'gcp', 'digitalocean', 'linode', 'vultr', 'fly'],
  'kubernetes': ['aws', 'azure', 'gcp', 'digitalocean', 'linode'],
  'backup': ['aws', 'azure', 'gcp', 'digitalocean'],
  'disaster-recovery': ['aws', 'azure', 'gcp'],

  // Enterprise Features
  'machine-learning': ['aws', 'azure', 'gcp'],
  'big-data': ['aws', 'azure', 'gcp'],
  'active-directory-integration': ['azure'],
  'enterprise-security': ['aws', 'azure', 'gcp'],
  'compliance': ['aws', 'azure', 'gcp'],
  'multi-region': ['aws', 'azure', 'gcp'],
  'private-networking': ['aws', 'azure', 'gcp'],
  'managed-databases': ['railway', 'render', 'aws', 'azure', 'gcp'],
  'data-warehousing': ['aws', 'azure', 'gcp'],
  'container-orchestration': ['aws', 'azure', 'gcp'],
  'api-gateway': ['aws', 'azure', 'gcp'],
  'message-queuing': ['aws', 'azure', 'gcp'],
  'cache-services': ['aws', 'azure', 'gcp'],
  'secret-management': ['aws', 'azure', 'gcp'],
  'cost-optimization': ['aws', 'azure', 'gcp'],
  'governance': ['aws', 'azure', 'gcp'],
  'hybrid-cloud': ['aws', 'azure', 'gcp'],
  'devops-integration': ['aws', 'azure', 'gcp'],
  'infrastructure-as-code': ['aws', 'azure', 'gcp'],
  'global-distribution': ['aws', 'azure', 'gcp', 'cloudflare'],
  'global-deployment': ['aws', 'azure', 'gcp', 'cloudflare'],
  'performance-optimization': ['aws', 'azure', 'gcp'],

  // Additional Features
  'automatic-ssl': ['vercel', 'netlify', 'cloudflare'],
  'static-hosting': ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'cloudflare'],
  'form-handling': ['netlify'],
  'identity': ['netlify', 'aws', 'azure', 'gcp'],
  'functions': ['vercel', 'netlify', 'aws', 'azure', 'gcp', 'cloudflare'],
  'split-testing': ['netlify', 'vercel'],
  'edge-handlers': ['vercel', 'netlify', 'cloudflare'],
  'full-stack-deployment': ['vercel', 'netlify', 'railway', 'render'],
  'database-provisioning': ['railway', 'render', 'aws', 'azure', 'gcp'],
  'environment-management': ['vercel', 'netlify', 'railway', 'render', 'aws', 'azure', 'gcp'],
  'enterprise-support': ['aws', 'azure', 'gcp'],
  'compliance-certifications': ['aws', 'azure', 'gcp'],

  // Platform-specific features (not commonly mapped)
  'ec2': ['aws'],
  'lambda': ['aws'],
  's3': ['aws'],
  'cloudfront': ['aws'],
  'rds': ['aws'],
  'elastic-beanstalk': ['aws'],
  'ecs': ['aws'],
  'eks': ['aws'],
  'compute-engine': ['gcp'],
  'cloud-functions': ['gcp'],
  'cloud-storage': ['gcp'],
  'cloud-cdn': ['gcp'],
  'cloud-sql': ['gcp'],
  'app-engine': ['gcp'],
  'cloud-run': ['gcp'],
  'gke': ['gcp'],
  'virtual-machines': ['azure'],
  'azure-functions': ['azure'],
  'blob-storage': ['azure'],
  'sql-database': ['azure'],
  'app-service': ['azure'],
  'container-instances': ['azure'],
  'aks': ['azure'],
} as const satisfies Record<ProviderFeature, readonly CloudProviderType[]>;

/**
 * Get all providers that support a specific feature
 *
 * @param feature - The feature to query
 * @returns Array of provider types that support the feature
 *
 * @example
 * ```typescript
 * const providers = getProvidersByFeature('edge-functions');
 * // Returns: ['vercel', 'netlify', 'cloudflare']
 * ```
 */
export function getProvidersByFeature(feature: ProviderFeature): readonly CloudProviderType[] {
  return PROVIDER_FEATURE_MAP[feature] ?? [];
}

/**
 * Check if a specific provider supports a feature
 *
 * @param provider - The cloud provider to check
 * @param feature - The feature to query
 * @returns True if the provider supports the feature
 *
 * @example
 * ```typescript
 * const hasEdgeFunctions = providerSupportsFeature('vercel', 'edge-functions');
 * // Returns: true
 * ```
 */
export function providerSupportsFeature(
  provider: CloudProviderType,
  feature: ProviderFeature
): boolean {
  const providers = getProvidersByFeature(feature);
  return providers.includes(provider);
}

/**
 * Get all features supported by a specific provider
 *
 * @param provider - The cloud provider to query
 * @returns Array of features supported by the provider
 *
 * @example
 * ```typescript
 * const features = getProviderFeatures('vercel');
 * // Returns: ['zero-config', 'auto-scaling', 'edge-functions', ...]
 * ```
 */
export function getProviderFeatures(provider: CloudProviderType): readonly ProviderFeature[] {
  const features: ProviderFeature[] = [];

  for (const [feature, providers] of Object.entries(PROVIDER_FEATURE_MAP) as Array<[ProviderFeature, readonly CloudProviderType[]]>) {
    if (providers.includes(provider)) {
      features.push(feature);
    }
  }

  return features;
}

/**
 * Get providers that support ALL specified features
 *
 * @param features - Array of features to match
 * @returns Array of providers that support all features
 *
 * @example
 * ```typescript
 * const providers = getProvidersWithAllFeatures(['edge-functions', 'cdn']);
 * // Returns: ['vercel', 'netlify', 'cloudflare']
 * ```
 */
export function getProvidersWithAllFeatures(
  features: readonly ProviderFeature[]
): readonly CloudProviderType[] {
  if (features.length === 0) {
    return [];
  }

  // Start with providers that support the first feature
  const firstFeature = features[0];
  if (!firstFeature) {
    return [];
  }

  const firstFeatureProviders = getProvidersByFeature(firstFeature);

  // Filter to only providers that support ALL features
  return firstFeatureProviders.filter(provider =>
    features.every(feature => providerSupportsFeature(provider, feature))
  );
}

/**
 * Get providers that support ANY of the specified features
 *
 * @param features - Array of features to match
 * @returns Array of providers that support at least one feature
 *
 * @example
 * ```typescript
 * const providers = getProvidersWithAnyFeature(['edge-functions', 'machine-learning']);
 * // Returns: ['vercel', 'netlify', 'cloudflare', 'aws', 'azure', 'gcp']
 * ```
 */
export function getProvidersWithAnyFeature(
  features: readonly ProviderFeature[]
): readonly CloudProviderType[] {
  const providerSet = new Set<CloudProviderType>();

  for (const feature of features) {
    const providers = getProvidersByFeature(feature);
    providers.forEach(provider => providerSet.add(provider));
  }

  return Array.from(providerSet);
}

/**
 * Compare feature support between two providers
 *
 * @param provider1 - First provider to compare
 * @param provider2 - Second provider to compare
 * @returns Object with common, unique1, and unique2 features
 *
 * @example
 * ```typescript
 * const comparison = compareProviderFeatures('vercel', 'netlify');
 * // Returns: { common: [...], unique1: [...], unique2: [...] }
 * ```
 */
export function compareProviderFeatures(
  provider1: CloudProviderType,
  provider2: CloudProviderType
): {
  common: readonly ProviderFeature[];
  unique1: readonly ProviderFeature[];
  unique2: readonly ProviderFeature[];
} {
  const features1 = getProviderFeatures(provider1);
  const features2 = getProviderFeatures(provider2);

  const common = features1.filter(f => features2.includes(f));
  const unique1 = features1.filter(f => !features2.includes(f));
  const unique2 = features2.filter(f => !features1.includes(f));

  return { common, unique1, unique2 };
}
