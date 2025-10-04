import { AIProvider } from './base-provider.js';
import { AIValidationUtils, AIHealthChecker, AICostCalculator } from '../../utils/ai-provider-utils.js';
import {
  createAPIKeyRequiredError,
  createAPIError,
  createNoResponseContentError,
  createNoResponseBodyError
} from '../../constants/errors.js';
import type {
  AIMessage,
  AIProviderConfig,
  AIResponse,
  AIProviderCapabilities
} from '../../types/ai.types.js';

export class GoogleProvider extends AIProvider {
  public readonly name = 'google';
  public readonly capabilities: AIProviderCapabilities = {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    supportsAudio: false,
    maxContextLength: 1000000, // Gemini 1.5 Pro context length
    supportedModels: [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro',
      'gemini-pro-vision'
    ],
    supportedRegions: ['us-central1', 'us-east1', 'europe-west1', 'asia-southeast1']
  };
  
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private apiKey?: string;

  private convertMessages(messages: AIMessage[]): any[] {
    return messages.map(message => ({
      role: message.role === 'user' ? 'user' : 'model', // Google API uses 'user' and 'model' roles
      parts: [{ text: message.content }]
    }));
  }

  private mapFinishReason(reason: string | undefined): AIResponse['finishReason'] {
    if (!reason) return 'stop';
    switch (reason) {
      case 'STOP': return 'stop';
      case 'MAX_TOKENS': return 'length';
      case 'SAFETY': return 'content_filter';
      default: return 'stop';
    }
  }

  protected async executeSendMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    this.apiKey = config.apiKey;

    if (!this.apiKey) {
      throw createAPIKeyRequiredError('Google AI');
    }

    const model = config.model || 'gemini-1.5-flash';

    const response = await fetch(`${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: this.convertMessages(messages),
        generationConfig: {
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxTokens || 4096,
          topP: 0.8,
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw createAPIError('Google', response.status, error);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!content) {
      throw createNoResponseContentError('Google');
    }

    return this.createResponse(
      content,
      model,
      data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0
      } : undefined,
      this.mapFinishReason(data.candidates?.[0]?.finishReason),
      { responseTime: 0 } // Will be calculated by base class
    );
  }

  protected async executeStreamMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AsyncIterableIterator<string>> {
    this.apiKey = config.apiKey;

    if (!this.apiKey) {
      throw createAPIKeyRequiredError('Google AI');
    }

    const model = config.model || 'gemini-1.5-flash';

    const response = await fetch(`${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: this.convertMessages(messages),
        generationConfig: {
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxTokens || 4096,
          topP: 0.8,
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw createAPIError('Google', response.status, error);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw createNoResponseBodyError('Google');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    return {
      async *[Symbol.asyncIterator]() {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) {
                  yield content;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      },
      async next() {
        return { done: true, value: undefined };
      },
      async return() {
        return { done: true, value: undefined };
      },
      async throw(error: any) {
        throw error;
      }
    };
  }

  protected async checkProviderHealth(): Promise<boolean> {
    const healthCheck = async () => {
      try {
        if (!this.apiKey) {
          const envKey = process.env['GOOGLE_API_KEY'];
          if (envKey) {
            this.apiKey = envKey;
          }
        }

        if (!this.apiKey) return false;
        
        const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);
        return response.ok;
      } catch {
        return false;
      }
    };

    return AIHealthChecker.performHealthCheck(healthCheck);
  }

  public getCost(tokens: number, model: string): number {
    // Google pricing (approximate, should be updated with current rates)
    const pricing: Record<string, number> = {
      'gemini-1.5-pro': 0.00125 / 1000,
      'gemini-1.5-flash': 0.000075 / 1000,
      'gemini-pro': 0.0005 / 1000,
      'gemini-pro-vision': 0.0005 / 1000
    };

    return AICostCalculator.calculateCost(tokens, model, pricing);
  }

  public validateConfig(config: AIProviderConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    const baseValidation = this.validateBaseConfig(config);
    
    // Use shared validation utilities
    const apiKeyValidation = AIValidationUtils.validateApiKey(config, 'Google');
    if (!apiKeyValidation.isValid && !process.env['GOOGLE_API_KEY']) {
      baseValidation.errors.push(apiKeyValidation.error!);
    }

    const modelValidation = AIValidationUtils.validateModel(
      config.model, 
      this.capabilities.supportedModels, 
      'GoogleProvider'
    );
    if (modelValidation.warning) {
      baseValidation.warnings.push(modelValidation.warning);
    }

    return baseValidation;
  }
}