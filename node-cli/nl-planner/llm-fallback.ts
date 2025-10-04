/**
 * @fileoverview LLM Fallback Handler
 * @description Use LLM when rule-based parser fails or confidence is low
 * @module node-cli/nl-planner/llm-fallback
 */

import type { ParsedIntentType, IntentType } from './types.js';

/**
 * LLM response structure
 */
interface LLMIntentResponseType {
  intent: IntentType;
  entities: Record<string, unknown>;
  confidence: number;
  reasoning: string;
}

/**
 * LLM Query Function Type
 */
type LLMQueryFunctionType = (prompt: string) => Promise<string>;

/**
 * LLM Fallback Handler
 */
export class LLMFallbackHandler {
  private readonly llmQuery: LLMQueryFunctionType;
  private readonly enabled: boolean;

  constructor(llmQuery: LLMQueryFunctionType, enabled = true) {
    this.llmQuery = llmQuery;
    this.enabled = enabled;
  }

  /**
   * Parse utterance using LLM
   */
  async parseWithLLM(utterance: string): Promise<ParsedIntentType | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const prompt = this.buildPrompt(utterance);
      const response = await this.llmQuery(prompt);

      if (!response) {
        return null;
      }

      return this.parseLLMResponse(response, utterance);
    } catch (error) {
      console.error('LLM fallback failed:', error);
      return null;
    }
  }

  /**
   * Build prompt for LLM
   */
  private buildPrompt(utterance: string): string {
    return `You are an AI DevOps assistant. Parse the following user command into structured intent and entities.

User command: "${utterance}"

Available intents:
- deploy: Deploy services to cloud
- status: Check service status
- logs: View application logs
- scale: Adjust service capacity
- rollback: Revert to previous version
- connect: Connect to cloud provider
- adopt: Import existing infrastructure
- cost: View spending
- analyze: Analyze project
- recommend: Get provider recommendations
- set-env: Manage environment variables
- help: Get help
- unknown: Cannot determine intent

Available entities:
- service: Service name (e.g., "web-app", "api")
- env: Environment (production, staging, development, preview)
- provider: Cloud provider (vercel, netlify, aws, railway, render)
- region: Cloud region (e.g., "us-east-1")
- since: Time duration (e.g., "15m", "1h", "2d")
- level: Log level (error, warn, info, debug)
- replicas: Number of instances
- strategy: Deployment strategy (canary, blue-green, instant)
- percent: Percentage for canary deployments

Respond in JSON format:
{
  "intent": "<intent_name>",
  "entities": {
    "<entity_name>": "<entity_value>",
    ...
  },
  "confidence": <0-1>,
  "reasoning": "<brief explanation>"
}

Example:
User: "deploy web-app to production"
Response: {
  "intent": "deploy",
  "entities": {
    "service": "web-app",
    "env": "production"
  },
  "confidence": 0.95,
  "reasoning": "Clear deployment intent with service and environment specified"
}

Now parse the user command above.`;
  }

  /**
   * Parse LLM response
   */
  private parseLLMResponse(response: string, _utterance: string): ParsedIntentType | null {
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]) as LLMIntentResponseType;

      // Validate required fields
      if (!parsed.intent || !parsed.entities) {
        return null;
      }

      // Build ParsedIntentType from LLM response
      const result: ParsedIntentType = {
        intent: parsed.intent,
        entities: parsed.entities,
        cli: this.generateCommand(parsed.intent, parsed.entities),
        risk: this.assessRisk(parsed.intent, parsed.entities),
        confirmRequired: this.needsConfirmation(parsed.intent, parsed.entities),
        confidence: parsed.confidence || 0.7,
        notes: `AI-assisted: ${parsed.reasoning || 'Parsed using LLM fallback'}`
      };

      return result;
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return null;
    }
  }

  /**
   * Generate CLI command from intent and entities
   */
  private generateCommand(intent: IntentType, entities: Record<string, unknown>): string {
    const parts = ['aios'];

    switch (intent) {
      case 'deploy':
        parts.push('cloud', 'deploy');
        if (entities['env']) parts.push('--env', String(entities['env']));
        if (entities['service']) parts.push('--service', String(entities['service']));
        if (entities['strategy']) parts.push('--strategy', String(entities['strategy']));
        break;

      case 'status':
        parts.push('cloud', 'status');
        if (entities['service']) parts.push('--service', String(entities['service']));
        break;

      case 'logs':
        parts.push('cloud', 'logs');
        if (entities['service']) parts.push('--service', String(entities['service']));
        if (entities['since']) parts.push('--since', String(entities['since']));
        if (entities['level']) parts.push('--level', String(entities['level']));
        break;

      // Add more cases as needed
      default:
        return 'aios --help';
    }

    return parts.join(' ');
  }

  /**
   * Assess risk level
   */
  private assessRisk(intent: IntentType, entities: Record<string, unknown>): 'low' | 'moderate' | 'high' | 'destructive' {
    if (entities['env'] === 'production') return 'high';
    if (intent === 'rollback') return 'high';
    if (intent === 'scale') return 'moderate';
    if (['status', 'logs', 'cost', 'analyze', 'recommend'].includes(intent)) return 'low';
    return 'moderate';
  }

  /**
   * Check if confirmation is needed
   */
  private needsConfirmation(intent: IntentType, entities: Record<string, unknown>): boolean {
    return entities['env'] === 'production' || intent === 'rollback';
  }
}
