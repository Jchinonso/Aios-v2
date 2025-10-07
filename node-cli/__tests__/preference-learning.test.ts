/**
 * @fileoverview TDD Tests for Preference Learning
 * @module node-cli/__tests__/preference-learning.test
 *
 * Following strict TDD:
 * 1. Write FAILING tests first
 * 2. Implement minimal code to make tests pass
 * 3. Refactor with confidence
 *
 * These tests will FAIL because we need to add:
 * - Automatic preference extraction from patterns
 * - Confidence scoring for preferences
 * - Preference decay over time
 * - Multi-dimensional preferences (provider, env, priority, etc.)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConversationMemory } from '../services/conversation-memory.v2.js';

// Mock logger
const createMockLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLevel: jest.fn(),
  child: jest.fn(() => createMockLogger()),
});

describe('Preference Learning - TDD', () => {
  let memory;
  let logger;

  beforeEach(() => {
    logger = createMockLogger();
    memory = new ConversationMemory(logger);
  });

  describe('Provider Preference Learning', () => {
    it('should learn provider preference after 2 consistent deployments', () => {
      // Arrange
      memory.addTurn({
        userInput: 'deploy to vercel',
        intent: 'deploy',
        timestamp: new Date(Date.now() - 120000),
        entities: { provider: 'vercel' },
      });

      memory.addTurn({
        userInput: 'deploy api to vercel',
        intent: 'deploy',
        timestamp: new Date(),
        entities: { provider: 'vercel' },
      });

      // Act
      const preferred = memory.getPreferredProvider();

      // Assert
      expect(preferred).toBeDefined();
      expect(preferred.provider).toBe('vercel');
      expect(preferred.confidence).toBeGreaterThan(0.7); // High confidence after 2 uses
    });

    it('should increase confidence with more consistent usage', () => {
      // Arrange - 4 deployments to vercel
      for (let i = 0; i < 4; i++) {
        memory.addTurn({
          userInput: `deploy service-${i} to vercel`,
          intent: 'deploy',
          timestamp: new Date(Date.now() - (4 - i) * 60000),
          entities: { provider: 'vercel' },
        });
      }

      // Act
      const preferred = memory.getPreferredProvider();

      // Assert
      expect(preferred.provider).toBe('vercel');
      expect(preferred.confidence).toBeGreaterThan(0.9); // Very high confidence
    });

    it('should decrease confidence when user switches providers', () => {
      // Arrange - 3 to vercel, then 1 to netlify
      for (let i = 0; i < 3; i++) {
        memory.addTurn({
          userInput: `deploy to vercel`,
          intent: 'deploy',
          timestamp: new Date(Date.now() - (4 - i) * 60000),
          entities: { provider: 'vercel' },
        });
      }

      const beforeSwitch = memory.getPreferredProvider();
      const confidenceBeforeSwitch = beforeSwitch.confidence;

      memory.addTurn({
        userInput: 'deploy to netlify',
        intent: 'deploy',
        timestamp: new Date(),
        entities: { provider: 'netlify' },
      });

      // Act
      const afterSwitch = memory.getPreferredProvider();

      // Assert
      expect(afterSwitch.confidence).toBeLessThan(confidenceBeforeSwitch);
      // Provider might still be vercel but with lower confidence
      // OR it might switch to netlify depending on recency weight
    });

    it('should handle no clear preference gracefully', () => {
      // Arrange - equal usage of vercel and netlify
      memory.addTurn({
        userInput: 'deploy to vercel',
        intent: 'deploy',
        timestamp: new Date(Date.now() - 60000),
        entities: { provider: 'vercel' },
      });

      memory.addTurn({
        userInput: 'deploy to netlify',
        intent: 'deploy',
        timestamp: new Date(),
        entities: { provider: 'netlify' },
      });

      // Act
      const preferred = memory.getPreferredProvider();

      // Assert
      // Should either:
      // 1. Return most recent (netlify) with low-medium confidence (~0.5-0.6)
      // 2. Return null if confidence too low
      if (preferred) {
        expect(preferred.confidence).toBeLessThan(0.7); // Not confident
      }
    });

    it('should weight recent usage more heavily (recency bias)', () => {
      // Arrange - 3 old vercel, 2 recent netlify
      for (let i = 0; i < 3; i++) {
        memory.addTurn({
          userInput: 'deploy to vercel',
          intent: 'deploy',
          timestamp: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000), // 7-5 days ago
          entities: { provider: 'vercel' },
        });
      }

      for (let i = 0; i < 2; i++) {
        memory.addTurn({
          userInput: 'deploy to netlify',
          intent: 'deploy',
          timestamp: new Date(Date.now() - (2 - i) * 60 * 1000), // 2-1 minutes ago
          entities: { provider: 'netlify' },
        });
      }

      // Act
      const preferred = memory.getPreferredProvider();

      // Assert
      expect(preferred.provider).toBe('netlify'); // Recent wins over old
    });
  });

  describe('Environment Preference Learning', () => {
    it('should learn environment preference from deployment patterns', () => {
      // Arrange - consistently deploy to staging first
      for (let i = 0; i < 3; i++) {
        memory.addTurn({
          userInput: `deploy service-${i} to staging`,
          intent: 'deploy',
          timestamp: new Date(Date.now() - (3 - i) * 60000),
          entities: { env: 'staging' },
        });
      }

      // Act
      const preferredEnv = memory.getPreferredEnvironment();

      // Assert
      expect(preferredEnv).toBe('staging');
    });

    it('should not set environment preference with mixed usage', () => {
      // Arrange
      memory.addTurn({
        userInput: 'deploy to staging',
        intent: 'deploy',
        timestamp: new Date(Date.now() - 120000),
        entities: { env: 'staging' },
      });

      memory.addTurn({
        userInput: 'deploy to production',
        intent: 'deploy',
        timestamp: new Date(),
        entities: { env: 'production' },
      });

      // Act
      const preferredEnv = memory.getPreferredEnvironment();

      // Assert
      // Should return null or undefined (no clear preference)
      expect(preferredEnv).toBeUndefined();
    });
  });

  describe('Priority Preference Learning', () => {
    it('should infer priority from deployment timing patterns', () => {
      // Arrange - user consistently deploys during business hours (speed priority)
      const businessHours = [9, 10, 11, 14, 15, 16]; // 9am-5pm

      businessHours.forEach((hour, i) => {
        const timestamp = new Date();
        timestamp.setHours(hour);
        timestamp.setMinutes(0);
        timestamp.setSeconds(0);

        memory.addTurn({
          userInput: 'deploy to production',
          intent: 'deploy',
          timestamp,
          entities: { env: 'production' },
        });
      });

      // Act
      const priority = memory.getUserPriority();

      // Assert
      // Business hours deployment → likely values speed/reliability over cost
      expect(priority).toBe('speed'); // or 'reliability'
    });

    it('should infer cost priority from deployment patterns', () => {
      // Arrange - user deploys off-hours (cost priority)
      const offHours = [1, 2, 3, 23]; // Late night/early morning

      offHours.forEach((hour, i) => {
        const timestamp = new Date();
        timestamp.setHours(hour);

        memory.addTurn({
          userInput: 'deploy to production',
          intent: 'deploy',
          timestamp,
          entities: { env: 'production' },
        });
      });

      // Act
      const priority = memory.getUserPriority();

      // Assert
      // Off-hours deployment → likely cost-conscious
      expect(priority).toBe('cost');
    });

    it('should learn priority from explicit user statements', () => {
      // Arrange
      memory.addTurn({
        userInput: 'I need this deployed fast, cost is not an issue',
        intent: 'deploy',
        timestamp: new Date(),
        entities: {},
      });

      // Act
      const priority = memory.getUserPriority();

      // Assert
      expect(priority).toBe('speed');
    });
  });

  describe('Preference Persistence', () => {
    it('should persist preferences to disk', async () => {
      // Arrange
      for (let i = 0; i < 3; i++) {
        memory.addTurn({
          userInput: 'deploy to vercel',
          intent: 'deploy',
          timestamp: new Date(),
          entities: { provider: 'vercel' },
        });
      }

      // Act
      await memory.save(); // Should persist preferences

      // Create new memory instance (simulating restart)
      const newMemory = new ConversationMemory(logger);
      await newMemory.load();

      // Assert
      const preferred = newMemory.getPreferredProvider();
      expect(preferred).toBeDefined();
      expect(preferred.provider).toBe('vercel');
    });
  });

  describe('Preference Explanation', () => {
    it('should explain why a provider is preferred', () => {
      // Arrange
      for (let i = 0; i < 4; i++) {
        memory.addTurn({
          userInput: 'deploy to vercel',
          intent: 'deploy',
          timestamp: new Date(Date.now() - (4 - i) * 60000),
          entities: { provider: 'vercel' },
        });
      }

      // Act
      const explanation = memory.explainPreference('provider');

      // Assert
      expect(explanation).toBeDefined();
      expect(explanation).toContain('vercel');
      expect(explanation).toContain('4 times'); // Usage count
      expect(explanation.toLowerCase()).toContain('recently'); // Recency mention
    });

    it('should explain when no preference exists', () => {
      // Arrange - no history

      // Act
      const explanation = memory.explainPreference('provider');

      // Assert
      expect(explanation).toContain('no preference');
      // OR return null/undefined
    });
  });

  describe('Preference Decay', () => {
    it('should decay old preferences over time', () => {
      // Arrange - First, add recent usage to establish baseline
      for (let i = 0; i < 3; i++) {
        memory.addTurn({
          userInput: 'deploy to vercel',
          intent: 'deploy',
          timestamp: new Date(Date.now() - 1000 * 60), // 1 minute ago (recent)
          entities: { provider: 'vercel' },
        });
      }

      const recentPreference = memory.getPreferredProvider();
      const recentConfidence = recentPreference.confidence;

      // Create new memory instance with old data
      const logger = createMockLogger();
      const memoryWithOldData = new ConversationMemory(logger);

      // Add same usage pattern but 30 days ago
      for (let i = 0; i < 3; i++) {
        memoryWithOldData.addTurn({
          userInput: 'deploy to vercel',
          intent: 'deploy',
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          entities: { provider: 'vercel' },
        });
      }

      const oldPreference = memoryWithOldData.getPreferredProvider();

      // Assert - 30-day-old preference should have much lower confidence than recent
      expect(oldPreference).toBeDefined();
      expect(oldPreference.confidence).toBeLessThan(recentConfidence * 0.1); // At least 90% decay
      expect(oldPreference.confidence).toBeLessThan(0.1); // Should be very low for 30-day-old data
    });
  });

  describe('Multi-Dimensional Preferences', () => {
    it('should track preferences for different project types', () => {
      // Arrange
      memory.updateProjectContext({
        path: '/app/nextjs-app',
        framework: 'nextjs',
      });

      memory.addTurn({
        userInput: 'deploy to vercel',
        intent: 'deploy',
        timestamp: new Date(),
        entities: { provider: 'vercel' },
      });

      memory.updateProjectContext({
        path: '/app/static-site',
        framework: 'static',
      });

      memory.addTurn({
        userInput: 'deploy to netlify',
        intent: 'deploy',
        timestamp: new Date(),
        entities: { provider: 'netlify' },
      });

      // Act
      const nextjsPreference = memory.getPreferredProvider({ framework: 'nextjs' });
      const staticPreference = memory.getPreferredProvider({ framework: 'static' });

      // Assert
      expect(nextjsPreference?.provider).toBe('vercel');
      expect(staticPreference?.provider).toBe('netlify');
    });
  });
});
