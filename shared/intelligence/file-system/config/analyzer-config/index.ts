/**
 * @fileoverview Analyzer Configuration - Centralized configuration to eliminate hardcoding
 * 
 * This module provides centralized configuration management for all analyzers,
 * eliminating hardcoded values and supporting multiple environments. It includes
 * comprehensive language support, framework detection patterns, and performance
 * tuning options.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type {
  AnalyzerConfig,
  FileSystemConfig,
  LanguageDefinition,
  FrameworkPattern,
  PackageManagerPattern,
  PerformanceConfig,
  LanguageConfig
} from '../../../types/config.types.js';

// Re-export the types that are needed elsewhere
export type { FileSystemConfig, LanguageConfig, PerformanceConfig };

// Import configuration modules
import { LANGUAGE_DEFINITIONS } from './language-definitions.js'
import { FRAMEWORK_PATTERNS } from './framework-patterns.js'
import { PACKAGE_MANAGER_PATTERNS } from './package-manager-patterns.js'
import { BUILD_TOOLS } from './build-tools.js'
import { TESTING_FRAMEWORKS } from './testing-frameworks.js'
import { 
  DOCUMENTATION_PATTERNS,
  DOCKER_PATTERNS,
  CI_CD_PATTERNS,
  ENVIRONMENT_PATTERNS,
  SECRET_PATTERNS,
  TEST_PATTERNS
} from './project-patterns.js';

/**
 * Default configuration for all analyzers.
 * Provides sensible defaults for file system scanning, language detection,
 * framework recognition, and performance tuning.
 * 
 * @constant {AnalyzerConfig} DEFAULT_ANALYZER_CONFIG
 * 
 * @example
 * ```typescript
 * // Use default configuration
 * const analyzer = new FileSystemAnalyzer(DEFAULT_ANALYZER_CONFIG);
 * 
 * // Override specific settings
 * const customConfig = {
 *   ...DEFAULT_ANALYZER_CONFIG,
 *   fileSystem: { maxDepth: 5 }
 * };
 * ```
 */
export const DEFAULT_ANALYZER_CONFIG: AnalyzerConfig = {
  fileSystem: {
    maxDepth: 10,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    excludePatterns: [
      'node_modules', '.git', 'dist', 'build', '.next', '.cache',
      'target', 'bin', 'obj', '__pycache__', '.pytest_cache',
      'venv', '.venv', '.env', 'vendor'
    ],
    includeHidden: false,
    followSymlinks: false,
    parallelScanning: true,
    cacheTtlMs: 300000, // 5 minutes
    cacheSizeLimit: 100
  },

  languages: {
    supportedLanguages: LANGUAGE_DEFINITIONS,
    frameworkPatterns: FRAMEWORK_PATTERNS,
    packageManagerPatterns: PACKAGE_MANAGER_PATTERNS
  },

  patterns: {
    confidenceThreshold: 0.7,
    maxPatterns: 50,
    enableFuzzyMatching: true
  },

  // Build tools and testing frameworks
  buildTools: BUILD_TOOLS,
  testingFrameworks: TESTING_FRAMEWORKS,

  // Project patterns
  projectPatterns: {
    documentation: DOCUMENTATION_PATTERNS,
    docker: DOCKER_PATTERNS,
    ciCd: CI_CD_PATTERNS,
    environment: ENVIRONMENT_PATTERNS,
    secrets: SECRET_PATTERNS,
    tests: TEST_PATTERNS
  },

  performance: {
    timeoutMs: 30000, // 30 seconds
    maxConcurrentAnalyzers: 5,
    cacheResults: true,
    cacheTtlMs: 300000 // 5 minutes
  }
};

/**
 * Builder class for creating custom analyzer configurations.
 * Provides a fluent API for building configurations with method chaining.
 * 
 * @class AnalyzerConfigBuilder
 * 
 * @example
 * ```typescript
 * const config = new AnalyzerConfigBuilder()
 *   .withFileSystem({ maxDepth: 5, includeHidden: true })
 *   .withPerformance({ timeoutMs: 60000 })
 *   .withLanguage({ name: 'typescript', extensions: ['.ts', '.tsx'] })
 *   .build();
 * ```
 */
export class AnalyzerConfigBuilder {
  /** Internal configuration being built */
  private config: AnalyzerConfig;

  /**
   * Creates a new configuration builder.
   * 
   * @param {AnalyzerConfig} [baseConfig=DEFAULT_ANALYZER_CONFIG] - Base configuration to start with
   */
  constructor(baseConfig: AnalyzerConfig = DEFAULT_ANALYZER_CONFIG) {
    this.config = { ...baseConfig };
  }

  /**
   * Configures file system scanning options.
   * 
   * @param {Partial<FileSystemConfig>} config - File system configuration overrides
   * @returns {this} The builder instance for method chaining
   */
  withFileSystem(config: Partial<FileSystemConfig>): this {
    this.config = {
      ...this.config,
      fileSystem: { ...this.config.fileSystem, ...config }
    };
    return this;
  }

  /**
   * Adds or updates a language definition.
   * 
   * @param {LanguageDefinition} language - Language definition to add or update
   * @returns {this} The builder instance for method chaining
   */
  withLanguage(language: LanguageDefinition): this {
    const existingIndex = this.config.languages.supportedLanguages.findIndex(
      (l: LanguageDefinition) => l.name === language.name
    );

    if (existingIndex >= 0) {
      this.config.languages.supportedLanguages[existingIndex] = language;
    } else {
      this.config.languages.supportedLanguages.push(language);
    }

    return this;
  }

  /**
   * Adds a framework detection pattern.
   * 
   * @param {FrameworkPattern} framework - Framework pattern to add
   * @returns {this} The builder instance for method chaining
   */
  withFramework(framework: FrameworkPattern): this {
    this.config.languages.frameworkPatterns.push(framework);
    return this;
  }

  /**
   * Adds a package manager detection pattern.
   * 
   * @param {PackageManagerPattern} packageManager - Package manager pattern to add
   * @returns {this} The builder instance for method chaining
   */
  withPackageManager(packageManager: PackageManagerPattern): this {
    this.config.languages.packageManagerPatterns.push(packageManager);
    return this;
  }

  /**
   * Configures performance and execution options.
   * 
   * @param {Partial<PerformanceConfig>} config - Performance configuration overrides
   * @returns {this} The builder instance for method chaining
   */
  withPerformance(config: Partial<PerformanceConfig>): this {
    this.config = {
      ...this.config,
      performance: { ...this.config.performance, ...config }
    };
    return this;
  }

  /**
   * Builds the final configuration.
   * 
   * @returns {AnalyzerConfig} The complete analyzer configuration
   */
  build(): AnalyzerConfig {
    return { ...this.config };
  }

  /**
   * Adds a build tool pattern for a specific language.
   * 
   * @param {string} language - The target language
   * @param {string} toolName - The build tool name
   * @param {string[]} configFiles - Configuration files to look for
   * @param {string[]} patterns - Code patterns to match
   * @returns {this} The builder instance for method chaining
   */
  withBuildTool(language: string, toolName: string, configFiles: string[], patterns: string[]): this {
    const buildTools = this.config.buildTools || {};
    if (!buildTools[language]) {
      buildTools[language] = [];
    }
    
    buildTools[language].push({ name: toolName, configFiles, patterns });
    this.config = { ...this.config, buildTools };
    return this;
  }

  /**
   * Adds a testing framework pattern for a specific language.
   * 
   * @param {string} language - The target language
   * @param {string} frameworkName - The testing framework name
   * @param {string[]} configFiles - Configuration files to look for
   * @param {string[]} patterns - Code patterns to match
   * @returns {this} The builder instance for method chaining
   */
  withTestingFramework(language: string, frameworkName: string, configFiles: string[], patterns: string[]): this {
    const testingFrameworks = this.config.testingFrameworks || {};
    if (!testingFrameworks[language]) {
      testingFrameworks[language] = [];
    }
    
    testingFrameworks[language].push({ name: frameworkName, configFiles, patterns });
    this.config = { ...this.config, testingFrameworks };
    return this;
  }

  /**
   * Gets language-specific configuration.
   * 
   * @param {string} languageName - The language name
   * @returns {LanguageDefinition | undefined} The language configuration
   */
  getLanguageConfig(languageName: string): LanguageDefinition | undefined {
    return this.config.languages.supportedLanguages.find((lang: LanguageDefinition) => lang.name === languageName);
  }

  /**
   * Gets framework patterns for a specific language.
   * 
   * @param {string} language - The target language
   * @returns {FrameworkPattern[]} Array of framework patterns
   */
  getFrameworkPatterns(language: string): FrameworkPattern[] {
    return this.config.languages.frameworkPatterns.filter((fw: FrameworkPattern) => fw.language === language);
  }

  /**
   * Gets package manager patterns for a specific language.
   * 
   * @param {string} language - The target language
   * @returns {PackageManagerPattern[]} Array of package manager patterns
   */
  getPackageManagerPatterns(language: string): PackageManagerPattern[] {
    return this.config.languages.packageManagerPatterns.filter((pm: PackageManagerPattern) => pm.language === language);
  }

  /**
   * Gets build tools for a specific language.
   * 
   * @param {string} language - The target language
   * @returns {Array<{name: string, configFiles: string[], patterns: string[]}>} Array of build tools
   */
  getBuildTools(language: string): Array<{name: string, configFiles: string[], patterns: string[]}> {
    return this.config.buildTools?.[language] || [];
  }

  /**
   * Gets testing frameworks for a specific language.
   * 
   * @param {string} language - The target language
   * @returns {Array<{name: string, configFiles: string[], patterns: string[]}>} Array of testing frameworks
   */
  getTestingFrameworks(language: string): Array<{name: string, configFiles: string[], patterns: string[]}> {
    return this.config.testingFrameworks?.[language] || [];
  }

  /**
   * Creates a configuration optimized for a specific environment.
   * 
   * @param {'development' | 'testing' | 'production'} env - Target environment
   * @returns {AnalyzerConfig} Environment-specific configuration
   * 
   * @example
   * ```typescript
   * // Get development configuration
   * const devConfig = AnalyzerConfigBuilder.createForEnvironment('development');
   * 
   * // Get production configuration
   * const prodConfig = AnalyzerConfigBuilder.createForEnvironment('production');
   * ```
   */
  static createForEnvironment(env: 'development' | 'testing' | 'production'): AnalyzerConfig {
    const builder = new AnalyzerConfigBuilder();

    switch (env) {
      case 'development':
        return builder
          .withPerformance({ timeoutMs: 60000, cacheResults: false })
          .withFileSystem({ includeHidden: true })
          .build();

      case 'testing':
        return builder
          .withPerformance({ timeoutMs: 10000, maxConcurrentAnalyzers: 2 })
          .withFileSystem({ maxDepth: 5 })
          .build();

      case 'production':
        return builder
          .withPerformance({ timeoutMs: 15000, cacheResults: true })
          .withFileSystem({ parallelScanning: true })
          .build();

      default:
        return builder.build();
    }
  }

  /**
   * Creates a configuration for a specific language with all its patterns.
   * 
   * @param {string} language - The target language
   * @returns {AnalyzerConfig} Language-specific configuration
   * 
   * @example
   * ```typescript
   * // Get JavaScript-specific configuration
   * const jsConfig = AnalyzerConfigBuilder.createForLanguage('javascript');
   * 
   * // Get Python-specific configuration
   * const pyConfig = AnalyzerConfigBuilder.createForLanguage('python');
   * ```
   */
  static createForLanguage(language: string): AnalyzerConfig {
    const builder = new AnalyzerConfigBuilder();
    
    // Filter framework patterns for this language
    const languageFrameworks = builder.getFrameworkPatterns(language);
    const languagePackageManagers = builder.getPackageManagerPatterns(language);
    const languageConfig = builder.getLanguageConfig(language);
    
    // Create a new config with filtered data
    const filteredConfig: AnalyzerConfig = {
      ...builder.config,
      languages: {
        ...builder.config.languages,
        supportedLanguages: languageConfig ? [languageConfig] : [],
        frameworkPatterns: languageFrameworks,
        packageManagerPatterns: languagePackageManagers
      }
    };
    
    return filteredConfig;
  }
}

// Re-export individual modules for direct access (commented out to avoid conflicts)
export * from './language-definitions.js'
export * from './framework-patterns.js'
export * from './package-manager-patterns.js'
export * from './build-tools.js'
export * from './testing-frameworks.js'