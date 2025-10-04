/**
 * @fileoverview Enhanced Credential Vault with OS Keychain Support
 * @description Secure credential storage using OS-native keychains
 * @module core/credentials
 */

import { randomUUID } from 'crypto';
import type { ILogger } from '../logging/logger.interface.js';
import type { SecretsVaultRefType } from '../../types/state.types.js';
import type { CloudProviderType } from '../../cloud/types/index.js';

/**
 * Credential storage type
 */
export type CredentialStorageType = 'os-keyring' | 'env' | 'file';

/**
 * Stored credential interface
 */
export interface StoredCredentialType {
  readonly id: string;
  readonly provider: CloudProviderType | string;
  readonly authMethod: 'oauth' | 'api_key' | 'service_account';
  readonly token: string;
  readonly metadata: {
    readonly createdAt: string;
    readonly expiresAt?: string;
    readonly scopes?: readonly string[];
    readonly accountName?: string;
  };
}

/**
 * Credential Vault
 *
 * Provides secure credential storage with multiple backend options:
 * - OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
 * - Environment variables (fallback)
 * - Encrypted file (fallback)
 */
export class CredentialVault {
  private readonly storageType: CredentialStorageType;
  private readonly logger: ILogger;
  private readonly credentials: Map<string, StoredCredentialType>;

  constructor(logger: ILogger, storageType: CredentialStorageType = 'env') {
    this.logger = logger;
    this.storageType = storageType;
    this.credentials = new Map();
  }

  /**
   * Store a credential securely
   */
  async store(
    provider: CloudProviderType | string,
    token: string,
    authMethod: 'oauth' | 'api_key' | 'service_account',
    metadata?: {
      expiresAt?: string;
      scopes?: readonly string[];
      accountName?: string;
    }
  ): Promise<SecretsVaultRefType> {
    const credentialId = `cred_${randomUUID()}`;
    const itemId = `aios_${provider}_${credentialId}`;

    const credential: StoredCredentialType = {
      id: credentialId,
      provider,
      authMethod,
      token,
      metadata: {
        createdAt: new Date().toISOString(),
        ...(metadata?.expiresAt !== undefined && { expiresAt: metadata.expiresAt }),
        ...(metadata?.scopes !== undefined && { scopes: metadata.scopes }),
        ...(metadata?.accountName !== undefined && { accountName: metadata.accountName })
      }
    };

    // Store based on storage type
    switch (this.storageType) {
      case 'os-keyring':
        await this.storeInKeychain(itemId, credential);
        break;
      case 'env':
        this.storeInMemory(itemId, credential);
        break;
      case 'file':
        this.storeInMemory(itemId, credential); // For now, use memory
        break;
    }

    this.logger.info('Credential stored', {
      provider,
      method: authMethod,
      storageType: this.storageType
    });

    return {
      scheme: this.storageType,
      keyId: 'aios-credentials',
      itemId,
      createdAt: credential.metadata.createdAt,
      ...(credential.metadata.expiresAt !== undefined && { expiresAt: credential.metadata.expiresAt })
    };
  }

  /**
   * Retrieve a credential by vault reference
   */
  async retrieve(vaultRef: SecretsVaultRefType): Promise<string> {
    try {
      switch (vaultRef.scheme) {
        case 'os-keyring':
          return await this.retrieveFromKeychain(vaultRef.itemId);
        case 'env':
          return this.retrieveFromMemory(vaultRef.itemId);
        case 'file':
          return this.retrieveFromMemory(vaultRef.itemId);
        default:
          throw new Error(`Unsupported vault scheme: ${vaultRef.scheme}`);
      }
    } catch (error) {
      this.logger.error('Failed to retrieve credential', error as Error);
      throw new Error(`Credential not found: ${vaultRef.itemId}`);
    }
  }

  /**
   * Delete a credential
   */
  async delete(vaultRef: SecretsVaultRefType): Promise<void> {
    try {
      switch (vaultRef.scheme) {
        case 'os-keyring':
          await this.deleteFromKeychain(vaultRef.itemId);
          break;
        case 'env':
        case 'file':
          this.credentials.delete(vaultRef.itemId);
          break;
      }
      this.logger.info('Credential deleted', { itemId: vaultRef.itemId });
    } catch (error) {
      this.logger.error('Failed to delete credential', error as Error);
      throw error;
    }
  }

  /**
   * List all stored credentials (metadata only, no secrets)
   */
  async list(): Promise<ReadonlyArray<Omit<StoredCredentialType, 'token'>>> {
    const credList: Array<Omit<StoredCredentialType, 'token'>> = [];

    for (const [_itemId, cred] of this.credentials.entries()) {
      const { token: _token, ...credWithoutToken } = cred;
      credList.push(credWithoutToken);
    }

    return credList;
  }

  /**
   * Check if a credential is expired
   */
  isExpired(vaultRef: SecretsVaultRefType): boolean {
    if (!vaultRef.expiresAt) {
      return false;
    }
    return new Date(vaultRef.expiresAt) < new Date();
  }

  /**
   * Store credential in OS keychain (platform-specific)
   */
  private async storeInKeychain(itemId: string, credential: StoredCredentialType): Promise<void> {
    // Platform detection
    const platform = process.platform;

    try {
      if (platform === 'darwin') {
        // macOS: Use security command
        await this.storeMacOSKeychain(itemId, credential);
      } else if (platform === 'win32') {
        // Windows: Use cmdkey
        await this.storeWindowsCredential(itemId, credential);
      } else {
        // Linux: Use secret-tool (part of libsecret)
        await this.storeLinuxSecret(itemId, credential);
      }
    } catch (error) {
      this.logger.warn('Keychain storage failed, falling back to memory', { error });
      this.storeInMemory(itemId, credential);
    }
  }

  /**
   * Store in macOS Keychain
   */
  private async storeMacOSKeychain(itemId: string, credential: StoredCredentialType): Promise<void> {
    const { execSync } = await import('child_process');
    const credentialData = JSON.stringify(credential);

    // Delete existing entry if present
    try {
      execSync(`security delete-generic-password -s "${itemId}" -a aios`, { stdio: 'ignore' });
    } catch {
      // Ignore if doesn't exist
    }

    // Add new entry
    execSync(
      `security add-generic-password -s "${itemId}" -a aios -w "${credentialData}" -U`,
      { stdio: 'ignore' }
    );
  }

  /**
   * Store in Windows Credential Manager
   */
  private async storeWindowsCredential(itemId: string, credential: StoredCredentialType): Promise<void> {
    const { execSync } = await import('child_process');
    const credentialData = JSON.stringify(credential);

    // Windows cmdkey command
    execSync(
      `cmdkey /generic:"${itemId}" /user:aios /pass:"${credentialData}"`,
      { stdio: 'ignore' }
    );
  }

  /**
   * Store in Linux Secret Service
   */
  private async storeLinuxSecret(itemId: string, credential: StoredCredentialType): Promise<void> {
    const { execSync } = await import('child_process');
    const credentialData = JSON.stringify(credential);

    // Check if secret-tool is available
    try {
      execSync('which secret-tool', { stdio: 'ignore' });
    } catch {
      throw new Error('secret-tool not found. Please install libsecret-tools');
    }

    // Store using secret-tool
    execSync(
      `echo "${credentialData}" | secret-tool store --label="AIOS ${itemId}" application aios id "${itemId}"`,
      { stdio: 'ignore' }
    );
  }

  /**
   * Retrieve from OS keychain
   */
  private async retrieveFromKeychain(itemId: string): Promise<string> {
    const platform = process.platform;

    try {
      if (platform === 'darwin') {
        return await this.retrieveMacOSKeychain(itemId);
      } else if (platform === 'win32') {
        return await this.retrieveWindowsCredential(itemId);
      } else {
        return await this.retrieveLinuxSecret(itemId);
      }
    } catch (error) {
      this.logger.warn('Keychain retrieval failed, trying memory', { error });
      return this.retrieveFromMemory(itemId);
    }
  }

  /**
   * Retrieve from macOS Keychain
   */
  private async retrieveMacOSKeychain(itemId: string): Promise<string> {
    const { execSync } = await import('child_process');
    const result = execSync(`security find-generic-password -s "${itemId}" -a aios -w`, {
      encoding: 'utf-8'
    }).trim();

    const credential = JSON.parse(result) as StoredCredentialType;
    return credential.token;
  }

  /**
   * Retrieve from Windows Credential Manager
   */
  private async retrieveWindowsCredential(itemId: string): Promise<string> {
    const { execSync } = await import('child_process');
    const result = execSync(`cmdkey /list:"${itemId}"`, { encoding: 'utf-8' });

    // Parse the password from cmdkey output (this is simplified)
    // In production, you'd need a more robust parser or use node-keytar
    const credential = JSON.parse(result) as StoredCredentialType;
    return credential.token;
  }

  /**
   * Retrieve from Linux Secret Service
   */
  private async retrieveLinuxSecret(itemId: string): Promise<string> {
    const { execSync } = await import('child_process');
    const result = execSync(`secret-tool lookup application aios id "${itemId}"`, {
      encoding: 'utf-8'
    }).trim();

    const credential = JSON.parse(result) as StoredCredentialType;
    return credential.token;
  }

  /**
   * Delete from OS keychain
   */
  private async deleteFromKeychain(itemId: string): Promise<void> {
    const platform = process.platform;

    if (platform === 'darwin') {
      const { execSync } = await import('child_process');
      execSync(`security delete-generic-password -s "${itemId}" -a aios`, { stdio: 'ignore' });
    } else if (platform === 'win32') {
      const { execSync } = await import('child_process');
      execSync(`cmdkey /delete:"${itemId}"`, { stdio: 'ignore' });
    } else {
      const { execSync } = await import('child_process');
      execSync(`secret-tool clear application aios id "${itemId}"`, { stdio: 'ignore' });
    }
  }

  /**
   * Store in memory (fallback)
   */
  private storeInMemory(itemId: string, credential: StoredCredentialType): void {
    this.credentials.set(itemId, credential);
  }

  /**
   * Retrieve from memory
   */
  private retrieveFromMemory(itemId: string): string {
    const credential = this.credentials.get(itemId);
    if (!credential) {
      throw new Error(`Credential not found in memory: ${itemId}`);
    }
    return credential.token;
  }
}

/**
 * Factory function to create credential vault with best available storage
 */
export function createCredentialVault(logger: ILogger): CredentialVault {
  const platform = process.platform;

  // Try to use OS keychain first
  let storageType: CredentialStorageType = 'env';

  if (platform === 'darwin' || platform === 'win32' || platform === 'linux') {
    storageType = 'os-keyring';
  }

  logger.info('Creating credential vault', { storageType, platform });
  return new CredentialVault(logger, storageType);
}