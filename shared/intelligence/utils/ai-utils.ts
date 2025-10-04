/**
 * AI Utilities - Helper functions for AI operations and prompt management
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for AI-related utilities
 * - OCP: Open for extension through new AI capabilities
 */

import type { IDetectedPattern, AnalysisResult } from '../file-system/types/analyzer.interface.js'
// AI_CONFIG removed - no longer used after removing chunkContent function

export interface PromptTemplate {
  readonly id: string;
  readonly category: 'deployment' | 'analysis' | 'security' | 'optimization' | 'troubleshooting';
  readonly template: string;
  readonly variables: readonly string[];
  readonly context?: Record<string, any>;
}

export interface AIAnalysisRequest {
  readonly content: string;
  readonly type: 'code' | 'config' | 'deployment' | 'security';
  readonly context?: Record<string, any>;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

export class AIUtils {
  /**
   * Generate comprehensive deployment prompt based on project analysis
   */
  static generateDeploymentPrompt(analysis: {
    frameworks: string[];
    languages: string[];
    dependencies: string[];
    architecture: string[];
    deployment: string[];
  }): string {
    const { frameworks, languages, dependencies, architecture, deployment } = analysis;

    return `# Comprehensive Deployment Analysis

## Project Overview
- **Languages**: ${languages.join(', ')}
- **Frameworks**: ${frameworks.join(', ')}
- **Key Dependencies**: ${dependencies.slice(0, 10).join(', ')}
- **Architecture Patterns**: ${architecture.join(', ')}
- **Existing Deployment**: ${deployment.join(', ')}

## Deployment Requirements Analysis
Please analyze this project and provide:

1. **Optimal Deployment Strategy**
   - Recommended deployment platform(s)
   - Infrastructure requirements
   - Scaling considerations

2. **Environment Configuration**
   - Required environment variables
   - Configuration management
   - Secrets handling

3. **CI/CD Pipeline**
   - Build process optimization
   - Testing strategy
   - Deployment automation

4. **Performance & Security**
   - Performance optimization recommendations
   - Security best practices
   - Monitoring and alerting setup

5. **Cost Optimization**
   - Resource allocation recommendations
   - Cost-effective scaling strategies
   - Budget considerations

Provide specific, actionable recommendations tailored to this technology stack.`;
  }

  /**
   * Generate security analysis prompt
   */
  static generateSecurityPrompt(codeContext: string, fileType: string): string {
    return `# Security Analysis Request

## Code Context
\`\`\`${fileType}
${codeContext}
\`\`\`

## Analysis Requirements
Please perform a comprehensive security analysis covering:

1. **Vulnerability Assessment**
   - Common security vulnerabilities (OWASP Top 10)
   - Language-specific security issues
   - Dependency vulnerabilities

2. **Code Security Review**
   - Input validation and sanitization
   - Authentication and authorization
   - Data encryption and protection

3. **Configuration Security**
   - Secure configuration practices
   - Environment variable handling
   - API key and secret management

4. **Deployment Security**
   - Container security best practices
   - Network security considerations
   - Access control recommendations

Provide specific remediation steps for any identified issues.`;
  }

  /**
   * Generate optimization prompt for performance analysis
   */
  static generateOptimizationPrompt(patterns: IDetectedPattern[]): string {
    const frameworkPatterns = patterns.filter(p => p.type === 'framework');
    const architecturePatterns = patterns.filter(p => p.type === 'config');

    return `# Performance Optimization Analysis

## Detected Patterns
- **Frameworks**: ${frameworkPatterns.map(p => p.pattern).join(', ')}
- **Architecture**: ${architecturePatterns.map(p => p.pattern).join(', ')}

## Optimization Requirements
Please analyze and provide recommendations for:

1. **Performance Bottlenecks**
   - Identify potential performance issues
   - Framework-specific optimizations
   - Database query optimization

2. **Resource Optimization**
   - Memory usage optimization
   - CPU utilization improvements
   - Network request optimization

3. **Scalability Improvements**
   - Horizontal scaling strategies
   - Caching mechanisms
   - Load balancing considerations

4. **Bundle Optimization**
   - Code splitting strategies
   - Asset optimization
   - Lazy loading implementation

Provide measurable optimization targets and implementation steps.`;
  }

  /**
   * Generate troubleshooting prompt for error analysis
   */
  static generateTroubleshootingPrompt(errorContext: {
    error: string;
    stackTrace?: string;
    environment: string;
    steps: string[];
  }): string {
    const { error, stackTrace, environment, steps } = errorContext;

    return `# Error Troubleshooting Analysis

## Error Details
- **Error**: ${error}
- **Environment**: ${environment}
- **Steps to Reproduce**: ${steps.join(' → ')}

${stackTrace ? `## Stack Trace
\`\`\`
${stackTrace}
\`\`\`
` : ''}

## Troubleshooting Requirements
Please provide comprehensive troubleshooting guidance:

1. **Root Cause Analysis**
   - Identify the underlying cause
   - Explain why this error occurred
   - Common scenarios leading to this issue

2. **Immediate Resolution**
   - Quick fixes to resolve the issue
   - Workarounds if immediate fix isn't available
   - Rollback procedures if needed

3. **Long-term Prevention**
   - Code improvements to prevent recurrence
   - Monitoring and alerting setup
   - Testing strategies to catch similar issues

4. **Related Issues**
   - Potential side effects to watch for
   - Similar errors that might occur
   - Preventive measures for related problems

Provide step-by-step resolution instructions with verification steps.`;
  }

  /**
   * Extract variables from prompt template
   */
  static extractPromptVariables(template: string): string[] {
    const variablePattern = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variablePattern.exec(template)) !== null) {
      if (match[1] && !variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Render prompt template with variables
   */
  static renderPromptTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName]?.toString() || match;
    });
  }

  // Removed unused validateAnalysisRequest function

  // Removed unused chunkContent function

  /**
   * Generate context-aware prompt based on analysis results
   */
  static generateContextualPrompt(
    basePrompt: string,
    analysisResults: AnalysisResult<any>[],
    additionalContext?: Record<string, any>
  ): string {
    const successfulResults = analysisResults.filter(r => r.success);
    const warnings = analysisResults.flatMap(r => r.warnings).filter(Boolean);

    let contextualPrompt = basePrompt;

    if (successfulResults.length > 0) {
      contextualPrompt += '\n\n## Analysis Context\n';
      successfulResults.forEach((result, index) => {
        contextualPrompt += `\n### Analysis ${index + 1} (Confidence: ${result.confidence})\n`;
        if (result.data) {
          contextualPrompt += `- Data: ${JSON.stringify(result.data, null, 2)}\n`;
        }
      });
    }

    if (warnings.length > 0) {
      contextualPrompt += '\n\n## Warnings to Consider\n';
      warnings.forEach(warning => {
        contextualPrompt += `- ${warning}\n`;
      });
    }

    if (additionalContext) {
      contextualPrompt += '\n\n## Additional Context\n';
      Object.entries(additionalContext).forEach(([key, value]) => {
        contextualPrompt += `- **${key}**: ${JSON.stringify(value)}\n`;
      });
    }

    return contextualPrompt;
  }
}