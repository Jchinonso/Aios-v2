/**
 * @fileoverview Core Adapters - Adapter implementations for external dependencies
 * 
 * This module provides adapter implementations that bridge external services
 * with the file-system module's interfaces, enabling dependency injection
 * and loose coupling.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type {
  IFileSystemLogger,
  IFileSystemMetrics,
  ILanguageDetector,
  IFileSystemOperations,
  IFileScanner,
  IUnifiedAnalyzerDependencies,
  IPackageManagerDependencies
} from '../types/core-interfaces.js';

// Import external services
import type { ILogger as CoreLogger } from '../../../core/logging/logger.interface.js'
import type { IMetricsCollector as CoreMetrics } from '../../../core/metrics/metrics.interface.js'
import { FileSystemService } from '../services/file-system-service.js'
import { getSupportedLanguages, getLanguageDefinition, getFrameworkPatterns } from '../config/analyzer-config/index.js'
import * as path from 'path'

/**
 * Production-ready language detector using file extension analysis
 *
 * Strategy:
 * 1. Scans project files and analyzes extensions
 * 2. Maps extensions to languages via configuration
 * 3. Counts file occurrences per language
 * 4. Returns language with highest file count
 *
 * Type Safety: All return types strictly typed
 * Error Handling: Graceful degradation to 'unknown'
 * Performance: Avoids reading file contents, only analyzes names
 */
class RealLanguageDetector implements ILanguageDetector {
  /**
   * Detects primary programming language by analyzing file extensions
   *
   * @param projectPath - Absolute path to project directory
   * @param logger - Optional logger for diagnostics
   * @returns Language detection result with confidence score
   *
   * @example
   * const result = await detector.detectLanguage('/path/to/project');
   * // { language: 'typescript', confidence: 0.85 }
   */
  async detectLanguage(
    projectPath: string,
    logger?: IFileSystemLogger
  ): Promise<{ language: string; confidence: number }> {
    try {
      const files = await FileSystemService.getProjectFiles(projectPath);

      if (files.length === 0) {
        logger?.warn?.('No files found in project', { projectPath });
        return { language: 'unknown', confidence: 0.0 };
      }

      // Extract extensions and count occurrences per language
      const extensions = files
        .map(f => f.split('.').pop()?.toLowerCase())
        .filter((ext): ext is string => Boolean(ext));

      const languageCounts = new Map<string, number>();

      for (const ext of extensions) {
        const langDef = getLanguageDefinition(ext);
        if (langDef) {
          const count = languageCounts.get(langDef.name) ?? 0;
          languageCounts.set(langDef.name, count + 1);
        }
      }

      if (languageCounts.size === 0) {
        logger?.info?.('No recognized language extensions found', { projectPath });
        return { language: 'unknown', confidence: 0.0 };
      }

      // Find language with most files
      const [primaryLanguage, fileCount] = Array.from(languageCounts.entries())
        .reduce((max, entry) => entry[1] > max[1] ? entry : max);

      // Calculate confidence: (primary language files / total recognized files)
      const totalRecognized = Array.from(languageCounts.values()).reduce((sum, c) => sum + c, 0);
      const confidence = Math.min(fileCount / totalRecognized, 1.0);

      logger?.info?.('Language detected', {
        projectPath,
        language: primaryLanguage,
        confidence,
        fileCount,
        totalFiles: files.length
      });

      return { language: primaryLanguage, confidence };

    } catch (error) {
      logger?.error?.('Language detection failed', error as Error, { projectPath });
      return { language: 'unknown', confidence: 0.0 };
    }
  }

  /**
   * Detects framework by analyzing dependencies, config files, and code patterns
   *
   * @param projectPath - Absolute path to project directory
   * @param language - Programming language (from detectLanguage)
   * @param logger - Optional logger for diagnostics
   * @returns Framework detection result
   *
   * @example
   * const result = await detector.detectFramework('/path', 'javascript');
   * // { framework: 'nextjs', confidence: 0.9 }
   */
  async detectFramework(
    projectPath: string,
    language: string,
    logger?: IFileSystemLogger
  ): Promise<{ framework: string | null; confidence: number }> {
    try {
      const frameworkPatterns = getFrameworkPatterns(language);

      if (frameworkPatterns.length === 0) {
        return { framework: null, confidence: 0.0 };
      }

      const projectFiles = await FileSystemService.getProjectFiles(projectPath);

      // Parse package.json if exists (for JS/TS projects)
      let packageJson: Record<string, any> | null = null;
      const packageJsonPath = path.join(projectPath, 'package.json');

      if (await FileSystemService.fileExists(packageJsonPath)) {
        try {
          const content = await FileSystemService.readFileContent(packageJsonPath);
          packageJson = JSON.parse(content);
        } catch (error) {
          logger?.warn?.('Failed to parse package.json', { projectPath });
        }
      }

      let bestMatch: { framework: string; confidence: number } = {
        framework: 'none',
        confidence: 0.0
      };

      // Score each framework pattern
      for (const pattern of frameworkPatterns) {
        let score = 0.0;

        // Check dependencies (40% weight)
        if (packageJson && pattern.dependencies) {
          const hasDep = pattern.dependencies.some(dep =>
            packageJson!['dependencies']?.[dep] || packageJson!['devDependencies']?.[dep]
          );
          if (hasDep) score += 0.4;
        }

        // Check config files (30% weight)
        if (pattern.files) {
          const foundFiles = pattern.files.filter(file =>
            projectFiles.some(pf => pf.includes(file))
          );
          if (foundFiles.length > 0) {
            score += 0.3 * (foundFiles.length / pattern.files.length);
          }
        }

        // Check code patterns (30% weight)
        if (pattern.patterns && pattern.patterns.length > 0) {
          const sourceFiles = projectFiles.filter(f =>
            /\.(js|ts|jsx|tsx|py|java|go|rs|php|rb)$/.test(f)
          ).slice(0, 5); // Limit to 5 files for performance

          let matches = 0;
          for (const sourceFile of sourceFiles) {
            try {
              const content = await FileSystemService.readFileContent(sourceFile);
              const hasPattern = pattern.patterns.some(regex =>
                new RegExp(regex, 'i').test(content)
              );
              if (hasPattern) matches++;
            } catch {
              // Skip unreadable files
            }
          }

          if (sourceFiles.length > 0) {
            score += 0.3 * (matches / sourceFiles.length);
          }
        }

        if (score > bestMatch.confidence) {
          bestMatch = { framework: pattern.name, confidence: score };
        }
      }

      const result = bestMatch.confidence > 0.3
        ? { framework: bestMatch.framework, confidence: bestMatch.confidence }
        : { framework: null, confidence: 0.0 };

      logger?.info?.('Framework detection complete', { projectPath, language, ...result });

      return result;

    } catch (error) {
      logger?.error?.('Framework detection failed', error as Error, { projectPath, language });
      return { framework: null, confidence: 0.0 };
    }
  }

  getSupportedLanguages(): string[] {
    return getSupportedLanguages();
  }

  isLanguageSupported(language: string): boolean {
    return getSupportedLanguages().includes(language);
  }
}

/**
 * Logger adapter that wraps the core logger
 */
export class LoggerAdapter implements IFileSystemLogger {
  constructor(private coreLogger: CoreLogger) {}

  info(message: string, context?: Record<string, any>): void {
    this.coreLogger.info(message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.coreLogger.warn(message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.coreLogger.error(message, error, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.coreLogger.debug(message, context);
  }
}

/**
 * Metrics adapter that wraps the core metrics collector
 */
export class MetricsAdapter implements IFileSystemMetrics {
  constructor(private coreMetrics: CoreMetrics) {}

  increment(name: string, tags?: Record<string, string>): void {
    this.coreMetrics.increment(name, tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.coreMetrics.gauge(name, value, tags);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.coreMetrics.histogram(name, value, tags);
  }

  timing(name: string, value: number, tags?: Record<string, string>): void {
    this.coreMetrics.timing(name, value, tags);
  }
}

/**
 * Language detection adapter that wraps the language detection service
 */
export class LanguageDetectionAdapter implements ILanguageDetector {
  // LanguageDetectionService removed - this adapter is no longer needed
  // Analyzers handle their own language detection directly
  
  constructor() {
    // No longer needs LanguageDetectionService
  }

  async detectLanguage(_projectPath: string, logger?: IFileSystemLogger): Promise<{
    language: string;
    confidence: number;
  }> {
    // This method is no longer used - analyzers detect languages directly
    logger?.warn?.('LanguageDetectionAdapter.detectLanguage is deprecated - use analyzer language detection directly');
    return { language: 'unknown', confidence: 0 };
  }

  async detectFramework(_projectPath: string, _language: string, logger?: IFileSystemLogger): Promise<{
    framework: string | null;
    confidence: number;
  }> {
    // This method is no longer used - analyzers detect frameworks directly
    logger?.warn?.('LanguageDetectionAdapter.detectFramework is deprecated - use analyzer framework detection directly');
    return { framework: null, confidence: 0 };
  }

  getSupportedLanguages(): string[] {
    // Return empty array - analyzers handle their own language support
    return [];
  }

  isLanguageSupported(_language: string): boolean {
    // Return false - analyzers handle their own language support
    return false;
  }
}

/**
 * File system operations adapter that wraps the file system service
 */
export class FileSystemOperationsAdapter implements IFileSystemOperations {
  // @ts-expect-error - Reserved for instance-level file system service operations
  constructor(private readonly _fileSystemService: FileSystemService) {}

  async fileExists(filePath: string): Promise<boolean> {
    return await FileSystemService.fileExists(filePath);
  }

  async readFileContent(filePath: string): Promise<string> {
    return await FileSystemService.readFileContent(filePath);
  }

  async scanDirectory(dirPath: string, options?: {
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
  }> {
    const result = await FileSystemService.scanDirectory(dirPath, options);
    return {
      files: result.files.map((f: any) => ({
        filePath: f.filePath,
        size: f.size,
        isDirectory: false
      })),
      directories: result.directories.map((d: any) => ({
        filePath: d.filePath,
        size: d.size
      }))
    };
  }
}

/**
 * File scanner adapter that wraps the file scanner service
 */
export class FileScannerAdapter implements IFileScanner {
  constructor() {}

  async scanProject(projectPath: string, options?: {
    excludeDirectories?: string[];
    includePatterns?: string[];
  }): Promise<{
    files: Array<{
      filePath: string;
      language: string;
      dependencies: string[];
      metadata: Record<string, any>;
    }>;
  }> {
    const result = await FileSystemService.scanDirectory(projectPath, options);
    return {
      files: result.files.map((f: any) => ({
        filePath: f.path,
        language: 'unknown', // FileSystemService doesn't do language detection
        dependencies: [],
        metadata: {
          size: f.size,
          isDirectory: f.isDirectory,
          lastModified: f.lastModified
        }
      }))
    };
  }
}

/**
 * Unified Analyzer specific adapter
 */
export class UnifiedAnalyzerAdapter implements IUnifiedAnalyzerDependencies {
  public readonly logger: IFileSystemLogger;
  public readonly metrics: IFileSystemMetrics;
  public readonly languageDetector: ILanguageDetector;
  public readonly fileSystem: IFileSystemOperations;

  constructor(
    coreLogger: CoreLogger,
    coreMetrics: CoreMetrics,
    fileSystemService: FileSystemService
  ) {
    this.logger = new LoggerAdapter(coreLogger);
    this.metrics = new MetricsAdapter(coreMetrics);
    this.languageDetector = new RealLanguageDetector();
    this.fileSystem = new FileSystemOperationsAdapter(fileSystemService);
  }
}

/**
 * Package Manager specific adapter
 */
export class PackageManagerAdapter implements IPackageManagerDependencies {
  public readonly logger: IFileSystemLogger;
  public readonly metrics: IFileSystemMetrics;
  public readonly languageDetector: ILanguageDetector;
  public readonly fileSystem: IFileSystemOperations;

  constructor(
    coreLogger: CoreLogger,
    coreMetrics: CoreMetrics,
    fileSystemService: FileSystemService
  ) {
    this.logger = new LoggerAdapter(coreLogger);
    this.metrics = new MetricsAdapter(coreMetrics);
    this.languageDetector = new RealLanguageDetector();
    this.fileSystem = new FileSystemOperationsAdapter(fileSystemService);
  }
}

/**
 * Dependency container that provides all adapters
 */
export class FileSystemDependencyContainer {
  public readonly logger: IFileSystemLogger;
  public readonly metrics: IFileSystemMetrics;
  public readonly languageDetector: ILanguageDetector;
  public readonly fileSystem: IFileSystemOperations;
  public readonly fileScanner: IFileScanner;

  constructor(
    coreLogger: CoreLogger,
    coreMetrics: CoreMetrics,
    fileSystemService: FileSystemService
  ) {
    this.logger = new LoggerAdapter(coreLogger);
    this.metrics = new MetricsAdapter(coreMetrics);
    this.languageDetector = new RealLanguageDetector();
    this.fileSystem = new FileSystemOperationsAdapter(fileSystemService);
    this.fileScanner = new FileScannerAdapter();
  }

  /**
   * Create Unified Analyzer dependencies
   */
  createUnifiedAnalyzerDependencies(): IUnifiedAnalyzerDependencies {
    return new UnifiedAnalyzerAdapter(
      this.logger as any,
      this.metrics as any,
      new FileSystemService()
    );
  }

  /**
   * Create Package Manager dependencies
   */
  createPackageManagerDependencies(): IPackageManagerDependencies {
    return new PackageManagerAdapter(
      this.logger as any,
      this.metrics as any,
      new FileSystemService()
    );
  }
}
