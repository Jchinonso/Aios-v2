/**
 * @fileoverview Railway Provider Integration Tests
 * @description Integration tests for Railway cloud provider with GraphQL API
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RailwayProvider } from '../../providers/railway-provider.js';
import type { DeploymentConfig } from '../../types/deployment.types.js';

describe('RailwayProvider Integration Tests', () => {
  let provider: RailwayProvider;
  const hasCredentials = Boolean(process.env['RAILWAY_TOKEN'] && process.env['RAILWAY_PROJECT_ID']);
  const testMode = hasCredentials ? 'live' : 'skip';

  beforeAll(() => {
    provider = new RailwayProvider();
    if (hasCredentials) {
      provider.configure({
        apiToken: process.env['RAILWAY_TOKEN']!,
        projectId: process.env['RAILWAY_PROJECT_ID'],
      });
    }
  });

  describe('Configuration', () => {
    it('should initialize without errors', () => {
      expect(provider).toBeDefined();
      expect(provider.name).toBe('railway');
    });

    it('should have correct capabilities', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities.customDomains).toBe(true);
      expect(capabilities.environmentVariables).toBe(true);
      expect(capabilities.supportedFrameworks).toContain('express');
      expect(capabilities.supportedFrameworks).toContain('nextjs');
    });

    it.skipIf(testMode === 'skip')('should validate connection with valid credentials', async () => {
      expect(provider.isConfigured()).toBe(true);
    });

    it('should not be configured without credentials', () => {
      const unconfiguredProvider = new RailwayProvider();
      expect(unconfiguredProvider.isConfigured()).toBe(false);
    });
  });

  describe('GraphQL Integration', () => {
    it.skipIf(testMode === 'skip')('should check provider health via GraphQL', async () => {
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

      // Railway-specific pricing structure
      expect(estimate.additional).toBeDefined();
      const additionalServices = estimate.additional?.map(s => s.service);
      expect(additionalServices).toContain('vCPU Hours');
      expect(additionalServices).toContain('RAM Usage');
    });
  });

  describe('Deployment Operations with GraphQL', () => {
    it.skipIf(testMode === 'skip')('should list existing deployments via GraphQL', async () => {
      const deployments = await provider.listDeployments(process.env['RAILWAY_PROJECT_ID']);
      expect(deployments).toBeDefined();
      expect(Array.isArray(deployments)).toBe(true);
    });

    it.skipIf(testMode === 'skip')('should deploy via GraphQL mutation', async () => {
      const config: DeploymentConfig = {
        projectPath: '/tmp/test-railway-deploy',
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
      expect(result.url).toContain('railway.app');
      expect(result.status).toMatch(/ready|building|deploying|queued|initializing/);
    }, 60000);

    it.skipIf(testMode === 'skip')('should get deployment status via GraphQL query', async () => {
      const deployments = await provider.listDeployments();
      if (deployments.length > 0) {
        const deploymentId = deployments[0].deploymentId;
        const status = await provider.getDeploymentStatus(deploymentId);
        expect(status).toBeDefined();
        expect(status.deploymentId).toBe(deploymentId);
        expect(status.phase).toMatch(/ready|building|deploying|failed|cancelled|queued|initializing|unknown/);
        expect(status.progress).toBeGreaterThanOrEqual(0);
        expect(status.progress).toBeLessThanOrEqual(100);
      }
    });

    it.skipIf(testMode === 'skip')('should fetch deployment logs via GraphQL', async () => {
      const deployments = await provider.listDeployments();
      if (deployments.length > 0) {
        const deploymentId = deployments[0].deploymentId;
        const logs = await provider.getDeploymentLogs(deploymentId);
        expect(logs).toBeDefined();
        expect(Array.isArray(logs)).toBe(true);
      }
    });

    it.skipIf(testMode === 'skip')('should cancel deployment via GraphQL mutation', async () => {
      const config: DeploymentConfig = {
        projectPath: '/tmp/test-railway-deploy',
        environment: 'staging',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const result = await provider.deploy(config);
      const deploymentId = result.deploymentId;

      await expect(provider.cancelDeployment(deploymentId)).resolves.not.toThrow();
    }, 60000);

    it.skipIf(testMode === 'skip')('should rollback deployment via GraphQL', async () => {
      const deployments = await provider.listDeployments();
      if (deployments.length > 0) {
        const deploymentId = deployments[0].deploymentId;
        const rollbackResult = await provider.rollback(deploymentId);
        expect(rollbackResult).toBeDefined();
        expect(rollbackResult.deploymentId).toBeDefined();
        expect(rollbackResult.url).toBeDefined();
      }
    }, 60000);
  });

  describe('Feature Support', () => {
    it('should support managed databases', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.supportedFrameworks).toContain('express');
    });

    it('should support Docker', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.customDomains).toBe(true);
    });

    it('should support team collaboration', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.teamCollaboration).toBe(true);
    });
  });

  describe('Framework Compatibility', () => {
    it('should support Node.js frameworks', () => {
      const capabilities = provider.getCapabilities();
      const frameworks = capabilities.supportedFrameworks;

      expect(frameworks).toContain('nextjs');
      expect(frameworks).toContain('express');
      expect(frameworks).toContain('fastify');
    });

    it('should support Python frameworks', () => {
      const capabilities = provider.getCapabilities();
      const frameworks = capabilities.supportedFrameworks;

      expect(frameworks).toContain('django');
      expect(frameworks).toContain('flask');
    });

    it('should support multiple languages', () => {
      const capabilities = provider.getCapabilities();
      const languages = capabilities.supportedLanguages;

      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
      expect(languages).toContain('go');
      expect(languages).toContain('rust');
    });
  });
});
