/**
 * @fileoverview Time-Based Risk Detection Utility
 * @module node-cli/utils/time-risk-detector
 *
 * Production-grade time window analysis for deployment safety.
 *
 * Features:
 * - Detects risky deployment times (Friday PM, weekends, late night)
 * - Suggests optimal deployment windows
 * - Calculates time until safe deployment
 * - Environment-aware risk levels
 *
 * Design Principles:
 * - Pure functions (no side effects)
 * - Immutable data structures
 * - Type-safe with branded types
 * - Comprehensive edge case handling
 *
 * @example
 * ```typescript
 * const detector = new TimeRiskDetector();
 * const result = detector.analyzeTime(new Date(), 'production');
 *
 * if (result.isRisky) {
 *   const window = detector.suggestOptimalWindow(new Date());
 *   console.log(`Deploy on ${window.day} at ${window.startHour}:00`);
 * }
 * ```
 */

import type { TimeWindow } from '../services/risk-analysis.types.js';
import type { EnvironmentType } from '../services/conversation-memory.v2.js';

/**
 * Time risk severity levels
 */
export type TimeSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Time risk analysis result
 */
export interface TimeRiskResult {
  readonly isRisky: boolean;
  readonly severity: TimeSeverity;
  readonly reason: string;
  readonly suggestedWindow?: TimeWindow;
  readonly hoursUntilSafe?: number;
}

/**
 * Time-Based Risk Detector
 *
 * Analyzes deployment time and provides risk assessment with suggestions.
 */
export class TimeRiskDetector {
  /**
   * Analyze deployment time for risks
   *
   * @param time - Deployment time to analyze
   * @param environment - Target environment
   * @returns Risk analysis result
   *
   * @example
   * ```typescript
   * const detector = new TimeRiskDetector();
   * const result = detector.analyzeTime(new Date('2025-10-10T18:00:00'), 'production');
   * // result.isRisky = true
   * // result.severity = 'critical'
   * // result.reason = 'Friday evening production deployment'
   * ```
   */
  public analyzeTime(time: Date, environment: EnvironmentType): TimeRiskResult {
    const dayOfWeek = time.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = time.getHours();
    const isProduction = environment === 'production';

    // Non-production environments have lower risk thresholds
    if (!isProduction) {
      return {
        isRisky: false,
        severity: 'low',
        reason: 'Non-production environment - safe to deploy anytime',
      };
    }

    // Critical: Friday 5pm+ production
    if (dayOfWeek === 5 && hour >= 17) {
      return {
        isRisky: true,
        severity: 'critical',
        reason: 'Friday evening production deployment - high risk of weekend incidents',
        suggestedWindow: this.suggestOptimalWindow(time),
        hoursUntilSafe: this.hoursUntilSafe(time),
      };
    }

    // High: Weekend production (Saturday or Sunday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        isRisky: true,
        severity: 'high',
        reason: 'Weekend production deployment - limited support availability',
        suggestedWindow: this.suggestOptimalWindow(time),
        hoursUntilSafe: this.hoursUntilSafe(time),
      };
    }

    // High: Late night production (11pm - 6am)
    if (hour >= 23 || hour < 6) {
      return {
        isRisky: true,
        severity: 'high',
        reason: 'Late night production deployment - fatigue risk and reduced team availability',
      };
    }

    // Medium: Thursday 5pm+ (pre-Friday risk)
    if (dayOfWeek === 4 && hour >= 17) {
      return {
        isRisky: true,
        severity: 'medium',
        reason: 'Thursday evening deployment - close to weekend',
        suggestedWindow: {
          day: 'tuesday',
          startHour: 9,
          endHour: 15,
        },
      };
    }

    // Safe time
    return {
      isRisky: false,
      severity: 'low',
      reason: 'Safe deployment window',
    };
  }

  /**
   * Suggest optimal deployment window
   *
   * Recommends best time to deploy based on current time.
   * Prefers Monday-Wednesday mornings (9-11 AM).
   *
   * @param from - Current time
   * @returns Suggested time window
   *
   * @example
   * ```typescript
   * const window = detector.suggestOptimalWindow(new Date('2025-10-10T18:00:00'));
   * // { day: 'monday', startHour: 9, endHour: 11 }
   * ```
   */
  public suggestOptimalWindow(from: Date): TimeWindow {
    const dayOfWeek = from.getDay();

    // If it's Friday afternoon/evening or weekend, suggest Monday
    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
      return {
        day: 'monday',
        startHour: 9,
        endHour: 11,
      };
    }

    // If it's late in the week (Thursday), suggest early next week
    if (dayOfWeek === 4) {
      return {
        day: 'tuesday',
        startHour: 9,
        endHour: 15,
      };
    }

    // Otherwise, suggest next business day morning
    return {
      day: 'tuesday',
      startHour: 9,
      endHour: 11,
    };
  }

  /**
   * Calculate hours until next safe deployment window
   *
   * Returns 0 if current time is already safe.
   *
   * @param from - Current time
   * @returns Hours until safe (0 if already safe)
   *
   * @example
   * ```typescript
   * const hours = detector.hoursUntilSafe(new Date('2025-10-10T18:00:00'));
   * // ~63 hours (Friday 6pm → Monday 9am)
   * ```
   */
  public hoursUntilSafe(from: Date): number {
    const dayOfWeek = from.getDay();
    const hour = from.getHours();

    // Check if already safe (weekday 6am-5pm, not Thursday evening)
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isSafeHours = hour >= 6 && hour < 17;
    const notThursdayEvening = !(dayOfWeek === 4 && hour >= 17);
    const notLateNight = hour >= 6 && hour < 23;

    if (isWeekday && isSafeHours && notThursdayEvening && notLateNight) {
      return 0; // Already safe
    }

    // Calculate hours to Monday 9 AM
    const current = new Date(from);
    const currentDay = current.getDay();

    // Days until Monday (1)
    let daysUntilMonday = 1 - currentDay;
    if (daysUntilMonday <= 0) {
      daysUntilMonday += 7; // Next Monday
    }

    // Create target: Monday 9 AM
    const target = new Date(current);
    target.setDate(target.getDate() + daysUntilMonday);
    target.setHours(9, 0, 0, 0);

    // Calculate hours difference
    const msUntil = target.getTime() - current.getTime();
    const hours = Math.ceil(msUntil / (1000 * 60 * 60));

    return Math.max(0, hours);
  }

  /**
   * Format hours as human-readable relative time
   *
   * @param hours - Number of hours
   * @returns Human-readable string
   *
   * @example
   * ```typescript
   * detector.formatRelativeTime(2); // "2 hours"
   * detector.formatRelativeTime(24); // "1 day"
   * detector.formatRelativeTime(63); // "2 days 15 hours"
   * ```
   */
  public formatRelativeTime(hours: number): string {
    if (hours === 0) {
      return 'now';
    }

    if (hours === 1) {
      return '1 hour';
    }

    if (hours < 24) {
      return `${hours} hours`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (remainingHours === 0) {
      return days === 1 ? '1 day' : `${days} days`;
    }

    return `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
  }
}
