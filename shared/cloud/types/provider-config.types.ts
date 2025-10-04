/**
 * @fileoverview Provider Configuration Types - Type-safe provider configs
 * @description Eliminates 'as any' casts by providing proper typed configurations
 * for each cloud provider.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

import type { CloudProviderConfig } from './cloud-provider.types.js';

/**
 * Vercel provider configuration
 */
export interface VercelProviderConfig extends CloudProviderConfig {
  readonly type: 'vercel';
  readonly token: string;
  readonly orgId?: string;
  readonly projectId?: string;
  readonly teamId?: string;
}

/**
 * Netlify provider configuration
 */
export interface NetlifyProviderConfig extends CloudProviderConfig {
  readonly type: 'netlify';
  readonly token: string;
  readonly siteId: string;
  readonly teamId?: string;
}

/**
 * AWS provider configuration
 */
export interface AWSProviderConfig extends CloudProviderConfig {
  readonly type: 'aws';
  readonly accessKeyId?: string;
  readonly secretAccessKey?: string;
  readonly sessionToken?: string;
  readonly profile?: string;
}

/**
 * Railway provider configuration
 */
export interface RailwayProviderConfig extends CloudProviderConfig {
  readonly type: 'railway';
  readonly token: string;
  readonly projectId?: string;
}

/**
 * Render provider configuration
 */
export interface RenderProviderConfig extends CloudProviderConfig {
  readonly type: 'render';
  readonly apiKey: string;
  readonly serviceId?: string;
}

/**
 * Union of all provider-specific configs
 */
export type ProviderSpecificConfig =
  | VercelProviderConfig
  | NetlifyProviderConfig
  | AWSProviderConfig
  | RailwayProviderConfig
  | RenderProviderConfig;

/**
 * Type guard to check if config is Vercel config
 */
export function isVercelConfig(config: CloudProviderConfig): config is VercelProviderConfig {
  return config.type === 'vercel';
}

/**
 * Type guard to check if config is Netlify config
 */
export function isNetlifyConfig(config: CloudProviderConfig): config is NetlifyProviderConfig {
  return config.type === 'netlify';
}

/**
 * Type guard to check if config is AWS config
 */
export function isAWSConfig(config: CloudProviderConfig): config is AWSProviderConfig {
  return config.type === 'aws';
}

/**
 * Type guard to check if config is Railway config
 */
export function isRailwayConfig(config: CloudProviderConfig): config is RailwayProviderConfig {
  return config.type === 'railway';
}

/**
 * Type guard to check if config is Render config
 */
export function isRenderConfig(config: CloudProviderConfig): config is RenderProviderConfig {
  return config.type === 'render';
}

/**
 * Extract token from provider config safely
 * @param config Provider configuration
 * @returns Token string or undefined
 */
export function extractToken(config: CloudProviderConfig | undefined): string | undefined {
  if (!config) return undefined;

  switch (config.type) {
    case 'vercel':
      return (config as VercelProviderConfig).token;
    case 'netlify':
      return (config as NetlifyProviderConfig).token;
    case 'railway':
      return (config as RailwayProviderConfig).token;
    case 'render':
      return (config as RenderProviderConfig).apiKey;
    case 'aws':
      return undefined; // AWS uses accessKeyId/secretAccessKey
    default:
      return config.accessToken;
  }
}

/**
 * Validate provider configuration
 * @param config Provider configuration to validate
 * @returns Validation result with error messages
 */
export function validateProviderConfig(config: CloudProviderConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.type) {
    errors.push('Provider type is required');
    return { valid: false, errors };
  }

  switch (config.type) {
    case 'vercel':
      if (!(config as VercelProviderConfig).token) {
        errors.push('Vercel token is required');
      }
      break;

    case 'netlify':
      const netlifyConfig = config as NetlifyProviderConfig;
      if (!netlifyConfig.token) errors.push('Netlify token is required');
      if (!netlifyConfig.siteId) errors.push('Netlify siteId is required');
      break;

    case 'aws':
      const awsConfig = config as AWSProviderConfig;
      const hasEnvCreds = process.env['AWS_ACCESS_KEY_ID'] && process.env['AWS_SECRET_ACCESS_KEY'];
      const hasConfigCreds = awsConfig.accessKeyId && awsConfig.secretAccessKey;
      const hasProfile = awsConfig.profile;

      if (!hasEnvCreds && !hasConfigCreds && !hasProfile) {
        errors.push('AWS credentials are required (accessKeyId/secretAccessKey or profile)');
      }
      break;

    case 'railway':
      if (!(config as RailwayProviderConfig).token) {
        errors.push('Railway token is required');
      }
      break;

    case 'render':
      if (!(config as RenderProviderConfig).apiKey) {
        errors.push('Render API key is required');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
