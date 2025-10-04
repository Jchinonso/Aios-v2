/**
 * @fileoverview File Collection Service
 * @description Centralized service for collecting project files for deployment
 *
 * Provides consistent file collection logic used by all cloud providers,
 * eliminating duplication across Vercel, Netlify, and other providers.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Collected file representation
 */
export interface CollectedFile {
  /** Relative path from project root */
  readonly path: string;
  /** File content as buffer */
  readonly content: Buffer;
  /** SHA-256 hash of file content */
  readonly sha: string;
  /** File size in bytes */
  readonly size: number;
}

/**
 * File collection options
 */
export interface FileCollectionOptions {
  /** Directories to skip (default: common build/deps folders) */
  readonly skipDirs?: readonly string[];
  /** Files to skip by pattern */
  readonly skipPatterns?: readonly RegExp[];
  /** Maximum file size in bytes (default: 50MB) */
  readonly maxFileSize?: number;
  /** Whether to include hidden files (default: false) */
  readonly includeHidden?: boolean;
  /** Custom filter function */
  readonly customFilter?: (filePath: string) => boolean;
}

/**
 * File collection result
 */
export interface FileCollectionResult {
  /** Collected files */
  readonly files: readonly CollectedFile[];
  /** Total size in bytes */
  readonly totalSize: number;
  /** Number of files collected */
  readonly fileCount: number;
  /** Number of files skipped */
  readonly skippedCount: number;
  /** Errors encountered during collection */
  readonly errors: readonly string[];
}

/**
 * Default directories to skip during file collection
 */
const DEFAULT_SKIP_DIRS = [
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  '.cache',
  'coverage',
  '.vscode',
  '.idea',
  '__pycache__',
  '.pytest_cache',
  'venv',
  'env',
  '.env',
  'target', // Rust
  'pkg', // Go
  'vendor', // Go/PHP
] as const;

/**
 * Default skip patterns
 */
const DEFAULT_SKIP_PATTERNS = [
  /\.log$/,
  /\.lock$/,
  /^\.DS_Store$/,
  /^Thumbs\.db$/,
  /\.swp$/,
  /~$/,
] as const;

/**
 * Default maximum file size (50MB)
 */
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * File Collection Service
 *
 * Centralized service for collecting project files for deployment.
 * Used by all cloud providers to ensure consistent file handling.
 */
export class FileCollectionService {
  /**
   * Collect all project files for deployment
   *
   * @param projectPath - Absolute path to project root
   * @param options - Collection options
   * @returns File collection result
   *
   * @example
   * ```typescript
   * const service = new FileCollectionService();
   * const result = await service.collectFiles('/path/to/project');
   * console.log(`Collected ${result.fileCount} files (${result.totalSize} bytes)`);
   * ```
   */
  public async collectFiles(
    projectPath: string,
    options: FileCollectionOptions = {}
  ): Promise<FileCollectionResult> {
    const skipDirs = options.skipDirs ?? DEFAULT_SKIP_DIRS;
    const skipPatterns = options.skipPatterns ?? DEFAULT_SKIP_PATTERNS;
    const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
    const includeHidden = options.includeHidden ?? false;

    const files: CollectedFile[] = [];
    const errors: string[] = [];
    let skippedCount = 0;

    await this.scanDirectory(
      projectPath,
      projectPath,
      files,
      errors,
      {
        skipDirs,
        skipPatterns,
        maxFileSize,
        includeHidden,
        ...(options.customFilter ? { customFilter: options.customFilter } : {}),
      },
      (skipped) => { skippedCount += skipped; }
    );

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
      files,
      totalSize,
      fileCount: files.length,
      skippedCount,
      errors,
    };
  }

  /**
   * Recursively scan directory and collect files
   */
  private async scanDirectory(
    dir: string,
    baseDir: string,
    files: CollectedFile[],
    errors: string[],
    options: Required<Omit<FileCollectionOptions, 'customFilter'>> & {
      customFilter?: (filePath: string) => boolean;
    },
    onSkipped: (count: number) => void
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        // Skip hidden files if not included
        if (!options.includeHidden && entry.name.startsWith('.')) {
          onSkipped(1);
          continue;
        }

        if (entry.isDirectory()) {
          // Skip directories in skip list
          if (options.skipDirs.includes(entry.name)) {
            onSkipped(1);
            continue;
          }

          // Recursively scan subdirectory
          await this.scanDirectory(
            fullPath,
            baseDir,
            files,
            errors,
            options,
            onSkipped
          );
        } else if (entry.isFile()) {
          // Check skip patterns
          if (this.shouldSkipFile(entry.name, options.skipPatterns)) {
            onSkipped(1);
            continue;
          }

          // Apply custom filter
          if (options.customFilter && !options.customFilter(relativePath)) {
            onSkipped(1);
            continue;
          }

          try {
            const stats = await fs.stat(fullPath);

            // Skip files exceeding max size
            if (stats.size > options.maxFileSize) {
              errors.push(`File ${relativePath} exceeds max size (${stats.size} > ${options.maxFileSize})`);
              onSkipped(1);
              continue;
            }

            // Read file content
            const content = await fs.readFile(fullPath);

            // Calculate SHA-256 hash
            const sha = crypto
              .createHash('sha256')
              .update(content)
              .digest('hex');

            files.push({
              path: relativePath,
              content,
              sha,
              size: stats.size,
            });
          } catch (error) {
            errors.push(`Failed to read ${relativePath}: ${(error as Error).message}`);
            onSkipped(1);
          }
        }
      }
    } catch (error) {
      errors.push(`Failed to read directory ${dir}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if file should be skipped based on patterns
   */
  private shouldSkipFile(filename: string, patterns: readonly RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(filename));
  }

  /**
   * Create file digest for deployment verification
   *
   * @param files - Collected files
   * @returns Combined SHA-256 hash of all file hashes
   *
   * @example
   * ```typescript
   * const digest = service.createFileDigest(result.files);
   * console.log(`Deployment digest: ${digest}`);
   * ```
   */
  public createFileDigest(files: readonly CollectedFile[]): string {
    const combinedHash = crypto.createHash('sha256');

    // Sort files by path for consistent hashing
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    for (const file of sortedFiles) {
      combinedHash.update(`${file.path}:${file.sha}\n`);
    }

    return combinedHash.digest('hex');
  }

  /**
   * Get file collection statistics
   *
   * @param files - Collected files
   * @returns Statistics about the collected files
   *
   * @example
   * ```typescript
   * const stats = service.getFileStats(result.files);
   * console.log(`Average file size: ${stats.averageSize} bytes`);
   * ```
   */
  public getFileStats(files: readonly CollectedFile[]): {
    totalSize: number;
    averageSize: number;
    largestFile: CollectedFile | null;
    smallestFile: CollectedFile | null;
    filesByExtension: Record<string, number>;
  } {
    if (files.length === 0) {
      return {
        totalSize: 0,
        averageSize: 0,
        largestFile: null,
        smallestFile: null,
        filesByExtension: {},
      };
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const averageSize = totalSize / files.length;

    const largestFile = files.reduce((largest, file) =>
      file.size > largest.size ? file : largest
    );

    const smallestFile = files.reduce((smallest, file) =>
      file.size < smallest.size ? file : smallest
    );

    const filesByExtension: Record<string, number> = {};
    for (const file of files) {
      const ext = path.extname(file.path) || 'no-extension';
      filesByExtension[ext] = (filesByExtension[ext] ?? 0) + 1;
    }

    return {
      totalSize,
      averageSize,
      largestFile,
      smallestFile,
      filesByExtension,
    };
  }
}

/**
 * Singleton instance for convenience
 */
export const fileCollectionService = new FileCollectionService();

/**
 * Convenience function to collect files
 *
 * @param projectPath - Absolute path to project root
 * @param options - Collection options
 * @returns File collection result
 *
 * @example
 * ```typescript
 * const result = await collectProjectFiles('/path/to/project');
 * ```
 */
export async function collectProjectFiles(
  projectPath: string,
  options?: FileCollectionOptions
): Promise<FileCollectionResult> {
  return fileCollectionService.collectFiles(projectPath, options);
}
