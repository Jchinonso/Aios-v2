/**
 * @fileoverview Type Definitions for Pre-Deployment Checklist
 * @module node-cli/services/deployment-checklist.types
 *
 * Type-safe deployment checklist system for production safety.
 */

import type { EnvironmentType } from './conversation-memory.v2.js';

/**
 * Checklist item importance level
 */
export enum ChecklistItemPriority {
  REQUIRED = 'required',
  RECOMMENDED = 'recommended',
  OPTIONAL = 'optional',
}

/**
 * Checklist item status
 */
export enum ChecklistItemStatus {
  PENDING = 'pending',
  CHECKING = 'checking',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Base checklist item
 */
export interface ChecklistItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly priority: ChecklistItemPriority;
  readonly status: ChecklistItemStatus;
  readonly automated: boolean;
  readonly canSkip: boolean;
}

/**
 * Automated checklist item (can be verified automatically)
 */
export interface AutomatedChecklistItem extends ChecklistItem {
  readonly automated: true;
  readonly checkFn: () => Promise<boolean>;
  readonly errorMessage?: string;
}

/**
 * Manual checklist item (requires user confirmation)
 */
export interface ManualChecklistItem extends ChecklistItem {
  readonly automated: false;
  readonly instructions: readonly string[];
}

/**
 * Discriminated union of checklist items
 */
export type DeploymentChecklistItem = AutomatedChecklistItem | ManualChecklistItem;

/**
 * Checklist validation result
 */
export interface ChecklistValidationResult {
  readonly canDeploy: boolean;
  readonly totalItems: number;
  readonly passedItems: number;
  readonly failedItems: number;
  readonly pendingItems: number;
  readonly requiredPending: number;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Checklist context for environment-specific checks
 */
export interface ChecklistContext {
  readonly environment: EnvironmentType;
  readonly projectPath?: string;
  readonly provider?: string;
}

/**
 * Type guard for automated checklist items
 */
export function isAutomatedItem(item: DeploymentChecklistItem): item is AutomatedChecklistItem {
  return item.automated === true;
}

/**
 * Type guard for manual checklist items
 */
export function isManualItem(item: DeploymentChecklistItem): item is ManualChecklistItem {
  return item.automated === false;
}
