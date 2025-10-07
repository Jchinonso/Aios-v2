/**
 * @fileoverview Natural Language Undo Parser
 * @module node-cli/services/nl-undo-parser
 *
 * Parses natural language commands into structured undo queries:
 * - "undo" → LAST query
 * - "undo deployment" → LAST_OF_TYPE query
 * - "undo 5 minutes ago" → BY_TIME query
 * - "what can I undo?" → ALL query with suggestions
 *
 * Uses pattern matching with confidence scoring for ambiguous input.
 *
 * @example
 * ```typescript
 * const parser = new NaturalLanguageUndoParser();
 *
 * // Simple undo
 * const result = parser.parse('undo');
 * // { query: { type: UndoQueryType.LAST }, confidence: 1.0 }
 *
 * // Type-specific undo
 * const result = parser.parse('undo the deployment');
 * // { query: { type: UndoQueryType.LAST_OF_TYPE, actionType: 'deploy' }, confidence: 0.9 }
 *
 * // Time-based undo
 * const result = parser.parse('undo what I did 10 minutes ago');
 * // { query: { type: UndoQueryType.BY_TIME, timeAgo: 600000 }, confidence: 0.85 }
 * ```
 */

import {
  type UndoQuery,
  UndoQueryType,
  UndoableActionType,
} from './undo.types.js';

/**
 * Parsed undo command result
 */
export interface UndoParseResult {
  /** The structured query */
  readonly query: UndoQuery;

  /** Confidence score (0-1) */
  readonly confidence: number;

  /** Matched pattern for debugging */
  readonly matchedPattern?: string;

  /** Suggested alternatives for low-confidence matches */
  readonly suggestions?: readonly string[];

  /** Human-readable explanation of what will be undone */
  readonly explanation?: string;
}

/**
 * Pattern definition for matching natural language
 */
interface UndoPattern {
  /** Regex pattern */
  readonly pattern: RegExp;

  /** Query builder function */
  readonly buildQuery: (matches: RegExpMatchArray) => UndoQuery;

  /** Confidence score for this pattern */
  readonly confidence: number;

  /** Description of what this pattern matches */
  readonly description: string;

  /** Example inputs that match this pattern */
  readonly examples: readonly string[];
}

/**
 * Natural language parser for undo commands
 *
 * Design decisions:
 * 1. **Pattern-based matching**: Regex patterns with confidence scoring
 * 2. **Ambiguity handling**: Suggest alternatives for low-confidence matches
 * 3. **Time parsing**: Support "5 minutes ago", "1 hour ago", etc.
 * 4. **Type recognition**: Map "deployment", "scaling", "env" to action types
 * 5. **Extensibility**: Easy to add new patterns
 *
 * @example
 * ```typescript
 * const parser = new NaturalLanguageUndoParser();
 *
 * const result = parser.parse('undo last deployment');
 * if (result.confidence > 0.8) {
 *   // Execute query
 * } else {
 *   // Show suggestions
 *   console.log('Did you mean:', result.suggestions);
 * }
 * ```
 */
export class NaturalLanguageUndoParser {
  private readonly patterns: readonly UndoPattern[];

  constructor() {
    this.patterns = this.initializePatterns();
  }

  /**
   * Parse natural language command into structured query
   *
   * @param input - User's natural language command
   * @returns Parse result with query and confidence
   *
   * @example
   * ```typescript
   * const result = parser.parse('undo');
   * // { query: { type: UndoQueryType.LAST }, confidence: 1.0 }
   * ```
   */
  parse(input: string): UndoParseResult {
    // Normalize: lowercase, trim, remove non-alphanumeric (except spaces and dashes)
    const normalized = input.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();

    // Try each pattern in order (highest confidence first)
    for (const pattern of this.patterns) {
      const match = normalized.match(pattern.pattern);
      if (match) {
        const query = pattern.buildQuery(match);
        return {
          query,
          confidence: pattern.confidence,
          matchedPattern: pattern.description,
          explanation: this.generateExplanation(query),
        };
      }
    }

    // No match found - suggest alternatives
    return {
      query: { type: UndoQueryType.ALL, maxResults: 5 },
      confidence: 0.0,
      suggestions: this.generateSuggestions(),
      explanation: 'Showing recent undoable actions',
    };
  }

  /**
   * Check if input is an undo-related command
   *
   * @param input - User's input
   * @returns True if input mentions undo/rollback/revert
   *
   * @example
   * ```typescript
   * parser.isUndoCommand('please undo that'); // true
   * parser.isUndoCommand('deploy to production'); // false
   * ```
   */
  isUndoCommand(input: string): boolean {
    const normalized = input.trim().toLowerCase();
    return /\b(undo|rollback|revert|cancel|undo-able|undoable)\b/.test(normalized);
  }

  /**
   * Initialize pattern definitions
   * Ordered by specificity (most specific first)
   */
  private initializePatterns(): UndoPattern[] {
    return [
      // "what can I undo?" / "show undo history"
      {
        pattern: /^(what|show|list|view)\s+(can\s+i\s+)?(undo|undoable|undo-able|history)/,
        buildQuery: () => ({ type: UndoQueryType.ALL, maxResults: 10 }),
        confidence: 1.0,
        description: 'list all undoable actions',
        examples: ['what can I undo?', 'show undo history', 'list undoable actions'],
      },

      // "undo 5 minutes ago"
      {
        pattern: /^undo\s+(?:what\s+i\s+did\s+)?(\d+)\s+(second|minute|hour|day)s?\s+ago/,
        buildQuery: (matches) => {
          const amount = parseInt(matches[1]!, 10);

          // Validate amount
          if (isNaN(amount) || amount <= 0) {
            throw new Error('Time amount must be a positive number');
          }

          const unit = matches[2]!;
          const timeAgo = this.parseTimeAmount(amount, unit);

          // Enforce reasonable max (30 days)
          const MAX_TIME_AGO = 30 * 24 * 60 * 60 * 1000;
          if (timeAgo > MAX_TIME_AGO) {
            throw new Error(`Time range too large (max 30 days). You specified ${amount} ${unit}(s).`);
          }

          return { type: UndoQueryType.BY_TIME, timeAgo };
        },
        confidence: 0.9,
        description: 'undo by time',
        examples: ['undo 5 minutes ago', 'undo what I did 1 hour ago'],
      },

      // "undo the deployment" / "undo last deployment"
      {
        pattern: /^undo\s+(?:the\s+|last\s+)?(deployment|deploy|scaling|scale|env|environment)/,
        buildQuery: (matches) => {
          const actionType = this.parseActionType(matches[1]!);
          return { type: UndoQueryType.LAST_OF_TYPE, actionType };
        },
        confidence: 0.95,
        description: 'undo last action of type',
        examples: ['undo deployment', 'undo the scaling', 'undo last env change'],
      },

      // "undo" / "undo last" / "undo that"
      {
        pattern: /^undo(?:\s+(?:last|that|it|this|the\s+last|the\s+previous))?$/,
        buildQuery: () => ({ type: UndoQueryType.LAST }),
        confidence: 1.0,
        description: 'undo last action',
        examples: ['undo', 'undo last', 'undo that', 'undo it'],
      },

      // "rollback" / "revert"
      {
        pattern: /^(rollback|revert)(?:\s+(?:last|that|it|this))?$/,
        buildQuery: () => ({ type: UndoQueryType.LAST }),
        confidence: 0.95,
        description: 'rollback last action',
        examples: ['rollback', 'revert', 'rollback last'],
      },

      // "cancel deployment" / "cancel last action"
      {
        pattern: /^cancel\s+(?:the\s+)?(last\s+)?(deployment|action|change)/,
        buildQuery: () => ({ type: UndoQueryType.LAST }),
        confidence: 0.9,
        description: 'cancel last action',
        examples: ['cancel deployment', 'cancel last action'],
      },

      // "undo to production" (environment-specific)
      {
        pattern: /^undo\s+(?:in\s+|to\s+)?(production|staging|development)/,
        buildQuery: (matches) => {
          const environment = matches[1] as 'production' | 'staging' | 'development';
          return { type: UndoQueryType.ALL, environment, maxResults: 10 };
        },
        confidence: 0.85,
        description: 'undo in specific environment',
        examples: ['undo in production', 'undo to staging'],
      },
    ];
  }

  /**
   * Parse action type from natural language
   */
  private parseActionType(input: string): UndoableActionType {
    const normalized = input.toLowerCase();

    if (/deploy/i.test(normalized)) {
      return UndoableActionType.DEPLOY;
    }

    if (/scal/i.test(normalized)) {
      return UndoableActionType.SCALE;
    }

    if (/env/i.test(normalized)) {
      return UndoableActionType.SET_ENV;
    }

    // Default to deployment (most common)
    return UndoableActionType.DEPLOY;
  }

  /**
   * Parse time amount into milliseconds
   *
   * @throws {Error} If unit is unknown
   */
  private parseTimeAmount(amount: number, unit: string): number {
    const multipliers: Record<string, number> = {
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    };

    const multiplier = multipliers[unit];

    if (multiplier === undefined) {
      throw new Error(`Unknown time unit: ${unit}. Supported units: ${Object.keys(multipliers).join(', ')}`);
    }

    return amount * multiplier;
  }

  /**
   * Generate human-readable explanation of query
   */
  private generateExplanation(query: UndoQuery): string {
    switch (query.type) {
      case UndoQueryType.LAST:
        return 'Will undo the last action';

      case UndoQueryType.LAST_OF_TYPE:
        return `Will undo the last ${query.actionType} action`;

      case UndoQueryType.BY_TIME:
        return `Will show actions from the last ${this.formatTimeAgo(query.timeAgo || 0)}`;

      case UndoQueryType.ALL:
        if (query.environment) {
          return `Showing undoable actions in ${query.environment}`;
        }
        return 'Showing all undoable actions';

      case UndoQueryType.BY_ID:
        return `Will undo action ${query.actionId}`;

      default:
        return 'Unknown query type';
    }
  }

  /**
   * Format time duration for display
   */
  private formatTimeAgo(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  /**
   * Generate suggestions for unrecognized input
   */
  private generateSuggestions(): readonly string[] {
    return [
      'undo',
      'undo last deployment',
      'undo 5 minutes ago',
      'what can I undo?',
    ];
  }

  /**
   * Get all example patterns for help text
   */
  getAllExamples(): readonly { description: string; examples: readonly string[] }[] {
    return this.patterns.map(p => ({
      description: p.description,
      examples: p.examples,
    }));
  }
}
