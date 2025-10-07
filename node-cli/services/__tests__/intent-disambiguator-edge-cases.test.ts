/**
 * @fileoverview Advanced Edge Case Tests for IntentDisambiguator
 * @module node-cli/services/__tests__/intent-disambiguator-edge-cases
 *
 * These tests cover critical edge cases identified in Phase 2 audit:
 * - Invalid/malformed timestamps
 * - Large/circular entity values
 * - Score boundary conditions
 * - History size limits
 * - Security edge cases
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { IntentDisambiguator } from '../intent-disambiguator.js';
import type { ParsedIntentType } from '../../nl-planner/types.js';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  setLevel: () => {},
  child: function() { return this; },
};

describe('IntentDisambiguator - Advanced Edge Cases', () => {
  let disambiguator: IntentDisambiguator;

  const validPartialIntent: ParsedIntentType = {
    intent: 'deploy',
    entities: {},
    cli: '',
    confidence: 0.75,
    risk: 'low',
    confirmRequired: false
  };

  beforeEach(() => {
    disambiguator = new IntentDisambiguator(mockLogger as any);
    jest.clearAllMocks();
  });

  describe('Timestamp Validation Edge Cases', () => {
    it('should handle malformed ISO timestamp gracefully', async () => {
      // Arrange
      const historyWithBadTimestamp = [
        {
          userInput: 'deploy web to staging',
          intent: {
            intent: 'deploy',
            entities: { service: 'web', env: 'staging' },
            cli: '',
            confidence: 0.95,
            risk: 'low',
            confirmRequired: false
          },
          response: 'Success',
          timestamp: 'not-a-valid-date-string' // Invalid
        }
      ];

      // Act
      const result = await disambiguator.disambiguate(
        validPartialIntent,
        historyWithBadTimestamp as any
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.reasoning).toContain('No previous context');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid timestamp'),
        expect.anything()
      );
    });

    it('should handle empty timestamp string', async () => {
      // Arrange
      const historyWithEmptyTimestamp = [
        {
          userInput: 'deploy',
          intent: {
            intent: 'deploy',
            entities: {},
            cli: '',
            confidence: 0.9,
            risk: 'low',
            confirmRequired: false
          },
          response: 'Success',
          timestamp: '' // Empty
        }
      ];

      // Act
      const result = await disambiguator.disambiguate(
        validPartialIntent,
        historyWithEmptyTimestamp as any
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle extremely old timestamps (Unix epoch)', async () => {
      // Arrange
      const veryOldHistory = [
        {
          userInput: 'deploy',
          intent: {
            intent: 'deploy',
            entities: { env: 'staging' },
            cli: '',
            confidence: 0.9,
            risk: 'low',
            confirmRequired: false
          },
          response: 'Success',
          timestamp: new Date(0).toISOString() // 1970-01-01
        }
      ];

      // Act
      const result = await disambiguator.disambiguate(
        validPartialIntent,
        veryOldHistory as any
      );

      // Assert
      expect(result).toBeDefined();
      // Should filter out as too old (>7 days) - results in fallback or no context
      expect(result.reasoning).toMatch(/No previous context|Disambiguation unavailable/);
    });

    it('should reject future timestamps beyond clock skew tolerance', async () => {
      // Arrange - timestamp 2h in future (well beyond 1h tolerance)
      const futureTimestamp = new Date(Date.now() + 7200000).toISOString(); // 2h future
      const futureHistory = [
        {
          userInput: 'deploy',
          intent: {
            intent: 'deploy',
            entities: { env: 'staging' },
            cli: '',
            confidence: 0.9,
            risk: 'low',
            confirmRequired: false
          },
          response: 'Success',
          timestamp: futureTimestamp
        }
      ];

      // Act
      const result = await disambiguator.disambiguate(
        validPartialIntent,
        futureHistory as any
      );

      // Assert
      expect(result).toBeDefined();
      // Should filter out future timestamp (results in no context)
      expect(result.reasoning).toMatch(/No previous context|Disambiguation unavailable/);
    });

    it('should accept timestamps within clock skew tolerance', async () => {
      // Arrange - timestamp 59 minutes in future (within 1h tolerance)
      const nearFutureTimestamp = new Date(Date.now() + 3540000).toISOString();
      const nearFutureHistory = [
        {
          userInput: 'deploy',
          intent: {
            intent: 'deploy',
            entities: { env: 'staging' },
            cli: '',
            confidence: 0.9,
            risk: 'low',
            confirmRequired: false
          },
          response: 'Success',
          timestamp: nearFutureTimestamp
        }
      ];

      // Act
      const result = await disambiguator.disambiguate(
        validPartialIntent,
        nearFutureHistory as any
      );

      // Assert
      expect(result).toBeDefined();
      // Should not warn about future timestamp
      const futureWarnings = (mockLogger.warn as jest.Mock).mock.calls.filter(call =>
        call[0]?.includes?.('future')
      );
      expect(futureWarnings.length).toBe(0);
    });

    it('should handle invalid Date objects (NaN timestamps)', async () => {
      // Arrange - Create an invalid timestamp string that won't crash toISOString()
      const invalidDateHistory = [
        {
          userInput: 'deploy',
          intent: {
            intent: 'deploy',
            entities: {},
            cli: '',
            confidence: 0.9,
            risk: 'low',
            confirmRequired: false
          },
          response: 'Success',
          timestamp: '2025-99-99T99:99:99.999Z' // Invalid date format
        }
      ];

      // Act
      const result = await disambiguator.disambiguate(
        validPartialIntent,
        invalidDateHistory as any
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('Entity Validation Edge Cases', () => {
    it('should handle very large entity values (DoS protection)', async () => {
      // Arrange
      const hugeEntity = 'x'.repeat(100000); // 100KB string
      const partialIntentWithHugeEntity: ParsedIntentType = {
        intent: 'deploy',
        entities: { service: hugeEntity },
        cli: '',
        confidence: 0.9,
        risk: 'low',
        confirmRequired: false
      };

      // Act
      const result = await disambiguator.disambiguate(
        partialIntentWithHugeEntity,
        []
      );

      // Assert
      expect(result).toBeDefined();
      // Should handle gracefully (might warn about invalid intent)
    });

    it('should handle circular references in entities (logging safety)', async () => {
      // Arrange
      const circular: any = { service: 'web' };
      circular.self = circular; // Circular reference

      const partialIntentWithCircular = {
        intent: 'deploy',
        entities: circular,
        cli: '',
        confidence: 0.9,
        risk: 'low',
        confirmRequired: false
      };

      // Act & Assert
      // Should not crash even with circular reference
      await expect(
        disambiguator.disambiguate(partialIntentWithCircular as any, [])
      ).resolves.toBeDefined();
    });

    it('should reject entities with undefined values', async () => {
      // Arrange
      const partialIntentWithUndefined = {
        intent: 'deploy',
        entities: { service: undefined, env: 'staging' },
        cli: '',
        confidence: 0.9,
        risk: 'low',
        confirmRequired: false
      };

      // Act
      const result = await disambiguator.disambiguate(
        partialIntentWithUndefined as any,
        []
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid intent'),
        expect.anything()
      );
    });

    it('should reject entities with function values', async () => {
      // Arrange
      const partialIntentWithFunction = {
        intent: 'deploy',
        entities: { service: () => 'web' }, // Function
        cli: '',
        confidence: 0.9,
        risk: 'low',
        confirmRequired: false
      };

      // Act
      const result = await disambiguator.disambiguate(
        partialIntentWithFunction as any,
        []
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid intent'),
        expect.anything()
      );
    });

    it('should handle mixed valid/invalid entity values', async () => {
      // Arrange
      const mixedEntities: any = {
        validString: 'vercel',
        validNumber: 5,
        validBoolean: true,
        validNull: null,
        invalidUndefined: undefined,
        invalidFunction: () => {},
      };

      const partialIntent = {
        intent: 'deploy',
        entities: mixedEntities,
        cli: '',
        confidence: 0.9,
        risk: 'low',
        confirmRequired: false
      };

      // Act
      const result = await disambiguator.disambiguate(partialIntent as any, []);

      // Assert - Should reject due to invalid values
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid intent'),
        expect.anything()
      );
    });
  });

  describe('Scoring Algorithm Edge Cases', () => {
    it('should handle all zero-score matches gracefully', async () => {
      // Arrange - all history too old (>7 days)
      const veryOldHistory = Array.from({ length: 5 }, (_, i) => ({
        userInput: `deploy ${i}`,
        intent: {
          intent: 'deploy',
          entities: { service: `service-${i}` },
          cli: '',
          confidence: 0.9,
          risk: 'low',
          confirmRequired: false
        },
        response: 'Success',
        timestamp: new Date(Date.now() - (10 + i) * 24 * 60 * 60 * 1000).toISOString()
      }));

      // Act
      const result = await disambiguator.disambiguate(
        validPartialIntent,
        veryOldHistory as any
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.primarySuggestion).toBeDefined();
      // Should not have meaningful suggestions (all filtered out)
    });

    it('should clamp scores correctly when exact match bonus causes overflow', async () => {
      // Arrange - exact match with recent history (should get bonus)
      const partialIntentExact: ParsedIntentType = {
        intent: 'deploy',
        entities: { service: 'web', env: 'staging', provider: 'vercel' },
        cli: '',
        confidence: 0.9,
        risk: 'low',
        confirmRequired: false
      };

      const exactMatchHistory = [
        {
          userInput: 'deploy web to staging on vercel',
          intent: {
            intent: 'deploy',
            entities: { service: 'web', env: 'staging', provider: 'vercel' },
            cli: '',
            confidence: 0.95,
            risk: 'low',
            confirmRequired: false
          },
          response: 'Success',
          timestamp: new Date(Date.now() - 30000).toISOString() // 30s ago
        }
      ];

      // Act
      const result = await disambiguator.disambiguate(
        partialIntentExact,
        exactMatchHistory as any
      );

      // Assert
      expect(result).toBeDefined();
      if (result.autoSelected) {
        // Score should be clamped to 1.0 max
        expect(result.autoSelected.score).toBeLessThanOrEqual(1.0);
        expect(result.autoSelected.score).toBeGreaterThan(0.9);
      }
    });

    it('should handle NaN in age calculation gracefully', async () => {
      // Arrange - force NaN by using invalid timestamp
      const invalidTimestampHistory = [
        {
          userInput: 'deploy',
          intent: {
            intent: 'deploy',
            entities: { env: 'staging' },
            cli: '',
            confidence: 0.9,
            risk: 'low',
            confirmRequired: false
          },
          response: 'Success',
          timestamp: 'NaN' as any // Will cause NaN in calculations
        }
      ];

      // Act
      const result = await disambiguator.disambiguate(
        validPartialIntent,
        invalidTimestampHistory as any
      );

      // Assert
      expect(result).toBeDefined();
      // Should handle NaN gracefully (filter out or fallback)
    });
  });

  describe('History Size Edge Cases', () => {
    it('should handle exactly MAX_HISTORY_SIZE (50) items', async () => {
      // Arrange
      const exactly50Items = Array.from({ length: 50 }, (_, i) => ({
        userInput: `deploy service-${i}`,
        intent: {
          intent: 'deploy',
          entities: { service: `service-${i}`, env: 'staging' },
          cli: '',
          confidence: 0.9,
          risk: 'low',
          confirmRequired: false
        },
        response: 'Success',
        timestamp: new Date(Date.now() - i * 1000).toISOString()
      }));

      // Act
      const result = await disambiguator.disambiguate(
        validPartialIntent,
        exactly50Items as any
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.primarySuggestion).toBeDefined();
      // Should not warn about truncation
      const truncationWarnings = (mockLogger.warn as jest.Mock).mock.calls.filter(call =>
        call[0]?.includes?.('exceeds maximum')
      );
      expect(truncationWarnings.length).toBe(0);
    });

    it('should truncate history beyond MAX_HISTORY_SIZE and warn', async () => {
      // Arrange - 100 items (should truncate to 50)
      const moreThan50Items = Array.from({ length: 100 }, (_, i) => ({
        userInput: `deploy service-${i}`,
        intent: {
          intent: 'deploy',
          entities: { service: `service-${i}`, env: 'staging' },
          cli: '',
          confidence: 0.9,
          risk: 'low',
          confirmRequired: false
        },
        response: 'Success',
        timestamp: new Date(Date.now() - i * 1000).toISOString()
      }));

      // Act
      const result = await disambiguator.disambiguate(
        validPartialIntent,
        moreThan50Items as any
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('exceeds maximum'),
        expect.objectContaining({
          totalSize: 100,
          processedSize: 50,
          truncated: 50
        })
      );
    });

    it('should handle empty history after filtering irrelevant intents', async () => {
      // Arrange - all history has different intent
      const irrelevantHistory = [
        {
          userInput: 'scale api',
          intent: {
            intent: 'scale',
            entities: { service: 'api', replicas: 5 },
            cli: '',
            confidence: 0.9,
            risk: 'low',
            confirmRequired: false
          },
          response: 'Success',
          timestamp: new Date(Date.now() - 60000).toISOString()
        },
        {
          userInput: 'show logs',
          intent: {
            intent: 'logs',
            entities: {},
            cli: '',
            confidence: 0.9,
            risk: 'low',
            confirmRequired: false
          },
          response: 'Logs shown',
          timestamp: new Date(Date.now() - 120000).toISOString()
        }
      ];

      // Act
      const result = await disambiguator.disambiguate(
        validPartialIntent,
        irrelevantHistory as any
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.reasoning).toContain('No previous context');
    });
  });

  describe('Confidence/Validation Edge Cases', () => {
    it('should reject confidence out of range (>1.0)', async () => {
      // Arrange
      const invalidConfidence = {
        intent: 'deploy',
        entities: {},
        cli: '',
        confidence: 1.5, // Invalid (>1.0)
        risk: 'low',
        confirmRequired: false
      };

      // Act
      const result = await disambiguator.disambiguate(
        invalidConfidence as any,
        []
      );

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('confidence out of range'),
        expect.anything()
      );
    });

    it('should reject NaN confidence', async () => {
      // Arrange
      const nanConfidence = {
        intent: 'deploy',
        entities: {},
        cli: '',
        confidence: NaN,
        risk: 'low',
        confirmRequired: false
      };

      // Act
      const result = await disambiguator.disambiguate(
        nanConfidence as any,
        []
      );

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('confidence'),
        expect.anything()
      );
    });

    it('should reject Infinity confidence', async () => {
      // Arrange
      const infinityConfidence = {
        intent: 'deploy',
        entities: {},
        cli: '',
        confidence: Infinity,
        risk: 'low',
        confirmRequired: false
      };

      // Act
      const result = await disambiguator.disambiguate(
        infinityConfidence as any,
        []
      );

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('confidence'),
        expect.anything()
      );
    });
  });
});
