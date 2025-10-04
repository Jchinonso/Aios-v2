import Replicate from 'replicate';
import { AIProvider } from './base-provider.js';
import { AIMessageFormatter, AIValidationUtils, AIHealthChecker, AICostCalculator } from '../../utils/ai-provider-utils.js';
import { createStreamIterator } from '../../utils/stream-iterator.js';
import { REPLICATE_REGIONS } from '../../constants/regions.js';
import {
  createAPIKeyRequiredError,
  createNoResponseContentError
} from '../../constants/errors.js';
import type {
  AIMessage,
  AIProviderConfig,
  AIResponse,
  AIProviderCapabilities
} from '../../types/ai.types.js';

export class ReplicateProvider extends AIProvider {
  public readonly name = 'replicate';
  public readonly capabilities: AIProviderCapabilities = {
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: true,
    supportsAudio: true,
    maxContextLength: 32768, // Typical context length for most models
    supportedModels: [
      'meta/llama-2-7b-chat',
      'meta/llama-2-13b-chat',
      'meta/llama-2-70b-chat',
      'meta/llama-3-8b-instruct',
      'meta/llama-3-70b-instruct',
      'mistralai/mistral-7b-instruct-v0.1',
      'mistralai/mixtral-8x7b-instruct-v0.1',
      'stability-ai/stable-diffusion',
      'stability-ai/stable-diffusion-xl'
    ],
    supportedRegions: REPLICATE_REGIONS as unknown as string[]
  };
  
  private client: Replicate | null = null;

  private initializeClient(config: AIProviderConfig): Replicate {
    if (!config.apiKey) {
      throw createAPIKeyRequiredError('Replicate');
    }

    if (!this.client) {
      this.client = new Replicate({
        auth: config.apiKey
      });
    }

    return this.client;
  }

  private formatMessages(messages: AIMessage[]): string {
    return AIMessageFormatter.formatAsPrompt(messages);
  }

  protected async executeSendMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    const client = this.initializeClient(config);
    const prompt = this.formatMessages(messages);
    const model = config.model || 'meta/llama-2-7b-chat';

    const response = await client.run(model as any, {
      input: {
        prompt: prompt,
        max_length: config.maxTokens || 4096,
        temperature: config.temperature || 0.7
      }
    }) as string[];

    if (!response || response.length === 0) {
      throw createNoResponseContentError('Replicate');
    }

    const content = Array.isArray(response) ? response.join('') : response;
    if (!content) {
      throw createNoResponseContentError('Replicate');
    }

    return this.createResponse(
      content,
      model,
      undefined, // No token usage info available
      'stop',
      { responseTime: 0 } // Will be calculated by base class
    );
  }

  protected async executeStreamMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AsyncIterableIterator<string>> {
    const client = this.initializeClient(config);
    const prompt = this.formatMessages(messages);
    const model = config.model || 'meta/llama-2-7b-chat';

    const response = await client.stream(model as any, {
      input: {
        prompt: prompt,
        max_length: config.maxTokens || 4096,
        temperature: config.temperature || 0.7
      }
    });

    return createStreamIterator(response, (chunk) => {
      if (typeof chunk === 'string') {
        return chunk;
      } else if (Array.isArray(chunk)) {
        return chunk.join('');
      }
      return null;
    });
  }

  protected async checkProviderHealth(): Promise<boolean> {
    const healthCheck = async () => {
      try {
        const client = this.initializeClient({
          apiKey: 'test',
          model: 'meta/llama-2-7b-chat',
          maxTokens: 4096,
          temperature: 0.7,
          timeout: 60000,
          retries: 3
        });
        
        // Simple health check - try to get model info
        await client.models.get('meta', 'llama-2-7b-chat');
        return true;
      } catch {
        return false;
      }
    };

    return AIHealthChecker.performHealthCheck(healthCheck);
  }

  public getCost(tokens: number, model: string): number {
    // Replicate pricing (approximate, varies by model)
    const pricing: Record<string, number> = {
      'meta/llama-2-7b-chat': 0.00065 / 1000,
      'meta/llama-2-13b-chat': 0.0009 / 1000,
      'meta/llama-2-70b-chat': 0.0026 / 1000,
      'meta/llama-3-8b-instruct': 0.00065 / 1000,
      'meta/llama-3-70b-instruct': 0.0026 / 1000,
      'mistralai/mistral-7b-instruct-v0.1': 0.00027 / 1000,
      'mistralai/mixtral-8x7b-instruct-v0.1': 0.00027 / 1000,
      'stability-ai/stable-diffusion': 0.0023 / 1000,
      'stability-ai/stable-diffusion-xl': 0.0036 / 1000
    };

    return AICostCalculator.calculateCost(tokens, model, pricing);
  }

  public validateConfig(config: AIProviderConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    const baseValidation = this.validateBaseConfig(config);
    
    // Use shared validation utilities
    const apiKeyValidation = AIValidationUtils.validateApiKey(config, 'Replicate');
    if (!apiKeyValidation.isValid) {
      baseValidation.errors.push(apiKeyValidation.error!);
    }

    const modelValidation = AIValidationUtils.validateModel(
      config.model, 
      this.capabilities.supportedModels, 
      'ReplicateProvider'
    );
    if (modelValidation.warning) {
      baseValidation.warnings.push(modelValidation.warning);
    }

    return baseValidation;
  }
}