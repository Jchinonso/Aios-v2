/**
 * @fileoverview Session Type Definitions
 * @description Types for session metadata and querying
 * @module node-cli/services
 */

/**
 * Session metadata for listing and querying
 *
 * Contains essential information about a saved session without loading full content.
 *
 * @example
 * ```typescript
 * const sessions = await persistence.listSessions();
 * sessions.forEach(session => {
 *   console.log(`${session.sessionId}: ${session.turns} turns`);
 *   console.log(`Created: ${session.createdAt}`);
 *   console.log(`Size: ${session.size} bytes`);
 * });
 * ```
 */
export interface SessionMetadata {
  /** Unique session identifier */
  readonly sessionId: string;

  /** Absolute path to session file */
  readonly path: string;

  /** ISO 8601 timestamp when session was created */
  readonly createdAt: string;

  /** Last modification date */
  readonly lastModified: Date;

  /** File size in bytes */
  readonly size: number;
}
