/**
 * @fileoverview Deployment Helpers - Utility functions for deployment operations
 * @description Collection of utility functions to assist with deployment operations,
 * configuration management, and deployment workflow optimization.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import type {
  DeploymentConfig,
  DeploymentResult,
  DeploymentStatus,
  ProjectAnalysis,
  FrameworkType,
} from '../types/deployment.types.js';

import type {
  CloudProviderType,
} from '../types/cloud-provider.types.js';

import {
  createLogger,
} from '../../utils/logger.js';

const logger = createLogger('DeploymentHelpers');

/**
 * Generate deployment configuration from project analysis
 * @function generateDeploymentConfig
 * @param {ProjectAnalysis} analysis - Project analysis results
 * @param {CloudProviderType} provider - Target provider
 * @param {string} environment - Deployment environment
 * @returns {DeploymentConfig} Generated deployment configuration
 */
export function generateDeploymentConfig(
  analysis: ProjectAnalysis,
  provider: CloudProviderType,
  environment: string,
  projectPath: string
): DeploymentConfig {
  logger.debug('Generating deployment configuration', {
    framework: analysis.framework,
    provider,
    environment
  });

  const config: DeploymentConfig = {
    projectPath,
    environment,
    buildCommand: analysis.buildCommand || undefined,
    outputDirectory: analysis.outputDirectory || undefined,
    environmentVariables: analysis.environmentVariables,
  };

  // Add provider-specific optimizations
  switch (provider) {
    case 'vercel':
      return {
        ...config,
        ...optimizeForVercel(analysis, environment)
      };

    case 'netlify':
      return {
        ...config,
        ...optimizeForNetlify(analysis, environment)
      };

    case 'railway':
      return {
        ...config,
        ...optimizeForRailway(analysis, environment)
      };

    case 'render':
      return {
        ...config,
        ...optimizeForRender(analysis, environment)
      };

    default:
      return config;
  }
}

/**
 * Optimize configuration for Vercel deployment
 * @private
 * @function optimizeForVercel
 */
function optimizeForVercel(analysis: ProjectAnalysis, _environment: string): Partial<DeploymentConfig> {
  let optimizations: Partial<DeploymentConfig> = {};

  // Next.js optimizations
  if (analysis.framework === 'nextjs') {
    optimizations = {
      ...optimizations,
      buildCommand: optimizations.buildCommand || 'next build',
      outputDirectory: '.next'
    };
  }

  return optimizations;
}

/**
 * Optimize configuration for Netlify deployment
 * @private
 * @function optimizeForNetlify
 */
function optimizeForNetlify(analysis: ProjectAnalysis, _environment: string): Partial<DeploymentConfig> {
  let optimizations: Partial<DeploymentConfig> = {};

  // Static site optimizations
  if (['react', 'vue', 'angular', 'static'].includes(analysis.framework)) {
    optimizations = {
      ...optimizations,
      buildCommand: optimizations.buildCommand || 'npm run build',
      outputDirectory: analysis.framework === 'react' ? 'build' : 'dist'
    };
  }

  return optimizations;
}

/**
 * Optimize configuration for Railway deployment
 * @private
 * @function optimizeForRailway
 */
function optimizeForRailway(analysis: ProjectAnalysis, _environment: string): Partial<DeploymentConfig> {
  let optimizations: Partial<DeploymentConfig> = {};

  // Railway prefers start commands over build outputs
  if (analysis.startCommand) {
    // Railway will handle the build process
    optimizations = {
      ...optimizations,
      buildCommand: analysis.buildCommand
    };
  }

  return optimizations;
}

/**
 * Optimize configuration for Render deployment
 * @private
 * @function optimizeForRender
 */
function optimizeForRender(analysis: ProjectAnalysis, _environment: string): Partial<DeploymentConfig> {
  let optimizations: Partial<DeploymentConfig> = {};

  // Render optimizations based on framework
  if (['express', 'fastify', 'nestjs'].includes(analysis.framework)) {
    optimizations = {
      ...optimizations,
      region: 'oregon' // Default Render region
    };
  }

  return optimizations;
}

/**
 * Calculate deployment health score
 * @function calculateHealthScore
 * @param {DeploymentStatus} status - Deployment status
 * @returns {number} Health score (0-100)
 */
export function calculateHealthScore(status: DeploymentStatus): number {
  let score = 0;

  // Phase scoring
  switch (status.phase) {
    case 'ready':
      score += 40;
      break;
    case 'building':
      score += 20;
      break;
    case 'deploying':
      score += 30;
      break;
    case 'failed':
      score = 0;
      break;
    default:
      score += 10;
  }

  // Health status scoring
  if (status.health?.status === 'healthy') {
    score += 30;
  } else if (status.health?.status === 'degraded') {
    score += 15;
  } else if (status.health?.status === 'unhealthy') {
    score += 5;
  }

  // Performance scoring
  if (status.performance?.responseTime) {
    if (status.performance.responseTime < 200) {
      score += 20;
    } else if (status.performance.responseTime < 500) {
      score += 15;
    } else if (status.performance.responseTime < 1000) {
      score += 10;
    } else {
      score += 5;
    }
  } else {
    score += 10; // Default when no performance data
  }

  // Progress scoring
  score += Math.min(10, status.progress / 10);

  return Math.min(100, Math.max(0, score));
}

/**
 * Estimate deployment duration based on project analysis
 * @function estimateDeploymentDuration
 * @param {ProjectAnalysis} analysis - Project analysis
 * @param {CloudProviderType} provider - Target provider
 * @returns {number} Estimated duration in milliseconds
 */
export function estimateDeploymentDuration(
  analysis: ProjectAnalysis,
  provider: CloudProviderType
): number {
  let baseDuration = 120000; // 2 minutes base

  // Framework-based adjustments
  switch (analysis.framework) {
    case 'nextjs':
      baseDuration += 180000; // +3 minutes for Next.js builds
      break;
    case 'react':
    case 'vue':
    case 'angular':
      baseDuration += 120000; // +2 minutes for SPA builds
      break;
    case 'static':
      baseDuration = 60000; // 1 minute for static sites
      break;
    default:
      baseDuration += 90000; // +1.5 minutes for other frameworks
  }

  // Complexity adjustments
  switch (analysis.complexity) {
    case 'simple':
      baseDuration *= 0.7;
      break;
    case 'moderate':
      baseDuration *= 1.0;
      break;
    case 'complex':
      baseDuration *= 1.5;
      break;
    case 'advanced':
      baseDuration *= 2.0;
      break;
  }

  // Size adjustments
  switch (analysis.size) {
    case 'small':
      baseDuration *= 0.8;
      break;
    case 'medium':
      baseDuration *= 1.0;
      break;
    case 'large':
      baseDuration *= 1.3;
      break;
    case 'enterprise':
      baseDuration *= 1.8;
      break;
  }

  // Provider-specific adjustments
  switch (provider) {
    case 'vercel':
      baseDuration *= 0.8; // Vercel is generally faster
      break;
    case 'netlify':
      baseDuration *= 0.9;
      break;
    case 'railway':
      baseDuration *= 1.2; // Container builds take longer
      break;
    case 'render':
      baseDuration *= 1.3;
      break;
    default:
      baseDuration *= 1.0;
  }

  return Math.round(baseDuration);
}

/**
 * Generate deployment summary from result
 * @function generateDeploymentSummary
 * @param {DeploymentResult} result - Deployment result
 * @param {number} duration - Actual deployment duration
 * @returns {string} Human-readable deployment summary
 */
export function generateDeploymentSummary(result: DeploymentResult, duration?: number): string {
  const minutes = duration ? Math.round(duration / 60000) : Math.round(result.buildTime / 60000);
  const status = result.status === 'ready' ? 'successful' : result.status;

  let summary = `Deployment ${status}`;

  if (result.url) {
    summary += ` - ${result.url}`;
  }

  if (duration || result.buildTime) {
    summary += ` (${minutes}m ${Math.round(((duration || result.buildTime) % 60000) / 1000)}s)`;
  }

  if (result.environment) {
    summary += ` to ${result.environment}`;
  }

  return summary;
}

/**
 * Detect framework from project dependencies
 * @function detectFrameworkFromDependencies
 * @param {string[]} dependencies - List of dependency names
 * @returns {FrameworkType} Detected framework
 */
export function detectFrameworkFromDependencies(dependencies: string[]): FrameworkType {
  const depSet = new Set(dependencies);

  // Check for specific frameworks
  if (depSet.has('next')) return 'nextjs';
  if (depSet.has('nuxt')) return 'nuxt';
  if (depSet.has('svelte') && depSet.has('@sveltejs/kit')) return 'sveltekit';
  if (depSet.has('svelte')) return 'svelte';
  if (depSet.has('vue')) return 'vue';
  if (depSet.has('@angular/core')) return 'angular';
  if (depSet.has('react')) return 'react';
  if (depSet.has('express')) return 'express';
  if (depSet.has('fastify')) return 'fastify';
  if (depSet.has('@nestjs/core')) return 'nestjs';

  return 'unknown';
}

/**
 * Validate deployment readiness
 * @function validateDeploymentReadiness
 * @param {ProjectAnalysis} analysis - Project analysis
 * @param {CloudProviderType} provider - Target provider
 * @returns {object} Readiness validation result
 */
export function validateDeploymentReadiness(
  analysis: ProjectAnalysis,
  provider: CloudProviderType
): {
  ready: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Framework compatibility
  const compatibility = getFrameworkCompatibility(analysis.framework, provider);
  if (compatibility < 70) {
    issues.push(`${analysis.framework} has limited support on ${provider} (${compatibility}% compatible)`);
  } else if (compatibility < 85) {
    warnings.push(`${analysis.framework} support on ${provider} could be improved`);
  }

  // Build command validation
  if (!analysis.buildCommand) {
    warnings.push('No build command specified - provider will use defaults');
  }

  // Environment variables
  if (analysis.environmentVariables.length === 0) {
    warnings.push('No environment variables configured - ensure app doesn\'t require any');
  }

  // Database requirements
  if (analysis.hasDatabase && !['railway', 'render', 'aws'].includes(provider)) {
    warnings.push(`${provider} doesn't provide managed databases - you'll need external database`);
  }

  return {
    ready: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Get framework compatibility score for provider
 * @private
 * @function getFrameworkCompatibility
 */
function getFrameworkCompatibility(framework: FrameworkType, provider: CloudProviderType): number {
  const compatibilityMatrix: Record<FrameworkType, Record<CloudProviderType, number>> = {
    nextjs: {
      vercel: 100, netlify: 85, aws: 75, railway: 80, render: 75,
      digitalocean: 60, linode: 60, vultr: 60, fly: 70, cloudflare: 85
    },
    react: {
      vercel: 95, netlify: 90, aws: 85, railway: 80, render: 80,
      digitalocean: 70, linode: 70, vultr: 70, fly: 75, cloudflare: 80
    },
    static: {
      vercel: 95, netlify: 100, aws: 90, railway: 70, render: 75,
      digitalocean: 85, linode: 85, vultr: 85, fly: 80, cloudflare: 95
    },
    // Add other frameworks as needed
  } as any;

  return compatibilityMatrix[framework]?.[provider] || 50;
}