/**
 * @fileoverview Error Handler - Comprehensive error handling for cloud operations
 * @description Centralized error handling system with structured error types,
 * error recovery strategies, and detailed error reporting for cloud deployment
 * and infrastructure management operations.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import type { AppError } from '../../types/common.types.js'
import type { CloudProviderType } from '../types/cloud-provider.types.js'
import {
  createLogger,
  type ILogger,
} from '../../utils/logger.js';

/**
 * Cloud operation error codes
 */
export enum CloudErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Provider errors
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  PROVIDER_NOT_SUPPORTED = 'PROVIDER_NOT_SUPPORTED',
  PROVIDER_API_ERROR = 'PROVIDER_API_ERROR',
  PROVIDER_RATE_LIMITED = 'PROVIDER_RATE_LIMITED',
  PROVIDER_UNAUTHORIZED = 'PROVIDER_UNAUTHORIZED',

  // Deployment errors
  DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
  DEPLOYMENT_TIMEOUT = 'DEPLOYMENT_TIMEOUT',
  DEPLOYMENT_NOT_FOUND = 'DEPLOYMENT_NOT_FOUND',
  DEPLOYMENT_CANCELLED = 'DEPLOYMENT_CANCELLED',
  BUILD_FAILED = 'BUILD_FAILED',

  // Project analysis errors
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  PROJECT_ANALYSIS_FAILED = 'PROJECT_ANALYSIS_FAILED',
  INVALID_PROJECT_STRUCTURE = 'INVALID_PROJECT_STRUCTURE',
  UNSUPPORTED_FRAMEWORK = 'UNSUPPORTED_FRAMEWORK',

  // Cost estimation errors
  COST_ESTIMATION_FAILED = 'COST_ESTIMATION_FAILED',
  INVALID_USAGE_DATA = 'INVALID_USAGE_DATA',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  CONFIGURATION = 'configuration',
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  DEPLOYMENT = 'deployment',
  VALIDATION = 'validation',
  PROVIDER = 'provider',
  PROJECT = 'project',
  COST = 'cost',
  SYSTEM = 'system',
}

/**
 * Comprehensive cloud error interface
 * @interface CloudError
 * @extends AppError
 */
export interface CloudError extends AppError {
  /** Error code for programmatic handling */
  readonly code: CloudErrorCode;
  /** Human-readable error message */
  readonly message: string;
  /** Error severity level */
  readonly severity: ErrorSeverity;
  /** Error category */
  readonly category: ErrorCategory;
  /** Context information */
  readonly context?: Record<string, any> | undefined;
  /** Provider where error occurred */
  readonly provider?: CloudProviderType | undefined;
  /** Timestamp when error occurred */
  readonly timestamp: Date;
  /** Stack trace */
  readonly stack?: string | undefined;
  /** Original error that caused this error */
  readonly cause?: Error | undefined;
  /** Suggested recovery actions */
  readonly recovery?: string[] | undefined;
  /** Whether the operation can be retried */
  readonly retryable: boolean;
  /** HTTP status code if applicable */
  readonly statusCode?: number | undefined;
}

/**
 * Error recovery strategy interface
 */
export interface ErrorRecoveryStrategy {
  /** Strategy name */
  readonly name: string;
  /** Whether this strategy can handle the error */
  canHandle(error: CloudError): boolean;
  /** Execute the recovery strategy */
  recover(error: CloudError): Promise<boolean>;
  /** Description of what this strategy does */
  readonly description: string;
}

/**
 * Cloud Error Handler for centralized error management
 * @class CloudErrorHandler
 */
export class CloudErrorHandler {
  private readonly logger: ILogger;
  private readonly recoveryStrategies: ErrorRecoveryStrategy[] = [];

  constructor() {
    this.logger = createLogger('CloudErrorHandler');
    this.initializeRecoveryStrategies();
  }

  /**
   * Create a new cloud error
   * @method createError
   * @param {CloudErrorCode} code - Error code
   * @param {string} message - Error message
   * @param {object} options - Additional error options
   * @returns {CloudError} Created error
   */
  createError(
    code: CloudErrorCode,
    message: string,
    options: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      context?: Record<string, any>;
      provider?: CloudProviderType;
      cause?: Error;
      recovery?: string[];
      retryable?: boolean;
      statusCode?: number;
    } = {}
  ): CloudError {
    const error: CloudError = {
      name: 'CloudError',
      code,
      message,
      severity: options.severity || this.determineSeverity(code),
      category: options.category || this.determineCategory(code),
      context: options.context,
      provider: options.provider,
      timestamp: new Date(),
      stack: new Error().stack,
      cause: options.cause,
      recovery: options.recovery || this.generateRecoveryActions(code),
      retryable: options.retryable ?? this.isRetryable(code),
      statusCode: options.statusCode,
    };

    this.logError(error);
    return error;
  }

  /**
   * Handle and potentially recover from an error
   * @method handleError
   * @param {Error | CloudError} error - Error to handle
   * @param {object} context - Additional context
   * @returns {Promise<CloudError>} Processed error
   */
  async handleError(
    error: Error | CloudError,
    context: Record<string, any> = {}
  ): Promise<CloudError> {
    const cloudError = this.normalizeError(error, context);

    // Log based on error type
    if (error instanceof Error && !this.isCloudError(error)) {
      this.logger.error('Handling cloud error', error, {
        code: cloudError.code,
        message: cloudError.message,
        severity: cloudError.severity,
        provider: cloudError.provider,
        context: cloudError.context
      });
    } else {
      this.logger.error('Handling cloud error', undefined, {
        code: cloudError.code,
        message: cloudError.message,
        severity: cloudError.severity,
        provider: cloudError.provider,
        context: cloudError.context
      });
    }

    // Attempt error recovery
    if (cloudError.retryable) {
      const recovered = await this.attemptRecovery(cloudError);
      if (recovered) {
        this.logger.info('Error recovery successful', {
          code: cloudError.code,
          message: cloudError.message
        });
      }
    }

    return cloudError;
  }

  /**
   * Wrap a function with error handling
   * @method wrapOperation
   * @param {Function} operation - Operation to wrap
   * @param {object} context - Context for error handling
   * @returns {Function} Wrapped operation
   */
  wrapOperation<T extends (...args: any[]) => any>(
    operation: T,
    context: Record<string, any> = {}
  ): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      try {
        return await operation(...args);
      } catch (error) {
        const cloudError = await this.handleError(error as Error, {
          ...context,
          operationArgs: args,
        });
        throw cloudError;
      }
    }) as T;
  }

  /**
   * Register a custom recovery strategy
   * @method registerRecoveryStrategy
   * @param {ErrorRecoveryStrategy} strategy - Recovery strategy to register
   */
  registerRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.logger.debug('Registered error recovery strategy', {
      name: strategy.name,
      description: strategy.description
    });
  }

  /**
   * Get error statistics
   * @method getErrorStats
   * @returns {object} Error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<CloudErrorCode, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    errorsByCategory: Record<ErrorCategory, number>;
  } {
    // In a real implementation, this would track actual error statistics
    return {
      totalErrors: 0,
      errorsByCode: {} as Record<CloudErrorCode, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorsByCategory: {} as Record<ErrorCategory, number>,
    };
  }

  /**
   * Initialize built-in recovery strategies
   * @private
   */
  private initializeRecoveryStrategies(): void {
    // Network retry strategy
    this.registerRecoveryStrategy({
      name: 'NetworkRetry',
      description: 'Retry network operations with exponential backoff',
      canHandle: (error) => error.category === ErrorCategory.NETWORK && error.retryable,
      recover: async (error) => {
        this.logger.debug('Attempting network retry recovery', {
          code: error.code,
          attempt: 1
        });
        // Implementation would include actual retry logic
        return false; // Placeholder
      }
    });

    // Authentication refresh strategy
    this.registerRecoveryStrategy({
      name: 'AuthRefresh',
      description: 'Refresh expired authentication tokens',
      canHandle: (error) => error.code === CloudErrorCode.PROVIDER_UNAUTHORIZED,
      recover: async (error) => {
        this.logger.debug('Attempting auth refresh recovery', {
          provider: error.provider
        });
        // Implementation would include token refresh logic
        return false; // Placeholder
      }
    });

    // Rate limit backoff strategy
    this.registerRecoveryStrategy({
      name: 'RateLimitBackoff',
      description: 'Wait and retry when rate limited',
      canHandle: (error) => error.code === CloudErrorCode.PROVIDER_RATE_LIMITED,
      recover: async (_error) => {
        this.logger.debug('Attempting rate limit backoff recovery');
        // Implementation would include backoff logic
        return false; // Placeholder
      }
    });
  }

  /**
   * Normalize any error to a CloudError
   * @private
   */
  private normalizeError(error: Error | CloudError, context: Record<string, any> = {}): CloudError {
    if (this.isCloudError(error)) {
      return {
        ...error,
        context: { ...error.context, ...context }
      };
    }

    // Convert generic Error to CloudError
    return this.createError(
      CloudErrorCode.UNKNOWN_ERROR,
      error.message || 'An unknown error occurred',
      {
        cause: error,
        context,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYSTEM,
      }
    );
  }

  /**
   * Check if an error is a CloudError
   * @private
   */
  private isCloudError(error: any): error is CloudError {
    return error && typeof error === 'object' && 'code' in error && 'severity' in error;
  }

  /**
   * Attempt to recover from an error
   * @private
   */
  private async attemptRecovery(error: CloudError): Promise<boolean> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canHandle(error)) {
        try {
          const recovered = await strategy.recover(error);
          if (recovered) {
            this.logger.info('Error recovery successful', {
              strategy: strategy.name,
              error: error.code
            });
            return true;
          }
        } catch (recoveryError) {
          this.logger.warn('Error recovery strategy failed', {
            strategy: strategy.name,
            error: error.code,
            recoveryError: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
          });
        }
      }
    }

    return false;
  }

  /**
   * Determine error severity from code
   * @private
   */
  private determineSeverity(code: CloudErrorCode): ErrorSeverity {
    const criticalErrors = [
      CloudErrorCode.MISSING_CREDENTIALS,
      CloudErrorCode.PROVIDER_UNAUTHORIZED,
    ];

    const highErrors = [
      CloudErrorCode.DEPLOYMENT_FAILED,
      CloudErrorCode.BUILD_FAILED,
      CloudErrorCode.PROJECT_NOT_FOUND,
    ];

    const mediumErrors = [
      CloudErrorCode.PROVIDER_RATE_LIMITED,
      CloudErrorCode.TIMEOUT,
      CloudErrorCode.NETWORK_ERROR,
    ];

    if (criticalErrors.includes(code)) return ErrorSeverity.CRITICAL;
    if (highErrors.includes(code)) return ErrorSeverity.HIGH;
    if (mediumErrors.includes(code)) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * Determine error category from code
   * @private
   */
  private determineCategory(code: CloudErrorCode): ErrorCategory {
    if (code.includes('PROVIDER')) return ErrorCategory.PROVIDER;
    if (code.includes('DEPLOYMENT') || code.includes('BUILD')) return ErrorCategory.DEPLOYMENT;
    if (code.includes('PROJECT')) return ErrorCategory.PROJECT;
    if (code.includes('VALIDATION')) return ErrorCategory.VALIDATION;
    if (code.includes('COST')) return ErrorCategory.COST;
    if (code.includes('NETWORK')) return ErrorCategory.NETWORK;
    if (code.includes('CREDENTIALS') || code.includes('UNAUTHORIZED')) return ErrorCategory.AUTHENTICATION;
    if (code.includes('CONFIGURATION')) return ErrorCategory.CONFIGURATION;
    return ErrorCategory.SYSTEM;
  }

  /**
   * Generate recovery actions for an error code
   * @private
   */
  private generateRecoveryActions(code: CloudErrorCode): string[] {
    const recoveryMap: Partial<Record<CloudErrorCode, string[]>> = {
      [CloudErrorCode.MISSING_CREDENTIALS]: [
        'Check provider configuration',
        'Verify API keys are set correctly',
        'Ensure credentials have proper permissions'
      ],
      [CloudErrorCode.PROVIDER_UNAUTHORIZED]: [
        'Refresh authentication tokens',
        'Verify API key validity',
        'Check account permissions'
      ],
      [CloudErrorCode.DEPLOYMENT_FAILED]: [
        'Check deployment logs for details',
        'Verify project configuration',
        'Try deploying again'
      ],
      [CloudErrorCode.NETWORK_ERROR]: [
        'Check internet connectivity',
        'Verify provider service status',
        'Retry the operation'
      ],
      [CloudErrorCode.PROJECT_NOT_FOUND]: [
        'Verify project path is correct',
        'Check if project exists',
        'Ensure proper file permissions'
      ],
    };

    return recoveryMap[code] || ['Contact support if the issue persists'];
  }

  /**
   * Determine if an error is retryable
   * @private
   */
  private isRetryable(code: CloudErrorCode): boolean {
    const retryableErrors = [
      CloudErrorCode.NETWORK_ERROR,
      CloudErrorCode.TIMEOUT,
      CloudErrorCode.PROVIDER_RATE_LIMITED,
      CloudErrorCode.PROVIDER_API_ERROR,
    ];

    return retryableErrors.includes(code);
  }

  /**
   * Log error with appropriate level
   * @private
   */
  private logError(error: CloudError): void {
    const logData = {
      code: error.code,
      message: error.message,
      severity: error.severity,
      category: error.category,
      provider: error.provider,
      context: error.context,
      retryable: error.retryable,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error('Critical cloud error', new Error(error.message), logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error('High severity cloud error', new Error(error.message), logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn('Medium severity cloud error', logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.info('Low severity cloud error', logData);
        break;
    }
  }
}

/**
 * Global error handler instance
 */
export const globalCloudErrorHandler = new CloudErrorHandler();

/**
 * Create a new cloud error handler
 * @function createCloudErrorHandler
 * @returns {CloudErrorHandler} New error handler instance
 */
export const createCloudErrorHandler = (): CloudErrorHandler => {
  return new CloudErrorHandler();
};

/**
 * Convenience function to create a cloud error
 * @function createCloudError
 * @param {CloudErrorCode} code - Error code
 * @param {string} message - Error message
 * @param {object} options - Additional options
 * @returns {CloudError} Created error
 */
export const createCloudError = (
  code: CloudErrorCode,
  message: string,
  options: Parameters<CloudErrorHandler['createError']>[2] = {}
): CloudError => {
  return globalCloudErrorHandler.createError(code, message, options);
};

/**
 * Convenience function to handle errors
 * @function handleCloudError
 * @param {Error | CloudError} error - Error to handle
 * @param {object} context - Additional context
 * @returns {Promise<CloudError>} Processed error
 */
export const handleCloudError = async (
  error: Error | CloudError,
  context: Record<string, any> = {}
): Promise<CloudError> => {
  return globalCloudErrorHandler.handleError(error, context);
};

/**
 * Decorator for wrapping operations with error handling
 * @function withErrorHandling
 * @param {object} context - Context for error handling
 * @returns {Function} Method decorator
 */
export function withErrorHandling(context: Record<string, any> = {}) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;

    descriptor.value = globalCloudErrorHandler.wrapOperation(originalMethod, {
      ...context,
      method: propertyKey,
      class: target.constructor.name,
    }) as T;

    return descriptor;
  };
}