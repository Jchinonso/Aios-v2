/**
 * @fileoverview System status checking utilities
 * @description Shared status checking logic for CLI and interactive modes
 * @module node-cli/utils/status-checker
 */

import chalk from 'chalk';

/**
 * AI provider configuration status
 */
export interface AIProviderStatusType {
  readonly openai: boolean;
  readonly anthropic: boolean;
  readonly ollama: boolean;
  readonly groq: boolean;
}

/**
 * System environment information
 */
export interface SystemEnvironmentType {
  readonly cwd: string;
  readonly nodeVersion: string;
  readonly platform: string;
}

/**
 * Complete system status
 */
export interface SystemStatusType {
  readonly aiProviders: AIProviderStatusType;
  readonly environment: SystemEnvironmentType;
}

/**
 * Check which AI providers are configured
 */
export function checkAIProviders(): AIProviderStatusType {
  return {
    openai: Boolean(process.env['OPENAI_API_KEY']),
    anthropic: Boolean(process.env['ANTHROPIC_API_KEY']),
    ollama: Boolean(process.env['OLLAMA_BASE_URL']),
    groq: Boolean(process.env['GROQ_API_KEY'])
  };
}

/**
 * Check if any AI provider is configured
 */
export function hasAnyAIProvider(status: AIProviderStatusType): boolean {
  return Object.values(status).some(Boolean);
}

/**
 * Get current system environment information
 */
export function getSystemEnvironment(): SystemEnvironmentType {
  return {
    cwd: process.cwd(),
    nodeVersion: process.version,
    platform: process.platform
  };
}

/**
 * Get complete system status
 */
export function getSystemStatus(): SystemStatusType {
  return {
    aiProviders: checkAIProviders(),
    environment: getSystemEnvironment()
  };
}

/**
 * Display system status in the console
 */
export async function displaySystemStatus(status: SystemStatusType): Promise<void> {
  const Table = (await import('cli-table3')).default;
  const boxen = (await import('boxen')).default;

  // AI Providers table
  const providersTable = new Table({
    head: [chalk.cyan('AI Provider'), chalk.cyan('Status')],
    style: {
      head: [],
      border: ['gray']
    }
  });

  providersTable.push(
    ['OpenAI API', status.aiProviders.openai ? chalk.green('✓ Configured') : chalk.red('✗ Missing')],
    ['Anthropic API', status.aiProviders.anthropic ? chalk.green('✓ Configured') : chalk.red('✗ Missing')],
    ['Ollama', status.aiProviders.ollama ? chalk.green('✓ Configured') : chalk.red('✗ Missing')],
    ['Groq', status.aiProviders.groq ? chalk.green('✓ Configured') : chalk.red('✗ Missing')]
  );

  // Environment table
  const envTable = new Table({
    head: [chalk.cyan('Environment'), chalk.cyan('Value')],
    style: {
      head: [],
      border: ['gray']
    }
  });

  envTable.push(
    ['Working Directory', chalk.white(status.environment.cwd)],
    ['Node Version', chalk.white(status.environment.nodeVersion)],
    ['Platform', chalk.white(status.environment.platform)]
  );

  let content = providersTable.toString() + '\n\n' + envTable.toString();

  // Warning if no providers
  if (!hasAnyAIProvider(status.aiProviders)) {
    content += '\n\n' + chalk.yellow('⚠️  No AI providers configured\n') +
               chalk.gray('Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or OLLAMA_BASE_URL');
  }

  console.log(boxen(content, {
    title: chalk.bold('📊 AIOS System Status'),
    titleAlignment: 'center',
    padding: 1,
    borderStyle: 'round',
    borderColor: 'blue'
  }));
}
