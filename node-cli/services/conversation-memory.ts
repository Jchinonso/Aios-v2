/**
 * @fileoverview Conversation Memory with Preference Learning
 * @description Tracks conversation turns and learns user preferences (Claude Code strategy)
 * @module node-cli/services/conversation-memory
 */

import type { ILogger } from '@aios/shared';
import type { ParsedIntentType } from '../nl-planner/types.js';
import type { CloudProviderType } from '@aios/shared';

/**
 * User preference types
 */
export type PreferenceType = 'priority' | 'provider' | 'environment' | 'strategy';
export type PriorityType = 'cost' | 'speed' | 'safety';

/**
 * User preference with confidence tracking
 */
export interface UserPreference {
  readonly type: PreferenceType;
  readonly value: string;
  readonly confidence: number; // 0.0-1.0
  readonly learnedAt: Date;
  readonly occurrences: number;
}

/**
 * Single conversation turn
 */
export interface ConversationTurn {
  readonly userInput: string;
  readonly intent: ParsedIntentType;
  readonly response: string;
  readonly timestamp: Date;
}

/**
 * Project-specific deployment context
 */
export interface ProjectContext {
  readonly path: string;
  readonly framework?: string;
  readonly lastDeployment?: {
    provider: CloudProviderType;
    env: string;
    timestamp: Date;
    success: boolean;
  };
}

/**
 * Serializable memory snapshot for persistence
 */
export interface MemorySnapshot {
  readonly version: number;
  readonly turns: readonly ConversationTurn[];
  readonly preferences: readonly UserPreference[];
  readonly createdAt: string;
  readonly projectContext: ProjectContext | null;
}

/**
 * Conversation memory with sliding window and preference learning
 *
 * Implements Claude Code's strategy of maintaining conversation context
 * and learning user preferences over time.
 *
 * @example
 * ```typescript
 * const memory = new ConversationMemory(logger);
 *
 * memory.learnFromInput('I want the cheapest option', intent);
 * console.log(memory.getUserPriority()); // 'cost'
 *
 * memory.learnFromInput('deploy quickly', intent);
 * console.log(memory.getUserPriority()); // 'speed' (more recent)
 * ```
 */
export class ConversationMemory {
  private static readonly MAX_TURNS = 10;
  private static readonly CONFIDENCE_INCREMENT = 0.25;
  private static readonly MIN_CONFIDENCE = 0.5;
  private static readonly HIGH_CONFIDENCE = 0.9;

  private turns: ConversationTurn[] = [];
  private preferences = new Map<string, UserPreference>();
  private projectContext: ProjectContext | null = null;

  /**
   * Priority detection patterns
   * Maps keywords to priority types
   */
  private static readonly PRIORITY_PATTERNS: ReadonlyMap<PriorityType, readonly RegExp[]> = new Map([
    ['cost', [
      /\b(cheap|cheapest|affordable|budget|cost|price|inexpensive|economical)\b/i,
      /\b(save\s+money|lower\s+cost)\b/i
    ]],
    ['speed', [
      /\b(fast|fastest|quick|quickest|rapid|swift|instant|immediate|asap|now)\b/i,
      /\b(speed|quickly|rapidly|urgently)\b/i
    ]],
    ['safety', [
      /\b(safe|safest|careful|cautious|secure|stable|reliable)\b/i,
      /\b(rollback|backup|staging|test)\b/i
    ]]
  ]);

  /**
   * Provider preference patterns
   */
  private static readonly PROVIDER_PATTERNS: ReadonlyMap<CloudProviderType, readonly RegExp[]> = new Map([
    ['vercel', [/\b(vercel)\b/i]],
    ['netlify', [/\b(netlify)\b/i]],
    ['aws', [/\b(aws|amazon)\b/i]],
    ['railway', [/\b(railway)\b/i]],
    ['render', [/\b(render)\b/i]]
  ]);

  constructor(private readonly logger: ILogger) {}

  /**
   * Add conversation turn to memory
   * Maintains sliding window of last MAX_TURNS
   */
  public addTurn(turn: ConversationTurn): void {
    this.turns.push(turn);

    // Maintain sliding window
    if (this.turns.length > ConversationMemory.MAX_TURNS) {
      this.turns = this.turns.slice(-ConversationMemory.MAX_TURNS);
    }

    // Extract preferences from this turn
    this.extractPreferences(turn);

    this.logger.debug('Conversation turn added', {
      totalTurns: this.turns.length,
      preferencesLearned: this.preferences.size
    });
  }

  /**
   * Learn patterns from user input
   * Updates confidence scores based on frequency
   */
  public learnFromInput(input: string, intent: ParsedIntentType): void {
    const turn: ConversationTurn = {
      userInput: input,
      intent,
      response: '', // Will be filled by orchestrator
      timestamp: new Date()
    };

    this.addTurn(turn);
  }

  /**
   * Extract and store preferences from conversation turn
   */
  public extractPreferences(turn: ConversationTurn): void {
    // Extract priority preference
    for (const [priority, patterns] of ConversationMemory.PRIORITY_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(turn.userInput)) {
          this.updatePreference('priority', priority);
          break;
        }
      }
    }

    // Extract provider preference
    for (const [provider, patterns] of ConversationMemory.PROVIDER_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(turn.userInput)) {
          this.updatePreference('provider', provider);
          break;
        }
      }
    }

    // Extract environment preference from intent
    if (turn.intent.entities.env) {
      this.updatePreference('environment', turn.intent.entities.env);
    }

    // Extract strategy preference
    if (turn.intent.entities.strategy) {
      this.updatePreference('strategy', turn.intent.entities.strategy);
    }
  }

  /**
   * Update preference with confidence scoring
   * Confidence increases with repeated occurrences
   */
  private updatePreference(type: PreferenceType, value: string): void {
    const key = `${type}:${value}`;
    const existing = this.preferences.get(key);

    if (existing) {
      // Increase confidence with repetition
      const newOccurrences = existing.occurrences + 1;
      const newConfidence = Math.min(
        ConversationMemory.HIGH_CONFIDENCE,
        ConversationMemory.MIN_CONFIDENCE + (newOccurrences - 1) * ConversationMemory.CONFIDENCE_INCREMENT
      );

      this.preferences.set(key, {
        ...existing,
        confidence: newConfidence,
        occurrences: newOccurrences,
        learnedAt: new Date() // Update timestamp on each occurrence
      });

      this.logger.debug('Preference confidence increased', {
        type,
        value,
        confidence: newConfidence,
        occurrences: newOccurrences
      });
    } else {
      // First occurrence
      this.preferences.set(key, {
        type,
        value,
        confidence: ConversationMemory.MIN_CONFIDENCE,
        learnedAt: new Date(),
        occurrences: 1
      });

      this.logger.info('New preference learned', { type, value });
    }
  }

  /**
   * Get user's preferred provider with confidence
   * Returns null if confidence below threshold
   */
  public getPreferredProvider(): { provider: CloudProviderType; confidence: number } | null {
    let bestMatch: UserPreference | null = null;
    let highestConfidence = 0;

    for (const pref of this.preferences.values()) {
      if (pref.type === 'provider' && pref.confidence > highestConfidence) {
        highestConfidence = pref.confidence;
        bestMatch = pref;
      }
    }

    if (!bestMatch || bestMatch.confidence < 0.6) {
      return null;
    }

    return {
      provider: bestMatch.value as CloudProviderType,
      confidence: bestMatch.confidence
    };
  }

  /**
   * Get user's priority (cost/speed/safety)
   * Returns most confident priority, prioritizing recency for ties
   */
  public getUserPriority(): PriorityType | null {
    let bestMatch: UserPreference | null = null;
    let highestConfidence = -1;
    let mostRecentTime = 0;

    for (const pref of this.preferences.values()) {
      if (pref.type === 'priority') {
        const prefTime = pref.learnedAt.getTime();

        // Select if:
        // 1. Higher confidence, OR
        // 2. Same confidence but more recent
        const isHigherConfidence = pref.confidence > highestConfidence;
        const isSameConfidenceButMoreRecent =
          pref.confidence === highestConfidence && prefTime > mostRecentTime;

        if (isHigherConfidence || isSameConfidenceButMoreRecent) {
          highestConfidence = pref.confidence;
          mostRecentTime = prefTime;
          bestMatch = pref;
        }
      }
    }

    if (!bestMatch) {
      return null;
    }

    return bestMatch.value as PriorityType;
  }

  /**
   * Get preferred environment
   */
  public getPreferredEnvironment(): string | null {
    let bestMatch: UserPreference | null = null;
    let highestConfidence = 0;

    for (const pref of this.preferences.values()) {
      if (pref.type === 'environment' && pref.confidence > highestConfidence) {
        highestConfidence = pref.confidence;
        bestMatch = pref;
      }
    }

    if (!bestMatch) {
      return null;
    }

    return bestMatch.value;
  }

  /**
   * Get all preferences of a specific type
   * Returns preferences sorted by confidence (highest first)
   */
  public getPreferences(type: PreferenceType): readonly UserPreference[] {
    return Array.from(this.preferences.values())
      .filter(pref => pref.type === type)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Directly record a preference (bypasses pattern matching)
   * Useful for explicit user choices or API-driven preferences
   */
  public recordPreference(preference: UserPreference): void {
    const key = `${preference.type}:${preference.value}`;
    this.preferences.set(key, preference);

    this.logger.info('Preference recorded', {
      type: preference.type,
      value: preference.value,
      confidence: preference.confidence
    });
  }

  /**
   * Get relevant context for current input
   * Used for LLM prompting with conversation history
   */
  public getRelevantContext(_currentInput?: string): string {
    const recentTurns = this.turns.slice(-3); // Last 3 turns
    const priority = this.getUserPriority();
    const provider = this.getPreferredProvider();

    let context = 'Recent conversation:\n';

    if (recentTurns.length > 0) {
      context += recentTurns
        .map(t => `User: ${t.userInput} → Intent: ${t.intent.intent}`)
        .join('\n');
    } else {
      context += '(No previous turns)';
    }

    context += '\n\nUser preferences:\n';
    context += `- Priority: ${priority || 'unknown'}\n`;
    context += `- Preferred provider: ${provider?.provider || 'none yet'} (confidence: ${provider?.confidence.toFixed(2) || 'N/A'})\n`;

    if (this.projectContext?.lastDeployment) {
      const last = this.projectContext.lastDeployment;
      context += `- Last deployment: ${last.provider} to ${last.env} (${this.formatRelativeTime(last.timestamp)})\n`;
    }

    return context.trim();
  }

  /**
   * Set project context
   */
  public setProjectContext(context: ProjectContext): void {
    this.projectContext = context;
    this.logger.debug('Project context updated', {
      path: context.path,
      framework: context.framework
    });
  }

  /**
   * Get project context
   */
  public getProjectContext(): ProjectContext | null {
    return this.projectContext;
  }

  /**
   * Get all conversation turns
   */
  public getTurns(): readonly ConversationTurn[] {
    return Object.freeze([...this.turns]);
  }

  /**
   * Create memory snapshot for persistence
   */
  public toSnapshot(): MemorySnapshot {
    // Convert preferences map to array
    const preferencesArray = Array.from(this.preferences.values());

    return {
      version: 1, // Snapshot format version
      turns: this.getTurns(),
      preferences: preferencesArray,
      createdAt: new Date().toISOString(),
      projectContext: this.projectContext
    };
  }

  /**
   * Restore memory from snapshot
   */
  public static fromSnapshot(snapshot: MemorySnapshot, logger: ILogger): ConversationMemory {
    const memory = new ConversationMemory(logger);

    // Restore turns, converting timestamp strings to Dates
    memory.turns = snapshot.turns.map(turn => ({
      ...turn,
      timestamp: typeof turn.timestamp === 'string' ? new Date(turn.timestamp) : turn.timestamp
    }));

    // Restore preferences from array to map
    for (const pref of snapshot.preferences) {
      const key = `${pref.type}:${pref.value}`;
      // Convert learnedAt from string to Date if needed
      const restoredPref: UserPreference = {
        ...pref,
        learnedAt: typeof pref.learnedAt === 'string' ? new Date(pref.learnedAt) : pref.learnedAt
      };
      memory.preferences.set(key, restoredPref);
    }

    // Restore project context
    memory.projectContext = snapshot.projectContext;

    logger.info('Memory restored from snapshot', {
      turns: memory.turns.length,
      preferences: memory.preferences.size
    });

    return memory;
  }

  /**
   * Clear all memory
   */
  public clear(): void {
    this.turns = [];
    this.preferences.clear();
    this.projectContext = null;
    this.logger.info('Memory cleared');
  }

  /**
   * Format relative time for display
   */
  private formatRelativeTime(timestamp: Date): string {
    const now = Date.now();
    const diff = now - timestamp.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    return `${seconds} sec ago`;
  }

  /**
   * Get memory statistics for debugging
   */
  public getStats(): {
    turns: number;
    preferences: number;
    highConfidencePreferences: number;
    hasProjectContext: boolean;
  } {
    const highConfidenceCount = Array.from(this.preferences.values())
      .filter(p => p.confidence >= ConversationMemory.HIGH_CONFIDENCE)
      .length;

    return {
      turns: this.turns.length,
      preferences: this.preferences.size,
      highConfidencePreferences: highConfidenceCount,
      hasProjectContext: this.projectContext !== null
    };
  }
}
