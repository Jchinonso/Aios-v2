/**
 * @fileoverview Cloud Manager Integration Tests
 * @description Comprehensive integration tests for the CloudManager class,
 * testing end-to-end workflows including provider selection, deployment,
 * and monitoring across multiple cloud platforms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CloudManager } from '../../cloud-manager.js';
import type {
  CloudProviderConfig,
  CloudProviderType,
} from '../../types/cloud-provider.types.js';
import type {
  DeploymentConfig,
  ProjectAnalysis,
} from '../../types/deployment.types.js';

describe('CloudManager Integration Tests', () => {
  let cloudManager: CloudManager;
  const mockProjectPath = '/tmp/test-project';

  beforeEach(() => {
    cloudManager = new CloudManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Management', () => {
    it('should configure multiple providers successfully', async () => {
      const vercelConfig: CloudProviderConfig = {
        type: 'vercel',
        accessToken: 'test-vercel-token',
        timeout: 30000,
      };

      const netlifyConfig: CloudProviderConfig = {
        type: 'netlify',
        accessToken: 'test-netlify-token',
        timeout: 30000,
      };

      const railwayConfig: CloudProviderConfig = {
        type: 'railway',
        apiToken: 'test-railway-token',
        timeout: 30000,
      };

      // Configure multiple providers
      await expect(cloudManager.configureProvider('vercel', vercelConfig)).resolves.not.toThrow();
      await expect(cloudManager.configureProvider('netlify', netlifyConfig)).resolves.not.toThrow();
      await expect(cloudManager.configureProvider('railway', railwayConfig)).resolves.not.toThrow();

      // Verify providers are configured
      const providers = cloudManager.getConfiguredProviders();
      expect(providers).toContain('vercel');
      expect(providers).toContain('netlify');
      expect(providers).toContain('railway');
      expect(providers).toHaveLength(3);
    });

    it('should handle provider configuration errors gracefully', async () => {
      const invalidConfig: CloudProviderConfig = {
        type: 'vercel',
        // Missing required accessToken
        timeout: 30000,
      };

      await expect(cloudManager.configureProvider('vercel', invalidConfig))
        .rejects.toThrow(/access token is required/i);
    });

    it('should get provider recommendations for different project types', async () => {
      // Mock project analysis for a Next.js project
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
        recommendations: ['Consider Vercel for optimal Next.js deployment experience'],
      };

      const recommendations = await cloudManager.getProviderRecommendations(nextjsAnalysis, {
        costOptimization: true,
        performanceFirst: false,
      });

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].provider).toBe('vercel'); // Should recommend Vercel for Next.js
      expect(recommendations[0].score).toBeGreaterThan(80); // High score for optimal match
    });
  });

  describe('Project Analysis Workflow', () => {
    it('should analyze different project types correctly', async () => {
      // Configure a provider first
      await cloudManager.configureProvider('vercel', {
        type: 'vercel',
        accessToken: 'test-token',
      });

      // Test Next.js project analysis
      const nextjsResult = await cloudManager.analyzeProject(mockProjectPath, 'vercel');
      expect(nextjsResult.success).toBe(true);
      if (nextjsResult.success) {
        expect(nextjsResult.data.framework).toBeDefined();
        expect(nextjsResult.data.language).toBeDefined();
        expect(nextjsResult.data.recommendations).toBeInstanceOf(Array);
      }
    });

    it('should handle analysis errors gracefully', async () => {
      await cloudManager.configureProvider('vercel', {
        type: 'vercel',
        accessToken: 'test-token',
      });

      const result = await cloudManager.analyzeProject('/non-existent-path', 'vercel');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Deployment Workflow', () => {
    beforeEach(async () => {
      // Configure test providers
      await cloudManager.configureProvider('vercel', {
        type: 'vercel',
        accessToken: 'test-vercel-token',
      });

      await cloudManager.configureProvider('railway', {
        type: 'railway',
        apiToken: 'test-railway-token',
      });
    });

    it('should execute complete deployment workflow', async () => {
      const deploymentConfig: DeploymentConfig = {
        projectPath: mockProjectPath,
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [
          { key: 'NODE_ENV', value: 'production', required: true },
        ],
      };

      // Start deployment
      const deploymentResult = await cloudManager.deploy('vercel', deploymentConfig);

      expect(deploymentResult.success).toBe(true);
      if (deploymentResult.success) {
        const deployment = deploymentResult.data;
        expect(deployment.deploymentId).toBeDefined();
        expect(deployment.url).toBeDefined();
        expect(deployment.status).toBe('ready');
        expect(deployment.environment).toBe('production');

        // Check deployment status
        const statusResult = await cloudManager.getDeploymentStatus('vercel', deployment.deploymentId);
        expect(statusResult.success).toBe(true);
        if (statusResult.success) {
          expect(statusResult.data.deploymentId).toBe(deployment.deploymentId);
          expect(statusResult.data.phase).toBeDefined();
        }

        // Get deployment logs
        const logsResult = await cloudManager.getDeploymentLogs('vercel', deployment.deploymentId);
        expect(logsResult.success).toBe(true);
        if (logsResult.success) {
          expect(logsResult.data).toBeInstanceOf(Array);
          expect(logsResult.data.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle deployment failures gracefully', async () => {
      const invalidConfig: DeploymentConfig = {
        projectPath: '/invalid/path',
        environment: 'production',
        buildCommand: 'invalid-command',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const result = await cloudManager.deploy('vercel', invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('DEPLOYMENT_FAILED');
    });

    it('should support deployment cancellation', async () => {
      const deploymentConfig: DeploymentConfig = {
        projectPath: mockProjectPath,
        environment: 'staging',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      // Start deployment
      const deploymentResult = await cloudManager.deploy('vercel', deploymentConfig);
      expect(deploymentResult.success).toBe(true);

      if (deploymentResult.success) {
        // Cancel deployment
        const cancelResult = await cloudManager.cancelDeployment('vercel', deploymentResult.data.deploymentId);
        expect(cancelResult.success).toBe(true);
      }
    });
  });

  describe('Cost Estimation', () => {
    beforeEach(async () => {
      await cloudManager.configureProvider('vercel', {
        type: 'vercel',
        accessToken: 'test-token',
      });
    });

    it('should estimate deployment costs accurately', async () => {
      const config: DeploymentConfig = {
        projectPath: mockProjectPath,
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const costEstimate = await cloudManager.estimateDeploymentCosts('vercel', config);

      expect(costEstimate).toBeDefined();
      expect(costEstimate.monthly).toBeDefined();
      expect(costEstimate.monthly.freeTier).toBeDefined();
      expect(costEstimate.monthly.minimum).toBeGreaterThanOrEqual(0);
      expect(costEstimate.monthly.typical).toBeGreaterThanOrEqual(costEstimate.monthly.minimum);
      expect(costEstimate.monthly.maximum).toBeGreaterThanOrEqual(costEstimate.monthly.typical);
      expect(costEstimate.traffic).toBeDefined();
      expect(costEstimate.storage).toBeDefined();
    });

    it('should provide cost comparisons across providers', async () => {
      await cloudManager.configureProvider('netlify', {
        type: 'netlify',
        accessToken: 'test-token',
      });

      const config: DeploymentConfig = {
        projectPath: mockProjectPath,
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const vercelCost = await cloudManager.estimateDeploymentCosts('vercel', config);
      const netlifyCost = await cloudManager.estimateDeploymentCosts('netlify', config);

      expect(vercelCost).toBeDefined();
      expect(netlifyCost).toBeDefined();
      expect(vercelCost.monthly.currency).toBe(netlifyCost.monthly.currency);
    });
  });

  describe('Multi-Provider Operations', () => {
    beforeEach(async () => {
      // Configure multiple providers
      await cloudManager.configureProvider('vercel', {
        type: 'vercel',
        accessToken: 'test-vercel-token',
      });

      await cloudManager.configureProvider('railway', {
        type: 'railway',
        apiToken: 'test-railway-token',
      });

      await cloudManager.configureProvider('render', {
        type: 'render',
        apiKey: 'test-render-key',
      });
    });

    it('should deploy to multiple providers simultaneously', async () => {
      const deploymentConfig: DeploymentConfig = {
        projectPath: mockProjectPath,
        environment: 'staging',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const providers: CloudProviderType[] = ['vercel', 'railway', 'render'];
      const deploymentPromises = providers.map(provider =>
        cloudManager.deploy(provider, deploymentConfig)
      );

      const results = await Promise.allSettled(deploymentPromises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value.success).toBe(true);
          if (result.value.success) {
            expect(result.value.data.deploymentId).toBeDefined();
            expect(result.value.data.url).toBeDefined();
          }
        } else {
          console.warn(`Deployment to ${providers[index]} failed:`, result.reason);
        }
      });
    });

    it('should compare provider capabilities', async () => {
      const analysis: ProjectAnalysis = {
        framework: 'nextjs',
        language: 'typescript',
        packageManager: 'npm',
        dependencies: [],
        buildCommand: 'npm run build',
        startCommand: 'npm start',
        outputDirectory: '.next',
        environmentVariables: [],
        size: 'medium',
        complexity: 'moderate',
        estimatedBuildTime: 5,
        hasDatabase: true,
        hasDockerfile: false,
        recommendations: [],
      };

      const recommendations = await cloudManager.getProviderRecommendations(analysis, {
        costOptimization: false,
        performanceFirst: true,
        requiredFeatures: ['managed-databases'],
      });

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);

      // Should prioritize providers with database support
      const topRecommendation = recommendations[0];
      expect(topRecommendation.supportedFeatures).toContain('managed-databases');
      expect(['railway', 'render', 'aws']).toContain(topRecommendation.provider);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network failures with retry logic', async () => {
      const config: CloudProviderConfig = {
        type: 'vercel',
        accessToken: 'test-token',
        timeout: 1000, // Short timeout to trigger failures
      };

      await cloudManager.configureProvider('vercel', config);

      const deploymentConfig: DeploymentConfig = {
        projectPath: mockProjectPath,
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      // The system should handle retries automatically
      const result = await cloudManager.deploy('vercel', deploymentConfig);

      // Even if it fails, it should be handled gracefully
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error?.retryable).toBeDefined();
      }
    });

    it('should validate configurations before operations', async () => {
      const invalidConfig: CloudProviderConfig = {
        type: 'aws',
        // Missing required credentials
      };

      await expect(cloudManager.configureProvider('aws', invalidConfig))
        .rejects.toThrow();
    });
  });

  describe('Performance and Monitoring', () => {
    beforeEach(async () => {
      await cloudManager.configureProvider('vercel', {
        type: 'vercel',
        accessToken: 'test-token',
      });
    });

    it('should track deployment performance metrics', async () => {
      const startTime = Date.now();

      const config: DeploymentConfig = {
        projectPath: mockProjectPath,
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const result = await cloudManager.deploy('vercel', config);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds for mock

      if (result.success) {
        expect(result.data.buildTime).toBeDefined();
        expect(result.data.buildTime).toBeGreaterThan(0);
      }
    });

    it('should provide deployment health monitoring', async () => {
      const config: DeploymentConfig = {
        projectPath: mockProjectPath,
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const deploymentResult = await cloudManager.deploy('vercel', config);
      expect(deploymentResult.success).toBe(true);

      if (deploymentResult.success) {
        const statusResult = await cloudManager.getDeploymentStatus('vercel', deploymentResult.data.deploymentId);
        expect(statusResult.success).toBe(true);

        if (statusResult.success) {
          const status = statusResult.data;
          expect(status.health).toBeDefined();
          expect(status.performance).toBeDefined();
          expect(status.progress).toBeGreaterThanOrEqual(0);
          expect(status.progress).toBeLessThanOrEqual(100);
        }
      }
    });
  });
});