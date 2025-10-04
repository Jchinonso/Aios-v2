/**
 * @fileoverview Enhanced State Manager - Production-Grade Deployment State & Audit Trail
 * @description
 * Enterprise-grade state management with:
 * - Type-safe error handling via Result<T> pattern
 * - Project fingerprinting for change detection
 * - Automatic rollback command generation
 * - JSONL append-only audit trail
 * - Optional ProjectStateManager integration
 * - Comprehensive validation and edge case handling
 *
 * @module node-cli/state/state-manager-enhanced
 * @version 2.0.0
 * @author AIOS Engineering Team
 *
 * @example Basic Usage
 * ```typescript
 * const stateManager = new EnhancedStateManager(process.cwd());
 *
 * // Record deployment
 * const result = await stateManager.recordDeployment({
 *   id: 'dep-123',
 *   timestamp: new Date(),
 *   service: 'my-api',
 *   environment: 'production',
 *   provider: 'vercel',
 *   command: 'aios deploy --env production',
 *   status: 'success',
 *   duration: 45000
 * });
 *
 * if (result.success) {
 *   console.log('Deployment recorded successfully');
 * }
 * ```
 */

import { promises as fs } from 'fs';
import { resolve, join } from 'path';
import { createHash } from 'crypto';
import type { ParsedIntentType } from '../nl-planner/types.js';
import type { CloudProviderType } from '@aios/shared';

// Forward declaration - optional dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectStateManager = any;

/**
 * Result pattern for type-safe error handling
 * Eliminates exceptions for expected errors
 */
export type Result<T, E = Error> =
  | { readonly success: true; readonly data: T; readonly error?: undefined }
  | { readonly success: false; readonly data?: undefined; readonly error: E };

/**
 * Branded type for deployment IDs (prevents mixing with regular strings)
 */
export type DeploymentId = string & { readonly __brand: 'DeploymentId' };

/**
 * Branded type for session IDs
 */
export type SessionId = string & { readonly __brand: 'SessionId' };

/**
 * Project fingerprint for change detection
 * Captures the state of the project at deployment time
 */
export interface ProjectFingerprint {
  readonly hash: string;
  readonly capturedAt: Date;
  readonly files: {
    readonly total: number;
    readonly modified: readonly string[];
  };
  readonly dependencies: {
    readonly hash: string;
    readonly count: number;
  };
  readonly gitCommit?: string;
  readonly gitBranch?: string;
  readonly gitDirty: boolean;
}

/**
 * Enhanced deployment record with fingerprinting
 */
export interface EnhancedDeploymentRecord {
  readonly id: DeploymentId;
  readonly timestamp: Date;
  readonly service: string;
  readonly environment: 'development' | 'staging' | 'production' | 'preview';
  readonly provider: CloudProviderType | undefined;
  readonly command: string;
  readonly intent: ParsedIntentType;
  readonly status: 'pending' | 'success' | 'failed' | 'rolled-back';
  readonly duration?: number;
  readonly error?: string;
  readonly fingerprint?: ProjectFingerprint;
  readonly rollbackCommand?: string;
  readonly metadata?: {
    readonly user?: string;
    readonly hostname?: string;
    readonly cwd?: string;
    readonly nodeVersion?: string;
  };
}

/**
 * Session tracking record
 */
export interface SessionRecord {
  readonly id: SessionId;
  readonly started: Date;
  readonly ended?: Date;
  readonly commandsExecuted: number;
  readonly intentsUsed: readonly string[];
}

/**
 * State manager configuration options
 */
export interface StateManagerOptions {
  readonly projectRoot: string;
  readonly projectStateManager?: ProjectStateManager;
  readonly enableFingerprinting?: boolean;
  readonly maxHistorySize?: number;
}

/**
 * Error types for StateManager operations
 */
export class StateManagerError extends Error {
  public readonly code: 'INIT_FAILED' | 'WRITE_FAILED' | 'READ_FAILED' | 'PARSE_FAILED' | 'INVALID_DATA';
  public override readonly cause?: Error | undefined;

  constructor(
    message: string,
    code: 'INIT_FAILED' | 'WRITE_FAILED' | 'READ_FAILED' | 'PARSE_FAILED' | 'INVALID_DATA',
    cause?: Error | undefined
  ) {
    super(message);
    this.name = 'StateManagerError';
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

/**
 * Enhanced State Manager
 *
 * Production-grade state management with type safety, fingerprinting,
 * and comprehensive error handling.
 *
 * @example
 * ```typescript
 * const stateManager = new EnhancedStateManager({
 *   projectRoot: process.cwd(),
 *   enableFingerprinting: true,
 *   maxHistorySize: 1000
 * });
 *
 * await stateManager.initialize();
 *
 * const result = await stateManager.recordDeployment({...});
 * if (!result.success) {
 *   console.error('Failed to record:', result.error.message);
 * }
 * ```
 */
export class EnhancedStateManager {
  private readonly projectRoot: string;
  private readonly stateDir: string;
  private readonly evidenceDir: string;
  private readonly historyFile: string;
  private readonly sessionFile: string;
  private readonly fingerprintFile: string;
  private readonly projectStateManager?: ProjectStateManager;
  private readonly enableFingerprinting: boolean;
  private readonly maxHistorySize: number;

  constructor(options: StateManagerOptions | string) {
    // Support legacy constructor: new StateManager(projectRoot)
    if (typeof options === 'string') {
      this.projectRoot = options;
      this.enableFingerprinting = false;
      this.maxHistorySize = 1000;
    } else {
      this.projectRoot = options.projectRoot;
      this.projectStateManager = options.projectStateManager;
      this.enableFingerprinting = options.enableFingerprinting ?? false;
      this.maxHistorySize = options.maxHistorySize ?? 1000;
    }

    this.stateDir = resolve(this.projectRoot, '.aios');
    this.evidenceDir = resolve(this.stateDir, 'evidence');
    this.historyFile = resolve(this.stateDir, 'history.jsonl');
    this.sessionFile = resolve(this.stateDir, 'session.json');
    this.fingerprintFile = resolve(this.stateDir, 'fingerprint.json');
  }

  /**
   * Initialize .aios/ directory structure
   *
   * Creates:
   * - .aios/ (root state directory)
   * - .aios/evidence/ (deployment evidence files)
   * - .aios/.gitignore (prevents committing secrets)
   *
   * @returns Result indicating success or failure
   *
   * @example
   * ```typescript
   * const result = await stateManager.initialize();
   * if (result.success) {
   *   console.log('.aios directory ready');
   * }
   * ```
   */
  async initialize(): Promise<Result<void, StateManagerError>> {
    try {
      await fs.mkdir(this.stateDir, { recursive: true });
      await fs.mkdir(this.evidenceDir, { recursive: true });

      // Create .gitignore to prevent committing sensitive data
      const gitignorePath = resolve(this.stateDir, '.gitignore');
      const gitignoreContent = `# AIOS state directory - do not commit sensitive data
*
!.gitignore
`;
      await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8');

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: new StateManagerError(
          'Failed to initialize .aios directory',
          'INIT_FAILED',
          error as Error
        )
      };
    }
  }

  /**
   * Record a deployment to the audit trail
   *
   * Features:
   * - Appends to JSONL (never loses data on crash)
   * - Saves evidence file with full context
   * - Optionally syncs to ProjectStateManager
   * - Generates rollback command automatically
   * - Captures project fingerprint (if enabled)
   *
   * @param record - Deployment record to persist
   * @returns Result indicating success or failure
   *
   * @example
   * ```typescript
   * const result = await stateManager.recordDeployment({
   *   id: generateDeploymentId(),
   *   timestamp: new Date(),
   *   service: 'api',
   *   environment: 'production',
   *   provider: 'vercel',
   *   command: 'aios deploy',
   *   intent: {...},
   *   status: 'success'
   * });
   * ```
   */
  async recordDeployment(
    record: EnhancedDeploymentRecord
  ): Promise<Result<void, StateManagerError>> {
    try {
      // Ensure directory exists
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }

      // Capture fingerprint if enabled and not already present
      let enrichedRecord = record;
      if (this.enableFingerprinting && !record.fingerprint) {
        const fingerprintResult = await this.captureFingerprint();
        if (fingerprintResult.success) {
          enrichedRecord = {
            ...record,
            fingerprint: fingerprintResult.data
          };
        }
      }

      // Generate rollback command if not present
      if (!enrichedRecord.rollbackCommand && record.status === 'success') {
        enrichedRecord = {
          ...enrichedRecord,
          rollbackCommand: this.generateRollbackCommand(record)
        };
      }

      // Append to JSONL history (append-only for crash safety)
      const jsonLine = JSON.stringify({
        ...enrichedRecord,
        timestamp: enrichedRecord.timestamp.toISOString()
      }) + '\n';

      await fs.appendFile(this.historyFile, jsonLine, 'utf-8');

      // Save detailed evidence file
      await this.saveEvidence(enrichedRecord);

      // Sync to ProjectStateManager if available
      if (this.projectStateManager && record.provider) {
        await this.syncToProjectState(enrichedRecord);
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: new StateManagerError(
          'Failed to record deployment',
          'WRITE_FAILED',
          error as Error
        )
      };
    }
  }

  /**
   * Get deployment history with filtering and pagination
   *
   * @param options - Query options
   * @returns Result containing deployment records or error
   *
   * @example
   * ```typescript
   * // Get last 20 deployments
   * const result = await stateManager.getHistory({ limit: 20 });
   *
   * // Get production deployments only
   * const prodResult = await stateManager.getHistory({
   *   environment: 'production',
   *   limit: 10
   * });
   * ```
   */
  async getHistory(options: {
    readonly limit?: number;
    readonly environment?: string;
    readonly service?: string;
    readonly status?: EnhancedDeploymentRecord['status'];
  } = {}): Promise<Result<readonly EnhancedDeploymentRecord[], StateManagerError>> {
    try {
      const content = await fs.readFile(this.historyFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      let records = lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((obj): obj is Record<string, unknown> => obj !== null)
        .map(obj => ({
          ...obj,
          timestamp: new Date(obj['timestamp'] as string),
          fingerprint: obj['fingerprint']
            ? {
                ...obj['fingerprint'],
                capturedAt: new Date((obj['fingerprint'] as Record<string, unknown>)['capturedAt'] as string)
              }
            : undefined
        })) as EnhancedDeploymentRecord[];

      // Apply filters
      if (options.environment) {
        records = records.filter(r => r.environment === options.environment);
      }
      if (options.service) {
        records = records.filter(r => r.service === options.service);
      }
      if (options.status) {
        records = records.filter(r => r.status === options.status);
      }

      // Sort by timestamp (newest first) and apply limit
      const sorted = records
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, options.limit ?? 50);

      return { success: true, data: sorted };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { success: true, data: [] }; // No history file yet
      }
      return {
        success: false,
        error: new StateManagerError(
          'Failed to read deployment history',
          'READ_FAILED',
          error as Error
        )
      };
    }
  }

  /**
   * Get deployment by ID
   *
   * @param id - Deployment ID to lookup
   * @returns Result containing deployment record or null if not found
   */
  async getDeploymentById(
    id: DeploymentId
  ): Promise<Result<EnhancedDeploymentRecord | null, StateManagerError>> {
    const historyResult = await this.getHistory({ limit: this.maxHistorySize });

    if (!historyResult.success) {
      return historyResult as Result<null, StateManagerError>;
    }

    const deployment = historyResult.data.find(d => d.id === id);
    return { success: true, data: deployment || null };
  }

  /**
   * Get last successful deployment for a service/environment
   * Used for rollback operations
   *
   * @param service - Service name
   * @param environment - Environment name
   * @returns Result containing deployment record or null
   */
  async getLastDeployment(
    service: string,
    environment: string
  ): Promise<Result<EnhancedDeploymentRecord | null, StateManagerError>> {
    const historyResult = await this.getHistory({
      service,
      environment,
      status: 'success',
      limit: 1
    });

    if (!historyResult.success) {
      return historyResult as Result<null, StateManagerError>;
    }

    const deployment = historyResult.data[0] || null;
    return { success: true, data: deployment };
  }

  /**
   * Capture current project fingerprint for change detection
   *
   * @returns Result containing project fingerprint
   * @private
   */
  private async captureFingerprint(): Promise<Result<ProjectFingerprint, StateManagerError>> {
    try {
      // This is a placeholder - in production, integrate with UnifiedAnalyzer
      const fingerprint: ProjectFingerprint = {
        hash: createHash('sha256').update(Date.now().toString()).digest('hex'),
        capturedAt: new Date(),
        files: {
          total: 0,
          modified: []
        },
        dependencies: {
          hash: '',
          count: 0
        },
        gitDirty: false
      };

      return { success: true, data: fingerprint };
    } catch (error) {
      return {
        success: false,
        error: new StateManagerError(
          'Failed to capture project fingerprint',
          'READ_FAILED',
          error as Error
        )
      };
    }
  }

  /**
   * Generate rollback command for a deployment
   *
   * @param record - Deployment record
   * @returns Rollback command string
   * @private
   */
  private generateRollbackCommand(record: EnhancedDeploymentRecord): string {
    return `aios rollback --service ${record.service} --env ${record.environment} --to ${record.id}`;
  }

  /**
   * Save evidence file for forensic analysis
   *
   * @param record - Deployment record
   * @private
   */
  private async saveEvidence(record: EnhancedDeploymentRecord): Promise<void> {
    const timestamp = record.timestamp.toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}_${record.service}_${record.environment}.json`;
    const filepath = join(this.evidenceDir, filename);

    const evidence = {
      ...record,
      timestamp: record.timestamp.toISOString(),
      fingerprint: record.fingerprint
        ? {
            ...record.fingerprint,
            capturedAt: record.fingerprint.capturedAt.toISOString()
          }
        : undefined,
      metadata: {
        ...record.metadata,
        user: process.env['USER'] || process.env['USERNAME'] || 'unknown',
        hostname: process.env['HOSTNAME'] || 'unknown',
        cwd: process.cwd(),
        nodeVersion: process.version
      }
    };

    await fs.writeFile(filepath, JSON.stringify(evidence, null, 2), 'utf-8');
  }

  /**
   * Sync deployment record to ProjectStateManager
   *
   * @param record - Deployment record to sync
   * @private
   */
  private async syncToProjectState(record: EnhancedDeploymentRecord): Promise<void> {
    if (!this.projectStateManager || !record.provider) return;

    try {
      await this.projectStateManager.addDeploymentRecord({
        id: record.id,
        provider: record.provider,
        environment: record.environment,
        createdAt: record.timestamp.toISOString(),
        urls: [],
        status: this.mapStatusToProjectState(record.status),
        triggeredBy: 'cli'
      });
    } catch (error) {
      // Don't fail deployment recording if sync fails
      console.warn('Failed to sync to ProjectStateManager:', error);
    }
  }

  /**
   * Map deployment status to ProjectState status
   *
   * @param status - Deployment status
   * @returns Mapped status
   * @private
   */
  private mapStatusToProjectState(
    status: EnhancedDeploymentRecord['status']
  ): 'building' | 'ready' | 'error' | 'cancelled' {
    switch (status) {
      case 'pending':
        return 'building';
      case 'success':
        return 'ready';
      case 'failed':
        return 'error';
      case 'rolled-back':
        return 'cancelled';
    }
  }

  /**
   * Check if state directory is initialized
   *
   * @returns Result indicating if initialized
   */
  async isInitialized(): Promise<Result<boolean, StateManagerError>> {
    try {
      await fs.access(this.stateDir);
      return { success: true, data: true };
    } catch {
      return { success: true, data: false };
    }
  }

  /**
   * Get state directory path
   *
   * @returns Absolute path to .aios directory
   */
  getStateDir(): string {
    return this.stateDir;
  }
}

/**
 * Generate a unique deployment ID
 *
 * Format: dep-{timestamp}-{random}
 * Example: dep-1704067200000-a1b2c3d4e
 *
 * @returns Branded DeploymentId
 *
 * @example
 * ```typescript
 * const id = generateDeploymentId();
 * await stateManager.recordDeployment({ id, ... });
 * ```
 */
export function generateDeploymentId(): DeploymentId {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `dep-${timestamp}-${random}` as DeploymentId;
}

/**
 * Generate a unique session ID
 *
 * Format: session-{timestamp}-{random}
 *
 * @returns Branded SessionId
 */
export function generateSessionId(): SessionId {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `session-${timestamp}-${random}` as SessionId;
}

/**
 * Validate deployment record
 *
 * @param record - Record to validate
 * @returns Result indicating if valid
 *
 * @example
 * ```typescript
 * const result = validateDeploymentRecord(record);
 * if (!result.success) {
 *   console.error('Invalid record:', result.error.message);
 * }
 * ```
 */
export function validateDeploymentRecord(
  record: Partial<EnhancedDeploymentRecord>
): Result<EnhancedDeploymentRecord, StateManagerError> {
  const errors: string[] = [];

  if (!record.id) errors.push('id is required');
  if (!record.timestamp) errors.push('timestamp is required');
  if (!record.service) errors.push('service is required');
  if (!record.environment) errors.push('environment is required');
  if (!record.command) errors.push('command is required');
  if (!record.status) errors.push('status is required');

  if (errors.length > 0) {
    return {
      success: false,
      error: new StateManagerError(
        `Invalid deployment record: ${errors.join(', ')}`,
        'INVALID_DATA'
      )
    };
  }

  return {
    success: true,
    data: record as EnhancedDeploymentRecord
  };
}
