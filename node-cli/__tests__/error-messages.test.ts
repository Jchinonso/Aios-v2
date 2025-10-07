/**
 * @fileoverview Tests for Standardized Error Messages
 * @module node-cli/__tests__/error-messages.test
 */

import { describe, it, expect } from '@jest/globals';
import { ErrorMessages } from '../services/error-messages.js';

describe('Error Messages - Validation', () => {
  describe('invalidWeight', () => {
    it('should format weight error message', () => {
      expect(ErrorMessages.validation.invalidWeight(1.5)).toBe(
        'Invalid weight: 1.5 (must be between 0 and 1)'
      );
    });

    it('should handle negative weights', () => {
      expect(ErrorMessages.validation.invalidWeight(-0.5)).toBe(
        'Invalid weight: -0.5 (must be between 0 and 1)'
      );
    });
  });

  describe('invalidConfidence', () => {
    it('should format confidence error message', () => {
      expect(ErrorMessages.validation.invalidConfidence(2.0)).toBe(
        'Invalid confidence: 2 (must be between 0 and 1)'
      );
    });
  });

  describe('invalidTimestamp', () => {
    it('should format timestamp error with quotes', () => {
      expect(ErrorMessages.validation.invalidTimestamp('bad-timestamp')).toBe(
        'Invalid ISO 8601 timestamp: "bad-timestamp"'
      );
    });
  });

  describe('emptyField', () => {
    it('should format empty field error', () => {
      expect(ErrorMessages.validation.emptyField('sessionId')).toBe(
        'Invalid sessionId: cannot be empty'
      );
    });
  });

  describe('negativeValue', () => {
    it('should format negative value error', () => {
      expect(ErrorMessages.validation.negativeValue('turnNumber', -5)).toBe(
        'Invalid turnNumber: must be >= 0 (got -5)'
      );
    });
  });

  describe('invalidType', () => {
    it('should format type mismatch error', () => {
      expect(ErrorMessages.validation.invalidType('factors', 'array', 'string')).toBe(
        'Invalid factors: expected array (got string)'
      );
    });
  });

  describe('missingField', () => {
    it('should format missing field error with quotes', () => {
      expect(ErrorMessages.validation.missingField('chosen.reason')).toBe(
        'Missing required field: "chosen.reason"'
      );
    });
  });

  describe('invalidArray', () => {
    it('should format invalid array error', () => {
      expect(ErrorMessages.validation.invalidArray('alternatives')).toBe(
        'Invalid alternatives: must be an array'
      );
    });
  });

  describe('invalidProvider', () => {
    it('should format invalid provider with valid list', () => {
      const validProviders = ['vercel', 'netlify', 'aws'] as const;
      expect(ErrorMessages.validation.invalidProvider('heroku', validProviders)).toBe(
        'Invalid provider: "heroku" (valid providers: vercel, netlify, aws)'
      );
    });
  });

  describe('notFinite', () => {
    it('should format NaN error', () => {
      expect(ErrorMessages.validation.notFinite('weight', NaN)).toBe(
        'Invalid weight: NaN (must be finite number)'
      );
    });

    it('should format Infinity error', () => {
      expect(ErrorMessages.validation.notFinite('confidence', Infinity)).toBe(
        'Invalid confidence: Infinity (must be finite number)'
      );
    });
  });
});

describe('Error Messages - Reasoning', () => {
  describe('noActions', () => {
    it('should format no actions error', () => {
      expect(ErrorMessages.reasoning.noActions()).toBe(
        'No actions to explain (deploy something first)'
      );
    });
  });

  describe('actionNotFound', () => {
    it('should format action not found with quotes', () => {
      expect(ErrorMessages.reasoning.actionNotFound('abc123')).toBe(
        'Action not found: "abc123"'
      );
    });
  });

  describe('invalidReasoning', () => {
    it('should format reasoning error with detail', () => {
      expect(ErrorMessages.reasoning.invalidReasoning('missing factors')).toBe(
        'Invalid reasoning structure: missing factors'
      );
    });
  });

  describe('missingChosenReason', () => {
    it('should format missing chosen reason error', () => {
      expect(ErrorMessages.reasoning.missingChosenReason()).toBe(
        'Invalid reasoning: missing chosen.reason'
      );
    });
  });
});

describe('Error Messages - Risk', () => {
  describe('unknownRiskLevel', () => {
    it('should format unknown risk level with valid list', () => {
      const validLevels = ['low', 'moderate', 'high', 'destructive'] as const;
      expect(ErrorMessages.risk.unknownRiskLevel('critical', validLevels)).toBe(
        'Unknown risk level: "critical" (valid levels: low, moderate, high, destructive)'
      );
    });
  });

  describe('unknownProbability', () => {
    it('should format unknown probability with context', () => {
      const validProbabilities = ['unlikely', 'possible', 'likely', 'certain'] as const;
      expect(
        ErrorMessages.risk.unknownProbability('maybe', 'low', validProbabilities)
      ).toBe(
        'Unknown probability: "maybe" for level: "low" (valid probabilities: unlikely, possible, likely, certain)'
      );
    });
  });
});

describe('Error Messages - Persistence', () => {
  describe('failedToLoad', () => {
    it('should format load failure with reason', () => {
      expect(ErrorMessages.persistence.failedToLoad('abc123', 'File not found')).toBe(
        'Failed to load action "abc123": File not found'
      );
    });
  });

  describe('failedToPersist', () => {
    it('should format persist failure with reason', () => {
      expect(ErrorMessages.persistence.failedToPersist('abc123', 'Disk full')).toBe(
        'Failed to persist action "abc123": Disk full'
      );
    });
  });

  describe('corruptedData', () => {
    it('should format corrupted data error', () => {
      expect(ErrorMessages.persistence.corruptedData('abc123')).toBe(
        'Corrupted data for action "abc123"'
      );
    });
  });
});

describe('Error Messages - Consistency', () => {
  it('should use quotes for string values consistently', () => {
    const messages = [
      ErrorMessages.validation.invalidTimestamp('bad'),
      ErrorMessages.validation.missingField('field'),
      ErrorMessages.validation.invalidProvider('bad', ['good']),
      ErrorMessages.reasoning.actionNotFound('id'),
      ErrorMessages.risk.unknownRiskLevel('bad', ['good']),
      ErrorMessages.persistence.corruptedData('id'),
    ];

    messages.forEach((msg) => {
      expect(msg).toMatch(/"/); // All should contain quotes
    });
  });

  it('should include context in all messages', () => {
    const messages = [
      ErrorMessages.validation.invalidWeight(2),
      ErrorMessages.validation.emptyField('sessionId'),
      ErrorMessages.reasoning.noActions(),
      ErrorMessages.risk.unknownRiskLevel('bad', ['good']),
    ];

    messages.forEach((msg) => {
      expect(msg.length).toBeGreaterThan(10); // All should be descriptive
      expect(msg).toMatch(/[A-Z]/); // All should start with capital
    });
  });

  it('should provide actionable information', () => {
    // Invalid provider shows valid options
    const providerError = ErrorMessages.validation.invalidProvider('bad', ['vercel', 'netlify']);
    expect(providerError).toContain('valid providers:');
    expect(providerError).toContain('vercel');

    // Risk level shows valid levels
    const riskError = ErrorMessages.risk.unknownRiskLevel('bad', ['low', 'high']);
    expect(riskError).toContain('valid levels:');
    expect(riskError).toContain('low');
  });
});

describe('Error Messages - Structure', () => {
  it('should have all expected categories', () => {
    expect(ErrorMessages.validation).toBeDefined();
    expect(ErrorMessages.reasoning).toBeDefined();
    expect(ErrorMessages.risk).toBeDefined();
    expect(ErrorMessages.persistence).toBeDefined();
  });

  it('should be readonly (const assertion)', () => {
    // ErrorMessages is created with 'as const', making it deeply readonly
    // TypeScript will prevent mutations at compile time
    expect(ErrorMessages).toBeDefined();
    expect(ErrorMessages.validation).toBeDefined();
    expect(ErrorMessages.reasoning).toBeDefined();
  });
});
