/**
 * File utilities - Following SOLID principles
 * SRP: Single responsibility for file operations
 */

import { promises as fs } from 'fs';
import { join, dirname, extname, basename } from 'path';

export interface IFileUtils {
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  ensureDir(path: string): Promise<void>;
  listFiles(dir: string): Promise<string[]>;
  getFileStats(path: string): Promise<FileStats>;
}

export interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  modified: Date;
  created: Date;
}

export class FileUtils implements IFileUtils {
  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(path: string): Promise<string> {
    return fs.readFile(path, 'utf-8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.ensureDir(dirname(path));
    await fs.writeFile(path, content, 'utf-8');
  }

  async deleteFile(path: string): Promise<void> {
    await fs.unlink(path);
  }

  async ensureDir(path: string): Promise<void> {
    try {
      await fs.mkdir(path, { recursive: true });
    } catch (error) {
      // Directory might already exist
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async listFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile())
      .map(entry => join(dir, entry.name));
  }

  async getFileStats(path: string): Promise<FileStats> {
    const stats = await fs.stat(path);
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      modified: stats.mtime,
      created: stats.birthtime,
    };
  }
}

export const fileUtils = new FileUtils();

// Utility functions for common file operations
export const getFileExtension = (filename: string): string => {
  return extname(filename).toLowerCase();
};

export const getBaseName = (filepath: string): string => {
  return basename(filepath, extname(filepath));
};

export const isValidPath = (path: string): boolean => {
  try {
    // Check for invalid characters and patterns
    if (!path || path.includes('..') || path.includes('//')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const sanitizePath = (path: string): string => {
  return path
    .replace(/[<>:"|?*]/g, '')
    .replace(/\.\./g, '')
    .replace(/\/+/g, '/')
    .trim();
};