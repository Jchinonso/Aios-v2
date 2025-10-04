/**
 * @fileoverview Git Connector - OAuth flows for GitHub, GitLab, etc.
 * @description Implements OAuth device flow and PAT handling for Git providers
 * @module node-cli/services/git-connector
 */

import { Octokit } from '@octokit/rest';
import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import chalk from 'chalk';
import { SecretsVault, type VaultRef } from './secrets-vault.js';

/**
 * GitHub App OAuth credentials for AIOS
 * In production, these would be environment variables
 */
const GITHUB_CLIENT_ID = process.env['AIOS_GITHUB_CLIENT_ID'] || 'Iv1.b507a08c87ecfe98';

export interface GitConnectionResult {
  readonly provider: 'github' | 'gitlab' | 'other';
  readonly vaultRef: VaultRef;
  readonly username: string;
  readonly verified: boolean;
}

export interface GitRepository {
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
  readonly defaultBranch: string;
  readonly private: boolean;
  readonly url: string;
}

/**
 * Git connector service - handles OAuth flows and API access
 */
export class GitConnector {
  private readonly vault: SecretsVault;

  constructor(projectRoot: string = process.cwd()) {
    this.vault = new SecretsVault(projectRoot);
  }

  /**
   * Connect to GitHub using OAuth device flow
   */
  async connectGitHub(): Promise<GitConnectionResult> {
    console.log(chalk.blue('🔐 GitHub OAuth Device Flow\n'));

    // Create device auth
    const auth = createOAuthDeviceAuth({
      clientType: 'oauth-app',
      clientId: GITHUB_CLIENT_ID,
      onVerification: (verification) => {
        console.log(chalk.yellow(`1. Open: ${chalk.bold(verification.verification_uri)}`));
        console.log(chalk.yellow(`2. Enter code: ${chalk.bold(verification.user_code)}\n`));
        console.log(chalk.gray('Waiting for authorization...'));
      }
    });

    try {
      // Wait for user to authorize
      const { token } = await auth({ type: 'oauth' });

      // Verify token by fetching user info
      const octokit = new Octokit({ auth: token });
      const { data: user } = await octokit.users.getAuthenticated();

      console.log(chalk.green(`\n✓ Authorized as ${user.login}`));

      // Store token in vault
      const vaultRef = await this.vault.store('github', user.login, token);

      return {
        provider: 'github',
        vaultRef,
        username: user.login,
        verified: true
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`GitHub OAuth failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Connect to GitLab using Personal Access Token
   */
  async connectGitLab(token: string): Promise<GitConnectionResult> {
    console.log(chalk.blue('🔐 GitLab Personal Access Token\n'));

    // Verify token by fetching user info
    const response = await fetch('https://gitlab.com/api/v4/user', {
      headers: {
        'PRIVATE-TOKEN': token
      }
    });

    if (!response.ok) {
      throw new Error(`GitLab authentication failed: ${response.statusText}`);
    }

    const user = await response.json() as { username: string };

    console.log(chalk.green(`✓ Authenticated as ${user.username}`));

    // Store token in vault
    const vaultRef = await this.vault.store('gitlab', user.username, token);

    return {
      provider: 'gitlab',
      vaultRef,
      username: user.username,
      verified: true
    };
  }

  /**
   * List GitHub repositories for authenticated user
   */
  async listGitHubRepos(vaultRef: VaultRef): Promise<GitRepository[]> {
    const token = await this.vault.retrieve(vaultRef);
    if (!token) {
      throw new Error('GitHub token not found in vault');
    }

    const octokit = new Octokit({ auth: token });

    // Get user's repositories
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100
    });

    return repos.map(repo => ({
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      private: repo.private,
      url: repo.html_url
    }));
  }

  /**
   * List GitLab projects for authenticated user
   */
  async listGitLabProjects(vaultRef: VaultRef): Promise<GitRepository[]> {
    const token = await this.vault.retrieve(vaultRef);
    if (!token) {
      throw new Error('GitLab token not found in vault');
    }

    const response = await fetch('https://gitlab.com/api/v4/projects?membership=true&per_page=100', {
      headers: {
        'PRIVATE-TOKEN': token
      }
    });

    if (!response.ok) {
      throw new Error(`GitLab API request failed: ${response.statusText}`);
    }

    const projects = await response.json() as Array<{
      path_with_namespace: string;
      name: string;
      default_branch: string;
      visibility: string;
      web_url: string;
    }>;

    return projects.map(project => {
      const [owner, name] = project.path_with_namespace.split('/');
      return {
        owner: owner || '',
        name: name || project.name,
        fullName: project.path_with_namespace,
        defaultBranch: project.default_branch,
        private: project.visibility !== 'public',
        url: project.web_url
      };
    });
  }

  /**
   * Get repository file contents
   */
  async getFileContents(
    vaultRef: VaultRef,
    provider: 'github' | 'gitlab',
    owner: string,
    repo: string,
    path: string,
    ref = 'main'
  ): Promise<string> {
    const token = await this.vault.retrieve(vaultRef);
    if (!token) {
      throw new Error(`${provider} token not found in vault`);
    }

    if (provider === 'github') {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref
      });

      if (Array.isArray(data) || data.type !== 'file') {
        throw new Error(`${path} is not a file`);
      }

      return Buffer.from(data.content, 'base64').toString('utf-8');
    } else {
      // GitLab
      const encodedPath = encodeURIComponent(path);
      const encodedProject = encodeURIComponent(`${owner}/${repo}`);
      const url = `https://gitlab.com/api/v4/projects/${encodedProject}/repository/files/${encodedPath}/raw?ref=${ref}`;

      const response = await fetch(url, {
        headers: {
          'PRIVATE-TOKEN': token
        }
      });

      if (!response.ok) {
        throw new Error(`GitLab API request failed: ${response.statusText}`);
      }

      return await response.text();
    }
  }

  /**
   * Clone repository to temporary directory
   */
  async cloneRepository(
    vaultRef: VaultRef,
    provider: 'github' | 'gitlab',
    owner: string,
    repo: string,
    targetDir: string,
    branch = 'main'
  ): Promise<void> {
    const token = await this.vault.retrieve(vaultRef);
    if (!token) {
      throw new Error(`${provider} token not found in vault`);
    }

    const { spawn } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(spawn);

    let cloneUrl: string;
    if (provider === 'github') {
      cloneUrl = `https://oauth2:${token}@github.com/${owner}/${repo}.git`;
    } else {
      cloneUrl = `https://oauth2:${token}@gitlab.com/${owner}/${repo}.git`;
    }

    return new Promise((resolve, reject) => {
      const child = spawn('git', ['clone', '-b', branch, '--depth', '1', cloneUrl, targetDir], {
        stdio: 'inherit'
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Git clone failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Git clone failed: ${error.message}`));
      });
    });
  }
}
