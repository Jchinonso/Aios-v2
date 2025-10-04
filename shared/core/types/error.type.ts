/**
 * Error Types - Extended error handling
 */

export interface AppError extends Error {
  readonly code?: string;
  readonly severity?: 'low' | 'medium' | 'high' | 'critical';
  readonly context?: Record<string, unknown>;
  readonly timestamp?: Date;
}
