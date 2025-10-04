/**
 * Language Detection Types - Type definitions for language and framework detection
 * 
 * This module contains all type definitions related to language detection,
 * framework detection, and related configuration structures.
 * 
 * @fileoverview Type definitions for language detection services
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

/**
 * Language detection result containing detected language information
 */
export interface LanguageDetectionResult {
  /** The detected primary language */
  readonly language: string;
  /** Confidence score (0-1) for the detection */
  readonly confidence: number;
  /** Indicators that led to this detection */
  readonly indicators: string[];
  /** Manifest files found that support this language */
  readonly manifestFiles: string[];
  /** Source files found that support this language */
  readonly sourceFiles: string[];
}

/**
 * Comprehensive framework detection result containing detected framework information
 */
export interface ComprehensiveFrameworkDetectionResult {
  /** The detected framework (null if none detected) */
  readonly framework: string | null;
  /** Confidence score (0-1) for the detection */
  readonly confidence: number;
  /** Indicators that led to this detection */
  readonly indicators: string[];
  /** Configuration files found that support this framework */
  readonly configFiles: string[];
  /** Dependencies found that support this framework */
  readonly dependencies: string[];
}

// Removed unused LanguageDetectionConfig - use LanguageDefinition from config.types instead

/**
 * Framework configuration for detection
 * @deprecated Use FrameworkPattern from config.types instead
 */
export interface FrameworkConfig {
  /** Framework name */
  readonly name: string;
  /** Framework aliases */
  readonly aliases: string[];
  /** Manifest indicators for this framework */
  readonly manifestIndicators: string[];
  /** File indicators for this framework */
  readonly fileIndicators: string[];
  /** Dependency patterns for this framework */
  readonly dependencyPatterns: string[];
}

/**
 * File system scan options for language detection
 */
export interface LanguageDetectionScanOptions {
  /** Maximum depth to scan directories */
  readonly maxDepth?: number;
  /** File patterns to include */
  readonly includePatterns?: string[];
  /** File patterns to exclude */
  readonly excludePatterns?: string[];
  /** Whether to include hidden files */
  readonly includeHidden?: boolean;
  /** Whether to follow symbolic links */
  readonly followSymlinks?: boolean;
}

/**
 * Language detection statistics
 */
export interface LanguageDetectionStats {
  /** Total files scanned */
  readonly totalFiles: number;
  /** Total directories scanned */
  readonly totalDirectories: number;
  /** Scan duration in milliseconds */
  readonly scanDuration: number;
  /** Languages detected with confidence scores */
  readonly detectedLanguages: Array<{
    readonly language: string;
    readonly confidence: number;
    readonly fileCount: number;
  }>;
}

/**
 * Framework detection context
 */
export interface FrameworkDetectionContext {
  /** The project path being analyzed */
  readonly projectPath: string;
  /** The detected language */
  readonly language: string;
  /** Available manifest files */
  readonly manifestFiles: string[];
  /** Available source files */
  readonly sourceFiles: string[];
  /** Available dependencies */
  readonly dependencies: string[];
}

/**
 * Language detection cache entry
 */
export interface LanguageDetectionCacheEntry {
  /** Cache key (usually project path hash) */
  readonly key: string;
  /** Cached detection result */
  readonly result: LanguageDetectionResult;
  /** Framework detection result */
  readonly frameworkResult: FrameworkDetectionContext;
  /** Cache timestamp */
  readonly timestamp: number;
  /** Cache TTL in milliseconds */
  readonly ttl: number;
}
