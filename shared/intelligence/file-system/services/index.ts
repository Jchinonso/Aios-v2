/**
 * File System Services - Service layer for file system operations
 *
 * This module exports all services related to file system operations,
 * providing a centralized service layer for the file-system module.
 *
 * Phase 1 Refactoring: Extracting focused services from UnifiedAnalyzer God Object
 *
 * @author AIOS Team
 * @version 2.0.1
 * @since 1.0.0
 */

export { FileSystemService } from './file-system-service.js';
export { LanguageDetectionService } from './language-detection.service.js';
export type { LanguageDetectionResult, FrameworkDetectionResult } from './language-detection.service.js';
export { DependencyAnalysisService } from './dependency-analysis.service.js';
export type {
  Dependency,
  DependencyType,
  PackageManagerType,
  CircularDependency,
  CircularDependencySeverity,
  DependencyAnalysisResult,
  PackageManagerDetection
} from './dependency-analysis.service.js';
export { ProjectStructureAnalyzer } from './project-structure.service.js';
export type {
  ProjectType,
  ProjectStructureResult,
  DirectoryClassification
} from './project-structure.service.js';
export { BuildConfigurationService } from './build-configuration.service.js';
export type {
  BuildConfigurationResult,
  TestConfigurationResult,
  DockerConfigurationResult,
  CIConfigurationResult,
  EnvironmentVariable,
  DatabaseConfigurationResult,
  CompleteConfiguration
} from './build-configuration.service.js';
export { SecurityAnalysisService } from './security-analysis.service.js';
export type {
  VulnerabilitySeverity,
  SecurityVulnerability,
  SecurityAnalysisResult,
  VulnerablePackage,
  SecretPattern
} from './security-analysis.service.js';
