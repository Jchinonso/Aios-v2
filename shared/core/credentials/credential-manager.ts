/**
 * @fileoverview Credential Manager - Secure API Key Management
 * 
 * This module provides centralized credential management for all AI and cloud providers.
 * It handles loading credentials from environment variables, validation, and secure injection
 * into provider configurations.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { IResult } from '../types/result.js'
import { Result } from '../types/result.js'
import type { AIProviderConfig } from '../../types/ai.types.js'

/**
 * Environment variable mapping for AI providers
 */
export const AI_CREDENTIAL_MAP = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  groq: 'GROQ_API_KEY',
  ollama: null, // No API key needed
  local: null   // No API key needed
} as const;

/**
 * Environment variable mapping for cloud providers
 */
export const CLOUD_CREDENTIAL_MAP = {
  vercel: 'VERCEL_TOKEN',
  netlify: 'NETLIFY_TOKEN',
  aws: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] as const,
  railway: 'RAILWAY_TOKEN',
  render: 'RENDER_API_KEY'
} as const;

/**
 * Credential validation result
 */
export interface CredentialValidationResult {
  isValid: boolean;
  provider: string;
  hasCredentials: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Provider credential information
 */
export interface ProviderCredentials {
  provider: string;
  apiKey?: string;
  additionalKeys?: Record<string, string>;
  isConfigured: boolean;
  isLocal: boolean;
}

/**
 * Credential Manager - Centralized API Key Management
 * 
 * This class provides secure credential management for all AI and cloud providers.
 * It loads credentials from environment variables, validates them, and provides
 * them to services in a secure manner.
 * 
 * @example
 * ```typescript
 * const credentialManager = new CredentialManager();
 * 
 * // Check if OpenAI is configured
 * const openaiStatus = credentialManager.getProviderCredentials('openai');
 * if (openaiStatus.isConfigured) {
 *   // Use OpenAI
 * }
 * 
 * // Get configured provider config
 * const config = credentialManager.buildProviderConfig('openai');
 * ```
 */
export class CredentialManager {
  private readonly loadedCredentials = new Map<string, string>();
  private readonly validationCache = new Map<string, CredentialValidationResult>();
  private readonly dynamicCredentials = new Map<string, Record<string, string>>();

  constructor() {
    this.loadAllCredentials();
  }

  /**
   * Loads all credentials from environment variables
   * 
   * @private
   */
  private loadAllCredentials(): void {
    // Load AI provider credentials
    Object.entries(AI_CREDENTIAL_MAP).forEach(([provider, envVar]) => {
      if (envVar && process.env[envVar]) {
        this.loadedCredentials.set(provider, process.env[envVar]!);
      }
    });

    // Load cloud provider credentials
    Object.entries(CLOUD_CREDENTIAL_MAP).forEach(([provider, envVars]) => {
      if (Array.isArray(envVars)) {
        // Multiple environment variables (e.g., AWS)
        const credentials: string[] = [];
        envVars.forEach(envVar => {
          if (process.env[envVar]) {
            credentials.push(process.env[envVar]!);
          }
        });
        if (credentials.length === envVars.length) {
          this.loadedCredentials.set(provider, credentials.join(':'));
        }
      } else if (envVars && typeof envVars === 'string' && process.env[envVars]) {
        // Single environment variable
        this.loadedCredentials.set(provider, process.env[envVars]!);
      }
    });
  }

  /**
   * Gets credential information for a specific provider
   * 
   * @param {string} provider - Provider name
   * @returns {ProviderCredentials} Provider credential information
   * 
   * @example
   * ```typescript
   * const credentials = credentialManager.getProviderCredentials('openai');
   * if (credentials.isConfigured) {
   *   console.log('OpenAI is configured');
   * }
   * ```
   */
  getProviderCredentials(provider: string): ProviderCredentials {
    const isLocal = provider === 'ollama' || provider === 'local';
    
    // Check for dynamic credentials first (user-provided)
    const hasDynamicCredentials = this.dynamicCredentials.has(provider);
    const hasEnvironmentCredentials = this.loadedCredentials.has(provider);
    const hasCredentials = hasDynamicCredentials || hasEnvironmentCredentials || isLocal;

    let apiKey: string | undefined;
    if (hasDynamicCredentials) {
      // Use dynamic credentials (user-provided)
      const dynamicCreds = this.dynamicCredentials.get(provider);
      const envVar = AI_CREDENTIAL_MAP[provider as keyof typeof AI_CREDENTIAL_MAP] || 
                     CLOUD_CREDENTIAL_MAP[provider as keyof typeof CLOUD_CREDENTIAL_MAP];
      
      if (Array.isArray(envVar)) {
        // Multiple environment variables (e.g., AWS)
        for (const envKey of envVar) {
          if (dynamicCreds?.[envKey]) {
            apiKey = dynamicCreds[envKey];
            break;
          }
        }
      } else if (envVar && typeof envVar === 'string' && dynamicCreds?.[envVar]) {
        // Single environment variable
        apiKey = dynamicCreds[envVar];
      }
    } else {
      // Use environment credentials
      apiKey = this.loadedCredentials.get(provider);
    }

    return {
      provider,
      ...(apiKey && { apiKey }),
      isConfigured: hasCredentials,
      isLocal
    };
  }

  /**
   * Builds a provider configuration with credentials
   * 
   * @param {string} provider - Provider name
   * @param {Partial<AIProviderConfig>} [overrides] - Configuration overrides
   * @returns {AIProviderConfig} Complete provider configuration
   * 
   * @example
   * ```typescript
   * const config = credentialManager.buildProviderConfig('openai', {
   *   model: 'gpt-4',
   *   temperature: 0.8
   * });
   * ```
   */
  buildProviderConfig(provider: string, overrides: Partial<AIProviderConfig> = {}): AIProviderConfig {
    const credentials = this.getProviderCredentials(provider);
    
    if (!credentials.isConfigured && !credentials.isLocal) {
      const envVar = AI_CREDENTIAL_MAP[provider as keyof typeof AI_CREDENTIAL_MAP] || 
                     CLOUD_CREDENTIAL_MAP[provider as keyof typeof CLOUD_CREDENTIAL_MAP];
      
      let errorMessage = `Provider '${provider}' is not configured.`;
      if (envVar) {
        if (Array.isArray(envVar)) {
          errorMessage += ` Please set the required environment variables: ${envVar.join(' and ')}`;
        } else {
          errorMessage += ` Please set the required environment variable: ${envVar}`;
        }
      }
      errorMessage += ' Or use the interactive credential prompt to configure it dynamically.';
      
      throw new Error(errorMessage);
    }

    return {
      apiKey: credentials.apiKey || '',
      model: overrides.model || this.getDefaultModel(provider),
      maxTokens: overrides.maxTokens || 4096,
      temperature: overrides.temperature || 0.7,
      timeout: overrides.timeout || 60000,
      retries: overrides.retries || 3,
      ...(overrides.baseUrl && { baseUrl: overrides.baseUrl })
    };
  }

  /**
   * Validates credentials for a provider
   * 
   * @param {string} provider - Provider name
   * @returns {CredentialValidationResult} Validation result
   * 
   * @example
   * ```typescript
   * const validation = credentialManager.validateProvider('openai');
   * if (!validation.isValid) {
   *   console.error('Validation failed:', validation.errors);
   * }
   * ```
   */
  validateProvider(provider: string): CredentialValidationResult {
    // Check cache first
    if (this.validationCache.has(provider)) {
      return this.validationCache.get(provider)!;
    }

    const credentials = this.getProviderCredentials(provider);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate AI providers
    if (AI_CREDENTIAL_MAP[provider as keyof typeof AI_CREDENTIAL_MAP] !== undefined) {
      if (credentials.isLocal) {
        // Local providers don't need validation
        warnings.push(`${provider} is a local provider - no credentials needed`);
      } else if (!credentials.isConfigured) {
        const envVar = AI_CREDENTIAL_MAP[provider as keyof typeof AI_CREDENTIAL_MAP];
        errors.push(`${provider} API key not found. Set ${envVar} environment variable`);
      } else {
        // Basic format validation
        if (credentials.apiKey && !this.isValidApiKeyFormat(provider, credentials.apiKey)) {
          warnings.push(`${provider} API key format may be invalid`);
        }
      }
    }

    // Validate cloud providers
    if (CLOUD_CREDENTIAL_MAP[provider as keyof typeof CLOUD_CREDENTIAL_MAP] !== undefined) {
      if (!credentials.isConfigured) {
        const envVar = CLOUD_CREDENTIAL_MAP[provider as keyof typeof CLOUD_CREDENTIAL_MAP];
        if (Array.isArray(envVar)) {
          errors.push(`${provider} credentials not found. Set ${envVar.join(' and ')} environment variables`);
        } else {
          errors.push(`${provider} token not found. Set ${envVar} environment variable`);
        }
      }
    }

    const result: CredentialValidationResult = {
      isValid: errors.length === 0,
      provider,
      hasCredentials: credentials.isConfigured,
      errors,
      warnings
    };

    // Cache the result
    this.validationCache.set(provider, result);
    return result;
  }

  /**
   * Gets all configured providers
   * 
   * @returns {ProviderCredentials[]} List of configured providers
   * 
   * @example
   * ```typescript
   * const configuredProviders = credentialManager.getConfiguredProviders();
   * console.log('Available providers:', configuredProviders.map(p => p.provider));
   * ```
   */
  getConfiguredProviders(): ProviderCredentials[] {
    const allProviders = [
      ...Object.keys(AI_CREDENTIAL_MAP),
      ...Object.keys(CLOUD_CREDENTIAL_MAP)
    ];

    return allProviders.map(provider => this.getProviderCredentials(provider))
                      .filter(credentials => credentials.isConfigured || credentials.isLocal);
  }

  /**
   * Gets the default model for a provider
   * 
   * @private
   * @param {string} provider - Provider name
   * @returns {string} Default model name
   */
  private getDefaultModel(provider: string): string {
    const defaultModels: Record<string, string> = {
      openai: 'gpt-3.5-turbo',
      anthropic: 'claude-3-sonnet-20240229',
      groq: 'llama-3-70b-8192',
      ollama: 'llama3',
      local: 'local-model'
    };

    return defaultModels[provider] || 'default-model';
  }

  /**
   * Validates API key format for a provider
   * 
   * @private
   * @param {string} provider - Provider name
   * @param {string} apiKey - API key to validate
   * @returns {boolean} True if format appears valid
   */
  private isValidApiKeyFormat(provider: string, apiKey: string): boolean {
    const patterns: Record<string, RegExp> = {
      openai: /^sk-[A-Za-z0-9]{48}$/,
      anthropic: /^sk-ant-[A-Za-z0-9-]{95}$/,
      groq: /^gsk_[A-Za-z0-9]{52}$/
    };

    const pattern = patterns[provider];
    return pattern ? pattern.test(apiKey) : apiKey.length > 10;
  }

  /**
   * Injects dynamic credentials for a provider
   * 
   * @param {string} provider - Provider name
   * @param {Record<string, string>} credentials - Credentials to inject
   * @returns {Promise<IResult<void>>} Result indicating success or failure
   * 
   * @example
   * ```typescript
   * const result = await credentialManager.injectCredentials('vercel', {
   *   VERCEL_TOKEN: 'user-provided-token'
   * });
   * ```
   */
  async injectCredentials(provider: string, credentials: Record<string, string>): Promise<IResult<void>> {
    try {
      this.dynamicCredentials.set(provider, credentials);
      
      // Clear validation cache for this provider
      this.validationCache.delete(provider);
      
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Removes dynamic credentials for a provider
   * 
   * @param {string} provider - Provider name
   * @returns {Promise<IResult<void>>} Result indicating success or failure
   */
  async removeDynamicCredentials(provider: string): Promise<IResult<void>> {
    try {
      this.dynamicCredentials.delete(provider);
      this.validationCache.delete(provider);
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Checks if provider has dynamic credentials
   * 
   * @param {string} provider - Provider name
   * @returns {boolean} True if provider has dynamic credentials
   */
  hasDynamicCredentials(provider: string): boolean {
    return this.dynamicCredentials.has(provider);
  }

  /**
   * Refreshes credentials from environment variables
   * 
   * @returns {Promise<IResult<void>>} Result indicating success or failure
   * 
   * @example
   * ```typescript
   * const result = await credentialManager.refreshCredentials();
   * if (result.isSuccess) {
   *   console.log('Credentials refreshed');
   * }
   * ```
   */
  async refreshCredentials(): Promise<IResult<void>> {
    try {
      this.loadedCredentials.clear();
      this.validationCache.clear();
      this.loadAllCredentials();
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Gets a summary of all provider configurations
   * 
   * @returns {string} Configuration summary
   * 
   * @example
   * ```typescript
   * const summary = credentialManager.getConfigurationSummary();
   * console.log(summary);
   * ```
   */
  getConfigurationSummary(): string {
    const configured = this.getConfiguredProviders();
    const allProviders = [
      ...Object.keys(AI_CREDENTIAL_MAP),
      ...Object.keys(CLOUD_CREDENTIAL_MAP)
    ];

    const configuredNames = configured.map(p => p.provider);
    const missingNames = allProviders.filter(p => !configuredNames.includes(p));

    let summary = `\n🔑 Provider Configuration Summary:\n`;
    summary += `✅ Configured (${configuredNames.length}): ${configuredNames.join(', ')}\n`;
    
    if (missingNames.length > 0) {
      summary += `❌ Missing (${missingNames.length}): ${missingNames.join(', ')}\n`;
      summary += `\n💡 To configure missing providers, set the required environment variables:\n`;
      
      missingNames.forEach(provider => {
        const envVar = AI_CREDENTIAL_MAP[provider as keyof typeof AI_CREDENTIAL_MAP] || 
                      CLOUD_CREDENTIAL_MAP[provider as keyof typeof CLOUD_CREDENTIAL_MAP];
        if (envVar) {
          summary += `   ${provider}: ${Array.isArray(envVar) ? envVar.join(' & ') : envVar}\n`;
        }
      });
    }

    return summary;
  }
}
