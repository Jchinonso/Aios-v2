/**
 * @fileoverview Base Analyzer - Clean implementation following SOLID principles
 * 
 * This module provides an abstract base class for all analyzer implementations.
 * It implements common functionality like result creation, metrics collection,
 * and logging while leaving the core analysis logic to be implemented by subclasses.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { IResult } from '../../../core/types/result.js'
import { Result } from '../../../core/types/result.js'
import type { ILogger } from '../../../core/logging/logger.interface.js'
import type { IMetricsCollector } from '../../../core/metrics/metrics.interface.js'
import type { IAnalyzer, AnalysisContext, AnalysisResult, AnalysisMetadata } from '../types/analyzer.interface.js'
import type {
  AnalyzerConfig,
  LanguageDefinition,
  FrameworkPattern,
  PackageManagerPattern,
  FileSystemConfig,
  PerformanceConfig
} from '../../types/config.types.js';
import { DEFAULT_ANALYZER_CONFIG } from '../config/analyzer-config/index.js';

/**
 * Abstract base class for all analyzer implementations.
 * Provides common functionality while requiring subclasses to implement core analysis logic.
 * 
 * @abstract
 * @class BaseAnalyzer
 * @template TInput - The type of input this analyzer accepts
 * @template TOutput - The type of output this analyzer produces
 * @implements {IAnalyzer}
 * 
 * @example
 * ```typescript
 * class MyAnalyzer extends BaseAnalyzer<string, MyAnalysisResult> {
 *   constructor(logger: ILogger, metrics: IMetricsCollector) {
 *     super('MyAnalyzer', '1.0.0', logger, metrics);
 *   }
 *   
 *   async canHandle(input: string): Promise<boolean> {
 *     return typeof input === 'string';
 *   }
 *   
 *   async analyze(input: string, context?: AnalysisContext): Promise<IResult<AnalysisResult<MyAnalysisResult>>> {
 *     // Analysis logic here
 *   }
 * }
 * ```
 */
export abstract class BaseAnalyzer<TInput, TOutput> implements IAnalyzer {
  /** The unique name of this analyzer */
  public readonly name: string;
  
  /** The version of this analyzer */
  public readonly version: string;
  
  /** Logger instance for this analyzer */
  protected readonly logger: ILogger;
  
  /** Metrics collector for this analyzer */
  protected readonly metrics: IMetricsCollector;

  /** Analyzer configuration */
  protected config?: AnalyzerConfig;

  /**
   * Creates a new base analyzer instance.
   * 
   * @param {string} name - The name of the analyzer
   * @param {string} version - The version of the analyzer
   * @param {ILogger} logger - Logger instance
   * @param {IMetricsCollector} metrics - Metrics collector instance
   * @param {AnalyzerConfig} [config] - Optional analyzer configuration
   */
  constructor(
    name: string,
    version: string,
    logger: ILogger,
    metrics: IMetricsCollector,
    config?: AnalyzerConfig
  ) {
    this.name = name;
    this.version = version;
    this.logger = logger;
    this.metrics = metrics;
    if (config) {
      this.config = config;
    }
  }

  /**
   * Determines if this analyzer can handle the given input.
   * Must be implemented by subclasses.
   * 
   * @abstract
   * @param {TInput} input - The input to check
   * @returns {Promise<boolean>} True if the analyzer can handle the input
   */
  abstract canHandle(input: TInput): Promise<boolean>;
  
  /**
   * Performs analysis on the given input.
   * Must be implemented by subclasses.
   * 
   * @abstract
   * @param {TInput} input - The input to analyze
   * @param {AnalysisContext} [context] - Optional analysis context
   * @returns {Promise<IResult<AnalysisResult<TOutput>>>} The analysis result
   */
  abstract analyze(input: TInput, context?: AnalysisContext): Promise<IResult<AnalysisResult<TOutput>>>;

  /**
   * Creates a successful analysis result.
   * 
   * @protected
   * @param {TOutput} data - The analyzed data
   * @param {number} executionTime - Execution time in milliseconds
   * @param {Record<string, any>} [context] - Additional context information
   * @param {string[]} [warnings=[]] - Warning messages
   * @returns {IResult<AnalysisResult<TOutput>>} Success result
   */
  protected createSuccessResult(
    data: TOutput,
    executionTime: number,
    context?: Record<string, any>,
    warnings: string[] = []
  ): IResult<AnalysisResult<TOutput>> {
    return Result.success({
      success: true,
      data,
      warnings,
      confidence: 1.0,
      metadata: this.createMetadata(executionTime, context)
    });
  }

  /**
   * Creates a failed analysis result.
   * 
   * @protected
   * @param {string} error - Error message
   * @param {number} executionTime - Execution time in milliseconds
   * @param {Record<string, any>} [context] - Additional context information
   * @param {string[]} [warnings=[]] - Warning messages
   * @returns {IResult<AnalysisResult<TOutput>>} Failure result
   */
  protected createFailureResult(
    error: string,
    executionTime: number,
    context?: Record<string, any>,
    warnings: string[] = []
  ): IResult<AnalysisResult<TOutput>> {
    return Result.success({
      success: false,
      error,
      warnings,
      confidence: 0,
      metadata: this.createMetadata(executionTime, context)
    });
  }

  /**
   * Creates metadata for analysis results.
   * 
   * @protected
   * @param {number} executionTime - Execution time in milliseconds
   * @param {Record<string, any>} [context] - Additional context information
   * @returns {AnalysisMetadata} Analysis metadata
   */
  protected createMetadata(executionTime: number, context?: Record<string, any>): AnalysisMetadata {
    return {
      analyzer: this.name,
      version: this.version,
      executionTime,
      timestamp: new Date(),
      ...(context && { context })
    };
  }

  /**
   * Records metrics for analyzer operations.
   * 
   * @protected
   * @param {string} operation - The operation being measured
   * @param {boolean} success - Whether the operation was successful
   * @param {number} duration - Operation duration in milliseconds
   */
  protected recordMetrics(operation: string, success: boolean, duration: number): void {
    this.metrics.increment(`analyzer.${this.name.toLowerCase()}.${operation}.${success ? 'success' : 'failure'}`);
    this.metrics.histogram(`analyzer.${this.name.toLowerCase()}.${operation}.duration`, duration);
  }

  /**
   * Logs an analyzer operation with structured information.
   * 
   * @protected
   * @param {string} operation - The operation being logged
   * @param {Record<string, any>} [details] - Additional details to log
   */
  protected logOperation(operation: string, details?: Record<string, any>): void {
    this.logger.info(`${this.name}: ${operation}`, { analyzer: this.name, ...details });
  }

  /**
   * Gets the analyzer configuration, falling back to default if not provided.
   * 
   * @protected
   * @returns {AnalyzerConfig} The analyzer configuration
   */
  protected getConfig(): AnalyzerConfig {
    if (this.config) {
      return this.config;
    }

    // Return default config
    return DEFAULT_ANALYZER_CONFIG;
  }

  /**
   * Gets language-specific configuration for the given language.
   * 
   * @protected
   * @param {string} language - The language name
   * @returns {LanguageDefinition | undefined} The language configuration
   */
  protected getLanguageConfig(language: string): LanguageDefinition | undefined {
    const config = this.getConfig();
    return config.languages.supportedLanguages.find((lang: LanguageDefinition) => lang.name === language);
  }

  /**
   * Gets framework patterns for the given language.
   * 
   * @protected
   * @param {string} language - The language name
   * @returns {FrameworkPattern[]} Array of framework patterns
   */
  protected getFrameworkPatterns(language: string): FrameworkPattern[] {
    const config = this.getConfig();
    return config.languages.frameworkPatterns.filter((fw: FrameworkPattern) => fw.language === language);
  }

  /**
   * Gets package manager patterns for the given language.
   * 
   * @protected
   * @param {string} language - The language name
   * @returns {PackageManagerPattern[]} Array of package manager patterns
   */
  protected getPackageManagerPatterns(language: string): PackageManagerPattern[] {
    const config = this.getConfig();
    return config.languages.packageManagerPatterns.filter((pm: PackageManagerPattern) => pm.language === language);
  }

  /**
   * Gets file system configuration.
   * 
   * @protected
   * @returns {FileSystemConfig} The file system configuration
   */
  protected getFileSystemConfig(): FileSystemConfig {
    return this.getConfig().fileSystem;
  }

  /**
   * Gets performance configuration.
   * 
   * @protected
   * @returns {PerformanceConfig} The performance configuration
   */
  protected getPerformanceConfig(): PerformanceConfig {
    return this.getConfig().performance;
  }

  /**
   * Gets testing frameworks for the given language.
   * 
   * @protected
   * @param {string} language - The language name
   * @returns {Array<{name: string, configFiles: string[], patterns: string[]}>} Array of testing frameworks
   */
  protected getTestingFrameworks(language: string): Array<{name: string, configFiles: string[], patterns: string[]}> {
    const config = this.getConfig();
    return config.testingFrameworks?.[language] || [];
  }

  /**
   * Gets build tools for the given language.
   * 
   * @protected
   * @param {string} language - The language name
   * @returns {Array<{name: string, configFiles: string[], patterns: string[]}>} Array of build tools
   */
  protected getBuildTools(language: string): Array<{name: string, configFiles: string[], patterns: string[]}> {
    const config = this.getConfig();
    return config.buildTools?.[language] || [];
  }

  /**
   * Executes an operation with retry logic.
   * 
   * @protected
   * @param {Function} operation - The operation to execute
   * @param {string} operationName - Name of the operation for logging
   * @param {number} [maxRetries=3] - Maximum number of retries
   * @returns {Promise<IResult<TOutput>>} Result of the operation
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<IResult<T>>,
    operationName: string,
    maxRetries: number = 3
  ): Promise<IResult<T>> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (result.isSuccess) {
          return result;
        }
        lastError = result.error;
        
        if (attempt < maxRetries) {
          this.logger.warn(`${operationName} failed, retrying...`, { attempt, maxRetries, error: lastError?.message });
          await this.delay(1000 * attempt); // Exponential backoff
        }
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          this.logger.warn(`${operationName} threw error, retrying...`, { attempt, maxRetries, error: lastError.message });
          await this.delay(1000 * attempt);
        }
      }
    }
    
    this.logger.error(`${operationName} failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    return Result.failure(lastError || new Error(`${operationName} failed`));
  }

  /**
   * Creates a successful analysis result with proper structure.
   * 
   * @protected
   * @param {TOutput} data - The analyzed data
   * @param {AnalysisContext} context - Analysis context
   * @param {number} duration - Execution time in milliseconds
   * @param {string[]} [warnings=[]] - Warning messages
   * @param {number} [confidence=1.0] - Confidence score
   * @returns {AnalysisResult<TOutput>} Analysis result
   */
  protected createAnalysisResult(
    data: TOutput,
    context: AnalysisContext,
    duration: number,
    warnings: string[] = [],
    confidence: number = 1.0
  ): AnalysisResult<TOutput> {
    return {
      success: true,
      data,
      warnings,
      confidence,
      metadata: this.createMetadata(duration, context)
    };
  }

  /**
   * Creates an error analysis result with proper structure.
   * 
   * @protected
   * @param {string} error - Error message
   * @param {AnalysisContext} context - Analysis context
   * @param {number} duration - Execution time in milliseconds
   * @param {string[]} [warnings=[]] - Warning messages
   * @returns {AnalysisResult<TOutput>} Error analysis result
   */
  protected createErrorResult(
    error: string,
    context: AnalysisContext,
    duration: number,
    warnings: string[] = []
  ): AnalysisResult<TOutput> {
    return {
      success: false,
      error,
      warnings,
      confidence: 0,
      metadata: this.createMetadata(duration, context)
    };
  }

  /**
   * Helper method to add delay between retries.
   * 
   * @private
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}