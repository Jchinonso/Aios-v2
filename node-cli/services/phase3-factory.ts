/**
 * @fileoverview Phase 3 Services Factory
 * @description Centralized initialization for Action Reasoning & Explanation services
 * @module node-cli/services/phase3-factory
 *
 * Purpose:
 * - Initialize ActionReasoningTracker with proper config
 * - Create AlternativeSuggestions engine
 * - Provide dependency injection for Phase 3 services
 * - Ensure proper cleanup and resource management
 */

import type { ILogger } from '@aios/shared';
import { ActionReasoningTracker } from './action-reasoning-tracker.js';
import type { ActionReasoningConfig } from './action-reasoning-tracker.js';
import { AlternativeSuggestions } from './alternative-suggestions.js';
import type { ConversationMemory } from './conversation-memory.v2.js';

/**
 * Phase 3 services bundle
 */
export interface Phase3Services {
  readonly reasoningTracker: ActionReasoningTracker;
  readonly alternativeSuggestions: AlternativeSuggestions;
}

/**
 * Phase 3 factory configuration
 */
export interface Phase3FactoryConfig {
  readonly reasoning?: Partial<ActionReasoningConfig>;
  readonly enablePersistence?: boolean;
}

/**
 * Phase 3 Services Factory
 *
 * Creates and configures all Phase 3 services:
 * - ActionReasoningTracker (decision tracking)
 * - AlternativeSuggestions (alternatives generation)
 *
 * @example
 * ```typescript
 * const factory = new Phase3Factory(logger, memory);
 *
 * const services = factory.createServices({
 *   enablePersistence: true,
 *   reasoning: { maxMemoryRecords: 200 }
 * });
 *
 * // Use services
 * const actionId = await services.reasoningTracker.recordAction({ ... });
 * const alternatives = await services.alternativeSuggestions.generateProviderAlternatives( ... );
 *
 * // Cleanup when done
 * factory.dispose();
 * ```
 */
export class Phase3Factory {
  private services: Phase3Services | null = null;

  constructor(
    private readonly logger: ILogger,
    private readonly memory: ConversationMemory
  ) {
    this.logger.debug('Phase3Factory initialized');
  }

  /**
   * Create Phase 3 services bundle
   *
   * @param config - Optional configuration
   * @returns Phase 3 services
   */
  public createServices(config: Phase3FactoryConfig = {}): Phase3Services {
    if (this.services) {
      this.logger.debug('Reusing existing Phase 3 services');
      return this.services;
    }

    this.logger.info('Creating Phase 3 services', { config });

    // Create ActionReasoningTracker
    const reasoningTracker = new ActionReasoningTracker(this.logger, {
      persistToDisk: config.enablePersistence ?? true,
      maxMemoryRecords: config.reasoning?.maxMemoryRecords ?? 100,
      enableMetrics: config.reasoning?.enableMetrics ?? true,
      ...(config.reasoning?.reasoningDir ? { reasoningDir: config.reasoning.reasoningDir } : {}),
    });

    // Create AlternativeSuggestions
    const alternativeSuggestions = new AlternativeSuggestions(
      this.logger,
      this.memory
    );

    this.services = {
      reasoningTracker,
      alternativeSuggestions,
    };

    this.logger.debug('Phase 3 services created successfully');
    return this.services;
  }

  /**
   * Get existing services (throws if not created)
   */
  public getServices(): Phase3Services {
    if (!this.services) {
      throw new Error('Phase 3 services not initialized. Call createServices() first.');
    }
    return this.services;
  }

  /**
   * Check if services are initialized
   */
  public isInitialized(): boolean {
    return this.services !== null;
  }

  /**
   * Dispose services and cleanup resources
   */
  public dispose(): void {
    if (this.services) {
      this.logger.debug('Disposing Phase 3 services');

      // Clear reasoning tracker cache
      this.services.reasoningTracker.clear();

      this.services = null;
      this.logger.debug('Phase 3 services disposed');
    }
  }

  /**
   * Get metrics from reasoning tracker
   */
  public getMetrics(): {
    readonly totalActionsTracked: number;
    readonly totalExplainRequests: number;
    readonly totalAlternativeSelections: number;
  } | null {
    if (!this.services) return null;
    return this.services.reasoningTracker.getMetrics();
  }
}

/**
 * Global Phase 3 factory instance (singleton pattern)
 */
let globalPhase3Factory: Phase3Factory | null = null;

/**
 * Get or create global Phase 3 factory
 *
 * @param logger - Logger instance (required on first call)
 * @param memory - Conversation memory (required on first call)
 * @returns Global Phase 3 factory
 *
 * @example
 * ```typescript
 * // Initialize once
 * const factory = getGlobalPhase3Factory(logger, memory);
 *
 * // Use anywhere
 * const services = factory.getServices();
 * await services.reasoningTracker.recordAction({ ... });
 * ```
 */
export function getGlobalPhase3Factory(
  logger?: ILogger,
  memory?: ConversationMemory
): Phase3Factory {
  if (!globalPhase3Factory) {
    if (!logger || !memory) {
      throw new Error(
        'Logger and memory required to initialize Phase 3 factory'
      );
    }
    globalPhase3Factory = new Phase3Factory(logger, memory);
  }
  return globalPhase3Factory;
}

/**
 * Reset global Phase 3 factory (for testing)
 */
export function resetGlobalPhase3Factory(): void {
  if (globalPhase3Factory) {
    globalPhase3Factory.dispose();
    globalPhase3Factory = null;
  }
}
