/**
 * Validation Utilities - Helper functions for validation operations
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for validation-related utilities
 * - OCP: Open for extension through new validation rules
 */

import * as path from 'path';
import type { AnalysisResult, IDetectedPattern, AnalysisMetadata } from '../file-system/types/analyzer.interface.js'
// import { ERROR_CODES } from '../constants/index.js';

export interface ValidationRule<T> {
  readonly name: string;
  readonly validate: (value: T) => ValidationResult;
  readonly required?: boolean;
}

// Import the standardized ValidationResult from deployment types
import type { ValidationResult } from '../types/deployment.types.js'

export interface PathValidationOptions {
  readonly mustExist?: boolean;
  readonly allowedExtensions?: string[];
  readonly maxDepth?: number;
  readonly excludePatterns?: string[];
}

export class ValidationUtils {
  /**
   * Validate file path for analysis
   */
  static validatePath(filePath: string, options: PathValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic path validation
    if (!filePath || typeof filePath !== 'string') {
      errors.push('Path is required and must be a string');
      return { isValid: false, errors, warnings, requirements: [] };
    }

    if (!path.isAbsolute(filePath)) {
      warnings.push('Relative paths may cause issues - consider using absolute paths');
    }

    // Extension validation
    if (options.allowedExtensions) {
      const ext = path.extname(filePath).toLowerCase();
      if (!options.allowedExtensions.includes(ext)) {
        errors.push(`File extension '${ext}' not allowed. Allowed: ${options.allowedExtensions.join(', ')}`);
      }
    }

    // Depth validation
    if (options.maxDepth) {
      const depth = filePath.split(path.sep).length;
      if (depth > options.maxDepth) {
        warnings.push(`Path depth (${depth}) exceeds recommended maximum (${options.maxDepth})`);
      }
    }

    // Exclude patterns validation
    if (options.excludePatterns) {
      const fileName = path.basename(filePath);
      const dirName = path.dirname(filePath);

      for (const pattern of options.excludePatterns) {
        if (fileName.includes(pattern) || dirName.includes(pattern)) {
          errors.push(`Path contains excluded pattern: ${pattern}`);
        }
      }
    }

    // Security validation
    if (filePath.includes('..') || filePath.includes('~')) {
      errors.push('Path contains potentially unsafe traversal patterns');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requirements: []
    };
  }

  /**
   * Validate analysis configuration
   */
  static validateAnalysisConfig(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const rules: ValidationRule<any>[] = [
      {
        name: 'timeout',
        validate: (value) => ({
          isValid: !value || (typeof value === 'number' && value > 0 && value <= 60000 * 10),
          errors: value && (typeof value !== 'number' || value <= 0 || value > 60000 * 10)
            ? ['Timeout must be a positive number within reasonable limits'] : [],
          warnings: [],
          requirements: []
        })
      },
      {
        name: 'maxFiles',
        validate: (value) => ({
          isValid: !value || (typeof value === 'number' && value > 0 && value <= 10000),
          errors: value && (typeof value !== 'number' || value <= 0 || value > 10000)
            ? [`Max files must be between 1 and 10000`] : [],
          warnings: [],
          requirements: []
        })
      },
      {
        name: 'confidence',
        validate: (value) => ({
          isValid: !value || (typeof value === 'number' && value >= 0 && value <= 1),
          errors: value && (typeof value !== 'number' || value < 0 || value > 1)
            ? ['Confidence must be between 0 and 1'] : [],
          warnings: [],
          requirements: []
        })
      }
    ];

    for (const rule of rules) {
      if (config[rule.name] !== undefined) {
        const result = rule.validate(config[rule.name]);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requirements: []
    };
  }

  /**
   * Validate detected patterns
   */
  static validateDetectedPatterns(patterns: IDetectedPattern[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(patterns)) {
      errors.push('Patterns must be an array');
      return { isValid: false, errors, warnings, requirements: [] };
    }

    patterns.forEach((pattern, index) => {
      const patternErrors = this.validateSinglePattern(pattern, index);
      errors.push(...patternErrors.errors);
      warnings.push(...patternErrors.warnings);
    });

    // Cross-pattern validation
    const typeGroups = patterns.reduce((groups, pattern) => {
      groups[pattern.type] = (groups[pattern.type] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);

    if (typeGroups['framework'] && typeGroups['framework'] > 5) {
      warnings.push(`High number of framework patterns detected (${typeGroups['framework']}) - may indicate over-engineering`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requirements: []
    };
  }

  /**
   * Validate analysis result structure
   */
  static validateAnalysisResult<T>(result: AnalysisResult<T>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (typeof result.success !== 'boolean') {
      errors.push('Analysis result must have a boolean "success" field');
    }

    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      errors.push('Analysis result must have a confidence value between 0 and 1');
    }

    // Conditional validation based on success
    if (result.success) {
      if (result.data === undefined || result.data === null) {
        errors.push('Successful analysis result must include data');
      }
    } else {
      if (!result.error) {
        errors.push('Failed analysis result must include an error message');
      }
    }

    // Warnings validation
    if (result.warnings && !Array.isArray(result.warnings)) {
      errors.push('Warnings must be an array');
    }

    // Metadata validation
    if (result.metadata) {
      const metadataValidation = this.validateAnalysisMetadata(result.metadata);
      errors.push(...metadataValidation.errors);
      warnings.push(...metadataValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requirements: []
    };
  }

  /**
   * Validate analysis metadata
   */
  static validateAnalysisMetadata(metadata: AnalysisMetadata): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!metadata.analyzer || typeof metadata.analyzer !== 'string') {
      errors.push('Metadata must include analyzer name');
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push('Metadata must include version');
    }

    if (typeof metadata.executionTime !== 'number' || metadata.executionTime < 0) {
      errors.push('Metadata must include valid executionTime');
    }

    if (!(metadata.timestamp instanceof Date)) {
      errors.push('Metadata must include valid timestamp');
    }

    // Performance warnings
    if (metadata.executionTime > 60000) {
      warnings.push(`Analysis execution time (${metadata.executionTime}ms) exceeded recommended timeout`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requirements: []
    };
  }

  /**
   * Validate batch operation parameters
   */
  static validateBatchParameters(params: {
    batchSize?: number;
    concurrency?: number;
    timeout?: number;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (params.batchSize && (params.batchSize < 1 || params.batchSize > 100)) {
      errors.push('Batch size must be between 1 and 100');
    }

    if (params.concurrency && (params.concurrency < 1 || params.concurrency > 10)) {
      errors.push('Concurrency must be between 1 and 10');
    }

    if (params.timeout && params.timeout < 1000) {
      warnings.push('Timeout below 1 second may cause premature failures');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requirements: []
    };
  }

  /**
   * Sanitize and normalize input data
   */
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input.trim().replace(/[<>]/g, ''); // Basic XSS protection
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        if (key.startsWith('_') || key.includes('__')) {
          continue; // Skip potentially dangerous properties
        }
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  // Removed unused composeValidationRules function

  private static validateSinglePattern(pattern: IDetectedPattern, index: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!pattern.type) {
      errors.push(`Pattern at index ${index} missing type`);
    }

    if (typeof pattern.confidence !== 'number' || pattern.confidence < 0 || pattern.confidence > 1) {
      errors.push(`Pattern at index ${index} has invalid confidence value`);
    }

    if (!pattern.metadata?.['description']) {
      errors.push(`Pattern at index ${index} missing description in metadata`);
    }

    if (!Array.isArray(pattern.metadata?.['recommendations'])) {
      errors.push(`Pattern at index ${index} recommendations must be an array in metadata`);
    }

    // Confidence threshold warnings
    const threshold = 0.7;
    if (threshold && pattern.confidence < threshold) {
      warnings.push(`Pattern "${pattern.metadata?.['description']}" confidence (${pattern.confidence}) below recommended threshold (${threshold})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requirements: []
    };
  }
}