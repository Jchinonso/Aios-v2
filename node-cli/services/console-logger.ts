/**
 * Console Logger - Production-grade console logging implementation
 *
 * Implements ILogger interface for CLI output with color-coding and structured logging.
 *
 * @fileoverview Production console logger for AIOS CLI
 * @module node-cli/services
 */

import chalk from 'chalk';
import type { ILogger, LoggerContext } from '@aios/shared';

/**
 * Log levels with corresponding console methods and colors
 */
const LOG_LEVELS = {
  trace: { color: chalk.gray, prefix: '🔍', enabled: false },
  debug: { color: chalk.blue, prefix: '🐛', enabled: false },
  info: { color: chalk.green, prefix: 'ℹ️', enabled: false },  // Disabled by default for clean UI
  warn: { color: chalk.yellow, prefix: '⚠️', enabled: true },
  error: { color: chalk.red, prefix: '❌', enabled: true }
} as const;

/**
 * Production-grade console logger for CLI applications
 *
 * Features:
 * - Structured logging with context
 * - Color-coded output
 * - Conditional debug/trace logging
 * - Error formatting with stack traces
 * - Performance tracking
 *
 * @example
 * ```typescript
 * const logger = new ConsoleLogger({ enableDebug: true });
 * logger.info('Analyzing project', { path: '/home/user/project' });
 * logger.error('Analysis failed', error, { projectPath: '/home/user/project' });
 * ```
 */
export class ConsoleLogger implements ILogger {
  private readonly enableDebug: boolean;
  private readonly enableTrace: boolean;
  private readonly namespace?: string | undefined;

  constructor(options?: {
    enableDebug?: boolean;
    enableTrace?: boolean;
    namespace?: string | undefined;
  }) {
    this.enableDebug = options?.enableDebug ?? LOG_LEVELS.debug.enabled;
    this.enableTrace = options?.enableTrace ?? false;
    this.namespace = options?.namespace || undefined;
  }

  /**
   * Log trace message (lowest priority - for detailed tracing)
   */
  trace(message: string, context?: LoggerContext): void {
    if (!this.enableTrace) return;

    this.log('trace', message, undefined, context);
  }

  /**
   * Log debug message (for development/troubleshooting)
   */
  debug(message: string, context?: LoggerContext): void {
    if (!this.enableDebug) return;

    this.log('debug', message, undefined, context);
  }

  /**
   * Log info message (standard operational messages)
   */
  info(message: string, context?: LoggerContext): void {
    this.log('info', message, undefined, context);
  }

  /**
   * Log warning message (non-critical issues)
   */
  warn(message: string, context?: LoggerContext): void {
    this.log('warn', message, undefined, context);
  }

  /**
   * Log error message (critical failures)
   */
  error(message: string, error?: Error, context?: LoggerContext): void {
    this.log('error', message, error, context);
  }

  /**
   * Internal log method with formatting and context handling
   */
  private log(
    level: keyof typeof LOG_LEVELS,
    message: string,
    error?: Error,
    context?: LoggerContext
  ): void {
    const config = LOG_LEVELS[level];
    // Skip if level is disabled (unless explicitly enabled via shouldLogLevel)
    if (!config.enabled) {
      return;
    }

    const prefix = this.namespace ? `[${this.namespace}]` : '';
    const formattedMessage = `${config.prefix}  ${prefix} ${message}`;

    // Log the main message
    console[level === 'trace' || level === 'debug' ? 'log' : level](
      config.color(formattedMessage)
    );

    // Log context if provided
    if (context && Object.keys(context).length > 0) {
      console[level === 'trace' || level === 'debug' ? 'log' : level](
        chalk.gray('   Context:'),
        this.formatContext(context)
      );
    }

    // Log error details if provided
    if (error) {
      console.error(chalk.red('   Error:'), error.message);
      if (this.enableDebug && error.stack) {
        console.error(chalk.gray('   Stack:'));
        console.error(chalk.gray(error.stack));
      }
    }
  }

  /**
   * Format context object for readable console output
   */
  private formatContext(context: LoggerContext): string {
    try {
      return JSON.stringify(context, this.jsonReplacer, 2);
    } catch (error) {
      return `[Unable to serialize context: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  /**
   * JSON replacer to handle circular references and special types
   */
  private jsonReplacer(_key: string, value: unknown): unknown {
    // Handle circular references
    if (value === null || value === undefined) {
      return value;
    }

    // Convert Error objects to serializable format
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: this.enableDebug ? value.stack : undefined
      };
    }

    // Convert Date objects to ISO strings
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }

  /**
   * Determine if level should be logged based on environment
   */
  private shouldLogLevel(level: keyof typeof LOG_LEVELS): boolean {
    if (level === 'trace') return this.enableTrace;
    if (level === 'debug') return this.enableDebug;
    return true;
  }

  /**
   * Create a child logger with a namespace
   */
  createChild(namespace: string): ConsoleLogger {
    return new ConsoleLogger({
      enableDebug: this.enableDebug,
      enableTrace: this.enableTrace,
      namespace: this.namespace ? `${this.namespace}:${namespace}` : namespace
    });
  }

  /**
   * Create a logger with performance tracking
   */
  time(label: string): () => void {
    const start = performance.now();
    this.debug(`⏱️  ${label} started`);

    return () => {
      const duration = Math.round(performance.now() - start);
      this.debug(`⏱️  ${label} completed in ${duration}ms`);
    };
  }
}

/**
 * Factory function to create a console logger
 */
export function createConsoleLogger(options?: {
  enableDebug?: boolean;
  enableTrace?: boolean;
  namespace?: string;
}): ILogger {
  return new ConsoleLogger(options);
}