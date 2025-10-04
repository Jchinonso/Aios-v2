/**
 * @fileoverview State Management Exports
 * @description
 * Provides both legacy StateManager (backward compatible) and
 * EnhancedStateManager (recommended for new code).
 *
 * @module node-cli/state
 */

// Legacy exports (backward compatible)
export {
  StateManager,
  type DeploymentRecordType,
  type SessionRecordType,
  generateId
} from './state-manager.js';

// Enhanced exports (recommended for new code)
export {
  EnhancedStateManager,
  StateManagerError,
  generateDeploymentId,
  generateSessionId,
  validateDeploymentRecord,
  type Result,
  type DeploymentId,
  type SessionId,
  type ProjectFingerprint,
  type EnhancedDeploymentRecord,
  type SessionRecord,
  type StateManagerOptions
} from './state-manager.enhanced.js';
