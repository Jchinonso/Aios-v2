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

    // Session management commands (Phase 1 Integration)
    const session = this.program
      .command('session')
      .description('Manage conversation sessions (resume, list)');

    session
      .command('resume [sessionId]')
      .description('Resume a previous conversation session')
      .action(async (sessionId?: string) => {
        await this.handleResumeSession(sessionId);
      });

    session
      .command('list')
      .alias('ls')
      .description('List all resumable conversation sessions')
      .action(async () => {
        await this.handleListSessions();
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

  /**
   * Handle session resume command (Phase 1 Integration)
   * Allows users to resume previous conversation sessions with full context
   *
   * **Security**:
   * - Validates session ID format to prevent path traversal
   * - Uses type-safe error handling with Result pattern
   * - Graceful degradation on failures
   *
   * **Edge Cases**:
   * - No sessions available → Helpful error message
   * - Session expired between list and load → Graceful error
   * - Invalid session ID format → Rejected with clear message
   */
  private async handleResumeSession(sessionId?: string): Promise<void> {
    try {
      const opts = this.program.opts();
      const container = await ContainerFactory.getOrCreate({
        debug: opts['debug'],
        verbose: opts['verbose']
      });

      const { SessionPersistence } = await import('./services/session-persistence.js');
      const persistence = new SessionPersistence(container.logger);

      // If no session ID provided, list resumable sessions and pick most recent
      if (!sessionId) {
        const resumableResult = await persistence.listResumableSessions();

        if (resumableResult.isFailure || !resumableResult.value || resumableResult.value.length === 0) {
          console.log(chalk.yellow('\n⚠️  No resumable sessions found.\n'));
          console.log(chalk.gray('Sessions are kept for 24 hours. Start a new conversation with: aios\n'));
          return;
        }

        const sessions = resumableResult.value;

        // Type-safe access - check before non-null assertion
        const mostRecent = sessions[0];
        if (!mostRecent) {
          console.log(chalk.yellow('\n⚠️  No resumable sessions found.\n'));
          return;
        }

        sessionId = mostRecent.sessionId;
        console.log(chalk.gray(`\nResuming most recent session: ${sessionId.substring(0, 20)}...\n`));
      }

      // **Security**: Validate session ID format to prevent path traversal attacks
      if (!this.isValidSessionId(sessionId)) {
        console.log(chalk.red('\n❌ Invalid session ID format.\n'));
        console.log(chalk.gray('Session IDs must match pattern: session-{timestamp}-{random}\n'));
        return;
      }

      // Load the session (may fail if expired/deleted between list and load)
      const loadResult = await persistence.loadSession(sessionId);

      if (loadResult.isFailure) {
        console.log(chalk.red(`\n❌ Failed to resume session: ${loadResult.error.message}\n`));
        console.log(chalk.gray('The session may have expired or been deleted.\n'));
        console.log(chalk.gray('Use "aios session list" to see available sessions\n'));
        return;
      }

      const snapshot = loadResult.value;

      console.log(chalk.green('✅ Session resumed successfully!\n'));
      console.log(chalk.cyan('📊 Session Details:\n'));
      console.log(chalk.white(`  Session ID:     ${sessionId}`));
      console.log(chalk.white(`  Turns:          ${snapshot.turns.length}`));
      console.log(chalk.white(`  Preferences:    ${snapshot.preferences.length}`));

      if (snapshot.projectContext) {
        console.log(chalk.white(`  Project:        ${snapshot.projectContext.path || 'Unknown'}`));
        console.log(chalk.white(`  Framework:      ${snapshot.projectContext.framework || 'Unknown'}`));
      }

      console.log(chalk.gray('\n💡 Starting interactive session with restored context...\n'));

      // Enter NL mode with resumed session
      await this.enterNaturalLanguageMode();

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
      process.exit(1);
    }
  }

  /**
   * Validate session ID format for security
   * Prevents path traversal and injection attacks
   *
   * @param sessionId - Session ID to validate
   * @returns True if valid format
   *
   * @example
   * ```typescript
   * isValidSessionId('session-1759701436504-t0ytkw') // true
   * isValidSessionId('../../../etc/passwd') // false
   * isValidSessionId('session-123') // false (missing random suffix)
   * ```
   */
  private isValidSessionId(sessionId: string): boolean {
    // Format: session-{timestamp}-{random} or aios-session-{timestamp}-{random}
    const validPattern = /^(aios-)?session-\d{13,}-[a-z0-9]{5,}$/;

    // Additional security checks
    const hasPathTraversal = sessionId.includes('..') || sessionId.includes('/') || sessionId.includes('\\');
    const hasNullByte = sessionId.includes('\0');

    return validPattern.test(sessionId) && !hasPathTraversal && !hasNullByte;
  }

  /**
   * Handle sessions list command (Phase 1 Integration)
   * Shows all resumable conversation sessions
   */
  private async handleListSessions(): Promise<void> {
    try {
      const opts = this.program.opts();
      const container = await ContainerFactory.getOrCreate({
        debug: opts['debug'],
        verbose: opts['verbose']
      });

      const { SessionPersistence } = await import('./services/session-persistence.js');
      const persistence = new SessionPersistence(container.logger);

      const resumableResult = await persistence.listResumableSessions();

      if (resumableResult.isFailure) {
        console.log(chalk.red(`\n❌ Failed to list sessions: ${resumableResult.error.message}\n`));
        return;
      }

      const sessions = resumableResult.value;

      if (!sessions || sessions.length === 0) {
        console.log(chalk.yellow('\n📋 No resumable sessions found.\n'));
        console.log(chalk.gray('Sessions are kept for 24 hours after last activity.\n'));
        console.log(chalk.gray('Start a new conversation with: aios\n'));
        return;
      }

      console.log(chalk.cyan('\n📋 Resumable Sessions:\n'));

      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i]!;
        const relativeTime = this.formatRelativeTime(session.lastModified);
        const sizeKB = (session.size / 1024).toFixed(1);

        console.log(chalk.white(`${i + 1}. ${session.sessionId}`));
        console.log(chalk.gray(`   Last active: ${relativeTime}`));
        console.log(chalk.gray(`   Size: ${sizeKB} KB\n`));
      }

      console.log(chalk.gray('Use "aios session resume <sessionId>" to restore a session\n'));
      console.log(chalk.gray('Or simply "aios session resume" to resume the most recent one\n'));

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
      process.exit(1);
    }
  }

  /**
   * Format relative time (helper for session listing)
   */
  private formatRelativeTime(date: Date): string {
    const now = Date.now();
    const then = date.getTime();
    const diffMs = now - then;

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
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