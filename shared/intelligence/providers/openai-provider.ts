import { OpenAI } from 'openai';
import { AIProvider } from './base-provider.js';
import { AIMessageFormatter, AIValidationUtils, AIHealthChecker } from '../../utils/ai-provider-utils.js';
import { createStreamIterator } from '../../utils/stream-iterator.js';
import { OPENAI_REGIONS } from '../../constants/regions.js';
import { createAPIKeyRequiredError, createNoResponseContentError } from '../../constants/errors.js';
import type {
  AIMessage,
  AIProviderConfig,
  AIResponse,
  AIProviderCapabilities
} from '../../types/ai.types.js';

export class OpenAIProvider extends AIProvider {
  public readonly name = 'openai';
  public readonly capabilities: AIProviderCapabilities = {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    supportsAudio: false,
    maxContextLength: 128000, // GPT-4 Turbo context length
    supportedModels: [
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-4-vision-preview'
    ],
    supportedRegions: OPENAI_REGIONS as unknown as string[]
  };
  
  private client: OpenAI | null = null;

  private initializeClient(config: AIProviderConfig): OpenAI {
    if (!config.apiKey) {
      throw createAPIKeyRequiredError('OpenAI');
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl
      });
    }

    return this.client;
  }

  private mapMessages(messages: AIMessage[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return AIMessageFormatter.formatAsOpenAIMessages(messages) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  }

  protected async executeSendMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    const client = this.initializeClient(config);
    const mappedMessages = this.mapMessages(messages);

    const response = await client.chat.completions.create({
      model: config.model,
      messages: mappedMessages,
      max_tokens: config.maxTokens,
      temperature: config.temperature
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw createNoResponseContentError('OpenAI');
    }

    return this.createResponse(
      choice.message.content,
      response.model,
      response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined,
      choice.finish_reason || 'stop',
      { responseTime: 0 } // Will be calculated by base class
    );
  }

  protected async executeStreamMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AsyncIterableIterator<string>> {
    const client = this.initializeClient(config);
    const mappedMessages = this.mapMessages(messages);

    const stream = await client.chat.completions.create({
      model: config.model,
      messages: mappedMessages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: true
    });

    return createStreamIterator(
      stream,
      (chunk) => chunk.choices[0]?.delta?.content
    );
  }

  protected async checkProviderHealth(): Promise<boolean> {
    const healthCheck = async () => {
      try {
        const client = this.initializeClient({ 
          apiKey: 'test', 
          model: 'gpt-3.5-turbo',
          maxTokens: 4096,
          temperature: 0.7,
          timeout: 60000,
          retries: 3
        });
        await client.models.list();
        return true;
      } catch {
        return false;
      }
    };

    return AIHealthChecker.performHealthCheck(healthCheck);
  }

  public getCost(tokens: number, model: string): number {
    // OpenAI pricing (approximate, should be updated with current rates)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
      'gpt-4-turbo-preview': { input: 0.01 / 1000, output: 0.03 / 1000 },
      'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 },
      'gpt-3.5-turbo-16k': { input: 0.003 / 1000, output: 0.004 / 1000 }
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
    if (!modelPricing) return 0;
    return tokens * (modelPricing.input + modelPricing.output) / 2; // Average of input/output
  }

  public validateConfig(config: AIProviderConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    const baseValidation = this.validateBaseConfig(config);
    
    // Use shared validation utilities
    const apiKeyValidation = AIValidationUtils.validateApiKey(config, 'OpenAI');
    if (!apiKeyValidation.isValid) {
      baseValidation.errors.push(apiKeyValidation.error!);
    }

    const modelValidation = AIValidationUtils.validateModel(
      config.model, 
      this.capabilities.supportedModels, 
      'OpenAIProvider'
    );
    if (modelValidation.warning) {
      baseValidation.warnings.push(modelValidation.warning);
    }

    return baseValidation;
  }
}