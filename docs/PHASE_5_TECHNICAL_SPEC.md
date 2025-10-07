# Phase 5: Natural Language Undo - Technical Specification

**Version**: 1.0
**Status**: 🔨 **IN DEVELOPMENT**
**Author**: GOD MODE with Principal Engineer Rigor

---

## Executive Summary

Design and implement a production-grade undo system for AIOS that allows users to rollback deployments and other operations using natural language commands. The system must be type-safe, persistent, and handle edge cases gracefully.

### Key Requirements

1. **Type Safety**: Strict TypeScript with branded types and discriminated unions
2. **Persistence**: Survive CLI restarts, atomic writes, corruption resistance
3. **Performance**: O(1) lookup, LRU eviction, <10ms response time
4. **Natural Language**: Parse "undo", "undo last", "undo 5 minutes ago"
5. **Safety**: Production confirmations, validation, rollback testing
6. **Observability**: Comprehensive logging, metrics, error tracking

---

## Architecture Overview

```
User Input ("undo last deployment")
    ↓
NaturalLanguageUndoParser
    ↓ (parses to UndoQuery)
UndoHandler
    ↓ (queries)
DeploymentUndoStack
    ↓ (finds UndoableAction)
    ↓ (confirms if production)
executeUndo()
    ↓ (calls action-specific undo function)
CloudManager.rollback() / ScaleManager.revert()
    ↓
Success/Failure Result
```

---

## Component 1: Type System

### Core Types

```typescript
/**
 * Branded type for undo action ID
 * Ensures type safety and prevents string confusion
 */
export type UndoActionId = string & { readonly __brand: 'UndoActionId' };

/**
 * Create validated undo action ID
 */
export function createUndoActionId(): UndoActionId {
  return `undo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as UndoActionId;
}

/**
 * Timestamp in ISO 8601 format
 */
export type ISOTimestamp = string & { readonly __brand: 'ISOTimestamp' };

/**
 * Create validated ISO timestamp
 */
export function createISOTimestamp(date: Date = new Date()): ISOTimestamp {
  return date.toISOString() as ISOTimestamp;
}

/**
 * All undoable action types in AIOS
 */
export enum UndoableActionType {
  DEPLOY = 'deploy',
  SCALE = 'scale',
  SET_ENV = 'set-env',
  ROLLBACK = 'rollback',  // Undo of undo
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
```

### Undoable Action Types (Discriminated Unions)

```typescript
/**
 * Base interface for all undoable actions
 * Uses discriminated union pattern for type safety
 */
interface BaseUndoableAction {
  readonly id: UndoActionId;
  readonly type: UndoableActionType;
  readonly timestamp: ISOTimestamp;
  readonly sessionId: string;
  readonly description: string;  // Human-readable description
  readonly environment: EnvironmentType;
  readonly canUndo: boolean;  // Some actions may not be undoable
  readonly undoneAt?: ISOTimestamp;  // If already undone
}

/**
 * Deployment action that can be undone
 */
export interface DeploymentUndoableAction extends BaseUndoableAction {
  readonly type: UndoableActionType.DEPLOY;
  readonly beforeState: {
    readonly version?: string;
    readonly deploymentId?: string;
    readonly url?: string;
  };
  readonly afterState: {
    readonly version: string;
    readonly deploymentId: string;
    readonly url: string;
  };
  readonly provider: CloudProviderType;
  readonly projectName: string;
}

/**
 * Scaling action that can be undone
 */
export interface ScalingUndoableAction extends BaseUndoableAction {
  readonly type: UndoableActionType.SCALE;
  readonly beforeState: {
    readonly replicas: number;
    readonly instanceType?: string;
  };
  readonly afterState: {
    readonly replicas: number;
    readonly instanceType?: string;
  };
  readonly provider: CloudProviderType;
  readonly serviceName: string;
}

/**
 * Environment variable action that can be undone
 */
export interface EnvVarUndoableAction extends BaseUndoableAction {
  readonly type: UndoableActionType.SET_ENV;
  readonly beforeState: {
    readonly variables: ReadonlyMap<string, string>;
  };
  readonly afterState: {
    readonly variables: ReadonlyMap<string, string>;
  };
  readonly provider: CloudProviderType;
  readonly projectName: string;
}

/**
 * Union type for all undoable actions
 * Enables exhaustive type checking with switch statements
 */
export type UndoableAction =
  | DeploymentUndoableAction
  | ScalingUndoableAction
  | EnvVarUndoableAction;
```

### Undo Query Types

```typescript
/**
 * Query types for finding undoable actions
 */
export enum UndoQueryType {
  LAST = 'last',                    // "undo last"
  LAST_OF_TYPE = 'last-of-type',   // "undo last deployment"
  BY_TIME = 'by-time',              // "undo 5 minutes ago"
  BY_ID = 'by-id',                  // Internal use
  ALL = 'all',                      // "what can I undo?"
}

/**
 * Query for finding undoable actions
 */
export interface UndoQuery {
  readonly type: UndoQueryType;
  readonly actionType?: UndoableActionType;
  readonly timeAgo?: number;  // milliseconds
  readonly maxResults?: number;
  readonly includeUndone?: boolean;  // Include already undone actions
}

/**
 * Result of an undo query
 */
export interface UndoQueryResult {
  readonly actions: readonly UndoableAction[];
  readonly totalCount: number;
  readonly hasMore: boolean;
}
```

### Undo Result Types

```typescript
/**
 * Result of an undo operation
 */
export interface UndoResult {
  readonly success: boolean;
  readonly actionId: UndoActionId;
  readonly actionType: UndoableActionType;
  readonly description: string;
  readonly rollbackDetails?: {
    readonly previousVersion?: string;
    readonly currentVersion?: string;
    readonly rollbackTime: ISOTimestamp;
  };
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly recoverable: boolean;
  };
}
```

---

## Component 2: DeploymentUndoStack

### Class Design

```typescript
/**
 * Configuration for DeploymentUndoStack
 */
export interface UndoStackConfig {
  readonly maxSize: number;          // Default: 20
  readonly persistPath: string;      // Default: ~/.aios/undo-stack.json
  readonly autoSave: boolean;        // Default: true
  readonly compressionEnabled: boolean;  // Default: false
}

/**
 * Metrics for undo stack operations
 */
export interface UndoStackMetrics {
  readonly totalActions: number;
  readonly undoneActions: number;
  readonly averageActionAge: number;  // milliseconds
  readonly oldestActionAge: number;
  readonly newestActionAge: number;
  readonly sizeOnDisk: number;  // bytes
}

/**
 * Production-grade undo stack with LRU eviction and persistence
 *
 * Features:
 * - O(1) push, pop, and lookup by ID
 * - LRU eviction when maxSize exceeded
 * - Atomic disk persistence
 * - Corruption recovery
 * - Type-safe discriminated unions
 * - Comprehensive metrics
 *
 * @example
 * ```typescript
 * const stack = new DeploymentUndoStack(logger, {
 *   maxSize: 20,
 *   persistPath: path.join(os.homedir(), '.aios', 'undo-stack.json'),
 *   autoSave: true,
 * });
 *
 * await stack.initialize();
 *
 * // Record deployment
 * await stack.push({
 *   type: UndoableActionType.DEPLOY,
 *   beforeState: { version: 'v1.0.0' },
 *   afterState: { version: 'v1.0.1', deploymentId: '...' },
 *   // ...
 * });
 *
 * // Undo last action
 * const result = await stack.undoLast();
 * ```
 */
export class DeploymentUndoStack {
  private readonly config: Readonly<UndoStackConfig>;
  private readonly logger: ILogger;
  private readonly actions: Map<UndoActionId, UndoableAction>;
  private readonly actionOrder: UndoActionId[];  // For LRU
  private isInitialized: boolean = false;
  private saveInProgress: boolean = false;

  constructor(logger: ILogger, config?: Partial<UndoStackConfig>);

  /**
   * Initialize stack - load from disk if exists
   */
  async initialize(): Promise<void>;

  /**
   * Push new undoable action to stack
   * Triggers LRU eviction if maxSize exceeded
   */
  async push(action: Omit<UndoableAction, 'id' | 'timestamp' | 'canUndo'>): Promise<UndoActionId>;

  /**
   * Query actions based on criteria
   */
  query(query: UndoQuery): UndoQueryResult;

  /**
   * Undo specific action by ID
   */
  async undo(actionId: UndoActionId): Promise<UndoResult>;

  /**
   * Undo last action
   */
  async undoLast(): Promise<UndoResult>;

  /**
   * Get all undoable actions (for display)
   */
  getAll(): readonly UndoableAction[];

  /**
   * Get metrics
   */
  getMetrics(): UndoStackMetrics;

  /**
   * Persist to disk
   */
  async save(): Promise<void>;

  /**
   * Load from disk
   */
  private async load(): Promise<void>;

  /**
   * Evict oldest action (LRU)
   */
  private evictOldest(): void;

  /**
   * Mark action as undone
   */
  private markAsUndone(actionId: UndoActionId): void;

  /**
   * Execute undo function for specific action type
   */
  private async executeUndo(action: UndoableAction): Promise<UndoResult>;
}
```

### Key Design Decisions

1. **LRU Eviction**: Use array to maintain insertion order, evict from front
2. **Atomic Persistence**: Write to temp file, then atomic rename
3. **Corruption Recovery**: Validate JSON on load, fallback to empty stack
4. **Type Safety**: Discriminated unions ensure exhaustive handling
5. **Metrics**: Track usage patterns for monitoring

---

## Component 3: NaturalLanguageUndoParser

### Parser Design

```typescript
/**
 * Natural language patterns for undo commands
 */
export interface UndoPattern {
  readonly pattern: RegExp;
  readonly type: UndoQueryType;
  readonly extractor: (match: RegExpMatchArray) => Partial<UndoQuery>;
}

/**
 * Natural language parser for undo commands
 *
 * Handles:
 * - "undo" → last action
 * - "undo last" → last action
 * - "undo deployment" → last deployment
 * - "undo what I did 5 minutes ago" → time-based
 * - "what can I undo?" → show all
 *
 * @example
 * ```typescript
 * const parser = new NaturalLanguageUndoParser(logger);
 *
 * const query = parser.parse("undo last deployment");
 * // { type: 'last-of-type', actionType: 'deploy' }
 *
 * const query2 = parser.parse("undo 5 minutes ago");
 * // { type: 'by-time', timeAgo: 300000 }
 * ```
 */
export class NaturalLanguageUndoParser {
  private readonly logger: ILogger;
  private readonly patterns: readonly UndoPattern[];

  constructor(logger: ILogger);

  /**
   * Parse natural language undo command
   */
  parse(input: string): UndoQuery | null;

  /**
   * Get suggestions for ambiguous input
   */
  getSuggestions(input: string): readonly string[];

  /**
   * Check if input is undo-related
   */
  isUndoCommand(input: string): boolean;
}
```

### Supported Patterns

| Input | Query Type | Extraction |
|-------|------------|------------|
| "undo" | LAST | {} |
| "undo last" | LAST | {} |
| "undo deployment" | LAST_OF_TYPE | { actionType: 'deploy' } |
| "undo scaling" | LAST_OF_TYPE | { actionType: 'scale' } |
| "undo 5 minutes ago" | BY_TIME | { timeAgo: 300000 } |
| "undo 1 hour ago" | BY_TIME | { timeAgo: 3600000 } |
| "what can I undo?" | ALL | { maxResults: 10 } |
| "show undo history" | ALL | { maxResults: 20 } |

---

## Component 4: UndoHandler

### Handler Design

```typescript
/**
 * CLI handler for undo operations
 *
 * Responsibilities:
 * - Parse user input
 * - Query undo stack
 * - Show confirmation for production
 * - Execute undo
 * - Display results
 *
 * @example
 * ```typescript
 * const handler = new UndoHandler(
 *   undoStack,
 *   parser,
 *   cloudManager,
 *   logger
 * );
 *
 * await handler.handle("undo last deployment");
 * ```
 */
export class UndoHandler {
  constructor(
    private readonly undoStack: DeploymentUndoStack,
    private readonly parser: NaturalLanguageUndoParser,
    private readonly cloudManager: CloudManager,
    private readonly logger: ILogger
  );

  /**
   * Handle undo command
   */
  async handle(input: string): Promise<boolean>;

  /**
   * Show undo history
   */
  async showHistory(maxResults?: number): Promise<void>;

  /**
   * Confirm production undo
   */
  private async confirmProductionUndo(action: UndoableAction): Promise<boolean>;

  /**
   * Format action for display
   */
  private formatAction(action: UndoableAction): string;
}
```

---

## Error Handling

### Error Codes

```typescript
export enum UndoErrorCode {
  // Stack errors
  STACK_NOT_INITIALIZED = 'STACK_NOT_INITIALIZED',
  STACK_EMPTY = 'STACK_EMPTY',
  STACK_CORRUPT = 'STACK_CORRUPT',
  PERSISTENCE_FAILED = 'PERSISTENCE_FAILED',

  // Action errors
  ACTION_NOT_FOUND = 'ACTION_NOT_FOUND',
  ACTION_ALREADY_UNDONE = 'ACTION_ALREADY_UNDONE',
  ACTION_NOT_UNDOABLE = 'ACTION_NOT_UNDOABLE',
  ACTION_TOO_OLD = 'ACTION_TOO_OLD',

  // Execution errors
  UNDO_FAILED = 'UNDO_FAILED',
  ROLLBACK_NOT_SUPPORTED = 'ROLLBACK_NOT_SUPPORTED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Confirmation errors
  USER_CANCELLED = 'USER_CANCELLED',
  CONFIRMATION_TIMEOUT = 'CONFIRMATION_TIMEOUT',
}

/**
 * Custom error for undo operations
 */
export class UndoError extends Error {
  constructor(
    public readonly code: UndoErrorCode,
    message: string,
    public readonly recoverable: boolean = false,
    public readonly actionId?: UndoActionId
  ) {
    super(message);
    this.name = 'UndoError';
  }
}
```

---

## Persistence Format

### Disk Format (JSON)

```json
{
  "version": "1.0",
  "timestamp": "2025-10-07T10:30:00.000Z",
  "actions": [
    {
      "id": "undo-1696680600000-abc123",
      "type": "deploy",
      "timestamp": "2025-10-07T10:25:00.000Z",
      "sessionId": "session-xyz",
      "description": "Deployed api-server v2.1.3 to production",
      "environment": "production",
      "canUndo": true,
      "beforeState": {
        "version": "v2.1.2",
        "deploymentId": "old-deploy-id"
      },
      "afterState": {
        "version": "v2.1.3",
        "deploymentId": "new-deploy-id",
        "url": "https://api.example.com"
      },
      "provider": "vercel",
      "projectName": "api-server"
    }
  ]
}
```

### Atomic Write Strategy

```typescript
/**
 * Atomic file write with corruption prevention
 */
async function atomicWrite(filePath: string, data: string): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  const backupPath = `${filePath}.backup`;

  try {
    // 1. Write to temp file
    await fs.writeFile(tempPath, data, 'utf-8');

    // 2. Verify temp file is valid JSON
    const verification = await fs.readFile(tempPath, 'utf-8');
    JSON.parse(verification);  // Throws if invalid

    // 3. Backup existing file (if exists)
    if (await fileExists(filePath)) {
      await fs.copyFile(filePath, backupPath);
    }

    // 4. Atomic rename
    await fs.rename(tempPath, filePath);

    // 5. Remove backup on success
    if (await fileExists(backupPath)) {
      await fs.unlink(backupPath);
    }
  } catch (error) {
    // Cleanup temp file on error
    if (await fileExists(tempPath)) {
      await fs.unlink(tempPath);
    }
    throw error;
  }
}
```

---

## Integration Points

### 1. Deployment Flow Integration

```typescript
// In cloud-deploy-handler.ts or conversation-orchestrator-enhanced.ts

async executeDeployment(provider: CloudProviderType, analysis: ProjectAnalysis) {
  // Before deployment - capture current state
  const beforeState = await this.captureCurrentState(provider);

  // Execute deployment
  const result = await this.cloudManager.deploy(...);

  if (result.success) {
    // After deployment - record undoable action
    await this.undoStack.push({
      type: UndoableActionType.DEPLOY,
      sessionId: this.sessionId,
      description: `Deployed ${analysis.framework} app to ${provider}`,
      environment: this.getCurrentEnvironment(),
      beforeState,
      afterState: {
        version: result.version,
        deploymentId: result.deploymentId,
        url: result.url,
      },
      provider,
      projectName: analysis.name || 'unknown',
    });
  }
}
```

### 2. CLI Command Integration

```typescript
// In nl-session.ts or CLI entry point

if (parser.isUndoCommand(input)) {
  const handled = await undoHandler.handle(input);
  if (handled) {
    return;  // Command successfully handled
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('DeploymentUndoStack', () => {
  describe('LRU Eviction', () => {
    it('should evict oldest action when maxSize exceeded');
    it('should maintain order after eviction');
  });

  describe('Persistence', () => {
    it('should survive restart');
    it('should recover from corrupted file');
    it('should handle concurrent writes');
  });

  describe('Type Safety', () => {
    it('should enforce discriminated unions');
    it('should validate action structure');
  });
});

describe('NaturalLanguageUndoParser', () => {
  it('should parse "undo" as LAST query');
  it('should parse "undo deployment" as LAST_OF_TYPE');
  it('should parse "undo 5 minutes ago" with correct timeAgo');
  it('should handle ambiguous input');
});

describe('UndoHandler', () => {
  it('should require confirmation for production undo');
  it('should display action details before undo');
  it('should handle user cancellation');
});
```

### Integration Tests

```typescript
describe('Undo System Integration', () => {
  it('should undo deployment and restore previous version');
  it('should persist undo history across restarts');
  it('should handle rapid undo/redo cycles');
  it('should prevent undo of already undone actions');
});
```

---

## Performance Requirements

| Operation | Target | Acceptable | Unacceptable |
|-----------|--------|------------|--------------|
| Push action | <5ms | <10ms | >20ms |
| Query action | <5ms | <10ms | >20ms |
| Undo last | <500ms | <1s | >2s |
| Load from disk | <50ms | <100ms | >200ms |
| Save to disk | <50ms | <100ms | >200ms |

---

## Security Considerations

1. **File Permissions**: Undo stack file should be user-readable only (0600)
2. **Input Validation**: Sanitize all user inputs before parsing
3. **Action Validation**: Verify action ownership before undo
4. **Secrets**: Never store secrets in undo state
5. **Production Safety**: Always require confirmation for production

---

## Monitoring & Metrics

```typescript
export interface UndoMetrics {
  // Usage metrics
  readonly totalUndos: number;
  readonly successfulUndos: number;
  readonly failedUndos: number;
  readonly undoRate: number;  // undos per deployment

  // Performance metrics
  readonly averageUndoTime: number;  // milliseconds
  readonly p95UndoTime: number;
  readonly p99UndoTime: number;

  // Stack metrics
  readonly stackSize: number;
  readonly stackUtilization: number;  // size / maxSize
  readonly oldestActionAge: number;  // milliseconds

  // Error metrics
  readonly errorRate: number;
  readonly commonErrors: ReadonlyMap<UndoErrorCode, number>;
}
```

---

## Success Criteria

| Metric | Target | Measured |
|--------|--------|----------|
| Undo usage rate | 15% | TBD |
| Undo success rate | 95% | TBD |
| Average undo time | <1s | TBD |
| Test coverage | >95% | TBD |
| TypeScript errors | 0 | TBD |

---

## Implementation Plan

### Day 1-2: Core Type System & Stack
- Define all types and interfaces
- Implement DeploymentUndoStack
- Write unit tests
- Test persistence and LRU

### Day 3-4: Parser & Handler
- Implement NaturalLanguageUndoParser
- Implement UndoHandler
- Write integration tests
- Test end-to-end flow

### Day 5-6: Integration & Testing
- Integrate with deployment flow
- Add CLI commands
- Comprehensive testing
- Performance validation

### Day 7: Documentation & Polish
- Write user documentation
- Add examples
- Code review
- Production readiness check

---

## References

- Phase 1: Conversation Memory (session tracking)
- Phase 3: Action Reasoning (decision recording)
- Phase 4: Risk Analysis (production safety)
- Railway-Oriented Programming (Result types)
- Discriminated Unions (TypeScript patterns)

---

**Specification Version**: 1.0
**Status**: Ready for Implementation
**Approval**: Proceeding with GOD MODE
