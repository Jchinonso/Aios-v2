/**
 * @fileoverview AWS Provider Integration Tests
 * @description Integration tests for AWS cloud provider with S3, CloudFront, CloudFormation, and STS
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AWSProvider } from '../../providers/aws-provider.js';
import type { DeploymentConfig } from '../../types/deployment.types.js';

describe('AWSProvider Integration Tests', () => {
  let provider: AWSProvider;
  let deploymentId: string | undefined;

  const hasCredentials = Boolean(
    process.env['AWS_ACCESS_KEY_ID'] &&
    process.env['AWS_SECRET_ACCESS_KEY']
  );
  const testMode = hasCredentials ? 'live' : 'skip';

  beforeAll(() => {
    provider = new AWSProvider();
    if (hasCredentials) {
      provider.configure({
        region: process.env['AWS_REGION'] || 'us-east-1',
      });
    }
  });

  afterAll(async () => {
    // Cleanup: Cancel test deployment if created
    if (deploymentId && hasCredentials) {
      try {
        await provider.cancelDeployment(deploymentId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Configuration', () => {
    it('should initialize without errors', () => {
      expect(provider).toBeDefined();
      expect(provider.name).toBe('aws');
    });

    it('should have correct capabilities', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities.customDomains).toBe(true);
      expect(capabilities.environmentVariables).toBe(true);
      expect(capabilities.teamCollaboration).toBe(true);
      expect(capabilities.apiAccess).toBe(true);
      expect(capabilities.supportedFrameworks).toContain('react');
      expect(capabilities.supportedFrameworks).toContain('nextjs');
      expect(capabilities.supportedFrameworks).toContain('vue');
    });

    it.skipIf(testMode === 'skip')('should validate connection with valid credentials', async () => {
      expect(provider.isConfigured()).toBe(true);
    });

    it('should not be configured without credentials', () => {
      const unconfiguredProvider = new AWSProvider();
      expect(unconfiguredProvider.isConfigured()).toBe(false);
    });
  });

  describe('AWS Service Integration', () => {
    it.skipIf(testMode === 'skip')('should check provider health via STS', async () => {
      const health = await provider.getHealthStatus();
      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.lastChecked).toBeInstanceOf(Date);

      if (health.status === 'healthy') {
        expect(health.details).toBeDefined();
        expect(health.details?.sts).toBeDefined();
        expect(health.details?.s3).toBeDefined();
      }
    });

    it.skipIf(testMode === 'skip')('should validate AWS credentials via STS GetCallerIdentity', async () => {
      const health = await provider.getHealthStatus();
      expect(health.status).toBe('healthy');
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

      // AWS-specific pricing structure
      expect(estimate.additional).toBeDefined();
      const additionalServices = estimate.additional?.map(s => s.service);
      expect(additionalServices).toContain('CloudFront CDN');
      expect(additionalServices).toContain('Route53 DNS');
    });
  });

  describe('S3 Deployment Operations', () => {
    it.skipIf(testMode === 'skip')('should list existing CloudFormation stacks', async () => {
      const deployments = await provider.listDeployments();
      expect(deployments).toBeDefined();
      expect(Array.isArray(deployments)).toBe(true);
    });

    it.skipIf(testMode === 'skip')('should deploy static site to S3', async () => {
      const config: DeploymentConfig = {
        projectPath: '/tmp/test-aws-deploy',
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
      expect(result.url).toMatch(/s3-website|cloudfront\.net/);
      expect(result.status).toMatch(/ready|building|deploying/);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.provider).toBe('aws');
      expect(result.metadata?.bucketName).toBeDefined();

      deploymentId = result.deploymentId;
    }, 120000); // 2 minute timeout for S3 upload

    it.skipIf(testMode === 'skip')('should get deployment status from CloudFormation', async () => {
      if (!deploymentId) {
        const deployments = await provider.listDeployments();
        if (deployments.length > 0) {
          deploymentId = deployments[0].deploymentId;
        }
      }

      if (deploymentId) {
        const status = await provider.getDeploymentStatus(deploymentId);
        expect(status).toBeDefined();
        expect(status.deploymentId).toBe(deploymentId);
        expect(status.phase).toMatch(/ready|building|deploying|failed|cancelled|unknown/);
        expect(status.progress).toBeGreaterThanOrEqual(0);
        expect(status.progress).toBeLessThanOrEqual(100);
      }
    });

    it.skipIf(testMode === 'skip')('should fetch deployment logs', async () => {
      if (!deploymentId) {
        const deployments = await provider.listDeployments();
        if (deployments.length > 0) {
          deploymentId = deployments[0].deploymentId;
        }
      }

      if (deploymentId) {
        const logs = await provider.getDeploymentLogs(deploymentId);
        expect(logs).toBeDefined();
        expect(Array.isArray(logs)).toBe(true);

        if (logs.length > 0) {
          expect(logs[0].timestamp).toBeInstanceOf(Date);
          expect(logs[0].message).toBeDefined();
          expect(logs[0].level).toMatch(/info|warn|error|debug/);
        }
      }
    });

    it.skipIf(testMode === 'skip')('should cancel deployment via CloudFormation stack deletion', async () => {
      const config: DeploymentConfig = {
        projectPath: '/tmp/test-aws-cancel',
        environment: 'staging',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const result = await provider.deploy(config);
      const cancelDeploymentId = result.deploymentId;

      await expect(provider.cancelDeployment(cancelDeploymentId)).resolves.not.toThrow();
    }, 120000);

    it.skipIf(testMode === 'skip')('should rollback deployment to previous version', async () => {
      if (!deploymentId) {
        const deployments = await provider.listDeployments();
        if (deployments.length > 0) {
          deploymentId = deployments[0].deploymentId;
        }
      }

      if (deploymentId) {
        const rollbackResult = await provider.rollback(deploymentId);
        expect(rollbackResult).toBeDefined();
        expect(rollbackResult.deploymentId).toBeDefined();
        expect(rollbackResult.url).toBeDefined();
      }
    }, 120000);
  });

  describe('CloudFront Integration', () => {
    it.skipIf(testMode === 'skip')('should handle CloudFront cache invalidation', async () => {
      // This test verifies CloudFront invalidation doesn't throw errors
      // when AWS_CLOUDFRONT_DISTRIBUTION_ID is set
      const config: DeploymentConfig = {
        projectPath: '/tmp/test-cloudfront',
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const result = await provider.deploy(config);
      expect(result).toBeDefined();
      expect(result.url).toBeDefined();
    }, 120000);
  });

  describe('Feature Support', () => {
    it('should support S3 static website hosting', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.customDomains).toBe(true);
    });

    it('should support API access', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.apiAccess).toBe(true);
    });

    it('should support team collaboration via IAM', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.teamCollaboration).toBe(true);
    });

    it('should support environment variables', () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities.environmentVariables).toBe(true);
    });
  });

  describe('Framework Compatibility', () => {
    it('should support static site frameworks', () => {
      const capabilities = provider.getCapabilities();
      const frameworks = capabilities.supportedFrameworks;

      expect(frameworks).toContain('react');
      expect(frameworks).toContain('vue');
      expect(frameworks).toContain('angular');
      expect(frameworks).toContain('svelte');
    });

    it('should support Next.js', () => {
      const capabilities = provider.getCapabilities();
      const frameworks = capabilities.supportedFrameworks;

      expect(frameworks).toContain('nextjs');
    });

    it('should support multiple languages', () => {
      const capabilities = provider.getCapabilities();
      const languages = capabilities.supportedLanguages;

      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
      expect(languages).toContain('go');
    });
  });

  describe('Error Handling', () => {
    it('should return error when credentials are missing', async () => {
      const unconfiguredProvider = new AWSProvider();

      const config: DeploymentConfig = {
        projectPath: '/tmp/test-project',
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentVariables: [],
      };

      const result = await unconfiguredProvider.deploy(config);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it.skipIf(testMode === 'skip')('should handle invalid deployment ID gracefully', async () => {
      const invalidId = 'invalid-deployment-id-12345';
      const status = await provider.getDeploymentStatus(invalidId);

      expect(status).toBeDefined();
      expect(status.phase).toBe('unknown');
    });
  });
});
