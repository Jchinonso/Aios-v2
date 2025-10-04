/**
 * Logger utility - Following SOLID principles
 * SRP: Single responsibility for logging functionality
 * DIP: Depends on abstractions
 */

import type { LogLevel } from '../types/common.types.js';
import type { LoggerContext } from '../core/logging/logger.interface.js';

export interface ILogger {
  debug(message: string, context?: LoggerContext): void;
  info(message: string, context?: LoggerContext): void;
  warn(message: string, context?: LoggerContext): void;
  error(message: string, error?: Error, context?: LoggerContext): void;
  trace(message: string, context?: LoggerContext): void;
}

export class Logger implements ILogger {
  private readonly level: LogLevel;
  private readonly service: string;

  constructor(service: string, level: LogLevel = 'warn') {  // Changed to 'warn' for clean UI
    this.service = service;
    this.level = level;
  }

  debug(message: string, context?: LoggerContext): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: LoggerContext): void {
    if (this.shouldLog('info')) {
      this.log('info', message, context);
    }
  }

  warn(message: string, context?: LoggerContext): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, context);
    }
  }

  error(message: string, error?: Error, context?: LoggerContext): void {
    if (this.shouldLog('error')) {
      this.log('error', message, { ...context, error: error?.stack });
    }
  }

  trace(message: string, context?: LoggerContext): void {
    if (this.shouldLog('trace')) {
      this.log('trace', message, context);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      trace: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4,
    };
    return levels[level] >= levels[this.level];
  }

  private log(level: LogLevel, message: string, context?: LoggerContext): void {
    // Use clean CLI-friendly format instead of JSON
    const emoji = {
      trace: '🔍',
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[level];

    const contextStr = context && Object.keys(context).length > 0
      ? ` ${JSON.stringify(context)}`
      : '';

    console.log(`${emoji}  [${this.service}] ${message}${contextStr}`);
  }
}

export const createLogger = (service: string, level?: LogLevel): ILogger => {
  return new Logger(service, level);
};