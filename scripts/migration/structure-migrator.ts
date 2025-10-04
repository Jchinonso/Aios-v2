/**
 * Structure Migrator - SRP for Migration Orchestration
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for coordinating structure migration
 * - OCP: Open for extension through new migration strategies
 * - LSP: Substitutable migration implementation
 * - DIP: Depends on abstractions (planner, executor)
 */

import type { MigrationOptions, MigrationResult } from './types.js';
import { MigrationPlanner } from './migration-planner.js';
import { MigrationExecutor } from './migration-executor.js';

export class StructureMigrator {
  private readonly planner: MigrationPlanner;
  private readonly executor: MigrationExecutor;

  constructor(
    private readonly rootPath: string,
    private readonly options: MigrationOptions = {}
  ) {
    this.planner = new MigrationPlanner(rootPath);
    this.executor = new MigrationExecutor(rootPath, options);
  }

  async migrate(): Promise<MigrationResult> {
    console.log('🚀 Starting AIOS v2 structure migration...\n');

    try {
      // Create migration plan
      const plan = await this.planner.createMigrationPlan();

      // Handle dry run mode
      if (this.options.dryRun) {
        console.log('📋 DRY RUN MODE - No changes will be made\n');
        this.executor.printMigrationPlan(plan);
        return {
          success: true,
          tasksCompleted: 0,
          tasksTotal: plan.tasks.length,
          errors: [],
          warnings: ['Dry run mode - no changes made']
        };
      }

      // Execute migration
      const result = await this.executor.executeMigrationPlan(plan);

      // Print results
      this.executor.printMigrationResult(result);

      return result;
    } catch (error) {
      const errorMessage = `Migration failed: ${(error as Error).message}`;
      console.error(`❌ ${errorMessage}`);

      return {
        success: false,
        tasksCompleted: 0,
        tasksTotal: 0,
        errors: [errorMessage],
        warnings: []
      };
    }
  }

  async validateMigration(): Promise<boolean> {
    console.log('🔍 Validating migration requirements...\n');

    try {
      // Check if we're in the right directory
      const fs = await import('fs/promises');
      const packageJsonExists = await fs.access(`${this.rootPath}/package.json`).then(() => true).catch(() => false);

      if (!packageJsonExists) {
        console.error('❌ package.json not found. Please run from project root.');
        return false;
      }

      // Check if backup directory already exists
      const backupExists = await fs.access(`${this.rootPath}/.migration-backup`).then(() => true).catch(() => false);

      if (backupExists && !this.options.dryRun) {
        console.warn('⚠️  Previous migration backup found. Consider cleaning up first.');
      }

      console.log('✅ Migration validation passed\n');
      return true;
    } catch (error) {
      console.error(`❌ Validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up migration artifacts...\n');

    try {
      const fs = await import('fs/promises');
      const backupPath = `${this.rootPath}/.migration-backup`;

      // Remove backup directory if it exists
      try {
        await fs.rm(backupPath, { recursive: true, force: true });
        console.log('✅ Backup directory cleaned up');
      } catch {
        console.log('ℹ️  No backup directory to clean up');
      }

      console.log('✅ Cleanup completed\n');
    } catch (error) {
      console.error(`❌ Cleanup failed: ${(error as Error).message}`);
    }
  }
}