/**
 * @fileoverview Production-Grade Smart Defaults Engine
 * @description Applies learned preferences and safety rules to auto-fill missing parameters
 * @module node-cli/services/smart-defaults
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * const engine = new SmartDefaultsEngine(logger);
 * const { intent: enriched, reasoning } = engine.applyDefaults(
 *   partialIntent,
 *   conversationMemory
 * );
 *
 * // Display reasoning to user
 * reasoning.forEach(reason => console.log(`💡 ${reason}`));
 * ```
 */

import type { ILogger } from '@aios/shared';
import type { CloudProviderType } from '@aios/shared';
import type { ParsedIntentType } from '../nl-planner/types.js';
import type { ConversationMemory, PriorityType, EnvironmentType } from './conversation-memory.v2.js';
import {
  type TimeRiskConfig,
  type TimeRiskAssessment,
  DEFAULT_TIME_RISK_CONFIG,
  validateTimeRiskConfig,
} from './time-risk.types.js';

/**
 * Type guard for PriorityType
 */
function isValidPriority(value: unknown): value is PriorityType {
  return value === 'cost' || value === 'speed' || value === 'safety';
}

/**
 * Type guard for EnvironmentType
 */
function isValidEnvironment(value: unknown): value is EnvironmentType {
  return (
    value === 'development' ||
    value === 'staging' ||
    value === 'production' ||
    value === 'preview'
  );
}

/**
 * Smart defaults result with reasoning
 */
export interface SmartDefaultsResult {
  readonly intent: ParsedIntentType;
  readonly reasoning: readonly string[];
  readonly appliedDefaults: readonly string[]; // List of keys that were defaulted
}

/**
 * Provider priority mapping
 */
const PROVIDER_FOR_PRIORITY: Record<PriorityType, CloudProviderType> = {
  cost: 'railway',
  speed: 'vercel',
  safety: 'aws',
};

/**
 * SmartDefaultsEngine - Intelligent parameter defaulting engine
 *
 * Uses learned preferences and safety rules to auto-fill missing parameters intelligently.
 *
 * **Key Features**:
 * - Provider selection based on learned priority (cost→Railway, speed→Vercel, safety→AWS)
 * - Environment from last successful deployment
 * - Configurable time-based safety (blocks production deploys on risky times)
 * - Transparent reasoning for all defaults
 *
 * **Safety Principles**:
 * - Never auto-select production environment on risky times
 * - Always show reasoning for applied defaults
 * - Prefer explicit user input over defaults
 *
 * **Configurability**:
 * - Time risk rules customizable per team (24/7 ops, regional schedules, holidays)
 * - Default: Standard 9-5 Mon-Fri with Friday 3pm cutoff
 *
 * **Thread Safety**: Stateless (safe for concurrent use)
 * **Performance**: O(1) - constant time operations
 */
export class SmartDefaultsEngine {
  private readonly logger: ILogger;
  private readonly timeRiskConfig: TimeRiskConfig;

  /**
   * Create a new SmartDefaultsEngine
   *
   * @param logger - Logger instance
   * @param timeRiskConfig - Time risk configuration (default: standard 9-5 Mon-Fri)
   *
   * @throws {Error} If timeRiskConfig is invalid
   *
   * @example
   * ```typescript
   * // Standard configuration
   * const engine = new SmartDefaultsEngine(logger);
   *
   * // 24/7 operations (no risky times)
   * const always = new SmartDefaultsEngine(logger, ALWAYS_SAFE_TIME_CONFIG);
   *
   * // Custom configuration
   * const custom = new SmartDefaultsEngine(logger, {
   *   businessDays: [1,2,3,4,5],
   *   businessHours: { start: 8, end: 18 },
   *   riskyHours: { friday: 16, weekend: 18 },
   *   holidays: ['2024-12-25', '2025-01-01']
   * });
   * ```
   */
  constructor(logger: ILogger, timeRiskConfig: TimeRiskConfig = DEFAULT_TIME_RISK_CONFIG) {
    this.logger = logger;

    // Validate configuration
    validateTimeRiskConfig(timeRiskConfig);

    this.timeRiskConfig = timeRiskConfig;

    this.logger.debug('SmartDefaultsEngine initialized', {
      businessDays: timeRiskConfig.businessDays,
      businessHours: timeRiskConfig.businessHours,
      riskyHours: timeRiskConfig.riskyHours,
      holidayCount: timeRiskConfig.holidays?.length ?? 0,
      enabled: timeRiskConfig.enabled ?? true,
    });
  }

  /**
   * Apply smart defaults to a partial intent
   *
   * @param intent - Partial intent (may have missing entities)
   * @param memory - Conversation memory with learned preferences
   * @param userTimezone - Optional IANA timezone for time-based safety (e.g., 'America/New_York')
   * @returns Enriched intent with reasoning for applied defaults
   *
   * @example
   * ```typescript
   * const { intent: enriched, reasoning } = engine.applyDefaults(
   *   { intent: 'deploy', entities: {}, confidence: 0.8 },
   *   conversationMemory,
   *   'America/Los_Angeles'
   * );
   *
   * // enriched.entities.provider === 'railway' (if user prefers cost)
   * // reasoning === ['Using Railway (you prefer cost optimization)']
   * ```
   */
  public applyDefaults(
    intent: ParsedIntentType,
    memory: ConversationMemory,
    userTimezone?: string
  ): SmartDefaultsResult {
    const reasoning: string[] = [];
    const appliedDefaults: string[] = [];
    let enrichedIntent = { ...intent };

    // Only apply defaults for deployment intents
    if (intent.intent !== 'deploy') {
      return {
        intent: enrichedIntent,
        reasoning: [],
        appliedDefaults: [],
      };
    }

    try {
      // 1. Apply provider from learned priority
      if (!enrichedIntent.entities.provider) {
        const providerDefault = this.getProviderDefault(memory);
        if (providerDefault) {
          enrichedIntent = {
            ...enrichedIntent,
            entities: {
              ...enrichedIntent.entities,
              provider: providerDefault.provider,
            },
          };
          reasoning.push(providerDefault.reasoning);
          appliedDefaults.push('provider');
        }
      }

      // 2. Apply environment from last deployment
      if (!enrichedIntent.entities.env) {
        const envDefault = this.getEnvironmentDefault(memory);
        if (envDefault) {
          enrichedIntent = {
            ...enrichedIntent,
            entities: {
              ...enrichedIntent.entities,
              env: envDefault.env,
            },
          };
          reasoning.push(envDefault.reasoning);
          appliedDefaults.push('env');
        }
      }

      // 3. Apply time-based safety overrides
      // ONLY override if we auto-filled the environment (not user-provided)
      const timeRisk = this.assessTimeRisk(userTimezone);
      const envWasAutoFilled = appliedDefaults.includes('env');
      if (timeRisk.shouldBlock && enrichedIntent.entities.env === 'production' && envWasAutoFilled) {
        // Override to staging for safety
        enrichedIntent = {
          ...enrichedIntent,
          entities: {
            ...enrichedIntent.entities,
            env: 'staging',
          },
        };
        reasoning.push(`Skipping production (${timeRisk.reason})`);
        appliedDefaults.push('env (safety override)');

        this.logger.warn('Time-based safety override applied', {
          originalEnv: 'production',
          overrideEnv: 'staging',
          reason: timeRisk.reason,
        });
      }

      this.logger.debug('Smart defaults applied', {
        appliedCount: appliedDefaults.length,
        appliedFields: appliedDefaults,
      });

      return {
        intent: enrichedIntent,
        reasoning,
        appliedDefaults,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to apply smart defaults - returning original intent: ${errorMessage}`);

      return {
        intent,
        reasoning: [],
        appliedDefaults: [],
      };
    }
  }

  /**
   * Get provider default based on learned priority
   *
   * **Safety**: Validates priority value with type guard before accessing mapping
   */
  private getProviderDefault(
    memory: ConversationMemory
  ): { provider: CloudProviderType; reasoning: string } | null {
    try {
      const priority = memory.getUserPriority();

      if (!priority || !isValidPriority(priority)) {
        this.logger.debug('No valid learned priority', { priority });
        return null;
      }

      const provider = PROVIDER_FOR_PRIORITY[priority];

      // Defensive check (should never happen with type guard, but safety first)
      if (!provider) {
        this.logger.error(`Invalid priority mapping - this should never happen: ${priority}`);
        return null;
      }

      return {
        provider,
        reasoning: `Using ${provider} (you prefer ${priority} optimization)`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get provider default: ${errorMsg}`);
      return null;
    }
  }

  /**
   * Get environment default from last successful deployment
   *
   * **Safety**: Validates environment value with type guard before returning
   */
  private getEnvironmentDefault(
    memory: ConversationMemory
  ): { env: EnvironmentType; reasoning: string } | null {
    try {
      const projectContext = memory.getProjectContext();

      if (!projectContext?.lastDeployment) {
        return null; // No deployment history
      }

      const lastDeployment = projectContext.lastDeployment;

      // Only use last deployment if it was successful
      if (!lastDeployment.success) {
        return null;
      }

      // Validate environment value
      if (!isValidEnvironment(lastDeployment.env)) {
        this.logger.warn('Invalid environment in last deployment', {
          env: lastDeployment.env,
        });
        return null;
      }

      return {
        env: lastDeployment.env,
        reasoning: `Using ${lastDeployment.env} (same as last time)`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get environment default: ${errorMsg}`);
      return null;
    }
  }

  /**
   * Check if a date is a configured holiday
   *
   * @param date - Date to check (YYYY-MM-DD format)
   * @returns True if date is a holiday
   */
  private isHoliday(date: Date): boolean {
    if (!this.timeRiskConfig.holidays || this.timeRiskConfig.holidays.length === 0) {
      return false;
    }

    // Format date as YYYY-MM-DD for comparison
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    return this.timeRiskConfig.holidays.includes(dateString);
  }

  /**
   * Assess time-based risk for deployments
   *
   * **Risk Levels** (configurable):
   * - **Safe**: Business days during business hours
   * - **Moderate**: Business days during evening
   * - **Risky**: Approaching weekend, late night
   * - **Dangerous**: Weekend/holiday evenings, late night
   *
   * **Configuration**:
   * - Uses `timeRiskConfig` for all thresholds
   * - Supports team-specific schedules (24/7, shift work, etc.)
   * - Holiday awareness
   *
   * **Timezone Handling**:
   * - Uses Intl.DateTimeFormat for timezone-aware time calculation
   * - Falls back to server time if timezone detection fails
   * - Defaults to 'safe' if cannot determine time (fail-safe)
   *
   * @param userTimezone - Optional IANA timezone (e.g., 'America/New_York')
   * @returns Risk assessment based on local time and configuration
   */
  private assessTimeRisk(userTimezone?: string): TimeRiskAssessment {
    // If safety checks are disabled, always return safe
    if (this.timeRiskConfig.enabled === false) {
      return {
        riskLevel: 'safe',
        reason: 'time-based safety checks disabled',
        shouldBlock: false,
      };
    }

    try {
      // Use user's timezone if provided, otherwise server's timezone
      const targetTimezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Get current time in target timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: targetTimezone,
        weekday: 'long',
        hour: 'numeric',
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const weekdayPart = parts.find(p => p.type === 'weekday');
      const hourPart = parts.find(p => p.type === 'hour');

      if (!weekdayPart || !hourPart) {
        // Cannot determine time - fail safe
        this.logger.warn('Failed to determine timezone parts - defaulting to safe', {
          targetTimezone,
          parts,
        });
        return {
          riskLevel: 'safe',
          reason: 'unable to determine timezone - allowing deployment',
          shouldBlock: false,
        };
      }

      const weekday = weekdayPart.value;
      const hour = parseInt(hourPart.value, 10);

      // Map weekday to day number (0 = Sunday)
      const dayOfWeekMap: Record<string, number> = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6,
      };
      const dayOfWeek = dayOfWeekMap[weekday];

      if (
        dayOfWeek === undefined ||
        !Number.isFinite(hour) ||
        hour < 0 ||
        hour > 23
      ) {
        // Invalid data - fail safe
        this.logger.warn('Failed to parse timezone data - defaulting to safe', {
          weekday,
          hour,
          dayOfWeek,
        });
        return {
          riskLevel: 'safe',
          reason: 'unable to parse timezone - allowing deployment',
          shouldBlock: false,
        };
      }

      // Check for holidays
      const holidayCheck = this.isHoliday(now);
      if (holidayCheck) {
        // Treat holidays like weekends
        if (hour >= this.timeRiskConfig.riskyHours.weekend) {
          return {
            riskLevel: 'dangerous',
            reason: 'holiday evening - limited support available',
            shouldBlock: true,
          };
        }
        return {
          riskLevel: 'risky',
          reason: 'holiday - reduced support coverage',
          shouldBlock: true,
        };
      }

      // Check if day is a business day
      const isBusinessDay = this.timeRiskConfig.businessDays.includes(dayOfWeek);

      // Weekend deployments (non-business days)
      if (!isBusinessDay) {
        if (hour >= this.timeRiskConfig.riskyHours.weekend) {
          return {
            riskLevel: 'dangerous',
            reason: 'weekend evening - limited support available',
            shouldBlock: true,
          };
        }
        return {
          riskLevel: 'risky',
          reason: 'weekend - reduced support coverage',
          shouldBlock: true,
        };
      }

      // Friday deployments (if Friday is a business day)
      if (dayOfWeek === 5 && isBusinessDay) {
        if (hour >= 17) {
          return {
            riskLevel: 'dangerous',
            reason: 'Friday evening - limited weekend support',
            shouldBlock: true,
          };
        }
        if (hour >= this.timeRiskConfig.riskyHours.friday) {
          return {
            riskLevel: 'risky',
            reason: 'Friday afternoon - approaching weekend',
            shouldBlock: true,
          };
        }
        if (hour >= this.timeRiskConfig.businessHours.start) {
          return {
            riskLevel: 'moderate',
            reason: `Friday morning - deployments discouraged after ${this.timeRiskConfig.riskyHours.friday}:00`,
            shouldBlock: false,
          };
        }
      }

      // Business day evening hours
      if (
        isBusinessDay &&
        hour >= this.timeRiskConfig.businessHours.end &&
        hour < 21
      ) {
        return {
          riskLevel: 'moderate',
          reason: 'evening hours - reduced support staff',
          shouldBlock: false,
        };
      }

      // Late night (any day)
      if (hour >= 21 || hour < 6) {
        return {
          riskLevel: 'risky',
          reason: 'late night/early morning - minimal support',
          shouldBlock: true,
        };
      }

      // Business hours on business days
      if (
        isBusinessDay &&
        hour >= this.timeRiskConfig.businessHours.start &&
        hour < this.timeRiskConfig.businessHours.end
      ) {
        return {
          riskLevel: 'safe',
          reason: 'business hours - full support available',
          shouldBlock: false,
        };
      }

      // Outside business hours but during the day
      return {
        riskLevel: 'moderate',
        reason: 'outside standard business hours',
        shouldBlock: false,
      };
    } catch (error) {
      // Error in timezone calculation - fail safe
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error assessing time risk - defaulting to safe: ${errorMsg}`);
      return {
        riskLevel: 'safe',
        reason: 'timezone error - allowing deployment',
        shouldBlock: false,
      };
    }
  }
}
