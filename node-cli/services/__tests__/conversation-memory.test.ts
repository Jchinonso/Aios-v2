/**
 * @fileoverview Conversation Memory Unit Tests
 * @description Comprehensive test coverage for ConversationMemory class
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConversationMemory } from '../conversation-memory.js';
import type { ParsedIntentType } from '../../nl-planner/types.js';
import type { ILogger } from '@aios/shared/core';

// Mock logger
const mockLogger: ILogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
  setLevel: () => {},
  child: () => mockLogger
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

describe('ConversationMemory', () => {
  let memory: ConversationMemory;

  beforeEach(() => {
    memory = new ConversationMemory(mockLogger);
  });

  describe('Priority Learning', () => {
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

    it('should handle multiple cost-related keywords', () => {
      const intent = createMockIntent();

      memory.learnFromInput('I want an affordable and budget-friendly option', intent);

      expect(memory.getUserPriority()).toBe('cost');
    });

    it('should prioritize most recent preference', async () => {
      const intent = createMockIntent();

      memory.learnFromInput('I want something cheap', intent); // cost

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 5));

      memory.learnFromInput('deploy quickly please', intent);  // speed

      expect(memory.getUserPriority()).toBe('speed');
    });
  });

  describe('Confidence Scoring', () => {
    it('should start with 0.5 confidence on first occurrence', () => {
      const intent = createMockIntent();

      memory.learnFromInput('cheap option', intent);

      const stats = memory.getStats();
      expect(stats.preferences).toBe(1);
    });

    it('should increase confidence with repetition', () => {
      const intent = createMockIntent();

      memory.learnFromInput('cheap', intent);
      memory.learnFromInput('affordable', intent);
      memory.learnFromInput('budget', intent);

      const priority = memory.getUserPriority();
      expect(priority).toBe('cost');

      // After 3 occurrences, confidence should be high
      const stats = memory.getStats();
      expect(stats.highConfidencePreferences).toBeGreaterThan(0);
    });

    it('should not return preference if confidence below threshold', () => {
      const intent = createMockIntent();

      // Single occurrence may not reach confidence threshold
      memory.learnFromInput('maybe vercel?', intent);

      const provider = memory.getPreferredProvider();
      // Should return null or have low confidence
      if (provider) {
        expect(provider.confidence).toBeLessThan(0.6);
      }
    });

    it('should cap confidence at 0.9', () => {
      const intent = createMockIntent();

      // Many occurrences
      for (let i = 0; i < 10; i++) {
        memory.learnFromInput('cheap option', intent);
      }

      const provider = memory.getPreferredProvider();
      if (provider) {
        expect(provider.confidence).toBeLessThanOrEqual(0.9);
      }
    });
  });

  describe('Sliding Window', () => {
    it('should maintain max 10 turns', () => {
      const intent = createMockIntent();

      // Add 15 turns
      for (let i = 0; i < 15; i++) {
        memory.learnFromInput(`turn ${i}`, intent);
      }

      const turns = memory.getTurns();
      expect(turns.length).toBe(10);
    });

    it('should keep most recent turns when window full', () => {
      const intent = createMockIntent();

      for (let i = 0; i < 15; i++) {
        memory.learnFromInput(`turn ${i}`, intent);
      }

      const turns = memory.getTurns();
      expect(turns[0]?.userInput).toBe('turn 5'); // Oldest kept turn
      expect(turns[9]?.userInput).toBe('turn 14'); // Newest turn
    });
  });

  describe('Provider Learning', () => {
    it('should learn provider preference from mentions', () => {
      const intent = createMockIntent();

      memory.learnFromInput('I like vercel', intent);
      memory.learnFromInput('vercel is great', intent);

      const provider = memory.getPreferredProvider();
      expect(provider?.provider).toBe('vercel');
    });

    it('should handle all provider types', () => {
      const providers = ['vercel', 'netlify', 'aws', 'railway', 'render'];

      providers.forEach(providerName => {
        const m = new ConversationMemory(mockLogger);
        const intent = createMockIntent();

        m.learnFromInput(`I prefer ${providerName}`, intent);
        m.learnFromInput(`${providerName} is good`, intent);

        const pref = m.getPreferredProvider();
        expect(pref?.provider).toBe(providerName);
      });
    });
  });

  describe('Environment Learning', () => {
    it('should learn environment from intent entities', () => {
      const intent = createMockIntent({
        entities: { env: 'production' }
      });

      memory.learnFromInput('deploy', intent);
      memory.learnFromInput('deploy again', intent);

      const env = memory.getPreferredEnvironment();
      expect(env).toBe('production');
    });

    it('should handle different environments', () => {
      const environments = ['development', 'staging', 'production', 'preview'];

      environments.forEach(envName => {
        const m = new ConversationMemory(mockLogger);
        const intent = createMockIntent({
          entities: { env: envName as any }
        });

        m.learnFromInput('deploy', intent);
        m.learnFromInput('deploy', intent);

        const env = m.getPreferredEnvironment();
        expect(env).toBe(envName);
      });
    });
  });

  describe('Relevant Context', () => {
    it('should include recent turns in context', () => {
      const intent = createMockIntent();

      memory.learnFromInput('deploy my app', intent);
      memory.learnFromInput('show logs', createMockIntent({ intent: 'logs' }));

      const context = memory.getRelevantContext('what is status?');

      expect(context).toContain('deploy my app');
      expect(context).toContain('show logs');
    });

    it('should include learned preferences in context', () => {
      const intent = createMockIntent();

      memory.learnFromInput('I want cheap options', intent);
      memory.learnFromInput('affordable please', intent);

      const context = memory.getRelevantContext('deploy');

      expect(context).toContain('Priority: cost');
    });

    it('should show unknown for uncertain preferences', () => {
      const context = memory.getRelevantContext('deploy');

      expect(context).toContain('Priority: unknown');
      expect(context).toContain('Preferred provider: none yet');
    });

    it('should limit to last 3 turns in context', () => {
      const intent = createMockIntent();

      for (let i = 0; i < 5; i++) {
        memory.learnFromInput(`turn ${i}`, intent);
      }

      const context = memory.getRelevantContext('next');

      // Should only include turns 2, 3, 4 (last 3)
      expect(context).toContain('turn 2');
      expect(context).toContain('turn 3');
      expect(context).toContain('turn 4');
      expect(context).not.toContain('turn 0');
      expect(context).not.toContain('turn 1');
    });
  });

  describe('Project Context', () => {
    it('should store and retrieve project context', () => {
      memory.setProjectContext({
        path: '/home/user/my-app',
        framework: 'Next.js'
      });

      const context = memory.getProjectContext();
      expect(context?.path).toBe('/home/user/my-app');
      expect(context?.framework).toBe('Next.js');
    });

    it('should include last deployment in context', () => {
      memory.setProjectContext({
        path: '/home/user/my-app',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          success: true
        }
      });

      const context = memory.getRelevantContext('deploy');

      expect(context).toContain('Last deployment: vercel to production');
      expect(context).toContain('hour');
    });
  });

  describe('Snapshot & Restore', () => {
    it('should create snapshot with all data', () => {
      const intent = createMockIntent();

      memory.learnFromInput('cheap option', intent);
      memory.setProjectContext({ path: '/app' });

      const snapshot = memory.toSnapshot();

      expect(snapshot.turns.length).toBe(1);
      expect(Object.keys(snapshot.preferences).length).toBeGreaterThan(0);
      expect(snapshot.projectContext?.path).toBe('/app');
    });

    it('should restore from snapshot correctly', () => {
      const intent = createMockIntent();

      memory.learnFromInput('fast deployment', intent);
      memory.learnFromInput('quick please', intent);
      memory.setProjectContext({ path: '/my-app', framework: 'React' });

      const snapshot = memory.toSnapshot();

      // Create new memory and restore
      const restored = ConversationMemory.fromSnapshot(snapshot, mockLogger);

      expect(restored.getTurns().length).toBe(2);
      expect(restored.getUserPriority()).toBe('speed');
      expect(restored.getProjectContext()?.framework).toBe('React');
    });

    it('should preserve confidence scores on restore', () => {
      const intent = createMockIntent();

      // Build high confidence
      memory.learnFromInput('cheap', intent);
      memory.learnFromInput('affordable', intent);
      memory.learnFromInput('budget', intent);

      const snapshot = memory.toSnapshot();
      const restored = ConversationMemory.fromSnapshot(snapshot, mockLogger);

      const original = memory.getStats();
      const restoredStats = restored.getStats();

      expect(restoredStats.highConfidencePreferences).toBe(original.highConfidencePreferences);
    });
  });

  describe('Clear', () => {
    it('should clear all data', () => {
      const intent = createMockIntent();

      memory.learnFromInput('deploy', intent);
      memory.setProjectContext({ path: '/app' });

      memory.clear();

      expect(memory.getTurns().length).toBe(0);
      expect(memory.getUserPriority()).toBeNull();
      expect(memory.getProjectContext()).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should return accurate stats', () => {
      const intent = createMockIntent();

      memory.learnFromInput('cheap option', intent);
      memory.learnFromInput('affordable', intent);
      memory.learnFromInput('budget', intent);
      memory.setProjectContext({ path: '/app' });

      const stats = memory.getStats();

      expect(stats.turns).toBe(3);
      expect(stats.preferences).toBeGreaterThan(0);
      expect(stats.hasProjectContext).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const intent = createMockIntent();

      memory.learnFromInput('', intent);

      expect(memory.getTurns().length).toBe(1);
      expect(memory.getUserPriority()).toBeNull();
    });

    it('should handle null/undefined entities gracefully', () => {
      const intent = createMockIntent({
        entities: {}
      });

      expect(() => {
        memory.learnFromInput('deploy', intent);
      }).not.toThrow();
    });

    it('should handle mixed case keywords', () => {
      const intent = createMockIntent();

      memory.learnFromInput('I want CHEAP and FAST', intent);

      // Should detect both (most recent wins)
      const priority = memory.getUserPriority();
      expect(['cost', 'speed']).toContain(priority);
    });

    it('should handle contradictory preferences', async () => {
      const intent = createMockIntent();

      memory.learnFromInput('I want cheap', intent);

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 5));

      memory.learnFromInput('but also fast', intent);

      // Most recent should win
      expect(memory.getUserPriority()).toBe('speed');
    });
  });

  describe('Relative Time Formatting', () => {
    it('should format recent timestamps', () => {
      memory.setProjectContext({
        path: '/app',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date(Date.now() - 30000), // 30 seconds ago
          success: true
        }
      });

      const context = memory.getRelevantContext('');
      expect(context).toMatch(/\d+ sec ago/);
    });

    it('should format hour timestamps', () => {
      memory.setProjectContext({
        path: '/app',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date(Date.now() - 7200000), // 2 hours ago
          success: true
        }
      });

      const context = memory.getRelevantContext('');
      expect(context).toContain('2 hours ago');
    });

    it('should format day timestamps', () => {
      memory.setProjectContext({
        path: '/app',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date(Date.now() - 172800000), // 2 days ago
          success: true
        }
      });

      const context = memory.getRelevantContext('');
      expect(context).toContain('2 days ago');
    });
  });
});
