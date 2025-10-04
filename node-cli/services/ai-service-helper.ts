/**
 * AI Service Helper for CLI
 * Creates AI service instances based on environment configuration
 *
 * @fileoverview Simple AI service creation for CLI commands
 * @module node-cli/services
 */

import type { ILogger } from '@aios/shared';

/**
 * AI Provider configuration from environment
 */
export interface AIProviderConfig {
  backend: 'openai' | 'anthropic' | 'groq' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Simple AI Service interface for CLI
 */
export interface SimpleAIService {
  generateInsights(projectAnalysis: any): Promise<string>;
  explainCode(code: string, language: string): Promise<string>;
  suggestImprovements(analysis: any): Promise<string[]>;
  analyzeArchitecture(structure: any): Promise<string>;
}

/**
 * Get AI provider configuration from environment variables
 */
export function getAIConfigFromEnv(): AIProviderConfig | null {
  const backend = (process.env['AIOS_BACKEND'] || 'openai') as AIProviderConfig['backend'];
  const model = process.env['AIOS_MODEL'] || 'gpt-4o';

  let apiKey: string | undefined;

  switch (backend) {
    case 'openai':
      apiKey = process.env['OPENAI_API_KEY'];
      break;
    case 'anthropic':
      apiKey = process.env['ANTHROPIC_API_KEY'];
      break;
    case 'groq':
      apiKey = process.env['GROQ_API_KEY'];
      break;
    case 'ollama':
      apiKey = undefined; // Ollama doesn't need API key
      break;
  }

  // Check if we have the required configuration
  if (backend !== 'ollama' && !apiKey) {
    return null;
  }

  const config: AIProviderConfig = {
    backend,
    model,
    baseUrl: process.env['AIOS_OLLAMA_BASE_URL'] || 'http://127.0.0.1:11434'
  };

  if (apiKey) {
    config.apiKey = apiKey;
  }

  return config;
}

/**
 * Create a simple AI service for CLI usage
 */
export async function createSimpleAIService(
  config: AIProviderConfig,
  logger: ILogger
): Promise<SimpleAIService> {
  logger.info(`Initializing AI service: ${config.backend} with model ${config.model}`);

  // Import the appropriate SDK
  let client: any;

  try {
    switch (config.backend) {
      case 'openai': {
        const { default: OpenAI } = await import('openai');
        client = new OpenAI({ apiKey: config.apiKey });
        break;
      }
      case 'anthropic': {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        client = new Anthropic({ apiKey: config.apiKey });
        break;
      }
      case 'groq': {
        // Groq uses OpenAI-compatible API
        const { default: OpenAI } = await import('openai');
        client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: 'https://api.groq.com/openai/v1'
        });
        break;
      }
      case 'ollama': {
        // Ollama uses HTTP requests
        client = { baseUrl: config.baseUrl };
        break;
      }
      default:
        throw new Error(`Unsupported AI backend: ${config.backend}`);
    }
  } catch (error) {
    logger.warn(`Failed to load AI SDK for ${config.backend}`, { error });
    throw new Error(`AI SDK not installed. Run: npm install ${getSDKPackage(config.backend)}`);
  }

  // Return a simple service implementation
  return {
    async generateInsights(projectAnalysis: any): Promise<string> {
      const prompt = `Analyze this project and provide insights:\n\n${JSON.stringify(projectAnalysis, null, 2)}`;
      return await callAI(client, config, prompt, logger);
    },

    async explainCode(code: string, language: string): Promise<string> {
      const prompt = `Explain this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;
      return await callAI(client, config, prompt, logger);
    },

    async suggestImprovements(analysis: any): Promise<string[]> {
      const prompt = `Suggest improvements for this project:\n\n${JSON.stringify(analysis, null, 2)}\n\nProvide a list of actionable improvements.`;
      const response = await callAI(client, config, prompt, logger);
      // Parse bullet points or numbered list
      return response.split('\n').filter(line => line.trim().match(/^[-*\d]/));
    },

    async analyzeArchitecture(structure: any): Promise<string> {
      const prompt = `Analyze this project architecture and suggest best practices:\n\n${JSON.stringify(structure, null, 2)}`;
      return await callAI(client, config, prompt, logger);
    }
  };
}

/**
 * Call AI provider with the given prompt
 */
async function callAI(
  client: any,
  config: AIProviderConfig,
  prompt: string,
  logger: ILogger
): Promise<string> {
  try {
    switch (config.backend) {
      case 'openai': {
        const completion = await client.chat.completions.create({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000
        });
        return completion.choices[0].message.content || '';
      }

      case 'anthropic': {
        const message = await client.messages.create({
          model: config.model,
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        });
        return message.content[0].text || '';
      }

      case 'groq': {
        const completion = await client.chat.completions.create({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000
        });
        return completion.choices[0].message.content || '';
      }

      case 'ollama': {
        const response = await fetch(`${config.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.model,
            prompt,
            stream: false
          })
        });

        if (!response.ok) {
          throw new Error(`Ollama request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response || '';
      }

      default:
        throw new Error(`Unsupported backend: ${config.backend}`);
    }
  } catch (error) {
    logger.error('AI call failed', error as Error);
    throw error;
  }
}

/**
 * Get the npm package name for an AI SDK
 */
function getSDKPackage(backend: string): string {
  const packages: Record<string, string> = {
    openai: 'openai',
    anthropic: '@anthropic-ai/sdk',
    groq: 'openai', // Groq uses OpenAI SDK
    ollama: '' // No package needed, uses HTTP
  };
  return packages[backend] || backend;
}

/**
 * Check if AI is available and configured
 */
export function isAIAvailable(): boolean {
  const config = getAIConfigFromEnv();
  return config !== null;
}