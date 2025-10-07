/**
 * @fileoverview Time-Based Risk Configuration Types
 * @description Configurable time rules for deployment safety
 * @module node-cli/services/time-risk.types
 * @version 1.0.0
 *
 * Purpose:
 * - Allow teams to customize risky deployment windows
 * - Support different work schedules (24/7 ops, shift work, etc.)
 * - Handle regional holidays and team-specific calendars
 */

/**
 * Time-based risk levels
 */
export type TimeRiskLevel = 'safe' | 'moderate' | 'risky' | 'dangerous';

/**
 * Time risk assessment result
 */
export interface TimeRiskAssessment {
  readonly riskLevel: TimeRiskLevel;
  readonly reason: string;
  readonly shouldBlock: boolean; // Should deployment be blocked?
}

/**
 * Business hours configuration
 */
export interface BusinessHoursConfig {
  /** Start hour (0-23, default: 9 = 9am) */
  readonly start: number;
  /** End hour (0-23, default: 17 = 5pm) */
  readonly end: number;
}

/**
 * Risky hours configuration for specific days
 */
export interface RiskyHoursConfig {
  /** Hour when Friday becomes risky (default: 15 = 3pm) */
  readonly friday: number;
  /** Hour when weekends become dangerous (default: 17 = 5pm) */
  readonly weekend: number;
}

/**
 * Time risk configuration
 *
 * Allows teams to customize deployment safety windows based on:
 * - Work schedule (business days, hours)
 * - Support availability (risky hours)
 * - Regional holidays
 *
 * @example
 * ```typescript
 * // Standard 9-5 Mon-Fri schedule
 * const standard: TimeRiskConfig = {
 *   businessDays: [1, 2, 3, 4, 5],
 *   businessHours: { start: 9, end: 17 },
 *   riskyHours: { friday: 15, weekend: 17 }
 * };
 *
 * // 24/7 operations (no risky times)
 * const alwaysSafe: TimeRiskConfig = {
 *   businessDays: [0, 1, 2, 3, 4, 5, 6],
 *   businessHours: { start: 0, end: 23 },
 *   riskyHours: { friday: 23, weekend: 23 }
 * };
 *
 * // European schedule with holidays
 * const european: TimeRiskConfig = {
 *   businessDays: [1, 2, 3, 4, 5],
 *   businessHours: { start: 9, end: 18 },
 *   riskyHours: { friday: 16, weekend: 18 },
 *   holidays: ['2024-12-25', '2025-01-01', '2025-12-26']
 * };
 * ```
 */
export interface TimeRiskConfig {
  /**
   * Business days (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
   *
   * **Default**: [1, 2, 3, 4, 5] (Mon-Fri)
   * **24/7 Teams**: [0, 1, 2, 3, 4, 5, 6] (all days)
   *
   * @example
   * [1, 2, 3, 4, 5]        // Mon-Fri (standard)
   * [0, 1, 2, 3, 4, 5, 6]  // All days (24/7)
   * [1, 2, 3, 4]           // Mon-Thu only
   */
  readonly businessDays: readonly number[];

  /**
   * Business hours (safe deployment window)
   *
   * **Default**: { start: 9, end: 17 } (9am-5pm)
   * **24/7 Teams**: { start: 0, end: 23 } (always safe)
   *
   * @example
   * { start: 9, end: 17 }   // 9am-5pm
   * { start: 8, end: 18 }   // 8am-6pm
   * { start: 0, end: 23 }   // All day
   */
  readonly businessHours: BusinessHoursConfig;

  /**
   * Risky hours thresholds
   *
   * **Default**: { friday: 15, weekend: 17 }
   * - Friday becomes risky at 3pm (approaching weekend)
   * - Weekends become dangerous at 5pm (evening)
   *
   * **24/7 Teams**: Set to 23 (never risky)
   *
   * @example
   * { friday: 15, weekend: 17 }  // Standard
   * { friday: 12, weekend: 15 }  // Strict (earlier cutoff)
   * { friday: 23, weekend: 23 }  // Permissive (24/7)
   */
  readonly riskyHours: RiskyHoursConfig;

  /**
   * Holiday dates (ISO 8601 format: YYYY-MM-DD)
   *
   * **Optional**: Team-specific holidays
   * **Effect**: Holidays treated as weekends (risky)
   *
   * @example
   * ['2024-12-25', '2025-01-01']     // Christmas, New Year
   * ['2024-07-04', '2024-11-28']     // US holidays
   */
  readonly holidays?: readonly string[];

  /**
   * Enable/disable time-based safety overrides
   *
   * **Default**: true (safety enabled)
   * **24/7 Teams**: false (disable all blocking)
   *
   * When false, all times are considered safe (no blocking).
   * Use with caution - removes deployment safety guardrails.
   */
  readonly enabled?: boolean;
}

/**
 * Default time risk configuration
 *
 * Standard 9-5 Mon-Fri schedule with Friday 3pm cutoff.
 * Suitable for most teams with traditional work hours.
 */
export const DEFAULT_TIME_RISK_CONFIG: TimeRiskConfig = {
  businessDays: [1, 2, 3, 4, 5], // Mon-Fri
  businessHours: { start: 9, end: 17 }, // 9am-5pm
  riskyHours: { friday: 15, weekend: 17 }, // Fri 3pm, Weekend 5pm
  holidays: [],
  enabled: true,
} as const;

/**
 * 24/7 operations configuration (no risky times)
 *
 * For teams with round-the-clock support and on-call rotation.
 * All times are considered safe - no deployment blocking.
 */
export const ALWAYS_SAFE_TIME_CONFIG: TimeRiskConfig = {
  businessDays: [0, 1, 2, 3, 4, 5, 6], // All days
  businessHours: { start: 0, end: 23 }, // All hours
  riskyHours: { friday: 23, weekend: 23 }, // Never risky
  holidays: [],
  enabled: false, // Disable safety checks
} as const;

/**
 * Validate time risk configuration
 *
 * Ensures configuration values are within valid ranges and logically consistent.
 *
 * @param config - Time risk configuration to validate
 * @throws {Error} If configuration is invalid
 *
 * @example
 * ```typescript
 * validateTimeRiskConfig(DEFAULT_TIME_RISK_CONFIG); // OK
 * validateTimeRiskConfig({ businessDays: [8] });     // Throws: Invalid day 8
 * validateTimeRiskConfig({ businessHours: { start: 25, end: 17 } }); // Throws: Invalid hour 25
 * ```
 */
export function validateTimeRiskConfig(config: TimeRiskConfig): void {
  // Validate business days (0-6)
  for (const day of config.businessDays) {
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      throw new Error(
        `Invalid business day: ${day}. Must be 0-6 (0=Sunday, 6=Saturday).`
      );
    }
  }

  // Validate business hours (0-23)
  if (
    !Number.isInteger(config.businessHours.start) ||
    config.businessHours.start < 0 ||
    config.businessHours.start > 23
  ) {
    throw new Error(
      `Invalid business hours start: ${config.businessHours.start}. Must be 0-23.`
    );
  }

  if (
    !Number.isInteger(config.businessHours.end) ||
    config.businessHours.end < 0 ||
    config.businessHours.end > 23
  ) {
    throw new Error(
      `Invalid business hours end: ${config.businessHours.end}. Must be 0-23.`
    );
  }

  // Validate business hours logic
  if (config.businessHours.start >= config.businessHours.end) {
    throw new Error(
      `Invalid business hours: start (${config.businessHours.start}) must be < end (${config.businessHours.end}).`
    );
  }

  // Validate risky hours (0-23)
  if (
    !Number.isInteger(config.riskyHours.friday) ||
    config.riskyHours.friday < 0 ||
    config.riskyHours.friday > 23
  ) {
    throw new Error(
      `Invalid risky hours (friday): ${config.riskyHours.friday}. Must be 0-23.`
    );
  }

  if (
    !Number.isInteger(config.riskyHours.weekend) ||
    config.riskyHours.weekend < 0 ||
    config.riskyHours.weekend > 23
  ) {
    throw new Error(
      `Invalid risky hours (weekend): ${config.riskyHours.weekend}. Must be 0-23.`
    );
  }

  // Validate holidays (ISO 8601 format)
  if (config.holidays) {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}$/;
    for (const holiday of config.holidays) {
      if (!iso8601Regex.test(holiday)) {
        throw new Error(
          `Invalid holiday format: ${holiday}. Must be YYYY-MM-DD (ISO 8601).`
        );
      }

      // Verify date is valid
      const date = new Date(holiday);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid holiday date: ${holiday}. Not a valid date.`);
      }
    }
  }
}
