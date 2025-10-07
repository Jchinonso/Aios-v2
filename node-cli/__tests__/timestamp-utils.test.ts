/**
 * @fileoverview Tests for Timestamp Utilities
 * @module node-cli/__tests__/timestamp-utils.test
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createTimestamp,
  validateTimestamp,
  parseTimestamp,
  isRecentTimestamp,
  formatTimestampRelative,
  type ValidatedTimestamp,
} from '../services/timestamp-utils.js';

describe('Timestamp Utilities', () => {
  describe('createTimestamp', () => {
    it('should create valid ISO 8601 timestamp', () => {
      const timestamp = createTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should create timestamp from provided date', () => {
      const date = new Date('2025-01-01T12:00:00.000Z');
      const timestamp = createTimestamp(date);
      expect(timestamp).toBe('2025-01-01T12:00:00.000Z');
    });

    it('should throw on invalid date', () => {
      const invalidDate = new Date('invalid');
      expect(() => createTimestamp(invalidDate)).toThrow('Invalid date');
    });

    it('should return branded ValidatedTimestamp type', () => {
      const timestamp: ValidatedTimestamp = createTimestamp();
      expect(typeof timestamp).toBe('string');
    });
  });

  describe('validateTimestamp', () => {
    it('should validate valid ISO 8601 timestamp', () => {
      const valid = '2025-01-01T12:00:00.000Z';
      expect(validateTimestamp(valid)).toBe(valid);
    });

    it('should reject empty string', () => {
      expect(() => validateTimestamp('')).toThrow('Timestamp cannot be empty');
    });

    it('should reject whitespace only', () => {
      expect(() => validateTimestamp('   ')).toThrow('Timestamp cannot be empty');
    });

    it('should reject invalid format', () => {
      expect(() => validateTimestamp('2025-01-01')).toThrow('Timestamp not in ISO 8601 format');
    });

    it('should reject invalid date string', () => {
      expect(() => validateTimestamp('invalid')).toThrow('Invalid ISO 8601 timestamp');
    });

    it('should perform roundtrip test', () => {
      // This should fail because it's not exact ISO 8601 format
      expect(() => validateTimestamp('2025-01-01T12:00:00Z')).toThrow(
        'Timestamp not in ISO 8601 format'
      );
    });

    it('should accept valid timestamp with milliseconds', () => {
      const valid = '2025-01-01T12:00:00.123Z';
      expect(validateTimestamp(valid)).toBe(valid);
    });
  });

  describe('parseTimestamp', () => {
    it('should parse validated timestamp to Date', () => {
      const timestamp = createTimestamp(new Date('2025-01-01T12:00:00.000Z'));
      const date = parseTimestamp(timestamp);
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2025-01-01T12:00:00.000Z');
    });

    it('should preserve milliseconds', () => {
      const timestamp = createTimestamp(new Date('2025-01-01T12:00:00.456Z'));
      const date = parseTimestamp(timestamp);
      expect(date.getMilliseconds()).toBe(456);
    });
  });

  describe('isRecentTimestamp', () => {
    it('should return true for timestamp within threshold', () => {
      const now = new Date();
      const timestamp = createTimestamp(now);
      expect(isRecentTimestamp(timestamp, 5)).toBe(true);
    });

    it('should return false for timestamp outside threshold', () => {
      const old = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const timestamp = createTimestamp(old);
      expect(isRecentTimestamp(timestamp, 5)).toBe(false);
    });

    it('should use default threshold of 5 minutes', () => {
      const recent = new Date(Date.now() - 4 * 60 * 1000); // 4 minutes ago
      const timestamp = createTimestamp(recent);
      expect(isRecentTimestamp(timestamp)).toBe(true);
    });

    it('should handle edge case at exactly threshold', () => {
      const exact = new Date(Date.now() - 5 * 60 * 1000); // exactly 5 minutes ago
      const timestamp = createTimestamp(exact);
      expect(isRecentTimestamp(timestamp, 5)).toBe(true);
    });

    it('should return true for future timestamps', () => {
      const future = new Date(Date.now() + 1000); // 1 second in future
      const timestamp = createTimestamp(future);
      // Future timestamps are considered "recent" (negative diff <= threshold)
      expect(isRecentTimestamp(timestamp, 5)).toBe(true);
    });
  });

  describe('formatTimestampRelative', () => {
    it('should format seconds', () => {
      const timestamp = createTimestamp(new Date(Date.now() - 30 * 1000));
      expect(formatTimestampRelative(timestamp)).toMatch(/30 seconds? ago/);
    });

    it('should format minutes', () => {
      const timestamp = createTimestamp(new Date(Date.now() - 5 * 60 * 1000));
      expect(formatTimestampRelative(timestamp)).toMatch(/5 minutes? ago/);
    });

    it('should format hours', () => {
      const timestamp = createTimestamp(new Date(Date.now() - 3 * 60 * 60 * 1000));
      expect(formatTimestampRelative(timestamp)).toMatch(/3 hours? ago/);
    });

    it('should format days', () => {
      const timestamp = createTimestamp(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
      expect(formatTimestampRelative(timestamp)).toMatch(/2 days? ago/);
    });

    it('should use singular for 1 second', () => {
      const timestamp = createTimestamp(new Date(Date.now() - 1000));
      expect(formatTimestampRelative(timestamp)).toBe('1 second ago');
    });

    it('should use singular for 1 minute', () => {
      const timestamp = createTimestamp(new Date(Date.now() - 60 * 1000));
      expect(formatTimestampRelative(timestamp)).toBe('1 minute ago');
    });

    it('should use singular for 1 hour', () => {
      const timestamp = createTimestamp(new Date(Date.now() - 60 * 60 * 1000));
      expect(formatTimestampRelative(timestamp)).toBe('1 hour ago');
    });

    it('should use singular for 1 day', () => {
      const timestamp = createTimestamp(new Date(Date.now() - 24 * 60 * 60 * 1000));
      expect(formatTimestampRelative(timestamp)).toBe('1 day ago');
    });

    it('should use plural for multiple units', () => {
      const timestamp = createTimestamp(new Date(Date.now() - 45 * 1000));
      expect(formatTimestampRelative(timestamp)).toBe('45 seconds ago');
    });

    it('should handle very recent timestamps', () => {
      const timestamp = createTimestamp(new Date(Date.now() - 100));
      expect(formatTimestampRelative(timestamp)).toBe('0 seconds ago');
    });
  });

  describe('Integration - Full workflow', () => {
    it('should create, validate, and parse timestamp', () => {
      // Create
      const timestamp = createTimestamp();

      // Validate
      const validated = validateTimestamp(timestamp);
      expect(validated).toBe(timestamp);

      // Parse
      const date = parseTimestamp(validated);
      expect(date.toISOString()).toBe(timestamp);
    });

    it('should work with specific date', () => {
      const specificDate = new Date('2025-10-06T15:30:00.000Z');

      // Create from date
      const timestamp = createTimestamp(specificDate);
      expect(timestamp).toBe('2025-10-06T15:30:00.000Z');

      // Validate
      const validated = validateTimestamp(timestamp);

      // Parse back
      const parsed = parseTimestamp(validated);
      expect(parsed.getTime()).toBe(specificDate.getTime());
    });
  });
});
