/**
 * @fileoverview Reusable provider selection prompts
 * @description Shared prompts for cloud provider selection
 * @module node-cli/prompts/provider-prompts
 */

import { select, password, input } from '@inquirer/prompts';
import type { CloudProviderType } from '@aios/shared';
import { SUPPORTED_PROVIDERS } from '@aios/shared';

/**
 * Prompt user to select a cloud provider
 *
 * @returns Selected provider ID
 */
export async function selectProvider(): Promise<CloudProviderType> {
  const provider = await select<CloudProviderType>({
    message: 'Select cloud provider:',
    choices: SUPPORTED_PROVIDERS.map((providerId) => ({
      name: providerId.toUpperCase(),
      value: providerId
    }))
  });

  return provider;
}

/**
 * Prompt user to enter provider token/credentials
 *
 * @param providerName - Name of the provider
 * @returns Provider token
 */
export async function promptForToken(providerName: string): Promise<string> {
  const token = await password({
    message: `Enter ${providerName} API token:`,
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {
        return 'Token cannot be empty';
      }
      return true;
    }
  });

  return token;
}

/**
 * Prompt user to enter provider region
 *
 * @param providerName - Name of the provider
 * @returns Provider region
 */
export async function promptForRegion(providerName: string): Promise<string> {
  const region = await input({
    message: `Enter ${providerName} region (optional):`,
    default: ''
  });

  return region;
}
