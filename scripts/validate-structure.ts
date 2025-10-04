#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

interface DirectoryStructure {
  name: string;
  type: 'file' | 'directory';
  required: boolean;
  children?: DirectoryStructure[];
  allowedExtensions?: string[];
  pattern?: RegExp;
}

const expectedStructure: DirectoryStructure = {
  name: 'aios-v2',
  type: 'directory',
  required: true,
  children: [
    {
      name: 'shared',
      type: 'directory',
      required: true,
      children: [
        {
          name: 'types',
          type: 'directory',
          required: true,
          children: [
            { name: 'ai.types.ts', type: 'file', required: true },
            { name: 'cloud.types.ts', type: 'file', required: false },
            { name: 'index.ts', type: 'file', required: true }
          ]
        },
        {
          name: 'constants',
          type: 'directory',
          required: true,
          children: [
            { name: 'ai.constants.ts', type: 'file', required: true },
            { name: 'cloud.constants.ts', type: 'file', required: false },
            { name: 'index.ts', type: 'file', required: true }
          ]
        },
        {
          name: 'intelligence',
          type: 'directory',
          required: true,
          children: [
            { name: 'services', type: 'directory', required: true },
            { name: 'providers', type: 'directory', required: true },
            { name: 'file-system', type: 'directory', required: true },
            { name: 'index.ts', type: 'file', required: true }
          ]
        },
        {
          name: 'cloud',
          type: 'directory',
          required: true,
          children: [
            { name: 'providers', type: 'directory', required: true },
            { name: 'deployment.ts', type: 'file', required: false },
            { name: 'index.ts', type: 'file', required: true }
          ]
        },
        {
          name: 'utils',
          type: 'directory',
          required: false,
          allowedExtensions: ['.ts', '.js']
        }
      ]
    },
    {
      name: 'node-cli',
      type: 'directory',
      required: true,
      children: [
        { name: 'commands', type: 'directory', required: true },
        { name: 'handlers', type: 'directory', required: true },
        { name: 'services', type: 'directory', required: true },
        { name: 'cli.ts', type: 'file', required: true },
        { name: 'package.json', type: 'file', required: true },
        { name: 'tsconfig.json', type: 'file', required: true }
      ]
    },
    {
      name: 'scripts',
      type: 'directory',
      required: false,
      allowedExtensions: ['.ts', '.js', '.sh']
    },
    {
      name: 'docs',
      type: 'directory',
      required: false,
      allowedExtensions: ['.md']
    },
    { name: 'package.json', type: 'file', required: true },
    { name: 'tsconfig.json', type: 'file', required: true },
    { name: 'README.md', type: 'file', required: true }
  ]
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class StructureValidator {
  private rootPath: string;
  private result: ValidationResult;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.result = { valid: true, errors: [], warnings: [] };
  }

  validate(): ValidationResult {
    this.validateDirectory(this.rootPath, expectedStructure);
    this.result.valid = this.result.errors.length === 0;
    return this.result;
  }

  private validateDirectory(currentPath: string, structure: DirectoryStructure): void {
    if (!fs.existsSync(currentPath)) {
      if (structure.required) {
        this.result.errors.push(`Required directory missing: ${currentPath}`);
      } else {
        this.result.warnings.push(`Optional directory missing: ${currentPath}`);
      }
      return;
    }

    const stats = fs.statSync(currentPath);
    if (structure.type === 'directory' && !stats.isDirectory()) {
      this.result.errors.push(`Expected directory but found file: ${currentPath}`);
      return;
    }

    if (structure.type === 'file' && !stats.isFile()) {
      this.result.errors.push(`Expected file but found directory: ${currentPath}`);
      return;
    }

    if (structure.type === 'directory' && structure.children) {
      // Validate expected children
      for (const child of structure.children) {
        const childPath = path.join(currentPath, child.name);
        this.validateDirectory(childPath, child);
      }

      // Check for unexpected files/directories
      if (structure.allowedExtensions) {
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
          const itemPath = path.join(currentPath, item);
          const itemStats = fs.statSync(itemPath);

          if (itemStats.isFile()) {
            const ext = path.extname(item);
            if (!structure.allowedExtensions.includes(ext)) {
              this.result.warnings.push(`Unexpected file extension in ${currentPath}: ${item}`);
            }
          }
        }
      }
    }
  }

  private validateNamingConventions(dirPath: string): void {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      if (item.isFile()) {
        // TypeScript files should use kebab-case or camelCase
        if (item.name.endsWith('.ts') || item.name.endsWith('.js')) {
          const nameWithoutExt = path.parse(item.name).name;
          const isValidName = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$|^[a-z][a-zA-Z0-9]*$/.test(nameWithoutExt);

          if (!isValidName) {
            this.result.warnings.push(`File name doesn't follow conventions: ${item.name} in ${dirPath}`);
          }
        }
      } else if (item.isDirectory()) {
        // Directories should use kebab-case
        const isValidDirName = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(item.name);
        if (!isValidDirName && !['node_modules', '.git', '.vscode'].includes(item.name)) {
          this.result.warnings.push(`Directory name doesn't follow kebab-case: ${item.name} in ${dirPath}`);
        }

        // Recursively validate subdirectories
        this.validateNamingConventions(path.join(dirPath, item.name));
      }
    }
  }
}

function main(): void {
  const projectRoot = process.cwd();
  console.log(`Validating project structure at: ${projectRoot}\n`);

  const validator = new StructureValidator(projectRoot);
  const result = validator.validate();

  // Print results
  if (result.valid) {
    console.log('✅ Project structure validation passed!');
  } else {
    console.log('❌ Project structure validation failed!');
  }

  if (result.errors.length > 0) {
    console.log('\n🔴 Errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n🟡 Warnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('🎉 No issues found!');
  }

  // Exit with appropriate code
  process.exit(result.valid ? 0 : 1);
}

// Run if this is the main module
main();

export { StructureValidator, ValidationResult };