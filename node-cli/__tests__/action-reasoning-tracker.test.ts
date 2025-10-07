/**
 * @fileoverview Tests for ActionReasoningTracker
 * @module node-cli/__tests__/action-reasoning-tracker.test
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ActionReasoningTracker } from '../services/action-reasoning-tracker.js';
import { createFactorWeight, createConfidenceScore, TrackedActionTypeEnum } from '../services/action-reasoning.types.js';
import type { ActionRecord, ExplainRequest } from '../services/action-reasoning.types.js';
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

// Test data factory
const createTestRecord = (overrides?: Partial<Omit<ActionRecord, 'id'>>): Omit<ActionRecord, 'id'> => ({
  metadata: {
    timestamp: new Date().toISOString(),
    sessionId: 'test-session',
    turnNumber: 1,
    userInput: 'deploy to vercel',
    intent: 'deploy',
  },
  reasoning: {
    actionType: TrackedActionTypeEnum.DEPLOY,
    chosen: {
      provider: 'vercel',
      environment: 'production',
      reason: 'Best for Next.js',
    },
    alternatives: [],
    factors: [
      {
        type: 'positive',
        description: 'Optimized for Next.js',
        weight: createFactorWeight(0.8),
        source: 'project-analysis',
      },
    ],
    risks: [],
    confidence: 'high',
  },
  risks: [],
  ...overrides,
});

describe('ActionReasoningTracker', () => {
  let tracker: ActionReasoningTracker;
  let logger: ILogger;
  let testDir: string;

  beforeEach(async () => {
    logger = createMockLogger();
    testDir = path.join(os.tmpdir(), `aios-test-${Date.now()}`);

    tracker = new ActionReasoningTracker(logger, {
      persistToDisk: true,
      reasoningDir: testDir,
      maxMemoryRecords: 5, // Small for testing LRU
    });

    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('recordAction', () => {
    it('should record valid action', async () => {
      const record = createTestRecord();
      const actionId = await tracker.recordAction(record);

      expect(actionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(logger.info).toHaveBeenCalledWith(
        'Action recorded',
        expect.objectContaining({
          actionId,
          actionType: TrackedActionTypeEnum.DEPLOY,
        })
      );
    });

    it('should reject empty sessionId', async () => {
      const record = createTestRecord({
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId: '',
          turnNumber: 1,
          userInput: 'test',
          intent: 'deploy',
        },
      });

      await expect(tracker.recordAction(record)).rejects.toThrow(
        'Invalid metadata: sessionId is required and cannot be empty'
      );
    });

    it('should reject whitespace-only sessionId', async () => {
      const record = createTestRecord({
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId: '   ',
          turnNumber: 1,
          userInput: 'test',
          intent: 'deploy',
        },
      });

      await expect(tracker.recordAction(record)).rejects.toThrow(
        'Invalid metadata: sessionId is required and cannot be empty'
      );
    });

    it('should reject negative turnNumber', async () => {
      const record = createTestRecord({
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId: 'test',
          turnNumber: -1,
          userInput: 'test',
          intent: 'deploy',
        },
      });

      await expect(tracker.recordAction(record)).rejects.toThrow(
        'Invalid metadata: turnNumber must be >= 0'
      );
    });

    it('should reject empty userInput', async () => {
      const record = createTestRecord({
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId: 'test',
          turnNumber: 1,
          userInput: '',
          intent: 'deploy',
        },
      });

      await expect(tracker.recordAction(record)).rejects.toThrow(
        'Invalid metadata: userInput is required and cannot be empty'
      );
    });

    it('should reject invalid timestamp', async () => {
      const record = createTestRecord({
        metadata: {
          timestamp: 'invalid-timestamp',
          sessionId: 'test',
          turnNumber: 1,
          userInput: 'test',
          intent: 'deploy',
        },
      });

      await expect(tracker.recordAction(record)).rejects.toThrow(
        'Invalid metadata: timestamp must be valid ISO 8601'
      );
    });

    it('should reject missing chosen.reason', async () => {
      const record = createTestRecord({
        reasoning: {
          actionType: TrackedActionTypeEnum.DEPLOY,
          chosen: {
            provider: 'vercel',
            environment: 'production',
            reason: '',
          } as any,
          alternatives: [],
          factors: [],
          risks: [],
          confidence: 'high',
        },
      });

      await expect(tracker.recordAction(record)).rejects.toThrow(
        'Invalid reasoning: chosen.reason is required'
      );
    });

    it('should reject non-array alternatives', async () => {
      const record = createTestRecord({
        reasoning: {
          actionType: TrackedActionTypeEnum.DEPLOY,
          chosen: {
            provider: 'vercel',
            environment: 'production',
            reason: 'test',
          },
          alternatives: 'not-an-array' as any,
          factors: [],
          risks: [],
          confidence: 'high',
        },
      });

      await expect(tracker.recordAction(record)).rejects.toThrow(
        'Invalid reasoning.alternatives: must be an array'
      );
    });

    it('should reject non-array factors', async () => {
      const record = createTestRecord({
        reasoning: {
          actionType: TrackedActionTypeEnum.DEPLOY,
          chosen: {
            provider: 'vercel',
            environment: 'production',
            reason: 'test',
          },
          alternatives: [],
          factors: 'not-an-array' as any,
          risks: [],
          confidence: 'high',
        },
      });

      await expect(tracker.recordAction(record)).rejects.toThrow(
        'Invalid reasoning.factors: must be an array'
      );
    });

    it('should reject non-array risks', async () => {
      const record = createTestRecord({
        risks: 'not-an-array' as any,
      });

      await expect(tracker.recordAction(record)).rejects.toThrow(
        'Invalid risks: must be an array'
      );
    });

    it('should persist to disk when enabled', async () => {
      const record = createTestRecord();
      const actionId = await tracker.recordAction(record);

      // Wait a bit for async persistence
      await new Promise((resolve) => setTimeout(resolve, 100));

      const files = await fs.readdir(testDir);
      expect(files).toContain(`${actionId}.json`);
    });
  });

  describe('explain', () => {
    it('should explain last action', async () => {
      const record = createTestRecord();
      const actionId = await tracker.recordAction(record);

      const explanation = await tracker.explain({
        type: 'general',
      });

      expect(explanation.actionId).toBe(actionId);
      expect(explanation.summary).toContain('Best for Next.js');
      expect(explanation.reasoning.chosen.value).toBe('Vercel (production)');
    });

    it('should explain specific action by ID', async () => {
      const record1 = createTestRecord();
      const record2 = createTestRecord({ metadata: { ...createTestRecord().metadata, turnNumber: 2 } });

      const id1 = await tracker.recordAction(record1);
      await tracker.recordAction(record2);

      const explanation = await tracker.explain({
        type: 'specific',
        target: { actionId: id1 },
      });

      expect(explanation.actionId).toBe(id1);
    });

    it('should throw if no actions', async () => {
      await expect(
        tracker.explain({ type: 'general' })
      ).rejects.toThrow('No actions to explain (deploy something first)');
    });

    it('should throw if action not found', async () => {
      await expect(
        tracker.explain({ type: 'specific', target: { actionId: 'nonexistent' } })
      ).rejects.toThrow('Action not found: "nonexistent"');
    });

    it('should load from disk if not in memory', async () => {
      const record = createTestRecord();
      const actionId = await tracker.recordAction(record);

      // Wait for persistence
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear memory
      tracker.clear();

      // Should load from disk
      const explanation = await tracker.explain({
        type: 'specific',
        target: { actionId },
      });

      expect(explanation.actionId).toBe(actionId);
    });

    it('should format factors as percentages', async () => {
      const record = createTestRecord({
        reasoning: {
          actionType: TrackedActionTypeEnum.DEPLOY,
          chosen: {
            provider: 'vercel',
            environment: 'production',
            reason: 'test',
          },
          alternatives: [],
          factors: [
            {
              type: 'positive',
              description: 'Test factor',
              weight: createFactorWeight(0.75),
              source: 'project-analysis',
            },
          ],
          risks: [],
          confidence: 'high',
        },
      });

      const actionId = await tracker.recordAction(record);
      const explanation = await tracker.explain({
        type: 'specific',
        target: { actionId },
      });

      expect(explanation.reasoning.factors[0]?.weight).toBe('75%');
    });

    it('should include risks if present', async () => {
      const record = createTestRecord({
        risks: [
          {
            level: 'moderate',
            description: 'Test risk',
            impact: 'medium',
            probability: 'possible',
          },
        ],
      });

      const actionId = await tracker.recordAction(record);
      const explanation = await tracker.explain({
        type: 'specific',
        target: { actionId },
      });

      expect(explanation.risks).toBeDefined();
      expect(explanation.risks).toHaveLength(1);
      expect(explanation.risks?.[0]?.description).toBe('Test risk');
    });
  });

  describe('getAlternatives', () => {
    it('should get alternatives for last action', async () => {
      const record = createTestRecord({
        reasoning: {
          actionType: TrackedActionTypeEnum.DEPLOY,
          chosen: {
            provider: 'vercel',
            environment: 'production',
            reason: 'Best for Next.js',
          },
          alternatives: [
            {
              value: { provider: 'netlify', environment: 'production' },
              label: 'Netlify',
              whyNotChosen: 'Slower builds',
              pros: ['Good for static sites'],
              cons: ['Slower Next.js builds'],
              confidence: createConfidenceScore(0.7),
            },
          ],
          factors: [],
          risks: [],
          confidence: 'high',
        },
      });

      const actionId = await tracker.recordAction(record);
      const alternatives = await tracker.getAlternatives();

      expect(alternatives.primary.label).toBe('Vercel (production)');
      expect(alternatives.alternatives).toHaveLength(1);
      expect(alternatives.alternatives[0]?.label).toBe('Netlify');
    });

    it('should throw if no actions', async () => {
      await expect(tracker.getAlternatives()).rejects.toThrow(
        'No actions to explain (deploy something first)'
      );
    });

    it('should load from disk if needed', async () => {
      const record = createTestRecord();
      const actionId = await tracker.recordAction(record);

      // Wait for persistence
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear memory
      tracker.clear();

      // Should load from disk
      const alternatives = await tracker.getAlternatives(actionId);
      expect(alternatives.primary.label).toBe('Vercel (production)');
    });
  });

  describe('getMetrics', () => {
    it('should return initial metrics', () => {
      const metrics = tracker.getMetrics();

      expect(metrics.totalActionsTracked).toBe(0);
      expect(metrics.totalExplainRequests).toBe(0);
      expect(metrics.totalAlternativeSelections).toBe(0);
      expect(metrics.actionTypeBreakdown[TrackedActionTypeEnum.DEPLOY]).toBe(0);
    });

    it('should track action count', async () => {
      await tracker.recordAction(createTestRecord());
      await tracker.recordAction(createTestRecord());

      const metrics = tracker.getMetrics();
      expect(metrics.totalActionsTracked).toBe(2);
      expect(metrics.actionTypeBreakdown[TrackedActionTypeEnum.DEPLOY]).toBe(2);
    });

    it('should track explain requests', async () => {
      await tracker.recordAction(createTestRecord());
      await tracker.explain({ type: 'general' });

      const metrics = tracker.getMetrics();
      expect(metrics.totalExplainRequests).toBe(1);
    });
  });

  describe('LRU Cache', () => {
    it('should evict oldest when exceeding maxMemoryRecords', async () => {
      // maxMemoryRecords is 5 in test setup
      const ids: string[] = [];

      for (let i = 0; i < 6; i++) {
        const id = await tracker.recordAction(
          createTestRecord({
            metadata: {
              ...createTestRecord().metadata,
              turnNumber: i,
            },
          })
        );
        ids.push(id);
      }

      // First ID should be evicted
      await expect(
        tracker.explain({ type: 'specific', target: { actionId: ids[0] } })
      ).rejects.toThrow();

      // Last ID should still be in memory
      const explanation = await tracker.explain({
        type: 'specific',
        target: { actionId: ids[5] },
      });
      expect(explanation.actionId).toBe(ids[5]);
    });

    it('should never exceed maxMemoryRecords', async () => {
      for (let i = 0; i < 10; i++) {
        await tracker.recordAction(
          createTestRecord({
            metadata: {
              ...createTestRecord().metadata,
              turnNumber: i,
            },
          })
        );
      }

      const metrics = tracker.getMetrics();
      expect(metrics.totalActionsTracked).toBe(10); // Total tracked
      // But only 5 should be in memory (maxMemoryRecords)
    });

    it('should evict before adding (not after)', async () => {
      // This tests the fix for issue #13 from audit
      const ids: string[] = [];

      // Fill to exactly maxMemoryRecords (5)
      for (let i = 0; i < 5; i++) {
        const id = await tracker.recordAction(
          createTestRecord({
            metadata: {
              ...createTestRecord().metadata,
              turnNumber: i,
            },
          })
        );
        ids.push(id);
      }

      // Adding one more should evict first, never briefly exceeding limit
      const newId = await tracker.recordAction(
        createTestRecord({
          metadata: {
            ...createTestRecord().metadata,
            turnNumber: 5,
          },
        })
      );

      // Verify oldest evicted
      await expect(
        tracker.explain({ type: 'specific', target: { actionId: ids[0] } })
      ).rejects.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear in-memory records', async () => {
      await tracker.recordAction(createTestRecord());
      await tracker.recordAction(createTestRecord());

      tracker.clear();

      await expect(tracker.explain({ type: 'general' })).rejects.toThrow(
        'No actions to explain'
      );
    });

    it('should not affect disk files', async () => {
      const record = createTestRecord();
      const actionId = await tracker.recordAction(record);

      // Wait for persistence
      await new Promise((resolve) => setTimeout(resolve, 100));

      tracker.clear();

      // File should still exist
      const filepath = path.join(testDir, `${actionId}.json`);
      await expect(fs.access(filepath)).resolves.toBeUndefined();
    });
  });
});
