/**
 * @fileoverview Render Provider Integration Tests
 * @description Integration tests for Render cloud provider
 * These tests validate real API integration (requires valid credentials)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RenderProvider } from '../../providers/render-provider.js';
import type { DeploymentConfig } from '../../types/deployment.types.js';

describe('RenderProvider Integration Tests', () => {
  let provider: RenderProvider;
  let deploymentId: string | null = null;

  // Check if we have valid Render credentials
  const hasCredentials = Boolean(process.env['RENDER_API_KEY'] && process.env['RENDER_SERVICE_ID']);
  const testMode = hasCredentials ? 'live' : 'skip';

  beforeAll(() => {
    provider = new RenderProvider();
    if (hasCredentials) {
      provider.configure({
        apiKey: process.env['RENDER_API_KEY']!,
        serviceId: process.env['RENDER_SERVICE_ID'],
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
      expect(provider.name).toBe('render');
    });

    it('should have correct capabilities', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities.customDomains).toBe(true);
      expect(capabilities.environmentVariables).toBe(true);
      expect(capabilities.supportedFrameworks).toContain('react');
      expect(capabilities.supportedFrameworks).toContain('express');
    });

    it.skipIf(testMode === 'skip')('should validate connection with valid credentials', async () => {
      const isConfigured = provider.isConfigured();
      expect(isConfigured).toBe(true);
    });

    it('should not be configured without credentials', () => {
      const unconfiguredProvider = new RenderProvider();
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
      const deployments = await provider.listDeployments(process.env['RENDER_SERVICE_ID']);
      expect(deployments).toBeDefined();
      expect(Array.isArray(deployments)).toBe(true);
    });

    it.skipIf(testMode === 'skip')('should deploy a service', async () => {
      const config: DeploymentConfig = {
        projectPath: '/tmp/test-render-deploy',
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
      expect(result.url).toContain('onrender.com');
      expect(result.status).toMatch(/ready|building|deploying|queued/);
      expect(result.environment).toBe('production');

      // Store deployment ID for cleanup
      deploymentId = result.deploymentId;
    }, 60000);

    it.skipIf(testMode === 'skip')('should get deployment status', async () => {
      if (!deploymentId) {
        const config: DeploymentConfig = {
          projectPath: '/tmp/test-render-deploy',
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
        const config: DeploymentConfig = {
          projectPath: '/tmp/test-render-deploy',
          environment: 'staging',
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
          environmentVariables: [],
        };
        const result = await provider.deploy(config);
        deploymentId = result.deploymentId;
      }

      await expect(provider.cancelDeployment(deploymentId)).resolves.not.toThrow();
    });

    it.skipIf(testMode === 'skip')('should rollback deployment', async () => {
      const config: DeploymentConfig = {
        projectPath: '/tmp/test-render-deploy',
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const initialDeployment = await provider.deploy(config);
      expect(initialDeployment.deploymentId).toBeDefined();

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

    it('should support Docker deployments', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.supportedFrameworks).toContain('docker');
    });
  });

  describe('Framework Compatibility', () => {
    it('should support modern frameworks', () => {
      const capabilities = provider.getCapabilities();
      const frameworks = capabilities.supportedFrameworks;

      expect(frameworks).toContain('react');
      expect(frameworks).toContain('vue');
      expect(frameworks).toContain('express');
      expect(frameworks).toContain('nextjs');
    });

    it('should support multiple languages', () => {
      const capabilities = provider.getCapabilities();
      const languages = capabilities.supportedLanguages;

      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
      expect(languages).toContain('go');
      expect(languages).toContain('ruby');
    });
  });
});
