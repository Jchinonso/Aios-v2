import Anthropic from '@anthropic-ai/sdk';
import { AIProvider } from './base-provider.js';
import { AIMessageFormatter, AIValidationUtils, AIHealthChecker } from '../../utils/ai-provider-utils.js';
import { createStreamIterator } from '../../utils/stream-iterator.js';
import { ANTHROPIC_REGIONS } from '../../constants/regions.js';
import {
  createAPIKeyRequiredError,
  createNoResponseContentError,
  createUnexpectedResponseError
} from '../../constants/errors.js';
import type {
  AIMessage,
  AIProviderConfig,
  AIResponse,
  AIProviderCapabilities
} from '../../types/ai.types.js';

export class AnthropicProvider extends AIProvider {
  public readonly name = 'anthropic';
  public readonly capabilities: AIProviderCapabilities = {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    supportsAudio: false,
    maxContextLength: 200000, // Claude 3 context length
    supportedModels: [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ],
    supportedRegions: ANTHROPIC_REGIONS as unknown as string[]
  };
  
  private client: Anthropic | null = null;

  private initializeClient(config: AIProviderConfig): Anthropic {
    if (!config.apiKey) {
      throw createAPIKeyRequiredError('Anthropic');
    }

    if (!this.client) {
      this.client = new Anthropic({
        apiKey: config.apiKey,
        baseURL: config.baseUrl
      });
    }

    return this.client;
  }

  private mapMessages(messages: AIMessage[]): { system?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> } {
    return AIMessageFormatter.formatAsAnthropicMessages(messages);
  }

  protected async executeSendMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    const client = this.initializeClient(config);
    const { system, messages: mappedMessages } = this.mapMessages(messages);

    // Create request parameters with proper type safety
    const requestParams: Parameters<typeof client.messages.create>[0] = {
      model: config.model,
      max_tokens: config.maxTokens ?? 4096,
      temperature: config.temperature,
      messages: mappedMessages
    };

    // Only add system if it exists (strict optional property handling)
    if (system) {
      requestParams.system = system;
    }

    const response = await client.messages.create(requestParams);

    // Type guard to ensure we have a Message (not a Stream)
    if ('content' in response) {
      const content = response.content
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text)
        .join('');

      if (!content) {
        throw createNoResponseContentError('Anthropic');
      }

      return this.createResponse(
        content,
        response.model,
        response.usage ? {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        } : undefined,
        response.stop_reason || 'stop',
        { responseTime: 0 } // Will be calculated by base class
      );
    } else {
      throw createUnexpectedResponseError('Anthropic');
    }
  }

  protected async executeStreamMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AsyncIterableIterator<string>> {
    const client = this.initializeClient(config);
    const { system, messages: mappedMessages } = this.mapMessages(messages);

    // Create streaming request parameters with proper type safety
    const streamParams: Parameters<typeof client.messages.create>[0] = {
      model: config.model,
      max_tokens: config.maxTokens ?? 4096,
      temperature: config.temperature,
      messages: mappedMessages,
      stream: true
    };

    // Only add system if it exists (strict optional property handling)
    if (system) {
      streamParams.system = system;
    }

    const stream = await client.messages.create(streamParams);

    // Type guard to ensure we have a Stream (not a Message)
    if (Symbol.asyncIterator in stream) {
      return createStreamIterator(stream, (chunk) => {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          return chunk.delta.text;
        }
        return null;
      });
    } else {
      throw createUnexpectedResponseError('Anthropic', 'stream');
    }
  }

  protected async checkProviderHealth(): Promise<boolean> {
    const healthCheck = async () => {
      try {
        const client = this.initializeClient({
          apiKey: 'test',
          model: 'claude-3-haiku-20240307',
          maxTokens: 4096,
          temperature: 0.7,
          timeout: 60000,
          retries: 3
        });
        
        // Simple health check with a minimal request
        await client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hello' }]
        });

        return true;
      } catch {
        return false;
      }
    };

    return AIHealthChecker.performHealthCheck(healthCheck);
  }

  public getCost(tokens: number, model: string): number {
    // Anthropic pricing (approximate, should be updated with current rates)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus-20240229': { input: 0.015 / 1000, output: 0.075 / 1000 },
      'claude-3-sonnet-20240229': { input: 0.003 / 1000, output: 0.015 / 1000 },
      'claude-3-haiku-20240307': { input: 0.00025 / 1000, output: 0.00125 / 1000 },
      'claude-2.1': { input: 0.008 / 1000, output: 0.024 / 1000 },
      'claude-2.0': { input: 0.008 / 1000, output: 0.024 / 1000 },
      'claude-instant-1.2': { input: 0.0008 / 1000, output: 0.0024 / 1000 }
    };

    const modelPricing = pricing[model] ?? pricing['claude-3-haiku-20240307'];
    
    // Type-safe pricing calculation with null checks
    if (!modelPricing) {
      return 0; // Fallback for unknown models
    }
    
    return tokens * (modelPricing.input + modelPricing.output) / 2; // Average of input/output
  }

  public validateConfig(config: AIProviderConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    const baseValidation = this.validateBaseConfig(config);
    
    // Use shared validation utilities
    const apiKeyValidation = AIValidationUtils.validateApiKey(config, 'Anthropic');
    if (!apiKeyValidation.isValid) {
      baseValidation.errors.push(apiKeyValidation.error!);
    }

    const modelValidation = AIValidationUtils.validateModel(
      config.model, 
      this.capabilities.supportedModels, 
      'AnthropicProvider'
    );
    if (modelValidation.warning) {
      baseValidation.warnings.push(modelValidation.warning);
    }

    return baseValidation;
  }
}