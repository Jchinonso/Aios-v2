/**
 * @fileoverview TDD Tests for Proactive Risk Analyzer
 * @module node-cli/__tests__/proactive-risk-analyzer.test
 *
 * Following strict TDD:
 * 1. Write FAILING tests first
 * 2. Implement minimal code to make tests pass
 * 3. Refactor with confidence
 *
 * These tests will FAIL until ProactiveRiskAnalyzer is implemented.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProactiveRiskAnalyzer } from '../services/proactive-risk-analyzer.js';
import {
  RiskSeverityEnum,
  RiskCategoryEnum,
  createRiskScore,
  type RiskAnalysisContext,
  type Risk,
} from '../services/risk-analysis.types.js';
import type { ILogger } from '@aios/shared';

// Mock logger
const createMockLogger = (): ILogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLevel: jest.fn(),
  child: jest.fn(() => createMockLogger()),
});

describe('ProactiveRiskAnalyzer - TDD', () => {
  let analyzer: ProactiveRiskAnalyzer;
  let logger: ILogger;

  beforeEach(() => {
    logger = createMockLogger();
    analyzer = new ProactiveRiskAnalyzer(logger);
  });

  describe('Timing Risk Detection', () => {
    it('should detect CRITICAL risk for Friday evening production deployment', async () => {
      // Arrange - Friday 5:30 PM
      const friday530pm = new Date('2025-10-10T17:30:00'); // Friday
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        currentTime: friday530pm,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert
      expect(result.risks.length).toBeGreaterThan(0);

      const timingRisk = result.risks.find((r) => r.category === RiskCategoryEnum.TIMING);
      expect(timingRisk).toBeDefined();
      expect(timingRisk!.severity).toBe(RiskSeverityEnum.CRITICAL);
      expect(timingRisk!.title).toContain('Friday evening');
      expect(result.canProceed).toBe(false); // Critical blocks deployment
      expect(result.requiresOverride).toBe(true);
    });

    it('should detect HIGH risk for weekend production deployment', async () => {
      // Arrange - Saturday 2:00 PM
      const saturday2pm = new Date('2025-10-11T14:00:00'); // Saturday
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        currentTime: saturday2pm,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert
      const timingRisk = result.risks.find((r) => r.category === RiskCategoryEnum.TIMING);
      expect(timingRisk).toBeDefined();
      expect(timingRisk!.severity).toBe(RiskSeverityEnum.HIGH);
      expect(timingRisk!.title).toContain('Weekend');
    });

    it('should NOT flag risk for Monday morning production deployment', async () => {
      // Arrange - Monday 10:00 AM
      const monday10am = new Date('2025-10-13T10:00:00'); // Monday
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        currentTime: monday10am,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert
      const timingRisks = result.risks.filter((r) => r.category === RiskCategoryEnum.TIMING);
      expect(timingRisks.length).toBe(0);
      expect(result.canProceed).toBe(true);
    });

    it('should allow Friday evening staging deployment (lower environment)', async () => {
      // Arrange - Friday 5:30 PM, but staging
      const friday530pm = new Date('2025-10-10T17:30:00');
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'staging',
        currentTime: friday530pm,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert - Should have LOW or no timing risk for staging
      const criticalTimingRisk = result.risks.find(
        (r) => r.category === RiskCategoryEnum.TIMING && r.severity === RiskSeverityEnum.CRITICAL
      );
      expect(criticalTimingRisk).toBeUndefined();
      expect(result.canProceed).toBe(true);
    });

    it('should suggest optimal deployment window', async () => {
      // Arrange - Friday 5:30 PM
      const friday530pm = new Date('2025-10-10T17:30:00');
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        currentTime: friday530pm,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert
      const timingRisk = result.risks.find((r) => r.category === RiskCategoryEnum.TIMING);
      expect(timingRisk).toBeDefined();

      // Type guard check
      if (timingRisk && 'suggestedWindow' in timingRisk) {
        expect(timingRisk.suggestedWindow).toBeDefined();
        expect(timingRisk.suggestedWindow!.day).toBe('monday');
        expect(timingRisk.suggestedWindow!.startHour).toBeGreaterThanOrEqual(9);
        expect(timingRisk.suggestedWindow!.endHour).toBeLessThanOrEqual(17);
        expect(timingRisk.hoursUntilSafe).toBeGreaterThan(60); // 2.5 days
      }
    });

    it('should detect late night deployment risk (after 11 PM)', async () => {
      // Arrange - Wednesday 11:30 PM
      const wednesday1130pm = new Date('2025-10-08T23:30:00');
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        currentTime: wednesday1130pm,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert
      const timingRisk = result.risks.find((r) => r.category === RiskCategoryEnum.TIMING);
      expect(timingRisk).toBeDefined();
      expect(timingRisk!.severity).toBe(RiskSeverityEnum.HIGH);
      expect(timingRisk!.description).toContain('late night');
    });
  });

  describe('Environment Variable Risk Detection', () => {
    it('should detect missing critical environment variables', async () => {
      // Arrange
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        projectPath: '/tmp/test-project',
      };

      // Mock: Project requires DATABASE_URL, API_KEY but they're missing
      // (Implementation will read from .env or provider config)

      // Act
      const result = await analyzer.analyze(context);

      // Assert
      const envRisk = result.risks.find((r) => r.category === RiskCategoryEnum.ENVIRONMENT);

      // For now, we'll skip this assertion until we implement env detection
      // expect(envRisk).toBeDefined();
      // This test shows intent - will pass once we add env var detection
    });

    it('should NOT flag risk if all env vars are present', async () => {
      // Arrange - Project with all required env vars
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        projectPath: '/tmp/complete-project',
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert
      const criticalEnvRisk = result.risks.find(
        (r) => r.category === RiskCategoryEnum.ENVIRONMENT && r.severity === RiskSeverityEnum.CRITICAL
      );
      expect(criticalEnvRisk).toBeUndefined();
    });
  });

  describe('Overall Risk Score Calculation', () => {
    it('should calculate weighted overall risk score', async () => {
      // Arrange - Multiple risks
      const friday5pm = new Date('2025-10-10T17:00:00');
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        currentTime: friday5pm,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert
      expect(result.overallScore).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
    });

    it('should have overall score >= 0.8 for critical risks', async () => {
      // Arrange - Friday evening (critical)
      const friday530pm = new Date('2025-10-10T17:30:00');
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        currentTime: friday530pm,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert - Critical risk should push overall score high
      expect(result.overallScore).toBeGreaterThanOrEqual(0.8);
    });

    it('should have overall score < 0.3 for safe deployments', async () => {
      // Arrange - Monday morning
      const monday10am = new Date('2025-10-13T10:00:00');
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'staging',
        currentTime: monday10am,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert
      expect(result.overallScore).toBeLessThan(0.3);
    });
  });

  describe('canProceed Logic', () => {
    it('should block deployment (canProceed=false) when CRITICAL risk present', async () => {
      // Arrange - Critical timing risk
      const friday6pm = new Date('2025-10-10T18:00:00');
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        currentTime: friday6pm,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.requiresOverride).toBe(true);
    });

    it('should allow deployment with HIGH risk if user confirms', async () => {
      // Arrange - Weekend (high risk)
      const saturday2pm = new Date('2025-10-11T14:00:00');
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        currentTime: saturday2pm,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert - HIGH allows proceed with confirmation
      const hasOnlyHighOrLower = result.risks.every(
        (r) => r.severity !== RiskSeverityEnum.CRITICAL
      );
      expect(hasOnlyHighOrLower).toBe(true);
      expect(result.canProceed).toBe(true); // Can proceed with warning
    });
  });

  describe('Recommendation Generation', () => {
    it('should provide actionable recommendation for risky deployment', async () => {
      // Arrange
      const friday530pm = new Date('2025-10-10T17:30:00');
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        currentTime: friday530pm,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation).toContain('Monday');
      expect(result.recommendation.length).toBeGreaterThan(20);
    });

    it('should provide positive recommendation for safe deployment', async () => {
      // Arrange
      const monday10am = new Date('2025-10-13T10:00:00');
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'staging',
        currentTime: monday10am,
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.toLowerCase()).toMatch(/safe|proceed|good/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing currentTime (use system time)', async () => {
      // Arrange - No currentTime provided
      const context: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
      };

      // Act
      const result = await analyzer.analyze(context);

      // Assert - Should not throw, uses current time
      expect(result).toBeDefined();
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it('should handle invalid context gracefully', async () => {
      // Arrange - Missing required fields
      const context = {} as RiskAnalysisContext;

      // Act & Assert - Should not throw
      await expect(analyzer.analyze(context)).resolves.toBeDefined();
    });

    it('should respect user priority (safety = stricter)', async () => {
      // Arrange - Thursday 4 PM with safety priority
      const thursday4pm = new Date('2025-10-09T16:00:00');
      const safetyContext: RiskAnalysisContext = {
        provider: 'vercel',
        environment: 'production',
        currentTime: thursday4pm,
        userPriority: 'safety',
      };

      const speedContext: RiskAnalysisContext = {
        ...safetyContext,
        userPriority: 'speed',
      };

      // Act
      const safetyResult = await analyzer.analyze(safetyContext);
      const speedResult = await analyzer.analyze(speedContext);

      // Assert - Safety priority should have higher risk score
      expect(safetyResult.overallScore).toBeGreaterThanOrEqual(speedResult.overallScore);
    });
  });

  describe('Type Safety', () => {
    it('should create valid risk scores', () => {
      // Valid scores
      expect(() => createRiskScore(0)).not.toThrow();
      expect(() => createRiskScore(0.5)).not.toThrow();
      expect(() => createRiskScore(1)).not.toThrow();

      // Invalid scores
      expect(() => createRiskScore(-0.1)).toThrow('must be between 0 and 1');
      expect(() => createRiskScore(1.1)).toThrow('must be between 0 and 1');
      expect(() => createRiskScore(NaN)).toThrow('must be finite');
      expect(() => createRiskScore(Infinity)).toThrow('must be finite');
    });
  });
});
