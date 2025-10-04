/**
 * @fileoverview Cost Estimator - Estimates deployment costs across providers
 * @description Calculates comprehensive cost estimates for cloud deployments
 * including compute, storage, bandwidth, and additional services. Supports
 * multiple pricing models and provides cost optimization recommendations.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 1.0.0
 */

import type {
  CloudProviderType,
} from '../types/cloud-provider.types.js';

import type {
  DeploymentConfig,
} from '../types/deployment.types.js';

import type {
  CostEstimate,
  MonthlyEstimate,
  TrafficEstimate,
  StorageEstimate,
  AdditionalCost,
  CostOptimization,
  UsageMetrics,
} from '../types/cost.types.js';

import {
  createLogger,
  type ILogger,
} from '../../utils/logger.js';

/**
 * Provider pricing configuration
 * @interface ProviderPricing
 */
interface ProviderPricing {
  /** Monthly base cost */
  readonly baseMonthly: number;
  /** Cost per build minute */
  readonly buildMinuteCost: number;
  /** Cost per GB of bandwidth */
  readonly bandwidthCost: number;
  /** Cost per GB of storage */
  readonly storageCost: number;
  /** Cost per function invocation */
  readonly functionInvocationCost: number;
  /** Free tier limits */
  readonly freeTier: {
    readonly buildMinutes: number;
    readonly bandwidth: number; // GB
    readonly storage: number; // GB
    readonly functionInvocations: number;
  };
}

/**
 * Cost estimation parameters
 * @interface CostEstimationParams
 */
interface CostEstimationParams {
  /** Expected monthly traffic */
  readonly monthlyTraffic: {
    readonly requests: number;
    readonly bandwidth: number; // GB
  };
  /** Expected resource usage */
  readonly resourceUsage: {
    readonly buildMinutes: number;
    readonly storage: number; // GB
    readonly functionInvocations: number;
  };
  /** Environment type affects pricing */
  readonly environment: string;
  /** Project complexity affects costs */
  readonly complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
}

/**
 * Cost Estimator for cloud deployment cost calculation
 * @class CostEstimator
 * @description Provides comprehensive cost estimation capabilities across
 * different cloud providers with support for multiple pricing models,
 * usage-based calculations, and cost optimization recommendations.
 */
export class CostEstimator {
  private readonly logger: ILogger;
  private readonly providerPricing: Map<CloudProviderType, ProviderPricing>;

  /**
   * Creates a new CostEstimator instance
   * @constructor
   */
  constructor() {
    this.logger = createLogger('CostEstimator');
    this.providerPricing = new Map();
    this.initializeProviderPricing();
  }

  /**
   * Estimate deployment cost for a specific provider
   * @method estimate
   * @param {CloudProviderType} provider - Provider to estimate costs for
   * @param {DeploymentConfig} config - Deployment configuration
   * @returns {Promise<CostEstimate>} Detailed cost estimate
   */
  async estimate(provider: CloudProviderType, config: DeploymentConfig): Promise<CostEstimate> {
    this.logger.info('Estimating deployment costs', { provider, environment: config.environment });

    try {
      const pricing = this.getProviderPricing(provider);
      const params = this.generateEstimationParams(config);

      const monthly = this.calculateMonthlyEstimate(pricing, params);
      const traffic = this.calculateTrafficEstimate(pricing, params);
      const storage = this.calculateStorageEstimate(pricing, params);
      const additional = this.calculateAdditionalCosts(pricing, params);

      const estimate: CostEstimate = {
        monthly,
        traffic,
        storage,
        additional,
      };

      this.logger.info('Cost estimation completed', {
        provider,
        monthlyTypical: monthly.typical,
        currency: monthly.currency
      });

      return estimate;
    } catch (error) {
      this.logger.error('Cost estimation failed', error as Error, { provider });
      throw new Error(`Cost estimation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate cost optimization recommendations
   * @method getOptimizationRecommendations
   * @param {CloudProviderType} provider - Provider to analyze
   * @param {UsageMetrics} usage - Historical usage metrics
   * @returns {Promise<CostOptimization[]>} Optimization recommendations
   */
  async getOptimizationRecommendations(
    provider: CloudProviderType,
    usage: UsageMetrics
  ): Promise<CostOptimization[]> {
    this.logger.debug('Generating cost optimization recommendations', { provider });

    const recommendations: CostOptimization[] = [];
    const pricing = this.getProviderPricing(provider);

    // Analyze build usage
    if (usage.computeTime > pricing.freeTier.buildMinutes) {
      recommendations.push({
        type: 'usage-pattern',
        description: 'Optimize build process to reduce build time and costs',
        potentialSavings: this.calculateBuildOptimizationSavings(usage, pricing),
        difficulty: 'moderate',
        implementationSteps: [
          'Implement build caching',
          'Optimize dependencies and build scripts',
          'Use incremental builds where possible',
          'Consider build parallelization'
        ],
        riskLevel: 'low'
      });
    }

    // Analyze bandwidth usage
    if (usage.bandwidth > pricing.freeTier.bandwidth) {
      recommendations.push({
        type: 'resource-sizing',
        description: 'Optimize assets and implement CDN caching to reduce bandwidth costs',
        potentialSavings: this.calculateBandwidthOptimizationSavings(usage, pricing),
        difficulty: 'easy',
        implementationSteps: [
          'Compress images and assets',
          'Implement proper caching headers',
          'Use WebP images where supported',
          'Minify CSS and JavaScript files'
        ],
        riskLevel: 'low'
      });
    }

    // Analyze function invocations
    if (usage.functionInvocations > pricing.freeTier.functionInvocations) {
      recommendations.push({
        type: 'feature-optimization',
        description: 'Optimize serverless function usage to reduce invocation costs',
        potentialSavings: this.calculateFunctionOptimizationSavings(usage, pricing),
        difficulty: 'moderate',
        implementationSteps: [
          'Implement function response caching',
          'Batch multiple operations in single invocations',
          'Optimize cold start performance',
          'Consider edge caching for static responses'
        ],
        riskLevel: 'medium'
      });
    }

    this.logger.debug('Generated cost optimization recommendations', {
      provider,
      recommendationCount: recommendations.length
    });

    return recommendations;
  }

  /**
   * Compare costs across multiple providers
   * @method compareProviders
   * @param {CloudProviderType[]} providers - Providers to compare
   * @param {DeploymentConfig} config - Deployment configuration
   * @returns {Promise<Record<CloudProviderType, CostEstimate>>} Cost comparison
   */
  async compareProviders(
    providers: CloudProviderType[],
    config: DeploymentConfig
  ): Promise<Record<CloudProviderType, CostEstimate>> {
    this.logger.info('Comparing costs across providers', {
      providers,
      environment: config.environment
    });

    const comparisons: Record<CloudProviderType, CostEstimate> = {} as any;

    await Promise.all(
      providers.map(async (provider) => {
        try {
          comparisons[provider] = await this.estimate(provider, config);
        } catch (error) {
          this.logger.warn('Failed to estimate costs for provider', { error: (error as Error).message, provider });
        }
      })
    );

    this.logger.info('Provider cost comparison completed', {
      providersAnalyzed: Object.keys(comparisons).length
    });

    return comparisons;
  }

  /**
   * Initialize provider pricing data
   * @private
   * @method initializeProviderPricing
   */
  private initializeProviderPricing(): void {
    // Vercel pricing (as of 2024)
    this.providerPricing.set('vercel', {
      baseMonthly: 20, // Pro plan
      buildMinuteCost: 0.005, // $0.005 per minute
      bandwidthCost: 0.10, // $0.10 per GB
      storageCost: 0.05, // $0.05 per GB
      functionInvocationCost: 0.0000002, // $0.20 per million
      freeTier: {
        buildMinutes: 6000, // Hobby: 6000, Pro: 8000
        bandwidth: 100, // GB
        storage: 50, // GB
        functionInvocations: 100000000, // 100M
      }
    });

    // Netlify pricing
    this.providerPricing.set('netlify', {
      baseMonthly: 19, // Pro plan
      buildMinuteCost: 0.007, // $0.007 per minute
      bandwidthCost: 0.20, // $0.20 per GB
      storageCost: 0.08, // $0.08 per GB
      functionInvocationCost: 0.0000025, // $2.50 per million
      freeTier: {
        buildMinutes: 300, // Free tier
        bandwidth: 100, // GB
        storage: 10, // GB
        functionInvocations: 125000, // 125K
      }
    });

    // AWS pricing (estimated for typical web app)
    this.providerPricing.set('aws', {
      baseMonthly: 0, // Pay as you go
      buildMinuteCost: 0.005, // CodeBuild
      bandwidthCost: 0.09, // CloudFront
      storageCost: 0.023, // S3
      functionInvocationCost: 0.0000002, // Lambda
      freeTier: {
        buildMinutes: 100, // CodeBuild free tier
        bandwidth: 50, // GB CloudFront
        storage: 5, // GB S3
        functionInvocations: 1000000, // 1M Lambda
      }
    });

    // Railway pricing
    this.providerPricing.set('railway', {
      baseMonthly: 5, // Starter plan minimum
      buildMinuteCost: 0.01, // Estimated
      bandwidthCost: 0.10, // Estimated
      storageCost: 0.25, // $0.25/GB/month
      functionInvocationCost: 0, // Not applicable
      freeTier: {
        buildMinutes: 500, // Free tier
        bandwidth: 10, // GB
        storage: 1, // GB
        functionInvocations: 0,
      }
    });

    // Render pricing
    this.providerPricing.set('render', {
      baseMonthly: 7, // Starter plan
      buildMinuteCost: 0, // Unlimited builds
      bandwidthCost: 0.10, // $0.10 per GB
      storageCost: 0.25, // $0.25/GB/month
      functionInvocationCost: 0, // Not applicable
      freeTier: {
        buildMinutes: Infinity, // Unlimited
        bandwidth: 100, // GB
        storage: 1, // GB
        functionInvocations: 0,
      }
    });

    // Silent initialization
  }

  /**
   * Get pricing for a specific provider
   * @private
   * @method getProviderPricing
   */
  private getProviderPricing(provider: CloudProviderType): ProviderPricing {
    const pricing = this.providerPricing.get(provider);
    if (!pricing) {
      throw new Error(`Pricing not available for provider: ${provider}`);
    }
    return pricing;
  }

  /**
   * Generate estimation parameters from deployment config
   * @private
   * @method generateEstimationParams
   */
  private generateEstimationParams(config: DeploymentConfig): CostEstimationParams {
    // Default estimates based on environment and typical usage patterns
    const baseTraffic = config.environment === 'production' ? 10000 : 1000;
    const baseBandwidth = config.environment === 'production' ? 50 : 5;

    return {
      monthlyTraffic: {
        requests: baseTraffic,
        bandwidth: baseBandwidth,
      },
      resourceUsage: {
        buildMinutes: config.environment === 'production' ? 300 : 100,
        storage: 5, // GB
        functionInvocations: baseTraffic * 2, // Assume 2 functions per request
      },
      environment: config.environment || 'production',
      complexity: 'moderate', // Default complexity
    };
  }

  /**
   * Calculate monthly cost estimate
   * @private
   * @method calculateMonthlyEstimate
   */
  private calculateMonthlyEstimate(
    pricing: ProviderPricing,
    params: CostEstimationParams
  ): MonthlyEstimate {
    const freeTier = params.environment !== 'production';
    let cost = freeTier ? 0 : pricing.baseMonthly;

    // Add overage costs
    const excessBuildMinutes = Math.max(0, params.resourceUsage.buildMinutes - pricing.freeTier.buildMinutes);
    const excessBandwidth = Math.max(0, params.monthlyTraffic.bandwidth - pricing.freeTier.bandwidth);
    const excessStorage = Math.max(0, params.resourceUsage.storage - pricing.freeTier.storage);
    const excessFunctions = Math.max(0, params.resourceUsage.functionInvocations - pricing.freeTier.functionInvocations);

    cost += excessBuildMinutes * pricing.buildMinuteCost;
    cost += excessBandwidth * pricing.bandwidthCost;
    cost += excessStorage * pricing.storageCost;
    cost += excessFunctions * pricing.functionInvocationCost;

    return {
      freeTier,
      minimum: freeTier ? 0 : pricing.baseMonthly,
      typical: Math.round(cost * 100) / 100, // Round to cents
      maximum: cost * 2, // Estimate maximum as 2x typical
      currency: 'USD',
    };
  }

  /**
   * Calculate traffic-based costs
   * @private
   * @method calculateTrafficEstimate
   */
  private calculateTrafficEstimate(
    pricing: ProviderPricing,
    _params: CostEstimationParams
  ): TrafficEstimate {
    return {
      freeRequests: 1000000, // 1M requests typically free
      costPerAdditionalRequest: 0.000001, // $1 per million
      bandwidthIncluded: pricing.freeTier.bandwidth,
      costPerGB: pricing.bandwidthCost,
    };
  }

  /**
   * Calculate storage costs
   * @private
   * @method calculateStorageEstimate
   */
  private calculateStorageEstimate(
    pricing: ProviderPricing,
    _params: CostEstimationParams
  ): StorageEstimate {
    return {
      freeStorage: pricing.freeTier.storage,
      costPerGB: pricing.storageCost,
      backupCost: pricing.storageCost * 0.5, // Backup typically 50% of storage cost
    };
  }

  /**
   * Calculate additional service costs
   * @private
   * @method calculateAdditionalCosts
   */
  private calculateAdditionalCosts(
    pricing: ProviderPricing,
    _params: CostEstimationParams
  ): AdditionalCost[] {
    const additional: AdditionalCost[] = [];

    // Build minutes cost
    additional.push({
      service: 'Build Minutes',
      description: 'Additional build time beyond free tier',
      cost: pricing.buildMinuteCost,
      unit: 'minute',
    });

    // Function invocations
    if (pricing.functionInvocationCost > 0) {
      additional.push({
        service: 'Function Invocations',
        description: 'Serverless function executions',
        cost: pricing.functionInvocationCost,
        unit: 'invocation',
      });
    }

    return additional;
  }

  /**
   * Calculate build optimization savings
   * @private
   * @method calculateBuildOptimizationSavings
   */
  private calculateBuildOptimizationSavings(usage: UsageMetrics, pricing: ProviderPricing): number {
    const excessMinutes = Math.max(0, usage.computeTime - pricing.freeTier.buildMinutes);
    const potentialReduction = excessMinutes * 0.3; // Assume 30% reduction possible
    return potentialReduction * pricing.buildMinuteCost;
  }

  /**
   * Calculate bandwidth optimization savings
   * @private
   * @method calculateBandwidthOptimizationSavings
   */
  private calculateBandwidthOptimizationSavings(usage: UsageMetrics, pricing: ProviderPricing): number {
    const excessBandwidth = Math.max(0, usage.bandwidth - pricing.freeTier.bandwidth);
    const potentialReduction = excessBandwidth * 0.4; // Assume 40% reduction possible
    return potentialReduction * pricing.bandwidthCost;
  }

  /**
   * Calculate function optimization savings
   * @private
   * @method calculateFunctionOptimizationSavings
   */
  private calculateFunctionOptimizationSavings(usage: UsageMetrics, pricing: ProviderPricing): number {
    const excessInvocations = Math.max(0, usage.functionInvocations - pricing.freeTier.functionInvocations);
    const potentialReduction = excessInvocations * 0.25; // Assume 25% reduction possible
    return potentialReduction * pricing.functionInvocationCost;
  }
}