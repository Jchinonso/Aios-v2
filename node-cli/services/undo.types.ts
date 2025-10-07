/**
 * @fileoverview Type Definitions for Natural Language Undo System
 * @module node-cli/services/undo.types
 *
 * Production-grade type system for undo/rollback functionality with:
 * - Branded types for ID safety
 * - Discriminated unions for action types
 * - Strict type checking
 * - Comprehensive error types
 *
 * @example
 * ```typescript
 * const action: DeploymentUndoableAction = {
 *   id: createUndoActionId(),
 *   type: UndoableActionType.DEPLOY,
 *   timestamp: createISOTimestamp(),
 *   // ...
 * };
 * ```
 */

/**
 * Branded type for undo action ID
 * Prevents accidental string misuse and provides type safety
 */
export type UndoActionId = string & { readonly __brand: 'UndoActionId' };

/**
 * Create validated undo action ID with timestamp and cryptographically random suffix
 * Format: undo-{timestamp}-{random}
 *
 * Uses crypto.randomBytes for true randomness (not Math.random).
 * 16 bytes of randomness = 32 hex characters = 2^128 possible values.
 * Collision probability: ~1 in 10^38 even with billions of IDs.
 *
 * @returns Type-safe undo action ID
 *
 * @example
 * ```typescript
 * const id = createUndoActionId();
 * // "undo-1696680600000-a1b2c3d4e5f67890abcdef1234567890"
 * ```
 */
export function createUndoActionId(): UndoActionId {
  // Node.js crypto is available in node-cli context
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('node:crypto') as typeof import('node:crypto');

  const timestamp = Date.now();
  // 16 bytes of crypto-random data = 32 hex chars (extremely low collision probability)
  const random = crypto.randomBytes(16).toString('hex');
  return `undo-${timestamp}-${random}` as UndoActionId;
}

/**
 * Branded type for ISO 8601 timestamp
 * Ensures consistent timestamp format across the system
 */
export type ISOTimestamp = string & { readonly __brand: 'ISOTimestamp' };

/**
 * Create validated ISO timestamp
 *
 * @param date - Date to convert (defaults to now)
 * @returns Type-safe ISO timestamp
 *
 * @example
 * ```typescript
 * const ts = createISOTimestamp();
 * // "2025-10-07T10:30:00.000Z"
 * ```
 */
export function createISOTimestamp(date: Date = new Date()): ISOTimestamp {
  return date.toISOString() as ISOTimestamp;
}

/**
 * All undoable action types in AIOS
 *
 * Extensible enum for different operation types that can be undone
 */
export enum UndoableActionType {
  /** Deployment to cloud provider */
  DEPLOY = 'deploy',

  /** Scaling replicas or instance size */
  SCALE = 'scale',

  /** Setting environment variables */
  SET_ENV = 'set-env',

  /** Rolling back a previous undo (redo) */
  ROLLBACK = 'rollback',

  /** Configuration changes */
  CONFIG_CHANGE = 'config-change',
}

/**
 * Environment type for deployments
 */
export type EnvironmentType = 'development' | 'staging' | 'production';

/**
 * Cloud provider type
 */
export type CloudProviderType = 'vercel' | 'netlify' | 'aws' | 'railway' | 'render';

/**
 * Base interface for all undoable actions
 * Uses discriminated union pattern for type-safe exhaustive checking
 *
 * All action types must extend this base
 */
interface BaseUndoableAction {
  /** Unique identifier for this action */
  readonly id: UndoActionId;

  /** Type discriminator for union type */
  readonly type: UndoableActionType;

  /** When the action was performed */
  readonly timestamp: ISOTimestamp;

  /** Session ID from conversation tracking */
  readonly sessionId: string;

  /** Human-readable description for display */
  readonly description: string;

  /** Target environment (affects confirmation requirements) */
  readonly environment: EnvironmentType;

  /** Whether this action can be undone (some may be irreversible) */
  readonly canUndo: boolean;

  /** If this action has already been undone */
  readonly undoneAt?: ISOTimestamp;
}

/**
 * Deployment action that can be undone
 *
 * Stores before/after state to enable rollback to previous deployment
 *
 * @example
 * ```typescript
 * const action: DeploymentUndoableAction = {
 *   type: UndoableActionType.DEPLOY,
 *   beforeState: { version: 'v1.0.0', deploymentId: 'old-id' },
 *   afterState: { version: 'v1.0.1', deploymentId: 'new-id', url: '...' },
 *   provider: 'vercel',
 *   projectName: 'api-server',
 *   // ... base fields
 * };
 * ```
 */
export interface DeploymentUndoableAction extends BaseUndoableAction {
  readonly type: UndoableActionType.DEPLOY;

  /** State before deployment (for rollback) */
  readonly beforeState: {
    readonly version?: string;
    readonly deploymentId?: string;
    readonly url?: string;
    readonly gitCommit?: string;
  };

  /** State after deployment (current state) */
  readonly afterState: {
    readonly version: string;
    readonly deploymentId: string;
    readonly url: string;
    readonly gitCommit?: string;
  };

  /** Cloud provider used for deployment */
  readonly provider: CloudProviderType;

  /** Project/service name */
  readonly projectName: string;
}

/**
 * Scaling action that can be undone
 *
 * Stores replica count and instance type changes
 *
 * @example
 * ```typescript
 * const action: ScalingUndoableAction = {
 *   type: UndoableActionType.SCALE,
 *   beforeState: { replicas: 2, instanceType: 't2.micro' },
 *   afterState: { replicas: 5, instanceType: 't2.small' },
 *   provider: 'aws',
 *   serviceName: 'api-server',
 *   // ... base fields
 * };
 * ```
 */
export interface ScalingUndoableAction extends BaseUndoableAction {
  readonly type: UndoableActionType.SCALE;

  /** State before scaling */
  readonly beforeState: {
    readonly replicas: number;
    readonly instanceType?: string;
    readonly memory?: string;
    readonly cpu?: string;
  };

  /** State after scaling */
  readonly afterState: {
    readonly replicas: number;
    readonly instanceType?: string;
    readonly memory?: string;
    readonly cpu?: string;
  };

  /** Cloud provider */
  readonly provider: CloudProviderType;

  /** Service/deployment name */
  readonly serviceName: string;
}

/**
 * Environment variable action that can be undone
 *
 * Stores complete before/after variable sets
 *
 * @example
 * ```typescript
 * const action: EnvVarUndoableAction = {
 *   type: UndoableActionType.SET_ENV,
 *   beforeState: {
 *     variables: new Map([['API_KEY', 'old-value']])
 *   },
 *   afterState: {
 *     variables: new Map([['API_KEY', 'new-value'], ['DEBUG', 'true']])
 *   },
 *   provider: 'vercel',
 *   projectName: 'api-server',
 *   // ... base fields
 * };
 * ```
 */
export interface EnvVarUndoableAction extends BaseUndoableAction {
  readonly type: UndoableActionType.SET_ENV;

  /** Environment variables before change */
  readonly beforeState: {
    readonly variables: ReadonlyMap<string, string>;
  };

  /** Environment variables after change */
  readonly afterState: {
    readonly variables: ReadonlyMap<string, string>;
  };

  /** Cloud provider */
  readonly provider: CloudProviderType;

  /** Project name */
  readonly projectName: string;
}

/**
 * Union type for all undoable actions
 *
 * Enables exhaustive type checking with switch statements.
 * TypeScript will error if a case is missing.
 *
 * @example
 * ```typescript
 * function handleAction(action: UndoableAction) {
 *   switch (action.type) {
 *     case UndoableActionType.DEPLOY:
 *       // TypeScript knows action is DeploymentUndoableAction
 *       console.log(action.provider);
 *       break;
 *     case UndoableActionType.SCALE:
 *       // TypeScript knows action is ScalingUndoableAction
 *       console.log(action.serviceName);
 *       break;
 *     // ... other cases
 *   }
 * }
 * ```
 */
export type UndoableAction =
  | DeploymentUndoableAction
  | ScalingUndoableAction
  | EnvVarUndoableAction;

/**
 * Query types for finding undoable actions
 */
export enum UndoQueryType {
  /** Find the last action ("undo", "undo last") */
  LAST = 'last',

  /** Find last action of specific type ("undo deployment") */
  LAST_OF_TYPE = 'last-of-type',

  /** Find action by time ("undo 5 minutes ago") */
  BY_TIME = 'by-time',

  /** Find action by ID (internal use) */
  BY_ID = 'by-id',

  /** Show all actions ("what can I undo?") */
  ALL = 'all',
}

/**
 * Query for finding undoable actions
 *
 * @example
 * ```typescript
 * // Last action
 * const query: UndoQuery = { type: UndoQueryType.LAST };
 *
 * // Last deployment
 * const query: UndoQuery = {
 *   type: UndoQueryType.LAST_OF_TYPE,
 *   actionType: UndoableActionType.DEPLOY
 * };
 *
 * // Actions from last 5 minutes
 * const query: UndoQuery = {
 *   type: UndoQueryType.BY_TIME,
 *   timeAgo: 5 * 60 * 1000
 * };
 * ```
 */
export interface UndoQuery {
  /** Type of query to perform */
  readonly type: UndoQueryType;

  /** Filter by action type (for LAST_OF_TYPE queries) */
  readonly actionType?: UndoableActionType;

  /** Time window in milliseconds (for BY_TIME queries) */
  readonly timeAgo?: number;

  /** Specific action ID (for BY_ID queries) */
  readonly actionId?: UndoActionId;

  /** Maximum number of results to return */
  readonly maxResults?: number;

  /** Include already undone actions in results */
  readonly includeUndone?: boolean;

  /** Filter by environment */
  readonly environment?: EnvironmentType;
}

/**
 * Result of an undo query
 *
 * @example
 * ```typescript
 * const result: UndoQueryResult = {
 *   actions: [deployAction, scaleAction],
 *   totalCount: 15,
 *   hasMore: true
 * };
 * ```
 */
export interface UndoQueryResult {
  /** Matching actions */
  readonly actions: readonly UndoableAction[];

  /** Total number of matching actions (may be > actions.length) */
  readonly totalCount: number;

  /** Whether there are more results beyond maxResults */
  readonly hasMore: boolean;
}

/**
 * Result of an undo operation
 *
 * Uses Railway-Oriented Programming pattern with success/error discrimination
 *
 * @example
 * ```typescript
 * const result: UndoResult = {
 *   success: true,
 *   actionId: 'undo-123-abc',
 *   actionType: UndoableActionType.DEPLOY,
 *   description: 'Rolled back to v1.0.0',
 *   rollbackDetails: {
 *     previousVersion: 'v1.0.1',
 *     currentVersion: 'v1.0.0',
 *     rollbackTime: createISOTimestamp()
 *   }
 * };
 * ```
 */
export interface UndoResult {
  /** Whether undo succeeded */
  readonly success: boolean;

  /** ID of undone action */
  readonly actionId: UndoActionId;

  /** Type of action that was undone */
  readonly actionType: UndoableActionType;

  /** Human-readable description of what was undone */
  readonly description: string;

  /** Detailed rollback information (if successful) */
  readonly rollbackDetails?: {
    readonly previousVersion?: string;
    readonly currentVersion?: string;
    readonly rollbackTime: ISOTimestamp;
    readonly restoredState?: Record<string, unknown>;
  };

  /** Error information (if failed) */
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly recoverable: boolean;
    readonly details?: Record<string, unknown>;
  };
}

/**
 * Error codes for undo operations
 *
 * Comprehensive error taxonomy for debugging and user feedback
 */
export enum UndoErrorCode {
  // Stack errors
  /** Undo stack not initialized */
  STACK_NOT_INITIALIZED = 'STACK_NOT_INITIALIZED',

  /** No actions available to undo */
  STACK_EMPTY = 'STACK_EMPTY',

  /** Undo stack data is corrupted */
  STACK_CORRUPT = 'STACK_CORRUPT',

  /** Failed to save undo stack to disk */
  PERSISTENCE_FAILED = 'PERSISTENCE_FAILED',

  // Action errors
  /** Requested action not found in stack */
  ACTION_NOT_FOUND = 'ACTION_NOT_FOUND',

  /** Action has already been undone */
  ACTION_ALREADY_UNDONE = 'ACTION_ALREADY_UNDONE',

  /** Action is marked as not undoable */
  ACTION_NOT_UNDOABLE = 'ACTION_NOT_UNDOABLE',

  /** Action is too old to undo safely */
  ACTION_TOO_OLD = 'ACTION_TOO_OLD',

  // Execution errors
  /** Undo execution failed */
  UNDO_FAILED = 'UNDO_FAILED',

  /** Provider doesn't support rollback for this action type */
  ROLLBACK_NOT_SUPPORTED = 'ROLLBACK_NOT_SUPPORTED',

  /** Cloud provider API error */
  PROVIDER_ERROR = 'PROVIDER_ERROR',

  /** Network connectivity error */
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Confirmation errors
  /** User cancelled the undo operation */
  USER_CANCELLED = 'USER_CANCELLED',

  /** Confirmation prompt timed out */
  CONFIRMATION_TIMEOUT = 'CONFIRMATION_TIMEOUT',

  // Validation errors
  /** Invalid action data */
  INVALID_ACTION = 'INVALID_ACTION',

  /** Missing required state information */
  MISSING_STATE = 'MISSING_STATE',
}

/**
 * Custom error class for undo operations
 *
 * Provides structured error information with recovery hints
 *
 * @example
 * ```typescript
 * throw new UndoError(
 *   UndoErrorCode.ACTION_ALREADY_UNDONE,
 *   'This deployment has already been rolled back',
 *   false,  // not recoverable
 *   actionId
 * );
 * ```
 */
export class UndoError extends Error {
  constructor(
    public readonly code: UndoErrorCode,
    message: string,
    public readonly recoverable: boolean = false,
    public readonly actionId?: UndoActionId,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'UndoError';
    Error.captureStackTrace(this, UndoError);
  }

  /**
   * Convert to Result-compatible error object
   */
  toErrorResult(): NonNullable<UndoResult['error']> {
    return {
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      details: this.details,
    };
  }
}

/**
 * Configuration for undo stack
 */
export interface UndoStackConfig {
  /** Maximum number of actions to keep in stack */
  readonly maxSize: number;

  /** File path for persistence */
  readonly persistPath: string;

  /** Automatically save after each operation */
  readonly autoSave: boolean;

  /** Enable compression for disk storage */
  readonly compressionEnabled: boolean;

  /** File permissions (octal) */
  readonly filePermissions: number;
}

/**
 * Default configuration for undo stack
 */
export const DEFAULT_UNDO_STACK_CONFIG: UndoStackConfig = {
  maxSize: 20,
  persistPath: '', // Set by implementation
  autoSave: true,
  compressionEnabled: false,
  filePermissions: 0o600, // User read/write only
} as const;

/**
 * Metrics for undo stack operations
 */
export interface UndoStackMetrics {
  /** Total number of actions in stack */
  readonly totalActions: number;

  /** Number of actions that have been undone */
  readonly undoneActions: number;

  /** Number of actions that can still be undone */
  readonly undoableActions: number;

  /** Average age of actions in milliseconds */
  readonly averageActionAge: number;

  /** Age of oldest action in milliseconds */
  readonly oldestActionAge: number;

  /** Age of newest action in milliseconds */
  readonly newestActionAge: number;

  /** Size of persisted file in bytes */
  readonly sizeOnDisk: number;

  /** Stack utilization (totalActions / maxSize) */
  readonly utilizationPercent: number;

  /** When metrics were last calculated */
  readonly lastUpdated: ISOTimestamp;
}

/**
 * Type guard: Check if action is a deployment action
 */
export function isDeploymentAction(action: UndoableAction): action is DeploymentUndoableAction {
  return action.type === UndoableActionType.DEPLOY;
}

/**
 * Type guard: Check if action is a scaling action
 */
export function isScalingAction(action: UndoableAction): action is ScalingUndoableAction {
  return action.type === UndoableActionType.SCALE;
}

/**
 * Type guard: Check if action is an env var action
 */
export function isEnvVarAction(action: UndoableAction): action is EnvVarUndoableAction {
  return action.type === UndoableActionType.SET_ENV;
}

/**
 * Validation: Check if action can be undone
 */
export function canUndoAction(action: UndoableAction): boolean {
  return action.canUndo && !action.undoneAt;
}

/**
 * Validation: Check if action is too old to undo safely
 */
export function isActionTooOld(action: UndoableAction, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  const ageMs = Date.now() - new Date(action.timestamp).getTime();
  return ageMs > maxAgeMs;
}
