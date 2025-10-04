/**
 * @fileoverview Project Analyzer - Analyzes projects for cloud deployment
 * @description Comprehensive project analysis utility that examines project structure,
 * dependencies, configuration files, and provides deployment recommendations based
 * on detected technologies and patterns.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import type {
  ProjectAnalysis,
  FrameworkType,
  ProgrammingLanguage,
  PackageManager,
  ProjectDependency,
  EnvironmentVariable,
  ProjectSize,
  ProjectComplexity,
} from '../types/deployment.types.js';

import {
  createLogger,
  type ILogger,
} from '../../utils/logger.js';

/**
 * Project Analyzer for automated project analysis
 * @class ProjectAnalyzer
 * @description Analyzes project structure, dependencies, and configuration
 * to provide deployment recommendations and configuration generation.
 */
export class ProjectAnalyzer {
  private readonly logger: ILogger;

  constructor() {
    this.logger = createLogger('ProjectAnalyzer');
  }

  /**
   * Analyze a project for deployment readiness
   * @method analyze
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<ProjectAnalysis>} Complete project analysis
   */
  async analyze(projectPath: string): Promise<ProjectAnalysis> {
    return this.analyzeProject(projectPath);
  }

  /**
   * Analyze a project for deployment readiness (alias for analyze)
   * @method analyzeProject
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<ProjectAnalysis>} Complete project analysis
   */
  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    this.logger.info('Starting project analysis', { projectPath });

    const resolvedPath = resolve(projectPath);

    // Verify project directory exists
    try {
      await fs.access(resolvedPath);
    } catch (error) {
      throw new Error(`Project directory not found: ${projectPath}`);
    }

    // Parallel analysis of different aspects
    const [
      packageInfo,
      framework,
      language,
      dependencies,
      envVars,
      buildConfig,
      dockerConfig,
      size,
      complexity
    ] = await Promise.all([
      this.analyzePackageInfo(resolvedPath),
      this.detectFramework(resolvedPath),
      this.detectLanguage(resolvedPath),
      this.analyzeDependencies(resolvedPath),
      this.analyzeEnvironmentVariables(resolvedPath),
      this.analyzeBuildConfiguration(resolvedPath),
      this.analyzeDockerConfiguration(resolvedPath),
      this.estimateProjectSize(resolvedPath),
      this.assessComplexity(resolvedPath)
    ]);

    const hasDatabase = await this.detectDatabaseUsage(resolvedPath, dependencies);
    const databaseType = hasDatabase ? await this.detectDatabaseType(resolvedPath, dependencies) : undefined;

    const analysis: ProjectAnalysis = {
      framework,
      language,
      packageManager: packageInfo.packageManager,
      dependencies,
      buildCommand: buildConfig.buildCommand,
      startCommand: buildConfig.startCommand,
      outputDirectory: buildConfig.outputDirectory,
      environmentVariables: envVars,
      size,
      complexity,
      estimatedBuildTime: this.estimateBuildTime(framework, size, complexity),
      hasDatabase,
      databaseType: databaseType as any,
      hasDockerfile: dockerConfig.hasDockerfile,
      projectType: 'web-application',
      hasAPI: false,
      recommendations: await this.generateRecommendations(resolvedPath, {
        framework,
        language,
        hasDatabase,
        hasDockerfile: dockerConfig.hasDockerfile,
        size,
        complexity
      })
    };

    this.logger.info('Project analysis completed', {
      framework: analysis.framework,
      language: analysis.language,
      complexity: analysis.complexity
    });

    return analysis;
  }

  /**
   * Analyze package.json and related package manager files
   * @private
   */
  private async analyzePackageInfo(projectPath: string): Promise<{
    packageManager: PackageManager;
    hasPackageJson: boolean;
  }> {
    const packageManager = await this.detectPackageManager(projectPath);
    const hasPackageJson = await this.fileExists(projectPath, 'package.json');

    return { packageManager, hasPackageJson };
  }

  /**
   * Detect the package manager being used
   * @private
   */
  private async detectPackageManager(projectPath: string): Promise<PackageManager> {
    // Check for lock files in order of preference
    if (await this.fileExists(projectPath, 'pnpm-lock.yaml')) return 'pnpm';
    if (await this.fileExists(projectPath, 'yarn.lock')) return 'yarn';
    if (await this.fileExists(projectPath, 'package-lock.json')) return 'npm';
    if (await this.fileExists(projectPath, 'bun.lockb')) return 'bun';

    // Fallback to checking package.json for packageManager field
    try {
      const packageJson = await this.readPackageJson(projectPath);
      if (packageJson?.packageManager) {
        const pm = packageJson.packageManager.split('@')[0];
        if (['npm', 'yarn', 'pnpm', 'bun'].includes(pm)) {
          return pm as PackageManager;
        }
      }
    } catch {
      // Ignore package.json reading errors
    }

    return 'npm'; // Default fallback
  }

  /**
   * Detect the primary framework being used
   * @private
   */
  private async detectFramework(projectPath: string): Promise<FrameworkType> {
    try {
      const packageJson = await this.readPackageJson(projectPath);
      if (!packageJson) return 'unknown';

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };

      // Framework detection priority order
      if (allDeps['next']) return 'nextjs';
      if (allDeps['nuxt']) return 'nuxt';
      if (allDeps['@sveltejs/kit']) return 'sveltekit';
      if (allDeps['svelte']) return 'svelte';
      if (allDeps['vue'] && allDeps['@vue/cli-service']) return 'vue';
      if (allDeps['@angular/core']) return 'angular';
      if (allDeps['react'] && allDeps['react-scripts']) return 'react';
      if (allDeps['react']) return 'react';
      if (allDeps['express']) return 'express';
      if (allDeps['fastify']) return 'fastify';
      if (allDeps['@nestjs/core']) return 'nestjs';

      // Check for static site indicators
      const hasStaticFiles = await this.hasStaticSiteStructure(projectPath);
      if (hasStaticFiles) return 'static';

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Detect the primary programming language
   * @private
   */
  private async detectLanguage(projectPath: string): Promise<ProgrammingLanguage> {
    try {
      // Check for TypeScript config
      if (await this.fileExists(projectPath, 'tsconfig.json')) return 'typescript';

      // Check file extensions in src directory or root
      const srcPath = join(projectPath, 'src');
      const checkPath = await this.directoryExists(srcPath) ? srcPath : projectPath;

      const files = await fs.readdir(checkPath);
      const extensions = files.map(file => file.split('.').pop()?.toLowerCase()).filter(Boolean);

      if (extensions.includes('ts') || extensions.includes('tsx')) return 'typescript';
      if (extensions.includes('py')) return 'python';
      if (extensions.includes('rb')) return 'ruby';
      if (extensions.includes('go')) return 'go';
      if (extensions.includes('rs')) return 'rust';
      if (extensions.includes('java')) return 'java';
      if (extensions.includes('php')) return 'php';
      if (extensions.includes('js') || extensions.includes('jsx')) return 'javascript';

      return 'javascript'; // Default fallback
    } catch {
      return 'javascript';
    }
  }

  /**
   * Analyze project dependencies
   * @private
   */
  private async analyzeDependencies(projectPath: string): Promise<ProjectDependency[]> {
    try {
      const packageJson = await this.readPackageJson(projectPath);
      if (!packageJson) return [];

      const dependencies: ProjectDependency[] = [];
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      for (const [name, version] of Object.entries(allDeps)) {
        dependencies.push({
          name,
          version: version as string,
          type: packageJson.dependencies?.[name] ? 'production' : 'development'
        });
      }

      return dependencies;
    } catch {
      return [];
    }
  }

  /**
   * Analyze environment variables from various sources
   * @private
   */
  private async analyzeEnvironmentVariables(projectPath: string): Promise<EnvironmentVariable[]> {
    const envVars: EnvironmentVariable[] = [];

    // Check .env files
    const envFiles = ['.env', '.env.local', '.env.example', '.env.template'];

    for (const envFile of envFiles) {
      try {
        const content = await fs.readFile(join(projectPath, envFile), 'utf-8');
        const vars = this.parseEnvFile(content);
        envVars.push(...vars);
      } catch {
        // File doesn't exist or can't be read
      }
    }

    return envVars;
  }

  /**
   * Parse environment variables from .env file content
   * @private
   */
  private parseEnvFile(content: string): EnvironmentVariable[] {
    const vars: EnvironmentVariable[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        const value = valueParts.join('=').trim();
        vars.push({
          key: key.trim(),
          value: value || undefined,
          required: !value, // Empty values are considered required
          isSecret: false,
          isRequired: !value
        });
      }
    }

    return vars;
  }

  /**
   * Analyze build configuration
   * @private
   */
  private async analyzeBuildConfiguration(projectPath: string): Promise<{
    buildCommand?: string;
    startCommand?: string;
    outputDirectory?: string;
  }> {
    try {
      const packageJson = await this.readPackageJson(projectPath);
      if (!packageJson?.scripts) return {};

      const scripts = packageJson.scripts;
      const outputDir = await this.detectOutputDirectory(projectPath);

      return {
        buildCommand: scripts.build || scripts.compile,
        startCommand: scripts.start || scripts.serve,
        ...(outputDir ? { outputDirectory: outputDir } : {})
      };
    } catch {
      return {};
    }
  }

  /**
   * Detect the output directory for built files
   * @private
   */
  private async detectOutputDirectory(projectPath: string): Promise<string | undefined> {
    const commonOutputDirs = ['dist', 'build', '.next', 'out', 'public'];

    for (const dir of commonOutputDirs) {
      if (await this.directoryExists(join(projectPath, dir))) {
        return dir;
      }
    }

    return undefined;
  }

  /**
   * Analyze Docker configuration
   * @private
   */
  private async analyzeDockerConfiguration(projectPath: string): Promise<{
    hasDockerfile: boolean;
    hasDockerCompose: boolean;
  }> {
    const hasDockerfile = await this.fileExists(projectPath, 'Dockerfile');
    const hasDockerCompose = await this.fileExists(projectPath, 'docker-compose.yml') ||
                             await this.fileExists(projectPath, 'docker-compose.yaml');

    return { hasDockerfile, hasDockerCompose };
  }

  /**
   * Estimate project size based on file count and directory structure
   * @private
   */
  private async estimateProjectSize(projectPath: string): Promise<ProjectSize> {
    try {
      const stats = await this.getProjectStats(projectPath);

      if (stats.fileCount < 50) return 'small';
      if (stats.fileCount < 200) return 'medium';
      if (stats.fileCount < 500) return 'large';
      return 'enterprise';
    } catch {
      return 'medium';
    }
  }

  /**
   * Assess project complexity based on various factors
   * @private
   */
  private async assessComplexity(projectPath: string): Promise<ProjectComplexity> {
    let complexityScore = 0;

    try {
      const packageJson = await this.readPackageJson(projectPath);
      const depCount = Object.keys({
        ...packageJson?.dependencies,
        ...packageJson?.devDependencies
      }).length;

      // Scoring based on dependency count
      if (depCount > 100) complexityScore += 3;
      else if (depCount > 50) complexityScore += 2;
      else if (depCount > 20) complexityScore += 1;

      // Check for complex configuration files
      const complexConfigs = [
        'webpack.config.js', 'rollup.config.js', 'vite.config.js',
        'babel.config.js', 'jest.config.js', 'cypress.json'
      ];

      for (const config of complexConfigs) {
        if (await this.fileExists(projectPath, config)) {
          complexityScore += 1;
        }
      }

      // Check for microservices indicators
      if (await this.directoryExists(join(projectPath, 'services')) ||
          await this.directoryExists(join(projectPath, 'apps'))) {
        complexityScore += 2;
      }

      // Check for database migrations
      if (await this.directoryExists(join(projectPath, 'migrations')) ||
          await this.directoryExists(join(projectPath, 'prisma'))) {
        complexityScore += 1;
      }

      if (complexityScore >= 6) return 'advanced';
      if (complexityScore >= 4) return 'complex';
      if (complexityScore >= 2) return 'moderate';
      return 'simple';
    } catch {
      return 'moderate';
    }
  }

  /**
   * Detect database usage from dependencies and configuration
   * @private
   */
  private async detectDatabaseUsage(_projectPath: string, dependencies: ProjectDependency[]): Promise<boolean> {
    const dbDependencies = [
      'mongoose', 'sequelize', 'typeorm', 'prisma', 'knex',
      'pg', 'mysql2', 'sqlite3', 'mongodb', 'redis'
    ];

    return dependencies.some(dep =>
      dbDependencies.some(dbDep => dep.name.includes(dbDep))
    );
  }

  /**
   * Detect database type from dependencies
   * @private
   */
  private async detectDatabaseType(_projectPath: string, dependencies: ProjectDependency[]): Promise<string | undefined> {
    const depNames = dependencies.map(d => d.name);

    if (depNames.some(name => ['pg', 'postgres', 'postgresql'].includes(name))) return 'postgresql';
    if (depNames.some(name => ['mysql', 'mysql2'].includes(name))) return 'mysql';
    if (depNames.some(name => ['sqlite', 'sqlite3'].includes(name))) return 'sqlite';
    if (depNames.some(name => ['mongodb', 'mongoose'].includes(name))) return 'mongodb';
    if (depNames.some(name => ['redis'].includes(name))) return 'redis';

    return 'unknown';
  }

  /**
   * Estimate build time based on project characteristics
   * @private
   */
  private estimateBuildTime(framework: FrameworkType, size: ProjectSize, complexity: ProjectComplexity): number {
    let baseTime = 2; // minutes

    // Framework adjustments
    switch (framework) {
      case 'nextjs': baseTime += 3; break;
      case 'nuxt': baseTime += 2; break;
      case 'angular': baseTime += 4; break;
      case 'react': baseTime += 1; break;
      case 'static': baseTime = 1; break;
    }

    // Size adjustments
    switch (size) {
      case 'small': baseTime *= 0.5; break;
      case 'medium': baseTime *= 1; break;
      case 'large': baseTime *= 1.5; break;
      case 'enterprise': baseTime *= 2.5; break;
    }

    // Complexity adjustments
    switch (complexity) {
      case 'simple': baseTime *= 0.8; break;
      case 'moderate': baseTime *= 1; break;
      case 'complex': baseTime *= 1.3; break;
      case 'advanced': baseTime *= 1.8; break;
    }

    return Math.round(baseTime);
  }

  /**
   * Generate deployment recommendations
   * @private
   */
  private async generateRecommendations(
    _projectPath: string,
    analysis: Partial<ProjectAnalysis>
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Framework-specific recommendations
    switch (analysis.framework) {
      case 'nextjs':
        recommendations.push('Consider Vercel for optimal Next.js deployment experience');
        recommendations.push('Enable Image Optimization for better performance');
        break;
      case 'react':
        recommendations.push('Netlify or Vercel provide excellent static site hosting');
        recommendations.push('Configure build optimization for smaller bundle sizes');
        break;
      case 'static':
        recommendations.push('Use a CDN-based provider like Netlify or Cloudflare Pages');
        break;
    }

    // Database recommendations
    if (analysis.hasDatabase) {
      recommendations.push('Consider providers with managed database offerings (Railway, Render)');
      recommendations.push('Ensure database migrations are automated in your deployment pipeline');
    }

    // Docker recommendations
    if (analysis.hasDockerfile) {
      recommendations.push('Railway or Render support containerized deployments well');
      recommendations.push('Optimize Docker image size for faster deployments');
    }

    // Size and complexity recommendations
    if (analysis.size === 'enterprise' || analysis.complexity === 'advanced') {
      recommendations.push('Consider AWS or Google Cloud for enterprise-grade deployments');
      recommendations.push('Implement comprehensive monitoring and logging');
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
  private async fileExists(directory: string, filename: string): Promise<boolean> {
    try {
      await fs.access(join(directory, filename));
      return true;
    } catch {
      return false;
    }
  }

  private async directoryExists(path: string): Promise<boolean> {
    try {
      const stat = await fs.stat(path);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async readPackageJson(projectPath: string): Promise<any> {
    try {
      const content = await fs.readFile(join(projectPath, 'package.json'), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async hasStaticSiteStructure(projectPath: string): Promise<boolean> {
    const staticIndicators = ['index.html', 'index.htm'];
    for (const indicator of staticIndicators) {
      if (await this.fileExists(projectPath, indicator)) {
        return true;
      }
    }
    return false;
  }

  private async getProjectStats(projectPath: string): Promise<{ fileCount: number; directoryCount: number }> {
    let fileCount = 0;
    let directoryCount = 0;

    const traverse = async (currentPath: string) => {
      try {
        const items = await fs.readdir(currentPath);

        for (const item of items) {
          // Skip node_modules and other common ignore patterns
          if (['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) {
            continue;
          }

          const itemPath = join(currentPath, item);
          const stat = await fs.stat(itemPath);

          if (stat.isDirectory()) {
            directoryCount++;
            await traverse(itemPath);
          } else {
            fileCount++;
          }
        }
      } catch {
        // Skip directories we can't read
      }
    };

    await traverse(projectPath);
    return { fileCount, directoryCount };
  }
}

/**
 * Create a new project analyzer instance
 * @function createProjectAnalyzer
 * @returns {ProjectAnalyzer} New analyzer instance
 */
export const createProjectAnalyzer = (): ProjectAnalyzer => {
  return new ProjectAnalyzer();
};

/**
 * Analyze a project (convenience function)
 * @function analyzeProject
 * @param {string} projectPath - Path to the project directory
 * @returns {Promise<ProjectAnalysis>} Project analysis results
 */
export const analyzeProject = async (projectPath: string): Promise<ProjectAnalysis> => {
  const analyzer = createProjectAnalyzer();
  return analyzer.analyze(projectPath);
};