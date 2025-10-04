/**
 * @fileoverview Project State Manager
 * @description Manages AIOS project state, configuration, and deployment history
 * Uses existing UnifiedAnalyzer for project detection
 * @module core/state
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { ILogger } from '../logging/logger.interface.js';
import type {
  AiosConfigType,
  ConnectionConfigType,
  StateDetectionResultType,
  DeploymentRecordType
} from '../../types/state.types.js';
import type { CloudProviderType } from '../../cloud/types/index.js';

/**
 * AIOS directory and file constants
 */
export const AIOS_DIR = '.aios';
export const CONFIG_FILE = 'config.json';
export const CONNECTION_FILE = 'connection.json';
export const HISTORY_FILE = 'history.json';
export const CONFIG_VERSION = '2.0.0';

/**
 * Project State Manager
 *
 * Manages project state persistence in .aios/ directory
 * Integrates with existing UnifiedAnalyzer for project analysis
 */
export class ProjectStateManager {
  private readonly projectPath: string;
  private readonly aiosPath: string;
  private readonly logger: ILogger;

  constructor(projectPath: string, logger: ILogger) {
    this.projectPath = path.resolve(projectPath);
    this.aiosPath = path.join(this.projectPath, AIOS_DIR);
    this.logger = logger;
  }

  /**
   * Detect current project state
   */
  async detectState(): Promise<StateDetectionResultType> {
    try {
      const hasAiosConfig = await this.hasConfig();
      const hasConnection = await this.hasConnection();

      if (!hasAiosConfig) {
        return {
          hasAiosConfig: false,
          hasDeployment: false,
          hasConnection: false,
          needsSetup: true
        };
      }

      const config = await this.loadConfig();
      const hasDeployment = Boolean(config.deployment?.status === 'active');

      const result: StateDetectionResultType = {
        hasAiosConfig: true,
        hasDeployment,
        hasConnection,
        configPath: path.join(this.aiosPath, CONFIG_FILE),
        needsSetup: false
      };

      if (config.deployment?.provider) {
        return { ...result, provider: config.deployment.provider };
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to detect project state', error as Error);
      return {
        hasAiosConfig: false,
        hasDeployment: false,
        hasConnection: false,
        needsSetup: true
      };
    }
  }

  /**
   * Initialize .aios directory structure
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.aiosPath, { recursive: true });

      // Create .gitignore
      const gitignorePath = path.join(this.aiosPath, '.gitignore');
      await fs.writeFile(gitignorePath, '# Exclude all files in .aios/ from git\n*\n!.gitignore\n', 'utf-8');

      this.logger.info('Initialized .aios directory', { path: this.aiosPath });
    } catch (error) {
      this.logger.error('Failed to initialize .aios directory', error as Error);
      throw error;
    }
  }

  /**
   * Check if config exists
   */
  async hasConfig(): Promise<boolean> {
    try {
      const configPath = path.join(this.aiosPath, CONFIG_FILE);
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if connection exists
   */
  async hasConnection(): Promise<boolean> {
    try {
      const connectionPath = path.join(this.aiosPath, CONNECTION_FILE);
      await fs.access(connectionPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load configuration
   */
  async loadConfig(): Promise<AiosConfigType> {
    try {
      const configPath = path.join(this.aiosPath, CONFIG_FILE);
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content) as AiosConfigType;
    } catch (error) {
      this.logger.error('Failed to load config', error as Error);
      throw new Error('Config file not found or invalid');
    }
  }

  /**
   * Save configuration
   */
  async saveConfig(config: AiosConfigType): Promise<void> {
    try {
      const configPath = path.join(this.aiosPath, CONFIG_FILE);
      await fs.writeFile(
        configPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );
      this.logger.info('Saved config', { path: configPath });
    } catch (error) {
      this.logger.error('Failed to save config', error as Error);
      throw error;
    }
  }

  /**
   * Create initial configuration
   */
  async createConfig(options: {
    projectName: string;
    framework?: string;
    language?: string;
    packageManager?: string;
  }): Promise<AiosConfigType> {
    const config: AiosConfigType = {
      version: CONFIG_VERSION,
      projectId: `proj_${randomUUID()}`,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      project: {
        name: options.projectName,
        path: this.projectPath,
        ...(options.framework !== undefined && { framework: options.framework }),
        ...(options.language !== undefined && { language: options.language }),
        ...(options.packageManager !== undefined && { packageManager: options.packageManager })
      },
      history: {
        totalDeployments: 0
      },
      preferences: {
        confirmDeployments: true,
        verboseLogging: false,
        defaultEnvironment: 'staging'
      }
    };

    await this.saveConfig(config);
    return config;
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<AiosConfigType>): Promise<AiosConfigType> {
    const config = await this.loadConfig();
    const updated: AiosConfigType = {
      ...config,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    await this.saveConfig(updated);
    return updated;
  }

  /**
   * Load connection configuration
   */
  async loadConnection(): Promise<ConnectionConfigType> {
    try {
      const connectionPath = path.join(this.aiosPath, CONNECTION_FILE);
      const content = await fs.readFile(connectionPath, 'utf-8');
      return JSON.parse(content) as ConnectionConfigType;
    } catch (error) {
      this.logger.error('Failed to load connection', error as Error);
      throw new Error('Connection file not found or invalid');
    }
  }

  /**
   * Save connection configuration
   */
  async saveConnection(connection: ConnectionConfigType): Promise<void> {
    try {
      const connectionPath = path.join(this.aiosPath, CONNECTION_FILE);
      await fs.writeFile(
        connectionPath,
        JSON.stringify(connection, null, 2),
        'utf-8'
      );
      this.logger.info('Saved connection', { provider: connection.provider });
    } catch (error) {
      this.logger.error('Failed to save connection', error as Error);
      throw error;
    }
  }

  /**
   * Add deployment record to history
   */
  async addDeploymentRecord(record: DeploymentRecordType): Promise<void> {
    try {
      const config = await this.loadConfig();
      const updatedConfig: AiosConfigType = {
        ...config,
        history: {
          totalDeployments: (config.history?.totalDeployments || 0) + 1,
          lastDeployment: record
        },
        lastUpdated: new Date().toISOString()
      };
      await this.saveConfig(updatedConfig);
      this.logger.info('Added deployment record', { id: record.id });
    } catch (error) {
      this.logger.error('Failed to add deployment record', error as Error);
      throw error;
    }
  }

  /**
   * Update deployment status
   */
  async updateDeploymentStatus(
    provider: CloudProviderType,
    status: 'active' | 'inactive' | 'archived',
    metadata?: {
      providerId?: string;
      productionUrl?: string;
      region?: string;
    }
  ): Promise<void> {
    try {
      const config = await this.loadConfig();
      const updatedConfig: AiosConfigType = {
        ...config,
        deployment: {
          provider,
          status,
          firstDeployedAt: config.deployment?.firstDeployedAt || new Date().toISOString(),
          ...metadata
        },
        lastUpdated: new Date().toISOString()
      };
      await this.saveConfig(updatedConfig);
    } catch (error) {
      this.logger.error('Failed to update deployment status', error as Error);
      throw error;
    }
  }

  /**
   * Get deployment history
   */
  async getDeploymentHistory(): Promise<DeploymentRecordType[]> {
    try {
      const historyPath = path.join(this.aiosPath, HISTORY_FILE);
      const content = await fs.readFile(historyPath, 'utf-8');
      const history = JSON.parse(content) as { deployments: DeploymentRecordType[] };
      return history.deployments || [];
    } catch {
      return [];
    }
  }

  /**
   * Clear all state (for testing/reset)
   */
  async clear(): Promise<void> {
    try {
      await fs.rm(this.aiosPath, { recursive: true, force: true });
      this.logger.info('Cleared .aios directory');
    } catch (error) {
      this.logger.error('Failed to clear .aios directory', error as Error);
      throw error;
    }
  }
}