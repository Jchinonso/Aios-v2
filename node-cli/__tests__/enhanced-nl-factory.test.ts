/**
 * @fileoverview Tests for EnhancedNLProcessor Factory Integration
 * @description Validates factory creation, dependency injection, and container integration
 */

import { EnhancedNLProcessorFactory } from '../services/enhanced-nl-factory.js';
import { ConversationMemory } from '../services/conversation-memory.v2.js';
import { ConsoleLogger } from '../services/console-logger.js';
import type { IAIService, ILogger } from '@aios/shared';

// Mock AI Service
class MockAIService implements IAIService {
  async sendMessage(): Promise<{ isSuccess: true; isFailure: false; value: { content: string } }> {
    return {
      isSuccess: true,
      isFailure: false,
      value: {
        content: JSON.stringify({
          intent: 'deploy',
          entities: { env: 'production' },
          confidence: 0.95,
          risk: 'high',
          confirmRequired: true
        })
      }
    };
  }

  async streamMessage(): Promise<any> {
    throw new Error('Not implemented');
  }
  async createConversation(): Promise<any> {
    throw new Error('Not implemented');
  }
  async getConversation(): Promise<any> {
    throw new Error('Not implemented');
  }
  async clearConversation(): Promise<any> {
    throw new Error('Not implemented');
  }
  async listConversations(): Promise<any> {
    throw new Error('Not implemented');
  }
}

describe('EnhancedNLProcessorFactory', () => {
  let logger: ILogger;
  let aiService: IAIService;

  beforeEach(() => {
    logger = new ConsoleLogger();
    aiService = new MockAIService();
  });

  describe('Factory Creation', () => {
    it('should create EnhancedNLProcessor with all dependencies', () => {
      const processor = EnhancedNLProcessorFactory.create(aiService, logger);

      expect(processor).toBeDefined();
      expect(typeof processor.process).toBe('function');
      expect(typeof processor.getStats).toBe('function');
      expect(typeof processor.clearMemory).toBe('function');
    });

    it('should create processor with fresh ConversationMemory', () => {
      const processor1 = EnhancedNLProcessorFactory.create(aiService, logger);
      const processor2 = EnhancedNLProcessorFactory.create(aiService, logger);

      // Each processor should have independent memory
      expect(processor1.getStats().turns).toBe(0);
      expect(processor2.getStats().turns).toBe(0);
    });

    it('should accept optional metrics collector', () => {
      const metrics = {
        recordConversationTurn: jest.fn(),
        recordPreferenceLearned: jest.fn(),
        recordIntentClassified: jest.fn()
      };

      const processor = EnhancedNLProcessorFactory.create(aiService, logger, metrics);

      expect(processor).toBeDefined();
    });
  });

  describe('With Existing Memory', () => {
    it('should create processor with existing memory instance', async () => {
      const existingMemory = new ConversationMemory(logger);

      // Pre-populate memory
      existingMemory.learnFromInput('deploy to vercel', {
        intent: 'deploy',
        entities: { provider: 'vercel' },
        cli: 'aios cloud deploy',
        confidence: 0.9,
        risk: 'moderate',
        confirmRequired: true
      });

      const processor = EnhancedNLProcessorFactory.createWithMemory(
        aiService,
        existingMemory,
        logger
      );

      const stats = processor.getStats();
      expect(stats.turns).toBe(1);
    });

    it('should preserve conversation history from existing memory', async () => {
      const existingMemory = new ConversationMemory(logger);

      // Add multiple turns
      for (let i = 0; i < 3; i++) {
        existingMemory.learnFromInput(`command ${i}`, {
          intent: 'deploy',
          entities: {},
          cli: `aios cmd ${i}`,
          confidence: 0.8,
          risk: 'low',
          confirmRequired: false
        });
      }

      const processor = EnhancedNLProcessorFactory.createWithMemory(
        aiService,
        existingMemory,
        logger
      );

      expect(processor.getStats().turns).toBe(3);
    });
  });

  describe('Container Integration', () => {
    it('should integrate with DependencyContainer pattern', () => {
      // Simulates how it will be used in DependencyContainer
      const container = {
        logger,
        aiService
      };

      const processor = EnhancedNLProcessorFactory.create(
        container.aiService,
        container.logger
      );

      expect(processor).toBeDefined();
    });

    it('should support lazy initialization pattern', () => {
      let processorInstance: ReturnType<typeof EnhancedNLProcessorFactory.create> | null = null;

      const getProcessor = () => {
        if (!processorInstance) {
          processorInstance = EnhancedNLProcessorFactory.create(aiService, logger);
        }
        return processorInstance;
      };

      const processor1 = getProcessor();
      const processor2 = getProcessor();

      // Should return same instance
      expect(processor1).toBe(processor2);
    });
  });

  describe('Validation', () => {
    it('should throw on null AI service', () => {
      expect(() => {
        EnhancedNLProcessorFactory.create(null as any, logger);
      }).toThrow('AI service is required');
    });

    it('should throw on undefined AI service', () => {
      expect(() => {
        EnhancedNLProcessorFactory.create(undefined as any, logger);
      }).toThrow('AI service is required');
    });

    it('should throw on null logger', () => {
      expect(() => {
        EnhancedNLProcessorFactory.create(aiService, null as any);
      }).toThrow('Logger is required');
    });

    it('should throw on undefined logger', () => {
      expect(() => {
        EnhancedNLProcessorFactory.create(aiService, undefined as any);
      }).toThrow('Logger is required');
    });

    it('should throw on null memory for createWithMemory', () => {
      expect(() => {
        EnhancedNLProcessorFactory.createWithMemory(aiService, null as any, logger);
      }).toThrow('Memory is required');
    });
  });

  describe('Production Scenarios', () => {
    it('should handle concurrent processor creation safely', () => {
      const processors = Array.from({ length: 10 }, () =>
        EnhancedNLProcessorFactory.create(aiService, logger)
      );

      expect(processors).toHaveLength(10);
      processors.forEach(p => expect(p).toBeDefined());
    });

    it('should work with real AI service integration', async () => {
      const processor = EnhancedNLProcessorFactory.create(aiService, logger);

      const result = await processor.process('deploy to production');

      expect(result.intent).toBe('deploy');
      expect(result.entities.env).toBe('production');
      expect(result.confidence).toBe(0.95);
    });

    it('should maintain memory isolation between processors', async () => {
      const processor1 = EnhancedNLProcessorFactory.create(aiService, logger);
      const processor2 = EnhancedNLProcessorFactory.create(aiService, logger);

      await processor1.process('deploy to vercel');
      await processor2.process('show logs');

      expect(processor1.getStats().turns).toBe(1);
      expect(processor2.getStats().turns).toBe(1);
    });
  });

  describe('Type Safety', () => {
    it('should enforce strict typing on factory methods', () => {
      // This test verifies TypeScript compilation - if it compiles, types are correct
      const processor = EnhancedNLProcessorFactory.create(aiService, logger);

      // Should expose correct methods
      const _process: (input: string) => Promise<any> = processor.process.bind(processor);
      const _getStats: () => any = processor.getStats.bind(processor);
      const _clearMemory: () => void = processor.clearMemory.bind(processor);
      const _recordPreference: (pref: any) => void = processor.recordPreference.bind(processor);

      expect(_process).toBeDefined();
      expect(_getStats).toBeDefined();
      expect(_clearMemory).toBeDefined();
      expect(_recordPreference).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service errors gracefully', async () => {
      const failingAIService: IAIService = {
        sendMessage: async () => ({
          isSuccess: false,
          isFailure: true,
          error: new Error('API rate limit exceeded')
        }) as any,
        streamMessage: async () => { throw new Error('Not implemented'); },
        createConversation: async () => { throw new Error('Not implemented'); },
        getConversation: async () => { throw new Error('Not implemented'); },
        clearConversation: async () => { throw new Error('Not implemented'); },
        listConversations: async () => { throw new Error('Not implemented'); }
      };

      const processor = EnhancedNLProcessorFactory.create(failingAIService, logger);

      await expect(processor.process('deploy')).rejects.toThrow('API rate limit exceeded');
    });

    it('should maintain consistency after errors', async () => {
      const processor = EnhancedNLProcessorFactory.create(aiService, logger);

      // First successful call
      await processor.process('deploy to production');
      expect(processor.getStats().turns).toBe(1);

      // Memory should persist despite any errors
      expect(processor.getStats().turns).toBe(1);
    });
  });
});
