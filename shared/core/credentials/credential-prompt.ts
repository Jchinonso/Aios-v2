/**
 * @fileoverview Credential Prompt - Interactive Credential Collection
 * 
 * This module provides interactive credential collection for cloud providers
 * when users choose a deployment platform after AI suggestions.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { IResult } from '../types/result.js'
import { Result } from '../types/result.js'
import type { ILogger } from '../logging/logger.interface.js'
import { CLOUD_CREDENTIAL_MAP } from './credential-manager.js'

/**
 * Credential prompt configuration
 */
export interface CredentialPromptConfig {
  provider: string;
  requiredFields: string[];
  optionalFields?: string[];
  description?: string;
  instructions?: string;
}

/**
 * User credential input
 */
export interface UserCredentialInput {
  provider: string;
  credentials: Record<string, string>;
  saveToEnv?: boolean;
}

/**
 * Credential prompt result
 */
export interface CredentialPromptResult {
  success: boolean;
  credentials?: Record<string, string>;
  error?: string;
  savedToEnv?: boolean;
}

/**
 * Universal Credential Prompt System
 * 
 * This class provides credential collection for cloud providers that works in both
 * CLI (interactive) and web (non-interactive) environments. It adapts based on
 * the runtime environment and available dependencies.
 * 
 * @example
 * ```typescript
 * // CLI usage (interactive)
 * const credentialPrompt = new CredentialPrompt(logger, { interactive: true });
 * const result = await credentialPrompt.promptForCredentials('vercel');
 * 
 * // Web usage (non-interactive)
 * const credentialPrompt = new CredentialPrompt(logger, { interactive: false });
 * const result = await credentialPrompt.promptForCredentials('vercel');
 * ```
 */
export class CredentialPrompt {
  private readonly isInteractive: boolean;
  private readonly hasInquirer: boolean;

  constructor(
    private readonly logger: ILogger,
    options: { interactive?: boolean } = {}
  ) {
    // Auto-detect environment if not specified
    this.isInteractive = options.interactive ?? this.detectInteractiveEnvironment();
    this.hasInquirer = this.checkInquirerAvailability();
  }

  /**
   * Auto-detects if running in an interactive environment
   * 
   * @private
   * @returns {boolean} True if interactive environment detected
   */
  private detectInteractiveEnvironment(): boolean {
    // Check if running in Node.js (CLI) vs browser (web)
    if (typeof window !== 'undefined') {
      return false; // Browser environment
    }
    
    // Check if stdin is available and is a TTY (terminal)
    if (typeof process !== 'undefined' && process.stdin && process.stdin.isTTY) {
      return true; // CLI with terminal
    }
    
    // Check for common CLI environment variables
    if (typeof process !== 'undefined' && process.env) {
      return !!(process.env['TERM'] || process.env['TERM_PROGRAM'] || process.env['WT_SESSION']);
    }
    
    return false; // Default to non-interactive
  }

  /**
   * Checks if inquirer is available for interactive prompts
   * 
   * @private
   * @returns {boolean} True if inquirer is available
   */
  private checkInquirerAvailability(): boolean {
    try {
      // Try to require inquirer (will be bundled in CLI builds)
      require('inquirer');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prompts user for credentials for a specific cloud provider
   * 
   * @param {string} provider - Cloud provider name
   * @param {boolean} [forceInteractive] - Force interactive mode (overrides auto-detection)
   * @returns {Promise<IResult<UserCredentialInput>>} Result containing user input
   * 
   * @example
   * ```typescript
   * // Auto-detect environment
   * const result = await credentialPrompt.promptForCredentials('vercel');
   * 
   * // Force interactive mode (CLI)
   * const result = await credentialPrompt.promptForCredentials('vercel', true);
   * 
   * // Force non-interactive mode (Web)
   * const result = await credentialPrompt.promptForCredentials('vercel', false);
   * ```
   */
  async promptForCredentials(
    provider: string, 
    forceInteractive?: boolean
  ): Promise<IResult<UserCredentialInput>> {
    try {
      const config = this.getPromptConfig(provider);
      if (!config) {
        return Result.failure(new Error(`Unsupported cloud provider: ${provider}`));
      }

      // Determine if we should use interactive mode
      const useInteractive = forceInteractive ?? this.isInteractive;
      const canUseInteractive = useInteractive && this.hasInquirer;

      this.logger.info(`Prompting for ${provider} credentials`, {
        interactive: canUseInteractive,
        hasInquirer: this.hasInquirer,
        environment: this.isInteractive ? 'CLI' : 'Web'
      });

      if (canUseInteractive) {
        return await this.interactivePrompt(config);
      } else {
        return await this.nonInteractivePrompt(config);
      }
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Gets the prompt configuration for a provider
   * 
   * @private
   * @param {string} provider - Provider name
   * @returns {CredentialPromptConfig | null} Prompt configuration
   */
  private getPromptConfig(provider: string): CredentialPromptConfig | null {
    const configs: Record<string, CredentialPromptConfig> = {
      vercel: {
        provider: 'vercel',
        requiredFields: ['VERCEL_TOKEN'],
        description: 'Vercel Personal Access Token',
        instructions: 'Get your token from https://vercel.com/account/tokens'
      },
      netlify: {
        provider: 'netlify',
        requiredFields: ['NETLIFY_TOKEN'],
        description: 'Netlify Personal Access Token',
        instructions: 'Get your token from https://app.netlify.com/user/applications#personal-access-tokens'
      },
      aws: {
        provider: 'aws',
        requiredFields: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
        optionalFields: ['AWS_REGION'],
        description: 'AWS Access Credentials',
        instructions: 'Get your credentials from https://aws.amazon.com/console/'
      },
      railway: {
        provider: 'railway',
        requiredFields: ['RAILWAY_TOKEN'],
        description: 'Railway Personal Access Token',
        instructions: 'Get your token from https://railway.app/account/tokens'
      },
      render: {
        provider: 'render',
        requiredFields: ['RENDER_API_KEY'],
        description: 'Render API Key',
        instructions: 'Get your API key from https://dashboard.render.com/account/api-keys'
      }
    };

    return configs[provider] || null;
  }

  /**
   * Interactive credential prompt using inquirer
   * 
   * @private
   * @param {CredentialPromptConfig} config - Prompt configuration
   * @returns {Promise<IResult<UserCredentialInput>>} User input result
   */
  private async interactivePrompt(config: CredentialPromptConfig): Promise<IResult<UserCredentialInput>> {
    try {
      // Import inquirer dynamically - it should be available since we checked earlier
      const inquirer = require('inquirer');
      
      const questions = [
        {
          type: 'confirm',
          name: 'proceed',
          message: `Configure ${config.provider.toUpperCase()} credentials?`,
          default: true
        }
      ];

      // Add credential fields
      config.requiredFields.forEach(field => {
        questions.push({
          type: 'password',
          name: field,
          message: `Enter ${field}:`
        } as any);
      });

      // Add optional fields
      config.optionalFields?.forEach(field => {
        questions.push({
          type: 'input',
          name: field,
          message: `Enter ${field} (optional):`,
          default: ''
        } as any);
      });

      // Add save option
      questions.push({
        type: 'confirm',
        name: 'saveToEnv',
        message: 'Save credentials to .env file?',
        default: true
      });

      const answers = await inquirer.prompt(questions);

      if (!answers.proceed) {
        return Result.failure(new Error('User cancelled credential configuration'));
      }

      const credentials: Record<string, string> = {};
      
      // Collect required credentials
      config.requiredFields.forEach(field => {
        credentials[field] = answers[field];
      });

      // Collect optional credentials
      config.optionalFields?.forEach(field => {
        if (answers[field] && answers[field].trim()) {
          credentials[field] = answers[field];
        }
      });

      const result: UserCredentialInput = {
        provider: config.provider,
        credentials,
        saveToEnv: answers.saveToEnv
      };

      // Save to .env if requested
      if (answers.saveToEnv) {
        await this.saveToEnvFile(credentials);
      }

      return Result.success(result);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Non-interactive credential prompt (for web applications)
   * 
   * @private
   * @param {CredentialPromptConfig} config - Prompt configuration
   * @returns {Promise<IResult<UserCredentialInput>>} User input result
   */
  private async nonInteractivePrompt(config: CredentialPromptConfig): Promise<IResult<UserCredentialInput>> {
    // For non-interactive mode (web apps), we return the credential structure
    // The web application should collect credentials through its UI
    const credentials: Record<string, string> = {};
    
    // Initialize with empty values - web app will fill these
    config.requiredFields.forEach(field => {
      credentials[field] = '';
    });

    config.optionalFields?.forEach(field => {
      credentials[field] = '';
    });

    const result: UserCredentialInput = {
      provider: config.provider,
      credentials,
      saveToEnv: false // Web apps don't save to .env
    };

    this.logger.info(`Non-interactive credential prompt for ${config.provider}`, {
      requiredFields: config.requiredFields,
      optionalFields: config.optionalFields,
      description: config.description,
      instructions: config.instructions
    });

    return Result.success(result);
  }

  /**
   * Saves credentials to .env file
   * 
   * @private
   * @param {Record<string, string>} credentials - Credentials to save
   * @returns {Promise<void>} Promise that resolves when saved
   */
  private async saveToEnvFile(credentials: Record<string, string>): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';

      // Read existing .env file if it exists
      try {
        envContent = await fs.readFile(envPath, 'utf-8');
      } catch (error) {
        // .env file doesn't exist, create new one
        envContent = '# AIOS Environment Variables\n';
      }

      // Add or update credentials
      Object.entries(credentials).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${value}`;
        
        if (regex.test(envContent)) {
          // Update existing entry
          envContent = envContent.replace(regex, newLine);
        } else {
          // Add new entry
          envContent += `\n${newLine}`;
        }
      });

      await fs.writeFile(envPath, envContent);
      this.logger.info('Credentials saved to .env file');
    } catch (error) {
      this.logger.warn('Failed to save credentials to .env file', { error: (error as Error).message });
    }
  }

  /**
   * Validates collected credentials
   * 
   * @param {UserCredentialInput} input - User credential input
   * @returns {CredentialPromptResult} Validation result
   * 
   * @example
   * ```typescript
   * const result = credentialPrompt.validateCredentials(userInput);
   * if (result.success) {
   *   console.log('Credentials are valid');
   * }
   * ```
   */
  validateCredentials(input: UserCredentialInput): CredentialPromptResult {
    try {
      const config = this.getPromptConfig(input.provider);
      if (!config) {
        return {
          success: false,
          error: `Unsupported provider: ${input.provider}`
        };
      }

      // Validate required fields
      const missingFields: string[] = [];
      config.requiredFields.forEach(field => {
        if (!input.credentials[field] || input.credentials[field].trim().length === 0) {
          missingFields.push(field);
        }
      });

      if (missingFields.length > 0) {
        return {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        };
      }

      // Basic format validation
      const validationErrors: string[] = [];
      Object.entries(input.credentials).forEach(([key, value]) => {
        if (value && value.trim().length > 0) {
          // Basic length validation
          if (value.length < 10) {
            validationErrors.push(`${key} appears to be too short`);
          }
        }
      });

      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Validation errors: ${validationErrors.join(', ')}`
        };
      }

      return {
        success: true,
        credentials: input.credentials
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Gets available cloud providers
   * 
   * @returns {string[]} List of supported cloud providers
   */
  getAvailableProviders(): string[] {
    return Object.keys(CLOUD_CREDENTIAL_MAP);
  }

  /**
   * Gets credential requirements for a provider
   * 
   * @param {string} provider - Provider name
   * @returns {CredentialPromptConfig | null} Provider configuration
   */
  getProviderRequirements(provider: string): CredentialPromptConfig | null {
    return this.getPromptConfig(provider);
  }

  /**
   * Gets credential requirements for web applications
   * Returns the structure needed to build credential forms in web UIs
   * 
   * @param {string} provider - Provider name
   * @returns {Promise<IResult<CredentialPromptConfig>>} Provider configuration for web UI
   * 
   * @example
   * ```typescript
   * // Web application usage
   * const result = await credentialPrompt.getWebCredentialRequirements('vercel');
   * if (result.isSuccess) {
   *   const config = result.value;
   *   // Build form with config.requiredFields and config.optionalFields
   *   // Show config.description and config.instructions to user
   * }
   * ```
   */
  async getWebCredentialRequirements(provider: string): Promise<IResult<CredentialPromptConfig>> {
    try {
      const config = this.getPromptConfig(provider);
      if (!config) {
        return Result.failure(new Error(`Unsupported cloud provider: ${provider}`));
      }

      return Result.success(config);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Validates credentials provided by web applications
   * 
   * @param {string} provider - Provider name
   * @param {Record<string, string>} credentials - Credentials from web form
   * @returns {CredentialPromptResult} Validation result
   * 
   * @example
   * ```typescript
   * // Web application usage
   * const result = credentialPrompt.validateWebCredentials('vercel', {
   *   VERCEL_TOKEN: 'user-provided-token'
   * });
   * if (result.success) {
   *   // Credentials are valid, proceed with deployment
   * }
   * ```
   */
  validateWebCredentials(provider: string, credentials: Record<string, string>): CredentialPromptResult {
    const userInput: UserCredentialInput = {
      provider,
      credentials,
      saveToEnv: false
    };

    return this.validateCredentials(userInput);
  }
}
