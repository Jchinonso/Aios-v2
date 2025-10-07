/**
 * @fileoverview TDD Tests for Reference Resolution
 * @module node-cli/__tests__/reference-resolution.test
 *
 * Following strict TDD:
 * 1. Write FAILING tests first
 * 2. Implement minimal code to make tests pass
 * 3. Refactor with confidence
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EnhancedNLProcessor } from '../nl-planner/enhanced-nl-processor.js';
import { ConversationMemory } from '../services/conversation-memory.v2.js';

// Mock logger - define inline without types
const createMockLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLevel: jest.fn(),
  child: jest.fn(() => createMockLogger()),
});

// Mock AI service
const createMockAIService = (response: string) => ({
  sendMessage: jest.fn().mockResolvedValue({
    isSuccess: true,
    isFailure: false,
    value: { content: response },
    error: undefined,
  }),
  createChatCompletion: jest.fn(),
  createChatCompletionStream: jest.fn(),
  getModelInfo: jest.fn().mockReturnValue({ name: 'test-model' }),
  getProvider: jest.fn().mockReturnValue({ name: 'test-provider' }),
});

describe('Reference Resolution - TDD', () => {
  let memory;
  let logger;

  beforeEach(() => {
    logger = createMockLogger();
    memory = new ConversationMemory(logger);
  });

  describe('Reference Word: "again"', () => {
    it('should resolve "deploy again" to previous deployment context', async () => {
      // Arrange
      const previousDeployment = {
        userInput: 'deploy to vercel production',
        intent: 'deploy' as const,
        timestamp: new Date(),
        entities: {
          provider: 'vercel',
          env: 'production',
        },
      };

      memory.addTurn(previousDeployment);

      const aiResponse = JSON.stringify({
        intent: 'deploy',
        entities: {
          provider: 'vercel',
          env: 'production',
        },
        confidence: 0.95,
        risk: 'moderate',
        confirmRequired: true,
        reasoning: 'Repeating previous deployment to vercel production',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('deploy again');

      // Assert
      expect(result.intent).toBe('deploy');
      expect(result.entities.provider).toBe('vercel');
      expect(result.entities.env).toBe('production');
      expect(result.reasoning).toContain('previous');
    });

    it('should handle "do it again" with last action context', async () => {
      // Arrange
      const previousAction = {
        userInput: 'scale api to 5 instances',
        intent: 'scale' as const,
        timestamp: new Date(),
        entities: {
          service: 'api',
          replicas: 5,
        },
      };

      memory.addTurn(previousAction);

      const aiResponse = JSON.stringify({
        intent: 'scale',
        entities: {
          service: 'api',
          replicas: 5,
        },
        confidence: 0.9,
        risk: 'moderate',
        reasoning: 'Repeating scale operation for api service',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('do it again');

      // Assert
      expect(result.intent).toBe('scale');
      expect(result.entities.service).toBe('api');
      expect(result.entities.replicas).toBe(5);
    });

    it('should return helpful message when "again" is used with no history', async () => {
      // Arrange - empty memory
      const aiResponse = JSON.stringify({
        intent: 'unknown',
        entities: {},
        confidence: 0.3,
        clarifyingQuestion: 'What would you like to do? (No previous actions found)',
        reasoning: 'Cannot resolve "again" without previous context',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('do it again');

      // Assert
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.clarifyingQuestion).toBeDefined();
      expect(result.clarifyingQuestion?.toLowerCase()).toContain('previous');
    });
  });

  describe('Reference Word: "it"', () => {
    it('should resolve "rollback it" to last deployment', async () => {
      // Arrange
      const lastDeployment = {
        userInput: 'deploy to netlify staging',
        intent: 'deploy' as const,
        timestamp: new Date(),
        entities: {
          provider: 'netlify',
          env: 'staging',
        },
      };

      memory.addTurn(lastDeployment);

      const aiResponse = JSON.stringify({
        intent: 'rollback',
        entities: {
          env: 'staging',
          service: 'netlify',
        },
        confidence: 0.9,
        risk: 'high',
        confirmRequired: true,
        reasoning: 'Rolling back last deployment to netlify staging',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('rollback it');

      // Assert
      expect(result.intent).toBe('rollback');
      expect(result.entities.env).toBe('staging');
      expect(result.risk).toBe('high');
      expect(result.confirmRequired).toBe(true);
    });

    it('should resolve "show logs for it" to last mentioned service', async () => {
      // Arrange
      const lastAction = {
        userInput: 'deploy api service to production',
        intent: 'deploy' as const,
        timestamp: new Date(),
        entities: {
          service: 'api',
          env: 'production',
        },
      };

      memory.addTurn(lastAction);

      const aiResponse = JSON.stringify({
        intent: 'logs',
        entities: {
          service: 'api',
          env: 'production',
        },
        confidence: 0.95,
        reasoning: 'Showing logs for api service (from previous context)',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('show logs for it');

      // Assert
      expect(result.intent).toBe('logs');
      expect(result.entities.service).toBe('api');
      expect(result.entities.env).toBe('production');
    });
  });

  describe('Reference Word: "that"', () => {
    it('should resolve "scale that to 10" to previous service mention', async () => {
      // Arrange
      const previousMention = {
        userInput: 'check status of worker service',
        intent: 'status' as const,
        timestamp: new Date(),
        entities: {
          service: 'worker',
        },
      };

      memory.addTurn(previousMention);

      const aiResponse = JSON.stringify({
        intent: 'scale',
        entities: {
          service: 'worker',
          replicas: 10,
        },
        confidence: 0.9,
        risk: 'moderate',
        confirmRequired: true,
        reasoning: 'Scaling worker service (from previous context) to 10 instances',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('scale that to 10');

      // Assert
      expect(result.intent).toBe('scale');
      expect(result.entities.service).toBe('worker');
      expect(result.entities.replicas).toBe(10);
    });

    it('should resolve "restart that" to last mentioned service', async () => {
      // Arrange
      const lastService = {
        userInput: 'deploy database service',
        intent: 'deploy' as const,
        timestamp: new Date(),
        entities: {
          service: 'database',
        },
      };

      memory.addTurn(lastService);

      const aiResponse = JSON.stringify({
        intent: 'restart',
        entities: {
          service: 'database',
        },
        confidence: 0.85,
        reasoning: 'Restarting database service from previous context',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('restart that');

      // Assert
      expect(result.intent).toBe('restart');
      expect(result.entities.service).toBe('database');
    });
  });

  describe('Reference Word: "the same"', () => {
    it('should resolve "deploy the same" to previous deployment', async () => {
      // Arrange
      const previousDeploy = {
        userInput: 'deploy frontend to vercel',
        intent: 'deploy' as const,
        timestamp: new Date(),
        entities: {
          service: 'frontend',
          provider: 'vercel',
        },
      };

      memory.addTurn(previousDeploy);

      const aiResponse = JSON.stringify({
        intent: 'deploy',
        entities: {
          service: 'frontend',
          provider: 'vercel',
        },
        confidence: 0.95,
        reasoning: 'Deploying frontend to vercel (same as previous)',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('deploy the same');

      // Assert
      expect(result.intent).toBe('deploy');
      expect(result.entities.service).toBe('frontend');
      expect(result.entities.provider).toBe('vercel');
    });
  });

  describe('Ambiguous References', () => {
    it('should ask for clarification when reference is ambiguous', async () => {
      // Arrange - multiple actions with different services
      memory.addTurn({
        userInput: 'deploy api',
        intent: 'deploy',
        timestamp: new Date(Date.now() - 60000),
        entities: { service: 'api' },
      });

      memory.addTurn({
        userInput: 'deploy frontend',
        intent: 'deploy',
        timestamp: new Date(),
        entities: { service: 'frontend' },
      });

      const aiResponse = JSON.stringify({
        intent: 'logs',
        entities: {},
        confidence: 0.4,
        clarifyingQuestion: 'Which service would you like logs for: api or frontend?',
        reasoning: 'Multiple recent deployments, need clarification',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('show logs for it');

      // Assert
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.clarifyingQuestion).toBeDefined();
      expect(result.clarifyingQuestion).toContain('api');
      expect(result.clarifyingQuestion).toContain('frontend');
    });
  });

  describe('Multi-hop References', () => {
    it('should resolve references across multiple turns', async () => {
      // Arrange - 3-turn conversation
      memory.addTurn({
        userInput: 'deploy api to production',
        intent: 'deploy',
        timestamp: new Date(Date.now() - 120000), // 2 min ago
        entities: {
          service: 'api',
          env: 'production',
        },
      });

      memory.addTurn({
        userInput: 'check status',
        intent: 'status',
        timestamp: new Date(Date.now() - 60000), // 1 min ago
        entities: {},
      });

      const aiResponse = JSON.stringify({
        intent: 'logs',
        entities: {
          service: 'api',
          env: 'production',
        },
        confidence: 0.85,
        reasoning: 'Showing logs for api in production (from 2 turns ago)',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('show logs for it');

      // Assert
      expect(result.intent).toBe('logs');
      expect(result.entities.service).toBe('api');
      expect(result.entities.env).toBe('production');
    });
  });

  describe('Edge Cases', () => {
    it('should not treat normal words as references', async () => {
      // Arrange
      const aiResponse = JSON.stringify({
        intent: 'deploy',
        entities: {
          service: 'notification-service',
          env: 'staging',
        },
        confidence: 0.9,
        reasoning: 'Deploying notification service to staging',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('deploy notification-service to staging');

      // Assert
      // "it" is part of "notification" - should not be treated as reference
      expect(result.intent).toBe('deploy');
      expect(result.entities.service).toBe('notification-service');
    });

    it('should handle references with typos gracefully', async () => {
      // Arrange
      const lastAction = {
        userInput: 'deploy to vercel',
        intent: 'deploy',
        timestamp: new Date(),
        entities: {
          provider: 'vercel',
        },
      };

      memory.addTurn(lastAction);

      const aiResponse = JSON.stringify({
        intent: 'deploy',
        entities: {
          provider: 'vercel',
        },
        confidence: 0.8,
        reasoning: 'Deploying again to vercel (interpreting "agian" as "again")',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('do it agian'); // typo

      // Assert
      expect(result.intent).toBe('deploy');
      expect(result.entities.provider).toBe('vercel');
    });
  });

  describe('Context Window Limits', () => {
    it('should use recent context (last 3-5 turns) for resolution', async () => {
      // Arrange - Add 10 turns, only recent ones should matter
      for (let i = 0; i < 7; i++) {
        memory.addTurn({
          userInput: `old action ${i}`,
          intent: 'status',
          timestamp: new Date(Date.now() - (10 - i) * 60000),
          entities: {},
        });
      }

      // Recent deployment that should be used
      memory.addTurn({
        userInput: 'deploy to railway',
        intent: 'deploy',
        timestamp: new Date(Date.now() - 10000),
        entities: {
          provider: 'railway',
        },
      });

      const aiResponse = JSON.stringify({
        intent: 'deploy',
        entities: {
          provider: 'railway',
        },
        confidence: 0.9,
        reasoning: 'Repeating recent deployment to railway',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('deploy again');

      // Assert
      expect(result.intent).toBe('deploy');
      expect(result.entities.provider).toBe('railway');
    });
  });

  describe('Confirmation References', () => {
    it('should resolve "yes" as confirmation of previous suggestion', async () => {
      // Arrange - AI suggested something in previous turn
      const lastTurn = {
        userInput: 'should I deploy to production?',
        intent: 'unknown',
        timestamp: new Date(),
        entities: {},
        aiResponse: {
          suggestedAction: 'deploy',
          suggestedEntities: {
            env: 'production',
          },
          reasoning: 'Suggested deploying to production based on test pass',
        },
      };

      memory.addTurn(lastTurn);

      const aiResponse = JSON.stringify({
        intent: 'deploy',
        entities: {
          env: 'production',
        },
        confidence: 0.95,
        risk: 'moderate',
        confirmRequired: true,
        reasoning: 'User confirmed deployment to production',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('yes');

      // Assert
      expect(result.intent).toBe('deploy');
      expect(result.entities.env).toBe('production');
      expect(result.reasoning).toContain('confirmed');
    });

    it('should resolve "ok" as acceptance', async () => {
      // Arrange
      const lastTurn = {
        userInput: 'scale api to 5?',
        intent: 'unknown',
        timestamp: new Date(),
        entities: {},
        aiResponse: {
          clarifyingQuestion: 'Scale api service to 5 instances in production?',
        },
      };

      memory.addTurn(lastTurn);

      const aiResponse = JSON.stringify({
        intent: 'scale',
        entities: {
          service: 'api',
          replicas: 5,
          env: 'production',
        },
        confidence: 0.9,
        confirmRequired: true,
        reasoning: 'User accepted scaling suggestion',
      });

      const aiService = createMockAIService(aiResponse);
      const processor = new EnhancedNLProcessor(aiService, memory, logger);

      // Act
      const result = await processor.process('ok');

      // Assert
      expect(result.intent).toBe('scale');
      expect(result.entities.service).toBe('api');
      expect(result.entities.replicas).toBe(5);
    });
  });
});
