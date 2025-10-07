/**
 * @fileoverview Tests for Action Reasoning Type System
 * @module node-cli/__tests__/action-reasoning.types.test
 */

import { describe, it, expect } from '@jest/globals';
import {
  createFactorWeight,
  createConfidenceScore,
  getConfidenceLevel,
  calculateRiskImpact,
  formatFactorWeight,
  isProviderSelectionReasoning,
  isEnvironmentSelectionReasoning,
  isDeploymentReasoning,
  TrackedActionTypeEnum,
  CONFIDENCE_THRESHOLDS,
  type FactorWeight,
  type ConfidenceScore,
  type ActionReasoning,
} from '../services/action-reasoning.types.js';

describe('Branded Types - FactorWeight', () => {
  describe('createFactorWeight', () => {
    it('should accept valid weights (0-1)', () => {
      expect(createFactorWeight(0)).toBe(0);
      expect(createFactorWeight(0.5)).toBe(0.5);
      expect(createFactorWeight(1)).toBe(1);
    });

    it('should reject negative weights', () => {
      expect(() => createFactorWeight(-0.1)).toThrow('Invalid weight: -0.1 (must be between 0 and 1)');
      expect(() => createFactorWeight(-1)).toThrow();
    });

    it('should reject weights > 1', () => {
      expect(() => createFactorWeight(1.1)).toThrow('Invalid weight: 1.1 (must be between 0 and 1)');
      expect(() => createFactorWeight(2)).toThrow();
    });

    it('should reject NaN', () => {
      expect(() => createFactorWeight(NaN)).toThrow('Invalid weight: NaN (must be finite number)');
    });

    it('should reject Infinity', () => {
      expect(() => createFactorWeight(Infinity)).toThrow('Invalid weight: Infinity (must be finite number)');
      expect(() => createFactorWeight(-Infinity)).toThrow();
    });

    it('should return branded type', () => {
      const weight: FactorWeight = createFactorWeight(0.5);
      expect(typeof weight).toBe('number');
      expect(weight).toBe(0.5);
    });
  });
});

describe('Branded Types - ConfidenceScore', () => {
  describe('createConfidenceScore', () => {
    it('should accept valid confidence (0-1)', () => {
      expect(createConfidenceScore(0)).toBe(0);
      expect(createConfidenceScore(0.5)).toBe(0.5);
      expect(createConfidenceScore(1)).toBe(1);
    });

    it('should reject negative confidence', () => {
      expect(() => createConfidenceScore(-0.1)).toThrow('Invalid confidence: -0.1 (must be between 0 and 1)');
    });

    it('should reject confidence > 1', () => {
      expect(() => createConfidenceScore(1.5)).toThrow('Invalid confidence: 1.5 (must be between 0 and 1)');
    });

    it('should reject NaN', () => {
      expect(() => createConfidenceScore(NaN)).toThrow('Invalid confidence: NaN (must be finite number)');
    });

    it('should reject Infinity', () => {
      expect(() => createConfidenceScore(Infinity)).toThrow('Invalid confidence: Infinity (must be finite number)');
    });

    it('should return branded type', () => {
      const confidence: ConfidenceScore = createConfidenceScore(0.85);
      expect(typeof confidence).toBe('number');
      expect(confidence).toBe(0.85);
    });
  });
});

describe('Confidence Level Utilities', () => {
  describe('getConfidenceLevel', () => {
    it('should return very-high for >= 0.95', () => {
      expect(getConfidenceLevel(0.95)).toBe('very-high');
      expect(getConfidenceLevel(1.0)).toBe('very-high');
    });

    it('should return high for >= 0.85', () => {
      expect(getConfidenceLevel(0.85)).toBe('high');
      expect(getConfidenceLevel(0.9)).toBe('high');
    });

    it('should return medium for >= 0.7', () => {
      expect(getConfidenceLevel(0.7)).toBe('medium');
      expect(getConfidenceLevel(0.8)).toBe('medium');
    });

    it('should return low for >= 0.5', () => {
      expect(getConfidenceLevel(0.5)).toBe('low');
      expect(getConfidenceLevel(0.6)).toBe('low');
    });

    it('should return very-low for < 0.5', () => {
      expect(getConfidenceLevel(0.4)).toBe('very-low');
      expect(getConfidenceLevel(0)).toBe('very-low');
    });
  });

  describe('CONFIDENCE_THRESHOLDS', () => {
    it('should have correct threshold values', () => {
      expect(CONFIDENCE_THRESHOLDS.VERY_LOW).toBe(0.3);
      expect(CONFIDENCE_THRESHOLDS.LOW).toBe(0.5);
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(0.7);
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(0.85);
      expect(CONFIDENCE_THRESHOLDS.VERY_HIGH).toBe(0.95);
    });
  });
});

describe('Risk Impact Calculation', () => {
  describe('calculateRiskImpact', () => {
    it('should calculate correct impact for low risk', () => {
      expect(calculateRiskImpact('low', 'unlikely')).toBe('low');
      expect(calculateRiskImpact('low', 'possible')).toBe('low');
      expect(calculateRiskImpact('low', 'likely')).toBe('low');
      expect(calculateRiskImpact('low', 'certain')).toBe('medium');
    });

    it('should calculate correct impact for moderate risk', () => {
      expect(calculateRiskImpact('moderate', 'unlikely')).toBe('low');
      expect(calculateRiskImpact('moderate', 'possible')).toBe('medium');
      expect(calculateRiskImpact('moderate', 'likely')).toBe('medium');
      expect(calculateRiskImpact('moderate', 'certain')).toBe('high');
    });

    it('should calculate correct impact for high risk', () => {
      expect(calculateRiskImpact('high', 'unlikely')).toBe('medium');
      expect(calculateRiskImpact('high', 'possible')).toBe('high');
      expect(calculateRiskImpact('high', 'likely')).toBe('high');
      expect(calculateRiskImpact('high', 'certain')).toBe('critical');
    });

    it('should calculate correct impact for destructive risk', () => {
      expect(calculateRiskImpact('destructive', 'unlikely')).toBe('high');
      expect(calculateRiskImpact('destructive', 'possible')).toBe('critical');
      expect(calculateRiskImpact('destructive', 'likely')).toBe('critical');
      expect(calculateRiskImpact('destructive', 'certain')).toBe('critical');
    });

    it('should throw on unknown risk level', () => {
      expect(() => calculateRiskImpact('unknown' as any, 'likely')).toThrow(
        'Unknown risk level: "unknown"'
      );
    });

    it('should throw on unknown probability', () => {
      expect(() => calculateRiskImpact('low', 'maybe' as any)).toThrow(
        'Unknown probability: "maybe" for level: "low"'
      );
    });

    it('should include valid values in error message', () => {
      try {
        calculateRiskImpact('invalid' as any, 'likely');
      } catch (error) {
        expect((error as Error).message).toContain('valid levels:');
        expect((error as Error).message).toContain('low');
        expect((error as Error).message).toContain('moderate');
      }
    });
  });
});

describe('Format Utilities', () => {
  describe('formatFactorWeight', () => {
    it('should format weight as percentage', () => {
      expect(formatFactorWeight(0)).toBe('0%');
      expect(formatFactorWeight(0.5)).toBe('50%');
      expect(formatFactorWeight(1)).toBe('100%');
    });

    it('should round to nearest integer', () => {
      expect(formatFactorWeight(0.234)).toBe('23%');
      expect(formatFactorWeight(0.789)).toBe('79%');
    });
  });
});

describe('Type Guards', () => {
  describe('isProviderSelectionReasoning', () => {
    it('should return true for provider-selection', () => {
      const reasoning: ActionReasoning = {
        actionType: TrackedActionTypeEnum.PROVIDER_SELECTION,
        chosen: { provider: 'vercel', reason: 'Best for Next.js' },
        alternatives: [],
        factors: [],
        confidence: 'high',
      };

      expect(isProviderSelectionReasoning(reasoning)).toBe(true);
    });

    it('should return false for other action types', () => {
      const reasoning: ActionReasoning = {
        actionType: TrackedActionTypeEnum.DEPLOY,
        chosen: { provider: 'vercel', environment: 'production', reason: 'Ready' },
        alternatives: [],
        factors: [],
        risks: [],
        confidence: 'high',
      };

      expect(isProviderSelectionReasoning(reasoning)).toBe(false);
    });
  });

  describe('isEnvironmentSelectionReasoning', () => {
    it('should return true for environment-selection', () => {
      const reasoning: ActionReasoning = {
        actionType: TrackedActionTypeEnum.ENVIRONMENT_SELECTION,
        chosen: { environment: 'production', reason: 'Ready for production' },
        alternatives: [],
        factors: [],
        confidence: 'high',
      };

      expect(isEnvironmentSelectionReasoning(reasoning)).toBe(true);
    });

    it('should return false for other action types', () => {
      const reasoning: ActionReasoning = {
        actionType: TrackedActionTypeEnum.PROVIDER_SELECTION,
        chosen: { provider: 'vercel', reason: 'Best for Next.js' },
        alternatives: [],
        factors: [],
        confidence: 'high',
      };

      expect(isEnvironmentSelectionReasoning(reasoning)).toBe(false);
    });
  });

  describe('isDeploymentReasoning', () => {
    it('should return true for deploy action', () => {
      const reasoning: ActionReasoning = {
        actionType: TrackedActionTypeEnum.DEPLOY,
        chosen: { provider: 'vercel', environment: 'production', reason: 'Ready' },
        alternatives: [],
        factors: [],
        risks: [],
        confidence: 'high',
      };

      expect(isDeploymentReasoning(reasoning)).toBe(true);
    });

    it('should return false for other action types', () => {
      const reasoning: ActionReasoning = {
        actionType: TrackedActionTypeEnum.PROVIDER_SELECTION,
        chosen: { provider: 'vercel', reason: 'Best for Next.js' },
        alternatives: [],
        factors: [],
        confidence: 'high',
      };

      expect(isDeploymentReasoning(reasoning)).toBe(false);
    });
  });
});

describe('TrackedActionTypeEnum', () => {
  it('should have all action types', () => {
    expect(TrackedActionTypeEnum.DEPLOY).toBe('deploy');
    expect(TrackedActionTypeEnum.SCALE).toBe('scale');
    expect(TrackedActionTypeEnum.SET_ENV).toBe('set-env');
    expect(TrackedActionTypeEnum.ROLLBACK).toBe('rollback');
    expect(TrackedActionTypeEnum.PROVIDER_SELECTION).toBe('provider-selection');
    expect(TrackedActionTypeEnum.ENVIRONMENT_SELECTION).toBe('environment-selection');
    expect(TrackedActionTypeEnum.RISK_ASSESSMENT).toBe('risk-assessment');
    expect(TrackedActionTypeEnum.DEFAULT_APPLICATION).toBe('default-application');
  });
});
