#!/usr/bin/env node

/**
 * Style Validation Script - SOLID Principles Implementation
 *
 * This script has been refactored to use modular services following SOLID principles.
 * Original 365-line monolithic script split into focused, single-responsibility modules.
 */

import { StyleValidatorFactory } from './style-validation/index';
import type { StyleValidationOptions } from './style-validation/index';

// Configuration for style validation
const DEFAULT_OPTIONS: StyleValidationOptions = {
  fileOptions: {
    pattern: '**/*.{ts,js,tsx,jsx}',
    ignorePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.d.ts',
      '**/coverage/**'
    ],
    maxFiles: 5000
  },
  checkOptions: {
    skipComments: true,
    skipStrings: true
  },
  reportFormat: 'detailed'
};

async function main(): Promise<void> {
  try {
    console.log('🔍 Starting TypeScript/JavaScript style validation...\n');

    // Create validator using factory
    const validator = StyleValidatorFactory.create();

    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = parseArguments(args);

    // Run validation
    const result = await validator.validate(options);

    // Exit with appropriate code
    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    console.error('❌ Style validation failed:', error);
    process.exit(1);
  }
}

function parseArguments(args: string[]): StyleValidationOptions {
  const options = { ...DEFAULT_OPTIONS };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--pattern':
        if (i + 1 < args.length && options.fileOptions) {
          options.fileOptions.pattern = args[++i];
        }
        break;

      case '--format':
        if (i + 1 < args.length) {
          const format = args[++i] as 'summary' | 'detailed' | 'json';
          options.reportFormat = format;
        }
        break;

      case '--max-files':
        if (i + 1 < args.length && options.fileOptions) {
          options.fileOptions.maxFiles = parseInt(args[++i], 10);
        }
        break;

      case '--help':
        printUsage();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printUsage(): void {
  console.log(`
Usage: npm run validate:style [options]

Options:
  --help              Show this help message
  --pattern <pattern> File pattern to validate (default: **/*.{ts,js,tsx,jsx})
  --format <format>   Output format: summary|detailed|json (default: detailed)
  --max-files <num>   Maximum files to process (default: 5000)

Examples:
  npm run validate:style
  npm run validate:style -- --pattern "src/**/*.ts"
  npm run validate:style -- --format summary
  npm run validate:style -- --max-files 1000
`);
}

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

/**
 * Refactoring Summary:
 *
 * This monolithic 365-line file has been successfully refactored into 5 focused modules:
 *
 * 1. style-rules.ts (125 lines) - Rule definitions and management
 * 2. file-scanner.service.ts (95 lines) - File discovery and filtering
 * 3. violation-checker.service.ts (150 lines) - Violation detection logic
 * 4. style-validator.service.ts (120 lines) - Main orchestration service
 * 5. index.ts (45 lines) - Public API and factory
 *
 * Benefits achieved:
 * - SOLID principles compliance
 * - Each service is independently testable
 * - Easy to add new rules and validation logic
 * - Clear separation of concerns
 * - Improved maintainability
 * - Average file size: ~107 lines (well under 200-line limit)
 */