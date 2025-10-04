/**
 * @fileoverview Secrets Vault Tests
 * @description End-to-end tests for encrypted secrets storage
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SecretsVault, type VaultRef } from '../services/secrets-vault.js';
import { promises as fs } from 'fs';
import { resolve } from 'path';

describe('SecretsVault', () => {
  const testDir = resolve(__dirname, '../.test-vault');
  let vault: SecretsVault;

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    vault = new SecretsVault(testDir);
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Store and Retrieve', () => {
    it('should store and retrieve a secret', async () => {
      const vaultRef = await vault.store('github', 'token123', 'ghp_secrettoken456');

      expect(vaultRef).toBe('vault://github/token123');

      const retrieved = await vault.retrieve(vaultRef);
      expect(retrieved).toBe('ghp_secrettoken456');
    });

    it('should return null for non-existent secret', async () => {
      const result = await vault.retrieve('vault://github/nonexistent' as VaultRef);
      expect(result).toBeNull();
    });

    it('should update existing secret', async () => {
      await vault.store('gitlab', 'token1', 'old_value');
      await vault.store('gitlab', 'token1', 'new_value');

      const retrieved = await vault.retrieve('vault://gitlab/token1' as VaultRef);
      expect(retrieved).toBe('new_value');
    });
  });

  describe('Delete', () => {
    it('should delete a secret', async () => {
      const vaultRef = await vault.store('github', 'temp', 'temporary_secret');

      const deleted = await vault.delete(vaultRef);
      expect(deleted).toBe(true);

      const retrieved = await vault.retrieve(vaultRef);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent secret', async () => {
      const deleted = await vault.delete('vault://github/nothere' as VaultRef);
      expect(deleted).toBe(false);
    });
  });

  describe('List', () => {
    it('should list all secrets without values', async () => {
      await vault.store('github', 'token1', 'secret1');
      await vault.store('gitlab', 'token2', 'secret2');
      await vault.store('github', 'token3', 'secret3');

      const list = await vault.list();

      expect(list).toHaveLength(3);
      expect(list).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ service: 'github', key: 'token1' }),
          expect.objectContaining({ service: 'gitlab', key: 'token2' }),
          expect.objectContaining({ service: 'github', key: 'token3' })
        ])
      );

      // Should not include values
      list.forEach(item => {
        expect(item).not.toHaveProperty('value');
      });
    });

    it('should return empty array for empty vault', async () => {
      const list = await vault.list();
      expect(list).toEqual([]);
    });
  });

  describe('Encryption', () => {
    it('should encrypt vault file', async () => {
      await vault.store('test', 'key', 'secret_value');

      const vaultPath = resolve(testDir, '.aios/vault.enc');
      const encrypted = await fs.readFile(vaultPath, 'utf-8');

      // Should not contain plaintext secret
      expect(encrypted).not.toContain('secret_value');
      expect(encrypted).not.toContain('test');
      expect(encrypted).not.toContain('key');
    });

    it('should decrypt vault file correctly', async () => {
      await vault.store('service1', 'key1', 'value1');
      await vault.store('service2', 'key2', 'value2');

      // Create new vault instance to force reload
      const vault2 = new SecretsVault(testDir);

      const value1 = await vault2.retrieve('vault://service1/key1' as VaultRef);
      const value2 = await vault2.retrieve('vault://service2/key2' as VaultRef);

      expect(value1).toBe('value1');
      expect(value2).toBe('value2');
    });
  });

  describe('VaultRef Parsing', () => {
    it('should throw error for invalid vault reference', async () => {
      await expect(
        vault.retrieve('invalid-ref' as VaultRef)
      ).rejects.toThrow('Invalid vault reference');

      await expect(
        vault.retrieve('vault://missing-key' as VaultRef)
      ).rejects.toThrow('Invalid vault reference');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple stores concurrently', async () => {
      const promises = [
        vault.store('github', 'token1', 'secret1'),
        vault.store('gitlab', 'token2', 'secret2'),
        vault.store('bitbucket', 'token3', 'secret3')
      ];

      const refs = await Promise.all(promises);

      expect(refs).toHaveLength(3);

      const value1 = await vault.retrieve(refs[0]!);
      const value2 = await vault.retrieve(refs[1]!);
      const value3 = await vault.retrieve(refs[2]!);

      expect(value1).toBe('secret1');
      expect(value2).toBe('secret2');
      expect(value3).toBe('secret3');
    });
  });
});
