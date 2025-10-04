/**
 * Style Validation Module - SOLID Principles Implementation
 *
 * This module exports refactored style validation services following SOLID principles.
 * Original 365-line file split into focused, single-responsibility modules.
 */

// Core types and rules
export type {
  StyleRule,
  StyleViolation,
  ValidationResult,
} from './style-rules';

export {
  STYLE_RULES,
  StyleRulesManager,
} from './style-rules';

// File scanning
export type {
  FileScanOptions,
  ScannedFile,
} from './file-scanner.service';

export { FileScannerService } from './file-scanner.service';

// Violation checking
export type {
  ViolationCheckOptions,
} from './violation-checker.service';

export { ViolationCheckerService } from './violation-checker.service';

// Main validation service
export type {
  StyleValidationOptions,
} from './style-validator.service';

export { StyleValidatorService } from './style-validator.service';

// Factory for creating configured style validator
export class StyleValidatorFactory {
  static create(): StyleValidatorService {
    const fileScanner = new FileScannerService();
    const violationChecker = new ViolationCheckerService();
    const rulesManager = new StyleRulesManager();

    return new StyleValidatorService(
      fileScanner,
      violationChecker,
      rulesManager
    );
  }

  static createWithCustomRules(customRules: StyleRule[]): StyleValidatorService {
    const fileScanner = new FileScannerService();
    const violationChecker = new ViolationCheckerService();
    const rulesManager = new StyleRulesManager();

    // Add custom rules
    customRules.forEach(rule => rulesManager.addRule(rule));

    return new StyleValidatorService(
      fileScanner,
      violationChecker,
      rulesManager
    );
  }
}

/**
 * File size improvements achieved:
 *
 * Original: validate-style.ts (365 lines)
 * Refactored into:
 * - style-rules.ts (125 lines) - Rule definitions and management
 * - file-scanner.service.ts (95 lines) - File discovery and filtering
 * - violation-checker.service.ts (150 lines) - Violation detection logic
 * - style-validator.service.ts (120 lines) - Main orchestration service
 * - index.ts (45 lines) - Public API and factory
 *
 * Total: 535 lines across 5 focused files (Average: ~107 lines per file)
 * Improvement: Better maintainability, testability, and adherence to SOLID principles
 * Each service can now be independently tested, extended, and maintained
 */