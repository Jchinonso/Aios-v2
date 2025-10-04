/**
 * Analysis Utilities - Helper functions for analysis operations
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for analysis-related utilities
 */

import type { IDetectedPattern, AnalysisResult, AnalysisMetadata } from '../file-system/types/analyzer.interface.js'
// PATTERN_THRESHOLDS removed - no longer used after removing filterByConfidence function

export class AnalysisUtils {
  /**
   * Calculate overall confidence from multiple patterns
   */
  static calculateOverallConfidence(patterns: IDetectedPattern[]): number {
    if (patterns.length === 0) return 0;

    const totalConfidence = patterns.reduce((sum, pattern) => sum + pattern.confidence, 0);
    return Math.min(totalConfidence / patterns.length, 1.0);
  }

  // Removed unused filterByConfidence and sortByConfidence functions

  /**
   * Group patterns by type
   */
  static groupPatternsByType(patterns: IDetectedPattern[]): Record<string, IDetectedPattern[]> {
    return patterns.reduce((groups, pattern) => {
      const type = pattern.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(pattern);
      return groups;
    }, {} as Record<string, IDetectedPattern[]>);
  }

  /**
   * Merge analysis results from multiple analyzers
   */
  static mergeAnalysisResults<T>(results: AnalysisResult<T>[]): AnalysisResult<T[]> {
    const successfulResults = results.filter(result => result.success);
    const failedResults = results.filter(result => !result.success);

    if (successfulResults.length === 0) {
      return {
        success: false,
        error: failedResults[0]?.error || 'All analyses failed',
        warnings: failedResults.flatMap(r => r.warnings),
        confidence: 0,
        metadata: this.createEmptyMetadata()
      };
    }

    return {
      success: true,
      data: successfulResults.map(r => r.data!),
      warnings: results.flatMap(r => r.warnings),
      confidence: this.calculateOverallConfidence(
        successfulResults.map(r => ({ 
          pattern: 'result',
          type: 'config' as const, 
          name: 'analysis-result',
          confidence: r.confidence, 
          location: { file: 'analysis', line: 1 },
          evidence: [],
          metadata: {}
        }))
      ),
      metadata: this.mergeMetadata(successfulResults.map(r => r.metadata))
    };
  }

  /**
   * Create standardized analysis metadata
   */
  static createAnalysisMetadata(
    analyzer: string,
    version: string,
    duration: number,
    context: any
  ): AnalysisMetadata {
    return {
      analyzer,
      version,
      executionTime: duration,
      timestamp: new Date(),
      context
    };
  }

  // Note: validateAnalysisConfig moved to ValidationUtils for better organization

  // Removed unused calculateComplexityScore function

  /**
   * Generate recommendations based on patterns
   */
  static generateRecommendations(patterns: IDetectedPattern[]): string[] {
    const recommendations: string[] = [];
    const groupedPatterns = this.groupPatternsByType(patterns);

    // Framework-specific recommendations
    if (groupedPatterns['framework']) {
      const frameworks = groupedPatterns['framework'].map(p => p.pattern);
      if (frameworks.length > 3) {
        recommendations.push('Consider consolidating frameworks to reduce complexity');
      }
    }

    // Language-specific recommendations
    if (groupedPatterns['language']) {
      const languages = groupedPatterns['language'].map(p => p.pattern);
      if (languages.length > 2) {
        recommendations.push('Multiple languages detected - ensure consistent tooling and practices');
      }
    }

    // Add pattern-specific recommendations
    patterns.forEach(_pattern => {
      // Note: IDetectedPattern doesn't have recommendations property
      // This would need to be handled differently in a real implementation
    });

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  private static createEmptyMetadata(): AnalysisMetadata {
    return {
      analyzer: 'unknown',
      version: '0.0.0',
      executionTime: 0,
      timestamp: new Date(),
      context: {}
    };
  }

  private static mergeMetadata(metadatas: AnalysisMetadata[]): AnalysisMetadata {
    if (metadatas.length === 0) return this.createEmptyMetadata();

    const totalDuration = metadatas.reduce((sum, meta) => sum + meta.executionTime, 0);
    const analyzers = metadatas.map(meta => meta.analyzer).join(', ');

    const firstMetadata = metadatas[0]!;
    return {
      analyzer: analyzers,
      version: firstMetadata.version,
      executionTime: totalDuration,
      timestamp: new Date(),
      context: firstMetadata.context || {}
    };
  }
}