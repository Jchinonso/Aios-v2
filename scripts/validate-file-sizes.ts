#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface IFileSizeRule {
  pattern: string;
  maxLines: number;
  optimalLines: number;
  description: string;
}

interface IFileSizeViolation {
  file: string;
  currentLines: number;
  maxAllowed: number;
  optimalRange: number;
  severity: 'error' | 'warning' | 'info';
  suggestion: string;
}

interface IFileSizeReport {
  violations: IFileSizeViolation[];
  summary: {
    totalFiles: number;
    oversizedFiles: number;
    averageFileSize: number;
    largestFile: { name: string; lines: number };
  };
}

/**
 * Enterprise file size validator that enforces senior developer standards.
 */
class FileSizeValidator {
  private readonly _rules: IFileSizeRule[] = [
    {
      pattern: '**/*.{ts,tsx,js,jsx}',
      maxLines: 200,
      optimalLines: 150,
      description: 'General TypeScript/JavaScript files'
    },
    {
      pattern: '**/*.types.ts',
      maxLines: 100,
      optimalLines: 75,
      description: 'Type definition files'
    },
    {
      pattern: '**/*.constants.ts',
      maxLines: 100,
      optimalLines: 60,
      description: 'Constants files'
    },
    {
      pattern: '**/*.service.ts',
      maxLines: 250,
      optimalLines: 200,
      description: 'Service implementation files'
    },
    {
      pattern: '**/*.repository.ts',
      maxLines: 200,
      optimalLines: 150,
      description: 'Repository pattern files'
    },
    {
      pattern: '**/*.utils.ts',
      maxLines: 150,
      optimalLines: 100,
      description: 'Utility function files'
    },
    {
      pattern: '**/*.config.{ts,js}',
      maxLines: 100,
      optimalLines: 60,
      description: 'Configuration files'
    },
    {
      pattern: '**/*.test.{ts,js}',
      maxLines: 300,
      optimalLines: 200,
      description: 'Test files'
    },
    {
      pattern: '**/index.ts',
      maxLines: 50,
      optimalLines: 30,
      description: 'Index/barrel files'
    }
  ];

  /**
   * Validates file sizes across the entire codebase.
   */
  public async validateFilesSizes(): Promise<IFileSizeReport> {
    const violations: IFileSizeViolation[] = [];
    const allFiles: { name: string; lines: number }[] = [];

    for (const rule of this._rules) {
      const files = await glob(rule.pattern, {
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/*.d.ts',
          '**/coverage/**'
        ],
        cwd: process.cwd()
      });

      for (const file of files) {
        const lineCount = this._countLines(file);
        allFiles.push({ name: file, lines: lineCount });

        if (lineCount > rule.maxLines) {
          violations.push({
            file,
            currentLines: lineCount,
            maxAllowed: rule.maxLines,
            optimalRange: rule.optimalLines,
            severity: lineCount > rule.maxLines * 1.5 ? 'error' : 'warning',
            suggestion: this._generateSuggestion(file, lineCount, rule)
          });
        } else if (lineCount > rule.optimalLines) {
          violations.push({
            file,
            currentLines: lineCount,
            maxAllowed: rule.maxLines,
            optimalRange: rule.optimalLines,
            severity: 'info',
            suggestion: `Consider refactoring to stay under ${rule.optimalLines} lines for optimal maintainability`
          });
        }
      }
    }

    const summary = this._calculateSummary(allFiles, violations);

    return {
      violations,
      summary
    };
  }

  /**
   * Counts effective lines of code (excluding comments and empty lines).
   */
  private _countLines(filePath: string): number {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      return lines.filter(line => {
        const trimmed = line.trim();
        return (
          trimmed.length > 0 &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('*') &&
          trimmed !== '*/'
        );
      }).length;
    } catch (error) {
      console.warn(`Could not read file ${filePath}:`, error);
      return 0;
    }
  }

  /**
   * Generates specific refactoring suggestions based on file type and size.
   */
  private _generateSuggestion(file: string, currentLines: number, rule: IFileSizeRule): string {
    const excessLines = currentLines - rule.maxLines;
    const fileName = path.basename(file);

    if (fileName.includes('.service.')) {
      return `Service file is ${excessLines} lines over limit. Consider:
        - Extract helper methods into utility files
        - Split into multiple focused services
        - Move validation logic to separate validator classes
        - Extract complex business rules into domain objects`;
    }

    if (fileName.includes('.types.')) {
      return `Type file is ${excessLines} lines over limit. Consider:
        - Split into feature-specific type files
        - Move utility types to separate files
        - Group related types into interfaces
        - Extract complex types into their own files`;
    }

    if (fileName.includes('.utils.')) {
      return `Utility file is ${excessLines} lines over limit. Consider:
        - Group related utilities into separate files
        - Extract complex functions into dedicated modules
        - Split by functionality (validation, formatting, etc.)
        - Move to feature-specific utility files`;
    }

    if (fileName === 'index.ts') {
      return `Index file is ${excessLines} lines over limit. Consider:
        - Create sub-index files for different features
        - Group exports by functionality
        - Extract re-exports to feature-specific barrels
        - Simplify export structure`;
    }

    return `File is ${excessLines} lines over limit. Consider breaking it into smaller, more focused modules.`;
  }

  /**
   * Calculates summary statistics for the file size report.
   */
  private _calculateSummary(
    allFiles: { name: string; lines: number }[],
    violations: IFileSizeViolation[]
  ): IFileSizeReport['summary'] {
    const totalFiles = allFiles.length;
    const oversizedFiles = violations.filter(v => v.severity === 'error' || v.severity === 'warning').length;
    const averageFileSize = totalFiles > 0
      ? allFiles.reduce((sum, file) => sum + file.lines, 0) / totalFiles
      : 0;

    const largestFile = allFiles.reduce(
      (largest, current) => current.lines > largest.lines ? current : largest,
      { name: '', lines: 0 }
    );

    return {
      totalFiles,
      oversizedFiles,
      averageFileSize: Math.round(averageFileSize),
      largestFile
    };
  }

  /**
   * Generates a comprehensive file size report.
   */
  public generateReport(report: IFileSizeReport): void {
    console.log('\n📏 File Size Validation Report\n');
    console.log('='.repeat(50));

    // Overall statistics
    console.log(`\n📊 Summary Statistics:`);
    console.log(`   Total files analyzed: ${report.summary.totalFiles}`);
    console.log(`   Files exceeding guidelines: ${report.summary.oversizedFiles}`);
    console.log(`   Average file size: ${report.summary.averageFileSize} lines`);
    console.log(`   Largest file: ${report.summary.largestFile.name} (${report.summary.largestFile.lines} lines)`);

    // Compliance score
    const complianceRate = report.summary.totalFiles > 0
      ? ((report.summary.totalFiles - report.summary.oversizedFiles) / report.summary.totalFiles) * 100
      : 100;

    console.log(`\n🎯 Compliance Rate: ${complianceRate.toFixed(1)}%`);

    if (complianceRate >= 95) {
      console.log(`   ✅ EXCELLENT: Files follow senior developer size guidelines`);
    } else if (complianceRate >= 85) {
      console.log(`   🟡 GOOD: Most files follow guidelines, some optimization needed`);
    } else if (complianceRate >= 70) {
      console.log(`   🟠 NEEDS IMPROVEMENT: Many files exceed recommended sizes`);
    } else {
      console.log(`   🔴 POOR: Significant refactoring needed for maintainability`);
    }

    // Violations by severity
    const errors = report.violations.filter(v => v.severity === 'error');
    const warnings = report.violations.filter(v => v.severity === 'warning');
    const infos = report.violations.filter(v => v.severity === 'info');

    if (errors.length > 0) {
      console.log(`\n🔴 Critical Size Violations (${errors.length}):`);
      errors.slice(0, 5).forEach(violation => {
        console.log(`   ${violation.file}: ${violation.currentLines} lines (max: ${violation.maxAllowed})`);
        console.log(`   └─ ${violation.suggestion.split('.')[0]}`);
      });

      if (errors.length > 5) {
        console.log(`   ... and ${errors.length - 5} more critical violations`);
      }
    }

    if (warnings.length > 0) {
      console.log(`\n🟡 Size Warnings (${warnings.length}):`);
      warnings.slice(0, 3).forEach(violation => {
        console.log(`   ${violation.file}: ${violation.currentLines} lines (max: ${violation.maxAllowed})`);
      });

      if (warnings.length > 3) {
        console.log(`   ... and ${warnings.length - 3} more warnings`);
      }
    }

    // Recommendations
    console.log(`\n🎯 Refactoring Recommendations:`);

    if (errors.length > 0) {
      console.log(`   1. 🔴 Immediately refactor ${errors.length} oversized files`);
    }

    if (warnings.length > 0) {
      console.log(`   2. 🟡 Plan refactoring for ${warnings.length} files approaching limits`);
    }

    console.log(`   3. 📏 Establish file size monitoring in CI/CD pipeline`);
    console.log(`   4. 📚 Train team on file organization best practices`);
    console.log(`   5. 🔄 Regular code review for file size compliance`);

    // Best practices reminder
    console.log(`\n📋 File Size Guidelines:`);
    console.log(`   • Functions: 10-20 lines (max 25)`);
    console.log(`   • Classes: 100-200 lines (max 250)`);
    console.log(`   • Modules: 150-200 lines (max 250)`);
    console.log(`   • Type files: 50-100 lines (max 150)`);
    console.log(`   • Index files: 20-30 lines (max 50)`);

    console.log('\n' + '='.repeat(50));
  }
}

/**
 * Main execution function.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1];

  console.log('📏 Validating file sizes against senior developer standards...\n');

  const validator = new FileSizeValidator();
  const report = await validator.validateFilesSizes();

  validator.generateReport(report);

  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${outputFile}`);
  }

  // Exit with appropriate code
  const hasErrors = report.violations.some(v => v.severity === 'error');
  process.exit(hasErrors ? 1 : 0);
}

// Check if this script is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { FileSizeValidator, IFileSizeRule, IFileSizeViolation };