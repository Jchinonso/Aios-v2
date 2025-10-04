/**
 * Unified Analyzer - Single analyzer using configuration-driven approach
 * 
 * This replaces all language-specific analyzers with a single, configuration-driven
 * analyzer that uses the analyzer-config system for all patterns and detection rules.
 * Now refactored to use shared services for language detection, file system operations,
 * and framework detection to eliminate redundancy and improve maintainability.
 * 
 * Following SOLID Principles:
 * - SRP: Single responsibility for project analysis using configuration
 * - OCP: Open for extension through configuration updates
 * - LSP: Substitutable for all language analyzers
 * - ISP: Focused interface for unified analysis
 * - DIP: Depends on abstractions and configuration
 */

import * as path from 'path';
import type { IResult } from '../../../core/types/result.js'
import { Result } from '../../../core/types/result.js'
import type { ILogger } from '../../../core/logging/logger.interface.js'
import type { IMetricsCollector } from '../../../core/metrics/metrics.interface.js'
import { BaseAnalyzer } from '../core/base-analyzer.js'
import type {
  IAnalyzer,
  AnalysisContext,
  AnalysisResult
} from '../types/analyzer.interface.js';
import type { AnalyzerConfig } from '../config/index.js'
import type { IUnifiedAnalyzerDependencies } from '../types/core-interfaces.js'
import {
  FileSystemService,
  LanguageDetectionService,
  DependencyAnalysisService,
  ProjectStructureAnalyzer,
  BuildConfigurationService,
  SecurityAnalysisService
} from '../services/index.js'
import { getSupportedLanguages, getLanguageDefinition } from '../config/analyzer-config/index.js'
import { CircularDependencyDetector } from './circular-dependency-detector.js'

/**
 * Analysis Constants - Centralized configuration for all magic numbers
 */
const ANALYSIS_CONSTANTS = {
  // Version
  VERSION: '2.0.0',
  
  // Confidence thresholds
  MIN_CONFIDENCE_THRESHOLD: 0.5,
  DEFAULT_LOW_CONFIDENCE: 0.1,
  MAX_CONFIDENCE_LIMIT: 0.9,
  FRAMEWORK_CONFIDENCE_LIMIT: 0.8,
  
  // Project size thresholds
  SMALL_PROJECT_MAX_DEPS: 10,
  MEDIUM_PROJECT_MAX_DEPS: 50,
  LARGE_PROJECT_MAX_DEPS: 100,
  
  // Complexity scoring
  COMPLEXITY_DEPENDENCY_THRESHOLD: 20,
  MODERATE_COMPLEXITY_MAX_SCORE: 2,
  COMPLEX_COMPLEXITY_MAX_SCORE: 3,
  
  // Framework detection
  FRAMEWORK_SCORE_NORMALIZER: 3,
  
  // Memory management
  MAX_CACHE_SIZE: 100,
  
  // Default values
  DEFAULT_OUTPUT_DIRECTORY: 'dist'
} as const;

/**
 * Unified project analysis result - comprehensive project information
 * 
 * This interface extends the base project info with additional analysis results
 * from the unified analyzer including circular dependencies, vulnerabilities,
 * and enhanced project structure analysis.
 */
export interface UnifiedProjectInfo {
  readonly language: string;
  readonly framework: string;
  readonly packageManager: string;
  readonly dependencies: Array<{
    name: string;
    version: string;
    type: 'runtime' | 'development' | 'peer' | 'optional' | 'build';
    isFramework: boolean;
    isBuildTool: boolean;
    isTestingTool: boolean;
  }>;
  readonly buildTools: string[];
  readonly testingFrameworks: string[];
  readonly projectStructure: {
    type: string;
    hasTests: boolean;
    hasDocumentation: boolean;
    sourceDirectories: string[];
    testDirectories: string[];
  };
  readonly manifestFiles: string[];
  readonly configFiles: string[];
  readonly lockFiles: string[];
  // Enhanced fields from project-analyzer.ts
  readonly buildCommand?: string;
  readonly outputDirectory?: string;
  readonly hasDatabase: boolean;
  readonly databaseType?: string;
  readonly testCommand?: string;
  readonly hasDockerfile: boolean;
  readonly hasCI: boolean;
  readonly environmentVariables: Array<{
    key: string;
    value?: string;
    isSecret: boolean;
    isRequired: boolean;
    description?: string;
  }>;
  readonly estimatedSize: 'small' | 'medium' | 'large' | 'enterprise';
  readonly complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  // Advanced analysis results
  readonly hasCircularDependencies: boolean;
  readonly circularDependencyCount: number;
  readonly circularDependencies: Array<{
    cycle: string[];
    severity: 'low' | 'medium' | 'high';
  }>;
  // Security analysis
  readonly hasVulnerabilities: boolean;
  readonly vulnerabilityCount: number;
  readonly vulnerabilities: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    file?: string;
    line?: number;
    recommendation: string;
  }>;
}

export class UnifiedAnalyzer extends BaseAnalyzer<string, UnifiedProjectInfo> implements IAnalyzer {
  private dependencies: IUnifiedAnalyzerDependencies;
  private circularDependencyDetector?: CircularDependencyDetector;

  // Extracted services (Phase 1 Refactoring)
  private readonly languageDetectionService: LanguageDetectionService;
  private readonly dependencyAnalysisService: DependencyAnalysisService;
  private readonly projectStructureAnalyzer: ProjectStructureAnalyzer;
  private readonly buildConfigurationService: BuildConfigurationService;
  private readonly securityAnalysisService: SecurityAnalysisService;

  constructor(
    // New DI approach
    dependencies?: IUnifiedAnalyzerDependencies,
    // Legacy approach (deprecated)
    logger?: ILogger,
    metrics?: IMetricsCollector,
    config?: AnalyzerConfig
  ) {
    // Always call super with required parameters, then handle dependencies
    super('UnifiedAnalyzer', ANALYSIS_CONSTANTS.VERSION, logger || dependencies?.logger as any, metrics || dependencies?.metrics as any, config);

    // Initialize extracted services (Phase 1 Refactoring)
    const analyzerConfig = config || this.getConfig();
    const serviceLogger = (logger || dependencies?.logger) as any;

    this.languageDetectionService = new LanguageDetectionService(serviceLogger);
    this.dependencyAnalysisService = new DependencyAnalysisService(serviceLogger, metrics || dependencies?.metrics as any);
    this.projectStructureAnalyzer = new ProjectStructureAnalyzer(analyzerConfig, serviceLogger);
    this.buildConfigurationService = new BuildConfigurationService(analyzerConfig, serviceLogger);
    this.securityAnalysisService = new SecurityAnalysisService(analyzerConfig, serviceLogger);

    // Use DI if provided, fall back to legacy
    if (dependencies) {
      this.dependencies = dependencies;
    } else {
      // Initialize shared services for legacy mode
      FileSystemService.initialize(logger!);
      
      // Use shared services instead of hardcoded implementations
      this.dependencies = {
        logger: logger as any,
        metrics: metrics as any,
        languageDetector: {
          detectLanguage: async (projectPath: string) => {
            // Use FileSystemService to detect language from files
            const files = await FileSystemService.getProjectFiles(projectPath);
            const extensions = files.map(f => f.split('.').pop()?.toLowerCase()).filter(Boolean);
            const languageCounts = new Map<string, number>();
            
            for (const ext of extensions) {
              const lang = getLanguageDefinition(ext || '')?.name;
              if (lang) {
                languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
              }
            }
            
            const [primaryLanguage] = Array.from(languageCounts.entries())
              .reduce((max, [lang, count]) => count > max[1] ? [lang, count] : max, ['unknown', 0]);
            
            return {
              language: primaryLanguage,
              confidence: 0.8,
              indicators: [`Detected from ${languageCounts.get(primaryLanguage)} files`],
              manifestFiles: [],
              sourceFiles: []
            };
          },
          detectFramework: async (projectPath: string, language: string) => {
            try {
              const frameworkPatterns = this.getFrameworkPatterns(language);
              const projectFiles = await FileSystemService.getProjectFiles(projectPath);
              const packageJsonPath = path.join(projectPath, 'package.json');
              const packageJson = await FileSystemService.fileExists(packageJsonPath) 
                ? JSON.parse(await FileSystemService.readFileContent(packageJsonPath))
                : null;
              
              let bestMatch: { framework: string; confidence: number; evidence: string[]; patterns: string[]; configFiles: string[] } = {
                framework: 'none',
                confidence: 0.1,
                evidence: ['No framework detected'],
                patterns: [],
                configFiles: []
              };

              for (const pattern of frameworkPatterns) {
                let confidence = 0;
                const evidence: string[] = [];
                const configFiles: string[] = [];

                // Check dependencies
                if (packageJson && pattern.dependencies) {
                  const hasDependency = pattern.dependencies.some(dep => 
                    packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
                  );
                  if (hasDependency) {
                    confidence += 0.4;
                    evidence.push(`Dependency found: ${pattern.dependencies.join(', ')}`);
                  }
                }

                // Check files
                if (pattern.files) {
                  const foundFiles = pattern.files.filter(file => 
                    projectFiles.some(projectFile => projectFile.includes(file))
                  );
                  if (foundFiles.length > 0) {
                    confidence += 0.3;
                    evidence.push(`Files found: ${foundFiles.join(', ')}`);
                    configFiles.push(...foundFiles);
                  }
                }

                // Check patterns in source files
                if (pattern.patterns) {
                  const sourceFiles = projectFiles.filter(file => 
                    file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx')
                  );
                  
                  let patternMatches = 0;
                  for (const sourceFile of sourceFiles.slice(0, 10)) { // Limit to first 10 files for performance
                    try {
                      const content = await FileSystemService.readFileContent(sourceFile);
                      const matches = pattern.patterns.filter(regex => 
                        new RegExp(regex, 'i').test(content)
                      );
                      if (matches.length > 0) {
                        patternMatches++;
                        evidence.push(`Patterns found in ${sourceFile}: ${matches.join(', ')}`);
                      }
                    } catch (error) {
                      // Skip files that can't be read
                    }
                  }
                  
                  if (patternMatches > 0) {
                    confidence += 0.3 * (patternMatches / Math.min(sourceFiles.length, 10));
                  }
                }

                // Update best match if this pattern has higher confidence
                if (confidence > bestMatch.confidence) {
                  bestMatch = {
                    framework: pattern.name,
                    confidence: Math.min(confidence, 1.0),
                    evidence,
                    patterns: pattern.patterns || [],
                    configFiles
                  };
                }
              }

              return bestMatch;
            } catch (error) {
              this.logger.warn('Framework detection failed', { error: (error as Error).message, projectPath, language });
              return {
                framework: 'none',
                confidence: 0.1,
                evidence: ['Framework detection failed'],
                patterns: [],
                configFiles: []
              };
            }
          },
          getSupportedLanguages: () => getSupportedLanguages(),
          isLanguageSupported: (language: string) => getSupportedLanguages().includes(language)
        }
      };
    }
  }

  async analyze(projectPath: string, _context: AnalysisContext): Promise<IResult<AnalysisResult<UnifiedProjectInfo>>> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting unified project analysis', { projectPath });

      const result = await this.executeWithRetry(
        () => this.analyzeProject(projectPath),
        'unified-analysis'
      );

      if (result.isFailure) {
        return Result.failure(result.error);
      }

      const duration = Date.now() - startTime;
      this.recordMetrics('analyze', true, duration);
      
      return this.createSuccessResult(
        result.value,
        duration,
        { projectPath, language: result.value.language, framework: result.value.framework }
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetrics('analyze', false, duration);
      
      return this.createFailureResult(
        `Unified analysis failed: ${(error as Error).message}`,
        duration,
        { projectPath }
      );
    }
  }

  async canHandle(projectPath: string): Promise<boolean> {
    try {
      // Use injected language detection service
      const languageResult = await this.dependencies.languageDetector.detectLanguage(projectPath, this.logger);
      return languageResult.language !== 'unknown' && languageResult.confidence > ANALYSIS_CONSTANTS.MIN_CONFIDENCE_THRESHOLD;
    } catch {
      return false;
    }
  }

  protected async performValidation(input: string): Promise<boolean> {
    return this.canHandle(input);
  }


  /**
   * Estimate project size based on files
   */
  private estimateProjectSize(files: string[]): 'small' | 'medium' | 'large' | 'enterprise' {
    const fileCount = files.length;
    if (fileCount < 10) return 'small';
    if (fileCount < 50) return 'medium';
    if (fileCount < 200) return 'large';
    return 'enterprise';
  }

  /**
   * Estimate project complexity based on dependencies
   */
  private estimateComplexity(dependencyCount: number): 'simple' | 'moderate' | 'complex' | 'advanced' {
    if (dependencyCount < 5) return 'simple';
    if (dependencyCount < 15) return 'moderate';
    if (dependencyCount < 30) return 'complex';
    return 'advanced';
  }


  /**
   * Detect circular dependencies in the project
   */
  private async detectCircularDependencies(projectPath: string, _files: string[]): Promise<{
    hasCircularDependencies: boolean;
    circularDependencyCount: number;
    circularDependencies: Array<{
      cycle: string[];
      severity: 'low' | 'medium' | 'high';
    }>;
  }> {
    try {
      // Initialize circular dependency detector if not already done
      if (!this.circularDependencyDetector) {
        this.circularDependencyDetector = new CircularDependencyDetector(
          this.logger as any,
          this.metrics as any,
          this.dependencies.languageDetector,
          {
            fileExists: FileSystemService.fileExists,
            readFileContent: FileSystemService.readFileContent
          } as any,
          {
            scanProject: FileSystemService.scanDirectory
          } as any
        );
      }

      // Check if the detector can handle this project
      if (!(await this.circularDependencyDetector.canHandle(projectPath))) {
        return {
          hasCircularDependencies: false,
          circularDependencyCount: 0,
          circularDependencies: []
        };
      }

      // Run circular dependency detection
      const result = await this.circularDependencyDetector.analyze(projectPath);

      if (result.isSuccess) {
        const analysisResult = result.value;
        const circularPaths = analysisResult.data?.circularPaths || [];
        
        return {
          hasCircularDependencies: circularPaths.length > 0,
          circularDependencyCount: circularPaths.length,
          circularDependencies: circularPaths.map((path: any) => ({
            cycle: path.nodes || [],
            severity: path.severity || 'low'
          }))
        };
      }

      return {
        hasCircularDependencies: false,
        circularDependencyCount: 0,
        circularDependencies: []
      };
    } catch (error) {
      this.logger.warn('Failed to detect circular dependencies', { error });
      return {
        hasCircularDependencies: false,
        circularDependencyCount: 0,
        circularDependencies: []
      };
    }
  }




  private async analyzeProject(projectPath: string): Promise<IResult<UnifiedProjectInfo>> {
    try {
      // Phase 1: Parallel execution with Promise.allSettled for graceful degradation
      const [scanResult, langResult] = await Promise.allSettled([
        FileSystemService.scanDirectory(projectPath),
        this.languageDetectionService.detectLanguage(projectPath)
      ]);

      // Handle scan failure
      if (scanResult.status === 'rejected') {
        this.logger.error('Directory scan failed', scanResult.reason);
        return Result.failure(new Error('Failed to scan project directory'));
      }

      const files = scanResult.value.files.map(f => f.path);

      // Handle language detection failure with fallback
      const language = langResult.status === 'fulfilled' ? langResult.value.language : 'unknown';

      // Phase 2: Framework detection
      const frameworkResult = await this.languageDetectionService.detectFramework(projectPath, language);
      const framework = frameworkResult.framework || 'unknown';

      // Phase 3: Dependency analysis with Promise.allSettled
      const [depResult, structResult] = await Promise.allSettled([
        this.dependencyAnalysisService.analyzeDependencies(projectPath),
        this.projectStructureAnalyzer.analyzeStructure(projectPath, files)
      ]);

      const dependencies = depResult.status === 'fulfilled' ? depResult.value.dependencies : [];
      const projectStructure = structResult.status === 'fulfilled' ? structResult.value : {
        type: 'unknown' as const,
        hasTests: false,
        hasDocumentation: false,
        sourceDirectories: [],
        testDirectories: [],
        configFiles: [],
        manifestFiles: [],
        lockFiles: []
      };

      // Phase 4: Build configuration with Promise.allSettled
      const configResult = await Promise.allSettled([
        this.buildConfigurationService.detectCompleteConfiguration(
          projectPath,
          framework,
          dependencies as unknown as Array<{ readonly isTestingTool: boolean }>
        )
      ]);

      const completeConfig = configResult[0]?.status === 'fulfilled' ? configResult[0].value : {
        build: {},
        test: { hasTests: false },
        docker: { hasDockerfile: false },
        ci: { hasCI: false },
        database: { hasDatabase: false },
        environmentVariables: []
      };

      // Phase 5: Security analysis with Promise.allSettled
      // Read package.json if it exists
      let packageJson: Record<string, unknown> | null = null;
      try {
        const packageJsonPath = `${projectPath}/package.json`;
        if (await FileSystemService.fileExists(packageJsonPath)) {
          const content = await FileSystemService.readFileContent(packageJsonPath);
          packageJson = JSON.parse(content) as Record<string, unknown>;
        }
      } catch {
        // Package.json doesn't exist or can't be parsed
      }

      const securityResult = await Promise.allSettled([
        this.securityAnalysisService.analyzeVulnerabilities(projectPath, packageJson)
      ]);

      const security = securityResult[0]?.status === 'fulfilled' ? securityResult[0].value : {
        hasVulnerabilities: false,
        vulnerabilityCount: 0,
        vulnerabilities: [],
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        securityScore: 100
      };

      // Phase 6: Circular dependency detection (keep existing logic)
      const circularDeps = await this.detectCircularDependencies(projectPath, files);

      // Aggregate results
      const projectInfo: UnifiedProjectInfo = {
        language,
        framework,
        packageManager: depResult.status === 'fulfilled' ? depResult.value.packageManager : 'unknown',
        dependencies: Array.from(dependencies),
        buildTools: Array.from(dependencies).filter(d => d.isBuildTool).map(d => d.name),
        testingFrameworks: Array.from(dependencies).filter(d => d.isTestingTool).map(d => d.name),
        projectStructure: {
          type: projectStructure.type,
          hasTests: projectStructure.hasTests,
          hasDocumentation: projectStructure.hasDocumentation,
          sourceDirectories: Array.from(projectStructure.sourceDirectories),
          testDirectories: Array.from(projectStructure.testDirectories)
        },
        manifestFiles: Array.from(projectStructure.manifestFiles),
        configFiles: Array.from(projectStructure.configFiles),
        lockFiles: Array.from(projectStructure.lockFiles),
        // Build configuration
        ...(completeConfig.build.buildCommand && { buildCommand: completeConfig.build.buildCommand }),
        ...(completeConfig.build.outputDirectory && { outputDirectory: completeConfig.build.outputDirectory }),
        ...(completeConfig.test.testCommand && { testCommand: completeConfig.test.testCommand }),
        // Infrastructure
        hasDockerfile: completeConfig.docker.hasDockerfile,
        hasCI: completeConfig.ci.hasCI,
        hasDatabase: completeConfig.database.hasDatabase,
        ...(completeConfig.database.databaseType && { databaseType: completeConfig.database.databaseType }),
        environmentVariables: Array.from(completeConfig.environmentVariables),
        // Metrics
        estimatedSize: this.estimateProjectSize(files),
        complexity: this.estimateComplexity(dependencies.length),
        // Circular dependencies
        hasCircularDependencies: circularDeps.hasCircularDependencies,
        circularDependencyCount: circularDeps.circularDependencyCount,
        circularDependencies: circularDeps.circularDependencies,
        // Security
        hasVulnerabilities: security.hasVulnerabilities,
        vulnerabilityCount: security.vulnerabilityCount,
        vulnerabilities: Array.from(security.vulnerabilities)
      };

      return Result.success(projectInfo);
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  // All analysis methods extracted to services (Phase 1 Refactoring):
  // - Language detection -> LanguageDetectionService
  // - Framework detection -> LanguageDetectionService
  // - Dependency analysis -> DependencyAnalysisService
  // - Project structure -> ProjectStructureAnalyzer
  // - Build configuration -> BuildConfigurationService
  // - Test configuration -> BuildConfigurationService
  // - Database detection -> BuildConfigurationService
  // - Docker configuration -> BuildConfigurationService
  // - CI configuration -> BuildConfigurationService
  // - Environment variables -> BuildConfigurationService
  // - Security analysis -> SecurityAnalysisService

}
