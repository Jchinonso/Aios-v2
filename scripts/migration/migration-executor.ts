/**
 * Migration Executor - SRP for Migration Execution
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for executing migration plans
 * - OCP: Open for extension through new execution strategies
 * - DIP: Depends on abstractions (file operations)
 */

import type { MigrationPlan, MigrationTask, MigrationResult, MigrationOptions } from './types.js';
import { FileOperations } from './file-operations.js';

export class MigrationExecutor {
  private readonly fileOps: FileOperations;

  constructor(
    private readonly rootPath: string,
    private readonly options: MigrationOptions = {}
  ) {
    const backupDir = `${rootPath}/.migration-backup`;
    this.fileOps = new FileOperations(rootPath, backupDir);
  }

  async executeMigrationPlan(plan: MigrationPlan): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      tasksCompleted: 0,
      tasksTotal: plan.tasks.length,
      errors: [],
      warnings: []
    };

    console.log(`📋 Executing migration: ${plan.description}`);
    console.log(`📊 Total tasks: ${plan.tasks.length}\n`);

    for (let i = 0; i < plan.tasks.length; i++) {
      const task = plan.tasks[i];

      try {
        await this.executeTask(task);
        result.tasksCompleted++;

        if (this.options.verbose) {
          console.log(`✅ [${i + 1}/${plan.tasks.length}] ${this.fileOps.getTaskDescription(task)}`);
        }
      } catch (error) {
        const errorMessage = `Failed to execute task: ${this.fileOps.getTaskDescription(task)} - ${(error as Error).message}`;
        result.errors.push(errorMessage);
        result.success = false;

        console.error(`❌ [${i + 1}/${plan.tasks.length}] ${errorMessage}`);
      }
    }

    return result;
  }

  async executeTask(task: MigrationTask): Promise<void> {
    if (this.options.dryRun) {
      console.log(`[DRY RUN] ${this.fileOps.getTaskDescription(task)}`);
      return;
    }

    switch (task.type) {
      case 'create_directory':
        await this.fileOps.ensureDirectory(task.target);
        break;

      case 'create_file':
        if (!task.content) {
          throw new Error('Content is required for create_file task');
        }
        await this.fileOps.createFile(task.target, task.content);
        break;

      case 'move_file':
        if (!task.source) {
          throw new Error('Source is required for move_file task');
        }
        await this.fileOps.moveFile(task.source, task.target, task.backup);
        break;

      case 'update_file':
        if (!task.content) {
          throw new Error('Content is required for update_file task');
        }
        await this.fileOps.updateFile(task.target, task.content, task.backup);
        break;

      default:
        throw new Error(`Unknown task type: ${(task as any).type}`);
    }
  }

  printMigrationPlan(plan: MigrationPlan): void {
    console.log(`📋 Migration Plan: ${plan.description}\n`);
    console.log(`📊 Total tasks: ${plan.tasks.length}\n`);

    plan.tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${this.fileOps.getTaskDescription(task)}`);
    });

    console.log('\n💡 Use --execute flag to run this migration');
  }

  printMigrationResult(result: MigrationResult): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Results');
    console.log('='.repeat(50));

    if (result.success) {
      console.log(`✅ Migration completed successfully!`);
    } else {
      console.log(`❌ Migration completed with errors`);
    }

    console.log(`📈 Tasks completed: ${result.tasksCompleted}/${result.tasksTotal}`);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    console.log('\n' + '='.repeat(50));
  }
}