/**
 * File Scanner Service - SRP Focused
 *
 * Single Responsibility: Scan and filter files for style validation
 */

import { glob } from 'glob';

export interface FileScanOptions {
  pattern?: string;
  ignorePatterns?: string[];
  extensions?: string[];
  maxFiles?: number;
}

export interface ScannedFile {
  path: string;
  relativePath: string;
  extension: string;
  size: number;
}

export class FileScannerService {
  private readonly DEFAULT_IGNORE_PATTERNS = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.d.ts',
    '**/coverage/**',
    '**/.git/**'
  ];

  private readonly DEFAULT_EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx'];

  async scanFiles(options: FileScanOptions = {}): Promise<ScannedFile[]> {
    const {
      pattern = '**/*.{ts,js,tsx,jsx}',
      ignorePatterns = this.DEFAULT_IGNORE_PATTERNS,
      extensions = this.DEFAULT_EXTENSIONS,
      maxFiles = 10000
    } = options;

    try {
      const files = await glob(pattern, {
        ignore: ignorePatterns,
        cwd: process.cwd(),
        absolute: true
      });

      // Filter by extensions and convert to ScannedFile objects
      const scannedFiles: ScannedFile[] = [];

      for (const file of files.slice(0, maxFiles)) {
        const extension = this.getFileExtension(file);

        if (extensions.includes(extension)) {
          const stats = await this.getFileStats(file);

          scannedFiles.push({
            path: file,
            relativePath: this.getRelativePath(file),
            extension,
            size: stats.size
          });
        }
      }

      return scannedFiles;
    } catch (error) {
      console.error('Error scanning files:', error);
      return [];
    }
  }

  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot === -1 ? '' : filePath.substring(lastDot);
  }

  private getRelativePath(filePath: string): string {
    const cwd = process.cwd();
    return filePath.startsWith(cwd)
      ? filePath.substring(cwd.length + 1)
      : filePath;
  }

  private async getFileStats(filePath: string): Promise<{ size: number }> {
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(filePath);
      return { size: stats.size };
    } catch {
      return { size: 0 };
    }
  }

  validateFileExtension(filePath: string): boolean {
    const extension = this.getFileExtension(filePath);
    return this.DEFAULT_EXTENSIONS.includes(extension);
  }

  shouldIgnoreFile(filePath: string): boolean {
    const relativePath = this.getRelativePath(filePath);

    return this.DEFAULT_IGNORE_PATTERNS.some(pattern => {
      // Simple pattern matching - convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\//g, '\\/');

      const regex = new RegExp(regexPattern);
      return regex.test(relativePath);
    });
  }
}