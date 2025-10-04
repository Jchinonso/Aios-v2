import type { ProgrammingLanguage, FrameworkType, PackageManager, ProjectSize, ProjectComplexity } from '../../types/common.types.js';
import type { ProjectAnalysis } from '../types/deployment.types.js';
import { UnifiedAnalyzer } from '../../intelligence/file-system/analyzers/unified-analyzer.js';
import type { ILogger } from '../../core/logging/logger.interface.js';
import type { IMetricsCollector } from '../../core/metrics/metrics.interface.js';

export class UnifiedProjectAnalyzerService {
  private readonly unifiedAnalyzer: UnifiedAnalyzer;

  constructor(
    _dependencies: { logger: ILogger; metrics: IMetricsCollector } | undefined,
    logger: ILogger,
    metrics: IMetricsCollector
  ) {
    // UnifiedAnalyzer has its own internal language detection service
    // No need for mock implementations - it handles everything internally
    this.unifiedAnalyzer = new UnifiedAnalyzer(undefined, logger, metrics);
  }

  async analyzeForDeployment(projectPath: string): Promise<ProjectAnalysis> {
    const result = await this.unifiedAnalyzer.analyze(projectPath, {
      requestId: `deploy-${Date.now()}`,
      timestamp: new Date()
    });

    if (!result.isSuccess || !result.value?.data) {
      throw new Error('Project analysis failed');
    }

    const info = result.value.data;

    // UnifiedAnalyzer already provides everything we need - just convert format
    return {
      framework: info.framework as FrameworkType,
      language: info.language as ProgrammingLanguage,
      packageManager: info.packageManager as PackageManager,
      dependencies: info.dependencies.map(dep => ({
        name: dep.name,
        version: dep.version,
        type: 'runtime',
        isFramework: dep.isFramework,
        isBuildTool: dep.isBuildTool,
        isTestingTool: dep.isTestingTool
      })),
      buildCommand: info.buildCommand,
      outputDirectory: info.outputDirectory,
      environmentVariables: info.environmentVariables.map(env => ({
        key: env.key,
        value: env.value,
        required: env.isRequired,
        isSecret: env.isSecret,
        description: env.description
      })),
      size: info.estimatedSize as ProjectSize,
      complexity: info.complexity as ProjectComplexity,
      estimatedBuildTime: this.estimateBuildTime(info.dependencies.length),
      recommendations: []
    };
  }

  private estimateBuildTime(depCount: number): number {
    return Math.max(30, Math.min(300, depCount * 2));
  }
}