/**
 * @fileoverview Production-Grade Intent Disambiguator - Context-Aware Intent Completion
 * @description Enterprise-ready intent disambiguation using conversation history and smart scoring
 * @module node-cli/services/intent-disambiguator
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * const disambiguator = new IntentDisambiguator(logger);
 * const result = await disambiguator.disambiguate(partialIntent, conversationHistory);
 *
 * if (result.autoSelected) {
 *   // High confidence - proceed automatically
 *   return result.autoSelected;
 * } else {
 *   // Present options to user
 *   console.log(result.primarySuggestion);
 *   console.log(result.alternatives);
 * }
 * ```
 */

import type { ILogger } from '@aios/shared';
import type { ParsedIntentType } from '../nl-planner/types.js';
import type { ConversationTurn } from './conversation-memory.v2.js';
import type { FuzzyMatcher } from '../utils/fuzzy-matcher.js';

/**
 * Confidence threshold for auto-selection (no user interaction needed)
 */
const AUTO_SELECT_CONFIDENCE_THRESHOLD = 0.9;

/**
 * Maximum number of alternatives to show (prevent choice overwhelm)
 */
const MAX_ALTERNATIVES = 4; // Primary + 4 = 5 total max

/**
 * Recency decay factor (hours) - older history has less weight
 */
const RECENCY_DECAY_HOURS = 24;

/**
 * Maximum age for conversation history (7 days)
 * History older than this is rejected for performance and relevance
 */
const MAX_HISTORY_AGE_HOURS = 7 * 24;

/**
 * Maximum number of historical turns to consider for performance
 * Processing is O(n) where n = history size, so we limit to 50 most recent
 */
const MAX_HISTORY_SIZE = 50;

/**
 * Clock skew tolerance (1 hour)
 * Timestamps up to 1 hour in the future are tolerated (server/client time differences)
 */
const CLOCK_SKEW_TOLERANCE_HOURS = 1;

/**
 * Enhanced intent with reasoning and confidence
 */
export interface SuggestedIntent extends ParsedIntentType {
  readonly reasoning?: string;
  readonly score: number; // Internal scoring (0-1)
}

/**
 * Disambiguation result (discriminated union for type safety)
 */
export type DisambiguationResult =
  | {
      readonly autoSelected: SuggestedIntent;
      readonly alternatives: readonly SuggestedIntent[];
      readonly reasoning: string;
    }
  | {
      readonly autoSelected?: undefined;
      readonly primarySuggestion: SuggestedIntent;
      readonly alternatives: readonly SuggestedIntent[];
      readonly reasoning: string;
    };

/**
 * Scored entity match for ranking suggestions
 */
interface ScoredMatch {
  readonly intent: ParsedIntentType;
  readonly score: number;
  readonly reasoning: string;
  readonly timestamp: Date;
}

/**
 * IntentDisambiguator - Context-aware intent completion engine
 *
 * Uses conversation history to intelligently suggest completions for ambiguous intents.
 * Implements recency-weighted scoring with entity overlap detection.
 *
 * **Key Features**:
 * - Recency-based scoring (recent actions weighted higher)
 * - Entity overlap detection (partial matches scored)
 * - Auto-selection at >90% confidence
 * - Max 5 total options (prevent overwhelm)
 * - Promotion detection (staging→production)
 * - Optional fuzzy matching for entity values (typo tolerance)
 *
 * **Thread Safety**: Stateless (safe for concurrent use)
 * **Performance**: O(n) where n = conversation history size
 */
export class IntentDisambiguator {
  private readonly logger: ILogger;
  private readonly fuzzyMatcher: FuzzyMatcher | undefined;

  /**
   * @param logger - Logger instance for debugging
   * @param fuzzyMatcher - Optional fuzzy matcher for typo tolerance in entity values
   */
  constructor(logger: ILogger, fuzzyMatcher?: FuzzyMatcher) {
    this.logger = logger;
    this.fuzzyMatcher = fuzzyMatcher;
  }

  /**
   * Disambiguate a partial intent using conversation history
   *
   * @param partialIntent - Incomplete or ambiguous intent from user
   * @param conversationHistory - Recent conversation turns (ordered newest→oldest recommended)
   * @returns Disambiguation result with suggestions and reasoning
   *
   * @throws Never throws - returns fallback suggestions on error
   *
   * @remarks
   * Method is marked async for future extensibility (AI-based disambiguation, async scoring).
   * Current implementation is synchronous but API contract allows async operations.
   *
   * @example
   * ```typescript
   * const result = await disambiguator.disambiguate(
   *   { intent: 'deploy', entities: {}, confidence: 0.75 },
   *   conversationHistory
   * );
   * ```
   */
  public async disambiguate(
    partialIntent: ParsedIntentType,
    conversationHistory: readonly ConversationTurn[]
  ): Promise<DisambiguationResult> {
    try {
      // Validate inputs
      if (!this.isValidIntent(partialIntent)) {
        this.logger.warn('Invalid partial intent provided to disambiguator', { partialIntent });
        return this.createFallbackResult(partialIntent);
      }

      // Filter relevant history (same intent type only)
      const relevantHistory = this.filterRelevantHistory(
        conversationHistory,
        partialIntent.intent
      );

      // No history - return generic fallback
      if (relevantHistory.length === 0) {
        this.logger.debug('No relevant history for disambiguation', {
          intent: partialIntent.intent,
        });
        return this.createNoContextResult(partialIntent);
      }

      // Score all potential suggestions
      const scoredMatches = this.scoreHistoricalMatches(partialIntent, relevantHistory);

      // Sort by score (highest first), with timestamp tiebreaker for stability
      const sortedMatches = [...scoredMatches].sort((a, b) => {
        // Primary sort: score (descending)
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // Secondary sort: timestamp (most recent first) for stable ordering
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      // Build suggestions
      const suggestions = this.buildSuggestions(partialIntent, sortedMatches);

      // Check for auto-selection
      if (suggestions.length > 0 && suggestions[0]!.score > AUTO_SELECT_CONFIDENCE_THRESHOLD) {
        const autoSelected = suggestions[0]!;
        this.logger.info('Auto-selected suggestion (high confidence)', {
          intent: autoSelected.intent,
          confidence: autoSelected.score,
        });

        return {
          autoSelected: {
            ...autoSelected,
            reasoning: `${autoSelected.reasoning} (high confidence - auto-selected)`,
          },
          alternatives: [],
          reasoning: `Auto-selected based on high confidence (${(autoSelected.score * 100).toFixed(0)}%)`,
        };
      }

      // Return primary + alternatives
      const [primarySuggestion, ...alternatives] = suggestions;

      if (!primarySuggestion) {
        // Should never happen due to length check, but type safety
        return this.createFallbackResult(partialIntent);
      }

      return {
        primarySuggestion,
        alternatives: alternatives.slice(0, MAX_ALTERNATIVES),
        reasoning: this.buildOverallReasoning(primarySuggestion, alternatives, relevantHistory),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Disambiguation failed - returning fallback: ${errorMessage}`);
      return this.createFallbackResult(partialIntent);
    }
  }

  /**
   * Validate intent structure with deep validation (defensive programming)
   *
   * **Validates**:
   * - Intent is a valid object
   * - Intent string is non-empty after trimming
   * - Confidence is finite number in [0, 1]
   * - Entities is a plain object (not array)
   * - Entity values are primitives (no functions/symbols)
   */
  private isValidIntent(intent: ParsedIntentType): boolean {
    // Type guard with runtime validation
    if (typeof intent !== 'object' || intent === null) {
      this.logger.warn('Invalid intent: not an object', { intent });
      return false;
    }

    // Validate intent string (non-empty, trimmed)
    if (
      typeof intent.intent !== 'string' ||
      intent.intent.trim().length === 0
    ) {
      this.logger.warn('Invalid intent: empty or non-string intent field', {
        intent: intent.intent,
      });
      return false;
    }

    // Validate confidence (0-1 range, not NaN/Infinity)
    if (
      typeof intent.confidence !== 'number' ||
      !Number.isFinite(intent.confidence) ||
      intent.confidence < 0 ||
      intent.confidence > 1
    ) {
      this.logger.warn('Invalid intent: confidence out of range or non-finite', {
        confidence: intent.confidence,
      });
      return false;
    }

    // Validate entities is a plain object (not array, not null)
    if (
      typeof intent.entities !== 'object' ||
      intent.entities === null ||
      Array.isArray(intent.entities)
    ) {
      this.logger.warn('Invalid intent: entities is not a plain object', {
        entities: intent.entities,
      });
      return false;
    }

    // Validate entity values (no undefined, no functions, no symbols)
    for (const [key, value] of Object.entries(intent.entities)) {
      if (typeof key !== 'string' || key.trim().length === 0) {
        this.logger.warn('Invalid intent: entity key is empty or non-string', { key });
        return false;
      }

      // Allow string, number, boolean, null - reject undefined, functions, symbols
      const valueType = typeof value;
      if (
        value !== null &&
        valueType !== 'string' &&
        valueType !== 'number' &&
        valueType !== 'boolean'
      ) {
        this.logger.warn('Invalid intent: entity value has invalid type', {
          key,
          value,
          valueType,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Filter conversation history to only relevant intent types
   *
   * Only returns history for the same intent (e.g., "deploy" history for "deploy" intent)
   *
   * **Safety**: Validates both intent structure and timestamp
   */
  private filterRelevantHistory(
    history: readonly ConversationTurn[],
    targetIntent: string
  ): readonly ConversationTurn[] {
    return history.filter(turn => {
      if (!turn.intent || turn.intent.intent !== targetIntent) {
        return false;
      }

      // Validate intent structure (defensive - ConversationMemory is trusted but validate anyway)
      if (!this.isValidIntent(turn.intent)) {
        this.logger.warn('Invalid intent structure in conversation turn', { turn });
        return false;
      }

      // Validate timestamp
      try {
        const timestamp = new Date(turn.timestamp);
        if (isNaN(timestamp.getTime())) {
          this.logger.warn('Invalid timestamp in conversation turn', { turn });
          return false;
        }
        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Score historical matches based on recency and entity overlap
   *
   * **Scoring Algorithm**:
   * - Base score: Entity overlap (0.0-1.0)
   * - Recency boost: Exponential decay over 24 hours
   * - Exact match boost: +0.2 if all entities match
   *
   * **Safety**:
   * - Limits processing to MAX_HISTORY_SIZE most recent turns
   * - Validates timestamps (rejects future/invalid/very old)
   * - Handles clock skew (1 hour tolerance)
   * - Clamps all values to valid ranges
   */
  private scoreHistoricalMatches(
    partialIntent: ParsedIntentType,
    relevantHistory: readonly ConversationTurn[]
  ): ScoredMatch[] {
    // Limit history size for performance (O(n) processing)
    const limitedHistory = relevantHistory.slice(0, MAX_HISTORY_SIZE);

    if (relevantHistory.length > MAX_HISTORY_SIZE) {
      this.logger.warn('Conversation history exceeds maximum - truncating', {
        totalSize: relevantHistory.length,
        processedSize: MAX_HISTORY_SIZE,
        truncated: relevantHistory.length - MAX_HISTORY_SIZE,
      });
    }

    const now = Date.now();

    return limitedHistory.map(turn => {
      const historicalIntent = turn.intent;
      const timestamp = new Date(turn.timestamp);
      const timestampMs = timestamp.getTime();

      // Validate timestamp is finite
      if (!Number.isFinite(timestampMs)) {
        this.logger.warn('Invalid timestamp in conversation turn', {
          timestamp: turn.timestamp,
        });
        // Return zero-score match (will be filtered out)
        return {
          intent: historicalIntent,
          score: 0,
          reasoning: 'Invalid timestamp',
          timestamp: new Date(0),
        };
      }

      // Calculate age in hours
      const ageMs = now - timestampMs;
      const ageHours = ageMs / (1000 * 60 * 60);

      // Reject future timestamps (with clock skew tolerance)
      if (ageHours < -CLOCK_SKEW_TOLERANCE_HOURS) {
        this.logger.warn('Timestamp in the future - rejecting', {
          timestamp: turn.timestamp,
          ageHours: ageHours.toFixed(2),
        });
        return {
          intent: historicalIntent,
          score: 0,
          reasoning: 'Future timestamp (clock skew)',
          timestamp,
        };
      }

      // Reject very old history (>7 days for performance)
      if (ageHours > MAX_HISTORY_AGE_HOURS) {
        return {
          intent: historicalIntent,
          score: 0,
          reasoning: `Too old (${Math.floor(ageHours / 24)} days ago)`,
          timestamp,
        };
      }

      // Clamp age to valid range [0, MAX_HISTORY_AGE_HOURS]
      const clampedAge = Math.max(0, Math.min(ageHours, MAX_HISTORY_AGE_HOURS));

      // Calculate entity overlap score
      const overlapScore = this.calculateEntityOverlap(
        partialIntent.entities,
        historicalIntent.entities
      );

      // Calculate recency multiplier (exponential decay)
      const recencyMultiplier = Math.exp(-clampedAge / RECENCY_DECAY_HOURS);

      // Exact match bonus
      const isExactMatch = this.isExactEntityMatch(
        partialIntent.entities,
        historicalIntent.entities
      );
      const exactMatchBonus = isExactMatch ? 0.2 : 0;

      // Final score (clamped to [0, 1])
      const rawScore = overlapScore * recencyMultiplier + exactMatchBonus;
      const score = Math.max(0, Math.min(1, rawScore));

      // Build reasoning
      const reasoning = this.buildMatchReasoning(
        partialIntent,
        historicalIntent,
        overlapScore,
        recencyMultiplier,
        clampedAge
      );

      return {
        intent: historicalIntent,
        score,
        reasoning,
        timestamp,
      };
    });
  }

  /**
   * Calculate entity overlap score (Jaccard similarity)
   *
   * Returns 0.0-1.0 based on how many entities match
   *
   * **Matching Strategy**:
   * - Exact match: score = 1.0
   * - Fuzzy match (if FuzzyMatcher provided): score = confidence * 0.8
   * - No match: score = 0.0
   */
  private calculateEntityOverlap(
    partialEntities: ParsedIntentType['entities'],
    historicalEntities: ParsedIntentType['entities']
  ): number {
    const partialKeys = Object.keys(partialEntities);
    const historicalKeys = Object.keys(historicalEntities);

    // If partial has no entities, all historical intents are equally valid
    if (partialKeys.length === 0) {
      return 0.5; // Neutral score
    }

    // Count matching entities (with fuzzy matching support)
    let totalMatchScore = 0;
    for (const key of partialKeys) {
      const partialValue = partialEntities[key as keyof typeof partialEntities];
      const historicalValue = historicalEntities[key as keyof typeof historicalEntities];

      if (!partialValue) continue;

      // Exact match
      if (partialValue === historicalValue) {
        totalMatchScore += 1.0;
        continue;
      }

      // Fuzzy match for string values (if FuzzyMatcher available)
      if (
        this.fuzzyMatcher &&
        typeof partialValue === 'string' &&
        typeof historicalValue === 'string'
      ) {
        const fuzzyResult = this.fuzzyMatcher.findBestMatch(partialValue, [historicalValue]);
        if (fuzzyResult && fuzzyResult.confidence > 0.7) {
          totalMatchScore += fuzzyResult.confidence * 0.8; // Fuzzy matches worth less than exact
          this.logger.debug('Fuzzy entity match', {
            key,
            partialValue,
            historicalValue,
            confidence: fuzzyResult.confidence,
          });
        }
      }
    }

    // Jaccard-inspired similarity: totalMatchScore / union size
    // Note: union size guaranteed > 0 because partialKeys.length > 0 (early return above)
    const union = new Set([...partialKeys, ...historicalKeys]).size;
    return totalMatchScore / union;
  }

  /**
   * Check if all entities match exactly
   */
  private isExactEntityMatch(
    partialEntities: ParsedIntentType['entities'],
    historicalEntities: ParsedIntentType['entities']
  ): boolean {
    const partialKeys = Object.keys(partialEntities);

    if (partialKeys.length === 0) {
      return false; // Can't be exact match if partial has no entities
    }

    return partialKeys.every(key => {
      const partialValue = partialEntities[key as keyof typeof partialEntities];
      const historicalValue = historicalEntities[key as keyof typeof historicalEntities];
      return partialValue === historicalValue;
    });
  }

  /**
   * Build human-readable reasoning for a match
   */
  private buildMatchReasoning(
    _partialIntent: ParsedIntentType,
    historicalIntent: ParsedIntentType,
    _overlapScore: number,
    _recencyMultiplier: number,
    ageHours: number
  ): string {
    const parts: string[] = [];

    // Recency
    if (ageHours < 1) {
      parts.push('same as last time (just now)');
    } else if (ageHours < 24) {
      parts.push(`same as ${Math.round(ageHours)} hour${Math.round(ageHours) === 1 ? '' : 's'} ago`);
    } else {
      parts.push(`same as ${Math.round(ageHours / 24)} day${Math.round(ageHours / 24) === 1 ? '' : 's'} ago`);
    }

    // Entity details
    const envEntity = historicalIntent.entities['env'];
    const serviceEntity = historicalIntent.entities['service'];
    const providerEntity = historicalIntent.entities['provider'];

    if (serviceEntity) {
      parts.push(`service: ${String(serviceEntity)}`);
    }
    if (envEntity) {
      parts.push(`env: ${String(envEntity)}`);
    }
    if (providerEntity) {
      parts.push(`provider: ${String(providerEntity)}`);
    }

    return parts.join(', ');
  }

  /**
   * Build final suggestion list with promotion options
   *
   * **Safety**:
   * - Filters out zero-score matches
   * - Only suggests promotion for deploy intents
   * - Type-safe entity access
   * - Clamps scores to [0, 1]
   */
  private buildSuggestions(
    partialIntent: ParsedIntentType,
    scoredMatches: readonly ScoredMatch[]
  ): SuggestedIntent[] {
    const suggestions: SuggestedIntent[] = [];

    // Add top historical matches (filter zero scores)
    for (const match of scoredMatches.slice(0, 3)) {
      // Skip zero-score matches (invalid timestamps, too old, etc.)
      if (match.score <= 0) {
        this.logger.debug('Skipping zero-score match', {
          reasoning: match.reasoning,
        });
        continue;
      }

      suggestions.push({
        ...match.intent,
        reasoning: match.reasoning,
        score: match.score,
      });
    }

    // Add promotion option if latest was to staging
    if (scoredMatches.length > 0) {
      const latest = scoredMatches[0]!;
      const envValue = latest.intent.entities['env'];

      // Only suggest promotion for deploy intents with valid scores
      if (
        partialIntent.intent === 'deploy' &&
        latest.score > 0 &&
        typeof envValue === 'string' &&
        envValue === 'staging'
      ) {
        const promotionIntent: SuggestedIntent = {
          ...latest.intent,
          entities: {
            ...latest.intent.entities,
            env: 'production',
          },
          reasoning: 'promote to prod (staging → production)',
          score: Math.min(1, latest.score * 0.8), // Clamp to [0,1]
        };
        suggestions.push(promotionIntent);
      }
    }

    return suggestions;
  }

  /**
   * Build overall reasoning message for user
   */
  private buildOverallReasoning(
    primarySuggestion: SuggestedIntent,
    alternatives: readonly SuggestedIntent[],
    relevantHistory: readonly ConversationTurn[]
  ): string {
    const historyCount = relevantHistory.length;
    const confidence = (primarySuggestion.score * 100).toFixed(0);

    // Low confidence - different message
    if (primarySuggestion.score < 0.5) {
      return `Based on ${historyCount} previous deployment${historyCount === 1 ? '' : 's'}, but no strong match found (${confidence}% confidence). Please specify parameters explicitly.`;
    }

    return `Based on ${historyCount} previous deployment${historyCount === 1 ? '' : 's'}, suggesting: ${primarySuggestion.reasoning} (${confidence}% confidence). ${alternatives.length} alternative${alternatives.length === 1 ? '' : 's'} available.`;
  }

  /**
   * Create fallback result when no context available
   */
  private createNoContextResult(partialIntent: ParsedIntentType): DisambiguationResult {
    return {
      primarySuggestion: {
        ...partialIntent,
        reasoning: 'No previous context - using defaults',
        score: 0.5,
      },
      alternatives: [],
      reasoning: 'No previous context available. Please specify all parameters.',
    };
  }

  /**
   * Create fallback result on error
   */
  private createFallbackResult(partialIntent: ParsedIntentType): DisambiguationResult {
    return {
      primarySuggestion: {
        ...partialIntent,
        reasoning: 'Unable to disambiguate - using input as-is',
        score: 0.4,
      },
      alternatives: [],
      reasoning: 'Disambiguation unavailable - proceeding with provided input.',
    };
  }
}
