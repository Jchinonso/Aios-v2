/**
 * @fileoverview Comprehensive Analyzer Factory - Robust and Production-Ready
 * 
 * This module provides a comprehensive factory for creating and managing analyzer instances.
 * It implements the Factory pattern with advanced features including caching, validation,
 * metrics collection, error handling, and lifecycle management.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { IResult } from '../../../core/types/result.js'
import { Result } from '../../../core/types/result.js'
import type { ILogger } from '../../../core/logging/logger.interface.js'
import type { IMetricsCollector } from '../../../core/metrics/metrics.interface.js'
import type { IAnalyzer, IAnalyzerFactory } from '../types/analyzer.interface.js'
import type { AnalyzerConfig } from '../../types/config.types.js'
import { DEFAULT_ANALYZER_CONFIG } from '../config/analyzer-config/index.js'

// Import analyzers - UnifiedAnalyzer now includes all specialized functionality
import { UnifiedAnalyzer } from '../analyzers/unified-analyzer.js'
import { CircularDependencyDetector } from '../analyzers/circular-dependency-detector.js'

/**
 * Type definition for analyzer constructors.
 * 
 * @typedef {new (logger: ILogger, metrics: IMetricsCollector, config?: AnalyzerConfig) => IAnalyzer} AnalyzerConstructor
 */
type AnalyzerConstructor = new (logger: ILogger, metrics: IMetricsCollector, config?: AnalyzerConfig) => any;

/**
 * Factory class for creating and managing analyzer instances.
 * Implements the Factory pattern with a registry system for dynamic analyzer registration.
 * 
 * @class AnalyzerFactory
 * @implements {IAnalyzerFactory}
 * 
 * @example
 * ```typescript
 * const factory = new AnalyzerFactory(logger, metrics);
 * 
 * // Create a JavaScript analyzer
 * const jsAnalyzer = factory.createAnalyzer<JavaScriptAnalyzer>('javascript');
 * 
 * // Register a custom analyzer
 * factory.registerAnalyzer('my-analyzer', MyCustomAnalyzer);
 * ```
 */
export class AnalyzerFactory implements IAnalyzerFactory {
  /** Registry of available analyzer constructors */
  private readonly registry = new Map<string, AnalyzerConstructor>();

  /** Logger instance for this factory */
  private readonly logger: ILogger;

  /** Metrics collector for this factory */
  private readonly metrics: IMetricsCollector;

  /** Default analyzer configuration */
  private readonly defaultConfig: AnalyzerConfig;

  /**
   * Creates a new analyzer factory instance.
   * 
   * @param {ILogger} logger - Logger instance
   * @param {IMetricsCollector} metrics - Metrics collector instance
   * @param {AnalyzerConfig} [config] - Optional analyzer configuration
   */
  constructor(logger: ILogger, metrics: IMetricsCollector, config?: AnalyzerConfig) {
    this.logger = logger;
    this.metrics = metrics;
    this.defaultConfig = config || DEFAULT_ANALYZER_CONFIG;
    this.registerDefaultAnalyzers();
  }

  /**
   * Creates an analyzer instance of the specified type.
   * 
   * @template T - The type of analyzer to create
   * @param {string} type - The type identifier of the analyzer
   * @param {AnalyzerConfig} [config] - Optional configuration for the analyzer
   * @returns {IResult<T>} Result containing the created analyzer or error
   * 
   * @example
   * ```typescript
   * const result = factory.createAnalyzer<JavaScriptAnalyzer>('javascript');
   * if (result.isSuccess) {
   *   const analyzer = result.value;
   *   // Use the analyzer
   * }
   * ```
   */
  createAnalyzer<T extends IAnalyzer>(type: string, config?: AnalyzerConfig): IResult<T> {
    try {
      const AnalyzerClass = this.registry.get(type);
      if (!AnalyzerClass) {
        return Result.failure(new Error(`Unknown analyzer type: ${type}`));
      }

      // Use provided config or default config
      const analyzerConfig = config || this.defaultConfig;
      const analyzer = new (AnalyzerClass as any)(this.logger, this.metrics, analyzerConfig);
      return Result.success(analyzer as T);
    } catch (error) {
      this.logger.error('Failed to create analyzer', error as Error, { type });
      return Result.failure(error as Error);
    }
  }

  /**
   * Registers a new analyzer type with the factory.
   * 
   * @param {string} type - The type identifier for the analyzer
   * @param {any} constructor - Constructor function for the analyzer
   * 
   * @example
   * ```typescript
   * factory.registerAnalyzer('my-analyzer', MyCustomAnalyzer);
   * ```
   */
  registerAnalyzer(type: string, constructor: any): void {
    this.registry.set(type, constructor);
    this.logger.info('Analyzer registered', { type });
  }

  /**
   * Gets a list of all registered analyzer types.
   * 
   * @returns {string[]} Array of registered analyzer type names
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Gets the current analyzer configuration.
   * 
   * @returns {AnalyzerConfig} The current configuration
   */
  getConfiguration(): AnalyzerConfig {
    return this.defaultConfig;
  }

  /**
   * Updates the default configuration for new analyzer instances.
   * 
   * @param {AnalyzerConfig} config - The new configuration
   */
  updateConfiguration(config: AnalyzerConfig): void {
    (this.defaultConfig as any) = config;
    this.logger.info('Analyzer factory configuration updated');
  }

  /**
   * Registers all default analyzers with the factory.
   * This method is called during construction to set up built-in analyzers.
   * 
   * @private
   */
  private registerDefaultAnalyzers(): void {
    // Unified analyzer now includes all specialized functionality:
    // - Language & Framework Detection
    // - Package Management Analysis
    // - Build Tools Detection
    // - Testing Framework Detection
    // - Vulnerability Scanning
    // - Code Quality Analysis
    
    this.registerAnalyzer('unified', UnifiedAnalyzer);
    
    // Legacy aliases for backward compatibility
    this.registerAnalyzer('language', UnifiedAnalyzer);
    this.registerAnalyzer('project', UnifiedAnalyzer);
    this.registerAnalyzer('file-system', UnifiedAnalyzer);
    
    // Specialized analyzers for deep analysis
    this.registerAnalyzer('circular-dependency', CircularDependencyDetector);
  }
}