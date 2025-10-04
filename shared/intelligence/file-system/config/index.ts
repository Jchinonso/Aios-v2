/**
 * File System Configuration - Centralized Configuration System
 * 
 * This module exports the centralized configuration system for all analyzers,
 * scanners, and file system operations.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

// Export analyzer configuration
export * from './analyzer-config/index.js'

// Re-export types from main intelligence types
export type { AnalyzerConfig } from '../../types/config.types.js'
