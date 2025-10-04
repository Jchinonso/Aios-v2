/**
 * @fileoverview Core Interfaces - File-system specific interfaces for dependency injection
 * 
 * This module defines interfaces that abstract external dependencies, allowing
 * the file-system module to remain loosely coupled while maintaining functionality.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

/**
 * File-system specific logger interface
 */
export interface IFileSystemLogger {
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
}

/**
 * File-system specific metrics interface
 */
export interface IFileSystemMetrics {
  increment(name: string, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  timing(name: string, value: number, tags?: Record<string, string>): void;
}

/**
 * Language detection interface
 */
export interface ILanguageDetector {
  detectLanguage(projectPath: string, logger?: IFileSystemLogger): Promise<{
    language: string;
    confidence: number;
  }>;
  
  detectFramework(projectPath: string, language: string, logger?: IFileSystemLogger): Promise<{
    framework: string | null;
    confidence: number;
  }>;
  
  getSupportedLanguages(): string[];
  isLanguageSupported(language: string): boolean;
}

/**
 * File system operations interface
 */
export interface IFileSystemOperations {
  fileExists(filePath: string): Promise<boolean>;
  readFileContent(filePath: string): Promise<string>;
  scanDirectory(dirPath: string, options?: {
    maxDepth?: number;
    excludePatterns?: string[];
    includeHidden?: boolean;
  }): Promise<{
    files: Array<{
      filePath: string;
      size: number;
      isDirectory: boolean;
    }>;
    directories: Array<{
      filePath: string;
      size: number;
    }>;
  }>;
}

/**
 * File scanner interface
 */
export interface IFileScanner {
  scanProject(projectPath: string, options?: {
    excludeDirectories?: string[];
    includePatterns?: string[];
  }): Promise<{
    files: Array<{
      filePath: string;
      language: string;
      dependencies: string[];
      metadata: Record<string, any>;
    }>;
  }>;
}

/**
 * Unified Analyzer specific dependencies
 */
export interface IUnifiedAnalyzerDependencies {
  logger: IFileSystemLogger;
  metrics: IFileSystemMetrics;
  languageDetector: ILanguageDetector;
  fileSystem?: IFileSystemOperations; // Optional since we use FileSystemService directly
}

/**
 * Package Manager specific dependencies  
 */
export interface IPackageManagerDependencies {
  logger: IFileSystemLogger;
  metrics: IFileSystemMetrics;
  languageDetector: ILanguageDetector;
  fileSystem: IFileSystemOperations;
}

/**
 * Dependency injection container interface
 */
export interface IFileSystemDependencies {
  logger: IFileSystemLogger;
  metrics: IFileSystemMetrics;
  languageDetector: ILanguageDetector;
  fileSystem: IFileSystemOperations;
  fileScanner: IFileScanner;
}
