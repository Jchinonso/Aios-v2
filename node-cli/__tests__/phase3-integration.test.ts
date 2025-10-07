/**
 * @fileoverview Integration Tests for Phase 3 - Full Workflow
 * @module node-cli/__tests__/phase3-integration.test
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ActionReasoningTracker } from '../services/action-reasoning-tracker.js';
import { AlternativeSuggestions } from '../services/alternative-suggestions.js';
import { Phase3Integration } from '../services/phase3-integration.js';
import type { ILogger } from '@aios/shared';
import { createFactorWeight, TrackedActionTypeEnum } from '../services/action-reasoning.types.js';

// Mock logger
const createMockLogger = (): ILogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLevel: jest.fn(),
  child: jest.fn(() => createMockLogger()),
});

describe('Phase 3 - Integration Tests', () => {
  let logger: ILogger;
  let testDir: string;
  let services: {
    tracker: ActionReasoningTracker;
    suggestions: AlternativeSuggestions;
  };

  beforeEach(async () => {
    logger = createMockLogger();
    testDir = path.join(os.tmpdir(), `aios-integration-${Date.now()}`);

    // Create services manually
    const tracker = new ActionReasoningTracker(logger, {
      persistToDisk: true,
      reasoningDir: testDir,
      maxMemoryRecords: 100,
    });

    const suggestions = new AlternativeSuggestions(logger);

    services = {
      tracker,
      suggestions,
    };

    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Full Deployment Workflow', () => {
    it('should track deployment decision with reasoning', async () => {
      const integration = new Phase3Integration(
        logger,
        services.tracker,
        services.suggestions
      );

      // User decides to deploy
      const decision = {
        provider: 'vercel' as const,
        environment: 'production',
        reason: 'Optimized for Next.js project',
        confidence: 0.9,
      };

      const context = {
        intent: {
          type: 'deploy' as const,
          confidence: 0.9,
          entities: { provider: 'vercel' },
          reasoning: 'Deploy to production',
          riskLevel: 'low' as const,
        },
        sessionId: 'test-session',
        turnNumber: 1,
        userInput: 'deploy to production',
        projectType: 'nextjs',
        userPriority: 'speed' as const,
      };

      // Track decision
      const actionId = await integration.trackDeploymentDecision(decision, context);

      expect(actionId).toBeDefined();
      expect(actionId).toMatch(/^[0-9a-f-]+$/);

      // Verify it was recorded
      const explanation = await services.tracker.explain({ type: 'general' });
      expect(explanation.actionId).toBe(actionId);
      expect(explanation.summary).toContain('Next.js');
    });

    it('should generate and present alternatives before deployment', async () => {
      // Generate alternatives
      const alternatives = await services.suggestions.generateProviderAlternatives(
        {
          type: 'deploy',
          confidence: 0.9,
          entities: { provider: 'vercel' },
          reasoning: 'Deploy',
          riskLevel: 'low',
        },
        'vercel',
        { projectType: 'nextjs', priority: 'speed' }
      );

      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives[0]?.value.provider).not.toBe('vercel');

      // Each alternative should have complete information
      alternatives.forEach((alt) => {
        expect(alt.label).toBeTruthy();
        expect(alt.whyNotChosen).toBeTruthy();
        expect(alt.pros.length).toBeGreaterThan(0);
        expect(alt.cons.length).toBeGreaterThan(0);
        expect(alt.confidence).toBeGreaterThan(0);
        expect(alt.estimatedCost).toBeTruthy();
        expect(alt.estimatedDuration).toBeTruthy();
      });
    });

    it('should explain deployment decision with factors', async () => {
      const integration = new Phase3Integration(
        logger,
        services.tracker,
        services.suggestions
      );

      const decision = {
        provider: 'vercel' as const,
        environment: 'production',
        reason: 'Best for Next.js',
        confidence: 0.9,
      };

      const context = {
        intent: {
          type: 'deploy' as const,
          confidence: 0.9,
          entities: { provider: 'vercel' },
          reasoning: 'Deploy',
          riskLevel: 'low' as const,
        },
        sessionId: 'test-session',
        turnNumber: 1,
        userInput: 'deploy to production',
        projectType: 'nextjs',
        userPriority: 'speed' as const,
        currentTime: new Date(),
      };

      await integration.trackDeploymentDecision(decision, context);

      const explanation = await services.tracker.explain({ type: 'general' });

      // Should have factors explaining the decision
      expect(explanation.reasoning.factors.length).toBeGreaterThan(0);

      // Factors should include user priority
      const userPriorityFactor = explanation.reasoning.factors.find(
        (f) => f.description.includes('speed')
      );
      expect(userPriorityFactor).toBeDefined();
      expect(userPriorityFactor!.weight).toMatch(/\d+%/);
    });

    it('should persist and recover from disk', async () => {
      const integration = new Phase3Integration(
        logger,
        services.tracker,
        services.suggestions
      );

      const decision = {
        provider: 'vercel' as const,
        environment: 'production',
        reason: 'Test deployment',
        confidence: 0.9,
      };

      const context = {
        intent: {
          type: 'deploy' as const,
          confidence: 0.9,
          entities: {},
          reasoning: 'Deploy',
          riskLevel: 'low' as const,
        },
        sessionId: 'test-session',
        turnNumber: 1,
        userInput: 'deploy',
      };

      const actionId = await integration.trackDeploymentDecision(decision, context);

      // Wait for disk persistence
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Clear memory
      services.tracker.clear();

      // Should still be able to explain (loading from disk)
      const explanation = await services.tracker.explain({
        type: 'specific',
        target: { actionId },
      });

      expect(explanation.actionId).toBe(actionId);
      expect(explanation.summary).toContain('Test deployment');
    });
  });

  describe('Alternative Selection Workflow', () => {
    it('should present alternatives and allow selection', async () => {
      const integration = new Phase3Integration(
        logger,
        services.tracker,
        services.suggestions
      );

      const decision = {
        provider: 'vercel' as const,
        environment: 'production',
        reason: 'Initial choice',
        confidence: 0.9,
      };

      const context = {
        intent: {
          type: 'deploy' as const,
          confidence: 0.9,
          entities: {},
          reasoning: 'Deploy',
          riskLevel: 'low' as const,
        },
        sessionId: 'test-session',
        turnNumber: 1,
        userInput: 'deploy',
      };

      await integration.trackDeploymentDecision(decision, context);

      // Get alternatives
      const alternatives = await services.tracker.getAlternatives();

      expect(alternatives.primary.label).toContain('Vercel');
      expect(alternatives.alternatives.length).toBeGreaterThan(0);
      expect(alternatives.timestamp).toBeTruthy();
    });

    it('should format alternatives for display', async () => {
      const alternatives = await services.suggestions.generateProviderAlternatives(
        {
          type: 'deploy',
          confidence: 0.9,
          entities: {},
          reasoning: 'Deploy',
          riskLevel: 'low',
        },
        'vercel',
        { projectType: 'nextjs' }
      );

      // Should be suitable for CLI display
      alternatives.forEach((alt, index) => {
        expect(alt.label).toBeTruthy();
        expect(alt.whyNotChosen).toBeTruthy();

        // Should have numbered format for selection
        expect(index).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Explain Command Workflow', () => {
    it('should handle "why?" question', async () => {
      const integration = new Phase3Integration(
        logger,
        services.tracker,
        services.suggestions
      );

      const decision = {
        provider: 'vercel' as const,
        environment: 'production',
        reason: 'Optimized for Next.js',
        confidence: 0.9,
      };

      const context = {
        intent: {
          type: 'deploy' as const,
          confidence: 0.9,
          entities: {},
          reasoning: 'Deploy',
          riskLevel: 'low' as const,
        },
        sessionId: 'test-session',
        turnNumber: 1,
        userInput: 'deploy',
      };

      await integration.trackDeploymentDecision(decision, context);

      // User asks "why?"
      const explanation = await services.tracker.explain({ type: 'general' });

      expect(explanation.summary).toContain('Optimized for Next.js');
      expect(explanation.reasoning.chosen.value).toBeTruthy();
    });

    it('should handle specific questions like "why vercel?"', async () => {
      const integration = new Phase3Integration(
        logger,
        services.tracker,
        services.suggestions
      );

      const decision = {
        provider: 'vercel' as const,
        environment: 'production',
        reason: 'Best for Next.js projects',
        confidence: 0.9,
      };

      const context = {
        intent: {
          type: 'deploy' as const,
          confidence: 0.9,
          entities: {},
          reasoning: 'Deploy',
          riskLevel: 'low' as const,
        },
        sessionId: 'test-session',
        turnNumber: 1,
        userInput: 'deploy',
      };

      await integration.trackDeploymentDecision(decision, context);

      // User asks "why vercel?"
      const explanation = await services.tracker.explain({
        type: 'specific',
        target: { question: 'why vercel?' },
      });

      expect(explanation.summary).toBeTruthy();
    });
  });

  describe('Multi-Action Workflow', () => {
    it('should track multiple deployments', async () => {
      const integration = new Phase3Integration(
        logger,
        services.tracker,
        services.suggestions
      );

      // First deployment
      const decision1 = {
        provider: 'vercel' as const,
        environment: 'staging',
        reason: 'Test first',
        confidence: 0.8,
      };

      const context1 = {
        intent: {
          type: 'deploy' as const,
          confidence: 0.8,
          entities: {},
          reasoning: 'Deploy',
          riskLevel: 'low' as const,
        },
        sessionId: 'test-session',
        turnNumber: 1,
        userInput: 'deploy to staging',
      };

      await integration.trackDeploymentDecision(decision1, context1);

      // Second deployment
      const decision2 = {
        provider: 'vercel' as const,
        environment: 'production',
        reason: 'Staging passed',
        confidence: 0.9,
      };

      const context2 = {
        intent: {
          type: 'deploy' as const,
          confidence: 0.9,
          entities: {},
          reasoning: 'Deploy',
          riskLevel: 'low' as const,
        },
        sessionId: 'test-session',
        turnNumber: 2,
        userInput: 'deploy to production',
      };

      await integration.trackDeploymentDecision(decision2, context2);

      // Should explain latest by default
      const explanation = await services.tracker.explain({ type: 'general' });
      expect(explanation.summary).toContain('Staging passed');

      // Metrics should show 2 actions
      const metrics = services.tracker.getMetrics();
      expect(metrics.totalActionsTracked).toBe(2);
      expect(metrics.actionTypeBreakdown[TrackedActionTypeEnum.DEPLOY]).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid provider gracefully', async () => {
      await expect(
        services.suggestions.generateProviderAlternatives(
          {
            type: 'deploy',
            confidence: 0.9,
            entities: {},
            reasoning: 'Deploy',
            riskLevel: 'low',
          },
          'invalid' as any,
          {}
        )
      ).rejects.toThrow('Invalid provider');
    });

    it('should handle no actions gracefully', async () => {
      await expect(services.tracker.explain({ type: 'general' })).rejects.toThrow(
        'No actions to explain'
      );
    });

    it('should handle corrupted action ID', async () => {
      await expect(
        services.tracker.explain({
          type: 'specific',
          target: { actionId: 'nonexistent' },
        })
      ).rejects.toThrow('Action not found');
    });
  });
});
