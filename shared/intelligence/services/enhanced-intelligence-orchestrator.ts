/**
 * Enhanced Intelligence Orchestrator - Integrates multi-language analyzers with AI engine
 *
 * This is the central orchestrator that combines project analysis capabilities with AI-powered
 * insights to provide comprehensive, intelligent project recommendations. It bridges the gap
 * between technical analysis and human-readable insights by leveraging AI to interpret
 * analysis results and generate actionable recommendations.
 *
 * ## Key Features:
 * - **Multi-Language Analysis**: Supports JavaScript, TypeScript, Python, Java, Go, Rust, PHP, Ruby
 * - **AI-Powered Insights**: Generates intelligent recommendations using various AI providers
 * - **Context-Aware Prompts**: Creates dynamic prompts based on project analysis
 * - **Cross-Language Pattern Detection**: Identifies architectural patterns across languages
 * - **Intelligent Recommendations**: Provides actionable suggestions for deployment, security, optimization
 * - **Provider Agnostic**: Supports OpenAI, Anthropic, Ollama, and other AI providers
 *
 * ## Analysis Types:
 * - **Deployment**: Platform recommendations, configuration generation, deployment strategies
 * - **Security**: Vulnerability assessment, security best practices, compliance recommendations
 * - **Optimization**: Performance analysis, build optimization, resource utilization
 * - **Troubleshooting**: Error analysis, debugging guidance, issue resolution
 *
 * ## Example Usage:
 * ```typescript
 * const orchestrator = new EnhancedIntelligenceOrchestrator(aiService, logger);
 * 
 * const result = await orchestrator.executeIntelligenceAnalysis({
 *   type: 'deployment',
 *   projectPath: '/path/to/project',
 *   options: {
 *     useAI: true,
 *     aiProvider: 'openai',
 *     includeRecommendations: true,
 *     generatePrompts: true
 *   }
 * });
 * 
 * if (result.success) {
 *   console.log('AI Insights:', result.aiInsights?.content);
 *   console.log('Recommendations:', result.recommendations);
 * }
 * ```
 */
import type { IDetectedPattern } from '../types/file-system.types.js'
import { PatternType } from '../types/file-system.types.js'

import type { AIResponse } from '../types/ai-service.types.js'
import type { IAIService } from '../types/ai-service.types.js'
import { AIUtils, AnalysisUtils, PatternUtils } from '../utils/index.js'
import { AI_CONFIG } from '../constants/index.js';
import { getDevOpsPromptsByCategory, getDevOpsPrompt } from '../prompts/devops-prompts.js'
import { CLOUD_DEPLOYMENT_SYSTEM_PROMPT, CLOUD_DEPLOYMENT_FUNCTIONS } from '../prompts/cloud-deployment-prompts.js'

// Import our consolidated analyzers
import {
  AnalyzerFactory
} from '../file-system/core/analyzer-factory.js';
import { UnifiedAnalyzer } from '../file-system/analyzers/unified-analyzer.js'
import type {
  AnalysisContext,
  AnalysisResult,
  IProjectAnalyzer
} from '../file-system/types/analyzer.interface.js';

// UnifiedAnalysisPipeline was consolidated into UnifiedAnalyzer

import type {
  EnhancedIntelligenceRequest,
  EnhancedIntelligenceResponse
} from '../types/index.js';
import type {
  IntelligenceRequest,
  IntelligenceResponse,
  AnalysisWorkflow,
  AnalysisStep
} from '../types/intelligence.types.js';
import type {
  PipelineStep,
  PipelineDefinition,
  PipelineContext,
  PipelineExecution,
  PipelineLogger,
  BatchAnalysisRequest,
  BatchAnalysisResult
} from '../types/pipeline.types.js';

/**
 * Enhanced Intelligence Orchestrator - Central coordinator for AI-powered project analysis
 * 
 * This orchestrator combines multi-language project analysis with AI insights to provide
 * comprehensive, intelligent recommendations. It processes projects through multiple
 * analysis phases and leverages AI to generate contextual, actionable insights.
 */
export class EnhancedIntelligenceOrchestrator {
  /** Factory for creating and managing analyzers */
  private readonly analyzerFactory: AnalyzerFactory;
  
  /** Unified analyzer for comprehensive project analysis */
  private readonly unifiedAnalyzer: UnifiedAnalyzer;
  
  /** AI service for generating intelligent insights and recommendations */
  private readonly aiService: IAIService;
  
  /** Logger for tracking analysis progress and debugging */
  private readonly logger: any;
  
  /** Metrics collector for performance tracking */
  private readonly metrics: any;

  /** Registry of available analyzers by name (from intelligence-orchestrator) */
  private readonly analyzers = new Map<string, IProjectAnalyzer>();
  
  /** Registry of available analysis workflows by type (from intelligence-orchestrator) */
  private readonly workflows = new Map<string, AnalysisWorkflow>();
  
  /** Tracking of active analysis requests for monitoring (from intelligence-orchestrator) */
  private readonly activeRequests = new Map<string, Promise<IntelligenceResponse>>();

  /** Pipeline management system (from analysis-pipeline-manager) */
  private readonly pipelines = new Map<string, PipelineDefinition>();
  private readonly executions = new Map<string, PipelineExecution>();
  private readonly executionQueue: Array<{ execution: PipelineExecution; input: any }> = [];
  private readonly maxConcurrentExecutions: number = 5;
  private isProcessingQueue = false;

  /**
   * Creates a new Enhanced Intelligence Orchestrator instance
   * 
   * @param aiService - AI service provider for generating insights
   * @param logger - Logger instance for tracking operations
   * @param metrics - Metrics collector for performance tracking
   */
  constructor(aiService: IAIService, logger: any, metrics?: any) {
    this.aiService = aiService;
    this.logger = logger;
    this.metrics = metrics || {
      increment: () => {},
      histogram: () => {},
      gauge: () => {},
      timing: () => {}
    };
    this.analyzerFactory = new AnalyzerFactory(logger, this.metrics);
    
    // Initialize the unified analyzer
    const analyzerResult = this.analyzerFactory.createAnalyzer('unified');
    if (analyzerResult.isSuccess) {
      this.unifiedAnalyzer = analyzerResult.value as UnifiedAnalyzer;
    } else {
      throw new Error(`Failed to create unified analyzer: ${analyzerResult.error?.message}`);
    }

    // Initialize workflows (from intelligence-orchestrator)
    this.initializeWorkflows();

    // Initialize default pipelines (from analysis-pipeline-manager)
    this.initializeDefaultPipelines();
  }

  /**
   * Get the AI service instance for direct access
   *
   * @returns AI service instance
   */
  public getAIService(): IAIService {
    return this.aiService;
  }

  /**
   * Execute comprehensive project analysis with AI integration
   * 
   * This is the main entry point for enhanced intelligence analysis. It orchestrates
   * a multi-phase analysis process that combines technical project analysis with
   * AI-powered insights to provide comprehensive, actionable recommendations.
   * 
   * ## Analysis Phases:
   * 1. **Multi-language Project Analysis**: Detect languages, frameworks, dependencies
   * 2. **Context-Aware Prompt Generation**: Create dynamic prompts based on analysis
   * 3. **AI Insights Generation**: Generate intelligent recommendations using AI
   * 4. **Recommendation Synthesis**: Combine analysis results with AI insights
   * 
   * @param request - Analysis request containing project path and options
   * @returns Comprehensive analysis result with AI insights and recommendations
   */
  async executeIntelligenceAnalysis(request: EnhancedIntelligenceRequest): Promise<EnhancedIntelligenceResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting enhanced intelligence analysis', {
        type: request.type,
        projectPath: request.projectPath,
        options: request.options
      });

      // Phase 1: Use existing analyzers for project analysis
      const projectAnalysis = await this.analyzeProjectComprehensively(request.projectPath);
      if (!projectAnalysis.success) {
        return this.createErrorResponse(
          `Project analysis failed: ${projectAnalysis.error}`,
          startTime
        );
      }

      // Phase 2: Extract patterns from analyzer results (not re-analyzing)
      const patterns = this.extractAllPatterns(projectAnalysis.data);

      // Phase 3: Generate AI insights based on analyzer results
      const aiInsights = request.options?.useAI !== false
        ? await this.generateEnhancedAIInsights(
            request,
            projectAnalysis.data,
            request.options?.aiProvider || 'openai'
          )
        : undefined;

      // Phase 4: Generate recommendations from analysis results
      const recommendations = request.options?.includeRecommendations !== false
        ? this.generateIntelligentRecommendations(request, projectAnalysis.data, aiInsights)
        : [];

      // Phase 5: Generate contextual prompts based on analysis
      const prompts = request.options?.generatePrompts
        ? await this.generateContextualPrompts(request, projectAnalysis.data)
        : [];

      const duration = Date.now() - startTime;

      return {
        success: true,
        projectInfo: projectAnalysis.data,
        analysis: this.createTypeSpecificAnalysis(request.type, projectAnalysis.data),
        patterns,
        recommendations,
        ...(aiInsights && { aiInsights }),
        prompts,
        metadata: AnalysisUtils.createAnalysisMetadata(
          'enhanced-intelligence-orchestrator',
          '2.0.0',
          duration,
          request.context
        ),
        warnings: projectAnalysis.warnings || []
      };

    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Intelligence analysis failed',
        startTime
      );
    }
  }

  /**
   * Phase 1: Use existing analyzers instead of duplicating analysis logic
   * 
   * This method now properly delegates to our existing analyzer infrastructure
   * instead of implementing analysis logic that already exists elsewhere.
   */
  private async analyzeProjectComprehensively(projectPath: string, depth: 'basic' | 'standard' | 'comprehensive' | 'enterprise' = 'comprehensive'): Promise<AnalysisResult<any>> {
    try {
      this.logger.info('Using existing analyzers for project analysis', { projectPath, depth });

      // Create analysis context
      const analysisContext: AnalysisContext = {
        requestId: `analysis_${Date.now()}`,
        timestamp: new Date(),
        metadata: { projectPath, orchestrator: 'enhanced-intelligence' }
      };

      // Use the unified analyzer (which already uses our analyzers)
      const result = await this.unifiedAnalyzer.analyze(projectPath, analysisContext);
      
      if (!result.isSuccess) {
        return {
          success: false,
          error: result.error?.message || 'Analysis failed',
          warnings: [],
          confidence: 0,
          metadata: AnalysisUtils.createAnalysisMetadata('analyzer-orchestration', '2.0.0', 0, {})
        };
      }

      this.logger.info('Analysis completed using existing analyzers', {
        confidence: result.value.confidence,
        hasData: !!result.value.data
      });

      return result.value;

    } catch (error) {
      this.logger.error('Analysis orchestration failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Project analysis failed',
        warnings: [],
        confidence: 0,
        metadata: AnalysisUtils.createAnalysisMetadata('analyzer-orchestration', '2.0.0', 0, {})
      };
    }
  }

  /**
   * Phase 2: Generate context-aware prompts based on project analysis
   * 
   * Uses the actual DevOps prompts from the prompts folder to generate
   * contextual prompts based on the analysis type and project information.
   */
  private async generateContextualPrompts(
    request: EnhancedIntelligenceRequest,
    projectInfo: any
  ): Promise<Array<{
    type: string;
    template: string;
    variables: Record<string, any>;
  }>> {
    const prompts: Array<{ type: string; template: string; variables: Record<string, any> }> = [];

    try {
      // Map request types to prompt categories
      const categoryMap: Record<string, keyof typeof import('../prompts/devops-prompts').DEVOPS_PROMPTS> = {
        'deployment': 'DEPLOYMENT',
        'security': 'SECURITY',
        'optimization': 'OPTIMIZATION',
        'troubleshooting': 'TROUBLESHOOTING',
        'analysis': 'DEPLOYMENT' // Default to deployment for general analysis
      };

      const category = categoryMap[request.type] || 'DEPLOYMENT';
      
      // Get relevant DevOps prompts based on analysis type
      const categoryPrompts = getDevOpsPromptsByCategory(category);

      for (const prompt of categoryPrompts) {
        try {
          // Extract variables from project analysis
          const variables = this.extractPromptVariables(prompt, projectInfo);

          // Render template with variables
          const renderedTemplate = AIUtils.renderPromptTemplate(prompt.template, variables);

          prompts.push({
            type: prompt.id,
            template: renderedTemplate,
            variables
          });

          this.logger.debug(`Generated prompt: ${prompt.id}`, {
            category,
            variablesCount: Object.keys(variables).length
          });
        } catch (promptError) {
          this.logger.warn(`Failed to generate prompt: ${prompt.id}`, promptError);
        }
      }

      this.logger.info(`Generated ${prompts.length} contextual prompts`, {
        category,
        requestType: request.type
      });

      return prompts;
    } catch (error) {
      this.logger.error('Failed to generate contextual prompts', error);
      return [];
    }
  }

  /**
   * Phase 3: Enhanced AI insights generation
   */
  private async generateEnhancedAIInsights(
    request: EnhancedIntelligenceRequest,
    projectInfo: any,
    provider: string
  ): Promise<{
    content: string;
    confidence: number;
    model: string;
    tokens?: { prompt: number; completion: number; total: number };
  } | undefined> {
    try {
      // Create comprehensive context for AI
      const aiContext = this.buildAIContext(request, projectInfo);

      // Generate appropriate prompt based on request type
      const prompt = this.generateAIPrompt(request.type, aiContext);

      this.logger.info('Sending request to AI service', {
        provider,
        promptLength: prompt.length,
        context: Object.keys(aiContext)
      });

      // Call AI service
      const aiResponse = await this.aiService.sendMessage(prompt, {
        provider,
        config: {
          model: this.getOptimalModel(provider, request.options?.analysisDepth),
          temperature: 0.3,
          maxTokens: 2000
        }
      });

      if (aiResponse.isSuccess) {
        const response = aiResponse.value;
        return {
          content: response.content,
          confidence: this.calculateAIConfidence(response, projectInfo),
          model: response.model || 'unknown',
          ...(response.usage && { 
            tokens: {
              prompt: response.usage.promptTokens,
              completion: response.usage.completionTokens,
              total: response.usage.totalTokens
            }
          })
        };
      } else {
        this.logger.error('AI service failed', aiResponse.error);
        return undefined;
      }

    } catch (error) {
      this.logger.error('AI insights generation failed', error);
      return undefined;
    }
  }

  /**
   * Build comprehensive AI context from project analysis
   */
  private buildAIContext(request: EnhancedIntelligenceRequest, projectInfo: any): Record<string, any> {
    const context: Record<string, any> = {
      requestType: request.type,
      languages: projectInfo.languages,
      projectPath: request.projectPath
    };

    // Add language-specific information
    Object.entries(projectInfo.languageSpecific).forEach(([language, info]) => {
      context[`${language}Info`] = info;
    });

      // Add cross-language patterns
      if (projectInfo['crossLanguagePatterns']?.length > 0) {
        context['crossLanguagePatterns'] = projectInfo['crossLanguagePatterns'];
      }

    // Add request-specific context
    Object.assign(context, request.context);

    return context;
  }

  /**
   * Generate AI prompt based on request type and context
   */
  /**
   * Generate AI prompt using DevOps prompts from the prompts folder
   * 
   * @param type - Analysis type (deployment, security, optimization, troubleshooting)
   * @param context - Analysis context with project information
   * @returns Rendered prompt template
   */
  private generateAIPrompt(type: string, context: Record<string, any>): string {
    try {
      // Map request types to prompt categories and specific prompts
      const promptMap: Record<string, { category: keyof typeof import('../prompts/devops-prompts').DEVOPS_PROMPTS; promptId: string }> = {
        'deployment': { category: 'DEPLOYMENT', promptId: 'comprehensive-deployment' },
        'security': { category: 'SECURITY', promptId: 'security-assessment' },
        'optimization': { category: 'OPTIMIZATION', promptId: 'performance-optimization' },
        'troubleshooting': { category: 'TROUBLESHOOTING', promptId: 'system-troubleshooting' }
      };

      const promptConfig = promptMap[type] || promptMap['deployment'];
      if (!promptConfig) {
        return this.generateFallbackPrompt(type, context);
      }
      const prompt = getDevOpsPrompt(promptConfig.category, promptConfig.promptId);

      if (prompt) {
        // Extract variables from context
        const variables = this.extractPromptVariables(prompt, context);
        
        // Render the template with variables
        return AIUtils.renderPromptTemplate(prompt.template, variables);
      } else {
        // Fallback to basic prompt if specific prompt not found
        return this.generateFallbackPrompt(type, context);
      }
    } catch (error) {
      this.logger.warn('Failed to generate AI prompt from DevOps prompts', error);
      return this.generateFallbackPrompt(type, context);
    }
  }

  /**
   * Generate fallback prompt when DevOps prompts are not available
   * 
   * @param type - Analysis type
   * @param context - Analysis context
   * @returns Basic fallback prompt
   */
  private generateFallbackPrompt(type: string, context: Record<string, any>): string {
    const languages = context['languages']?.primaryLanguage || 'Unknown';
    const frameworks = this.extractFrameworksFromContext(context);
    const complexity = this.assessProjectComplexity(context);

    return `# ${type.charAt(0).toUpperCase() + type.slice(1)} Analysis

## Project Overview
- **Primary Language**: ${languages}
- **Additional Languages**: ${context['languages']?.secondaryLanguages?.join(', ') || 'None'}
- **Frameworks Detected**: ${frameworks.join(', ') || 'None detected'}
- **Project Complexity**: ${complexity}

## Language-Specific Analysis
${this.formatLanguageSpecificInfo(context)}

## Analysis Requirements
Based on the comprehensive project analysis, provide specific, actionable recommendations for ${type} optimization and best practices.

Provide detailed implementation steps and configuration examples.`;
  }


  // Helper methods
  private extractPromptVariables(prompt: any, projectInfo: any): Record<string, any> {
    void prompt; // Suppress unused parameter warning
    const variables: Record<string, any> = {};

    // Extract common variables from project analysis
    if (projectInfo['languages']) {
      variables['primaryLanguage'] = projectInfo['languages']['primaryLanguage'];
      variables['secondaryLanguages'] = projectInfo['languages']['secondaryLanguages']?.join(', ');
      variables['frameworks'] = this.extractFrameworksFromContext({ languageSpecific: projectInfo['languageSpecific'] }).join(', ');
    }

    // Add project-specific variables
    variables['projectType'] = this.determineProjectType(projectInfo);
    variables['complexity'] = this.assessProjectComplexity(projectInfo);

    return variables;
  }

  private extractFrameworksFromContext(context: Record<string, any>): string[] {
    const frameworks: string[] = [];

    Object.values(context['languageSpecific'] || {}).forEach((langInfo: any) => {
      if (langInfo?.frameworks) {
        frameworks.push(...langInfo.frameworks);
      }
    });

    return Array.from(new Set(frameworks));
  }

  private formatLanguageSpecificInfo(context: Record<string, any>): string {
    let info = '';

    Object.entries(context['languageSpecific'] || {}).forEach(([language, langInfo]: [string, any]) => {
      info += `\n### ${language.toUpperCase()} Analysis\n`;

      if (langInfo.frameworks) {
        info += `- **Frameworks**: ${langInfo.frameworks.join(', ')}\n`;
      }
      if (langInfo.dependencies) {
        info += `- **Dependencies**: ${langInfo.dependencies.slice(0, 5).map((d: any) => d.name).join(', ')}\n`;
      }
      if (langInfo.testingFrameworks) {
        info += `- **Testing**: ${langInfo.testingFrameworks.join(', ')}\n`;
      }
      if (langInfo.buildTools) {
        info += `- **Build Tools**: ${langInfo.buildTools.join(', ')}\n`;
      }
    });

    return info;
  }

  private determineProjectType(projectInfo: any): string {
    if (projectInfo['crossLanguagePatterns']?.includes('full-stack-application')) {
      return 'Full-Stack Application';
    }
    if (projectInfo['crossLanguagePatterns']?.includes('microservices-architecture')) {
      return 'Microservices';
    }
    if (Object.keys(projectInfo['languageSpecific'] || {}).length > 1) {
      return 'Multi-Language Project';
    }
    return 'Single-Language Application';
  }

  private assessProjectComplexity(context: any): string {
    const languageCount = Object.keys(context['languageSpecific'] || {}).length;
    const frameworkCount = this.extractFrameworksFromContext(context).length;

    if (languageCount >= 3 || frameworkCount >= 5) return 'Enterprise';
    if (languageCount >= 2 || frameworkCount >= 3) return 'Complex';
    if (frameworkCount >= 2) return 'Moderate';
    return 'Simple';
  }

  /**
   * Extract secondary languages from analyzer results (not re-analyzing)
   *
   * This method now extracts information that our analyzers have already
   * detected instead of duplicating the analysis logic.
   */
  // @ts-expect-error - Reserved for multi-language analysis
  private _detectSecondaryLanguages(analysisData: any): string[] {
    void analysisData; // Suppress unused parameter warning
    // Extract secondary languages from the analysis data that analyzers already provided
    const secondaryLanguages: string[] = [];
    
    // Check if the analysis data contains language information
    if (analysisData.secondaryLanguages) {
      return analysisData.secondaryLanguages;
    }
    
    // Fallback: extract from build tools and frameworks that analyzers detected
    const buildTools = analysisData.buildTools || [];
    const testingFrameworks = analysisData.testingFrameworks || [];
    
    // Simple mapping for common tools
    const toolToLanguageMap: Record<string, string> = {
      'maven': 'java', 'gradle': 'java', 'pip': 'python', 'cargo': 'rust',
      'composer': 'php', 'bundler': 'ruby', 'go.mod': 'go', 'dotnet': 'csharp',
      'junit': 'java', 'pytest': 'python', 'testify': 'go', 'rspec': 'ruby'
    };

    // Extract languages from tools that analyzers found
    [...buildTools, ...testingFrameworks].forEach(tool => {
      const language = toolToLanguageMap[tool.toLowerCase()];
      if (language && language !== analysisData.language && !secondaryLanguages.includes(language)) {
        secondaryLanguages.push(language);
      }
    });
    
    return secondaryLanguages;
  }

  // @ts-expect-error - Reserved for multi-language analysis
  private _detectCrossLanguagePatterns(languages: { primaryLanguage: string; secondaryLanguages: string[] }, languageSpecific: Record<string, any>): string[] {
    void languageSpecific; // Suppress unused parameter warning
    const patterns: string[] = [];

    if (languages.secondaryLanguages.length > 0) {
      patterns.push('polyglot-project');
    }

    // Add more sophisticated pattern detection
    const hasBackend = ['python', 'java', 'go', 'rust'].some(lang =>
      languages.primaryLanguage === lang || languages.secondaryLanguages.includes(lang)
    );
    const hasFrontend = ['javascript', 'typescript'].some(lang =>
      languages.primaryLanguage === lang || languages.secondaryLanguages.includes(lang)
    );

    if (hasBackend && hasFrontend) {
      patterns.push('full-stack-application');
    }

    return patterns;
  }

  /**
   * Extract patterns from analyzer results instead of re-analyzing
   */
  private extractAllPatterns(projectInfo: any): IDetectedPattern[] {
    const patterns: IDetectedPattern[] = [];

    // Extract patterns from the analysis data that analyzers already provided
    if (projectInfo.languages?.primaryLanguage) {
      patterns.push({
        pattern: `language:${projectInfo.languages.primaryLanguage}`,
        type: PatternType.LANGUAGE,
        name: 'primary-language',
        confidence: projectInfo.languages.confidence || 0.9,
        location: { file: 'project-root', line: 1 },
        evidence: [],
        metadata: {
          description: `Primary language: ${projectInfo.languages.primaryLanguage}`,
          recommendations: [`Optimize for ${projectInfo.languages.primaryLanguage} best practices`]
        }
      });
    }

    // Extract framework patterns from analyzer results
    if (projectInfo.frameworks) {
      projectInfo.frameworks.forEach((framework: string) => {
        patterns.push({
          pattern: `framework:${framework}`,
          type: PatternType.FRAMEWORK,
          name: `${framework}-framework`,
          confidence: 0.9,
          location: { file: 'project-root', line: 1 },
          evidence: [],
          metadata: {
            description: `Framework: ${framework}`,
            recommendations: [`Follow ${framework} best practices`]
          }
        });
      });
    }

    return patterns;
  }

  private generateIntelligentRecommendations(
    request: EnhancedIntelligenceRequest,
    projectInfo: any,
    aiInsights: any
  ): string[] {
    void request; // Suppress unused parameter warning
    void aiInsights; // Suppress unused parameter warning
    const recommendations: string[] = [];

    // Base recommendations from analysis
    const patterns = this.extractAllPatterns(projectInfo);
    void patterns; // Suppress unused variable warning
    // recommendations.push(...AnalysisUtils.generateRecommendations(patterns));

    // Add AI-derived recommendations if available
    if (aiInsights?.content) {
      // Extract actionable items from AI response (simplified)
      const aiRecommendations = this.extractRecommendationsFromAI(aiInsights.content);
      recommendations.push(...aiRecommendations);
    }

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  private extractRecommendationsFromAI(aiContent: string): string[] {
    // Simplified extraction - would use more sophisticated parsing in production
    const recommendations: string[] = [];
    const lines = aiContent.split('\n');

    lines.forEach(line => {
      if (line.includes('recommend') || line.includes('should') || line.includes('consider')) {
        const cleaned = line.replace(/^[-*•]\s*/, '').trim();
        if (cleaned.length > 10 && cleaned.length < 200) {
          recommendations.push(cleaned);
        }
      }
    });

    return recommendations.slice(0, 10); // Limit to top 10
  }

  private getOptimalModel(provider: string, depth?: string): string {
    const models: Record<string, Record<string, string>> = {
      openai: {
        basic: 'gpt-3.5-turbo',
        comprehensive: 'gpt-4',
        enterprise: 'gpt-4-turbo'
      },
      anthropic: {
        basic: 'claude-3-haiku',
        comprehensive: 'claude-3-sonnet',
        enterprise: 'claude-3-opus'
      },
      ollama: {
        basic: 'llama2',
        comprehensive: 'llama2:13b',
        enterprise: 'llama2:70b'
      }
    };

    return models[provider]?.[depth || 'comprehensive'] || models[provider]?.['comprehensive'] || 'gpt-4';
  }

  private calculateAIConfidence(response: AIResponse, projectInfo: any): number {
    // Simplified confidence calculation
    let confidence = 0.8; // Base confidence

    // Increase confidence based on response quality
    if (response.content.length > 500) confidence += 0.1;
    if (response.content.includes('specific')) confidence += 0.05;
    if (response.content.includes('recommend')) confidence += 0.05;

    // Adjust based on project analysis confidence
    if (projectInfo.languages?.confidence) {
      confidence = (confidence + projectInfo.languages.confidence) / 2;
    }

    return Math.min(confidence, 1.0);
  }

  private createTypeSpecificAnalysis(type: string, projectInfo: any): any {
    void projectInfo; // Suppress unused parameter warning
    // Create analysis based on request type
    switch (type) {
      case 'deployment':
        return {
          type: 'deployment',
          recommendations: ['Deploy to production'],
          config: { environment: 'production' }
        };
      case 'security':
        return {
          type: 'security',
          vulnerabilities: [],
          recommendations: ['Enable HTTPS']
        };
      case 'optimization':
        return {
          type: 'optimization',
          metrics: { performance: 'good' },
          recommendations: ['Optimize bundle size']
        };
      case 'troubleshooting':
        return {
          type: 'troubleshooting',
          issues: [],
          recommendations: ['Check logs']
        };
      default:
        return {
          type: 'analysis',
          summary: 'Project analyzed successfully'
        };
    }
  }

  private createErrorResponse(error: string, startTime: number): EnhancedIntelligenceResponse {
    return {
      success: false,
      error,
      metadata: AnalysisUtils.createAnalysisMetadata(
        'enhanced-intelligence-orchestrator',
        '2.0.0',
        Date.now() - startTime,
        {}
      ),
      warnings: []
    };
  }

  // ============================================================================
  // METHODS FROM INTELLIGENCE-ORCHESTRATOR.TS (CONSOLIDATED)
  // ============================================================================

  /**
   * Register an analyzer for use in intelligence operations
   * (from intelligence-orchestrator.ts)
   */
  registerAnalyzer(name: string, analyzer: IProjectAnalyzer): void {
    this.analyzers.set(name, analyzer);
  }

  /**
   * Execute comprehensive intelligence analysis using workflow system
   * (from intelligence-orchestrator.ts)
   */
  async analyzeProject(request: IntelligenceRequest): Promise<IntelligenceResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        return this.createErrorResponseIntelligence(
          `Invalid request: ${validation.errors.join(', ')}`,
          startTime,
          validation.warnings
        );
      }

      // Select appropriate workflow
      const workflow = this.selectWorkflow(request);
      if (!workflow) {
        return this.createErrorResponseIntelligence(
          `No suitable workflow found for request type: ${request.type}`,
          startTime
        );
      }

      // Execute analysis workflow
      const analysisPromise = this.executeWorkflow(workflow, request);
      this.activeRequests.set(requestId, analysisPromise);

      const result = await analysisPromise;
      this.activeRequests.delete(requestId);

      return result;
    } catch (error) {
      this.activeRequests.delete(requestId);
      return this.createErrorResponseIntelligence(
        error instanceof Error ? error.message : 'Unknown error occurred',
        startTime
      );
    }
  }

  /**
   * Generate deployment-specific intelligence with comprehensive prompts
   *
   * Now includes cloud deployment context with:
   * - 12 supported cloud providers (Vercel, Netlify, AWS, Azure, GCP, etc.)
   * - Provider recommendation based on project analysis
   * - Cost estimation and optimization
   * - Deployment configuration generation
   * - Function calling definitions for CloudManager
   *
   * (from intelligence-orchestrator.ts)
   */
  async generateDeploymentIntelligence(context: {
    projectPath: string;
    targetEnvironment: string;
    constraints?: Record<string, any>;
  }): Promise<IntelligenceResponse<{
    strategy: string;
    recommendations: string[];
    prompts: any[];
    configuration: Record<string, any>;
    cloudContext?: {
      systemPrompt: string;
      availableFunctions: readonly any[];
      supportedProviders: readonly string[];
    };
  }>> {
    const startTime = Date.now();

    try {
      // Analyze project structure and technology stack
      const projectAnalysis = await this.analyzeProjectStructure(context.projectPath);
      if (!projectAnalysis.success) {
        return this.createErrorResponseIntelligence(
          `Failed to analyze project: ${projectAnalysis.error}`,
          startTime
        );
      }

      // Detect patterns and generate insights
      const patterns = await this.detectProjectPatterns(projectAnalysis.data);

      // Generate deployment strategy using AI with cloud deployment context
      const deploymentPrompt = this.buildDeploymentPromptWithCloudContext({
        frameworks: this.extractFrameworks(patterns),
        languages: this.extractLanguages(patterns),
        dependencies: projectAnalysis.data?.dependencies || [],
        architecture: this.extractArchitecture(patterns),
        deployment: this.extractDeployment(patterns)
      });

      // Get relevant DevOps prompts
      const relevantPrompts = this.selectRelevantPrompts(patterns, 'deployment');

      // Generate AI insights if enabled (now with cloud deployment awareness)
      let aiInsights: string | undefined;
      if (context.constraints?.['useAI'] !== false) {
        aiInsights = await this.generateAIInsights(deploymentPrompt, patterns);
      }

      // Create deployment configuration recommendations
      const deploymentConfig = this.generateDeploymentConfiguration(patterns, context);

      return {
        success: true,
        data: {
          strategy: deploymentPrompt,
          recommendations: AnalysisUtils.generateRecommendations(patterns),
          prompts: relevantPrompts,
          configuration: deploymentConfig,
          cloudContext: {
            systemPrompt: CLOUD_DEPLOYMENT_SYSTEM_PROMPT,
            availableFunctions: CLOUD_DEPLOYMENT_FUNCTIONS,
            supportedProviders: [
              'vercel', 'netlify', 'aws', 'azure', 'gcp',
              'railway', 'render', 'digitalocean', 'fly',
              'cloudflare', 'linode', 'vultr'
            ]
          }
        },
        patterns: patterns as any,
        ...(aiInsights && { aiInsights }),
        metadata: AnalysisUtils.createAnalysisMetadata(
          'intelligence-orchestrator',
          '1.0.0',
          Date.now() - startTime,
          context
        ),
        warnings: []
      };
    } catch (error) {
      return this.createErrorResponseIntelligence(
        error instanceof Error ? error.message : 'Unknown error in deployment intelligence',
        startTime
      );
    }
  }

  /**
   * Execute security analysis with comprehensive prompts
   * (from intelligence-orchestrator.ts)
   */
  async executeSecurityAnalysis(context: {
    projectPath: string;
    securityLevel: 'basic' | 'standard' | 'enterprise';
    complianceRequirements?: string[];
  }): Promise<IntelligenceResponse> {
    const startTime = Date.now();

    try {
      const projectAnalysis = await this.analyzeProjectStructure(context.projectPath);
      if (!projectAnalysis.success) {
        return this.createErrorResponseIntelligence(
          `Failed to analyze project for security: ${projectAnalysis.error}`,
          startTime
        );
      }

      const patterns = await this.detectProjectPatterns(projectAnalysis.data);
      const securityPrompts = getDevOpsPromptsByCategory('SECURITY');

      // Generate security-specific AI analysis
      const securityPrompt = AIUtils.generateSecurityPrompt(
        JSON.stringify(projectAnalysis.data, null, 2),
        'project'
      );

      const aiInsights = await this.generateAIInsights(securityPrompt, patterns);

      return {
        success: true,
        data: {
          securityLevel: context.securityLevel,
          prompts: securityPrompts,
          analysis: projectAnalysis.data
        },
        patterns: patterns as any,
        recommendations: this.generateSecurityRecommendations(patterns, context.securityLevel),
        aiInsights,
        metadata: AnalysisUtils.createAnalysisMetadata(
          'security-analyzer',
          '1.0.0',
          Date.now() - startTime,
          context
        ),
        warnings: []
      };
    } catch (error) {
      return this.createErrorResponseIntelligence(
        error instanceof Error ? error.message : 'Security analysis failed',
        startTime
      );
    }
  }

  /**
   * Generate troubleshooting intelligence
   * (from intelligence-orchestrator.ts)
   */
  async generateTroubleshootingIntelligence(context: {
    errorDescription: string;
    environment: string;
    stackTrace?: string;
    reproductionSteps?: string[];
  }): Promise<IntelligenceResponse> {
    const startTime = Date.now();

    try {
      const troubleshootingPrompt = AIUtils.generateTroubleshootingPrompt({
        error: context.errorDescription,
        ...(context.stackTrace && { stackTrace: context.stackTrace }),
        environment: context.environment,
        steps: context.reproductionSteps || []
      });

      const troubleshootingPrompts = getDevOpsPromptsByCategory('TROUBLESHOOTING');
      const aiInsights = await this.generateAIInsights(troubleshootingPrompt, []);

      return {
        success: true,
        data: {
          analysis: troubleshootingPrompt,
          prompts: troubleshootingPrompts,
          context
        },
        aiInsights,
        recommendations: [
          'Follow systematic debugging approach',
          'Collect comprehensive logs and metrics',
          'Reproduce issue in controlled environment',
          'Document resolution for future reference'
        ],
        metadata: AnalysisUtils.createAnalysisMetadata(
          'troubleshooting-analyzer',
          '1.0.0',
          Date.now() - startTime,
          context
        ),
        warnings: []
      };
    } catch (error) {
      return this.createErrorResponseIntelligence(
        error instanceof Error ? error.message : 'Troubleshooting analysis failed',
        startTime
      );
    }
  }

  /**
   * Get status of active requests
   * (from intelligence-orchestrator.ts)
   */
  getActiveRequestsStatus(): { requestId: string; startTime: number }[] {
    return Array.from(this.activeRequests.keys()).map(requestId => ({
      requestId,
      startTime: Date.now() // Simplified - would track actual start time in production
    }));
  }

  // ============================================================================
  // PRIVATE HELPER METHODS FROM INTELLIGENCE-ORCHESTRATOR.TS
  // ============================================================================

  private async executeWorkflow(
    workflow: AnalysisWorkflow,
    request: IntelligenceRequest
  ): Promise<IntelligenceResponse> {
    const startTime = Date.now();
    const results: AnalysisResult<any>[] = [];
    const allPatterns: IDetectedPattern[] = [];

    try {
      if (workflow.parallel) {
        // Execute steps in parallel
        const promises = workflow.steps.map(step => this.executeAnalysisStep(step, request.context));
        const stepResults = await Promise.allSettled(promises);

        stepResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value?.success) {
            results.push(result.value);
          } else if (!workflow.steps[index]?.optional) {
            throw new Error(`Required step ${workflow.steps[index]?.id} failed`);
          }
        });
      } else {
        // Execute steps sequentially
        for (const step of workflow.steps) {
          try {
            const result = await this.executeAnalysisStep(step, request.context);
            if (result.success) {
              results.push(result);
            } else if (!step.optional) {
              throw new Error(`Required step ${step.id} failed: ${result.error}`);
            }
          } catch (error) {
            if (!step.optional) {
              throw error;
            }
          }
        }
      }

      // Merge results and extract patterns
      const mergedResult = AnalysisUtils.mergeAnalysisResults(results);

      // Generate AI insights if requested
      let aiInsights: string | undefined;
      if (request.options?.useAI !== false) {
        const contextualPrompt = AIUtils.generateContextualPrompt(
          `Analyze the following ${request.type} request results`,
          results,
          request.context
        );
        aiInsights = await this.generateAIInsights(contextualPrompt, allPatterns);
      }

      return {
        success: mergedResult.success,
        data: mergedResult.data,
        patterns: allPatterns as any,
        ...(request.options?.includeRecommendations !== false && {
          recommendations: AnalysisUtils.generateRecommendations(allPatterns)
        }),
        ...(aiInsights && { aiInsights }),
        metadata: AnalysisUtils.createAnalysisMetadata(
          'intelligence-orchestrator',
          '1.0.0',
          Date.now() - startTime,
          request.context
        ),
        warnings: mergedResult.warnings,
        ...(mergedResult.error && { error: mergedResult.error })
      };
    } catch (error) {
      return this.createErrorResponseIntelligence(
        error instanceof Error ? error.message : 'Workflow execution failed',
        startTime
      );
    }
  }

  private async executeAnalysisStep(step: AnalysisStep, context: Record<string, any>): Promise<AnalysisResult<any>> {
    const analyzer = this.analyzers.get(step.analyzer);
    if (!analyzer) {
      return {
        success: false,
        error: `Analyzer ${step.analyzer} not found`,
        warnings: [],
        confidence: 0,
        metadata: AnalysisUtils.createAnalysisMetadata(step.analyzer, '0.0.0', 0, context)
      };
    }

    // Execute analyzer with step configuration
    const config = { ...context, ...step.config };
    const result = await analyzer.analyzeProject(config['projectPath'] || '');
    // Convert ProjectAnalysisResult to AnalysisResult
    return {
      success: result.success,
      data: result,
      warnings: [],
      confidence: 1.0,
      metadata: AnalysisUtils.createAnalysisMetadata('analyzer', '1.0.0', 0, {})
    };
  }

  private async analyzeProjectStructure(projectPath: string): Promise<AnalysisResult<any>> {
    const structureAnalyzer = this.analyzers.get('structure');
    if (!structureAnalyzer) {
      return {
        success: false,
        error: 'Structure analyzer not available',
        warnings: [],
        confidence: 0,
        metadata: AnalysisUtils.createAnalysisMetadata('structure', '0.0.0', 0, {})
      };
    }

    const result = await structureAnalyzer.analyzeProject(projectPath);
    // Convert ProjectAnalysisResult to AnalysisResult
    return {
      success: result.success,
      data: result,
      warnings: [],
      confidence: 1.0,
      metadata: AnalysisUtils.createAnalysisMetadata('structure', '1.0.0', 0, {})
    };
  }

  private async detectProjectPatterns(projectData: any): Promise<IDetectedPattern[]> {
    const patterns: IDetectedPattern[] = [];

    if (projectData?.dependencies) {
      patterns.push(...PatternUtils.detectFrameworkPatterns(projectData.dependencies));
    }

    if (projectData?.files) {
      patterns.push(...PatternUtils.detectArchitecturePatterns(projectData.files));
      patterns.push(...PatternUtils.detectDeploymentPatterns(projectData.files));
      patterns.push(...PatternUtils.detectTestingPatterns(projectData.files));
    }

    return PatternUtils.mergePatterns([patterns]);
  }

  private selectWorkflow(request: IntelligenceRequest): AnalysisWorkflow | null {
    return this.workflows.get(request.type) || null;
  }

  private validateRequest(request: IntelligenceRequest): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!request.type) {
      errors.push('Request type is required');
    }

    if (!request.context) {
      errors.push('Request context is required');
    }

    if (request.options?.maxConcurrency && request.options.maxConcurrency > 10) {
      warnings.push('High concurrency may impact performance');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private selectRelevantPrompts(patterns: IDetectedPattern[], category: string): any[] {
    // Select prompts based on detected patterns and category
    const categoryPrompts = getDevOpsPromptsByCategory(category.toUpperCase() as any);

    // Filter prompts based on detected patterns (simplified logic)
    return categoryPrompts.filter(prompt => {
      if (patterns.some(p => p.type === 'framework' && prompt.template.includes('container'))) {
        return prompt.id.includes('container') || prompt.id.includes('deployment');
      }
      return true;
    });
  }

  /**
   * Build deployment prompt with cloud deployment context
   *
   * Combines traditional deployment strategy generation with cloud provider awareness.
   * This method integrates CloudManager capabilities into the AI prompt.
   */
  private buildDeploymentPromptWithCloudContext(projectInfo: {
    frameworks: string[];
    languages: string[];
    dependencies: any[];
    architecture: string[];
    deployment: string[];
  }): string {
    // Start with base deployment prompt using existing AIUtils
    const basePrompt = AIUtils.generateDeploymentPrompt(projectInfo);

    // Enhance with cloud deployment context
    const cloudContext = `

${CLOUD_DEPLOYMENT_SYSTEM_PROMPT}

## CURRENT PROJECT ANALYSIS

- **Frameworks**: ${projectInfo.frameworks.join(', ') || 'None detected'}
- **Languages**: ${projectInfo.languages.join(', ') || 'None detected'}
- **Architecture Patterns**: ${projectInfo.architecture.join(', ') || 'Not specified'}
- **Deployment Patterns**: ${projectInfo.deployment.join(', ') || 'Not specified'}
- **Dependencies**: ${projectInfo.dependencies.length} dependencies detected

## YOUR TASK

Based on the project analysis above and your knowledge of all 12 cloud providers,
provide a comprehensive deployment strategy including:

1. **Recommended Cloud Providers** (top 3 with rationale)
2. **Cost Estimation** for each recommended provider
3. **Deployment Configuration** specific to the recommended providers
4. **Step-by-step Deployment Plan**
5. **Performance & Scaling Considerations**
6. **Security Best Practices**

You have access to the following functions to interact with CloudManager:
${JSON.stringify(CLOUD_DEPLOYMENT_FUNCTIONS.map(f => ({ name: f.name, description: f.description })), null, 2)}
`;

    return `${basePrompt}\n${cloudContext}`;
  }

  private generateDeploymentConfiguration(patterns: IDetectedPattern[], context: any): Record<string, any> {
    const config: Record<string, any> = {
      environment: context.targetEnvironment || 'production',
      scaling: 'auto',
      monitoring: true,
      security: 'standard'
    };

    // Adjust configuration based on detected patterns
    if (patterns.some(p => (p as any).description?.includes('React') || (p as any).description?.includes('Vue'))) {
      config['buildCommand'] = 'npm run build';
      config['outputDirectory'] = 'dist';
    }

    if (patterns.some(p => (p as any).description?.includes('Docker'))) {
      config['containerized'] = true;
      config['orchestration'] = 'kubernetes';
    }

    return config;
  }

  private generateSecurityRecommendations(patterns: IDetectedPattern[], level: string): string[] {
    void patterns; // Suppress unused parameter warning
    const recommendations = [
      'Implement authentication and authorization',
      'Use HTTPS for all communications',
      'Validate and sanitize all inputs',
      'Keep dependencies up to date'
    ];

    if (level === 'enterprise') {
      recommendations.push(
        'Implement comprehensive audit logging',
        'Set up security monitoring and alerting',
        'Conduct regular penetration testing',
        'Implement zero-trust architecture'
      );
    }

    return recommendations;
  }

  private async generateAIInsights(prompt: string, patterns: IDetectedPattern[]): Promise<string> {
    try {
      const aiResponse = await this.aiService.sendMessage(prompt, {
        config: {
          model: AI_CONFIG.DEFAULT_MODEL,
          temperature: AI_CONFIG.TEMPERATURE,
          maxTokens: AI_CONFIG.MAX_TOKENS
        }
      });

      if (aiResponse.isSuccess) {
        return aiResponse.value.content;
      } else {
        this.logger.warn('AI service failed to generate insights', { 
          error: aiResponse.error?.message,
          patternCount: patterns.length 
        });
        return this.generateFallbackInsights(patterns);
      }
    } catch (error) {
      this.logger.error('AI service unavailable for insights generation', { 
        error: (error as Error).message,
        patternCount: patterns.length 
      });
      return this.generateFallbackInsights(patterns);
    }
  }

  private generateFallbackInsights(patterns: IDetectedPattern[]): string {
    const frameworkPatterns = patterns.filter(p => p.type === PatternType.FRAMEWORK);
    const architecturePatterns = patterns.filter(p => p.type === PatternType.ARCHITECTURE);
    const securityPatterns = patterns.filter(p => p.type === PatternType.SECURITY);

    const insights: string[] = [];

    if (frameworkPatterns.length > 0) {
      insights.push(`Detected ${frameworkPatterns.length} framework patterns including ${frameworkPatterns.map(p => p.name).join(', ')}`);
    }

    if (architecturePatterns.length > 0) {
      insights.push(`Identified ${architecturePatterns.length} architectural patterns: ${architecturePatterns.map(p => p.name).join(', ')}`);
    }

    if (securityPatterns.length > 0) {
      insights.push(`Found ${securityPatterns.length} security-related patterns that require attention`);
    }

    if (insights.length === 0) {
      insights.push(`Analyzed ${patterns.length} patterns. Consider reviewing project structure and dependencies for optimization opportunities.`);
    }

    return `Analysis Summary: ${insights.join('. ')}. For detailed AI-powered insights, ensure AI service is properly configured.`;
  }

  private extractFrameworks(patterns: IDetectedPattern[]): string[] {
    return patterns
      .filter(p => p.type === PatternType.FRAMEWORK)
      .map(p => p.name)
      .filter(Boolean);
  }

  private extractLanguages(patterns: IDetectedPattern[]): string[] {
    return patterns
      .filter(p => p.type === PatternType.LANGUAGE)
      .map(p => p.name)
      .filter(Boolean);
  }

  private extractArchitecture(patterns: IDetectedPattern[]): string[] {
    return patterns
      .filter(p => p.type === PatternType.ARCHITECTURE)
      .map(p => p.name)
      .filter(Boolean);
  }

  private extractDeployment(patterns: IDetectedPattern[]): string[] {
    return patterns
      .filter(p => p.type === PatternType.DEPLOYMENT || p.type === PatternType.CONFIG)
      .map(p => p.name)
      .filter(Boolean);
  }

  private createErrorResponseIntelligence(error: string, startTime: number, warnings: string[] = []): IntelligenceResponse {
    return {
      success: false,
      error,
      warnings,
      metadata: AnalysisUtils.createAnalysisMetadata(
        'intelligence-orchestrator',
        '1.0.0',
        Date.now() - startTime,
        {}
      )
    };
  }

  private generateRequestId(): string {
    return `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeWorkflows(): void {
    // Default analysis workflow
    this.workflows.set('analysis', {
      id: 'comprehensive-analysis',
      name: 'Comprehensive Project Analysis',
      steps: [
        { id: 'structure', analyzer: 'structure' },
        { id: 'technology', analyzer: 'technology' },
        { id: 'dependencies', analyzer: 'dependency', optional: true },
        { id: 'security', analyzer: 'security', optional: true }
      ],
      parallel: true,
      timeout: 30000 // ANALYSIS_CONFIG.DEFAULT_TIMEOUT
    });

    // Deployment workflow
    this.workflows.set('deployment', {
      id: 'deployment-analysis',
      name: 'Deployment Strategy Analysis',
      steps: [
        { id: 'structure', analyzer: 'structure' },
        { id: 'technology', analyzer: 'technology' },
        { id: 'deployment', analyzer: 'deployment', optional: true }
      ],
      parallel: false,
      timeout: 30000
    });

    // Security workflow
    this.workflows.set('security', {
      id: 'security-analysis',
      name: 'Security Assessment',
      steps: [
        { id: 'security', analyzer: 'security' },
        { id: 'dependencies', analyzer: 'dependency', optional: true }
      ],
      parallel: true,
      timeout: 30000
    });
  }

  // ============================================================================
  // PIPELINE MANAGEMENT METHODS (FROM ANALYSIS-PIPELINE-MANAGER.TS)
  // ============================================================================

  /**
   * Register a new analysis pipeline
   * (from analysis-pipeline-manager.ts)
   */
  registerPipeline<TInput, TOutput>(pipeline: PipelineDefinition<TInput, TOutput>): void {
    const validation = this.validatePipelineDefinition(pipeline);
    if (!validation.valid) {
      throw new Error(`Invalid pipeline definition: ${validation.errors.join(', ')}`);
    }

    this.pipelines.set(pipeline.id, pipeline);
  }

  /**
   * Execute a pipeline with given input
   * (from analysis-pipeline-manager.ts)
   */
  async executePipeline<TInput, TOutput>(
    pipelineId: string,
    input: TInput,
    options?: {
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      timeout?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<AnalysisResult<TOutput>> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const execution = this.createExecution(pipeline, options);
    this.executions.set(execution.id, execution);

    try {
      if (this.getActiveExecutionCount() >= this.maxConcurrentExecutions) {
        // Queue the execution
        this.executionQueue.push({ execution, input });
        execution.context.logger.info('Execution queued due to concurrency limit');
        await this.processQueue();
      } else {
        // Execute immediately
        await this.executeSteps(execution, input);
      }

      return execution.result || this.createPipelineErrorResult('Execution completed without result', execution.context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      execution.context.logger.error('Pipeline execution failed', error);
      return this.createPipelineErrorResult(errorMessage, execution.context);
    } finally {
      this.executions.delete(execution.id);
    }
  }

  /**
   * Execute batch analysis using specified pipeline
   * (from analysis-pipeline-manager.ts)
   */
  async executeBatch<TInput, TOutput>(
    request: BatchAnalysisRequest
  ): Promise<BatchAnalysisResult<TOutput>> {
    const startTime = Date.now();
    const completed: Array<{ id: string; result: AnalysisResult<TOutput> }> = [];
    const failed: Array<{ id: string; error: string }> = [];

    const pipeline = this.pipelines.get(request.pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${request.pipelineId} not found`);
    }

    // Process items with controlled concurrency
    const concurrency = Math.min(request.concurrency || 3, request.items.length);
    const semaphore = new Array(concurrency).fill(null);

    const processItem = async (item: { id: string; data: any; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }) => {
      try {
        const result = await this.executePipeline<TInput, TOutput>(
          request.pipelineId,
          item.data,
          {
            ...(item.priority && { priority: item.priority }),
            ...(request.timeout !== undefined && { timeout: request.timeout }),
            metadata: { batchId: `batch_${startTime}`, itemId: item.id }
          }
        );

        if (result.success) {
          completed.push({ id: item.id, result });
        } else {
          failed.push({ id: item.id, error: result.error || 'Unknown error' });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Item processing failed';
        failed.push({ id: item.id, error: errorMessage });

        if (!request.continueOnError) {
          throw error;
        }
      }
    };

    // Execute with controlled concurrency
    await Promise.all(
      semaphore.map(async () => {
        while (request.items.length > 0) {
          const item = request.items.shift();
          if (item) {
            await processItem(item);
          }
        }
      })
    );

    const duration = Date.now() - startTime;
    const totalProcessed = completed.length + failed.length;

    return {
      completed,
      failed,
      totalProcessed,
      duration,
      statistics: {
        successRate: totalProcessed > 0 ? completed.length / totalProcessed : 0,
        averageExecutionTime: totalProcessed > 0 ? duration / totalProcessed : 0,
        totalWarnings: completed.reduce((sum, c) => sum + c.result.warnings.length, 0),
        totalErrors: failed.length
      }
    };
  }

  /**
   * Get pipeline execution status
   * (from analysis-pipeline-manager.ts)
   */
  getExecutionStatus(executionId: string): PipelineExecution | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * Get all active executions
   * (from analysis-pipeline-manager.ts)
   */
  getActiveExecutions(): PipelineExecution[] {
    return Array.from(this.executions.values()).filter(
      execution => execution.status === 'IN_PROGRESS'
    );
  }

  /**
   * Cancel a running execution
   * (from analysis-pipeline-manager.ts)
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'IN_PROGRESS') {
      return false;
    }

    const updatedExecution: PipelineExecution = {
      ...execution,
      status: 'CANCELLED'
    };
    this.executions.set(executionId, updatedExecution);
    execution.context.logger.info('Execution cancelled by user request');
    return true;
  }

  // ============================================================================
  // PRIVATE PIPELINE HELPER METHODS
  // ============================================================================

  private async executeSteps<TInput, _TOutput>(
    execution: PipelineExecution,
    input: TInput
  ): Promise<void> {
    const updatedExecution = { ...execution, status: 'IN_PROGRESS' as const };
    this.executions.set(execution.id, updatedExecution);
    const pipeline = this.pipelines.get(execution.pipelineId)!;
    let currentInput = input;

    try {
      if (pipeline.parallel) {
        await this.executeStepsParallel(execution, pipeline, currentInput);
      } else {
        await this.executeStepsSequential(execution, pipeline, currentInput);
      }

      const completedExecution = {
        ...execution,
        status: 'COMPLETED' as const,
        endTime: Date.now(),
        progress: 100,
        result: this.createPipelineSuccessResult(
          execution.context.stepResults.get('final') || currentInput,
          execution.context
        )
      };
      this.executions.set(execution.id, completedExecution);
    } catch (error) {
      execution.context.logger.error('Pipeline execution failed', error);

      const failedExecution = {
        ...execution,
        status: 'FAILED' as const,
        endTime: Date.now(),
        result: this.createPipelineErrorResult(
          error instanceof Error ? error.message : 'Pipeline execution failed',
          execution.context
        )
      };
      this.executions.set(execution.id, failedExecution);
    }
  }

  private async executeStepsSequential(
    execution: PipelineExecution,
    pipeline: PipelineDefinition,
    input: any
  ): Promise<void> {
    let currentInput = input;

    for (let i = 0; i < pipeline.steps.length; i++) {
      const step = pipeline.steps[i];
      if (!step) continue;
      
      const updatedExecution = {
        ...execution,
        currentStep: step.id,
        progress: (i / pipeline.steps.length) * 100
      };
      this.executions.set(execution.id, updatedExecution);

      // Check if step should be executed
      if (step.condition && !step.condition(currentInput, updatedExecution.context)) {
        updatedExecution.context.logger.info(`Skipping step ${step.id} due to condition`);
        continue;
      }

      try {
        updatedExecution.context.logger.info(`Executing step: ${step.name}`);
        const stepResult = await this.executeStep(step, currentInput, updatedExecution.context);
        updatedExecution.context.stepResults.set(step.id, stepResult);
        currentInput = stepResult; // Pass result to next step
      } catch (error) {
        if (step.optional) {
          updatedExecution.context.warnings.push(`Optional step ${step.id} failed: ${error}`);
          updatedExecution.context.logger.warn(`Optional step ${step.id} failed`, error);
        } else {
          throw error;
        }
      }
    }

    execution.context.stepResults.set('final', currentInput);
  }

  private async executeStepsParallel(
    execution: PipelineExecution,
    pipeline: PipelineDefinition,
    input: any
  ): Promise<void> {
    const stepPromises = pipeline.steps.map(async (step, index) => {
      const updatedExecution = {
        ...execution,
        currentStep: step.id,
        progress: ((index + 1) / pipeline.steps.length) * 100
      };
      this.executions.set(execution.id, updatedExecution);

      if (step.condition && !step.condition(input, updatedExecution.context)) {
        updatedExecution.context.logger.info(`Skipping step ${step.id} due to condition`);
        return null;
      }

      try {
        updatedExecution.context.logger.info(`Executing step: ${step.name}`);
        const result = await this.executeStep(step, input, updatedExecution.context);
        updatedExecution.context.stepResults.set(step.id, result);
        return { stepId: step.id, result };
      } catch (error) {
        if (step.optional) {
          updatedExecution.context.warnings.push(`Optional step ${step.id} failed: ${error}`);
          updatedExecution.context.logger.warn(`Optional step ${step.id} failed`, error);
          return null;
        } else {
          throw error;
        }
      }
    });

    const results = await Promise.all(stepPromises);
    const successfulResults = results.filter(r => r !== null);

    // Merge parallel results
    execution.context.stepResults.set('final', {
      parallelResults: successfulResults,
      originalInput: input
    });
  }

  private async executeStep<TInput, TOutput>(
    step: PipelineStep<TInput, TOutput>,
    input: TInput,
    context: PipelineContext
  ): Promise<TOutput> {
    const timeout = step.timeout || 30000; // DEFAULT_TIMEOUT
    const retryCount = step.retryCount || 1;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Step ${step.id} timed out after ${timeout}ms`)), timeout);
        });

        const executePromise = step.execute(input, context);
        return await Promise.race([executePromise, timeoutPromise]);
      } catch (error) {
        if (attempt === retryCount) {
          throw error;
        }

        context.logger.warn(`Step ${step.id} attempt ${attempt} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }

    throw new Error(`Step ${step.id} failed after ${retryCount} attempts`);
  }

  private createExecution(
    pipeline: PipelineDefinition,
    options?: {
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      timeout?: number;
      metadata?: Record<string, any>;
    }
  ): PipelineExecution {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const logger: PipelineLogger = {
      debug: (message, data) => console.debug(`[${executionId}] ${message}`, data),
      info: (message, data) => console.info(`[${executionId}] ${message}`, data),
      warn: (message, data) => console.warn(`[${executionId}] ${message}`, data),
      error: (message, error) => console.error(`[${executionId}] ${message}`, error)
    };

    const context: PipelineContext = {
      executionId,
      startTime,
      metadata: options?.metadata || {},
      logger,
      stepResults: new Map(),
      warnings: [],
      errors: []
    };

    return {
      id: executionId,
      pipelineId: pipeline.id,
      status: 'PENDING',
      startTime,
      progress: 0,
      context
    };
  }

  private createPipelineSuccessResult<T>(data: T, context: PipelineContext): AnalysisResult<T> {
    return {
      success: true,
      data,
      warnings: context.warnings,
      confidence: 0.9, // Default confidence for successful pipeline
      metadata: AnalysisUtils.createAnalysisMetadata(
        'pipeline-manager',
        '1.0.0',
        Date.now() - context.startTime,
        context.metadata
      )
    };
  }

  private createPipelineErrorResult(error: string, context: PipelineContext): AnalysisResult<any> {
    return {
      success: false,
      error,
      warnings: context.warnings,
      confidence: 0,
      metadata: AnalysisUtils.createAnalysisMetadata(
        'pipeline-manager',
        '1.0.0',
        Date.now() - context.startTime,
        context.metadata
      )
    };
  }

  private validatePipelineDefinition(pipeline: PipelineDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!pipeline.id) errors.push('Pipeline ID is required');
    if (!pipeline.name) errors.push('Pipeline name is required');
    if (!pipeline.steps || pipeline.steps.length === 0) errors.push('Pipeline must have at least one step');

    pipeline.steps.forEach((step, index) => {
      if (!step.id) errors.push(`Step ${index} missing ID`);
      if (!step.name) errors.push(`Step ${index} missing name`);
      if (!step.execute) errors.push(`Step ${index} missing execute function`);
    });

    return { valid: errors.length === 0, errors };
  }

  private getActiveExecutionCount(): number {
    return Array.from(this.executions.values()).filter(
      execution => execution.status === 'IN_PROGRESS'
    ).length;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.executionQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.executionQueue.length > 0 && this.getActiveExecutionCount() < this.maxConcurrentExecutions) {
        const item = this.executionQueue.shift();
        if (item) {
          // Don't await - allow concurrent execution
          this.executeSteps(item.execution, item.input).catch(error => {
            item.execution.context.logger.error('Queued execution failed', error);
          });
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private initializeDefaultPipelines(): void {
    // Comprehensive analysis pipeline
    this.registerPipeline({
      id: 'comprehensive-analysis',
      name: 'Comprehensive Project Analysis',
      description: 'Complete analysis including structure, technology, dependencies, and security',
      steps: [
        {
          id: 'validate-input',
          name: 'Validate Input',
          execute: async (input: { projectPath: string }) => {
            if (!input.projectPath) {
              throw new Error('Project path is required');
            }
            return input;
          }
        },
        {
          id: 'analyze-structure',
          name: 'Analyze Project Structure',
          execute: async (input) => {
            // Use the unified analysis pipeline for structure analysis
            const result = await this.analyzeProjectComprehensively(input.projectPath);
            return result.data || { structure: 'analyzed', files: [], directories: [] };
          }
        },
        {
          id: 'detect-technologies',
          name: 'Detect Technologies',
          execute: async (input) => {
            // Extract technology information from analysis
            const analysis = await this.analyzeProjectComprehensively(input.projectPath);
            return analysis.data?.languages || { technologies: [], frameworks: [], languages: [] };
          }
        },
        {
          id: 'security-scan',
          name: 'Security Scan',
          execute: async (_input) => {
            // Placeholder for security scanning - would integrate with security analyzers
            return { vulnerabilities: [], recommendations: [] };
          },
          optional: true
        }
      ],
      parallel: false,
      priority: 'MEDIUM',
      timeout: 30000
    });

    // Quick analysis pipeline
    this.registerPipeline({
      id: 'quick-analysis',
      name: 'Quick Project Analysis',
      description: 'Fast analysis focusing on essential project information',
      steps: [
        {
          id: 'basic-structure',
          name: 'Basic Structure Analysis',
          execute: async (_input) => {
            // Simplified structure analysis
            return { basicStructure: 'analyzed' };
          }
        },
        {
          id: 'technology-detection',
          name: 'Technology Detection',
          execute: async (_input) => {
            // Quick technology detection
            return { basicStructure: '', technologies: [] };
          }
        }
      ],
      parallel: true,
      priority: 'HIGH',
      timeout: 10000 // 10 seconds for quick analysis
    });
  }
}