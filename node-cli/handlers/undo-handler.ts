/**
 * @fileoverview Undo Command Handler for CLI
 * @module node-cli/handlers/undo-handler
 *
 * High-level handler that orchestrates:
 * 1. Natural language parsing (via NaturalLanguageUndoParser)
 * 2. Query execution (via DeploymentUndoStack)
 * 3. User confirmation for production undos
 * 4. Cloud provider rollback execution
 * 5. Result formatting and display
 *
 * @example
 * ```typescript
 * const handler = new UndoHandler(stack, parser, logger);
 *
 * // Process natural language command
 * await handler.handle('undo last deployment');
 * ```
 */

import type { ILogger } from '@aios/shared';
import type { DeploymentUndoStack } from '../services/deployment-undo-stack.js';
import type { NaturalLanguageUndoParser } from '../services/nl-undo-parser.js';
import {
  type UndoResult,
  type UndoableAction,
  type DeploymentUndoableAction,
  type ScalingUndoableAction,
  type EnvVarUndoableAction,
  UndoableActionType,
  UndoErrorCode,
  isDeploymentAction,
  isScalingAction,
  isEnvVarAction,
} from '../services/undo.types.js';

/**
 * User confirmation prompt function
 */
export type ConfirmationPrompt = (message: string) => Promise<boolean>;

/**
 * Undo handler options
 */
export interface UndoHandlerOptions {
  /** Require confirmation for production undos */
  readonly requireProductionConfirmation: boolean;

  /** Confirmation prompt function */
  readonly confirmationPrompt?: ConfirmationPrompt;

  /** Maximum actions to show in list commands */
  readonly maxListResults: number;

  /** Minimum confidence threshold for auto-execution */
  readonly minConfidenceThreshold: number;
}

/**
 * Default undo handler options
 */
const DEFAULT_UNDO_HANDLER_OPTIONS: UndoHandlerOptions = {
  requireProductionConfirmation: true,
  maxListResults: 10,
  minConfidenceThreshold: 0.8,
};

/**
 * Undo command handler result
 */
export interface UndoHandlerResult {
  /** Whether the command succeeded */
  readonly success: boolean;

  /** Human-readable message */
  readonly message: string;

  /** Detailed results (for programmatic use) */
  readonly details?: {
    readonly undoResult?: UndoResult;
    readonly actions?: readonly UndoableAction[];
    readonly parseResult?: {
      readonly confidence: number;
      readonly matchedPattern?: string;
    };
  };

  /** Error information */
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * High-level undo command handler
 *
 * Orchestrates the complete undo flow:
 * 1. Parse natural language input
 * 2. Check confidence and suggest alternatives if needed
 * 3. Query undo stack
 * 4. Confirm with user (for production)
 * 5. Execute undo
 * 6. Format and return result
 *
 * @example
 * ```typescript
 * const handler = new UndoHandler(stack, parser, logger, {
 *   requireProductionConfirmation: true,
 *   minConfidenceThreshold: 0.8,
 * });
 *
 * const result = await handler.handle('undo last deployment');
 * if (result.success) {
 *   console.log(result.message);
 * } else {
 *   console.error(result.error?.message);
 * }
 * ```
 */
export class UndoHandler {
  private readonly stack: DeploymentUndoStack;
  private readonly parser: NaturalLanguageUndoParser;
  private readonly logger: ILogger;
  private readonly options: UndoHandlerOptions;

  constructor(
    stack: DeploymentUndoStack,
    parser: NaturalLanguageUndoParser,
    logger: ILogger,
    options: Partial<UndoHandlerOptions> = {}
  ) {
    this.stack = stack;
    this.parser = parser;
    this.logger = logger;
    this.options = { ...DEFAULT_UNDO_HANDLER_OPTIONS, ...options };
  }

  /**
   * Handle undo command
   *
   * Main entry point for processing user undo commands.
   *
   * @param input - Natural language undo command
   * @returns Handler result with success/error information
   *
   * @example
   * ```typescript
   * const result = await handler.handle('undo');
   * ```
   */
  async handle(input: string): Promise<UndoHandlerResult> {
    try {
      // Step 1: Parse natural language
      this.logger.debug('Parsing undo command', { input });
      const parseResult = this.parser.parse(input);

      this.logger.debug('Parse result', {
        confidence: parseResult.confidence,
        queryType: parseResult.query.type,
        matchedPattern: parseResult.matchedPattern,
      });

      // Step 2: Check confidence
      if (parseResult.confidence < this.options.minConfidenceThreshold) {
        this.logger.warn('Low confidence parse', {
          confidence: parseResult.confidence,
          threshold: this.options.minConfidenceThreshold,
        });

        return {
          success: false,
          message: `I'm not sure what you want to undo. Did you mean:\n${parseResult.suggestions?.map(s => `  - ${s}`).join('\n')}`,
          details: {
            parseResult: {
              confidence: parseResult.confidence,
              matchedPattern: parseResult.matchedPattern,
            },
          },
          error: {
            code: 'LOW_CONFIDENCE',
            message: 'Ambiguous undo command',
          },
        };
      }

      // Step 3: Execute query
      const queryResult = this.stack.query(parseResult.query);

      // Step 4: Show list or execute undo
      if (parseResult.query.type === 'all') {
        // List command - show undoable actions (handles empty results gracefully)
        return this.formatListResult(queryResult.actions, queryResult.hasMore);
      }

      // Step 5: Handle empty results for undo commands
      if (queryResult.actions.length === 0) {
        return {
          success: false,
          message: 'No undoable actions found matching your query.',
          details: { actions: [] },
          error: {
            code: UndoErrorCode.STACK_EMPTY,
            message: 'No actions to undo',
          },
        };
      }

      // Step 6: Execute undo with confirmation
      const actionToUndo = queryResult.actions[0]!;
      return await this.executeUndo(actionToUndo);
    } catch (error) {
      this.logger.error('Undo handler error', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        message: `Failed to process undo command: ${error instanceof Error ? error.message : String(error)}`,
        error: {
          code: 'HANDLER_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Execute undo with confirmation
   */
  private async executeUndo(action: UndoableAction): Promise<UndoHandlerResult> {
    // Check if confirmation is required
    if (
      this.options.requireProductionConfirmation &&
      action.environment === 'production' &&
      this.options.confirmationPrompt
    ) {
      const confirmed = await this.confirmUndo(action);

      if (!confirmed) {
        this.logger.info('User cancelled undo', { actionId: action.id });

        return {
          success: false,
          message: 'Undo cancelled by user.',
          error: {
            code: UndoErrorCode.USER_CANCELLED,
            message: 'User cancelled the operation',
          },
        };
      }
    }

    // Execute undo
    this.logger.info('Executing undo', {
      actionId: action.id,
      type: action.type,
      environment: action.environment,
    });

    const undoResult = await this.stack.undo(action.id);

    if (undoResult.success) {
      return {
        success: true,
        message: this.formatSuccessMessage(action, undoResult),
        details: {
          undoResult,
          actions: [action],
        },
      };
    } else {
      return {
        success: false,
        message: `Failed to undo: ${undoResult.error?.message || 'Unknown error'}`,
        details: {
          undoResult,
          actions: [action],
        },
        error: undoResult.error,
      };
    }
  }

  /**
   * Confirm undo with user
   */
  private async confirmUndo(action: UndoableAction): Promise<boolean> {
    if (!this.options.confirmationPrompt) {
      return true;
    }

    const message = this.formatConfirmationMessage(action);
    return await this.options.confirmationPrompt(message);
  }

  /**
   * Format confirmation message
   */
  private formatConfirmationMessage(action: UndoableAction): string {
    const lines = [
      `⚠️  You are about to undo a ${action.environment.toUpperCase()} action:`,
      '',
      `  Type: ${action.type}`,
      `  Description: ${action.description}`,
      `  Time: ${new Date(action.timestamp).toLocaleString()}`,
      '',
    ];

    // Add action-specific details
    if (isDeploymentAction(action)) {
      lines.push(`  Will rollback from: ${action.afterState.version}`);
      if (action.beforeState.version) {
        lines.push(`              to: ${action.beforeState.version}`);
      }
      lines.push(`  Provider: ${action.provider}`);
      lines.push(`  Project: ${action.projectName}`);
    } else if (isScalingAction(action)) {
      lines.push(`  Will scale from: ${action.afterState.replicas} replicas`);
      lines.push(`              to: ${action.beforeState.replicas} replicas`);
    } else if (isEnvVarAction(action)) {
      lines.push(`  Will restore ${action.beforeState.variables.size} environment variables`);
    }

    lines.push('');
    lines.push('Do you want to proceed?');

    return lines.join('\n');
  }

  /**
   * Format success message
   */
  private formatSuccessMessage(action: UndoableAction, result: UndoResult): string {
    const lines = [
      `✅ Successfully undid ${action.type} action`,
      '',
      `  ${action.description}`,
      '',
    ];

    if (result.rollbackDetails) {
      lines.push('Rollback details:');
      if (result.rollbackDetails.previousVersion) {
        lines.push(`  Previous version: ${result.rollbackDetails.previousVersion}`);
      }
      if (result.rollbackDetails.currentVersion) {
        lines.push(`  Current version: ${result.rollbackDetails.currentVersion}`);
      }
      lines.push(`  Rollback time: ${new Date(result.rollbackDetails.rollbackTime).toLocaleString()}`);
    }

    return lines.join('\n');
  }

  /**
   * Format list result
   */
  private formatListResult(
    actions: readonly UndoableAction[],
    hasMore: boolean
  ): UndoHandlerResult {
    if (actions.length === 0) {
      return {
        success: true,
        message: 'No undoable actions found.',
        details: { actions: [] },
      };
    }

    const lines = [
      '📋 Undoable actions:',
      '',
    ];

    actions.forEach((action, index) => {
      const timeAgo = this.formatTimeAgo(new Date(action.timestamp));
      lines.push(`${index + 1}. [${action.type}] ${action.description}`);
      lines.push(`   Environment: ${action.environment}`);
      lines.push(`   Time: ${timeAgo}`);

      if (isDeploymentAction(action)) {
        lines.push(`   Provider: ${action.provider} | Project: ${action.projectName}`);
      } else if (isScalingAction(action)) {
        lines.push(`   Service: ${action.serviceName}`);
      }

      lines.push('');
    });

    if (hasMore) {
      lines.push(`... and more (showing ${actions.length})`);
    }

    lines.push('');
    lines.push('To undo an action, use:');
    lines.push('  - "undo" (for most recent)');
    lines.push('  - "undo deployment" (for specific type)');
    lines.push('  - "undo 5 minutes ago" (by time)');

    return {
      success: true,
      message: lines.join('\n'),
      details: { actions },
    };
  }

  /**
   * Format time ago (e.g., "5 minutes ago")
   */
  private formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}
