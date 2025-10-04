/**
 * @fileoverview Credentials Module - Secure API Key Management
 * 
 * This module provides centralized credential management for all AI and cloud providers.
 * It handles loading credentials from environment variables, validation, and secure injection.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

export {
  CredentialManager,
  AI_CREDENTIAL_MAP,
  CLOUD_CREDENTIAL_MAP,
  type CredentialValidationResult,
  type ProviderCredentials
} from './credential-manager.js';

export {
  CredentialPrompt,
  type CredentialPromptConfig,
  type UserCredentialInput,
  type CredentialPromptResult
} from './credential-prompt.js';

export {
  CredentialVault,
  createCredentialVault,
  type CredentialStorageType,
  type StoredCredentialType
} from './credential-vault.js';
