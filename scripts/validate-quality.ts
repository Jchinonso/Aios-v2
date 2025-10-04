/**
 * @fileoverview Enterprise Code Quality Validator
 * @description Comprehensive code quality analysis tool for enterprise-grade TypeScript projects
 * 
 * This tool analyzes code quality metrics including:
 * - Cyclomatic complexity
 * - Cognitive complexity  
 * - Maintainability index
 * - Technical debt estimation
 * - Code smell detection
 * - Test coverage estimation
 * 
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import * as fs from 'fs';
import { glob } from 'glob';

/**
 * Quality thresholds for enterprise-grade code
 */
interface IQualityThresholds {
  cyclomaticComplexity: {
    excellent: number;
    good: number;
    acceptable: number;
  };
  cognitiveComplexity: {
    excellent: number;
    good: number;
    acceptable: number;
  };
  maintainabilityIndex: {
    excellent: number;
    good: number;
    acceptable: number;
  };
  linesOfCode: {
    file: {
      excellent: number;
      good: number;
      acceptable: number;
    };
    method: {
      max: number;
    };
  };
}

/**
 * Code quality metrics interface
 */
interface IQualityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  testCoverage: number;
  duplicatedLines: number;
  codeSmells: ICodeSmell[];
}

/**
 * Code smell types
 */
enum CodeSmellTypeEnum {
  LONG_METHOD = 'LONG_METHOD',
  LARGE_PARAMETER_LIST = 'LARGE_PARAMETER_LIST',
  GOD_CLASS = 'GOD_CLASS',
  DEAD_CODE = 'DEAD_CODE',
  PRIMITIVE_OBSESSION = 'PRIMITIVE_OBSESSION',
  DUPLICATE_CODE = 'DUPLICATE_CODE',
}

/**
 * Severity levels
 */
enum SeverityEnum {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  INFO = 'INFO',
}

/**
 * Code smell interface
 */
interface ICodeSmell {
  type: CodeSmellTypeEnum;
  severity: SeverityEnum;
  file: string;
  line: number;
  message: string;
  suggestion: string;
}

/**
 * Code grade levels
 */
enum CodeGradeEnum {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

/**
 * File analysis result
 */
interface IFileAnalysisResultType {
  file: string;
  grade: CodeGradeEnum;
  metrics: IQualityMetrics;
  recommendations: string[];
}

/**
 * Enterprise Code Quality Analyzer
 * 
 * Provides comprehensive code quality analysis with enterprise-grade standards
 */
class EnterpriseQualityAnalyzer {
  private readonly _qualityThresholds: IQualityThresholds = {
    cyclomaticComplexity: {
      excellent: 5,
      good: 10,
      acceptable: 15,
    },
    cognitiveComplexity: {
      excellent: 8,
      good: 15,
      acceptable: 25,
    },
    maintainabilityIndex: {
      excellent: 80,
      good: 60,
      acceptable: 40,
    },
    linesOfCode: {
      file: {
        excellent: 200,
        good: 500,
        acceptable: 1000,
      },
      method: {
        max: 20,
      },
    },
  };

  /**
   * Analyzes the entire codebase for quality metrics
   */
  public async analyzeCodebase(pattern: string): Promise<IFileAnalysisResultType[]> {
    const files = await glob(pattern, { cwd: process.cwd() });
    const results: IFileAnalysisResultType[] = [];

    for (const file of files) {
      try {
        const result = await this.analyzeFile(file);
        results.push(result);
      } catch (error) {
        console.warn(`Failed to analyze ${file}: ${(error as Error).message}`);
      }
    }

    return results;
  }

  /**
   * Analyzes a single file for quality metrics
   */
  private async analyzeFile(filePath: string): Promise<IFileAnalysisResultType> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Calculate metrics
    const cyclomaticComplexity = this._calculateCyclomaticComplexity(content);
    const cognitiveComplexity = this._calculateCognitiveComplexity(content);
    const linesOfCode = this._calculateLinesOfCode(lines);
    const maintainabilityIndex = this._calculateMaintainabilityIndex(
      cyclomaticComplexity,
      linesOfCode,
      content.length,
    );
    const technicalDebt = this._calculateTechnicalDebt(
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode,
    );
    const testCoverage = this._estimateTestCoverage(content);
    const duplicatedLines = this._detectDuplicatedLines(lines);
    const codeSmells = this._detectCodeSmells(content, lines, filePath);

    const metrics: IQualityMetrics = {
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode,
      maintainabilityIndex,
      technicalDebt,
      testCoverage,
      duplicatedLines,
      codeSmells,
    };

    const grade = this._calculateGrade(metrics);
    const recommendations = this._generateRecommendations(metrics, codeSmells);

    return {
      file: filePath,
      grade,
      metrics,
      recommendations,
    };
  }

  /**
   * Calculates cyclomatic complexity based on decision points
   */
  private _calculateCyclomaticComplexity(content: string): number {
    const decisionPoints = [
      /\bif\b/g,
      /\belse\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\band\b/g,
      /\bor\b/g,
      /\?/g,
      /&&/g,
      /\|\|/g,
    ];

    let complexity = 1; // Base complexity

    for (const pattern of decisionPoints) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Calculates cognitive complexity (how hard the code is to understand)
   */
  private _calculateCognitiveComplexity(content: string): number {
    let complexity = 0;
    let nestingLevel = 0;

    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Increase nesting for blocks
      if (trimmed.includes('{')) {
        nestingLevel++;
      }
      if (trimmed.includes('}')) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }

      // Add complexity for control structures
      const controlStructures = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch'];
      const hasControlStructure = controlStructures.some(keyword =>
        new RegExp(`\\b${keyword}\\b`).test(trimmed),
      );

      if (hasControlStructure) {
        complexity += 1 + nestingLevel; // Base + nesting penalty
      }

      // Add complexity for logical operators
      const logicalOps = ['&&', '||', '?'];
      for (const op of logicalOps) {
        const matches = trimmed.split(op).length - 1;
        complexity += matches;
      }
    }

    return complexity;
  }

  /**
   * Calculates effective lines of code (excluding comments and empty lines)
   */
  private _calculateLinesOfCode(lines: string[]): number {
    return lines.filter(line => {
      const trimmed = line.trim();
      return (
        trimmed.length > 0 &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('*') &&
        trimmed !== '*/'
      );
    }).length;
  }

  /**
   * Calculates maintainability index using industry-standard formula
   */
  private _calculateMaintainabilityIndex(
    cyclomaticComplexity: number,
    linesOfCode: number,
    halsteadVolume: number,
  ): number {
    // Simplified Halstead volume calculation
    const volume = Math.log2(halsteadVolume || 1000);

    // Microsoft's maintainability index formula (simplified)
    const mi =
      171 -
      5.2 * Math.log(volume) -
      0.23 * cyclomaticComplexity -
      16.2 * Math.log(linesOfCode || 1);

    return Math.max(0, Math.min(100, mi));
  }

  /**
   * Estimates technical debt in hours based on quality metrics
   */
  private _calculateTechnicalDebt(
    cyclomaticComplexity: number,
    cognitiveComplexity: number,
    linesOfCode: number,
  ): number {
    let debt = 0;

    // Complexity debt
    if (cyclomaticComplexity > this._qualityThresholds.cyclomaticComplexity.good) {
      debt += (cyclomaticComplexity - this._qualityThresholds.cyclomaticComplexity.good) * 0.5;
    }

    if (cognitiveComplexity > this._qualityThresholds.cognitiveComplexity.good) {
      debt += (cognitiveComplexity - this._qualityThresholds.cognitiveComplexity.good) * 0.75;
    }

    // Size debt
    if (linesOfCode > this._qualityThresholds.linesOfCode.file.good) {
      debt += (linesOfCode - this._qualityThresholds.linesOfCode.file.good) * 0.02;
    }

    return Math.round(debt * 100) / 100;
  }

  /**
   * Estimates test coverage based on test-related patterns
   */
  private _estimateTestCoverage(content: string): number {
    // This is a simplified estimation - in real projects, use actual coverage tools
    const testPatterns = [
      /describe\(/g,
      /it\(/g,
      /test\(/g,
      /expect\(/g,
      /assert\(/g,
      /\.test\./g,
      /\.spec\./g,
    ];

    let testIndicators = 0;
    for (const pattern of testPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        testIndicators += matches.length;
      }
    }

    // Rough estimation based on test patterns found
    return Math.min(100, testIndicators * 10);
  }

  /**
   * Detects duplicated code blocks
   */
  private _detectDuplicatedLines(lines: string[]): number {
    const lineMap = new Map<string, number>();
    let duplicates = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 20) {
        // Only consider substantial lines
        const count = lineMap.get(trimmed) || 0;
        lineMap.set(trimmed, count + 1);
        if (count > 0) {
          duplicates++;
        }
      }
    }

    return duplicates;
  }

  /**
   * Detects various code smells that indicate poor code quality
   */
  private _detectCodeSmells(content: string, lines: string[], filePath: string): ICodeSmell[] {
    const smells: ICodeSmell[] = [];

    // Long method detection
    smells.push(...this._detectLongMethods(lines, filePath));

    // Large parameter list detection
    smells.push(...this._detectLargeParameterLists(content, filePath));

    // God class detection
    smells.push(...this._detectGodClasses(content, filePath));

    // Dead code detection
    smells.push(...this._detectDeadCode(content, filePath));

    // Primitive obsession
    smells.push(...this._detectPrimitiveObsession(content, filePath));

    return smells;
  }

  private _detectLongMethods(lines: string[], filePath: string): ICodeSmell[] {
    const smells: ICodeSmell[] = [];
    let currentMethod: { start: number; name: string } | null = null;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();

      // Detect method start
      const methodMatch = line.match(/^(?:public|private|protected)?\s*(?:static)?\s*(?:async)?\s*(\w+)\s*\(/);
      if (methodMatch && line.includes('{')) {
        currentMethod = { start: i, name: methodMatch[1]! };
        braceCount = 1;
        continue;
      }

      if (currentMethod) {
        // Count braces to find method end
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        if (braceCount === 0) {
          const methodLength = i - currentMethod.start + 1;
          if (methodLength > this._qualityThresholds.linesOfCode.method.max) {
            smells.push({
              type: CodeSmellTypeEnum.LONG_METHOD,
              severity: methodLength > 40 ? SeverityEnum.CRITICAL : SeverityEnum.MAJOR,
              file: filePath,
              line: currentMethod.start + 1,
              message: `Method '${currentMethod.name}' is too long (${methodLength} lines)`,
              suggestion: 'Extract smaller methods to improve readability and maintainability',
            });
          }
          currentMethod = null;
        }
      }
    }

    return smells;
  }

  private _detectLargeParameterLists(content: string, filePath: string): ICodeSmell[] {
    const smells: ICodeSmell[] = [];
    const functionPattern = /function\s+(\w+)\s*\(([^)]+)\)|(?:const|let)\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g;

    let match;
    while ((match = functionPattern.exec(content)) !== null) {
      const params = match[2] || match[3] || '';
      const paramCount = params.split(',').filter(p => p.trim().length > 0).length;

      if (paramCount > 4) {
        const functionName = match[1] || match[3] || 'anonymous';
        const lineNumber = content.substring(0, match.index).split('\n').length;

        smells.push({
          type: CodeSmellTypeEnum.LARGE_PARAMETER_LIST,
          severity: paramCount > 6 ? SeverityEnum.MAJOR : SeverityEnum.MINOR,
          file: filePath,
          line: lineNumber,
          message: `Function '${functionName}' has too many parameters (${paramCount})`,
          suggestion: 'Consider using parameter objects or dependency injection',
        });
      }
    }

    return smells;
  }

  private _detectGodClasses(content: string, filePath: string): ICodeSmell[] {
    const smells: ICodeSmell[] = [];
    const classMatches = content.match(/class\s+(\w+)/g);

    if (classMatches) {
      const methodCount = (content.match(/^\s*(?:public|private|protected)?\s*(?:static)?\s*\w+\s*\(/gm) || []).length;
      const lineCount = content.split('\n').length;

      if (methodCount > 20 || lineCount > 500) {
        smells.push({
          type: CodeSmellTypeEnum.GOD_CLASS,
          severity: SeverityEnum.MAJOR,
          file: filePath,
          line: 1,
          message: `Class appears to be a God class (${methodCount} methods, ${lineCount} lines)`,
          suggestion: 'Split into smaller, more focused classes following Single Responsibility Principle',
        });
      }
    }

    return smells;
  }

  private _detectDeadCode(content: string, filePath: string): ICodeSmell[] {
    const smells: ICodeSmell[] = [];

    // Detect unused imports (simplified)
    const importPattern = /import\s*{([^}]+)}\s*from/g;
    let match;

    while ((match = importPattern.exec(content)) !== null) {
      const imports = match[1]!.split(',').map(imp => imp.trim());
      const lineNumber = content.substring(0, match.index).split('\n').length;

      for (const imp of imports) {
        if (!content.includes(imp, match.index! + match[0]!.length)) {
          smells.push({
            type: CodeSmellTypeEnum.DEAD_CODE,
            severity: SeverityEnum.MINOR,
            file: filePath,
            line: lineNumber,
            message: `Unused import: ${imp}`,
            suggestion: 'Remove unused imports to keep code clean',
          });
        }
      }
    }

    return smells;
  }

  private _detectPrimitiveObsession(content: string, filePath: string): ICodeSmell[] {
    const smells: ICodeSmell[] = [];

    // Look for methods with many primitive parameters
    const primitiveParams = content.match(/function\s+\w+\s*\([^)]*(?:string|number|boolean)[^)]*(?:string|number|boolean)[^)]*(?:string|number|boolean)[^)]*\)/g);

    if (primitiveParams && primitiveParams.length > 0) {
      smells.push({
        type: CodeSmellTypeEnum.PRIMITIVE_OBSESSION,
        severity: SeverityEnum.MINOR,
        file: filePath,
        line: 1,
        message: 'Multiple functions use many primitive parameters',
        suggestion: 'Consider creating value objects or data classes',
      });
    }

    return smells;
  }

  /**
   * Calculates overall code grade based on quality metrics
   */
  private _calculateGrade(metrics: Omit<IQualityMetrics, 'codeSmells'>): CodeGradeEnum {
    let score = 100;

    // Deduct points for complexity
    if (metrics.cyclomaticComplexity > this._qualityThresholds.cyclomaticComplexity.excellent) {
      score -= (metrics.cyclomaticComplexity - this._qualityThresholds.cyclomaticComplexity.excellent) * 3;
    }

    if (metrics.cognitiveComplexity > this._qualityThresholds.cognitiveComplexity.excellent) {
      score -= (metrics.cognitiveComplexity - this._qualityThresholds.cognitiveComplexity.excellent) * 4;
    }

    // Factor in maintainability index
    score = (score + metrics.maintainabilityIndex) / 2;

    // Deduct for technical debt
    score -= metrics.technicalDebt * 2;

    // Deduct for duplicated lines
    score -= metrics.duplicatedLines * 0.5;

    if (score >= 90) return CodeGradeEnum.A;
    if (score >= 80) return CodeGradeEnum.B;
    if (score >= 70) return CodeGradeEnum.C;
    if (score >= 60) return CodeGradeEnum.D;
    return CodeGradeEnum.F;
  }

  /**
   * Generates actionable recommendations based on analysis
   */
  private _generateRecommendations(metrics: Omit<IQualityMetrics, 'codeSmells'>, codeSmells: ICodeSmell[]): string[] {
    const recommendations: string[] = [];

    if (metrics.cyclomaticComplexity > this._qualityThresholds.cyclomaticComplexity.good) {
      recommendations.push('Reduce cyclomatic complexity by extracting methods and simplifying conditional logic');
    }

    if (metrics.cognitiveComplexity > this._qualityThresholds.cognitiveComplexity.good) {
      recommendations.push('Reduce cognitive complexity by avoiding deep nesting and complex expressions');
    }

    if (metrics.linesOfCode > this._qualityThresholds.linesOfCode.file.good) {
      recommendations.push('Consider splitting this file into smaller, more focused modules');
    }

    if (metrics.maintainabilityIndex < this._qualityThresholds.maintainabilityIndex.good) {
      recommendations.push('Improve maintainability by refactoring complex logic and adding documentation');
    }

    if (metrics.technicalDebt > 5) {
      recommendations.push(
        `Address technical debt (${metrics.technicalDebt} hours estimated) through systematic refactoring`,
      );
    }

    // Add specific recommendations based on code smells
    const smellTypes = new Set(codeSmells.map(smell => smell.type));

    if (smellTypes.has(CodeSmellTypeEnum.LONG_METHOD)) {
      recommendations.push('Extract smaller methods from long methods to improve readability');
    }

    if (smellTypes.has(CodeSmellTypeEnum.LARGE_PARAMETER_LIST)) {
      recommendations.push('Replace large parameter lists with parameter objects or builders');
    }

    if (smellTypes.has(CodeSmellTypeEnum.GOD_CLASS)) {
      recommendations.push('Apply Single Responsibility Principle by splitting large classes');
    }

    return recommendations;
  }

  /**
   * Generates a comprehensive quality report
   */
  public generateReport(results: IFileAnalysisResultType[]): void {
    console.log('\n🏆 Enterprise Code Quality Report\n');
    console.log('='.repeat(50));

    // Overall statistics
    const totalFiles = results.length;
    const gradeDistribution = this._calculateGradeDistribution(results);
    const averageMetrics = this._calculateAverageMetrics(results);

    console.log(`\n📊 Overall Statistics:`);
    console.log(`   Files analyzed: ${totalFiles}`);
    console.log(`   Grade A (Senior): ${gradeDistribution.A} (${((gradeDistribution.A / totalFiles) * 100).toFixed(1)}%)`);
    console.log(`   Grade B (Mid-Senior): ${gradeDistribution.B} (${((gradeDistribution.B / totalFiles) * 100).toFixed(1)}%)`);
    console.log(`   Grade C (Mid): ${gradeDistribution.C} (${((gradeDistribution.C / totalFiles) * 100).toFixed(1)}%)`);
    console.log(`   Grade D (Junior): ${gradeDistribution.D} (${((gradeDistribution.D / totalFiles) * 100).toFixed(1)}%)`);
    console.log(`   Grade F (Failing): ${gradeDistribution.F} (${((gradeDistribution.F / totalFiles) * 100).toFixed(1)}%)`);

    console.log(`\n📈 Average Metrics:`);
    console.log(`   Cyclomatic Complexity: ${averageMetrics.cyclomaticComplexity.toFixed(1)}`);
    console.log(`   Cognitive Complexity: ${averageMetrics.cognitiveComplexity.toFixed(1)}`);
    console.log(`   Lines of Code: ${averageMetrics.linesOfCode.toFixed(0)}`);
    console.log(`   Maintainability Index: ${averageMetrics.maintainabilityIndex.toFixed(1)}`);
    console.log(`   Technical Debt: ${averageMetrics.technicalDebt.toFixed(1)} hours`);

    // Files needing attention
    const poorFiles = results.filter(r => r.grade === CodeGradeEnum.D || r.grade === CodeGradeEnum.F);
    if (poorFiles.length > 0) {
      console.log(`\n🚨 Files Requiring Immediate Attention:`);
      poorFiles.forEach(file => {
        console.log(`   ${file.grade} - ${file.file}`);
        console.log(`       Complexity: ${file.metrics.cyclomaticComplexity}, Debt: ${file.metrics.technicalDebt}h`);
        if (file.recommendations.length > 0) {
          console.log(`       Priority: ${file.recommendations[0]}`);
        }
      });
    }

    // Code smells summary
    const allSmells = results.flatMap(r => r.metrics.codeSmells);
    const smellSummary = this._summarizeCodeSmells(allSmells);

    if (allSmells.length > 0) {
      console.log(`\n🔍 Code Smells Detected (${allSmells.length} total):`);
      Object.entries(smellSummary).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }

    // Senior developer benchmark
    const seniorGradePercentage = (gradeDistribution.A / totalFiles) * 100;
    console.log(`\n🎯 Senior Developer Benchmark:`);
    if (seniorGradePercentage >= 80) {
      console.log(`   ✅ EXCELLENT: ${seniorGradePercentage.toFixed(1)}% of code meets senior standards`);
    } else if (seniorGradePercentage >= 60) {
      console.log(`   🟡 GOOD: ${seniorGradePercentage.toFixed(1)}% of code meets senior standards`);
    } else {
      console.log(`   🔴 NEEDS IMPROVEMENT: Only ${seniorGradePercentage.toFixed(1)}% of code meets senior standards`);
    }

    console.log('\n' + '='.repeat(50));
  }

  private _calculateGradeDistribution(results: IFileAnalysisResultType[]): Record<CodeGradeEnum, number> {
    return results.reduce(
      (acc, result) => {
        acc[result.grade]++;
        return acc;
      },
      { A: 0, B: 0, C: 0, D: 0, F: 0 } as Record<CodeGradeEnum, number>,
    );
  }

  private _calculateAverageMetrics(results: IFileAnalysisResultType[]): Omit<IQualityMetrics, 'codeSmells'> {
    const totals = results.reduce(
      (acc, result) => {
        acc.cyclomaticComplexity += result.metrics.cyclomaticComplexity;
        acc.cognitiveComplexity += result.metrics.cognitiveComplexity;
        acc.linesOfCode += result.metrics.linesOfCode;
        acc.maintainabilityIndex += result.metrics.maintainabilityIndex;
        acc.technicalDebt += result.metrics.technicalDebt;
        acc.testCoverage += result.metrics.testCoverage;
        acc.duplicatedLines += result.metrics.duplicatedLines;
        return acc;
      },
      {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        linesOfCode: 0,
        maintainabilityIndex: 0,
        technicalDebt: 0,
        testCoverage: 0,
        duplicatedLines: 0,
      },
    );

    const count = results.length;
    return {
      cyclomaticComplexity: totals.cyclomaticComplexity / count,
      cognitiveComplexity: totals.cognitiveComplexity / count,
      linesOfCode: totals.linesOfCode / count,
      maintainabilityIndex: totals.maintainabilityIndex / count,
      technicalDebt: totals.technicalDebt / count,
      testCoverage: totals.testCoverage / count,
      duplicatedLines: totals.duplicatedLines / count,
    };
  }

  private _summarizeCodeSmells(smells: ICodeSmell[]): Record<string, number> {
    return smells.reduce(
      (acc, smell) => {
        acc[smell.type] = (acc[smell.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const pattern = args[0] || '**/*.{ts,js,tsx,jsx}';
  const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1];

  console.log('🔍 Analyzing codebase for enterprise-grade quality standards...');
  console.log(`Pattern: ${pattern}\n`);

  const analyzer = new EnterpriseQualityAnalyzer();
  const results = await analyzer.analyzeCodebase(pattern);

  analyzer.generateReport(results);

  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${outputFile}`);
  }

  // Exit with appropriate code based on overall quality
  const gradeDistribution = results.reduce(
    (acc, result) => {
      acc[result.grade]++;
      return acc;
    },
    { A: 0, B: 0, C: 0, D: 0, F: 0 } as Record<CodeGradeEnum, number>,
  );

  const seniorPercentage = (gradeDistribution.A / results.length) * 100;
  process.exit(seniorPercentage >= 80 ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

export { EnterpriseQualityAnalyzer };
export type { IQualityMetrics, ICodeSmell, CodeGradeEnum };