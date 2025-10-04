/**
 * @fileoverview AI Service - Core Orchestrator for AI Operations
 * 
 * This module provides the main AI service class that coordinates all AI operations
 * including message sending, streaming, conversation management, and provider abstraction.
 * 
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { IResult } from '../../../core/types/result.js'
import { Result } from '../../../core/types/result.js'
import type { ILogger } from '../../../core/logging/logger.interface.js'
import type { IMetricsCollector } from '../../../core/metrics/metrics.interface.js'
import type { IProviderRegistry } from '../../../core/factories/provider-factory.js'
import { CredentialManager } from '../../../core/credentials/index.js'
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

/**
 * AI Service - Core Orchestrator for AI Operations
 * 
 * This class provides a unified interface for interacting with various AI providers
 * including OpenAI, Anthropic, and local models. It handles message processing,
 * conversation management, streaming, and provider abstraction with robust
 * error handling, input validation, and security features.
 * 
 * @example
 * ```typescript
 * const aiService = AIServiceFactory.create(
 *   logger,
 *   metrics,
 *   providerRegistry,
 *   'openai',
 *   50
 * );
 * 
 * const response = await aiService.sendMessage('Hello, world!', {
 *   provider: 'openai',
 *   conversationId: 'conv_123'
 * });
 * ```
 * 
 * @implements {IAIService}
 */
export class AIService implements IAIService {
  // Configuration constants
  private static readonly MAX_MESSAGE_LENGTH = 100000;
  private static readonly MIN_MESSAGE_LENGTH = 1;
  private static readonly DEFAULT_TIMEOUT = 60000; // 60 seconds
  private static readonly MAX_RETRIES = 3;
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
  ];

  // Rate limiting tracking
  private readonly requestCounts = new Map<string, { count: number; resetTime: number }>();
  private readonly rateLimits = new Map<string, { maxRequests: number; windowMs: number }>();

  // Circuit breaker state
  private readonly circuitBreakerState = new Map<string, {
    failures: number;
    lastFailureTime: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  }>();
  /**
   * Creates an instance of AIService
   * 
   * @param {ILogger} logger - Logger instance for logging operations
   * @param {IMetricsCollector} metrics - Metrics collector for performance tracking
   * @param {IProviderRegistry} providerRegistry - Registry for AI provider management
   * @param {IConversationManager} conversationManager - Manager for conversation state
   * @param {IMessageProcessor} messageProcessor - Processor for message formatting
   * @param {string} defaultProvider - Default AI provider to use
   * @param {number} [maxHistoryLength=50] - Maximum conversation history length
   */
  constructor(
    private readonly logger: ILogger,
    private readonly metrics: IMetricsCollector,
    private readonly providerRegistry: IProviderRegistry,
    private readonly conversationManager: IConversationManager,
    private readonly messageProcessor: IMessageProcessor,
    private readonly defaultProvider: string,
    // private readonly _maxHistoryLength: number = 50 // Removed unused property
  ) {
    this.credentialManager = new CredentialManager();
  }

  private readonly credentialManager: CredentialManager;

  /**
   * Sends a message to the AI provider and returns the response
   * 
   * @param {string} content - The message content to send to the AI
   * @param {AIServiceOptions} [options={}] - Optional configuration for the request
   * @param {string} [options.provider] - Specific AI provider to use (overrides default)
   * @param {string} [options.conversationId] - Conversation ID for context-aware responses
   * @param {string} [options.systemPrompt] - System prompt to set context
   * @param {Partial<AIProviderConfig>} [options.config] - Provider-specific configuration
   * @param {number} [options.maxHistoryLength] - Maximum conversation history length
   * 
   * @returns {Promise<IResult<AIResponse>>} Result containing the AI response or error
   * 
   * @example
   * ```typescript
   * const result = await aiService.sendMessage('What is TypeScript?', {
   *   provider: 'openai',
   *   conversationId: 'conv_123',
   *   systemPrompt: 'You are a helpful programming assistant'
   * });
   * 
   * if (result.isSuccess) {
   *   console.log(result.value.content);
   * }
   * ```
   */
  async sendMessage(content: string, options: AIServiceOptions = {}): Promise<IResult<AIResponse>> {
    // Input validation
    const validationResult = this.validateInput(content, options);
    if (!validationResult.isValid) {
      return Result.failure(new Error(`Validation failed: ${validationResult.errors.join(', ')}`));
    }

    // Sanitize input
    const sanitizedContent = this.sanitizeContent(content);
    const sanitizedSystemPrompt = options.systemPrompt ? this.sanitizeContent(options.systemPrompt) : undefined;
    const startTime = Date.now();

    try {
      const provider = options.provider || this.defaultProvider;
      
      this.logger.info('Processing AI message', {
        provider,
        conversationId: options.conversationId
      });

      // Check rate limits
      if (!this.checkRateLimit(provider)) {
        this.metrics.increment('ai.rate_limit_exceeded', { provider });
        return Result.failure(new Error(`Rate limit exceeded for provider: ${provider}`));
      }

      // Check circuit breaker
      if (this.isCircuitBreakerOpen(provider)) {
        this.metrics.increment('ai.circuit_breaker_open', { provider });
        return Result.failure(new Error(`Circuit breaker is open for provider: ${provider}`));
      }

      // Get provider
      const providerResult = await this.getProvider(provider);
      if (providerResult.isFailure) {
        return Result.failure(providerResult.error);
      }

      // Process message
      const messagesResult = await this.messageProcessor.processMessage(sanitizedContent, {
        ...options,
        ...(sanitizedSystemPrompt && { systemPrompt: sanitizedSystemPrompt })
      });
      if (messagesResult.isFailure) {
        return Result.failure(messagesResult.error);
      }

      // Get provider config with automatic credential injection
      const config = this.buildProviderConfig(provider, options.config || {});

      // Execute with retry logic and timeout
      const response = await this.executeWithRetryAndTimeout(
        () => providerResult.value.sendMessage(messagesResult.value, config),
        provider,
        config.timeout || AIService.DEFAULT_TIMEOUT
      ) as AIResponse;

      // Get conversation for metrics
      let conversation: AIConversation | null = null;
      if (options.conversationId) {
        const conversationResult = await this.conversationManager.getConversation(options.conversationId);
        if (conversationResult.isSuccess) {
          conversation = conversationResult.value;
        }
      }

      // Update conversation if enabled
      if (options.conversationId && conversation) {
        const newMessages: AIMessage[] = [
          { role: 'user', content: sanitizedContent, timestamp: new Date() },
          { role: 'assistant', content: response.content, timestamp: new Date() }
        ];
        await this.conversationManager.updateConversation(options.conversationId, newMessages);
      }

      // Record success in circuit breaker
      this.recordSuccess(provider);

      const duration = Date.now() - startTime;
      
      // Enhanced metrics collection
      this.metrics.increment('ai.message.sent', {
        provider,
        conversationLength: (conversation?.messages.length || 0).toString(),
        messageLength: sanitizedContent.length.toString(),
        responseTime: duration.toString()
      });

      this.metrics.histogram('ai.response.tokens', response.usage?.totalTokens || 0);
      this.metrics.histogram('ai.response.length', response.content.length);
      this.metrics.histogram('ai.response.time', duration);

      return Result.success(response);
    } catch (error) {
      const provider = options.provider || this.defaultProvider;
      const duration = Date.now() - startTime;
      
      // Record failure in circuit breaker
      this.recordFailure(provider, error as Error);

      this.metrics.increment('ai.message.failed', {
        provider,
        error: (error as Error).name,
        duration: duration.toString()
      });

      this.logger.error('AI message failed', error as Error, {
        provider,
        conversationId: options.conversationId
      });

      return Result.failure(error as Error);
    }
  }

  /**
   * Streams a message to the AI provider and returns an async iterator for real-time responses
   * 
   * @param {string} content - The message content to send to the AI
   * @param {AIServiceOptions} [options={}] - Optional configuration for the request
   * @param {string} [options.provider] - Specific AI provider to use (overrides default)
   * @param {string} [options.conversationId] - Conversation ID for context-aware responses
   * @param {string} [options.systemPrompt] - System prompt to set context
   * @param {Partial<AIProviderConfig>} [options.config] - Provider-specific configuration
   * 
   * @returns {Promise<IResult<AsyncIterableIterator<string>>>} Result containing the stream iterator or error
   * 
   * @example
   * ```typescript
   * const result = await aiService.streamMessage('Explain quantum computing', {
   *   provider: 'openai'
   * });
   * 
   * if (result.isSuccess) {
   *   for await (const chunk of result.value) {
   *     process.stdout.write(chunk);
   *   }
   * }
   * ```
   */
  async streamMessage(content: string, options: AIServiceOptions = {}): Promise<IResult<AsyncIterableIterator<string>>> {
    try {
      const provider = options.provider || this.defaultProvider;
      
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
      const messagesResult = await this.messageProcessor.processMessage(content, options);
      if (messagesResult.isFailure) {
        return Result.failure(messagesResult.error);
      }

      // Get provider config with automatic credential injection
      const config = this.buildProviderConfig(provider, options.config || {});

      // Stream from provider
      const stream = providerResult.value.streamMessage(messagesResult.value, config);

      return Result.success(stream);
    } catch (error) {
      this.logger.error('AI streaming failed', error as Error, {
        provider: options.provider || this.defaultProvider
      });

      return Result.failure(error as Error);
    }
  }

  /**
   * Creates a new conversation with optional context
   * 
   * @param {Record<string, any>} [context] - Optional context data for the conversation
   * @returns {Promise<IResult<string>>} Result containing the conversation ID or error
   * 
   * @example
   * ```typescript
   * const result = await aiService.createConversation({
   *   topic: 'programming',
   *   difficulty: 'beginner'
   * });
   * 
   * if (result.isSuccess) {
   *   const conversationId = result.value;
   *   // Use conversationId in subsequent requests
   * }
   * ```
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
   * 
   * @param {string} conversationId - The unique identifier of the conversation
   * @returns {Promise<IResult<AIConversation | null>>} Result containing the conversation or null if not found
   * 
   * @example
   * ```typescript
   * const result = await aiService.getConversation('conv_123');
   * 
   * if (result.isSuccess && result.value) {
   *   console.log(`Conversation has ${result.value.messages.length} messages`);
   * }
   * ```
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
   * 
   * @param {string} conversationId - The unique identifier of the conversation to clear
   * @returns {Promise<IResult<void>>} Result indicating success or failure
   * 
   * @example
   * ```typescript
   * const result = await aiService.clearConversation('conv_123');
   * 
   * if (result.isSuccess) {
   *   console.log('Conversation cleared successfully');
   * }
   * ```
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
   * 
   * @returns {Promise<IResult<AIConversation[]>>} Result containing array of all conversations
   * 
   * @example
   * ```typescript
   * const result = await aiService.listConversations();
   * 
   * if (result.isSuccess) {
   *   console.log(`Found ${result.value.length} active conversations`);
   * }
   * ```
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
   * Retrieves an AI provider from the registry
   * 
   * @private
   * @param {string} providerName - Name of the provider to retrieve
   * @returns {Promise<IResult<any>>} Result containing the provider instance or error
   */
  private async getProvider(providerName: string): Promise<IResult<any>> {
    try {
      const provider = this.providerRegistry.get(providerName);
      if (!provider) {
        return Result.failure(new Error(`Provider '${providerName}' not found`));
      }

      return Result.success(provider);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Builds a complete provider configuration with defaults
   * 
   * @private
   * @param {Partial<AIProviderConfig>} config - Partial configuration to merge with defaults
   * @returns {AIProviderConfig} Complete provider configuration
   */
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
        timeout: config.timeout || AIService.DEFAULT_TIMEOUT,
        retries: config.retries || 3,
        ...(config.baseUrl && { baseUrl: config.baseUrl })
      };
    }
  }

  /**
   * Validates input parameters
   * 
   * @private
   * @param {string} content - Message content to validate
   * @param {AIServiceOptions} options - Options to validate
   * @returns {{ isValid: boolean; errors: string[] }} Validation result
   */
  private validateInput(content: string, options: AIServiceOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate content
    if (!content || typeof content !== 'string') {
      errors.push('Message content is required and must be a string');
    } else {
      if (content.trim().length < AIService.MIN_MESSAGE_LENGTH) {
        errors.push(`Message content must be at least ${AIService.MIN_MESSAGE_LENGTH} character(s)`);
      }
      if (content.length > AIService.MAX_MESSAGE_LENGTH) {
        errors.push(`Message content cannot exceed ${AIService.MAX_MESSAGE_LENGTH} characters`);
      }
    }

    // Validate provider
    const provider = options.provider || this.defaultProvider;
    if (!AIService.ALLOWED_PROVIDERS.includes(provider)) {
      errors.push(`Provider '${provider}' is not allowed. Allowed providers: ${AIService.ALLOWED_PROVIDERS.join(', ')}`);
    }

    // Validate conversation ID format
    if (options.conversationId && !/^conv_\d+_[a-z0-9]+$/.test(options.conversationId)) {
      errors.push('Invalid conversation ID format');
    }

    // Validate system prompt
    if (options.systemPrompt && options.systemPrompt.length > AIService.MAX_MESSAGE_LENGTH) {
      errors.push('System prompt is too long');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Sanitizes content by removing potentially harmful elements
   * 
   * @private
   * @param {string} content - Content to sanitize
   * @returns {string} Sanitized content
   */
  private sanitizeContent(content: string): string {
    if (!content) return '';
    
    return content
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove javascript: protocols
      .replace(/javascript:/gi, '')
      // Remove data: URLs with javascript
      .replace(/data:text\/html,.*javascript.*/gi, '')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Trim
      .trim();
  }

  /**
   * Validates provider configuration
   * 
   * @private
   * @param {Partial<AIProviderConfig>} config - Configuration to validate
   * @returns {{ isValid: boolean; errors: string[] }} Validation result
   */
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

  /**
   * Checks if rate limit is exceeded for a provider
   * 
   * @private
   * @param {string} provider - Provider to check
   * @returns {boolean} True if rate limit is not exceeded
   */
  private checkRateLimit(provider: string): boolean {
    const now = Date.now();
    const rateLimit = this.rateLimits.get(provider) || { maxRequests: 100, windowMs: 60000 }; // 100 requests per minute default
    const requestCount = this.requestCounts.get(provider) || { count: 0, resetTime: now + rateLimit.windowMs };

    // Reset counter if window has passed
    if (now > requestCount.resetTime) {
      this.requestCounts.set(provider, { count: 1, resetTime: now + rateLimit.windowMs });
      return true;
    }

    // Check if limit exceeded
    if (requestCount.count >= rateLimit.maxRequests) {
      return false;
    }

    // Increment counter
    requestCount.count++;
    this.requestCounts.set(provider, requestCount);
    return true;
  }

  /**
   * Checks if circuit breaker is open for a provider
   * 
   * @private
   * @param {string} provider - Provider to check
   * @returns {boolean} True if circuit breaker is open
   */
  private isCircuitBreakerOpen(provider: string): boolean {
    const state = this.circuitBreakerState.get(provider) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' as const
    };

    const now = Date.now();
    const recoveryTime = 30000; // 30 seconds

    // If circuit is open, check if recovery time has passed
    if (state.state === 'OPEN') {
      if (now - state.lastFailureTime > recoveryTime) {
        state.state = 'HALF_OPEN';
        this.circuitBreakerState.set(provider, state);
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Records a successful operation for circuit breaker
   * 
   * @private
   * @param {string} provider - Provider that succeeded
   */
  private recordSuccess(provider: string): void {
    const state = this.circuitBreakerState.get(provider) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' as const
    };

    // Reset failure count and close circuit breaker
    state.failures = 0;
    state.state = 'CLOSED';
    this.circuitBreakerState.set(provider, state);
  }

  /**
   * Records a failed operation for circuit breaker
   * 
   * @private
   * @param {string} provider - Provider that failed
   * @param {Error} error - Error that occurred
   */
  private recordFailure(provider: string, _error: Error): void {
    const state = this.circuitBreakerState.get(provider) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' as const
    };

    state.failures++;
    state.lastFailureTime = Date.now();

    // Open circuit breaker if failure threshold is reached
    if (state.failures >= 5) {
      state.state = 'OPEN';
    }

    this.circuitBreakerState.set(provider, state);
  }

  /**
   * Executes an operation with retry logic and timeout
   * 
   * @private
   * @param {Function} operation - Operation to execute
   * @param {string} provider - Provider name for logging
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<any>} Operation result
   */
  private async executeWithRetryAndTimeout<T>(
    operation: () => Promise<T>,
    provider: string,
    timeout: number
  ): Promise<T> {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timeout after ${timeout}ms`)), timeout);
    });

    // Execute with retry logic
    const executeWithRetry = async (): Promise<T> => {
      for (let attempt = 1; attempt <= AIService.MAX_RETRIES; attempt++) {
        try {
          return await operation();
        } catch (error) {
          if (attempt === AIService.MAX_RETRIES || !this.isRetryableError(error as Error)) {
            throw error;
          }

          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
          this.logger.warn(`Retrying operation for ${provider}, attempt ${attempt}/${AIService.MAX_RETRIES}`, {
            provider,
            attempt,
            delay,
            error: (error as Error).message
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      throw new Error('Max retries exceeded');
    };

    return Promise.race([executeWithRetry(), timeoutPromise]);
  }

  /**
   * Determines if an error is retryable
   * 
   * @private
   * @param {Error} error - Error to check
   * @returns {boolean} True if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'TimeoutError',
      'NetworkError'
    ];

    return retryableErrors.some(retryableError => 
      error.message.includes(retryableError) || error.name === retryableError
    );
  }
}