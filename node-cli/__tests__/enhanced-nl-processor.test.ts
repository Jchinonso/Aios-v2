/**
 * @fileoverview Tests for Enhanced NL Processor with Multi-Turn Context
 * @description Validates conversation memory, preference learning, and context awareness
 */

import { EnhancedNLProcessor } from '../nl-planner/enhanced-nl-processor.js';
import { ConversationMemory } from '../services/conversation-memory.v2.js';
import { ConsoleLogger } from '../services/console-logger.js';
import type { IAIService } from '@aios/shared';
import type { IntentType } from '../nl-planner/types.js';

// Mock AI Service
class MockAIService implements IAIService {
  private responses: Map<string, string> = new Map();

  mockResponse(contains: string, response: object): void {
    this.responses.set(contains, JSON.stringify(response));
  }

  async sendMessage(prompt: string): Promise<{ isSuccess: true; isFailure: false; value: { content: string } }> {
    for (const [key, response] of this.responses) {
      if (prompt.includes(key)) {
        return { isSuccess: true, isFailure: false, value: { content: response } };
      }
    }

    // Default response
    return {
      isSuccess: true,
      isFailure: false,
      value: {
        content: JSON.stringify({
          intent: 'unknown',
          entities: {},
          confidence: 0.5,
          risk: 'low',
          confirmRequired: false
        })
      }
    };
  }

  // Not used in tests
  async sendMessageWithContext(): Promise<any> {
    throw new Error('Not implemented');
  }
  async generateEmbedding(): Promise<any> {
    throw new Error('Not implemented');
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

describe('EnhancedNLProcessor - Phase 1 Foundation', () => {
  let processor: EnhancedNLProcessor;
  let aiService: MockAIService;
  let memory: ConversationMemory;
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger();
    memory = new ConversationMemory(logger);
    aiService = new MockAIService();
    processor = new EnhancedNLProcessor(aiService, memory, logger);
  });

  describe('Basic Intent Classification', () => {
    it('should classify deploy intent correctly', async () => {
      aiService.mockResponse('deploy to production', {
        intent: 'deploy',
        entities: { env: 'production' },
        confidence: 0.95,
        risk: 'high',
        confirmRequired: true
      });

      const result = await processor.process('deploy to production');

      expect(result.intent).toBe('deploy');
      expect(result.entities.env).toBe('production');
      expect(result.confidence).toBe(0.95);
      expect(result.confirmRequired).toBe(true);
    });

    it('should classify logs intent correctly', async () => {
      aiService.mockResponse('show logs', {
        intent: 'logs',
        entities: { level: 'error' },
        confidence: 0.9,
        risk: 'low',
        confirmRequired: false
      });

      const result = await processor.process('show me error logs');

      expect(result.intent).toBe('logs');
      expect(result.entities.level).toBe('error');
    });
  });

  describe('Multi-Turn Context Awareness', () => {
    it('should remember provider from previous turn', async () => {
      // Turn 1: Deploy to vercel
      aiService.mockResponse('deploy to vercel', {
        intent: 'deploy',
        entities: { provider: 'vercel', env: 'staging' },
        confidence: 0.95,
        risk: 'moderate',
        confirmRequired: true
      });

      await processor.process('deploy to vercel');

      // Turn 2: Deploy again (should remember vercel)
      aiService.mockResponse('deploy again', {
        intent: 'deploy',
        entities: { env: 'production' },
        confidence: 0.9,
        risk: 'high',
        confirmRequired: true
      });

      const result = await processor.process('deploy again');

      // Should auto-fill provider from preferences
      expect(result.intent).toBe('deploy');
      expect(result.entities.provider).toBe('vercel'); // Filled from memory!
    });

    it('should handle 3+ turn conversations', async () => {
      // Turn 1
      aiService.mockResponse('connect to netlify', {
        intent: 'connect',
        entities: { provider: 'netlify' },
        confidence: 0.95,
        risk: 'low',
        confirmRequired: false
      });
      await processor.process('connect to netlify');

      // Turn 2
      aiService.mockResponse('deploy', {
        intent: 'deploy',
        entities: { env: 'staging' },
        confidence: 0.9,
        risk: 'moderate',
        confirmRequired: true
      });
      await processor.process('deploy to staging');

      // Turn 3
      aiService.mockResponse('show logs', {
        intent: 'logs',
        entities: {},
        confidence: 0.85,
        risk: 'low',
        confirmRequired: false
      });
      const result = await processor.process('show me the logs');

      const stats = processor.getStats();
      expect(stats.turns).toBe(3);
    });

    it('should provide conversation context in prompt', async () => {
      let capturedPrompt = '';
      aiService.sendMessage = async (prompt: string) => {
        capturedPrompt = prompt;
        return {
          isSuccess: true,
          isFailure: false,
          value: {
            content: JSON.stringify({
              intent: 'deploy',
              entities: {},
              confidence: 0.8,
              risk: 'low',
              confirmRequired: false
            })
          }
        };
      };

      // First turn
      await processor.process('deploy to vercel');

      // Second turn - check if context is included
      await processor.process('deploy again');

      expect(capturedPrompt).toContain('Recent Conversation');
      expect(capturedPrompt).toContain('deploy'); // Previous intent
    });
  });

  describe('Preference Learning', () => {
    it('should learn preferred provider', async () => {
      // Use vercel twice
      aiService.mockResponse('deploy', {
        intent: 'deploy',
        entities: { provider: 'vercel', env: 'staging' },
        confidence: 0.95,
        risk: 'moderate',
        confirmRequired: true
      });

      await processor.process('deploy to vercel');
      await processor.process('deploy app to vercel');

      const stats = processor.getStats();
      expect(stats.preferences).toBeGreaterThan(0);
    });

    it('should auto-fill missing entities from preferences', async () => {
      // First: Deploy to vercel
      aiService.mockResponse('deploy to vercel', {
        intent: 'deploy',
        entities: { provider: 'vercel' },
        confidence: 0.95,
        risk: 'moderate',
        confirmRequired: true
      });
      await processor.process('deploy to vercel');

      // Second: Just say "deploy" - should fill in vercel
      aiService.mockResponse('deploy', {
        intent: 'deploy',
        entities: {},
        confidence: 0.85,
        risk: 'moderate',
        confirmRequired: true
      });

      const result = await processor.process('deploy');

      // Provider should be filled from preferences
      expect(result.entities.provider).toBe('vercel');
    });
  });

  describe('Proactive Warnings', () => {
    it('should warn about production deployments', async () => {
      aiService.mockResponse('deploy to production', {
        intent: 'deploy',
        entities: { env: 'production' },
        confidence: 0.95,
        risk: 'high',
        confirmRequired: true
      });

      const result = await processor.process('deploy to production');

      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
      expect(result.warnings?.[0]).toContain('production');
    });

    it('should warn about rollbacks', async () => {
      aiService.mockResponse('rollback', {
        intent: 'rollback',
        entities: { env: 'production' },
        confidence: 0.9,
        risk: 'high',
        confirmRequired: true
      });

      const result = await processor.process('rollback production');

      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('destructive'))).toBe(true);
    });

    it('should warn when provider is missing', async () => {
      aiService.mockResponse('deploy', {
        intent: 'deploy',
        entities: { env: 'staging' },
        confidence: 0.8,
        risk: 'moderate',
        confirmRequired: true
      });

      const result = await processor.process('deploy to staging');

      expect(result.warnings?.some(w => w.includes('provider'))).toBe(true);
    });
  });

  describe('Enhanced Response Fields', () => {
    it('should include reasoning when provided', async () => {
      aiService.mockResponse('deploy', {
        intent: 'deploy',
        entities: { env: 'production' },
        confidence: 0.95,
        risk: 'high',
        confirmRequired: true,
        reasoning: 'User explicitly mentioned production environment'
      });

      const result = await processor.process('deploy to production');

      expect(result.reasoning).toBe('User explicitly mentioned production environment');
    });

    it('should include clarifying question when confidence low', async () => {
      aiService.mockResponse('deploy', {
        intent: 'deploy',
        entities: {},
        confidence: 0.6,
        risk: 'moderate',
        confirmRequired: true,
        clarifyingQuestion: 'Which environment would you like to deploy to?'
      });

      const result = await processor.process('deploy');

      expect(result.clarifyingQuestion).toBe('Which environment would you like to deploy to?');
    });

    it('should include suggested follow-up', async () => {
      aiService.mockResponse('deploy', {
        intent: 'deploy',
        entities: { env: 'production', provider: 'vercel' },
        confidence: 0.95,
        risk: 'high',
        confirmRequired: true,
        suggestedFollowUp: 'Would you like me to monitor the deployment?'
      });

      const result = await processor.process('deploy to production on vercel');

      expect(result.suggestedFollowUp).toBe('Would you like me to monitor the deployment?');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON response', async () => {
      aiService.sendMessage = async () => ({
        isSuccess: true,
        isFailure: false,
        value: { content: 'This is not JSON' }
      });

      await expect(processor.process('deploy')).rejects.toThrow('Failed to parse AI response');
    });

    it('should prevent concurrent processing', async () => {
      aiService.sendMessage = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          isSuccess: true,
          isFailure: false,
          value: { content: JSON.stringify({ intent: 'unknown', entities: {}, confidence: 0.5 }) }
        };
      };

      const promise1 = processor.process('first');
      const promise2 = processor.process('second');

      await expect(promise2).rejects.toThrow('Already processing');
      await promise1; // Let first one complete
    });

    it('should handle missing intent in response', async () => {
      aiService.sendMessage = async () => ({
        isSuccess: true,
        isFailure: false,
        value: { content: JSON.stringify({ entities: {}, confidence: 0.8 }) }
      });

      await expect(processor.process('deploy')).rejects.toThrow('Failed to parse AI response');
    });
  });

  describe('Memory Management', () => {
    it('should track conversation turns', async () => {
      aiService.mockResponse('deploy', {
        intent: 'deploy',
        entities: { provider: 'vercel' },
        confidence: 0.9,
        risk: 'moderate',
        confirmRequired: true
      });

      await processor.process('deploy to vercel');
      await processor.process('deploy to netlify');
      await processor.process('show logs');

      const stats = processor.getStats();
      expect(stats.turns).toBe(3);
    });

    it('should allow clearing memory', async () => {
      aiService.mockResponse('deploy', {
        intent: 'deploy',
        entities: { provider: 'vercel' },
        confidence: 0.9,
        risk: 'moderate',
        confirmRequired: true
      });

      await processor.process('deploy to vercel');

      expect(processor.getStats().turns).toBe(1);

      processor.clearMemory();

      expect(processor.getStats().turns).toBe(0);
    });

    it('should record explicit preferences', () => {
      processor.recordPreference({
        type: 'provider',
        value: 'vercel',
        confidence: 1.0,
        learnedAt: new Date().toISOString(),
        occurrences: 1
      });

      const stats = processor.getStats();
      expect(stats.preferences).toBe(1);
    });
  });

  describe('Project Context Integration', () => {
    it('should include project context in prompts when available', async () => {
      let capturedPrompt = '';
      aiService.sendMessage = async (prompt: string) => {
        capturedPrompt = prompt;
        return {
          isSuccess: true,
          isFailure: false,
          value: {
            content: JSON.stringify({
              intent: 'deploy',
              entities: {},
              confidence: 0.8,
              risk: 'low',
              confirmRequired: false
            })
          }
        };
      };

      // Set project context
      memory.setProjectContext({
        path: '/project',
        framework: 'next.js',
        lastDeployment: {
          provider: 'vercel',
          env: 'production',
          timestamp: new Date().toISOString(),
          success: true
        }
      });

      await processor.process('deploy');

      expect(capturedPrompt).toContain('Framework: next.js');
      expect(capturedPrompt).toContain('Last Deployment: vercel');
    });
  });
});
