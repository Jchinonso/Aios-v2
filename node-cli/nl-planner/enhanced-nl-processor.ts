/**
 * @fileoverview Enhanced Natural Language Processor with Multi-Turn Context
 * @description Production-grade NL processing with memory, caching, and tool calling
 * @module node-cli/nl-planner/enhanced-nl-processor
 */

import type { ILogger, IAIService } from '@aios/shared';
import type { IntentType, ExtractedEntitiesType, ParsedIntentType } from './types.js';
import { ConversationMemory } from '../services/conversation-memory.v2.js';
import type { ConversationTurn, UserPreference } from '../services/conversation-memory.v2.js';
import { IntentDisambiguator } from '../services/intent-disambiguator.js';
import { SmartDefaultsEngine } from '../services/smart-defaults.js';
import { FuzzyMatcher } from '../utils/fuzzy-matcher.js';

/**
 * Enhanced classification result with context awareness
 */
export interface EnhancedClassificationResult extends ParsedIntentType {
  readonly reasoning?: string;
  readonly clarifyingQuestion?: string;
  readonly suggestedFollowUp?: string;
  readonly warnings?: readonly string[];
  readonly fromCache?: boolean;
  readonly alternatives?: readonly ParsedIntentType[];
  readonly appliedDefaults?: readonly string[];
}

/**
 * Command metadata registry for AI understanding
 */
interface CommandMetadata {
  readonly description: string;
  readonly examples: readonly string[];
  readonly requiredEntities?: readonly (keyof ExtractedEntitiesType)[];
  readonly optionalEntities?: readonly (keyof ExtractedEntitiesType)[];
}

/**
 * Command registry - synced with IntentType
 */
const COMMAND_REGISTRY: Readonly<Partial<Record<IntentType, CommandMetadata>>> = {
  deploy: {
    description: 'Deploy application to cloud provider',
    examples: ['deploy to production', 'ship to staging', 'deploy globally'],
    optionalEntities: ['env', 'provider', 'branch', 'global']
  },
  rollback: {
    description: 'Rollback previous deployment',
    examples: ['rollback production', 'undo last deployment'],
    optionalEntities: ['env', 'service']
  },
  logs: {
    description: 'View application logs',
    examples: ['show logs', 'view errors', 'last 2 hours of logs'],
    optionalEntities: ['env', 'service', 'since', 'level']
  },
  status: {
    description: 'Check AIOS system status',
    examples: ['system status', 'aios status'],
    optionalEntities: []
  },
  'deployment-history': {
    description: 'View deployment history',
    examples: ['deployment status', 'show history', 'recent deployments'],
    optionalEntities: ['service', 'env', 'since']
  },
  scale: {
    description: 'Scale application instances',
    examples: ['scale to 5', 'increase replicas'],
    requiredEntities: ['replicas'],
    optionalEntities: ['service', 'env']
  },
  connect: {
    description: 'Connect to cloud provider',
    examples: ['connect to vercel', 'link netlify'],
    optionalEntities: ['provider']
  },
  cost: {
    description: 'Show cost estimates',
    examples: ['show costs', 'how much am I spending'],
    optionalEntities: ['service', 'since']
  }
};

/**
 * Enhanced Natural Language Processor
 *
 * Features:
 * - Multi-turn conversation context
 * - Learned user preferences
 * - Smart entity inference
 * - Contextual clarifications
 * - Proactive suggestions
 */
export class EnhancedNLProcessor {
  private isProcessing = false;
  private readonly disambiguator: IntentDisambiguator;
  private readonly smartDefaults: SmartDefaultsEngine;
  private readonly fuzzyMatcher: FuzzyMatcher;

  constructor(
    private readonly aiService: IAIService,
    private readonly memory: ConversationMemory,
    private readonly logger: ILogger
  ) {
    this.fuzzyMatcher = new FuzzyMatcher();
    this.disambiguator = new IntentDisambiguator(logger, this.fuzzyMatcher);
    this.smartDefaults = new SmartDefaultsEngine(logger);
  }

  /**
   * Process user input with full context awareness
   */
  public async process(input: string): Promise<EnhancedClassificationResult> {
    if (this.isProcessing) {
      throw new Error('Already processing a request');
    }

    this.isProcessing = true;

    try {
      // 1. Build context from conversation memory (with error isolation)
      let context = '';
      try {
        context = this.buildConversationContext();
      } catch (contextError) {
        this.logger.error('Failed to build conversation context - proceeding without context', contextError as Error);
        context = '## No conversation context available';
      }

      // 2. Check for references to previous conversation
      const resolvedInput = this.resolveReferences(input, context);

      // 3. Build enhanced prompt with context
      const prompt = this.buildEnhancedPrompt(resolvedInput, context);

      // 4. Get AI classification
      let turnCount = 0;
      try {
        turnCount = this.memory.getTurns().length;
      } catch {
        // Ignore if getTurns fails
      }

      this.logger.debug('Sending enhanced prompt to AI', {
        inputLength: input.length,
        contextTurns: turnCount
      });

      const aiResult = await this.aiService.sendMessage(prompt);

      if (aiResult.isFailure || !aiResult.value) {
        throw new Error(`AI service failed: ${aiResult.error?.message || 'Unknown error'}`);
      }

      const result = this.parseAIResponse(aiResult.value.content);

      if (!result) {
        throw new Error('Failed to parse AI response');
      }

      // 5. Log fuzzy matching suggestions (with error isolation)
      try {
        this.logFuzzyMatchingSuggestions(result.entities);
      } catch (fuzzyError) {
        this.logger.debug('Fuzzy matching suggestions failed (non-critical)', {
          error: fuzzyError instanceof Error ? fuzzyError.message : String(fuzzyError)
        });
      }

      // 6. Apply smart defaults (with error isolation)
      let defaultsResult: { intent: EnhancedClassificationResult; reasoning: readonly string[]; appliedDefaults: readonly string[] } = {
        intent: result,
        reasoning: [],
        appliedDefaults: []
      };
      try {
        defaultsResult = this.smartDefaults.applyDefaults(result, this.memory);
      } catch (defaultsError) {
        this.logger.warn('Smart defaults failed - using original intent', {
          error: defaultsError instanceof Error ? defaultsError.message : String(defaultsError)
        });
      }

      // 7. Enhance entities with learned preferences (with error isolation)
      let enhancedEntities = defaultsResult.intent.entities;
      try {
        enhancedEntities = this.enhanceWithPreferences(defaultsResult.intent.entities);
      } catch (preferencesError) {
        this.logger.debug('Preference enhancement failed (non-critical)', {
          error: preferencesError instanceof Error ? preferencesError.message : String(preferencesError)
        });
      }

      // 8. Apply intent disambiguation (with error isolation)
      let disambiguationResult;
      try {
        const turns = this.memory.getTurns();

        disambiguationResult = await this.disambiguator.disambiguate(
          { ...defaultsResult.intent, entities: enhancedEntities },
          turns
        );
      } catch (disambiguationError) {
        this.logger.warn('Disambiguation failed - using intent as-is', {
          error: disambiguationError instanceof Error ? disambiguationError.message : String(disambiguationError)
        });
        // Fallback: create minimal disambiguation result
        disambiguationResult = {
          primarySuggestion: {
            ...defaultsResult.intent,
            entities: enhancedEntities,
            reasoning: 'Disambiguation unavailable',
            score: 0.5
          },
          alternatives: [],
          reasoning: 'Disambiguation failed - proceeding with provided input'
        };
      }

      // 9. Extract final intent (prioritize autoSelected if available)
      const finalIntent = disambiguationResult.autoSelected || disambiguationResult.primarySuggestion;

      // 10. Detect warnings/issues
      const warnings = this.detectPotentialIssues(finalIntent.intent, finalIntent.entities);

      // 11. Build final result
      const enhancedResult: EnhancedClassificationResult = {
        intent: finalIntent.intent,
        entities: finalIntent.entities,
        cli: finalIntent.cli || '',
        confidence: finalIntent.confidence,
        risk: finalIntent.risk || 'low',
        confirmRequired: finalIntent.confirmRequired || false,
        ...(result.reasoning && { reasoning: result.reasoning }),
        ...(result.clarifyingQuestion && { clarifyingQuestion: result.clarifyingQuestion }),
        ...(result.suggestedFollowUp && { suggestedFollowUp: result.suggestedFollowUp }),
        warnings,
        ...(disambiguationResult.alternatives.length > 0 && {
          alternatives: disambiguationResult.alternatives
        }),
        ...(defaultsResult.appliedDefaults.length > 0 && {
          appliedDefaults: defaultsResult.appliedDefaults
        })
      };

      // 11. Record turn in memory
      this.memory.learnFromInput(input, enhancedResult);

      this.logger.info('Intent classified', {
        intent: enhancedResult.intent,
        confidence: enhancedResult.confidence,
        hasWarnings: warnings.length > 0
      });

      return enhancedResult;

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Build conversation context from memory
   */
  private buildConversationContext(): string {
    const turns = this.memory.getTurns();
    const recentTurns = turns.slice(-3); // Last 3 turns
    const priority = this.memory.getUserPriority();
    const preferredProvider = this.memory.getPreferredProvider();
    const projectContext = this.memory.getProjectContext();

    // Build conversation summary
    const turnsSummary = recentTurns.length > 0
      ? recentTurns
          .map(turn => `User: "${turn.userInput}" → Intent: ${turn.intent}`)
          .join('\n')
      : 'No previous conversation';

    return `
## Recent Conversation
${turnsSummary}

## User Preferences
- Priority: ${priority || 'unknown'}
- Preferred Provider: ${preferredProvider?.provider || 'none'} (confidence: ${preferredProvider?.confidence.toFixed(2) || 'N/A'})

## Project Context
${projectContext ? `
- Path: ${projectContext.path}
- Framework: ${projectContext.framework || 'unknown'}
${projectContext.lastDeployment ? `
- Last Deployment: ${projectContext.lastDeployment.provider} to ${projectContext.lastDeployment.env} (${projectContext.lastDeployment.success ? 'success' : 'failed'})
` : ''}
` : '- No project context available'}
`.trim();
  }

  /**
   * Resolve references like "it", "that", "again"
   */
  private resolveReferences(input: string, _context: string): string {
    const referenceWords = ['it', 'that', 'this', 'the same', 'again'];
    const hasReference = referenceWords.some(word =>
      input.toLowerCase().includes(word)
    );

    if (!hasReference) {
      return input;
    }

    const turns = this.memory.getTurns();
    if (turns.length === 0) {
      return input;
    }

    const lastTurn = turns[turns.length - 1];

    this.logger.debug('Resolving reference', {
      input,
      lastIntent: lastTurn?.intent
    });

    // User likely referring to last action
    return input; // Let AI handle the resolution with context
  }

  /**
   * Build enhanced prompt with context and examples
   */
  private buildEnhancedPrompt(input: string, context: string): string {
    const commandList = Object.entries(COMMAND_REGISTRY)
      .map(([intent, metadata]) => {
        const examples = metadata?.examples.join(', ') || '';
        return `- ${intent}: ${metadata?.description}${examples ? `\n  Examples: ${examples}` : ''}`;
      })
      .join('\n');

    return `You are AIOS, an expert DevOps AI assistant with deep knowledge of cloud infrastructure and deployment strategies.

${context}

## AVAILABLE COMMANDS
${commandList}

## ENTITY EXTRACTION RULES
1. **Time expressions:**
   - "last 2 hours" / "2 hours ago" → "2h"
   - "since yesterday" / "last 24 hours" → "24h"
   - "past week" / "last 7 days" → "7d"
   - "last month" / "30 days" → "30d"

2. **Environment inference:**
   - No env specified + "deploy" → infer from context or ask
   - "test" / "testing" → "staging"
   - "live" / "prod" → "production"

3. **Provider matching:**
   - "vercel" or mentions "next.js" → vercel
   - "netlify" or "jamstack" → netlify
   - Use fuzzy matching (2 char distance tolerance)

4. **Reference resolution:**
   - "yes" / "ok" / "sure" → Check context for what user is confirming
   - "it" / "that" / "again" → Refer to recent conversation
   - "why" → Provide reasoning for last recommendation

## USER INPUT
"${input}"

## RESPONSE FORMAT (JSON ONLY, NO MARKDOWN)
{
  "intent": "deploy|logs|status|...",
  "entities": {
    "env": "production|staging|development",
    "provider": "vercel|netlify|aws|...",
    "service": "string",
    "replicas": number,
    "since": "1h|24h|7d|30d",
    "level": "info|warn|error|debug"
  },
  "confidence": 0.95,
  "risk": "low|moderate|high",
  "confirmRequired": true,
  "reasoning": "Brief explanation of classification",
  "clarifyingQuestion": "Ask if confidence < 0.7 or missing critical entities",
  "suggestedFollowUp": "Proactive next step suggestion"
}

## CRITICAL RULES
- ONLY return valid JSON (no markdown, no extra text)
- confidence must be 0.0 to 1.0
- If confidence < 0.7, provide clarifyingQuestion
- Use conversation context to improve accuracy
- Infer missing entities when obvious from context
- Set confirmRequired=true for destructive actions (deploy, rollback, scale)

Response:`;
  }

  /**
   * Parse AI response with validation
   */
  private parseAIResponse(content: string): EnhancedClassificationResult | null {
    try {
      // Remove markdown code blocks if present
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // Extract JSON
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error('No JSON found in AI response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.intent || typeof parsed.intent !== 'string') {
        this.logger.error('Invalid intent');
        return null;
      }

      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;

      return {
        intent: parsed.intent as IntentType,
        entities: parsed.entities || {},
        cli: '', // Will be filled by caller
        confidence,
        risk: parsed.risk || 'low',
        confirmRequired: parsed.confirmRequired || false,
        reasoning: parsed.reasoning,
        clarifyingQuestion: parsed.clarifyingQuestion,
        suggestedFollowUp: parsed.suggestedFollowUp
      };

    } catch (error) {
      this.logger.error('Failed to parse AI response', error as Error);
      return null;
    }
  }

  /**
   * Log fuzzy matching suggestions for debugging
   * Note: Actual correction happens downstream in smart defaults/disambiguation
   */
  private logFuzzyMatchingSuggestions(entities: ExtractedEntitiesType): void {
    // Check provider fuzzy matches
    if (entities.provider && typeof entities.provider === 'string') {
      const providerMatch = this.fuzzyMatcher.findBestMatch(
        entities.provider,
        ['vercel', 'netlify', 'aws', 'railway', 'render']
      );
      if (providerMatch && providerMatch.confidence > 0.7) {
        this.logger.debug('Fuzzy match suggestion for provider', {
          original: entities.provider,
          suggested: providerMatch.match,
          confidence: providerMatch.confidence
        });
      }
    }

    // Check environment fuzzy matches
    if (entities.env && typeof entities.env === 'string') {
      const envMatch = this.fuzzyMatcher.findBestMatch(
        entities.env,
        ['production', 'staging', 'development', 'preview']
      );
      if (envMatch && envMatch.confidence > 0.7) {
        this.logger.debug('Fuzzy match suggestion for environment', {
          original: entities.env,
          suggested: envMatch.match,
          confidence: envMatch.confidence
        });
      }
    }
  }

  /**
   * Enhance entities with learned preferences
   */
  private enhanceWithPreferences(
    entities: ExtractedEntitiesType
  ): ExtractedEntitiesType {
    const enhanced = { ...entities };

    // Fill in missing provider from preferences
    if (!enhanced.provider) {
      const preferred = this.memory.getPreferredProvider();
      if (preferred && preferred.confidence > 0.7) {
        enhanced.provider = preferred.provider;
        this.logger.debug('Filled provider from preferences', {
          provider: preferred.provider,
          confidence: preferred.confidence
        });
      }
    }

    // Fill in missing env from preferences
    if (!enhanced.env) {
      const preferredEnv = this.memory.getPreferredEnvironment();
      if (preferredEnv) {
        enhanced.env = preferredEnv;
        this.logger.debug('Filled env from preferences', { env: preferredEnv });
      }
    }

    return enhanced;
  }

  /**
   * Detect potential issues proactively
   */
  private detectPotentialIssues(
    intent: IntentType,
    entities: ExtractedEntitiesType
  ): string[] {
    const warnings: string[] = [];

    // Warn about production deployments
    if (intent === 'deploy' && entities.env === 'production') {
      warnings.push('⚠️  Deploying to production - ensure tests pass first');
    }

    // Warn about missing provider
    if (intent === 'deploy' && !entities.provider) {
      warnings.push('ℹ️  No provider specified - will use preferred or prompt for selection');
    }

    // Warn about rollback
    if (intent === 'rollback') {
      warnings.push('⚠️  Rollback is a destructive operation - confirmation required');
    }

    return warnings;
  }

  /**
   * Record user preference explicitly
   */
  public recordPreference(preference: UserPreference): void {
    this.memory.recordPreference(preference);
    this.logger.info('Preference recorded', {
      type: preference.type,
      value: preference.value
    });
  }

  /**
   * Get conversation statistics
   */
  public getStats() {
    return this.memory.getStats();
  }

  /**
   * Clear conversation memory
   */
  public clearMemory(): void {
    this.memory.clear();
    this.logger.info('Conversation memory cleared');
  }
}
