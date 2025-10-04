/**
 * @fileoverview AI Service Factory - Production-Grade Service Creation
 * 
 * This module provides a factory for creating AI services with different configurations,
 * eliminating the need for multiple service implementations while maintaining type safety.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { ILogger } from '../../../core/logging/logger.interface.js';
import type { IMetricsCollector } from '../../../core/metrics/metrics.interface.js';
import type { IProviderRegistry } from '../../../core/factories/provider-factory.js';
import type { IConversationManager, IMessageProcessor } from '../../types/ai-service.types.js';
import type { AIServiceConfig } from './ai-service-config.js';
import { AIServiceConfigs, mergeAIServiceConfig, isValidAIServiceConfig } from './ai-service-config.js';
import { AIService } from './ai-service-unified.js';

/**
 * Factory for creating AI services with different configurations
 */
export class AIServiceFactory {
  /**
   * Creates a minimal AI service for simple use cases
   * 
   * @param logger - Logger instance
   * @param metrics - Metrics collector
   * @param providerRegistry - Provider registry
   * @param conversationManager - Conversation manager
   * @param messageProcessor - Message processor
   * @param defaultProvider - Default provider name
   * @returns Configured AI service with minimal features
   */
  static createMinimal(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor,
    defaultProvider: string
  ): AIService {
    return new AIService(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      defaultProvider,
      AIServiceConfigs.MINIMAL
    );
  }

  /**
   * Creates a standard AI service for most production use cases
   * 
   * @param logger - Logger instance
   * @param metrics - Metrics collector
   * @param providerRegistry - Provider registry
   * @param conversationManager - Conversation manager
   * @param messageProcessor - Message processor
   * @param defaultProvider - Default provider name
   * @returns Configured AI service with standard features
   */
  static createStandard(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor,
    defaultProvider: string
  ): AIService {
    return new AIService(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      defaultProvider,
      AIServiceConfigs.STANDARD
    );
  }

  /**
   * Creates an enterprise AI service for high-availability systems
   * 
   * @param logger - Logger instance
   * @param metrics - Metrics collector
   * @param providerRegistry - Provider registry
   * @param conversationManager - Conversation manager
   * @param messageProcessor - Message processor
   * @param defaultProvider - Default provider name
   * @returns Configured AI service with enterprise features
   */
  static createEnterprise(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor,
    defaultProvider: string
  ): AIService {
    return new AIService(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      defaultProvider,
      AIServiceConfigs.ENTERPRISE
    );
  }

  /**
   * Creates a custom AI service with specific configuration
   * 
   * @param logger - Logger instance
   * @param metrics - Metrics collector
   * @param providerRegistry - Provider registry
   * @param conversationManager - Conversation manager
   * @param messageProcessor - Message processor
   * @param defaultProvider - Default provider name
   * @param config - Custom configuration
   * @returns Configured AI service with custom features
   */
  static createCustom(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor,
    defaultProvider: string,
    config: AIServiceConfig
  ): AIService {
    if (!isValidAIServiceConfig(config)) {
      throw new Error('Invalid AI service configuration provided');
    }

    return new AIService(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      defaultProvider,
      config
    );
  }

  /**
   * Creates an AI service by merging a base configuration with overrides
   * 
   * @param logger - Logger instance
   * @param metrics - Metrics collector
   * @param providerRegistry - Provider registry
   * @param conversationManager - Conversation manager
   * @param messageProcessor - Message processor
   * @param defaultProvider - Default provider name
   * @param baseConfig - Base configuration to start from
   * @param overrides - Configuration overrides to apply
   * @returns Configured AI service with merged configuration
   */
  static createWithOverrides(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor,
    defaultProvider: string,
    baseConfig: AIServiceConfig,
    overrides: Partial<AIServiceConfig>
  ): AIService {
    const mergedConfig = mergeAIServiceConfig(baseConfig, overrides);
    
    if (!isValidAIServiceConfig(mergedConfig)) {
      throw new Error('Invalid merged AI service configuration');
    }

    return new AIService(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      defaultProvider,
      mergedConfig
    );
  }

  /**
   * Creates an AI service based on environment variables
   * 
   * @param logger - Logger instance
   * @param metrics - Metrics collector
   * @param providerRegistry - Provider registry
   * @param conversationManager - Conversation manager
   * @param messageProcessor - Message processor
   * @param defaultProvider - Default provider name
   * @returns Configured AI service based on environment
   */
  static createFromEnvironment(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor,
    defaultProvider: string
  ): AIService {
    const environment = process.env['NODE_ENV'] || 'development';
    const aiServiceMode = process.env['AI_SERVICE_MODE'] || 'standard';

    let baseConfig: AIServiceConfig;

    switch (aiServiceMode.toLowerCase()) {
      case 'minimal':
        baseConfig = AIServiceConfigs.MINIMAL;
        break;
      case 'enterprise':
        baseConfig = AIServiceConfigs.ENTERPRISE;
        break;
      case 'standard':
      default:
        baseConfig = AIServiceConfigs.STANDARD;
        break;
    }

    // Apply environment-specific overrides
    const overrides: Partial<AIServiceConfig> = {};

    if (environment === 'development') {
      (overrides as any).enableAdvancedMetrics = false;
      (overrides as any).defaultTimeout = 30000;
    } else if (environment === 'production') {
      (overrides as any).enableRateLimiting = true;
      (overrides as any).enableCircuitBreaker = true;
      (overrides as any).enableRetryLogic = true;
    }

    return this.createWithOverrides(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      defaultProvider,
      baseConfig,
      overrides
    );
  }

  /**
   * Creates an AI service with runtime configuration updates
   * 
   * @param logger - Logger instance
   * @param metrics - Metrics collector
   * @param providerRegistry - Provider registry
   * @param conversationManager - Conversation manager
   * @param messageProcessor - Message processor
   * @param defaultProvider - Default provider name
   * @param configProvider - Function that provides configuration at runtime
   * @returns Configured AI service with runtime configuration
   */
  static createWithRuntimeConfig(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor,
    defaultProvider: string,
    configProvider: () => AIServiceConfig
  ): AIService {
    const config = configProvider();
    
    if (!isValidAIServiceConfig(config)) {
      throw new Error('Invalid runtime AI service configuration');
    }

    return new AIService(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      defaultProvider,
      config
    );
  }
}

/**
 * Convenience functions for common use cases
 */
export const AIServiceBuilder = {
  /**
   * Creates a builder for custom AI service configuration
   */
  create(): AIServiceConfigBuilder {
    return new AIServiceConfigBuilder();
  },

  /**
   * Quick creation methods
   */
  minimal: AIServiceFactory.createMinimal,
  standard: AIServiceFactory.createStandard,
  enterprise: AIServiceFactory.createEnterprise,
  custom: AIServiceFactory.createCustom,
  fromEnvironment: AIServiceFactory.createFromEnvironment
} as const;

/**
 * Builder pattern for creating custom AI service configurations
 */
export class AIServiceConfigBuilder {
  private config: Partial<AIServiceConfig> = {};

  /**
   * Enables rate limiting
   */
  withRateLimiting(config?: AIServiceConfig['rateLimitConfig']): this {
    (this.config as any).enableRateLimiting = true;
    if (config) {
      (this.config as any).rateLimitConfig = config;
    }
    return this;
  }

  /**
   * Enables circuit breaker
   */
  withCircuitBreaker(config?: AIServiceConfig['circuitBreakerConfig']): this {
    (this.config as any).enableCircuitBreaker = true;
    if (config) {
      (this.config as any).circuitBreakerConfig = config;
    }
    return this;
  }

  /**
   * Enables retry logic
   */
  withRetryLogic(config?: AIServiceConfig['retryConfig']): this {
    (this.config as any).enableRetryLogic = true;
    if (config) {
      (this.config as any).retryConfig = config;
    }
    return this;
  }

  /**
   * Enables input sanitization
   */
  withInputSanitization(config?: AIServiceConfig['sanitizationConfig']): this {
    (this.config as any).enableInputSanitization = true;
    if (config) {
      (this.config as any).sanitizationConfig = config;
    }
    return this;
  }

  /**
   * Enables advanced metrics
   */
  withAdvancedMetrics(config?: AIServiceConfig['metricsConfig']): this {
    (this.config as any).enableAdvancedMetrics = true;
    if (config) {
      (this.config as any).metricsConfig = config;
    }
    return this;
  }

  /**
   * Sets timeout configuration
   */
  withTimeout(timeout: number): this {
    (this.config as any).defaultTimeout = timeout;
    (this.config as any).enableTimeoutHandling = true;
    return this;
  }

  /**
   * Sets message length limits
   */
  withMessageLimits(minLength: number, maxLength: number): this {
    (this.config as any).minMessageLength = minLength;
    (this.config as any).maxMessageLength = maxLength;
    return this;
  }

  /**
   * Builds the final configuration
   */
  build(): AIServiceConfig {
    // Start with standard config and merge custom settings
    const baseConfig = AIServiceConfigs.STANDARD;
    const finalConfig = mergeAIServiceConfig(baseConfig, this.config);
    
    if (!isValidAIServiceConfig(finalConfig)) {
      throw new Error('Invalid AI service configuration built');
    }

    return finalConfig;
  }
}