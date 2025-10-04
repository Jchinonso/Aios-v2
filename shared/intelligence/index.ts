/**
 * Intelligence Module - Main export file for the comprehensive intelligence system
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for module exports
 * - OCP: Open for extension through new intelligence components
 * - ISP: Interface segregation for different usage patterns
 * - DIP: Depends on abstractions, not concretions
 */

// Services - Consolidated orchestrator
export * from './services/enhanced-intelligence-orchestrator.js';

// Existing modules
export * from './file-system/index.js';
export * from './providers/index.js';
export * from './services/index.js';

// Types (explicit re-exports to avoid conflicts)
export type {
  AnalysisContext,
  AnalysisResult,
  AnalysisMetadata,
  IAnalyzer,
  IAnalyzerFactory,
  IFileAnalyzer,
  ILanguageAnalyzer,
  ICompositeAnalyzer,
  IFileAnalysisResult,
  IFileInfo,
  IDirectoryInfo,
  IDetectedPattern,
  IFileStructureMetadata,
  IFileStatistics,
  ILanguageProjectInfo,
  IProjectScript,
  IExecutionStrategy
} from './types/index.js';

// New comprehensive components
export * from './utils/index.js';
export * from './prompts/index.js';
export { 
  ANALYSIS_TYPES, 
  PRIORITY_LEVELS, 
  ERROR_CODES 
} from './constants/index.js';
