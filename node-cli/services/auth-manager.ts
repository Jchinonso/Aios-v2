/**
 * @fileoverview Auth Manager - Centralized OAuth orchestration
 * @description OAuth-only authentication for Git & Cloud providers with OS keyring storage
 * @module node-cli/services/auth-manager
 *
 * PROVIDER OAUTH SUPPORT (verified 2025):
 * ✅ GitHub - OAuth Device Flow (fully implemented)
 * ⚠️  GitLab - OAuth Device Flow (requires registered app, not yet implemented)
 * ⚠️  Bitbucket - OAuth (not yet implemented)
 * ⚠️  Vercel - OAuth Device Flow (requires integration registration)
 * ⚠️  Netlify - Browser-based OAuth redirect (requires local callback server)
 * ⚠️  Cloudflare - API tokens only (no OAuth support)
 * ⚠️  AWS - SSO/IAM device login (Phase 2)
 * ⚠️  GCP - Device login OAuth (Phase 2)
 * ⚠️  Azure - Device login OAuth (Phase 2)
 */

import chalk from 'chalk';
import { SecretsVault, type VaultRef } from './secrets-vault.js';

/**
 * Supported auth providers
 */
export type AuthProvider =
  | 'github'
  | 'gitlab'
  | 'bitbucket'
  | 'vercel'
  | 'netlify'
  | 'cloudflare'
  | 'aws'
  | 'gcp'
  | 'azure';

/**
 * Account context after successful OAuth
 */
export interface AccountContext {
  readonly provider: AuthProvider;
  readonly username: string;
  readonly accountId: string;
  readonly vaultRef: VaultRef;
  readonly scopes: readonly string[];
  readonly teams?: readonly string[]; // For Vercel/Netlify team selection
  readonly organizations?: readonly string[]; // For GitHub orgs
  readonly expiresAt?: Date; // Token expiration
}

/**
 * Auth connection info for listing
 */
export interface AuthConnection {
  readonly provider: AuthProvider;
  readonly username: string;
  readonly accountId: string;
  readonly createdAt: Date;
  readonly isActive: boolean;
}

/**
 * OAuth flow options
 */
export interface OAuthFlowOptions {
  readonly scopes?: readonly string[];
  readonly team?: string; // Pre-select team for Vercel/Netlify
  readonly organization?: string; // Pre-select org for GitHub
  readonly verbose?: boolean;
}

/**
 * Central authentication manager
 * Abstracts OAuth flows for all providers with consistent interface
 */
export class AuthManager {
  private readonly vault: SecretsVault;
  private readonly activeConnections = new Map<string, AccountContext>();

  constructor(projectRoot: string = process.cwd()) {
    this.vault = new SecretsVault(projectRoot);
  }

  /**
   * Connect to a provider via OAuth
   *
   * @param provider - Provider to connect
   * @param options - OAuth flow options
   * @returns Account context with vault reference
   */
  async connect(provider: AuthProvider, options: OAuthFlowOptions = {}): Promise<AccountContext> {
    console.log(chalk.blue(`\n🔐 Connecting to ${provider}...\n`));

    let context: AccountContext;

    switch (provider) {
      case 'github':
        context = await this.connectGitHub(options);
        break;

      case 'gitlab':
        context = await this.connectGitLab(options);
        break;

      case 'bitbucket':
        context = await this.connectBitbucket(options);
        break;

      case 'vercel':
        context = await this.connectVercel(options);
        break;

      case 'netlify':
        context = await this.connectNetlify(options);
        break;

      case 'cloudflare':
        context = await this.connectCloudflare(options);
        break;

      case 'aws':
        throw new Error('AWS SSO not yet implemented (Phase 2)');

      case 'gcp':
        throw new Error('GCP OAuth not yet implemented (Phase 2)');

      case 'azure':
        throw new Error('Azure device login not yet implemented (Phase 2)');

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Mark as active connection
    const key = `${provider}:${context.accountId}`;
    this.activeConnections.set(key, context);

    console.log(chalk.green(`✓ Connected to ${provider} as ${context.username}\n`));

    return context;
  }

  /**
   * List all connected accounts
   */
  async list(): Promise<AuthConnection[]> {
    const secrets = await this.vault.list();

    const connections: AuthConnection[] = secrets.map(s => ({
      provider: s.service as AuthProvider,
      username: s.key,
      accountId: s.key,
      createdAt: new Date(s.createdAt),
      isActive: this.activeConnections.has(`${s.service}:${s.key}`)
    }));

    return connections;
  }

  /**
   * Get active connection for a provider
   */
  async getActiveConnection(provider: AuthProvider): Promise<AccountContext | null> {
    // Check in-memory active connections first
    for (const [key, context] of this.activeConnections) {
      if (context.provider === provider) {
        return context;
      }
    }

    // Load from vault
    const secrets = await this.vault.list();
    const providerSecrets = secrets.filter(s => s.service === provider);

    if (providerSecrets.length === 0) {
      return null;
    }

    // Return most recent
    const mostRecent = providerSecrets.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    if (!mostRecent) {
      return null;
    }

    const vaultRef: VaultRef = `vault://${provider}/${mostRecent.key}`;

    const context: AccountContext = {
      provider,
      username: mostRecent.key,
      accountId: mostRecent.key,
      vaultRef,
      scopes: []
    };

    return context;
  }

  /**
   * Switch to a different account for a provider
   */
  async switch(provider: AuthProvider, accountId: string): Promise<AccountContext> {
    const vaultRef: VaultRef = `vault://${provider}/${accountId}`;

    // Verify the account exists
    const token = await this.vault.retrieve(vaultRef);
    if (!token) {
      throw new Error(`Account ${accountId} for ${provider} not found`);
    }

    const context: AccountContext = {
      provider,
      username: accountId,
      accountId,
      vaultRef,
      scopes: []
    };

    // Mark as active
    const key = `${provider}:${accountId}`;
    this.activeConnections.set(key, context);

    console.log(chalk.green(`✓ Switched to ${provider} account: ${accountId}`));

    return context;
  }

  /**
   * Revoke connection and remove from vault
   */
  async revoke(provider: AuthProvider, accountId: string): Promise<void> {
    const vaultRef: VaultRef = `vault://${provider}/${accountId}`;

    // Remove from vault
    const deleted = await this.vault.delete(vaultRef);

    if (!deleted) {
      throw new Error(`Account ${accountId} for ${provider} not found`);
    }

    // Remove from active connections
    const key = `${provider}:${accountId}`;
    this.activeConnections.delete(key);

    console.log(chalk.yellow(`\n⚠️  Revoked ${provider} account: ${accountId}`));
    console.log(chalk.gray(`   To fully revoke, visit: ${this.getRevocationURL(provider)}\n`));
  }

  /**
   * Get provider's OAuth revocation URL
   */
  private getRevocationURL(provider: AuthProvider): string {
    const urls: Record<AuthProvider, string> = {
      github: 'https://github.com/settings/apps/authorizations',
      gitlab: 'https://gitlab.com/-/profile/applications',
      bitbucket: 'https://bitbucket.org/account/settings/app-authorizations/',
      vercel: 'https://vercel.com/account/tokens',
      netlify: 'https://app.netlify.com/user/applications',
      cloudflare: 'https://dash.cloudflare.com/profile/api-tokens',
      aws: 'https://console.aws.amazon.com/iam/home#/security_credentials',
      gcp: 'https://myaccount.google.com/permissions',
      azure: 'https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps'
    };

    return urls[provider];
  }

  /**
   * Get auth token from vault
   */
  async getToken(vaultRef: VaultRef): Promise<string> {
    const token = await this.vault.retrieve(vaultRef);
    if (!token) {
      throw new Error('Token not found in vault');
    }
    return token;
  }

  // ============================================================================
  // Provider-specific OAuth implementations
  // ============================================================================

  /**
   * GitHub OAuth device flow
   */
  private async connectGitHub(options: OAuthFlowOptions): Promise<AccountContext> {
    const { createOAuthDeviceAuth } = await import('@octokit/auth-oauth-device');
    const { Octokit } = await import('@octokit/rest');

    const clientId = process.env['AIOS_GITHUB_CLIENT_ID'] || 'Iv1.b507a08c87ecfe98';

    const scopes = options.scopes || ['repo', 'read:user', 'read:org'];

    const auth = createOAuthDeviceAuth({
      clientType: 'oauth-app',
      clientId,
      scopes: scopes as string[], // Cast readonly to mutable for Octokit
      onVerification: (verification) => {
        console.log(chalk.yellow(`  1. Open: ${chalk.bold(verification.verification_uri)}`));
        console.log(chalk.yellow(`  2. Enter code: ${chalk.bold(verification.user_code)}\n`));
        console.log(chalk.gray('  Waiting for authorization... (press [r] to retry, [c] to cancel)'));
      }
    });

    try {
      const { token } = await auth({ type: 'oauth' });

      // Verify and get user info
      const octokit = new Octokit({ auth: token });
      const { data: user } = await octokit.users.getAuthenticated();
      const { data: orgs } = await octokit.orgs.listForAuthenticatedUser();

      // Store in vault
      const vaultRef = await this.vault.store('github', user.login, token);

      return {
        provider: 'github',
        username: user.login,
        accountId: user.login,
        vaultRef,
        scopes: scopes as readonly string[],
        organizations: orgs.map(o => o.login)
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`GitHub OAuth failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * GitLab OAuth device flow
   * Note: GitLab device flow requires a registered OAuth app
   */
  private async connectGitLab(_options: OAuthFlowOptions): Promise<AccountContext> {
    // TODO: Implement GitLab OAuth device flow
    // For now, throw error directing users to create OAuth app
    throw new Error(
      'GitLab OAuth device flow requires a registered OAuth application.\n' +
      'Please create one at: https://gitlab.com/-/profile/applications\n' +
      'Then set AIOS_GITLAB_CLIENT_ID and AIOS_GITLAB_CLIENT_SECRET'
    );
  }

  /**
   * Bitbucket OAuth device flow
   */
  private async connectBitbucket(_options: OAuthFlowOptions): Promise<AccountContext> {
    throw new Error('Bitbucket OAuth not yet implemented (Phase 2)');
  }

  /**
   * Vercel OAuth (Device Flow)
   * Vercel CLI uses OAuth 2.0 Device Flow as of their new login flow
   */
  private async connectVercel(_options: OAuthFlowOptions): Promise<AccountContext> {
    console.log(chalk.yellow('  Vercel uses OAuth 2.0 Device Flow (similar to GitHub)\n'));

    // Vercel OAuth device flow endpoints
    // Note: These are the endpoints used by Vercel CLI
    // For third-party apps, you need to register at vercel.com/dashboard/integrations

    throw new Error(
      'Vercel OAuth device flow requires registering an integration.\n\n' +
      'Steps to enable:\n' +
      '1. Go to https://vercel.com/dashboard/integrations\n' +
      '2. Create a new integration\n' +
      '3. Get your Client ID and Client Secret\n' +
      '4. Set AIOS_VERCEL_CLIENT_ID and AIOS_VERCEL_CLIENT_SECRET\n\n' +
      'For now, use Personal Access Token instead:\n' +
      '  Get token from: https://vercel.com/account/tokens'
    );
  }

  /**
   * Netlify OAuth (Browser Redirect Flow)
   * Netlify uses traditional browser-based OAuth (no device flow support)
   * Opens browser window like `netlify login` does
   */
  private async connectNetlify(_options: OAuthFlowOptions): Promise<AccountContext> {
    console.log(chalk.yellow('  Netlify uses browser-based OAuth (opens browser window)\n'));

    // Netlify OAuth requires registering an OAuth app
    const clientId = process.env['AIOS_NETLIFY_CLIENT_ID'];
    const clientSecret = process.env['AIOS_NETLIFY_CLIENT_SECRET'];

    if (!clientId || !clientSecret) {
      throw new Error(
        'Netlify OAuth requires client credentials.\n\n' +
        'Steps to enable:\n' +
        '1. Go to https://app.netlify.com/user/applications\n' +
        '2. Register a new OAuth application\n' +
        '3. Set redirect URI to: http://localhost:8888/callback\n' +
        '4. Set AIOS_NETLIFY_CLIENT_ID and AIOS_NETLIFY_CLIENT_SECRET\n\n' +
        'OAuth endpoints:\n' +
        '  Authorization: https://app.netlify.com/authorize\n' +
        '  Token: https://api.netlify.com/oauth/token\n\n' +
        'For now, use Personal Access Token instead:\n' +
        '  Get token from: https://app.netlify.com/user/applications#personal-access-tokens'
      );
    }

    // TODO: Implement browser-based OAuth flow with local callback server
    throw new Error('Netlify OAuth browser flow not yet implemented (Phase 2)');
  }

  /**
   * Cloudflare - API Tokens Only (No OAuth)
   * Cloudflare does not support OAuth for API authentication
   */
  private async connectCloudflare(_options: OAuthFlowOptions): Promise<AccountContext> {
    throw new Error(
      'Cloudflare does not support OAuth authentication.\n\n' +
      'Cloudflare uses API tokens for authentication:\n' +
      '1. Go to https://dash.cloudflare.com/profile/api-tokens\n' +
      '2. Create an API token with required permissions\n' +
      '3. Use the token directly (no OAuth flow needed)\n\n' +
      'For CLI integration, you would store the API token securely.\n' +
      'OAuth is not available for Cloudflare API access.'
    );
  }
}
