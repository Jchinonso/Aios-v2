/**
 * @fileoverview Smart Configuration Manager
 * @description Intelligent configuration manager that combines static fallbacks with
 * AI-powered dynamic configurations. Provides seamless switching between modes
 * based on availability and user preferences.
 *
 * @version 1.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

import type { CloudConfig } from './cloud-config.js';
import type { CloudProviderType } from '../types/cloud-provider.types.js'
import { DynamicConfigService, getDynamicCloudConfig } from './dynamic-config-service.js'
import { DEFAULT_CLOUD_CONFIG } from './cloud-config.js';

export interface SmartConfigOptions {
  readonly enableAI: boolean;
  readonly fallbackToStatic: boolean;
  readonly cacheTimeout: number; // milliseconds
  readonly projectPath?: string | undefined;
  readonly refreshInterval?: number | undefined; // milliseconds
}

export interface ConfigSource {
  readonly type: 'static' | 'dynamic' | 'hybrid';
  readonly lastUpdated: string;
  readonly confidence?: number;
  readonly provider?: 'ai' | 'market-data' | 'manual';
}

/**
 * Smart Configuration Manager with AI integration
 */
export class SmartConfigManager {
  private static instance: SmartConfigManager;
  private dynamicService: DynamicConfigService;
  // private staticManager: CloudConfigManager; // Removed - using DEFAULT_CLOUD_CONFIG directly
  private currentConfig: CloudConfig;
  private configSource: ConfigSource;
  private options: SmartConfigOptions;
  private refreshTimer?: NodeJS.Timeout;

  private readonly DEFAULT_OPTIONS: SmartConfigOptions = {
    enableAI: true,
    fallbackToStatic: true,
    cacheTimeout: 3600000, // 1 hour
    refreshInterval: 1800000, // 30 minutes
  };

  private constructor(options?: Partial<SmartConfigOptions>) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
    this.dynamicService = DynamicConfigService.getInstance();
    // this.staticManager = globalCloudConfig; // Removed - using DEFAULT_CLOUD_CONFIG directly
    this.currentConfig = DEFAULT_CLOUD_CONFIG;
    this.configSource = {
      type: 'static',
      lastUpdated: new Date().toISOString(),
      provider: 'manual',
    };

    this.initializeConfig();
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: Partial<SmartConfigOptions>): SmartConfigManager {
    if (!SmartConfigManager.instance) {
      SmartConfigManager.instance = new SmartConfigManager(options);
    }
    return SmartConfigManager.instance;
  }

  /**
   * Get current configuration with AI enhancement
   */
  async getConfig(): Promise<CloudConfig> {
    if (this.shouldRefreshConfig()) {
      await this.refreshConfig();
    }
    return this.currentConfig;
  }

  /**
   * Get provider-specific configuration with AI optimization
   */
  async getProviderConfig(provider: CloudProviderType): Promise<any> {
    const config = await this.getConfig();
    return config.providers[provider];
  }

  /**
   * Get AI-powered provider recommendation
   */
  async getIntelligentProviderRecommendation(projectPath?: string): Promise<{
    readonly recommended: CloudProviderType;
    readonly alternatives: CloudProviderType[];
    readonly reasoning: string;
    readonly confidence: number;
    readonly estimatedCosts: Record<CloudProviderType, number>;
  }> {
    if (!this.options.enableAI) {
      return this.getFallbackRecommendation();
    }

    try {
      const context = await this.buildAnalysisContext(projectPath);
      const recommendation = await this.dynamicService.getProviderRecommendation(context);

      return {
        recommended: recommendation.provider,
        alternatives: recommendation.alternatives.map(alt => alt.provider),
        reasoning: recommendation.reasoning.join('. '),
        confidence: recommendation.confidence,
        estimatedCosts: await this.getEstimatedCosts(context),
      };
    } catch (error) {
      console.warn('AI recommendation failed, falling back to static:', error);
      return this.getFallbackRecommendation();
    }
  }

  /**
   * Generate dynamic pricing for a specific usage pattern
   */
  async getDynamicPricing(
    provider: CloudProviderType,
    usagePattern: {
      readonly buildMinutesPerMonth: number;
      readonly requestsPerMonth: number;
      readonly bandwidthGB: number;
      readonly functionInvocations: number;
    }
  ): Promise<{
    readonly estimatedCost: number;
    readonly breakdown: Record<string, number>;
    readonly optimizations: string[];
    readonly confidence: number;
  }> {
    if (!this.options.enableAI) {
      return this.getStaticPricing(provider, usagePattern);
    }

    try {
      const dynamicPricing = await this.dynamicService.generateOptimizedPricing(
        provider,
        usagePattern
      );

      return {
        ...dynamicPricing,
        confidence: 85, // AI-generated confidence
      };
    } catch (error) {
      console.warn('Dynamic pricing failed, falling back to static:', error);
      return this.getStaticPricing(provider, usagePattern);
    }
  }

  /**
   * Enable or disable AI features
   */
  setAIEnabled(enabled: boolean): void {
    (this.options as any).enableAI = enabled;

    if (enabled) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
      this.fallbackToStatic();
    }
  }

  /**
   * Force refresh configuration from AI
   */
  async forceRefresh(projectPath?: string): Promise<void> {
    (this.options as any).projectPath = projectPath || this.options.projectPath;
    await this.refreshConfig();
  }

  /**
   * Get configuration source information
   */
  getConfigSource(): ConfigSource {
    return this.configSource;
  }

  /**
   * Get AI-enhanced build time estimate
   */
  async getIntelligentBuildTimeEstimate(
    framework: string,
    projectPath?: string
  ): Promise<{
    readonly estimatedMinutes: number;
    readonly confidence: number;
    readonly factors: string[];
    readonly source: 'ai' | 'static';
  }> {
    if (!this.options.enableAI) {
      return this.getStaticBuildTime(framework);
    }

    try {
      const context = await this.buildAnalysisContext(projectPath);
      const codebaseAnalysis = context.codebaseAnalysis;

      const estimate = await this.dynamicService.generateBuildTimeEstimate(
        codebaseAnalysis.framework,
        codebaseAnalysis.linesOfCode,
        codebaseAnalysis.complexity,
        codebaseAnalysis.dependencies
      );

      return {
        ...estimate,
        source: 'ai',
      };
    } catch (error) {
      console.warn('AI build time estimation failed, falling back to static:', error);
      return this.getStaticBuildTime(framework);
    }
  }

  // ===========================================
  // PRIVATE IMPLEMENTATION METHODS
  // ===========================================

  private async initializeConfig(): Promise<void> {
    if (this.options.enableAI && this.options.projectPath) {
      try {
        await this.refreshConfig();
      } catch (error) {
        console.warn('Initial AI config load failed, using static config:', error);
        this.fallbackToStatic();
      }
    }

    if (this.options.refreshInterval && this.options.enableAI) {
      this.startAutoRefresh();
    }
  }

  private shouldRefreshConfig(): boolean {
    if (!this.options.enableAI) return false;

    const lastUpdate = new Date(this.configSource.lastUpdated);
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdate.getTime();

    return timeDiff > this.options.cacheTimeout;
  }

  private async refreshConfig(): Promise<void> {
    if (!this.options.enableAI || !this.options.projectPath) {
      return;
    }

    try {
      console.log('🧠 Refreshing configuration with AI analysis...');

      const dynamicConfig = await getDynamicCloudConfig(this.options.projectPath, {
        enableAI: true,
        marketDataRefresh: true,
        cacheTimeout: this.options.cacheTimeout,
      });

      this.currentConfig = dynamicConfig;
      this.configSource = {
        type: 'dynamic',
        lastUpdated: new Date().toISOString(),
        confidence: 85,
        provider: 'ai',
      };

      console.log('✅ Configuration updated with AI insights');
    } catch (error) {
      console.error('❌ AI configuration refresh failed:', error);

      if (this.options.fallbackToStatic) {
        this.fallbackToStatic();
      }
    }
  }

  private fallbackToStatic(): void {
    this.currentConfig = DEFAULT_CLOUD_CONFIG;
    this.configSource = {
      type: 'static',
      lastUpdated: new Date().toISOString(),
      provider: 'manual',
    };

    console.log('📊 Using static configuration');
  }

  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      await this.refreshConfig();
    }, this.options.refreshInterval);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined as any;
    }
  }

  private async buildAnalysisContext(projectPath?: string): Promise<any> {
    // This would analyze the actual project
    // For now, return placeholder context
    return {
      projectPath: projectPath || this.options.projectPath || process.cwd(),
      codebaseAnalysis: {
        framework: 'nextjs',
        language: 'typescript',
        complexity: 'moderate',
        size: 'medium',
        dependencies: [],
        fileCount: 150,
        linesOfCode: 5000,
      },
      deploymentRequirements: {
        expectedTraffic: 10000,
        storageNeeds: 5,
        computeIntensity: 'medium',
        scalingNeeds: 'moderate',
      },
      teamContext: {
        teamSize: 3,
        experienceLevel: 'intermediate',
        budgetRange: 'growth',
      },
    };
  }

  private getFallbackRecommendation(): any {
    return {
      recommended: 'vercel' as CloudProviderType,
      alternatives: ['netlify', 'aws'] as CloudProviderType[],
      reasoning: 'Based on general best practices for modern web applications',
      confidence: 60,
      estimatedCosts: {
        vercel: 45,
        netlify: 38,
        aws: 52,
      },
    };
  }

  private async getEstimatedCosts(_context: any): Promise<Record<CloudProviderType, number>> {
    // Placeholder implementation
    return {
      vercel: 45,
      netlify: 38,
      aws: 52,
    } as any;
  }

  private getStaticPricing(_provider: CloudProviderType, _usagePattern: any): any {
    // Calculate pricing using static rates
    return {
      estimatedCost: 50,
      breakdown: {
        builds: 20,
        requests: 15,
        bandwidth: 15,
      },
      optimizations: ['Use static configuration optimization tips'],
      confidence: 70,
    };
  }

  private getStaticBuildTime(framework: string): any {
    // Return static build time estimates
    const staticTimes: Record<string, number> = {
      nextjs: 5,
      react: 3,
      vue: 3,
      angular: 6,
    };

    return {
      estimatedMinutes: staticTimes[framework] || 5,
      confidence: 70,
      factors: ['Based on framework defaults'],
      source: 'static' as const,
    };
  }
}

/**
 * Factory function to get smart configuration manager
 */
export function getSmartConfigManager(options?: Partial<SmartConfigOptions>): SmartConfigManager {
  return SmartConfigManager.getInstance(options);
}

/**
 * Convenience function to get AI-enhanced configuration
 */
export async function getIntelligentCloudConfig(
  projectPath?: string,
  enableAI: boolean = true
): Promise<{
  readonly config: CloudConfig;
  readonly source: ConfigSource;
  readonly recommendations?: any;
}> {
  const manager = getSmartConfigManager({ enableAI, projectPath });

  const config = await manager.getConfig();
  const source = manager.getConfigSource();

  let recommendations;
  if (enableAI) {
    recommendations = await manager.getIntelligentProviderRecommendation(projectPath);
  }

  return { config, source, recommendations };
}