/**
 * Violation Checker Service - SRP Focused
 *
 * Single Responsibility: Check files for style rule violations
 */

import * as fs from 'fs/promises';
import type { StyleRule, StyleViolation } from './style-rules';

export interface ViolationCheckOptions {
  enabledRules?: string[];
  skipComments?: boolean;
  skipStrings?: boolean;
}

export class ViolationCheckerService {
  async checkFile(
    filePath: string,
    rules: StyleRule[],
    options: ViolationCheckOptions = {}
  ): Promise<StyleViolation[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.checkContent(filePath, content, rules, options);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return [];
    }
  }

  checkContent(
    filePath: string,
    content: string,
    rules: StyleRule[],
    options: ViolationCheckOptions = {}
  ): StyleViolation[] {
    const violations: StyleViolation[] = [];
    const lines = content.split('\n');

    const {
      enabledRules,
      skipComments = true,
      skipStrings = true
    } = options;

    const activeRules = enabledRules
      ? rules.filter(rule => enabledRules.includes(rule.name))
      : rules;

    for (const rule of activeRules) {
      const ruleViolations = this.checkRule(
        filePath,
        lines,
        rule,
        { skipComments, skipStrings }
      );
      violations.push(...ruleViolations);
    }

    return violations.sort((a, b) => a.line - b.line);
  }

  private checkRule(
    filePath: string,
    lines: string[],
    rule: StyleRule,
    options: { skipComments: boolean; skipStrings: boolean }
  ): StyleViolation[] {
    const violations: StyleViolation[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1;

      // Skip empty lines
      if (!line.trim()) continue;

      // Skip comments if requested
      if (options.skipComments && this.isCommentLine(line)) continue;

      // Skip string literals if requested
      if (options.skipStrings && this.isStringLiteral(line)) continue;

      const matches = this.findMatches(line, rule.pattern);

      for (const match of matches) {
        violations.push({
          file: filePath,
          line: lineNumber,
          column: match.index + 1,
          rule: rule.name,
          message: rule.message,
          severity: rule.severity,
          content: line.trim()
        });
      }
    }

    return violations;
  }

  private findMatches(text: string, pattern: RegExp): Array<{ index: number; match: string }> {
    const matches: Array<{ index: number; match: string }> = [];

    // Handle global patterns
    if (pattern.global) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          index: match.index,
          match: match[0]
        });
      }
      pattern.lastIndex = 0; // Reset for next use
    } else {
      const match = pattern.exec(text);
      if (match) {
        matches.push({
          index: match.index,
          match: match[0]
        });
      }
    }

    return matches;
  }

  private isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('//') ||
           trimmed.startsWith('/*') ||
           trimmed.startsWith('*') ||
           trimmed.endsWith('*/');
  }

  private isStringLiteral(line: string): boolean {
    const trimmed = line.trim();
    return (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
           (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
           (trimmed.startsWith('`') && trimmed.endsWith('`'));
  }

  async checkMultipleFiles(
    filePaths: string[],
    rules: StyleRule[],
    options: ViolationCheckOptions = {}
  ): Promise<StyleViolation[]> {
    const allViolations: StyleViolation[] = [];

    for (const filePath of filePaths) {
      const violations = await this.checkFile(filePath, rules, options);
      allViolations.push(...violations);
    }

    return allViolations;
  }

  groupViolationsByFile(violations: StyleViolation[]): Map<string, StyleViolation[]> {
    const grouped = new Map<string, StyleViolation[]>();

    for (const violation of violations) {
      const existing = grouped.get(violation.file) || [];
      existing.push(violation);
      grouped.set(violation.file, existing);
    }

    return grouped;
  }

  groupViolationsByRule(violations: StyleViolation[]): Map<string, StyleViolation[]> {
    const grouped = new Map<string, StyleViolation[]>();

    for (const violation of violations) {
      const existing = grouped.get(violation.rule) || [];
      existing.push(violation);
      grouped.set(violation.rule, existing);
    }

    return grouped;
  }
}