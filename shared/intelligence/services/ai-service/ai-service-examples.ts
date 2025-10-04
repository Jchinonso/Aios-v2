/**
 * @fileoverview AI Service Examples - Production Usage Patterns
 * 
 * This module provides comprehensive examples of how to use the unified AI service
 * in different scenarios, demonstrating best practices and common patterns.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { ILogger } from '../../../core/logging/logger.interface.js';
import type { IMetricsCollector } from '../../../core/metrics/metrics.interface.js';
import type { IProviderRegistry } from '../../../core/factories/provider-factory.js';
import type { IConversationManager, IMessageProcessor } from '../../types/ai-service.types.js';
import { AIServiceFactory, AIServiceBuilder } from './ai-service-factory.js';
// Removed unused import - AIServiceConfigs is not used in examples
import type { AIService } from './ai-service-unified.js';

/**
 * Example 1: Simple Chat Application
 * 
 * Demonstrates basic usage with minimal configuration for a simple chat app.
 */
export class SimpleChatExample {
  private aiService: AIService;

  constructor(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor
  ) {
    // Create minimal service for simple use case
    this.aiService = AIServiceFactory.createMinimal(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      'openai'
    );
  }

  async chat(message: string): Promise<string> {
    const result = await this.aiService.sendMessage(message);
    
    if (result.isSuccess) {
      return result.value.content;
    } else {
      throw new Error(`Chat failed: ${result.error.message}`);
    }
  }
}

/**
 * Example 2: Enterprise AI Assistant
 * 
 * Demonstrates enterprise-grade usage with all features enabled.
 */
export class EnterpriseAIExample {
  private aiService: AIService;

  constructor(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor
  ) {
    // Create enterprise service with all features
    this.aiService = AIServiceFactory.createEnterprise(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      'openai'
    );
  }

  async processRequest(message: string, conversationId?: string): Promise<{
    response: string;
    conversationId: string;
    metrics: any;
  }> {
    // Create conversation if not provided
    let convId = conversationId;
    if (!convId) {
      const convResult = await this.aiService.createConversation({
        timestamp: new Date().toISOString(),
        source: 'enterprise-api'
      });
      
      if (convResult.isFailure) {
        throw new Error(`Failed to create conversation: ${convResult.error.message}`);
      }
      
      convId = convResult.value;
    }

    // Send message with conversation context
    const result = await this.aiService.sendMessage(message, {
      conversationId: convId,
      provider: 'openai',
      config: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000
      }
    });

    if (result.isFailure) {
      throw new Error(`Request failed: ${result.error.message}`);
    }

    // Get metrics for monitoring
    const metricsResult = await this.aiService.getProviderMetrics('openai');
    const metrics = metricsResult.isSuccess ? metricsResult.value : {};

    return {
      response: result.value.content,
      conversationId: convId,
      metrics
    };
  }
}

/**
 * Example 3: Custom Configuration
 * 
 * Demonstrates how to create a service with custom configuration.
 */
export class CustomConfigExample {
  private aiService: AIService;

  constructor(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor
  ) {
    // Create custom configuration using builder pattern
    const customConfig = AIServiceBuilder
      .create()
      .withRateLimiting({
        maxRequests: 50,
        windowMs: 60000,
        burstLimit: 5
      })
      .withRetryLogic({
        maxRetries: 2,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        exponentialBackoff: true,
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT']
      })
      .withInputSanitization({
        removeScriptTags: true,
        removeJavaScriptProtocols: true,
        removeDataUrls: false,
        normalizeWhitespace: true,
        maxLength: 50000
      })
      .withAdvancedMetrics({
        enableBasicMetrics: true,
        enableAdvancedMetrics: true,
        enableHistograms: true,
        enableCustomTags: true
      })
      .withTimeout(30000)
      .withMessageLimits(1, 50000)
      .build();

    this.aiService = AIServiceFactory.createCustom(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      'anthropic',
      customConfig
    );
  }

  async processWithCustomConfig(message: string): Promise<string> {
    const result = await this.aiService.sendMessage(message, {
      provider: 'anthropic',
      config: {
        model: 'claude-3-sonnet-20240229',
        temperature: 0.5,
        maxTokens: 1000
      }
    });

    if (result.isFailure) {
      throw new Error(`Processing failed: ${result.error.message}`);
    }

    return result.value.content;
  }
}

/**
 * Example 4: Streaming Response
 * 
 * Demonstrates how to handle streaming responses.
 */
export class StreamingExample {
  private aiService: AIService;

  constructor(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor
  ) {
    this.aiService = AIServiceFactory.createStandard(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      'openai'
    );
  }

  async streamResponse(message: string): Promise<AsyncIterableIterator<string>> {
    const result = await this.aiService.streamMessage(message, {
      provider: 'openai',
      config: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7
      }
    });

    if (result.isFailure) {
      throw new Error(`Streaming failed: ${result.error.message}`);
    }

    return result.value;
  }

  async processStream(message: string): Promise<string> {
    const stream = await this.streamResponse(message);
    let fullResponse = '';

    for await (const chunk of stream) {
      fullResponse += chunk;
      // Process chunk in real-time (e.g., send to WebSocket, update UI)
      console.log('Received chunk:', chunk);
    }

    return fullResponse;
  }
}

/**
 * Example 5: Multi-Provider Fallback
 * 
 * Demonstrates how to implement fallback between multiple providers.
 */
export class MultiProviderExample {
  private aiService: AIService;
  private readonly providers = ['openai', 'anthropic', 'groq'] as const;

  constructor(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor
  ) {
    this.aiService = AIServiceFactory.createEnterprise(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      'openai'
    );
  }

  async sendWithFallback(message: string): Promise<{
    response: string;
    provider: string;
    attempts: number;
  }> {
    let lastError: Error | null = null;
    let attempts = 0;

    for (const provider of this.providers) {
      attempts++;
      
      try {
        const result = await this.aiService.sendMessage(message, {
          provider,
          config: {
            model: this.getModelForProvider(provider),
            temperature: 0.7,
            maxTokens: 1000
          }
        });

        if (result.isSuccess) {
          return {
            response: result.value.content,
            provider,
            attempts
          };
        } else {
          lastError = result.error;
        }
      } catch (error) {
        lastError = error as Error;
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  private getModelForProvider(provider: string): string {
    const models = {
      openai: 'gpt-3.5-turbo',
      anthropic: 'claude-3-haiku-20240307',
      groq: 'llama3-8b-8192'
    };
    
    return models[provider as keyof typeof models] || 'gpt-3.5-turbo';
  }
}

/**
 * Example 6: Health Monitoring
 * 
 * Demonstrates how to monitor service health and metrics.
 */
export class HealthMonitoringExample {
  private aiService: AIService;

  constructor(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor
  ) {
    this.aiService = AIServiceFactory.createEnterprise(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      'openai'
    );
  }

  async checkHealth(): Promise<{
    isHealthy: boolean;
    providers: Record<string, any>;
    overallStatus: string;
  }> {
    const healthResult = await this.aiService.getProviderHealth();
    
    if (healthResult.isFailure) {
      return {
        isHealthy: false,
        providers: {},
        overallStatus: 'error'
      };
    }

    const providers = healthResult.value;
    const healthyProviders = Object.values(providers).filter((p: any) => p.isHealthy);
    // const totalProviders = Object.keys(providers).length; // Removed unused variable
    
    const isHealthy = healthyProviders.length > 0;
    const overallStatus = isHealthy ? 'healthy' : 'unhealthy';

    return {
      isHealthy,
      providers,
      overallStatus
    };
  }

  async getMetrics(): Promise<Record<string, any>> {
    const metricsResult = await this.aiService.getProviderMetrics();
    
    if (metricsResult.isFailure) {
      return { error: metricsResult.error.message };
    }

    return metricsResult.value;
  }
}

/**
 * Example 7: Environment-Based Configuration
 * 
 * Demonstrates how to create services based on environment variables.
 */
export class EnvironmentBasedExample {
  private aiService: AIService;

  constructor(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor
  ) {
    // Create service based on environment
    this.aiService = AIServiceFactory.createFromEnvironment(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      process.env['DEFAULT_AI_PROVIDER'] || 'openai'
    );
  }

  async processMessage(message: string): Promise<string> {
    const result = await this.aiService.sendMessage(message);
    
    if (result.isFailure) {
      throw new Error(`Processing failed: ${result.error.message}`);
    }

    return result.value.content;
  }
}

/**
 * Example 8: Conversation Management
 * 
 * Demonstrates how to manage conversations with context.
 */
export class ConversationManagementExample {
  private aiService: AIService;

  constructor(
    logger: ILogger,
    metrics: IMetricsCollector,
    providerRegistry: IProviderRegistry,
    conversationManager: IConversationManager,
    messageProcessor: IMessageProcessor
  ) {
    this.aiService = AIServiceFactory.createStandard(
      logger,
      metrics,
      providerRegistry,
      conversationManager,
      messageProcessor,
      'openai'
    );
  }

  async startConversation(context?: Record<string, any>): Promise<string> {
    const result = await this.aiService.createConversation({
      ...context,
      timestamp: new Date().toISOString(),
      source: 'conversation-example'
    });

    if (result.isFailure) {
      throw new Error(`Failed to create conversation: ${result.error.message}`);
    }

    return result.value;
  }

  async sendMessage(conversationId: string, message: string): Promise<string> {
    const result = await this.aiService.sendMessage(message, {
      conversationId,
      provider: 'openai'
    });

    if (result.isFailure) {
      throw new Error(`Failed to send message: ${result.error.message}`);
    }

    return result.value.content;
  }

  async getConversation(conversationId: string): Promise<any> {
    const result = await this.aiService.getConversation(conversationId);
    
    if (result.isFailure) {
      throw new Error(`Failed to get conversation: ${result.error.message}`);
    }

    return result.value;
  }

  async endConversation(conversationId: string): Promise<void> {
    const result = await this.aiService.clearConversation(conversationId);
    
    if (result.isFailure) {
      throw new Error(`Failed to clear conversation: ${result.error.message}`);
    }
  }
}

