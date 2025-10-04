/**
 * Unified Package Manager - Language-agnostic package management abstraction
 *
 * Now refactored to use shared services for language detection and file system
 * operations to eliminate redundancy and improve maintainability.
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for package management abstraction
 * - OCP: Open for extension through new package managers
 * - LSP: All package managers are substitutable
 * - ISP: Focused interfaces for different package management concerns
 * - DIP: Depends on abstractions, not concretions
 */

import type {
  IPackageManager,
  UnifiedDependency,
  UnifiedScript,
  PackageValidationResult
} from '../../types/config.types.js';
import { FileSystemService } from '../services/file-system-service.js'
import { getSupportedLanguages } from '../config/analyzer-config/index.js'
import { BUILD_TOOLS, TESTING_FRAMEWORKS, FRAMEWORK_PATTERNS, PACKAGE_MANAGER_PATTERNS } from '../config/analyzer-config/index.js'

/**
 * Base Package Manager - Common functionality for all package managers
 */
abstract class BasePackageManager implements IPackageManager {
  abstract readonly name: string;
  abstract readonly language: string;
  abstract readonly ecosystem: string;

  /**
   * Check if a dependency is a build tool using configuration
   */
  protected isBuildTool(name: string): boolean {
    const languageTools = BUILD_TOOLS[this.language as keyof typeof BUILD_TOOLS];
    if (!languageTools) return false;
    
    return languageTools.some((tool: any) => 
      name.toLowerCase().includes(tool.name.toLowerCase())
    );
  }

  /**
   * Check if a dependency is a testing framework using configuration
   */
  protected isTestingTool(name: string): boolean {
    const languageFrameworks = TESTING_FRAMEWORKS[this.language as keyof typeof TESTING_FRAMEWORKS];
    if (!languageFrameworks) return false;
    
    return languageFrameworks.some((framework: any) => 
      name.toLowerCase().includes(framework.name.toLowerCase())
    );
  }

  /**
   * Check if a dependency is a framework using configuration
   */
  protected isFramework(name: string): boolean {
    const languageFrameworks = FRAMEWORK_PATTERNS.filter((framework: any) => 
      framework.language === this.language
    );
    
    return languageFrameworks.some((framework: any) => 
      name.toLowerCase().includes(framework.name.toLowerCase())
    );
  }

  abstract canHandle(files: string[]): boolean;
  abstract parseDependencies(content: string): Promise<UnifiedDependency[]>;
  abstract parseDevDependencies(content: string): Promise<UnifiedDependency[]>;
  abstract validateManifest(content: string): Promise<PackageValidationResult>;
}

/**
 * NPM Package Manager - JavaScript/TypeScript ecosystem
 */
export class NPMPackageManager extends BasePackageManager {
  readonly name = 'npm';
  readonly language = 'javascript';
  readonly ecosystem = 'node.js';

  canHandle(files: string[]): boolean {
    return files.includes('package.json');
  }

  async parseDependencies(content: string): Promise<UnifiedDependency[]> {
    try {
      const packageJson = JSON.parse(content);
      return this.parseNpmDependencies(packageJson.dependencies || {}, 'runtime');
    } catch (error) {
      throw new Error(`Failed to parse NPM dependencies: ${(error as Error).message}`);
    }
  }

  async parseDevDependencies(content: string): Promise<UnifiedDependency[]> {
    try {
      const packageJson = JSON.parse(content);
      return this.parseNpmDependencies(packageJson.devDependencies || {}, 'development');
    } catch (error) {
      throw new Error(`Failed to parse NPM dev dependencies: ${(error as Error).message}`);
    }
  }

  async parseScripts(content: string): Promise<UnifiedScript[]> {
    try {
      const packageJson = JSON.parse(content);
      const scripts = packageJson.scripts || {};

      return Object.entries(scripts).map(([name, command]) => ({
        name,
        command: command as string,
        category: this.categorizeScript(name, command as string),
        complexity: this.calculateScriptComplexity(command as string),
        tools: this.extractToolsFromScript(command as string)
      }));
    } catch (error) {
      throw new Error(`Failed to parse NPM scripts: ${(error as Error).message}`);
    }
  }

  async validateManifest(content: string): Promise<PackageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      const packageJson = JSON.parse(content);

      // Required fields validation
      if (!packageJson.name) errors.push('Missing required field: name');
      if (!packageJson.version) errors.push('Missing required field: version');

      // Best practices validation
      if (!packageJson.description) warnings.push('Missing description field');
      if (!packageJson.license) warnings.push('Missing license field');
      if (!packageJson.repository) suggestions.push('Consider adding repository field');
      if (!packageJson.keywords) suggestions.push('Consider adding keywords for better discoverability');

      // Version format validation
      if (packageJson.version && !/^\d+\.\d+\.\d+/.test(packageJson.version)) {
        errors.push('Version must follow semver format');
      }

      // Dependencies validation
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      for (const [name, version] of Object.entries(allDeps)) {
        if (typeof version !== 'string') {
          errors.push(`Invalid version type for dependency: ${name}`);
        }
      }

    } catch (error) {
      errors.push(`Invalid JSON format: ${(error as Error).message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      requirements: []
    };
  }

  private parseNpmDependencies(deps: Record<string, string>, type: UnifiedDependency['type']): UnifiedDependency[] {
    return Object.entries(deps).map(([name, version]) => ({
      name,
      version,
      type,
      isFramework: this.isFramework(name),
      isBuildTool: this.isBuildTool(name),
      isTestingTool: this.isTestingTool(name)
    }));
  }


  // Build tool and testing framework detection now handled by BasePackageManager

  private categorizeScript(name: string, command: string): UnifiedScript['category'] {
    const namePattern = name.toLowerCase();
    const commandPattern = command.toLowerCase();

    if (namePattern.includes('build') || commandPattern.includes('build')) return 'build';
    if (namePattern.includes('test') || commandPattern.includes('test')) return 'test';
    if (namePattern.includes('dev') || namePattern.includes('start')) return 'dev';
    if (namePattern.includes('deploy') || namePattern.includes('publish')) return 'deploy';
    if (namePattern.includes('lint') || namePattern.includes('format')) return 'lint';

    return 'other';
  }

  private calculateScriptComplexity(command: string): UnifiedScript['complexity'] {
    const operators = ['&&', '||', '|', '>', '<', ';'];
    const operatorCount = operators.reduce((count, op) => count + (command.split(op).length - 1), 0);

    if (operatorCount === 0) return 'simple';
    if (operatorCount <= 2) return 'medium';
    return 'complex';
  }

  private extractToolsFromScript(command: string): string[] {
    const tools = ['webpack', 'vite', 'rollup', 'babel', 'tsc', 'eslint', 'prettier', 'jest', 'cypress'];
    return tools.filter(tool => command.includes(tool));
  }
}

/**
 * Pip Package Manager - Python ecosystem
 */
export class PipPackageManager extends BasePackageManager {
  readonly name = 'pip';
  readonly language = 'python';
  readonly ecosystem = 'python';

  canHandle(files: string[]): boolean {
    return files.some(f => f.includes('requirements.txt') || f.includes('pyproject.toml'));
  }

  async parseDependencies(content: string): Promise<UnifiedDependency[]> {
    // Handle requirements.txt format
    if (content.includes('==') || content.includes('>=')) {
      return this.parseRequirementsTxt(content);
    }

    // Handle pyproject.toml format (simplified)
    if (content.includes('[tool.poetry.dependencies]')) {
      return this.parsePyprojectToml(content);
    }

    throw new Error('Unsupported Python dependency format');
  }

  async parseDevDependencies(content: string): Promise<UnifiedDependency[]> {
    // For requirements.txt, dev dependencies are typically in separate files
    // Content parameter is required by interface but not used for this implementation
    void content; // Suppress unused parameter warning
    return [];
  }

  async validateManifest(content: string): Promise<PackageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation for requirements.txt
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    for (const line of lines) {
      if (!line.match(/^[a-zA-Z0-9_-]+([<>=!].*)?$/)) {
        errors.push(`Invalid dependency format: ${line}`);
      }
    }

    if (lines.length === 0) {
      warnings.push('No dependencies found');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      requirements: []
    };
  }

  private parseRequirementsTxt(content: string): UnifiedDependency[] {
    const dependencies: UnifiedDependency[] = [];
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+)(?:[<>=!]+([^#\s]+))?/);
      if (match) {
        const [, name, version] = match;
        if (name) {
          dependencies.push({
            name: name.trim(),
            version: version?.trim() || 'unknown',
            type: 'runtime',
            isFramework: this.isFramework(name),
            isBuildTool: this.isBuildTool(name),
            isTestingTool: this.isTestingTool(name)
          });
        }
      }
    }

    return dependencies;
  }

  private parsePyprojectToml(content: string): UnifiedDependency[] {
    // Simplified TOML parsing for dependencies
    const dependencies: UnifiedDependency[] = [];

    const dependenciesMatch = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\[|\z)/);
    if (dependenciesMatch) {
      const depsSection = dependenciesMatch[1];
      if (!depsSection) return dependencies;
      const lines = depsSection.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      for (const line of lines) {
        const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/);
        if (match) {
          const [, name, version] = match;
          if (name && name !== 'python') {
            dependencies.push({
              name: name.trim(),
              version: version?.trim() || 'unknown',
              type: 'runtime',
              isFramework: this.isFramework(name),
              isBuildTool: this.isBuildTool(name),
              isTestingTool: this.isTestingTool(name)
            });
          }
        }
      }
    }

    return dependencies;
  }


  // Build tool and testing framework detection now handled by BasePackageManager
}

/**
 * Maven Package Manager - Java ecosystem
 */
export class MavenPackageManager extends BasePackageManager {
  readonly name = 'maven';
  readonly language = 'java';
  readonly ecosystem = 'jvm';

  canHandle(files: string[]): boolean {
    return files.includes('pom.xml');
  }

  async parseDependencies(content: string): Promise<UnifiedDependency[]> {
    return this.parsePomDependencies(content, false);
  }

  async parseDevDependencies(content: string): Promise<UnifiedDependency[]> {
    return this.parsePomDependencies(content, true);
  }

  async validateManifest(content: string): Promise<PackageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Basic XML validation (simplified)
      if (!content.includes('<project>') || !content.includes('</project>')) {
        errors.push('Invalid Maven POM structure');
      }

      if (!content.includes('<groupId>')) {
        errors.push('Missing required groupId');
      }

      if (!content.includes('<artifactId>')) {
        errors.push('Missing required artifactId');
      }

      if (!content.includes('<version>')) {
        errors.push('Missing required version');
      }

      if (!content.includes('<dependencies>')) {
        warnings.push('No dependencies section found');
      }

    } catch (error) {
      errors.push(`POM validation failed: ${(error as Error).message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      requirements: []
    };
  }

  private parsePomDependencies(content: string, testOnly: boolean): UnifiedDependency[] {
    const dependencies: UnifiedDependency[] = [];

    // Simple XML parsing for dependencies
    const dependenciesMatch = content.match(/<dependencies>([\s\S]*?)<\/dependencies>/);
    if (!dependenciesMatch) return dependencies;

    const dependenciesSection = dependenciesMatch[1];
    if (!dependenciesSection) return dependencies;
    const dependencyMatches = dependenciesSection.match(/<dependency>([\s\S]*?)<\/dependency>/g);

    if (dependencyMatches) {
      for (const depMatch of dependencyMatches) {
        const groupIdMatch = depMatch.match(/<groupId>([^<]+)<\/groupId>/);
        const artifactIdMatch = depMatch.match(/<artifactId>([^<]+)<\/artifactId>/);
        const versionMatch = depMatch.match(/<version>([^<]+)<\/version>/);
        const scopeMatch = depMatch.match(/<scope>([^<]+)<\/scope>/);

        if (groupIdMatch && artifactIdMatch) {
          const scope = scopeMatch?.[1] || 'compile';
          const isTestDependency = scope === 'test';

          if (testOnly === isTestDependency) {
            const name = `${groupIdMatch[1]}:${artifactIdMatch[1]}`;
            dependencies.push({
              name,
              version: versionMatch?.[1] || 'unknown',
              type: isTestDependency ? 'development' : 'runtime',
              scope: groupIdMatch[1] || 'unknown',
              isFramework: this.isFramework(name),
              isBuildTool: this.isBuildTool(name),
              isTestingTool: this.isTestingTool(name)
            });
          }
        }
      }
    }

    return dependencies;
  }


  // Build tool and testing framework detection now handled by BasePackageManager
}

/**
 * Go Modules Package Manager - Go ecosystem
 */
export class GoModulesPackageManager extends BasePackageManager {
  readonly name = 'go-modules';
  readonly language = 'go';
  readonly ecosystem = 'go';

  canHandle(files: string[]): boolean {
    return files.includes('go.mod');
  }

  async parseDependencies(content: string): Promise<UnifiedDependency[]> {
    const dependencies: UnifiedDependency[] = [];
    const lines = content.split('\n');
    let inRequireBlock = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('require (')) {
        inRequireBlock = true;
        continue;
      }

      if (inRequireBlock && trimmed === ')') {
        inRequireBlock = false;
        continue;
      }

      if (trimmed.startsWith('require ') || inRequireBlock) {
        const match = trimmed.match(/([^\s]+)\s+v?([^\s]+)(?:\s+\/\/\s*(.+))?/);
        if (match) {
          const [, name, version, comment] = match;
          if (name && version && !comment?.includes('indirect')) {
            dependencies.push({
              name: name.trim(),
              version: version.trim() || 'unknown',
              type: 'runtime',
              isFramework: this.isFramework(name),
              isBuildTool: this.isBuildTool(name),
              isTestingTool: this.isTestingTool(name)
            });
          }
        }
      }
    }

    return dependencies;
  }

  async parseDevDependencies(content: string): Promise<UnifiedDependency[]> {
    // In Go, dev dependencies are typically tools or test dependencies
    const dependencies: UnifiedDependency[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('// indirect') || this.isTestingTool(trimmed)) {
        const match = trimmed.match(/([^\s]+)\s+v?([^\s]+)/);
        if (match) {
          const [, name, version] = match;
          dependencies.push({
            name: name?.trim() || 'unknown',
            version: version?.trim() || 'unknown',
            type: 'development',
            isFramework: false,
            isBuildTool: this.isBuildTool(name || ''),
            isTestingTool: this.isTestingTool(name || '')
          });
        }
      }
    }

    return dependencies;
  }

  async validateManifest(content: string): Promise<PackageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!content.includes('module ')) {
      errors.push('Missing module declaration');
    }

    if (!content.includes('go ')) {
      warnings.push('Missing Go version specification');
    }

    const moduleMatch = content.match(/module\s+([^\s\n]+)/);
    if (moduleMatch && moduleMatch[1] && !moduleMatch[1].includes('.')) {
      warnings.push('Module name should follow domain/path convention');
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, requirements: [] };
  }


  // Build tool and testing framework detection now handled by BasePackageManager

}

/**
 * Cargo Package Manager - Rust ecosystem
 */
export class CargoPackageManager extends BasePackageManager {
  readonly name = 'cargo';
  readonly language = 'rust';
  readonly ecosystem = 'rust';

  canHandle(files: string[]): boolean {
    return files.includes('Cargo.toml');
  }

  async parseDependencies(content: string): Promise<UnifiedDependency[]> {
    const dependencies: UnifiedDependency[] = [];
    const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(?=\[|\z)/);

    if (depsMatch) {
      const depsSection = depsMatch[1];
      if (!depsSection) return dependencies;
      const lines = depsSection.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      for (const line of lines) {
        const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.+)/);
        if (match) {
          const [, name, versionSpec] = match;
          if (name && versionSpec) {
            const version = this.parseCargoVersion(versionSpec);
            dependencies.push({
              name: name.trim(),
              version: version,
              type: 'runtime',
              isFramework: this.isFramework(name),
              isBuildTool: this.isBuildTool(name),
              isTestingTool: this.isTestingTool(name)
            });
          }
        }
      }
    }

    return dependencies;
  }

  async parseDevDependencies(content: string): Promise<UnifiedDependency[]> {
    const dependencies: UnifiedDependency[] = [];
    const devDepsMatch = content.match(/\[dev-dependencies\]([\s\S]*?)(?=\[|\z)/);

    if (devDepsMatch) {
      const depsSection = devDepsMatch[1];
      if (!depsSection) return dependencies;
      const lines = depsSection.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      for (const line of lines) {
        const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.+)/);
        if (match) {
          const [, name, versionSpec] = match;
          if (name && versionSpec) {
            const version = this.parseCargoVersion(versionSpec);
            dependencies.push({
              name: name.trim(),
              version: version,
              type: 'development',
              isFramework: this.isFramework(name),
              isBuildTool: this.isBuildTool(name),
              isTestingTool: this.isTestingTool(name)
            });
          }
        }
      }
    }

    return dependencies;
  }

  async validateManifest(content: string): Promise<PackageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!content.includes('[package]')) {
      errors.push('Missing [package] section');
    }

    if (!content.includes('name =')) {
      errors.push('Missing package name');
    }

    if (!content.includes('version =')) {
      errors.push('Missing package version');
    }

    if (!content.includes('edition =')) {
      warnings.push('Missing Rust edition specification');
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, requirements: [] };
  }

  private parseCargoVersion(versionSpec: string): string {
    // Handle various Cargo version formats
    const cleaned = versionSpec.replace(/['"]/g, '').trim();
    if (cleaned.startsWith('{')) {
    const versionMatch = cleaned.match(/version\s*=\s*["']([^"']+)["']/);
    return versionMatch?.[1] || cleaned;
    }
    return cleaned;
  }


  // Build tool and testing framework detection now handled by BasePackageManager

}

/**
 * Composer Package Manager - PHP ecosystem
 */
export class ComposerPackageManager extends BasePackageManager {
  readonly name = 'composer';
  readonly language = 'php';
  readonly ecosystem = 'php';

  canHandle(files: string[]): boolean {
    return files.includes('composer.json');
  }

  async parseDependencies(content: string): Promise<UnifiedDependency[]> {
    try {
      const composer = JSON.parse(content);
      return this.parseComposerDeps(composer.require || {}, 'runtime');
    } catch (error) {
      throw new Error(`Failed to parse Composer dependencies: ${(error as Error).message}`);
    }
  }

  async parseDevDependencies(content: string): Promise<UnifiedDependency[]> {
    try {
      const composer = JSON.parse(content);
      return this.parseComposerDeps(composer['require-dev'] || {}, 'development');
    } catch (error) {
      throw new Error(`Failed to parse Composer dev dependencies: ${(error as Error).message}`);
    }
  }

  async validateManifest(content: string): Promise<PackageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      const composer = JSON.parse(content);

      if (!composer.name) warnings.push('Missing package name');
      if (!composer.description) warnings.push('Missing description');
      if (!composer.license) warnings.push('Missing license');
      if (!composer.type) suggestions.push('Consider specifying package type');

    } catch (error) {
      errors.push(`Invalid JSON format: ${(error as Error).message}`);
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, requirements: [] };
  }

  private parseComposerDeps(deps: Record<string, string>, type: UnifiedDependency['type']): UnifiedDependency[] {
    return Object.entries(deps)
      .filter(([name]) => name !== 'php')
      .map(([name, version]) => ({
        name,
        version,
        type,
        isFramework: this.isFramework(name),
        isBuildTool: this.isBuildTool(name),
        isTestingTool: this.isTestingTool(name)
      }));
  }


  // Build tool and testing framework detection now handled by BasePackageManager

}

/**
 * Bundler Package Manager - Ruby ecosystem
 */
export class BundlerPackageManager extends BasePackageManager {
  readonly name = 'bundler';
  readonly language = 'ruby';
  readonly ecosystem = 'ruby';

  canHandle(files: string[]): boolean {
    return files.includes('Gemfile');
  }

  async parseDependencies(content: string): Promise<UnifiedDependency[]> {
    const dependencies: UnifiedDependency[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      const gemMatch = trimmed.match(/gem\s+['"`]([^'"`]+)['"`](?:\s*,\s*['"`]([^'"`]+)['"`])?/);

      if (gemMatch && !this.isInGroup(line, ['development', 'test'])) {
        const [, name, version] = gemMatch;
        dependencies.push({
          name: name || 'unknown',
          version: version || 'latest',
          type: 'runtime',
          isFramework: this.isFramework(name || ''),
          isBuildTool: this.isBuildTool(name || ''),
          isTestingTool: this.isTestingTool(name || '')
        });
      }
    }

    return dependencies;
  }

  async parseDevDependencies(content: string): Promise<UnifiedDependency[]> {
    const dependencies: UnifiedDependency[] = [];
    const lines = content.split('\n');
    let inDevGroup = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.includes('group :development') || trimmed.includes('group :test')) {
        inDevGroup = true;
        continue;
      }

      if (trimmed === 'end' && inDevGroup) {
        inDevGroup = false;
        continue;
      }

      if (inDevGroup) {
        const gemMatch = trimmed.match(/gem\s+['"`]([^'"`]+)['"`](?:\s*,\s*['"`]([^'"`]+)['"`])?/);
        if (gemMatch) {
          const [, name, version] = gemMatch;
          dependencies.push({
            name: name || 'unknown',
            version: version || 'latest',
            type: 'development',
            isFramework: this.isFramework(name || ''),
            isBuildTool: this.isBuildTool(name || ''),
            isTestingTool: this.isTestingTool(name || '')
          });
        }
      }
    }

    return dependencies;
  }

  async validateManifest(content: string): Promise<PackageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!content.includes('source ')) {
      warnings.push('Missing gem source specification');
    }

    if (!content.includes('ruby ')) {
      warnings.push('Missing Ruby version specification');
    }

    const gemLines = content.split('\n').filter(line => line.trim().startsWith('gem '));
    if (gemLines.length === 0) {
      warnings.push('No gems specified');
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, requirements: [] };
  }

  private isInGroup(line: string, groups: string[]): boolean {
    return groups.some(group => line.includes(`:${group}`));
  }


  // Build tool and testing framework detection now handled by BasePackageManager

}

/**
 * NuGet Package Manager - .NET ecosystem
 */
export class NuGetPackageManager extends BasePackageManager {
  readonly name = 'nuget';
  readonly language = 'csharp';
  readonly ecosystem = 'dotnet';

  canHandle(files: string[]): boolean {
    return files.some(f => f.endsWith('.csproj') || f.endsWith('.vbproj') || f.endsWith('.fsproj'));
  }

  async parseDependencies(content: string): Promise<UnifiedDependency[]> {
    const dependencies: UnifiedDependency[] = [];
    const packageRefs = content.match(/<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"\s*\/?>/g);

    if (packageRefs) {
      for (const ref of packageRefs) {
        const match = ref.match(/Include="([^"]+)"\s+Version="([^"]+)"/);
        if (match) {
          const [, name, version] = match;
          dependencies.push({
            name: name || 'unknown',
            version: version || 'unknown',
            type: 'runtime',
            isFramework: this.isFramework(name || ''),
            isBuildTool: this.isBuildTool(name || ''),
            isTestingTool: this.isTestingTool(name || '')
          });
        }
      }
    }

    return dependencies;
  }

  async parseDevDependencies(content: string): Promise<UnifiedDependency[]> {
    // Development dependencies in .NET are typically testing tools
    const dependencies: UnifiedDependency[] = [];
    const packageRefs = content.match(/<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"\s*\/?>/g);

    if (packageRefs) {
      for (const ref of packageRefs) {
        const match = ref.match(/Include="([^"]+)"\s+Version="([^"]+)"/);
        if (match) {
          const [, name, version] = match;
          if (name && this.isTestingTool(name)) {
            dependencies.push({
              name: name || 'unknown',
              version: version || 'unknown',
              type: 'development',
              isFramework: false,
              isBuildTool: this.isBuildTool(name || ''),
              isTestingTool: true
            });
          }
        }
      }
    }

    return dependencies;
  }

  async validateManifest(content: string): Promise<PackageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!content.includes('<Project Sdk=')) {
      warnings.push('Consider using SDK-style project format');
    }

    if (!content.includes('<TargetFramework>')) {
      errors.push('Missing target framework specification');
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions, requirements: [] };
  }


  // Build tool and testing framework detection now handled by BasePackageManager

}

/**
 * Package Manager Factory - Creates appropriate package managers
 * Now enhanced with language-aware detection using shared services
 */
export class PackageManagerFactory {
  private static managers: IPackageManager[] = [
    new NPMPackageManager(),
    new PipPackageManager(),
    new MavenPackageManager(),
    new GoModulesPackageManager(),
    new CargoPackageManager(),
    new ComposerPackageManager(),
    new BundlerPackageManager(),
    new NuGetPackageManager()
  ];

  static detectPackageManager(files: string[]): IPackageManager | null {
    return this.managers.find(manager => manager.canHandle(files)) || null;
  }

  /**
   * Detect package manager by language using configuration-driven detection
   */
  static detectPackageManagerByLanguage(language: string): IPackageManager | null {
    // Find the primary package manager for the language from configuration
    const languagePatterns = PACKAGE_MANAGER_PATTERNS.filter((pattern: any) => 
      pattern.language === language
    );
    
    if (languagePatterns.length === 0) return null;
    
    // Get the first (primary) package manager for the language
    const primaryPattern = languagePatterns[0];
    if (!primaryPattern) return null;
    
    return this.getPackageManagerByName(primaryPattern.name);
  }

  /**
   * Get package manager for a project path using shared language detection service
   */
  static async detectPackageManagerForProject(projectPath: string): Promise<IPackageManager | null> {
    // Use FileSystemService for file detection
    const files = await FileSystemService.getProjectFiles(projectPath);
    
    const fileBasedManager = this.detectPackageManager(files);
    if (fileBasedManager) return fileBasedManager;

    // Fallback to language-based detection using FileSystemService
    const extensions = files.map(f => f.split('.').pop()?.toLowerCase()).filter(Boolean);
    const languageCounts = new Map<string, number>();
    
    for (const ext of extensions) {
      const supportedLanguages = getSupportedLanguages();
      for (const lang of supportedLanguages) {
        if (ext === lang.substring(0, 2)) { // Simple extension matching
          languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
        }
      }
    }
    
    const [primaryLanguage] = Array.from(languageCounts.entries())
      .reduce((max, [lang, count]) => count > max[1] ? [lang, count] : max, ['javascript', 0]);
    
    return this.detectPackageManagerByLanguage(primaryLanguage);
  }

  static getAllPackageManagers(): IPackageManager[] {
    return [...this.managers];
  }

  static getPackageManagerByName(name: string): IPackageManager | null {
    return this.managers.find(manager => manager.name === name) || null;
  }

  static registerPackageManager(manager: IPackageManager): void {
    this.managers.push(manager);
  }

  /**
   * Get supported languages for package managers (delegated to configuration system)
   */
  static getSupportedLanguages(): string[] {
    return getSupportedLanguages();
  }

  /**
   * Check if a language is supported by any package manager (delegated to configuration system)
   */
  static isLanguageSupported(language: string): boolean {
    return getSupportedLanguages().includes(language);
  }
}