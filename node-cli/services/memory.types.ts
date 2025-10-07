/**
 * @fileoverview Memory Type Re-exports
 * @description Convenience re-exports for memory-related types
 * @module node-cli/services
 */

// Re-export types from conversation-memory.v2 for convenience
export type {
  PreferenceType,
  PriorityType,
  UserPreference,
  ConversationTurn,
  ProjectContext as MemoryProjectContext,
  MemorySnapshot as SessionSnapshot,
  StrategyType,
  EnvironmentType
} from './conversation-memory.v2.js';
