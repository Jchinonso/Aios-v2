/**
 * @fileoverview Deployment Types - Deployment configurations and results
 * @description Comprehensive type definitions for deployment operations, configurations,
 * and status tracking. These types provide a unified interface for deployment
 * operations across different cloud providers while maintaining type safety and
 * consistency throughout the deployment lifecycle.
 *
 * This module supports various deployment strategies and provides detailed
 * status tracking for monitoring and debugging deployment operations.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import type {
  FrameworkType,
  ProgrammingLanguage,
  PackageManager,
  ProjectDependency,
  EnvironmentVariable,
  ProjectSize,
  ProjectComplexity,
  ProjectAnalysis,
  DatabaseType
} from '../../types/common.types.js';

// Re-export common types for convenience
export type {
  FrameworkType,
  ProgrammingLanguage,
  PackageManager,
  ProjectDependency,
  EnvironmentVariable,
  ProjectSize,
  ProjectComplexity,
  ProjectAnalysis,
  DatabaseType
};

/**
 * Deployment environments
 * @typedef {string} DeploymentEnvironment
 * @description Defines the target environment for deployment operations.
 * Each environment typically has different configurations, resource allocations,
 * and access controls.
 *
 * - development: Local or development environment for testing
 * - staging: Pre-production environment for integration testing
 * - production: Live environment serving end users
 * - preview: Temporary environment for feature previews
 */
export type DeploymentEnvironment = 'development' | 'staging' | 'production' | 'preview';

/**
 * Deployment strategies
 * @typedef {string} DeploymentStrategy
 * @description Defines the deployment strategy for releasing new versions.
 * Each strategy offers different tradeoffs between safety, speed, and resource usage.
 *
 * - rolling: Gradually replace instances with new version
 * - blue-green: Switch traffic between two identical environments
 * - canary: Deploy to subset of users before full rollout
 * - recreate: Terminate old version before starting new one
 */
export type DeploymentStrategy = 'rolling' | 'blue-green' | 'canary' | 'recreate';

// Types imported and re-exported from common.types above

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  readonly projectPath: string;
  readonly environment: string;
  readonly strategy?: DeploymentStrategy | undefined;
  readonly buildCommand?: string | undefined;
  readonly outputDirectory?: string | undefined;
  readonly environmentVariables?: EnvironmentVariable[] | undefined;
  readonly region?: string | undefined;
  readonly scaling?: ScalingConfig | undefined;
  readonly domain?: DomainConfig | undefined;
  readonly monitoring?: MonitoringConfig | undefined;
}

/**
 * Scaling configuration
 */
export interface ScalingConfig {
  readonly minInstances: number;
  readonly maxInstances: number;
  readonly targetCPU?: number;
  readonly targetMemory?: number;
  readonly autoScaling: boolean;
}

/**
 * Domain configuration
 */
export interface DomainConfig {
  readonly domain: string;
  readonly subdomain?: string;
  readonly ssl: boolean;
  readonly redirectWww?: boolean;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  readonly enabled: boolean;
  readonly alertsEnabled: boolean;
  readonly logLevel: 'error' | 'warn' | 'info' | 'debug';
  readonly metricsRetention: number; // days
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  readonly deploymentId: string;
  readonly url: string;
  readonly status: string;
  readonly buildTime: number; // milliseconds
  readonly environment: string;
  readonly version: string;
  readonly metadata?: Record<string, any> | undefined;
}

/**
 * Deployment log entry
 */
export interface DeploymentLog {
  readonly timestamp: Date;
  readonly level: 'info' | 'warn' | 'error' | 'debug';
  readonly message: string;
  readonly source?: string;
}

/**
 * Deployment metadata
 */
export interface DeploymentMetadata {
  readonly commitSha?: string;
  readonly branch?: string;
  readonly buildTime?: number;
  readonly bundleSize?: number;
  readonly framework?: FrameworkType;
  readonly nodeVersion?: string;
  readonly region?: string;
}

/**
 * Deployment status information
 */
export interface DeploymentStatus {
  readonly deploymentId: string;
  readonly phase: string;
  readonly progress: number; // 0-100
  readonly message: string;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly health?: {
    readonly status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    readonly checks: any[];
    readonly lastCheck?: Date;
  };
  readonly performance?: {
    readonly buildTime?: number;
    readonly responseTime?: number;
    readonly throughput?: number;
  };
  readonly url?: string;
  readonly previewUrl?: string;
}

/**
 * Deployment summary for listing
 */
export interface DeploymentSummary {
  readonly deploymentId: string;
  readonly environment: string;
  readonly status: string;
  readonly url: string;
  readonly createdAt: Date;
  readonly completedAt?: Date;
  readonly version: string;
  readonly branch?: string;
  readonly commitHash?: string;
  readonly author?: string;
}

// ProjectDependency, EnvironmentVariable, ProjectSize, ProjectComplexity, and ProjectAnalysis
// are imported and re-exported from common.types above to eliminate duplication

