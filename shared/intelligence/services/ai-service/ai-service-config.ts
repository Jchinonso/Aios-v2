/**
 * @fileoverview AI Service Configuration - Type-Safe Feature Flags
 * 
 * This module provides type-safe configuration for AI service features,
 * enabling different complexity levels without code duplication.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly burstLimit?: number;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly recoveryTimeoutMs: number;
  readonly halfOpenMaxCalls?: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly exponentialBackoff: boolean;
  readonly retryableErrors: readonly string[];
}

/**
 * Input sanitization configuration
 */
export interface SanitizationConfig {
  readonly removeScriptTags: boolean;
  readonly removeJavaScriptProtocols: boolean;
  readonly removeDataUrls: boolean;
  readonly normalizeWhitespace: boolean;
  readonly maxLength: number;
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  readonly enableBasicMetrics: boolean;
  readonly enableAdvancedMetrics: boolean;
  readonly enableHistograms: boolean;
  readonly enableCustomTags: boolean;
}

/**
 * AI Service feature configuration with strict typing
 * 
 * @template TFeatures - Feature flags type for compile-time validation
 */
export interface AIServiceConfig {
  readonly enableRateLimiting: boolean;
  readonly enableCircuitBreaker: boolean;
  readonly enableRetryLogic: boolean;
  readonly enableInputSanitization: boolean;
  readonly enableAdvancedMetrics: boolean;
  readonly enableTimeoutHandling: boolean;
  readonly enableSecurityValidation: boolean;
  readonly defaultTimeout: number;
  readonly maxMessageLength: number;
  readonly minMessageLength: number;
  readonly rateLimitConfig?: RateLimitConfig;
  readonly circuitBreakerConfig?: CircuitBreakerConfig;
  readonly retryConfig?: RetryConfig;
  readonly sanitizationConfig?: SanitizationConfig;
  readonly metricsConfig?: MetricsConfig;
}

/**
 * Type-safe feature configuration builder
 * 
 * @template TConfig - Configuration type being built
 */
export type AIServiceConfigBuilder<TConfig extends Partial<AIServiceConfig> = Partial<AIServiceConfig>> = {
  readonly [K in keyof TConfig]: TConfig[K] extends boolean 
    ? { (): AIServiceConfigBuilder<TConfig> }
    : TConfig[K] extends object
    ? { (config: TConfig[K]): AIServiceConfigBuilder<TConfig> }
    : { (value: TConfig[K]): AIServiceConfigBuilder<TConfig> }
};

/**
 * Predefined configurations for different use cases
 */
export const AIServiceConfigs = {
  /**
   * Minimal configuration for simple use cases
   */
  MINIMAL: {
    enableRateLimiting: false,
    enableCircuitBreaker: false,
    enableRetryLogic: false,
    enableInputSanitization: false,
    enableAdvancedMetrics: false,
    enableTimeoutHandling: false,
    enableSecurityValidation: true,
    defaultTimeout: 30000,
    maxMessageLength: 100000,
    minMessageLength: 1,
    metricsConfig: {
      enableBasicMetrics: true,
      enableAdvancedMetrics: false,
      enableHistograms: false,
      enableCustomTags: false
    }
  } as const satisfies AIServiceConfig,

  /**
   * Standard configuration for most production use cases
   */
  STANDARD: {
    enableRateLimiting: true,
    enableCircuitBreaker: false,
    enableRetryLogic: true,
    enableInputSanitization: true,
    enableAdvancedMetrics: true,
    enableTimeoutHandling: true,
    enableSecurityValidation: true,
    defaultTimeout: 45000,
    maxMessageLength: 100000,
    minMessageLength: 1,
    rateLimitConfig: {
      maxRequests: 100,
      windowMs: 60000,
      burstLimit: 10
    },
    retryConfig: {
      maxRetries: 2,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      exponentialBackoff: true,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'TimeoutError', 'NetworkError']
    },
    sanitizationConfig: {
      removeScriptTags: true,
      removeJavaScriptProtocols: true,
      removeDataUrls: true,
      normalizeWhitespace: true,
      maxLength: 100000
    },
    metricsConfig: {
      enableBasicMetrics: true,
      enableAdvancedMetrics: true,
      enableHistograms: true,
      enableCustomTags: true
    }
  } as const satisfies AIServiceConfig,

  /**
   * Enterprise configuration for high-availability systems
   */
  ENTERPRISE: {
    enableRateLimiting: true,
    enableCircuitBreaker: true,
    enableRetryLogic: true,
    enableInputSanitization: true,
    enableAdvancedMetrics: true,
    enableTimeoutHandling: true,
    enableSecurityValidation: true,
    defaultTimeout: 60000,
    maxMessageLength: 100000,
    minMessageLength: 1,
    rateLimitConfig: {
      maxRequests: 200,
      windowMs: 60000,
      burstLimit: 20
    },
    circuitBreakerConfig: {
      failureThreshold: 5,
      recoveryTimeoutMs: 30000,
      halfOpenMaxCalls: 3
    },
    retryConfig: {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      exponentialBackoff: true,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'TimeoutError', 'NetworkError', 'RateLimitError']
    },
    sanitizationConfig: {
      removeScriptTags: true,
      removeJavaScriptProtocols: true,
      removeDataUrls: true,
      normalizeWhitespace: true,
      maxLength: 100000
    },
    metricsConfig: {
      enableBasicMetrics: true,
      enableAdvancedMetrics: true,
      enableHistograms: true,
      enableCustomTags: true
    }
  } as const satisfies AIServiceConfig
} as const;

/**
 * Type guard to check if a configuration is valid
 */
export function isValidAIServiceConfig(config: unknown): config is AIServiceConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const c = config as Record<string, unknown>;
  
  return (
    typeof c['enableRateLimiting'] === 'boolean' &&
    typeof c['enableCircuitBreaker'] === 'boolean' &&
    typeof c['enableRetryLogic'] === 'boolean' &&
    typeof c['enableInputSanitization'] === 'boolean' &&
    typeof c['enableAdvancedMetrics'] === 'boolean' &&
    typeof c['enableTimeoutHandling'] === 'boolean' &&
    typeof c['enableSecurityValidation'] === 'boolean' &&
    typeof c['defaultTimeout'] === 'number' &&
    typeof c['maxMessageLength'] === 'number' &&
    typeof c['minMessageLength'] === 'number' &&
    (c['defaultTimeout'] as number) > 0 &&
    (c['maxMessageLength'] as number) > 0 &&
    (c['minMessageLength'] as number) > 0 &&
    (c['maxMessageLength'] as number) >= (c['minMessageLength'] as number)
  );
}

/**
 * Merge configurations with type safety
 */
export function mergeAIServiceConfig(
  base: AIServiceConfig,
  override: Partial<AIServiceConfig>
): AIServiceConfig {
  const result: AIServiceConfig = {
    ...base,
    ...override
  };

  // Handle nested config objects with proper undefined handling
  if (override.rateLimitConfig !== undefined) {
    (result as any).rateLimitConfig = base.rateLimitConfig 
      ? { ...base.rateLimitConfig, ...override.rateLimitConfig }
      : override.rateLimitConfig;
  }

  if (override.circuitBreakerConfig !== undefined) {
    (result as any).circuitBreakerConfig = base.circuitBreakerConfig
      ? { ...base.circuitBreakerConfig, ...override.circuitBreakerConfig }
      : override.circuitBreakerConfig;
  }

  if (override.retryConfig !== undefined) {
    (result as any).retryConfig = base.retryConfig
      ? { ...base.retryConfig, ...override.retryConfig }
      : override.retryConfig;
  }

  if (override.sanitizationConfig !== undefined) {
    (result as any).sanitizationConfig = base.sanitizationConfig
      ? { ...base.sanitizationConfig, ...override.sanitizationConfig }
      : override.sanitizationConfig;
  }

  if (override.metricsConfig !== undefined) {
    (result as any).metricsConfig = base.metricsConfig
      ? { ...base.metricsConfig, ...override.metricsConfig }
      : override.metricsConfig;
  }

  return result;
}
