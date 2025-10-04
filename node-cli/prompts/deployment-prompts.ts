/**
 * @fileoverview Reusable deployment-related prompts
 * @description Shared prompts for deployment operations
 * @module node-cli/prompts/deployment-prompts
 */

import { select, input, confirm } from '@inquirer/prompts';
import type { DeploymentEnvironment } from '../handlers/index.js';

/**
 * Prompt user to select a deployment environment
 *
 * @param defaultEnv - Default environment to pre-select
 * @returns Selected environment
 */
export async function selectEnvironment(
  defaultEnv: DeploymentEnvironment = 'staging'
): Promise<DeploymentEnvironment> {
  const env = await select<DeploymentEnvironment>({
    message: 'Select deployment environment:',
    choices: [
      { name: 'Staging (recommended)', value: 'staging' as DeploymentEnvironment },
      { name: 'Development', value: 'development' as DeploymentEnvironment },
      { name: 'Production', value: 'production' as DeploymentEnvironment },
      { name: 'Preview', value: 'preview' as DeploymentEnvironment }
    ],
    default: defaultEnv
  });

  return env;
}

/**
 * Prompt for cloud provider (optional)
 *
 * @returns Cloud provider name or empty string
 */
export async function promptForCloudProvider(): Promise<string> {
  const cloud = await input({
    message: 'Cloud provider (or press Enter to use recommended):',
    default: ''
  });

  return cloud;
}

/**
 * Prompt for dry-run mode
 *
 * @returns True if dry-run mode should be enabled
 */
export async function promptForDryRun(): Promise<boolean> {
  const dryRun = await confirm({
    message: 'Dry run (show what would be deployed)?',
    default: false
  });

  return dryRun;
}

/**
 * Prompt for verbose output
 *
 * @returns True if verbose mode should be enabled
 */
export async function promptForVerbose(): Promise<boolean> {
  const verbose = await confirm({
    message: 'Show detailed output?',
    default: false
  });

  return verbose;
}

/**
 * Prompt for deployment priority
 */
export async function promptForPriority(): Promise<'balanced' | 'cost' | 'performance'> {
  const priority = await select<'balanced' | 'cost' | 'performance'>({
    message: 'What is your priority?',
    choices: [
      { name: 'Balanced (default)', value: 'balanced' as const },
      { name: 'Cost Optimization - Minimize expenses', value: 'cost' as const },
      { name: 'Performance First - Maximum speed and reliability', value: 'performance' as const }
    ]
  });

  return priority;
}
