/**
 * Migration Planner - SRP for Migration Planning
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for creating migration plans
 * - OCP: Open for extension through new migration strategies
 * - DIP: Depends on abstractions
 */

import type { MigrationPlan, MigrationTask } from './types.js';

export class MigrationPlanner {
  constructor(private readonly rootPath: string) {}

  async createMigrationPlan(): Promise<MigrationPlan> {
    const tasks: MigrationTask[] = [];

    // Add directory creation tasks
    tasks.push(...this.createDirectoryTasks());

    // Add index file creation tasks
    tasks.push(...this.createIndexFileTasks());

    // Add file migration tasks
    tasks.push(...this.createFileMigrationTasks());

    // Add package script update tasks
    tasks.push(...this.createPackageUpdateTasks());

    return {
      description: 'AIOS v2 Structure Migration',
      tasks
    };
  }

  private createDirectoryTasks(): MigrationTask[] {
    const directories = [
      'shared/types',
      'shared/constants',
      'shared/intelligence',
      'shared/cloud',
      'shared/utils',
      'node-cli/src',
      'node-cli/src/commands',
      'node-cli/src/services'
    ];

    return directories.map(dir => ({
      type: 'create_directory' as const,
      target: dir
    }));
  }

  private createIndexFileTasks(): MigrationTask[] {
    const indexFiles = [
      {
        path: 'shared/types/index.ts',
        content: `// Export all types
export * from './ai.types';
export * from './cloud.types';
`
      },
      {
        path: 'shared/constants/index.ts',
        content: `// Export all constants
export * from './ai.constants';
export * from './cloud.constants';
`
      },
      {
        path: 'shared/intelligence/index.ts',
        content: `// Export intelligence modules
export * from './ai-client';
export * from './project-analyzer';
`
      },
      {
        path: 'shared/cloud/index.ts',
        content: `// Export cloud modules
export * from './deployment';
export * from './providers';
`
      },
      {
        path: 'shared/index.ts',
        content: `// Export all shared modules
export * from './types';
export * from './constants';
export * from './intelligence';
export * from './cloud';
export * from './utils';
`
      },
      {
        path: 'node-cli/src/index.ts',
        content: `#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('aios')
  .description('AI-powered DevOps Assistant CLI')
  .version('2.0.0');

// Import and register commands
// TODO: Add command imports here

program.parse();
`
      }
    ];

    return indexFiles.map(file => ({
      type: 'create_file' as const,
      target: file.path,
      content: file.content
    }));
  }

  private createFileMigrationTasks(): MigrationTask[] {
    const fileMigrations = [
      {
        source: 'aishell/src/intelligence/ai_client.rs',
        target: 'shared/intelligence/ai-client.ts'
      },
      {
        source: 'aishell/src/intelligence/project_analyzer.rs',
        target: 'shared/intelligence/project-analyzer.ts'
      },
      {
        source: 'aishell/src/cloud/deployment_flow.rs',
        target: 'shared/cloud/deployment.ts'
      }
    ];

    return fileMigrations.map(migration => ({
      type: 'move_file' as const,
      source: migration.source,
      target: migration.target,
      backup: true
    }));
  }

  private createPackageUpdateTasks(): MigrationTask[] {
    return [
      {
        type: 'update_file' as const,
        target: 'package.json',
        content: JSON.stringify({
          scripts: {
            'build': 'npm run build:shared && npm run build:cli',
            'build:shared': 'tsc -p shared/tsconfig.json',
            'build:cli': 'tsc -p node-cli/tsconfig.json',
            'dev': 'npm run dev:shared && npm run dev:cli',
            'dev:shared': 'tsc -p shared/tsconfig.json --watch',
            'dev:cli': 'tsc -p node-cli/tsconfig.json --watch',
            'test': 'jest',
            'lint': 'eslint "**/*.{ts,js}" --fix',
            'migrate': 'tsx scripts/migrate-structure.ts'
          }
        }, null, 2)
      }
    ];
  }
}