/**
 * @fileoverview Production-Grade Factory for EnhancedNLProcessor
 * @description Type-safe dependency injection with validation and container integration
 * @module node-cli/services
 *
 * **Design Principles:**
 * - **Dependency Injection**: All dependencies explicitly provided
 * - **Factory Pattern**: Centralized creation logic with validation
 * - **Type Safety**: Full TypeScript strict mode compliance
 * - **Flexibility**: Supports both fresh and existing ConversationMemory instances
 * - **Container Integration**: Designed for DependencyContainer usage
 *
 * @example
 * ```typescript
 * // Basic usage
 * const processor = EnhancedNLProcessorFactory.create(aiService, logger);
 *
 * // With existing memory (session resume)
 * const processor = EnhancedNLProcessorFactory.createWithMemory(aiService, memory, logger);
 *
 * // With metrics
 * const processor = EnhancedNLProcessorFactory.create(aiService, logger, metrics);
 * ```
 *
 * @version 1.0.0
 * @since 2025-10-05
 */

import type { IAIService, ILogger, IMetricsCollector } from '@aios/shared';
import { EnhancedNLProcessor } from '../nl-planner/enhanced-nl-processor.js';
import { ConversationMemory } from './conversation-memory.v2.js';

/**
 * Factory for creating EnhancedNLProcessor instances with proper dependency injection
 *
 * **Responsibilities:**
 * - Validates all required dependencies before creation
 * - Creates fresh ConversationMemory instances when needed
 * - Supports reusing existing ConversationMemory (session resume)
 * - Integrates seamlessly with DependencyContainer
 * - Provides type-safe factory methods
 *
 * **Non-Responsibilities:**
 * - Does NOT manage singleton instances (use DependencyContainer for that)
 * - Does NOT cache or pool processors
 * - Does NOT handle session persistence (use SessionPersistence)
 */
export class EnhancedNLProcessorFactory {
  /**
   * Create EnhancedNLProcessor with fresh ConversationMemory
   *
   * This is the primary factory method for most use cases. It creates
   * a new processor with a fresh memory instance.
   *
   * @param aiService - AI service for intent classification (REQUIRED)
   * @param logger - Logger instance for observability (REQUIRED)
   * @param metrics - Optional metrics collector for monitoring
   * @returns Fully initialized EnhancedNLProcessor
   *
   * @throws {Error} If aiService is null or undefined
   * @throws {Error} If logger is null or undefined
   *
   * @example
   * ```typescript
   * const processor = EnhancedNLProcessorFactory.create(
   *   container.intelligence.aiService,
   *   container.logger,
   *   container.metrics
   * );
   *
   * const result = await processor.process('deploy to production');
   * ```
   */
  public static create(
    aiService: IAIService,
    logger: ILogger,
    _metrics?: IMetricsCollector
  ): EnhancedNLProcessor {
    // Validate required dependencies
    this.validateDependencies(aiService, logger);

    // Create fresh ConversationMemory
    // Note: ConversationMemory expects specific metrics interface, not IMetricsCollector
    // For now, we pass undefined to avoid interface mismatch
    const memory = new ConversationMemory(logger, undefined);

    // Create and return processor
    return new EnhancedNLProcessor(aiService, memory, logger);
  }

  /**
   * Create EnhancedNLProcessor with existing ConversationMemory
   *
   * Use this when you need to resume a session with existing conversation
   * history. Common scenarios:
   * - Session restoration from persistence
   * - Multi-session management
   * - Testing with pre-populated memory
   *
   * @param aiService - AI service for intent classification (REQUIRED)
   * @param memory - Existing ConversationMemory instance (REQUIRED)
   * @param logger - Logger instance for observability (REQUIRED)
   * @returns EnhancedNLProcessor with existing memory
   *
   * @throws {Error} If aiService is null or undefined
   * @throws {Error} If memory is null or undefined
   * @throws {Error} If logger is null or undefined
   *
   * @example
   * ```typescript
   * // Resume from persisted session
   * const snapshot = await sessionPersistence.loadSession(sessionId);
   * const memory = ConversationMemory.fromSnapshot(snapshot, logger, metrics);
   * const processor = EnhancedNLProcessorFactory.createWithMemory(
   *   aiService,
   *   memory,
   *   logger
   * );
   * ```
   */
  public static createWithMemory(
    aiService: IAIService,
    memory: ConversationMemory,
    logger: ILogger
  ): EnhancedNLProcessor {
    // Validate required dependencies
    this.validateDependencies(aiService, logger);
    this.validateMemory(memory);

    // Create and return processor with existing memory
    return new EnhancedNLProcessor(aiService, memory, logger);
  }

  /**
   * Validate required dependencies
   *
   * Performs strict null/undefined checks to prevent runtime errors.
   * Throws descriptive errors for developer debugging.
   *
   * @private
   * @param aiService - AI service to validate
   * @param logger - Logger to validate
   * @throws {Error} If any required dependency is missing
   */
  private static validateDependencies(
    aiService: IAIService | null | undefined,
    logger: ILogger | null | undefined
  ): asserts aiService is IAIService {
    if (!aiService) {
      throw new Error(
        'AI service is required for EnhancedNLProcessor. ' +
        'Ensure IAIService is provided to the factory.'
      );
    }

    if (!logger) {
      throw new Error(
        'Logger is required for EnhancedNLProcessor. ' +
        'Ensure ILogger is provided to the factory.'
      );
    }
  }

  /**
   * Validate ConversationMemory instance
   *
   * Ensures memory is not null/undefined for createWithMemory method.
   *
   * @private
   * @param memory - Memory instance to validate
   * @throws {Error} If memory is null or undefined
   */
  private static validateMemory(
    memory: ConversationMemory | null | undefined
  ): asserts memory is ConversationMemory {
    if (!memory) {
      throw new Error(
        'Memory is required for EnhancedNLProcessor.createWithMemory(). ' +
        'Use create() instead if you want a fresh memory instance.'
      );
    }
  }
}

/**
 * Type-safe factory result
 *
 * Exported for type checking in consumers
 */
export type EnhancedNLProcessorInstance = ReturnType<typeof EnhancedNLProcessorFactory.create>;
