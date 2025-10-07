/**
 * @fileoverview Advanced Edge Case Tests for SmartDefaultsEngine
 * @module node-cli/services/__tests__/smart-defaults-edge-cases
 *
 * Production-grade edge case coverage:
 * - Unmapped priority values
 * - Time risk boundary conditions
 * - Daylight Saving Time transitions
 * - Failed deployment handling
 * - Provider mapping exhaustiveness
 *
 * @author Claude Code (Principal Engineer - God Mode)
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { SmartDefaultsEngine } from '../smart-defaults.js';
import type { ConversationMemory } from '../conversation-memory.v2.js';
import type { ParsedIntentType } from '../../nl-planner/types.js';
import type { PriorityType } from '../conversation-memory.v2.js';

// Mock logger with typed interface
interface MockLogger {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  setLevel: jest.Mock;
  child: jest.Mock;
}

const createMockLogger = (): MockLogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLevel: jest.fn(),
  child: jest.fn(() => createMockLogger()),
});

// Type-safe mock memory
const createMockMemory = (): jest.Mocked<Pick<ConversationMemory, 'getUserPriority' | 'getProjectContext'>> => ({
  getUserPriority: jest.fn(),
  getProjectContext: jest.fn(),
});

describe('SmartDefaultsEngine - Advanced Edge Cases', () => {
  let engine: SmartDefaultsEngine;
  let mockLogger: MockLogger;
  let mockMemory: ReturnType<typeof createMockMemory>;

  const baseIntent: ParsedIntentType = {
    intent: 'deploy',
    entities: {},
    cli: '',
    confidence: 0.9,
    risk: 'low',
    confirmRequired: false,
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    engine = new SmartDefaultsEngine(mockLogger as any);
    mockMemory = createMockMemory();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Priority Validation Edge Cases', () => {
    it('should handle unmapped priority value gracefully', () => {
      // Arrange - Custom priority not in PRIORITY_TO_PROVIDER mapping
      const customPriority = 'custom-enterprise-priority' as PriorityType;
      mockMemory.getUserPriority.mockReturnValue(customPriority);

      // Act
      const result = engine.applyDefaults(baseIntent, mockMemory as any);

      // Assert
      expect(result.appliedDefaults).not.toContain('provider');
      expect(result.reasoning.length).toBe(0);
      // Should handle gracefully without crashing
      expect(result.intent).toEqual(baseIntent);
    });

    it('should handle null priority (no learned preference)', () => {
      // Arrange
      mockMemory.getUserPriority.mockReturnValue(null);

      // Act
      const result = engine.applyDefaults(baseIntent, mockMemory as any);

      // Assert
      expect(result.appliedDefaults).not.toContain('provider');
      expect(result.intent.entities.provider).toBeUndefined();
    });

    it('should handle all valid priority mappings exhaustively', () => {
      // Arrange - Test all known priorities
      const validPriorities: Array<{ priority: PriorityType; expectedProvider: string }> = [
        { priority: 'speed', expectedProvider: 'vercel' },
        { priority: 'cost', expectedProvider: 'railway' },
        { priority: 'safety', expectedProvider: 'aws' },
      ];

      // Act & Assert - Verify each mapping
      validPriorities.forEach(({ priority, expectedProvider }) => {
        mockMemory.getUserPriority.mockReturnValue(priority);
        const result = engine.applyDefaults(baseIntent, mockMemory as any);

        expect(result.intent.entities.provider).toBe(expectedProvider);
        expect(result.appliedDefaults).toContain('provider');
        expect(result.reasoning.some(r => r.includes(expectedProvider))).toBe(true);
      });
    });

    it('should handle undefined priority (edge case)', () => {
      // Arrange - Explicitly undefined (different from null)
      mockMemory.getUserPriority.mockReturnValue(undefined as any);

      // Act
      const result = engine.applyDefaults(baseIntent, mockMemory as any);

      // Assert - Should handle gracefully
      expect(result).toBeDefined();
      expect(result.appliedDefaults).not.toContain('provider');
    });
  });

  describe('Time-Based Safety Edge Cases', () => {
    it('should handle exact risk boundary (Friday 5:00 PM)', () => {
      // Arrange - Friday at exactly 5:00 PM UTC (risky boundary)
      const friday5PM = new Date('2025-10-03T17:00:00Z'); // Friday 5 PM
      jest.useFakeTimers();
      jest.setSystemTime(friday5PM);

      const deployIntent: ParsedIntentType = {
        ...baseIntent,
        entities: {},
      };

      // Memory returns staging from last deployment
      mockMemory.getProjectContext.mockReturnValue({
        path: '/test',
        lastDeployment: {
          provider: 'vercel',
          env: 'staging',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          success: true,
        },
      });

      // Act
      const result = engine.applyDefaults(deployIntent, mockMemory as any);

      // Assert - Should apply env from last deployment
      expect(result.intent.entities.env).toBe('staging');
      expect(result.appliedDefaults).toContain('env');
    });

    it('should handle weekend deployment (Saturday)', () => {
      // Arrange - Saturday afternoon (risky)
      const saturday = new Date('2025-10-04T14:00:00Z'); // Saturday 2 PM
      jest.useFakeTimers();
      jest.setSystemTime(saturday);

      const deployIntent: ParsedIntentType = {
        ...baseIntent,
        entities: {},
      };

      // Last deployment was production
      mockMemory.getProjectContext.mockReturnValue({
        path: '/test',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          success: true,
        },
      });

      // Act
      const result = engine.applyDefaults(deployIntent, mockMemory as any);

      // Assert - Should override production to staging (weekend safety)
      expect(result.intent.entities.env).toBe('staging');
      expect(result.reasoning.some(r => r.toLowerCase().includes('weekend'))).toBe(true);
    });

    it('should handle Daylight Saving Time transition (spring forward)', () => {
      // Arrange - DST transition: 2 AM on second Sunday of March (US)
      const dstSpringForward = new Date('2025-03-09T02:00:00-05:00'); // EST
      jest.useFakeTimers();
      jest.setSystemTime(dstSpringForward);

      const deployIntent: ParsedIntentType = {
        ...baseIntent,
        entities: {},
      };

      mockMemory.getProjectContext.mockReturnValue({
        path: '/test',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          success: true,
        },
      });

      // Act - Should not crash during DST transition
      const result = engine.applyDefaults(
        deployIntent,
        mockMemory as any,
        'America/New_York'
      );

      // Assert - Should handle gracefully
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });

    it('should handle invalid timezone gracefully', () => {
      // Arrange
      const deployIntent: ParsedIntentType = {
        ...baseIntent,
        entities: {},
      };

      mockMemory.getProjectContext.mockReturnValue({
        path: '/test',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date().toISOString(),
          success: true,
        },
      });

      // Act - Invalid timezone should fall back to UTC
      const result = engine.applyDefaults(
        deployIntent,
        mockMemory as any,
        'Invalid/Timezone'
      );

      // Assert
      expect(result).toBeDefined();
      // Should not crash, uses UTC fallback
    });

    it('should handle late night deployment (2 AM Monday)', () => {
      // Arrange - Monday 2 AM (risky time)
      const monday2AM = new Date('2025-10-06T02:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(monday2AM);

      const deployIntent: ParsedIntentType = {
        ...baseIntent,
        entities: {},
      };

      mockMemory.getProjectContext.mockReturnValue({
        path: '/test',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          success: true,
        },
      });

      // Act
      const result = engine.applyDefaults(deployIntent, mockMemory as any);

      // Assert - Should apply safety override
      expect(result.intent.entities.env).toBe('staging');
      expect(result.reasoning.some(r => r.toLowerCase().includes('late night') || r.toLowerCase().includes('off-hours'))).toBe(true);
    });
  });

  describe('Environment Default Edge Cases', () => {
    it('should handle all recent deployments failed (no success=true)', () => {
      // Arrange - Last 3 deployments all failed
      mockMemory.getProjectContext.mockReturnValue({
        path: '/test',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          success: false, // Failed
        },
      });

      // Act
      const result = engine.applyDefaults(baseIntent, mockMemory as any);

      // Assert - Should NOT use failed deployment's env
      expect(result.appliedDefaults).not.toContain('env');
      expect(result.intent.entities.env).toBeUndefined();
    });

    it('should handle missing lastDeployment entirely', () => {
      // Arrange - Project context exists but no lastDeployment
      mockMemory.getProjectContext.mockReturnValue({
        path: '/test',
        framework: 'nextjs',
        // No lastDeployment property
      });

      // Act
      const result = engine.applyDefaults(baseIntent, mockMemory as any);

      // Assert
      expect(result.appliedDefaults).not.toContain('env');
      expect(result.intent.entities.env).toBeUndefined();
    });

    it('should handle null project context', () => {
      // Arrange
      mockMemory.getProjectContext.mockReturnValue(null);

      // Act
      const result = engine.applyDefaults(baseIntent, mockMemory as any);

      // Assert - Should handle gracefully
      expect(result).toBeDefined();
      expect(result.appliedDefaults).not.toContain('env');
    });

    it('should handle lastDeployment with null env', () => {
      // Arrange - Edge case: deployment succeeded but env is null
      mockMemory.getProjectContext.mockReturnValue({
        path: '/test',
        lastDeployment: {
          provider: 'vercel',
          env: null as any,
          timestamp: new Date().toISOString(),
          success: true,
        },
      });

      // Act
      const result = engine.applyDefaults(baseIntent, mockMemory as any);

      // Assert - Should not apply null env
      expect(result.appliedDefaults).not.toContain('env');
    });
  });

  describe('Non-Deploy Intent Handling', () => {
    it('should not apply any defaults for non-deploy intents', () => {
      // Arrange - Test various non-deploy intents
      const nonDeployIntents: Array<ParsedIntentType['intent']> = [
        'scale',
        'logs',
        'status',
        'rollback',
        'deployment-history',
      ];

      // Act & Assert
      nonDeployIntents.forEach(intent => {
        const testIntent: ParsedIntentType = {
          intent,
          entities: {},
          cli: '',
          confidence: 0.9,
          risk: 'low',
          confirmRequired: false,
        };

        mockMemory.getUserPriority.mockReturnValue('speed');
        mockMemory.getProjectContext.mockReturnValue({
          path: '/test',
          lastDeployment: {
            provider: 'vercel',
            env: 'staging',
            timestamp: new Date().toISOString(),
            success: true,
          },
        });

        const result = engine.applyDefaults(testIntent, mockMemory as any);

        expect(result.appliedDefaults.length).toBe(0);
        expect(result.reasoning.length).toBe(0);
        expect(result.intent).toEqual(testIntent);
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle memory throwing exception gracefully', () => {
      // Arrange - Memory throws on getUserPriority
      mockMemory.getUserPriority.mockImplementation(() => {
        throw new Error('Memory unavailable');
      });

      // Act
      const result = engine.applyDefaults(baseIntent, mockMemory as any);

      // Assert - Should return original intent on error
      expect(result.intent).toEqual(baseIntent);
      expect(result.appliedDefaults.length).toBe(0);
      // Error should be logged (specific message may vary)
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle getProjectContext throwing exception', () => {
      // Arrange
      mockMemory.getUserPriority.mockReturnValue(null);
      mockMemory.getProjectContext.mockImplementation(() => {
        throw new Error('Context unavailable');
      });

      // Act
      const result = engine.applyDefaults(baseIntent, mockMemory as any);

      // Assert
      expect(result.intent).toEqual(baseIntent);
      expect(result.appliedDefaults.length).toBe(0);
    });
  });
});
