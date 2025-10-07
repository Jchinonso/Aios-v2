/**
 * @fileoverview Timestamp Utilities - Phase 3
 * @description Utilities for validated ISO 8601 timestamp handling
 * @module node-cli/services/timestamp-utils
 *
 * Purpose:
 * - Create validated ISO 8601 timestamps
 * - Validate timestamp strings
 * - Parse timestamps safely
 */

/**
 * Validated ISO 8601 timestamp
 * @description Branded type ensuring timestamp is always valid ISO 8601
 */
export type ValidatedTimestamp = string & { readonly __brand: 'ValidatedTimestamp' };

/**
 * Create current timestamp in ISO 8601 format
 * @returns Validated timestamp
 */
export function createTimestamp(date: Date = new Date()): ValidatedTimestamp {
  // Validate date is valid
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid date: ${date} (must be valid Date object)`);
  }

  return date.toISOString() as ValidatedTimestamp;
}

/**
 * Validate and parse ISO 8601 timestamp string
 * @param timestamp - Timestamp string to validate
 * @returns Validated timestamp
 * @throws {Error} If timestamp is invalid ISO 8601
 */
export function validateTimestamp(timestamp: string): ValidatedTimestamp {
  if (!timestamp || timestamp.trim() === '') {
    throw new Error('Timestamp cannot be empty');
  }

  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid ISO 8601 timestamp: ${timestamp}`);
  }

  // Ensure it's properly formatted (roundtrip test)
  const roundtrip = date.toISOString();
  if (roundtrip !== timestamp) {
    throw new Error(
      `Timestamp not in ISO 8601 format: ${timestamp} (expected: ${roundtrip})`
    );
  }

  return timestamp as ValidatedTimestamp;
}

/**
 * Parse timestamp string to Date
 * @param timestamp - Validated timestamp
 * @returns Date object
 */
export function parseTimestamp(timestamp: ValidatedTimestamp): Date {
  return new Date(timestamp);
}

/**
 * Check if timestamp is recent (within last N minutes)
 * @param timestamp - Validated timestamp
 * @param minutes - Minutes threshold (default: 5)
 * @returns True if timestamp is within threshold
 */
export function isRecentTimestamp(
  timestamp: ValidatedTimestamp,
  minutes: number = 5
): boolean {
  const date = parseTimestamp(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes <= minutes;
}

/**
 * Format timestamp for human-readable display
 * @param timestamp - Validated timestamp
 * @returns Formatted string (e.g., "2 minutes ago")
 */
export function formatTimestampRelative(timestamp: ValidatedTimestamp): string {
  const date = parseTimestamp(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}
