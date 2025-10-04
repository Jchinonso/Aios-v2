import axios from 'axios';
import { AIProvider } from './base-provider.js';
import { AIMessageFormatter, AIHttpClient, AIStreamProcessor, AIValidationUtils, AIHealthChecker } from '../../utils/ai-provider-utils.js';
import { GROQ_REGIONS } from '../../constants/regions.js';
import { createAPIKeyRequiredError, createNoResponseContentError } from '../../constants/errors.js';
import type { AIMessage, AIProviderConfig, AIResponse, AIProviderCapabilities } from '../../types/ai.types.js';

export class GroqProvider extends AIProvider {
  public readonly name = 'groq';
  public readonly capabilities: AIProviderCapabilities = {
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    supportsAudio: false,
    maxContextLength: 32768,
    supportedModels: [
      'llama3-8b-8192',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'gemma-7b-it'
    ],
    supportedRegions: GROQ_REGIONS as unknown as string[]
  };

  private baseUrl = 'https://api.groq.com/openai/v1';

  private mapMessages(messages: AIMessage[]): any[] {
    return AIMessageFormatter.formatAsOpenAIMessages(messages);
  }

  protected async executeSendMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    // Validate API key using shared utility
    const apiKeyValidation = AIValidationUtils.validateApiKey(config, 'Groq');
    if (!apiKeyValidation.isValid) {
      throw createAPIKeyRequiredError('Groq');
    }

    const mappedMessages = this.mapMessages(messages);
    const requestConfig = AIHttpClient.createRequestConfig(config);

    const requestData = {
      model: config.model,
      messages: mappedMessages,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      stream: false
    };

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      requestData,
      {
        headers: requestConfig.headers,
        timeout: requestConfig.timeout
      }
    );

    const choice = response.data.choices?.[0];
    if (!choice?.message?.content) {
      throw createNoResponseContentError('Groq');
    }

    return this.createResponse(
      choice.message.content,
      response.data.model,
      response.data.usage ? {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens
      } : undefined,
      choice.finish_reason || 'stop',
      { responseTime: 0 } // Will be calculated by base class
    );
  }

  protected async executeStreamMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AsyncIterableIterator<string>> {
    // Validate API key using shared utility
    const apiKeyValidation = AIValidationUtils.validateApiKey(config, 'Groq');
    if (!apiKeyValidation.isValid) {
      throw createAPIKeyRequiredError('Groq');
    }

    const mappedMessages = this.mapMessages(messages);
    const requestConfig = AIHttpClient.createRequestConfig(config);

    const requestData = {
      model: config.model,
      messages: mappedMessages,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      stream: true
    };

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      requestData,
      {
        headers: requestConfig.headers,
        responseType: 'stream',
        timeout: requestConfig.timeout
      }
    );

    // Use shared stream processor for SSE
    return AIStreamProcessor.processSSEStream(response.data);
  }

  protected async checkProviderHealth(): Promise<boolean> {
    const healthCheck = AIHealthChecker.createPingCheck(
      `${this.baseUrl}/models`,
      AIHttpClient.createHeaders('test')
    );
    return AIHealthChecker.performHealthCheck(healthCheck);
  }

  public getCost(_tokens: number, _model: string): number {
    // Groq pricing (free tier available, but with rate limits)
    return 0; // Groq is currently free for most models
  }

  public validateConfig(config: AIProviderConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    const baseValidation = this.validateBaseConfig(config);
    
    // Use shared validation utilities
    const apiKeyValidation = AIValidationUtils.validateApiKey(config, 'Groq');
    if (!apiKeyValidation.isValid) {
      baseValidation.errors.push(apiKeyValidation.error!);
    }

    const modelValidation = AIValidationUtils.validateModel(
      config.model, 
      this.capabilities.supportedModels, 
      'GroqProvider'
    );
    if (modelValidation.warning) {
      baseValidation.warnings.push(modelValidation.warning);
    }

    return baseValidation;
  }
}