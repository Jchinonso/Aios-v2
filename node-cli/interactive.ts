#!/usr/bin/env node

/**
 * AIOS Interactive CLI
 *
 * @fileoverview Interactive menu-driven interface for AIOS
 * @module node-cli/interactive
 */

import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { executeAnalyze, executeRecommend, executeConnect } from './commands/index.js';
import type { ILogger, CloudProviderType } from '@aios/shared';
import { ContainerFactory } from './services/container-factory.js';
import { getSystemStatus, displaySystemStatus } from './utils/status-checker.js';
import {
  selectEnvironment,
  promptForCloudProvider,
  promptForDryRun,
  promptForVerbose,
  promptForPriority,
  pressEnterToContinue
} from './prompts/index.js';
import type { DeploymentHandler } from './handlers/index.js';

interface InteractiveOptions {
  logger: ILogger;
  projectPath: string;
}

/**
 * Main interactive CLI loop
 */
export async function runInteractiveCLI(options: InteractiveOptions): Promise<void> {
  console.clear();

  const boxen = (await import('boxen')).default;
  const gradient = (await import('gradient-string')).default;

  const title = gradient.pastel.multiline('🚀 AIOS\nAI-Powered DevOps Assistant');
  const banner = boxen(
    title + '\n\n' + chalk.cyan(`📁 Project: ${options.projectPath}`),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      textAlignment: 'center'
    }
  );

  console.log(banner);

  let running = true;

  while (running) {
    const action = await select<string>({
      message: 'What would you like to do?',
      choices: [
        {
          name: `${chalk.green.bold('💬')} Natural Language Mode - Chat with AIOS using plain English`,
          value: 'nl-session'
        },
        { name: '──────────', value: 'separator-1', disabled: true },
        {
          name: `${chalk.blue('📊')} Analyze Project - Detect frameworks, languages, and dependencies`,
          value: 'analyze'
        },
        {
          name: `${chalk.green('🌐')} Get Recommendations - Find the best cloud provider for your project`,
          value: 'recommend'
        },
        {
          name: `${chalk.yellow('🔗')} Connect Provider - Set up credentials for cloud deployment`,
          value: 'connect'
        },
        {
          name: `${chalk.magenta('🚀')} Deploy - Deploy your project to the cloud`,
          value: 'deploy'
        },
        {
          name: `${chalk.cyan('📋')} System Status - Check AIOS configuration and services`,
          value: 'status'
        },
        { name: '──────────', value: 'separator-2', disabled: true },
        {
          name: `${chalk.red('❌')} Exit`,
          value: 'exit'
        }
      ]
    });

    console.log(''); // Add spacing

    switch (action) {
      case 'nl-session':
        await handleNLSession(options);
        break;
      case 'analyze':
        await handleAnalyze(options);
        break;
      case 'recommend':
        await handleRecommend(options);
        break;
      case 'connect':
        await handleConnect(options);
        break;
      case 'deploy':
        await handleDeploy(options);
        break;
      case 'status':
        await handleStatus(options);
        break;
      case 'exit':
        running = false;
        console.log(chalk.green('\n👋 Thanks for using AIOS!\n'));
        break;
    }

    if (running) {
      await pressEnterToContinueWrapper();
    }
  }
}

/**
 * Handle Natural Language session
 */
async function handleNLSession(_options: InteractiveOptions): Promise<void> {
  console.log(chalk.green.bold('\n💬 Entering Natural Language Mode\n'));
  console.log(chalk.gray('You can now chat with AIOS using plain English'));
  console.log(chalk.gray('Examples:'));
  console.log(chalk.cyan('  - "deploy my app to vercel"'));
  console.log(chalk.cyan('  - "show logs for api-server"'));
  console.log(chalk.cyan('  - "scale web-app to 5 replicas"'));
  console.log(chalk.gray('\nType "exit" or press Ctrl+C to return to the menu\n'));

  const { startNLSession } = await import('./nl-session.js');

  try {
    await startNLSession({
      autoApprove: false,
      jsonOutput: false,
      planOnly: false,
      trace: false
    });
  } catch (error) {
    if (error instanceof Error && error.message !== 'User exited') {
      console.error(chalk.red('\nNL Session error:'), error.message);
    }
  }

  console.log(chalk.green('\n✓ Returned to main menu\n'));
}

/**
 * Handle analyze action
 */
async function handleAnalyze(options: InteractiveOptions): Promise<void> {
  const verbose = await promptForVerbose();

  await executeAnalyze(
    {
      path: options.projectPath,
      verbose,
      json: false
    },
    options.logger
  );
}

/**
 * Handle recommend action
 */
async function handleRecommend(options: InteractiveOptions): Promise<void> {
  const { CloudManager } = await import('@aios/shared');

  const priority = await promptForPriority();

  const preferences = {
    costOptimization: priority === 'cost',
    performanceFirst: priority === 'performance'
  };

  const cloudManager = new CloudManager();
  await executeRecommend(
    {
      path: options.projectPath,
      ...preferences,
      json: false
    },
    cloudManager,
    options.logger
  );
}

/**
 * Handle connect action
 */
async function handleConnect(options: InteractiveOptions): Promise<void> {
  await executeConnect(
    {
      path: options.projectPath
    },
    options.logger
  );
}

/**
 * Handle deploy action
 */
async function handleDeploy(options: InteractiveOptions): Promise<void> {
  const { DeploymentHandler: Handler } = await import('./handlers/index.js') as { DeploymentHandler: typeof DeploymentHandler };

  const env = await selectEnvironment();
  const cloud = await promptForCloudProvider();
  const dryRun = await promptForDryRun();

  console.log(chalk.blue.bold('\n🚀 Starting Deployment...\n'));

  try {
    const container = await ContainerFactory.getOrCreate();

    const handler = new Handler(
      container.intelligence,
      container.cloudManager,
      container.logger,
      container.metrics
    );

    const summary = await handler.handle({
      path: options.projectPath,
      env,
      ...(cloud && { cloud: cloud as CloudProviderType }),
      autoApprove: false,
      dryRun
    });

    if (summary.success) {
      console.log(chalk.green('\n✅ Deployment successful!\n'));
    } else {
      console.log(chalk.red(`\n❌ Deployment failed: ${summary.error}\n`));
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
  }
}

/**
 * Handle status action
 */
async function handleStatus(_options: InteractiveOptions): Promise<void> {
  const status = getSystemStatus();
  await displaySystemStatus(status);
}

/**
 * Wait for user to press Enter (wrapper for shared utility)
 */
async function pressEnterToContinueWrapper(): Promise<void> {
  await pressEnterToContinue(chalk.gray('Press Enter to continue...'));
  console.clear();
  console.log(chalk.blue.bold('\n🚀 AIOS - AI-Powered DevOps Assistant\n'));
  console.log(chalk.gray('═'.repeat(60)) + '\n');
}