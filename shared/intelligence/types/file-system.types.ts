/**
 * File System Types - Type definitions for file system operations
 * 
 * This module contains all type definitions related to file system operations,
 * directory scanning, file caching, and related structures.
 * 
 * @fileoverview Type definitions for file system services
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

// Re-export types from file-system module for backward compatibility
export type { IDetectedPattern, PatternLocation } from '../file-system/types/analyzer.interface.js'

/**
 * Pattern type enumeration
 */
export const PatternType = {
  LANGUAGE: 'language' as const,
  FRAMEWORK: 'framework' as const,
  BUILD_TOOL: 'build-tool' as const,
  PACKAGE_MANAGER: 'package-manager' as const,
  CONFIG: 'config' as const,
  ARCHITECTURE: 'architecture' as const,
  SECURITY: 'security' as const,
  DEPLOYMENT: 'deployment' as const
} as const;

export type PatternType = typeof PatternType[keyof typeof PatternType];

/**
 * File scan options for directory scanning
 */
export interface FileScanOptions {
  /** Whether to include hidden files and directories */
  readonly includeHidden?: boolean;
  /** Maximum depth to scan directories */
  readonly maxDepth?: number;
  /** File patterns to exclude */
  readonly excludePatterns?: string[];
  /** File patterns to include */
  readonly includePatterns?: string[];
  /** Directories to exclude from scanning */
  readonly excludeDirectories?: string[];
}

/**
 * File information structure
 */
export interface FileInfo {
  /** File name */
  readonly name: string;
  /** Absolute file path */
  readonly path: string;
  /** Relative file path from project root */
  readonly relativePath: string;
  /** File size in bytes */
  readonly size: number;
  /** File extension */
  readonly extension: string;
  /** Whether this is a directory */
  readonly isDirectory: boolean;
  /** Last modification timestamp */
  readonly lastModified: Date;
}

/**
 * Directory scan result
 */
export interface DirectoryScanResult {
  /** Array of file information */
  readonly files: FileInfo[];
  /** Array of directory information */
  readonly directories: FileInfo[];
  /** Total number of files found */
  readonly totalFiles: number;
  /** Total number of directories found */
  readonly totalDirectories: number;
  /** Scan duration in milliseconds */
  readonly scanDuration: number;
  /** Total size of all files in bytes */
  readonly totalSize: number;
}

/**
 * File content cache entry
 */
export interface FileContentCacheEntry {
  /** File path (cache key) */
  readonly path: string;
  /** File content */
  readonly content: string;
  /** Cache timestamp */
  readonly timestamp: number;
  /** Cache TTL in milliseconds */
  readonly ttl: number;
  /** File size when cached */
  readonly size: number;
}

/**
 * File system service configuration
 */
export interface FileSystemServiceConfig {
  /** Enable file content caching */
  readonly enableCaching?: boolean;
  /** Cache TTL in milliseconds */
  readonly cacheTtl?: number;
  /** Maximum cache size in MB */
  readonly maxCacheSize?: number;
  /** Enable parallel file operations */
  readonly enableParallelOps?: boolean;
  /** Maximum concurrent file operations */
  readonly maxConcurrentOps?: number;
}

/**
 * File operation statistics
 */
export interface FileSystemStats {
  /** Total files read */
  readonly filesRead: number;
  /** Total directories scanned */
  readonly directoriesScanned: number;
  /** Total cache hits */
  readonly cacheHits: number;
  /** Total cache misses */
  readonly cacheMisses: number;
  /** Total bytes read */
  readonly bytesRead: number;
  /** Average read time in milliseconds */
  readonly avgReadTime: number;
}

/**
 * File operation error
 */
export interface FileSystemError {
  /** Error message */
  readonly message: string;
  /** File path that caused the error */
  readonly filePath: string;
  /** Error code */
  readonly code: string;
  /** Error timestamp */
  readonly timestamp: Date;
}

/**
 * File filter function type
 */
export type FileFilter = (fileInfo: FileInfo) => boolean;

/**
 * Directory filter function type
 */
export type DirectoryFilter = (dirInfo: FileInfo) => boolean;