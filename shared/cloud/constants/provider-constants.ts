/**
 * @fileoverview Provider Constants - Centralized configuration constants
 * @description Type-safe constants for all provider operations. Eliminates magic numbers
 * and provides single source of truth for timeouts, limits, and configurations.
 *
 * Design Principles:
 * - DRY: Single definition for all constants
 * - Type Safety: Readonly const assertions
 * - Discoverability: Clear naming and organization
 * - Maintainability: Easy to update without searching codebase
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

/**
 * Time constants in milliseconds
 * All durations use milliseconds for consistency
 */
export const TIME_CONSTANTS = {
  /** 1 second in milliseconds */
  ONE_SECOND: 1_000,
  /** 30 seconds in milliseconds */
  THIRTY_SECONDS: 30_000,
  /** 1 minute in milliseconds */
  ONE_MINUTE: 60_000,
  /** 2 minutes in milliseconds */
  TWO_MINUTES: 120_000,
  /** 4 minutes in milliseconds */
  FOUR_MINUTES: 240_000,
  /** 5 minutes in milliseconds */
  FIVE_MINUTES: 300_000,
  /** 10 minutes in milliseconds */
  TEN_MINUTES: 600_000,
  /** 15 minutes in milliseconds */
  FIFTEEN_MINUTES: 900_000,
  /** 1 hour in milliseconds */
  ONE_HOUR: 3_600_000,
  /** 1 day in milliseconds */
  ONE_DAY: 86_400_000,
} as const;

/**
 * Default limits for various operations
 */
export const DEFAULT_LIMITS = {
  /** Default maximum number of log entries to retrieve */
  LOG_ENTRIES: 100,
  /** Default maximum number of deployments to list */
  DEPLOYMENT_LIST: 50,
  /** Default maximum number of retries */
  MAX_RETRIES: 3,
  /** Default page size for paginated results */
  PAGE_SIZE: 20,
  /** Maximum concurrent operations */
  MAX_CONCURRENT: 10,
} as const;

/**
 * Polling intervals for status checks
 */
export const POLLING_INTERVALS = {
  /** Fast polling (every 2 seconds) for quick operations */
  FAST: 2_000,
  /** Normal polling (every 5 seconds) for standard operations */
  NORMAL: 5_000,
  /** Slow polling (every 10 seconds) for long-running operations */
  SLOW: 10_000,
  /** Very slow polling (every 30 seconds) for background tasks */
  VERY_SLOW: 30_000,
} as const;

/**
 * Timeout configurations for various operations
 */
export const OPERATION_TIMEOUTS = {
  /** Default API request timeout */
  API_REQUEST: TIME_CONSTANTS.ONE_MINUTE,
  /** Deployment operation timeout */
  DEPLOYMENT: TIME_CONSTANTS.FIFTEEN_MINUTES,
  /** Health check timeout */
  HEALTH_CHECK: TIME_CONSTANTS.THIRTY_SECONDS,
  /** File upload timeout */
  FILE_UPLOAD: TIME_CONSTANTS.FIVE_MINUTES,
  /** Database operation timeout */
  DATABASE: TIME_CONSTANTS.TEN_MINUTES,
} as const;

/**
 * Provider-specific capability limits
 */
export const PROVIDER_LIMITS = {
  vercel: {
    maxDeployments: 100,
    maxBuildTime: TIME_CONSTANTS.FIFTEEN_MINUTES,
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    maxConcurrentBuilds: 3,
  },
  netlify: {
    maxDeployments: 1_000,
    maxBuildTime: TIME_CONSTANTS.FIFTEEN_MINUTES,
    maxFileSize: 32 * 1024 * 1024, // 32 MB
    maxConcurrentBuilds: 1,
  },
  aws: {
    maxDeployments: 100,
    maxBuildTime: TIME_CONSTANTS.ONE_HOUR,
    maxFileSize: 250 * 1024 * 1024, // 250 MB
    maxConcurrentBuilds: 10,
  },
  railway: {
    maxDeployments: 100,
    maxBuildTime: TIME_CONSTANTS.FIFTEEN_MINUTES,
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    maxConcurrentBuilds: 5,
  },
  render: {
    maxDeployments: 100,
    maxBuildTime: TIME_CONSTANTS.FIFTEEN_MINUTES,
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    maxConcurrentBuilds: 5,
  },
} as const;

/**
 * Default cost structures for providers
 * All costs in USD
 */
export const DEFAULT_COSTS = {
  vercel: {
    freeTierRequests: 100_000,
    freeTierBandwidthGB: 100,
    proPlanMonthly: 20.00,
    enterprisePlanMonthly: 150.00,
  },
  netlify: {
    freeTierRequests: 1_000_000,
    freeTierBandwidthGB: 100,
    proPlanMonthly: 19.00,
    enterprisePlanMonthly: 99.00,
  },
  aws: {
    freeTierRequests: 1_000_000,
    lambdaCostPer1MRequests: 0.20,
    s3StorageCostPerGB: 0.023,
    cloudFrontCostPerGB: 0.085,
  },
  railway: {
    freeTierHours: 500,
    starterPlanMonthly: 5.00,
    proPlanMonthly: 20.00,
  },
  render: {
    freeTierHours: 750,
    starterPlanMonthly: 7.00,
    proPlanMonthly: 25.00,
  },
} as const;

/**
 * Progress percentage constants
 */
export const PROGRESS = {
  /** Operation just started */
  STARTED: 10,
  /** Operation in preparation phase */
  PREPARING: 25,
  /** Operation halfway through */
  HALFWAY: 50,
  /** Operation nearly complete */
  NEARLY_DONE: 90,
  /** Operation completed */
  COMPLETE: 100,
} as const;

/**
 * HTTP status codes commonly used
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Retry configuration presets
 */
export const RETRY_CONFIGS = {
  /** Fast retry for quick operations */
  FAST: {
    maxAttempts: 3,
    initialDelayMs: 1_000,
    maxDelayMs: 5_000,
    backoffMultiplier: 2,
  },
  /** Standard retry configuration */
  STANDARD: {
    maxAttempts: 3,
    initialDelayMs: 2_000,
    maxDelayMs: 10_000,
    backoffMultiplier: 2,
  },
  /** Aggressive retry for critical operations */
  AGGRESSIVE: {
    maxAttempts: 5,
    initialDelayMs: 1_000,
    maxDelayMs: 30_000,
    backoffMultiplier: 3,
  },
} as const;

/**
 * Resource size constants
 */
export const RESOURCE_SIZES = {
  /** 1 KB in bytes */
  ONE_KB: 1_024,
  /** 1 MB in bytes */
  ONE_MB: 1_048_576,
  /** 1 GB in bytes */
  ONE_GB: 1_073_741_824,
  /** Maximum upload chunk size (5 MB) */
  MAX_UPLOAD_CHUNK: 5 * 1_048_576,
  /** Maximum log line length */
  MAX_LOG_LINE: 2_000,
} as const;

/**
 * Deployment phase progress mappings
 */
export const PHASE_PROGRESS_MAP = {
  queued: PROGRESS.STARTED,
  preparing: PROGRESS.PREPARING,
  building: PROGRESS.HALFWAY,
  deploying: PROGRESS.NEARLY_DONE,
  ready: PROGRESS.COMPLETE,
  failed: PROGRESS.STARTED,
  cancelled: PROGRESS.STARTED,
} as const;

/**
 * Type-safe getter for phase progress
 * @param phase Deployment phase
 * @returns Progress percentage
 */
export function getProgressForPhase(phase: string): number {
  return PHASE_PROGRESS_MAP[phase as keyof typeof PHASE_PROGRESS_MAP] || PROGRESS.STARTED;
}

/**
 * Calculate time ago from timestamp
 * @param timestamp Date object or timestamp
 * @returns Object with time and unit
 */
export function getTimeAgo(timestamp: Date | number): { value: number; unit: string } {
  const now = Date.now();
  const then = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const diffMs = now - then;

  if (diffMs < TIME_CONSTANTS.ONE_MINUTE) {
    return { value: Math.floor(diffMs / TIME_CONSTANTS.ONE_SECOND), unit: 'seconds' };
  } else if (diffMs < TIME_CONSTANTS.ONE_HOUR) {
    return { value: Math.floor(diffMs / TIME_CONSTANTS.ONE_MINUTE), unit: 'minutes' };
  } else if (diffMs < TIME_CONSTANTS.ONE_DAY) {
    return { value: Math.floor(diffMs / TIME_CONSTANTS.ONE_HOUR), unit: 'hours' };
  } else {
    return { value: Math.floor(diffMs / TIME_CONSTANTS.ONE_DAY), unit: 'days' };
  }
}

/**
 * Get timestamp for relative time
 * @param amount Amount of time units
 * @param unit Time unit
 * @returns Date object
 */
export function getTimestamp(amount: number, unit: 'seconds' | 'minutes' | 'hours' | 'days'): Date {
  const multipliers = {
    seconds: TIME_CONSTANTS.ONE_SECOND,
    minutes: TIME_CONSTANTS.ONE_MINUTE,
    hours: TIME_CONSTANTS.ONE_HOUR,
    days: TIME_CONSTANTS.ONE_DAY,
  };

  return new Date(Date.now() - amount * multipliers[unit]);
}

/**
 * Type exports for const assertion
 */
export type TimeConstant = typeof TIME_CONSTANTS[keyof typeof TIME_CONSTANTS];
export type DefaultLimit = typeof DEFAULT_LIMITS[keyof typeof DEFAULT_LIMITS];
export type PollingInterval = typeof POLLING_INTERVALS[keyof typeof POLLING_INTERVALS];
export type OperationTimeout = typeof OPERATION_TIMEOUTS[keyof typeof OPERATION_TIMEOUTS];
export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
export type ProgressValue = typeof PROGRESS[keyof typeof PROGRESS];
