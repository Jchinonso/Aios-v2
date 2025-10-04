/**
 * @fileoverview Provider Credential Configurations
 * @description Centralized credential requirements for all cloud providers
 *
 * This file defines the credential fields required for each cloud provider,
 * including environment variable mappings, display messages, and security settings.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

import type { CloudProviderType } from '../cloud/types/cloud-provider.types.js';

/**
 * Credential field configuration for a provider
 */
export interface ProviderCredentialField {
  /** Internal field name */
  readonly name: string;
  /** Environment variable name */
  readonly envVar: string;
  /** User-facing prompt message */
  readonly message: string;
  /** Whether this field is required */
  readonly required: boolean;
  /** Whether to mask the value in logs/display */
  readonly masked: boolean;
  /** Optional help text or documentation URL */
  readonly helpUrl?: string;
  /** Optional validation pattern */
  readonly pattern?: RegExp;
  /** Optional default value */
  readonly defaultValue?: string;
}

/**
 * Centralized provider credential configurations
 *
 * Single source of truth for all provider authentication requirements.
 * Used by CLI, deployment handlers, and credential management services.
 */
export const PROVIDER_CREDENTIALS: Readonly<Record<CloudProviderType, ReadonlyArray<ProviderCredentialField>>> = {
  vercel: [
    {
      name: 'apiToken',
      envVar: 'VERCEL_TOKEN',
      message: 'Vercel API Token',
      required: true,
      masked: true,
      helpUrl: 'https://vercel.com/account/tokens',
    }
  ],

  netlify: [
    {
      name: 'accessToken',
      envVar: 'NETLIFY_TOKEN',
      message: 'Netlify Access Token',
      required: true,
      masked: true,
      helpUrl: 'https://app.netlify.com/user/applications#personal-access-tokens',
    }
  ],

  aws: [
    {
      name: 'accessKeyId',
      envVar: 'AWS_ACCESS_KEY_ID',
      message: 'AWS Access Key ID',
      required: true,
      masked: false,
      helpUrl: 'https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html#access-keys-and-secret-access-keys',
      pattern: /^AKIA[0-9A-Z]{16}$/,
    },
    {
      name: 'secretAccessKey',
      envVar: 'AWS_SECRET_ACCESS_KEY',
      message: 'AWS Secret Access Key',
      required: true,
      masked: true,
      helpUrl: 'https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html#access-keys-and-secret-access-keys',
      pattern: /^[A-Za-z0-9/+=]{40}$/,
    },
    {
      name: 'region',
      envVar: 'AWS_REGION',
      message: 'AWS Region',
      required: true,
      masked: false,
      defaultValue: 'us-east-1',
      helpUrl: 'https://docs.aws.amazon.com/general/latest/gr/rande.html',
    }
  ],

  railway: [
    {
      name: 'apiToken',
      envVar: 'RAILWAY_TOKEN',
      message: 'Railway API Token',
      required: true,
      masked: true,
      helpUrl: 'https://docs.railway.app/develop/tokens',
    }
  ],

  render: [
    {
      name: 'apiKey',
      envVar: 'RENDER_API_KEY',
      message: 'Render API Key',
      required: true,
      masked: true,
      helpUrl: 'https://render.com/docs/api#authentication',
    }
  ],

  // Providers in development - credentials TBD
  azure: [],
  gcp: [],
  digitalocean: [],
  linode: [],
  vultr: [],
  fly: [],
  cloudflare: []
} as const;

/**
 * Get credential requirements for a specific provider
 *
 * @param provider - Cloud provider type
 * @returns Array of credential field configurations
 *
 * @example
 * ```typescript
 * const vercelCreds = getProviderCredentials('vercel');
 * // Returns: [{ name: 'apiToken', envVar: 'VERCEL_TOKEN', ... }]
 * ```
 */
export function getProviderCredentials(provider: CloudProviderType): ReadonlyArray<ProviderCredentialField> {
  return PROVIDER_CREDENTIALS[provider] ?? [];
}

/**
 * Get all required environment variables for a provider
 *
 * @param provider - Cloud provider type
 * @returns Array of required environment variable names
 *
 * @example
 * ```typescript
 * const awsEnvVars = getRequiredEnvVars('aws');
 * // Returns: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION']
 * ```
 */
export function getRequiredEnvVars(provider: CloudProviderType): readonly string[] {
  return getProviderCredentials(provider)
    .filter(field => field.required)
    .map(field => field.envVar);
}

/**
 * Check if a provider requires credentials
 *
 * @param provider - Cloud provider type
 * @returns True if provider requires any credentials
 *
 * @example
 * ```typescript
 * hasCredentials('vercel')  // true
 * hasCredentials('azure')   // false (not yet implemented)
 * ```
 */
export function hasCredentials(provider: CloudProviderType): boolean {
  return getProviderCredentials(provider).length > 0;
}

/**
 * Validate credential value against pattern (if defined)
 *
 * @param provider - Cloud provider type
 * @param fieldName - Credential field name
 * @param value - Value to validate
 * @returns True if valid or no pattern defined
 *
 * @example
 * ```typescript
 * validateCredentialFormat('aws', 'accessKeyId', 'AKIAIOSFODNN7EXAMPLE')  // true
 * validateCredentialFormat('aws', 'accessKeyId', 'invalid')                 // false
 * ```
 */
export function validateCredentialFormat(
  provider: CloudProviderType,
  fieldName: string,
  value: string
): boolean {
  const field = getProviderCredentials(provider).find(f => f.name === fieldName);
  if (!field?.pattern) {
    return true; // No pattern = valid
  }
  return field.pattern.test(value);
}
