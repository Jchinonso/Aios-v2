/**
 * @fileoverview AI-Powered Intent Parser
 * @description Uses AI to understand natural language and map to intents
 * @module node-cli/nl-planner/ai-intent-parser
 */

import type { ParsedIntentType, IntentType, ExtractedEntitiesType } from './types.js';
import type { IAIService } from '@aios/shared/intelligence';

/**
 * System prompt for AI intent parsing - FULLY AUTONOMOUS
 *
 * The AI receives ZERO instructions about what commands mean.
 * It must discover and understand DevOps operations from the user's natural language alone.
 */
const INTENT_PARSING_PROMPT = `You are an autonomous AI assistant for a DevOps CLI tool called AIOS.

Your job: Understand what the user wants to do and return structured JSON.

You have NO predefined commands. You must intelligently figure out the user's intent from their natural language.

Common DevOps operations you might encounter (but are not limited to):
- Deploying applications
- Viewing logs and diagnostics
- Scaling services
- Checking status/health
- Rolling back deployments
- Managing costs
- Analyzing projects
- Getting recommendations
- Connecting to cloud providers
- Managing environment variables
- Importing existing infrastructure
- Reconfiguring settings
- Getting help

Return JSON in this format:
{
  "intent": "a-short-verb-describing-the-action",
  "confidence": 0.0-1.0,
  "entities": {
    "service": "service-name-if-mentioned",
    "env": "environment-if-mentioned",
    "provider": "cloud-provider-if-mentioned",
    "any-other-relevant-parameters": "extracted-values"
  },
  "risk": "low|moderate|high|destructive",
  "notes": "What you understand the user wants to do"
}

Guidelines:
- Use your intelligence to map synonyms (e.g., "push", "ship", "release" might all mean deploy)
- Extract parameters from context (e.g., "prod" = production environment)
- Assess risk based on the operation and environment
- Be creative in understanding intent - don't require exact keywords
- If unsure, use "unknown" intent with low confidence

Examples of autonomous understanding:
- "deploy this app" → figure out this means deploying
- "why is it slow" → figure out they want diagnostics/logs
- "make it bigger" → figure out they want to scale
- "undo" → figure out they want to rollback
- "how much" → figure out they're asking about cost

Use your intelligence. No hand-holding.`;

/**
 * Parse natural language using AI
 */
export async function parseWithAI(
  utterance: string,
  aiService: IAIService
): Promise<ParsedIntentType | null> {
  try {
    const response = await aiService.sendMessage(
      `Parse this command: "${utterance}"`,
      {
        systemPrompt: INTENT_PARSING_PROMPT,
        provider: 'openai', // Use OpenAI for fast responses
        config: {
          temperature: 0.1, // Low temperature for consistent parsing
          maxTokens: 500
        }
      }
    );

    if (response.isFailure) {
      console.error('AI parsing failed:', response.error.message);
      return null;
    }

    // Extract JSON from response
    const content = response.value.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and transform to ParsedIntentType
    const intent = parsed.intent as IntentType;
    const entities = parsed.entities as ExtractedEntitiesType;
    const confidence = parsed.confidence || 0.7;
    const risk = parsed.risk || 'moderate';
    const notes = parsed.notes;

    // Generate CLI command
    const cli = generateCLICommand(intent, entities);

    // Determine if confirmation is required
    const confirmRequired = risk === 'high' || risk === 'destructive';
    const confirmPrompt = confirmRequired ? generateConfirmPrompt(intent, entities) : undefined;

    return {
      intent,
      entities,
      cli,
      risk,
      confirmRequired,
      ...(confirmPrompt && { confirmPrompt }),
      notes,
      confidence
    };

  } catch (error) {
    console.error('AI parsing error:', error);
    return null;
  }
}

/**
 * Generate CLI command from intent and entities
 */
function generateCLICommand(intent: IntentType, entities: ExtractedEntitiesType): string {
  const parts = ['aios'];

  switch (intent) {
    case 'deploy':
      parts.push('runtime', 'deploy');
      if (entities.env) parts.push('--env', entities.env);
      if (entities.service) parts.push('--service', entities.service);
      if (entities.strategy) parts.push('--strategy', entities.strategy);
      break;

    case 'logs':
      parts.push('obs', 'logs');
      if (entities.service) parts.push('--service', entities.service);
      if (entities.since) parts.push('--since', entities.since);
      if (entities.level) parts.push('--level', entities.level);
      break;

    case 'scale':
      parts.push('runtime', 'scale');
      if (entities.service) parts.push('--service', entities.service);
      if (entities.replicas) parts.push('--replicas', entities.replicas.toString());
      break;

    case 'status':
      parts.push('status');
      if (entities.service) parts.push('--service', entities.service);
      break;

    case 'rollback':
      parts.push('runtime', 'rollback');
      if (entities.service) parts.push('--service', entities.service);
      if (entities.env) parts.push('--env', entities.env);
      break;

    case 'connect':
      parts.push('cloud', 'connect');
      if (entities.provider) parts.push('--provider', entities.provider);
      break;

    case 'cost':
      parts.push('obs', 'cost');
      break;

    case 'analyze':
      parts.push('ai', 'analyze');
      break;

    case 'recommend':
      parts.push('cloud', 'recommend');
      break;

    default:
      return 'aios --help';
  }

  return parts.join(' ');
}

/**
 * Generate confirmation prompt
 */
function generateConfirmPrompt(intent: IntentType, entities: ExtractedEntitiesType): string {
  if (entities.env === 'production') {
    return `Type 'production' to confirm`;
  }

  if (intent === 'rollback') {
    return `Type 'rollback' to confirm`;
  }

  return `Type 'confirm' to proceed`;
}
