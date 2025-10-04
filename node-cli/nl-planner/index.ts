/**
 * @fileoverview Natural Language Planner - Main facade
 * @description Orchestrates NL → Intent → CLI mapping
 * @module node-cli/nl-planner
 */

import { parseIntent, getIntentConfidence, needsClarification } from './intent-parser.js';
import { extractEntities } from './entity-extractor.js';
import { mapToCommand } from './command-mapper.js';
import { ContextManager } from './context-manager.js';
import type { ParsedIntentType } from './types.js';

export * from './types.js';
export { ContextManager } from './context-manager.js';

/**
 * Parse natural language utterance into structured intent + CLI command
 *
 * @param utterance - User's natural language input
 * @param contextManager - Optional context manager for follow-up commands
 * @returns Parsed intent with CLI command and metadata
 *
 * @example
 * ```typescript
 * const result = parseNaturalLanguage('deploy web-app to production');
 * console.log(result.cli); // "aios cloud deploy --env production --service web-app --strategy instant"
 * console.log(result.risk); // "high"
 * console.log(result.confirmRequired); // true
 * ```
 */
export function parseNaturalLanguage(
  utterance: string,
  contextManager?: ContextManager
): ParsedIntentType {
  // Step 1: Parse intent
  const intent = parseIntent(utterance);

  // Step 2: Get confidence score
  const confidence = getIntentConfidence(utterance, intent);

  // Step 3: Extract entities
  let entities = extractEntities(utterance, intent);

  // Step 4: Enrich with context if available
  if (contextManager) {
    entities = contextManager.enrichEntitiesWithContext(utterance, entities, intent);
  }

  // Step 5: Map to CLI command
  const result = mapToCommand(intent, entities, confidence);

  // Step 6: Check if needs clarification
  if (needsClarification(utterance, intent)) {
    return {
      ...result,
      clarifyingQuestion: result.clarifyingQuestion || 'Could you provide more details?'
    };
  }

  return result;
}

/**
 * Quick test function for development
 *
 * @param utterances - Array of test utterances
 */
export function testNLPlanner(utterances: readonly string[]): void {
  console.log('='.repeat(80));
  console.log('NL Planner Test Results');
  console.log('='.repeat(80));

  for (const utterance of utterances) {
    console.log(`\nInput: "${utterance}"`);
    const result = parseNaturalLanguage(utterance);
    console.log(`Intent: ${result.intent} (confidence: ${(result.confidence * 100).toFixed(0)}%)`);
    console.log(`Command: ${result.cli}`);
    console.log(`Risk: ${result.risk}`);
    if (result.confirmRequired) {
      console.log(`⚠️  Confirmation required: ${result.confirmPrompt}`);
    }
    if (result.clarifyingQuestion) {
      console.log(`❓ ${result.clarifyingQuestion}`);
    }
    if (result.notes) {
      console.log(`📝 ${result.notes}`);
    }
    console.log('-'.repeat(80));
  }
}
