/**
 * @fileoverview Language Detection Service
 *
 * Production-grade language and framework detection extracted from UnifiedAnalyzer
 * to follow Single Responsibility Principle.
 *
 * Responsibilities:
 * - Detect programming language from file extensions
 * - Detect framework from dependencies and config files
 * - Calculate confidence scores
 *
 * @author AIOS Team
 * @version 2.0.0
 * @since 2.0.0 (Extracted from UnifiedAnalyzer)
 */

import type { IFileSystemLogger } from '../types/core-interfaces.js';
import { FileSystemService } from './file-system-service.js';
import { getSupportedLanguages, getLanguageDefinition, getFrameworkPatterns } from '../config/analyzer-config/index.js';
import * as path from 'path';

/**
 * Language detection result with confidence scoring
 */
export interface LanguageDetectionResult {
  readonly language: string;
  readonly confidence: number;
  readonly indicators: string[];
  readonly fileCount: number;
  readonly totalFiles: number;
}

/**
 * Framework detection result with evidence
 */
export interface FrameworkDetectionResult {
  readonly framework: string | null;
  readonly confidence: number;
  readonly evidence: string[];
  readonly configFiles: string[];
}

/**
 * Service for detecting programming languages and frameworks
 *
 * @example
 * ```typescript
 * const service = new LanguageDetectionService(logger);
 * const langResult = await service.detectLanguage('/path/to/project');
 * const fwResult = await service.detectFramework('/path/to/project', 'javascript');
 * ```
 */
export class LanguageDetectionService {
  constructor(private readonly logger?: IFileSystemLogger) {}

  /**
   * Detects primary programming language by analyzing file extensions
   *
   * Algorithm:
   * 1. Scan all project files
   * 2. Extract and normalize file extensions
   * 3. Map extensions to languages via configuration
   * 4. Count occurrences per language
   * 5. Return language with highest count
   * 6. Calculate confidence as ratio of primary/total
   *
   * @param projectPath - Absolute path to project directory
   * @returns Language detection result with confidence
   *
   * @throws Error if project path invalid or unreadable
   */
  async detectLanguage(projectPath: string): Promise<LanguageDetectionResult> {
    try {
      const files = await FileSystemService.getProjectFiles(projectPath);

      if (files.length === 0) {
        this.logger?.warn?.('No files found in project', { projectPath });
        return {
          language: 'unknown',
          confidence: 0.0,
          indicators: ['No files found'],
          fileCount: 0,
          totalFiles: 0
        };
      }

      // Extract extensions and count occurrences per language
      const extensions = files
        .map(f => f.split('.').pop()?.toLowerCase())
        .filter((ext): ext is string => Boolean(ext));

      const languageCounts = new Map<string, number>();

      for (const ext of extensions) {
        const langDef = getLanguageDefinition(ext);
        if (langDef) {
          const count = languageCounts.get(langDef.name) ?? 0;
          languageCounts.set(langDef.name, count + 1);
        }
      }

      if (languageCounts.size === 0) {
        this.logger?.info?.('No recognized language extensions found', { projectPath });
        return {
          language: 'unknown',
          confidence: 0.0,
          indicators: ['No recognized extensions'],
          fileCount: 0,
          totalFiles: files.length
        };
      }

      // Find language with most files
      const sortedLanguages = Array.from(languageCounts.entries())
        .sort((a, b) => b[1] - a[1]);

      const firstEntry = sortedLanguages[0];
      if (!firstEntry) {
        return {
          language: 'unknown',
          confidence: 0.0,
          indicators: ['No language entries found'],
          fileCount: 0,
          totalFiles: files.length
        };
      }

      const [primaryLanguage, fileCount] = firstEntry;
      const totalRecognized = Array.from(languageCounts.values()).reduce((sum, c) => sum + c, 0);

      // Calculate confidence: (primary language files / total recognized files)
      const confidence = Math.min(fileCount / totalRecognized, 1.0);

      const indicators = [
        `${fileCount} files identified as ${primaryLanguage}`,
        `${totalRecognized} total recognized files`,
        ...sortedLanguages.slice(1, 3).map(([lang, count]) =>
          `${count} ${lang} files also detected`
        )
      ];

      this.logger?.info?.('Language detected', {
        projectPath,
        language: primaryLanguage,
        confidence,
        fileCount,
        totalFiles: files.length
      });

      return {
        language: primaryLanguage,
        confidence,
        indicators,
        fileCount,
        totalFiles: files.length
      };

    } catch (error) {
      this.logger?.error?.('Language detection failed', error as Error, { projectPath });
      throw error;
    }
  }

  /**
   * Detects framework by analyzing dependencies, config files, and code patterns
   *
   * Scoring Algorithm:
   * - Dependencies match: 40% weight
   * - Config files found: 30% weight
   * - Code patterns match: 30% weight
   * - Minimum confidence threshold: 0.3
   *
   * @param projectPath - Absolute path to project directory
   * @param language - Programming language (from detectLanguage)
   * @returns Framework detection result with evidence
   *
   * @throws Error if detection fails critically
   */
  async detectFramework(
    projectPath: string,
    language: string
  ): Promise<FrameworkDetectionResult> {
    try {
      const frameworkPatterns = getFrameworkPatterns(language);

      if (frameworkPatterns.length === 0) {
        this.logger?.debug?.('No framework patterns for language', { language });
        return {
          framework: null,
          confidence: 0.0,
          evidence: [`No framework patterns defined for ${language}`],
          configFiles: []
        };
      }

      const projectFiles = await FileSystemService.getProjectFiles(projectPath);

      // Parse package.json if exists (for JS/TS projects)
      let packageJson: Record<string, any> | null = null;
      const packageJsonPath = path.join(projectPath, 'package.json');

      if (await FileSystemService.fileExists(packageJsonPath)) {
        try {
          const content = await FileSystemService.readFileContent(packageJsonPath);
          packageJson = JSON.parse(content);
        } catch (error) {
          this.logger?.warn?.('Failed to parse package.json', { projectPath, error });
        }
      }

      let bestMatch: FrameworkDetectionResult = {
        framework: null,
        confidence: 0.0,
        evidence: ['No framework detected'],
        configFiles: []
      };

      // Score each framework pattern
      for (const pattern of frameworkPatterns) {
        let score = 0.0;
        const evidence: string[] = [];
        const configFiles: string[] = [];

        // Check dependencies (40% weight)
        if (packageJson && pattern.dependencies) {
          const foundDeps = pattern.dependencies.filter(dep =>
            packageJson!['dependencies']?.[dep] || packageJson!['devDependencies']?.[dep]
          );

          if (foundDeps.length > 0) {
            const depScore = 0.4 * (foundDeps.length / pattern.dependencies.length);
            score += depScore;
            evidence.push(`Dependencies: ${foundDeps.join(', ')}`);
          }
        }

        // Check config files (30% weight)
        if (pattern.files) {
          const foundFiles = pattern.files.filter(file =>
            projectFiles.some(pf => pf.includes(file))
          );

          if (foundFiles.length > 0) {
            const fileScore = 0.3 * (foundFiles.length / pattern.files.length);
            score += fileScore;
            evidence.push(`Config files: ${foundFiles.join(', ')}`);
            configFiles.push(...foundFiles);
          }
        }

        // Check code patterns (30% weight) - limit to 5 files for performance
        if (pattern.patterns && pattern.patterns.length > 0) {
          const sourceFiles = projectFiles
            .filter(f => /\.(js|ts|jsx|tsx|py|java|go|rs|php|rb|cs)$/.test(f))
            .slice(0, 5);

          let matches = 0;
          for (const sourceFile of sourceFiles) {
            try {
              const content = await FileSystemService.readFileContent(sourceFile);
              const hasPattern = pattern.patterns.some(regex =>
                new RegExp(regex, 'i').test(content)
              );
              if (hasPattern) matches++;
            } catch {
              // Skip unreadable files
            }
          }

          if (sourceFiles.length > 0 && matches > 0) {
            const patternScore = 0.3 * (matches / sourceFiles.length);
            score += patternScore;
            evidence.push(`Code patterns found in ${matches}/${sourceFiles.length} files`);
          }
        }

        // Update best match if this pattern has higher confidence
        if (score > bestMatch.confidence && score >= 0.3) {
          bestMatch = {
            framework: pattern.name,
            confidence: Math.min(score, 1.0),
            evidence,
            configFiles
          };
        }
      }

      this.logger?.info?.('Framework detection complete', {
        projectPath,
        language,
        framework: bestMatch.framework,
        confidence: bestMatch.confidence
      });

      return bestMatch;

    } catch (error) {
      this.logger?.error?.('Framework detection failed', error as Error, { projectPath, language });
      throw error;
    }
  }

  /**
   * Returns list of supported languages
   */
  getSupportedLanguages(): string[] {
    return getSupportedLanguages();
  }

  /**
   * Checks if a language is supported
   */
  isLanguageSupported(language: string): boolean {
    return getSupportedLanguages().includes(language);
  }
}
