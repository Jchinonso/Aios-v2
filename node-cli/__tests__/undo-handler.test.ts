/**
 * @fileoverview Tests for Undo Handler
 */

import { UndoHandler, type ConfirmationPrompt } from '../handlers/undo-handler.js';
import { DeploymentUndoStack } from '../services/deployment-undo-stack.js';
import { NaturalLanguageUndoParser } from '../services/nl-undo-parser.js';
import { UndoableActionType, UndoErrorCode, createUndoActionId, createISOTimestamp } from '../services/undo.types.js';
import type { ILogger } from '@aios/shared';
import * as os from 'node:os';
import * as path from 'node:path';
import { promises as fs } from 'node:fs';

describe('UndoHandler - TDD', () => {
  let handler: UndoHandler;
  let stack: DeploymentUndoStack;
  let parser: NaturalLanguageUndoParser;
  let logger: ILogger;
  let confirmationPrompt: jest.Mock<Promise<boolean>, [string]>;
  let testDir: string;

  beforeEach(async () => {
    // Setup test directory
    testDir = path.join(os.tmpdir(), `undo-handler-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create mock logger
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      trace: jest.fn(),
    } as unknown as ILogger;

    // Create stack and parser
    stack = new DeploymentUndoStack(logger, {
      persistPath: path.join(testDir, 'undo-stack.json'),
      maxSize: 10,
    });
    await stack.initialize();

    parser = new NaturalLanguageUndoParser();

    // Create mock confirmation prompt
    confirmationPrompt = jest.fn().mockResolvedValue(true);

    // Create handler
    handler = new UndoHandler(stack, parser, logger, {
      requireProductionConfirmation: true,
      confirmationPrompt,
      minConfidenceThreshold: 0.8,
      maxListResults: 10,
    });
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic Undo Commands', () => {
    beforeEach(async () => {
      // Push a deployment action
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'test-session',
        description: 'Deployed v1.0.1',
        environment: 'development',
        beforeState: {
          version: 'v1.0.0',
          deploymentId: 'old-deploy',
        },
        afterState: {
          version: 'v1.0.1',
          deploymentId: 'new-deploy',
          url: 'https://test.com',
        },
        provider: 'vercel',
        projectName: 'test-app',
      });
    });

    it('should handle "undo" command', async () => {
      const result = await handler.handle('undo');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully undid');
    });

    it('should handle "undo last" command', async () => {
      const result = await handler.handle('undo last');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deploy');
    });

    it('should handle "rollback" command', async () => {
      const result = await handler.handle('rollback');

      expect(result.success).toBe(true);
    });

    it('should not require confirmation for development', async () => {
      await handler.handle('undo');

      expect(confirmationPrompt).not.toHaveBeenCalled();
    });

    it('should include undo result in details', async () => {
      const result = await handler.handle('undo');

      expect(result.details?.undoResult).toBeDefined();
      expect(result.details?.undoResult?.success).toBe(true);
    });
  });

  describe('Production Confirmation', () => {
    beforeEach(async () => {
      // Push production deployment
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'test-session',
        description: 'Production deploy v2.0.0',
        environment: 'production',
        beforeState: {
          version: 'v1.9.0',
          deploymentId: 'prod-old',
        },
        afterState: {
          version: 'v2.0.0',
          deploymentId: 'prod-new',
          url: 'https://prod.example.com',
        },
        provider: 'vercel',
        projectName: 'prod-app',
      });
    });

    it('should require confirmation for production undos', async () => {
      confirmationPrompt.mockResolvedValue(true);

      await handler.handle('undo');

      expect(confirmationPrompt).toHaveBeenCalledTimes(1);
      expect(confirmationPrompt.mock.calls[0]![0]).toContain('PRODUCTION');
    });

    it('should proceed when user confirms', async () => {
      confirmationPrompt.mockResolvedValue(true);

      const result = await handler.handle('undo');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully');
    });

    it('should cancel when user declines', async () => {
      confirmationPrompt.mockResolvedValue(false);

      const result = await handler.handle('undo');

      expect(result.success).toBe(false);
      expect(result.message).toContain('cancelled');
      expect(result.error?.code).toBe('USER_CANCELLED');
    });

    it('should include action details in confirmation', async () => {
      confirmationPrompt.mockResolvedValue(false);

      await handler.handle('undo');

      const confirmMessage = confirmationPrompt.mock.calls[0]![0]!;
      expect(confirmMessage).toContain('v2.0.0');
      expect(confirmMessage).toContain('v1.9.0');
      expect(confirmMessage).toContain('vercel');
    });
  });

  describe('Type-Specific Undo', () => {
    beforeEach(async () => {
      // Push deployment
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'test-session',
        description: 'Deploy v1',
        environment: 'development',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'deploy-1',
          url: 'https://v1.com',
        },
        provider: 'vercel',
        projectName: 'app',
      });

      // Push scaling
      await stack.push({
        type: UndoableActionType.SCALE,
        sessionId: 'test-session',
        description: 'Scaled to 5 replicas',
        environment: 'development',
        beforeState: {
          replicas: 2,
        },
        afterState: {
          replicas: 5,
        },
        provider: 'aws',
        serviceName: 'api-server',
      });
    });

    it('should undo last deployment', async () => {
      const result = await handler.handle('undo deployment');

      expect(result.success).toBe(true);
      expect(result.details?.undoResult?.actionType).toBe(UndoableActionType.DEPLOY);
    });

    it('should undo last scaling', async () => {
      const result = await handler.handle('undo scaling');

      expect(result.success).toBe(true);
      expect(result.details?.undoResult?.actionType).toBe(UndoableActionType.SCALE);
    });

    it('should undo specific type even if not most recent', async () => {
      const result = await handler.handle('undo deployment');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Deploy v1');
    });
  });

  describe('List Commands', () => {
    beforeEach(async () => {
      // Push multiple actions
      for (let i = 0; i < 3; i++) {
        await stack.push({
          type: UndoableActionType.DEPLOY,
          sessionId: `session-${i}`,
          description: `Deploy v1.0.${i}`,
          environment: 'development',
          beforeState: {},
          afterState: {
            version: `v1.0.${i}`,
            deploymentId: `deploy-${i}`,
            url: `https://v${i}.com`,
          },
          provider: 'vercel',
          projectName: 'app',
        });
      }
    });

    it('should list undoable actions', async () => {
      const result = await handler.handle('what can I undo?');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Undoable actions');
      expect(result.details?.actions?.length).toBe(3);
    });

    it('should show action details in list', async () => {
      const result = await handler.handle('show undo history');

      expect(result.message).toContain('deploy');
      expect(result.message).toContain('development');
      expect(result.message).toContain('vercel');
    });

    it('should include usage hints', async () => {
      const result = await handler.handle('list undoable actions');

      expect(result.message).toContain('To undo an action');
    });

    it('should format time ago correctly', async () => {
      const result = await handler.handle('what can I undo?');

      expect(result.message).toMatch(/\d+ \w+ ago/);
    });
  });

  describe('Empty Stack', () => {
    it('should handle empty stack gracefully', async () => {
      const result = await handler.handle('undo');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No undoable actions');
      expect(result.error?.code).toBe('STACK_EMPTY');
    });

    it('should handle empty list query', async () => {
      const result = await handler.handle('what can I undo?');

      expect(result.success).toBe(true);
      expect(result.message).toContain('No undoable actions');
    });
  });

  describe('Low Confidence Parsing', () => {
    it('should reject low confidence commands', async () => {
      // Create handler with high threshold
      const strictHandler = new UndoHandler(stack, parser, logger, {
        minConfidenceThreshold: 0.99,
      });

      const result = await strictHandler.handle('cancel last action');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LOW_CONFIDENCE');
    });

    it('should suggest alternatives for low confidence', async () => {
      const strictHandler = new UndoHandler(stack, parser, logger, {
        minConfidenceThreshold: 0.99,
      });

      const result = await strictHandler.handle('xyz');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Did you mean');
    });
  });

  describe('Error Handling', () => {
    it('should handle already undone actions', async () => {
      const id = await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'test',
        description: 'Test deploy',
        environment: 'development',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'test',
          url: 'https://test.com',
        },
        provider: 'vercel',
        projectName: 'app',
      });

      // Undo once
      await stack.undo(id);

      // Try undo again - query filters out undone actions, so stack appears empty
      const result = await handler.handle('undo');

      expect(result.success).toBe(false);
      // Query filters out undone actions, so we get STACK_EMPTY not ACTION_ALREADY_UNDONE
      expect(result.error?.code).toBe(UndoErrorCode.STACK_EMPTY);
    });

    it('should handle parse errors gracefully', async () => {
      // This should not throw, even with weird input
      const result = await handler.handle('!@#$%^&*()');

      expect(result.success).toBeDefined();
    });
  });

  describe('Success Messages', () => {
    it('should format deployment undo success', async () => {
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'test',
        description: 'Deploy v2.0.0',
        environment: 'development',
        beforeState: {
          version: 'v1.0.0',
        },
        afterState: {
          version: 'v2.0.0',
          deploymentId: 'new',
          url: 'https://new.com',
        },
        provider: 'vercel',
        projectName: 'app',
      });

      const result = await handler.handle('undo');

      expect(result.success).toBe(true);
      expect(result.message).toContain('✅');
      expect(result.message).toContain('deploy');
    });

    it('should include rollback details in success', async () => {
      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'test',
        description: 'Deploy v2.0.0',
        environment: 'development',
        beforeState: {
          version: 'v1.0.0',
        },
        afterState: {
          version: 'v2.0.0',
          deploymentId: 'new',
          url: 'https://new.com',
        },
        provider: 'vercel',
        projectName: 'app',
      });

      const result = await handler.handle('undo');

      expect(result.message).toContain('Rollback details');
    });
  });

  describe('Handler Options', () => {
    it('should respect custom confirmation option', async () => {
      const noConfirmHandler = new UndoHandler(stack, parser, logger, {
        requireProductionConfirmation: false,
      });

      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'test',
        description: 'Prod deploy',
        environment: 'production',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'prod',
          url: 'https://prod.com',
        },
        provider: 'vercel',
        projectName: 'app',
      });

      await noConfirmHandler.handle('undo');

      expect(confirmationPrompt).not.toHaveBeenCalled();
    });

    it('should respect custom confidence threshold', async () => {
      const lenientHandler = new UndoHandler(stack, parser, logger, {
        minConfidenceThreshold: 0.5,
      });

      await stack.push({
        type: UndoableActionType.DEPLOY,
        sessionId: 'test',
        description: 'Deploy',
        environment: 'development',
        beforeState: {},
        afterState: {
          version: 'v1.0.0',
          deploymentId: 'test',
          url: 'https://test.com',
        },
        provider: 'vercel',
        projectName: 'app',
      });

      const result = await lenientHandler.handle('cancel deployment');

      expect(result.success).toBe(true);
    });
  });
});
