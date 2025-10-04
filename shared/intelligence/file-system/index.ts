/**
 * File System Module - Comprehensive File System Analysis
 * 
 * This module provides comprehensive file system analysis capabilities
 * with all components properly organized in dedicated sub-folders.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

// Core exports
export * from './core/index.js'

// Analyzer exports
export * from './analyzers/index.js'

// Service exports
export * from './services/index.js'

// Configuration exports
export type { AnalyzerConfig } from './core/index.js'
export * from './config/index.js'

// Types and interfaces exports
export * from './types/index.js'

// Adapter exports
export * from './adapters/index.js'