/**
 * @fileoverview Auth Commands - OAuth connection management
 * @description Commands for connecting, listing, switching, and revoking OAuth accounts
 * @module node-cli/commands/auth
 */

import chalk from 'chalk';
import { AuthManager, type AuthProvider, type OAuthFlowOptions } from '../services/auth-manager.js';

/**
 * Connect to a provider via OAuth
 */
export async function executeAuthConnect(
  provider: string,
  options: { scopes?: string; team?: string; organization?: string } = {}
): Promise<void> {
  const authManager = new AuthManager();

  // Parse scopes if provided
  const flowOptions: OAuthFlowOptions = {
    ...(options.scopes && { scopes: options.scopes.split(',').map(s => s.trim()) }),
    ...(options.team && { team: options.team }),
    ...(options.organization && { organization: options.organization })
  };

  try {
    const context = await authManager.connect(provider as AuthProvider, flowOptions);

    console.log(chalk.green(`\n✓ Connected to ${provider}`));
    console.log(chalk.gray(`  Account: ${context.username}`));
    console.log(chalk.gray(`  Vault ref: ${context.vaultRef}\n`));

    if (context.organizations && context.organizations.length > 0) {
      console.log(chalk.gray(`  Organizations: ${context.organizations.join(', ')}`));
    }

    if (context.teams && context.teams.length > 0) {
      console.log(chalk.gray(`  Teams: ${context.teams.join(', ')}`));
    }

    console.log();
  } catch (error) {
    console.error(chalk.red(`\n✗ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
    process.exit(1);
  }
}

/**
 * List all connected accounts
 */
export async function executeAuthList(): Promise<void> {
  const authManager = new AuthManager();

  try {
    const connections = await authManager.list();

    if (connections.length === 0) {
      console.log(chalk.yellow('\n⚠️  No connected accounts\n'));
      console.log(chalk.gray('  Use "aios auth connect --provider <provider>" to connect\n'));
      return;
    }

    console.log(chalk.cyan('\n📋 Connected Accounts\n'));

    for (const conn of connections) {
      const status = conn.isActive ? chalk.green('● active') : chalk.gray('○ inactive');
      console.log(`  ${status} ${chalk.white(conn.provider)} - ${conn.username}`);
      console.log(chalk.gray(`    Connected: ${conn.createdAt.toLocaleDateString()}`));
    }

    console.log();
  } catch (error) {
    console.error(chalk.red(`\n✗ Failed to list accounts: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
    process.exit(1);
  }
}

/**
 * Show auth status for a provider
 */
export async function executeAuthStatus(provider?: string): Promise<void> {
  const authManager = new AuthManager();

  try {
    if (provider) {
      // Show status for specific provider
      const context = await authManager.getActiveConnection(provider as AuthProvider);

      if (!context) {
        console.log(chalk.yellow(`\n⚠️  Not connected to ${provider}\n`));
        console.log(chalk.gray(`  Use "aios auth connect --provider ${provider}" to connect\n`));
        return;
      }

      console.log(chalk.green(`\n✓ Connected to ${provider}`));
      console.log(chalk.gray(`  Account: ${context.username}`));
      console.log(chalk.gray(`  Vault ref: ${context.vaultRef}`));

      if (context.expiresAt) {
        const now = new Date();
        const timeLeft = context.expiresAt.getTime() - now.getTime();
        const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        console.log(chalk.gray(`  Expires: ${daysLeft} days`));
      }

      console.log();
    } else {
      // Show overall status
      const connections = await authManager.list();

      console.log(chalk.cyan('\n📊 Authentication Status\n'));

      const providers = ['github', 'gitlab', 'vercel', 'netlify', 'cloudflare'];

      for (const prov of providers) {
        const conn = connections.find(c => c.provider === prov);

        if (conn) {
          const status = conn.isActive ? chalk.green('● connected') : chalk.gray('○ connected (inactive)');
          console.log(`  ${status} ${prov} - ${conn.username}`);
        } else {
          console.log(chalk.gray(`  ○ not connected ${prov}`));
        }
      }

      console.log();
    }
  } catch (error) {
    console.error(chalk.red(`\n✗ Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
    process.exit(1);
  }
}

/**
 * Switch to a different account for a provider
 */
export async function executeAuthSwitch(
  provider: string,
  account: string
): Promise<void> {
  const authManager = new AuthManager();

  try {
    await authManager.switch(provider as AuthProvider, account);
    console.log(chalk.green(`\n✓ Switched to ${provider} account: ${account}\n`));
  } catch (error) {
    console.error(chalk.red(`\n✗ Switch failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
    process.exit(1);
  }
}

/**
 * Revoke connection to a provider
 */
export async function executeAuthRevoke(
  provider: string,
  account: string
): Promise<void> {
  const authManager = new AuthManager();

  try {
    await authManager.revoke(provider as AuthProvider, account);
    // authManager.revoke() already prints success message with revocation URL
  } catch (error) {
    console.error(chalk.red(`\n✗ Revoke failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
    process.exit(1);
  }
}
