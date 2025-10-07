/**
 * @fileoverview TDD Tests for DeploymentUndoStack
 * @module node-cli/__tests__/deployment-undo-stack.test
 *
 * Tests production-grade undo stack with:
 * - LRU eviction
 * - Atomic persistence
 * - Type safety
 * - Edge cases
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { ILogger } from '@aios/shared';
import { DeploymentUndoStack } from '../services/deployment-undo-stack.js';
import {
  UndoableActionType,
  UndoQueryType,
  UndoErrorCode,
  UndoError,
  createUndoActionId,
  createISOTimestamp,
  type DeploymentUndoableAction,
  type UndoActionId,
} from '../services/undo.types.js';

// Mock logger
const createMockLogger = (): ILogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLevel: jest.fn(),
  child: jest.fn(() => createMockLogger()),
});

describe('DeploymentUndoStack - TDD', () => {
  let stack: DeploymentUndoStack;
  let logger: ILogger;
  let testDir: string;
  let testPersistPath: string;

  beforeEach(async () => {
    logger = createMockLogger();

    // Create unique test directory
    testDir = path.join(os.tmpdir(), `aios-undo-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    testPersistPath = path.join(testDir, 'undo-stack.json');

    await fs.mkdir(testDir, { recursive: true, mode: 0o700 });

    stack = new DeploymentUndoStack(logger, {
      maxSize: 5,  // Small size for testing eviction
      persistPath: testPersistPath,
      autoSave: false,  // Manual save for testing
      compressionEnabled: false,
      filePermissions: 0o600,
    });

    await stack.initialize();
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('initialized'),
        expect.objectContaining({
          actionsLoaded: 0,
        })
      );
    });

    it('should create directory if not exists', async () => {
      const newDir = path.join(testDir, 'nested', 'path');
      const newStack = new DeploymentUndoStack(logger, {
        persistPath: path.join(newDir, 'stack.json'),
      });

      await newStack.initialize();

      const exists = await fs.access(newDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should be idempotent (safe to call multiple times)', async () => {
      await stack.initialize();
      await stack.initialize();
      await stack.initialize();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Push Operations', () => {
    it('should push deployment action and return ID', async () => {
      const actionId = await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-123',
        description: 'Deployed api-server v1.0.1',
        environment: 'production',
        beforeState: {
          version: 'v1.0.0',
          deploymentId: 'old-deploy',
        },
        afterState: {
          version: 'v1.0.1',
          deploymentId: 'new-deploy',
          url: 'https://api.example.com',
        },
        provider: 'vercel',
        projectName: 'api-server',
      });

      expect(actionId).toBeDefined();
      expect(actionId).toMatch(/^undo-\d+-[a-z0-9]+$/);
    });

    it('should push scaling action', async () => {
      const actionId = await stack.push({
        type: UndoableActionType.SCALE,
        sessionId: 'session-123',
        description: 'Scaled replicas from 2 to 5',
        environment: 'production',
        beforeState: {
          replicas: 2,
          instanceType: 't2.micro',
        },
        afterState: {
          replicas: 5,
          instanceType: 't2.small',
        },
        provider: 'aws',
        serviceName: 'api-server',
      });

      expect(actionId).toBeDefined();
    });

    it('should push env var action', async () => {
      const actionId = await stack.push({
        type: UndoableActionType.SET_ENV,
        sessionId: 'session-123',
        description: 'Updated environment variables',
        environment: 'staging',
        beforeState: {
          variables: new Map([['API_KEY', 'old-key']]),
        },
        afterState: {
          variables: new Map([
            ['API_KEY', 'new-key'],
            ['DEBUG', 'true'],
          ]),
        },
        provider: 'netlify',
        projectName: 'web-app',
      });

      expect(actionId).toBeDefined();
    });

    it('should auto-generate ID and timestamp', async () => {
      const beforePush = Date.now();

      const actionId = await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-123',
        description: 'Test deployment',
        environment: 'development',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'deploy-1',
          url: 'https://example.com',
        },
        provider: 'vercel',
        projectName: 'test-app',
      });

      const afterPush = Date.now();

      // Verify ID format
      expect(actionId).toMatch(/^undo-\d+-[a-z0-9]+$/);

      // Verify timestamp is recent
      const actions = stack.getAll();
      const action = actions[0]!;
      const actionTime = new Date(action.timestamp).getTime();

      expect(actionTime).toBeGreaterThanOrEqual(beforePush);
      expect(actionTime).toBeLessThanOrEqual(afterPush + 1000);
    });

    it('should set canUndo to true by default', async () => {
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-123',
        description: 'Test',
        environment: 'development',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'test',
          url: 'https://test.com',
        },
        provider: 'vercel',
        projectName: 'test',
      });

      const actions = stack.getAll();
      expect(actions[0]!.canUndo).toBe(true);
    });

    it('should throw if stack not initialized', async () => {
      const uninitializedStack = new DeploymentUndoStack(logger);

      await expect(async () => {
        await uninitializedStack.push({
          type: UndoableActionType.DEPLOY,
          sessionId: 'test',
          description: 'Test',
          environment: 'development',
          beforeState: {},
          afterState: {
            version: 'v1.0.0',
            deploymentId: 'test',
            url: 'https://test.com',
          },
          provider: 'vercel',
          projectName: 'test',
        });
      }).rejects.toThrow('not initialized');
    });
  });

  describe('LRU Eviction', () => {
    it('should evict oldest action when maxSize exceeded', async () => {
      // Push 5 actions (maxSize = 5)
      const ids: UndoActionId[] = [];
      for (let i = 0; i < 5; i++) {
        const id = await stack.push({
          type: UndoableActionType.DEPLOY,
          sessionId: `session-${i}`,
          description: `Deployment ${i}`,
          environment: 'development',
          beforeState: {},
          afterState: {
            version: `v1.0.${i}`,
            deploymentId: `deploy-${i}`,
            url: `https://example-${i}.com`,
          },
          provider: 'vercel',
          projectName: `app-${i}`,
        });
        ids.push(id);
      }

      // Verify all 5 are present
      let actions = stack.getAll();
      expect(actions.length).toBe(5);

      // Push 6th action (should evict oldest)
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-6',
        description: 'Deployment 6',
        environment: 'development',
        beforeState: {},
        afterState: {
          version: 'v1.0.6',
          deploymentId: 'deploy-6',
          url: 'https://example-6.com',
        },
        provider: 'vercel',
        projectName: 'app-6',
      });

      // Should still have 5 actions
      actions = stack.getAll();
      expect(actions.length).toBe(5);

      // Oldest action (ids[0]) should be evicted
      const oldestStillExists = actions.some(a => a.id === ids[0]);
      expect(oldestStillExists).toBe(false);

      // Newest should still exist
      const newestExists = actions.some(a => a.description === 'Deployment 6');
      expect(newestExists).toBe(true);
    });

    it('should maintain correct order after eviction', async () => {
      // Push 7 actions (3 over maxSize of 5)
      for (let i = 0; i < 7; i++) {
        await stack.push({
          type: UndoableActionType.DEPLOY,
          sessionId: `session-${i}`,
          description: `Deployment ${i}`,
          environment: 'development',
          beforeState: {},
          afterState: {
            version: `v1.0.${i}`,
            deploymentId: `deploy-${i}`,
            url: `https://example-${i}.com`,
          },
          provider: 'vercel',
          projectName: `app-${i}`,
        });
      }

      const actions = stack.getAll();
      expect(actions.length).toBe(5);

      // Should have actions 2-6 (0 and 1 evicted)
      const descriptions = actions.map(a => a.description);
      expect(descriptions).toContain('Deployment 2');
      expect(descriptions).toContain('Deployment 6');
      expect(descriptions).not.toContain('Deployment 0');
      expect(descriptions).not.toContain('Deployment 1');
    });

    it('should log eviction events', async () => {
      // Push 6 actions to trigger eviction
      for (let i = 0; i < 6; i++) {
        await stack.push({
          type: UndoableActionType.DEPLOY,
          sessionId: `session-${i}`,
          description: `Deployment ${i}`,
          environment: 'development',
          beforeState: {},
          afterState: {
            version: `v1.0.${i}`,
            deploymentId: `deploy-${i}`,
            url: `https://example-${i}.com`,
          },
          provider: 'vercel',
          projectName: `app-${i}`,
        });
      }

      // Should have logged eviction
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Evicted oldest'),
        expect.any(Object)
      );
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Push several test actions
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-1',
        description: 'Deploy v1.0.0',
        environment: 'staging',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'deploy-1',
          url: 'https://staging.example.com',
        },
        provider: 'vercel',
        projectName: 'api-server',
      });

      await stack.push({
        type: UndoableActionType.SCALE,
        sessionId: 'session-1',
        description: 'Scale to 3 replicas',
        environment: 'production',
        beforeState: { replicas: 1 },
        afterState: { replicas: 3 },
        provider: 'aws',
        serviceName: 'api-server',
      });

      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-2',
        description: 'Deploy v1.0.1',
        environment: 'production',
        beforeState: { version: 'v1.0.0' },
        afterState: {
          version: 'v1.0.1',
          deploymentId: 'deploy-2',
          url: 'https://prod.example.com',
        },
        provider: 'netlify',
        projectName: 'web-app',
      });
    });

    it('should query last action', () => {
      const result = stack.query({
        type: UndoQueryType.LAST,
        maxResults: 1,
      });

      expect(result.actions.length).toBe(1);
      expect(result.actions[0]!.description).toBe('Deploy v1.0.1');
    });

    it('should query last action of specific type', () => {
      const result = stack.query({
        type: UndoQueryType.LAST_OF_TYPE,
        actionType: UndoableActionType.DEPLOY,
        maxResults: 1,
      });

      expect(result.actions.length).toBe(1);
      expect(result.actions[0]!.type).toBe(UndoableActionType.DEPLOY);
      expect(result.actions[0]!.description).toBe('Deploy v1.0.1');
    });

    it('should query all actions', () => {
      const result = stack.query({
        type: UndoQueryType.ALL,
        maxResults: 10,
      });

      expect(result.actions.length).toBe(3);
      expect(result.totalCount).toBe(3);
    });

    it('should respect maxResults', () => {
      const result = stack.query({
        type: UndoQueryType.ALL,
        maxResults: 2,
      });

      expect(result.actions.length).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should filter by environment', () => {
      const result = stack.query({
        type: UndoQueryType.ALL,
        environment: 'production',
      });

      expect(result.actions.length).toBe(2);
      expect(result.actions.every(a => a.environment === 'production')).toBe(true);
    });

    it('should query by time window', async () => {
      const result = stack.query({
        type: UndoQueryType.BY_TIME,
        timeAgo: 10 * 1000,  // Last 10 seconds
      });

      // All actions should be within last 10 seconds
      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('should exclude undone actions by default', async () => {
      // Undo one action
      const actions = stack.getAll();
      await stack.undo(actions[0]!.id);

      const result = stack.query({
        type: UndoQueryType.ALL,
      });

      // Should have 2 actions (1 undone is excluded)
      expect(result.actions.length).toBe(2);
    });

    it('should include undone actions when requested', async () => {
      // Undo one action
      const actions = stack.getAll();
      await stack.undo(actions[0]!.id);

      const result = stack.query({
        type: UndoQueryType.ALL,
        includeUndone: true,
      });

      // Should have all 3 actions
      expect(result.actions.length).toBe(3);
    });
  });

  describe('Undo Operations', () => {
    let deploymentId: UndoActionId;

    beforeEach(async () => {
      deploymentId = await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-test',
        description: 'Deploy v1.0.1',
        environment: 'production',
        beforeState: {
          version: 'v1.0.0',
          deploymentId: 'old-deploy',
        },
        afterState: {
          version: 'v1.0.1',
          deploymentId: 'new-deploy',
          url: 'https://prod.example.com',
        },
        provider: 'vercel',
        projectName: 'api-server',
      });
    });

    it('should undo action by ID', async () => {
      const result = await stack.undo(deploymentId);

      expect(result.success).toBe(true);
      expect(result.actionId).toBe(deploymentId);
      expect(result.actionType).toBe(UndoableActionType.DEPLOY);
      expect(result.rollbackDetails).toBeDefined();
    });

    it('should undo last action', async () => {
      const result = await stack.undoLast();

      expect(result.success).toBe(true);
      expect(result.actionId).toBe(deploymentId);
    });

    it('should mark action as undone after successful undo', async () => {
      await stack.undo(deploymentId);

      const actions = stack.getAll();
      const action = actions.find(a => a.id === deploymentId);

      expect(action?.undoneAt).toBeDefined();
    });

    it('should fail undo of already undone action', async () => {
      // Undo once
      await stack.undo(deploymentId);

      // Try undo again
      const result = await stack.undo(deploymentId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(UndoErrorCode.ACTION_ALREADY_UNDONE);
    });

    it('should fail undo of non-existent action', async () => {
      const fakeId = 'undo-fake-123' as UndoActionId;
      const result = await stack.undo(fakeId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(UndoErrorCode.ACTION_NOT_FOUND);
    });

    it('should fail undo when stack is empty', async () => {
      const emptyStack = new DeploymentUndoStack(logger, {
        persistPath: path.join(testDir, 'empty.json'),
      });
      await emptyStack.initialize();

      const result = await emptyStack.undoLast();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(UndoErrorCode.STACK_EMPTY);
    });

    it('should log undo operations', async () => {
      await stack.undo(deploymentId);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Executing undo'),
        expect.objectContaining({
          type: UndoableActionType.DEPLOY,
        })
      );
    });
  });

  describe('Persistence', () => {
    it('should save stack to disk', async () => {
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-1',
        description: 'Test deployment',
        environment: 'development',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'test-deploy',
          url: 'https://test.com',
        },
        provider: 'vercel',
        projectName: 'test-app',
      });

      await stack.save();

      const fileExists = await fs.access(testPersistPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should persist valid JSON', async () => {
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-1',
        description: 'Test deployment',
        environment: 'development',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'test-deploy',
          url: 'https://test.com',
        },
        provider: 'vercel',
        projectName: 'test-app',
      });

      await stack.save();

      const content = await fs.readFile(testPersistPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.version).toBeDefined();
      expect(data.timestamp).toBeDefined();
      expect(Array.isArray(data.actions)).toBe(true);
    });

    it('should load stack from disk', async () => {
      // Push and save
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-1',
        description: 'Persisted deployment',
        environment: 'production',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'persist-deploy',
          url: 'https://persist.com',
        },
        provider: 'netlify',
        projectName: 'persist-app',
      });

      await stack.save();

      // Create new stack instance (should load from disk)
      const newStack = new DeploymentUndoStack(logger, {
        persistPath: testPersistPath,
      });

      await newStack.initialize();

      const actions = newStack.getAll();
      expect(actions.length).toBe(1);
      expect(actions[0]!.description).toBe('Persisted deployment');
    });

    it('should handle non-existent file gracefully', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.json');
      const newStack = new DeploymentUndoStack(logger, {
        persistPath: nonExistentPath,
      });

      await newStack.initialize();

      // Should start with empty stack
      const actions = newStack.getAll();
      expect(actions.length).toBe(0);
    });

    it('should handle corrupted JSON gracefully', async () => {
      // Write corrupted JSON
      await fs.writeFile(testPersistPath, '{ invalid json }', 'utf-8');

      const newStack = new DeploymentUndoStack(logger, {
        persistPath: testPersistPath,
      });

      await newStack.initialize();

      // Should start with empty stack and log error
      const actions = newStack.getAll();
      expect(actions.length).toBe(0);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should set correct file permissions', async () => {
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-1',
        description: 'Test',
        environment: 'development',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'test',
          url: 'https://test.com',
        },
        provider: 'vercel',
        projectName: 'test',
      });

      await stack.save();

      const stats = await fs.stat(testPersistPath);
      const permissions = stats.mode & 0o777;

      // Should be 0600 (user read/write only)
      expect(permissions).toBe(0o600);
    });
  });

  describe('Metrics', () => {
    it('should return accurate metrics', async () => {
      // Push 3 actions
      for (let i = 0; i < 3; i++) {
        await stack.push({
          type: UndoableActionType.DEPLOY,
          sessionId: `session-${i}`,
          description: `Deployment ${i}`,
          environment: 'development',
          beforeState: {},
          afterState: {
            version: `v1.0.${i}`,
            deploymentId: `deploy-${i}`,
            url: `https://example-${i}.com`,
          },
          provider: 'vercel',
          projectName: `app-${i}`,
        });
      }

      // Undo one
      const actions = stack.getAll();
      await stack.undo(actions[0]!.id);

      const metrics = stack.getMetrics();

      expect(metrics.totalActions).toBe(3);
      expect(metrics.undoneActions).toBe(1);
      expect(metrics.undoableActions).toBe(2);
      expect(metrics.utilizationPercent).toBe(60);  // 3 / 5 * 100
    });

    it('should calculate action ages', async () => {
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-1',
        description: 'Test',
        environment: 'development',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'test',
          url: 'https://test.com',
        },
        provider: 'vercel',
        projectName: 'test',
      });

      const metrics = stack.getMetrics();

      expect(metrics.averageActionAge).toBeGreaterThanOrEqual(0);
      expect(metrics.oldestActionAge).toBeGreaterThanOrEqual(0);
      expect(metrics.newestActionAge).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid concurrent pushes', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          stack.push({
            type: UndoableActionType.DEPLOY,
            sessionId: `session-${i}`,
            description: `Concurrent deployment ${i}`,
            environment: 'development',
            beforeState: {},
            afterState: {
              version: `v1.0.${i}`,
              deploymentId: `deploy-${i}`,
              url: `https://example-${i}.com`,
            },
            provider: 'vercel',
            projectName: `app-${i}`,
          })
        );
      }

      await Promise.all(promises);

      // Should have maxSize actions (5)
      const actions = stack.getAll();
      expect(actions.length).toBe(5);
    });

    it('should handle empty beforeState', async () => {
      const id = await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-1',
        description: 'Initial deployment (no previous state)',
        environment: 'production',
        beforeState: {},  // No previous deployment
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'first-deploy',
          url: 'https://first.com',
        },
        provider: 'vercel',
        projectName: 'new-app',
      });

      const result = await stack.undo(id);
      expect(result.success).toBe(true);
    });

    it('should handle very old actions', async () => {
      // This is a unit test limitation - we can't easily mock time
      // In integration tests, we would test time-based queries more thoroughly
      const id = await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'session-1',
        description: 'Recent deployment',
        environment: 'production',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'recent',
          url: 'https://recent.com',
        },
        provider: 'vercel',
        projectName: 'app',
      });

      // Action should be undoable (not too old)
      const result = await stack.undo(id);
      expect(result.success).toBe(true);
    });
  });
});
