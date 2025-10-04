import axios from 'axios';
import { AIProvider } from './base-provider.js';
import { AIMessageFormatter, AIValidationUtils, AIHealthChecker } from '../../utils/ai-provider-utils.js';
import {
  createServerNotRunningError,
  createNoResponseContentError
} from '../../constants/errors.js';
import type {
  AIMessage,
  AIProviderConfig,
  AIResponse,
  AIProviderCapabilities
} from '../../types/ai.types.js';

export class OllamaProvider extends AIProvider {
  public readonly name = 'ollama';
  public readonly capabilities: AIProviderCapabilities = {
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: true,
    supportsAudio: false,
    maxContextLength: 32000, // Common Ollama model context length
    supportedModels: [
      'llama2',
      'llama3',
      'codellama',
      'mistral',
      'mixtral',
      'neural-chat',
      'orca-mini',
      'phi',
      'tinyllama',
      'gemma'
    ],
    supportedRegions: ['local']
  };
  
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434') {
    super();
    this.baseUrl = baseUrl;
  }

  private async checkOllamaHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private formatMessages(messages: AIMessage[]): string {
    return AIMessageFormatter.formatAsPrompt(messages);
  }

  protected async executeSendMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    // Check if Ollama is running
    const isHealthy = await this.checkOllamaHealth();
    if (!isHealthy) {
      throw createServerNotRunningError('Ollama', this.baseUrl);
    }

    const prompt = this.formatMessages(messages);
    const model = config.model ?? this.capabilities.supportedModels[0];

    const response = await axios.post(`${this.baseUrl}/api/generate`, {
      model,
      prompt,
      options: {
        temperature: config.temperature || 0.7,
        num_predict: config.maxTokens || 4096,
        top_p: 0.8,
        num_ctx: (config as any).maxContextLength || this.capabilities.maxContextLength
      },
      stream: false
    }, {
      timeout: config.timeout || 60000
    });

    const data = response.data;
    const content = data.response || '';

    if (!content) {
      throw createNoResponseContentError('Ollama');
    }

    const totalTokens = (data.prompt_eval_count || 0) + (data.eval_count || 0);

    return this.createResponse(
      content,
      model,
      {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: totalTokens
      },
      data.done ? 'stop' : 'length',
      { responseTime: 0 } // Will be calculated by base class
    );
  }

  protected async executeStreamMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AsyncIterableIterator<string>> {
    const model = config.model || this.capabilities.supportedModels[0];
    const prompt = this.formatMessages(messages);

    const response = await axios.post(`${this.baseUrl}/api/generate`, {
      model,
      prompt,
      options: {
        temperature: config.temperature || 0.7,
        num_predict: config.maxTokens || 4096,
        top_p: 0.8,
        num_ctx: (config as any).maxContextLength || this.capabilities.maxContextLength
      },
      stream: true
    }, {
      responseType: 'stream',
      timeout: config.timeout || 60000
    });

    const stream = response.data;
    const decoder = new TextDecoder('utf-8');

    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of stream) {
          const lines = decoder.decode(chunk, { stream: true }).split('\n');
          for (const line of lines) {
            if (line.trim() === '') continue;
            try {
              const data = JSON.parse(line);
              if (data.response) {
                yield data.response;
              }
            } catch (error) {
              // Handle incomplete JSON chunks
              console.error('Failed to parse Ollama stream chunk:', error);
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
    return AIHealthChecker.performHealthCheck(() => this.checkOllamaHealth());
  }

  public getCost(_tokens: number, _model: string): number {
    // Ollama is typically run locally, so cost is usually 0
    return 0;
  }

  public validateConfig(config: AIProviderConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    const baseValidation = this.validateBaseConfig(config);
    
    // Use shared validation utilities
    const modelValidation = AIValidationUtils.validateModel(
      config.model, 
      this.capabilities.supportedModels, 
      'OllamaProvider'
    );
    if (modelValidation.warning) {
      baseValidation.warnings.push(modelValidation.warning);
    }

    const baseUrlValidation = AIValidationUtils.validateBaseUrl(config.baseUrl);
    if (!baseUrlValidation.isValid) {
      baseValidation.errors.push(baseUrlValidation.error!);
    }

    return baseValidation;
  }
}