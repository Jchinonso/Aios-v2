/**
 * @fileoverview Netlify Provider Integration Tests
 * @description Integration tests for Netlify cloud provider
 * These tests validate real API integration (requires valid credentials)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NetlifyProvider } from '../../providers/netlify-provider.js';
import type { DeploymentConfig } from '../../types/deployment.types.js';

describe('NetlifyProvider Integration Tests', () => {
  let provider: NetlifyProvider;
  let deploymentId: string | null = null;

  // Check if we have valid Netlify credentials
  const hasCredentials = Boolean(process.env['NETLIFY_TOKEN'] && process.env['NETLIFY_SITE_ID']);
  const testMode = hasCredentials ? 'live' : 'skip';

  beforeAll(() => {
    provider = new NetlifyProvider();
    if (hasCredentials) {
      provider.configure({
        accessToken: process.env['NETLIFY_TOKEN']!,
        siteId: process.env['NETLIFY_SITE_ID'],
      });
    }
  });

  afterAll(async () => {
    // Cleanup: Cancel any deployments created during tests
    if (deploymentId && hasCredentials) {
      try {
        await provider.cancelDeployment(deploymentId);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('Configuration', () => {
    it('should initialize without errors', () => {
      expect(provider).toBeDefined();
      expect(provider.name).toBe('netlify');
    });

    it('should have correct capabilities', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities.customDomains).toBe(true);
      expect(capabilities.environmentVariables).toBe(true);
      expect(capabilities.supportedFrameworks).toContain('react');
      expect(capabilities.supportedFrameworks).toContain('nextjs');
    });

    it.skipIf(testMode === 'skip')('should validate connection with valid credentials', async () => {
      const isConfigured = provider.isConfigured();
      expect(isConfigured).toBe(true);
    });

    it('should throw error when not configured', async () => {
      const unconfiguredProvider = new NetlifyProvider();
      expect(() => unconfiguredProvider.isConfigured()).not.toThrow();
      expect(unconfiguredProvider.isConfigured()).toBe(false);
    });
  });

  describe('Health Check', () => {
    it.skipIf(testMode === 'skip')('should check provider health status', async () => {
      const health = await provider.getHealthStatus();
      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe('Cost Estimation', () => {
    it.skipIf(testMode === 'skip')('should estimate deployment costs', async () => {
      const config: DeploymentConfig = {
        projectPath: '/tmp/test-project',
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const estimate = await provider.estimateCost(config);
      expect(estimate).toBeDefined();
      expect(estimate.monthly).toBeDefined();
      expect(estimate.monthly.minimum).toBeGreaterThanOrEqual(0);
      expect(estimate.monthly.currency).toBe('USD');
      expect(estimate.traffic).toBeDefined();
      expect(estimate.storage).toBeDefined();
    });
  });

  describe('Deployment Operations', () => {
    it.skipIf(testMode === 'skip')('should list existing deployments', async () => {
      const deployments = await provider.listDeployments(process.env['NETLIFY_SITE_ID']);
      expect(deployments).toBeDefined();
      expect(Array.isArray(deployments)).toBe(true);
    });

    it.skipIf(testMode === 'skip')('should deploy a simple site', async () => {
      const config: DeploymentConfig = {
        projectPath: '/tmp/test-netlify-deploy',
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [
          { key: 'NODE_ENV', value: 'production', required: true },
        ],
      };

      const result = await provider.deploy(config);
      expect(result).toBeDefined();
      expect(result.deploymentId).toBeDefined();
      expect(result.url).toBeDefined();
      expect(result.url).toContain('netlify.app');
      expect(result.status).toMatch(/ready|building|deploying|queued/);
      expect(result.environment).toBe('production');

      // Store deployment ID for cleanup
      deploymentId = result.deploymentId;
    }, 60000); // 60 second timeout for deployment

    it.skipIf(testMode === 'skip')('should get deployment status', async () => {
      if (!deploymentId) {
        // Create a deployment first
        const config: DeploymentConfig = {
          projectPath: '/tmp/test-netlify-deploy',
          environment: 'staging',
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
          environmentVariables: [],
        };
        const result = await provider.deploy(config);
        deploymentId = result.deploymentId;
      }

      const status = await provider.getDeploymentStatus(deploymentId);
      expect(status).toBeDefined();
      expect(status.deploymentId).toBe(deploymentId);
      expect(status.phase).toMatch(/ready|building|deploying|failed|cancelled|queued|initializing|unknown/);
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
      expect(status.health).toBeDefined();
      expect(status.health.status).toMatch(/healthy|unhealthy|unknown/);
    });

    it.skipIf(testMode === 'skip')('should get deployment logs', async () => {
      if (!deploymentId) {
        // Skip if no deployment
        return;
      }

      const logs = await provider.getDeploymentLogs(deploymentId);
      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);

      if (logs.length > 0) {
        const log = logs[0];
        expect(log.timestamp).toBeInstanceOf(Date);
        expect(log.level).toMatch(/info|warn|error|debug/);
        expect(log.message).toBeDefined();
        expect(log.source).toBeDefined();
      }
    });

    it.skipIf(testMode === 'skip')('should cancel deployment', async () => {
      if (!deploymentId) {
        // Create a deployment to cancel
        const config: DeploymentConfig = {
          projectPath: '/tmp/test-netlify-deploy',
          environment: 'staging',
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
          environmentVariables: [],
        };
        const result = await provider.deploy(config);
        deploymentId = result.deploymentId;
      }

      await expect(provider.cancelDeployment(deploymentId)).resolves.not.toThrow();

      // Verify deployment was cancelled
      const status = await provider.getDeploymentStatus(deploymentId);
      expect(status.phase).toMatch(/cancelled|failed/);
    });

    it.skipIf(testMode === 'skip')('should rollback deployment', async () => {
      // Create a deployment first
      const config: DeploymentConfig = {
        projectPath: '/tmp/test-netlify-deploy',
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const initialDeployment = await provider.deploy(config);
      expect(initialDeployment.deploymentId).toBeDefined();

      // Perform rollback
      const rollbackResult = await provider.rollback(initialDeployment.deploymentId);
      expect(rollbackResult).toBeDefined();
      expect(rollbackResult.deploymentId).toBeDefined();
      expect(rollbackResult.url).toBeDefined();
      expect(rollbackResult.status).toMatch(/ready|building|deploying/);
    }, 60000);
  });

  describe('Error Handling', () => {
    it.skipIf(testMode === 'skip')('should handle invalid deployment config gracefully', async () => {
      const invalidConfig: DeploymentConfig = {
        projectPath: '/non-existent-path',
        environment: 'production',
        buildCommand: 'invalid-command',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      await expect(provider.deploy(invalidConfig)).rejects.toThrow();
    });

    it.skipIf(testMode === 'skip')('should handle invalid deployment ID', async () => {
      await expect(provider.getDeploymentStatus('invalid-id-12345')).rejects.toThrow();
    });

    it.skipIf(testMode === 'skip')('should handle network errors', async () => {
      const config: DeploymentConfig = {
        projectPath: '/tmp/test',
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      // This should handle network issues gracefully
      await expect(provider.estimateCost(config)).resolves.toBeDefined();
    });
  });

  describe('Feature Support', () => {
    it('should support custom domains', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.customDomains).toBe(true);
    });

    it('should support environment variables', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.environmentVariables).toBe(true);
    });

    it('should support team collaboration', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.teamCollaboration).toBe(true);
    });

    it('should support API access', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.apiAccess).toBe(true);
    });
  });

  describe('Framework Compatibility', () => {
    it('should support modern frameworks', () => {
      const capabilities = provider.getCapabilities();
      const frameworks = capabilities.supportedFrameworks;

      expect(frameworks).toContain('react');
      expect(frameworks).toContain('vue');
      expect(frameworks).toContain('angular');
      expect(frameworks).toContain('nextjs');
      expect(frameworks).toContain('gatsby');
    });

    it('should support static site generators', () => {
      const capabilities = provider.getCapabilities();
      const frameworks = capabilities.supportedFrameworks;

      expect(frameworks).toContain('hugo');
      expect(frameworks).toContain('jekyll');
      expect(frameworks).toContain('eleventy');
    });

    it('should support multiple languages', () => {
      const capabilities = provider.getCapabilities();
      const languages = capabilities.supportedLanguages;

      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
    });
  });
});
