/**
 * Migration Types - Interface Segregation
 *
 * Following SOLID Principles:
 * - ISP: Focused type definitions for migration operations
 * - SRP: Single responsibility for type declarations
 */

export interface MigrationTask {
  type: 'create_directory' | 'create_file' | 'move_file' | 'update_file';
  source?: string;
  target: string;
  content?: string;
  backup?: boolean;
}

export interface MigrationPlan {
  description: string;
  tasks: MigrationTask[];
}

export interface MigrationOptions {
  dryRun?: boolean;
  backup?: boolean;
  verbose?: boolean;
}

export interface MigrationResult {
  success: boolean;
  tasksCompleted: number;
  tasksTotal: number;
  errors: string[];
  warnings: string[];
}