/**
 * @fileoverview AI Provider Utilities
 * 
 * This module provides common utilities and helper functions for AI providers,
 * eliminating code duplication and ensuring consistent behavior across all providers.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { AIMessage, AIProviderConfig } from '../types/ai.types.js';

/**
 * Message formatting utilities for different AI provider APIs
 */
export class AIMessageFormatter {
  /**
   * Format messages for providers that expect a single prompt string
   * Used by Ollama, Cohere, HuggingFace, and Replicate providers
   */
  static formatAsPrompt(messages: AIMessage[]): string {
    return messages
      .map(msg => {
        const role = msg.role === 'assistant' ? 'Assistant' :
                    msg.role === 'system' ? 'System' : 'User';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');
  }

  /**
   * Format messages for OpenAI-compatible providers
   * Used by OpenAI, Groq providers
   */
  static formatAsOpenAIMessages(messages: AIMessage[]): Array<{ role: string; content: string }> {
    return messages.map(message => ({
      role: message.role as 'user' | 'assistant' | 'system',
      content: message.content
    }));
  }

  /**
   * Format messages for Anthropic (separates system messages)
   */
  static formatAsAnthropicMessages(messages: AIMessage[]): { system?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> } {
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const otherMessages = messages.filter(msg => msg.role !== 'system');

    const result: { system?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> } = {
      messages: otherMessages.map(message => ({
        role: message.role as 'user' | 'assistant',
        content: message.content
      }))
    };

    if (systemMessages.length > 0 && systemMessages[0]) {
      result.system = systemMessages[0].content;
    }

    return result;
  }

  /**
   * Format messages for Google Cloud Vertex AI
   */
  static formatAsVertexAIMessages(messages: AIMessage[]): Array<{ role: string; parts: Array<{ text: string }> }> {
    return messages.map(message => ({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.content }]
    }));
  }
}

/**
 * HTTP client utilities for AI provider requests
 */
export class AIHttpClient {
  /**
   * Create standardized headers for API requests
   */
  static createHeaders(apiKey: string, contentType: string = 'application/json'): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': contentType,
      'User-Agent': 'AIOS/2.0.0'
    };
  }

  /**
   * Create request configuration with timeout and retries
   */
  static createRequestConfig(config: AIProviderConfig): {
    timeout: number;
    retries: number;
    headers: Record<string, string>;
  } {
    return {
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      headers: AIHttpClient.createHeaders(config.apiKey)
    };
  }
}

/**
 * Streaming utilities for AI provider responses
 */
export class AIStreamProcessor {
  /**
   * Process Server-Sent Events (SSE) stream
   */
  static async* processSSEStream(stream: ReadableStream): AsyncIterableIterator<string> {
    const decoder = new TextDecoder('utf-8');
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Skip invalid JSON chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Process JSONL stream (used by some providers)
   */
  static async* processJSONLStream(stream: ReadableStream): AsyncIterableIterator<string> {
    const decoder = new TextDecoder('utf-8');
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const data = JSON.parse(line);
            if (data.response) {
              yield data.response;
            }
          } catch {
            // Handle incomplete JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * Cost calculation utilities for AI providers
 */
export class AICostCalculator {
  /**
   * Calculate cost based on token usage and pricing
   */
  static calculateCost(
    tokens: number, 
    model: string, 
    pricing: Record<string, number | { input: number; output: number }>
  ): number {
    const modelPricing = pricing[model];
    if (!modelPricing) return 0;

    if (typeof modelPricing === 'number') {
      return tokens * modelPricing;
    } else {
      // For models with separate input/output pricing, use average
      return tokens * (modelPricing.input + modelPricing.output) / 2;
    }
  }

  /**
   * Estimate tokens from text (rough approximation)
   */
  static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Validation utilities for AI provider configurations
 */
export class AIValidationUtils {
  /**
   * Validate API key presence
   */
  static validateApiKey(config: AIProviderConfig, providerName: string): { isValid: boolean; error?: string } {
    if (!config.apiKey) {
      return {
        isValid: false,
        error: `${providerName} API key is required`
      };
    }
    return { isValid: true };
  }

  /**
   * Validate model support
   */
  static validateModel(
    model: string, 
    supportedModels: string[], 
    providerName: string
  ): { isValid: boolean; warning?: string } {
    if (model && !supportedModels.includes(model)) {
      return {
        isValid: true, // Don't fail, just warn
        warning: `Model '${model}' is not officially supported by ${providerName}, but may still work`
      };
    }
    return { isValid: true };
  }

  /**
   * Validate base URL format
   */
  static validateBaseUrl(baseUrl?: string): { isValid: boolean; error?: string } {
    if (baseUrl && !baseUrl.startsWith('http')) {
      return {
        isValid: false,
        error: 'Base URL must be a valid HTTP(S) URL'
      };
    }
    return { isValid: true };
  }
}

/**
 * Health check utilities for AI providers
 */
export class AIHealthChecker {
  /**
   * Perform a simple health check with timeout
   */
  static async performHealthCheck(
    checkFn: () => Promise<boolean>,
    timeout: number = 5000
  ): Promise<boolean> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      );
      
      return await Promise.race([checkFn(), timeoutPromise]);
    } catch {
      return false;
    }
  }

  /**
   * Create a simple ping health check
   */
  static createPingCheck(url: string, headers?: Record<string, string>): () => Promise<boolean> {
    return async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: 'GET',
          ...(headers ? { headers } : {}),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        return false;
      }
    };
  }
}

/**
 * Error handling utilities for AI providers
 */
export class AIErrorHandler {
  /**
   * Create standardized error messages
   */
  static createError(providerName: string, operation: string, originalError: unknown): Error {
    const errorMessage = originalError instanceof Error ? originalError.message : 'Unknown error occurred';
    return new Error(`${providerName} ${operation} error: ${errorMessage}`);
  }

  /**
   * Handle API response errors
   */
  static handleApiError(response: Response, providerName: string): Promise<never> {
    return response.text().then(errorText => {
      throw new Error(`${providerName} API error: ${response.status} - ${errorText}`);
    });
  }
}

/**
 * Configuration utilities for AI providers
 */
export class AIConfigUtils {
  /**
   * Merge default configuration with provided config
   */
  static mergeConfig<T extends Record<string, any>>(
    defaults: T, 
    provided: Partial<T>
  ): T {
    return { ...defaults, ...provided };
  }

  /**
   * Create default configuration for providers
   */
  static createDefaultConfig(): Partial<AIProviderConfig> {
    return {
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 30000,
      retries: 3
    };
  }
}
