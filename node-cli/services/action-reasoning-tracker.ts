/**
 * @fileoverview Action Reasoning Tracker - Phase 3
 * @description Tracks all AI decisions with complete reasoning, alternatives, and risks
 * @module node-cli/services/action-reasoning-tracker
 *
 * Purpose:
 * - Record every decision with full context
 * - Store alternatives considered
 * - Enable "explain" functionality
 * - Support alternative selection
 * - Persist to disk for analysis
 *
 * Design:
 * - In-memory LRU cache (last 100 actions)
 * - Disk persistence (~/.aios/reasoning/)
 * - Thread-safe with atomic writes
 * - Type-safe with strict TypeScript
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Mutex } from 'async-mutex';
import type { ILogger } from '@aios/shared';
import { ErrorMessages } from './error-messages.js';
import type {
  ActionRecord,
  ActionReasoning,
  ExplainRequest,
  ExplainResponse,
  AlternativeSuggestion,
  AlternativesCollection,
  TrackedActionType,
} from './action-reasoning.types.js';
import { formatFactorWeight } from './action-reasoning.types.js';

/**
 * Configuration for ActionReasoningTracker
 */
export interface ActionReasoningConfig {
  readonly maxMemoryRecords: number; // Default: 100
  readonly persistToDisk: boolean; // Default: true
  readonly reasoningDir: string; // Default: ~/.aios/reasoning
  readonly enableMetrics: boolean; // Default: true
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ActionReasoningConfig = {
  maxMemoryRecords: 100,
  persistToDisk: true,
  reasoningDir: path.join(os.homedir(), '.aios', 'reasoning'),
  enableMetrics: true,
} as const;

/**
 * Metrics for reasoning tracker
 */
interface ReasoningMetrics {
  totalActionsTracked: number;
  totalExplainRequests: number;
  totalAlternativeSelections: number;
  actionTypeBreakdown: Record<TrackedActionType, number>;
}

/**
 * ActionReasoningTracker - Production-grade decision tracking
 *
 * Responsibilities:
 * 1. Record all AI decisions with reasoning
 * 2. Store alternatives considered
 * 3. Track risks and mitigations
 * 4. Enable "explain" queries
 * 5. Persist to disk for analysis
 *
 * Thread Safety:
 * - All disk writes are atomic (write to temp, rename)
 * - In-memory operations are synchronous
 * - No concurrent modification issues
 *
 * @example
 * ```typescript
 * const tracker = new ActionReasoningTracker(logger);
 *
 * // Record a decision
 * const actionId = await tracker.recordAction({
 *   metadata: { timestamp, sessionId, turnNumber, userInput, intent },
 *   reasoning: {
 *     actionType: 'provider-selection',
 *     chosen: { provider: 'vercel', reason: 'Next.js detected' },
 *     alternatives: [
 *       { value: { provider: 'netlify' }, whyNotChosen: 'Slower builds', ... }
 *     ],
 *     factors: [{ type: 'positive', description: 'Optimized for Next.js', weight: 0.9 }],
 *     confidence: 'high'
 *   },
 *   risks: []
 * });
 *
 * // Later: Explain the decision
 * const explanation = await tracker.explain({
 *   type: 'specific',
 *   target: { actionId }
 * });
 * ```
 */
export class ActionReasoningTracker {
  private readonly config: ActionReasoningConfig;
  private readonly actionRecords: Map<string, ActionRecord>; // LRU cache
  private readonly actionOrder: string[]; // For LRU eviction
  private readonly metrics: ReasoningMetrics;
  private readonly mutex: Mutex = new Mutex(); // Concurrency protection

  constructor(
    private readonly logger: ILogger,
    config?: Partial<ActionReasoningConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.actionRecords = new Map();
    this.actionOrder = [];
    this.metrics = this.initializeMetrics(); // ✅ Proper initialization

    this.logger.debug('ActionReasoningTracker initialized', {
      config: this.config,
    });
  }

  /**
   * Record an action with full reasoning
   *
   * @param record - Action record without ID (will be generated)
   * @returns Action ID (UUID)
   * @throws {Error} If validation fails
   */
  public async recordAction(
    record: Omit<ActionRecord, 'id'>
  ): Promise<string> {
    return this.mutex.runExclusive(async () => {
      // ✅ Validate input before processing
      this.validateActionRecord(record);

      const actionId = randomUUID();
      const fullRecord: ActionRecord = {
        id: actionId,
        ...record,
      };

      // Add to in-memory cache (LRU)
      this.addToCache(actionId, fullRecord);

      // Update metrics
      this.updateMetrics(fullRecord);

      // Persist to disk (async, non-blocking)
      if (this.config.persistToDisk) {
        this.persistRecord(fullRecord).catch((error) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to persist action record ${actionId}: ${errorMsg}`);
        });
      }

      // ✅ Use info level for important events
      this.logger.info('Action recorded', {
        actionId,
        actionType: fullRecord.reasoning.actionType,
        sessionId: fullRecord.metadata.sessionId,
      });

      return actionId;
    });
  }

  /**
   * Explain a previous action
   *
   * @param request - Explanation request
   * @returns Formatted explanation response
   * @throws {Error} If action not found
   */
  public async explain(
    request: ExplainRequest
  ): Promise<ExplainResponse> {
    this.metrics.totalExplainRequests++;

    // Find the action to explain
    const actionId = request.target?.actionId ?? this.getLastActionId();
    if (!actionId) {
      throw new Error(ErrorMessages.reasoning.noActions());
    }

    const record = this.actionRecords.get(actionId);
    if (!record) {
      // Try loading from disk
      const loadedRecord = await this.loadRecordFromDisk(actionId);
      if (!loadedRecord) {
        throw new Error(ErrorMessages.reasoning.actionNotFound(actionId));
      }
      this.actionRecords.set(actionId, loadedRecord);
      return this.formatExplanation(loadedRecord, request);
    }

    return this.formatExplanation(record, request);
  }

  /**
   * Get alternatives for the last action (or specific action)
   *
   * @param actionId - Optional specific action ID (defaults to last action)
   * @returns Alternatives collection for user selection
   * @throws {Error} If action not found or has no alternatives
   */
  public async getAlternatives(
    actionId?: string
  ): Promise<AlternativesCollection> {
    const targetId = actionId ?? this.getLastActionId();
    if (!targetId) {
      throw new Error(ErrorMessages.reasoning.noActions());
    }

    let record = this.actionRecords.get(targetId);

    // ✅ Try loading from disk if not in memory (same as explain())
    if (!record) {
      const loadedRecord = await this.loadRecordFromDisk(targetId);
      if (!loadedRecord) {
        throw new Error(ErrorMessages.reasoning.actionNotFound(targetId));
      }
      this.actionRecords.set(targetId, loadedRecord);
      record = loadedRecord;
    }

    const reasoning = record.reasoning;

    // Build primary suggestion
    const primary: AlternativeSuggestion = {
      id: `${targetId}-primary`,
      label: this.formatChosenLabel(reasoning),
      description: reasoning.chosen.reason,
      pros: this.extractPros(reasoning),
      cons: [], // Chosen option has no cons in this context
      confidence: this.getNumericConfidence(reasoning.confidence),
      recommended: true,
      selectable: false, // Already chosen
    };

    // Build alternatives
    const alternatives: AlternativeSuggestion[] = reasoning.alternatives.map(
      (alt, index) => ({
        id: `${targetId}-alt-${index}`,
        label: alt.label,
        description: alt.whyNotChosen,
        pros: [...alt.pros],
        cons: [...alt.cons],
        confidence: alt.confidence,
        recommended: false,
        ...(alt.estimatedCost ? { estimatedCost: alt.estimatedCost } : {}),
        ...(alt.estimatedDuration ? { estimatedDuration: alt.estimatedDuration } : {}),
        selectable: true,
      })
    );

    return {
      primary,
      alternatives,
      reasoning: reasoning.chosen.reason,
      timestamp: record.metadata.timestamp,
    };
  }

  /**
   * Record user selection of an alternative
   *
   * @param actionId - Original action ID
   * @param alternativeIndex - Index of selected alternative
   */
  public async recordAlternativeSelection(
    actionId: string,
    alternativeIndex: number
  ): Promise<void> {
    this.metrics.totalAlternativeSelections++;

    const record = this.actionRecords.get(actionId);
    if (!record) {
      this.logger.warn('Alternative selection for unknown action', { alternativeActionId: actionId });
      return;
    }

    this.logger.info('User selected alternative', {
      actionId,
      alternativeIndex,
      alternative: record.reasoning.alternatives[alternativeIndex],
    });

    // Note: Actual execution of alternative is handled by the caller
    // This just tracks the selection for metrics/learning
  }

  /**
   * Get recent actions (for UI display)
   *
   * @param limit - Max number of actions to return
   * @returns Recent actions in reverse chronological order
   */
  public getRecentActions(limit = 10): readonly ActionRecord[] {
    const recentIds = this.actionOrder.slice(-limit).reverse();
    return recentIds
      .map((id) => this.actionRecords.get(id))
      .filter((record): record is ActionRecord => record !== undefined);
  }

  /**
   * Get metrics
   */
  public getMetrics(): Readonly<ReasoningMetrics> {
    return { ...this.metrics };
  }

  /**
   * Clear all in-memory records (disk files remain)
   */
  public clear(): void {
    this.actionRecords.clear();
    this.actionOrder.length = 0;
    this.logger.debug('Cleared in-memory action records');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Initialize metrics with all action types
   * @returns Properly initialized metrics object
   */
  private initializeMetrics(): ReasoningMetrics {
    const actionTypeBreakdown: Record<TrackedActionType, number> = {
      'deploy': 0,
      'scale': 0,
      'set-env': 0,
      'rollback': 0,
      'provider-selection': 0,
      'environment-selection': 0,
      'risk-assessment': 0,
      'default-application': 0,
    };

    return {
      totalActionsTracked: 0,
      totalExplainRequests: 0,
      totalAlternativeSelections: 0,
      actionTypeBreakdown,
    };
  }

  /**
   * Validate action record before persisting
   * @param record - Action record to validate
   * @throws {Error} If record is invalid
   */
  private validateActionRecord(record: Omit<ActionRecord, 'id'>): void {
    // Validate metadata
    if (!record.metadata.sessionId || record.metadata.sessionId.trim() === '') {
      throw new Error('Invalid metadata: sessionId is required and cannot be empty');
    }

    if (record.metadata.turnNumber < 0) {
      throw new Error(`Invalid metadata: turnNumber must be >= 0, got ${record.metadata.turnNumber}`);
    }

    if (!record.metadata.userInput || record.metadata.userInput.trim() === '') {
      throw new Error('Invalid metadata: userInput is required and cannot be empty');
    }

    // Validate timestamp is valid ISO 8601
    const timestamp = new Date(record.metadata.timestamp);
    if (isNaN(timestamp.getTime())) {
      throw new Error(`Invalid metadata: timestamp must be valid ISO 8601, got ${record.metadata.timestamp}`);
    }

    // Validate reasoning has required fields
    if (!record.reasoning.chosen || !record.reasoning.chosen.reason) {
      throw new Error('Invalid reasoning: chosen.reason is required');
    }

    if (!Array.isArray(record.reasoning.alternatives)) {
      throw new Error(ErrorMessages.validation.invalidArray('reasoning.alternatives'));
    }

    if (!Array.isArray(record.reasoning.factors)) {
      throw new Error(ErrorMessages.validation.invalidArray('reasoning.factors'));
    }

    // Validate risks
    if (!Array.isArray(record.risks)) {
      throw new Error('Invalid risks: must be an array');
    }
  }

  /**
   * Add record to LRU cache
   * @description ✅ Evicts BEFORE adding if at limit (prevents brief overflow)
   */
  private addToCache(actionId: string, record: ActionRecord): void {
    // Remove if already exists (for re-ordering)
    const existingIndex = this.actionOrder.indexOf(actionId);
    if (existingIndex !== -1) {
      this.actionOrder.splice(existingIndex, 1);
    }

    // ✅ Evict BEFORE adding if we're at the limit
    while (this.actionOrder.length >= this.config.maxMemoryRecords) {
      const oldestId = this.actionOrder.shift();
      if (oldestId) {
        this.actionRecords.delete(oldestId);
        this.logger.debug('Evicted oldest action from cache', { actionId: oldestId });
      }
    }

    // Add to end (most recent)
    this.actionOrder.push(actionId);
    this.actionRecords.set(actionId, record);
  }

  /**
   * Update metrics
   */
  private updateMetrics(record: ActionRecord): void {
    this.metrics.totalActionsTracked++;

    const actionType = record.reasoning.actionType;
    this.metrics.actionTypeBreakdown[actionType] =
      (this.metrics.actionTypeBreakdown[actionType] ?? 0) + 1;
  }

  /**
   * Persist record to disk (atomic write)
   */
  private async persistRecord(record: ActionRecord): Promise<void> {
    await fs.mkdir(this.config.reasoningDir, { recursive: true });

    const filename = `${record.id}.json`;
    const filepath = path.join(this.config.reasoningDir, filename);
    const tempPath = `${filepath}.tmp`;

    let fileHandle: Awaited<ReturnType<typeof fs.open>> | null = null;

    try {
      const data = JSON.stringify(record, null, 2);

      // Check disk space before writing (same pattern as Phase 5)
      await this.checkDiskSpace(data.length);

      // Write with fsync for durability (same pattern as Phase 5)
      fileHandle = await fs.open(tempPath, 'w', 0o600); // Explicit permissions
      await fileHandle.write(data, 0, 'utf-8');

      // Flush data to disk (critical for durability)
      await fileHandle.sync();
      await fileHandle.close();
      fileHandle = null;

      // Atomic rename
      await fs.rename(tempPath, filepath);

      // Sync directory to ensure rename is durable (POSIX requirement)
      try {
        const dirHandle = await fs.open(this.config.reasoningDir, 'r');
        await dirHandle.sync();
        await dirHandle.close();
      } catch {
        // Directory sync may not be supported on all filesystems, ignore
      }

      // ✅ Use info level for persistence events
      this.logger.info('Persisted action record', { actionId: record.id, filepath });
    } catch (error) {
      // Ensure file handle is closed
      if (fileHandle) {
        try {
          await fileHandle.close();
        } catch {
          // Ignore close errors
        }
      }

      // Cleanup temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  /**
   * Check available disk space before writing
   *
   * @param bytesNeeded - Number of bytes needed for write
   * @throws {Error} If insufficient disk space
   * @private
   */
  private async checkDiskSpace(bytesNeeded: number): Promise<void> {
    try {
      // Require 10x the data size as buffer (includes temp file, backup, and safety margin)
      const requiredSpace = bytesNeeded * 10;

      // Get filesystem stats (Node.js 18+)
      const stats = await fs.statfs(this.config.reasoningDir);
      const availableSpace = stats.bavail * stats.bsize;

      if (availableSpace < requiredSpace) {
        this.logger.warn('Low disk space detected', {
          availableBytes: availableSpace,
          requiredBytes: requiredSpace,
          path: this.config.reasoningDir,
        });

        throw new Error(
          `Insufficient disk space: ${Math.round(availableSpace / 1024 / 1024)}MB available, ${Math.round(requiredSpace / 1024 / 1024)}MB required`
        );
      }
    } catch (error) {
      // If statfs not supported or other error, log warning but don't fail
      // (better to attempt write than to fail prematurely)
      if (error instanceof Error && error.message.includes('Insufficient disk space')) {
        throw error; // Re-throw our own disk space errors
      }
      this.logger.debug(`Disk space check skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load record from disk
   */
  private async loadRecordFromDisk(actionId: string): Promise<ActionRecord | null> {
    try {
      const filepath = path.join(this.config.reasoningDir, `${actionId}.json`);
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content) as ActionRecord;
    } catch (error) {
      this.logger.debug('Failed to load action record from disk', {
        actionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get last action ID
   */
  private getLastActionId(): string | undefined {
    return this.actionOrder[this.actionOrder.length - 1];
  }

  /**
   * Format explanation response
   * @description ✅ Includes defensive validation for reasoning structure
   */
  private formatExplanation(
    record: ActionRecord,
    request: ExplainRequest
  ): ExplainResponse {
    const reasoning = record.reasoning;

    // ✅ Validate reasoning structure
    if (!reasoning.chosen || !reasoning.chosen.reason) {
      throw new Error(ErrorMessages.reasoning.missingChosenReason());
    }

    if (!Array.isArray(reasoning.factors)) {
      throw new Error(ErrorMessages.validation.invalidArray('reasoning.factors'));
    }

    if (!Array.isArray(reasoning.alternatives)) {
      throw new Error(ErrorMessages.validation.invalidArray('reasoning.alternatives'));
    }

    // Handle specific questions (e.g., "why vercel?", "why not aws?")
    const specificQuestion = request.target?.question?.toLowerCase();
    const summary = specificQuestion
      ? this.answerSpecificQuestion(reasoning, specificQuestion)
      : reasoning.chosen.reason;

    return {
      actionId: record.id,
      summary,
      reasoning: {
        chosen: {
          value: this.formatChosenLabel(reasoning),
          reasons: this.extractReasons(reasoning),
        },
        factors: reasoning.factors.map((factor) => ({
          type: factor.type,
          description: factor.description,
          weight: formatFactorWeight(factor.weight),
        })),
        alternatives: reasoning.alternatives.map((alt) => ({
          label: alt.label,
          whyNotChosen: alt.whyNotChosen,
          pros: [...alt.pros],
          cons: [...alt.cons],
        })),
      },
      ...(record.risks.length > 0 ? {
        risks: record.risks.map((risk) => ({
          level: risk.level,
          description: risk.description,
          ...(risk.mitigation ? { mitigation: risk.mitigation } : {}),
        })),
      } : {}),
      metadata: {
        timestamp: record.metadata.timestamp,
        userInput: record.metadata.userInput,
      },
    };
  }

  /**
   * Answer specific question about a decision
   */
  private answerSpecificQuestion(
    reasoning: ActionReasoning,
    question: string
  ): string {
    // "why X?" - explain why X was chosen
    if (question.startsWith('why ') && !question.includes('not')) {
      return reasoning.chosen.reason;
    }

    // "why not X?" - explain why X wasn't chosen
    if (question.includes('why not')) {
      const targetValue = question.replace(/why not\s+/, '').replace(/\?/, '').trim();
      const alternative = reasoning.alternatives.find((alt) =>
        alt.label.toLowerCase().includes(targetValue)
      );
      return alternative?.whyNotChosen ?? 'Alternative not found';
    }

    return reasoning.chosen.reason;
  }

  /**
   * Format chosen option label
   */
  private formatChosenLabel(reasoning: ActionReasoning): string {
    // Check for both provider AND environment first
    if ('provider' in reasoning.chosen && 'environment' in reasoning.chosen) {
      // Capitalize first letter of provider and include environment
      const provider = reasoning.chosen.provider.charAt(0).toUpperCase() +
                       reasoning.chosen.provider.slice(1);
      return `${provider} (${reasoning.chosen.environment})`;
    }
    if ('provider' in reasoning.chosen) {
      return reasoning.chosen.provider;
    }
    if ('environment' in reasoning.chosen) {
      return reasoning.chosen.environment;
    }
    return String(reasoning.chosen.value);
  }

  /**
   * Extract reasons from chosen option
   */
  private extractReasons(reasoning: ActionReasoning): readonly string[] {
    const reasons: string[] = [reasoning.chosen.reason];

    // Add positive factors as reasons
    const positiveFactors = reasoning.factors
      .filter((f) => f.type === 'positive')
      .map((f) => f.description);

    return [...reasons, ...positiveFactors];
  }

  /**
   * Extract pros from chosen option
   */
  private extractPros(reasoning: ActionReasoning): readonly string[] {
    return reasoning.factors
      .filter((f) => f.type === 'positive')
      .map((f) => f.description);
  }

  /**
   * Convert confidence level to numeric value
   */
  private getNumericConfidence(
    level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high'
  ): number {
    const map: Record<typeof level, number> = {
      'very-low': 0.2,
      low: 0.4,
      medium: 0.6,
      high: 0.8,
      'very-high': 0.95,
    };
    return map[level];
  }
}
