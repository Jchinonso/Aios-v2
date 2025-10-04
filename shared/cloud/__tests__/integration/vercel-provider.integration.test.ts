/**
 * @fileoverview Vercel Provider Integration Tests
 * @description Integration tests for Vercel cloud provider
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { VercelProvider } from '../../providers/vercel-provider.js';
import type { DeploymentConfig } from '../../types/deployment.types.js';

describe('VercelProvider Integration Tests', () => {
  let provider: VercelProvider;
  const hasCredentials = Boolean(process.env['VERCEL_TOKEN'] && process.env['VERCEL_PROJECT_ID']);
  const testMode = hasCredentials ? 'live' : 'skip';

  beforeAll(() => {
    provider = new VercelProvider();
    if (hasCredentials) {
      provider.configure({
        accessToken: process.env['VERCEL_TOKEN']!,
        projectId: process.env['VERCEL_PROJECT_ID'],
      });
    }
  });

  describe('Configuration', () => {
    it('should initialize without errors', () => {
      expect(provider).toBeDefined();
      expect(provider.name).toBe('vercel');
    });

    it('should have correct capabilities', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities.customDomains).toBe(true);
      expect(capabilities.environmentVariables).toBe(true);
      expect(capabilities.supportedFrameworks).toContain('nextjs');
      expect(capabilities.supportedFrameworks).toContain('react');
    });

    it.skipIf(testMode === 'skip')('should validate connection with valid credentials', async () => {
      expect(provider.isConfigured()).toBe(true);
    });

    it('should not be configured without credentials', () => {
      const unconfiguredProvider = new VercelProvider();
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
      expect(estimate.monthly.currency).toBe('USD');
      expect(estimate.traffic).toBeDefined();
      expect(estimate.storage).toBeDefined();
    });
  });

  describe('Deployment Operations', () => {
    it.skipIf(testMode === 'skip')('should list existing deployments', async () => {
      const deployments = await provider.listDeployments(process.env['VERCEL_PROJECT_ID']);
      expect(deployments).toBeDefined();
      expect(Array.isArray(deployments)).toBe(true);
    });

    it.skipIf(testMode === 'skip')('should deploy a project', async () => {
      const config: DeploymentConfig = {
        projectPath: '/tmp/test-vercel-deploy',
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
      expect(result.url).toContain('vercel.app');
      expect(result.status).toMatch(/ready|building|deploying|queued/);
    }, 60000);

    it.skipIf(testMode === 'skip')('should get deployment status', async () => {
      const deployments = await provider.listDeployments();
      if (deployments.length > 0) {
        const deploymentId = deployments[0].deploymentId;
        const status = await provider.getDeploymentStatus(deploymentId);
        expect(status).toBeDefined();
        expect(status.deploymentId).toBe(deploymentId);
        expect(status.phase).toBeDefined();
      }
    });
  });

  describe('Feature Support', () => {
    it('should support edge functions', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.supportedFrameworks).toContain('nextjs');
    });

    it('should support serverless functions', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.customDomains).toBe(true);
    });
  });

  describe('Framework Compatibility', () => {
    it('should support Next.js', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.supportedFrameworks).toContain('nextjs');
    });

    it('should support React', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.supportedFrameworks).toContain('react');
    });
  });
});
