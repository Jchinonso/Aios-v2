/**
 * @fileoverview State Manager - Persist deployment state and audit trail
 * @description
 * LEGACY WRAPPER - Maintains backward compatibility with existing code.
 * For new code, use EnhancedStateManager from './state-manager.enhanced.js'
 *
 * This wrapper delegates to EnhancedStateManager while maintaining the old API.
 * No breaking changes for existing callers.
 *
 * @module node-cli/state/state-manager
 * @deprecated Use EnhancedStateManager for new code
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';
import type { ParsedIntentType } from '../nl-planner/types.js';
import {
  EnhancedStateManager,
  generateDeploymentId,
  type EnhancedDeploymentRecord,
  type DeploymentId
} from './state-manager.enhanced.js';

/**
 * Deployment record
 */
export interface DeploymentRecordType {
  readonly id: string;
  readonly timestamp: Date;
  readonly service: string;
  readonly environment: string;
  readonly provider: string | undefined;
  readonly command: string;
  readonly intent: ParsedIntentType;
  readonly status: 'pending' | 'success' | 'failed' | 'rolled-back';
  readonly duration: number | undefined;
  readonly error: string | undefined;
}

/**
 * Session record
 */
export interface SessionRecordType {
  readonly id: string;
  readonly started: Date;
  readonly ended?: Date;
  readonly commandsExecuted: number;
  readonly intentsUsed: string[];
}

/**
 * State Manager - Manages .aios/ directory structure
 * @deprecated Use EnhancedStateManager for new code
 */
export class StateManager {
  private readonly enhanced: EnhancedStateManager;
  private readonly projectRoot: string;
  private readonly stateDir: string;
  private readonly evidenceDir: string;
  private readonly historyFile: string;
  private readonly sessionFile: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.stateDir = resolve(this.projectRoot, '.aios');
    this.enhanced = new EnhancedStateManager({ projectRoot });
    this.evidenceDir = resolve(this.stateDir, 'evidence');
    this.historyFile = resolve(this.stateDir, 'history.jsonl');
    this.sessionFile = resolve(this.stateDir, 'session.json');
  }

  /**
   * Initialize .aios/ directory structure
   * @deprecated Delegates to EnhancedStateManager
   */
  async initialize(): Promise<void> {
    const result = await this.enhanced.initialize();
    if (!result.success) {
      console.error('Failed to initialize .aios directory:', result.error);
      throw result.error;
    }
  }

  /**
   * Record a deployment
   * @deprecated Delegates to EnhancedStateManager
   */
  async recordDeployment(record: DeploymentRecordType): Promise<void> {
    try {
      // Convert legacy record to enhanced format
      // Use conditional spread to satisfy exactOptionalPropertyTypes
      const enhancedRecord: EnhancedDeploymentRecord = {
        id: record.id as DeploymentId,
        timestamp: record.timestamp,
        service: record.service,
        environment: record.environment as 'development' | 'staging' | 'production' | 'preview',
        provider: record.provider as any,
        command: record.command,
        intent: record.intent,
        status: record.status,
        ...(record.duration !== undefined && { duration: record.duration }),
        ...(record.error !== undefined && { error: record.error })
      };

      const result = await this.enhanced.recordDeployment(enhancedRecord);
      if (!result.success) {
        console.error('Failed to record deployment:', result.error);
        // Don't throw - logging failure shouldn't break deployment
      }
    } catch (error) {
      console.error('Failed to record deployment:', error);
      // Don't throw - logging failure shouldn't break deployment
    }
  }

  /**
   * Save evidence file for a deployment
   */
  private async saveEvidence(record: DeploymentRecordType): Promise<void> {
    const timestamp = record.timestamp.toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}_${record.service}_${record.environment}.json`;
    const filepath = resolve(this.evidenceDir, filename);

    const evidence = {
      id: record.id,
      timestamp: record.timestamp.toISOString(),
      service: record.service,
      environment: record.environment,
      provider: record.provider,
      command: record.command,
      intent: record.intent,
      status: record.status,
      duration: record.duration,
      error: record.error,
      metadata: {
        user: process.env['USER'] || process.env['USERNAME'] || 'unknown',
        hostname: process.env['HOSTNAME'] || 'unknown',
        cwd: process.cwd()
      }
    };

    await fs.writeFile(filepath, JSON.stringify(evidence, null, 2), 'utf-8');
  }

  /**
   * Get deployment history
   * @deprecated Delegates to EnhancedStateManager
   */
  async getHistory(limit = 50): Promise<DeploymentRecordType[]> {
    const result = await this.enhanced.getHistory({ limit });

    if (!result.success) {
      console.error('Failed to get history:', result.error);
      return [];
    }

    // Convert enhanced records back to legacy format
    return result.data.map(record => ({
      id: record.id,
      timestamp: record.timestamp,
      service: record.service,
      environment: record.environment,
      provider: record.provider,
      command: record.command,
      intent: record.intent,
      status: record.status,
      duration: record.duration,
      error: record.error
    }));
  }

  /**
   * Get deployments for a specific service
   * @deprecated Delegates to EnhancedStateManager
   */
  async getServiceHistory(service: string, limit = 20): Promise<DeploymentRecordType[]> {
    const result = await this.enhanced.getHistory({ service, limit });
    if (!result.success) return [];

    return result.data.map(record => ({
      id: record.id,
      timestamp: record.timestamp,
      service: record.service,
      environment: record.environment,
      provider: record.provider,
      command: record.command,
      intent: record.intent,
      status: record.status,
      duration: record.duration,
      error: record.error
    }));
  }

  /**
   * Get last deployment for a service in an environment
   * @deprecated Delegates to EnhancedStateManager
   */
  async getLastDeployment(service: string, environment: string): Promise<DeploymentRecordType | null> {
    const result = await this.enhanced.getLastDeployment(service, environment);
    if (!result.success || !result.data) return null;

    const record = result.data;
    return {
      id: record.id,
      timestamp: record.timestamp,
      service: record.service,
      environment: record.environment,
      provider: record.provider,
      command: record.command,
      intent: record.intent,
      status: record.status,
      duration: record.duration,
      error: record.error
    };
  }

  /**
   * Start a session
   */
  async startSession(id: string): Promise<void> {
    const session: SessionRecordType = {
      id,
      started: new Date(),
      commandsExecuted: 0,
      intentsUsed: []
    };

    await this.initialize();
    await fs.writeFile(this.sessionFile, JSON.stringify(session, null, 2), 'utf-8');
  }

  /**
   * Update session
   */
  async updateSession(commandsExecuted: number, intentsUsed: string[]): Promise<void> {
    try {
      const content = await fs.readFile(this.sessionFile, 'utf-8');
      const session = JSON.parse(content) as SessionRecordType;

      const updated = {
        ...session,
        commandsExecuted,
        intentsUsed
      };

      await fs.writeFile(this.sessionFile, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (error) {
      // Ignore errors - session tracking is nice-to-have
    }
  }

  /**
   * End session
   */
  async endSession(): Promise<void> {
    try {
      const content = await fs.readFile(this.sessionFile, 'utf-8');
      const session = JSON.parse(content) as SessionRecordType;

      const updated = {
        ...session,
        ended: new Date()
      };

      await fs.writeFile(this.sessionFile, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Clean up old evidence files (keep last N days)
   */
  async cleanupOldEvidence(daysToKeep = 30): Promise<number> {
    try {
      const files = await fs.readdir(this.evidenceDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedCount = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filepath = resolve(this.evidenceDir, file);
        const stats = await fs.stat(filepath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old evidence:', error);
      return 0;
    }
  }

  /**
   * Get state directory path
   */
  getStateDir(): string {
    return this.stateDir;
  }

  /**
   * Check if state is initialized
   * @deprecated Delegates to EnhancedStateManager
   */
  async isInitialized(): Promise<boolean> {
    const result = await this.enhanced.isInitialized();
    return result.success ? result.data : false;
  }

  /**
   * Get config file path
   */
  getConfigPath(): string {
    return resolve(this.stateDir, 'config.json');
  }

  /**
   * Save configuration from first-run setup
   */
  async saveConfig(config: Record<string, unknown>): Promise<void> {
    await this.initialize();
    const configPath = this.getConfigPath();
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Load configuration
   */
  async loadConfig(): Promise<Record<string, unknown> | null> {
    try {
      const configPath = this.getConfigPath();
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

/**
 * Generate unique ID for records
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
