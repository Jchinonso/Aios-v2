/**
 * @fileoverview Core Analyzer Interfaces - Consolidated and cleaned up
 * 
 * This module contains all the core interfaces for the analyzer system.
 * These interfaces define the contracts that all analyzers must implement,
 * ensuring consistency and interoperability across the system.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { IResult } from '../../../core/types/result.js'
import type { VulnerabilityInfo } from '../../types/vulnerability.types.js'
import type { ComprehensiveFrameworkDetectionResult } from '../../types/language-detection.types.js'

/**
 * Base interface that all analyzers must implement.
 * Defines the core contract for analyzer functionality.
 * 
 * @interface IAnalyzer
 * @template TInput - The type of input the analyzer accepts
 * @template TOutput - The type of output the analyzer produces
 * 
 * @example
 * ```typescript
 * class MyAnalyzer implements IAnalyzer {
 *   readonly name = 'MyAnalyzer';
 *   readonly version = '1.0.0';
 *   
 *   async canHandle(input: any): Promise<boolean> {
 *     return input.type === 'my-type';
 *   }
 *   
 *   async analyze(input: any, context?: AnalysisContext): Promise<IResult<AnalysisResult<any>>> {
 *     // Analysis logic here
 *   }
 * }
 * ```
 */
export interface IAnalyzer {
  /** The unique name of the analyzer */
  readonly name: string;
  
  /** The version of the analyzer */
  readonly version: string;
  
  /**
   * Determines if this analyzer can handle the given input.
   * 
   * @param {any} input - The input to check
   * @returns {Promise<boolean>} True if the analyzer can handle the input
   */
  canHandle(input: any): Promise<boolean>;
  
  /**
   * Performs analysis on the given input.
   * 
   * @param {any} input - The input to analyze
   * @param {AnalysisContext} [context] - Optional analysis context
   * @returns {Promise<IResult<AnalysisResult<any>>>} The analysis result
   */
  analyze(input: any, context?: AnalysisContext): Promise<IResult<AnalysisResult<any>>>;
}

/**
 * Factory interface for creating analyzer instances.
 * Provides a centralized way to create and manage analyzers.
 * 
 * @interface IAnalyzerFactory
 * 
 * @example
 * ```typescript
 * const factory = new AnalyzerFactory(logger, metrics);
 * const result = factory.createAnalyzer<JavaScriptAnalyzer>('javascript');
 * if (result.isSuccess) {
 *   const analyzer = result.value;
 *   // Use the analyzer
 * }
 * ```
 */
export interface IAnalyzerFactory {
  /**
   * Creates an analyzer instance of the specified type.
   * 
   * @template T - The type of analyzer to create
   * @param {string} type - The type identifier of the analyzer
   * @param {any} [config] - Optional configuration for the analyzer
   * @returns {IResult<T>} Result containing the created analyzer or error
   */
  createAnalyzer<T extends IAnalyzer>(type: string, config?: any): IResult<T>;
  
  /**
   * Registers a new analyzer type with the factory.
   * 
   * @template T - The type of analyzer to register
   * @param {string} type - The type identifier for the analyzer
   * @param {new (...args: any[]) => T} constructor - Constructor function for the analyzer
   */
  registerAnalyzer<T extends IAnalyzer>(type: string, constructor: new (...args: any[]) => T): void;
}

/**
 * Context information passed to analyzers during analysis.
 * Provides metadata and configuration for the analysis process.
 * 
 * @interface AnalysisContext
 * 
 * @example
 * ```typescript
 * const context: AnalysisContext = {
 *   requestId: 'req-123',
 *   timestamp: new Date(),
 *   maxDepth: 10,
 *   timeout: 30000
 * };
 * ```
 */
export interface AnalysisContext {
  /** Unique identifier for this analysis request */
  readonly requestId: string;
  
  /** When the analysis was initiated */
  readonly timestamp: Date;
  
  /** Additional metadata for the analysis */
  readonly metadata?: Record<string, any>;
  
  /** Maximum depth for recursive analysis */
  readonly maxDepth?: number;
  
  /** Filters to apply during analysis */
  readonly filters?: string[];
  
  /** Timeout in milliseconds for the analysis */
  readonly timeout?: number;
}

/**
 * Standard result structure for all analyzer operations.
 * Provides consistent success/failure information with metadata.
 * 
 * @interface AnalysisResult
 * @template T - The type of data returned by the analysis
 * 
 * @example
 * ```typescript
 * const result: AnalysisResult<FileAnalysisData> = {
 *   success: true,
 *   data: { files: [], directories: [] },
 *   warnings: [],
 *   confidence: 0.95,
 *   metadata: { analyzer: 'FileSystemAnalyzer', executionTime: 150 }
 * };
 * ```
 */
export interface AnalysisResult<T = any> {
  /** Whether the analysis was successful */
  readonly success: boolean;
  
  /** The analyzed data (only present if successful) */
  readonly data?: T;
  
  /** Error message (only present if failed) */
  readonly error?: string;
  
  /** Warning messages from the analysis */
  readonly warnings: string[];
  
  /** Confidence level of the analysis (0.0 to 1.0) */
  readonly confidence: number;
  
  /** Metadata about the analysis execution */
  readonly metadata: AnalysisMetadata;
}

/**
 * Metadata about the analysis execution.
 * Provides performance and debugging information.
 * 
 * @interface AnalysisMetadata
 */
export interface AnalysisMetadata {
  /** Name of the analyzer that performed the analysis */
  readonly analyzer: string;
  
  /** Version of the analyzer */
  readonly version: string;
  
  /** Execution time in milliseconds */
  readonly executionTime: number;
  
  /** When the analysis was completed */
  readonly timestamp: Date;
  
  /** Additional context information */
  readonly context?: Record<string, any>;
}

/**
 * Interface for file system analyzers.
 * Specializes the base analyzer for file system operations.
 * 
 * @interface IFileAnalyzer
 */
export interface IFileAnalyzer extends IAnalyzer {
  /**
   * Analyzes a project directory structure.
   * 
   * @param {string} projectPath - Path to the project directory
   * @param {AnalysisContext} context - Analysis context
   * @returns {Promise<IResult<AnalysisResult<IFileAnalysisResult>>>} File analysis result
   */
  analyze(projectPath: string, context: AnalysisContext): Promise<IResult<AnalysisResult<IFileAnalysisResult>>>;
}

/**
 * Interface for programming language analyzers.
 * Provides language-specific analysis capabilities.
 * 
 * @interface ILanguageAnalyzer
 */
export interface ILanguageAnalyzer extends IAnalyzer {
  /** The programming language this analyzer handles */
  readonly language: string;
  
  /** File extensions associated with this language */
  readonly fileExtensions: string[];
  
  /** Package managers used by this language */
  readonly packageManagers: string[];
}

/**
 * Interface for composite analyzers that combine multiple analyzers.
 * Allows chaining and combining analysis results.
 * 
 * @interface ICompositeAnalyzer
 */
export interface ICompositeAnalyzer extends IAnalyzer {
  /**
   * Adds an analyzer to the composite.
   * 
   * @param {IAnalyzer} analyzer - The analyzer to add
   */
  addAnalyzer(analyzer: IAnalyzer): void;
  
  /**
   * Removes an analyzer from the composite.
   * 
   * @param {string} analyzerId - The ID of the analyzer to remove
   */
  removeAnalyzer(analyzerId: string): void;
  
  /**
   * Gets all analyzers in the composite.
   * 
   * @returns {IAnalyzer[]} Array of analyzers
   */
  getAnalyzers(): IAnalyzer[];
}

/**
 * Complete file system analysis result.
 * Contains all discovered files, directories, patterns, and metadata.
 * 
 * @interface IFileAnalysisResult
 */
export interface IFileAnalysisResult {
  /** Array of discovered files */
  readonly files: IFileInfo[];
  
  /** Array of discovered directories */
  readonly directories: IDirectoryInfo[];
  
  /** Array of detected patterns */
  readonly patterns: IDetectedPattern[];
  
  /** Metadata about the file structure */
  readonly metadata: IFileStructureMetadata;
  
  /** Statistical information about the analysis */
  readonly statistics: IFileStatistics;
}

/**
 * Information about a discovered file.
 * 
 * @interface IFileInfo
 */
export interface IFileInfo {
  /** Full path to the file */
  readonly path: string;
  
  /** Name of the file (without path) */
  readonly name: string;
  
  /** File extension (including the dot) */
  readonly extension: string;
  
  /** File size in bytes */
  readonly size: number;
  
  /** Last modification date */
  readonly lastModified: Date;
  
  /** Type of file system entry */
  readonly type: 'file' | 'symlink';
  
  /** File permissions (Unix-style) */
  readonly permissions?: string;
  
  /** File encoding */
  readonly encoding?: string;
  
  /** MIME type of the file */
  readonly mimeType?: string;
}

/**
 * Information about a discovered directory.
 * 
 * @interface IDirectoryInfo
 */
export interface IDirectoryInfo {
  /** Full path to the directory */
  readonly path: string;
  
  /** Name of the directory (without path) */
  readonly name: string;
  
  /** Number of files in the directory */
  readonly fileCount: number;
  
  /** Number of subdirectories */
  readonly subdirectoryCount: number;
  
  /** Total size of all files in the directory (bytes) */
  readonly totalSize: number;
  
  /** Last modification date */
  readonly lastModified: Date;
  
  /** Directory permissions (Unix-style) */
  readonly permissions?: string;
}

/**
 * A pattern detected during analysis.
 * Represents frameworks, tools, or configurations found in the project.
 * 
 * @interface IDetectedPattern
 */
export interface IDetectedPattern {
  /** The actual pattern string that was matched */
  readonly pattern: string;
  
  /** Type of pattern detected */
  readonly type: 'language' | 'framework' | 'build-tool' | 'package-manager' | 'config' | 'architecture' | 'security' | 'deployment';
  
  /** Name of the detected pattern */
  readonly name: string;
  
  /** Confidence level (0.0 to 1.0) */
  readonly confidence: number;
  
  /** Location where the pattern was found */
  readonly location: PatternLocation;
  
  /** Evidence supporting this detection */
  readonly evidence: string[];
  
  /** Additional metadata about the pattern */
  readonly metadata?: Record<string, any>;
}

/**
 * Location information for a detected pattern.
 * 
 * @interface PatternLocation
 */
export interface PatternLocation {
  /** File where the pattern was found */
  readonly file: string;
  
  /** Line number (optional) */
  readonly line?: number;
  
  /** Column number (optional) */
  readonly column?: number;
  
  /** Range of the pattern (optional) */
  readonly range?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

/**
 * Metadata about the overall file structure and project characteristics.
 * 
 * @interface IFileStructureMetadata
 */
export interface IFileStructureMetadata {
  /** Detected project type */
  readonly projectType: string;
  
  /** Programming languages found */
  readonly languages: string[];
  
  /** Frameworks detected */
  readonly frameworks: string[];
  
  /** Build tools identified */
  readonly buildTools: string[];
  
  /** Package managers used */
  readonly packageManagers: string[];
  
  /** Configuration files found */
  readonly configFiles: string[];
}

/**
 * Statistical information about the file analysis.
 * 
 * @interface IFileStatistics
 */
export interface IFileStatistics {
  /** Total number of files found */
  readonly totalFiles: number;
  
  /** Total number of directories found */
  readonly totalDirectories: number;
  
  /** Total size of all files (bytes) */
  readonly totalSize: number;
  
  /** Time taken for analysis (milliseconds) */
  readonly analysisTime: number;
  
  /** Count of files by type/extension */
  readonly fileTypes: Record<string, number>;
  
  /** Largest files found */
  readonly largestFiles: Array<{ path: string; size: number }>;
}

/**
 * Information about a language-specific project.
 * Contains details about dependencies, scripts, and configuration.
 * 
 * @interface ILanguageProjectInfo
 */
export interface ILanguageProjectInfo {
  /** Programming language */
  readonly language: string;
  
  /** Language version */
  readonly version?: string;
  
  /** Primary package manager */
  readonly packageManager: string;
  
  /** Frameworks used in the project */
  readonly frameworks: string[];
  
  /** Runtime dependencies */
  readonly dependencies: DependencyInfo[];
  
  /** Development dependencies */
  readonly devDependencies: DependencyInfo[];
  
  /** Available scripts */
  readonly scripts: IProjectScript[];
  
  /** Project configuration */
  readonly configuration: Record<string, any>;
}


/**
 * Information about a project script.
 * 
 * @interface IProjectScript
 */
export interface IProjectScript {
  /** Name of the script */
  readonly name: string;
  
  /** Command to execute */
  readonly command: string;
  
  /** Optional description */
  readonly description?: string;
  
  /** Category of the script */
  readonly category: 'build' | 'test' | 'dev' | 'deploy' | 'lint' | 'other';
}

/**
 * Strategy for executing multiple analyzers in a composite analyzer.
 * 
 * @interface IExecutionStrategy
 */
export interface IExecutionStrategy {
  /** Name of the execution strategy */
  readonly name: string;
  
  /**
   * Executes multiple analyzers according to this strategy.
   * 
   * @param {IAnalyzer[]} analyzers - Array of analyzers to execute
   * @param {any} input - Input to analyze
   * @param {AnalysisContext} context - Analysis context
   * @returns {Promise<IResult<AnalysisResult<any>[]>>} Results from all analyzers
   */
  execute(analyzers: IAnalyzer[], input: any, context: AnalysisContext): Promise<IResult<AnalysisResult<any>[]>>;
}

/**
 * Interface for project-level analyzers.
 * Provides high-level project analysis capabilities.
 * 
 * @interface IProjectAnalyzer
 */
export interface IProjectAnalyzer {
  /**
   * Analyzes an entire project.
   * 
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<ProjectAnalysisResult>} Complete project analysis
   */
  analyzeProject(projectPath: string): Promise<ProjectAnalysisResult>;
  
  /**
   * Detects the framework used in the project.
   * 
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<FrameworkDetectionResult>} Framework detection result
   */
  detectFramework(projectPath: string): Promise<ComprehensiveFrameworkDetectionResult>;
  
  /**
   * Analyzes project dependencies.
   * 
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<DependencyAnalysisResult>} Dependency analysis result
   */
  analyzeDependencies(projectPath: string): Promise<BasicDependencyAnalysisResult>;
}

/**
 * Result of project analysis.
 * 
 * @interface ProjectAnalysisResult
 */
export interface ProjectAnalysisResult {
  /** Whether the analysis was successful */
  readonly success: boolean;
  
  /** Type of project detected */
  readonly projectType: string;
  
  /** Framework used in the project */
  readonly framework?: string;
  
  /** Primary programming language */
  readonly language: string;
  
  /** List of dependencies */
  readonly dependencies: string[];
  
  /** Patterns detected in the project */
  readonly patterns: IDetectedPattern[];
  
  /** Additional metadata */
  readonly metadata: Record<string, any>;
  
  /** Recommendations for the project */
  readonly recommendations: string[];
}

/**
 * Result of framework detection with version information.
 * 
 * @interface FrameworkDetectionWithVersionResult
 */
export interface FrameworkDetectionWithVersionResult {
  /** Detected framework name */
  readonly framework?: string;
  
  /** Confidence level (0.0 to 1.0) */
  readonly confidence: number;
  
  /** Indicators that led to this detection */
  readonly indicators: string[];
  
  /** Framework version (if detected) */
  readonly version?: string;
}

/**
 * Basic dependency analysis result.
 * 
 * @interface BasicDependencyAnalysisResult
 */
export interface BasicDependencyAnalysisResult {
  /** Runtime dependencies */
  readonly dependencies: DependencyInfo[];
  
  /** Development dependencies */
  readonly devDependencies: DependencyInfo[];
  
  /** Security vulnerabilities found */
  readonly vulnerabilities: VulnerabilityInfo[];
  
  /** Outdated packages */
  readonly outdated: OutdatedInfo[];
}

/**
 * Information about a dependency.
 * 
 * @interface DependencyInfo
 */
export interface DependencyInfo {
  /** Name of the dependency */
  readonly name: string;
  
  /** Version specification */
  readonly version: string;
  
  /** Type of dependency */
  readonly type: 'runtime' | 'dev' | 'peer' | 'optional';
  
  /** Source of the dependency */
  readonly source: string;
}


/**
 * Information about an outdated package.
 * 
 * @interface OutdatedInfo
 */
export interface OutdatedInfo {
  /** Package name */
  readonly package: string;
  
  /** Current version */
  readonly current: string;
  
  /** Wanted version */
  readonly wanted: string;
  
  /** Latest available version */
  readonly latest: string;
}