/**
 * BuildConfigurationService - Detects build, test, and deployment configuration
 *
 * Extracted from UnifiedAnalyzer God Object (Phase 1 Refactoring)
 *
 * Responsibilities:
 * - Detect build command from package.json scripts
 * - Detect output directory based on framework
 * - Detect test command and configuration
 * - Detect Docker configuration
 * - Detect CI/CD configuration
 * - Parse environment variables from .env files
 * - Detect database usage (moved from UnifiedAnalyzer)
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
import { FileSystemService } from './file-system-service.js';

/**
 * Build configuration result
 */
export interface BuildConfigurationResult {
  readonly buildCommand?: string;
  readonly outputDirectory?: string;
}

/**
 * Test configuration result
 */
export interface TestConfigurationResult {
  readonly hasTests: boolean;
  readonly testCommand?: string;
}

/**
 * Docker configuration result
 */
export interface DockerConfigurationResult {
  readonly hasDockerfile: boolean;
  readonly dockerfiles?: readonly string[];
}

/**
 * CI/CD configuration result
 */
export interface CIConfigurationResult {
  readonly hasCI: boolean;
  readonly ciFiles?: readonly string[];
}

/**
 * Environment variable
 */
export interface EnvironmentVariable {
  readonly key: string;
  readonly value?: string;
  readonly isSecret: boolean;
  readonly isRequired: boolean;
  readonly description?: string;
}

/**
 * Database configuration result
 */
export interface DatabaseConfigurationResult {
  readonly hasDatabase: boolean;
  readonly databaseType?: string;
  readonly databases?: readonly string[];
}

/**
 * Complete build and deployment configuration
 */
export interface CompleteConfiguration {
  readonly build: BuildConfigurationResult;
  readonly test: TestConfigurationResult;
  readonly docker: DockerConfigurationResult;
  readonly ci: CIConfigurationResult;
  readonly database: DatabaseConfigurationResult;
  readonly environmentVariables: readonly EnvironmentVariable[];
}

/**
 * Build configuration service
 *
 * Detects build tools, test frameworks, Docker, CI/CD, and environment configuration.
 * Extracted from UnifiedAnalyzer (lines 675-995).
 */
export class BuildConfigurationService {
  private readonly logger: IFileSystemLogger | undefined;
  private readonly config: AnalyzerConfig | undefined;

  constructor(config?: AnalyzerConfig, logger?: IFileSystemLogger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Detect complete build and deployment configuration
   *
   * @param projectPath - Path to project root
   * @param framework - Detected framework (for output directory defaults)
   * @param dependencies - Project dependencies (for test detection)
   * @returns Complete configuration
   */
  async detectCompleteConfiguration(
    projectPath: string,
    framework: string,
    dependencies: Array<{ readonly isTestingTool: boolean }>
  ): Promise<CompleteConfiguration> {
    try {
      const packageJson = await this.getPackageJson(projectPath);

      const [build, test, docker, ci, database, environmentVariables] = await Promise.all([
        this.detectBuildConfiguration(projectPath, framework),
        this.detectTestConfiguration(projectPath, dependencies),
        this.detectDockerConfiguration(projectPath),
        this.detectCIConfiguration(projectPath),
        this.detectDatabaseUsage(projectPath, packageJson),
        this.detectEnvironmentVariables(projectPath)
      ]);

      return {
        build,
        test,
        docker,
        ci,
        database,
        environmentVariables
      };
    } catch (error) {
      this.logger?.error?.(
        'Failed to detect complete configuration',
        error as Error,
        { projectPath }
      );

      // Graceful degradation
      return {
        build: {},
        test: { hasTests: false },
        docker: { hasDockerfile: false },
        ci: { hasCI: false },
        database: { hasDatabase: false },
        environmentVariables: []
      };
    }
  }

  /**
   * Detect build configuration
   *
   * Extracted from UnifiedAnalyzer.detectBuildConfiguration (lines 675-699)
   *
   * @param projectPath - Path to project root
   * @param framework - Detected framework
   * @returns Build configuration
   */
  async detectBuildConfiguration(
    projectPath: string,
    framework: string
  ): Promise<BuildConfigurationResult> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await FileSystemService.fileExists(packageJsonPath)) {
        const content = await FileSystemService.readFileContent(packageJsonPath);
        const packageJson = JSON.parse(content);

        const buildCommand = packageJson.scripts?.build;
        const outputDirectory = this.getDefaultOutputDirectory(framework);

        return {
          ...(buildCommand && { buildCommand }),
          ...(outputDirectory && { outputDirectory })
        };
      }

      return {};
    } catch (error) {
      this.logger?.warn?.('Failed to detect build configuration', { error });
      return {};
    }
  }

  /**
   * Get default output directory for framework
   *
   * Extracted from UnifiedAnalyzer.getDefaultOutputDirectory (lines 701-723)
   *
   * @param framework - Framework name
   * @returns Default output directory
   */
  private getDefaultOutputDirectory(framework: string): string | undefined {
    try {
      // Use configuration-driven output directory detection
      if (this.config?.languages?.frameworkPatterns) {
        for (const frameworkPattern of this.config.languages.frameworkPatterns) {
          if (frameworkPattern.name.toLowerCase() === framework.toLowerCase()) {
            // Try to extract output directory from framework patterns
            const outputPatterns = frameworkPattern.patterns.filter(p =>
              p.includes('dist') || p.includes('build') || p.includes('out')
            );
            if (outputPatterns.length > 0) {
              const pattern = outputPatterns[0];
              if (pattern) {
                return pattern.includes('dist') ? 'dist' :
                       pattern.includes('build') ? 'build' : 'out';
              }
            }
          }
        }
      }

      // Fallback defaults by framework
      const frameworkDefaults: Record<string, string> = {
        'next.js': '.next',
        'nextjs': '.next',
        'nuxt': '.nuxt',
        'gatsby': 'public',
        'react': 'build',
        'vue': 'dist',
        'angular': 'dist',
        'svelte': 'public',
        'vite': 'dist'
      };

      return frameworkDefaults[framework.toLowerCase()] ?? 'dist';
    } catch (error) {
      this.logger?.warn?.('Failed to get default output directory', { error });
      return 'dist';
    }
  }

  /**
   * Detect test configuration
   *
   * Extracted from UnifiedAnalyzer.detectTestConfiguration (lines 726-752)
   *
   * @param projectPath - Path to project root
   * @param dependencies - Project dependencies
   * @returns Test configuration
   */
  async detectTestConfiguration(
    projectPath: string,
    dependencies: Array<{ readonly isTestingTool: boolean }>
  ): Promise<TestConfigurationResult> {
    try {
      const hasTestDeps = dependencies.some(dep => dep.isTestingTool);

      if (!hasTestDeps) {
        return { hasTests: false };
      }

      // Check package.json for test script
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await FileSystemService.fileExists(packageJsonPath)) {
        const content = await FileSystemService.readFileContent(packageJsonPath);
        const packageJson = JSON.parse(content);
        const testCommand = packageJson.scripts?.test;

        return { hasTests: true, testCommand };
      }

      return { hasTests: true };
    } catch (error) {
      this.logger?.warn?.('Failed to detect test configuration', { error });
      return { hasTests: false };
    }
  }

  /**
   * Detect Docker configuration
   *
   * Extracted from UnifiedAnalyzer.detectDockerConfiguration (lines 924-938)
   *
   * @param projectPath - Path to project root
   * @returns Docker configuration
   */
  async detectDockerConfiguration(projectPath: string): Promise<DockerConfigurationResult> {
    try {
      const dockerPatterns = this.config?.projectPatterns?.docker;
      const foundDockerfiles: string[] = [];

      if (dockerPatterns) {
        for (const dockerFile of dockerPatterns.files) {
          const filePath = path.join(projectPath, dockerFile);
          if (await FileSystemService.fileExists(filePath)) {
            foundDockerfiles.push(dockerFile);
          }
        }
      }

      return {
        hasDockerfile: foundDockerfiles.length > 0,
        ...(foundDockerfiles.length > 0 && { dockerfiles: foundDockerfiles })
      };
    } catch (error) {
      this.logger?.warn?.('Failed to detect Docker configuration', { error });
      return { hasDockerfile: false };
    }
  }

  /**
   * Detect CI/CD configuration
   *
   * Extracted from UnifiedAnalyzer.detectCIConfiguration (lines 940-963)
   *
   * @param projectPath - Path to project root
   * @returns CI/CD configuration
   */
  async detectCIConfiguration(projectPath: string): Promise<CIConfigurationResult> {
    try {
      const ciCdPatterns = this.config?.projectPatterns?.ciCd;
      const foundCIFiles: string[] = [];

      if (ciCdPatterns) {
        for (const ciFile of ciCdPatterns.files) {
          // Handle wildcard patterns
          if (ciFile.includes('*')) {
            // For wildcard patterns, check if the directory exists
            const dirPath = ciFile.substring(0, ciFile.indexOf('*'));
            const fullDirPath = path.join(projectPath, dirPath);
            if (await FileSystemService.fileExists(fullDirPath)) {
              foundCIFiles.push(ciFile);
            }
          } else {
            const filePath = path.join(projectPath, ciFile);
            if (await FileSystemService.fileExists(filePath)) {
              foundCIFiles.push(ciFile);
            }
          }
        }
      }

      return {
        hasCI: foundCIFiles.length > 0,
        ...(foundCIFiles.length > 0 && { ciFiles: foundCIFiles })
      };
    } catch (error) {
      this.logger?.warn?.('Failed to detect CI configuration', { error });
      return { hasCI: false };
    }
  }

  /**
   * Detect environment variables
   *
   * Extracted from UnifiedAnalyzer.detectEnvironmentVariables (lines 965-991)
   *
   * @param projectPath - Path to project root
   * @returns List of environment variables
   */
  async detectEnvironmentVariables(projectPath: string): Promise<readonly EnvironmentVariable[]> {
    try {
      const envPatterns = this.config?.projectPatterns?.environment;

      if (envPatterns) {
        for (const file of envPatterns.files) {
          const envPath = path.join(projectPath, file);
          if (await FileSystemService.fileExists(envPath)) {
            return await this.parseEnvFile(envPath);
          }
        }
      }

      return [];
    } catch (error) {
      this.logger?.warn?.('Failed to detect environment variables', { error });
      return [];
    }
  }

  /**
   * Detect database usage
   *
   * Extracted from UnifiedAnalyzer.detectDatabaseUsage (lines 767-917)
   *
   * Strategy:
   * 1. Check package.json dependencies for database drivers
   * 2. Check for database config files
   * 3. Scan environment variables for database URLs
   * 4. Check Python requirements.txt for database packages
   *
   * @param projectPath - Path to project root
   * @param packageJson - Parsed package.json (if available)
   * @returns Database detection result
   */
  async detectDatabaseUsage(
    projectPath: string,
    packageJson: Record<string, unknown> | null
  ): Promise<DatabaseConfigurationResult> {
    try {
      const detectedDatabases: string[] = [];

      // Database driver patterns by language
      const databasePatterns: Record<string, readonly string[]> = {
        postgresql: ['pg', 'postgres', 'sequelize', 'typeorm', 'prisma', 'knex', 'psycopg2', 'psycopg', 'asyncpg'],
        mysql: ['mysql', 'mysql2', 'sequelize', 'typeorm', 'prisma', 'knex', 'pymysql', 'mysql-connector', 'aiomysql'],
        mongodb: ['mongodb', 'mongoose', '@nestjs/mongoose', 'monk', 'pymongo', 'motor'],
        redis: ['redis', 'ioredis', '@redis/client', 'connect-redis', 'redis-py', 'aioredis'],
        sqlite: ['sqlite3', 'better-sqlite3', 'sqlite', 'pysqlite3'],
        // Java patterns
        postgresql_java: ['postgresql', 'org.postgresql'],
        mysql_java: ['mysql-connector-java', 'com.mysql'],
        // Go patterns
        postgresql_go: ['github.com/lib/pq', 'github.com/jackc/pgx'],
        mysql_go: ['github.com/go-sql-driver/mysql'],
        // Rust patterns
        postgresql_rust: ['tokio-postgres', 'sqlx'],
        mysql_rust: ['mysql', 'sqlx']
      };

      // Check package.json dependencies (JavaScript/TypeScript)
      if (packageJson) {
        const allDeps = {
          ...(packageJson['dependencies'] as Record<string, string> ?? {}),
          ...(packageJson['devDependencies'] as Record<string, string> ?? {})
        };

        for (const [dbType, patterns] of Object.entries(databasePatterns)) {
          const cleanDbType = dbType.replace('_java', '').replace('_go', '').replace('_rust', '');
          for (const pattern of patterns) {
            if (allDeps[pattern] && !detectedDatabases.includes(cleanDbType)) {
              detectedDatabases.push(cleanDbType);
            }
          }
        }
      }

      // Check database config files
      const dbConfigFiles = [
        '.env',
        '.env.local',
        '.env.production',
        'config/database.yml',
        'database.json',
        'prisma/schema.prisma',
        'typeorm.config.ts',
        'docker-compose.yml'
      ];

      for (const configFile of dbConfigFiles) {
        const filePath = path.join(projectPath, configFile);
        if (await FileSystemService.fileExists(filePath)) {
          try {
            const content = await FileSystemService.readFileContent(filePath);
            const lowerContent = content.toLowerCase();

            // Check for database connection strings
            if (lowerContent.includes('postgresql://') || lowerContent.includes('postgres://') ||
                lowerContent.includes('database_url') && lowerContent.includes('postgres')) {
              if (!detectedDatabases.includes('postgresql')) {
                detectedDatabases.push('postgresql');
              }
            }
            if (lowerContent.includes('mysql://') || lowerContent.includes('mysql:')) {
              if (!detectedDatabases.includes('mysql')) {
                detectedDatabases.push('mysql');
              }
            }
            if (lowerContent.includes('mongodb://') || lowerContent.includes('mongodb+srv://')) {
              if (!detectedDatabases.includes('mongodb')) {
                detectedDatabases.push('mongodb');
              }
            }
            if (lowerContent.includes('redis://') || lowerContent.includes('redis:')) {
              if (!detectedDatabases.includes('redis')) {
                detectedDatabases.push('redis');
              }
            }
          } catch (error) {
            // Ignore file read errors
          }
        }
      }

      // Check Python requirements.txt
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      if (await FileSystemService.fileExists(requirementsPath)) {
        try {
          const content = await FileSystemService.readFileContent(requirementsPath);
          const lowerContent = content.toLowerCase();

          if (lowerContent.includes('psycopg') || lowerContent.includes('asyncpg')) {
            if (!detectedDatabases.includes('postgresql')) {
              detectedDatabases.push('postgresql');
            }
          }
          if (lowerContent.includes('pymongo') || lowerContent.includes('motor')) {
            if (!detectedDatabases.includes('mongodb')) {
              detectedDatabases.push('mongodb');
            }
          }
          if (lowerContent.includes('redis')) {
            if (!detectedDatabases.includes('redis')) {
              detectedDatabases.push('redis');
            }
          }
          if (lowerContent.includes('mysql-connector') || lowerContent.includes('pymysql')) {
            if (!detectedDatabases.includes('mysql')) {
              detectedDatabases.push('mysql');
            }
          }
        } catch (error) {
          // Ignore file read errors
        }
      }

      return {
        hasDatabase: detectedDatabases.length > 0,
        ...(detectedDatabases.length > 0 && {
          databaseType: detectedDatabases.join(', '),
          databases: detectedDatabases
        })
      };
    } catch (error) {
      this.logger?.warn?.('Failed to detect database usage', { error });
      return { hasDatabase: false };
    }
  }

  /**
   * Parse environment file
   *
   * @param envPath - Path to .env file
   * @returns List of environment variables
   */
  private async parseEnvFile(envPath: string): Promise<readonly EnvironmentVariable[]> {
    try {
      const content = await FileSystemService.readFileContent(envPath);
      const lines = content.split('\n');
      const variables: EnvironmentVariable[] = [];

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        // Parse KEY=VALUE format
        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
        if (match) {
          const key = match[1];
          const value = match[2];

          if (key) {
            const variable: EnvironmentVariable = {
              key,
              isSecret: this.isSecretVariable(key),
              isRequired: true
            };

            // Only add value if it exists
            if (value) {
              variables.push({ ...variable, value });
            } else {
              variables.push(variable);
            }
          }
        }
      }

      return variables;
    } catch (error) {
      this.logger?.warn?.('Failed to parse environment file', { error, envPath });
      return [];
    }
  }

  /**
   * Check if variable name indicates a secret
   *
   * @param key - Variable key
   * @returns True if likely a secret
   */
  private isSecretVariable(key: string): boolean {
    // Use keywords (strings) instead of patterns (RegExp)
    const secretKeywords = this.config?.projectPatterns?.secrets?.keywords ?? [
      'api_key',
      'secret',
      'password',
      'token',
      'private_key',
      'access_key',
      'auth'
    ];

    const lowerKey = key.toLowerCase();
    return secretKeywords.some(keyword => lowerKey.includes(keyword));
  }

  /**
   * Get package.json content
   *
   * @param projectPath - Path to project root
   * @returns Parsed package.json or null
   */
  private async getPackageJson(projectPath: string): Promise<Record<string, unknown> | null> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await FileSystemService.fileExists(packageJsonPath)) {
        const content = await FileSystemService.readFileContent(packageJsonPath);
        return JSON.parse(content) as Record<string, unknown>;
      }
      return null;
    } catch (error) {
      this.logger?.warn?.('Failed to read package.json', {
        error: (error as Error).message,
        projectPath
      });
      return null;
    }
  }
}
