/**
 * @fileoverview AI Service Module - Exports and Factory
 * 
 * This module provides a comprehensive AI service system with conversation management,
 * message processing, and provider abstraction. It exports all necessary classes
 * and types for building AI-powered applications.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

// Export the unified AI service (replaces both old services)
export { AIService } from './ai-service-unified.js';

// Export configuration and factory
export { AIServiceConfigs, mergeAIServiceConfig, isValidAIServiceConfig } from './ai-service-config.js';
export type { AIServiceConfig } from './ai-service-config.js';
export { AIServiceFactory, AIServiceBuilder, AIServiceConfigBuilder } from './ai-service-factory.js';

// Export features for advanced usage
export { RateLimiter, CircuitBreaker, RetryHandler, InputSanitizer, TimeoutHandler, SecurityValidator } from './ai-service-features.js';

// Export conversation and message management
export { InMemoryConversationManager } from './conversation-manager.js';
export { DefaultMessageProcessor } from './message-processor.js';

// Export examples for reference
export * from './ai-service-examples.js';

// Export types
export type * from '../../types/ai-service.types.js';

// Legacy exports for backward compatibility (deprecated)
/** @deprecated Use AIService from './ai-service-unified.js' instead */
export { AIService as LegacyAIService } from './ai-service.js';