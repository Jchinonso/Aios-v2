/**
 * @fileoverview AI Provider - Abstract Base Class for All AI Providers
 * 
 * This module provides a comprehensive base class that consolidates common functionality
 * across all AI providers, eliminating massive code duplication and ensuring consistent
 * behavior for metrics, error handling, health checks, and validation.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { 
  AIProvider as IAIProvider, 
  AIMessage, 
  AIProviderConfig, 
  AIResponse, 
  AIProviderHealth, 
  AIProviderCapabilities, 
  AIProviderMetrics 
} from '../../types/ai.types.js';
import { AIConnectionPoolManager, createAIProviderConnectionKey } from '../../utils/connection-pool-manager.js';
import { AIErrorHandler } from '../../utils/ai-provider-utils.js';

/**
 * Abstract base class for all AI providers
 * 
 * This class provides common functionality that all providers share:
 * - Metrics collection and tracking
 * - Error handling and standardization
 * - Health check implementations
 * - Configuration validation
 * - Cost calculation
 * - Response time tracking
 * 
 * @abstract
 * @implements {IAIProvider}
 */
export abstract class AIProvider implements IAIProvider {
  public abstract readonly name: string;
  public abstract readonly capabilities: AIProviderCapabilities;

  // Common metrics tracking (consolidated from all providers)
  protected metrics: AIProviderMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    totalTokensUsed: 0,
    totalCost: 0
  };

  // Response time tracking for average calculation
  private responseTimes: number[] = [];
  private readonly maxResponseTimeHistory = 100;
  
  // Connection pool manager
  protected connectionPool = AIConnectionPoolManager.getInstance();

  /**
   * Send message with unified error handling and metrics - eliminates duplication
   * 
   * @param messages - Array of messages to send
   * @param config - Provider configuration
   * @returns Promise resolving to AI response
   */
  public async sendMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    const startTime = Date.now();

    // Validate inputs using shared utilities
    const messageValidation = this.validateMessages(messages);
    if (!messageValidation.isValid) {
      throw this.handleError(new Error(`Message validation failed: ${messageValidation.errors.join(', ')}`), 'sendMessage');
    }

    const configValidation = this.validateConfig(config);
    if (!configValidation.isValid) {
      throw this.handleError(new Error(`Config validation failed: ${configValidation.errors.join(', ')}`), 'sendMessage');
    }

    try {
      // Provider-specific implementation
      const response = await this.executeSendMessage(messages, config);
      
      const responseTime = Date.now() - startTime;
      const totalTokens = response.usage ? (response.usage.promptTokens || 0) + (response.usage.completionTokens || 0) : 0;
      this.updateMetrics(true, responseTime, totalTokens, config.costPerToken || 0);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime, 0, config.costPerToken || 0);
      throw this.handleError(error, 'sendMessage');
    }
  }

  /**
   * Stream message with unified error handling and metrics - eliminates duplication
   * 
   * @param messages - Array of messages to stream
   * @param config - Provider configuration
   * @returns Async iterator for streaming response
   */
  public async* streamMessage(messages: AIMessage[], config: AIProviderConfig): AsyncIterableIterator<string> {
    const startTime = Date.now();

    // Validate inputs using shared utilities
    const messageValidation = this.validateMessages(messages);
    if (!messageValidation.isValid) {
      throw this.handleError(new Error(`Message validation failed: ${messageValidation.errors.join(', ')}`), 'streamMessage');
    }

    const configValidation = this.validateConfig(config);
    if (!configValidation.isValid) {
      throw this.handleError(new Error(`Config validation failed: ${configValidation.errors.join(', ')}`), 'streamMessage');
    }

    try {
      // Provider-specific implementation
      const stream = await this.executeStreamMessage(messages, config);
      
      for await (const chunk of stream) {
        yield chunk;
      }

      const responseTime = Date.now() - startTime;
      this.updateMetrics(true, responseTime, 0, config.costPerToken || 0);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime, 0, config.costPerToken || 0);
      throw this.handleError(error, 'streamMessage');
    }
  }

  /**
   * Abstract method for provider-specific send message implementation
   * 
   * @param messages - Array of messages to send
   * @param config - Provider configuration
   * @returns Promise resolving to AI response
   */
  protected abstract executeSendMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse>;

  /**
   * Abstract method for provider-specific stream message implementation
   * 
   * @param messages - Array of messages to stream
   * @param config - Provider configuration
   * @returns Promise resolving to async iterator for streaming response
   */
  protected abstract executeStreamMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AsyncIterableIterator<string>>;

  /**
   * Abstract method for health checks - must be implemented by concrete providers
   */
  protected abstract checkProviderHealth(): Promise<boolean>;

  /**
   * Abstract method for cost calculation - must be implemented by concrete providers
   */
  public abstract getCost(tokens: number, model: string): number;

  /**
   * Abstract method for configuration validation - must be implemented by concrete providers
   */
  public abstract validateConfig(config: AIProviderConfig): { isValid: boolean; errors: string[]; warnings: string[] };

  /**
   * Common metrics getter
   */
  public getMetrics(): AIProviderMetrics {
    return { ...this.metrics };
  }

  /**
   * Common health check implementation
   */
  public async getHealth(): Promise<AIProviderHealth> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.checkProviderHealth();
      const responseTime = Date.now() - startTime;
      
      return {
        isHealthy,
        responseTime,
        lastCheck: new Date(),
        errorRate: 0,
        availability: isHealthy ? 100 : 0,
        metadata: {
          provider: this.name
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        isHealthy: false,
        responseTime,
        lastCheck: new Date(),
        errorRate: 1,
        availability: 0,
        metadata: {
          provider: this.name,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * Common metrics update method
   * 
   * @param success - Whether the request was successful
   * @param responseTime - Response time in milliseconds
   * @param tokensUsed - Number of tokens used
   * @param cost - Cost of the request
   */
  protected updateMetrics(success: boolean, responseTime: number, tokensUsed: number = 0, cost: number = 0): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
      this.metrics.totalTokensUsed += tokensUsed;
      this.metrics.totalCost += cost;
    } else {
      this.metrics.failedRequests++;
    }

    // Update response time tracking
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }

    // Calculate average response time
    this.metrics.averageResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  /**
   * Common error handling method
   * 
   * @param error - The error that occurred
   * @param operation - The operation that failed
   * @returns Standardized error message
   */
  protected handleError(error: unknown, operation: string): Error {
    return AIErrorHandler.createError(this.name, operation, error);
  }

  /**
   * Common input validation for messages
   */
  protected validateMessages(messages: AIMessage[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!messages || messages.length === 0) {
      errors.push('Messages array is required and cannot be empty');
    }

    messages.forEach((message, index) => {
      if (!message.content || message.content.trim().length === 0) {
        errors.push(`Message at index ${index} has empty content`);
      }
      
      if (!['user', 'assistant', 'system'].includes(message.role)) {
        errors.push(`Message at index ${index} has invalid role: ${message.role}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Common configuration validation
   */
  protected validateBaseConfig(config: AIProviderConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.model) {
      errors.push('Model is required in configuration');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    if (config.maxTokens !== undefined && config.maxTokens <= 0) {
      errors.push('Max tokens must be greater than 0');
    }

    if (config.maxTokens && config.maxTokens > this.capabilities.maxContextLength) {
      warnings.push(`Max tokens (${config.maxTokens}) exceeds provider's max context length (${this.capabilities.maxContextLength})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get connection key for pooling
   */
  protected getConnectionKey(config: AIProviderConfig): string {
    return createAIProviderConnectionKey(config);
  }

  /**
   * Get or create client from connection pool
   */
  protected async getPooledClient<T>(
    config: AIProviderConfig,
    factory: (config: AIProviderConfig) => Promise<T>
  ): Promise<T> {
    const pool = this.connectionPool.getPool<T>(this.name);
    const key = this.getConnectionKey(config);
    return pool.getClient(key, factory, config);
  }

  /**
   * Common response creation with metrics
   */
  protected createResponse(
    content: string,
    model: string,
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number },
    finishReason: string = 'stop',
    metadata?: Record<string, any>
  ): AIResponse {
    return {
      content,
      model,
      usage,
      finishReason: finishReason as AIResponse['finishReason'],
      metadata: {
        provider: this.name,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      totalCost: 0
    };
    this.responseTimes = [];
  }
}
