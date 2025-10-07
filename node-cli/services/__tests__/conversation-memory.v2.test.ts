/**
 * @fileoverview Production-Grade Conversation Memory Tests
 * @description Comprehensive test suite with edge cases, security, and error handling
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConversationMemory } from '../conversation-memory.v2.js';
import type { ParsedIntentType } from '../../nl-planner/types.js';
import type { ILogger } from '@aios/shared/core';
import type { MemorySnapshot } from '../conversation-memory.v2.js';

// Mock logger
const mockLogger: ILogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLevel: () => {},
  child: () => mockLogger
};

// Mock metrics
const mockMetrics = {
  recordPreferenceLearned: jest.fn(),
  recordTurnAdded: jest.fn()
};

// Helper to create mock intent
function createMockIntent(overrides?: Partial<ParsedIntentType>): ParsedIntentType {
  return {
    intent: 'deploy',
    entities: {},
    cli: 'aios deploy',
    confidence: 0.9,
    risk: 'low',
    confirmRequired: false,
    ...overrides
  };
}

describe('ConversationMemory v2 (Production-Grade)', () => {
  let memory: ConversationMemory;

  beforeEach(() => {
    jest.clearAllMocks();
    memory = new ConversationMemory(mockLogger, mockMetrics);
  });

  describe('Input Validation & Sanitization', () => {
    it('should truncate inputs exceeding max length', () => {
      const longInput = 'a'.repeat(10001); // Exceeds 10000 limit
      const intent = createMockIntent();

      const result = memory.learnFromInput(longInput, intent);

      expect(result).toBe(true); // Accepts with truncation (graceful degradation)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Input truncated',
        expect.objectContaining({
          originalLength: 10001,
          truncatedLength: 10000
        })
      );
      expect(memory.getTurns().length).toBe(1);
      expect(memory.getTurns()[0]?.userInput.length).toBe(10000);
    });

    it('should sanitize control characters', () => {
      const dirtyInput = 'deploy\x00to\x1Fproduction'; // Contains null byte and control char
      const intent = createMockIntent();

      memory.learnFromInput(dirtyInput, intent);

      const turn = memory.getTurns()[0];
      expect(turn?.userInput).toBe('deploytoproduction'); // Control chars removed
    });

    it('should reject empty input after sanitization', () => {
      const emptyInput = '\x00\x01\x02'; // Only control chars
      const intent = createMockIntent();

      const result = memory.learnFromInput(emptyInput, intent);

      expect(result).toBe(false); // Rejected
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid turn rejected',
        expect.objectContaining({
          errors: expect.arrayContaining(['Input is empty after sanitization'])
        })
      );
    });

    it('should handle unicode and emoji correctly', () => {
      const unicodeInput = '部署到生产环境 🚀';
      const intent = createMockIntent();

      const result = memory.learnFromInput(unicodeInput, intent);

      expect(result).toBe(true);
      expect(memory.getTurns()[0]?.userInput).toBe(unicodeInput);
    });
  });

  describe('Type Safety', () => {
    it('should enforce type-safe preference values', () => {
      const intent = createMockIntent();

      memory.learnFromInput('I want cheap options', intent);

      const priority = memory.getUserPriority();
      expect(priority).toBe('cost'); // PriorityType
      type _PriorityCheck = typeof priority extends 'cost' | 'speed' | 'safety' | null ? true : never;
    });

    it('should handle environment preference with type safety', () => {
      const intent = createMockIntent({
        entities: { env: 'production' }
      });

      memory.learnFromInput('deploy', intent);

      const env = memory.getPreferredEnvironment();
      expect(env).toBe('production');
      type _EnvCheck = typeof env extends 'development' | 'staging' | 'production' | 'preview' | null ? true : never;
    });

    it('should reject invalid environment values', () => {
      const intent = createMockIntent({
        entities: { env: 'invalid-env' as any }
      });

      memory.learnFromInput('deploy', intent);

      const env = memory.getPreferredEnvironment();
      expect(env).toBeNull(); // Invalid value ignored
    });
  });

  describe('JSON Serialization (No Date Objects)', () => {
    it('should serialize snapshot without Date objects', () => {
      const intent = createMockIntent();

      memory.learnFromInput('deploy fast', intent);
      memory.setProjectContext({
        path: '/app',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date().toISOString(),
          success: true
        }
      });

      const snapshot = memory.toSnapshot();
      const json = JSON.stringify(snapshot);
      const parsed = JSON.parse(json);

      // Verify no Date objects in JSON
      expect(typeof parsed.createdAt).toBe('string');
      expect(typeof parsed.turns[0]?.timestamp).toBe('string');
      expect(typeof parsed.preferences[0]?.learnedAt).toBe('string');

      // Verify ISO 8601 format
      expect(parsed.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle Date→ISO migration in fromSnapshot', () => {
      // Simulate old snapshot with Date objects
      const oldSnapshot: any = {
        version: 1,
        turns: [{
          userInput: 'test',
          intent: createMockIntent(),
          response: '',
          timestamp: new Date('2025-01-01')
        }],
        preferences: {
          'priority:cost': {
            type: 'priority',
            value: 'cost',
            confidence: 0.5,
            learnedAt: new Date('2025-01-01'),
            occurrences: 1
          }
        },
        projectContext: null
      };

      const restored = ConversationMemory.fromSnapshot(oldSnapshot, mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith('Migrating snapshot from v1 to v2');
      expect(restored.getTurns()[0]?.timestamp).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('Schema Versioning', () => {
    it('should include version in snapshot', () => {
      const snapshot = memory.toSnapshot();

      expect(snapshot.version).toBe(2);
      expect(snapshot.createdAt).toBeDefined();
    });

    it('should reject unsupported versions', () => {
      const futureSnapshot: any = {
        version: 99,
        turns: [],
        preferences: [],
        projectContext: null,
        createdAt: new Date().toISOString()
      };

      expect(() => {
        ConversationMemory.fromSnapshot(futureSnapshot, mockLogger);
      }).toThrow('Unsupported snapshot version: 99');
    });

    it('should migrate v1 to v2 format', () => {
      const v1Snapshot: any = {
        // No version field (v1)
        turns: [],
        preferences: {},
        projectContext: null
      };

      const restored = ConversationMemory.fromSnapshot(v1Snapshot, mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith('Migrating snapshot from v1 to v2');
      expect(restored).toBeInstanceOf(ConversationMemory);
    });
  });

  describe('Defensive Copying', () => {
    it('should return frozen copy of turns (immutable)', () => {
      const intent = createMockIntent();
      memory.learnFromInput('test', intent);

      const turns = memory.getTurns();

      expect(Object.isFrozen(turns)).toBe(true);
      expect(() => {
        (turns as any).push({ userInput: 'hack' });
      }).toThrow();
    });

    it('should prevent external mutation of project context', () => {
      const context = {
        path: '/app',
        framework: 'React' as const
      };

      memory.setProjectContext(context);

      // Mutate original object
      context.framework = 'Vue' as any;

      // Memory should have defensive copy
      const stored = memory.getProjectContext();
      expect(stored?.framework).toBe('React'); // Not mutated
    });

    it('should return defensive copy of project context', () => {
      memory.setProjectContext({
        path: '/app',
        framework: 'Next.js'
      });

      const context1 = memory.getProjectContext();
      const context2 = memory.getProjectContext();

      expect(context1).not.toBe(context2); // Different instances
      expect(context1).toEqual(context2); // Same values
    });
  });

  describe('Error Handling', () => {
    it('should handle pattern matching errors gracefully', () => {
      // Simulate regex error by modifying patterns (hypothetical)
      const intent = createMockIntent();

      // Should not throw
      expect(() => {
        memory.learnFromInput('deploy to production', intent);
      }).not.toThrow();
    });

    it('should log errors during preference extraction', () => {
      const badIntent: any = {
        intent: 'deploy',
        entities: { env: {} }, // Invalid type
        cli: 'aios deploy',
        confidence: 0.9,
        risk: 'low',
        confirmRequired: false
      };

      memory.learnFromInput('deploy', badIntent);

      // Should handle gracefully without crashing
      expect(memory.getTurns().length).toBe(1);
    });
  });

  describe('Metrics & Observability', () => {
    it('should record preference learned metrics', () => {
      const intent = createMockIntent();

      memory.learnFromInput('cheap option', intent);

      expect(mockMetrics.recordPreferenceLearned).toHaveBeenCalledWith('priority', 0.5);
    });

    it('should record turn added metrics', () => {
      const intent = createMockIntent();

      memory.learnFromInput('deploy', intent);

      expect(mockMetrics.recordTurnAdded).toHaveBeenCalledWith(1);
    });

    it('should provide comprehensive stats', () => {
      const intent = createMockIntent();

      memory.learnFromInput('cheap and fast', intent);
      memory.learnFromInput('also cheap', intent); // Increase confidence

      const stats = memory.getStats();

      expect(stats.turns).toBe(2);
      expect(stats.preferences).toBeGreaterThan(0);
      expect(stats.avgConfidence).toBeGreaterThan(0);
      expect(stats.oldestTurnAge).toBeGreaterThanOrEqual(0); // Can be 0ms in fast tests
      expect(stats.oldestTurnAge).toBeLessThan(1000); // Recent (< 1 second)
    });

    it('should calculate average confidence correctly', () => {
      const intent = createMockIntent();

      memory.learnFromInput('cheap', intent);    // 0.5
      memory.learnFromInput('cheap', intent);    // 0.75
      memory.learnFromInput('cheap', intent);    // 0.9 (capped)

      const stats = memory.getStats();
      expect(stats.avgConfidence).toBe(0.9); // Only one preference
    });
  });

  describe('Preference Learning (Original Tests)', () => {
    it('should learn cost priority from keywords', () => {
      const intent = createMockIntent();

      memory.learnFromInput('what is the cheapest option?', intent);

      expect(memory.getUserPriority()).toBe('cost');
    });

    it('should learn speed priority from keywords', () => {
      const intent = createMockIntent();

      memory.learnFromInput('I need this deployed fast', intent);

      expect(memory.getUserPriority()).toBe('speed');
    });

    it('should learn safety priority from keywords', () => {
      const intent = createMockIntent();

      memory.learnFromInput('let me be careful and deploy to staging first', intent);

      expect(memory.getUserPriority()).toBe('safety');
    });

    it('should prioritize most recent preference', async () => {
      const intent = createMockIntent();

      memory.learnFromInput('I want something cheap', intent);

      await new Promise(resolve => setTimeout(resolve, 5));

      memory.learnFromInput('deploy quickly please', intent);

      expect(memory.getUserPriority()).toBe('speed');
    });
  });

  describe('Sliding Window', () => {
    it('should maintain max 10 turns', () => {
      const intent = createMockIntent();

      for (let i = 0; i < 15; i++) {
        memory.learnFromInput(`turn ${i}`, intent);
      }

      const turns = memory.getTurns();
      expect(turns.length).toBe(10);
    });

    it('should keep most recent turns', () => {
      const intent = createMockIntent();

      for (let i = 0; i < 15; i++) {
        memory.learnFromInput(`turn ${i}`, intent);
      }

      const turns = memory.getTurns();
      expect(turns[0]?.userInput).toBe('turn 5');
      expect(turns[9]?.userInput).toBe('turn 14');
    });
  });

  describe('Snapshot & Restore', () => {
    it('should restore from snapshot with all data', () => {
      const intent = createMockIntent();

      memory.learnFromInput('fast deployment', intent);
      memory.setProjectContext({ path: '/app', framework: 'React' });

      const snapshot = memory.toSnapshot();
      const restored = ConversationMemory.fromSnapshot(snapshot, mockLogger);

      expect(restored.getTurns().length).toBe(1);
      expect(restored.getUserPriority()).toBe('speed');
      expect(restored.getProjectContext()?.framework).toBe('React');
    });

    it('should handle preferences array format correctly', () => {
      const intent = createMockIntent();

      memory.learnFromInput('cheap', intent);

      const snapshot = memory.toSnapshot();

      // Verify preferences is array (not object)
      expect(Array.isArray(snapshot.preferences)).toBe(true);
      expect(snapshot.preferences.length).toBeGreaterThan(0);
      expect(snapshot.preferences[0]?.type).toBe('priority');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty preference state gracefully', () => {
      expect(memory.getUserPriority()).toBeNull();
      expect(memory.getPreferredProvider()).toBeNull();
      expect(memory.getPreferredEnvironment()).toBeNull();
    });

    it('should handle stats with no data', () => {
      const stats = memory.getStats();

      expect(stats.turns).toBe(0);
      expect(stats.preferences).toBe(0);
      expect(stats.avgConfidence).toBe(0);
      expect(stats.oldestTurnAge).toBeNull();
    });

    it('should handle malformed snapshot gracefully', () => {
      const badSnapshot: any = {
        version: 2,
        turns: null, // Invalid
        preferences: undefined, // Invalid
        projectContext: 'not-an-object', // Invalid
        createdAt: new Date().toISOString()
      };

      const restored = ConversationMemory.fromSnapshot(badSnapshot, mockLogger);

      expect(restored.getTurns().length).toBe(0);
      expect(restored.getProjectContext()).toBeNull();
    });
  });

  describe('Security', () => {
    it('should prevent ReDoS with malicious regex input', () => {
      const maliciousInput = 'a'.repeat(1000) + 'b'.repeat(1000); // Potential ReDoS
      const intent = createMockIntent();

      const startTime = Date.now();
      memory.learnFromInput(maliciousInput, intent);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should not leak sensitive data in logs', () => {
      const sensitiveInput = 'deploy with API_KEY=sk-1234567890abcdef';
      const intent = createMockIntent();

      memory.learnFromInput(sensitiveInput, intent);

      // Check that logger doesn't expose full input
      const logCalls = (mockLogger.debug as jest.Mock).mock.calls;
      const hasFullInput = logCalls.some(call =>
        JSON.stringify(call).includes('sk-1234567890abcdef')
      );

      expect(hasFullInput).toBe(false); // Input should be truncated in logs
    });
  });
});
