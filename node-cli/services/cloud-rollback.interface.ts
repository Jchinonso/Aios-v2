/**
 * @fileoverview Cloud Rollback Interface
 * @module node-cli/services/cloud-rollback.interface
 *
 * Interface for rolling back deployments, scaling, and env vars across providers.
 * Decouples undo stack from specific CloudManager implementation.
 *
 * @example
 * ```typescript
 * const rollback: ICloudRollback = new CloudRollbackService(cloudManager);
 * const result = await rollback.rollbackDeployment({
 *   provider: 'vercel',
 *   projectName: 'api-server',
 *   targetVersion: 'v1.0.0',
 * });
 * ```
 */

import type { CloudProviderType } from './undo.types.js';

/**
 * Rollback result with success/error discrimination
 */
export interface RollbackResult {
  /** Whether rollback succeeded */
  readonly success: boolean;

  /** Current version/state after rollback (if successful) */
  readonly version?: string;

  /** Deployment ID after rollback (if applicable) */
  readonly deploymentId?: string;

  /** URL of rolled-back deployment (if applicable) */
  readonly url?: string;

  /** Error information (if failed) */
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly recoverable: boolean;
    readonly details?: Record<string, unknown>;
  };
}

/**
 * Deployment rollback request
 */
export interface DeploymentRollbackRequest {
  /** Cloud provider */
  readonly provider: CloudProviderType;

  /** Project/service name */
  readonly projectName: string;

  /** Current deployment ID to roll back from */
  readonly currentDeploymentId: string;

  /** Target version to roll back to (optional) */
  readonly targetVersion?: string;

  /** Target deployment ID to roll back to (optional) */
  readonly targetDeploymentId?: string;

  /** Git commit to roll back to (optional) */
  readonly targetGitCommit?: string;
}

/**
 * Scaling rollback request
 */
export interface ScalingRollbackRequest {
  /** Cloud provider */
  readonly provider: CloudProviderType;

  /** Service/deployment name */
  readonly serviceName: string;

  /** Target replica count */
  readonly targetReplicas: number;

  /** Target instance type (optional) */
  readonly targetInstanceType?: string;

  /** Target memory (optional) */
  readonly targetMemory?: string;

  /** Target CPU (optional) */
  readonly targetCpu?: string;
}

/**
 * Environment variable rollback request
 */
export interface EnvVarRollbackRequest {
  /** Cloud provider */
  readonly provider: CloudProviderType;

  /** Project name */
  readonly projectName: string;

  /** Target environment variables */
  readonly targetVariables: ReadonlyMap<string, string>;
}

/**
 * Cloud rollback interface
 *
 * Provides methods for rolling back deployments, scaling, and env vars.
 * Implementations should handle provider-specific APIs.
 */
export interface ICloudRollback {
  /**
   * Roll back a deployment to previous version
   *
   * @param request - Rollback request
   * @returns Rollback result
   *
   * @example
   * ```typescript
   * const result = await rollback.rollbackDeployment({
   *   provider: 'vercel',
   *   projectName: 'api-server',
   *   currentDeploymentId: 'new-deploy-123',
   *   targetVersion: 'v1.0.0',
   *   targetDeploymentId: 'old-deploy-456',
   * });
   * ```
   */
  rollbackDeployment(request: DeploymentRollbackRequest): Promise<RollbackResult>;

  /**
   * Roll back scaling changes
   *
   * @param request - Scaling rollback request
   * @returns Rollback result
   *
   * @example
   * ```typescript
   * const result = await rollback.rollbackScaling({
   *   provider: 'aws',
   *   serviceName: 'api-server',
   *   targetReplicas: 2,
   * });
   * ```
   */
  rollbackScaling(request: ScalingRollbackRequest): Promise<RollbackResult>;

  /**
   * Roll back environment variable changes
   *
   * @param request - Env var rollback request
   * @returns Rollback result
   *
   * @example
   * ```typescript
   * const result = await rollback.rollbackEnvVars({
   *   provider: 'vercel',
   *   projectName: 'api-server',
   *   targetVariables: new Map([['API_KEY', 'old-value']]),
   * });
   * ```
   */
  rollbackEnvVars(request: EnvVarRollbackRequest): Promise<RollbackResult>;
}
