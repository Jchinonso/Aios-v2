#!/usr/bin/env node

/**
 * AIOS Interactive CLI Entry Point
 *
 * @fileoverview Entry point for interactive CLI mode
 * @module node-cli
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { runInteractiveCLI } from './interactive.js';

// Load environment variables from multiple locations
// 1. AIOS installation directory (where API keys are stored)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const aiosRootDir = resolve(__dirname, '..', '..');
config({ path: resolve(aiosRootDir, '.env') });

// 2. Current working directory (user's project)
config({ path: resolve(process.cwd(), '.env') });

// 3. Parent directory (for monorepo setups)
config({ path: resolve(process.cwd(), '..', '.env') });

/**
 * Simple console logger for interactive mode
 */
const logger = {
  info: (message: string, context?: any) => {
    console.log(chalk.blue(`ℹ️  [aios] ${message}`));
    if (context) {
      console.log(chalk.gray('   Context:'), JSON.stringify(context, null, 2));
    }
  },
  warn: (message: string, context?: any) => {
    console.log(chalk.yellow(`⚠️  [aios] ${message}`));
    if (context) {
      console.log(chalk.gray('   Context:'), JSON.stringify(context, null, 2));
    }
  },
  error: (message: string, error?: Error | unknown) => {
    console.error(chalk.red(`❌  [aios] ${message}`));
    if (error instanceof Error) {
      console.error(chalk.gray('   Error:'), JSON.stringify({
        name: error.name,
        message: error.message
      }, null, 2));
    }
  },
  debug: (message: string, context?: any) => {
    if (process.env['DEBUG']) {
      console.log(chalk.gray(`🔍 [aios] ${message}`));
      if (context) {
        console.log(chalk.gray('   Context:'), JSON.stringify(context, null, 2));
      }
    }
  },
  trace: (message: string, context?: any) => {
    if (process.env['TRACE']) {
      console.log(chalk.gray(`🔬 [aios] ${message}`));
      if (context) {
        console.log(chalk.gray('   Context:'), JSON.stringify(context, null, 2));
      }
    }
  }
};

/**
 * Main entry point
 */
async function main() {
  try {
    await runInteractiveCLI({
      logger,
      projectPath: process.cwd()
    });
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the CLI
main();