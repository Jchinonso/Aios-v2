/**
 * @fileoverview Secrets Vault - Encrypted secrets storage
 * @description Cross-platform encrypted secrets storage using AES-256-GCM
 * @module node-cli/services/secrets-vault
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Vault reference format: vault://<service>/<key>
 * Example: vault://github/token_abc123
 */
export type VaultRef = `vault://${string}/${string}`;

interface SecretEntry {
  readonly service: string;
  readonly key: string;
  readonly value: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface VaultData {
  readonly version: number;
  readonly secrets: readonly SecretEntry[];
}

/**
 * Encrypted secrets vault
 * Uses AES-256-GCM for encryption with scrypt key derivation
 */
export class SecretsVault {
  private readonly vaultPath: string;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly saltLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(projectRoot: string = process.cwd()) {
    const aiosDir = resolve(projectRoot, '.aios');
    this.vaultPath = resolve(aiosDir, 'vault.enc');
  }

  /**
   * Store a secret in the vault (with write serialization)
   */
  async store(service: string, key: string, value: string): Promise<VaultRef> {
    // Serialize writes to prevent race conditions
    this.writeQueue = this.writeQueue.then(async () => {
      const vaultData = await this.loadVault();

      // Remove existing entry if it exists
      const filteredSecrets = vaultData.secrets.filter(
        s => !(s.service === service && s.key === key)
      );

      const newSecret: SecretEntry = {
        service,
        key,
        value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedVault: VaultData = {
        version: 1,
        secrets: [...filteredSecrets, newSecret]
      };

      await this.saveVault(updatedVault);
    });

    await this.writeQueue;

    return `vault://${service}/${key}`;
  }

  /**
   * Retrieve a secret from the vault
   */
  async retrieve(vaultRef: VaultRef): Promise<string | null> {
    const [service, key] = this.parseVaultRef(vaultRef);
    const vaultData = await this.loadVault();

    const secret = vaultData.secrets.find(
      s => s.service === service && s.key === key
    );

    return secret?.value ?? null;
  }

  /**
   * Delete a secret from the vault (with write serialization)
   */
  async delete(vaultRef: VaultRef): Promise<boolean> {
    const [service, key] = this.parseVaultRef(vaultRef);

    let deleted = false;

    // Serialize writes
    this.writeQueue = this.writeQueue.then(async () => {
      const vaultData = await this.loadVault();

      const filteredSecrets = vaultData.secrets.filter(
        s => !(s.service === service && s.key === key)
      );

      if (filteredSecrets.length === vaultData.secrets.length) {
        deleted = false;
        return;
      }

      const updatedVault: VaultData = {
        version: 1,
        secrets: filteredSecrets
      };

      await this.saveVault(updatedVault);
      deleted = true;
    });

    await this.writeQueue;

    return deleted;
  }

  /**
   * List all secrets (without values)
   */
  async list(): Promise<Array<{ service: string; key: string; createdAt: string }>> {
    const vaultData = await this.loadVault();
    return vaultData.secrets.map(s => ({
      service: s.service,
      key: s.key,
      createdAt: s.createdAt
    }));
  }

  /**
   * Parse vault reference
   */
  private parseVaultRef(vaultRef: VaultRef): [string, string] {
    const match = vaultRef.match(/^vault:\/\/([^/]+)\/(.+)$/);
    if (!match || !match[1] || !match[2]) {
      throw new Error(`Invalid vault reference: ${vaultRef}`);
    }
    return [match[1], match[2]];
  }

  /**
   * Load vault from encrypted file
   */
  private async loadVault(): Promise<VaultData> {
    try {
      const encrypted = await fs.readFile(this.vaultPath, 'utf-8');
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted) as VaultData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Vault doesn't exist yet
        return { version: 1, secrets: [] };
      }
      throw error;
    }
  }

  /**
   * Save vault to encrypted file
   */
  private async saveVault(vaultData: VaultData): Promise<void> {
    const json = JSON.stringify(vaultData, null, 2);
    const encrypted = this.encrypt(json);

    // Ensure directory exists
    const dir = resolve(this.vaultPath, '..');
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(this.vaultPath, encrypted, 'utf-8');
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(plaintext: string): string {
    // Generate random salt and IV
    const salt = randomBytes(this.saltLength);
    const iv = randomBytes(this.ivLength);

    // Derive key from machine-specific data + salt
    const key = this.deriveKey(salt);

    // Encrypt
    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf-8'),
      cipher.final()
    ]);

    // Get auth tag
    const tag = cipher.getAuthTag();

    // Combine: salt + iv + tag + encrypted data
    const combined = Buffer.concat([salt, iv, tag, encrypted]);

    return combined.toString('base64');
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(ciphertext: string): string {
    const combined = Buffer.from(ciphertext, 'base64');

    // Extract components
    const salt = combined.subarray(0, this.saltLength);
    const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
    const tag = combined.subarray(
      this.saltLength + this.ivLength,
      this.saltLength + this.ivLength + this.tagLength
    );
    const encrypted = combined.subarray(this.saltLength + this.ivLength + this.tagLength);

    // Derive key
    const key = this.deriveKey(salt);

    // Decrypt
    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf-8');
  }

  /**
   * Derive encryption key from machine-specific data
   * Uses hostname + username as passphrase (machine-bound encryption)
   */
  private deriveKey(salt: Buffer): Buffer {
    // Machine-specific passphrase
    const hostname = process.env['HOSTNAME'] || 'aios-default';
    const username = process.env['USER'] || process.env['USERNAME'] || 'aios-user';
    const passphrase = `${hostname}:${username}`;

    // Derive key using scrypt (secure key derivation)
    return scryptSync(passphrase, salt, this.keyLength);
  }
}
