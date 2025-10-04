import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Result } from '../core/types/result.js';
import { AI_PROVIDERS, AI_MODELS } from '../constants/ai.constants.js';
import { CLOUD_PROVIDERS } from '../constants/cloud.constants.js';

/**
 * Configuration file structure
 */
export interface ConfigFile {
  ai: {
    defaultProvider: string;
    providers: Record<string, any>;
  };
  cloud: {
    defaultProvider: string;
    providers: Record<string, any>;
  };
  settings: {
    verbose: boolean;
    autoSave: boolean;
    theme: string;
  };
}

export class ConfigManager {
  private configPath: string;
  private config: ConfigFile | null = null;

  constructor(configPath?: string) {
    this.configPath = configPath ?? this.getDefaultConfigPath();
  }

  private getDefaultConfigPath(): string {
    const homeDir = os.homedir();
    const configDir = path.join(homeDir, '.aios');
    return path.join(configDir, 'config.json');
  }

  private getDefaultConfig(): ConfigFile {
    return {
      ai: {
        defaultProvider: AI_PROVIDERS.OPENAI,
        providers: {
          [AI_PROVIDERS.OPENAI]: {
            provider: AI_PROVIDERS.OPENAI,
            model: AI_MODELS[AI_PROVIDERS.OPENAI].GPT_4,
            maxTokens: 4096,
            temperature: 0.7
          },
          [AI_PROVIDERS.ANTHROPIC]: {
            provider: AI_PROVIDERS.ANTHROPIC,
            model: AI_MODELS[AI_PROVIDERS.ANTHROPIC].CLAUDE_3_SONNET,
            maxTokens: 4096,
            temperature: 0.7
          }
        }
      },
      cloud: {
        defaultProvider: CLOUD_PROVIDERS.VERCEL,
        providers: {}
      },
      settings: {
        verbose: false,
        autoSave: true,
        theme: 'dark'
      }
    };
  }

  public async loadConfig(): Promise<Result<ConfigFile>> {
    try {
      // Check if config file exists
      try {
        await fs.access(this.configPath);
      } catch (error) {
        // Config file doesn't exist, create default
        const defaultConfig = this.getDefaultConfig();
        const createResult = await this.createConfig(defaultConfig);
        if (createResult.isFailure) {
          return Result.failure(createResult.error);
        }
        this.config = defaultConfig;
        return Result.success(defaultConfig);
      }

      // Read existing config
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configContent) as ConfigFile;

      // Merge with defaults to ensure all required fields exist
      const mergedConfig = this.mergeWithDefaults(parsedConfig);
      this.config = mergedConfig;

      return Result.success(mergedConfig);
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Unknown error occurred');
      return Result.failure(new Error(`Failed to load configuration: ${errorInstance.message}`));
    }
  }

  public async saveConfig(config?: ConfigFile): Promise<Result<void>> {
    try {
      const configToSave = config ?? this.config;
      if (!configToSave) {
        return Result.failure(new Error('No configuration to save'));
      }

      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Write config file
      const configContent = JSON.stringify(configToSave, null, 2);
      await fs.writeFile(this.configPath, configContent, 'utf-8');

      this.config = configToSave;
      return Result.success(undefined);
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Unknown error occurred');
      return Result.failure(new Error(`Failed to save configuration: ${errorInstance.message}`));
    }
  }

  private async createConfig(config: ConfigFile): Promise<Result<void>> {
    try {
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      const configContent = JSON.stringify(config, null, 2);
      await fs.writeFile(this.configPath, configContent, 'utf-8');

      return Result.success(undefined);
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Unknown error occurred');
      return Result.failure(new Error(`Failed to create configuration: ${errorInstance.message}`));
    }
  }

  private mergeWithDefaults(config: Partial<ConfigFile>): ConfigFile {
    const defaults = this.getDefaultConfig();

    return {
      ai: {
        defaultProvider: config.ai?.defaultProvider ?? defaults.ai.defaultProvider,
        providers: { ...defaults.ai.providers, ...config.ai?.providers }
      },
      cloud: {
        defaultProvider: config.cloud?.defaultProvider ?? defaults.cloud.defaultProvider,
        providers: { ...defaults.cloud.providers, ...config.cloud?.providers }
      },
      settings: {
        verbose: config.settings?.verbose ?? defaults.settings.verbose,
        autoSave: config.settings?.autoSave ?? defaults.settings.autoSave,
        theme: config.settings?.theme ?? defaults.settings.theme
      }
    };
  }

  public getConfig(): ConfigFile | null {
    return this.config;
  }

  public updateAIProvider(providerName: string, config: any): Result<void> {
    if (!this.config) {
      return Result.failure(new Error('Configuration not loaded'));
    }

    // Create a new config object since properties are readonly
    this.config = {
      ...this.config,
      ai: {
        ...this.config.ai,
        providers: {
          ...this.config.ai.providers,
          [providerName]: {
            ...this.config.ai.providers[providerName],
            ...config
          }
        }
      }
    };

    return Result.success(undefined);
  }

  public updateCloudProvider(providerName: string, config: any): Result<void> {
    if (!this.config) {
      return Result.failure(new Error('Configuration not loaded'));
    }

    // Create a new config object since properties are readonly
    this.config = {
      ...this.config,
      cloud: {
        ...this.config.cloud,
        providers: {
          ...this.config.cloud.providers,
          [providerName]: {
            ...this.config.cloud.providers[providerName],
            ...config
          }
        }
      }
    };

    return Result.success(undefined);
  }

  public setDefaultAIProvider(providerName: string): Result<void> {
    if (!this.config) {
      return Result.failure(new Error('Configuration not loaded'));
    }

    if (!this.config.ai.providers[providerName]) {
      return Result.failure(new Error(`AI provider '${providerName}' not configured`));
    }

    // Create a new config object since properties are readonly
    this.config = {
      ...this.config,
      ai: {
        ...this.config.ai,
        defaultProvider: providerName
      }
    };
    return Result.success(undefined);
  }

  public setDefaultCloudProvider(providerName: string): Result<void> {
    if (!this.config) {
      return Result.failure(new Error('Configuration not loaded'));
    }

    // Create a new config object since properties are readonly
    this.config = {
      ...this.config,
      cloud: {
        ...this.config.cloud,
        defaultProvider: providerName
      }
    };
    return Result.success(undefined);
  }

  public updateSettings(settings: Partial<ConfigFile['settings']>): Result<void> {
    if (!this.config) {
      return Result.failure(new Error('Configuration not loaded'));
    }

    // Create a new config object since properties are readonly
    this.config = {
      ...this.config,
      settings: {
        ...this.config.settings,
        ...settings
      }
    };

    return Result.success(undefined);
  }

  public getAIProviderConfig(providerName: string): any | null {
    return this.config?.ai.providers[providerName] ?? null;
  }

  public getCloudProviderConfig(providerName: string): any | null {
    return this.config?.cloud.providers[providerName] ?? null;
  }

  public listAIProviders(): string[] {
    return this.config ? Object.keys(this.config.ai.providers) : [];
  }

  public listCloudProviders(): string[] {
    return this.config ? Object.keys(this.config.cloud.providers) : [];
  }

  public async resetConfig(): Promise<Result<void>> {
    try {
      const defaultConfig = this.getDefaultConfig();
      return await this.saveConfig(defaultConfig);
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Unknown error occurred');
      return Result.failure(new Error(`Failed to reset configuration: ${errorInstance.message}`));
    }
  }

  public async deleteConfig(): Promise<Result<void>> {
    try {
      await fs.unlink(this.configPath);
      this.config = null;
      return Result.success(undefined);
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Unknown error occurred');
      return Result.failure(new Error(`Failed to delete configuration: ${errorInstance.message}`));
    }
  }

  public getConfigPath(): string {
    return this.configPath;
  }
}