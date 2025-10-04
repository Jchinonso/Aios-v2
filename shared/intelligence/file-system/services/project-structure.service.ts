/**
 * ProjectStructureAnalyzer - Analyzes project directory structure and organization
 *
 * Extracted from UnifiedAnalyzer God Object (Phase 1 Refactoring)
 *
 * Responsibilities:
 * - Analyze project directory structure
 * - Detect source directories (src/, lib/, app/)
 * - Detect test directories (test/, __tests__/, spec/)
 * - Identify configuration files
 * - Detect project type (monorepo, library, application)
 * - Check for documentation
 *
 * Type Safety: Zero `any` types, strict TypeScript mode
 * Error Handling: Comprehensive try-catch with graceful degradation
 *
 * @author AIOS Team
 * @version 2.0.1
 * @since Phase 1 Refactoring
 */

import path from 'path';
import type { IFileSystemLogger } from '../types/core-interfaces.js';
import type { AnalyzerConfig } from '../../types/config.types.js';
import { LANGUAGE_DEFINITIONS } from '../config/analyzer-config/index.js';

/**
 * Project type classification
 */
export type ProjectType =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'go'
  | 'rust'
  | 'csharp'
  | 'php'
  | 'ruby'
  | 'unknown';

/**
 * Project structure analysis result
 */
export interface ProjectStructureResult {
  readonly type: ProjectType;
  readonly hasTests: boolean;
  readonly hasDocumentation: boolean;
  readonly sourceDirectories: readonly string[];
  readonly testDirectories: readonly string[];
  readonly configFiles: readonly string[];
  readonly manifestFiles: readonly string[];
  readonly lockFiles: readonly string[];
}

/**
 * Directory classification result
 */
export interface DirectoryClassification {
  readonly sourceDirectories: readonly string[];
  readonly testDirectories: readonly string[];
  readonly documentationDirectories: readonly string[];
}

/**
 * Project structure analyzer service
 *
 * Analyzes project directory organization and detects project type.
 * Extracted from UnifiedAnalyzer (lines 610-655, 656-674, 1206-1221).
 */
export class ProjectStructureAnalyzer {
  private readonly logger: IFileSystemLogger | undefined;
  private readonly config: AnalyzerConfig | undefined;

  constructor(config?: AnalyzerConfig, logger?: IFileSystemLogger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Analyze project structure from file list
   *
   * @param projectPath - Path to project root (kept for future use)
   * @param files - List of files in project
   * @returns Project structure analysis result
   */
  async analyzeStructure(
    projectPath: string,
    files: readonly string[]
  ): Promise<ProjectStructureResult> {
    // projectPath parameter reserved for future directory tree analysis
    void projectPath;

    try {
      const filesArray = Array.from(files);

      // Parallel analysis of structure components
      const [
        projectType,
        hasTests,
        hasDocumentation,
        directories,
        configFiles,
        manifestFiles,
        lockFiles
      ] = await Promise.all([
        this.detectProjectType(filesArray),
        this.detectTests(filesArray),
        this.detectDocumentation(filesArray),
        this.classifyDirectories(filesArray),
        this.getConfigFiles(filesArray),
        this.getManifestFiles(filesArray),
        this.getLockFiles(filesArray)
      ]);

      return {
        type: projectType,
        hasTests,
        hasDocumentation,
        sourceDirectories: directories.sourceDirectories,
        testDirectories: directories.testDirectories,
        configFiles,
        manifestFiles,
        lockFiles
      };
    } catch (error) {
      this.logger?.error?.(
        'Failed to analyze project structure',
        error as Error,
        { projectPath, fileCount: files.length }
      );

      // Graceful degradation: return minimal structure
      return {
        type: 'unknown',
        hasTests: false,
        hasDocumentation: false,
        sourceDirectories: [],
        testDirectories: [],
        configFiles: [],
        manifestFiles: [],
        lockFiles: []
      };
    }
  }

  /**
   * Detect project type from manifest files
   *
   * Extracted from UnifiedAnalyzer.detectProjectTypeFromFiles (lines 1206-1221)
   *
   * @param files - List of project files
   * @returns Detected project type
   */
  private async detectProjectType(files: readonly string[]): Promise<ProjectType> {
    try {
      const filesSet = new Set(files);

      // Optimized: Single pass with Set lookup and early exit
      for (const language of LANGUAGE_DEFINITIONS) {
        for (const manifestFile of language.manifestFiles) {
          if (filesSet.has(manifestFile)) {
            return language.name.toLowerCase() as ProjectType;
          }
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger?.warn?.('Failed to detect project type', { error });
      return 'unknown';
    }
  }

  /**
   * Detect if project has tests
   *
   * Extracted from UnifiedAnalyzer.analyzeProjectStructure (lines 628-632)
   *
   * @param files - List of project files
   * @returns True if tests detected
   */
  private async detectTests(files: readonly string[]): Promise<boolean> {
    try {
      const projectPatterns = this.config?.projectPatterns;
      if (!projectPatterns) {
        // Fallback to common test patterns
        const testPatterns = ['test/', 'tests/', '__tests__/', 'spec/', '.spec.', '.test.'];
        return files.some(file => {
          const lowerFile = file.toLowerCase();
          return testPatterns.some(pattern => lowerFile.includes(pattern));
        });
      }

      // Check for test directories and files - single pass
      const testDirs = new Set(projectPatterns.tests.directories);
      return files.some(file => {
        const lowerFile = file.toLowerCase();
        const baseName = path.basename(file).toLowerCase();
        return testDirs.has(lowerFile) || testDirs.has(baseName);
      });
    } catch (error) {
      this.logger?.warn?.('Failed to detect tests', { error });
      return false;
    }
  }

  /**
   * Detect if project has documentation
   *
   * Extracted from UnifiedAnalyzer.analyzeProjectStructure (lines 634-642)
   *
   * @param files - List of project files
   * @returns True if documentation detected
   */
  private async detectDocumentation(files: readonly string[]): Promise<boolean> {
    try {
      const projectPatterns = this.config?.projectPatterns;
      if (!projectPatterns) {
        // Fallback to common documentation patterns
        const docPatterns = ['readme', 'docs/', 'documentation/', '.md'];
        return files.some(file => {
          const lowerFile = file.toLowerCase();
          return docPatterns.some(pattern => lowerFile.includes(pattern));
        });
      }

      // Check for documentation files and directories - single pass
      const docFiles = new Set([
        ...projectPatterns.documentation.files,
        ...projectPatterns.documentation.directories
      ]);

      return files.some(file => {
        const lowerFile = file.toLowerCase();
        return Array.from(docFiles).some(doc => lowerFile.includes(doc));
      });
    } catch (error) {
      this.logger?.warn?.('Failed to detect documentation', { error });
      return false;
    }
  }

  /**
   * Classify directories into source, test, and documentation
   *
   * @param files - List of project files
   * @returns Directory classification
   */
  private async classifyDirectories(files: readonly string[]): Promise<DirectoryClassification> {
    try {
      const projectPatterns = this.config?.projectPatterns;

      // Source directories (no pattern in config, use common defaults)
      const sourcePatterns = new Set(['src', 'lib', 'app', 'source', 'pkg']);

      // Test directories (from config or fallback)
      const testPatterns = new Set(projectPatterns?.tests.directories ?? ['test', 'tests', '__tests__', 'spec']);

      // Documentation directories (from config or fallback)
      const docPatterns = new Set(projectPatterns?.documentation.directories ?? ['docs', 'documentation', 'doc']);

      return this.extractDirectories(files, sourcePatterns, testPatterns, docPatterns);
    } catch (error) {
      this.logger?.warn?.('Failed to classify directories', { error });
      return {
        sourceDirectories: [],
        testDirectories: [],
        documentationDirectories: []
      };
    }
  }

  /**
   * Extract directories from file paths based on patterns
   */
  private extractDirectories(
    files: readonly string[],
    sourcePatterns: Set<string>,
    testPatterns: Set<string>,
    docPatterns: Set<string>
  ): DirectoryClassification {
    const sourceDirs = new Set<string>();
    const testDirs = new Set<string>();
    const docDirs = new Set<string>();

    // Extract unique directories from file paths
    for (const file of files) {
      const dir = path.dirname(file);
      const parts = dir.split(path.sep);

      // Check each directory component
      for (const part of parts) {
        const lowerPart = part.toLowerCase();

        if (sourcePatterns.has(lowerPart)) {
          sourceDirs.add(part);
        }
        if (testPatterns.has(lowerPart)) {
          testDirs.add(part);
        }
        if (docPatterns.has(lowerPart)) {
          docDirs.add(part);
        }
      }
    }

    return {
      sourceDirectories: Array.from(sourceDirs),
      testDirectories: Array.from(testDirs),
      documentationDirectories: Array.from(docDirs)
    };
  }

  /**
   * Get configuration files from project
   *
   * Extracted from UnifiedAnalyzer.getConfigFiles (lines 656-671)
   *
   * @param files - List of project files
   * @returns List of configuration files
   */
  private async getConfigFiles(files: readonly string[]): Promise<readonly string[]> {
    try {
      const configFiles = new Set<string>();
      const filesSet = new Set(files);

      // Optimized: Single pass with Set operations
      for (const language of LANGUAGE_DEFINITIONS) {
        for (const file of language.configFiles) {
          if (filesSet.has(file)) {
            configFiles.add(file);
          }
        }
      }

      return Array.from(configFiles);
    } catch (error) {
      this.logger?.warn?.('Failed to get config files', { error });
      return [];
    }
  }

  /**
   * Get manifest files from project
   *
   * @param files - List of project files
   * @returns List of manifest files
   */
  private async getManifestFiles(files: readonly string[]): Promise<readonly string[]> {
    try {
      const manifestFiles = new Set<string>();
      const filesSet = new Set(files);

      // Optimized: Single pass with Set operations
      for (const language of LANGUAGE_DEFINITIONS) {
        for (const file of language.manifestFiles) {
          if (filesSet.has(file)) {
            manifestFiles.add(file);
          }
        }
      }

      return Array.from(manifestFiles);
    } catch (error) {
      this.logger?.warn?.('Failed to get manifest files', { error });
      return [];
    }
  }

  /**
   * Get lock files from project
   *
   * @param files - List of project files
   * @returns List of lock files
   */
  private async getLockFiles(files: readonly string[]): Promise<readonly string[]> {
    try {
      const lockFiles = new Set<string>();
      const filesSet = new Set(files);

      // Common lock file patterns
      const lockFilePatterns = [
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        'bun.lockb',
        'poetry.lock',
        'Pipfile.lock',
        'Gemfile.lock',
        'composer.lock',
        'Cargo.lock',
        'go.sum'
      ];

      for (const pattern of lockFilePatterns) {
        if (filesSet.has(pattern)) {
          lockFiles.add(pattern);
        }
      }

      return Array.from(lockFiles);
    } catch (error) {
      this.logger?.warn?.('Failed to get lock files', { error });
      return [];
    }
  }

  /**
   * Check if project is a monorepo
   *
   * @param files - List of project files
   * @returns True if monorepo detected
   */
  async isMonorepo(files: readonly string[]): Promise<boolean> {
    try {
      const filesSet = new Set(files);

      // Check for monorepo indicators
      const monorepoFiles = [
        'lerna.json',
        'nx.json',
        'pnpm-workspace.yaml',
        'rush.json',
        'workspace.json'
      ];

      // Check for packages/ or apps/ directory pattern
      const hasPackagesDir = files.some(file =>
        file.startsWith('packages/') || file.startsWith('apps/')
      );

      const hasMonorepoFile = monorepoFiles.some(file => filesSet.has(file));

      return hasPackagesDir || hasMonorepoFile;
    } catch (error) {
      this.logger?.warn?.('Failed to detect monorepo', { error });
      return false;
    }
  }

  /**
   * Get supported project types
   *
   * @returns List of supported project types
   */
  getSupportedTypes(): readonly ProjectType[] {
    return [
      'javascript',
      'typescript',
      'python',
      'java',
      'go',
      'rust',
      'csharp',
      'php',
      'ruby',
      'unknown'
    ];
  }

  /**
   * Check if project type is supported
   *
   * @param type - Project type to check
   * @returns True if supported
   */
  isTypeSupported(type: string): type is ProjectType {
    return this.getSupportedTypes().includes(type as ProjectType);
  }
}
