/**
 * @fileoverview Numeric Thresholds and Limits
 * @description Centralized numeric constants for performance, resource limits,
 * and provider-specific thresholds. Eliminates magic numbers throughout codebase.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

import type { CloudProviderType } from '../cloud/types/cloud-provider.types.js';

/**
 * File size limits in megabytes
 */
export const FILE_SIZE_LIMITS = {
  /** Maximum file size for single file upload (50 MB) */
  MAX_SINGLE_FILE: 50,
  /** Maximum total deployment size (500 MB) */
  MAX_DEPLOYMENT_SIZE: 500,
  /** Maximum log file size (10 MB) */
  MAX_LOG_FILE: 10,
  /** Recommended maximum file size (32 MB) */
  RECOMMENDED_MAX: 32,
} as const;

/**
 * Build time limits in minutes
 */
export const BUILD_TIME_LIMITS = {
  /** Minimum build timeout (1 minute) */
  MIN: 1,
  /** Default build timeout (15 minutes) */
  DEFAULT: 15,
  /** Maximum build timeout for free tier (30 minutes) */
  FREE_TIER_MAX: 30,
  /** Maximum build timeout for paid tier (60 minutes) */
  PAID_TIER_MAX: 60,
  /** Extended build timeout for enterprise (120 minutes) */
  ENTERPRISE_MAX: 120,
} as const;

/**
 * Deployment limits
 */
export const DEPLOYMENT_LIMITS = {
  /** Maximum concurrent deployments */
  MAX_CONCURRENT: 5,
  /** Maximum deployments per month (free tier) */
  FREE_TIER_MONTHLY: 100,
  /** Maximum deployments per month (pro tier) */
  PRO_TIER_MONTHLY: 1000,
  /** Maximum deployments per month (enterprise tier) */
  ENTERPRISE_MONTHLY: 10000,
  /** Maximum deployment retries */
  MAX_RETRIES: 3,
  /** Deployment retry delay in milliseconds */
  RETRY_DELAY_MS: 5000,
} as const;

/**
 * Memory limits in megabytes
 */
export const MEMORY_LIMITS = {
  /** Minimum memory allocation (128 MB) */
  MIN: 128,
  /** Default memory allocation (512 MB) */
  DEFAULT: 512,
  /** Recommended memory for small apps (1 GB) */
  SMALL_APP: 1024,
  /** Recommended memory for medium apps (2 GB) */
  MEDIUM_APP: 2048,
  /** Recommended memory for large apps (4 GB) */
  LARGE_APP: 4096,
  /** Maximum memory for standard tier (8 GB) */
  STANDARD_MAX: 8192,
  /** Maximum memory for enterprise tier (32 GB) */
  ENTERPRISE_MAX: 32768,
} as const;

/**
 * CPU limits in cores/vCPUs
 */
export const CPU_LIMITS = {
  /** Minimum CPU allocation (0.25 vCPU) */
  MIN: 0.25,
  /** Default CPU allocation (1 vCPU) */
  DEFAULT: 1,
  /** Recommended CPU for small apps (1 vCPU) */
  SMALL_APP: 1,
  /** Recommended CPU for medium apps (2 vCPU) */
  MEDIUM_APP: 2,
  /** Recommended CPU for large apps (4 vCPU) */
  LARGE_APP: 4,
  /** Maximum CPU for standard tier (8 vCPU) */
  STANDARD_MAX: 8,
  /** Maximum CPU for enterprise tier (32 vCPU) */
  ENTERPRISE_MAX: 32,
} as const;

/**
 * Bandwidth limits in gigabytes
 */
export const BANDWIDTH_LIMITS = {
  /** Free tier bandwidth per month (10 GB) */
  FREE_TIER: 10,
  /** Starter tier bandwidth per month (100 GB) */
  STARTER_TIER: 100,
  /** Pro tier bandwidth per month (1 TB) */
  PRO_TIER: 1000,
  /** Enterprise tier bandwidth per month (10 TB) */
  ENTERPRISE_TIER: 10000,
  /** Recommended minimum (50 GB) */
  RECOMMENDED_MIN: 50,
} as const;

/**
 * Storage limits in gigabytes
 */
export const STORAGE_LIMITS = {
  /** Free tier storage (1 GB) */
  FREE_TIER: 1,
  /** Starter tier storage (10 GB) */
  STARTER_TIER: 10,
  /** Pro tier storage (100 GB) */
  PRO_TIER: 100,
  /** Enterprise tier storage (1 TB) */
  ENTERPRISE_TIER: 1000,
  /** Maximum single file storage (5 GB) */
  MAX_FILE_SIZE: 5,
} as const;

/**
 * Request/Traffic limits
 */
export const TRAFFIC_LIMITS = {
  /** Free tier requests per month */
  FREE_TIER_REQUESTS: 100000,
  /** Pro tier requests per month */
  PRO_TIER_REQUESTS: 1000000,
  /** Enterprise tier requests per month */
  ENTERPRISE_REQUESTS: 10000000,
  /** Rate limit per minute (requests) */
  RATE_LIMIT_PER_MINUTE: 60,
  /** Rate limit per hour (requests) */
  RATE_LIMIT_PER_HOUR: 1000,
} as const;

/**
 * Function execution limits
 */
export const FUNCTION_LIMITS = {
  /** Maximum function execution time in seconds (free tier) */
  FREE_TIER_TIMEOUT: 10,
  /** Maximum function execution time in seconds (paid tier) */
  PAID_TIER_TIMEOUT: 60,
  /** Maximum function execution time in seconds (enterprise) */
  ENTERPRISE_TIMEOUT: 300,
  /** Maximum function memory in MB */
  MAX_MEMORY: 3008,
  /** Default function memory in MB */
  DEFAULT_MEMORY: 1024,
  /** Maximum function size in MB */
  MAX_SIZE: 50,
} as const;

/**
 * Performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Good response time in milliseconds */
  GOOD_RESPONSE_TIME: 200,
  /** Acceptable response time in milliseconds */
  ACCEPTABLE_RESPONSE_TIME: 500,
  /** Slow response time threshold in milliseconds */
  SLOW_RESPONSE_TIME: 1000,
  /** Cold start threshold in milliseconds */
  COLD_START_THRESHOLD: 3000,
  /** Target uptime percentage */
  TARGET_UPTIME: 99.9,
  /** Minimum acceptable uptime percentage */
  MIN_UPTIME: 99.0,
} as const;

/**
 * Provider-specific capability limits
 */
export const PROVIDER_CAPABILITY_LIMITS: Readonly<Record<CloudProviderType, {
  maxDeployments: number;
  maxBuildTime: number;
  maxFileSize: number;
  maxBandwidth: number;
  maxStorage: number;
}>> = {
  vercel: {
    maxDeployments: 100, // Free tier per day
    maxBuildTime: 45, // minutes
    maxFileSize: 50, // MB
    maxBandwidth: 100, // GB/month free tier
    maxStorage: 100, // GB
  },
  netlify: {
    maxDeployments: 1000, // Pro plan per month
    maxBuildTime: 15, // minutes free tier
    maxFileSize: 32, // MB per file
    maxBandwidth: 100, // GB/month free tier
    maxStorage: 100, // GB
  },
  aws: {
    maxDeployments: 10000, // Virtually unlimited
    maxBuildTime: 60, // minutes (CodeBuild)
    maxFileSize: 1024, // MB (S3 multipart)
    maxBandwidth: 15, // GB/month free tier (CloudFront)
    maxStorage: 5, // GB free tier (S3)
  },
  azure: {
    maxDeployments: 10000, // Virtually unlimited
    maxBuildTime: 60, // minutes
    maxFileSize: 1024, // MB
    maxBandwidth: 15, // GB/month free tier
    maxStorage: 5, // GB free tier
  },
  gcp: {
    maxDeployments: 10000, // Virtually unlimited
    maxBuildTime: 120, // minutes
    maxFileSize: 1024, // MB
    maxBandwidth: 10, // GB/month free tier
    maxStorage: 5, // GB free tier
  },
  railway: {
    maxDeployments: 500, // Free tier per month
    maxBuildTime: 30, // minutes
    maxFileSize: 100, // MB
    maxBandwidth: 100, // GB/month
    maxStorage: 1, // GB free tier
  },
  render: {
    maxDeployments: 100, // Free tier per month
    maxBuildTime: 90, // minutes
    maxFileSize: 500, // MB
    maxBandwidth: 100, // GB/month
    maxStorage: 1, // GB free tier
  },
  digitalocean: {
    maxDeployments: 100, // Free tier per month
    maxBuildTime: 30, // minutes
    maxFileSize: 500, // MB
    maxBandwidth: 1000, // GB/month (1TB)
    maxStorage: 25, // GB starter
  },
  linode: {
    maxDeployments: 100, // Estimated
    maxBuildTime: 30, // minutes
    maxFileSize: 500, // MB
    maxBandwidth: 1000, // GB/month
    maxStorage: 25, // GB starter
  },
  vultr: {
    maxDeployments: 100, // Estimated
    maxBuildTime: 30, // minutes
    maxFileSize: 500, // MB
    maxBandwidth: 1000, // GB/month
    maxStorage: 25, // GB starter
  },
  fly: {
    maxDeployments: 100, // Free tier per month
    maxBuildTime: 30, // minutes
    maxFileSize: 100, // MB
    maxBandwidth: 160, // GB/month free tier
    maxStorage: 3, // GB free tier
  },
  cloudflare: {
    maxDeployments: 500, // Free tier per day
    maxBuildTime: 30, // minutes
    maxFileSize: 25, // MB (Workers)
    maxBandwidth: 10000, // Unlimited on free tier (CDN only)
    maxStorage: 1, // GB free tier (KV)
  },
} as const;

/**
 * Cost thresholds in USD
 */
export const COST_THRESHOLDS = {
  /** Free tier limit */
  FREE_TIER: 0,
  /** Low cost threshold */
  LOW_COST: 10,
  /** Medium cost threshold */
  MEDIUM_COST: 50,
  /** High cost threshold */
  HIGH_COST: 200,
  /** Enterprise cost threshold */
  ENTERPRISE_COST: 1000,
  /** Warning threshold (80% of budget) */
  WARNING_THRESHOLD: 0.8,
  /** Critical threshold (95% of budget) */
  CRITICAL_THRESHOLD: 0.95,
} as const;

/**
 * Bandwidth cost per GB in USD
 */
export const BANDWIDTH_COSTS: Readonly<Record<CloudProviderType, number>> = {
  vercel: 0.40,
  netlify: 0.20,
  aws: 0.09, // CloudFront
  azure: 0.087,
  gcp: 0.085,
  railway: 0.10,
  render: 0.10,
  digitalocean: 0.01, // Included in plan
  linode: 0.01, // Included in plan
  vultr: 0.01, // Included in plan
  fly: 0.02,
  cloudflare: 0, // Free
} as const;

/**
 * Get provider capability limits
 *
 * @param provider - Cloud provider type
 * @returns Provider-specific limits
 *
 * @example
 * ```typescript
 * const limits = getProviderLimits('vercel');
 * // Returns: { maxDeployments: 100, maxBuildTime: 45, ... }
 * ```
 */
export function getProviderLimits(provider: CloudProviderType) {
  return PROVIDER_CAPABILITY_LIMITS[provider];
}

/**
 * Get bandwidth cost for provider
 *
 * @param provider - Cloud provider type
 * @returns Cost per GB in USD
 *
 * @example
 * ```typescript
 * const cost = getBandwidthCost('vercel');
 * // Returns: 0.40
 * ```
 */
export function getBandwidthCost(provider: CloudProviderType): number {
  return BANDWIDTH_COSTS[provider];
}

/**
 * Check if deployment count exceeds provider limit
 *
 * @param provider - Cloud provider type
 * @param count - Number of deployments
 * @returns True if limit exceeded
 *
 * @example
 * ```typescript
 * const exceeded = exceedsDeploymentLimit('vercel', 150);
 * // Returns: true (vercel free tier limit is 100/day)
 * ```
 */
export function exceedsDeploymentLimit(provider: CloudProviderType, count: number): boolean {
  const limits = getProviderLimits(provider);
  return count > limits.maxDeployments;
}

/**
 * Check if build time exceeds provider limit
 *
 * @param provider - Cloud provider type
 * @param minutes - Build time in minutes
 * @returns True if limit exceeded
 *
 * @example
 * ```typescript
 * const exceeded = exceedsBuildTimeLimit('netlify', 20);
 * // Returns: true (netlify free tier limit is 15 minutes)
 * ```
 */
export function exceedsBuildTimeLimit(provider: CloudProviderType, minutes: number): boolean {
  const limits = getProviderLimits(provider);
  return minutes > limits.maxBuildTime;
}

/**
 * Check if file size exceeds provider limit
 *
 * @param provider - Cloud provider type
 * @param sizeMB - File size in megabytes
 * @returns True if limit exceeded
 *
 * @example
 * ```typescript
 * const exceeded = exceedsFileSizeLimit('vercel', 60);
 * // Returns: true (vercel limit is 50 MB)
 * ```
 */
export function exceedsFileSizeLimit(provider: CloudProviderType, sizeMB: number): boolean {
  const limits = getProviderLimits(provider);
  return sizeMB > limits.maxFileSize;
}

/**
 * Get recommended memory for project size
 *
 * @param size - Project size category
 * @returns Recommended memory in MB
 *
 * @example
 * ```typescript
 * const memory = getRecommendedMemory('medium');
 * // Returns: 2048
 * ```
 */
export function getRecommendedMemory(size: 'small' | 'medium' | 'large' | 'enterprise'): number {
  switch (size) {
    case 'small':
      return MEMORY_LIMITS.SMALL_APP;
    case 'medium':
      return MEMORY_LIMITS.MEDIUM_APP;
    case 'large':
      return MEMORY_LIMITS.LARGE_APP;
    case 'enterprise':
      return MEMORY_LIMITS.ENTERPRISE_MAX;
    default:
      return MEMORY_LIMITS.DEFAULT;
  }
}

/**
 * Get recommended CPU for project size
 *
 * @param size - Project size category
 * @returns Recommended CPU in vCPUs
 *
 * @example
 * ```typescript
 * const cpu = getRecommendedCPU('large');
 * // Returns: 4
 * ```
 */
export function getRecommendedCPU(size: 'small' | 'medium' | 'large' | 'enterprise'): number {
  switch (size) {
    case 'small':
      return CPU_LIMITS.SMALL_APP;
    case 'medium':
      return CPU_LIMITS.MEDIUM_APP;
    case 'large':
      return CPU_LIMITS.LARGE_APP;
    case 'enterprise':
      return CPU_LIMITS.ENTERPRISE_MAX;
    default:
      return CPU_LIMITS.DEFAULT;
  }
}

/**
 * Calculate bandwidth overage cost
 *
 * @param provider - Cloud provider type
 * @param usedGB - Bandwidth used in GB
 * @param includedGB - Included bandwidth in GB
 * @returns Overage cost in USD
 *
 * @example
 * ```typescript
 * const cost = calculateBandwidthOverage('vercel', 150, 100);
 * // Returns: 20 (50 GB overage * $0.40/GB)
 * ```
 */
export function calculateBandwidthOverage(
  provider: CloudProviderType,
  usedGB: number,
  includedGB: number
): number {
  const overage = Math.max(0, usedGB - includedGB);
  const costPerGB = getBandwidthCost(provider);
  return overage * costPerGB;
}
