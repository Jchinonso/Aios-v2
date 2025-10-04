/**
 * @fileoverview Natural Language Planner Types
 * @description Type definitions for NL → CLI mapping
 * @module node-cli/nl-planner/types
 */

import type { CloudProviderType } from '@aios/shared';

/**
 * Supported intents
 */
export type IntentType =
  | 'deploy'
  | 'status'
  | 'deployment-history'
  | 'logs'
  | 'connect'
  | 'adopt'
  | 'scale'
  | 'set-env'
  | 'rollback'
  | 'cost'
  | 'analyze'
  | 'recommend'
  | 'reconfigure'
  | 'help'
  | 'unknown';

/**
 * Deployment strategy
 */
export type DeploymentStrategyType = 'instant' | 'canary' | 'blue-green';

/**
 * Log level
 */
export type LogLevelType = 'info' | 'warn' | 'error' | 'debug';

/**
 * Risk level
 */
export type RiskLevelType = 'low' | 'moderate' | 'high' | 'destructive';

/**
 * Extracted entities from user utterance
 */
export interface ExtractedEntitiesType {
  readonly service?: string;
  readonly env?: 'development' | 'staging' | 'production' | 'preview';
  readonly provider?: CloudProviderType;
  readonly repo?: string;
  readonly branch?: string;
  readonly paths?: string;
  readonly region?: string;
  readonly since?: string;
  readonly level?: LogLevelType;
  readonly percent?: number;
  readonly duration?: string;
  readonly replicas?: number;
  readonly strategy?: DeploymentStrategyType;
  readonly global?: string; // 'true' if global/worldwide deployment requested
  readonly urgent?: string; // 'true' if urgent/immediate deployment requested
}

/**
 * Parsed intent result
 */
export interface ParsedIntentType {
  readonly intent: IntentType;
  readonly entities: ExtractedEntitiesType;
  readonly cli: string;
  readonly risk: RiskLevelType;
  readonly confirmRequired: boolean;
  readonly confirmPrompt?: string;
  readonly clarifyingQuestion?: string;
  readonly notes?: string;
  readonly confidence: number;
}

/**
 * Default values for common entities
 */
export const DEFAULT_ENTITIES = {
  env: 'staging',
  since: '1h',
  level: 'info',
  strategy: 'instant'
} as const;

/**
 * Risk level mappings
 */
export const RISK_LEVELS: Record<string, RiskLevelType> = {
  development: 'low',
  staging: 'moderate',
  production: 'high',
  rollback: 'high',
  scale: 'moderate',
  'set-env': 'moderate'
} as const;

/**
 * Intent patterns for rule-based matching
 */
export interface IntentPatternType {
  readonly intent: IntentType;
  readonly patterns: readonly RegExp[];
  readonly priority: number;
}
