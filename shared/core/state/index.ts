/**
 * @fileoverview State Management Module Exports
 * @module core/state
 */

export { ProjectStateManager, AIOS_DIR, CONFIG_FILE, CONNECTION_FILE, HISTORY_FILE, CONFIG_VERSION } from './project-state-manager.js';
export type {
  AiosConfigType,
  ConnectionConfigType,
  StateDetectionResultType,
  ProjectFingerprintType,
  DeploymentRecordType,
  SecretsVaultRefType,
  ProviderRecommendationType,
  NLIntentType
} from '../../types/state.types.js';