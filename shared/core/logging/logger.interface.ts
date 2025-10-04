/**
 * Logger Interface - Abstraction for logging operations
 */

export interface LoggerContext {
  readonly [key: string]: unknown;
}

export interface ILogger {
  debug(message: string, context?: LoggerContext): void;
  info(message: string, context?: LoggerContext): void;
  warn(message: string, context?: LoggerContext): void;
  error(message: string, error?: Error, context?: LoggerContext): void;
  trace(message: string, context?: LoggerContext): void;
}
