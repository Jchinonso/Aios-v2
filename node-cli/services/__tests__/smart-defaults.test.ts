/**
 * @fileoverview SmartDefaultsEngine Comprehensive Test Suite
 * @description Tests for learned preferences and time-based safety rules
 */

import { SmartDefaultsEngine } from '../smart-defaults.js';
import type { ConversationMemory, PriorityType, EnvironmentType } from '../conversation-memory.v2.js';
import type { ParsedIntentType } from '../../nl-planner/types.js';

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock ConversationMemory
const createMockMemory = (overrides?: Partial<ConversationMemory>): ConversationMemory => ({
  getUserPriority: jest.fn().mockReturnValue('cost' as PriorityType),
  getProjectContext: jest.fn().mockReturnValue({
    lastDeployment: {
      timestamp: new Date(),
      provider: 'vercel',
      env: 'staging' as EnvironmentType,
      success: true,
    },
  }),
  getTurns: jest.fn().mockReturnValue([]),
  recordTurn: jest.fn(),
  learnFromIntent: jest.fn(),
  getPreferredProvider: jest.fn(),
  ...overrides,
} as unknown as ConversationMemory);

describe('SmartDefaultsEngine', () => {
  let engine: SmartDefaultsEngine;
  let mockMemory: ConversationMemory;

  beforeEach(() => {
    engine = new SmartDefaultsEngine(mockLogger as any);
    mockMemory = createMockMemory();
    jest.clearAllMocks();
  });

  describe('applyDefaults', () => {
    describe('Non-Deploy Intents', () => {
      it('should not apply defaults for non-deploy intents', () => {
        const intent: ParsedIntentType = {
          intent: 'status',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent).toEqual(intent);
        expect(result.reasoning).toEqual([]);
        expect(result.appliedDefaults).toEqual([]);
      });

      it('should handle scale intent without modification', () => {
        const intent: ParsedIntentType = {
          intent: 'scale',
          entities: { service: 'api' },
          confidence: 0.95,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent).toEqual(intent);
      });
    });

    describe('Provider Defaults from Priority', () => {
      it('should default to Railway for cost priority', () => {
        mockMemory.getUserPriority = jest.fn().mockReturnValue('cost');

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent.entities.provider).toBe('railway');
        expect(result.reasoning).toContain('Using railway (you prefer cost optimization)');
        expect(result.appliedDefaults).toContain('provider');
      });

      it('should default to Vercel for speed priority', () => {
        mockMemory.getUserPriority = jest.fn().mockReturnValue('speed');

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent.entities.provider).toBe('vercel');
        expect(result.reasoning).toContain('Using vercel (you prefer speed optimization)');
      });

      it('should default to AWS for safety priority', () => {
        mockMemory.getUserPriority = jest.fn().mockReturnValue('safety');

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent.entities.provider).toBe('aws');
        expect(result.reasoning).toContain('Using aws (you prefer safety optimization)');
      });

      it('should not override existing provider', () => {
        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: { provider: 'netlify' },
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent.entities.provider).toBe('netlify');
        expect(result.appliedDefaults).not.toContain('provider');
      });

      it('should handle missing user priority gracefully', () => {
        mockMemory.getUserPriority = jest.fn().mockReturnValue(null);

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent.entities.provider).toBeUndefined();
      });

      it('should handle invalid priority gracefully', () => {
        mockMemory.getUserPriority = jest.fn().mockReturnValue('invalid' as any);

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent.entities.provider).toBeUndefined();
      });
    });

    describe('Environment Defaults from Last Deployment', () => {
      it('should default to environment from last successful deployment', () => {
        mockMemory.getProjectContext = jest.fn().mockReturnValue({
          lastDeployment: {
            timestamp: new Date(),
            provider: 'vercel',
            env: 'staging' as EnvironmentType,
            success: true,
          },
        });

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent.entities.env).toBe('staging');
        expect(result.reasoning).toContain('Using staging (same as last time)');
        expect(result.appliedDefaults).toContain('env');
      });

      it('should not use environment from failed deployment', () => {
        mockMemory.getProjectContext = jest.fn().mockReturnValue({
          lastDeployment: {
            timestamp: new Date(),
            provider: 'vercel',
            env: 'production' as EnvironmentType,
            success: false,
          },
        });

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent.entities.env).toBeUndefined();
      });

      it('should not override existing environment', () => {
        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: { env: 'production' },
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent.entities.env).toBe('production');
        expect(result.appliedDefaults).not.toContain('env');
      });

      it('should handle missing project context gracefully', () => {
        mockMemory.getProjectContext = jest.fn().mockReturnValue(null);

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent.entities.env).toBeUndefined();
      });

      it('should handle invalid environment type gracefully', () => {
        mockMemory.getProjectContext = jest.fn().mockReturnValue({
          lastDeployment: {
            timestamp: new Date(),
            provider: 'vercel',
            env: 'invalid-env' as any,
            success: true,
          },
        });

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent.entities.env).toBeUndefined();
      });
    });

    describe('Time-Based Safety Overrides', () => {
      it('should apply time-based safety overrides when needed', () => {
        mockMemory.getProjectContext = jest.fn().mockReturnValue({
          lastDeployment: {
            timestamp: new Date(),
            provider: 'vercel',
            env: 'production' as EnvironmentType,
            success: true,
          },
        });

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        // Result depends on actual time, just verify it works
        expect(result.intent).toBeDefined();
        expect(result.intent.entities.env).toBeDefined();
      });

      it('should handle timezone parameter', () => {
        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        // Should not throw
        expect(() => {
          engine.applyDefaults(intent, mockMemory, 'America/New_York');
        }).not.toThrow();
      });

      it('should handle invalid timezone gracefully', () => {
        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        // Should not throw, should default to safe
        expect(() => {
          engine.applyDefaults(intent, mockMemory, 'Invalid/Timezone');
        }).not.toThrow();
      });
    });

    describe('Error Handling', () => {
      it('should handle getUserPriority error gracefully', () => {
        mockMemory.getUserPriority = jest.fn().mockImplementation(() => {
          throw new Error('Memory error');
        });

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        // Should still work (provider default will fail, but env might succeed)
        expect(result.intent).toBeDefined();
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should handle memory method throwing error', () => {
        mockMemory.getProjectContext = jest.fn().mockImplementation(() => {
          throw new Error('Context error');
        });

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        // Should still apply provider default (independent error handling)
        expect(result.intent.entities.provider).toBeDefined();
      });
    });

    describe('Combined Defaults', () => {
      it('should apply both provider and environment defaults', () => {
        mockMemory.getUserPriority = jest.fn().mockReturnValue('cost');
        mockMemory.getProjectContext = jest.fn().mockReturnValue({
          lastDeployment: {
            timestamp: new Date(),
            provider: 'vercel',
            env: 'staging' as EnvironmentType,
            success: true,
          },
        });

        const intent: ParsedIntentType = {
          intent: 'deploy',
          entities: {},
          confidence: 0.9,
        };

        const result = engine.applyDefaults(intent, mockMemory);

        expect(result.intent.entities.provider).toBe('railway');
        expect(result.intent.entities.env).toBe('staging');
        expect(result.appliedDefaults).toContain('provider');
        expect(result.appliedDefaults).toContain('env');
        expect(result.reasoning.length).toBe(2);
      });
    });
  });

  describe('Reasoning Output', () => {
    it('should provide clear reasoning for each default', () => {
      mockMemory.getUserPriority = jest.fn().mockReturnValue('speed');

      const intent: ParsedIntentType = {
        intent: 'deploy',
        entities: {},
        confidence: 0.9,
      };

      const result = engine.applyDefaults(intent, mockMemory);

      expect(result.reasoning).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/vercel.*speed/i),
          expect.stringMatching(/staging.*same as last time/i),
        ])
      );
    });

    it('should track which defaults were applied', () => {
      mockMemory.getUserPriority = jest.fn().mockReturnValue('cost');

      const intent: ParsedIntentType = {
        intent: 'deploy',
        entities: {},
        confidence: 0.9,
      };

      const result = engine.applyDefaults(intent, mockMemory);

      expect(result.appliedDefaults).toEqual(['provider', 'env']);
    });
  });
});
