/**
 * File System Service - Centralized file system operations
 * 
 * This service consolidates all file system operations to eliminate redundancy
 * across analyzers. It provides a unified interface for file operations with
 * caching, error handling, and performance optimizations.
 * 
 * Following SOLID Principles:
 * - SRP: Single responsibility for file system operations
 * - OCP: Open for extension through new file operations
 * - LSP: All file operations are substitutable
 * - ISP: Focused interfaces for different file concerns
 * - DIP: Depends on abstractions, not concretions
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ILogger } from '../../../core/logging/logger.interface.js'
import { DEFAULT_ANALYZER_CONFIG } from '../config/analyzer-config/index.js'
import type { AnalyzerConfig, FileSystemConfig } from '../../types/config.types.js'
import type {
  FileScanOptions,
  FileInfo,
  DirectoryScanResult,
  FileContentCacheEntry
} from '../../types/file-system.types.js';


/**
 * Comprehensive file system service with caching and optimization
 */
export class FileSystemService {
  private static config: AnalyzerConfig = DEFAULT_ANALYZER_CONFIG;
  private static fileCache = new Map<string, FileContentCacheEntry>();
  private static logger: ILogger | null = null;

  /**
   * Initialize the service with logger and optional configuration
   */
  static initialize(logger: ILogger, config?: AnalyzerConfig): void {
    this.logger = logger;
    if (config) {
      this.config = config;
    }
  }

  /**
   * Get the current file system configuration
   */
  static getConfig(): FileSystemConfig {
    return this.config.fileSystem;
  }

  /**
   * Clear the file cache
   */
  static clearCache(): void {
    this.fileCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.fileCache.size,
      entries: Array.from(this.fileCache.keys())
    };
  }

  /**
   * Scan a directory and return file information
   */
  static async scanDirectory(
    dirPath: string, 
    options: FileScanOptions = {}
  ): Promise<DirectoryScanResult> {
    const config = this.getConfig();
    const {
      includeHidden = config.includeHidden || false,
      maxDepth = config.maxDepth || 10,
      excludePatterns = [],
      includePatterns = [],
      excludeDirectories = config.excludePatterns || []
    } = options;

    const startTime = Date.now();
    const files: FileInfo[] = [];
    const directories: FileInfo[] = [];
    let totalSize = 0;

    try {
      await this.scanDirectoryRecursive(
        dirPath,
        dirPath,
        files,
        directories,
        excludeDirectories,
        excludePatterns,
        includePatterns,
        includeHidden,
        maxDepth,
        0,
        totalSize
      );

    return {
      files,
      directories,
      totalFiles: files.length,
      totalDirectories: directories.length,
      totalSize,
      scanDuration: Date.now() - startTime
    };
    } catch (error) {
      this.logger?.error('Directory scan failed', error as Error);
      return {
        files: [],
        directories: [],
        totalFiles: 0,
        totalDirectories: 0,
        totalSize: 0,
        scanDuration: 0
      };
    }
  }

  /**
   * Get all files in a directory recursively (returns full paths)
   */
  static async getProjectFiles(projectPath: string): Promise<string[]> {
    const config = this.getConfig();
    const excludeDirs = config.excludePatterns || [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.cache',
      'out',
      '.turbo'
    ];

    const files: string[]= [];

    async function scanDirectory(dirPath: string): Promise<void> {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            // Skip excluded directories
            if (!excludeDirs.includes(entry.name)) {
              await scanDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read (permissions, etc.)
      }
    }

    try {
      await scanDirectory(projectPath);
      return files;
    } catch (error) {
      this.logger?.error('Failed to get project files', error as Error);
      return [];
    }
  }

  /**
   * Read file content with caching
   *
   * Safety features:
   * - Checks file size before reading to prevent OOM
   * - Caches only files under maxFileSize
   * - Throws error for files exceeding safety limit
   *
   * @param filePath - Absolute path to file
   * @returns File content as string
   * @throws Error if file too large or unreadable
   */
  static async readFileContent(filePath: string): Promise<string> {
    try {
      // Check cache first
      const cached = this.fileCache.get(filePath);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.content;
      }

      const config = this.getConfig();
      const maxFileSize = config.maxFileSize || 10 * 1024 * 1024; // 10MB default

      // Check file size BEFORE reading (prevent memory exhaustion)
      const stats = await fs.stat(filePath);

      if (stats.size > maxFileSize) {
        const errorMsg = `File too large to read: ${(stats.size / 1024 / 1024).toFixed(2)}MB exceeds limit of ${(maxFileSize / 1024 / 1024).toFixed(2)}MB`;
        this.logger?.warn(errorMsg, { filePath, size: stats.size, maxSize: maxFileSize });
        throw new Error(errorMsg);
      }

      // Safe to read - file size is within limits
      const content = await fs.readFile(filePath, 'utf-8');

      // Cache only if file is reasonably sized (under 1MB for cache efficiency)
      const cacheThreshold = Math.min(maxFileSize, 1024 * 1024);
      if (content.length <= cacheThreshold) {
        this.cacheFileContent(filePath, content);
      }

      return content;
    } catch (error) {
      this.logger?.error('Failed to read file content', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Read file content without caching
   */
  static async readFileContentUncached(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      this.logger?.error('Failed to read file content (uncached)', error as Error);
      throw error;
    }
  }

  /**
   * Check if a file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   */
  static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get file statistics
   */
  static async getFileStats(filePath: string): Promise<FileInfo | null> {
    try {
      const stats = await fs.stat(filePath);
      const relativePath = path.relative(process.cwd(), filePath);
      
      return {
        name: path.basename(filePath),
        path: filePath,
        relativePath,
        size: stats.size,
        extension: path.extname(filePath),
        isDirectory: stats.isDirectory(),
        lastModified: stats.mtime
      };
    } catch (error) {
      this.logger?.error('Failed to get file stats', error as Error);
      return null;
    }
  }

  /**
   * Find files by pattern
   */
  static async findFilesByPattern(
    dirPath: string, 
    patterns: string[], 
    options: FileScanOptions = {}
  ): Promise<string[]> {
    const result = await this.scanDirectory(dirPath, {
      ...options,
      includePatterns: patterns
    });
    
    return result.files.map(file => file.relativePath);
  }

  /**
   * Find files by extension
   */
  static async findFilesByExtension(
    dirPath: string, 
    extensions: string[], 
    options: FileScanOptions = {}
  ): Promise<string[]> {
    const result = await this.scanDirectory(dirPath, options);
    
    return result.files
      .filter(file => extensions.includes(file.extension))
      .map(file => file.relativePath);
  }

  /**
   * Find manifest files
   */
  static async findManifestFiles(
    dirPath: string, 
    manifestFiles: string[]
  ): Promise<string[]> {
    const files = await this.getProjectFiles(dirPath);
    return manifestFiles.filter(file => files.includes(file));
  }

  /**
   * Get file size
   */
  static async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Get directory size
   */
  static async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const result = await this.scanDirectory(dirPath);
      return result.totalSize;
    } catch {
      return 0;
    }
  }

  /**
   * Check if path should be excluded
   */
  static shouldExcludePath(
    path: string, 
    excludeDirectories: string[], 
    excludePatterns: string[]
  ): boolean {
    const pathParts = path.split(/[/\\]/);
    
    // Check directory exclusions
    for (const part of pathParts) {
      if (excludeDirectories.includes(part)) {
        return true;
      }
    }

    // Check pattern exclusions
    for (const pattern of excludePatterns) {
      if (path.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if path matches include patterns
   */
  static matchesIncludePatterns(path: string, includePatterns: string[]): boolean {
    if (includePatterns.length === 0) return true;
    
    return includePatterns.some(pattern => path.includes(pattern));
  }

  /**
   * Recursive directory scanning
   */
  private static async scanDirectoryRecursive(
    dirPath: string,
    rootPath: string,
    files: FileInfo[],
    directories: FileInfo[],
    excludeDirectories: string[],
    excludePatterns: string[],
    includePatterns: string[],
    includeHidden: boolean,
    maxDepth: number,
    currentDepth: number,
    totalSize: number
  ): Promise<void> {
    if (currentDepth >= maxDepth) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);

        // Skip hidden files/directories if not included
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        // Check exclusions
        if (this.shouldExcludePath(relativePath, excludeDirectories, excludePatterns)) {
          continue;
        }

        // Check include patterns
        if (!this.matchesIncludePatterns(relativePath, includePatterns)) {
          continue;
        }

        try {
          const stats = await fs.stat(fullPath);
          const fileInfo: FileInfo = {
            name: entry.name,
            path: fullPath,
            relativePath,
            size: stats.size,
            extension: path.extname(entry.name),
            isDirectory: stats.isDirectory(),
            lastModified: stats.mtime
          };

          if (entry.isDirectory()) {
            directories.push(fileInfo);
            await this.scanDirectoryRecursive(
              fullPath,
              rootPath,
              files,
              directories,
              excludeDirectories,
              excludePatterns,
              includePatterns,
              includeHidden,
              maxDepth,
              currentDepth + 1,
              totalSize
            );
          } else {
            files.push(fileInfo);
            totalSize += stats.size;
          }
        } catch (error) {
          this.logger?.warn('Failed to process file/directory', { 
            path: fullPath, 
            error: (error as Error).message 
          });
        }
      }
    } catch (error) {
      this.logger?.error('Failed to scan directory', error as Error);
    }
  }

  /**
   * Cache file content
   */
  private static cacheFileContent(filePath: string, content: string): void {
    const config = this.getConfig();
    const ttl = config.cacheTtlMs || 300000; // 5 minutes default
    
    // Limit cache size
    if (this.fileCache.size >= (config.cacheSizeLimit || 100)) {
      const firstKey = this.fileCache.keys().next().value;
      if (firstKey) {
        this.fileCache.delete(firstKey);
      }
    }

    this.fileCache.set(filePath, {
      path: filePath,
      content,
      timestamp: Date.now(),
      ttl,
      size: content.length
    });
  }

  /**
   * Get files matching specific patterns
   */
  static async getFilesByPattern(projectPath: string, patterns: string[]): Promise<FileInfo[]> {
    const result = await this.scanDirectory(projectPath, {
      includePatterns: patterns
    });
    return result.files;
  }

  /**
   * Get configuration files in a project
   */
  static async getConfigFiles(projectPath: string): Promise<FileInfo[]> {
    const configPatterns = [
      '*.json', '*.js', '*.ts', '*.config.*', '*.toml', '*.yaml', '*.yml',
      'package.json', 'tsconfig.json', 'webpack.config.*', 'vite.config.*',
      'rollup.config.*', 'jest.config.*', 'babel.config.*', 'eslint.config.*',
      'prettier.config.*', 'tailwind.config.*', 'next.config.*', 'nuxt.config.*',
      'vue.config.*', 'angular.json', 'svelte.config.*', 'astro.config.*'
    ];
    
    return this.getFilesByPattern(projectPath, configPatterns);
  }

  /**
   * Get manifest files (package.json, requirements.txt, etc.)
   */
  static async getManifestFiles(projectPath: string): Promise<FileInfo[]> {
    const manifestPatterns = [
      'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile', 'poetry.lock',
      'pom.xml', 'build.gradle', 'build.gradle.kts', 'go.mod', 'go.sum',
      'Cargo.toml', 'Cargo.lock', 'composer.json', 'composer.lock',
      'Gemfile', 'Gemfile.lock', '*.csproj', '*.vbproj', '*.fsproj'
    ];
    
    return this.getFilesByPattern(projectPath, manifestPatterns);
  }

  /**
   * Get lock files for dependency analysis
   */
  static async getLockFiles(projectPath: string): Promise<FileInfo[]> {
    const lockPatterns = [
      'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock',
      'Cargo.lock', 'composer.lock', 'Gemfile.lock', 'go.sum'
    ];
    
    return this.getFilesByPattern(projectPath, lockPatterns);
  }

  /**
   * Check if a project has test files
   */
  static async hasTestFiles(projectPath: string): Promise<boolean> {
    const testPatterns = [
      '**/*.test.*', '**/*.spec.*', '**/*_test.*', '**/test/**', '**/tests/**',
      '**/__tests__/**', '**/spec/**', '**/specs/**', '**/*.test.js', '**/*.test.ts',
      '**/*.test.jsx', '**/*.test.tsx', '**/*.test.py', '**/*.test.java'
    ];
    
    const testFiles = await this.getFilesByPattern(projectPath, testPatterns);
    return testFiles.length > 0;
  }

  /**
   * Get test directories
   */
  static async getTestDirectories(projectPath: string): Promise<FileInfo[]> {
    const result = await this.scanDirectory(projectPath);
    return result.directories.filter(dir => 
      ['test', 'tests', '__tests__', 'spec', 'specs'].includes(dir.name.toLowerCase())
    );
  }

  /**
   * Get source directories
   */
  static async getSourceDirectories(projectPath: string): Promise<FileInfo[]> {
    const result = await this.scanDirectory(projectPath);
    return result.directories.filter(dir => 
      ['src', 'source', 'lib', 'app', 'components', 'pages'].includes(dir.name.toLowerCase())
    );
  }
}
