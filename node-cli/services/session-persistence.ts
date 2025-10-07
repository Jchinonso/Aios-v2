/**
 * @fileoverview Session Persistence with Atomic Writes
 * @description Manages conversation session persistence to filesystem with data integrity guarantees
 * @module node-cli/services/session-persistence
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { ILogger } from '@aios/shared';
import type { MemorySnapshot } from './conversation-memory.v2.js';

/**
 * Result type for type-safe error handling
 */
export type Result<T, E = Error> =
  | { isSuccess: true; isFailure: false; value: T; error?: undefined }
  | { isSuccess: false; isFailure: true; value?: undefined; error: E };

/**
 * Session metadata for listing
 */
export interface SessionMetadata {
  readonly sessionId: string;
  readonly path: string;
  readonly createdAt: string; // ISO 8601 timestamp
  readonly lastModified: Date;
  readonly size: number;
}

/**
 * Session persistence manager with atomic write guarantees
 *
 * Features:
 * - Atomic writes (temp file + rename)
 * - Session TTL (7-day auto-cleanup)
 * - Path traversal protection
 * - Concurrent access handling
 * - Resumable session detection
 *
 * @example
 * ```typescript
 * const persistence = new SessionPersistence(logger);
 *
 * // Save session
 * const result = await persistence.saveSession('session-001', snapshot);
 * if (result.isSuccess) {
 *   console.log('Session saved');
 * }
 *
 * // Load session
 * const loaded = await persistence.loadSession('session-001');
 * if (loaded.isSuccess) {
 *   const memory = ConversationMemory.fromSnapshot(loaded.value, logger);
 * }
 * ```
 */
export class SessionPersistence {
  private static readonly SESSION_FILE_EXTENSION = '.json';
  private static readonly TEMP_FILE_SUFFIX = '.tmp';
  private static readonly SESSION_TTL_DAYS = 7;
  private static readonly RESUMABLE_THRESHOLD_HOURS = 24;
  private static readonly MAX_SESSION_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_SESSION_ID_LENGTH = 255;
  private static readonly SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
  private static readonly WINDOWS_RESERVED_NAMES = new Set([
    'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5',
    'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4',
    'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ]);

  private readonly sessionsDir: string;

  /**
   * Creates a new SessionPersistence instance
   *
   * @param logger - Logger instance
   * @param sessionsDir - Directory for session storage (defaults to ~/.aios/sessions/)
   */
  constructor(
    private readonly logger: ILogger,
    sessionsDir?: string
  ) {
    this.sessionsDir = sessionsDir || path.join(os.homedir(), '.aios', 'sessions');
  }

  /**
   * Ensure sessions directory exists
   * Creates directory with proper permissions if missing
   */
  public async ensureDirectory(): Promise<Result<void>> {
    try {
      // Check if directory already exists
      try {
        await fs.access(this.sessionsDir);
        this.logger.debug('Sessions directory ready', {
          path: this.sessionsDir
        });
        return { isSuccess: true, isFailure: false, value: undefined };
      } catch {
        // Directory doesn't exist, create it
        await fs.mkdir(this.sessionsDir, { recursive: true, mode: 0o700 });
        this.logger.debug('Sessions directory initialized', {
          path: this.sessionsDir
        });
        return { isSuccess: true, isFailure: false, value: undefined };
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to create sessions directory', error, {
        path: this.sessionsDir
      });
      return { isSuccess: false, isFailure: true, error };
    }
  }

  /**
   * Save session snapshot with atomic write
   * Uses temp file + rename pattern to prevent corruption
   *
   * @param sessionId - Unique session identifier
   * @param snapshot - Memory snapshot to persist
   * @returns Result with success/failure
   */
  public async saveSession(
    sessionId: string,
    snapshot: MemorySnapshot
  ): Promise<Result<void>> {
    // Validate session ID
    const validationResult = this.validateSessionId(sessionId);
    if (validationResult.isFailure) {
      return validationResult;
    }

    // Validate snapshot
    const snapshotValidation = this.validateSnapshot(snapshot);
    if (snapshotValidation.isFailure) {
      return snapshotValidation;
    }

    // Ensure directory exists
    const dirResult = await this.ensureDirectory();
    if (dirResult.isFailure) {
      return dirResult;
    }

    const sessionPath = this.getSessionPath(sessionId);
    // Use unique temp file name for concurrent writes
    const tempPath = `${sessionPath}.${Date.now()}.${Math.random().toString(36).substring(7)}${SessionPersistence.TEMP_FILE_SUFFIX}`;

    try {
      // Serialize snapshot (catch circular references and other serialization errors)
      let json: string;
      try {
        json = JSON.stringify(snapshot, null, 2);
      } catch (serializeErr) {
        const error = serializeErr instanceof Error
          ? new Error(`Failed to serialize snapshot: ${serializeErr.message}`)
          : new Error('Failed to serialize snapshot: unknown error');
        this.logger.error('Snapshot serialization failed', error, { sessionId });
        return { isSuccess: false, isFailure: true, error };
      }

      // Check size limit
      if (Buffer.byteLength(json, 'utf8') > SessionPersistence.MAX_SESSION_SIZE_BYTES) {
        const error = new Error(
          `Snapshot exceeds max size (${SessionPersistence.MAX_SESSION_SIZE_BYTES} bytes)`
        );
        this.logger.error('Snapshot too large', error, { sessionId });
        return { isSuccess: false, isFailure: true, error };
      }

      // Atomic write: temp file + rename (unique temp name for concurrency)
      await fs.writeFile(tempPath, json, { encoding: 'utf8', mode: 0o600 });
      await fs.rename(tempPath, sessionPath);

      this.logger.info('Session saved', {
        sessionId,
        path: sessionPath,
        size: Buffer.byteLength(json, 'utf8')
      });

      return { isSuccess: true, isFailure: false, value: undefined };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to save session', error, { sessionId });

      // Cleanup temp file if exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

      return { isSuccess: false, isFailure: true, error };
    }
  }

  /**
   * Load session snapshot from disk
   *
   * @param sessionId - Session identifier
   * @returns Result with snapshot or error
   */
  public async loadSession(sessionId: string): Promise<Result<MemorySnapshot>> {
    // Validate session ID
    const validationResult = this.validateSessionId(sessionId);
    if (validationResult.isFailure) {
      return { isSuccess: false, isFailure: true, error: validationResult.error };
    }

    const sessionPath = this.getSessionPath(sessionId);

    try {
      // Check if file exists
      try {
        await fs.access(sessionPath);
      } catch {
        const error = new Error(`Session not found: ${sessionId}`);
        this.logger.warn('Session not found', { sessionId, path: sessionPath });
        return { isSuccess: false, isFailure: true, error };
      }

      // Read file
      const json = await fs.readFile(sessionPath, 'utf8');

      // Parse JSON
      let snapshot: any;
      try {
        snapshot = JSON.parse(json);
      } catch (parseErr) {
        const error = parseErr instanceof Error
          ? new Error(`Failed to parse session: ${parseErr.message}`)
          : new Error(`Failed to parse session: ${sessionId}`);
        this.logger.error('Failed to parse session JSON', error, { sessionId });
        return { isSuccess: false, isFailure: true, error };
      }

      // Validate snapshot structure
      const snapshotValidation = this.validateSnapshot(snapshot);
      if (snapshotValidation.isFailure) {
        this.logger.warn('Invalid snapshot schema in session file', { sessionId, error: snapshotValidation.error.message });
        return { isSuccess: false, isFailure: true, error: snapshotValidation.error };
      }

      this.logger.debug('Session loaded', { sessionId, path: sessionPath });

      return { isSuccess: true, isFailure: false, value: snapshot as MemorySnapshot };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to load session', error, { sessionId });
      return { isSuccess: false, isFailure: true, error };
    }
  }

  /**
   * List all sessions sorted by last modified (newest first)
   *
   * @returns Result with session metadata array
   */
  public async listSessions(): Promise<Result<SessionMetadata[]>> {
    try {
      // Ensure directory exists
      const dirResult = await this.ensureDirectory();
      if (dirResult.isFailure) {
        return { isSuccess: false, isFailure: true, error: dirResult.error };
      }

      // Read directory
      const files = await fs.readdir(this.sessionsDir);

      // Filter session files (exclude temp files)
      const sessionFiles = files.filter(
        file =>
          file.endsWith(SessionPersistence.SESSION_FILE_EXTENSION) &&
          !file.endsWith(SessionPersistence.TEMP_FILE_SUFFIX)
      );

      // Get metadata for each session
      const sessions: SessionMetadata[] = [];
      for (const file of sessionFiles) {
        const sessionPath = path.join(this.sessionsDir, file);
        try {
          const stats = await fs.stat(sessionPath);
          const json = await fs.readFile(sessionPath, 'utf8');
          const snapshot = JSON.parse(json);

          sessions.push({
            sessionId: path.basename(file, SessionPersistence.SESSION_FILE_EXTENSION),
            path: sessionPath,
            createdAt: snapshot.createdAt || new Date(stats.birthtime).toISOString(),
            lastModified: stats.mtime,
            size: stats.size
          });
        } catch (err) {
          // Skip corrupt files
          this.logger.warn('Skipping corrupt session file', { file, error: String(err) });
        }
      }

      // Sort by createdAt timestamp (newest first)
      sessions.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeB - timeA;
      });

      this.logger.debug('Sessions listed', { count: sessions.length });

      return { isSuccess: true, isFailure: false, value: sessions };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to list sessions', error);
      return { isSuccess: false, isFailure: true, error };
    }
  }

  /**
   * List resumable sessions (< 24 hours old)
   *
   * @returns Result with resumable session metadata
   */
  public async listResumableSessions(): Promise<Result<SessionMetadata[]>> {
    const listResult = await this.listSessions();
    if (listResult.isFailure) {
      return listResult;
    }

    const now = Date.now();
    const threshold = SessionPersistence.RESUMABLE_THRESHOLD_HOURS * 3600 * 1000;

    const resumable = listResult.value.filter(session => {
      // Use lastModified (when session was last saved) to determine if it's resumable
      // This ensures we don't resume sessions that haven't been used recently
      const lastModifiedTime = session.lastModified.getTime();
      const age = now - lastModifiedTime;
      return age < threshold;
    });

    this.logger.debug('Resumable sessions filtered', {
      total: listResult.value.length,
      resumable: resumable.length,
      thresholdHours: SessionPersistence.RESUMABLE_THRESHOLD_HOURS
    });

    return { isSuccess: true, isFailure: false, value: resumable };
  }

  /**
   * Get most recent resumable session
   *
   * @returns Result with session metadata or null if none found
   */
  public async getMostRecentResumableSession(): Promise<Result<SessionMetadata | null>> {
    const resumableResult = await this.listResumableSessions();
    if (resumableResult.isFailure) {
      return { isSuccess: false, isFailure: true, error: resumableResult.error };
    }

    const mostRecent = resumableResult.value[0] || null;

    if (mostRecent) {
      this.logger.debug('Most recent resumable session found', { sessionId: mostRecent.sessionId });
    } else {
      this.logger.debug('No resumable sessions found');
    }

    return { isSuccess: true, isFailure: false, value: mostRecent };
  }

  /**
   * Clean old sessions (> 7 days)
   *
   * @returns Result with number of deleted sessions
   */
  public async cleanOldSessions(): Promise<Result<number>> {
    const listResult = await this.listSessions();
    if (listResult.isFailure) {
      return { isSuccess: false, isFailure: true, error: listResult.error };
    }

    const now = Date.now();
    const ttl = SessionPersistence.SESSION_TTL_DAYS * 24 * 3600 * 1000;

    let deletedCount = 0;
    for (const session of listResult.value) {
      const createdAt = new Date(session.createdAt).getTime();
      const age = now - createdAt;

      if (age > ttl) {
        try {
          await fs.unlink(session.path);
          deletedCount++;
          this.logger.info('Old session deleted', {
            sessionId: session.sessionId,
            age: Math.floor(age / (24 * 3600 * 1000)) + ' days'
          });
        } catch (err) {
          this.logger.warn('Failed to delete old session', {
            sessionId: session.sessionId,
            error: String(err)
          });
        }
      }
    }

    this.logger.info('Old sessions cleaned', { deletedCount });

    return { isSuccess: true, isFailure: false, value: deletedCount };
  }

  /**
   * Delete specific session
   *
   * @param sessionId - Session identifier
   * @returns Result with success/failure
   */
  public async deleteSession(sessionId: string): Promise<Result<void>> {
    // Validate session ID
    const validationResult = this.validateSessionId(sessionId);
    if (validationResult.isFailure) {
      return validationResult;
    }

    const sessionPath = this.getSessionPath(sessionId);

    try {
      await fs.unlink(sessionPath);
      this.logger.info('Session deleted', { sessionId, path: sessionPath });
      return { isSuccess: true, isFailure: false, value: undefined };
    } catch (err) {
      // Check if file doesn't exist (idempotent delete)
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        this.logger.debug('Session already deleted', { sessionId });
        return { isSuccess: true, isFailure: false, value: undefined }; // Idempotent
      }

      const wrappedError = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to delete session', wrappedError, { sessionId });
      return { isSuccess: false, isFailure: true, error: wrappedError };
    }
  }

  /**
   * Validate session ID to prevent path traversal
   *
   * @param sessionId - Session identifier to validate
   * @returns Result with success/failure
   */
  private validateSessionId(sessionId: string): Result<void> {
    if (!sessionId || typeof sessionId !== 'string') {
      const error = new Error('Invalid session ID: must be a non-empty string');
      return { isSuccess: false, isFailure: true, error };
    }

    if (sessionId.length > SessionPersistence.MAX_SESSION_ID_LENGTH) {
      const error = new Error(
        `Invalid session ID: exceeds max length (${SessionPersistence.MAX_SESSION_ID_LENGTH} characters)`
      );
      return { isSuccess: false, isFailure: true, error };
    }

    if (sessionId.includes('..') || sessionId.includes('/') || sessionId.includes('\\')) {
      const error = new Error('Invalid session ID: path traversal detected');
      return { isSuccess: false, isFailure: true, error };
    }

    // Check Windows reserved names (case-insensitive)
    if (SessionPersistence.WINDOWS_RESERVED_NAMES.has(sessionId.toUpperCase())) {
      const error = new Error(
        `Invalid session ID: '${sessionId}' is a reserved name on Windows`
      );
      return { isSuccess: false, isFailure: true, error };
    }

    if (!SessionPersistence.SESSION_ID_PATTERN.test(sessionId)) {
      const error = new Error(
        'Invalid session ID: format (allowed: alphanumeric, dash, underscore)'
      );
      return { isSuccess: false, isFailure: true, error };
    }

    return { isSuccess: true, isFailure: false, value: undefined };
  }

  /**
   * Validate snapshot structure
   *
   * @param snapshot - Snapshot to validate
   * @returns Result with success/failure
   */
  private validateSnapshot(snapshot: any): Result<void> {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      const error = new Error('Invalid snapshot: must be an object');
      return { isSuccess: false, isFailure: true, error };
    }

    if (typeof snapshot.version !== 'number' || isNaN(snapshot.version) || !isFinite(snapshot.version)) {
      const error = new Error('Invalid snapshot: missing or invalid version number');
      return { isSuccess: false, isFailure: true, error };
    }

    // Version range validation
    if (snapshot.version < 0 || snapshot.version > 1000) {
      const error = new Error(`Invalid snapshot: version ${snapshot.version} out of range (0-1000)`);
      return { isSuccess: false, isFailure: true, error };
    }

    if (!Array.isArray(snapshot.turns)) {
      const error = new Error('Invalid snapshot: missing turns array');
      return { isSuccess: false, isFailure: true, error };
    }

    if (!Array.isArray(snapshot.preferences)) {
      const error = new Error('Invalid snapshot: missing preferences array');
      return { isSuccess: false, isFailure: true, error };
    }

    if (!snapshot.createdAt || typeof snapshot.createdAt !== 'string') {
      const error = new Error('Invalid snapshot: missing createdAt timestamp');
      return { isSuccess: false, isFailure: true, error };
    }

    // Validate ISO 8601 format
    if (isNaN(Date.parse(snapshot.createdAt))) {
      const error = new Error('Invalid snapshot: createdAt must be valid ISO 8601 timestamp');
      return { isSuccess: false, isFailure: true, error };
    }

    // Validate projectContext if present (must be object, not array or primitive)
    if (snapshot.projectContext !== null && snapshot.projectContext !== undefined) {
      if (typeof snapshot.projectContext !== 'object' || Array.isArray(snapshot.projectContext)) {
        const error = new Error('Invalid snapshot: projectContext must be an object or null');
        return { isSuccess: false, isFailure: true, error };
      }
    }

    return { isSuccess: true, isFailure: false, value: undefined };
  }

  /**
   * Get full path for session file
   *
   * @param sessionId - Session identifier
   * @returns Absolute path to session file
   */
  private getSessionPath(sessionId: string): string {
    return path.join(
      this.sessionsDir,
      `${sessionId}${SessionPersistence.SESSION_FILE_EXTENSION}`
    );
  }
}
