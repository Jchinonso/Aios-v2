/**
 * File System Types - Type Definitions and Interfaces
 * 
 * This module exports all type definitions and interfaces for the file system module.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

// Export analyzer interfaces
export * from './analyzer.interface.js'

// Export dependency types
export * from './dependency.types.js'

// Export core interfaces
export * from './core-interfaces.js'

// Export result types from core (no local duplication)
export type { IResult, Result } from '../../../core/types/result.js'
