import { CohereClient } from 'cohere-ai';
import { AIProvider } from './base-provider.js';
import { AIMessageFormatter, AIValidationUtils, AIHealthChecker, AICostCalculator } from '../../utils/ai-provider-utils.js';
import { createStreamIterator } from '../../utils/stream-iterator.js';
import { COHERE_REGIONS } from '../../constants/regions.js';
import { createAPIKeyRequiredError, createNoResponseContentError } from '../../constants/errors.js';
import type {
  AIMessage,
  AIProviderConfig,
  AIResponse,
  AIProviderCapabilities
} from '../../types/ai.types.js';

export class CohereProvider extends AIProvider {
  public readonly name = 'cohere';
  public readonly capabilities: AIProviderCapabilities = {
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    supportsAudio: false,
    maxContextLength: 128000, // Command model context length
    supportedModels: [
      'command',
      'command-light',
      'command-nightly',
      'command-light-nightly',
      'base',
      'base-light'
    ],
    supportedRegions: COHERE_REGIONS as unknown as string[]
  };
  
  private client: CohereClient | null = null;

  private initializeClient(config: AIProviderConfig): CohereClient {
    if (!config.apiKey) {
      throw createAPIKeyRequiredError('Cohere');
    }

    if (!this.client) {
      this.client = new CohereClient({
        token: config.apiKey
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

    const response = await client.generate({
      model: config.model || 'command',
      prompt: prompt,
      maxTokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.7,
    });

    if (!response.generations || response.generations.length === 0) {
      throw createNoResponseContentError('Cohere');
    }

    const content = response.generations[0]?.text;
    if (!content) {
      throw createNoResponseContentError('Cohere');
    }

    const inputTokens = response.meta?.billedUnits?.inputTokens ?? 0;
    const outputTokens = response.meta?.billedUnits?.outputTokens ?? 0;
    const totalTokens = inputTokens + outputTokens;

    return this.createResponse(
      content,
      config.model || 'command',
      response.meta?.billedUnits ? {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: totalTokens
      } : undefined,
      'stop',
      { responseTime: 0 } // Will be calculated by base class
    );
  }

  protected async executeStreamMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AsyncIterableIterator<string>> {
    const client = this.initializeClient(config);
    const prompt = this.formatMessages(messages);

    const response = await client.generate({
      model: config.model || 'command',
      prompt: prompt,
      maxTokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.7,
    });

    // Cohere streaming returns a single response or array
    // Create an async iterable wrapper for consistent interface
    const makeIterable = async function* () {
      if (response && typeof response === 'string') {
        yield response;
      } else if (response && Array.isArray(response)) {
        for (const chunk of response) {
          yield chunk;
        }
      }
    };

    return createStreamIterator(makeIterable(), (chunk) => chunk);
  }

  protected async checkProviderHealth(): Promise<boolean> {
    const healthCheck = async () => {
      try {
        const client = this.initializeClient({
          apiKey: 'test',
          model: 'command',
          maxTokens: 4096,
          temperature: 0.7,
          timeout: 60000,
          retries: 3
        });
        
        // Simple health check
        await client.generate({
          model: 'command',
          prompt: 'Hello',
          maxTokens: 1
        });

        return true;
      } catch {
        return false;
      }
    };

    return AIHealthChecker.performHealthCheck(healthCheck);
  }

  public getCost(tokens: number, model: string): number {
    // Cohere pricing (approximate, should be updated with current rates)
    const pricing: Record<string, number> = {
      'command': 0.015 / 1000,
      'command-light': 0.003 / 1000,
      'command-nightly': 0.015 / 1000,
      'command-light-nightly': 0.003 / 1000,
      'base': 0.015 / 1000,
      'base-light': 0.003 / 1000
    };

    return AICostCalculator.calculateCost(tokens, model, pricing);
  }

  public validateConfig(config: AIProviderConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    const baseValidation = this.validateBaseConfig(config);
    
    // Use shared validation utilities
    const apiKeyValidation = AIValidationUtils.validateApiKey(config, 'Cohere');
    if (!apiKeyValidation.isValid) {
      baseValidation.errors.push(apiKeyValidation.error!);
    }

    const modelValidation = AIValidationUtils.validateModel(
      config.model, 
      this.capabilities.supportedModels, 
      'CohereProvider'
    );
    if (modelValidation.warning) {
      baseValidation.warnings.push(modelValidation.warning);
    }

    return baseValidation;
  }
}