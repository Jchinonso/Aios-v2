/**
 * Configuration Types - All configuration-related interfaces and types
 */

// Analyzer configuration types
export interface AnalyzerConfig {
  readonly fileSystem: FileSystemConfig;
  readonly languages: LanguageConfig;
  readonly patterns: PatternConfig;
  readonly performance: PerformanceConfig;
  readonly buildTools?: Record<string, BuildTool[]>;
  readonly testingFrameworks?: Record<string, TestingFramework[]>;
  readonly projectPatterns?: ProjectPatterns;
}

export interface FileSystemConfig {
  readonly maxDepth: number;
  readonly maxFileSize: number;
  readonly excludePatterns: string[];
  readonly includeHidden: boolean;
  readonly followSymlinks: boolean;
  readonly parallelScanning: boolean;
  readonly cacheTtlMs?: number;
  readonly cacheSizeLimit?: number;
}

export interface LanguageConfig {
  readonly supportedLanguages: LanguageDefinition[];
  readonly frameworkPatterns: FrameworkPattern[];
  readonly packageManagerPatterns: PackageManagerPattern[];
}

export interface LanguageDefinition {
  readonly name: string;
  readonly extensions: string[];
  readonly manifestFiles: string[];
  readonly configFiles: string[];
  readonly buildFiles: string[];
  readonly lockFiles?: string[];
}

export interface FrameworkPattern {
  readonly name: string;
  readonly language: string;
  readonly dependencies: string[];
  readonly files: string[];
  readonly patterns: string[];
  readonly confidence: number;
}

export interface PackageManagerPattern {
  readonly name: string;
  readonly language: string;
  readonly manifestFile: string;
  readonly lockFile?: string;
  readonly configFile?: string;
}

export interface BuildTool {
  readonly name: string;
  readonly configFiles: string[];
  readonly patterns: string[];
}

export interface TestingFramework {
  readonly name: string;
  readonly configFiles: string[];
  readonly patterns: string[];
}

export interface PatternConfig {
  readonly confidenceThreshold: number;
  readonly maxPatterns: number;
  readonly enableFuzzyMatching: boolean;
}

export interface PerformanceConfig {
  readonly timeoutMs: number;
  readonly maxConcurrentAnalyzers: number;
  readonly cacheResults: boolean;
  readonly cacheTtlMs: number;
}

// File system configuration types
export interface FileSystemModuleConfig {
  readonly scanner: ScannerConfig;
  readonly patterns: PatternDetectionConfig;
  readonly metadata: MetadataConfig;
  readonly performance: FileSystemPerformanceConfig;
}

export interface ScannerConfig {
  readonly maxDepth: number;
  readonly maxFileSize: number;
  readonly excludePatterns: string[];
  readonly includeHidden: boolean;
  readonly followSymlinks: boolean;
  readonly parallelScanning: boolean;
  readonly maxConcurrentScans: number;
  readonly supportedExtensions: string[];
}

export interface PatternDetectionConfig {
  readonly confidenceThreshold: number;
  readonly maxPatterns: number;
  readonly enableFuzzyMatching: boolean;
  readonly languagePatterns: LanguagePatternConfig[];
  readonly frameworkPatterns: FrameworkPatternConfig[];
  readonly architecturePatterns: ArchitecturePatternConfig[];
}

export interface LanguagePatternConfig {
  readonly name: string;
  readonly extensions: string[];
  readonly configFiles: string[];
  readonly indicators: string[];
  readonly confidence: number;
}

export interface FrameworkPatternConfig {
  readonly name: string;
  readonly language: string;
  readonly dependencies: string[];
  readonly files: string[];
  readonly directories: string[];
  readonly patterns: string[];
  readonly confidence: number;
}

export interface ArchitecturePatternConfig {
  readonly name: string;
  readonly type: 'monorepo' | 'microservices' | 'modular' | 'layered';
  readonly indicators: string[];
  readonly directoryPatterns: string[];
  readonly filePatterns: string[];
  readonly confidence: number;
}

export interface MetadataConfig {
  readonly enablePackageAnalysis: boolean;
  readonly enableDependencyAnalysis: boolean;
  readonly enableQualityAnalysis: boolean;
  readonly qualityMetrics: QualityMetrics;
}

export interface QualityMetrics {
  readonly testDirectories: string[];
  readonly documentationFiles: string[];
  readonly lintingFiles: string[];
  readonly cicdFiles: string[];
  readonly complexityThresholds: {
    readonly low: number;
    readonly medium: number;
    readonly high: number;
  };
}

export interface FileSystemPerformanceConfig {
  readonly timeoutMs: number;
  readonly cacheResults: boolean;
  readonly cacheTtlMs: number;
  readonly maxMemoryUsage: number;
  readonly enableProfiling: boolean;
}

// Package manager types
export interface UnifiedDependency {
  readonly name: string;
  readonly version: string | null;
  readonly type: 'runtime' | 'development' | 'peer' | 'optional' | 'build';
  readonly scope?: string;
  readonly registry?: string;
  readonly isFramework: boolean;
  readonly isBuildTool: boolean;
  readonly isTestingTool: boolean;
  readonly vulnerabilities?: any[]; // Will be typed properly when vulnerability types are available
}

export interface UnifiedScript {
  readonly name: string;
  readonly command: string;
  readonly description?: string;
  readonly category: 'build' | 'test' | 'dev' | 'deploy' | 'lint' | 'other';
  readonly complexity: 'simple' | 'medium' | 'complex';
  readonly tools: string[];
}

// Import the standardized ValidationResult and extend it
import type { ValidationResult } from './deployment.types.js'

export interface PackageValidationResult extends ValidationResult {
  readonly suggestions: string[];
}


export interface IPackageManager {
  readonly name: string;
  readonly language: string;
  readonly ecosystem: string;
  canHandle(files: string[]): boolean;
  parseDependencies(content: string): Promise<UnifiedDependency[]>;
  parseDevDependencies(content: string): Promise<UnifiedDependency[]>;
  parseScripts?(content: string): Promise<UnifiedScript[]>;
  validateManifest(content: string): Promise<PackageValidationResult>;
}

// Project patterns types
export interface ProjectPatterns {
  readonly documentation: DocumentationPatterns;
  readonly docker: DockerPatterns;
  readonly ciCd: CICDPatterns;
  readonly environment: EnvironmentPatterns;
  readonly secrets: SecretPatterns;
  readonly tests: TestPatterns;
}

export interface DocumentationPatterns {
  readonly files: string[];
  readonly directories: string[];
  readonly extensions: string[];
}

export interface DockerPatterns {
  readonly files: string[];
  readonly directories: string[];
}

export interface CICDPatterns {
  readonly files: string[];
  readonly directories: string[];
}

export interface EnvironmentPatterns {
  readonly files: string[];
  readonly directories: string[];
}

export interface SecretPatterns {
  readonly keywords: string[];
  readonly patterns: RegExp[];
}

export interface TestPatterns {
  readonly directories: string[];
  readonly filePatterns: string[];
  readonly extensions: Record<string, string[]>;
}