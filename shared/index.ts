// Shared Module - Following SOLID Principles
// SRP: Each module has single responsibility
// DIP: Depends on abstractions

// Core exports (highest priority) - provides base types and interfaces
export * from './core/index.js';

// Intelligence exports (explicit re-exports to avoid conflicts)
export {
  // Re-export core services
  AIService,
  AIServiceFactory,
  DeploymentStrategyFactory,
  DeploymentExecutionEngine,
  EnhancedIntelligenceOrchestrator,
  UnifiedAnalyzer,
  CircularDependencyDetector,
  // Explicitly re-export types with aliases to avoid conflicts
  type AnalysisContext as IntelligenceAnalysisContext,
  type AnalysisMetadata as IntelligenceAnalysisMetadata,
  type AnalysisResult as IntelligenceAnalysisResult,
  type IAIService
} from './intelligence/index.js';

// Cloud exports
export * from './cloud/index.js';

// Constants
export * from './constants/index.js';

// Utils (excluding ILogger which is already exported from core)
export { createLogger, Logger } from './utils/logger.js';