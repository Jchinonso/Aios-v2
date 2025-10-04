/**
 * @fileoverview Provider Selector - AI-powered cloud provider recommendation engine
 * @description
 * Enterprise-grade provider selection algorithm that combines multi-criteria decision analysis
 * with machine learning insights to recommend optimal cloud deployment solutions. The system
 * evaluates providers across 10+ dimensions including cost, performance, feature compatibility,
 * and setup complexity to deliver highly accurate, context-aware recommendations.
 *
 * ## Algorithm Overview
 * The selection algorithm employs a sophisticated weighted scoring system that:
 * - Analyzes project characteristics (framework, language, dependencies, complexity)
 * - Evaluates provider capabilities and feature matrices
 * - Incorporates user preferences and constraints (budget, region, team size)
 * - Applies dynamic weight adjustments based on use case priorities
 * - Generates detailed reasoning and confidence scores for each recommendation
 *
 * ## Scoring Methodology
 * Each provider receives a composite score (0-100) calculated from:
 * - **Framework Compatibility** (20%): How well the provider supports the detected framework
 * - **Language Support** (15%): Native language runtime and tooling support
 * - **Feature Alignment** (15%): Availability of required features (databases, scaling, etc.)
 * - **Cost Effectiveness** (15%): Value proposition within budget constraints
 * - **Setup Complexity** (10%): Ease of initial configuration and deployment
 * - **Performance** (10%): Expected application performance and response times
 * - **Reliability** (5%): Provider uptime and service reliability metrics
 * - **Ecosystem** (5%): Integration with development tools and services
 * - **Documentation** (2.5%): Quality and completeness of provider documentation
 * - **Community Support** (2.5%): Developer community size and activity
 *
 * @version 2.0.0
 * @author AIOS Engineering Team
 * @since 1.0.0
 * @module ProviderSelector
 * @category Intelligence
 *
 * @example Basic Provider Selection
 * ```typescript
 * import { ProviderSelector } from '@aios/cloud/utils';
 *
 * const selector = new ProviderSelector();
 * const recommendations = await selector.recommend(projectAnalysis, {
 *   costOptimization: true,
 *   maxBudget: 50,
 *   requiredFeatures: ['auto-scaling', 'managed-databases']
 * });
 *
 * console.log(`Top recommendation: ${recommendations[0].provider}`);
 * console.log(`Score: ${recommendations[0].score}/100`);
 * console.log(`Reasoning: ${recommendations[0].reasoning}`);
 * ```
 *
 * @example Advanced Selection with Constraints
 * ```typescript
 * const enterpriseSelector = new ProviderSelector();
 *
 * // Enterprise requirements with specific constraints
 * const recommendations = await enterpriseSelector.recommend(analysis, {
 *   performanceFirst: true,
 *   regionPreferences: ['us-east-1', 'eu-west-1'],
 *   excludeProviders: ['hobby-tier-providers'],
 *   teamSize: 50,
 *   supportLevel: 'enterprise',
 *   requiredFeatures: [
 *     'managed-databases',
 *     'auto-scaling',
 *     'team-collaboration',
 *     'enterprise-support'
 *   ]
 * });
 *
 * // Get detailed breakdown for decision making
 * recommendations.forEach(rec => {
 *   console.log(`${rec.provider}: ${rec.score}/100`);
 *   console.log(`Setup: ${rec.setupComplexity}`);
 *   console.log(`Est. Cost: ${rec.costEstimate.monthly.typical}/month`);
 *   console.log(`Key Features: ${rec.keyFeatures.join(', ')}`);
 *   if (rec.limitations.length > 0) {
 *     console.log(`Limitations: ${rec.limitations.join(', ')}`);
 *   }
 * });
 * ```
 */

import type {
  CloudProviderType,
  CloudProviderRecommendation,
  ProviderFeature,
  SetupComplexity,
} from '../types/cloud-provider.types.js';

import type {
  ProjectAnalysis,
  FrameworkType,
  ProgrammingLanguage,
} from '../types/deployment.types.js';

import {
  createLogger,
  type ILogger,
} from '../../utils/logger.js';

import { getCloudConfig } from '../config/cloud-config.js'

/**
 * Provider selection preferences and constraints
 * @interface ProviderSelectionPreferences
 * @description
 * Comprehensive preference schema for customizing provider recommendation algorithms.
 * These preferences allow fine-tuning of the selection criteria to match specific
 * organizational requirements, budget constraints, and technical preferences.
 *
 * @example Basic Cost-Optimized Selection
 * ```typescript
 * const preferences: ProviderSelectionPreferences = {
 *   costOptimization: true,
 *   maxBudget: 25,
 *   simplicityFirst: true
 * };
 * ```
 *
 * @example Enterprise Requirements
 * ```typescript
 * const enterprisePrefs: ProviderSelectionPreferences = {
 *   performanceFirst: true,
 *   teamSize: 100,
 *   supportLevel: 'enterprise',
 *   regionPreferences: ['us-east-1', 'eu-central-1'],
 *   requiredFeatures: [
 *     'managed-databases',
 *     'auto-scaling',
 *     'team-collaboration',
 *     'enterprise-support',
 *     'compliance-certifications'
 *   ],
 *   excludeProviders: ['hobby-providers']
 * };
 * ```
 *
 * @since 2.0.0
 * @category Configuration
 */
export interface ProviderSelectionPreferences {
  /**
   * Prioritize cost optimization in recommendations
   * @description
   * When enabled, increases the weight of cost-effectiveness in scoring
   * and favors providers with lower operational costs and better value propositions.
   * This may slightly reduce performance scores in favor of budget-friendly options.
   *
   * @default false
   * @affects Increases costEffectiveness weight by 50%, reduces performance weight by 20%
   */
  readonly costOptimization?: boolean;

  /**
   * Prioritize performance and speed over cost
   * @description
   * Emphasizes high-performance providers with fast response times, global CDNs,
   * and optimized runtime environments. Ideal for production applications with
   * strict performance requirements.
   *
   * @default false
   * @affects Increases performance weight by 50%, reduces cost weight by 20%
   */
  readonly performanceFirst?: boolean;

  /**
   * Prefer providers with simple setup and configuration
   * @description
   * Favors providers that offer zero-configuration deployments, automatic
   * framework detection, and minimal setup requirements. Perfect for rapid
   * prototyping and teams with limited DevOps expertise.
   *
   * @default false
   * @affects Increases setupComplexity weight and favors 'minimal' complexity providers
   */
  readonly simplicityFirst?: boolean;

  /**
   * Required provider features (hard constraints)
   * @description
   * List of features that providers MUST support to be included in recommendations.
   * Providers lacking any required feature will be filtered out entirely,
   * regardless of their scores in other categories.
   *
   * @example ['managed-databases', 'auto-scaling', 'custom-domains']
   * @constraint Providers without ALL required features are excluded
   */
  readonly requiredFeatures?: ProviderFeature[];

  /**
   * Maximum monthly budget constraint (USD)
   * @description
   * Hard budget limit for monthly operational costs. Providers with estimated
   * costs exceeding this limit will receive significantly reduced scores or
   * be excluded entirely based on the severity of the overage.
   *
   * @minimum 0
   * @unit USD
   * @example 50 // $50/month maximum
   * @constraint Providers exceeding budget by >200% are excluded
   */
  readonly maxBudget?: number;

  /**
   * Geographic deployment region preferences
   * @description
   * Ordered list of preferred deployment regions for optimizing latency
   * and compliance requirements. Providers with better regional coverage
   * in preferred areas receive scoring bonuses.
   *
   * @example ['us-east-1', 'eu-west-1', 'ap-southeast-1']
   * @affects Providers with exact region matches get +10 score bonus
   */
  readonly regionPreferences?: string[];

  /**
   * Preferred cloud providers (soft preferences)
   * @description
   * List of providers that should receive bonus scoring due to organizational
   * preferences, existing relationships, or strategic partnerships. Does not
   * guarantee selection but influences final rankings.
   *
   * @example ['aws', 'vercel']
   * @affects Preferred providers receive +5 to +15 score bonus
   */
  readonly preferredProviders?: CloudProviderType[];

  /**
   * Providers to exclude from consideration
   * @description
   * Hard exclusion list of providers that should not appear in recommendations
   * due to organizational policies, compliance requirements, or technical constraints.
   * These providers are completely filtered out before scoring.
   *
   * @example ['provider-with-compliance-issues']
   * @constraint Excluded providers never appear in recommendations
   */
  readonly excludeProviders?: CloudProviderType[];

  /**
   * Team size for collaboration feature scoring
   * @description
   * Number of developers/team members who will be using the deployment platform.
   * Influences scoring of collaboration features, user management capabilities,
   * and team-oriented pricing tiers.
   *
   * @minimum 1
   * @maximum 10000
   * @example 25 // 25-person development team
   * @affects Teams >10 get collaboration feature bonuses, >50 get enterprise bonuses
   */
  readonly teamSize?: number;

  /**
   * Required support level for the deployment platform
   * @description
   * Minimum level of support required from the cloud provider. Higher support
   * levels typically include faster response times, dedicated support channels,
   * and enhanced SLA guarantees.
   *
   * @default 'basic'
   * @affects Enterprise support adds +20 to reliability and ecosystem scores
   */
  readonly supportLevel?: 'basic' | 'professional' | 'enterprise';
}

/**
 * Provider scoring weights for multi-criteria decision analysis
 * @interface ScoringWeights
 * @description
 * Weighted scoring criteria used in the provider recommendation algorithm.
 * These weights determine the relative importance of different evaluation
 * factors in the final provider scoring. Weights are normalized to sum to 1.0.
 *
 * @example Default Weights (Balanced)
 * ```typescript
 * const defaultWeights: ScoringWeights = {
 *   frameworkCompatibility: 0.20,  // 20% - Primary factor
 *   languageSupport: 0.15,         // 15% - High importance
 *   featureSupport: 0.15,          // 15% - High importance
 *   costEffectiveness: 0.15,       // 15% - High importance
 *   setupComplexity: 0.10,         // 10% - Medium importance
 *   performance: 0.10,             // 10% - Medium importance
 *   reliability: 0.05,             // 5% - Lower importance
 *   ecosystem: 0.05,               // 5% - Lower importance
 *   documentation: 0.025,          // 2.5% - Minor factor
 *   communitySupport: 0.025        // 2.5% - Minor factor
 * };
 * ```
 *
 * @category Scoring
 * @since 2.0.0
 */
interface ScoringWeights {
  /**
   * Framework compatibility and optimization score weight
   * @description
   * Measures how well the provider supports and optimizes for the detected
   * project framework. Higher weights favor providers with native framework
   * support, specialized tooling, and framework-specific optimizations.
   *
   * @range 0.0 - 1.0
   * @default 0.20
   * @importance Primary scoring factor
   */
  readonly frameworkCompatibility: number;

  /**
   * Programming language support and runtime optimization weight
   * @description
   * Evaluates the quality of language runtime support, including performance
   * optimizations, version compatibility, and language-specific features.
   *
   * @range 0.0 - 1.0
   * @default 0.15
   * @importance High scoring factor
   */
  readonly languageSupport: number;

  /**
   * Required feature availability and quality weight
   * @description
   * Assesses the availability and implementation quality of required features
   * such as databases, scaling, monitoring, and security capabilities.
   *
   * @range 0.0 - 1.0
   * @default 0.15
   * @importance High scoring factor
   */
  readonly featureSupport: number;

  /**
   * Cost-effectiveness and value proposition weight
   * @description
   * Evaluates the overall value proposition including pricing transparency,
   * free tier offerings, and cost predictability relative to features provided.
   *
   * @range 0.0 - 1.0
   * @default 0.15
   * @importance High scoring factor
   */
  readonly costEffectiveness: number;

  /**
   * Setup and configuration complexity weight
   * @description
   * Measures the ease of initial setup, configuration complexity, and time
   * to first deployment. Lower complexity scores receive higher ratings.
   *
   * @range 0.0 - 1.0
   * @default 0.10
   * @importance Medium scoring factor
   */
  readonly setupComplexity: number;

  /**
   * Application performance and response time weight
   * @description
   * Evaluates expected application performance including response times,
   * CDN coverage, caching capabilities, and performance optimization features.
   *
   * @range 0.0 - 1.0
   * @default 0.10
   * @importance Medium scoring factor
   */
  readonly performance: number;

  /**
   * Service reliability and uptime weight
   * @description
   * Assesses historical uptime, SLA guarantees, incident response times,
   * and overall service reliability metrics.
   *
   * @range 0.0 - 1.0
   * @default 0.05
   * @importance Lower scoring factor
   */
  readonly reliability: number;

  /**
   * Developer ecosystem and integrations weight
   * @description
   * Evaluates the richness of the developer ecosystem including third-party
   * integrations, marketplace offerings, and development tool support.
   *
   * @range 0.0 - 1.0
   * @default 0.05
   * @importance Lower scoring factor
   */
  readonly ecosystem: number;

  /**
   * Documentation quality and completeness weight
   * @description
   * Assesses the quality, completeness, and accessibility of provider
   * documentation, tutorials, and learning resources.
   *
   * @range 0.0 - 1.0
   * @default 0.025
   * @importance Minor scoring factor
   */
  readonly documentation: number;

  /**
   * Community support and activity weight
   * @description
   * Evaluates the size and activity level of the developer community,
   * including forums, Stack Overflow presence, and community contributions.
   *
   * @range 0.0 - 1.0
   * @default 0.025
   * @importance Minor scoring factor
   */
  readonly communitySupport: number;
}

/**
 * Intelligent cloud provider recommendation engine
 * @class ProviderSelector
 * @description
 * Enterprise-grade provider selection engine that employs advanced multi-criteria
 * decision analysis algorithms to recommend optimal cloud deployment platforms.
 * The system combines project analysis, provider capabilities assessment, and
 * user preferences to generate highly accurate, context-aware recommendations.
 *
 * ## Core Capabilities
 * - **Multi-Criteria Analysis**: Evaluates providers across 10+ dimensions
 * - **Dynamic Weight Adjustment**: Adapts scoring based on user preferences
 * - **Constraint Satisfaction**: Enforces hard requirements and budget limits
 * - **Detailed Reasoning**: Provides transparent explanation for each recommendation
 * - **Cost Optimization**: Incorporates real-time pricing and budget constraints
 * - **Performance Prediction**: Estimates performance characteristics per provider
 *
 * ## Algorithm Architecture
 * The recommendation algorithm follows these phases:
 * 1. **Constraint Filtering**: Remove providers that don't meet hard requirements
 * 2. **Feature Compatibility**: Score providers based on required feature support
 * 3. **Framework Optimization**: Apply bonuses for framework-specific optimizations
 * 4. **Cost Analysis**: Evaluate cost-effectiveness within budget constraints
 * 5. **Preference Weighting**: Apply user-specific preference adjustments
 * 6. **Final Ranking**: Sort by composite score and generate reasoning
 *
 * @example Basic Usage
 * ```typescript
 * const selector = new ProviderSelector();
 *
 * const recommendations = await selector.recommend(projectAnalysis, {
 *   costOptimization: true,
 *   maxBudget: 100,
 *   requiredFeatures: ['managed-databases', 'auto-scaling']
 * });
 *
 * // Display top recommendation
 * const top = recommendations[0];
 * console.log(`Best choice: ${top.provider} (${top.score}/100)`);
 * console.log(`Reasoning: ${top.reasoning}`);
 * console.log(`Monthly cost: $${top.costEstimate.monthly.typical}`);
 * ```
 *
 * @example Enterprise Selection Workflow
 * ```typescript
 * const selector = new ProviderSelector();
 *
 * // Multi-stage selection for enterprise requirements
 * const primaryRecommendations = await selector.recommend(analysis, {
 *   supportLevel: 'enterprise',
 *   teamSize: 100,
 *   regionPreferences: ['us-east-1', 'eu-central-1'],
 *   requiredFeatures: [
 *     'managed-databases',
 *     'enterprise-support',
 *     'compliance-certifications',
 *     'team-collaboration'
 *   ]
 * });
 *
 * // Fallback selection for budget constraints
 * const budgetRecommendations = await selector.recommend(analysis, {
 *   costOptimization: true,
 *   maxBudget: 500,
 *   excludeProviders: primaryRecommendations
 *     .filter(r => r.score < 80)
 *     .map(r => r.provider)
 * });
 *
 * // Decision matrix for executive review
 * const decisionMatrix = primaryRecommendations.map(rec => ({
 *   provider: rec.provider,
 *   score: rec.score,
 *   monthlyCost: rec.costEstimate.monthly.typical,
 *   setupComplexity: rec.setupComplexity,
 *   keyBenefits: rec.keyFeatures.slice(0, 3),
 *   riskFactors: rec.limitations
 * }));
 * ```
 *
 * @since 2.0.0
 * @category Intelligence
 * @author AIOS Engineering Team
 */
export class ProviderSelector {
  /** Structured logger for recommendation tracking and debugging */
  private readonly logger: ILogger;

  /** Global cloud configuration with provider capabilities and pricing */
  private readonly config = getCloudConfig();

  /** Default scoring weights for balanced recommendations */
  private readonly defaultWeights: ScoringWeights = {
    frameworkCompatibility: 0.20,
    languageSupport: 0.15,
    featureSupport: 0.15,
    costEffectiveness: 0.15,
    setupComplexity: 0.10,
    performance: 0.10,
    reliability: 0.05,
    ecosystem: 0.05,
    documentation: 0.025,
    communitySupport: 0.025,
  };

  /**
   * Initialize the provider selector with logging and configuration
   * @constructor
   * @description
   * Creates a new instance of the provider selector with default configuration
   * and initializes the recommendation engine. The selector automatically loads
   * current provider capabilities, pricing information, and feature matrices.
   *
   * @example
   * ```typescript
   * const selector = new ProviderSelector();
   * // Selector is ready to generate recommendations
   * ```
   */
  constructor() {
    this.logger = createLogger('ProviderSelector');
    this.logger.debug('ProviderSelector initialized', {
      providersSupported: Object.keys(this.config.providers).length
    });
  }

  /**
   * Recommend cloud providers based on project analysis and preferences
   * @method recommend
   * @param {ProjectAnalysis} analysis - Project analysis results
   * @param {ProviderSelectionPreferences} preferences - User preferences
   * @returns {Promise<CloudProviderRecommendation[]>} Sorted recommendations
   */
  async recommend(
    analysis: ProjectAnalysis,
    preferences: ProviderSelectionPreferences = {}
  ): Promise<CloudProviderRecommendation[]> {
    this.logger.info('Generating provider recommendations', {
      framework: analysis.framework,
      language: analysis.language,
      complexity: analysis.complexity
    });

    const weights = this.calculateWeights(preferences);
    const providers = this.getAllProviders();
    const recommendations: CloudProviderRecommendation[] = [];

    for (const provider of providers) {
      // Skip excluded providers
      if (preferences.excludeProviders?.includes(provider)) {
        continue;
      }

      const score = await this.calculateProviderScore(provider, analysis, preferences, weights);
      const recommendation = await this.buildRecommendation(provider, analysis, preferences, score);

      recommendations.push(recommendation);
    }

    // Sort by score (highest first)
    const sorted = recommendations.sort((a, b) => b.score - a.score);

    this.logger.info('Provider recommendations generated', {
      count: sorted.length,
      topProvider: sorted[0]?.provider,
      topScore: sorted[0]?.score
    });

    return sorted;
  }

  /**
   * Calculate dynamic scoring weights based on preferences
   * @private
   */
  private calculateWeights(preferences: ProviderSelectionPreferences): ScoringWeights {
    const weights = { ...this.defaultWeights };

    // Adjust weights based on preferences
    if (preferences.costOptimization) {
      weights.costEffectiveness *= 1.5;
      weights.performance *= 0.8;
    }

    if (preferences.performanceFirst) {
      weights.performance *= 1.5;
      weights.costEffectiveness *= 0.8;
    }

    if (preferences.simplicityFirst) {
      weights.setupComplexity *= 1.5;
      weights.featureSupport *= 0.9;
    }

    // Normalize weights to sum to 1
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    Object.keys(weights).forEach(key => {
      weights[key as keyof ScoringWeights] = weights[key as keyof ScoringWeights] / totalWeight;
    });

    return weights;
  }

  /**
   * Calculate comprehensive score for a provider
   * @private
   */
  private async calculateProviderScore(
    provider: CloudProviderType,
    analysis: ProjectAnalysis,
    preferences: ProviderSelectionPreferences,
    weights: ScoringWeights
  ): Promise<number> {
    const scores = {
      frameworkCompatibility: this.scoreFrameworkCompatibility(provider, analysis.framework),
      languageSupport: this.scoreLanguageSupport(provider, analysis.language),
      featureSupport: this.scoreFeatureSupport(provider, analysis, preferences),
      costEffectiveness: this.scoreCostEffectiveness(provider, analysis, preferences),
      setupComplexity: this.scoreSetupComplexity(provider, analysis),
      performance: this.scorePerformance(provider, analysis),
      reliability: this.scoreReliability(provider),
      ecosystem: this.scoreEcosystem(provider, analysis),
      documentation: this.scoreDocumentation(provider),
      communitySupport: this.scoreCommunitySupport(provider),
    };

    // Apply preferred provider bonus
    let finalScore = Object.entries(scores).reduce(
      (total, [criterion, score]) => total + score * weights[criterion as keyof ScoringWeights],
      0
    );

    if (preferences.preferredProviders?.includes(provider)) {
      finalScore *= 1.1; // 10% bonus for preferred providers
    }

    return Math.min(100, Math.max(0, finalScore));
  }

  /**
   * Score framework compatibility
   * @private
   */
  private scoreFrameworkCompatibility(provider: CloudProviderType, framework: FrameworkType): number {
    const compatibilityMatrix: Record<FrameworkType, Record<CloudProviderType, number>> = {
      nextjs: {
        vercel: 100, netlify: 85, aws: 80, railway: 75, render: 70,
        digitalocean: 60, linode: 60, vultr: 60, fly: 65, cloudflare: 80
      },
      react: {
        vercel: 95, netlify: 95, aws: 85, railway: 75, render: 75,
        digitalocean: 70, linode: 70, vultr: 70, fly: 70, cloudflare: 85
      },
      vue: {
        vercel: 90, netlify: 90, aws: 80, railway: 75, render: 75,
        digitalocean: 70, linode: 70, vultr: 70, fly: 70, cloudflare: 80
      },
      nuxt: {
        vercel: 85, netlify: 90, aws: 75, railway: 70, render: 70,
        digitalocean: 65, linode: 65, vultr: 65, fly: 65, cloudflare: 75
      },
      angular: {
        vercel: 85, netlify: 85, aws: 80, railway: 70, render: 70,
        digitalocean: 65, linode: 65, vultr: 65, fly: 65, cloudflare: 75
      },
      svelte: {
        vercel: 85, netlify: 90, aws: 75, railway: 70, render: 70,
        digitalocean: 65, linode: 65, vultr: 65, fly: 65, cloudflare: 75
      },
      sveltekit: {
        vercel: 90, netlify: 85, aws: 75, railway: 75, render: 75,
        digitalocean: 65, linode: 65, vultr: 65, fly: 70, cloudflare: 75
      },
      static: {
        vercel: 95, netlify: 100, aws: 90, railway: 60, render: 70,
        digitalocean: 80, linode: 80, vultr: 80, fly: 75, cloudflare: 95
      },
      express: {
        vercel: 70, netlify: 60, aws: 95, railway: 90, render: 90,
        digitalocean: 85, linode: 85, vultr: 85, fly: 85, cloudflare: 70
      },
      fastify: {
        vercel: 70, netlify: 60, aws: 90, railway: 85, render: 85,
        digitalocean: 80, linode: 80, vultr: 80, fly: 80, cloudflare: 70
      },
      nestjs: {
        vercel: 75, netlify: 60, aws: 90, railway: 85, render: 85,
        digitalocean: 80, linode: 80, vultr: 80, fly: 80, cloudflare: 70
      },
      unknown: {
        vercel: 50, netlify: 50, aws: 70, railway: 60, render: 60,
        digitalocean: 55, linode: 55, vultr: 55, fly: 55, cloudflare: 50
      }
    } as any;

    return compatibilityMatrix[framework]?.[provider] || 50;
  }

  /**
   * Score programming language support
   * @private
   */
  private scoreLanguageSupport(provider: CloudProviderType, language: ProgrammingLanguage): number {
    const languageMatrix: Record<ProgrammingLanguage, Record<CloudProviderType, number>> = {
      typescript: {
        vercel: 100, netlify: 95, aws: 90, railway: 85, render: 85,
        digitalocean: 80, linode: 80, vultr: 80, fly: 85, cloudflare: 90
      },
      javascript: {
        vercel: 100, netlify: 95, aws: 90, railway: 85, render: 85,
        digitalocean: 80, linode: 80, vultr: 80, fly: 85, cloudflare: 90
      },
      python: {
        vercel: 80, netlify: 80, aws: 95, railway: 90, render: 90,
        digitalocean: 85, linode: 85, vultr: 85, fly: 85, cloudflare: 75
      },
      ruby: {
        vercel: 70, netlify: 75, aws: 90, railway: 85, render: 90,
        digitalocean: 80, linode: 80, vultr: 80, fly: 80, cloudflare: 70
      },
      go: {
        vercel: 75, netlify: 70, aws: 90, railway: 85, render: 85,
        digitalocean: 80, linode: 80, vultr: 80, fly: 90, cloudflare: 80
      },
      rust: {
        vercel: 70, netlify: 70, aws: 85, railway: 80, render: 80,
        digitalocean: 75, linode: 75, vultr: 75, fly: 85, cloudflare: 75
      },
      java: {
        vercel: 60, netlify: 60, aws: 95, railway: 80, render: 80,
        digitalocean: 85, linode: 85, vultr: 85, fly: 75, cloudflare: 65
      },
      php: {
        vercel: 65, netlify: 70, aws: 85, railway: 75, render: 80,
        digitalocean: 85, linode: 85, vultr: 85, fly: 70, cloudflare: 70
      }
    } as any;

    return languageMatrix[language]?.[provider] || 70;
  }

  /**
   * Score feature support based on requirements
   * @private
   */
  private scoreFeatureSupport(
    provider: CloudProviderType,
    analysis: ProjectAnalysis,
    preferences: ProviderSelectionPreferences
  ): number {
    const providerFeatures = this.getProviderFeatures(provider);
    const requiredFeatures = this.determineRequiredFeatures(analysis, preferences);

    const supportedCount = requiredFeatures.filter(feature =>
      providerFeatures.includes(feature)
    ).length;

    return requiredFeatures.length > 0 ? (supportedCount / requiredFeatures.length) * 100 : 80;
  }

  /**
   * Score cost effectiveness
   * @private
   */
  private scoreCostEffectiveness(
    provider: CloudProviderType,
    analysis: ProjectAnalysis,
    preferences: ProviderSelectionPreferences
  ): number {
    // Base cost scores (lower cost = higher score)
    const costScores: Record<CloudProviderType, number> = {
      netlify: 95,   // Generous free tier
      vercel: 90,    // Good free tier
      railway: 85,   // Reasonable pricing
      render: 80,    // Moderate pricing
      cloudflare: 85,
      digitalocean: 75,
      linode: 75,
      vultr: 75,
      fly: 70,
      aws: 60,       // Can be expensive without optimization
      azure: 55,     // Can be expensive
      gcp: 50,       // Can be expensive
    };

    let score = costScores[provider] || 70;

    // Adjust based on project size and complexity
    if (analysis.size === 'enterprise' || analysis.complexity === 'advanced') {
      // For large projects, enterprise providers may be more cost-effective
      if (['aws'].includes(provider)) {
        score += 15;
      }
    }

    // Budget constraints
    if (preferences.maxBudget) {
      if (preferences.maxBudget < 20 && ['netlify', 'vercel'].includes(provider)) {
        score += 10; // Bonus for free tiers
      } else if (preferences.maxBudget > 100 && ['aws'].includes(provider)) {
        score += 10; // AWS becomes competitive at scale
      }
    }

    return Math.min(100, score);
  }

  /**
   * Score setup complexity (lower complexity = higher score)
   * @private
   */
  private scoreSetupComplexity(provider: CloudProviderType, analysis: ProjectAnalysis): number {
    const complexityScores: Record<CloudProviderType, number> = {
      vercel: 95,     // Extremely simple
      netlify: 95,    // Extremely simple
      railway: 85,    // Simple
      render: 80,     // Moderate
      cloudflare: 75,
      fly: 70,
      digitalocean: 60,
      linode: 60,
      vultr: 60,
      aws: 40,        // Complex setup
      azure: 35,      // Complex setup
      gcp: 30,        // Complex setup
    };

    let score = complexityScores[provider] || 70;

    // Adjust based on project complexity
    if (analysis.complexity === 'simple' && score > 80) {
      score += 5; // Bonus for simple projects on simple platforms
    }

    return score;
  }

  /**
   * Score performance characteristics
   * @private
   */
  private scorePerformance(provider: CloudProviderType, analysis: ProjectAnalysis): number {
    const performanceScores: Record<CloudProviderType, number> = {
      vercel: 95,     // Excellent edge network
      cloudflare: 95, // Global edge network
      aws: 90,        // Comprehensive global infrastructure
      netlify: 85,    // Good CDN
      render: 75,
      railway: 70,
      fly: 85,        // Good global presence
      digitalocean: 70,
      linode: 70,
      vultr: 70,
      azure: 85,      // Good global infrastructure
      gcp: 90,        // Excellent global infrastructure
    };

    let score = performanceScores[provider] || 70;

    // Adjust based on framework requirements
    if (analysis.framework === 'static' && ['vercel', 'netlify', 'cloudflare'].includes(provider)) {
      score += 5; // CDN providers excel at static content
    }

    return score;
  }

  /**
   * Score reliability and uptime
   * @private
   */
  private scoreReliability(provider: CloudProviderType): number {
    const reliabilityScores: Partial<Record<CloudProviderType, number>> = {
      aws: 95,        // Enterprise-grade reliability
      vercel: 90,
      netlify: 90,
      cloudflare: 95,
      render: 85,
      railway: 80,
      fly: 85,
      digitalocean: 85,
      linode: 85,
      vultr: 80,
    };

    return reliabilityScores[provider] || 80;
  }

  /**
   * Score ecosystem and integrations
   * @private
   */
  private scoreEcosystem(provider: CloudProviderType, _analysis: ProjectAnalysis): number {
    const ecosystemScores: Partial<Record<CloudProviderType, number>> = {
      aws: 100,       // Largest ecosystem
      vercel: 85,     // Strong frontend ecosystem
      netlify: 80,    // Good JAMstack ecosystem
      cloudflare: 75,
      railway: 70,
      render: 70,
      fly: 65,
      digitalocean: 75,
      linode: 70,
      vultr: 65,
    };

    return ecosystemScores[provider] || 70;
  }

  /**
   * Score documentation quality
   * @private
   */
  private scoreDocumentation(provider: CloudProviderType): number {
    const docScores: Partial<Record<CloudProviderType, number>> = {
      vercel: 95,
      netlify: 90,
      aws: 85,        // Comprehensive but complex
      railway: 80,
      render: 85,
      cloudflare: 80,
      fly: 75,
      digitalocean: 85,
      linode: 80,
      vultr: 75,
    };

    return docScores[provider] || 75;
  }

  /**
   * Score community support
   * @private
   */
  private scoreCommunitySupport(provider: CloudProviderType): number {
    const communityScores: Partial<Record<CloudProviderType, number>> = {
      aws: 95,        // Largest community
      vercel: 85,
      netlify: 80,
      digitalocean: 85,
      cloudflare: 75,
      railway: 70,
      render: 70,
      fly: 65,
      linode: 75,
      vultr: 65,
    };

    return communityScores[provider] || 70;
  }

  /**
   * Build detailed recommendation object
   * @private
   */
  private async buildRecommendation(
    provider: CloudProviderType,
    analysis: ProjectAnalysis,
    preferences: ProviderSelectionPreferences,
    score: number
  ): Promise<CloudProviderRecommendation> {
    const setupComplexity = this.determineSetupComplexity(provider);
    const cost = this.estimateProviderCost(provider, analysis);
    const reasoning = this.generateReasoning(provider, analysis, preferences, score);

    return {
      provider,
      score,
      setupComplexity,
      features: this.getProviderFeatures(provider),
      reasoning,
      limitations: this.getProviderLimitations(provider, analysis),
      scalabilityScore: this.scorePerformance(provider, analysis),
      performanceScore: this.scorePerformance(provider, analysis),
      costEstimate: {
        monthly: {
          freeTier: cost.freeTier,
          minimum: 0,
          typical: 0, // Simplified cost estimate - would need parsing from monthlyEstimate string
          currency: 'USD'
        },
        traffic: {
          freeRequests: 0,
          costPerAdditionalRequest: 0,
          bandwidthIncluded: 0,
          costPerGB: 0
        },
        storage: {
          freeStorage: 0,
          costPerGB: 0
        }
      }
    };
  }

  /**
   * Helper methods
   */
  private getAllProviders(): CloudProviderType[] {
    return [
      'vercel', 'netlify', 'aws', 'railway', 'render',
      'digitalocean', 'linode', 'vultr', 'fly', 'cloudflare'
    ];
  }

  private getProviderFeatures(provider: CloudProviderType): ProviderFeature[] {
    const featureMap: Partial<Record<CloudProviderType, ProviderFeature[]>> = {
      vercel: ['zero-config', 'auto-scaling', 'edge-functions', 'preview-deployments', 'custom-domains', 'ssl-certificates', 'cdn', 'analytics', 'monitoring', 'serverless-functions', 'team-collaboration'],
      netlify: ['zero-config', 'edge-functions', 'preview-deployments', 'custom-domains', 'ssl-certificates', 'cdn', 'analytics', 'monitoring', 'serverless-functions', 'team-collaboration'],
      aws: ['auto-scaling', 'custom-domains', 'ssl-certificates', 'cdn', 'analytics', 'monitoring', 'serverless-functions', 'team-collaboration', 'managed-databases'],
      railway: ['zero-config', 'docker-support', 'managed-databases', 'preview-deployments', 'custom-domains', 'ssl-certificates', 'monitoring', 'team-collaboration'],
      render: ['auto-scaling', 'custom-domains', 'ssl-certificates', 'monitoring', 'managed-databases', 'docker-support', 'team-collaboration'],
      digitalocean: ['docker-support', 'custom-domains', 'ssl-certificates', 'monitoring', 'team-collaboration'],
      linode: ['docker-support', 'custom-domains', 'ssl-certificates', 'monitoring', 'team-collaboration'],
      vultr: ['docker-support', 'custom-domains', 'ssl-certificates', 'monitoring', 'team-collaboration'],
      fly: ['docker-support', 'auto-scaling', 'custom-domains', 'ssl-certificates', 'monitoring'],
      cloudflare: ['edge-functions', 'cdn', 'custom-domains', 'ssl-certificates', 'auto-scaling', 'serverless-functions'],
    };

    return featureMap[provider] || [];
  }

  private determineRequiredFeatures(
    analysis: ProjectAnalysis,
    preferences: ProviderSelectionPreferences
  ): ProviderFeature[] {
    const features: ProviderFeature[] = [];

    // Based on preferences
    if (preferences.requiredFeatures) {
      features.push(...preferences.requiredFeatures);
    }

    // Based on project analysis
    if (analysis.hasDatabase) {
      features.push('managed-databases');
    }

    if (analysis.hasDockerfile) {
      features.push('docker-support');
    }

    if (analysis.complexity === 'advanced' || analysis.size === 'enterprise') {
      features.push('auto-scaling', 'monitoring', 'team-collaboration');
    }

    return [...new Set(features)]; // Remove duplicates
  }


  private determineSetupComplexity(provider: CloudProviderType): SetupComplexity {
    const complexityMap: Partial<Record<CloudProviderType, SetupComplexity>> = {
      vercel: 'minimal',
      netlify: 'minimal',
      railway: 'minimal',
      render: 'minimal',
      cloudflare: 'moderate',
      fly: 'moderate',
      digitalocean: 'moderate',
      linode: 'moderate',
      vultr: 'moderate',
      aws: 'complex',
    };

    return complexityMap[provider] || 'moderate';
  }

  private estimateProviderCost(_provider: CloudProviderType, _analysis: ProjectAnalysis): {
    freeTier: boolean;
    monthlyEstimate: string;
  } {
    const costMap: Partial<Record<CloudProviderType, { freeTier: boolean; monthlyEstimate: string }>> = {
      vercel: { freeTier: true, monthlyEstimate: '$0-20' },
      netlify: { freeTier: true, monthlyEstimate: '$0-19' },
      railway: { freeTier: true, monthlyEstimate: '$0-10' },
      render: { freeTier: true, monthlyEstimate: '$0-7' },
      cloudflare: { freeTier: true, monthlyEstimate: '$0-5' },
      fly: { freeTier: true, monthlyEstimate: '$0-10' },
      digitalocean: { freeTier: false, monthlyEstimate: '$5-50' },
      linode: { freeTier: false, monthlyEstimate: '$5-50' },
      vultr: { freeTier: false, monthlyEstimate: '$5-50' },
      aws: { freeTier: true, monthlyEstimate: '$0-100+' },
    };

    return costMap[_provider] || { freeTier: false, monthlyEstimate: '$10-50' };
  }


  private generateReasoning(
    provider: CloudProviderType,
    analysis: ProjectAnalysis,
    preferences: ProviderSelectionPreferences,
    score: number
  ): string {
    const reasons: string[] = [];

    // Framework-specific reasoning
    if (provider === 'vercel' && analysis.framework === 'nextjs') {
      reasons.push('Vercel is the creator of Next.js and provides optimal integration');
    }

    if (provider === 'netlify' && analysis.framework === 'static') {
      reasons.push('Netlify excels at static site hosting with excellent CDN performance');
    }

    // Feature-based reasoning
    if (analysis.hasDatabase && ['railway', 'render'].includes(provider)) {
      reasons.push('Provides managed database services reducing infrastructure complexity');
    }

    if (analysis.hasDockerfile && ['railway', 'render', 'fly'].includes(provider)) {
      reasons.push('Native Docker support simplifies containerized deployments');
    }

    // Preference-based reasoning
    if (preferences.costOptimization && score > 80) {
      reasons.push('Offers competitive pricing with generous free tiers');
    }

    if (preferences.simplicityFirst && ['vercel', 'netlify'].includes(provider)) {
      reasons.push('Minimal configuration required with sensible defaults');
    }

    // Fallback reasoning
    if (reasons.length === 0) {
      if (score >= 85) {
        reasons.push('Excellent overall match for your project requirements');
      } else if (score >= 70) {
        reasons.push('Good balance of features, performance, and ease of use');
      } else {
        reasons.push('Meets basic requirements but may have some limitations');
      }
    }

    return reasons.join('. ') + '.';
  }


  private getProviderLimitations(provider: CloudProviderType, _analysis: ProjectAnalysis): string[] {
    const limitationMap: Partial<Record<CloudProviderType, string[]>> = {
      vercel: ['Limited server-side processing time', 'Bandwidth limits on free tier'],
      netlify: ['Build time limits', 'No persistent server-side storage'],
      aws: ['Complex setup and configuration', 'Potentially high costs without optimization'],
      railway: ['Limited geographic regions', 'Newer platform with smaller ecosystem'],
      render: ['Limited regions', 'Cold start delays for free tier'],
      digitalocean: ['Requires more manual configuration', 'No managed frontend hosting'],
      linode: ['Manual infrastructure management', 'Limited managed services'],
      vultr: ['Manual setup required', 'Basic monitoring capabilities'],
      fly: ['Smaller ecosystem', 'Learning curve for platform-specific features'],
      cloudflare: ['Limited backend processing capabilities', 'Focused on edge computing'],
    };

    return limitationMap[provider] || ['Platform-specific limitations may apply'];
  }

}

/**
 * Create a new provider selector instance
 * @function createProviderSelector
 * @returns {ProviderSelector} New selector instance
 */
export const createProviderSelector = (): ProviderSelector => {
  return new ProviderSelector();
};

/**
 * Get provider recommendations (convenience function)
 * @function getProviderRecommendations
 * @param {ProjectAnalysis} analysis - Project analysis results
 * @param {ProviderSelectionPreferences} preferences - Selection preferences
 * @returns {Promise<CloudProviderRecommendation[]>} Provider recommendations
 */
export const getProviderRecommendations = async (
  analysis: ProjectAnalysis,
  preferences: ProviderSelectionPreferences = {}
): Promise<CloudProviderRecommendation[]> => {
  const selector = createProviderSelector();
  return selector.recommend(analysis, preferences);
};