/**
 * @fileoverview Alternative Suggestions Engine - Phase 3
 * @description Generates ranked alternatives with pros/cons for user decisions
 * @module node-cli/services/alternative-suggestions
 *
 * Purpose:
 * - Generate 2-5 alternatives for every decision
 * - Provide clear pros/cons for each option
 * - Rank by suitability/confidence
 * - Enable user selection with reasoning
 *
 * Design Principles:
 * - Always show alternatives (even if primary is very confident)
 * - Limit to 5 options max (prevent decision paralysis)
 * - Clear differentiation between options
 * - Cost/performance trade-offs explicit
 */

import type { ILogger } from '@aios/shared';
import type { CloudProviderType } from '@aios/shared';
import { getProviderCatalog } from '@aios/shared/cloud/providers/provider-catalog.js';
import type { ParsedIntentType, ExtractedEntitiesType } from '../nl-planner/types.js';
import type { ConversationMemory, PriorityType } from './conversation-memory.v2.js';
import type {
  AlternativeOption,
  DecisionFactor,
  ConfidenceLevelType,
} from './action-reasoning.types.js';
import { getConfidenceLevel, createConfidenceScore } from './action-reasoning.types.js';

/**
 * Provider characteristics for comparison
 */
interface ProviderCharacteristics {
  readonly provider: CloudProviderType;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly bestFor: readonly string[];
  readonly costTier: 'low' | 'medium' | 'high';
  readonly speedTier: 'fast' | 'medium' | 'slow';
  readonly complexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Provider catalog with characteristics
 * Maps shared catalog metadata to local characteristics
 */
function getProviderCharacteristics(): readonly ProviderCharacteristics[] {
  const sharedCatalog = getProviderCatalog();

  // Characteristics mapping for each provider
  const characteristicsMap: Record<CloudProviderType, Omit<ProviderCharacteristics, 'provider'>> = {
    vercel: {
      strengths: [
        'Optimized for Next.js',
        'Fastest deployment times (2-3 min)',
        'Excellent DX with preview deployments',
        'Global edge network',
      ],
      weaknesses: [
        'Higher cost at scale',
        'Vendor lock-in for some features',
        'Limited backend support',
      ],
      bestFor: ['Next.js', 'React', 'JAMstack', 'Frontend'],
      costTier: 'high',
      speedTier: 'fast',
      complexity: 'simple',
    },
    netlify: {
      strengths: [
        'Great for static sites',
        'Good JAMstack support',
        'Built-in forms and functions',
        'Generous free tier',
      ],
      weaknesses: [
        'Slower Next.js builds vs Vercel',
        'Limited backend capabilities',
        'Build time limits on free tier',
      ],
      bestFor: ['Static sites', 'JAMstack', 'Gatsby', 'Hugo'],
      costTier: 'medium',
      speedTier: 'medium',
      complexity: 'simple',
    },
    railway: {
      strengths: [
        'Very affordable ($5-10/mo)',
        'Good for full-stack apps',
        'Database support included',
        'Docker support',
      ],
      weaknesses: [
        'Smaller community',
        'Fewer integrations',
        'Limited geographic regions',
      ],
      bestFor: ['Full-stack', 'Node.js', 'Python', 'Docker'],
      costTier: 'low',
      speedTier: 'medium',
      complexity: 'moderate',
    },
    aws: {
      strengths: [
        'Most reliable (99.99% SLA)',
        'Every feature imaginable',
        'Global infrastructure',
        'Enterprise-grade',
      ],
      weaknesses: [
        'Complex setup and management',
        'Steep learning curve',
        'Can be expensive',
      ],
      bestFor: ['Enterprise', 'Complex apps', 'High availability', 'Compliance'],
      costTier: 'medium',
      speedTier: 'medium',
      complexity: 'complex',
    },
    render: {
      strengths: [
        'Simple pricing',
        'Good for Docker apps',
        'Database support',
        'Reasonable cost',
      ],
      weaknesses: [
        'Smaller ecosystem',
        'Limited regions',
        'Fewer advanced features',
      ],
      bestFor: ['Docker', 'Full-stack', 'Side projects'],
      costTier: 'medium',
      speedTier: 'medium',
      complexity: 'simple',
    },
    // Stub entries for other providers
    azure: {
      strengths: ['Enterprise integration', 'Microsoft ecosystem'],
      weaknesses: ['Complex pricing', 'Steep learning curve'],
      bestFor: ['Enterprise', '.NET'],
      costTier: 'medium',
      speedTier: 'medium',
      complexity: 'complex',
    },
    gcp: {
      strengths: ['ML/AI features', 'Global network'],
      weaknesses: ['Complex setup', 'Pricing complexity'],
      bestFor: ['Machine learning', 'Data processing'],
      costTier: 'medium',
      speedTier: 'medium',
      complexity: 'complex',
    },
    digitalocean: {
      strengths: ['Simple pricing', 'Developer-friendly'],
      weaknesses: ['Limited services', 'Smaller network'],
      bestFor: ['Simple apps', 'Side projects'],
      costTier: 'low',
      speedTier: 'medium',
      complexity: 'simple',
    },
    linode: {
      strengths: ['Affordable', 'Good support'],
      weaknesses: ['Limited services', 'Smaller ecosystem'],
      bestFor: ['VPS hosting', 'Simple apps'],
      costTier: 'low',
      speedTier: 'medium',
      complexity: 'simple',
    },
    vultr: {
      strengths: ['Global locations', 'Affordable'],
      weaknesses: ['Limited managed services'],
      bestFor: ['VPS hosting', 'Global apps'],
      costTier: 'low',
      speedTier: 'fast',
      complexity: 'simple',
    },
    fly: {
      strengths: ['Edge computing', 'Docker native'],
      weaknesses: ['Newer platform', 'Limited ecosystem'],
      bestFor: ['Edge apps', 'Global deployment'],
      costTier: 'medium',
      speedTier: 'fast',
      complexity: 'moderate',
    },
    cloudflare: {
      strengths: ['Global edge network', 'Free tier'],
      weaknesses: ['Limited backend options'],
      bestFor: ['Static sites', 'Edge functions'],
      costTier: 'low',
      speedTier: 'fast',
      complexity: 'simple',
    },
  };

  // Get all stable providers from shared catalog
  const stableProviders = sharedCatalog.getStableProviders();

  // Map to characteristics
  return stableProviders.map((entry) => {
    const chars = characteristicsMap[entry.type];
    if (!chars) {
      throw new Error(`Missing characteristics for provider: ${entry.type}`);
    }

    return {
      provider: entry.type,
      ...chars,
    };
  });
}

/**
 * Environment characteristics
 */
const ENVIRONMENT_CHARACTERISTICS = {
  development: {
    risk: 'low',
    purpose: 'Local testing and development',
    costMultiplier: 0.1,
  },
  staging: {
    risk: 'moderate',
    purpose: 'Pre-production testing',
    costMultiplier: 0.5,
  },
  production: {
    risk: 'high',
    purpose: 'Live user traffic',
    costMultiplier: 1.0,
  },
  preview: {
    risk: 'low',
    purpose: 'PR/branch previews',
    costMultiplier: 0.2,
  },
} as const;

/**
 * Alternative Suggestions Engine
 *
 * Generates ranked alternatives for:
 * - Provider selection
 * - Environment selection
 * - Deployment strategies
 * - Risk trade-offs
 *
 * @example
 * ```typescript
 * const engine = new AlternativeSuggestions(logger, memory);
 *
 * const alternatives = await engine.generateProviderAlternatives(
 *   intent,
 *   'vercel', // primary choice
 *   { projectType: 'nextjs', priority: 'speed' }
 * );
 *
 * // Returns ranked alternatives with pros/cons
 * alternatives.forEach(alt => {
 *   console.log(`${alt.label}:`);
 *   console.log(`  Pros: ${alt.pros.join(', ')}`);
 *   console.log(`  Cons: ${alt.cons.join(', ')}`);
 *   console.log(`  Why not chosen: ${alt.whyNotChosen}`);
 * });
 * ```
 */
export class AlternativeSuggestions {
  constructor(
    private readonly logger: ILogger,
    private readonly memory?: ConversationMemory
  ) {
    this.logger.debug('AlternativeSuggestions engine initialized');
  }

  /**
   * Generate provider alternatives
   *
   * @param intent - User intent with entities
   * @param primaryProvider - The chosen provider
   * @param context - Additional context (project type, user priority, etc.)
   * @returns Ranked alternatives (2-4 options)
   * @throws {Error} If primaryProvider is not in catalog
   */
  public async generateProviderAlternatives(
    _intent: ParsedIntentType,
    primaryProvider: CloudProviderType,
    context: {
      readonly projectType?: string;
      readonly priority?: PriorityType;
      readonly budget?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<readonly AlternativeOption<{ provider: CloudProviderType }>[]> {
    const providerCatalog = getProviderCharacteristics();

    // ✅ Validate provider exists in catalog
    const primaryExists = providerCatalog.some((p) => p.provider === primaryProvider);
    if (!primaryExists) {
      const validProviders = providerCatalog.map((p) => p.provider).join(', ');
      throw new Error(
        `Invalid provider: ${primaryProvider}. Valid providers: ${validProviders}`
      );
    }

    const userPriority = context.priority ?? this.memory?.getUserPriority() ?? 'cost';
    const projectType = context.projectType ?? 'unknown';

    this.logger.debug('Generating provider alternatives', {
      primaryProvider,
      userPriority,
      projectType,
    });

    // Get all providers except primary
    const alternatives = providerCatalog.filter(
      (p) => p.provider !== primaryProvider
    );

    // Score and rank alternatives
    const scored = alternatives.map((alt) => {
      const score = this.scoreProviderAlternative(
        alt,
        { projectType, priority: userPriority }
      );

      const whyNotChosen = this.generateWhyNotChosen(
        alt,
        primaryProvider,
        userPriority
      );

      return {
        value: { provider: alt.provider },
        label: this.capitalizeProvider(alt.provider),
        whyNotChosen,
        pros: [...alt.strengths],
        cons: [...alt.weaknesses],
        confidence: createConfidenceScore(score), // ✅ Validated
        estimatedCost: this.estimateCost(alt.costTier),
        estimatedDuration: this.estimateDuration(alt.speedTier),
      };
    });

    // Sort by score descending, take top 4
    const ranked = scored
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4);

    this.logger.debug('Generated provider alternatives', {
      count: ranked.length,
      providers: ranked.map((a) => a.value.provider),
    });

    return ranked;
  }

  /**
   * Generate environment alternatives
   *
   * @param intent - User intent with entities
   * @param primaryEnv - The chosen environment
   * @param context - Additional context (time, last deployment, etc.)
   * @returns Ranked alternatives (1-3 options)
   */
  public async generateEnvironmentAlternatives(
    _intent: ParsedIntentType,
    primaryEnv: 'development' | 'staging' | 'production' | 'preview',
    _context: {
      readonly currentTime?: Date;
      readonly lastDeployment?: { env: string };
    } = {}
  ): Promise<readonly AlternativeOption<{ environment: string }>[]> {
    const alternatives: AlternativeOption<{ environment: string }>[] = [];

    // If primary is production, suggest staging as safer alternative
    if (primaryEnv === 'production') {
      alternatives.push({
        value: { environment: 'staging' },
        label: 'Staging',
        whyNotChosen: 'Lower risk, but not visible to users',
        pros: [
          'No user impact if issues occur',
          'Same as production environment',
          'Can test before promoting',
        ],
        cons: [
          'Extra step required (promotion)',
          'Not accessible to end users',
        ],
        confidence: createConfidenceScore(0.85),
      });

      // Suggest preview for PR-based workflows
      alternatives.push({
        value: { environment: 'preview' },
        label: 'Preview',
        whyNotChosen: 'Only for testing specific changes',
        pros: [
          'Isolated from other environments',
          'Shareable preview URLs',
          'Automatic cleanup',
        ],
        cons: [
          'Temporary environment',
          'Limited resources',
        ],
        confidence: createConfidenceScore(0.6),
      });
    }

    // If primary is staging, suggest production promotion
    if (primaryEnv === 'staging') {
      alternatives.push({
        value: { environment: 'production' },
        label: 'Production',
        whyNotChosen: 'Higher risk without staging validation',
        pros: [
          'Changes immediately visible to users',
          'No extra promotion step',
        ],
        cons: [
          'Higher risk if issues occur',
          'Requires careful monitoring',
        ],
        confidence: createConfidenceScore(0.7),
      });
    }

    // If primary is development, suggest staging
    if (primaryEnv === 'development') {
      alternatives.push({
        value: { environment: 'staging' },
        label: 'Staging',
        whyNotChosen: 'Development is for local testing only',
        pros: [
          'Closer to production environment',
          'Shareable for testing',
        ],
        cons: [
          'Uses more resources',
          'Not for rapid iteration',
        ],
        confidence: createConfidenceScore(0.75),
      });
    }

    this.logger.debug('Generated environment alternatives', {
      primaryEnv,
      count: alternatives.length,
    });

    return alternatives;
  }

  /**
   * Generate cost/performance trade-off alternatives
   *
   * @param primaryChoice - The chosen option
   * @returns Trade-off alternatives
   */
  public async generateTradeoffAlternatives(
    primaryChoice: {
      readonly provider: CloudProviderType;
      readonly priority: PriorityType;
    }
  ): Promise<readonly AlternativeOption[]> {
    const providerCatalog = getProviderCharacteristics();
    const provider = providerCatalog.find((p) => p.provider === primaryChoice.provider);
    if (!provider) return [];

    const alternatives: AlternativeOption[] = [];

    // If optimizing for speed, suggest cost alternative
    if (primaryChoice.priority === 'speed' && provider.costTier === 'high') {
      const cheaperOption = providerCatalog.find((p) => p.costTier === 'low');
      if (cheaperOption) {
        alternatives.push({
          value: { provider: cheaperOption.provider },
          label: `${this.capitalizeProvider(cheaperOption.provider)} (Cost-optimized)`,
          whyNotChosen: 'Slower deployment times',
          pros: [
            `~70% cheaper (${this.estimateCost(cheaperOption.costTier)} vs ${this.estimateCost(provider.costTier)})`,
            ...cheaperOption.strengths.slice(0, 2),
          ],
          cons: [
            `Slower deployments (${this.estimateDuration(cheaperOption.speedTier)} vs ${this.estimateDuration(provider.speedTier)})`,
            ...cheaperOption.weaknesses.slice(0, 1),
          ],
          confidence: createConfidenceScore(0.7),
          estimatedCost: this.estimateCost(cheaperOption.costTier),
          estimatedDuration: this.estimateDuration(cheaperOption.speedTier),
        });
      }
    }

    // If optimizing for cost, suggest faster alternative
    if (primaryChoice.priority === 'cost' && provider.speedTier !== 'fast') {
      const fasterOption = providerCatalog.find((p) => p.speedTier === 'fast');
      if (fasterOption) {
        alternatives.push({
          value: { provider: fasterOption.provider },
          label: `${this.capitalizeProvider(fasterOption.provider)} (Speed-optimized)`,
          whyNotChosen: 'Higher cost',
          pros: [
            `Much faster deployments (${this.estimateDuration(fasterOption.speedTier)})`,
            ...fasterOption.strengths.slice(0, 2),
          ],
          cons: [
            `~2-3x more expensive (${this.estimateCost(fasterOption.costTier)})`,
            ...fasterOption.weaknesses.slice(0, 1),
          ],
          confidence: createConfidenceScore(0.65),
          estimatedCost: this.estimateCost(fasterOption.costTier),
          estimatedDuration: this.estimateDuration(fasterOption.speedTier),
        });
      }
    }

    return alternatives;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Score a provider alternative based on context
   */
  private scoreProviderAlternative(
    provider: ProviderCharacteristics,
    context: { projectType?: string; priority?: PriorityType }
  ): number {
    let score = 0.5; // Base score

    // Project type match
    if (context.projectType) {
      const matchesProject = provider.bestFor.some((use) =>
        use.toLowerCase().includes(context.projectType!.toLowerCase())
      );
      if (matchesProject) score += 0.2;
    }

    // Priority match
    if (context.priority === 'cost' && provider.costTier === 'low') {
      score += 0.2;
    }
    if (context.priority === 'speed' && provider.speedTier === 'fast') {
      score += 0.2;
    }
    if (context.priority === 'safety' && provider.provider === 'aws') {
      score += 0.25; // AWS is most reliable
    }

    // Penalize complexity
    if (provider.complexity === 'complex') score -= 0.1;

    return Math.min(Math.max(score, 0), 1); // Clamp to [0, 1]
  }

  /**
   * Generate "why not chosen" explanation
   */
  private generateWhyNotChosen(
    alternative: ProviderCharacteristics,
    primaryProvider: CloudProviderType,
    userPriority: PriorityType
  ): string {
    const providerCatalog = getProviderCharacteristics();
    const primary = providerCatalog.find((p) => p.provider === primaryProvider);
    if (!primary) return 'Different characteristics than chosen provider';

    // Compare based on user priority
    if (userPriority === 'cost') {
      if (alternative.costTier === 'high' && primary.costTier === 'low') {
        return `More expensive than ${primaryProvider}`;
      }
    }

    if (userPriority === 'speed') {
      if (alternative.speedTier === 'slow' && primary.speedTier === 'fast') {
        return `Slower deployments than ${primaryProvider}`;
      }
    }

    if (userPriority === 'safety') {
      if (alternative.provider !== 'aws') {
        return `Less reliable than ${primaryProvider} for enterprise use`;
      }
    }

    // Generic comparison
    if (alternative.costTier === 'high') {
      return 'Higher cost';
    }
    if (alternative.complexity === 'complex') {
      return 'More complex setup';
    }
    if (alternative.speedTier === 'slow') {
      return 'Slower deployment times';
    }

    return 'Different trade-offs';
  }

  /**
   * Estimate cost based on tier
   */
  private estimateCost(tier: 'low' | 'medium' | 'high'): string {
    const costs = {
      low: '$5-10/mo',
      medium: '$15-25/mo',
      high: '$20-50/mo',
    };
    return costs[tier];
  }

  /**
   * Estimate deployment duration based on speed tier
   */
  private estimateDuration(tier: 'fast' | 'medium' | 'slow'): string {
    const durations = {
      fast: '2-3 min',
      medium: '5-7 min',
      slow: '8-12 min',
    };
    return durations[tier];
  }

  /**
   * Capitalize provider name
   */
  private capitalizeProvider(provider: CloudProviderType): string {
    if (provider === 'aws') return 'AWS';
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}
