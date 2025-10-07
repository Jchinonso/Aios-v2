/**
 * @fileoverview Phase 3 Integration Helper
 * @description Integrates Action Reasoning & Explanation with existing deployment flow
 * @module node-cli/services/phase3-integration
 *
 * Purpose:
 * - Wrap deployment decisions with reasoning tracking
 * - Generate alternatives before execution
 * - Record all decisions with full context
 * - Enable post-action explanation
 *
 * Usage:
 * - Wrap existing deployment logic
 * - Automatically track all provider/environment selections
 * - Show alternatives to user before deploying
 * - Enable "why?" questions after deployment
 */

import type { ILogger } from '@aios/shared';
import type { CloudProviderType } from '@aios/shared';
import type { ParsedIntentType } from '../nl-planner/types.js';
import type { PriorityType, EnvironmentType } from './conversation-memory.v2.js';
import type { Phase3Services } from './phase3-factory.js';
import type {
  ActionMetadata,
  DeploymentReasoning,
  DecisionFactor,
  AlternativeOption,
  RiskItem,
  AlternativeSuggestion,
  AlternativesCollection,
} from './action-reasoning.types.js';
import { getConfidenceLevel, createFactorWeight } from './action-reasoning.types.js';

/**
 * Provider selection context
 */
export interface ProviderSelectionContext {
  readonly intent: ParsedIntentType;
  readonly sessionId: string;
  readonly turnNumber: number;
  readonly userInput: string;
  readonly projectType?: string;
  readonly userPriority?: PriorityType;
  readonly currentTime?: Date;
}

/**
 * Provider selection decision
 */
export interface ProviderDecision {
  readonly provider: CloudProviderType;
  readonly environment: EnvironmentType;
  readonly reason: string;
  readonly confidence: number;
}

/**
 * Phase 3 Integration Helper
 *
 * Wraps deployment logic with:
 * 1. Alternative generation
 * 2. Reasoning tracking
 * 3. Risk assessment
 * 4. Explainability
 *
 * @example
 * ```typescript
 * const integration = new Phase3Integration(services, logger);
 *
 * // Before deployment: Track decision
 * const actionId = await integration.trackProviderSelection(
 *   { provider: 'vercel', environment: 'production', reason: '...', confidence: 0.9 },
 *   context,
 *   risks
 * );
 *
 * // Deploy...
 *
 * // After deployment: User can explain
 * const explanation = await services.reasoningTracker.explain({
 *   type: 'general',
 *   target: { actionId }
 * });
 * ```
 */
export class Phase3Integration {
  private readonly services: Phase3Services;

  constructor(
    private readonly logger: ILogger,
    reasoningTracker: Phase3Services['reasoningTracker'],
    alternativeSuggestions: Phase3Services['alternativeSuggestions']
  ) {
    this.services = {
      reasoningTracker,
      alternativeSuggestions,
    };
    this.logger.debug('Phase3Integration initialized');
  }

  /**
   * Track deployment decision (alias for trackProviderSelection)
   * Used by tests to track deployment decisions
   *
   * @param decision - Provider decision made
   * @param context - Selection context
   * @returns Action ID for later explanation
   */
  public async trackDeploymentDecision(
    decision: ProviderDecision,
    context: ProviderSelectionContext
  ): Promise<string> {
    return this.trackProviderSelection(decision, context, []);
  }

  /**
   * Track provider selection with alternatives
   *
   * @param decision - Provider decision made
   * @param context - Selection context
   * @param risks - Identified risks
   * @returns Action ID for later explanation
   */
  public async trackProviderSelection(
    decision: ProviderDecision,
    context: ProviderSelectionContext,
    risks: readonly RiskItem[] = []
  ): Promise<string> {
    // Generate alternatives
    const alternatives = await this.services.alternativeSuggestions
      .generateProviderAlternatives(
        context.intent,
        decision.provider,
        {
          ...(context.projectType ? { projectType: context.projectType } : {}),
          ...(context.userPriority ? { priority: context.userPriority } : {}),
        }
      );

    // Build decision factors
    let factors = this.buildProviderFactors(
      decision,
      context
    );

    // ✅ Validate minimum factors (at least one factor required for valid reasoning)
    if (factors.length === 0) {
      this.logger.warn('No decision factors generated, adding default factor');
      factors = [{
        type: 'neutral',
        description: 'Default deployment based on project analysis',
        weight: createFactorWeight(0.5),
        source: 'project-analysis',
      }];
    }

    // Create deployment reasoning
    const reasoning: DeploymentReasoning = {
      actionType: 'deploy',
      chosen: {
        provider: decision.provider,
        environment: decision.environment,
        reason: decision.reason,
      },
      alternatives: alternatives as readonly AlternativeOption<{
        provider: CloudProviderType;
        environment: string;
      }>[],
      factors,
      risks: [...risks],
      confidence: getConfidenceLevel(decision.confidence),
      estimatedCost: this.estimateDeploymentCost(decision.provider),
      estimatedDuration: this.estimateDeploymentDuration(decision.provider),
    };

    // Record action
    const actionId = await this.services.reasoningTracker.recordAction({
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: context.sessionId,
        turnNumber: context.turnNumber,
        userInput: context.userInput,
        intent: context.intent.intent,
      },
      reasoning,
      risks: [...risks],
    });

    this.logger.info('Tracked provider selection', {
      actionId,
      provider: decision.provider,
      environment: decision.environment,
      alternativeCount: alternatives.length,
    });

    return actionId;
  }

  /**
   * Generate and display alternatives before deployment
   *
   * @param decision - Primary decision
   * @param context - Selection context
   * @returns Alternatives collection for user review
   */
  public async generateAlternativesForReview(
    decision: ProviderDecision,
    context: ProviderSelectionContext
  ): Promise<AlternativesCollection> {
    const alternatives = await this.services.alternativeSuggestions
      .generateProviderAlternatives(
        context.intent,
        decision.provider,
        {
          ...(context.projectType ? { projectType: context.projectType } : {}),
          ...(context.userPriority ? { priority: context.userPriority } : {}),
        }
      );

    // Build primary suggestion
    const primary: AlternativeSuggestion = {
      id: 'primary',
      label: this.capitalizeProvider(decision.provider),
      description: decision.reason,
      pros: this.getProviderPros(decision.provider, context),
      cons: [], // Chosen option has no cons shown
      confidence: decision.confidence,
      recommended: true,
      estimatedCost: this.estimateDeploymentCost(decision.provider),
      estimatedDuration: this.estimateDeploymentDuration(decision.provider),
      selectable: false,
    };

    // Convert alternatives to suggestions
    const altSuggestions: AlternativeSuggestion[] = alternatives.map(
      (alt, index) => ({
        id: `alt-${index}`,
        label: alt.label,
        description: alt.whyNotChosen,
        pros: [...alt.pros],
        cons: [...alt.cons],
        confidence: alt.confidence,
        recommended: false,
        ...(alt.estimatedCost ? { estimatedCost: alt.estimatedCost } : {}),
        ...(alt.estimatedDuration ? { estimatedDuration: alt.estimatedDuration } : {}),
        selectable: true,
      })
    );

    return {
      primary,
      alternatives: altSuggestions,
      reasoning: decision.reason,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Record successful deployment outcome
   *
   * @param actionId - Action ID from tracking
   * @param outcome - Deployment outcome
   */
  public async recordDeploymentOutcome(
    actionId: string,
    outcome: {
      readonly success: boolean;
      readonly message: string;
    }
  ): Promise<void> {
    // Note: Current ActionReasoningTracker doesn't expose updateOutcome
    // This is a placeholder for future enhancement
    // For now, we log the outcome

    this.logger.info('Deployment outcome', {
      actionId,
      success: outcome.success,
      message: outcome.message,
    });

    // Future: Update the action record with outcome
    // await this.services.reasoningTracker.updateOutcome(actionId, {
    //   success: outcome.success,
    //   message: outcome.message,
    //   timestamp: new Date().toISOString(),
    // });
  }

  /**
   * Check if user wants to see alternatives
   *
   * @param userInput - User's input
   * @returns True if user wants alternatives
   */
  public shouldShowAlternatives(userInput: string): boolean {
    const normalized = userInput.toLowerCase();
    return (
      normalized.includes('alternative') ||
      normalized.includes('other option') ||
      normalized.includes('what else') ||
      normalized.includes('different')
    );
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Build decision factors for provider selection
   */
  private buildProviderFactors(
    decision: ProviderDecision,
    context: ProviderSelectionContext
  ): readonly DecisionFactor[] {
    const factors: DecisionFactor[] = [];

    // User priority factor
    if (context.userPriority) {
      factors.push({
        type: 'positive',
        description: `Matches your ${context.userPriority} optimization preference`,
        weight: createFactorWeight(0.8),
        source: 'user-preference',
      });
    }

    // Project type factor
    if (context.projectType) {
      factors.push({
        type: 'positive',
        description: `Optimized for ${context.projectType} projects`,
        weight: createFactorWeight(0.7),
        source: 'project-analysis',
      });
    }

    // Time-based factor
    if (context.currentTime) {
      const hour = context.currentTime.getHours();
      const isWeekend = [0, 6].includes(context.currentTime.getDay());

      if (
        decision.environment === 'production' &&
        (hour >= 17 || isWeekend)
      ) {
        factors.push({
          type: 'negative',
          description: 'Risky deployment time (evening/weekend)',
          weight: createFactorWeight(0.6),
          source: 'time-based',
        });
      }
    }

    // Confidence factor
    if (decision.confidence >= 0.9) {
      factors.push({
        type: 'positive',
        description: 'High confidence based on project analysis',
        weight: createFactorWeight(0.9),
        source: 'project-analysis',
      });
    }

    return factors;
  }

  /**
   * Get provider pros for display
   */
  private getProviderPros(
    provider: CloudProviderType,
    _context: ProviderSelectionContext
  ): readonly string[] {
    // Provider-specific pros
    const providerPros: Record<CloudProviderType, readonly string[]> = {
      vercel: [
        'Fastest deployment times (2-3 min)',
        'Optimized for Next.js',
        'Global edge network',
      ],
      netlify: [
        'Great for static sites',
        'Built-in forms and functions',
        'Generous free tier',
      ],
      railway: [
        'Very affordable ($5-10/mo)',
        'Good for full-stack apps',
        'Database support included',
      ],
      aws: [
        'Most reliable (99.99% SLA)',
        'Enterprise-grade',
        'Global infrastructure',
      ],
      azure: [
        'Microsoft ecosystem',
        'Enterprise integration',
        'Hybrid cloud support',
      ],
      gcp: [
        'Google infrastructure',
        'Competitive pricing',
        'Good for data-heavy apps',
      ],
      render: [
        'Simple pricing',
        'Good for Docker apps',
        'Database support',
      ],
      cloudflare: [
        'Global edge network',
        'DDoS protection included',
        'Workers for serverless',
      ],
      digitalocean: [
        'Simple and predictable pricing',
        'Good documentation',
        'Developer-friendly',
      ],
      linode: [
        'High performance compute',
        'Predictable pricing',
        'Developer-friendly',
      ],
      vultr: [
        'High frequency compute',
        'Global locations',
        'Bare metal available',
      ],
      fly: [
        'Edge computing platform',
        'Global distribution',
        'Low latency deployments',
      ],
    };

    return providerPros[provider] ?? ['Reliable deployment platform'];
  }

  /**
   * Estimate deployment cost
   */
  private estimateDeploymentCost(provider: CloudProviderType): string {
    const costMap: Record<CloudProviderType, string> = {
      vercel: '$20-50/mo',
      netlify: '$15-25/mo',
      railway: '$5-10/mo',
      aws: '$15-40/mo',
      azure: '$20-45/mo',
      gcp: '$15-35/mo',
      render: '$10-25/mo',
      cloudflare: '$5-20/mo',
      digitalocean: '$5-15/mo',
      linode: '$5-20/mo',
      vultr: '$6-25/mo',
      fly: '$5-15/mo',
    };
    return costMap[provider] ?? '$10-30/mo';
  }

  /**
   * Estimate deployment duration
   */
  private estimateDeploymentDuration(provider: CloudProviderType): string {
    const durationMap: Record<CloudProviderType, string> = {
      vercel: '2-3 min',
      netlify: '4-6 min',
      railway: '5-7 min',
      aws: '5-10 min',
      azure: '6-12 min',
      gcp: '5-10 min',
      render: '5-8 min',
      cloudflare: '3-5 min',
      digitalocean: '6-10 min',
      linode: '6-10 min',
      vultr: '5-8 min',
      fly: '4-6 min',
    };
    return durationMap[provider] ?? '5-10 min';
  }

  /**
   * Capitalize provider name
   */
  private capitalizeProvider(provider: CloudProviderType): string {
    if (provider === 'aws') return 'AWS';
    if (provider === 'gcp') return 'Google Cloud';
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}
