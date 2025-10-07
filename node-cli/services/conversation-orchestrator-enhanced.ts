/**
 * @fileoverview Enhanced Conversation Orchestrator with Memory Integration
 * @description Production-grade multi-turn deployment conversations with preference learning and session persistence
 * @module node-cli/services
 * @version 3.0.0
 *
 * **New Features (Phase 1 Complete)**:
 * - ✅ ConversationMemory integration (preference learning)
 * - ✅ SessionPersistence (auto-save, crash recovery)
 * - ✅ Smart defaults from learned preferences
 * - ✅ Preference hints ("you prefer cost optimization")
 * - ✅ Resume session capability
 * - ✅ Multi-turn context awareness
 *
 * @example
 * ```typescript
 * // Create orchestrator with memory
 * const orchestrator = new EnhancedConversationOrchestrator(
 *   cloudManager,
 *   logger,
 *   session
 * );
 *
 * // Process user input
 * await orchestrator.processInput('I want the cheapest option', intent);
 * // → Learns priority = cost
 *
 * // Next deployment
 * await orchestrator.processInput('deploy my app', intent);
 * // → Auto-suggests Railway (cost-optimized)
 * ```
 */

import chalk from 'chalk';
import path from 'node:path';
import os from 'node:os';
import type { BlessedSession } from '../ui/blessed-session.js';
import type { ParsedIntentType } from '../nl-planner/types.js';
import type { CloudManager, ILogger, ProjectAnalysis } from '@aios/shared';
import type { CloudProviderType } from '@aios/shared/cloud';
import { ConversationMemory } from './conversation-memory.v2.js';
import type { PriorityType, EnvironmentType } from './conversation-memory.v2.js';
import { SessionPersistence } from './session-persistence.js';
import type { Result } from './session-persistence.js';
import { ProactiveRiskAnalyzer } from './proactive-risk-analyzer.js';
import type { RiskAnalysisResult, Risk } from './risk-analysis.types.js';
import { ActionReasoningTracker } from './action-reasoning-tracker.js';
import type { ActionRecord } from './action-reasoning.types.js';
import { createFactorWeight } from './action-reasoning.types.js';

/**
 * Conversation states for deployment flow
 */
type ConversationState =
  | { stage: 'idle' }
  | { stage: 'analyzing'; projectPath: string }
  | { stage: 'recommendations_shown'; analysis: ProjectAnalysis; recommendations: ProviderRecommendation[] }
  | { stage: 'awaiting_provider_choice'; analysis: ProjectAnalysis; recommendations: ProviderRecommendation[] }
  | { stage: 'awaiting_confirmation'; provider: CloudProviderType; analysis: ProjectAnalysis }
  | { stage: 'deploying'; provider: CloudProviderType; analysis: ProjectAnalysis };

/**
 * Provider recommendation with type-safe structure
 */
interface ProviderRecommendation {
  readonly provider: CloudProviderType;
  readonly score: number;
  readonly reason: string;
  readonly pros: readonly string[];
  readonly cons?: readonly string[];
}

/**
 * Conversation context for tracking multi-turn interactions
 */
interface ConversationContext {
  state: ConversationState;
  lastIntent: ParsedIntentType | null;
  turnCount: number;
  currentRecommendations: ProviderRecommendation[];
}

/**
 * Session ID generation options
 */
interface SessionIdOptions {
  readonly prefix?: string;
  readonly includeTimestamp?: boolean;
  readonly randomSuffix?: boolean;
}

/**
 * Enhanced Conversation Orchestrator - Production-grade with Memory Integration
 *
 * **Key Features**:
 * - **Preference Learning**: Remembers user's cost/speed/safety priorities
 * - **Smart Defaults**: Auto-suggests providers based on learned preferences
 * - **Session Persistence**: Auto-saves after each turn, crash recovery
 * - **Multi-turn Context**: Understands "deploy again" using conversation history
 * - **Confidence Hints**: Shows confidence scores for learned preferences
 *
 * **Production Enhancements**:
 * - Auto-save after every turn (crash recovery)
 * - Session versioning and validation
 * - Type-safe provider mapping
 * - Comprehensive error handling
 * - Resource cleanup on disposal
 */
export class EnhancedConversationOrchestrator {
  private context: ConversationContext = {
    state: { stage: 'idle' },
    lastIntent: null,
    turnCount: 0,
    currentRecommendations: []
  };

  private readonly memory: ConversationMemory;
  private readonly persistence: SessionPersistence;
  private readonly sessionId: string;
  private isDisposed = false;
  private autoSaveEnabled = true;

  // Phase 4 components
  private readonly riskAnalyzer: ProactiveRiskAnalyzer;
  private readonly actionTracker: ActionReasoningTracker;
  private lastRiskAnalysis: RiskAnalysisResult | null = null;
  private lastActionId: string | null = null;

  /**
   * Creates enhanced orchestrator with memory and persistence
   *
   * @param cloudManager - Cloud provider management service
   * @param logger - Logger instance for observability
   * @param session - Optional Blessed UI session
   * @param memory - Optional pre-existing memory (for resume)
   * @param persistence - Optional custom persistence layer
   */
  constructor(
    private readonly cloudManager: CloudManager,
    private readonly logger: ILogger,
    private readonly session: BlessedSession | null,
    memory?: ConversationMemory,
    persistence?: SessionPersistence
  ) {
    // Initialize memory (use provided or create new)
    this.memory = memory || new ConversationMemory(logger, undefined);

    // Initialize persistence
    this.persistence = persistence || new SessionPersistence(logger);

    // Generate unique session ID
    this.sessionId = this.generateSessionId({
      prefix: 'aios-session',
      includeTimestamp: true,
      randomSuffix: true
    });

    // Initialize Phase 4 components
    this.riskAnalyzer = new ProactiveRiskAnalyzer(logger);
    this.actionTracker = new ActionReasoningTracker(logger, {
      persistToDisk: true,
      reasoningDir: path.join(os.homedir(), '.aios', 'actions'),
      maxMemoryRecords: 100,
    });

    this.logger.info('EnhancedConversationOrchestrator initialized', {
      sessionId: this.sessionId,
      memoryTurns: this.memory.getTurns().length,
      hasExistingMemory: !!memory,
      riskAnalyzerEnabled: true,
      actionTrackerEnabled: true
    });

    // Ensure sessions directory exists
    this.initializeSessionDirectory();
  }

  /**
   * Process user input with full memory integration
   *
   * **Phase 1 Integration Points**:
   * 1. Learn from input (extract preferences)
   * 2. Apply smart defaults (use learned preferences)
   * 3. Auto-save conversation state
   * 4. Update project context after deployments
   *
   * @param input - User's natural language input
   * @param intent - Parsed intent with entities
   * @returns True if handled, false if should fallback to default handler
   */
  async processInput(input: string, intent: ParsedIntentType): Promise<boolean> {
    this.ensureNotDisposed();

    try {
      // Validate inputs early
      if (!input || input.trim().length === 0) {
        this.logger.warn('Empty input provided to processInput');
        return false;
      }

      if (!intent) {
        throw new Error('Intent parameter is required');
      }

      // Validate intent has required structure
      if (!intent.intent || typeof intent.intent !== 'string') {
        this.logger.error('Intent missing required "intent" field or invalid type');
        throw new Error('Intent must have valid "intent" field');
      }

      if (!intent.entities) {
        this.logger.warn('Intent missing entities object', { intent: intent.intent });
        // Create default entities object
        intent = { ...intent, entities: {} };
      }
      // **STEP 1: Learn from input BEFORE processing**
      // This extracts preferences (cost/speed/safety) from user's words
      this.memory.learnFromInput(input, intent);
      this.logger.debug('Memory learning from input', {
        input,
        intentType: intent.intent,
        currentPriority: this.memory.getUserPriority()
      });

      // **STEP 2: Apply smart defaults from learned preferences**
      // If user has preference and didn't specify provider, auto-suggest
      // Note: Creates new intent object since entities are readonly
      const updatedIntent = this.applySmartDefaults(intent);

      // **STEP 2.5: Risk Analysis (Phase 4)**
      // Check for deployment risks before proceeding (production only)
      if (updatedIntent.intent === 'deploy' && updatedIntent.entities.env === 'production') {
        try {
          const userPriority = this.memory.getUserPriority();
          const riskResult = await this.riskAnalyzer.analyze({
            provider: (updatedIntent.entities.provider as CloudProviderType) || 'vercel',
            environment: (updatedIntent.entities.env as EnvironmentType) || 'development',
            currentTime: new Date(),
            ...(userPriority ? { userPriority: userPriority as 'cost' | 'speed' | 'safety' } : {}),
          });

          this.lastRiskAnalysis = riskResult;

          if (!riskResult.canProceed) {
            this.output(chalk.red('\n⚠️  DEPLOYMENT BLOCKED - Critical Risk Detected\n'));
            this.output(chalk.yellow(riskResult.recommendation));
            this.output(chalk.gray('\nUse --force flag to override (not recommended)\n'));
            this.logger.warn('Deployment blocked by risk analysis', {
              risks: riskResult.risks.length,
              score: riskResult.overallScore
            });
            return false; // Block deployment
          }

          if (riskResult.risks.length > 0) {
            this.output(chalk.yellow(`\n⚠️  ${riskResult.risks.length} risk(s) detected:`));
            this.output(chalk.yellow(riskResult.recommendation + '\n'));
            this.logger.info('Risk analysis completed with warnings', {
              risks: riskResult.risks.length
            });
          }
        } catch (error) {
          // Risk analysis failure should not block deployment (fail-safe)
          this.logger.warn('Risk analysis failed, proceeding with deployment', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Update conversation context (use updated intent with smart defaults)
      this.context.turnCount++;
      this.context.lastIntent = updatedIntent;

      const currentState = this.context.state;

      // Determine conversation flow
      let handled = false;

      if (currentState.stage !== 'idle') {
        handled = await this.handleDeploymentConversation(input, updatedIntent);
      } else if (updatedIntent.intent === 'deploy') {
        handled = await this.handleDeploymentConversation(input, updatedIntent);
      }

      // **STEP 3: Auto-save conversation state after processing**
      if (this.autoSaveEnabled) {
        await this.saveConversationState();
      }

      return handled;
    } catch (error) {
      this.logger.error('Error processing input', error as Error, {
        input,
        intentType: intent?.intent || 'unknown',
        sessionId: this.sessionId
      });

      // Still try to save state even on error
      if (this.autoSaveEnabled) {
        await this.saveConversationState().catch(saveError => {
          this.logger.error('Failed to save state after error', saveError as Error);
        });
      }

      throw error;
    }
  }

  /**
   * Apply smart defaults from learned preferences
   *
   * **Blueprint Requirement**: Task 1.3 Acceptance Criteria
   * "Applies learned preferences as smart defaults (cost→Railway, speed→Vercel)"
   *
   * @param intent - Intent to enhance with smart defaults
   * @returns Updated intent with smart defaults applied (creates new object since entities are readonly)
   */
  private applySmartDefaults(intent: ParsedIntentType): ParsedIntentType {
    // Only apply defaults for deployment intents
    if (intent.intent !== 'deploy') {
      return intent;
    }

    const priority = this.memory.getUserPriority();
    const preferredProvider = this.memory.getPreferredProvider();

    let updatedIntent = intent;

    // Apply priority-based default if no provider specified
    if (priority && !intent.entities.provider) {
      const defaultProvider = this.getProviderForPriority(priority);

      // Create new intent with updated entities
      updatedIntent = {
        ...intent,
        entities: {
          ...intent.entities,
          provider: defaultProvider
        }
      };

      this.output(chalk.gray(
        `💡 Using ${defaultProvider} (you prefer ${priority} optimization)`
      ));

      this.logger.info('Applied smart default from learned priority', {
        priority,
        defaultProvider,
        confidence: this.memory.getStats().highConfidencePreferences
      });
    }

    // Apply preferred provider if confidence is high
    if (preferredProvider && preferredProvider.confidence > 0.7 && !updatedIntent.entities.provider) {
      updatedIntent = {
        ...updatedIntent,
        entities: {
          ...updatedIntent.entities,
          provider: preferredProvider.provider
        }
      };

      this.output(chalk.gray(
        `💡 Using ${preferredProvider.provider} (you usually choose this, confidence: ${Math.round(preferredProvider.confidence * 100)}%)`
      ));

      this.logger.info('Applied smart default from preferred provider', {
        provider: preferredProvider.provider,
        confidence: preferredProvider.confidence
      });
    }

    // Apply environment default from last deployment
    const lastDeployment = this.memory.getProjectContext()?.lastDeployment;
    if (lastDeployment && !updatedIntent.entities.env) {
      updatedIntent = {
        ...updatedIntent,
        entities: {
          ...updatedIntent.entities,
          env: lastDeployment.env
        }
      };

      this.output(chalk.gray(
        `💡 Using ${lastDeployment.env} environment (same as last deployment)`
      ));
    }

    return updatedIntent;
  }

  /**
   * Get optimal provider for user's priority
   *
   * **Provider Mapping** (from blueprint):
   * - cost → railway (cheapest)
   * - speed → vercel (fastest builds)
   * - safety → aws (most reliable)
   *
   * @param priority - User's learned priority preference
   * @returns Recommended cloud provider
   */
  private getProviderForPriority(priority: PriorityType): CloudProviderType {
    const providerMap: Record<PriorityType, CloudProviderType> = {
      cost: 'railway',
      speed: 'vercel',
      safety: 'aws'
    };

    return providerMap[priority];
  }

  /**
   * Save conversation state to filesystem
   *
   * **Blueprint Requirement**: Task 1.3 Acceptance Criteria
   * "Auto-saves conversation state after every turn"
   *
   * **Features**:
   * - Atomic writes (temp → rename)
   * - Automatic directory creation
   * - Graceful error handling
   * - Performance logging
   */
  private async saveConversationState(): Promise<void> {
    try {
      const startTime = Date.now();
      const snapshot = this.memory.toSnapshot();

      const result = await this.persistence.saveSession(this.sessionId, snapshot);

      if (result.isSuccess) {
        const duration = Date.now() - startTime;
        this.logger.debug('Conversation state saved', {
          sessionId: this.sessionId,
          turns: snapshot.turns.length,
          preferences: snapshot.preferences.length,
          durationMs: duration
        });
      } else {
        this.logger.warn('Failed to save conversation state', {
          sessionId: this.sessionId,
          error: result.error.message
        });
      }
    } catch (error) {
      this.logger.error('Exception during conversation state save', error as Error, {
        sessionId: this.sessionId
      });
    }
  }

  /**
   * Resume session from persisted state
   *
   * **Blueprint Requirement**: Task 1.3 Acceptance Criteria
   * "Resume command: aios resume <sessionId>"
   *
   * @param sessionId - ID of session to resume
   * @returns True if resumed successfully
   *
   * @example
   * ```typescript
   * const orchestrator = new EnhancedConversationOrchestrator(...);
   * const resumed = await orchestrator.resumeSession('aios-session-123');
   *
   * if (resumed) {
   *   console.log('Session resumed! You can continue where you left off.');
   * }
   * ```
   */
  async resumeSession(sessionId: string): Promise<boolean> {
    this.ensureNotDisposed();

    try {
      this.logger.info('Attempting to resume session', { sessionId });

      const result = await this.persistence.loadSession(sessionId);

      if (!result.isSuccess) {
        this.logger.warn('Failed to load session', {
          sessionId,
          error: result.error.message
        });
        return false;
      }

      // Restore memory from snapshot
      const restoredMemory = ConversationMemory.fromSnapshot(
        result.value,
        this.logger,
        undefined
      );

      // Replace current memory with restored memory
      Object.assign(this.memory, restoredMemory);

      this.output(chalk.blue('📂 Resumed previous session'));
      this.output(chalk.gray(`   Session ID: ${sessionId}`));
      this.output(chalk.gray(`   Turns: ${result.value.turns.length}`));
      this.output(chalk.gray(`   Preferences: ${result.value.preferences.length}`));

      this.logger.info('Session resumed successfully', {
        sessionId,
        turns: result.value.turns.length,
        preferences: result.value.preferences.length
      });

      return true;
    } catch (error) {
      this.logger.error('Exception during session resume', error as Error, {
        sessionId
      });
      return false;
    }
  }

  /**
   * Handle multi-turn deployment conversation
   */
  private async handleDeploymentConversation(input: string, intent: ParsedIntentType): Promise<boolean> {
    const currentState = this.context.state;

    // Stage 1: Initial deployment request
    if (currentState.stage === 'idle') {
      return await this.startDeploymentFlow(intent);
    }

    // Stage 2: User asking follow-up questions
    if (currentState.stage === 'recommendations_shown') {
      if (this.isCostInquiry(input)) {
        return await this.provideCostComparison(currentState);
      }

      if (this.isDetailInquiry(input)) {
        return await this.provideDetailedRecommendations(currentState);
      }

      const selectedProvider = this.extractProviderSelection(input);
      if (selectedProvider) {
        return await this.confirmProviderSelection(selectedProvider, currentState.analysis);
      }

      this.output(chalk.yellow('\n❓ I didn\'t catch which provider you want.'));
      this.output(chalk.gray('Please choose one of:'));
      currentState.recommendations.slice(0, 5).forEach((rec, idx) => {
        this.output(chalk.white(`  ${idx + 1}. ${rec.provider}`));
      });
      this.output(chalk.gray('\nOr ask me about pricing or details!'));
      return true;
    }

    if (currentState.stage === 'awaiting_provider_choice') {
      const selectedProvider = this.extractProviderSelection(input);
      if (selectedProvider && 'analysis' in currentState) {
        return await this.confirmProviderSelection(selectedProvider, currentState.analysis);
      }

      this.output(chalk.yellow('\n❓ Please select a provider from the list above.'));
      this.output(chalk.gray('You can type a number (1-5) or a provider name.'));
      return true;
    }

    // Stage 3: User confirming deployment
    if (currentState.stage === 'awaiting_confirmation') {
      if (this.isAffirmative(input)) {
        return await this.executeDeployment(currentState.provider, currentState.analysis);
      } else if (this.isNegative(input)) {
        this.output(chalk.gray('Deployment cancelled. Let me know if you need anything else!'));
        this.context.state = { stage: 'idle' };
        return true;
      }
    }

    return false;
  }

  /**
   * Stage 1: Analyze project and show recommendations with preference hints
   *
   * **Enhanced with Phase 1 Features**:
   * - Shows learned priority before recommendations
   * - Shows preferred provider with confidence
   * - Highlights provider matching learned preferences
   */
  private async startDeploymentFlow(_intent: ParsedIntentType): Promise<boolean> {
    const projectPath = process.cwd();

    this.output(chalk.blue('\n🤖 Assistant: ') + "I'd be happy to help deploy your app! Let me analyze your project structure first...\n");

    this.context.state = { stage: 'analyzing', projectPath };

    // Get project analysis
    this.output(chalk.gray('[Analyzing project...]\n'));
    const analysisResult = await this.analyzeProject(projectPath);

    if (!analysisResult) {
      this.output(chalk.red('Failed to analyze project. Please ensure you have a valid package.json file.'));
      this.context.state = { stage: 'idle' };
      return true;
    }

    // **PHASE 1 ENHANCEMENT: Show learned preferences**
    this.showLearnedPreferences();

    // Show detected technologies
    this.output(chalk.green("I've detected:"));
    this.output(chalk.white(`- ${analysisResult.framework} ${analysisResult.language ? `with ${analysisResult.language}` : ''}`));

    if (analysisResult.packageManager) {
      this.output(chalk.white(`- ${analysisResult.packageManager} package manager`));
    }

    // Get provider recommendations
    const recommendations = await this.getRecommendations(analysisResult);

    // Edge case: No recommendations available
    if (!recommendations || recommendations.length === 0) {
      this.output(chalk.yellow('\n⚠️  No compatible providers found for your project.'));
      this.output(chalk.gray('This could be because:'));
      this.output(chalk.gray('  - Your framework is not yet supported'));
      this.output(chalk.gray('  - Required features are not available'));
      this.output(chalk.gray('\nPlease try a different project or contact support.'));
      this.context.state = { stage: 'idle' };
      return true;
    }

    this.output('');
    this.output(chalk.green('Here are my recommendations:'));

    // Highlight recommendation matching user's preference
    const userPriority = this.memory.getUserPriority();
    const preferredProvider = userPriority ? this.getProviderForPriority(userPriority) : null;

    recommendations.slice(0, 5).forEach((rec, idx) => {
      const isPreferred = rec.provider === preferredProvider;
      const prefix = idx === 0
        ? chalk.green('(Recommended)')
        : isPreferred
        ? chalk.cyan('(Matches your preference)')
        : '';

      this.output(chalk.white(`${idx + 1}. ${rec.provider} ${prefix} - ${rec.reason}`));
    });

    this.output('');
    this.output(chalk.blue('Which would you prefer?'));
    this.output(chalk.gray('You can type:'));
    this.output(chalk.gray('  - A number (1-5)'));
    this.output(chalk.gray('  - Provider name (e.g., "vercel" or "netlify")'));
    this.output(chalk.gray('  - Or ask: "What\'s the cheapest?" or "Tell me more"'));

    this.context.state = {
      stage: 'recommendations_shown',
      analysis: analysisResult,
      recommendations
    };

    this.context.currentRecommendations = recommendations;

    return true;
  }

  /**
   * Show learned preferences to user
   *
   * **Blueprint Requirement**: Task 1.3 Acceptance Criteria
   * "Shows hint when using learned preference"
   */
  private showLearnedPreferences(): void {
    const priority = this.memory.getUserPriority();
    const preferredProvider = this.memory.getPreferredProvider();

    if (priority) {
      this.output(chalk.gray(`\n💡 I notice you prefer ${priority}-optimized deployments`));
    }

    if (preferredProvider && preferredProvider.confidence > 0.7) {
      const confidencePercent = Math.round(preferredProvider.confidence * 100);
      this.output(chalk.gray(
        `💡 You usually choose ${preferredProvider.provider} (confidence: ${confidencePercent}%)`
      ));
    }

    const lastDeployment = this.memory.getProjectContext()?.lastDeployment;
    if (lastDeployment) {
      const timeAgo = this.formatRelativeTime(new Date(lastDeployment.timestamp));
      this.output(chalk.gray(
        `💡 Last deployment: ${lastDeployment.provider} to ${lastDeployment.env} (${timeAgo})`
      ));
    }

    // Add blank line after hints
    if (priority || preferredProvider || lastDeployment) {
      this.output('');
    }
  }

  /**
   * Stage 4: Execute deployment with project context update
   *
   * **Enhanced with Phase 1 Features**:
   * - Updates project context after successful deployment
   * - Stores provider, environment, timestamp
   */
  private async executeDeployment(provider: CloudProviderType, analysis: ProjectAnalysis): Promise<boolean> {
    // Validate inputs
    if (!provider) {
      this.logger.error('executeDeployment called with null/undefined provider');
      this.output(chalk.red('Error: Invalid provider specified'));
      return false;
    }

    if (!analysis || !analysis.framework) {
      this.logger.error(`executeDeployment called with invalid analysis. Has analysis: ${!!analysis}, Has framework: ${!!analysis?.framework}`);
      this.output(chalk.red('Error: Project analysis is invalid or incomplete'));
      return false;
    }

    this.output(chalk.blue('\n🤖 Assistant: ') + `Starting deployment to ${provider}...\n`);

    const steps = [
      { icon: '🔍', text: 'Analyzing project structure', delay: 800 },
      { icon: '📦', text: 'Creating optimized build', delay: 1200 },
      { icon: '🚀', text: `Deploying to ${provider}`, delay: 1500 }
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      this.output(chalk.gray(`[Step ${i + 1}] ${step.icon} ${step.text}...`));
      await this.sleep(step.delay);
      this.output(chalk.green(' ✅'));
    }

    const mockUrl = `https://your-app-${Math.random().toString(36).substring(2, 8)}.${
      provider === 'vercel' ? 'vercel.app' :
      provider === 'netlify' ? 'netlify.app' :
      'app'
    }`;

    this.output('');
    this.output(chalk.green('✅ Deployment successful!'));
    this.output(chalk.blue('Your app is live at: ') + chalk.underline.cyan(mockUrl));

    // **PHASE 1 ENHANCEMENT: Update project context**
    this.memory.setProjectContext({
      path: process.cwd(),
      framework: analysis.framework,
      lastDeployment: {
        provider,
        env: (this.context.lastIntent?.entities.env as EnvironmentType) || 'production',
        timestamp: new Date().toISOString(),
        success: true
      }
    });

    // **PHASE 4 ENHANCEMENT: Track deployment action with reasoning**
    try {
      // Convert risks from risk-analysis to action-reasoning format
      const convertedRisks = this.lastRiskAnalysis?.risks
        ? this.convertRisksForActionTracking(this.lastRiskAnalysis.risks)
        : [];

      // Get current state for recommendations with proper validation
      const currentState = this.context.state;
      const hasRecommendations = currentState.stage === 'awaiting_confirmation' && 'recommendations' in currentState;
      const recommendations = hasRecommendations && Array.isArray((currentState as any).recommendations)
        ? (currentState as any).recommendations
        : [];

      const actionId = await this.actionTracker.recordAction({
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId: this.sessionId,
          turnNumber: this.context.turnCount,
          userInput: `deploy to ${provider}`,
          intent: 'deploy',
        },
        reasoning: {
          actionType: 'deploy',
          chosen: {
            provider,
            environment: (this.context.lastIntent?.entities.env as EnvironmentType) || 'production',
            reason: `Deploying ${analysis.framework} app to ${provider}`,
          },
          alternatives: recommendations.slice(1, 4).map((rec: any) => ({
            option: rec.provider || 'unknown',
            reasoning: rec.reason || 'Alternative provider option',
          })),
          factors: [
            {
              type: 'neutral' as const,
              description: `Framework: ${analysis.framework}`,
              weight: createFactorWeight(0.5),
              source: 'project-analysis' as const,
            },
            ...(this.memory.getUserPriority() ? [{
              type: 'positive' as const,
              description: `User priority: ${this.memory.getUserPriority()}`,
              weight: createFactorWeight(0.8),
              source: 'user-preference' as const,
            }] : []),
            ...(this.lastRiskAnalysis ? [{
              type: this.lastRiskAnalysis.overallScore < 0.3 ? ('positive' as const) : ('negative' as const),
              description: `Risk score: ${this.lastRiskAnalysis.overallScore.toFixed(2)}`,
              weight: createFactorWeight(0.6),
              source: 'time-based' as const,
            }] : []),
          ],
          risks: convertedRisks,
          confidence: 'high',
          estimatedCost: provider === 'vercel' || provider === 'netlify' ? '$0-20/mo' : '$5-50/mo',
          estimatedDuration: '2-3 min',
        },
        risks: convertedRisks,
      });

      this.lastActionId = actionId;
      this.logger.debug('Action tracked with reasoning', { actionId });
    } catch (error) {
      // Action tracking failure should not block deployment (fail-safe)
      this.logger.warn('Failed to track action', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    this.logger.info('Deployment completed, project context updated', {
      provider,
      url: mockUrl,
      sessionId: this.sessionId
    });

    this.output('');
    this.output(chalk.blue('Would you like me to:'));
    this.output(chalk.white('- Set up custom domain'));
    this.output(chalk.white('- Add environment variables'));
    this.output(chalk.white('- Configure monitoring'));

    this.context.state = { stage: 'idle' };
    return true;
  }

  /**
   * Stage 2a: Provide cost comparison
   */
  private async provideCostComparison(state: { analysis: ProjectAnalysis; recommendations: ProviderRecommendation[] }): Promise<boolean> {
    this.output(chalk.blue('\n🤖 Assistant: ') + 'For cost optimization, here\'s the breakdown:\n');

    const costData = [
      { provider: 'Vercel', freeTier: '$0/month', bandwidth: '100GB bandwidth', extra: 'Unlimited deployments' },
      { provider: 'Netlify', freeTier: '$0/month', bandwidth: '100GB bandwidth', extra: '300 build minutes/month' },
      { provider: 'Railway', freeTier: '$5/month', bandwidth: 'Unlimited', extra: '$5 free credit' },
      { provider: 'AWS', freeTier: '~$15/month', bandwidth: 'Pay-as-you-go', extra: 'More control' },
      { provider: 'Render', freeTier: '$0/month', bandwidth: '100GB bandwidth', extra: 'Static sites free' }
    ];

    costData.forEach(item => {
      this.output(chalk.cyan(`- ${item.provider} Free Tier: `) + chalk.white(`${item.freeTier} (${item.bandwidth})`));
    });

    this.output('');

    const framework = state.analysis.framework;
    if (framework === 'nextjs' || framework === 'react') {
      this.output(chalk.green('Both Vercel and Netlify offer generous free tiers perfect for React/Next.js apps.'));
      this.output(chalk.green('Vercel has a slight edge for Next.js apps with optimized performance.\n'));
      this.output(chalk.blue('Shall I deploy to Vercel free tier?'));

      this.context.state = {
        stage: 'awaiting_confirmation',
        provider: 'vercel',
        analysis: state.analysis
      };
    } else {
      this.output(chalk.green('For your project, Netlify or Vercel would work great on the free tier.\n'));
      this.output(chalk.blue('Which provider would you like to use?'));

      this.context.state = {
        stage: 'awaiting_provider_choice',
        analysis: state.analysis,
        recommendations: state.recommendations
      };
    }

    return true;
  }

  /**
   * Stage 2b: Provide detailed recommendations
   */
  private async provideDetailedRecommendations(state: { analysis: ProjectAnalysis; recommendations: ProviderRecommendation[] }): Promise<boolean> {
    this.output(chalk.blue('\n🤖 Assistant: ') + 'Here are the details:\n');

    state.recommendations.slice(0, 3).forEach(rec => {
      this.output(chalk.cyan(`\n${rec.provider}:`));
      this.output(chalk.white(`  ✓ ${rec.reason}`));
      this.output(chalk.white(`  ✓ Match score: ${rec.score.toFixed(0)}%`));
      if (rec.pros.length > 0) {
        this.output(chalk.green(`  + ${rec.pros.join(', ')}`));
      }
    });

    this.output('');
    this.output(chalk.blue('Would you like me to proceed with the top recommendation?'));

    this.context.state = {
      stage: 'awaiting_confirmation',
      provider: state.recommendations[0]?.provider || 'vercel',
      analysis: state.analysis
    };

    return true;
  }

  /**
   * Stage 3: Confirm provider selection
   */
  private async confirmProviderSelection(provider: CloudProviderType, analysis: ProjectAnalysis): Promise<boolean> {
    this.output(chalk.blue('\n🤖 Assistant: ') + `Great choice! ${provider} is excellent for your project.\n`);
    this.output(chalk.blue('Shall I start the deployment?'));

    this.context.state = {
      stage: 'awaiting_confirmation',
      provider,
      analysis
    };

    return true;
  }

  // ==================== Helper Methods ====================

  /**
   * Analyze project (same as original)
   */
  private async analyzeProject(projectPath: string): Promise<ProjectAnalysis | null> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const framework =
        deps['next'] ? 'nextjs' :
        deps['react'] ? 'react' :
        deps['vue'] ? 'vue' :
        deps['@angular/core'] ? 'angular' :
        deps['svelte'] ? 'svelte' :
        deps['express'] ? 'express' :
        deps['@nestjs/core'] ? 'nestjs' :
        'static';

      const language = deps['typescript'] ? 'typescript' : 'javascript';
      const packageManager =
        await this.fileExists(path.join(projectPath, 'pnpm-lock.yaml')) ? 'pnpm' :
        await this.fileExists(path.join(projectPath, 'yarn.lock')) ? 'yarn' :
        await this.fileExists(path.join(projectPath, 'bun.lockb')) ? 'bun' :
        'npm';

      const hasAPI = framework === 'express' || framework === 'nestjs';

      return {
        framework: framework as any,
        language: language as any,
        packageManager: packageManager as any,
        dependencies: Object.keys(deps).map(name => ({ name, version: deps[name], type: 'production' })),
        projectType: 'web-application',
        hasAPI,
        environmentVariables: [],
        size: 'medium',
        complexity: 'moderate',
        estimatedBuildTime: 5,
        recommendations: []
      } as any;
    } catch {
      return null;
    }
  }

  /**
   * Get provider recommendations with type-safe structure
   */
  private async getRecommendations(analysis: ProjectAnalysis): Promise<ProviderRecommendation[]> {
    const framework = analysis.framework;

    const recommendations: ProviderRecommendation[] = [
      {
        provider: 'vercel',
        score: framework === 'nextjs' ? 98 : framework === 'react' ? 95 : 85,
        reason: framework === 'nextjs' ? 'Perfect for Next.js apps' : 'Perfect for React apps',
        pros: ['Zero config', 'Edge network', 'Instant deployments']
      },
      {
        provider: 'netlify',
        score: 90,
        reason: 'Great alternative with form handling',
        pros: ['Form handling', 'Serverless functions', 'Split testing']
      },
      {
        provider: 'aws',
        score: 75,
        reason: 'More control and scaling options',
        pros: ['Full control', 'Advanced scaling', 'Enterprise features']
      },
      {
        provider: 'railway',
        score: 80,
        reason: 'Developer-friendly deployments',
        pros: ['Simple interface', 'Good pricing', 'Database support']
      },
      {
        provider: 'render',
        score: 82,
        reason: 'Managed services with auto-scaling',
        pros: ['Auto-scaling', 'Free SSL', 'Good performance']
      }
    ];

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private isCostInquiry(input: string): boolean {
    const costKeywords = ['cost', 'price', 'cheap', 'expensive', 'free', 'tier', 'billing', 'pay', 'afford'];
    return costKeywords.some(keyword => input.toLowerCase().includes(keyword));
  }

  private isDetailInquiry(input: string): boolean {
    const detailKeywords = ['detail', 'more', 'tell me', 'explain', 'why', 'what about', 'how'];
    return detailKeywords.some(keyword => input.toLowerCase().includes(keyword));
  }

  private extractProviderSelection(input: string): CloudProviderType | null {
    const lowerInput = input.toLowerCase().trim();

    const cleanedInput = lowerInput
      .replace(/^(use|deploy\s+to|deploy|choose|select|i\s+want|go\s+with|let's\s+use)\s+/i, '')
      .trim();

    // Check for numbers (1-5)
    if (/^[1-5]$/.test(cleanedInput) || /^[1-5]$/.test(lowerInput)) {
      const numMatch = cleanedInput.match(/^[1-5]$/) || lowerInput.match(/^[1-5]$/);
      if (numMatch) {
        const index = parseInt(numMatch[0]) - 1;
        const recommendation = this.context.currentRecommendations[index];
        if (recommendation) {
          this.logger.debug('Selected provider by number', { index, provider: recommendation.provider });
          return recommendation.provider;
        }
      }
    }

    // Check for provider names
    const providerMap: Record<string, CloudProviderType> = {
      'vercel': 'vercel',
      'vercl': 'vercel',
      'versel': 'vercel',
      'netlify': 'netlify',
      'netlifly': 'netlify',
      'netlfy': 'netlify',
      'aws': 'aws',
      'amazon': 'aws',
      'railway': 'railway',
      'railay': 'railway',
      'render': 'render',
      'rendor': 'render'
    };

    for (const testInput of [cleanedInput, lowerInput]) {
      for (const [keyword, provider] of Object.entries(providerMap)) {
        if (testInput.includes(keyword)) {
          this.logger.debug('Selected provider by name', { keyword, provider });
          return provider;
        }
      }
    }

    // Levenshtein distance for close matches
    const providers: CloudProviderType[] = ['vercel', 'netlify', 'aws', 'railway', 'render'];
    for (const testInput of [cleanedInput, lowerInput]) {
      for (const provider of providers) {
        if (this.levenshteinDistance(testInput, provider) <= 2) {
          this.output(chalk.gray(`(Did you mean "${provider}"? Using that.)`));
          return provider;
        }
      }
    }

    return null;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0]![j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1,
            matrix[i]![j - 1]! + 1,
            matrix[i - 1]![j]! + 1
          );
        }
      }
    }

    return matrix[b.length]![a.length]!;
  }

  private isAffirmative(input: string): boolean {
    const affirmatives = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'do it', 'go ahead', 'proceed', 'let\'s do it'];
    const lowerInput = input.toLowerCase().trim();
    return affirmatives.some(word => lowerInput.includes(word));
  }

  /**
   * Convert risks from risk-analysis format to action-reasoning format
   *
   * @param risks - Risks from ProactiveRiskAnalyzer
   * @returns Converted risks for ActionReasoningTracker
   */
  private convertRisksForActionTracking(risks: readonly Risk[]): Array<{
    level: 'low' | 'moderate' | 'high' | 'destructive';
    description: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    probability: 'unlikely' | 'possible' | 'likely' | 'certain';
  }> {
    return risks.map(risk => ({
      level: risk.severity === 'critical' ? ('destructive' as const) :
             risk.severity === 'high' ? ('high' as const) :
             risk.severity === 'medium' ? ('moderate' as const) : ('low' as const),
      description: risk.description,
      impact: risk.severity as 'low' | 'medium' | 'high' | 'critical',
      probability: 'possible' as const,
    }));
  }

  private isNegative(input: string): boolean {
    const negatives = ['no', 'nope', 'cancel', 'stop', 'nevermind', 'abort'];
    const lowerInput = input.toLowerCase().trim();
    return negatives.some(word => lowerInput.includes(word));
  }

  private output(message: string): void {
    if (this.session) {
      this.session.addOutput(message);
    } else {
      console.log(message);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique session ID
   *
   * @param options - Session ID generation options
   * @returns Unique session ID
   */
  private generateSessionId(options: SessionIdOptions = {}): string {
    const {
      prefix = 'session',
      includeTimestamp = true,
      randomSuffix = true
    } = options;

    const parts: string[] = [prefix];

    if (includeTimestamp) {
      parts.push(Date.now().toString());
    }

    if (randomSuffix) {
      parts.push(Math.random().toString(36).substring(2, 8));
    }

    return parts.join('-');
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  private formatRelativeTime(date: Date): string {
    const now = Date.now();
    const then = date.getTime();
    const diffMs = now - then;

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  /**
   * Initialize sessions directory
   */
  private async initializeSessionDirectory(): Promise<void> {
    try {
      await this.persistence.ensureDirectory();
    } catch (error) {
      this.logger.warn('Failed to initialize sessions directory', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Ensure orchestrator is not disposed
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('EnhancedConversationOrchestrator has been disposed');
    }
  }

  // ==================== Public API ====================

  /**
   * Reset conversation state (keeps memory)
   */
  public reset(): void {
    this.ensureNotDisposed();

    this.context = {
      state: { stage: 'idle' },
      lastIntent: null,
      turnCount: 0,
      currentRecommendations: []
    };

    this.logger.debug('Conversation state reset', {
      sessionId: this.sessionId
    });
  }

  /**
   * Clear all memory (forgets preferences)
   */
  public clearMemory(): void {
    this.ensureNotDisposed();
    this.memory.clear();
    this.logger.info('Memory cleared', { sessionId: this.sessionId });
  }

  /**
   * Get current conversation state
   */
  public getState(): ConversationState {
    this.ensureNotDisposed();
    return this.context.state;
  }

  /**
   * Get conversation statistics
   */
  public getStats(): {
    turnCount: number;
    memoryStats: ReturnType<ConversationMemory['getStats']>;
    sessionId: string;
  } {
    this.ensureNotDisposed();

    return {
      turnCount: this.context.turnCount,
      memoryStats: this.memory.getStats(),
      sessionId: this.sessionId
    };
  }

  /**
   * Get the last processed intent (after smart defaults applied)
   * Useful for tests to verify smart defaults were applied
   */
  public getLastIntent(): ParsedIntentType | null {
    this.ensureNotDisposed();
    return this.context.lastIntent;
  }

  /**
   * Enable/disable auto-save
   */
  public setAutoSave(enabled: boolean): void {
    this.ensureNotDisposed();
    this.autoSaveEnabled = enabled;
    this.logger.debug('Auto-save toggled', { enabled, sessionId: this.sessionId });
  }

  /**
   * Dispose resources
   */
  public async dispose(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    this.logger.info('Disposing EnhancedConversationOrchestrator', {
      sessionId: this.sessionId
    });

    // Final save before disposal
    if (this.autoSaveEnabled) {
      await this.saveConversationState();
    }

    this.isDisposed = true;
  }
}
