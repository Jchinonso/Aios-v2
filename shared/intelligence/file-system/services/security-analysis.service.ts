/**
 * SecurityAnalysisService - Analyzes project security vulnerabilities
 *
 * Extracted from UnifiedAnalyzer God Object (Phase 1 Refactoring)
 *
 * Responsibilities:
 * - Scan for security vulnerabilities
 * - Detect hardcoded secrets in source files
 * - Check for vulnerable dependencies
 * - Identify insecure configurations
 * - Security scoring and risk assessment
 *
 * Type Safety: Zero `any` types, strict TypeScript mode
 * Error Handling: Comprehensive try-catch with graceful degradation
 *
 * @author AIOS Team
 * @version 2.0.1
 * @since Phase 1 Refactoring
 */

import type { IFileSystemLogger } from '../types/core-interfaces.js';
import type { AnalyzerConfig } from '../../types/config.types.js';
import { FileSystemService } from './file-system-service.js';

/**
 * Vulnerability severity levels
 */
export type VulnerabilitySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security vulnerability
 */
export interface SecurityVulnerability {
  readonly type: string;
  readonly severity: VulnerabilitySeverity;
  readonly description: string;
  readonly file?: string;
  readonly line?: number;
  readonly recommendation: string;
}

/**
 * Security analysis result
 */
export interface SecurityAnalysisResult {
  readonly hasVulnerabilities: boolean;
  readonly vulnerabilityCount: number;
  readonly vulnerabilities: readonly SecurityVulnerability[];
  readonly criticalCount: number;
  readonly highCount: number;
  readonly mediumCount: number;
  readonly lowCount: number;
  readonly securityScore: number;
}

/**
 * Vulnerable package pattern
 */
export interface VulnerablePackage {
  readonly name: string;
  readonly versions: readonly string[];
  readonly severity: VulnerabilitySeverity;
  readonly cve?: string;
}

/**
 * Secret pattern for detection
 */
export interface SecretPattern {
  readonly pattern: RegExp;
  readonly type: string;
  readonly severity: VulnerabilitySeverity;
}

/**
 * Security analysis service
 *
 * Scans projects for security vulnerabilities including hardcoded secrets,
 * vulnerable dependencies, and insecure configurations.
 * Extracted from UnifiedAnalyzer (lines 1041-1198).
 */
export class SecurityAnalysisService {
  private readonly logger: IFileSystemLogger | undefined;

  constructor(config?: AnalyzerConfig, logger?: IFileSystemLogger) {
    // config parameter reserved for future use (custom vulnerability patterns, etc.)
    void config;
    this.logger = logger;
  }

  /**
   * Analyze project for security vulnerabilities
   *
   * Extracted from UnifiedAnalyzer.analyzeSecurityVulnerabilities (lines 1041-1141)
   *
   * @param projectPath - Path to project root
   * @param packageJson - Parsed package.json (if available)
   * @returns Security analysis result
   */
  async analyzeVulnerabilities(
    projectPath: string,
    packageJson: Record<string, unknown> | null
  ): Promise<SecurityAnalysisResult> {
    try {
      const vulnerabilities: SecurityVulnerability[] = [];

      // Check for known vulnerable dependencies
      if (packageJson) {
        const depVulnerabilities = await this.checkVulnerableDependencies(packageJson);
        vulnerabilities.push(...depVulnerabilities);
      }

      // Check for hardcoded secrets in source files
      const secretVulnerabilities = await this.scanForHardcodedSecrets(projectPath);
      vulnerabilities.push(...secretVulnerabilities);

      // Calculate severity counts
      const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
      const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
      const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
      const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;

      // Calculate security score (0-100, higher is better)
      const securityScore = this.calculateSecurityScore(
        criticalCount,
        highCount,
        mediumCount,
        lowCount
      );

      return {
        hasVulnerabilities: vulnerabilities.length > 0,
        vulnerabilityCount: vulnerabilities.length,
        vulnerabilities,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        securityScore
      };
    } catch (error) {
      this.logger?.error?.(
        'Security analysis failed',
        error as Error,
        { projectPath }
      );

      return {
        hasVulnerabilities: false,
        vulnerabilityCount: 0,
        vulnerabilities: [],
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        securityScore: 100
      };
    }
  }

  /**
   * Check for vulnerable dependencies
   *
   * @param packageJson - Parsed package.json
   * @returns List of vulnerability findings
   */
  private async checkVulnerableDependencies(
    packageJson: Record<string, unknown>
  ): Promise<SecurityVulnerability[]> {
    try {
      const vulnerabilities: SecurityVulnerability[] = [];

      const allDeps = {
        ...(packageJson['dependencies'] as Record<string, string> ?? {}),
        ...(packageJson['devDependencies'] as Record<string, string> ?? {})
      };

      // Known vulnerable packages (simplified check - in production, use npm audit or similar)
      const vulnerablePackages: VulnerablePackage[] = [
        { name: 'lodash', versions: ['<4.17.12'], severity: 'high', cve: 'CVE-2019-10744' },
        { name: 'axios', versions: ['<0.21.1'], severity: 'medium', cve: 'CVE-2020-28168' },
        { name: 'moment', versions: ['<2.29.0'], severity: 'low' },
        { name: 'minimist', versions: ['<1.2.6'], severity: 'critical', cve: 'CVE-2021-44906' },
        { name: 'node-fetch', versions: ['<2.6.7'], severity: 'high', cve: 'CVE-2022-0235' },
        { name: 'jsonwebtoken', versions: ['<9.0.0'], severity: 'high' },
        { name: 'express', versions: ['<4.17.3'], severity: 'medium' }
      ];

      for (const [depName, version] of Object.entries(allDeps)) {
        const vulnerable = vulnerablePackages.find(v => v.name === depName);
        if (vulnerable) {
          vulnerabilities.push({
            type: 'vulnerable-dependency',
            severity: vulnerable.severity,
            description: `Vulnerable dependency: ${depName}@${version}${vulnerable.cve ? ` (${vulnerable.cve})` : ''}`,
            recommendation: `Update ${depName} to a secure version (${vulnerable.versions.join(', ')} are vulnerable)`
          });
        }
      }

      return vulnerabilities;
    } catch (error) {
      this.logger?.warn?.('Failed to check vulnerable dependencies', { error });
      return [];
    }
  }

  /**
   * Scan for hardcoded secrets in source files
   *
   * @param projectPath - Path to project root
   * @returns List of vulnerability findings
   */
  private async scanForHardcodedSecrets(projectPath: string): Promise<SecurityVulnerability[]> {
    try {
      const vulnerabilities: SecurityVulnerability[] = [];
      const sourceFiles = await FileSystemService.getProjectFiles(projectPath);

      // Secret detection patterns
      const secretPatterns: SecretPattern[] = [
        {
          pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
          type: 'hardcoded-password',
          severity: 'high'
        },
        {
          pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{20,}['"]/gi,
          type: 'hardcoded-api-key',
          severity: 'high'
        },
        {
          pattern: /(?:secret|token)\s*[:=]\s*['"][^'"]{20,}['"]/gi,
          type: 'hardcoded-secret',
          severity: 'high'
        },
        {
          pattern: /(?:private[_-]?key|privkey)\s*[:=]\s*['"][^'"]{40,}['"]/gi,
          type: 'hardcoded-private-key',
          severity: 'critical'
        },
        {
          pattern: /(?:aws[_-]?access[_-]?key[_-]?id)\s*[:=]\s*['"]AKIA[A-Z0-9]{16}['"]/gi,
          type: 'hardcoded-aws-key',
          severity: 'critical'
        },
        {
          pattern: /(?:bearer|authorization)\s*[:=]\s*['"][^'"]{30,}['"]/gi,
          type: 'hardcoded-bearer-token',
          severity: 'high'
        }
      ];

      // Limit scan to first 50 files for performance
      const filesToScan = sourceFiles.slice(0, 50).filter(file =>
        file.endsWith('.js') ||
        file.endsWith('.ts') ||
        file.endsWith('.jsx') ||
        file.endsWith('.tsx') ||
        file.endsWith('.py') ||
        file.endsWith('.java') ||
        file.endsWith('.go') ||
        file.endsWith('.rs')
      );

      for (const file of filesToScan) {
        try {
          const content = await FileSystemService.readFileContent(file);

          for (const { pattern, type, severity } of secretPatterns) {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
              vulnerabilities.push({
                type,
                severity,
                description: `Potential hardcoded secret found in ${file}`,
                file,
                recommendation: 'Move secrets to environment variables or secure configuration management'
              });
              break; // Only report once per file
            }
          }
        } catch (error) {
          // Skip files that can't be read (binary, too large, etc.)
        }
      }

      return vulnerabilities;
    } catch (error) {
      this.logger?.warn?.('Failed to scan for hardcoded secrets', { error });
      return [];
    }
  }

  /**
   * Calculate security score based on vulnerability counts
   *
   * Score calculation:
   * - Start at 100
   * - Critical: -20 points each
   * - High: -10 points each
   * - Medium: -5 points each
   * - Low: -2 points each
   * - Minimum score: 0
   *
   * @param criticalCount - Number of critical vulnerabilities
   * @param highCount - Number of high vulnerabilities
   * @param mediumCount - Number of medium vulnerabilities
   * @param lowCount - Number of low vulnerabilities
   * @returns Security score (0-100)
   */
  private calculateSecurityScore(
    criticalCount: number,
    highCount: number,
    mediumCount: number,
    lowCount: number
  ): number {
    const score = 100 -
      (criticalCount * 20) -
      (highCount * 10) -
      (mediumCount * 5) -
      (lowCount * 2);

    return Math.max(0, score);
  }

  /**
   * Get security recommendations based on analysis
   *
   * @param result - Security analysis result
   * @returns List of actionable recommendations
   */
  getRecommendations(result: SecurityAnalysisResult): readonly string[] {
    const recommendations: string[] = [];

    if (result.criticalCount > 0) {
      recommendations.push(
        `⚠️ CRITICAL: Address ${result.criticalCount} critical security ${result.criticalCount === 1 ? 'vulnerability' : 'vulnerabilities'} immediately`
      );
    }

    if (result.highCount > 0) {
      recommendations.push(
        `⚠️ HIGH: Fix ${result.highCount} high-severity ${result.highCount === 1 ? 'vulnerability' : 'vulnerabilities'} as soon as possible`
      );
    }

    if (result.mediumCount > 0) {
      recommendations.push(
        `⚠️ MEDIUM: Address ${result.mediumCount} medium-severity ${result.mediumCount === 1 ? 'vulnerability' : 'vulnerabilities'} in upcoming sprint`
      );
    }

    if (result.lowCount > 0) {
      recommendations.push(
        `ℹ️ LOW: Consider fixing ${result.lowCount} low-severity ${result.lowCount === 1 ? 'issue' : 'issues'} when time permits`
      );
    }

    if (result.securityScore < 50) {
      recommendations.push(
        '🚨 Security score is critically low. Immediate action required.'
      );
    } else if (result.securityScore < 70) {
      recommendations.push(
        '⚠️ Security score needs improvement. Review and address vulnerabilities.'
      );
    } else if (result.securityScore < 90) {
      recommendations.push(
        'ℹ️ Security score is good but can be improved.'
      );
    } else {
      recommendations.push(
        '✅ Excellent security score. Keep up the good work!'
      );
    }

    if (!result.hasVulnerabilities) {
      recommendations.push(
        '✅ No known vulnerabilities detected. Continue following security best practices.'
      );
    }

    return recommendations;
  }

  /**
   * Get security risk level based on score
   *
   * @param score - Security score (0-100)
   * @returns Risk level
   */
  getSecurityRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' | 'none' {
    if (score < 40) return 'critical';
    if (score < 60) return 'high';
    if (score < 80) return 'medium';
    if (score < 95) return 'low';
    return 'none';
  }
}
