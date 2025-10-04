/**
 * @fileoverview Connection Pool Manager for AI Providers
 * 
 * This module provides connection pooling and client management to optimize
 * performance and reduce connection overhead across all AI providers.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { AIProviderConfig } from '../types/ai.types.js';

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  maxConnections: number;
  idleTimeout: number;
  maxIdleTime: number;
  healthCheckInterval: number;
}

/**
 * Connection pool entry
 */
interface PoolEntry<T> {
  client: T;
  lastUsed: Date;
  isHealthy: boolean;
  config: AIProviderConfig;
}

/**
 * Generic connection pool for AI providers
 */
export class AIConnectionPool<T> {
  private pool: Map<string, PoolEntry<T>> = new Map();
  private config: ConnectionPoolConfig;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    config: ConnectionPoolConfig = {
      maxConnections: 10,
      idleTimeout: 300000, // 5 minutes
      maxIdleTime: 600000, // 10 minutes
      healthCheckInterval: 60000 // 1 minute
    }
  ) {
    this.config = config;
    this.startHealthCheck();
  }

  /**
   * Get or create a client from the pool
   */
  async getClient(
    key: string, 
    factory: (config: AIProviderConfig) => Promise<T>,
    config: AIProviderConfig
  ): Promise<T> {
    const entry = this.pool.get(key);
    
    if (entry && entry.isHealthy) {
      entry.lastUsed = new Date();
      return entry.client;
    }

    // Remove unhealthy or expired entries
    if (entry) {
      this.pool.delete(key);
    }

    // Check pool size limit
    if (this.pool.size >= this.config.maxConnections) {
      this.cleanupOldest();
    }

    // Create new client
    const client = await factory(config);
    this.pool.set(key, {
      client,
      lastUsed: new Date(),
      isHealthy: true,
      config
    });

    return client;
  }

  /**
   * Mark a client as unhealthy
   */
  markUnhealthy(key: string): void {
    const entry = this.pool.get(key);
    if (entry) {
      entry.isHealthy = false;
    }
  }

  /**
   * Remove a client from the pool
   */
  removeClient(key: string): void {
    this.pool.delete(key);
  }

  /**
   * Clean up the oldest connection
   */
  private cleanupOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = new Date();

    for (const [key, entry] of Array.from(this.pool.entries())) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.pool.delete(oldestKey);
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all connections
   */
  private async performHealthCheck(): Promise<void> {
    const now = new Date();
    const keysToRemove: string[] = [];

    for (const [key, entry] of Array.from(this.pool.entries())) {
      const timeSinceLastUse = now.getTime() - entry.lastUsed.getTime();
      
      // Remove connections that haven't been used for too long
      if (timeSinceLastUse > this.config.maxIdleTime) {
        keysToRemove.push(key);
        continue;
      }

      // Mark as unhealthy if idle for too long
      if (timeSinceLastUse > this.config.idleTimeout) {
        entry.isHealthy = false;
      }
    }

    // Remove expired connections
    keysToRemove.forEach(key => this.pool.delete(key));
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalConnections: number;
    healthyConnections: number;
    unhealthyConnections: number;
  } {
    let healthy = 0;
    let unhealthy = 0;

    for (const entry of Array.from(this.pool.values())) {
      if (entry.isHealthy) {
        healthy++;
      } else {
        unhealthy++;
      }
    }

    return {
      totalConnections: this.pool.size,
      healthyConnections: healthy,
      unhealthyConnections: unhealthy
    };
  }

  /**
   * Clear all connections
   */
  clear(): void {
    this.pool.clear();
  }

  /**
   * Stop health checking and cleanup
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.pool.clear();
  }
}

/**
 * Global connection pool manager for AI providers
 */
export class AIConnectionPoolManager {
  private static instance: AIConnectionPoolManager;
  private pools: Map<string, AIConnectionPool<any>> = new Map();

  private constructor() {}

  static getInstance(): AIConnectionPoolManager {
    if (!AIConnectionPoolManager.instance) {
      AIConnectionPoolManager.instance = new AIConnectionPoolManager();
    }
    return AIConnectionPoolManager.instance;
  }

  /**
   * Get or create a connection pool for a provider
   */
  getPool<T>(providerName: string, config?: ConnectionPoolConfig): AIConnectionPool<T> {
    if (!this.pools.has(providerName)) {
      this.pools.set(providerName, new AIConnectionPool<T>(config));
    }
    return this.pools.get(providerName)!;
  }

  /**
   * Get all pool statistics
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [name, pool] of Array.from(this.pools.entries())) {
      stats[name] = pool.getStats();
    }
    return stats;
  }

  /**
   * Clear all pools
   */
  clearAll(): void {
    for (const pool of Array.from(this.pools.values())) {
      pool.clear();
    }
  }

  /**
   * Destroy all pools
   */
  destroyAll(): void {
    for (const pool of Array.from(this.pools.values())) {
      pool.destroy();
    }
    this.pools.clear();
  }
}

/**
 * Helper function to create a connection key for AI providers
 */
export function createAIProviderConnectionKey(config: AIProviderConfig): string {
  return `${config.apiKey.slice(0, 8)}-${config.model}-${config.baseUrl || 'default'}`;
}
