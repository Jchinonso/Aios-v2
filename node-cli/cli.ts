#!/usr/bin/env node

/**
 * AIOS CLI - Working integration with Intelligence and Cloud
 *
 * @fileoverview Production CLI entry point
 * @module node-cli
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from multiple locations
// 1. AIOS installation directory (where API keys are stored)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const aiosRootDir = resolve(__dirname, '..', '..');
config({ path: resolve(aiosRootDir, '.env') });

// 2. Current working directory (user's project)
config({ path: resolve(process.cwd(), '.env') });

// 3. Parent directory (for monorepo setups)
config({ path: resolve(process.cwd(), '..', '.env') });

// Import services and handlers
import { ContainerFactory } from './services/container-factory.js';
import { DeploymentHandler, type DeploymentEnvironment } from './handlers/index.js';
import {
  executeAnalyze,
  executeRecommend,
  executeAIAnalyze,
  executeAuthConnect,
  executeAuthList,
  executeAuthStatus,
  executeAuthSwitch,
  executeAuthRevoke
} from './commands/index.js';
import type { CloudProviderType } from '@aios/shared';
import { getSystemStatus, displaySystemStatus } from './utils/status-checker.js';

/**
 * AIOS CLI Application
 */
class AIOSCLIApplication {
  private readonly program: Command;

  constructor() {
    this.program = new Command();
    this.setupProgram();
    this.registerCommands();
    this.setupGracefulShutdown();
  }

  private setupProgram(): void {
    this.program
      .name('aios')
      .description('AI-powered DevOps assistant for project analysis and cloud deployment')
      .version('2.0.0')
      .option('-v, --verbose', 'Enable verbose output')
      .option('--debug', 'Enable debug logging')
      .option('--yes', 'Auto-approve all prompts (non-interactive mode)')
      .option('--json', 'Output results in JSON format')
      .option('--plan', 'Show execution plan without executing (dry-run)')
      .option('--trace', 'Enable detailed execution tracing');

    this.program.on('command:*', () => {
      console.error(chalk.red(`Unknown command: ${this.program.args.join(' ')}`));
      console.log(chalk.blue('Run "aios --help" to see available commands'));
      process.exit(1);
    });
  }

  private registerCommands(): void {
    // Auth command group (OAuth management)
    const auth = this.program
      .command('auth')
      .description('Manage OAuth connections (GitHub, Vercel, Netlify, etc.)');

    auth
      .command('connect')
      .description('Connect to a provider via OAuth')
      .requiredOption('--provider <provider>', 'Provider (github|gitlab|vercel|netlify|cloudflare)')
      .option('--scopes <scopes>', 'OAuth scopes (comma-separated)')
      .option('--team <team>', 'Pre-select team (Vercel/Netlify)')
      .option('--organization <org>', 'Pre-select organization (GitHub)')
      .action(async (options) => {
        await executeAuthConnect(options.provider, options);
      });

    auth
      .command('list')
      .description('List all connected accounts')
      .action(async () => {
        await executeAuthList();
      });

    auth
      .command('status')
      .description('Show authentication status')
      .option('--provider <provider>', 'Show status for specific provider')
      .action(async (options) => {
        await executeAuthStatus(options.provider);
      });

    auth
      .command('switch')
      .description('Switch to a different account')
      .requiredOption('--provider <provider>', 'Provider name')
      .requiredOption('--account <account>', 'Account ID or username')
      .action(async (options) => {
        await executeAuthSwitch(options.provider, options.account);
      });

    auth
      .command('revoke')
      .description('Revoke connection to a provider')
      .requiredOption('--provider <provider>', 'Provider name')
      .requiredOption('--account <account>', 'Account ID or username')
      .action(async (options) => {
        await executeAuthRevoke(options.provider, options.account);
      });

    // Source command group (Git workspace management)
    const source = this.program
      .command('source')
      .description('Manage Git source code workspaces');

    source
      .command('use')
      .description('Clone and use a Git repository as source')
      .requiredOption('--repo <repo>', 'Repository (org/repo or URL)')
      .option('--branch <branch>', 'Branch name', 'main')
      .option('--subdir <subdir>', 'Subdirectory to use (e.g., apps/web)')
      .action(async (_options) => {
        console.log(chalk.yellow('\n⚠️  "aios source use" not yet implemented\n'));
        console.log(chalk.gray('Use natural language instead:\n'));
        console.log(chalk.white('  aios chat\n'));
        console.log(chalk.white('  > deploy github acme/webshop@main (apps/web) to vercel\n'));
      });

    // Runtime command group (Deployment operations)
    const runtime = this.program
      .command('runtime')
      .description('Runtime operations (deploy, scale, rollback)');

    runtime
      .command('deploy')
      .description('Deploy project to cloud')
      .option('-p, --path <path>', 'Project path', process.cwd())
      .option('-e, --env <environment>', 'Target environment', 'staging')
      .option('-c, --cloud <provider>', 'Cloud provider')
      .option('--auto-approve', 'Skip confirmation prompts', false)
      .option('--dry-run', 'Show what would be deployed', false)
      .action(async (options) => {
        await this.handleDeploy(options);
      });

    runtime
      .command('scale')
      .description('Scale a service')
      .option('--service <service>', 'Service name')
      .option('--replicas <count>', 'Number of replicas')
      .option('--env <environment>', 'Environment', 'staging')
      .action(async (_options) => {
        console.log(chalk.yellow('Scale command - not yet implemented'));
        console.log(chalk.gray('Use natural language: "scale web-app to 5 replicas"'));
      });

    runtime
      .command('rollback')
      .description('Rollback a deployment')
      .option('--service <service>', 'Service name')
      .option('--env <environment>', 'Environment')
      .action(async (_options) => {
        console.log(chalk.yellow('Rollback command - not yet implemented'));
        console.log(chalk.gray('Use natural language: "rollback api-server in production"'));
      });

    // Observability command group
    const obs = this.program
      .command('obs')
      .description('Observability operations (logs, metrics, diagnostics)');

    obs
      .command('logs')
      .description('View service logs')
      .option('--service <service>', 'Service name')
      .option('--since <duration>', 'Time window (e.g., 1h, 30m)')
      .option('--level <level>', 'Log level (info|warn|error)')
      .action(async (_options) => {
        console.log(chalk.yellow('Logs command - not yet implemented'));
        console.log(chalk.gray('Use natural language: "show logs for api-server"'));
      });

    // Cloud command group (legacy - maintain backward compatibility)
    const cloud = this.program
      .command('cloud')
      .description('Cloud provider operations');

    cloud
      .command('analyze')
      .description('Analyze project for deployment')
      .option('-p, --path <path>', 'Project path', process.cwd())
      .option('--verbose', 'Show detailed analysis', false)
      .option('--json', 'Output as JSON', false)
      .action(async (options) => {
        await this.handleAnalyze(options);
      });

    cloud
      .command('recommend')
      .description('Get provider recommendations')
      .option('-p, --path <path>', 'Project path', process.cwd())
      .option('--cost-optimization', 'Prioritize cost optimization', false)
      .option('--performance-first', 'Prioritize performance', false)
      .option('--json', 'Output as JSON', false)
      .action(async (options) => {
        await this.handleRecommend(options);
      });

    cloud
      .command('connect')
      .description('[DEPRECATED] Use "aios auth connect" instead')
      .option('-p, --path <path>', 'Project path', process.cwd())
      .option('--provider <provider>', 'Cloud provider')
      .action(async (options) => {
        console.log(chalk.yellow('⚠️  "aios cloud connect" is deprecated.\n'));
        console.log(chalk.cyan('Use OAuth-based authentication instead:\n'));
        console.log(chalk.white(`  aios auth connect --provider ${options.provider || '<provider>'}\n`));
        console.log(chalk.gray('Supported providers: github, gitlab, vercel, netlify, cloudflare\n'));
      });

    cloud
      .command('deploy')
      .description('[DEPRECATED] Use "aios runtime deploy" instead')
      .option('-p, --path <path>', 'Project path', process.cwd())
      .option('-e, --env <environment>', 'Target environment', 'staging')
      .option('-c, --cloud <provider>', 'Cloud provider')
      .option('--auto-approve', 'Skip confirmation prompts', false)
      .option('--dry-run', 'Show what would be deployed', false)
      .action(async (options) => {
        console.log(chalk.yellow('⚠️  "aios cloud deploy" is deprecated. Use "aios runtime deploy" instead.\n'));
        await this.handleDeploy(options);
      });

    // AI command group
    const ai = this.program
      .command('ai')
      .description('AI-powered analysis and insights');

    ai
      .command('analyze')
      .description('AI-powered project analysis')
      .option('-p, --path <path>', 'Project path', process.cwd())
      .option('--insights', 'Generate AI insights (default: true)', true)
      .option('--improvements', 'Get improvement suggestions', false)
      .option('--architecture', 'Analyze architecture', false)
      .option('--json', 'Output as JSON', false)
      .action(async (options) => {
        await this.handleAIAnalyze(options);
      });

    // Adopt command (top-level)
    this.program
      .command('adopt')
      .description('Adopt existing cloud deployment (read-only)')
      .option('--provider <provider>', 'Cloud provider')
      .option('--read-only', 'Enable read-only mode (default)', true)
      .option('--enable-write', 'Enable write operations', false)
      .action(async (_options) => {
        console.log(chalk.blue('🔗 Adopting existing deployment...\n'));
        console.log(chalk.yellow('Adopt command - not yet implemented'));
        console.log(chalk.gray('Use natural language: "adopt from vercel"'));
      });

    // Status command
    this.program
      .command('status')
      .description('Show system and environment status')
      .action(async () => {
        await this.handleStatus();
      });

    // Note: Chat mode is now the default when no command is provided
    // No need for explicit 'chat' command
  }

  private async handleAnalyze(options: {
    path: string;
    verbose?: boolean;
    json?: boolean;
  }): Promise<void> {
    try {
      const opts = this.program.opts();
      const container = await ContainerFactory.getOrCreate({
        debug: opts['debug'],
        verbose: opts['verbose']
      });
      await executeAnalyze(options, container.logger);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
      process.exit(1);
    }
  }

  private async handleRecommend(options: {
    path: string;
    costOptimization?: boolean;
    performanceFirst?: boolean;
    json?: boolean;
  }): Promise<void> {
    try {
      const opts = this.program.opts();
      const container = await ContainerFactory.getOrCreate({
        debug: opts['debug'],
        verbose: opts['verbose']
      });
      await executeRecommend(options, container.cloudManager, container.logger);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
      process.exit(1);
    }
  }


  private async handleAIAnalyze(options: {
    path: string;
    insights?: boolean;
    improvements?: boolean;
    architecture?: boolean;
    json?: boolean;
  }): Promise<void> {
    try {
      const opts = this.program.opts();
      const container = await ContainerFactory.getOrCreate({
        debug: opts['debug'],
        verbose: opts['verbose']
      });
      await executeAIAnalyze(options, container.logger);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
      process.exit(1);
    }
  }

  private async handleDeploy(options: {
    path: string;
    env: string;
    cloud?: string;
    autoApprove: boolean;
    dryRun: boolean;
  }): Promise<void> {
    try {
      console.log(chalk.blue.bold('\n🚀 AIOS Deployment\n'));

      const opts = this.program.opts();
      const container = await ContainerFactory.getOrCreate({
        debug: opts['debug'],
        verbose: opts['verbose']
      });

      const handler = new DeploymentHandler(
        container.intelligence,
        container.cloudManager,
        container.logger,
        container.metrics
      );

      // Validate environment
      const validEnvs: readonly DeploymentEnvironment[] = ['development', 'staging', 'production', 'preview'];
      if (!validEnvs.includes(options.env as DeploymentEnvironment)) {
        console.log(chalk.red(`\n❌ Invalid environment: ${options.env}`));
        console.log(chalk.gray(`Valid options: ${validEnvs.join(', ')}\n`));
        process.exit(1);
      }

      const summary = await handler.handle({
        path: options.path,
        env: options.env as DeploymentEnvironment,
        ...(options.cloud && { cloud: options.cloud as CloudProviderType }),
        autoApprove: options.autoApprove,
        dryRun: options.dryRun
      });

      if (summary.success) {
        console.log(chalk.green('\n✅ Deployment successful!\n'));
        process.exit(0);
      } else {
        console.log(chalk.red(`\n❌ Deployment failed: ${summary.error}\n`));
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
      process.exit(1);
    }
  }


  private async handleStatus(): Promise<void> {
    try {
      // Display system status using shared utility
      const status = getSystemStatus();
      displaySystemStatus(status);

      try {
        console.log(chalk.blue('\nVerifying services...'));
        const opts = this.program.opts();
        const container = await ContainerFactory.getOrCreate({
          debug: opts['debug'],
          verbose: opts['verbose']
        });
        console.log(chalk.green('✓ All services initialized successfully'));

        if (opts['verbose']) {
          const metrics = container.metrics;
          // Check if metrics has printSummary method (not part of IMetricsCollector interface)
          if ('printSummary' in metrics && typeof (metrics as { printSummary?: () => void }).printSummary === 'function') {
            (metrics as { printSummary: () => void }).printSummary();
          }
        }
      } catch (error) {
        console.log(chalk.red(`✗ Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }


  private setupGracefulShutdown(): void {
    const cleanup = async () => {
      await ContainerFactory.dispose();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }

  async run(): Promise<void> {
    const args = process.argv.slice(2);

    // If no arguments provided, start chat mode directly
    if (args.length === 0) {
      await this.enterNaturalLanguageMode();
      return;
    }

    // Parse all commands normally
    this.program.parse(process.argv);
  }

  /**
   * Enter interactive natural language mode
   */
  private async enterNaturalLanguageMode(): Promise<void> {
    const opts = this.program.opts();
    const { startNLSession } = await import('./nl-session.js');
    await startNLSession({
      autoApprove: opts['yes'] || false,
      jsonOutput: opts['json'] || false,
      planOnly: opts['plan'] || false,
      trace: opts['trace'] || false,
      verbose: opts['verbose'] || false,
      debug: opts['debug'] || false
    });
  }
}

// Entry point
const app = new AIOSCLIApplication();
app.run();

export { AIOSCLIApplication };