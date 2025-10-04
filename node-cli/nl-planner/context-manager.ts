/**
 * @fileoverview Context Manager - Track conversation history and context
 * @description Enables follow-up commands like "now to production" or "show logs"
 * @module node-cli/nl-planner/context-manager
 */

import type { ParsedIntentType, IntentType, ExtractedEntitiesType } from './types.js';

/**
 * Conversation turn tracking
 */
export interface ConversationTurnType {
  readonly utterance: string;
  readonly result: ParsedIntentType;
  readonly timestamp: Date;
  readonly executed: boolean;
}

/**
 * Context state for conversation
 */
export interface ConversationContextType {
  readonly turns: readonly ConversationTurnType[];
  readonly lastIntent?: IntentType;
  readonly lastService?: string;
  readonly lastEnvironment?: string;
  readonly lastProvider?: string;
  readonly sessionStarted: Date;
}

/**
 * Context Manager - Maintains conversation state
 */
export class ContextManager {
  private turns: ConversationTurnType[] = [];
  private readonly sessionStarted: Date;

  constructor() {
    this.sessionStarted = new Date();
  }

  /**
   * Add a conversation turn
   */
  addTurn(utterance: string, result: ParsedIntentType, executed: boolean): void {
    this.turns.push({
      utterance,
      result,
      timestamp: new Date(),
      executed
    });

    // Keep only last 10 turns to prevent memory bloat
    if (this.turns.length > 10) {
      this.turns = this.turns.slice(-10);
    }
  }

  /**
   * Get last executed turn
   */
  getLastExecutedTurn(): ConversationTurnType | undefined {
    for (let i = this.turns.length - 1; i >= 0; i--) {
      if (this.turns[i]?.executed) {
        return this.turns[i];
      }
    }
    return undefined;
  }

  /**
   * Get last turn (regardless of execution)
   */
  getLastTurn(): ConversationTurnType | undefined {
    return this.turns[this.turns.length - 1];
  }

  /**
   * Get context for entity inference
   */
  getContext(): ConversationContextType {
    const lastTurn = this.getLastExecutedTurn();

    const context: ConversationContextType = {
      turns: this.turns,
      sessionStarted: this.sessionStarted
    };

    if (lastTurn) {
      return {
        ...context,
        ...(lastTurn.result.intent && { lastIntent: lastTurn.result.intent }),
        ...(lastTurn.result.entities.service && { lastService: lastTurn.result.entities.service }),
        ...(lastTurn.result.entities.env && { lastEnvironment: lastTurn.result.entities.env }),
        ...(lastTurn.result.entities.provider && { lastProvider: lastTurn.result.entities.provider })
      };
    }

    return context;
  }

  /**
   * Enrich entities with context from previous commands
   */
  enrichEntitiesWithContext(
    utterance: string,
    entities: ExtractedEntitiesType,
    intent: IntentType
  ): ExtractedEntitiesType {
    const context = this.getContext();
    const enriched: Record<string, unknown> = { ...entities };

    // Detect follow-up patterns
    const isFollowUp = this.isFollowUpCommand(utterance);

    if (!isFollowUp) {
      return entities;
    }

    // Inherit service from context if not specified
    if (!enriched['service'] && context.lastService) {
      // Only inherit if intent is similar
      if (this.shouldInheritService(intent, context.lastIntent)) {
        enriched['service'] = context.lastService;
      }
    }

    // Inherit environment from context if not specified
    if (!enriched['env'] && context.lastEnvironment) {
      if (this.shouldInheritEnvironment(intent, context.lastIntent)) {
        enriched['env'] = context.lastEnvironment;
      }
    }

    // Inherit provider from context if not specified
    if (!enriched['provider'] && context.lastProvider) {
      if (this.shouldInheritProvider(intent, context.lastIntent)) {
        enriched['provider'] = context.lastProvider;
      }
    }

    return enriched as ExtractedEntitiesType;
  }

  /**
   * Detect if this is a follow-up command
   */
  private isFollowUpCommand(utterance: string): boolean {
    const followUpPatterns = [
      /^now\s+(?:to|in)/i,
      /^also\s+/i,
      /^and\s+/i,
      /^then\s+/i,
      /^(?:show|get|display)\s+(?:me\s+)?(?:the\s+)?(?:logs|status)/i,
      /^(?:it|that|this)/i,
      /^same\s+/i
    ];

    return followUpPatterns.some(pattern => pattern.test(utterance.trim()));
  }

  /**
   * Should inherit service from previous command?
   */
  private shouldInheritService(currentIntent?: IntentType, lastIntent?: IntentType): boolean {
    if (!currentIntent || !lastIntent) return false;

    // Service-specific intents that should inherit
    const serviceIntents: readonly IntentType[] = [
      'deploy', 'status', 'logs', 'rollback', 'scale', 'cost'
    ];

    return serviceIntents.includes(currentIntent) && serviceIntents.includes(lastIntent);
  }

  /**
   * Should inherit environment from previous command?
   */
  private shouldInheritEnvironment(currentIntent?: IntentType, lastIntent?: IntentType): boolean {
    if (!currentIntent || !lastIntent) return false;

    // Environment-specific intents
    const envIntents: readonly IntentType[] = [
      'deploy', 'status', 'logs', 'rollback', 'cost'
    ];

    return envIntents.includes(currentIntent) && envIntents.includes(lastIntent);
  }

  /**
   * Should inherit provider from previous command?
   */
  private shouldInheritProvider(currentIntent?: IntentType, lastIntent?: IntentType): boolean {
    if (!currentIntent || !lastIntent) return false;

    // Provider-specific intents
    const providerIntents: readonly IntentType[] = [
      'deploy', 'connect', 'adopt'
    ];

    return providerIntents.includes(currentIntent) && providerIntents.includes(lastIntent);
  }

  /**
   * Clear conversation history
   */
  clear(): void {
    this.turns = [];
  }

  /**
   * Get conversation statistics
   */
  getStats(): {
    totalTurns: number;
    executedTurns: number;
    sessionDuration: number;
    intentsUsed: string[];
  } {
    const executedTurns = this.turns.filter(t => t.executed).length;
    const sessionDuration = Date.now() - this.sessionStarted.getTime();
    const intentsUsed = [...new Set(this.turns.map(t => t.result.intent))];

    return {
      totalTurns: this.turns.length,
      executedTurns,
      sessionDuration,
      intentsUsed
    };
  }
}
