/**
 * @fileoverview Provider Selector Unit Tests
 * @description Comprehensive unit tests for the ProviderSelector utility,
 * testing recommendation algorithms, scoring logic, and provider matching.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderSelector } from '../../../utils/provider-selector.js';
import type {
  ProviderSelectionPreferences,
} from '../../../utils/provider-selector.js';
import type {
  ProjectAnalysis,
  FrameworkType,
  ProgrammingLanguage,
} from '../../../types/deployment.types.js';

describe('ProviderSelector Unit Tests', () => {
  let providerSelector: ProviderSelector;

  beforeEach(() => {
    providerSelector = new ProviderSelector();
  });

  describe('Framework Compatibility Scoring', () => {
    it('should score Vercel highest for Next.js projects', async () => {
      const nextjsAnalysis: ProjectAnalysis = {
        framework: 'nextjs',
        language: 'typescript',
        packageManager: 'npm',
        dependencies: [
          { name: 'next', version: '^14.0.0', type: 'production' },
          { name: 'react', version: '^18.0.0', type: 'production' },
        ],
        buildCommand: 'next build',
        startCommand: 'next start',
        outputDirectory: '.next',
        environmentVariables: [],
        size: 'medium',
        complexity: 'moderate',
        estimatedBuildTime: 5,
        hasDatabase: false,
        hasDockerfile: false,
        recommendations: [],
      };

      const recommendations = await providerSelector.recommend(nextjsAnalysis);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].provider).toBe('vercel');
      expect(recommendations[0].score).toBeGreaterThan(90);
      expect(recommendations[0].tier).toBe('excellent');
    });

    it('should prioritize Netlify for static sites', async () => {
      const staticAnalysis: ProjectAnalysis = {
        framework: 'static',
        language: 'javascript',
        packageManager: 'npm',
        dependencies: [],
        buildCommand: 'npm run build',
        startCommand: '',
        outputDirectory: 'dist',
        environmentVariables: [],
        size: 'small',
        complexity: 'simple',
        estimatedBuildTime: 2,
        hasDatabase: false,
        hasDockerfile: false,
        recommendations: [],
      };

      const recommendations = await providerSelector.recommend(staticAnalysis);

      expect(recommendations).toBeDefined();
      const netlifyRecommendation = recommendations.find(r => r.provider === 'netlify');
      expect(netlifyRecommendation).toBeDefined();
      expect(netlifyRecommendation!.score).toBeGreaterThan(85);
    });

    it('should recommend database-capable providers for projects with databases', async () => {
      const databaseAnalysis: ProjectAnalysis = {
        framework: 'express',
        language: 'typescript',
        packageManager: 'npm',
        dependencies: [
          { name: 'express', version: '^4.18.0', type: 'production' },
          { name: 'pg', version: '^8.8.0', type: 'production' },
        ],
        buildCommand: 'npm run build',
        startCommand: 'npm start',
        outputDirectory: 'dist',
        environmentVariables: [],
        size: 'medium',
        complexity: 'moderate',
        estimatedBuildTime: 8,
        hasDatabase: true,
        databaseType: 'postgresql',
        hasDockerfile: false,
        recommendations: [],
      };

      const recommendations = await providerSelector.recommend(databaseAnalysis);

      expect(recommendations).toBeDefined();
      const topRecommendations = recommendations.slice(0, 3);
      const databaseProviders = ['railway', 'render', 'aws'];

      expect(topRecommendations.some(r => databaseProviders.includes(r.provider))).toBe(true);

      const railwayRecommendation = recommendations.find(r => r.provider === 'railway');
      expect(railwayRecommendation?.supportedFeatures).toContain('managed-databases');
    });
  });

  describe('Preference-Based Recommendations', () => {
    const baseAnalysis: ProjectAnalysis = {
      framework: 'react',
      language: 'typescript',
      packageManager: 'npm',
      dependencies: [
        { name: 'react', version: '^18.0.0', type: 'production' },
      ],
      buildCommand: 'npm run build',
      startCommand: 'npm start',
      outputDirectory: 'build',
      environmentVariables: [],
      size: 'medium',
      complexity: 'moderate',
      estimatedBuildTime: 5,
      hasDatabase: false,
      hasDockerfile: false,
      recommendations: [],
    };

    it('should prioritize cost optimization when requested', async () => {
      const preferences: ProviderSelectionPreferences = {
        costOptimization: true,
        maxBudget: 10,
      };

      const recommendations = await providerSelector.recommend(baseAnalysis, preferences);

      expect(recommendations).toBeDefined();
      const topRecommendation = recommendations[0];
      expect(topRecommendation.estimatedCost.freeTier || topRecommendation.estimatedCost.monthlyEstimate.includes('$0')).toBeTruthy();
    });

    it('should prioritize performance when requested', async () => {
      const preferences: ProviderSelectionPreferences = {
        performanceFirst: true,
      };

      const recommendations = await providerSelector.recommend(baseAnalysis, preferences);

      expect(recommendations).toBeDefined();
      const topProviders = recommendations.slice(0, 3).map(r => r.provider);
      expect(topProviders).toEqual(expect.arrayContaining(['vercel', 'cloudflare']));
    });

    it('should prioritize simplicity when requested', async () => {
      const preferences: ProviderSelectionPreferences = {
        simplicityFirst: true,
      };

      const recommendations = await providerSelector.recommend(baseAnalysis, preferences);

      expect(recommendations).toBeDefined();
      const topRecommendation = recommendations[0];
      expect(['minimal', 'simple']).toContain(topRecommendation.setupComplexity);
      expect(['vercel', 'netlify']).toContain(topRecommendation.provider);
    });

    it('should exclude specified providers', async () => {
      const preferences: ProviderSelectionPreferences = {
        excludeProviders: ['vercel', 'netlify'],
      };

      const recommendations = await providerSelector.recommend(baseAnalysis, preferences);

      expect(recommendations).toBeDefined();
      recommendations.forEach(recommendation => {
        expect(recommendation.provider).not.toBe('vercel');
        expect(recommendation.provider).not.toBe('netlify');
      });
    });

    it('should give preference bonus to preferred providers', async () => {
      const preferences: ProviderSelectionPreferences = {
        preferredProviders: ['railway'],
      };

      const recommendations = await providerSelector.recommend(baseAnalysis, preferences);

      expect(recommendations).toBeDefined();
      const railwayRecommendation = recommendations.find(r => r.provider === 'railway');
      expect(railwayRecommendation).toBeDefined();

      // Railway should get a preference bonus
      const baseRecommendations = await providerSelector.recommend(baseAnalysis);
      const baseRailwayScore = baseRecommendations.find(r => r.provider === 'railway')?.score || 0;
      expect(railwayRecommendation!.score).toBeGreaterThanOrEqual(baseRailwayScore);
    });

    it('should filter by required features', async () => {
      const preferences: ProviderSelectionPreferences = {
        requiredFeatures: ['docker-support', 'managed-databases'],
      };

      const recommendations = await providerSelector.recommend(baseAnalysis, preferences);

      expect(recommendations).toBeDefined();
      recommendations.forEach(recommendation => {
        expect(recommendation.supportedFeatures).toContain('docker-support');
        expect(recommendation.supportedFeatures).toContain('managed-databases');
      });
    });
  });

  describe('Scoring Algorithm', () => {
    const testAnalysis: ProjectAnalysis = {
      framework: 'vue',
      language: 'typescript',
      packageManager: 'npm',
      dependencies: [],
      buildCommand: 'npm run build',
      startCommand: 'npm start',
      outputDirectory: 'dist',
      environmentVariables: [],
      size: 'medium',
      complexity: 'moderate',
      estimatedBuildTime: 5,
      hasDatabase: false,
      hasDockerfile: false,
      recommendations: [],
    };

    it('should return scores between 0 and 100', async () => {
      const recommendations = await providerSelector.recommend(testAnalysis);

      expect(recommendations).toBeDefined();
      recommendations.forEach(recommendation => {
        expect(recommendation.score).toBeGreaterThanOrEqual(0);
        expect(recommendation.score).toBeLessThanOrEqual(100);
      });
    });

    it('should sort recommendations by score in descending order', async () => {
      const recommendations = await providerSelector.recommend(testAnalysis);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(1);

      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1].score).toBeGreaterThanOrEqual(recommendations[i].score);
      }
    });

    it('should assign appropriate tiers based on scores', async () => {
      const recommendations = await providerSelector.recommend(testAnalysis);

      expect(recommendations).toBeDefined();
      recommendations.forEach(recommendation => {
        if (recommendation.score >= 85) {
          expect(recommendation.tier).toBe('excellent');
        } else if (recommendation.score >= 70) {
          expect(recommendation.tier).toBe('good');
        } else if (recommendation.score >= 55) {
          expect(recommendation.tier).toBe('acceptable');
        } else {
          expect(recommendation.tier).toBe('poor');
        }
      });
    });
  });

  describe('Recommendation Details', () => {
    const analysisWithDocker: ProjectAnalysis = {
      framework: 'express',
      language: 'typescript',
      packageManager: 'npm',
      dependencies: [
        { name: 'express', version: '^4.18.0', type: 'production' },
      ],
      buildCommand: 'npm run build',
      startCommand: 'npm start',
      outputDirectory: 'dist',
      environmentVariables: [],
      size: 'medium',
      complexity: 'moderate',
      estimatedBuildTime: 8,
      hasDatabase: false,
      hasDockerfile: true,
      recommendations: [],
    };

    it('should provide detailed reasoning for recommendations', async () => {
      const recommendations = await providerSelector.recommend(analysisWithDocker);

      expect(recommendations).toBeDefined();
      recommendations.forEach(recommendation => {
        expect(recommendation.reasoning).toBeDefined();
        expect(recommendation.reasoning.length).toBeGreaterThan(0);
        expect(typeof recommendation.reasoning).toBe('string');
      });

      // Docker-supporting providers should mention Docker in reasoning
      const dockerProviders = recommendations.filter(r =>
        r.supportedFeatures.includes('docker-support')
      );

      expect(dockerProviders.length).toBeGreaterThan(0);
      const dockerProvider = dockerProviders[0];
      expect(dockerProvider.reasoning.toLowerCase()).toContain('docker');
    });

    it('should provide accurate deployment time estimates', async () => {
      const recommendations = await providerSelector.recommend(analysisWithDocker);

      expect(recommendations).toBeDefined();
      recommendations.forEach(recommendation => {
        expect(recommendation.deploymentTime).toBeDefined();
        expect(recommendation.deploymentTime).toMatch(/^\d+-\d+ minutes$/);
      });
    });

    it('should list provider limitations', async () => {
      const recommendations = await providerSelector.recommend(analysisWithDocker);

      expect(recommendations).toBeDefined();
      recommendations.forEach(recommendation => {
        expect(recommendation.limitations).toBeDefined();
        expect(Array.isArray(recommendation.limitations)).toBe(true);
        expect(recommendation.limitations.length).toBeGreaterThan(0);

        recommendation.limitations.forEach(limitation => {
          expect(typeof limitation).toBe('string');
          expect(limitation.length).toBeGreaterThan(0);
        });
      });
    });

    it('should provide key features for each provider', async () => {
      const recommendations = await providerSelector.recommend(analysisWithDocker);

      expect(recommendations).toBeDefined();
      recommendations.forEach(recommendation => {
        expect(recommendation.keyFeatures).toBeDefined();
        expect(Array.isArray(recommendation.keyFeatures)).toBe(true);
        expect(recommendation.keyFeatures.length).toBeGreaterThan(0);

        recommendation.keyFeatures.forEach(feature => {
          expect(typeof feature).toBe('string');
          expect(feature.length).toBeGreaterThan(0);
        });
      });
    });

    it('should assess migration complexity appropriately', async () => {
      const recommendations = await providerSelector.recommend(analysisWithDocker);

      expect(recommendations).toBeDefined();
      recommendations.forEach(recommendation => {
        expect(recommendation.migrationComplexity).toBeDefined();
        expect(['minimal', 'simple', 'moderate', 'complex']).toContain(recommendation.migrationComplexity);

        // Migration complexity should generally be higher than setup complexity
        const setupComplexities = ['minimal', 'simple', 'moderate', 'complex'];
        const setupIndex = setupComplexities.indexOf(recommendation.setupComplexity);
        const migrationIndex = setupComplexities.indexOf(recommendation.migrationComplexity);
        expect(migrationIndex).toBeGreaterThanOrEqual(setupIndex);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle unknown frameworks gracefully', async () => {
      const unknownFrameworkAnalysis: ProjectAnalysis = {
        framework: 'unknown' as FrameworkType,
        language: 'typescript',
        packageManager: 'npm',
        dependencies: [],
        buildCommand: 'npm run build',
        startCommand: 'npm start',
        outputDirectory: 'dist',
        environmentVariables: [],
        size: 'medium',
        complexity: 'moderate',
        estimatedBuildTime: 5,
        hasDatabase: false,
        hasDockerfile: false,
        recommendations: [],
      };

      const recommendations = await providerSelector.recommend(unknownFrameworkAnalysis);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);

      // Should still provide recommendations, though scores might be lower
      recommendations.forEach(recommendation => {
        expect(recommendation.score).toBeGreaterThanOrEqual(0);
        expect(recommendation.reasoning).toBeDefined();
      });
    });

    it('should handle empty preferences object', async () => {
      const analysis: ProjectAnalysis = {
        framework: 'react',
        language: 'javascript',
        packageManager: 'npm',
        dependencies: [],
        buildCommand: 'npm run build',
        startCommand: 'npm start',
        outputDirectory: 'build',
        environmentVariables: [],
        size: 'small',
        complexity: 'simple',
        estimatedBuildTime: 3,
        hasDatabase: false,
        hasDockerfile: false,
        recommendations: [],
      };

      const recommendations = await providerSelector.recommend(analysis, {});

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should handle conflicting preferences appropriately', async () => {
      const analysis: ProjectAnalysis = {
        framework: 'nextjs',
        language: 'typescript',
        packageManager: 'npm',
        dependencies: [],
        buildCommand: 'next build',
        startCommand: 'next start',
        outputDirectory: '.next',
        environmentVariables: [],
        size: 'large',
        complexity: 'advanced',
        estimatedBuildTime: 15,
        hasDatabase: true,
        hasDockerfile: true,
        recommendations: [],
      };

      const conflictingPreferences: ProviderSelectionPreferences = {
        costOptimization: true,
        performanceFirst: true,
        simplicityFirst: true,
        maxBudget: 5, // Very low budget
        requiredFeatures: ['managed-databases', 'auto-scaling', 'edge-functions'],
      };

      const recommendations = await providerSelector.recommend(analysis, conflictingPreferences);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);

      // Should balance conflicting requirements reasonably
      const topRecommendation = recommendations[0];
      expect(topRecommendation.score).toBeGreaterThan(0);
      expect(topRecommendation.reasoning).toBeDefined();
    });
  });
});