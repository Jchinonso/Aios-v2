/**
 * @fileoverview State Management Types
 * @description Types for AIOS project state, deployment history, and configuration persistence
 * @module types/state
 */

import type { CloudProviderType } from '../cloud/types/index.js';

/**
 * Project fingerprint for state tracking
 */
export interface ProjectFingerprintType {
  readonly language: 'javascript' | 'typescript' | 'python' | 'go' | 'rust' | 'java' | 'other';
  readonly frameworks: readonly string[];
  readonly packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'cargo' | 'maven' | 'gradle' | 'unknown';
  readonly build: {
    readonly command?: string;
    readonly outputDir?: string;
  };
  readonly services: ReadonlyArray<{
    readonly name: string;
    readonly path: string;
    readonly type: 'frontend' | 'backend' | 'worker' | 'api';
  }>;
  readonly envs: readonly string[];
  readonly docker?: {
    readonly hasDockerfile: boolean;
    readonly context?: string;
  };
  readonly monorepo?: boolean;
}

/**
 * Secrets vault reference (no actual secrets stored)
 */
export interface SecretsVaultRefType {
  readonly scheme: 'os-keyring' | 'fs-kms' | 'env' | 'external' | 'file';
  readonly keyId: string;
  readonly itemId: string;
  readonly createdAt: string;
  readonly expiresAt?: string;
}

/**
 * Connection profile for a cloud provider
 */
export interface ConnectionProfileType {
  readonly id: string;
  readonly provider: CloudProviderType;
  readonly accountLabel?: string;
  readonly projectId?: string;
  readonly region?: string;
  readonly createdAt: string;
  readonly lastUsed: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly vaultRef: SecretsVaultRefType;
}

/**
 * Deployment record
 */
export interface DeploymentRecordType {
  readonly id: string;
  readonly provider: CloudProviderType;
  readonly environment: 'development' | 'staging' | 'production' | 'preview';
  readonly createdAt: string;
  readonly urls: readonly string[];
  readonly status: 'building' | 'ready' | 'error' | 'cancelled';
  readonly buildDurationMs?: number;
  readonly commit?: string;
  readonly branch?: string;
  readonly triggeredBy: 'cli' | 'api' | 'webhook' | 'manual';
  readonly meta?: Readonly<Record<string, unknown>>;
}

/**
 * AIOS project configuration (stored in .aios/config.json)
 */
export interface AiosConfigType {
  readonly version: string;
  readonly projectId: string;
  readonly createdAt: string;
  readonly lastUpdated: string;

  readonly project: {
    readonly name: string;
    readonly path: string;
    readonly framework?: string;
    readonly language?: string;
    readonly packageManager?: string;
    readonly buildCommand?: string;
    readonly outputDirectory?: string;
    readonly environmentFiles?: readonly string[];
  };

  readonly deployment?: {
    readonly provider: CloudProviderType;
    readonly providerId?: string;
    readonly firstDeployedAt?: string;
    readonly status: 'active' | 'inactive' | 'archived';
    readonly productionUrl?: string;
    readonly previewUrls?: readonly string[];
    readonly region?: string;
  };

  readonly credentials?: {
    readonly provider: CloudProviderType;
    readonly authMethod: 'oauth' | 'api_key' | 'service_account';
    readonly credentialId: string;
    readonly scopes?: readonly string[];
    readonly expiresAt?: string;
  };

  readonly monitoring?: {
    readonly enabled: boolean;
    readonly alerts?: Readonly<Record<string, unknown>>;
  };

  readonly history?: {
    readonly totalDeployments: number;
    readonly lastDeployment?: DeploymentRecordType;
  };

  readonly preferences?: {
    readonly autoScale?: boolean;
    readonly confirmDeployments?: boolean;
    readonly verboseLogging?: boolean;
    readonly defaultEnvironment?: 'development' | 'staging' | 'production';
  };
}

/**
 * Connection configuration (stored in .aios/connection.json)
 */
export interface ConnectionConfigType {
  readonly id: string;
  readonly provider: CloudProviderType;
  readonly projectId?: string;
  readonly accountLabel?: string;
  readonly region?: string;
  readonly createdAt: string;
  readonly lastConnected: string;
  readonly vaultRef: SecretsVaultRefType;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Provider recommendation with rationale
 */
export interface ProviderRecommendationType {
  readonly provider: CloudProviderType;
  readonly score: number;
  readonly rationale: readonly string[];
  readonly tradeoffs: readonly string[];
  readonly estimatedCost?: {
    readonly monthly: number;
    readonly currency: string;
  };
  readonly features: readonly string[];
  readonly deploymentTime?: number; // in seconds
}

/**
 * Natural language intent
 */
export interface NLIntentType {
  readonly intent: 'analyze' | 'recommend' | 'connect' | 'deploy' | 'status' | 'logs' | 'open';
  readonly entities: Readonly<Record<string, string | number | boolean>>;
  readonly confidence: number;
}

/**
 * State detection result
 */
export interface StateDetectionResultType {
  readonly hasAiosConfig: boolean;
  readonly hasDeployment: boolean;
  readonly hasConnection: boolean;
  readonly provider?: CloudProviderType;
  readonly configPath?: string;
  readonly needsSetup: boolean;
  readonly fingerprint?: ProjectFingerprintType;
}