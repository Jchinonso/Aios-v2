/**
 * @fileoverview Action Reasoning Type System - Phase 3
 * @description Comprehensive types for explainable AI decision tracking
 * @module node-cli/services/action-reasoning
 *
 * Design Principles:
 * - Strict type safety with discriminated unions
 * - Immutable data structures (readonly)
 * - Comprehensive reasoning capture
 * - Support for alternatives and risk tracking
 */

import type { IntentType, RiskLevelType } from '../nl-planner/types.js';
import type { CloudProviderType } from '@aios/shared';
import { ErrorMessages } from './error-messages.js';

/**
 * Action types that can be tracked for reasoning
 * @description Use const enum for type-safe string constants
 */
export const enum TrackedActionTypeEnum {
  DEPLOY = 'deploy',
  SCALE = 'scale',
  SET_ENV = 'set-env',
  ROLLBACK = 'rollback',
  PROVIDER_SELECTION = 'provider-selection',
  ENVIRONMENT_SELECTION = 'environment-selection',
  RISK_ASSESSMENT = 'risk-assessment',
  DEFAULT_APPLICATION = 'default-application',
}

/**
 * Action types that can be tracked for reasoning
 */
export type TrackedActionType =
  | 'deploy'
  | 'scale'
  | 'set-env'
  | 'rollback'
  | 'provider-selection'
  | 'environment-selection'
  | 'risk-assessment'
  | 'default-application';

/**
 * Confidence level for decisions
 */
export type ConfidenceLevelType = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

/**
 * Validated factor weight (0.0 - 1.0)
 * @description Branded type ensuring weight is always valid
 */
export type FactorWeight = number & { readonly __brand: 'FactorWeight' };

/**
 * Validated confidence score (0.0 - 1.0)
 * @description Branded type ensuring confidence is always valid
 */
export type ConfidenceScore = number & { readonly __brand: 'ConfidenceScore' };

/**
 * Create validated factor weight
 * @param value - Weight value to validate
 * @returns Validated weight
 * @throws {Error} If weight is invalid (not finite, < 0, or > 1)
 */
export function createFactorWeight(value: number): FactorWeight {
  if (!Number.isFinite(value)) {
    throw new Error(ErrorMessages.validation.notFinite('weight', value));
  }
  if (value < 0 || value > 1) {
    throw new Error(ErrorMessages.validation.invalidWeight(value));
  }
  return value as FactorWeight;
}

/**
 * Create validated confidence score
 * @param value - Confidence value to validate
 * @returns Validated confidence score
 * @throws {Error} If confidence is invalid (not finite, < 0, or > 1)
 */
export function createConfidenceScore(value: number): ConfidenceScore {
  if (!Number.isFinite(value)) {
    throw new Error(ErrorMessages.validation.notFinite('confidence', value));
  }
  if (value < 0 || value > 1) {
    throw new Error(ErrorMessages.validation.invalidConfidence(value));
  }
  return value as ConfidenceScore;
}

/**
 * Decision factor - reasons influencing a decision
 */
export interface DecisionFactor {
  readonly type: 'positive' | 'negative' | 'neutral';
  readonly description: string;
  readonly weight: FactorWeight; // Validated 0.0 - 1.0
  readonly source: 'user-preference' | 'historical-data' | 'project-analysis' | 'time-based' | 'cost-based' | 'performance-based';
}

/**
 * Alternative option not chosen
 */
export interface AlternativeOption<T = unknown> {
  readonly value: T;
  readonly label: string;
  readonly whyNotChosen: string;
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly confidence: ConfidenceScore; // Validated 0.0 - 1.0
  readonly estimatedCost?: string;
  readonly estimatedDuration?: string;
}

/**
 * Risk item identified during decision
 */
export interface RiskItem {
  readonly level: RiskLevelType;
  readonly description: string;
  readonly mitigation?: string;
  readonly impact: 'low' | 'medium' | 'high' | 'critical';
  readonly probability: 'unlikely' | 'possible' | 'likely' | 'certain';
}

/**
 * Metadata for action reasoning
 */
export interface ActionMetadata {
  readonly timestamp: string; // ISO 8601
  readonly sessionId: string;
  readonly turnNumber: number;
  readonly userInput: string;
  readonly intent: IntentType;
}

/**
 * Provider selection reasoning (most common case)
 */
export interface ProviderSelectionReasoning {
  readonly actionType: 'provider-selection';
  readonly chosen: {
    readonly provider: CloudProviderType;
    readonly reason: string;
  };
  readonly alternatives: readonly AlternativeOption<{ provider: CloudProviderType }>[];
  readonly factors: readonly DecisionFactor[];
  readonly confidence: ConfidenceLevelType;
}

/**
 * Environment selection reasoning
 */
export interface EnvironmentSelectionReasoning {
  readonly actionType: 'environment-selection';
  readonly chosen: {
    readonly environment: 'development' | 'staging' | 'production' | 'preview';
    readonly reason: string;
  };
  readonly alternatives: readonly AlternativeOption<{ environment: string }>[];
  readonly factors: readonly DecisionFactor[];
  readonly confidence: ConfidenceLevelType;
  readonly timeBasedOverride?: {
    readonly original: string;
    readonly overriddenTo: string;
    readonly reason: string;
  };
}

/**
 * Deployment decision reasoning
 */
export interface DeploymentReasoning {
  readonly actionType: 'deploy';
  readonly chosen: {
    readonly provider: CloudProviderType;
    readonly environment: string;
    readonly reason: string;
  };
  readonly alternatives: readonly AlternativeOption<{ provider: CloudProviderType; environment: string }>[];
  readonly factors: readonly DecisionFactor[];
  readonly risks: readonly RiskItem[];
  readonly confidence: ConfidenceLevelType;
  readonly prerequisites?: readonly string[];
  readonly estimatedCost?: string;
  readonly estimatedDuration?: string;
}

/**
 * Generic action reasoning (fallback for actions without specific reasoning types)
 * @description Only used for action types that don't have dedicated reasoning interfaces
 */
export interface GenericActionReasoning {
  readonly actionType: Exclude<
    TrackedActionType,
    'provider-selection' | 'environment-selection' | 'deploy'
  >; // Only non-specific action types
  readonly chosen: {
    readonly value: unknown;
    readonly reason: string;
  };
  readonly alternatives: readonly AlternativeOption[];
  readonly factors: readonly DecisionFactor[];
  readonly confidence: ConfidenceLevelType;
}

/**
 * Discriminated union for all reasoning types
 */
export type ActionReasoning =
  | ProviderSelectionReasoning
  | EnvironmentSelectionReasoning
  | DeploymentReasoning
  | GenericActionReasoning;

/**
 * Complete action record with reasoning
 */
export interface ActionRecord {
  readonly id: string; // UUID
  readonly metadata: ActionMetadata;
  readonly reasoning: ActionReasoning;
  readonly risks: readonly RiskItem[];
  readonly outcome?: {
    readonly success: boolean;
    readonly message: string;
    readonly timestamp: string;
  };
}

/**
 * Explanation request from user
 */
export interface ExplainRequest {
  readonly type: 'general' | 'specific' | 'alternative';
  readonly target?: {
    readonly actionId?: string; // Specific action to explain
    readonly question?: string; // e.g., "why vercel?", "why not aws?"
  };
}

/**
 * Explanation response
 */
export interface ExplainResponse {
  readonly actionId: string;
  readonly summary: string;
  readonly reasoning: {
    readonly chosen: {
      readonly value: string;
      readonly reasons: readonly string[];
    };
    readonly factors: readonly {
      readonly type: DecisionFactor['type'];
      readonly description: string;
      readonly weight: string; // Formatted as percentage
    }[];
    readonly alternatives: readonly {
      readonly label: string;
      readonly whyNotChosen: string;
      readonly pros: readonly string[];
      readonly cons: readonly string[];
    }[];
  };
  readonly risks?: readonly {
    readonly level: RiskLevelType;
    readonly description: string;
    readonly mitigation?: string;
  }[];
  readonly metadata: {
    readonly timestamp: string;
    readonly userInput: string;
  };
}

/**
 * Alternative suggestion for display
 */
export interface AlternativeSuggestion {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly confidence: number;
  readonly recommended: boolean;
  readonly estimatedCost?: string;
  readonly estimatedDuration?: string;
  readonly selectable: boolean;
}

/**
 * Alternatives collection for user choice
 */
export interface AlternativesCollection {
  readonly primary: AlternativeSuggestion;
  readonly alternatives: readonly AlternativeSuggestion[];
  readonly reasoning: string;
  readonly timestamp: string;
}

/**
 * User selection of alternative
 */
export interface AlternativeSelection {
  readonly selectedId: string;
  readonly selectedIndex: number;
  readonly timestamp: string;
}

/**
 * Type guards for reasoning types
 * @description ✅ Use enum constants instead of magic strings
 */
export const isProviderSelectionReasoning = (
  reasoning: ActionReasoning
): reasoning is ProviderSelectionReasoning => {
  return reasoning.actionType === TrackedActionTypeEnum.PROVIDER_SELECTION;
};

export const isEnvironmentSelectionReasoning = (
  reasoning: ActionReasoning
): reasoning is EnvironmentSelectionReasoning => {
  return reasoning.actionType === TrackedActionTypeEnum.ENVIRONMENT_SELECTION;
};

export const isDeploymentReasoning = (
  reasoning: ActionReasoning
): reasoning is DeploymentReasoning => {
  return reasoning.actionType === TrackedActionTypeEnum.DEPLOY;
};

/**
 * Confidence level utilities
 */
export const CONFIDENCE_THRESHOLDS = {
  VERY_LOW: 0.3,
  LOW: 0.5,
  MEDIUM: 0.7,
  HIGH: 0.85,
  VERY_HIGH: 0.95,
} as const;

/**
 * Convert numeric confidence to level
 */
export const getConfidenceLevel = (confidence: number): ConfidenceLevelType => {
  if (confidence >= CONFIDENCE_THRESHOLDS.VERY_HIGH) return 'very-high';
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  if (confidence >= CONFIDENCE_THRESHOLDS.LOW) return 'low';
  return 'very-low';
};

/**
 * Risk impact calculation with exhaustive checking
 * @param level - Risk level
 * @param probability - Probability of risk occurring
 * @returns Calculated impact level
 * @throws {Error} If risk level or probability not in matrix
 */
export const calculateRiskImpact = (
  level: RiskLevelType,
  probability: RiskItem['probability']
): RiskItem['impact'] => {
  const impactMatrix: Record<RiskLevelType, Record<RiskItem['probability'], RiskItem['impact']>> = {
    low: {
      unlikely: 'low',
      possible: 'low',
      likely: 'low',
      certain: 'medium',
    },
    moderate: {
      unlikely: 'low',
      possible: 'medium',
      likely: 'medium',
      certain: 'high',
    },
    high: {
      unlikely: 'medium',
      possible: 'high',
      likely: 'high',
      certain: 'critical',
    },
    destructive: {
      unlikely: 'high',
      possible: 'critical',
      likely: 'critical',
      certain: 'critical',
    },
  };

  const levelMatrix = impactMatrix[level];
  if (!levelMatrix) {
    throw new Error(
      ErrorMessages.risk.unknownRiskLevel(level, Object.keys(impactMatrix) as readonly string[])
    );
  }

  const impact = levelMatrix[probability];
  if (!impact) {
    throw new Error(
      ErrorMessages.risk.unknownProbability(
        probability,
        level,
        Object.keys(levelMatrix) as readonly string[]
      )
    );
  }

  return impact;
};

/**
 * Format decision factor weight as percentage
 */
export const formatFactorWeight = (weight: number): string => {
  return `${Math.round(weight * 100)}%`;
};
