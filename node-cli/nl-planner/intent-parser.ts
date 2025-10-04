/**
 * @fileoverview Intent Parser - Rule-based NL → Intent mapping
 * @description Parses natural language to extract user intent
 * @module node-cli/nl-planner/intent-parser
 */

import type { IntentType, IntentPatternType } from './types.js';

/**
 * Intent patterns with priority ordering
 */
const INTENT_PATTERNS: readonly IntentPatternType[] = [
  // Deploy patterns (highest priority for specificity)
  {
    intent: 'deploy',
    patterns: [
      /deploy\s+(?:the\s+)?(.+?)\s+to\s+(.+)/i,
      /push\s+(?:the\s+)?(.+?)\s+to\s+(.+)/i,
      /ship\s+(?:the\s+)?(.+?)\s+to\s+(.+)/i,
      /release\s+(?:the\s+)?(.+?)\s+to\s+(.+)/i,
      /deploy\s+to\s+(.+)/i,
      /^deploy/i
    ],
    priority: 100
  },

  // Rollback patterns
  {
    intent: 'rollback',
    patterns: [
      /rollback\s+(.+?)\s+(?:in|to)\s+(.+)/i,
      /revert\s+(.+?)\s+(?:in|to)\s+(.+)/i,
      /undo\s+(?:the\s+)?(?:deployment|release)\s+(?:of\s+)?(.+)/i,
      /rollback/i
    ],
    priority: 95
  },

  // Logs patterns
  {
    intent: 'logs',
    patterns: [
      /(?:show|get|view|display)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+logs/i,
      /logs?\s+(?:for\s+)?(.+)/i,
      /(?:show|get)\s+(?:me\s+)?errors?\s+(?:for\s+)?(.+)/i,
      /what(?:'s|\s+is)\s+(?:going\s+on|happening)\s+(?:with|in)\s+(.+)/i
    ],
    priority: 90
  },

  // Status patterns
  {
    intent: 'status',
    patterns: [
      /(?:what(?:'s|\s+is)|show|get)\s+(?:the\s+)?status\s+(?:of\s+)?(.+)/i,
      /(?:how(?:'s|\s+is)|check)\s+(.+?)\s+(?:doing|running)/i,
      /is\s+(.+?)\s+(?:up|running|healthy)/i,
      /status/i
    ],
    priority: 85
  },

  // Scale patterns
  {
    intent: 'scale',
    patterns: [
      /scale\s+(.+?)\s+to\s+(\d+)/i,
      /(?:increase|decrease)\s+(?:the\s+)?(?:replicas|instances)\s+(?:of\s+)?(.+)/i,
      /scale\s+(.+)/i
    ],
    priority: 87
  },

  // Set environment variable patterns
  {
    intent: 'set-env',
    patterns: [
      /set\s+(?:env|environment|variable)\s+(.+?)\s+(?:to|=)\s+(.+)/i,
      /(?:add|update)\s+(?:env|environment|variable)\s+(.+)/i,
      /env\s+set/i
    ],
    priority: 86
  },

  // Connect/Adopt patterns
  {
    intent: 'connect',
    patterns: [
      /connect\s+(?:to\s+)?(.+)/i,
      /link\s+(?:to\s+)?(.+)/i,
      /add\s+(?:a\s+)?provider\s+(.+)/i
    ],
    priority: 84
  },
  {
    intent: 'adopt',
    patterns: [
      /adopt\s+(?:existing\s+)?(.+)/i,
      /import\s+(?:from\s+)?(.+)/i,
      /manage\s+existing\s+(.+)/i
    ],
    priority: 83
  },

  // Cost patterns
  {
    intent: 'cost',
    patterns: [
      /(?:how\s+much|what(?:'s|\s+is))\s+(?:the\s+)?cost/i,
      /show\s+(?:me\s+)?(?:the\s+)?(?:costs|spending|expenses)/i,
      /cost\s+(?:estimate|breakdown)/i,
      /how\s+much\s+does\s+(?:this|it)\s+cost/i,
      /(?:what(?:'s|\s+is)\s+the\s+)?price/i
    ],
    priority: 82
  },

  // Analyze patterns
  {
    intent: 'analyze',
    patterns: [
      /analyze\s+(?:the\s+)?(?:project|code|application)/i,
      /what\s+(?:kind|type)\s+of\s+(?:project|app|application)\s+is\s+this/i,
      /detect\s+(?:the\s+)?(?:framework|stack)/i
    ],
    priority: 81
  },

  // Recommend patterns
  {
    intent: 'recommend',
    patterns: [
      /recommend\s+(?:a\s+)?(?:provider|deployment)/i,
      /(?:what|which)\s+(?:provider|platform)\s+should\s+I\s+use/i,
      /suggest\s+(?:a\s+)?(?:provider|deployment)/i,
      /best\s+(?:provider|platform)\s+for/i
    ],
    priority: 80
  },

  // Reconfigure patterns
  {
    intent: 'reconfigure',
    patterns: [
      /^reconfigure$/i,
      /reset\s+(?:config|setup)/i,
      /change\s+(?:setup|mode|configuration)/i,
      /switch\s+(?:to\s+)?(?:git|local|cloud)\s+mode/i,
      /start\s+over/i,
      /use\s+(?:different|another)\s+(?:provider|mode)/i
    ],
    priority: 85
  },

  // Help patterns (lowest priority - catch-all)
  {
    intent: 'help',
    patterns: [
      /^help$/i,
      /what\s+can\s+(?:you|I)\s+do/i,
      /how\s+do\s+I/i,
      /show\s+(?:me\s+)?(?:commands|examples)/i
    ],
    priority: 10
  }
];

/**
 * Parse natural language utterance to extract intent
 *
 * @param utterance - User's natural language input
 * @returns Detected intent type
 */
export function parseIntent(utterance: string): IntentType {
  if (!utterance || utterance.trim().length === 0) {
    return 'unknown';
  }

  const normalized = utterance.trim();

  // Sort by priority (highest first) and try to match
  const sortedPatterns = [...INTENT_PATTERNS].sort((a, b) => b.priority - a.priority);

  for (const { intent, patterns } of sortedPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return intent;
      }
    }
  }

  return 'unknown';
}

/**
 * Get confidence score for parsed intent (0-1)
 *
 * @param utterance - User's natural language input
 * @param intent - Detected intent
 * @returns Confidence score
 */
export function getIntentConfidence(utterance: string, intent: IntentType): number {
  if (intent === 'unknown') {
    return 0.0;
  }

  const normalized = utterance.trim().toLowerCase();
  const patternGroup = INTENT_PATTERNS.find((p) => p.intent === intent);

  if (!patternGroup) {
    return 0.5;
  }

  // Check for exact keyword matches (higher confidence)
  const exactKeywords: Record<IntentType, readonly string[]> = {
    deploy: ['deploy', 'push', 'ship', 'release'],
    status: ['status', 'health', 'check'],
    'deployment-history': ['deployment', 'history', 'deployed', 'deployments'],
    logs: ['logs', 'errors', 'warnings'],
    rollback: ['rollback', 'revert', 'undo'],
    scale: ['scale', 'replicas', 'instances'],
    'set-env': ['env', 'environment', 'variable'],
    connect: ['connect', 'link', 'add provider'],
    adopt: ['adopt', 'import', 'manage existing'],
    cost: ['cost', 'spending', 'expenses'],
    analyze: ['analyze', 'detect', 'framework'],
    recommend: ['recommend', 'suggest', 'best provider'],
    reconfigure: ['reconfigure', 'reset', 'change setup', 'switch mode'],
    help: ['help', 'how', 'what can'],
    unknown: []
  };

  const keywords = exactKeywords[intent] || [];
  const hasExactKeyword = keywords.some((keyword) => normalized.includes(keyword));

  if (hasExactKeyword) {
    return 0.9;
  }

  // Has pattern match but no exact keyword
  return 0.7;
}

/**
 * Check if utterance needs clarification
 *
 * @param utterance - User's natural language input
 * @param intent - Detected intent
 * @returns True if clarification is needed
 */
export function needsClarification(utterance: string, intent: IntentType): boolean {
  if (intent === 'unknown') {
    return true;
  }

  const normalized = utterance.trim().toLowerCase();

  // Deploy is OK without environment (defaults to staging)
  // Only require clarification if it's too vague (e.g., just "deploy" alone)
  if (intent === 'deploy') {
    const tooVague = normalized === 'deploy' || normalized === 'deploy it';
    return tooVague;
  }

  // Logs without specifying service
  if (intent === 'logs' && !/logs?\s+(?:for\s+)?[\w-]+/.test(normalized)) {
    return true;
  }

  // Scale without specifying replicas
  if (intent === 'scale' && !/to\s+\d+/.test(normalized)) {
    return true;
  }

  return false;
}
