/**
 * @fileoverview Type Definitions for Proactive Risk Analysis
 * @module node-cli/services/risk-analysis.types
 *
 * Type-safe discriminated unions for all risk analysis scenarios.
 * Designed for extensibility and compile-time safety.
 */

import type { CloudProviderType } from '@aios/shared';
import type { EnvironmentType } from './conversation-memory.v2.js';

/**
 * Risk severity levels
 * - critical: Blocks deployment, requires override
 * - high: Strong warning, requires confirmation
 * - medium: Warning, allows proceed
 * - low: Informational only
 */
export enum RiskSeverityEnum {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Risk category for classification
 */
export enum RiskCategoryEnum {
  TIMING = 'timing',
  ENVIRONMENT = 'environment',
  INFRASTRUCTURE = 'infrastructure',
  DATA = 'data',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  COST = 'cost',
}

/**
 * Branded type for risk score (0.0 - 1.0)
 * Ensures scores are validated before use
 */
export type RiskScore = number & { readonly __brand: 'RiskScore' };

/**
 * Create a validated risk score
 * @throws {Error} If score is out of range
 */
export function createRiskScore(score: number): RiskScore {
  // Check finite first (catches NaN, Infinity, -Infinity)
  if (!Number.isFinite(score)) {
    throw new Error(`Risk score must be finite, got: ${score}`);
  }
  if (score < 0 || score > 1) {
    throw new Error(`Risk score must be between 0 and 1, got: ${score}`);
  }
  return score as RiskScore;
}

/**
 * Time window for deployment
 */
export interface TimeWindow {
  readonly day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  readonly startHour: number; // 0-23
  readonly endHour: number; // 0-23
}

/**
 * Base risk item
 */
export interface RiskItem {
  readonly id: string;
  readonly severity: RiskSeverityEnum;
  readonly category: RiskCategoryEnum;
  readonly title: string;
  readonly description: string;
  readonly score: RiskScore;
  readonly detectedAt: Date;
  readonly canOverride: boolean;
}

/**
 * Timing-specific risk
 */
export interface TimingRisk extends RiskItem {
  readonly category: RiskCategoryEnum.TIMING;
  readonly currentTime: Date;
  readonly suggestedWindow?: TimeWindow;
  readonly hoursUntilSafe?: number;
}

/**
 * Environment variable risk
 */
export interface EnvironmentVariableRisk extends RiskItem {
  readonly category: RiskCategoryEnum.ENVIRONMENT;
  readonly missingVariables: readonly string[];
  readonly invalidVariables: readonly { name: string; reason: string }[];
}

/**
 * Database migration risk
 */
export interface DatabaseMigrationRisk extends RiskItem {
  readonly category: RiskCategoryEnum.DATA;
  readonly migrationsDetected: readonly string[];
  readonly requiresReview: boolean;
  readonly hasRollbackPlan: boolean;
}

/**
 * Infrastructure risk (resource limits, scaling)
 */
export interface InfrastructureRisk extends RiskItem {
  readonly category: RiskCategoryEnum.INFRASTRUCTURE;
  readonly resourceType: 'cpu' | 'memory' | 'storage' | 'network';
  readonly currentUsage?: number;
  readonly limit?: number;
}

/**
 * Security risk
 */
export interface SecurityRisk extends RiskItem {
  readonly category: RiskCategoryEnum.SECURITY;
  readonly vulnerabilityType: 'dependency' | 'configuration' | 'access-control' | 'secrets';
  readonly affectedComponent: string;
  readonly cveId?: string;
}

/**
 * Discriminated union of all risk types
 */
export type Risk =
  | TimingRisk
  | EnvironmentVariableRisk
  | DatabaseMigrationRisk
  | InfrastructureRisk
  | SecurityRisk
  | RiskItem; // Fallback for unknown risks

/**
 * Risk analysis context
 */
export interface RiskAnalysisContext {
  readonly provider: CloudProviderType;
  readonly environment: EnvironmentType;
  readonly projectPath?: string;
  readonly currentTime?: Date;
  readonly userPriority?: 'cost' | 'speed' | 'safety';
  readonly metadata?: Record<string, unknown>;
}

/**
 * Risk analysis result
 */
export interface RiskAnalysisResult {
  readonly risks: readonly Risk[];
  readonly overallScore: RiskScore;
  readonly canProceed: boolean;
  readonly requiresOverride: boolean;
  readonly recommendation: string;
  readonly analyzedAt: Date;
}

/**
 * Risk mitigation strategy
 */
export interface RiskMitigation {
  readonly riskId: string;
  readonly action: string;
  readonly description: string;
  readonly automated: boolean;
  readonly estimatedTime?: string;
}

/**
 * Type guard for timing risks
 */
export function isTimingRisk(risk: Risk): risk is TimingRisk {
  return risk.category === RiskCategoryEnum.TIMING;
}

/**
 * Type guard for environment variable risks
 */
export function isEnvironmentVariableRisk(risk: Risk): risk is EnvironmentVariableRisk {
  return risk.category === RiskCategoryEnum.ENVIRONMENT;
}

/**
 * Type guard for database migration risks
 */
export function isDatabaseMigrationRisk(risk: Risk): risk is DatabaseMigrationRisk {
  return risk.category === RiskCategoryEnum.DATA;
}

/**
 * Type guard for infrastructure risks
 */
export function isInfrastructureRisk(risk: Risk): risk is InfrastructureRisk {
  return risk.category === RiskCategoryEnum.INFRASTRUCTURE;
}

/**
 * Type guard for security risks
 */
export function isSecurityRisk(risk: Risk): risk is SecurityRisk {
  return risk.category === RiskCategoryEnum.SECURITY;
}
