/**
 * @fileoverview TDD Tests for Time-Based Risk Detection
 * @module node-cli/__tests__/time-risk-detector.test
 *
 * Tests for intelligent time-based deployment risk detection.
 * Detects risky deployment windows and suggests optimal times.
 */

import { describe, it, expect } from '@jest/globals';
import { TimeRiskDetector } from '../utils/time-risk-detector.js';
import type { TimeWindow } from '../services/risk-analysis.types.js';

describe('TimeRiskDetector - TDD', () => {
  const detector = new TimeRiskDetector();

  describe('Friday Evening Detection', () => {
    it('should detect Friday 5:00 PM as critical', () => {
      const friday5pm = new Date('2025-10-10T17:00:00');
      const result = detector.analyzeTime(friday5pm, 'production');

      expect(result.isRisky).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.reason).toContain('Friday evening');
    });

    it('should detect Friday 6:30 PM as critical', () => {
      const friday630pm = new Date('2025-10-10T18:30:00');
      const result = detector.analyzeTime(friday630pm, 'production');

      expect(result.isRisky).toBe(true);
      expect(result.severity).toBe('critical');
    });

    it('should NOT flag Friday 4:00 PM as critical', () => {
      const friday4pm = new Date('2025-10-10T16:00:00');
      const result = detector.analyzeTime(friday4pm, 'production');

      // Should be safe or medium risk, not critical
      expect(result.severity).not.toBe('critical');
    });
  });

  describe('Weekend Detection', () => {
    it('should detect Saturday as high risk', () => {
      const saturday2pm = new Date('2025-10-11T14:00:00');
      const result = detector.analyzeTime(saturday2pm, 'production');

      expect(result.isRisky).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.reason).toContain('Weekend');
    });

    it('should detect Sunday as high risk', () => {
      const sunday10am = new Date('2025-10-12T10:00:00');
      const result = detector.analyzeTime(sunday10am, 'production');

      expect(result.isRisky).toBe(true);
      expect(result.severity).toBe('high');
    });
  });

  describe('Late Night Detection', () => {
    it('should detect 11:00 PM as high risk', () => {
      const wednesday11pm = new Date('2025-10-08T23:00:00');
      const result = detector.analyzeTime(wednesday11pm, 'production');

      expect(result.isRisky).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.reason.toLowerCase()).toContain('late night');
    });

    it('should detect 2:00 AM as high risk', () => {
      const thursday2am = new Date('2025-10-09T02:00:00');
      const result = detector.analyzeTime(thursday2am, 'production');

      expect(result.isRisky).toBe(true);
      expect(result.severity).toBe('high');
    });

    it('should allow 10:00 PM (before late night)', () => {
      const wednesday10pm = new Date('2025-10-08T22:00:00');
      const result = detector.analyzeTime(wednesday10pm, 'production');

      expect(result.severity).not.toBe('high');
    });
  });

  describe('Safe Time Windows', () => {
    it('should consider Monday 10 AM safe', () => {
      const monday10am = new Date('2025-10-13T10:00:00');
      const result = detector.analyzeTime(monday10am, 'production');

      expect(result.isRisky).toBe(false);
      expect(result.severity).toBe('low');
    });

    it('should consider Tuesday 2 PM safe', () => {
      const tuesday2pm = new Date('2025-10-14T14:00:00');
      const result = detector.analyzeTime(tuesday2pm, 'production');

      expect(result.isRisky).toBe(false);
    });

    it('should consider Wednesday 11 AM safe', () => {
      const wednesday11am = new Date('2025-10-08T11:00:00');
      const result = detector.analyzeTime(wednesday11am, 'production');

      expect(result.isRisky).toBe(false);
    });
  });

  describe('Environment Sensitivity', () => {
    it('should allow Friday evening for staging', () => {
      const friday6pm = new Date('2025-10-10T18:00:00');
      const result = detector.analyzeTime(friday6pm, 'staging');

      // Staging should be less strict
      expect(result.severity).not.toBe('critical');
    });

    it('should allow weekend for development', () => {
      const saturday = new Date('2025-10-11T14:00:00');
      const result = detector.analyzeTime(saturday, 'development');

      expect(result.severity).toBe('low');
    });
  });

  describe('Optimal Window Suggestions', () => {
    it('should suggest Monday morning from Friday evening', () => {
      const friday6pm = new Date('2025-10-10T18:00:00');
      const window = detector.suggestOptimalWindow(friday6pm);

      expect(window.day).toBe('monday');
      expect(window.startHour).toBe(9);
      expect(window.endHour).toBe(11);
    });

    it('should suggest Tuesday for mid-week deployments', () => {
      const thursday5pm = new Date('2025-10-09T17:00:00');
      const window = detector.suggestOptimalWindow(thursday5pm);

      // Should suggest early week
      expect(['monday', 'tuesday', 'wednesday']).toContain(window.day);
    });

    it('should have valid hour ranges', () => {
      const friday6pm = new Date('2025-10-10T18:00:00');
      const window = detector.suggestOptimalWindow(friday6pm);

      expect(window.startHour).toBeGreaterThanOrEqual(0);
      expect(window.startHour).toBeLessThan(24);
      expect(window.endHour).toBeGreaterThan(window.startHour);
      expect(window.endHour).toBeLessThanOrEqual(24);
    });
  });

  describe('Hours Until Safe Calculation', () => {
    it('should calculate hours from Friday 6 PM to Monday 9 AM', () => {
      const friday6pm = new Date('2025-10-10T18:00:00');
      const hours = detector.hoursUntilSafe(friday6pm);

      // Friday 6pm → Monday 9am = ~63 hours
      expect(hours).toBeGreaterThan(60);
      expect(hours).toBeLessThan(70);
    });

    it('should calculate hours from Saturday to Monday', () => {
      const saturday2pm = new Date('2025-10-11T14:00:00');
      const hours = detector.hoursUntilSafe(saturday2pm);

      // Saturday 2pm → Monday 9am = ~43 hours
      expect(hours).toBeGreaterThan(40);
      expect(hours).toBeLessThan(50);
    });

    it('should return 0 for safe times', () => {
      const monday10am = new Date('2025-10-13T10:00:00');
      const hours = detector.hoursUntilSafe(monday10am);

      expect(hours).toBe(0);
    });
  });

  describe('Relative Time Display', () => {
    it('should format hours as human-readable', () => {
      expect(detector.formatRelativeTime(2)).toBe('2 hours');
      expect(detector.formatRelativeTime(24)).toBe('1 day');
      expect(detector.formatRelativeTime(48)).toBe('2 days');
      expect(detector.formatRelativeTime(63)).toBe('2 days 15 hours');
    });

    it('should handle 1 hour specially', () => {
      expect(detector.formatRelativeTime(1)).toBe('1 hour');
    });

    it('should handle 0 hours', () => {
      expect(detector.formatRelativeTime(0)).toBe('now');
    });
  });

  describe('Edge Cases', () => {
    it('should handle date exactly at midnight', () => {
      const midnight = new Date('2025-10-11T00:00:00'); // Saturday midnight
      const result = detector.analyzeTime(midnight, 'production');

      expect(result.isRisky).toBe(true); // Weekend
    });

    it('should handle leap year dates', () => {
      const leapDay = new Date('2024-02-29T10:00:00'); // Leap year Thursday
      const result = detector.analyzeTime(leapDay, 'production');

      expect(result).toBeDefined();
    });

    it('should handle daylight saving time transitions', () => {
      // DST transition dates vary, but should not throw
      const dst = new Date('2025-03-09T02:00:00');
      expect(() => detector.analyzeTime(dst, 'production')).not.toThrow();
    });
  });
});
