/**
 * @fileoverview Standardized Error Messages - Phase 3
 * @description Consistent error message formatting across Phase 3
 * @module node-cli/services/error-messages
 *
 * Design Principles:
 * - Consistent format: "Context: specific error (expected: X, got: Y)"
 * - Always include context (what operation failed)
 * - Include expected vs actual values when relevant
 * - Use proper quotes for values
 */

/**
 * Validation error messages
 */
export const ValidationErrors = {
  /**
   * Invalid weight error
   */
  invalidWeight: (value: number): string =>
    `Invalid weight: ${value} (must be between 0 and 1)`,

  /**
   * Invalid confidence error
   */
  invalidConfidence: (value: number): string =>
    `Invalid confidence: ${value} (must be between 0 and 1)`,

  /**
   * Invalid timestamp error
   */
  invalidTimestamp: (timestamp: string): string =>
    `Invalid ISO 8601 timestamp: "${timestamp}"`,

  /**
   * Empty field error
   */
  emptyField: (fieldName: string): string =>
    `Invalid ${fieldName}: cannot be empty`,

  /**
   * Negative value error
   */
  negativeValue: (fieldName: string, value: number): string =>
    `Invalid ${fieldName}: must be >= 0 (got ${value})`,

  /**
   * Invalid type error
   */
  invalidType: (fieldName: string, expected: string, actual: string): string =>
    `Invalid ${fieldName}: expected ${expected} (got ${actual})`,

  /**
   * Missing required field error
   */
  missingField: (fieldName: string): string =>
    `Missing required field: "${fieldName}"`,

  /**
   * Invalid array error
   */
  invalidArray: (fieldName: string): string =>
    `Invalid ${fieldName}: must be an array`,

  /**
   * Invalid provider error
   */
  invalidProvider: (provider: string, validProviders: readonly string[]): string =>
    `Invalid provider: "${provider}" (valid providers: ${validProviders.join(', ')})`,

  /**
   * Not finite number error
   */
  notFinite: (fieldName: string, value: number): string =>
    `Invalid ${fieldName}: ${value} (must be finite number)`,
} as const;

/**
 * Action reasoning error messages
 */
export const ReasoningErrors = {
  /**
   * No actions found error
   */
  noActions: (): string =>
    'No actions to explain (deploy something first)',

  /**
   * Action not found error
   */
  actionNotFound: (actionId: string): string =>
    `Action not found: "${actionId}"`,

  /**
   * Invalid reasoning structure error
   */
  invalidReasoning: (detail: string): string =>
    `Invalid reasoning structure: ${detail}`,

  /**
   * Missing chosen reason error
   */
  missingChosenReason: (): string =>
    'Invalid reasoning: missing chosen.reason',
} as const;

/**
 * Risk assessment error messages
 */
export const RiskErrors = {
  /**
   * Unknown risk level error
   */
  unknownRiskLevel: (level: string, validLevels: readonly string[]): string =>
    `Unknown risk level: "${level}" (valid levels: ${validLevels.join(', ')})`,

  /**
   * Unknown probability error
   */
  unknownProbability: (probability: string, level: string, validProbabilities: readonly string[]): string =>
    `Unknown probability: "${probability}" for level: "${level}" (valid probabilities: ${validProbabilities.join(', ')})`,
} as const;

/**
 * Persistence error messages
 */
export const PersistenceErrors = {
  /**
   * Failed to load error
   */
  failedToLoad: (actionId: string, reason: string): string =>
    `Failed to load action "${actionId}": ${reason}`,

  /**
   * Failed to persist error
   */
  failedToPersist: (actionId: string, reason: string): string =>
    `Failed to persist action "${actionId}": ${reason}`,

  /**
   * Corrupted data error
   */
  corruptedData: (actionId: string): string =>
    `Corrupted data for action "${actionId}"`,
} as const;

/**
 * All error message utilities
 */
export const ErrorMessages = {
  validation: ValidationErrors,
  reasoning: ReasoningErrors,
  risk: RiskErrors,
  persistence: PersistenceErrors,
} as const;
