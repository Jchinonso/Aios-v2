import { AIProvider } from './base-provider.js';
import { AIMessageFormatter, AIValidationUtils, AIHealthChecker, AICostCalculator } from '../../utils/ai-provider-utils.js';
import { createStreamIterator } from '../../utils/stream-iterator.js';
import { HUGGINGFACE_REGIONS } from '../../constants/regions.js';
import {
  createAPIKeyRequiredError,
  createNoResponseContentError,
  createAPIError
} from '../../constants/errors.js';
import type {
  AIMessage,
  AIProviderConfig,
  AIResponse,
  AIProviderCapabilities
} from '../../types/ai.types.js';

export class HuggingFaceProvider extends AIProvider {
  public readonly name = 'huggingface';
  public readonly capabilities: AIProviderCapabilities = {
    supportsStreaming: false,
    supportsFunctionCalling: false,
    supportsVision: true,
    supportsAudio: false,
    maxContextLength: 32768, // Typical context length for most models
    supportedModels: [
      'microsoft/DialoGPT-medium',
      'microsoft/DialoGPT-large',
      'facebook/blenderbot-400M-distill',
      'facebook/blenderbot-1B-distill',
      'facebook/blenderbot-3B',
      'microsoft/DialoGPT-small',
      'EleutherAI/gpt-neo-2.7B',
      'EleutherAI/gpt-j-6B',
      'google/flan-t5-base',
      'google/flan-t5-large',
      'google/flan-t5-xl'
    ],
    supportedRegions: HUGGINGFACE_REGIONS as unknown as string[]
  };
  
  private baseUrl = 'https://api-inference.huggingface.co';
  private apiKey?: string;

  private formatMessages(messages: AIMessage[]): string {
    return AIMessageFormatter.formatAsPrompt(messages);
  }

  protected async executeSendMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    this.apiKey = config.apiKey;

    if (!this.apiKey) {
      throw createAPIKeyRequiredError('Hugging Face');
    }

    const prompt = this.formatMessages(messages);
    const model = config.model || 'microsoft/DialoGPT-medium';

    const response = await fetch(`${this.baseUrl}/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: config.maxTokens || 4096,
          temperature: config.temperature || 0.7,
          return_full_text: false
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw createAPIError('Hugging Face', response.status, error);
    }

    const data = await response.json();
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw createNoResponseContentError('Hugging Face');
    }

    const content = data[0].generated_text || data[0].text || '';
    if (!content) {
      throw createNoResponseContentError('Hugging Face');
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
    // Hugging Face doesn't support streaming in the same way
    // We'll simulate streaming by yielding the full response in chunks
    const response = await this.executeSendMessage(messages, config);
    const words = response.content.split(' ');

    const makeIterable = async function* () {
      for (const word of words) {
        yield word + ' ';
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    };

    return createStreamIterator(makeIterable(), (chunk) => chunk);
  }

  protected async checkProviderHealth(): Promise<boolean> {
    const healthCheck = async () => {
      try {
        if (!this.apiKey) {
          this.apiKey = process.env['HUGGINGFACE_API_KEY'] || '';
        }

        if (!this.apiKey) {
          return false;
        }

        const response = await fetch(`${this.baseUrl}/models/microsoft/DialoGPT-medium`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: 'Hello',
            parameters: {
              max_new_tokens: 1
            }
          })
        });

        return response.ok;
      } catch {
        return false;
      }
    };

    return AIHealthChecker.performHealthCheck(healthCheck);
  }

  public getCost(tokens: number, model: string): number {
    // Hugging Face pricing (approximate, varies by model)
    // Many models are free with rate limits
    const pricing: Record<string, number> = {
      'microsoft/DialoGPT-medium': 0,
      'microsoft/DialoGPT-large': 0,
      'facebook/blenderbot-400M-distill': 0,
      'facebook/blenderbot-1B-distill': 0,
      'facebook/blenderbot-3B': 0,
      'microsoft/DialoGPT-small': 0,
      'EleutherAI/gpt-neo-2.7B': 0,
      'EleutherAI/gpt-j-6B': 0,
      'google/flan-t5-base': 0,
      'google/flan-t5-large': 0,
      'google/flan-t5-xl': 0
    };

    return AICostCalculator.calculateCost(tokens, model, pricing);
  }

  public validateConfig(config: AIProviderConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    const baseValidation = this.validateBaseConfig(config);
    
    // Use shared validation utilities
    const apiKeyValidation = AIValidationUtils.validateApiKey(config, 'Hugging Face');
    if (!apiKeyValidation.isValid && !process.env['HUGGINGFACE_API_KEY']) {
      baseValidation.errors.push(apiKeyValidation.error!);
    }

    const modelValidation = AIValidationUtils.validateModel(
      config.model, 
      this.capabilities.supportedModels, 
      'HuggingFaceProvider'
    );
    if (modelValidation.warning) {
      baseValidation.warnings.push(modelValidation.warning);
    }

    return baseValidation;
  }
}