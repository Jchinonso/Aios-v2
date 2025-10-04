/**
 * Circular Dependency Detector - Comprehensive dependency cycle analysis
 *
 * Now refactored to use shared services for language detection, file system
 * operations, and framework detection to eliminate redundancy and improve maintainability.
/**
 * @module CircularDependencyDetector
 * @description
 * This module provides comprehensive analysis for detecting circular dependencies
 * within a project's file system. It leverages shared services for language detection,
 * file system operations, and framework detection to ensure maintainability and eliminate redundancy.
 *
 * The core functionality includes:
 * - Building a dependency graph for supported languages and frameworks
 * - Identifying and reporting circular dependency paths
 * - Supporting extensibility for new languages and frameworks
 *
 * Exposed interfaces and classes:
 * - IDependencyGraphBuilder: Abstraction for building dependency graphs
 * - JavaScriptGraphBuilder: Implementation for JavaScript/TypeScript projects
 *
 * Usage:
 * Import and instantiate the appropriate graph builder, then invoke `buildGraph`
 * to analyze a project and detect circular dependencies.
 */


import { BaseAnalyzer } from '../core/base-analyzer.js'
import type { IResult } from '../../../core/types/result.js'
import { Result } from '../../../core/types/result.js'
import type { IAnalyzer, AnalysisResult } from '../types/analyzer.interface.js'
import type {
  CircularDependencyReport,
  DependencyNode,
  DependencyEdge,
  CircularPath,
  DependencyGraph
} from '../types/dependency.types.js';
import type {
  IFileSystemLogger,
  IFileSystemMetrics,
  ILanguageDetector,
  IFileSystemOperations,
  IFileScanner
} from '../types/core-interfaces.js';
import fs from 'fs';
import path from 'path';

  /**
 * Dependency Graph Builder Interface
 */
export interface IDependencyGraphBuilder {
  readonly language: string;
  readonly supportedExtensions: string[];
  readonly supportedFrameworks: string[];
  buildGraph(projectPath: string): Promise<DependencyGraph>;
  detectFramework(projectPath: string): Promise<string | null>;
  getBuildConfig(projectPath: string): Promise<Record<string, any>>;
}

/**
 * JavaScript/TypeScript Dependency Graph Builder
 */
export class JavaScriptGraphBuilder implements IDependencyGraphBuilder {
  readonly language = 'javascript';
  readonly supportedExtensions = ['.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs', '.vue', '.svelte'];
  readonly supportedFrameworks = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'sveltekit'];

  constructor(
    private fileSystem: IFileSystemOperations,
    private fileScanner: IFileScanner,
    private languageDetector: ILanguageDetector
  ) {}

  async buildGraph(projectPath: string): Promise<DependencyGraph> {
    const path = await import('path');
    const nodes = new Map<string, DependencyNode>();
    const edges: DependencyEdge[] = [];

    // Use injected fileScanner for comprehensive project scanning
    const projectScanResult = await this.fileScanner.scanProject(projectPath, {
      excludeDirectories: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
      includePatterns: this.supportedExtensions
    });

    // Process each scanned file
    for (const fileScanResult of projectScanResult.files) {
      if (fileScanResult.language === 'javascript' || fileScanResult.language === 'typescript') {
        const relativePath = path.relative(projectPath, fileScanResult.filePath);
        
        // Create node for this file
        if (!nodes.has(relativePath)) {
          nodes.set(relativePath, {
            id: relativePath,
            name: path.basename(relativePath),
            path: relativePath,
            type: this.determineNodeType(relativePath, fileScanResult.metadata),
            size: fileScanResult.metadata['size'] || 0,
            dependencies: fileScanResult.dependencies.length
          });
        }

        // Process dependencies found by FileScannerService
        for (const depPath of fileScanResult.dependencies) {
          const resolvedPath = await this.resolveDependencyPath(fileScanResult.filePath, depPath, projectPath);
          if (resolvedPath) {
            edges.push({
              from: relativePath,
              to: resolvedPath,
              type: this.determineDependencyType(depPath),
              weight: 1
            });

            if (!nodes.has(resolvedPath)) {
              nodes.set(resolvedPath, {
                id: resolvedPath,
                name: path.basename(resolvedPath),
                path: resolvedPath,
                type: 'module',
                size: 0,
                dependencies: 0
              });
            }
          }
        }
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
      totalNodes: nodes.size,
      totalEdges: edges.length
    };
  }


  private determineNodeType(filePath: string, metadata: Record<string, any>): DependencyNode['type'] {
    if (filePath.includes('.test.') || filePath.includes('.spec.') || metadata['hasTests']) return 'test';
    if (filePath.includes('.d.ts')) return 'types';
    if (metadata['isConfig']) return 'package';
    return 'module';
  }

  private determineDependencyType(depPath: string): DependencyEdge['type'] {
    if (depPath.startsWith('../')) return 'import';
    if (depPath.startsWith('./')) return 'require';
    return 'dynamic';
  }

  private async resolveDependencyPath(fromPath: string, depPath: string, projectRoot: string): Promise<string | null> {
    const path = await import('path');

    try {
      let resolved = path.resolve(path.dirname(fromPath), depPath);

      // Try common extensions
      const extensions = ['.js', '.ts', '.tsx', '.jsx', '.json'];
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (await this.fileSystem.fileExists(withExt)) {
          return path.relative(projectRoot, withExt);
        }
      }

      // Try index files
      for (const ext of extensions) {
        const indexFile = path.join(resolved, `index${ext}`);
        if (await this.fileSystem.fileExists(indexFile)) {
          return path.relative(projectRoot, indexFile);
        }
      }

      return null;
    } catch {
      return null;
    }
  }


  async detectFramework(projectPath: string): Promise<string | null> {
    // Framework detection now handled by injected languageDetector
    const result = await this.languageDetector.detectFramework(projectPath, 'javascript');
    return result.framework;
  }

  async getBuildConfig(projectPath: string): Promise<Record<string, any>> {
    const path = await import('path');

    const config: Record<string, any> = {};

    // Check for various config files
    const configFiles = [
      'tsconfig.json',
      'jsconfig.json',
      'webpack.config.js',
      'vite.config.js',
      'rollup.config.js',
      'esbuild.config.js'
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(projectPath, configFile);
      if (await this.fileSystem.fileExists(configPath)) {
        try {
          const content = await this.fileSystem.readFileContent(configPath);
          if (configFile.endsWith('.json')) {
            config[configFile] = JSON.parse(content);
          } else {
            config[configFile] = { exists: true, content: content.substring(0, 1000) }; // First 1000 chars
          }
        } catch {
          config[configFile] = { exists: true, parseError: true };
        }
      }
    }

    return config;
  }
}

/**
 * Python Dependency Graph Builder
 */
export class PythonGraphBuilder implements IDependencyGraphBuilder {
  readonly language = 'python';
  readonly supportedExtensions = ['.py', '.pyi', '.pyx', '.pyw'];
  readonly supportedFrameworks = ['django', 'flask', 'fastapi', 'tornado', 'pyramid', 'bottle', 'cherrypy'];

  constructor(
    private fileSystem: IFileSystemOperations,
    private fileScanner: IFileScanner,
    private languageDetector: ILanguageDetector
  ) {}

  async buildGraph(projectPath: string): Promise<DependencyGraph> {
    const path = await import('path');
    const nodes = new Map<string, DependencyNode>();
    const edges: DependencyEdge[] = [];

    // Use injected fileScanner for comprehensive project scanning
    const projectScanResult = await this.fileScanner.scanProject(projectPath, {
      excludeDirectories: ['__pycache__', '.git', 'venv', '.venv', 'env', '.env', 'site-packages'],
      includePatterns: this.supportedExtensions
    });

    // Process each scanned file
    for (const fileScanResult of projectScanResult.files) {
      if (fileScanResult.language === 'python') {
        const relativePath = path.relative(projectPath, fileScanResult.filePath);
        
        // Create node for this file
        if (!nodes.has(relativePath)) {
          nodes.set(relativePath, {
            id: relativePath,
            name: path.basename(relativePath),
            path: relativePath,
            type: this.determineNodeType(relativePath, fileScanResult.metadata),
            size: fileScanResult.metadata['size'] || 0,
            dependencies: fileScanResult.dependencies.length
          });
        }

        // Process dependencies found by FileScannerService
        for (const depPath of fileScanResult.dependencies) {
          const resolvedPath = await this.resolvePythonModule(fileScanResult.filePath, depPath, projectPath);
          if (resolvedPath) {
            edges.push({
              from: relativePath,
              to: resolvedPath,
              type: 'import',
              weight: 1
            });

            if (!nodes.has(resolvedPath)) {
              nodes.set(resolvedPath, {
                id: resolvedPath,
                name: path.basename(resolvedPath),
                path: resolvedPath,
                type: 'module',
                size: 0,
                dependencies: 0
              });
            }
          }
        }
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
      totalNodes: nodes.size,
      totalEdges: edges.length
    };
  }

  private determineNodeType(filePath: string, metadata: Record<string, any>): DependencyNode['type'] {
    if (filePath.includes('test_') || filePath.includes('_test.py') || metadata['hasTests']) return 'test';
    if (filePath.endsWith('__init__.py') || metadata['isInit']) return 'package';
    if (metadata['hasMain']) return 'script';
    return 'module';
  }

  private async resolvePythonModule(fromPath: string, moduleName: string, projectRoot: string): Promise<string | null> {
    const path = await import('path');

    if (moduleName.startsWith('.')) {
      // Relative import
      const dir = path.dirname(fromPath);
      const resolved = path.resolve(dir, moduleName.replace(/\./g, '/') + '.py');
      if (await this.fileSystem.fileExists(resolved)) {
        return path.relative(projectRoot, resolved);
      }

      const initFile = path.resolve(dir, moduleName.replace(/\./g, '/'), '__init__.py');
      if (await this.fileSystem.fileExists(initFile)) {
        return path.relative(projectRoot, initFile);
      }
    }

    return null;
  }


  async detectFramework(projectPath: string): Promise<string | null> {
    // Framework detection now handled by injected languageDetector
    const result = await this.languageDetector.detectFramework(projectPath, 'python');
    return result.framework;
  }

  async getBuildConfig(projectPath: string): Promise<Record<string, any>> {
    const path = await import('path');

    const config: Record<string, any> = {};

    // Check for various config files
    const configFiles = [
      'setup.py',
      'pyproject.toml',
      'requirements.txt',
      'Pipfile',
      'poetry.lock',
      'setup.cfg',
      'MANIFEST.in'
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(projectPath, configFile);
      if (await this.fileSystem.fileExists(configPath)) {
        try {
          const content = await this.fileSystem.readFileContent(configPath);
          if (configFile.endsWith('.toml')) {
            // Simple TOML parsing (basic implementation)
            config[configFile] = { exists: true, content: content.substring(0, 1000) };
          } else {
            config[configFile] = { exists: true, content: content.substring(0, 1000) };
          }
        } catch {
          config[configFile] = { exists: true, parseError: true };
        }
      }
    }

    return config;
  }
}

/**
 * Java Dependency Graph Builder
 */
export class JavaGraphBuilder implements IDependencyGraphBuilder {
  readonly language = 'java';
  readonly supportedExtensions = ['.java', '.kt', '.groovy', '.scala'];
  readonly supportedFrameworks = ['spring', 'spring-boot', 'quarkus', 'micronaut', 'play', 'vertx'];

  constructor(
    // @ts-expect-error - Reserved for advanced file system operations
    private fileSystem: IFileSystemOperations,
    private fileScanner: IFileScanner,
    private languageDetector: ILanguageDetector
  ) {}

  async buildGraph(projectPath: string): Promise<DependencyGraph> {
    const path = await import('path');
    const nodes = new Map<string, DependencyNode>();
    const edges: DependencyEdge[] = [];

    // Use injected fileScanner for comprehensive project scanning
    const projectScanResult = await this.fileScanner.scanProject(projectPath, {
      excludeDirectories: ['.git', 'target', 'build', 'out', '.gradle', '.m2'],
      includePatterns: this.supportedExtensions
    });

    // Process each scanned file
    for (const fileScanResult of projectScanResult.files) {
      if (fileScanResult.language === 'java') {
        const relativePath = path.relative(projectPath, fileScanResult.filePath);
        
        // Create node for this file
        if (!nodes.has(relativePath)) {
          nodes.set(relativePath, {
            id: relativePath,
            name: path.basename(relativePath),
            path: relativePath,
            type: this.determineNodeType(relativePath, fileScanResult.metadata),
            size: fileScanResult.metadata['size'] || 0,
            dependencies: fileScanResult.dependencies.length
          });
        }

        // Process dependencies found by FileScannerService
        for (const depPath of fileScanResult.dependencies) {
          const resolvedPath = this.resolveJavaClass(depPath, projectPath);
          if (resolvedPath) {
            edges.push({
              from: relativePath,
              to: resolvedPath,
              type: 'import',
              weight: 1
            });

            if (!nodes.has(resolvedPath)) {
              nodes.set(resolvedPath, {
                id: resolvedPath,
                name: path.basename(resolvedPath),
                path: resolvedPath,
                type: 'module',
                size: 0,
                dependencies: 0
              });
            }
          }
        }
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
      totalNodes: nodes.size,
      totalEdges: edges.length
    };
  }

  private determineNodeType(filePath: string, metadata: Record<string, any>): DependencyNode['type'] {
    if (filePath.includes('Test') || metadata['hasTests']) return 'test';
    if (metadata['isPublic']) return 'module';
    return 'module';
  }

  private resolveJavaClass(className: string, projectRoot: string): string | null {
    // Simplified Java class resolution
    
    const packageParts = className.split('.');
    const fileName = packageParts.pop() + '.java';
    const packagePath = packageParts.join('/');
    
    const possiblePaths = [
      path.join(projectRoot, 'src/main/java', packagePath, fileName),
      path.join(projectRoot, 'src', packagePath, fileName),
      path.join(projectRoot, packagePath, fileName)
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return path.relative(projectRoot, possiblePath);
      }
    }

    return null;
  }


  async detectFramework(projectPath: string): Promise<string | null> {
    // Framework detection now handled by injected languageDetector
    const result = await this.languageDetector.detectFramework(projectPath, 'java');
    return result.framework;
  }

  async getBuildConfig(projectPath: string): Promise<Record<string, any>> {
    const fs = await import('fs');
    const path = await import('path');

    const config: Record<string, any> = {};

    const configFiles = ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle', 'gradle.properties'];

    for (const configFile of configFiles) {
      const configPath = path.join(projectPath, configFile);
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf8');
          config[configFile] = { exists: true, content: content.substring(0, 1000) };
        } catch {
          config[configFile] = { exists: true, parseError: true };
        }
      }
    }

    return config;
  }
}

/**
 * Go Dependency Graph Builder
 */
export class GoGraphBuilder implements IDependencyGraphBuilder {
  readonly language = 'go';
  readonly supportedExtensions = ['.go'];
  readonly supportedFrameworks = ['gin', 'echo', 'fiber', 'gorilla', 'beego', 'revel'];

  constructor(
    // @ts-expect-error - Reserved for advanced file system operations
    private fileSystem: IFileSystemOperations,
    private fileScanner: IFileScanner,
    private languageDetector: ILanguageDetector
  ) {}

  async buildGraph(projectPath: string): Promise<DependencyGraph> {
    const path = await import('path');
    const nodes = new Map<string, DependencyNode>();
    const edges: DependencyEdge[] = [];

    // Use injected fileScanner for comprehensive project scanning
    const projectScanResult = await this.fileScanner.scanProject(projectPath, {
      excludeDirectories: ['.git', 'vendor', 'node_modules'],
      includePatterns: this.supportedExtensions
    });

    // Process each scanned file
    for (const fileScanResult of projectScanResult.files) {
      if (fileScanResult.language === 'go') {
        const relativePath = path.relative(projectPath, fileScanResult.filePath);
        
        // Create node for this file
        if (!nodes.has(relativePath)) {
          nodes.set(relativePath, {
            id: relativePath,
            name: path.basename(relativePath),
            path: relativePath,
            type: this.determineNodeType(relativePath, fileScanResult.metadata),
            size: fileScanResult.metadata['size'] || 0,
            dependencies: fileScanResult.dependencies.length
          });
        }

        // Process dependencies found by FileScannerService
        for (const depPath of fileScanResult.dependencies) {
          const resolvedPath = this.resolveGoPackage(fileScanResult.filePath, depPath, projectPath);
          if (resolvedPath) {
            edges.push({
              from: relativePath,
              to: resolvedPath,
              type: 'import',
              weight: 1
            });

            if (!nodes.has(resolvedPath)) {
              nodes.set(resolvedPath, {
                id: resolvedPath,
                name: path.basename(resolvedPath),
                path: resolvedPath,
                type: 'package',
                size: 0,
                dependencies: 0
              });
            }
          }
        }
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
      totalNodes: nodes.size,
      totalEdges: edges.length
    };
  }

  private determineNodeType(filePath: string, metadata: Record<string, any>): DependencyNode['type'] {
    if (filePath.includes('_test.go') || metadata['hasTests']) return 'test';
    if (metadata['isMain'] || metadata['hasMain']) return 'script';
    return 'package';
  }

  private resolveGoPackage(fromPath: string, packageName: string, projectRoot: string): string | null {
    
    const possiblePaths = [
      path.join(projectRoot, packageName),
      path.join(path.dirname(fromPath), packageName)
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return path.relative(projectRoot, possiblePath);
      }
    }

    return null;
  }


  async detectFramework(projectPath: string): Promise<string | null> {
    // Framework detection now handled by injected languageDetector
    const result = await this.languageDetector.detectFramework(projectPath, 'go');
    return result.framework;
  }

  async getBuildConfig(projectPath: string): Promise<Record<string, any>> {
    const fs = await import('fs');
    const path = await import('path');

    const config: Record<string, any> = {};

    const configFiles = ['go.mod', 'go.sum', 'Makefile', 'Dockerfile'];

    for (const configFile of configFiles) {
      const configPath = path.join(projectPath, configFile);
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf8');
          config[configFile] = { exists: true, content: content.substring(0, 1000) };
        } catch {
          config[configFile] = { exists: true, parseError: true };
        }
      }
    }

    return config;
  }
}

/**
 * Main Circular Dependency Detector
 */
export class CircularDependencyDetector extends BaseAnalyzer<any, any> implements IAnalyzer {
  override readonly name = 'CircularDependencyDetector';
  override readonly version = '1.0.0';
  private readonly graphBuilders: Map<string, IDependencyGraphBuilder>;

  constructor(
    logger: IFileSystemLogger,
    metrics: IFileSystemMetrics,
    private languageDetector: ILanguageDetector,
    // @ts-expect-error - Reserved for advanced file system operations
    private fileSystem: IFileSystemOperations,
    // @ts-expect-error - Reserved for future use
    private fileScanner: IFileScanner
  ) {
    super('CircularDependencyDetector', '1.0.0', logger as any, metrics as any);
    
    // Initialize graph builders with injected dependencies
    this.graphBuilders = new Map<string, IDependencyGraphBuilder>([
      ['javascript', new JavaScriptGraphBuilder(fileSystem, fileScanner, languageDetector)],
      ['typescript', new JavaScriptGraphBuilder(fileSystem, fileScanner, languageDetector)],
      ['python', new PythonGraphBuilder(fileSystem, fileScanner, languageDetector)],
      ['java', new JavaGraphBuilder(fileSystem, fileScanner, languageDetector)],
      ['go', new GoGraphBuilder(fileSystem, fileScanner, languageDetector)],
      ['golang', new GoGraphBuilder(fileSystem, fileScanner, languageDetector)]
    ]);
  }

  async analyze(input: any): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting circular dependency detection', { 
        projectPath: input?.projectPath,
        language: input?.language 
      });

      const projectPath = input?.projectPath || input;
      let language = input?.language;
      
      // Auto-detect language if not provided using injected service
      if (!language) {
        const languageResult = await this.languageDetector.detectLanguage(projectPath, this.logger);
        language = languageResult.language;
        
        if (language === 'unknown') {
          return {
            success: false,
            error: 'Could not detect project language. Please specify language explicitly.',
            warnings: [],
            confidence: 0,
            metadata: {
              analyzer: this.name,
              version: this.version,
              executionTime: Date.now() - startTime,
              timestamp: new Date()
            }
          };
        }
      }
      
      const graphBuilder = this.graphBuilders.get(language.toLowerCase());
      if (!graphBuilder) {
        return {
          success: true,
          data: { circularPaths: [], summary: { totalPaths: 0, severity: 'none' } },
          warnings: [`No graph builder available for language: ${language}. Supported languages: ${Array.from(this.graphBuilders.keys()).join(', ')}`],
          confidence: 0,
          metadata: {
            analyzer: this.name,
            version: this.version,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            detectedLanguage: language
          }
        };
      }

      // Detect framework for enhanced analysis using injected service
      const frameworkResult = await this.languageDetector.detectFramework(projectPath, language, this.logger);
      const framework = frameworkResult.framework;
      const buildConfig = await graphBuilder.getBuildConfig(projectPath);

      this.logger.info('Building dependency graph', { language, framework, projectPath });
      const graph = await graphBuilder.buildGraph(projectPath);
      
      if (graph.totalNodes === 0) {
        return {
          success: true,
          data: { circularPaths: [], summary: { totalPaths: 0, severity: 'none' } },
          warnings: ['No source files found in project'],
          confidence: 0.5,
          metadata: {
            analyzer: this.name,
            version: this.version,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            language,
            framework,
            buildConfig
          }
        };
      }

      this.logger.info('Detecting circular dependencies', { nodes: graph.totalNodes, edges: graph.totalEdges });
      const circularPaths = this.detectCircularDependencies(graph);

      const executionTime = Date.now() - startTime;
      this.metrics.increment('circular_dependency_scans_completed', { language, framework: framework || 'none' });
      this.metrics.histogram('circular_dependency_scan_duration', executionTime);
      this.metrics.gauge('circular_paths_found', circularPaths.length);
      this.metrics.gauge('dependency_graph_nodes', graph.totalNodes);
      this.metrics.gauge('dependency_graph_edges', graph.totalEdges);

      return {
        success: true,
        data: {
          circularPaths,
          summary: this.generateSummary(circularPaths),
          language,
          framework,
          buildConfig,
          graphStats: {
            totalNodes: graph.totalNodes,
            totalEdges: graph.totalEdges,
            complexity: this.calculateComplexity(graph)
          }
        },
        warnings: circularPaths.length > 0 ? [`Found ${circularPaths.length} circular dependencies`] : [],
        confidence: 0.9,
        metadata: {
          analyzer: this.name,
          version: this.version,
          executionTime,
          timestamp: new Date(),
          language,
          framework,
          supportedExtensions: graphBuilder.supportedExtensions,
          supportedFrameworks: graphBuilder.supportedFrameworks
        }
      };

    } catch (error) {
      this.logger.error('Circular dependency detection failed', error as Error);
      return {
        success: false,
        error: (error as Error).message,
        warnings: [],
        confidence: 0,
        metadata: {
          analyzer: this.name,
          version: this.version,
          executionTime: Date.now() - startTime,
          timestamp: new Date()
        }
      };
    }
  }

  // Language detection now handled by LanguageDetectionService

  async canHandle(input: any): Promise<boolean> {
    return input && (input.projectPath || typeof input === 'string');
  }

  protected async performValidation(input: any): Promise<boolean> {
    return this.canHandle(input);
  }

  protected async performAnalysis(
    input: { projectPath: string; language: string }
  ): Promise<IResult<AnalysisResult<CircularDependencyReport>>> {
    try {
      const startTime = Date.now();
      const { projectPath, language } = input;

      const graphBuilder = this.graphBuilders.get(language.toLowerCase());
      if (!graphBuilder) {
        return Result.failure(new Error(`Unsupported language for circular dependency detection: ${language}`));
      }

      this.logger.info('Building dependency graph', { language, projectPath });
      const graph = await graphBuilder.buildGraph(projectPath);

      this.logger.info('Detecting circular dependencies', { nodes: graph.totalNodes, edges: graph.totalEdges });
      const circularPaths = this.detectCircularDependencies(graph);

      const report: CircularDependencyReport = {
        circularPaths,
        totalCircularDependencies: circularPaths.length,
        severityDistribution: this.calculateSeverityDistribution(circularPaths),
        summary: {
          totalNodes: graph.totalNodes,
          totalEdges: graph.totalEdges,
          circularityRatio: circularPaths.length / graph.totalNodes,
          averagePathLength: circularPaths.length > 0 ? circularPaths.reduce((sum, path) => sum + path.nodes.length, 0) / circularPaths.length : 0
        },
        recommendations: this.generateRecommendations(circularPaths)
      };

      const executionTime = Date.now() - startTime;
      this.metrics.histogram('circular_dependency_analysis_duration', executionTime);
      this.metrics.gauge('circular_paths_found', circularPaths.length);

      return Result.success({
        success: true,
        data: report,
        warnings: circularPaths.length > 0 ? ['Circular dependencies detected'] : [],
        confidence: 0.9,
        metadata: {
          analyzer: this.name,
          version: this.version,
          executionTime,
          timestamp: new Date(),
          context: { language, nodes: graph.totalNodes, edges: graph.totalEdges }
        }
      });

    } catch (error) {
      this.logger.error('Circular dependency analysis failed', error as Error);
      return Result.failure(error as Error);
    }
  }

  private detectCircularDependencies(graph: DependencyGraph): CircularPath[] {
    const circularPaths: CircularPath[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const adjList = this.buildAdjacencyList(graph);

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = adjList.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            const cyclePath = path.slice(cycleStart);
            cyclePath.push(neighbor); // Complete the cycle

            circularPaths.push({
              nodes: cyclePath,
              severity: this.calculateCycleSeverity(cyclePath),
              description: `Circular dependency involving ${cyclePath.length} files: ${cyclePath.join(' → ')}`,
              resolution: this.suggestResolution(cyclePath)
            });
          }
        }
      }

      recursionStack.delete(node);
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    }

    return this.deduplicatePaths(circularPaths);
  }

  private buildAdjacencyList(graph: DependencyGraph): Map<string, string[]> {
    const adjList = new Map<string, string[]>();

    for (const node of graph.nodes) {
      adjList.set(node.id, []);
    }

    for (const edge of graph.edges) {
      const neighbors = adjList.get(edge.from) || [];
      neighbors.push(edge.to);
      adjList.set(edge.from, neighbors);
    }

    return adjList;
  }

  private calculateCycleSeverity(path: string[]): CircularPath['severity'] {
    const pathLength = path.length - 1; // Subtract 1 because path includes the repeated node

    if (pathLength <= 2) return 'low';
    if (pathLength <= 4) return 'medium';
    if (pathLength <= 6) return 'high';
    return 'critical';
  }

  private deduplicatePaths(paths: CircularPath[]): CircularPath[] {
    const seen = new Set<string>();
    return paths.filter(path => {
      // Normalize path by finding the lexicographically smallest rotation
      const normalized = this.normalizeCyclePath(path.nodes);
      const key = normalized.join('->');

      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private normalizeCyclePath(path: string[]): string[] {
    if (path.length <= 1) return path;

    // Remove the last element if it's the same as the first (completing the cycle)
    const cleanPath = path[path.length - 1] === path[0] ? path.slice(0, -1) : path;

    // Find the lexicographically smallest rotation
    let minRotation = cleanPath;
    for (let i = 1; i < cleanPath.length; i++) {
      const rotation = [...cleanPath.slice(i), ...cleanPath.slice(0, i)];
      if (rotation.join('') < minRotation.join('')) {
        minRotation = rotation;
      }
    }

    return minRotation;
  }

  // @ts-expect-error - Reserved for future use
  private getAffectedFiles(circularPaths: CircularPath[]): string[] {
    const affectedFiles = new Set<string>();
    for (const path of circularPaths) {
      for (const node of path.nodes) {
        affectedFiles.add(node);
      }
    }
    return Array.from(affectedFiles);
  }

  private calculateComplexity(graph: DependencyGraph): number {
    if (graph.totalNodes === 0) return 0;

    // Complexity metric based on edges to nodes ratio and clustering
    const density = graph.totalEdges / (graph.totalNodes * (graph.totalNodes - 1));
    const avgDependencies = graph.totalEdges / graph.totalNodes;

    return Math.min(density * 10 + avgDependencies / 5, 10);
  }


  /**
   * Generate a summary of circular dependency analysis
   */
  private generateSummary(circularPaths: CircularPath[]): any {
    const totalPaths = circularPaths.length;
    let severity: 'none' | 'low' | 'medium' | 'high' = 'none';

    if (totalPaths > 10) {
      severity = 'high';
    } else if (totalPaths > 5) {
      severity = 'medium';
    } else if (totalPaths > 0) {
      severity = 'low';
    }

    return {
      totalPaths,
      severity,
      affectedModules: new Set(circularPaths.flatMap(path => path.nodes)).size,
      recommendations: []
    };
  }

  private calculateSeverityDistribution(circularPaths: CircularPath[]): { low: number; medium: number; high: number; critical: number } {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    
    for (const path of circularPaths) {
      switch (path.severity) {
        case 'low':
          distribution.low++;
          break;
        case 'medium':
          distribution.medium++;
          break;
        case 'high':
          distribution.high++;
          break;
        case 'critical':
          distribution.critical++;
          break;
      }
    }
    
    return distribution;
  }

  private suggestResolution(cyclePath: string[]): string {
    if (cyclePath.length === 2) {
      return 'Consider merging the two files or extracting shared functionality to a third file';
    } else if (cyclePath.length === 3) {
      return 'Introduce an interface or abstract class to break the cycle';
    } else {
      return 'Consider architectural refactoring to reduce coupling between these modules';
    }
  }

  private generateRecommendations(circularPaths: CircularPath[]): string[] {
    const recommendations: string[] = [];

    if (circularPaths.length === 0) {
      recommendations.push('✅ No circular dependencies detected');
      return recommendations;
    }

    const criticalCount = circularPaths.filter(p => p.severity === 'critical').length;
    const highCount = circularPaths.filter(p => p.severity === 'high').length;

    if (criticalCount > 0) {
      recommendations.push(`🚨 CRITICAL: ${criticalCount} critical circular dependencies found`);
      recommendations.push('Refactor critical cycles immediately to prevent build and runtime issues');
    }

    if (highCount > 0) {
      recommendations.push(`⚠️ HIGH: ${highCount} high-severity circular dependencies found`);
    }

    if (circularPaths.length > 5) {
      recommendations.push('Consider architectural refactoring to reduce coupling');
      recommendations.push('Implement dependency injection or event-driven patterns');
    }

    recommendations.push('Use static analysis tools in CI/CD to prevent new circular dependencies');

    const shortestCycle = Math.min(...circularPaths.map(p => p.nodes.length));
    if (shortestCycle <= 2) {
      recommendations.push('Focus on breaking the shortest cycles first');
    }

    return recommendations;
  }
}