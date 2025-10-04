/**
 * @fileoverview AI Service Performance Optimization - Production-Grade Performance
 * 
 * This module provides performance optimizations for the AI service,
 * including caching, connection pooling, and memory management.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { ILogger } from '../../../core/logging/logger.interface.js';
import type { IMetricsCollector } from '../../../core/metrics/metrics.interface.js';
// import { AIMessage } from '../../../types/ai.types.js';

/**
 * Response cache entry with TTL and metadata
 */
interface CacheEntry<T> {
  readonly value: T;
  readonly timestamp: number;
  readonly ttl: number;
  readonly hits: number;
  readonly metadata: Record<string, any>;
}

/**
 * High-performance LRU cache with TTL support
 * 
 * @template T - Type of cached values
 */
export class AIServiceCache<T = any> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly accessOrder = new Map<string, number>();
  private accessCounter = 0;

  constructor(
    private readonly maxSize: number = 1000,
    private readonly defaultTTL: number = 300000, // 5 minutes
    // @ts-expect-error - Reserved for future logging/monitoring
    private readonly _logger: ILogger,
    private readonly metrics: IMetricsCollector
  ) {}

  /**
   * Get value from cache with LRU eviction
   * 
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.increment('ai.cache.miss', { key });
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.metrics.increment('ai.cache.expired', { key });
      return undefined;
    }

    // Update access order
    this.accessOrder.set(key, ++this.accessCounter);
    this.metrics.increment('ai.cache.hit', { key });
    
    return entry.value;
  }

  /**
   * Set value in cache with TTL
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds
   * @param metadata - Optional metadata
   */
  set(key: string, value: T, ttl: number = this.defaultTTL, metadata: Record<string, any> = {}): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      metadata
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    
    this.metrics.increment('ai.cache.set', { key });
  }

  /**
   * Check if key exists and is not expired
   * 
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete key from cache
   * 
   * @param key - Cache key
   * @returns True if key was deleted
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    
    if (deleted) {
      this.metrics.increment('ai.cache.delete', { key });
    }
    
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.metrics.increment('ai.cache.clear');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; hits: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      hits: entry.hits
    }));

    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const hitRate = this.cache.size > 0 ? totalHits / this.cache.size : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      entries
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.cache.size === 0) return;

    let oldestKey = '';
    let oldestAccess = Number.MAX_SAFE_INTEGER;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.metrics.increment('ai.cache.evict', { key: oldestKey });
    }
  }
}

/**
 * Message deduplication service
 */
export class MessageDeduplicator {
  private readonly seenMessages = new Set<string>();
  private readonly messageHashes = new Map<string, string>();

  constructor(
    // @ts-expect-error - Reserved for future logging/monitoring
    private readonly _logger: ILogger,
    private readonly metrics: IMetricsCollector
  ) {}

  /**
   * Check if message is duplicate
   * 
   * @param content - Message content
   * @param context - Optional context for deduplication
   * @returns True if message is duplicate
   */
  isDuplicate(content: string, context?: string): boolean {
    const hash = this.createHash(content, context);
    const isDuplicate = this.seenMessages.has(hash);
    
    if (isDuplicate) {
      this.metrics.increment('ai.deduplication.duplicate', { hash });
    } else {
      this.seenMessages.add(hash);
      this.metrics.increment('ai.deduplication.unique', { hash });
    }
    
    return isDuplicate;
  }

  /**
   * Create hash for message deduplication
   * 
   * @param content - Message content
   * @param context - Optional context
   * @returns Hash string
   */
  private createHash(content: string, context?: string): string {
    const normalized = content.toLowerCase().trim();
    const contextStr = context ? context.toLowerCase().trim() : '';
    const combined = `${normalized}:${contextStr}`;
    
    // Simple hash function for performance
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Clear deduplication cache
   */
  clear(): void {
    this.seenMessages.clear();
    this.messageHashes.clear();
    this.metrics.increment('ai.deduplication.clear');
  }

  /**
   * Get deduplication statistics
   */
  getStats(): {
    uniqueMessages: number;
    totalHashes: number;
  } {
    return {
      uniqueMessages: this.seenMessages.size,
      totalHashes: this.messageHashes.size
    };
  }
}

/**
 * Connection pool for AI providers
 */
export class AIProviderConnectionPool {
  private readonly connections = new Map<string, any>();
  private readonly connectionStats = new Map<string, { created: number; lastUsed: number; active: number }>();

  constructor(
    private readonly maxConnections: number = 10,
    // @ts-expect-error - Reserved for future logging/monitoring
    private readonly _connectionTimeout: number = 30000,
    // @ts-expect-error - Reserved for future logging/monitoring
    private readonly _logger: ILogger,
    private readonly metrics: IMetricsCollector
  ) {}

  /**
   * Get or create connection for provider
   * 
   * @param providerName - Provider name
   * @param createConnection - Function to create new connection
   * @returns Connection instance
   */
  async getConnection<T>(
    providerName: string, 
    createConnection: () => Promise<T>
  ): Promise<T> {
    const existing = this.connections.get(providerName);
    
    if (existing && this.isConnectionValid(existing)) {
      this.updateConnectionStats(providerName);
      this.metrics.increment('ai.connection.reuse', { provider: providerName });
      return existing;
    }

    // Create new connection
    const connection = await createConnection();
    this.connections.set(providerName, connection);
    this.updateConnectionStats(providerName, true);
    
    this.metrics.increment('ai.connection.create', { provider: providerName });
    return connection;
  }

  /**
   * Check if connection is still valid
   * 
   * @param connection - Connection to check
   * @returns True if connection is valid
   */
  private isConnectionValid(connection: any): boolean {
    // Basic validation - can be extended based on provider type
    return connection && typeof connection === 'object';
  }

  /**
   * Update connection statistics
   * 
   * @param providerName - Provider name
   * @param isNew - Whether this is a new connection
   */
  private updateConnectionStats(providerName: string, isNew: boolean = false): void {
    const stats = this.connectionStats.get(providerName) || {
      created: 0,
      lastUsed: 0,
      active: 0
    };

    if (isNew) {
      stats.created++;
      stats.active++;
    }

    stats.lastUsed = Date.now();
    this.connectionStats.set(providerName, stats);
  }

  /**
   * Close connection for provider
   * 
   * @param providerName - Provider name
   */
  closeConnection(providerName: string): void {
    const connection = this.connections.get(providerName);
    if (connection && typeof connection.close === 'function') {
      connection.close();
    }

    this.connections.delete(providerName);
    this.metrics.increment('ai.connection.close', { provider: providerName });
  }

  /**
   * Close all connections
   */
  closeAllConnections(): void {
    for (const [_providerName, connection] of this.connections.entries()) {
      if (connection && typeof connection.close === 'function') {
        connection.close();
      }
    }

    this.connections.clear();
    this.connectionStats.clear();
    this.metrics.increment('ai.connection.close_all');
  }

  /**
   * Get connection pool statistics
   */
  getStats(): {
    totalConnections: number;
    maxConnections: number;
    providers: Array<{ name: string; created: number; lastUsed: number; active: number }>;
  } {
    const providers = Array.from(this.connectionStats.entries()).map(([name, stats]) => ({
      name,
      ...stats
    }));

    return {
      totalConnections: this.connections.size,
      maxConnections: this.maxConnections,
      providers
    };
  }
}

/**
 * Memory usage monitor
 */
export class MemoryMonitor {
  private readonly memoryThreshold: number;
  private readonly gcThreshold: number;

  constructor(
    memoryThreshold: number = 100 * 1024 * 1024, // 100MB
    gcThreshold: number = 80 * 1024 * 1024, // 80MB
    private readonly _logger: ILogger,
    private readonly metrics: IMetricsCollector
  ) {
    this.memoryThreshold = memoryThreshold;
    this.gcThreshold = gcThreshold;
  }

  /**
   * Check current memory usage
   * 
   * @returns Memory usage statistics
   */
  getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
    isHigh: boolean;
  } {
    const usage = process.memoryUsage();
    const used = usage.heapUsed;
    const total = usage.heapTotal;
    const percentage = (used / total) * 100;
    const isHigh = used > this.memoryThreshold;

    this.metrics.gauge('ai.memory.used', used);
    this.metrics.gauge('ai.memory.total', total);
    this.metrics.gauge('ai.memory.percentage', percentage);

    if (isHigh) {
      this._logger.warn('High memory usage detected', { used, total, percentage });
    }

    return { used, total, percentage, isHigh };
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): void {
    if (global.gc) {
      global.gc();
      this.metrics.increment('ai.memory.gc.forced');
      this._logger.debug('Forced garbage collection');
    } else {
      this._logger.warn('Garbage collection not available');
    }
  }

  /**
   * Check if garbage collection should be triggered
   * 
   * @returns True if GC should be triggered
   */
  shouldTriggerGC(): boolean {
    const usage = this.getMemoryUsage();
    return usage.used > this.gcThreshold;
  }
}

/**
 * Performance optimization manager
 */
export class AIServicePerformanceManager {
  public readonly cache: AIServiceCache<any>;
  public readonly deduplicator: MessageDeduplicator;
  public readonly connectionPool: AIProviderConnectionPool;
  public readonly memoryMonitor: MemoryMonitor;

  constructor(
    logger: ILogger,
    metrics: IMetricsCollector,
    options: {
      cacheSize?: number;
      cacheTTL?: number;
      maxConnections?: number;
      memoryThreshold?: number;
    } = {}
  ) {
    this.cache = new AIServiceCache(
      options.cacheSize || 1000,
      options.cacheTTL || 300000,
      logger,
      metrics
    );

    this.deduplicator = new MessageDeduplicator(logger, metrics);

    this.connectionPool = new AIProviderConnectionPool(
      options.maxConnections || 10,
      30000,
      logger,
      metrics
    );

    this.memoryMonitor = new MemoryMonitor(
      options.memoryThreshold || 100 * 1024 * 1024,
      80 * 1024 * 1024,
      logger,
      metrics
    );
  }

  /**
   * Get comprehensive performance statistics
   * 
   * @returns Performance statistics
   */
  getPerformanceStats(): {
    cache: ReturnType<AIServiceCache['getStats']>;
    deduplication: ReturnType<MessageDeduplicator['getStats']>;
    connections: ReturnType<AIProviderConnectionPool['getStats']>;
    memory: ReturnType<MemoryMonitor['getMemoryUsage']>;
  } {
    return {
      cache: this.cache.getStats(),
      deduplication: this.deduplicator.getStats(),
      connections: this.connectionPool.getStats(),
      memory: this.memoryMonitor.getMemoryUsage()
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.cache.clear();
    this.deduplicator.clear();
    this.connectionPool.closeAllConnections();
    
    if (this.memoryMonitor.shouldTriggerGC()) {
      this.memoryMonitor.forceGC();
    }
  }
}
