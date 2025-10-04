/**
 * File System Core - Interfaces and Configuration
 * 
 * This module provides the core interfaces for the file system module.
 * Configuration is handled by the centralized @analyzer-config/ system.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

// Core interfaces are exported from ./types/index.ts to avoid duplication

// Re-export from centralized analyzer-config
export { DEFAULT_ANALYZER_CONFIG } from '../config/analyzer-config/index.js'
export type { AnalyzerConfig } from '../../types/config.types.js'
