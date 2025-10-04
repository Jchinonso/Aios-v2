/**
 * @fileoverview AI Service - Unified Production-Grade AI Operations Orchestrator
 * 
 * This module provides a single, configurable AI service that adapts to different
 * complexity requirements through feature flags and dependency injection, eliminating
 * code duplication while maintaining type safety and production readiness.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { IResult } from '../../../core/types/result.js';
import { Result } from '../../../core/types/result.js';
import type { ILogger } from '../../../core/logging/logger.interface.js';
import type { IMetricsCollector } from '../../../core/metrics/metrics.interface.js';
import type { IProviderRegistry } from '../../../core/factories/provider-factory.js';
import { CredentialManager } from '../../../core/credentials/index.js';
import type {
  AIMessage,
  AIResponse,
  AIConversation,
  AIProviderConfig
} from '../../../types/ai.types.js';
import type {
  IAIService,
  IConversationManager,
  IMessageProcessor,
  AIServiceOptions
} from '../../types/ai-service.types.js';
import type { AIServiceConfig } from './ai-service-config.js';
import { RateLimiter, CircuitBreaker, RetryHandler, InputSanitizer, TimeoutHandler, SecurityValidator } from './ai-service-features.js';

/**
 * Unified AI Service - Single implementation with configurable features
 * 
 * This service provides a unified interface for AI operations with configurable
 * enterprise features. It eliminates code duplication by using feature flags
 * and composable components.
 * 
 * @template TConfig - Configuration type for compile-time feature validation
 * @template TProvider - Provider type for type-safe provider operations
 * 
 * @example
 * ```typescript
 * // Simple configuration
 * const simpleService = new AIService(
 *   logger, metrics, providerRegistry, conversationManager, messageProcessor,
 *   'openai', AIServiceConfigs.MINIMAL
 * );
 * 
 * // Enterprise configuration
 * const enterpriseService = new AIService(
 *   logger, metrics, providerRegistry, conversationManager, messageProcessor,
 *   'openai', AIServiceConfigs.ENTERPRISE
 * );
 * ```
 * 
 * @implements {IAIService}
 */
export class AIService implements IAIService {
  private readonly credentialManager: CredentialManager;
  private readonly rateLimiter?: RateLimiter;
  private readonly circuitBreaker?: CircuitBreaker;
  private readonly retryHandler?: RetryHandler;
  private readonly inputSanitizer?: InputSanitizer;
  private readonly timeoutHandler: TimeoutHandler;
  private readonly securityValidator: SecurityValidator;

  // Allowed providers - centralized configuration
  private static readonly ALLOWED_PROVIDERS = [
    'openai', 
    'anthropic', 
    'ollama', 
    'google',
    'google-cloud',
    'groq',
    'cohere',
    'huggingface',
    'replicate',
    'local'
  ] as const;

  /**
   * Creates an instance of AIService
   * 
   * @param logger - Logger instance for logging operations
   * @param metrics - Metrics collector for performance tracking
   * @param providerRegistry - Registry for AI provider management
   * @param conversationManager - Manager for conversation state
   * @param messageProcessor - Processor for message formatting
   * @param defaultProvider - Default AI provider to use
   * @param config - Configuration for enabling/disabling features
   */
  constructor(
    private readonly logger: ILogger,
    private readonly metrics: IMetricsCollector,
    private readonly providerRegistry: IProviderRegistry,
    private readonly conversationManager: IConversationManager,
    private readonly messageProcessor: IMessageProcessor,
    private readonly defaultProvider: string,
    private readonly config: AIServiceConfig
  ) {
    this.credentialManager = new CredentialManager();

    // Initialize features based on configuration
    if (config.enableRateLimiting && config.rateLimitConfig) {
      this.rateLimiter = new RateLimiter(config.rateLimitConfig, logger);
    }

    if (config.enableCircuitBreaker && config.circuitBreakerConfig) {
      this.circuitBreaker = new CircuitBreaker(config.circuitBreakerConfig, logger);
    }

    if (config.enableRetryLogic && config.retryConfig) {
      this.retryHandler = new RetryHandler(config.retryConfig, logger);
    }

    if (config.enableInputSanitization && config.sanitizationConfig) {
      this.inputSanitizer = new InputSanitizer(config.sanitizationConfig, logger);
    }

    this.timeoutHandler = new TimeoutHandler(config.defaultTimeout, logger);
    this.securityValidator = new SecurityValidator();

    // Validate default provider
    if (!AIService.ALLOWED_PROVIDERS.includes(defaultProvider as any)) {
      throw new Error(`Invalid default provider: ${defaultProvider}. Allowed providers: ${AIService.ALLOWED_PROVIDERS.join(', ')}`);
    }
  }

  /**
   * Sends a message to the AI provider and returns the response
   * 
   * @param content - The message content to send
   * @param options - Optional configuration for the request
   * @returns Promise resolving to a Result containing the AI response or error
   * 
   * @throws {Error} When input validation fails
   * @throws {Error} When rate limiting is exceeded
   * @throws {Error} When circuit breaker is open
   * @throws {Error} When provider is not available
   * @throws {Error} When request times out
   */
  async sendMessage(content: string, options: AIServiceOptions = {}): Promise<IResult<AIResponse>> {
    const startTime = Date.now();
    const provider = options.provider || this.defaultProvider;

    try {
      // Input validation (always required)
      const validationResult = this.validateInput(content, options);
      if (!validationResult.isValid) {
        return Result.failure(new Error(`Validation failed: ${validationResult.errors.join(', ')}`));
      }

      // Input sanitization (if enabled)
      const processedContent = this.config.enableInputSanitization && this.inputSanitizer
        ? this.inputSanitizer.sanitize(content)
        : content;

      this.logger.info('Processing AI message', {
        provider,
        conversationId: options.conversationId,
        contentLength: processedContent.length
      });

      // Rate limiting (if enabled)
      if (this.config.enableRateLimiting && this.rateLimiter && !this.rateLimiter.checkLimit(provider)) {
        this.metrics.increment('ai.rate_limit_exceeded', { provider });
        return Result.failure(new Error(`Rate limit exceeded for provider: ${provider}`));
      }

      // Circuit breaker (if enabled)
      if (this.config.enableCircuitBreaker && this.circuitBreaker && this.circuitBreaker.isOpen(provider)) {
        this.metrics.increment('ai.circuit_breaker_open', { provider });
        return Result.failure(new Error(`Circuit breaker is open for provider: ${provider}`));
      }

      // Get provider
      const providerResult = await this.getProvider(provider);
      if (providerResult.isFailure) {
        return Result.failure(providerResult.error);
      }

      // Process message
      const messagesResult = await this.messageProcessor.processMessage(processedContent, options);
      if (messagesResult.isFailure) {
        return Result.failure(messagesResult.error);
      }

      // Build provider config
      const config = this.buildProviderConfig(provider, options.config || {});

      // Execute with optional retry logic and timeout
      const executeOperation = async (): Promise<AIResponse> => {
        return providerResult.value.sendMessage(messagesResult.value, config);
      };

      const response = this.config.enableRetryLogic && this.retryHandler
        ? await this.retryHandler.execute(executeOperation, `sendMessage to ${provider}`)
        : await executeOperation();

      // Apply timeout if enabled
      const finalResponse = this.config.enableTimeoutHandling
        ? await this.timeoutHandler.executeWithTimeout(
            () => Promise.resolve(response),
            config.timeout || this.config.defaultTimeout,
            `sendMessage to ${provider}`
          )
        : response;

      // Record success in circuit breaker
      if (this.config.enableCircuitBreaker && this.circuitBreaker) {
        this.circuitBreaker.recordSuccess(provider);
      }

      // Update conversation if enabled
      await this.updateConversation(options.conversationId, processedContent, finalResponse.content);

      // Record metrics
      this.recordMetrics(provider, finalResponse, Date.now() - startTime, options.conversationId);

      return Result.success(finalResponse);
    } catch (error) {
      // Record failure in circuit breaker
      if (this.config.enableCircuitBreaker && this.circuitBreaker) {
        this.circuitBreaker.recordFailure(provider, error as Error);
      }

      this.recordErrorMetrics(provider, error as Error, Date.now() - startTime);
      
      this.logger.error('AI message failed', error as Error, {
        provider,
        conversationId: options.conversationId
      });

      return Result.failure(error as Error);
    }
  }

  /**
   * Streams a message to the AI provider and returns an async iterator for real-time responses
   */
  async streamMessage(content: string, options: AIServiceOptions = {}): Promise<IResult<AsyncIterableIterator<string>>> {
    const provider = options.provider || this.defaultProvider;

    try {
      // Input validation
      const validationResult = this.validateInput(content, options);
      if (!validationResult.isValid) {
        return Result.failure(new Error(`Validation failed: ${validationResult.errors.join(', ')}`));
      }

      // Input sanitization (if enabled)
      const processedContent = this.config.enableInputSanitization && this.inputSanitizer
        ? this.inputSanitizer.sanitize(content)
        : content;

      // Get provider
      const providerResult = await this.getProvider(provider);
      if (providerResult.isFailure) {
        return Result.failure(providerResult.error);
      }

      // Check if provider supports streaming
      if (!providerResult.value.streamMessage) {
        return Result.failure(new Error(`Provider '${provider}' does not support streaming`));
      }

      // Process message
      const messagesResult = await this.messageProcessor.processMessage(processedContent, options);
      if (messagesResult.isFailure) {
        return Result.failure(messagesResult.error);
      }

      // Build provider config
      const config = this.buildProviderConfig(provider, options.config || {});

      // Stream from provider
      const stream = providerResult.value.streamMessage(messagesResult.value, config);

      return Result.success(stream);
    } catch (error) {
      this.logger.error('AI streaming failed', error as Error, { provider });
      return Result.failure(error as Error);
    }
  }

  /**
   * Creates a new conversation with optional context
   */
  async createConversation(context?: Record<string, any>): Promise<IResult<string>> {
    try {
      return await this.conversationManager.createConversation(context);
    } catch (error) {
      this.logger.error('Failed to create conversation', error as Error);
      return Result.failure(error as Error);
    }
  }

  /**
   * Retrieves a conversation by its ID
   */
  async getConversation(conversationId: string): Promise<IResult<AIConversation | null>> {
    try {
      return await this.conversationManager.getConversation(conversationId);
    } catch (error) {
      this.logger.error('Failed to get conversation', error as Error, { conversationId });
      return Result.failure(error as Error);
    }
  }

  /**
   * Clears/deletes a conversation by its ID
   */
  async clearConversation(conversationId: string): Promise<IResult<void>> {
    try {
      return await this.conversationManager.clearConversation(conversationId);
    } catch (error) {
      this.logger.error('Failed to clear conversation', error as Error, { conversationId });
      return Result.failure(error as Error);
    }
  }

  /**
   * Lists all active conversations
   */
  async listConversations(): Promise<IResult<AIConversation[]>> {
    try {
      return await this.conversationManager.listConversations();
    } catch (error) {
      this.logger.error('Failed to list conversations', error as Error);
      return Result.failure(error as Error);
    }
  }

  /**
   * Gets health status for a specific provider or all providers
   */
  async getProviderHealth(provider?: string): Promise<IResult<Record<string, any>>> {
    try {
      if (provider) {
        const providerResult = await this.getProvider(provider);
        if (providerResult.isFailure) {
          return Result.failure(providerResult.error);
        }

        const health = await providerResult.value.getHealth();
        return Result.success({ [provider]: health });
      } else {
        // Get health for all providers
        const healthStatus: Record<string, any> = {};
        
        for (const providerName of AIService.ALLOWED_PROVIDERS) {
          try {
            const providerResult = await this.getProvider(providerName);
            if (providerResult.isSuccess) {
              healthStatus[providerName] = await providerResult.value.getHealth();
            }
          } catch (error) {
            healthStatus[providerName] = {
              isHealthy: false,
              errors: [(error as Error).message]
            };
          }
        }

        return Result.success(healthStatus);
      }
    } catch (error) {
      this.logger.error('Failed to get provider health', error as Error, { provider });
      return Result.failure(error as Error);
    }
  }

  /**
   * Gets metrics for a specific provider or all providers
   */
  async getProviderMetrics(provider?: string): Promise<IResult<Record<string, any>>> {
    try {
      if (provider) {
        const providerResult = await this.getProvider(provider);
        if (providerResult.isFailure) {
          return Result.failure(providerResult.error);
        }

        const metrics = providerResult.value.getMetrics();
        return Result.success({ [provider]: metrics });
      } else {
        // Get metrics for all providers
        const allMetrics: Record<string, any> = {};
        
        for (const providerName of AIService.ALLOWED_PROVIDERS) {
          try {
            const providerResult = await this.getProvider(providerName);
            if (providerResult.isSuccess) {
              allMetrics[providerName] = providerResult.value.getMetrics();
            }
          } catch (error) {
            allMetrics[providerName] = { error: (error as Error).message };
          }
        }

        return Result.success(allMetrics);
      }
    } catch (error) {
      this.logger.error('Failed to get provider metrics', error as Error, { provider });
      return Result.failure(error as Error);
    }
  }

  // Private helper methods

  /**
   * Type guard to check if a value is a valid string
   * 
   * @param value - The value to check
   * @returns True if the value is a non-empty string
   */
  private isValidString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Type guard to check if a value is a valid number
   * 
   * @param value - The value to check
   * @returns True if the value is a positive number
   */
  private isValidNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && value > 0;
  }

  /**
   * Type guard to check if a provider is valid
   * 
   * @param provider - The provider to check
   * @returns True if the provider is in the allowed list
   */
  private isValidProvider(provider: unknown): provider is string {
    return typeof provider === 'string' && AIService.ALLOWED_PROVIDERS.includes(provider as any);
  }

  /**
   * Validates input parameters with comprehensive type checking
   * 
   * @param content - The message content to validate
   * @param options - The options to validate
   * @returns Validation result with errors if any
   */
  private validateInput(content: string, options: AIServiceOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Type safety checks
    if (!this.isValidString(content)) {
      errors.push('Content must be a non-empty string');
    }

    // Content validation
    const contentValidation = this.securityValidator.validateInput(
      content, 
      this.config.maxMessageLength, 
      this.config.minMessageLength
    );
    errors.push(...contentValidation.errors);

    // Provider validation with type guard
    const provider = options.provider || this.defaultProvider;
    if (!this.isValidProvider(provider)) {
      errors.push(`Invalid provider: ${provider}. Allowed providers: ${AIService.ALLOWED_PROVIDERS.join(', ')}`);
    } else {
      const providerValidation = this.securityValidator.validateProvider(provider, AIService.ALLOWED_PROVIDERS);
      errors.push(...providerValidation.errors);
    }

    // Conversation ID validation with regex
    if (options.conversationId && !this.isValidString(options.conversationId)) {
      errors.push('Conversation ID must be a non-empty string');
    } else if (options.conversationId && !/^conv_\d+_[a-z0-9]+$/.test(options.conversationId)) {
      errors.push('Invalid conversation ID format');
    }

    // System prompt validation
    if (options.systemPrompt) {
      if (!this.isValidString(options.systemPrompt)) {
        errors.push('System prompt must be a non-empty string');
      } else if (options.systemPrompt.length > this.config.maxMessageLength) {
        errors.push('System prompt is too long');
      }
    }

    // Config validation
    if (options.config) {
      if (options.config.maxTokens && !this.isValidNumber(options.config.maxTokens)) {
        errors.push('maxTokens must be a positive number');
      }
      if (options.config.temperature && (typeof options.config.temperature !== 'number' || options.config.temperature < 0 || options.config.temperature > 2)) {
        errors.push('temperature must be a number between 0 and 2');
      }
      if (options.config.timeout && !this.isValidNumber(options.config.timeout)) {
        errors.push('timeout must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets a provider with comprehensive error handling and type safety
   * 
   * @param providerName - The name of the provider to get
   * @returns Promise resolving to a Result containing the provider or error
   * 
   * @throws {TypeError} When provider name is invalid
   * @throws {ReferenceError} When provider is not found
   * @throws {Error} When provider registry fails
   */
  private async getProvider(providerName: string): Promise<IResult<any>> {
    try {
      // Type safety check
      if (!this.isValidProvider(providerName)) {
        return Result.failure(new TypeError(`Invalid provider name: ${providerName}`));
      }

      const provider = this.providerRegistry.get(providerName);
      if (!provider) {
        return Result.failure(new ReferenceError(`Provider '${providerName}' not found or not supported`));
      }

      // Validate provider has required methods
      if (typeof provider.sendMessage !== 'function') {
        return Result.failure(new TypeError(`Provider '${providerName}' does not implement sendMessage method`));
      }

      return Result.success(provider);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return Result.failure(new Error(`Failed to get provider '${providerName}': ${errorMessage}`));
    }
  }

  private buildProviderConfig(provider: string, config: Partial<AIProviderConfig>): AIProviderConfig {
    try {
      // Use credential manager to build the config with automatic credential injection
      const baseConfig = this.credentialManager.buildProviderConfig(provider, config);
      
      // Additional validation
      const validationResult = this.validateProviderConfig(baseConfig);
      if (!validationResult.isValid) {
        throw new Error(`Invalid provider config: ${validationResult.errors.join(', ')}`);
      }

      return baseConfig;
    } catch (error) {
      // Fallback to manual config building if credential manager fails
      this.logger.warn(`Failed to build config via credential manager for ${provider}, using fallback`, {
        error: (error as Error).message
      });

      const validationResult = this.validateProviderConfig(config);
      if (!validationResult.isValid) {
        throw new Error(`Invalid provider config: ${validationResult.errors.join(', ')}`);
      }

      return {
        apiKey: config.apiKey || '',
        model: config.model || 'gpt-3.5-turbo',
        maxTokens: config.maxTokens || 4096,
        temperature: config.temperature || 0.7,
        timeout: config.timeout || this.config.defaultTimeout,
        retries: config.retries || 3,
        ...(config.baseUrl && { baseUrl: config.baseUrl })
      };
    }
  }

  private validateProviderConfig(config: Partial<AIProviderConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 100000)) {
      errors.push('maxTokens must be between 1 and 100000');
    }

    if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
      errors.push('temperature must be between 0 and 2');
    }

    if (config.timeout && config.timeout < 1000) {
      errors.push('timeout must be at least 1000ms');
    }

    if (config.retries && (config.retries < 0 || config.retries > 10)) {
      errors.push('retries must be between 0 and 10');
    }

    return { isValid: errors.length === 0, errors };
  }

  private async updateConversation(conversationId: string | undefined, userContent: string, assistantContent: string): Promise<void> {
    if (!conversationId) return;

    try {
      const conversationResult = await this.conversationManager.getConversation(conversationId);
      if (conversationResult.isSuccess && conversationResult.value) {
        const newMessages: AIMessage[] = [
          { role: 'user', content: userContent, timestamp: new Date() },
          { role: 'assistant', content: assistantContent, timestamp: new Date() }
        ];
        await this.conversationManager.updateConversation(conversationId, newMessages);
      }
    } catch (error) {
      this.logger.warn('Failed to update conversation', { conversationId, error: (error as Error).message });
    }
  }

  private recordMetrics(provider: string, response: AIResponse, duration: number, conversationId?: string): void {
    // Basic metrics (always enabled)
    this.metrics.increment('ai.message.sent', {
      provider,
      conversationLength: conversationId ? '1' : '0', // Simplified for now
      messageLength: response.content.length.toString(),
      responseTime: duration.toString()
    });

    // Advanced metrics (if enabled)
    if (this.config.enableAdvancedMetrics && this.config.metricsConfig?.enableAdvancedMetrics) {
      this.metrics.histogram('ai.response.tokens', response.usage?.totalTokens || 0);
      this.metrics.histogram('ai.response.length', response.content.length);
      this.metrics.histogram('ai.response.time', duration);

      if (this.config.metricsConfig.enableCustomTags) {
        this.metrics.increment('ai.message.success', {
          provider,
          model: response.model ?? 'unknown',
          finishReason: response.finishReason ?? 'unknown'
        });
      }
    }
  }

  private recordErrorMetrics(provider: string, error: Error, duration: number): void {
    this.metrics.increment('ai.message.failed', {
      provider,
      error: error.name,
      duration: duration.toString()
    });

    if (this.config.enableAdvancedMetrics && this.config.metricsConfig?.enableAdvancedMetrics) {
      this.metrics.histogram('ai.error.duration', duration);
    }
  }
}
