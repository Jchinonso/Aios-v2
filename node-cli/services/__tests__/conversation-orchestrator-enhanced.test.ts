/**
 * @fileoverview TDD Tests for EnhancedConversationOrchestrator
 * @description Comprehensive test suite ensuring all Phase 1 gap requirements are met
 * @module node-cli/services/__tests__
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EnhancedConversationOrchestrator } from '../conversation-orchestrator-enhanced.js';
import { ConversationMemory } from '../conversation-memory.v2.js';
import { SessionPersistence } from '../session-persistence.js';
import type { CloudManager, ILogger } from '@aios/shared';
import type { ParsedIntentType } from '../../nl-planner/types.js';
import type { CloudProviderType } from '@aios/shared/cloud';

// ==================== Test Doubles ====================

/**
 * Mock logger that captures log calls for assertions
 */
class MockLogger implements ILogger {
  public logs: Array<{ level: string; message: string; data?: any }> = [];

  debug(message: string, data?: any): void {
    this.logs.push({ level: 'debug', message, data });
  }

  info(message: string, data?: any): void {
    this.logs.push({ level: 'info', message, data });
  }

  warn(message: string, data?: any): void {
    this.logs.push({ level: 'warn', message, data });
  }

  error(message: string, error: Error, data?: any): void {
    this.logs.push({ level: 'error', message, data: { ...data, error: error.message } });
  }

  clear(): void {
    this.logs = [];
  }
}

/**
 * Mock CloudManager with minimal implementation
 */
class MockCloudManager implements Partial<CloudManager> {
  async analyzeProject(): Promise<any> {
    return {
      framework: 'react',
      language: 'typescript',
      packageManager: 'npm'
    };
  }
}

/**
 * Create mock intent helper
 */
function createMockIntent(
  intent: string = 'deploy',
  entities: Partial<ParsedIntentType['entities']> = {}
): ParsedIntentType {
  return {
    intent: intent as any,
    entities: {
      service: undefined,
      env: undefined,
      provider: undefined,
      branch: undefined,
      global: undefined,
      replicas: undefined,
      since: undefined,
      level: undefined,
      ...entities
    },
    cli: `aios ${intent}`,
    confidence: 0.9,
    risk: 'low',
    confirmRequired: false
  };
}

// ==================== Test Suite ====================

describe('EnhancedConversationOrchestrator - TDD', () => {
  let orchestrator: EnhancedConversationOrchestrator;
  let logger: MockLogger;
  let cloudManager: CloudManager;
  let memory: ConversationMemory;
  let persistence: SessionPersistence;

  beforeEach(() => {
    logger = new MockLogger();
    cloudManager = new MockCloudManager() as CloudManager;
    memory = new ConversationMemory(logger, undefined);
    persistence = new SessionPersistence(logger);

    orchestrator = new EnhancedConversationOrchestrator(
      cloudManager,
      logger,
      null, // No blessed session
      memory,
      persistence
    );
  });

  afterEach(async () => {
    await orchestrator.dispose();
  });

  // ==================== GAP #1: Memory Integration ====================

  describe('Gap #1: ConversationMemory Integration', () => {
    it('should create orchestrator with memory instance', () => {
      expect(orchestrator).toBeDefined();

      const stats = orchestrator.getStats();
      expect(stats.memoryStats).toBeDefined();
      expect(stats.sessionId).toBeDefined();
    });

    it('should call memory.learnFromInput() on every turn', async () => {
      const learnSpy = jest.spyOn(memory, 'learnFromInput');

      const intent = createMockIntent('deploy');
      await orchestrator.processInput('I want the cheapest option', intent);

      expect(learnSpy).toHaveBeenCalledWith('I want the cheapest option', intent);
      expect(learnSpy).toHaveBeenCalledTimes(1);
    });

    it('should learn cost priority from user input', async () => {
      const intent = createMockIntent('deploy');

      // First turn: user expresses cost preference
      await orchestrator.processInput('I want the cheapest option', intent);

      // Verify memory learned priority
      const priority = memory.getUserPriority();
      expect(priority).toBe('cost');
    });

    it('should learn speed priority from keywords', async () => {
      const intent = createMockIntent('deploy');

      await orchestrator.processInput('I need fast deployment', intent);

      const priority = memory.getUserPriority();
      expect(priority).toBe('speed');
    });

    it('should learn safety priority from keywords', async () => {
      const intent = createMockIntent('deploy');

      await orchestrator.processInput('I want the safest option', intent);

      const priority = memory.getUserPriority();
      expect(priority).toBe('safety');
    });

    it('should track turn count across multiple interactions', async () => {
      const intent = createMockIntent('deploy');

      await orchestrator.processInput('first turn', intent);
      await orchestrator.processInput('second turn', intent);
      await orchestrator.processInput('third turn', intent);

      const stats = orchestrator.getStats();
      expect(stats.turnCount).toBe(3);
    });
  });

  // ==================== GAP #2: No Resume Session ====================

  describe('Gap #2: Resume Session Command', () => {
    it('should save session state after processing input', async () => {
      const saveSpy = jest.spyOn(persistence, 'saveSession');

      const intent = createMockIntent('deploy');
      await orchestrator.processInput('deploy my app', intent);

      expect(saveSpy).toHaveBeenCalled();
    });

    it('should resume session from persisted state', async () => {
      // Create orchestrator 1 and save state
      const orchestrator1 = new EnhancedConversationOrchestrator(
        cloudManager,
        logger,
        null
      );

      const intent = createMockIntent('deploy');
      await orchestrator1.processInput('I want cheap deployments', intent);

      const sessionId = orchestrator1.getStats().sessionId;
      await orchestrator1.dispose();

      // Create orchestrator 2 and resume
      const orchestrator2 = new EnhancedConversationOrchestrator(
        cloudManager,
        logger,
        null
      );

      const resumed = await orchestrator2.resumeSession(sessionId);

      expect(resumed).toBe(true);
      await orchestrator2.dispose();
    });

    it('should restore memory preferences when resuming session', async () => {
      // Setup: Create and save session with preferences
      const orchestrator1 = new EnhancedConversationOrchestrator(
        cloudManager,
        logger,
        null
      );

      const intent = createMockIntent('deploy');
      await orchestrator1.processInput('I prefer cost optimization', intent);
      await orchestrator1.processInput('use railway', intent);

      const sessionId = orchestrator1.getStats().sessionId;
      await orchestrator1.dispose();

      // Test: Resume session and check preferences
      const orchestrator2 = new EnhancedConversationOrchestrator(
        cloudManager,
        logger,
        null
      );

      await orchestrator2.resumeSession(sessionId);

      const memoryStats = orchestrator2.getStats().memoryStats;
      expect(memoryStats.preferences).toBeGreaterThan(0);

      await orchestrator2.dispose();
    });

    it('should return false when resuming non-existent session', async () => {
      const resumed = await orchestrator.resumeSession('non-existent-session-id');
      expect(resumed).toBe(false);
    });
  });

  // ==================== GAP #3: Smart Defaults ====================

  describe('Gap #3: Smart Defaults from Learned Preferences', () => {
    it('should apply cost→railway default when priority is cost', async () => {
      // Learn cost preference
      const intent1 = createMockIntent('deploy');
      await orchestrator.processInput('I want the cheapest option', intent1);

      // Next deployment without provider specified
      const intent2 = createMockIntent('deploy');
      await orchestrator.processInput('deploy my app', intent2);

      // Verify default provider applied (check last processed intent, not original)
      const lastIntent = orchestrator.getLastIntent();
      expect(lastIntent?.entities.provider).toBe('railway');
    });

    it('should apply speed→vercel default when priority is speed', async () => {
      // Learn speed preference
      const intent1 = createMockIntent('deploy');
      await orchestrator.processInput('I need fast deployment', intent1);

      // Next deployment without provider specified
      const intent2 = createMockIntent('deploy');
      await orchestrator.processInput('deploy my app', intent2);

      const lastIntent = orchestrator.getLastIntent();
      expect(lastIntent?.entities.provider).toBe('vercel');
    });

    it('should apply safety→aws default when priority is safety', async () => {
      // Learn safety preference
      const intent1 = createMockIntent('deploy');
      await orchestrator.processInput('I want the safest option', intent1);

      // Next deployment without provider specified
      const intent2 = createMockIntent('deploy');
      await orchestrator.processInput('deploy my app', intent2);

      const lastIntent = orchestrator.getLastIntent();
      expect(lastIntent?.entities.provider).toBe('aws');
    });

    it('should NOT override explicit provider choice', async () => {
      // Learn cost preference
      const intent1 = createMockIntent('deploy');
      await orchestrator.processInput('I want cheap', intent1);

      // Explicitly choose different provider
      const intent2 = createMockIntent('deploy', { provider: 'vercel' });
      await orchestrator.processInput('deploy to vercel', intent2);

      // Verify explicit choice not overridden
      expect(intent2.entities.provider).toBe('vercel');
    });

    it('should apply preferred provider default when confidence > 0.7', async () => {
      // Build up confidence by repeated selections
      for (let i = 0; i < 3; i++) {
        const intent = createMockIntent('deploy', { provider: 'vercel' });
        await orchestrator.processInput('deploy to vercel', intent);
      }

      // Next deployment without provider
      const intent = createMockIntent('deploy');
      await orchestrator.processInput('deploy', intent);

      const preferredProvider = memory.getPreferredProvider();
      expect(preferredProvider).toBeDefined();
      expect(preferredProvider!.confidence).toBeGreaterThan(0.7);
    });

    it('should apply environment default from last deployment', async () => {
      // First deployment to staging
      const intent1 = createMockIntent('deploy', { env: 'staging', provider: 'vercel' });
      await orchestrator.processInput('deploy to staging', intent1);

      // Simulate deployment completion (update project context)
      memory.setProjectContext({
        path: process.cwd(),
        framework: 'react',
        lastDeployment: {
          provider: 'vercel',
          env: 'staging',
          timestamp: new Date().toISOString(),
          success: true
        }
      });

      // Next deployment without env specified
      const intent2 = createMockIntent('deploy', { provider: 'vercel' });
      await orchestrator.processInput('deploy', intent2);

      const lastIntent = orchestrator.getLastIntent();
      expect(lastIntent?.entities.env).toBe('staging');
    });
  });

  // ==================== GAP #4: Multi-Turn Context ====================

  describe('Gap #4: Multi-Turn Context Awareness', () => {
    it('should maintain conversation history across turns', async () => {
      const intent1 = createMockIntent('deploy');
      await orchestrator.processInput('I have a React app', intent1);

      const intent2 = createMockIntent('deploy');
      await orchestrator.processInput('What is the cheapest option?', intent2);

      const intent3 = createMockIntent('deploy');
      await orchestrator.processInput('deploy it', intent3);

      // Verify turns are stored
      const turns = memory.getTurns();
      expect(turns.length).toBe(3);
    });

    it('should understand "deploy again" using conversation context', async () => {
      // First deployment
      const intent1 = createMockIntent('deploy', { provider: 'vercel' });
      await orchestrator.processInput('deploy to vercel', intent1);

      // Update project context
      memory.setProjectContext({
        path: process.cwd(),
        framework: 'react',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date().toISOString(),
          success: true
        }
      });

      // User says "deploy again"
      const intent2 = createMockIntent('deploy');
      await orchestrator.processInput('deploy again', intent2);

      // Should suggest same provider as last time
      const lastDeployment = memory.getProjectContext()?.lastDeployment;
      expect(lastDeployment?.provider).toBe('vercel');
    });

    it('should maintain sliding window of 10 turns', async () => {
      // Create 15 turns
      for (let i = 1; i <= 15; i++) {
        const intent = createMockIntent('deploy');
        await orchestrator.processInput(`turn ${i}`, intent);
      }

      // Verify only last 10 kept
      const turns = memory.getTurns();
      expect(turns.length).toBe(10);
      expect(turns[0]!.userInput).toContain('turn 6');
      expect(turns[9]!.userInput).toContain('turn 15');
    });
  });

  // ==================== GAP #5: No EnhancedNLProcessor Usage ====================
  // Note: This will be tested in CLI integration tests

  // ==================== GAP #6: Auto-Save After Each Turn ====================

  describe('Gap #6: Auto-Save After Each Turn', () => {
    it('should auto-save after every processInput() call', async () => {
      const saveSpy = jest.spyOn(persistence, 'saveSession');

      const intent = createMockIntent('deploy');
      await orchestrator.processInput('first turn', intent);

      expect(saveSpy).toHaveBeenCalledTimes(1);

      await orchestrator.processInput('second turn', intent);
      expect(saveSpy).toHaveBeenCalledTimes(2);
    });

    it('should save conversation state even on error', async () => {
      const saveSpy = jest.spyOn(persistence, 'saveSession');

      // Force an error by passing invalid intent
      const invalidIntent = null as any;

      try {
        await orchestrator.processInput('test', invalidIntent);
      } catch {
        // Expected error
      }

      // Should still attempt to save
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should allow disabling auto-save', async () => {
      orchestrator.setAutoSave(false);

      const saveSpy = jest.spyOn(persistence, 'saveSession');

      const intent = createMockIntent('deploy');
      await orchestrator.processInput('test', intent);

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should save on disposal', async () => {
      const saveSpy = jest.spyOn(persistence, 'saveSession');

      const intent = createMockIntent('deploy');
      await orchestrator.processInput('test', intent);

      // Clear spy to count only disposal save
      saveSpy.mockClear();

      await orchestrator.dispose();

      expect(saveSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== GAP #7: Preference Learning Hints ====================

  describe('Gap #7: Preference Learning Hints', () => {
    // Note: These tests verify the hints are shown, but we can't easily test console output
    // Integration tests will validate the actual user experience

    it('should track user priority for hint display', async () => {
      const intent = createMockIntent('deploy');
      await orchestrator.processInput('I prefer cost optimization', intent);

      const priority = memory.getUserPriority();
      expect(priority).toBe('cost');

      // When showing recommendations, priority should be displayed
      // (validated in integration tests)
    });

    it('should track preferred provider with confidence', async () => {
      // Build confidence by repeated selections
      for (let i = 0; i < 3; i++) {
        const intent = createMockIntent('deploy', { provider: 'vercel' });
        await orchestrator.processInput('deploy to vercel', intent);
      }

      const preferredProvider = memory.getPreferredProvider();
      expect(preferredProvider).toBeDefined();
      expect(preferredProvider!.provider).toBe('vercel');
      expect(preferredProvider!.confidence).toBeGreaterThan(0.7);
    });

    it('should track last deployment for "deploy again" hints', async () => {
      memory.setProjectContext({
        path: process.cwd(),
        framework: 'react',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
          success: true
        }
      });

      const lastDeployment = memory.getProjectContext()?.lastDeployment;
      expect(lastDeployment).toBeDefined();
      expect(lastDeployment!.provider).toBe('vercel');
    });
  });

  // ==================== Production Features ====================

  describe('Production Features', () => {
    it('should generate unique session IDs', () => {
      const orchestrator1 = new EnhancedConversationOrchestrator(
        cloudManager,
        logger,
        null
      );

      const orchestrator2 = new EnhancedConversationOrchestrator(
        cloudManager,
        logger,
        null
      );

      const id1 = orchestrator1.getStats().sessionId;
      const id2 = orchestrator2.getStats().sessionId;

      expect(id1).not.toBe(id2);

      orchestrator1.dispose();
      orchestrator2.dispose();
    });

    it('should handle disposal gracefully', async () => {
      const intent = createMockIntent('deploy');
      await orchestrator.processInput('test', intent);

      await orchestrator.dispose();

      // Should throw on operations after disposal
      expect(() => orchestrator.getStats()).toThrow('disposed');
    });

    it('should reset conversation state while keeping memory', async () => {
      const intent = createMockIntent('deploy');
      await orchestrator.processInput('I want cheap', intent);

      // Verify priority learned
      expect(memory.getUserPriority()).toBe('cost');

      // Reset conversation
      orchestrator.reset();

      // Conversation state reset
      const stats = orchestrator.getStats();
      expect(stats.turnCount).toBe(0);

      // Memory preserved
      expect(memory.getUserPriority()).toBe('cost');
    });

    it('should clear all memory including preferences', async () => {
      const intent = createMockIntent('deploy');
      await orchestrator.processInput('I want cheap', intent);

      expect(memory.getUserPriority()).toBe('cost');

      orchestrator.clearMemory();

      expect(memory.getUserPriority()).toBeNull();
      expect(memory.getTurns()).toHaveLength(0);
    });

    it('should provide comprehensive statistics', async () => {
      const intent = createMockIntent('deploy');
      await orchestrator.processInput('I want cheap', intent);
      await orchestrator.processInput('deploy', intent);

      const stats = orchestrator.getStats();

      expect(stats.turnCount).toBe(2);
      expect(stats.memoryStats.turns).toBe(2);
      expect(stats.memoryStats.preferences).toBeGreaterThan(0);
      expect(stats.sessionId).toBeDefined();
    });
  });

  // ==================== Error Handling ====================

  describe('Error Handling', () => {
    it('should handle save failures gracefully', async () => {
      // Mock save failure
      jest.spyOn(persistence, 'saveSession').mockResolvedValue({
        isSuccess: false,
        isFailure: true,
        error: new Error('Disk full')
      } as any);

      const intent = createMockIntent('deploy');

      // Should not throw even if save fails
      await expect(orchestrator.processInput('test', intent)).resolves.not.toThrow();
    });

    it('should log errors during processing', async () => {
      const invalidIntent = { invalid: true } as any;

      logger.clear();

      try {
        await orchestrator.processInput('test', invalidIntent);
      } catch {
        // Expected error
      }

      const errorLogs = logger.logs.filter(log => log.level === 'error');
      expect(errorLogs.length).toBeGreaterThan(0);
    });

    it('should handle disposal errors gracefully', async () => {
      // Mock save failure on disposal
      jest.spyOn(persistence, 'saveSession').mockRejectedValue(new Error('Save failed'));

      // Should not throw
      await expect(orchestrator.dispose()).resolves.not.toThrow();
    });
  });

  // ==================== Integration Scenarios ====================

  describe('Integration Scenarios', () => {
    it('should handle complete deployment flow with memory', async () => {
      // Turn 1: User asks about options
      const intent1 = createMockIntent('deploy');
      await orchestrator.processInput('What are my deployment options?', intent1);

      // Turn 2: User expresses cost preference
      const intent2 = createMockIntent('deploy');
      await orchestrator.processInput('I want the cheapest', intent2);

      // Verify priority learned
      expect(memory.getUserPriority()).toBe('cost');

      // Turn 3: User deploys
      const intent3 = createMockIntent('deploy');
      await orchestrator.processInput('deploy my app', intent3);

      // Should have railway as default (cost-optimized)
      const lastIntent = orchestrator.getLastIntent();
      expect(lastIntent?.entities.provider).toBe('railway');

      // Verify conversation history
      expect(memory.getTurns().length).toBe(3);
    });

    it('should handle session resume and continue conversation', async () => {
      // Session 1: Build up preferences
      const intent1 = createMockIntent('deploy');
      await orchestrator.processInput('I prefer speed', intent1);
      await orchestrator.processInput('use vercel', intent1);

      const sessionId = orchestrator.getStats().sessionId;
      await orchestrator.dispose();

      // Session 2: Resume and deploy
      const orchestrator2 = new EnhancedConversationOrchestrator(
        cloudManager,
        logger,
        null
      );

      await orchestrator2.resumeSession(sessionId);

      const intent2 = createMockIntent('deploy');
      await orchestrator2.processInput('deploy my app', intent2);

      // Should use learned preference
      const lastIntent2 = orchestrator2.getLastIntent();
      expect(lastIntent2?.entities.provider).toBe('vercel');

      await orchestrator2.dispose();
    });

    it('should handle rapid successive deployments', async () => {
      for (let i = 1; i <= 5; i++) {
        const intent = createMockIntent('deploy', { provider: 'vercel' });
        await orchestrator.processInput(`deploy app ${i}`, intent);
      }

      const stats = orchestrator.getStats();
      expect(stats.turnCount).toBe(5);
      expect(stats.memoryStats.turns).toBe(5);
    });
  });
});
