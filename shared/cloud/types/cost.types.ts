/**
 * @fileoverview Cost Types - Cost estimates, tracking, and budgets
 * @description Comprehensive type definitions for cost estimation, tracking,
 * and budget management across cloud providers. Enables accurate cost forecasting,
 * budget monitoring, and cost optimization recommendations for deployments.
 *
 * These types support multi-currency cost calculations, usage-based pricing models,
 * and detailed cost breakdowns by service and resource type.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import type { AlertChannel } from './monitoring.types.js'

/**
 * Cost estimation
 */
export interface CostEstimate {
  readonly monthly: MonthlyEstimate;
  readonly traffic: TrafficEstimate;
  readonly storage: StorageEstimate;
  readonly additional?: AdditionalCost[];
}

/**
 * Monthly cost breakdown
 */
export interface MonthlyEstimate {
  readonly freeTier: boolean;
  readonly minimum: number;
  readonly typical: number;
  readonly maximum?: number;
  readonly currency: string;
}

/**
 * Traffic-based cost estimate
 */
export interface TrafficEstimate {
  readonly freeRequests: number;
  readonly costPerAdditionalRequest: number;
  readonly bandwidthIncluded: number; // GB
  readonly costPerGB: number;
}

/**
 * Storage cost estimate
 */
export interface StorageEstimate {
  readonly freeStorage: number; // GB
  readonly costPerGB: number;
  readonly backupCost?: number;
}

/**
 * Additional costs
 */
export interface AdditionalCost {
  readonly service: string;
  readonly description: string;
  readonly cost: number;
  readonly unit: string;
}

/**
 * Cost optimization suggestion
 */
export interface CostOptimization {
  readonly type: 'resource-sizing' | 'usage-pattern' | 'provider-switch' | 'feature-optimization';
  readonly description: string;
  readonly potentialSavings: number; // monthly amount
  readonly difficulty: 'easy' | 'moderate' | 'complex';
  readonly implementationSteps: string[];
  readonly riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Usage tracking data
 */
export interface UsageMetrics {
  readonly period: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly requests: number;
  readonly bandwidth: number; // GB
  readonly storage: number; // GB
  readonly computeTime: number; // minutes
  readonly functionInvocations: number;
  readonly databases: DatabaseUsage[];
}

/**
 * Database usage metrics
 */
export interface DatabaseUsage {
  readonly name: string;
  readonly type: string;
  readonly connections: number;
  readonly queries: number;
  readonly storage: number; // GB
  readonly backup: number; // GB
}

/**
 * Budget configuration
 */
export interface BudgetConfig {
  readonly monthly: number;
  readonly alerts: {
    readonly thresholds: number[]; // percentages (e.g., [50, 80, 100])
    readonly channels: AlertChannel[];
  };
  readonly autoActions?: {
    readonly pauseDeployments?: boolean;
    readonly scaleDown?: boolean;
    readonly notifyTeam?: boolean;
  };
}

/**
 * Cost breakdown by service
 */
export interface CostBreakdown {
  readonly total: number;
  readonly currency: string;
  readonly services: ServiceCost[];
  readonly trends: {
    readonly previousMonth: number;
    readonly percentageChange: number;
    readonly projection: number;
  };
}

/**
 * Individual service cost
 */
export interface ServiceCost {
  readonly name: string;
  readonly cost: number;
  readonly percentage: number;
  readonly usage: Record<string, number>;
  readonly optimizations?: CostOptimization[];
}