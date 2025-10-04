/**
 * @fileoverview AI-Powered Intent Classification and Entity Extraction
 * @description Production-grade LLM-based natural language understanding for AIOS CLI
 * @module node-cli/nl-planner/ai-intent-classifier
 */

import type { IntentType, ExtractedEntitiesType, ParsedIntentType } from './types.js';
import type { IAIService } from '@aios/shared';

/**
 * AI Response interface (subset we need)
 */
interface AIResponse {
  readonly content: string;
}

/**
 * Command metadata for AI understanding
 * IMPORTANT: Keep in sync with IntentType in types.ts
 */
interface CommandMetadata {
  readonly description: string;
  readonly examples: readonly string[];
  readonly requiredEntities?: readonly (keyof ExtractedEntitiesType)[];
  readonly optionalEntities?: readonly (keyof ExtractedEntitiesType)[];
}

/**
 * Comprehensive command registry
 * Every IntentType MUST have an entry here
 */
const COMMAND_REGISTRY: Readonly<Record<IntentType, CommandMetadata>> = {
  deploy: {
    description: 'Deploy application to cloud provider. Use when user wants to push/deploy/ship code to production, staging, or any environment.',
    examples: ['deploy to production', 'ship to staging', 'push my app'],
    requiredEntities: [],
    optionalEntities: ['env', 'provider', 'branch']
  },

  rollback: {
    description: 'Rollback/revert a previous deployment. Use when user wants to undo a deployment or go back to a previous version.',
    examples: ['rollback production', 'undo last deployment', 'revert to previous version'],
    optionalEntities: ['env', 'service']
  },

  logs: {
    description: 'View logs from deployed services. Use when user wants to see errors, debug info, or what is happening in their application.',
    examples: ['show logs', 'view errors', 'what happened in production'],
    optionalEntities: ['env', 'service', 'since', 'level']
  },

  status: {
    description: 'Check AIOS system status - shows which AI providers are configured (OpenAI, Anthropic, etc.) and environment info. NOT for deployment status.',
    examples: ['system status', 'aios status', 'what providers are configured'],
    optionalEntities: []
  },

  'deployment-history': {
    description: 'View deployment history and status of past deployments. Use when user asks about deployment status, what was deployed, deployment records, or recent deployments. Can filter by time range.',
    examples: [
      'check deployment status',
      'show deployment history',
      'what did I deploy',
      'recent deployments',
      'deployments in the last week',
      'history for the past month',
      'show me deployments from last 24 hours'
    ],
    optionalEntities: ['service', 'env', 'since', 'provider']
  },

  scale: {
    description: 'Scale application replicas/instances up or down. Use when user wants to increase or decrease resources.',
    examples: ['scale to 5 instances', 'increase replicas', 'scale down'],
    requiredEntities: ['replicas'],
    optionalEntities: ['service', 'env']
  },

  'set-env': {
    description: 'Set or update environment variables. Use when user wants to configure env vars.',
    examples: ['set DATABASE_URL', 'update env vars', 'configure environment'],
    optionalEntities: ['env']
  },

  connect: {
    description: 'Connect to a cloud provider (Vercel, Netlify, AWS, etc.). Use when user wants to link or add a provider.',
    examples: ['connect to vercel', 'link netlify', 'add aws provider'],
    optionalEntities: ['provider']
  },

  adopt: {
    description: 'Adopt/import existing infrastructure. Use when user wants to manage existing deployments.',
    examples: ['adopt existing project', 'import infrastructure', 'manage existing deployment'],
    optionalEntities: ['provider', 'service']
  },

  cost: {
    description: 'Show cost estimates and spending. Use when user asks about pricing or expenses.',
    examples: ['show costs', 'how much am I spending', 'pricing estimate'],
    optionalEntities: ['service', 'since']
  },

  analyze: {
    description: 'Analyze project structure, detect frameworks, languages, dependencies. Use when user wants to understand their project.',
    examples: ['analyze my project', 'detect frameworks', 'what is my stack'],
    optionalEntities: ['paths']
  },

  recommend: {
    description: 'Recommend best cloud provider for the project. Use when user asks which provider to use or wants suggestions.',
    examples: ['recommend provider', 'which platform should I use', 'best deployment option'],
    optionalEntities: []
  },

  reconfigure: {
    description: 'Reconfigure AIOS settings, change AI provider, or modify system configuration. Use when user wants to change settings or switch modes.',
    examples: ['reconfigure', 'change settings', 'switch AI provider', 'reset config'],
    optionalEntities: []
  },

  help: {
    description: 'Show available commands and help. Use when user asks for help, commands, or what they can do.',
    examples: ['help', 'what can you do', 'show commands'],
    optionalEntities: []
  },

  unknown: {
    description: 'Use this when you cannot determine the user intent or the request is unclear.',
    examples: [],
    optionalEntities: []
  }
} as const;

/**
 * Type guard to validate IntentType
 */
function isValidIntent(value: string): value is IntentType {
  return value in COMMAND_REGISTRY;
}

/**
 * Type guard for AIResponse
 */
function isValidAIResponse(response: unknown): response is AIResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'content' in response &&
    typeof (response as AIResponse).content === 'string'
  );
}

/**
 * Classification result with confidence and extracted entities
 */
interface ClassificationResult {
  readonly intent: IntentType;
  readonly entities: ExtractedEntitiesType;
  readonly confidence: number;
  readonly needsClarification: boolean;
  readonly clarificationQuestion?: string;
}

/**
 * Build structured prompt for intent classification and entity extraction
 */
function buildClassificationPrompt(userInput: string): string {
  const commandList = Object.entries(COMMAND_REGISTRY)
    .filter(([intent]) => intent !== 'unknown')
    .map(([intent, metadata]) => {
      const examplesStr = metadata.examples.length > 0
        ? `\n  Examples: ${metadata.examples.join(', ')}`
        : '';
      return `- ${intent}: ${metadata.description}${examplesStr}`;
    })
    .join('\n');

  return `You are an expert intent classifier for AIOS (AI DevOps Assistant).

Your task: Analyze the user's input and determine their intent, extract relevant entities, and assess confidence.

Available Commands:
${commandList}

User Input: "${userInput}"

Respond in this EXACT JSON format (no additional text):
{
  "intent": "the-intent-name",
  "entities": {
    "env": "production|staging|development|preview (if mentioned)",
    "service": "service name (if mentioned)",
    "provider": "vercel|netlify|aws|railway|render (if mentioned)",
    "replicas": number (if mentioned),
    "since": "time range (if mentioned - convert to format like: 1h, 24h, 7d, 30d)",
    "level": "info|warn|error|debug (if mentioned)"
  },
  "confidence": 0.0-1.0,
  "needsClarification": true/false,
  "clarificationQuestion": "question to ask user (only if needsClarification is true)"
}

Rules:
1. Only include entities that were actually mentioned
2. Use "unknown" intent if truly unclear
3. Set needsClarification=true if missing critical information
4. confidence should reflect how sure you are (0.0 = not sure, 1.0 = very sure)
5. For time ranges, convert natural language to format:
   - "last hour" / "1 hour" → "1h"
   - "24 hours" / "last day" → "24h"
   - "last week" / "7 days" → "7d"
   - "last month" / "30 days" → "30d"

Response:`;
}

/**
 * Parse AI response with comprehensive validation
 */
function parseAIResponse(content: string): ClassificationResult | null {
  try {
    // Extract JSON from response (handle cases where AI adds extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', content);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ClassificationResult>;

    // Validate intent
    if (!parsed.intent || !isValidIntent(parsed.intent)) {
      console.error('Invalid intent in response:', parsed.intent);
      return null;
    }

    // Validate confidence
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;

    // Extract entities with validation
    // Use mutable object for construction, then cast to readonly
    const entitiesBuilder: Partial<{
      -readonly [K in keyof ExtractedEntitiesType]: ExtractedEntitiesType[K];
    }> = {};

    if (parsed.entities && typeof parsed.entities === 'object') {
      const rawEntities = parsed.entities as Record<string, unknown>;

      // Validate and copy each entity using bracket notation for strict mode
      // Type guard functions ensure type safety without 'as' assertions
      const envValue = rawEntities['env'];
      if (typeof envValue === 'string') {
        const validEnvs = ['production', 'staging', 'development', 'preview'] as const;
        type ValidEnv = typeof validEnvs[number];
        if ((validEnvs as readonly string[]).includes(envValue)) {
          // TypeScript now knows envValue is one of the valid strings
          entitiesBuilder['env'] = envValue as ValidEnv;
        }
      }

      const serviceValue = rawEntities['service'];
      if (typeof serviceValue === 'string') {
        entitiesBuilder['service'] = serviceValue;
      }

      const providerValue = rawEntities['provider'];
      if (typeof providerValue === 'string') {
        const validProviders = ['vercel', 'netlify', 'aws', 'railway', 'render'] as const;
        type ValidProvider = typeof validProviders[number];
        if ((validProviders as readonly string[]).includes(providerValue)) {
          entitiesBuilder['provider'] = providerValue as ValidProvider;
        }
      }

      const replicasValue = rawEntities['replicas'];
      if (typeof replicasValue === 'number') {
        entitiesBuilder['replicas'] = Math.max(0, Math.floor(replicasValue));
      }

      const sinceValue = rawEntities['since'];
      if (typeof sinceValue === 'string') {
        entitiesBuilder['since'] = sinceValue;
      }

      const levelValue = rawEntities['level'];
      if (typeof levelValue === 'string') {
        const validLevels = ['info', 'warn', 'error', 'debug'] as const;
        type ValidLevel = typeof validLevels[number];
        if ((validLevels as readonly string[]).includes(levelValue)) {
          entitiesBuilder['level'] = levelValue as ValidLevel;
        }
      }

      // Copy other optional fields
      const branchValue = rawEntities['branch'];
      if (typeof branchValue === 'string') {
        entitiesBuilder['branch'] = branchValue;
      }

      const pathsValue = rawEntities['paths'];
      if (typeof pathsValue === 'string') {
        entitiesBuilder['paths'] = pathsValue;
      }

      const regionValue = rawEntities['region'];
      if (typeof regionValue === 'string') {
        entitiesBuilder['region'] = regionValue;
      }
    }

    const entities = entitiesBuilder as ExtractedEntitiesType;

    // Build result object with proper optional handling
    const result: ClassificationResult = {
      intent: parsed.intent,
      entities,
      confidence,
      needsClarification: parsed.needsClarification === true
    };

    // Only add clarificationQuestion if it exists
    if (parsed.needsClarification && typeof parsed.clarificationQuestion === 'string') {
      return {
        ...result,
        clarificationQuestion: parsed.clarificationQuestion
      };
    }

    return result;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return null;
  }
}

/**
 * Classify user intent with entity extraction using AI
 *
 * @param userInput - The natural language input from user
 * @param aiService - AI service instance
 * @returns Classification result with intent, entities, and confidence
 *
 * @example
 * ```typescript
 * const result = await classifyIntentWithAI('deploy to production', aiService);
 * console.log(result.intent); // 'deploy'
 * console.log(result.entities.env); // 'production'
 * console.log(result.confidence); // 0.95
 * ```
 */
export async function classifyIntentWithAI(
  userInput: string,
  aiService: IAIService
): Promise<ParsedIntentType> {
  try {
    const prompt = buildClassificationPrompt(userInput);

    const result = await aiService.sendMessage(prompt, {
      config: {
        temperature: 0.1,
        maxTokens: 500
      }
    });

    if (!result.isSuccess) {
      console.error('AI service returned failure:', result.error);
      return createFallbackResult(userInput);
    }

    const response = result.value;
    if (!isValidAIResponse(response)) {
      console.error('Invalid AI response structure');
      return createFallbackResult(userInput);
    }

    const classification = parseAIResponse(response.content);
    if (!classification) {
      return createFallbackResult(userInput);
    }

    // Build ParsedIntentType from classification
    const parsedResult: ParsedIntentType = {
      intent: classification.intent,
      entities: classification.entities,
      cli: buildCLICommand(classification.intent, classification.entities),
      confidence: classification.confidence,
      risk: determineRiskLevel(classification.intent, classification.entities),
      confirmRequired: shouldRequireConfirmation(classification.intent, classification.entities)
    };

    // Add optional fields only if they exist
    if (classification.clarificationQuestion) {
      return {
        ...parsedResult,
        clarifyingQuestion: classification.clarificationQuestion,
        notes: 'Missing required information - clarification needed'
      };
    }

    if (classification.needsClarification) {
      return {
        ...parsedResult,
        notes: 'Missing required information - clarification needed'
      };
    }

    return parsedResult;
  } catch (error) {
    console.error('AI intent classification failed:', error);
    return createFallbackResult(userInput);
  }
}

/**
 * Create fallback result when AI classification fails
 */
function createFallbackResult(userInput: string): ParsedIntentType {
  return {
    intent: 'unknown',
    entities: {},
    cli: `aios help`,
    confidence: 0.0,
    risk: 'low',
    confirmRequired: false,
    notes: `Could not classify: "${userInput}". Try "help" to see available commands.`
  };
}

/**
 * Build CLI command string from intent and entities
 */
function buildCLICommand(intent: IntentType, entities: ExtractedEntitiesType): string {
  let cmd = `aios ${intent}`;

  if (entities.env) cmd += ` --env ${entities.env}`;
  if (entities.service) cmd += ` --service ${entities.service}`;
  if (entities.provider) cmd += ` --provider ${entities.provider}`;
  if (entities.replicas) cmd += ` --replicas ${entities.replicas}`;
  if (entities.since) cmd += ` --since ${entities.since}`;
  if (entities.level) cmd += ` --level ${entities.level}`;
  if (entities.branch) cmd += ` --branch ${entities.branch}`;
  if (entities.region) cmd += ` --region ${entities.region}`;

  return cmd;
}

/**
 * Determine risk level based on intent and entities
 */
function determineRiskLevel(
  intent: IntentType,
  entities: ExtractedEntitiesType
): ParsedIntentType['risk'] {
  // Destructive operations
  if (intent === 'rollback') return 'destructive';

  // High risk operations
  if (intent === 'deploy' && entities.env === 'production') return 'high';
  if (intent === 'scale' && entities.env === 'production') return 'high';
  if (intent === 'set-env' && entities.env === 'production') return 'high';

  // Moderate risk operations
  if (intent === 'deploy') return 'moderate';
  if (intent === 'scale') return 'moderate';
  if (intent === 'set-env') return 'moderate';

  // Low risk - read-only operations
  return 'low';
}

/**
 * Determine if user confirmation is required
 */
function shouldRequireConfirmation(
  intent: IntentType,
  entities: ExtractedEntitiesType
): boolean {
  const riskLevel = determineRiskLevel(intent, entities);
  return riskLevel === 'high' || riskLevel === 'destructive';
}

/**
 * Get command description for an intent
 */
export function getCommandDescription(intent: IntentType): string {
  const metadata = COMMAND_REGISTRY[intent];
  return metadata?.description || 'Unknown command';
}

/**
 * Get all available commands with descriptions
 */
export function getAllCommands(): ReadonlyArray<{ intent: IntentType; description: string }> {
  return Object.entries(COMMAND_REGISTRY)
    .filter(([intent]) => intent !== 'unknown')
    .map(([intent, metadata]) => ({
      intent: intent as IntentType,
      description: metadata.description
    }));
}
