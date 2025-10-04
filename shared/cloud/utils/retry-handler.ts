/**
 * @fileoverview Production-Grade Retry Handler - Comprehensive retry mechanism for cloud operations
 * @description Advanced retry strategies with exponential backoff, decorrelated jitter,
 * circuit breaker patterns, intelligent error classification, and comprehensive observability
 * for handling transient failures in cloud operations.
 *
 * Features:
 * - Multiple backoff strategies: exponential, linear, constant, decorrelated jitter
 * - Circuit breaker pattern with volumetric failure tracking
 * - Intelligent error classification (retryable/non-retryable/fatal)
 * - Abort controller support for cancellation
 * - Comprehensive observability (metrics, logging, tracing)
 * - Memory leak prevention and resource cleanup
 * - Concurrent retry limiting
 * - Idempotency key generation
 * - Operation and total timeout management
 *
 * @version 3.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import type { CloudError } from './error-handler.js'
import {
  createLogger,
  type ILogger,
} from '../../utils/logger.js';

/**
 * Retry strategy types
 * @enum {string}
 */
export enum RetryStrategy {
  /** Fixed/constant delay between retries */
  CONSTANT = 'constant',
  /** Exponential backoff with optional jitter */
  EXPONENTIAL = 'exponential',
  /** Linear increase in delay */
  LINEAR = 'linear',
  /** AWS-recommended decorrelated jitter algorithm */
  DECORRELATED = 'decorrelated',
  /** Custom delay function */
  CUSTOM = 'custom',
}

/**
 * Error classification types for intelligent retry decisions
 * @enum {string}
 */
export enum ErrorClassification {
  /** Error is retryable (transient failures) */
  RETRYABLE = 'retryable',
  /** Error is not retryable (client errors) */
  NON_RETRYABLE = 'non_retryable',
  /** Error is fatal (authentication, quota, etc.) */
  FATAL = 'fatal',
}

/**
 * Retry metrics for observability
 * @interface RetryMetrics
 */
export interface RetryMetrics {
  /** Total number of operations attempted */
  totalOperations: number;
  /** Number of successful operations */
  successfulOperations: number;
  /** Number of failed operations */
  failedOperations: number;
  /** Total retry attempts across all operations */
  totalRetries: number;
  /** Average retry count per operation */
  averageRetriesPerOperation: number;
  /** Latency percentiles in milliseconds */
  latencyPercentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  /** Failure rate (0-1) */
  failureRate: number;
  /** Retry budget remaining (0-1) */
  retryBudget: number;
}

/**
 * Retry configuration interface with comprehensive options
 * @interface RetryConfig
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  readonly maxAttempts: number;

  /** Base delay in milliseconds (default: 1000) */
  readonly baseDelay: number;

  /** Maximum delay cap in milliseconds (default: 30000) */
  readonly maxDelay: number;

  /** Retry strategy to use (default: EXPONENTIAL) */
  readonly strategy: RetryStrategy;

  /** Jitter factor (0-1) for exponential backoff (default: 0.1) */
  readonly jitter?: number;

  /** Multiplier for exponential backoff (default: 2) */
  readonly multiplier?: number;

  /** Custom delay function for CUSTOM strategy */
  readonly customDelayFn?: (attempt: number, baseDelay: number, previousDelay?: number) => number;

  /** Function to determine if error is retryable (overrides default classification) */
  readonly shouldRetry?: (error: CloudError | Error, attempt: number) => boolean;

  /** Callback invoked before each retry attempt with delay information */
  readonly onRetry?: (attempt: number, error: CloudError | Error, nextDelay: number) => void | Promise<void>;

  /** Callback invoked when all retries are exhausted */
  readonly onFailure?: (attempts: number, lastError: CloudError | Error, totalDuration: number) => void | Promise<void>;

  /** Callback invoked on successful operation */
  readonly onSuccess?: (attempts: number, result: any, totalDuration: number) => void | Promise<void>;

  /** Maximum total timeout for all attempts in milliseconds */
  readonly totalTimeout?: number;

  /** Timeout for individual operation execution in milliseconds */
  readonly operationTimeout?: number;

  /** Circuit breaker configuration */
  readonly circuitBreaker?: CircuitBreakerConfig;

  /** Enable detailed logging (default: false) */
  readonly enableDetailedLogging?: boolean;

  /** Maximum concurrent retry operations (default: unlimited) */
  readonly maxConcurrentRetries?: number;

  /** Generate idempotency key for safe retries */
  readonly generateIdempotencyKey?: () => string;

  /** Retry budget percentage (0-1) to prevent retry storms (default: 0.1 = 10%) */
  readonly retryBudget?: number;

  /** Abort signal for cancellation support */
  readonly signal?: AbortSignal;
}

/**
 * Retry attempt result with comprehensive details
 * @interface RetryAttempt
 */
export interface RetryAttempt {
  /** Attempt number (1-based) */
  readonly attempt: number;

  /** Delay before this attempt in milliseconds */
  readonly delay: number;

  /** Timestamp when the attempt started */
  readonly timestamp: Date;

  /** Duration of this attempt in milliseconds */
  readonly duration?: number;

  /** Error from this attempt (if any) */
  readonly error?: CloudError | Error;

  /** Error classification for this attempt */
  readonly errorClassification?: ErrorClassification;

  /** Whether this was the final attempt */
  readonly final: boolean;

  /** Idempotency key used for this attempt */
  readonly idempotencyKey?: string;

  /** Whether operation was aborted */
  readonly aborted?: boolean;
}

/**
 * Comprehensive retry result interface
 * @interface RetryResult
 * @template T The type of the operation result
 */
export interface RetryResult<T> {
  /** Whether the operation ultimately succeeded */
  readonly success: boolean;

  /** Result value if successful */
  readonly result?: T;

  /** Final error if failed */
  readonly error?: CloudError | Error;

  /** Total number of attempts made */
  readonly attempts: number;

  /** Total time elapsed across all attempts in milliseconds */
  readonly totalDuration: number;

  /** Details of each attempt for observability */
  readonly attemptHistory: RetryAttempt[];

  /** Circuit breaker state at completion */
  readonly circuitBreakerState?: CircuitState;

  /** Whether operation was aborted */
  readonly aborted?: boolean;

  /** Retry budget consumed (0-1) */
  readonly retryBudgetConsumed?: number;
}

/**
 * Circuit breaker states
 * @enum {string}
 */
export enum CircuitState {
  /** Normal operation - requests flow through */
  CLOSED = 'CLOSED',
  /** Failing state - requests are rejected */
  OPEN = 'OPEN',
  /** Testing recovery - limited requests allowed */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration with volumetric failure tracking
 * @interface CircuitBreakerConfig
 */
export interface CircuitBreakerConfig {
  /**
   * Number of consecutive failures required to trip the circuit (default: 5)
   * When failure rate exceeds threshold within volume window, circuit opens
   */
  readonly failureThreshold: number;

  /**
   * Number of successful requests in HALF_OPEN state to close circuit (default: 2)
   * Prevents premature closure during recovery
   */
  readonly successThreshold: number;

  /**
   * Time in milliseconds before transitioning from OPEN to HALF_OPEN (default: 60000)
   * Allows downstream services time to recover
   */
  readonly timeout: number;

  /**
   * Minimum number of requests before calculating failure rate (default: 10)
   * Prevents premature circuit opening from small sample sizes
   */
  readonly volumeThreshold: number;

  /**
   * Time window in milliseconds for tracking request volume (default: 60000)
   * Only requests within this window count toward volume threshold
   */
  readonly volumeWindow?: number;

  /**
   * Failure rate percentage (0-1) to trigger circuit opening (default: 0.5)
   * Used in conjunction with volumeThreshold
   */
  readonly failureRateThreshold?: number;
}

/**
 * Request record for volumetric tracking
 * @interface RequestRecord
 */
interface RequestRecord {
  timestamp: number;
  success: boolean;
}

/**
 * Production-grade Circuit Breaker with volumetric failure tracking
 * Prevents cascade failures by stopping requests to failing services
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Service is failing, requests are rejected immediately
 * - HALF_OPEN: Testing recovery, limited requests allowed
 *
 * @class CircuitBreaker
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private lastStateChangeTime: number = Date.now();
  private readonly requestHistory: RequestRecord[] = [];
  private readonly logger: ILogger;
  private cleanupTimer?: NodeJS.Timeout | undefined;

  constructor(
    private readonly config: CircuitBreakerConfig,
    private readonly name: string = 'CircuitBreaker'
  ) {
    this.logger = createLogger(`CircuitBreaker:${name}`);

    // Setup periodic cleanup of old request records to prevent memory leaks
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldRequests();
    }, (config.volumeWindow || 60000) / 2);
  }

  /**
   * Execute operation through circuit breaker with volumetric failure tracking
   * @template T The return type of the operation
   * @param {Function} operation - Async operation to execute
   * @returns {Promise<T>} Operation result
   * @throws {Error} If circuit is OPEN or operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        const elapsed = Date.now() - this.lastStateChangeTime;
        const remaining = this.config.timeout - elapsed;
        throw new Error(
          `Circuit breaker is OPEN for ${this.name}. ` +
          `Retry in ${Math.ceil(remaining / 1000)}s. ` +
          `Failure rate: ${this.getFailureRate().toFixed(2)}`
        );
      }
    }

    const startTime = Date.now();
    try {
      const result = await operation();
      this.recordSuccess(startTime);
      return result;
    } catch (error) {
      this.recordFailure(startTime);
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   * @returns {CircuitState} Current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker metrics
   * @returns {object} Metrics including failure rate and request volume
   */
  getMetrics(): {
    state: CircuitState;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    requestVolume: number;
    failureRate: number;
    lastStateChange: number;
  } {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      requestVolume: this.getRequestVolume(),
      failureRate: this.getFailureRate(),
      lastStateChange: this.lastStateChangeTime,
    };
  }

  /**
   * Reset circuit breaker to CLOSED state
   * Use with caution - typically for administrative override
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastStateChangeTime = Date.now();
    this.requestHistory.length = 0;
    this.logger.info('Circuit breaker manually reset to CLOSED state');
  }

  /**
   * Clean up resources (timers, etc.) to prevent memory leaks
   */
  destroy(): void {
    if (this.cleanupTimer !== undefined) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.requestHistory.length = 0;
  }

  /**
   * Check if enough time has elapsed to attempt reset from OPEN to HALF_OPEN
   * @private
   */
  private shouldAttemptReset(): boolean {
    const elapsed = Date.now() - this.lastStateChangeTime;
    return elapsed >= this.config.timeout;
  }

  /**
   * Transition circuit breaker to HALF_OPEN state
   * @private
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.consecutiveSuccesses = 0;
    this.lastStateChangeTime = Date.now();
    this.logger.info('Circuit breaker transitioned to HALF_OPEN, attempting recovery');
  }

  /**
   * Record successful operation
   * @private
   */
  private recordSuccess(timestamp: number): void {
    this.requestHistory.push({ timestamp, success: true });
    this.consecutiveFailures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.lastStateChangeTime = Date.now();
        this.logger.info('Circuit breaker CLOSED after successful recovery', {
          consecutiveSuccesses: this.consecutiveSuccesses,
          threshold: this.config.successThreshold,
        });
      }
    }
  }

  /**
   * Record failed operation and check if circuit should open
   * @private
   */
  private recordFailure(timestamp: number): void {
    this.requestHistory.push({ timestamp, success: false });
    this.consecutiveFailures++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Immediate transition back to OPEN on failure during recovery
      this.state = CircuitState.OPEN;
      this.consecutiveSuccesses = 0;
      this.lastStateChangeTime = Date.now();
      this.logger.warn('Circuit breaker OPEN after failure during HALF_OPEN recovery');
      return;
    }

    // Check volumetric failure rate
    const volume = this.getRequestVolume();
    const failureRate = this.getFailureRate();
    const failureRateThreshold = this.config.failureRateThreshold || 0.5;

    // Open circuit if:
    // 1. Consecutive failures exceed threshold, OR
    // 2. Volume threshold met AND failure rate exceeds threshold
    if (
      this.consecutiveFailures >= this.config.failureThreshold ||
      (volume >= this.config.volumeThreshold && failureRate >= failureRateThreshold)
    ) {
      this.state = CircuitState.OPEN;
      this.lastStateChangeTime = Date.now();
      this.logger.warn('Circuit breaker OPEN due to failure threshold exceeded', {
        consecutiveFailures: this.consecutiveFailures,
        failureThreshold: this.config.failureThreshold,
        requestVolume: volume,
        volumeThreshold: this.config.volumeThreshold,
        failureRate: failureRate.toFixed(2),
        failureRateThreshold: failureRateThreshold.toFixed(2),
      });
    }
  }

  /**
   * Get current request volume within the time window
   * @private
   */
  private getRequestVolume(): number {
    const windowStart = Date.now() - (this.config.volumeWindow || 60000);
    return this.requestHistory.filter(r => r.timestamp >= windowStart).length;
  }

  /**
   * Calculate failure rate within the time window
   * @private
   */
  private getFailureRate(): number {
    const windowStart = Date.now() - (this.config.volumeWindow || 60000);
    const recentRequests = this.requestHistory.filter(r => r.timestamp >= windowStart);

    if (recentRequests.length === 0) return 0;

    const failures = recentRequests.filter(r => !r.success).length;
    return failures / recentRequests.length;
  }

  /**
   * Clean up old request records outside the time window
   * Prevents memory leaks from unbounded history growth
   * @private
   */
  private cleanupOldRequests(): void {
    const windowStart = Date.now() - (this.config.volumeWindow || 60000);
    const initialLength = this.requestHistory.length;

    // Remove requests older than the window
    let i = 0;
    while (i < this.requestHistory.length) {
      const record = this.requestHistory[i];
      if (!record || record.timestamp >= windowStart) break;
      i++;
    }
    this.requestHistory.splice(0, i);

    const removed = initialLength - this.requestHistory.length;
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} old request records`);
    }
  }
}

/**
 * Production-Grade Retry Handler with comprehensive error handling and observability
 * Manages retry operations with multiple backoff strategies, circuit breakers,
 * intelligent error classification, and detailed metrics tracking
 *
 * @class RetryHandler
 */
export class RetryHandler {
  private readonly logger: ILogger;
  private readonly circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private readonly operationMetrics: Map<string, RetryMetrics> = new Map();
  private readonly latencyHistory: Map<string, number[]> = new Map();
  private activeConcurrentRetries = 0;
  private previousDelayCache: Map<string, number> = new Map(); // For decorrelated jitter
  private cleanupTimer?: NodeJS.Timeout | undefined;

  constructor() {
    this.logger = createLogger('RetryHandler');

    // Setup periodic cleanup to prevent memory leaks
    this.cleanupTimer = setInterval(() => {
      this.cleanupMetrics();
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Clean up resources to prevent memory leaks
   */
  destroy(): void {
    // Clean up timers
    if (this.cleanupTimer !== undefined) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Clean up circuit breakers
    this.circuitBreakers.forEach((breaker) => {
      breaker.destroy();
    });
    this.circuitBreakers.clear();

    // Clear metrics
    this.operationMetrics.clear();
    this.latencyHistory.clear();
    this.previousDelayCache.clear();
  }

  /**
   * Execute operation with comprehensive retry logic, error classification, and observability
   *
   * Features:
   * - Multiple backoff strategies (exponential, linear, constant, decorrelated)
   * - Intelligent error classification (retryable/non-retryable/fatal)
   * - Circuit breaker integration
   * - Operation and total timeout management
   * - Abort signal support for cancellation
   * - Comprehensive metrics tracking
   * - Memory leak prevention
   * - Concurrent retry limiting
   * - Idempotency key generation
   *
   * @template T The return type of the operation
   * @param {Function} operation - Async operation to execute (can be null-checked)
   * @param {RetryConfig} config - Comprehensive retry configuration
   * @param {string} name - Operation name for logging and metrics
   * @returns {Promise<RetryResult<T>>} Detailed retry result with metrics
   *
   * @example
   * ```typescript
   * const result = await retryHandler.retry(
   *   async () => await fetchData(),
   *   {
   *     maxAttempts: 5,
   *     baseDelay: 1000,
   *     maxDelay: 30000,
   *     strategy: RetryStrategy.EXPONENTIAL,
   *     jitter: 0.1,
   *     signal: abortController.signal
   *   },
   *   'FetchUserData'
   * );
   * ```
   */
  async retry<T>(
    operation: (() => Promise<T>) | null | undefined,
    config: RetryConfig,
    name: string = 'Operation'
  ): Promise<RetryResult<T>> {
    // Handle null/undefined operation
    if (!operation || typeof operation !== 'function') {
      const error = new Error('Operation must be a valid function');
      this.logger.error('Invalid operation provided to retry', error);
      return {
        success: false,
        error,
        attempts: 0,
        totalDuration: 0,
        attemptHistory: [],
      };
    }

    // Check concurrent retry limit
    if (config.maxConcurrentRetries && this.activeConcurrentRetries >= config.maxConcurrentRetries) {
      const error = new Error(
        `Maximum concurrent retries (${config.maxConcurrentRetries}) exceeded. ` +
        `Active: ${this.activeConcurrentRetries}`
      );
      this.logger.warn('Concurrent retry limit exceeded', { name, active: this.activeConcurrentRetries });
      return {
        success: false,
        error,
        attempts: 0,
        totalDuration: 0,
        attemptHistory: [],
      };
    }

    this.activeConcurrentRetries++;
    const startTime = Date.now();
    const attemptHistory: RetryAttempt[] = [];
    let lastError: CloudError | Error | undefined;
    let circuitBreaker: CircuitBreaker | undefined;
    let abortListener: (() => void) | undefined;
    let totalTimeoutTimer: NodeJS.Timeout | undefined;
    let wasAborted = false;

    try {
      // Setup abort signal listener
      if (config.signal) {
        abortListener = () => {
          wasAborted = true;
          this.logger.info('Operation aborted by signal', { name });
        };
        config.signal.addEventListener('abort', abortListener);

        // Check if already aborted
        if (config.signal.aborted) {
          wasAborted = true;
        }
      }

      // Setup circuit breaker if configured
      if (config.circuitBreaker) {
        circuitBreaker = this.getOrCreateCircuitBreaker(name, config.circuitBreaker);
      }

      // Check retry budget before starting
      if (!this.checkRetryBudget(name, config)) {
        const error = new Error(
          `Retry budget exhausted for ${name}. Too many retries across operations.`
        );
        this.logger.warn('Retry budget exhausted', { name });
        return {
          success: false,
          error,
          attempts: 0,
          totalDuration: Date.now() - startTime,
          attemptHistory: [],
          retryBudgetConsumed: 1.0,
        };
      }

      if (config.enableDetailedLogging !== false) {
        this.logger.info('Starting retry operation', {
          name,
          maxAttempts: config.maxAttempts,
          strategy: config.strategy,
          baseDelay: config.baseDelay,
          maxDelay: config.maxDelay,
        });
      }

      // Setup total timeout timer
      if (config.totalTimeout) {
        totalTimeoutTimer = setTimeout(() => {
          wasAborted = true;
          this.logger.warn('Total timeout exceeded', {
            name,
            timeout: config.totalTimeout,
            elapsed: Date.now() - startTime,
          });
        }, config.totalTimeout);
      }

      // Main retry loop
      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        // Check for abort
        if (wasAborted || config.signal?.aborted) {
          this.logger.info('Operation aborted', { name, attempt });
          break;
        }

        const attemptStart = Date.now();
        const delay = attempt === 1 ? 0 : this.calculateDelay(attempt - 1, config, name);
        const isFinal = attempt === config.maxAttempts;
        const idempotencyKey = config.generateIdempotencyKey?.();

        // Check total timeout before waiting
        if (config.totalTimeout && (attemptStart - startTime) >= config.totalTimeout) {
          this.logger.warn('Total timeout reached before attempt', {
            name,
            attempt,
            elapsed: attemptStart - startTime,
            timeout: config.totalTimeout,
          });
          break;
        }

        // Wait for delay (except first attempt)
        if (delay > 0) {
          if (config.enableDetailedLogging !== false) {
            this.logger.debug('Waiting before retry attempt', { name, attempt, delay });
          }
          await this.sleepWithAbort(delay, config.signal);

          // Check abort after sleep
          if (wasAborted || config.signal?.aborted) {
            break;
          }
        }

        // Create attempt record
        let attemptData: RetryAttempt = {
          attempt,
          delay,
          timestamp: new Date(),
          final: isFinal,
          ...(idempotencyKey !== undefined && { idempotencyKey }),
        };

        try {
          // Call onRetry callback if provided
          if (lastError && config.onRetry) {
            await config.onRetry(attempt, lastError, delay);
          }

          if (config.enableDetailedLogging !== false) {
            this.logger.debug('Executing retry attempt', {
              name,
              attempt,
              maxAttempts: config.maxAttempts,
              idempotencyKey,
            });
          }

          // Execute operation with optional timeout and circuit breaker
          let result: T;
          if (circuitBreaker) {
            result = await circuitBreaker.execute(async () => {
              return await this.executeWithTimeout(operation, config.operationTimeout);
            });
          } else {
            result = await this.executeWithTimeout(operation, config.operationTimeout);
          }

          // Success!
          const attemptDuration = Date.now() - attemptStart;
          const totalDuration = Date.now() - startTime;
          attemptData = { ...attemptData, duration: attemptDuration };
          attemptHistory.push(attemptData);

          // Record metrics
          this.recordSuccess(name, attempt, totalDuration);
          this.recordLatency(name, totalDuration);

          // Call onSuccess callback
          if (config.onSuccess) {
            await config.onSuccess(attempt, result, totalDuration);
          }

          if (config.enableDetailedLogging !== false) {
            this.logger.info('Retry operation succeeded', {
              name,
              attempts: attempt,
              totalDuration,
              attemptDuration,
            });
          }

          return {
            success: true,
            result,
            attempts: attempt,
            totalDuration,
            attemptHistory,
            ...(circuitBreaker && { circuitBreakerState: circuitBreaker.getState() }),
            retryBudgetConsumed: this.calculateRetryBudgetConsumed(name, attempt),
          };

        } catch (error: any) {
          const attemptDuration = Date.now() - attemptStart;
          const normalizedError = this.normalizeError(error);
          const errorClassification = this.classifyError(normalizedError);
          lastError = normalizedError;

          attemptData = {
            ...attemptData,
            duration: attemptDuration,
            error: normalizedError,
            errorClassification,
            ...((wasAborted || config.signal?.aborted) && { aborted: true }),
          };
          attemptHistory.push(attemptData);

          if (config.enableDetailedLogging !== false) {
            this.logger.debug('Retry attempt failed', {
              name,
              attempt,
              error: this.getErrorCode(normalizedError),
              message: normalizedError.message,
              classification: errorClassification,
              duration: attemptDuration,
            });
          }

          // Check if error is fatal (never retry)
          if (errorClassification === ErrorClassification.FATAL) {
            this.logger.warn('Fatal error encountered, stopping retries', {
              name,
              attempt,
              error: this.getErrorCode(normalizedError),
            });
            break;
          }

          // Determine if we should retry this error
          const shouldRetry = config.shouldRetry
            ? config.shouldRetry(normalizedError, attempt)
            : errorClassification === ErrorClassification.RETRYABLE;

          if (!shouldRetry || isFinal) {
            if (config.enableDetailedLogging !== false) {
              this.logger.debug('Not retrying', {
                name,
                attempt,
                shouldRetry,
                isFinal,
                classification: errorClassification,
              });
            }
            break;
          }
        }
      }

      // All retries exhausted or aborted
      const totalDuration = Date.now() - startTime;

      // Record failure metrics
      this.recordFailure(name, attemptHistory.length, totalDuration);

      // Call onFailure callback
      if (config.onFailure && lastError) {
        await config.onFailure(attemptHistory.length, lastError, totalDuration);
      }

      this.logger.error('Retry operation failed after all attempts', lastError as Error || new Error('Unknown'), {
        name,
        attempts: attemptHistory.length,
        totalDuration,
        lastError: lastError ? this.getErrorCode(lastError) : 'UNKNOWN',
        aborted: wasAborted,
      });

      return {
        success: false,
        ...(lastError && { error: lastError }),
        attempts: attemptHistory.length,
        totalDuration,
        attemptHistory,
        ...(circuitBreaker && { circuitBreakerState: circuitBreaker.getState() }),
        ...(wasAborted || config.signal?.aborted) && { aborted: true },
        retryBudgetConsumed: this.calculateRetryBudgetConsumed(name, attemptHistory.length),
      };

    } finally {
      // Cleanup: prevent memory leaks
      this.activeConcurrentRetries--;

      if (abortListener && config.signal) {
        config.signal.removeEventListener('abort', abortListener);
      }

      if (totalTimeoutTimer) {
        clearTimeout(totalTimeoutTimer);
      }
    }
  }

  /**
   * Execute operation with circuit breaker
   * @method withCircuitBreaker
   * @param {Function} operation - Operation to execute
   * @param {string} name - Circuit breaker name
   * @param {CircuitBreakerConfig} config - Circuit breaker configuration
   * @returns {Promise<T>} Operation result
   */
  async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    name: string,
    config: CircuitBreakerConfig
  ): Promise<T> {
    let circuitBreaker = this.circuitBreakers.get(name);

    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(config, name);
      this.circuitBreakers.set(name, circuitBreaker);
    }

    return circuitBreaker.execute(operation);
  }

  /**
   * Create a retryable version of a function
   * @method retryable
   * @param {Function} fn - Function to make retryable
   * @param {RetryConfig} config - Retry configuration
   * @param {string} name - Operation name
   * @returns {Function} Retryable function
   */
  retryable<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    config: RetryConfig,
    name: string = fn.name || 'RetryableFunction'
  ): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs): Promise<TReturn> => {
      const result = await this.retry(
        () => fn(...args),
        config,
        name
      );

      if (result.success) {
        return result.result!;
      } else {
        throw result.error;
      }
    };
  }

  /**
   * Get circuit breaker status
   * @method getCircuitBreakerStatus
   * @param {string} name - Circuit breaker name
   * @returns {object} Circuit breaker status
   */
  getCircuitBreakerStatus(name: string): {
    state: CircuitState;
    exists: boolean;
  } {
    const circuitBreaker = this.circuitBreakers.get(name);
    return {
      state: circuitBreaker?.getState() || CircuitState.CLOSED,
      exists: !!circuitBreaker
    };
  }

  /**
   * Reset circuit breaker
   * @method resetCircuitBreaker
   * @param {string} name - Circuit breaker name
   */
  resetCircuitBreaker(name: string): void {
    const circuitBreaker = this.circuitBreakers.get(name);
    circuitBreaker?.reset();
  }

  /**
   * Calculate delay for retry attempt using various backoff strategies
   *
   * Strategies:
   * - CONSTANT: Fixed delay between retries
   * - LINEAR: Delay increases linearly (baseDelay * attempt)
   * - EXPONENTIAL: Delay grows exponentially with jitter (baseDelay * 2^attempt + jitter)
   * - DECORRELATED: AWS-recommended decorrelated jitter algorithm
   * - CUSTOM: User-provided delay function
   *
   * @private
   * @param {number} attempt - Current attempt number (0-based for calculation)
   * @param {RetryConfig} config - Retry configuration
   * @param {string} name - Operation name for caching previous delay (decorrelated jitter)
   * @returns {number} Calculated delay in milliseconds
   */
  private calculateDelay(attempt: number, config: RetryConfig, name: string): number {
    let delay: number;

    switch (config.strategy) {
      case RetryStrategy.CONSTANT:
        // Fixed delay between retries
        delay = config.baseDelay;
        break;

      case RetryStrategy.LINEAR:
        // Linear backoff: baseDelay * attempt
        delay = config.baseDelay * (attempt + 1);
        break;

      case RetryStrategy.EXPONENTIAL:
        // Exponential backoff: baseDelay * (multiplier ^ attempt)
        const multiplier = config.multiplier || 2;
        delay = config.baseDelay * Math.pow(multiplier, attempt);

        // Add jitter to prevent thundering herd problem
        // Jitter uses full range: delay +/- (delay * jitter)
        if (config.jitter && config.jitter > 0) {
          const jitterAmount = delay * config.jitter;
          const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount;
          delay += randomJitter;
        }
        break;

      case RetryStrategy.DECORRELATED:
        // Decorrelated jitter: AWS-recommended algorithm
        // delay = random_between(baseDelay, previousDelay * 3)
        // This prevents synchronized retries better than standard jitter
        const previousDelay = this.previousDelayCache.get(name) || config.baseDelay;
        const maxDecorrelated = Math.min(config.maxDelay, previousDelay * 3);
        delay = config.baseDelay + Math.random() * (maxDecorrelated - config.baseDelay);
        this.previousDelayCache.set(name, delay);
        break;

      case RetryStrategy.CUSTOM:
        // Custom delay function provided by user
        if (config.customDelayFn) {
          const previousDelay = this.previousDelayCache.get(name);
          delay = config.customDelayFn(attempt, config.baseDelay, previousDelay);
          this.previousDelayCache.set(name, delay);
        } else {
          delay = config.baseDelay;
        }
        break;

      default:
        delay = config.baseDelay;
    }

    // Ensure delay is within bounds [0, maxDelay]
    return Math.min(Math.max(0, Math.floor(delay)), config.maxDelay);
  }

  /**
   * Sleep for specified milliseconds with abort signal support
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @param {AbortSignal} signal - Optional abort signal for cancellation
   * @returns {Promise<void>}
   */
  private sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Aborted'));
        return;
      }

      const timer = setTimeout(() => {
        if (abortListener) {
          signal?.removeEventListener('abort', abortListener);
        }
        resolve();
      }, ms);

      const abortListener = () => {
        clearTimeout(timer);
        reject(new Error('Aborted'));
      };

      if (signal) {
        signal.addEventListener('abort', abortListener, { once: true });
      }
    });
  }

  /**
   * Execute operation with timeout
   * @private
   * @template T The return type of the operation
   * @param {Function} operation - Operation to execute
   * @param {number} timeout - Optional timeout in milliseconds
   * @returns {Promise<T>} Operation result
   * @throws {Error} If operation times out
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout?: number
  ): Promise<T> {
    if (!timeout) {
      return await operation();
    }

    let timeoutHandle: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        operation(),
        new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`Operation timeout after ${timeout}ms`));
          }, timeout);
        }),
      ]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  /**
   * Intelligent error classification for retry decisions
   *
   * Classifications:
   * - RETRYABLE: Transient failures (network issues, rate limits, service unavailable)
   * - NON_RETRYABLE: Client errors (bad request, validation errors)
   * - FATAL: Non-recoverable errors (authentication, authorization, quota exhausted)
   *
   * @private
   * @param {CloudError | Error} error - Error to classify
   * @returns {ErrorClassification} Error classification
   */
  private classifyError(error: CloudError | Error): ErrorClassification {
    // Check if it's a CloudError with explicit retryable flag
    if ('retryable' in error && typeof error.retryable === 'boolean') {
      return error.retryable ? ErrorClassification.RETRYABLE : ErrorClassification.NON_RETRYABLE;
    }

    // Check error code/message for classification
    const errorCode = this.getErrorCode(error);
    const errorMessage = error.message?.toLowerCase() || '';

    // Fatal errors - never retry
    const fatalPatterns = [
      'unauthorized', 'forbidden', 'authentication', 'auth failed',
      'invalid credentials', 'access denied', 'quota exceeded',
      'quota exhausted', 'resource not found', 'not found',
      'invalid api key', 'invalid token', 'expired token',
    ];

    for (const pattern of fatalPatterns) {
      if (errorMessage.includes(pattern) || errorCode.toLowerCase().includes(pattern)) {
        return ErrorClassification.FATAL;
      }
    }

    // Check HTTP-like status codes in error code
    if (errorCode.includes('400') || errorCode.includes('401') ||
        errorCode.includes('403') || errorCode.includes('404')) {
      return ErrorClassification.FATAL;
    }

    // Non-retryable errors
    const nonRetryablePatterns = [
      'bad request', 'validation', 'invalid', 'malformed',
      'parse error', 'syntax error',
    ];

    for (const pattern of nonRetryablePatterns) {
      if (errorMessage.includes(pattern) || errorCode.toLowerCase().includes(pattern)) {
        return ErrorClassification.NON_RETRYABLE;
      }
    }

    // Retryable errors
    const retryablePatterns = [
      'timeout', 'timed out', 'econnreset', 'econnrefused',
      'network', 'socket', 'rate limit', '429', '503',
      'service unavailable', 'temporarily unavailable',
      'too many requests', 'throttled', 'circuit breaker',
      'connection', 'enotfound', 'etimedout',
    ];

    for (const pattern of retryablePatterns) {
      if (errorMessage.includes(pattern) || errorCode.toLowerCase().includes(pattern)) {
        return ErrorClassification.RETRYABLE;
      }
    }

    // Default to retryable for unknown errors (conservative approach)
    return ErrorClassification.RETRYABLE;
  }

  /**
   * Get error code from various error types
   * @private
   */
  private getErrorCode(error: CloudError | Error): string {
    if ('code' in error && typeof error.code === 'string') {
      return error.code;
    }
    if ('code' in error && error.code !== undefined) {
      return String(error.code);
    }
    return error.name || 'UNKNOWN_ERROR';
  }

  /**
   * Normalize error to CloudError format for consistent handling
   * @private
   */
  private normalizeError(error: any): CloudError | Error {
    // Already a CloudError
    if (error && typeof error === 'object' && 'code' in error && 'retryable' in error) {
      return error as CloudError;
    }

    // Already an Error object
    if (error instanceof Error) {
      return error;
    }

    // Convert non-Error objects to Error
    if (typeof error === 'string') {
      return new Error(error);
    }

    // Handle other types
    return new Error(error?.message || String(error) || 'Unknown error');
  }

  /**
   * Get or create circuit breaker for an operation
   * @private
   */
  private getOrCreateCircuitBreaker(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.circuitBreakers.get(name);
    if (!breaker) {
      breaker = new CircuitBreaker(config, name);
      this.circuitBreakers.set(name, breaker);
    }
    return breaker;
  }

  /**
   * Check if retry budget allows more retries
   * Prevents retry storms by limiting total retry percentage
   * @private
   */
  private checkRetryBudget(name: string, config: RetryConfig): boolean {
    if (!config.retryBudget) return true; // No budget limit

    const metrics = this.operationMetrics.get(name);
    if (!metrics || metrics.totalOperations === 0) return true;

    const retryRate = metrics.totalRetries / metrics.totalOperations;
    return retryRate < config.retryBudget;
  }

  /**
   * Calculate retry budget consumed for this operation
   * @private
   */
  private calculateRetryBudgetConsumed(name: string, _attempts: number): number {
    const metrics = this.operationMetrics.get(name);
    if (!metrics || metrics.totalOperations === 0) return 0;

    return metrics.totalRetries / metrics.totalOperations;
  }

  /**
   * Record successful operation metrics
   * @private
   */
  private recordSuccess(name: string, attempts: number, _duration: number): void {
    const metrics = this.operationMetrics.get(name) || this.createEmptyMetrics();
    metrics.totalOperations++;
    metrics.successfulOperations++;
    metrics.totalRetries += attempts - 1; // First attempt is not a retry
    metrics.averageRetriesPerOperation =
      metrics.totalRetries / metrics.totalOperations;
    metrics.failureRate =
      metrics.failedOperations / metrics.totalOperations;
    this.operationMetrics.set(name, metrics);
  }

  /**
   * Record failed operation metrics
   * @private
   */
  private recordFailure(name: string, attempts: number, _duration: number): void {
    const metrics = this.operationMetrics.get(name) || this.createEmptyMetrics();
    metrics.totalOperations++;
    metrics.failedOperations++;
    metrics.totalRetries += attempts - 1;
    metrics.averageRetriesPerOperation =
      metrics.totalRetries / metrics.totalOperations;
    metrics.failureRate =
      metrics.failedOperations / metrics.totalOperations;
    this.operationMetrics.set(name, metrics);
  }

  /**
   * Record latency for percentile calculation
   * @private
   */
  private recordLatency(name: string, latency: number): void {
    let history = this.latencyHistory.get(name) || [];
    history.push(latency);

    // Keep only last 1000 latencies to prevent memory growth
    if (history.length > 1000) {
      history = history.slice(-1000);
    }

    this.latencyHistory.set(name, history);

    // Update metrics with percentiles
    const metrics = this.operationMetrics.get(name);
    if (metrics) {
      metrics.latencyPercentiles = this.calculatePercentiles(history);
      this.operationMetrics.set(name, metrics);
    }
  }

  /**
   * Calculate latency percentiles
   * @private
   */
  private calculatePercentiles(latencies: number[]): RetryMetrics['latencyPercentiles'] {
    if (latencies.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const getPercentile = (p: number): number => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)] ?? 0;
    };

    return {
      p50: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  }

  /**
   * Create empty metrics object
   * @private
   */
  private createEmptyMetrics(): RetryMetrics {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalRetries: 0,
      averageRetriesPerOperation: 0,
      latencyPercentiles: { p50: 0, p90: 0, p95: 0, p99: 0 },
      failureRate: 0,
      retryBudget: 1.0,
    };
  }

  /**
   * Clean up old metrics to prevent memory leaks
   * @private
   */
  private cleanupMetrics(): void {
    // Keep metrics for operations with recent activity
    // These variables are reserved for future use when tracking last access time
    // const _now = Date.now();
    // const _maxAge = 3600000; // 1 hour

    // This is a simplified cleanup - in production, you'd track last access time
    if (this.latencyHistory.size > 100) {
      // Keep only the 50 most recently used operations
      const entries = Array.from(this.latencyHistory.entries());
      if (entries.length > 50) {
        entries.slice(0, entries.length - 50).forEach(([name]) => {
          this.latencyHistory.delete(name);
        });
      }
    }
  }

  /**
   * Get metrics for a specific operation
   * @param {string} name - Operation name
   * @returns {RetryMetrics | undefined} Operation metrics
   */
  getMetrics(name: string): RetryMetrics | undefined {
    return this.operationMetrics.get(name);
  }

  /**
   * Get all metrics
   * @returns {Map<string, RetryMetrics>} All operation metrics
   */
  getAllMetrics(): Map<string, RetryMetrics> {
    return new Map(this.operationMetrics);
  }

  /**
   * Reset metrics for an operation
   * @param {string} name - Operation name
   */
  resetMetrics(name: string): void {
    this.operationMetrics.delete(name);
    this.latencyHistory.delete(name);
    this.previousDelayCache.delete(name);
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    this.operationMetrics.clear();
    this.latencyHistory.clear();
    this.previousDelayCache.clear();
  }
}

/**
 * Production-grade default retry configurations for common scenarios
 * These configurations follow AWS and Google Cloud best practices
 */
export const DefaultRetryConfigs = {
  /**
   * Quick operations (lightweight API calls, metadata fetches)
   * - Fast retries with minimal delay
   * - Suitable for non-critical operations
   */
  QUICK: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    strategy: RetryStrategy.EXPONENTIAL,
    multiplier: 2,
    jitter: 0.1,
    retryBudget: 0.1, // 10% retry budget
  } as RetryConfig,

  /**
   * Standard operations (typical API calls, data fetches)
   * - Balanced retry strategy
   * - Recommended for most use cases
   */
  STANDARD: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    strategy: RetryStrategy.EXPONENTIAL,
    multiplier: 2,
    jitter: 0.1,
    retryBudget: 0.1,
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      volumeThreshold: 10,
      volumeWindow: 60000,
      failureRateThreshold: 0.5,
    },
  } as RetryConfig,

  /**
   * AWS-recommended decorrelated jitter strategy
   * - Prevents thundering herd better than standard exponential
   * - Recommended for high-traffic operations
   */
  AWS_DECORRELATED: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 20000,
    strategy: RetryStrategy.DECORRELATED,
    retryBudget: 0.1,
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      volumeThreshold: 10,
      volumeWindow: 60000,
      failureRateThreshold: 0.5,
    },
  } as RetryConfig,

  /**
   * Long-running operations (deployments, large data transfers)
   * - More retry attempts with longer delays
   * - Higher timeout values
   */
  LONG_RUNNING: {
    maxAttempts: 10,
    baseDelay: 5000,
    maxDelay: 60000,
    strategy: RetryStrategy.EXPONENTIAL,
    multiplier: 1.5,
    jitter: 0.2,
    totalTimeout: 600000, // 10 minutes
    operationTimeout: 120000, // 2 minutes per attempt
    retryBudget: 0.2, // 20% retry budget for long ops
    circuitBreaker: {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 120000, // 2 minutes
      volumeThreshold: 5,
      volumeWindow: 300000, // 5 minutes
      failureRateThreshold: 0.6,
    },
  } as RetryConfig,

  /**
   * Network operations (HTTP requests, socket connections)
   * - Optimized for network-related errors
   * - Custom retry logic for network failures
   */
  NETWORK: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 15000,
    strategy: RetryStrategy.EXPONENTIAL,
    multiplier: 2,
    jitter: 0.15,
    operationTimeout: 30000, // 30s per request
    retryBudget: 0.1,
    shouldRetry: (error, attempt) => {
      const errorMsg = error.message?.toLowerCase() || '';
      const retryable =
        errorMsg.includes('network') ||
        errorMsg.includes('timeout') ||
        errorMsg.includes('econnreset') ||
        errorMsg.includes('econnrefused') ||
        errorMsg.includes('429') ||
        errorMsg.includes('503');
      return retryable && attempt < 5;
    },
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000,
      volumeThreshold: 10,
      volumeWindow: 60000,
      failureRateThreshold: 0.5,
    },
  } as RetryConfig,

  /**
   * Deployment operations (infrastructure provisioning)
   * - Conservative retry strategy
   * - Long timeouts to account for slow operations
   */
  DEPLOYMENT: {
    maxAttempts: 3,
    baseDelay: 10000,
    maxDelay: 120000,
    strategy: RetryStrategy.EXPONENTIAL,
    multiplier: 2,
    jitter: 0.1,
    totalTimeout: 1800000, // 30 minutes
    operationTimeout: 600000, // 10 minutes per attempt
    retryBudget: 0.3, // 30% retry budget
  } as RetryConfig,

  /**
   * Rate-limited operations (APIs with strict rate limits)
   * - Linear backoff for predictable retry timing
   * - Respects rate limit windows
   */
  RATE_LIMITED: {
    maxAttempts: 5,
    baseDelay: 5000,
    maxDelay: 60000,
    strategy: RetryStrategy.LINEAR,
    retryBudget: 0.05, // 5% retry budget - very conservative
    shouldRetry: (error, _attempt) => {
      const errorMsg = error.message?.toLowerCase() || '';
      return errorMsg.includes('rate limit') || errorMsg.includes('429');
    },
  } as RetryConfig,

  /**
   * Critical operations (authentication, payments)
   * - Minimal retries to avoid duplicate operations
   * - Requires idempotency keys
   */
  CRITICAL: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 10000,
    strategy: RetryStrategy.CONSTANT,
    retryBudget: 0.05,
    generateIdempotencyKey: () => `critical-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  } as RetryConfig,
};

/**
 * Global retry handler instance
 * Use this for convenience, or create your own instance for isolation
 */
export const globalRetryHandler = new RetryHandler();

/**
 * Create a new retry handler instance
 * Useful when you need isolated metrics and circuit breakers
 *
 * @function createRetryHandler
 * @returns {RetryHandler} New retry handler instance
 *
 * @example
 * ```typescript
 * const retryHandler = createRetryHandler();
 * const result = await retryHandler.retry(
 *   async () => await myOperation(),
 *   DefaultRetryConfigs.STANDARD,
 *   'MyOperation'
 * );
 * ```
 */
export const createRetryHandler = (): RetryHandler => {
  return new RetryHandler();
};

/**
 * Convenience function for retrying operations with the global handler
 *
 * @function retry
 * @template T The return type of the operation
 * @param {Function} operation - Async operation to retry
 * @param {RetryConfig} config - Retry configuration (defaults to STANDARD)
 * @param {string} name - Operation name for logging and metrics
 * @returns {Promise<RetryResult<T>>} Detailed retry result
 *
 * @example
 * ```typescript
 * // Simple usage with defaults
 * const result = await retry(
 *   async () => await fetchData(),
 *   DefaultRetryConfigs.STANDARD,
 *   'FetchData'
 * );
 *
 * // With custom config
 * const result = await retry(
 *   async () => await fetchData(),
 *   {
 *     ...DefaultRetryConfigs.STANDARD,
 *     maxAttempts: 10,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry attempt ${attempt} after ${delay}ms: ${error.message}`);
 *     }
 *   },
 *   'FetchData'
 * );
 *
 * // With abort signal
 * const controller = new AbortController();
 * const result = await retry(
 *   async () => await fetchData(),
 *   { ...DefaultRetryConfigs.STANDARD, signal: controller.signal },
 *   'FetchData'
 * );
 * ```
 */
export const retry = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig = DefaultRetryConfigs.STANDARD,
  name: string = 'Operation'
): Promise<RetryResult<T>> => {
  return globalRetryHandler.retry(operation, config, name);
};

/**
 * Create an idempotency key generator with custom prefix
 *
 * @function createIdempotencyKeyGenerator
 * @param {string} prefix - Prefix for the idempotency key
 * @returns {Function} Idempotency key generator function
 *
 * @example
 * ```typescript
 * const generateKey = createIdempotencyKeyGenerator('payment');
 * const config = {
 *   ...DefaultRetryConfigs.CRITICAL,
 *   generateIdempotencyKey: generateKey
 * };
 * ```
 */
export function createIdempotencyKeyGenerator(prefix: string = 'op'): () => string {
  return () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    const counter = Math.floor(Math.random() * 10000);
    return `${prefix}-${timestamp}-${random}-${counter}`;
  };
}

/**
 * Helper to create a retry config with circuit breaker defaults
 *
 * @function withCircuitBreaker
 * @param {RetryConfig} config - Base retry configuration
 * @param {Partial<CircuitBreakerConfig>} breakerConfig - Circuit breaker overrides
 * @returns {RetryConfig} Config with circuit breaker
 *
 * @example
 * ```typescript
 * const config = withCircuitBreaker(DefaultRetryConfigs.STANDARD, {
 *   failureThreshold: 10,
 *   timeout: 120000
 * });
 * ```
 */
export function withCircuitBreaker(
  config: RetryConfig,
  breakerConfig?: Partial<CircuitBreakerConfig>
): RetryConfig {
  const defaultBreaker: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
    volumeThreshold: 10,
    volumeWindow: 60000,
    failureRateThreshold: 0.5,
  };

  return {
    ...config,
    circuitBreaker: { ...defaultBreaker, ...breakerConfig },
  };
}

/**
 * Helper to merge retry configs with custom overrides
 *
 * @function mergeRetryConfig
 * @param {RetryConfig} base - Base configuration
 * @param {Partial<RetryConfig>} overrides - Configuration overrides
 * @returns {RetryConfig} Merged configuration
 *
 * @example
 * ```typescript
 * const config = mergeRetryConfig(DefaultRetryConfigs.STANDARD, {
 *   maxAttempts: 10,
 *   onRetry: (attempt, error, delay) => {
 *     console.log(`Retry ${attempt}: ${error.message}`);
 *   }
 * });
 * ```
 */
export function mergeRetryConfig(
  base: RetryConfig,
  overrides: Partial<RetryConfig>
): RetryConfig {
  return { ...base, ...overrides };
}

/**
 * Utility to check if an error is retryable based on standard patterns
 *
 * @function isRetryableError
 * @param {Error | CloudError} error - Error to check
 * @returns {boolean} True if error is retryable
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   if (isRetryableError(error)) {
 *     // Retry the operation
 *   }
 * }
 * ```
 */
export function isRetryableError(error: Error | CloudError): boolean {
  if ('retryable' in error && typeof error.retryable === 'boolean') {
    return error.retryable;
  }

  const errorMsg = error.message?.toLowerCase() || '';
  const errorCode = ('code' in error ? String(error.code) : error.name || '').toLowerCase();

  const retryablePatterns = [
    'timeout', 'timed out', 'econnreset', 'econnrefused',
    'network', 'socket', 'rate limit', '429', '503',
    'service unavailable', 'temporarily unavailable',
    'too many requests', 'throttled', 'circuit breaker',
  ];

  return retryablePatterns.some(
    pattern => errorMsg.includes(pattern) || errorCode.includes(pattern)
  );
}

/**
 * Utility to check if an error is fatal (non-recoverable)
 *
 * @function isFatalError
 * @param {Error | CloudError} error - Error to check
 * @returns {boolean} True if error is fatal
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   if (isFatalError(error)) {
 *     // Don't retry, handle fatal error
 *   }
 * }
 * ```
 */
export function isFatalError(error: Error | CloudError): boolean {
  const errorMsg = error.message?.toLowerCase() || '';
  const errorCode = ('code' in error ? String(error.code) : error.name || '').toLowerCase();

  const fatalPatterns = [
    'unauthorized', 'forbidden', 'authentication', 'auth failed',
    'invalid credentials', 'access denied', 'quota exceeded',
    'quota exhausted', 'not found', '401', '403', '404',
  ];

  return fatalPatterns.some(
    pattern => errorMsg.includes(pattern) || errorCode.includes(pattern)
  );
}

/**
 * Default circuit breaker configurations
 */
export const DefaultCircuitBreakerConfigs = {
  /**
   * Standard circuit breaker for typical operations
   */
  STANDARD: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    volumeThreshold: 10,
    volumeWindow: 60000,
    failureRateThreshold: 0.5,
  } as CircuitBreakerConfig,

  /**
   * Aggressive circuit breaker for critical services
   * Opens quickly to protect upstream services
   */
  AGGRESSIVE: {
    failureThreshold: 3,
    successThreshold: 3,
    timeout: 30000, // 30 seconds
    volumeThreshold: 5,
    volumeWindow: 30000,
    failureRateThreshold: 0.4,
  } as CircuitBreakerConfig,

  /**
   * Conservative circuit breaker for less critical services
   * Tolerates more failures before opening
   */
  CONSERVATIVE: {
    failureThreshold: 10,
    successThreshold: 2,
    timeout: 120000, // 2 minutes
    volumeThreshold: 20,
    volumeWindow: 120000,
    failureRateThreshold: 0.6,
  } as CircuitBreakerConfig,
};