/**
 * @fileoverview Connect Command - Provider Connection
 * @description Connect to cloud provider with credential management
 * @module node-cli/commands
 */

import chalk from 'chalk';
import { select, confirm, password } from '@inquirer/prompts';
import ora from 'ora';
import type { ILogger, CloudProviderType } from '@aios/shared';
import { ProjectStateManager, createCredentialVault } from '@aios/shared';
import type { ConnectionConfigType } from '@aios/shared';
import { randomUUID } from 'crypto';
import { ConsoleFormatter as fmt } from '../utils/console-formatter.js';

/**
 * Connect command options
 */
export interface ConnectOptionsType {
  readonly path: string;
  readonly provider?: CloudProviderType;
  readonly token?: string;
  readonly region?: string;
}

/**
 * Execute connect command
 *
 * Establishes secure connection to cloud provider
 */
export async function executeConnect(
  options: ConnectOptionsType,
  logger: ILogger
): Promise<void> {
  fmt.header('🔗', 'Connect to Cloud Provider');

  try {
    const stateManager = new ProjectStateManager(options.path, logger);

    // Initialize .aios directory if needed
    const state = await stateManager.detectState();
    if (!state.hasAiosConfig) {
      await stateManager.initialize();
      fmt.success('Initialized .aios directory');
    }

    // Step 1: Select provider
    const provider = await selectProvider(options);
    console.log(chalk.cyan(`\n📡 Connecting to ${provider}...\n`));

    // Step 2: Get credentials
    const token = await getCredentials(provider, options);

    // Step 3: Store credentials securely
    const spinner = ora('Storing credentials securely...').start();
    const vault = createCredentialVault(logger);

    const vaultRef = await vault.store(
      provider,
      token,
      'api_key',
      {
        accountName: `${provider}-account`
      }
    );

    spinner.succeed('Credentials stored securely!');

    console.log(chalk.gray('  Storage:'), chalk.green(vaultRef.scheme));
    console.log(chalk.gray('  Location:'), chalk.gray(getStorageLocation(vaultRef.scheme)));

    // Step 4: Save connection configuration
    const connection: ConnectionConfigType = {
      id: `conn_${randomUUID()}`,
      provider,
      ...(options.region !== undefined && { region: options.region }),
      createdAt: new Date().toISOString(),
      lastConnected: new Date().toISOString(),
      vaultRef
    };

    await stateManager.saveConnection(connection);

    fmt.success('Connection established!');
    fmt.separator();

    // Step 5: Update AIOS config
    if (!state.hasAiosConfig) {
      await stateManager.createConfig({
        projectName: options.path.split('/').pop() || 'my-project'
      });
    }

    await stateManager.updateConfig({
      credentials: {
        provider,
        authMethod: 'api_key',
        credentialId: vaultRef.itemId
      }
    });

    // Show next steps
    fmt.nextSteps('Next Steps', [
      { description: 'Analyze project', command: 'aios cloud analyze' },
      { description: 'Get recommendations', command: 'aios cloud recommend' },
      { description: 'Deploy to cloud', command: `aios cloud deploy --cloud ${provider}` }
    ]);

  } catch (error) {
    logger.error('Connection error', error as Error);
    console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}

/**
 * Select cloud provider
 */
async function selectProvider(options: ConnectOptionsType): Promise<CloudProviderType> {
  if (options.provider) {
    return options.provider;
  }

  const provider = await select<CloudProviderType>({
    message: 'Select cloud provider:',
    choices: [
      { name: `${chalk.green('Vercel')} - Best for Next.js, React, Vue`, value: 'vercel' as CloudProviderType },
      { name: `${chalk.cyan('Netlify')} - Great for static sites and JAMstack`, value: 'netlify' as CloudProviderType },
      { name: `${chalk.yellow('AWS')} - Full control, scalable`, value: 'aws' as CloudProviderType },
      { name: `${chalk.magenta('Railway')} - Simple full-stack deployments`, value: 'railway' as CloudProviderType },
      { name: `${chalk.blue('Render')} - Modern cloud platform`, value: 'render' as CloudProviderType },
      { name: `${chalk.gray('Cloudflare')} - Edge computing`, value: 'cloudflare' as CloudProviderType },
      { name: `${chalk.gray('Fly.io')} - Global app platform`, value: 'fly' as CloudProviderType }
    ]
  });

  return provider;
}

/**
 * Get credentials from user
 */
async function getCredentials(provider: CloudProviderType, options: ConnectOptionsType): Promise<string> {
  if (options.token) {
    return options.token;
  }

  // Check environment variable first
  const envVarName = getEnvVarName(provider);
  const envToken = process.env[envVarName];

  if (envToken) {
    const useEnvToken = await confirm({
      message: `Found ${envVarName} in environment. Use it?`,
      default: true
    });

    if (useEnvToken) {
      return envToken;
    }
  }

  // Prompt for manual entry
  console.log(chalk.gray('\n📝 Authentication Required\n'));
  console.log(chalk.gray(`Get your API token from: ${getProviderDocsUrl(provider)}\n`));

  const token = await password({
    message: `Enter ${provider} API token:`,
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {
        return 'Token is required';
      }
      if (input.length < 10) {
        return 'Token seems too short';
      }
      return true;
    }
  });

  return token;
}

/**
 * Get environment variable name for provider
 */
function getEnvVarName(provider: CloudProviderType): string {
  const envMap: Record<string, string> = {
    vercel: 'VERCEL_TOKEN',
    netlify: 'NETLIFY_TOKEN',
    aws: 'AWS_ACCESS_KEY_ID',
    railway: 'RAILWAY_TOKEN',
    render: 'RENDER_API_KEY',
    cloudflare: 'CLOUDFLARE_API_TOKEN',
    fly: 'FLY_API_TOKEN'
  };

  return envMap[provider] || `${provider.toUpperCase()}_TOKEN`;
}

/**
 * Get provider documentation URL
 */
function getProviderDocsUrl(provider: CloudProviderType): string {
  const docsMap: Record<string, string> = {
    vercel: 'https://vercel.com/account/tokens',
    netlify: 'https://app.netlify.com/user/applications#personal-access-tokens',
    aws: 'https://console.aws.amazon.com/iam/home#/security_credentials',
    railway: 'https://railway.app/account/tokens',
    render: 'https://dashboard.render.com/account/api-keys',
    cloudflare: 'https://dash.cloudflare.com/profile/api-tokens',
    fly: 'https://fly.io/user/personal_access_tokens'
  };

  return docsMap[provider] || `https://${provider}.com/docs`;
}

/**
 * Get human-readable storage location
 */
function getStorageLocation(scheme: string): string {
  const locationMap: Record<string, string> = {
    'os-keyring': process.platform === 'darwin'
      ? 'macOS Keychain'
      : process.platform === 'win32'
        ? 'Windows Credential Manager'
        : 'Linux Secret Service',
    'env': 'Environment variables',
    'file': 'Encrypted file'
  };

  return locationMap[scheme] || 'Secure storage';
}