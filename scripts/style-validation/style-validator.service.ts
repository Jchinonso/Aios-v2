/**
 * Style Validator Service - SRP Orchestrator
 *
 * Single Responsibility: Orchestrate style validation across files
 */

import type {
  StyleRule,
  StyleViolation,
  ValidationResult,
} from './style-rules';
import type { FileScanOptions, ScannedFile } from './file-scanner.service';
import type { ViolationCheckOptions } from './violation-checker.service';

export interface StyleValidationOptions {
  fileOptions?: FileScanOptions;
  checkOptions?: ViolationCheckOptions;
  rules?: StyleRule[];
  reportFormat?: 'summary' | 'detailed' | 'json';
}

export class StyleValidatorService {
  constructor(
    private readonly fileScanner: any, // Will be injected
    private readonly violationChecker: any, // Will be injected
    private readonly rulesManager: any // Will be injected
  ) {}

  async validate(options: StyleValidationOptions = {}): Promise<ValidationResult> {
    const {
      fileOptions = {},
      checkOptions = {},
      rules,
      reportFormat = 'summary'
    } = options;

    try {
      // Step 1: Scan files
      const files = await this.fileScanner.scanFiles(fileOptions);

      if (files.length === 0) {
        return this.createEmptyResult();
      }

      // Step 2: Get rules to apply
      const rulesToApply = rules || this.rulesManager.getAllRules();

      // Step 3: Check violations across all files
      const filePaths = files.map((file: ScannedFile) => file.path);
      const violations = await this.violationChecker.checkMultipleFiles(
        filePaths,
        rulesToApply,
        checkOptions
      );

      // Step 4: Build result
      const result = this.buildResult(violations, files.length);

      // Step 5: Log summary if requested
      if (reportFormat !== 'json') {
        this.logValidationSummary(result, reportFormat);
      }

      return result;
    } catch (error) {
      console.error('Style validation failed:', error);
      return this.createErrorResult(error as Error);
    }
  }

  async validateFile(filePath: string, options: StyleValidationOptions = {}): Promise<ValidationResult> {
    const {
      checkOptions = {},
      rules
    } = options;

    try {
      const rulesToApply = rules || this.rulesManager.getAllRules();
      const violations = await this.violationChecker.checkFile(filePath, rulesToApply, checkOptions);

      return this.buildResult(violations, 1);
    } catch (error) {
      console.error(`Style validation failed for ${filePath}:`, error);
      return this.createErrorResult(error as Error);
    }
  }

  private buildResult(violations: StyleViolation[], filesChecked: number): ValidationResult {
    const errors = violations.filter(v => v.severity === 'error').length;
    const warnings = violations.filter(v => v.severity === 'warning').length;

    return {
      valid: errors === 0,
      violations,
      summary: {
        errors,
        warnings,
        filesChecked
      }
    };
  }

  private createEmptyResult(): ValidationResult {
    return {
      valid: true,
      violations: [],
      summary: {
        errors: 0,
        warnings: 0,
        filesChecked: 0
      }
    };
  }

  private createErrorResult(error: Error): ValidationResult {
    return {
      valid: false,
      violations: [{
        file: 'validation-error',
        line: 0,
        column: 0,
        rule: 'system-error',
        message: error.message,
        severity: 'error',
        content: ''
      }],
      summary: {
        errors: 1,
        warnings: 0,
        filesChecked: 0
      }
    };
  }

  private logValidationSummary(result: ValidationResult, format: 'summary' | 'detailed'): void {
    const { summary, violations } = result;

    console.log('\\n=== Style Validation Report ===');
    console.log(`Files checked: ${summary.filesChecked}`);
    console.log(`Errors: ${summary.errors}`);
    console.log(`Warnings: ${summary.warnings}`);
    console.log(`Status: ${result.valid ? '✅ PASSED' : '❌ FAILED'}`);

    if (format === 'detailed' && violations.length > 0) {
      console.log('\\n--- Violations ---');

      const byFile = this.violationChecker.groupViolationsByFile(violations);

      for (const [file, fileViolations] of byFile) {
        console.log(`\\n📁 ${file}:`);
        for (const violation of fileViolations) {
          const icon = violation.severity === 'error' ? '❌' : '⚠️';
          console.log(`  ${icon} Line ${violation.line}:${violation.column} - ${violation.message} (${violation.rule})`);
        }
      }
    }

    console.log('\\n================================\\n');
  }

  getViolationStatistics(violations: StyleViolation[]): {
    byRule: Map<string, number>;
    byFile: Map<string, number>;
    bySeverity: { errors: number; warnings: number };
  } {
    const byRule = new Map<string, number>();
    const byFile = new Map<string, number>();
    let errors = 0;
    let warnings = 0;

    for (const violation of violations) {
      // Count by rule
      byRule.set(violation.rule, (byRule.get(violation.rule) || 0) + 1);

      // Count by file
      byFile.set(violation.file, (byFile.get(violation.file) || 0) + 1);

      // Count by severity
      if (violation.severity === 'error') {
        errors++;
      } else {
        warnings++;
      }
    }

    return {
      byRule,
      byFile,
      bySeverity: { errors, warnings }
    };
  }
}