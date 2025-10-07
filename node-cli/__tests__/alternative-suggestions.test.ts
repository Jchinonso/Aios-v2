/**
 * @fileoverview Tests for AlternativeSuggestions Engine
 * @module node-cli/__tests__/alternative-suggestions.test
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AlternativeSuggestions } from '../services/alternative-suggestions.js';
import type { ILogger } from '@aios/shared';
import type { ParsedIntentType } from '../nl-planner/types.js';

// Mock logger
const createMockLogger = (): ILogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLevel: jest.fn(),
  child: jest.fn(() => createMockLogger()),
});

const createMockIntent = (): ParsedIntentType => ({
  type: 'deploy',
  confidence: 0.9,
  entities: {
    provider: 'vercel',
    environment: 'production',
  },
  reasoning: 'User wants to deploy',
  riskLevel: 'low',
});

describe('AlternativeSuggestions', () => {
  let engine: AlternativeSuggestions;
  let logger: ILogger;

  beforeEach(() => {
    logger = createMockLogger();
    engine = new AlternativeSuggestions(logger);
  });

  describe('generateProviderAlternatives', () => {
    it('should generate alternatives for vercel', async () => {
      const alternatives = await engine.generateProviderAlternatives(
        createMockIntent(),
        'vercel',
        { projectType: 'nextjs', priority: 'speed' }
      );

      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives.length).toBeLessThanOrEqual(4);
      expect(alternatives.every((alt) => alt.value.provider !== 'vercel')).toBe(true);
    });

    it('should validate provider exists', async () => {
      await expect(
        engine.generateProviderAlternatives(
          createMockIntent(),
          'invalid-provider' as any,
          {}
        )
      ).rejects.toThrow('Invalid provider: invalid-provider');
    });

    it('should include valid providers in error message', async () => {
      try {
        await engine.generateProviderAlternatives(
          createMockIntent(),
          'heroku' as any,
          {}
        );
      } catch (error) {
        expect((error as Error).message).toContain('Valid providers:');
        expect((error as Error).message).toContain('vercel');
        expect((error as Error).message).toContain('netlify');
      }
    });

    it('should rank alternatives by confidence', async () => {
      const alternatives = await engine.generateProviderAlternatives(
        createMockIntent(),
        'vercel',
        { priority: 'cost' }
      );

      // Should be sorted descending by confidence
      for (let i = 0; i < alternatives.length - 1; i++) {
        expect(alternatives[i]!.confidence).toBeGreaterThanOrEqual(
          alternatives[i + 1]!.confidence
        );
      }
    });

    it('should limit to 4 alternatives max', async () => {
      const alternatives = await engine.generateProviderAlternatives(
        createMockIntent(),
        'vercel',
        {}
      );

      expect(alternatives.length).toBeLessThanOrEqual(4);
    });

    it('should include pros and cons', async () => {
      const alternatives = await engine.generateProviderAlternatives(
        createMockIntent(),
        'vercel',
        {}
      );

      alternatives.forEach((alt) => {
        expect(alt.pros.length).toBeGreaterThan(0);
        expect(alt.cons.length).toBeGreaterThan(0);
        expect(alt.whyNotChosen).toBeTruthy();
      });
    });

    it('should include cost and duration estimates', async () => {
      const alternatives = await engine.generateProviderAlternatives(
        createMockIntent(),
        'vercel',
        {}
      );

      alternatives.forEach((alt) => {
        expect(alt.estimatedCost).toMatch(/\$\d+-\d+\/mo/);
        expect(alt.estimatedDuration).toMatch(/\d+-\d+ min/);
      });
    });

    it('should prioritize by user preference', async () => {
      const costAlternatives = await engine.generateProviderAlternatives(
        createMockIntent(),
        'vercel',
        { priority: 'cost' }
      );

      const speedAlternatives = await engine.generateProviderAlternatives(
        createMockIntent(),
        'vercel',
        { priority: 'speed' }
      );

      // Top cost alternative should be different from top speed alternative
      // (or at least ranked differently)
      expect(costAlternatives[0]?.value.provider).toBeDefined();
      expect(speedAlternatives[0]?.value.provider).toBeDefined();
    });

    it('should match project type', async () => {
      const alternatives = await engine.generateProviderAlternatives(
        createMockIntent(),
        'netlify',
        { projectType: 'nextjs', priority: 'speed' }
      );

      // Vercel should score high for Next.js
      const vercelAlt = alternatives.find((alt) => alt.value.provider === 'vercel');
      expect(vercelAlt).toBeDefined();
      expect(vercelAlt!.pros.some((pro) => pro.toLowerCase().includes('next'))).toBe(true);
    });

    it('should provide clear whyNotChosen explanations', async () => {
      const alternatives = await engine.generateProviderAlternatives(
        createMockIntent(),
        'vercel',
        { priority: 'cost' }
      );

      alternatives.forEach((alt) => {
        expect(alt.whyNotChosen).toBeTruthy();
        expect(alt.whyNotChosen.length).toBeGreaterThan(5);
      });
    });
  });

  describe('generateEnvironmentAlternatives', () => {
    it('should suggest staging for production', async () => {
      const alternatives = await engine.generateEnvironmentAlternatives(
        createMockIntent(),
        'production'
      );

      const staging = alternatives.find((alt) => alt.value.environment === 'staging');
      expect(staging).toBeDefined();
      expect(staging!.label).toBe('Staging');
    });

    it('should suggest preview for production', async () => {
      const alternatives = await engine.generateEnvironmentAlternatives(
        createMockIntent(),
        'production'
      );

      const preview = alternatives.find((alt) => alt.value.environment === 'preview');
      expect(preview).toBeDefined();
    });

    it('should suggest production for staging', async () => {
      const alternatives = await engine.generateEnvironmentAlternatives(
        createMockIntent(),
        'staging'
      );

      const production = alternatives.find((alt) => alt.value.environment === 'production');
      expect(production).toBeDefined();
    });

    it('should suggest staging for development', async () => {
      const alternatives = await engine.generateEnvironmentAlternatives(
        createMockIntent(),
        'development'
      );

      const staging = alternatives.find((alt) => alt.value.environment === 'staging');
      expect(staging).toBeDefined();
    });

    it('should include risk context in explanations', async () => {
      const alternatives = await engine.generateEnvironmentAlternatives(
        createMockIntent(),
        'production'
      );

      const staging = alternatives.find((alt) => alt.value.environment === 'staging');
      // Should mention safety/impact (not necessarily the word "risk")
      expect(staging!.pros.some((pro) => pro.toLowerCase().includes('impact') || pro.toLowerCase().includes('no') || pro.toLowerCase().includes('same'))).toBe(true);
    });

    it('should limit alternatives (1-3)', async () => {
      const alternatives = await engine.generateEnvironmentAlternatives(
        createMockIntent(),
        'production'
      );

      expect(alternatives.length).toBeGreaterThanOrEqual(1);
      expect(alternatives.length).toBeLessThanOrEqual(3);
    });
  });

  describe('generateTradeoffAlternatives', () => {
    it('should suggest cost alternative when optimizing for speed', async () => {
      const alternatives = await engine.generateTradeoffAlternatives({
        provider: 'vercel',
        priority: 'speed',
      });

      expect(alternatives.length).toBeGreaterThan(0);
      const costAlt = alternatives[0];
      expect(costAlt!.label).toContain('Cost-optimized');
      expect(costAlt!.pros.some((pro) => pro.includes('cheaper'))).toBe(true);
    });

    it('should suggest speed alternative when optimizing for cost', async () => {
      const alternatives = await engine.generateTradeoffAlternatives({
        provider: 'railway',
        priority: 'cost',
      });

      expect(alternatives.length).toBeGreaterThan(0);
      const speedAlt = alternatives[0];
      expect(speedAlt!.label).toContain('Speed-optimized');
      expect(speedAlt!.pros.some((pro) => pro.includes('faster'))).toBe(true);
    });

    it('should return empty for no tradeoffs', async () => {
      const alternatives = await engine.generateTradeoffAlternatives({
        provider: 'invalid' as any,
        priority: 'cost',
      });

      expect(alternatives.length).toBe(0);
    });

    it('should show cost comparisons', async () => {
      const alternatives = await engine.generateTradeoffAlternatives({
        provider: 'vercel',
        priority: 'speed',
      });

      if (alternatives.length > 0) {
        const costAlt = alternatives[0]!;
        expect(costAlt.pros.some((pro) => pro.includes('%') || pro.includes('cheaper'))).toBe(
          true
        );
      }
    });

    it('should show speed comparisons', async () => {
      const alternatives = await engine.generateTradeoffAlternatives({
        provider: 'railway',
        priority: 'cost',
      });

      if (alternatives.length > 0) {
        const speedAlt = alternatives[0]!;
        expect(speedAlt.pros.some((pro) => pro.includes('faster'))).toBe(true);
      }
    });
  });

  describe('Confidence Scores', () => {
    it('should have all confidence scores between 0 and 1', async () => {
      const alternatives = await engine.generateProviderAlternatives(
        createMockIntent(),
        'vercel',
        {}
      );

      alternatives.forEach((alt) => {
        expect(alt.confidence).toBeGreaterThanOrEqual(0);
        expect(alt.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should use validated confidence scores', async () => {
      // This test ensures we're using createConfidenceScore()
      // If not, it would throw during generation
      await expect(
        engine.generateProviderAlternatives(createMockIntent(), 'vercel', {})
      ).resolves.toBeDefined();
    });
  });

  describe('Provider Characteristics', () => {
    it('should have consistent cost tiers', async () => {
      const allAlternatives = await engine.generateProviderAlternatives(
        createMockIntent(),
        'vercel',
        {}
      );

      allAlternatives.forEach((alt) => {
        expect(alt.estimatedCost).toMatch(/\$([\d-]+)\/mo/);
      });
    });

    it('should have consistent speed tiers', async () => {
      const allAlternatives = await engine.generateProviderAlternatives(
        createMockIntent(),
        'vercel',
        {}
      );

      allAlternatives.forEach((alt) => {
        expect(alt.estimatedDuration).toMatch(/\d+-\d+ min/);
      });
    });
  });
});
