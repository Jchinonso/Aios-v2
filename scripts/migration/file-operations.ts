/**
 * File Operations - SRP for File System Operations
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for file system operations
 * - OCP: Open for extension through new file operations
 * - DIP: Depends on abstractions
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import type { MigrationTask } from './types.js';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const copyFile = promisify(fs.copyFile);
const rename = promisify(fs.rename);

export class FileOperations {
  constructor(
    private readonly rootPath: string,
    private readonly backupDir: string
  ) {}

  async ensureDirectory(dirPath: string): Promise<void> {
    const fullPath = path.resolve(this.rootPath, dirPath);
    try {
      await mkdir(fullPath, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async createFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.resolve(this.rootPath, filePath);
    const dirPath = path.dirname(fullPath);

    await this.ensureDirectory(path.relative(this.rootPath, dirPath));
    await writeFile(fullPath, content, 'utf8');
  }

  async moveFile(source: string, target: string, backup: boolean = false): Promise<void> {
    const sourcePath = path.resolve(this.rootPath, source);
    const targetPath = path.resolve(this.rootPath, target);

    // Check if source exists
    try {
      await stat(sourcePath);
    } catch {
      console.warn(`⚠️  Source file not found: ${source}`);
      return;
    }

    // Create backup if requested
    if (backup) {
      await this.backupFile(source);
    }

    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    await this.ensureDirectory(path.relative(this.rootPath, targetDir));

    // Move the file
    await rename(sourcePath, targetPath);
  }

  async updateFile(filePath: string, content: string, backup: boolean = true): Promise<void> {
    const fullPath = path.resolve(this.rootPath, filePath);

    // Create backup if file exists and backup is requested
    if (backup) {
      try {
        await stat(fullPath);
        await this.backupFile(filePath);
      } catch {
        // File doesn't exist, no backup needed
      }
    }

    await writeFile(fullPath, content, 'utf8');
  }

  async backupFile(filePath: string): Promise<void> {
    const sourcePath = path.resolve(this.rootPath, filePath);
    const backupPath = path.resolve(this.backupDir, filePath);

    try {
      await stat(sourcePath);

      // Ensure backup directory exists
      const backupDirPath = path.dirname(backupPath);
      await mkdir(backupDirPath, { recursive: true });

      await copyFile(sourcePath, backupPath);
    } catch {
      // Source file doesn't exist, no backup needed
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = path.resolve(this.rootPath, filePath);
    try {
      await stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = path.resolve(this.rootPath, filePath);
    return readFile(fullPath, 'utf8');
  }

  getTaskDescription(task: MigrationTask): string {
    switch (task.type) {
      case 'create_directory':
        return `📁 Create directory: ${task.target}`;
      case 'create_file':
        return `📄 Create file: ${task.target}`;
      case 'move_file':
        return `📦 Move file: ${task.source} → ${task.target}`;
      case 'update_file':
        return `✏️  Update file: ${task.target}`;
      default:
        return `❓ Unknown task: ${task.type}`;
    }
  }
}