/**
 * @fileoverview Policy Engine - Safety guardrails and compliance checks
 * @description Enforce policies before dangerous operations
 * @module node-cli/policy/policy-engine
 */

import type { ParsedIntentType } from '../nl-planner/types.js';
import type { StateManager } from '../state/state-manager.js';

/**
 * Policy check result
 */
export interface PolicyCheckResultType {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly violations: readonly PolicyViolationType[];
  readonly warnings: readonly string[];
}

/**
 * Policy violation
 */
export interface PolicyViolationType {
  readonly rule: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
}

/**
 * Policy configuration
 */
export interface PolicyConfigType {
  // Freeze windows - prevent deployments during specified times
  readonly freezeWindows?: readonly FreezeWindowType[];

  // Rate limiting - prevent too many deployments in short time
  readonly rateLimits?: {
    readonly maxDeploymentsPerHour?: number;
    readonly maxDeploymentsPerDay?: number;
  };

  // Approval requirements
  readonly approvals?: {
    readonly productionRequiresApproval?: boolean;
    readonly rollbackRequiresApproval?: boolean;
  };

  // Environment restrictions
  readonly environmentRestrictions?: {
    readonly allowedProviders?: readonly string[];
    readonly blockedServices?: readonly string[];
  };

  // Time-based restrictions
  readonly timeRestrictions?: {
    readonly noProductionDeploysOnFriday?: boolean;
    readonly noProductionDeploysAfterHours?: boolean;
    readonly businessHoursOnly?: boolean;
  };
}

/**
 * Freeze window - block deployments during specified time
 */
export interface FreezeWindowType {
  readonly name: string;
  readonly start: Date;
  readonly end: Date;
  readonly environments: readonly string[];
  readonly reason: string;
}

/**
 * Policy Engine - Enforce safety rules
 */
export class PolicyEngine {
  private readonly config: PolicyConfigType;
  private readonly stateManager: StateManager | undefined;

  constructor(config: PolicyConfigType = {}, stateManager?: StateManager) {
    this.config = config;
    this.stateManager = stateManager;
  }

  /**
   * Check if an operation is allowed by policy
   */
  async checkPolicy(intent: ParsedIntentType): Promise<PolicyCheckResultType> {
    const violations: PolicyViolationType[] = [];
    const warnings: string[] = [];

    // Check freeze windows
    const freezeViolation = this.checkFreezeWindows(intent);
    if (freezeViolation) {
      violations.push(freezeViolation);
    }

    // Check rate limits
    const rateLimitViolation = await this.checkRateLimits(intent);
    if (rateLimitViolation) {
      violations.push(rateLimitViolation);
    }

    // Check time restrictions
    const timeViolation = this.checkTimeRestrictions(intent);
    if (timeViolation) {
      violations.push(timeViolation);
    }

    // Check environment restrictions
    const envViolation = this.checkEnvironmentRestrictions(intent);
    if (envViolation) {
      violations.push(envViolation);
    }

    // Generate warnings
    if (this.isFridayDeploy(intent)) {
      warnings.push('⚠️  Friday deployment - consider waiting until Monday');
    }

    if (this.isAfterHours(intent)) {
      warnings.push('⚠️  After-hours deployment - ensure on-call is available');
    }

    // Determine if allowed
    const errorViolations = violations.filter(v => v.severity === 'error');
    const allowed = errorViolations.length === 0;

    const result: PolicyCheckResultType = {
      allowed,
      violations,
      warnings
    };

    if (errorViolations.length > 0 && errorViolations[0]) {
      return { ...result, reason: errorViolations[0].message };
    }

    return result;
  }

  /**
   * Check freeze windows
   */
  private checkFreezeWindows(intent: ParsedIntentType): PolicyViolationType | null {
    if (!this.config.freezeWindows || intent.intent !== 'deploy') {
      return null;
    }

    const now = new Date();
    const environment = intent.entities.env;

    if (!environment) {
      return null;
    }

    for (const window of this.config.freezeWindows) {
      if (now >= window.start && now <= window.end) {
        if (window.environments.includes(environment)) {
          return {
            rule: 'freeze-window',
            severity: 'error',
            message: `Deployment freeze: ${window.reason} (until ${window.end.toLocaleString()})`
          };
        }
      }
    }

    return null;
  }

  /**
   * Check rate limits
   */
  private async checkRateLimits(intent: ParsedIntentType): Promise<PolicyViolationType | null> {
    if (!this.config.rateLimits || !this.stateManager || intent.intent !== 'deploy') {
      return null;
    }

    const history = await this.stateManager.getHistory(100);

    // Check hourly limit
    if (this.config.rateLimits.maxDeploymentsPerHour) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentDeploys = history.filter(r =>
        r.timestamp > oneHourAgo && r.status === 'success'
      );

      if (recentDeploys.length >= this.config.rateLimits.maxDeploymentsPerHour) {
        return {
          rule: 'rate-limit-hourly',
          severity: 'error',
          message: `Rate limit exceeded: ${this.config.rateLimits.maxDeploymentsPerHour} deployments per hour`
        };
      }
    }

    // Check daily limit
    if (this.config.rateLimits.maxDeploymentsPerDay) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentDeploys = history.filter(r =>
        r.timestamp > oneDayAgo && r.status === 'success'
      );

      if (recentDeploys.length >= this.config.rateLimits.maxDeploymentsPerDay) {
        return {
          rule: 'rate-limit-daily',
          severity: 'error',
          message: `Rate limit exceeded: ${this.config.rateLimits.maxDeploymentsPerDay} deployments per day`
        };
      }
    }

    return null;
  }

  /**
   * Check time restrictions
   */
  private checkTimeRestrictions(intent: ParsedIntentType): PolicyViolationType | null {
    if (!this.config.timeRestrictions || intent.intent !== 'deploy') {
      return null;
    }

    const environment = intent.entities.env;
    if (environment !== 'production') {
      return null; // Time restrictions only apply to production
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
    const hour = now.getHours();

    // No Friday production deploys
    if (this.config.timeRestrictions.noProductionDeploysOnFriday && dayOfWeek === 5) {
      return {
        rule: 'no-friday-deploys',
        severity: 'error',
        message: 'Production deployments not allowed on Fridays'
      };
    }

    // No after-hours production deploys
    if (this.config.timeRestrictions.noProductionDeploysAfterHours) {
      if (hour < 9 || hour >= 17) {
        return {
          rule: 'no-after-hours-deploys',
          severity: 'error',
          message: 'Production deployments only allowed between 9 AM - 5 PM'
        };
      }
    }

    // Business hours only
    if (this.config.timeRestrictions.businessHoursOnly) {
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isBusinessHours = hour >= 9 && hour < 17;

      if (isWeekend || !isBusinessHours) {
        return {
          rule: 'business-hours-only',
          severity: 'error',
          message: 'Production deployments only allowed during business hours (Mon-Fri 9 AM - 5 PM)'
        };
      }
    }

    return null;
  }

  /**
   * Check environment restrictions
   */
  private checkEnvironmentRestrictions(intent: ParsedIntentType): PolicyViolationType | null {
    if (!this.config.environmentRestrictions) {
      return null;
    }

    // Check allowed providers
    if (this.config.environmentRestrictions.allowedProviders) {
      const provider = intent.entities.provider;
      if (provider && !this.config.environmentRestrictions.allowedProviders.includes(provider)) {
        return {
          rule: 'allowed-providers',
          severity: 'error',
          message: `Provider '${provider}' not allowed. Allowed: ${this.config.environmentRestrictions.allowedProviders.join(', ')}`
        };
      }
    }

    // Check blocked services
    if (this.config.environmentRestrictions.blockedServices) {
      const service = intent.entities.service;
      if (service && this.config.environmentRestrictions.blockedServices.includes(service)) {
        return {
          rule: 'blocked-services',
          severity: 'error',
          message: `Service '${service}' is blocked from deployment`
        };
      }
    }

    return null;
  }

  /**
   * Check if this is a Friday deploy
   */
  private isFridayDeploy(intent: ParsedIntentType): boolean {
    if (intent.intent !== 'deploy' || intent.entities.env !== 'production') {
      return false;
    }
    const dayOfWeek = new Date().getDay();
    return dayOfWeek === 5;
  }

  /**
   * Check if this is after hours
   */
  private isAfterHours(intent: ParsedIntentType): boolean {
    if (intent.intent !== 'deploy' || intent.entities.env !== 'production') {
      return false;
    }
    const hour = new Date().getHours();
    return hour < 9 || hour >= 17;
  }
}

/**
 * Default policy configuration (permissive)
 */
export const DEFAULT_POLICY: PolicyConfigType = {
  rateLimits: {
    maxDeploymentsPerHour: 10,
    maxDeploymentsPerDay: 50
  },
  approvals: {
    productionRequiresApproval: false,
    rollbackRequiresApproval: false
  },
  timeRestrictions: {
    noProductionDeploysOnFriday: false,
    noProductionDeploysAfterHours: false,
    businessHoursOnly: false
  }
};

/**
 * Strict policy configuration (restrictive)
 */
export const STRICT_POLICY: PolicyConfigType = {
  rateLimits: {
    maxDeploymentsPerHour: 5,
    maxDeploymentsPerDay: 20
  },
  approvals: {
    productionRequiresApproval: true,
    rollbackRequiresApproval: true
  },
  timeRestrictions: {
    noProductionDeploysOnFriday: true,
    noProductionDeploysAfterHours: true,
    businessHoursOnly: false
  }
};
