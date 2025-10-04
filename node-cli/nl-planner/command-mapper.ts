/**
 * @fileoverview Command Mapper - Map intent + entities → CLI command
 * @description Converts parsed intent to executable CLI command
 * @module node-cli/nl-planner/command-mapper
 */

import type { IntentType, ExtractedEntitiesType, RiskLevelType, ParsedIntentType } from './types.js';
import { DEFAULT_ENTITIES, RISK_LEVELS } from './types.js';

/**
 * Map intent and entities to CLI command
 *
 * @param intent - Detected intent
 * @param entities - Extracted entities
 * @param confidence - Confidence score
 * @returns Parsed intent with CLI command
 */
export function mapToCommand(
  intent: IntentType,
  entities: ExtractedEntitiesType,
  confidence: number
): ParsedIntentType {
  // Apply defaults
  const enrichedEntities = applyDefaults(entities, intent);

  // Determine risk level
  const risk = determineRisk(intent, enrichedEntities);

  // Check if confirmation is required
  const confirmRequired = risk === 'high' || risk === 'destructive';
  const confirmPrompt = confirmRequired ? generateConfirmPrompt(intent, enrichedEntities) : undefined;

  // Generate CLI command
  const cli = generateCLICommand(intent, enrichedEntities);

  // Generate clarifying question if needed
  const clarifyingQuestion = generateClarifyingQuestion(intent, enrichedEntities);

  // Generate notes
  const notes = generateNotes(intent, enrichedEntities);

  return {
    intent,
    entities: enrichedEntities,
    cli,
    risk,
    confirmRequired,
    ...(confirmPrompt && { confirmPrompt }),
    ...(clarifyingQuestion && { clarifyingQuestion }),
    notes,
    confidence
  };
}

/**
 * Apply default values to entities
 */
function applyDefaults(entities: ExtractedEntitiesType, intent: IntentType): ExtractedEntitiesType {
  const defaults: Record<string, unknown> = { ...entities };

  // Default environment to staging for deploys
  if (intent === 'deploy' && !defaults['env']) {
    defaults['env'] = DEFAULT_ENTITIES.env;
  }

  // Default time duration for logs
  if (intent === 'logs' && !defaults['since']) {
    defaults['since'] = DEFAULT_ENTITIES.since;
  }

  // Default log level
  if (intent === 'logs' && !defaults['level']) {
    defaults['level'] = DEFAULT_ENTITIES.level;
  }

  // Default strategy for deploys
  if (intent === 'deploy' && !defaults['strategy']) {
    defaults['strategy'] = DEFAULT_ENTITIES.strategy;
  }

  return defaults as ExtractedEntitiesType;
}

/**
 * Determine risk level based on intent and entities
 */
function determineRisk(intent: IntentType, entities: ExtractedEntitiesType): RiskLevelType {
  // Production environment = high risk
  if (entities.env === 'production') {
    return RISK_LEVELS['production'] || 'high';
  }

  // Rollback = high risk
  if (intent === 'rollback') {
    return RISK_LEVELS['rollback'] || 'high';
  }

  // Scaling = moderate risk
  if (intent === 'scale') {
    return RISK_LEVELS['scale'] || 'moderate';
  }

  // Set env = moderate risk
  if (intent === 'set-env') {
    return RISK_LEVELS['set-env'] || 'moderate';
  }

  // Staging environment = moderate risk
  if (entities.env === 'staging') {
    return RISK_LEVELS['staging'] || 'moderate';
  }

  // Development environment = low risk
  if (entities.env === 'development') {
    return RISK_LEVELS['development'] || 'low';
  }

  // Read-only operations = low risk
  if (['status', 'logs', 'cost', 'analyze', 'recommend'].includes(intent)) {
    return 'low';
  }

  return 'moderate';
}

/**
 * Generate confirmation prompt for risky operations
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

/**
 * Generate CLI command from intent and entities
 */
function generateCLICommand(intent: IntentType, entities: ExtractedEntitiesType): string {
  const parts = ['aios'];

  switch (intent) {
    case 'deploy':
      parts.push('cloud', 'deploy');
      if (entities.env) parts.push('--env', entities.env);
      if (entities.service) parts.push('--service', entities.service);
      if (entities.strategy) parts.push('--strategy', entities.strategy);
      if (entities.region) parts.push('--region', entities.region);
      break;

    case 'status':
      parts.push('cloud', 'status');
      if (entities.env) parts.push('--env', entities.env);
      if (entities.service) parts.push('--service', entities.service);
      break;

    case 'logs':
      parts.push('cloud', 'logs');
      if (entities.service) parts.push('--service', entities.service);
      if (entities.since) parts.push('--since', entities.since);
      if (entities.level) parts.push('--level', entities.level);
      if (entities.env) parts.push('--env', entities.env);
      break;

    case 'rollback':
      parts.push('cloud', 'rollback');
      if (entities.env) parts.push('--env', entities.env);
      if (entities.service) parts.push('--service', entities.service);
      break;

    case 'scale':
      parts.push('runtime', 'scale');
      if (entities.service) parts.push('--service', entities.service);
      if (entities.env) parts.push('--env', entities.env);
      if (entities.replicas) parts.push('--replicas', entities.replicas.toString());
      break;

    case 'connect':
      parts.push('cloud', 'connect');
      if (entities.provider) parts.push('--provider', entities.provider);
      if (entities.region) parts.push('--region', entities.region);
      break;

    case 'adopt':
      parts.push('adopt');
      if (entities.provider) parts.push('--provider', entities.provider);
      parts.push('--read-only');
      break;

    case 'cost':
      parts.push('cloud', 'cost');
      if (entities.env) parts.push('--env', entities.env);
      if (entities.service) parts.push('--service', entities.service);
      break;

    case 'analyze':
      parts.push('cloud', 'analyze');
      break;

    case 'recommend':
      parts.push('cloud', 'recommend');
      break;

    case 'reconfigure':
      parts.push('reconfigure');
      break;

    case 'help':
      parts.push('--help');
      break;

    default:
      return 'aios --help';
  }

  return parts.join(' ');
}

/**
 * Generate clarifying question if entities are missing
 */
function generateClarifyingQuestion(intent: IntentType, entities: ExtractedEntitiesType): string | undefined {
  const missing: string[] = [];

  // Deploy: service name is optional (deploys current directory)
  // Only environment is truly required, but we default it to staging
  if (intent === 'deploy') {
    // No required fields - we have defaults for everything
  }

  if (intent === 'logs') {
    if (!entities.service) missing.push('service name');
  }

  if (intent === 'scale') {
    if (!entities.service) missing.push('service name');
    if (!entities.replicas) missing.push('number of replicas');
  }

  if (intent === 'rollback') {
    if (!entities.service) missing.push('service name');
    if (!entities.env) missing.push('environment');
  }

  if (intent === 'connect') {
    if (!entities.provider) missing.push('cloud provider');
  }

  if (missing.length > 0) {
    return `Please specify: ${missing.join(', ')}`;
  }

  return undefined;
}

/**
 * Generate helpful notes about defaults and assumptions
 */
function generateNotes(intent: IntentType, entities: ExtractedEntitiesType): string {
  const notes: string[] = [];

  if (intent === 'deploy' && !entities.env) {
    notes.push(`env=${DEFAULT_ENTITIES.env} (default)`);
  }

  if (intent === 'logs' && !entities.since) {
    notes.push(`since=${DEFAULT_ENTITIES.since} (default)`);
  }

  if (intent === 'logs' && !entities.level) {
    notes.push(`level=${DEFAULT_ENTITIES.level} (default)`);
  }

  if (intent === 'deploy' && !entities.strategy) {
    notes.push(`strategy=${DEFAULT_ENTITIES.strategy} (default)`);
  }

  return notes.length > 0 ? `Defaults: ${notes.join(', ')}` : '';
}
