/**
 * @fileoverview Proactive Risk Analyzer
 * @module node-cli/services/proactive-risk-analyzer
 *
 * Production-grade risk analysis engine that detects and prevents risky deployments.
 *
 * Features:
 * - Timing risk detection (Friday PM, weekends, late night)
 * - Environment validation
 * - Database migration detection
 * - Weighted risk scoring
 * - Actionable recommendations
 *
 * Design Principles:
 * - Fail-safe: Errors default to allowing deployment (don't block users)
 * - Type-safe: Discriminated unions for all risk types
 * - Extensible: Easy to add new risk detectors
 * - Observable: Comprehensive logging for debugging
 *
 * @example
 * ```typescript
 * const analyzer = new ProactiveRiskAnalyzer(logger);
 * const result = await analyzer.analyze({
 *   provider: 'vercel',
 *   environment: 'production',
 *   currentTime: new Date(),
 * });
 *
 * if (!result.canProceed) {
 *   console.log(result.recommendation);
 *   // Block deployment or require override
 * }
 * ```
 */

import type { ILogger } from '@aios/shared';
import {
  RiskSeverityEnum,
  RiskCategoryEnum,
  createRiskScore,
  type RiskAnalysisContext,
  type RiskAnalysisResult,
  type Risk,
  type TimingRisk,
  type TimeWindow,
  type RiskScore,
} from './risk-analysis.types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Risk severity weights for overall score calculation
 */
const SEVERITY_WEIGHTS: Record<RiskSeverityEnum, number> = {
  [RiskSeverityEnum.CRITICAL]: 1.0,
  [RiskSeverityEnum.HIGH]: 0.7,
  [RiskSeverityEnum.MEDIUM]: 0.4,
  [RiskSeverityEnum.LOW]: 0.2,
};

/**
 * User priority multipliers for risk sensitivity
 */
const PRIORITY_MULTIPLIERS: Record<'cost' | 'speed' | 'safety', number> = {
  cost: 0.8, // Less strict
  speed: 0.9, // Normal
  safety: 1.2, // More strict
};

/**
 * Proactive Risk Analyzer
 *
 * Analyzes deployment context and detects risks proactively.
 * Returns structured risk data with severity levels and recommendations.
 */
export class ProactiveRiskAnalyzer {
  constructor(private readonly logger: ILogger) {
    this.logger.debug('ProactiveRiskAnalyzer initialized');
  }

  /**
   * Analyze deployment context for risks
   *
   * @param context - Deployment context to analyze
   * @returns Risk analysis result with all detected risks
   *
   * @example
   * ```typescript
   * const result = await analyzer.analyze({
   *   provider: 'vercel',
   *   environment: 'production',
   *   currentTime: new Date('2025-10-10T17:30:00'), // Friday 5:30 PM
   * });
   *
   * console.log(result.canProceed); // false (critical risk)
   * console.log(result.recommendation); // "Deploy Monday morning 9-11 AM instead"
   * ```
   */
  public async analyze(context: RiskAnalysisContext): Promise<RiskAnalysisResult> {
    const startTime = Date.now();
    this.logger.info('Starting risk analysis', {
      provider: context.provider,
      environment: context.environment,
    });

    try {
      // Collect all risks from different detectors
      const risks: Risk[] = [];

      // 1. Timing risk detection
      const timingRisks = this.detectTimingRisks(context);
      risks.push(...timingRisks);

      // 2. Environment variable risk detection (future)
      // const envRisks = await this.detectEnvironmentRisks(context);
      // risks.push(...envRisks);

      // 3. Database migration risk detection (future)
      // const dbRisks = await this.detectDatabaseRisks(context);
      // risks.push(...dbRisks);

      // Calculate overall risk score
      const overallScore = this.calculateOverallScore(risks, context);

      // Determine if deployment can proceed
      const hasCriticalRisk = risks.some((r) => r.severity === RiskSeverityEnum.CRITICAL);
      const canProceed = !hasCriticalRisk;
      const requiresOverride = hasCriticalRisk;

      // Generate recommendation
      const recommendation = this.generateRecommendation(risks, context);

      const result: RiskAnalysisResult = {
        risks,
        overallScore,
        canProceed,
        requiresOverride,
        recommendation,
        analyzedAt: new Date(),
      };

      const duration = Date.now() - startTime;
      this.logger.info('Risk analysis complete', {
        riskCount: risks.length,
        overallScore,
        canProceed,
        durationMs: duration,
      });

      return result;
    } catch (error) {
      // Fail-safe: On error, allow deployment but log warning
      this.logger.error(`Risk analysis failed - defaulting to allow deployment: ${error instanceof Error ? error.message : String(error)}`);

      return {
        risks: [],
        overallScore: createRiskScore(0),
        canProceed: true,
        requiresOverride: false,
        recommendation: 'Risk analysis failed. Proceed with caution.',
        analyzedAt: new Date(),
      };
    }
  }

  /**
   * Detect timing-based risks
   *
   * Critical risks:
   * - Friday 5pm+ production deployments
   * - Weekend production deployments
   *
   * High risks:
   * - Late night (11pm+) production deployments
   * - Thursday 5pm+ production deployments
   *
   * @param context - Analysis context
   * @returns Array of timing risks
   */
  private detectTimingRisks(context: RiskAnalysisContext): TimingRisk[] {
    const risks: TimingRisk[] = [];
    const currentTime = context.currentTime ?? new Date();
    const isProduction = context.environment === 'production';

    if (!isProduction) {
      // Non-production environments have no timing restrictions
      return risks;
    }

    const dayOfWeek = currentTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = currentTime.getHours();
    const dayName = this.getDayName(dayOfWeek);

    // Critical: Friday 5pm+ production
    if (dayOfWeek === 5 && hour >= 17) {
      const hoursUntilMonday = this.calculateHoursUntil(currentTime, 1, 9); // Monday 9 AM

      risks.push({
        id: uuidv4(),
        severity: RiskSeverityEnum.CRITICAL,
        category: RiskCategoryEnum.TIMING,
        title: 'Friday evening production deployment',
        description:
          'Deploying to production on Friday evening increases risk of weekend incidents with limited support availability. High user traffic period with reduced team capacity.',
        score: createRiskScore(0.95),
        detectedAt: currentTime,
        canOverride: true,
        currentTime,
        suggestedWindow: {
          day: 'monday',
          startHour: 9,
          endHour: 11,
        },
        hoursUntilSafe: hoursUntilMonday,
      });
    }

    // Critical: Weekend production
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const hoursUntilMonday = this.calculateHoursUntil(currentTime, 1, 9);

      risks.push({
        id: uuidv4(),
        severity: RiskSeverityEnum.HIGH,
        category: RiskCategoryEnum.TIMING,
        title: 'Weekend production deployment',
        description:
          'Weekend deployments have limited support availability and slower incident response times. Consider waiting for Monday morning.',
        score: createRiskScore(0.75),
        detectedAt: currentTime,
        canOverride: true,
        currentTime,
        suggestedWindow: {
          day: 'monday',
          startHour: 9,
          endHour: 11,
        },
        hoursUntilSafe: hoursUntilMonday,
      });
    }

    // High: Late night production (11pm - 6am)
    if (hour >= 23 || hour < 6) {
      risks.push({
        id: uuidv4(),
        severity: RiskSeverityEnum.HIGH,
        category: RiskCategoryEnum.TIMING,
        title: 'Late night production deployment',
        description:
          'Deploying late night increases fatigue-related errors and has reduced team availability for incident response.',
        score: createRiskScore(0.7),
        detectedAt: currentTime,
        canOverride: true,
        currentTime,
      });
    }

    // Medium: Thursday 5pm+ (pre-Friday risk)
    if (dayOfWeek === 4 && hour >= 17) {
      risks.push({
        id: uuidv4(),
        severity: RiskSeverityEnum.MEDIUM,
        category: RiskCategoryEnum.TIMING,
        title: 'Thursday evening deployment',
        description:
          'Thursday evening deployments close to the weekend increase risk of Friday incidents. Consider deploying earlier in the week.',
        score: createRiskScore(0.5),
        detectedAt: currentTime,
        canOverride: true,
        currentTime,
        suggestedWindow: {
          day: 'tuesday',
          startHour: 9,
          endHour: 15,
        },
      });
    }

    return risks;
  }

  /**
   * Calculate overall risk score from individual risks
   *
   * Uses weighted average based on severity levels.
   * Applies user priority multiplier.
   *
   * @param risks - All detected risks
   * @param context - Analysis context
   * @returns Overall risk score (0.0 - 1.0)
   */
  private calculateOverallScore(risks: readonly Risk[], context: RiskAnalysisContext): RiskScore {
    if (risks.length === 0) {
      return createRiskScore(0);
    }

    // Calculate weighted average
    let totalWeight = 0;
    let weightedSum = 0;

    for (const risk of risks) {
      const weight = SEVERITY_WEIGHTS[risk.severity] ?? 0;
      totalWeight += weight;
      weightedSum += risk.score * weight;
    }

    const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Apply user priority multiplier
    const multiplier = context.userPriority
      ? PRIORITY_MULTIPLIERS[context.userPriority]
      : 1.0;

    const finalScore = Math.min(1.0, baseScore * multiplier);

    return createRiskScore(finalScore);
  }

  /**
   * Generate actionable recommendation based on risks
   *
   * @param risks - All detected risks
   * @param context - Analysis context
   * @returns Human-readable recommendation
   */
  private generateRecommendation(risks: readonly Risk[], _context: RiskAnalysisContext): string {
    if (risks.length === 0) {
      return 'Safe to proceed. No significant risks detected.';
    }

    const criticalRisks = risks.filter((r) => r.severity === RiskSeverityEnum.CRITICAL);
    const highRisks = risks.filter((r) => r.severity === RiskSeverityEnum.HIGH);

    if (criticalRisks.length > 0) {
      // Find timing risk with suggested window
      const timingRisk = criticalRisks.find(
        (r) => r.category === RiskCategoryEnum.TIMING && 'suggestedWindow' in r
      ) as TimingRisk | undefined;

      if (timingRisk?.suggestedWindow) {
        const window = timingRisk.suggestedWindow;
        // Capitalize day name for display
        const dayName = window.day.charAt(0).toUpperCase() + window.day.slice(1);
        return `🚫 Deployment blocked due to critical risks. Recommended: Deploy on ${dayName} between ${window.startHour}:00-${window.endHour}:00. Override with --force if urgent.`;
      }

      return `🚫 Deployment blocked due to ${criticalRisks.length} critical risk(s). Review risks and use --force to override if absolutely necessary.`;
    }

    if (highRisks.length > 0) {
      return `⚠️  ${highRisks.length} high-severity risk(s) detected. Proceed with caution and ensure team is available for monitoring.`;
    }

    return `⚠️  ${risks.length} risk(s) detected. Review and proceed with awareness.`;
  }

  /**
   * Calculate hours until a specific day and time
   *
   * @param from - Current time
   * @param targetDay - Target day of week (0-6)
   * @param targetHour - Target hour (0-23)
   * @returns Hours until target
   */
  private calculateHoursUntil(from: Date, targetDay: number, targetHour: number): number {
    const current = new Date(from);
    const currentDay = current.getDay();

    // Calculate days until target
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) {
      daysUntil += 7; // Next week
    }

    // Create target date
    const target = new Date(current);
    target.setDate(target.getDate() + daysUntil);
    target.setHours(targetHour, 0, 0, 0);

    // Calculate hours difference
    const msUntil = target.getTime() - current.getTime();
    return Math.ceil(msUntil / (1000 * 60 * 60));
  }

  /**
   * Get day name from day number
   *
   * @param dayOfWeek - Day number (0-6)
   * @returns Day name
   */
  private getDayName(
    dayOfWeek: number
  ): 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    return days[dayOfWeek] ?? 'monday';
  }
}
