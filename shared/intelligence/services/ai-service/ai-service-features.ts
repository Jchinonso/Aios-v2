/**
 * @fileoverview AI Service Features - Composable Enterprise Features
 * 
 * This module provides composable enterprise features that can be enabled/disabled
 * based on configuration, eliminating code duplication and enabling clean architecture.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { ILogger } from '../../../core/logging/logger.interface.js';
// import type { IMetricsCollector } from '../../../core/metrics/metrics.interface.js';
import type { RateLimitConfig, CircuitBreakerConfig, RetryConfig, SanitizationConfig } from './ai-service-config.js';

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private readonly requestCounts = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private readonly config: RateLimitConfig,
    private readonly logger: ILogger
  ) {}

  checkLimit(provider: string): boolean {
    const now = Date.now();
    const requestCount = this.requestCounts.get(provider) || { count: 0, resetTime: now + this.config.windowMs };

    // Reset counter if window has passed
    if (now > requestCount.resetTime) {
      this.requestCounts.set(provider, { count: 1, resetTime: now + this.config.windowMs });
      return true;
    }

    // Check if limit exceeded
    if (requestCount.count >= this.config.maxRequests) {
      this.logger.warn('Rate limit exceeded', { provider, count: requestCount.count, limit: this.config.maxRequests });
      return false;
    }

    // Increment counter
    requestCount.count++;
    this.requestCounts.set(provider, requestCount);
    return true;
  }

  getRemainingRequests(provider: string): number {
    const requestCount = this.requestCounts.get(provider);
    if (!requestCount) return this.config.maxRequests;
    
    const now = Date.now();
    if (now > requestCount.resetTime) return this.config.maxRequests;
    
    return Math.max(0, this.config.maxRequests - requestCount.count);
  }
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private readonly state = new Map<string, {
    failures: number;
    lastFailureTime: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    halfOpenCalls: number;
  }>();

  constructor(
    private readonly config: CircuitBreakerConfig,
    private readonly logger: ILogger
  ) {}

  isOpen(provider: string): boolean {
    const state = this.state.get(provider) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' as const,
      halfOpenCalls: 0
    };

    const now = Date.now();

    // If circuit is open, check if recovery time has passed
    if (state.state === 'OPEN') {
      if (now - state.lastFailureTime > this.config.recoveryTimeoutMs) {
        state.state = 'HALF_OPEN';
        state.halfOpenCalls = 0;
        this.state.set(provider, state);
        this.logger.info('Circuit breaker transitioning to HALF_OPEN', { provider });
        return false;
      }
      return true;
    }

    // If half-open, check call limit
    if (state.state === 'HALF_OPEN') {
      if (state.halfOpenCalls >= (this.config.halfOpenMaxCalls || 3)) {
        return true;
      }
    }

    return false;
  }

  recordSuccess(provider: string): void {
    const state = this.state.get(provider) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' as const,
      halfOpenCalls: 0
    };

    // Reset failure count and close circuit breaker
    state.failures = 0;
    state.state = 'CLOSED';
    state.halfOpenCalls = 0;
    this.state.set(provider, state);
  }

  recordFailure(provider: string, error: Error): void {
    const state = this.state.get(provider) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' as const,
      halfOpenCalls: 0
    };

    state.failures++;
    state.lastFailureTime = Date.now();

    // Open circuit breaker if failure threshold is reached
    if (state.failures >= this.config.failureThreshold) {
      state.state = 'OPEN';
      this.logger.error('Circuit breaker opened', error);
    }

    this.state.set(provider, state);
  }

  getState(provider: string): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state.get(provider)?.state || 'CLOSED';
  }
}

/**
 * Retry handler implementation
 */
export class RetryHandler {
  constructor(
    private readonly config: RetryConfig,
    private readonly logger: ILogger
  ) {}

  async execute<T>(operation: () => Promise<T>, context: string = 'operation'): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.config.maxRetries + 1 || !this.isRetryableError(lastError)) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt);
        this.logger.warn(`Retrying ${context}, attempt ${attempt}/${this.config.maxRetries + 1}`, {
          context,
          attempt,
          delay,
          error: lastError.message
        });

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private isRetryableError(error: Error): boolean {
    return this.config.retryableErrors.some(retryableError => 
      error.message.includes(retryableError) || error.name === retryableError
    );
  }

  private calculateDelay(attempt: number): number {
    if (!this.config.exponentialBackoff) {
      return this.config.baseDelayMs;
    }

    const delay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Input sanitizer implementation
 */
export class InputSanitizer {
  constructor(
    private readonly config: SanitizationConfig,
    private readonly logger: ILogger
  ) {}

  sanitize(content: string): string {
    if (!content) return '';

    let sanitized = content;

    // Remove script tags
    if (this.config.removeScriptTags) {
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    // Remove javascript: protocols
    if (this.config.removeJavaScriptProtocols) {
      sanitized = sanitized.replace(/javascript:/gi, '');
    }

    // Remove data: URLs with javascript
    if (this.config.removeDataUrls) {
      sanitized = sanitized.replace(/data:text\/html,.*javascript.*/gi, '');
    }

    // Normalize whitespace
    if (this.config.normalizeWhitespace) {
      sanitized = sanitized.replace(/\s+/g, ' ');
    }

    // Enforce max length
    if (sanitized.length > this.config.maxLength) {
      sanitized = sanitized.substring(0, this.config.maxLength);
      this.logger.warn('Content truncated due to length limit', { 
        originalLength: content.length, 
        maxLength: this.config.maxLength 
      });
    }

    return sanitized.trim();
  }
}

/**
 * Timeout handler implementation
 */
export class TimeoutHandler {
  constructor(
    private readonly defaultTimeout: number,
    private readonly logger: ILogger
  ) {}

  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = this.defaultTimeout,
    context: string = 'operation'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${context} timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        this.logger.error('Operation timed out');
      }
      throw error;
    }
  }
}

/**
 * Security validator implementation
 */
export class SecurityValidator {
  constructor() {}

  validateInput(content: string, maxLength: number, minLength: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content || typeof content !== 'string') {
      errors.push('Content is required and must be a string');
    } else {
      if (content.trim().length < minLength) {
        errors.push(`Content must be at least ${minLength} character(s) long`);
      }
      if (content.length > maxLength) {
        errors.push(`Content must be no more than ${maxLength} characters long`);
      }
    }

    // Check for potential security issues
    if (content.includes('<script') || content.includes('javascript:')) {
      errors.push('Content contains potentially unsafe elements');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateProvider(provider: string, allowedProviders: readonly string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!provider || typeof provider !== 'string') {
      errors.push('Provider is required and must be a string');
    } else if (!allowedProviders.includes(provider)) {
      errors.push(`Provider '${provider}' is not allowed. Allowed providers: ${allowedProviders.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
