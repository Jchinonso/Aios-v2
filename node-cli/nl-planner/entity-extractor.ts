/**
 * @fileoverview Entity Extractor - Extract entities from NL utterances
 * @description Extracts service, env, time, etc. from user input
 * @module node-cli/nl-planner/entity-extractor
 */

import type { ExtractedEntitiesType, IntentType, LogLevelType, DeploymentStrategyType } from './types.js';
import type { CloudProviderType } from '@aios/shared';
import { SUPPORTED_PROVIDERS } from '@aios/shared';

/**
 * Extract entities from natural language utterance
 *
 * @param utterance - User's natural language input
 * @param intent - Detected intent
 * @returns Extracted entities
 */
export function extractEntities(utterance: string, intent: IntentType): ExtractedEntitiesType {
  const normalized = utterance.trim().toLowerCase();
  const entities: Record<string, unknown> = {};

  // Extract environment
  const env = extractEnvironment(normalized);
  if (env) {
    entities['env'] = env;
  }

  // Extract service name
  const service = extractService(normalized, intent);
  if (service) {
    entities['service'] = service;
  }

  // Extract cloud provider
  const provider = extractProvider(normalized);
  if (provider) {
    entities['provider'] = provider;
  }

  // Extract region
  const region = extractRegion(normalized);
  if (region) {
    entities['region'] = region;
  }

  // Extract time duration (for logs, monitoring)
  const since = extractTimeDuration(normalized);
  if (since) {
    entities['since'] = since;
  }

  // Extract log level
  const level = extractLogLevel(normalized);
  if (level) {
    entities['level'] = level;
  }

  // Extract replicas (for scaling)
  const replicas = extractReplicas(normalized);
  if (replicas !== undefined) {
    entities['replicas'] = replicas;
  }

  // Extract deployment strategy
  const strategy = extractStrategy(normalized);
  if (strategy) {
    entities['strategy'] = strategy;
  }

  // Extract percentage (for canary deployments)
  const percent = extractPercentage(normalized);
  if (percent !== undefined) {
    entities['percent'] = percent;
  }

  return entities as ExtractedEntitiesType;
}

/**
 * Extract environment from utterance
 */
function extractEnvironment(utterance: string): 'development' | 'staging' | 'production' | 'preview' | undefined {
  const envPatterns: Record<string, 'development' | 'staging' | 'production' | 'preview'> = {
    production: 'production',
    prod: 'production',
    staging: 'staging',
    stage: 'staging',
    development: 'development',
    dev: 'development',
    preview: 'preview'
  };

  for (const [keyword, env] of Object.entries(envPatterns)) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(utterance)) {
      return env;
    }
  }

  return undefined;
}

/**
 * Extract service name from utterance
 */
function extractService(utterance: string, intent: IntentType): string | undefined {
  // Common service name patterns
  const servicePatterns = [
    /(?:deploy|rollback|scale|logs?)\s+(?:the\s+)?([a-z0-9-]+)/i,
    /([a-z0-9-]+)\s+(?:to|in|on)\s+(?:staging|production|development)/i,
    /(?:for|of)\s+([a-z0-9-]+)/i,
    /([a-z0-9-]+)\s+(?:service|app|application)/i
  ];

  for (const pattern of servicePatterns) {
    const match = utterance.match(pattern);
    const captured = match?.[1];
    if (captured) {
      const candidate = captured.toLowerCase();
      // Filter out common words that aren't service names
      const excludedWords = [
        'the', 'to', 'from', 'in', 'on', 'at', 'by', 'for', 'of', 'with',
        'is', 'are', 'was', 'were', 'this', 'that', 'my', 'our', 'app',
        'application', 'project', 'service', 'code', 'site', 'website'
      ];
      if (!excludedWords.includes(candidate)) {
        return candidate;
      }
    }
  }

  // Intent-specific extraction
  if (intent === 'logs') {
    const match = utterance.match(/(?:show|get|view)\s+(?:me\s+)?(?:the\s+)?([a-z0-9-]+)/i);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  return undefined;
}

/**
 * Extract cloud provider from utterance
 */
function extractProvider(utterance: string): CloudProviderType | undefined {
  for (const provider of SUPPORTED_PROVIDERS) {
    if (new RegExp(`\\b${provider}\\b`, 'i').test(utterance)) {
      return provider;
    }
  }
  return undefined;
}

/**
 * Extract region from utterance
 */
function extractRegion(utterance: string): string | undefined {
  // Common region patterns
  const regionPatterns = [
    /(?:region|in)\s+(us-[a-z]+-\d+|eu-[a-z]+-\d+|ap-[a-z]+-\d+)/i,
    /(us-east-\d+|us-west-\d+|eu-west-\d+|eu-central-\d+|ap-southeast-\d+)/i
  ];

  for (const pattern of regionPatterns) {
    const match = utterance.match(pattern);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  return undefined;
}

/**
 * Extract time duration from utterance
 */
function extractTimeDuration(utterance: string): string | undefined {
  // Time duration patterns (e.g., "last 15 minutes", "15m", "1 hour")
  const patterns = [
    /(?:last|past)\s+(\d+)\s*(m|min|mins|minutes?|h|hr|hrs|hours?|d|days?)/i,
    /(\d+)\s*(m|min|mins|minutes?|h|hr|hrs|hours?|d|days?)\b/i,
    /since\s+(\d+)\s*(m|min|mins|minutes?|h|hr|hrs|hours?|d|days?)/i
  ];

  for (const pattern of patterns) {
    const match = utterance.match(pattern);
    if (match && match[1] && match[2]) {
      const value = match[1];
      const unit = match[2][0]; // First character (m, h, d)
      return `${value}${unit}`;
    }
  }

  return undefined;
}

/**
 * Extract log level from utterance
 */
function extractLogLevel(utterance: string): LogLevelType | undefined {
  const levels: Record<string, LogLevelType> = {
    error: 'error',
    errors: 'error',
    warn: 'warn',
    warning: 'warn',
    warnings: 'warn',
    info: 'info',
    debug: 'debug'
  };

  for (const [keyword, level] of Object.entries(levels)) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(utterance)) {
      return level;
    }
  }

  return undefined;
}

/**
 * Extract number of replicas from utterance
 */
function extractReplicas(utterance: string): number | undefined {
  const patterns = [
    /scale\s+(?:to\s+)?(\d+)/i,
    /(\d+)\s+(?:replicas?|instances?)/i,
    /(?:to|=)\s+(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = utterance.match(pattern);
    if (match?.[1]) {
      const replicas = parseInt(match[1], 10);
      if (!isNaN(replicas) && replicas > 0 && replicas <= 1000) {
        return replicas;
      }
    }
  }

  return undefined;
}

/**
 * Extract deployment strategy from utterance
 */
function extractStrategy(utterance: string): DeploymentStrategyType | undefined {
  if (/canary/i.test(utterance)) {
    return 'canary';
  }
  if (/blue[-\s]?green/i.test(utterance)) {
    return 'blue-green';
  }
  if (/instant|immediate|direct/i.test(utterance)) {
    return 'instant';
  }
  return undefined;
}

/**
 * Extract percentage from utterance
 */
function extractPercentage(utterance: string): number | undefined {
  const patterns = [
    /(\d+)\s*%/,
    /(\d+)\s+percent/i
  ];

  for (const pattern of patterns) {
    const match = utterance.match(pattern);
    if (match?.[1]) {
      const percent = parseInt(match[1], 10);
      if (!isNaN(percent) && percent >= 0 && percent <= 100) {
        return percent;
      }
    }
  }

  return undefined;
}
