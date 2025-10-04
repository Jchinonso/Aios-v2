import { VertexAI } from '@google-cloud/vertexai';
import { AIProvider } from './base-provider.js';
import { AIMessageFormatter, AIValidationUtils, AIHealthChecker, AICostCalculator } from '../../utils/ai-provider-utils.js';
import { createStreamIterator } from '../../utils/stream-iterator.js';
import {
  createProjectIdRequiredError,
  createNoResponseContentError
} from '../../constants/errors.js';
import type {
  AIMessage,
  AIProviderConfig,
  AIResponse,
  AIProviderCapabilities
} from '../../types/ai.types.js';

export class GoogleCloudProvider extends AIProvider {
  public readonly name = 'google-cloud';
  public readonly capabilities: AIProviderCapabilities = {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    supportsAudio: false,
    maxContextLength: 1000000, // Gemini 1.5 Pro context length
    supportedModels: [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
      'gemini-pro-vision',
      'text-bison',
      'text-unicorn',
      'code-bison',
      'codechat-bison'
    ],
    supportedRegions: [
      'us-central1',
      'us-east1',
      'us-west1',
      'europe-west1',
      'europe-west4',
      'asia-southeast1',
      'asia-northeast1'
    ]
  };
  
  private client: VertexAI | null = null;
  private projectId?: string;
  private location?: string;

  private initializeClient(config: AIProviderConfig): VertexAI {
    if (!this.client) {
      this.projectId = (config as any).projectId || process.env['GOOGLE_CLOUD_PROJECT_ID'];
      this.location = config.region || 'us-central1';
      
      if (!this.projectId) {
        throw createProjectIdRequiredError('Google Cloud');
      }

      this.client = new VertexAI({
        project: this.projectId,
        location: this.location
      });
    }

    return this.client;
  }

  private convertMessages(messages: AIMessage[]): any[] {
    return AIMessageFormatter.formatAsVertexAIMessages(messages);
  }

  protected async executeSendMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    const client = this.initializeClient(config);
    const model = client.getGenerativeModel({ 
      model: config.model || 'gemini-1.5-flash'
    });

    const contents = this.convertMessages(messages);
    
    const response = await model.generateContent({
      contents,
      generationConfig: {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 4096,
        topP: 0.8,
      }
    });

    const content = response.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!content) {
      throw createNoResponseContentError('Google Cloud');
    }

    return this.createResponse(
      content,
      config.model || 'gemini-1.5-flash',
      response.response.usageMetadata ? {
        promptTokens: response.response.usageMetadata.promptTokenCount || 0,
        completionTokens: response.response.usageMetadata.candidatesTokenCount || 0,
        totalTokens: response.response.usageMetadata.totalTokenCount || 0
      } : undefined,
      'stop',
      { responseTime: 0 } // Will be calculated by base class
    );
  }

  protected async executeStreamMessage(messages: AIMessage[], config: AIProviderConfig): Promise<AsyncIterableIterator<string>> {
    const client = this.initializeClient(config);
    const model = client.getGenerativeModel({ 
      model: config.model || 'gemini-1.5-flash'
    });

    const contents = this.convertMessages(messages);
    
    const response = await model.generateContentStream({
      contents,
      generationConfig: {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 4096,
        topP: 0.8,
      }
    });

    return createStreamIterator(
      response.stream,
      (chunk) => chunk.candidates?.[0]?.content?.parts?.[0]?.text || null
    );
  }

  protected async checkProviderHealth(): Promise<boolean> {
    const healthCheck = async () => {
      try {
        const client = this.initializeClient({
          ...({ projectId: process.env['GOOGLE_CLOUD_PROJECT_ID'] || 'test' } as any),
          model: 'gemini-1.5-flash',
          maxTokens: 4096,
          temperature: 0.7,
          timeout: 60000,
          retries: 3
        });
        
        // Simple health check
        const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
        await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
          generationConfig: { maxOutputTokens: 1 }
        });

        return true;
      } catch {
        return false;
      }
    };

    return AIHealthChecker.performHealthCheck(healthCheck);
  }

  public getCost(tokens: number, model: string): number {
    // Google Cloud pricing (approximate, should be updated with current rates)
    const pricing: Record<string, number> = {
      'gemini-1.5-pro': 0.00125 / 1000,
      'gemini-1.5-flash': 0.000075 / 1000,
      'gemini-1.0-pro': 0.0005 / 1000,
      'gemini-pro-vision': 0.0005 / 1000,
      'text-bison': 0.0005 / 1000,
      'text-unicorn': 0.00125 / 1000,
      'code-bison': 0.0005 / 1000,
      'codechat-bison': 0.0005 / 1000
    };

    return AICostCalculator.calculateCost(tokens, model, pricing);
  }

  public validateConfig(config: AIProviderConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    const baseValidation = this.validateBaseConfig(config);
    
    // Google Cloud specific validation
    if (!(config as any).projectId && !process.env['GOOGLE_CLOUD_PROJECT_ID']) {
      baseValidation.errors.push('Google Cloud project ID is required');
    }

    // Use shared validation utilities
    const modelValidation = AIValidationUtils.validateModel(
      config.model, 
      this.capabilities.supportedModels, 
      'GoogleCloudProvider'
    );
    if (modelValidation.warning) {
      baseValidation.warnings.push(modelValidation.warning);
    }

    return baseValidation;
  }
}