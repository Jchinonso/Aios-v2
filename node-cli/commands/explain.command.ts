/**
 * @fileoverview Explain Command - Phase 3
 * @description User asks "why?" to understand AI decisions
 * @module node-cli/commands
 *
 * Purpose:
 * - Explain last action taken
 * - Answer specific questions ("why vercel?", "why not aws?")
 * - Show alternatives that were considered
 * - Display decision factors and risks
 *
 * Usage Examples:
 * - aios explain
 * - aios explain --action <action-id>
 * - User: "why?" (in conversation mode)
 * - User: "why vercel?" (specific question)
 * - User: "why not aws?" (alternative question)
 */

import chalk from 'chalk';
import ora from 'ora';
import type { ILogger } from '@aios/shared';
import type { ActionReasoningTracker } from '../services/action-reasoning-tracker.js';
import type { ExplainRequest, ExplainResponse } from '../services/action-reasoning.types.js';
import { ConsoleFormatter } from '../utils/console-formatter.js';

/**
 * Explain command options
 */
export interface ExplainOptionsType {
  readonly action?: string; // Specific action ID to explain
  readonly question?: string; // Specific question like "why vercel?"
  readonly verbose?: boolean; // Show detailed factors
  readonly json?: boolean; // Output as JSON
}

/**
 * Execute explain command
 *
 * @param options - Command options
 * @param tracker - Action reasoning tracker
 * @param logger - Logger instance
 *
 * @example
 * ```typescript
 * // CLI usage
 * await executeExplain({ action: 'uuid-123' }, tracker, logger);
 *
 * // Conversational usage
 * await executeExplain({ question: 'why vercel?' }, tracker, logger);
 * ```
 */
export async function executeExplain(
  options: ExplainOptionsType,
  tracker: ActionReasoningTracker,
  logger: ILogger
): Promise<void> {
  const spinner = ora('Retrieving explanation...').start();

  try {
    // Build explain request
    const hasTarget = options.action || options.question;
    const request: ExplainRequest = {
      type: options.question ? 'specific' : 'general',
      ...(hasTarget ? {
        target: {
          ...(options.action ? { actionId: options.action } : {}),
          ...(options.question ? { question: options.question } : {}),
        },
      } : {}),
    };

    // Get explanation
    const explanation = await tracker.explain(request);
    spinner.stop();

    // Output based on format
    if (options.json) {
      console.log(JSON.stringify(explanation, null, 2));
      return;
    }

    // Format human-readable output
    displayExplanation(explanation, options);

    logger.debug('Explanation displayed', {
      actionId: explanation.actionId,
      hasRisks: !!explanation.risks,
      alternativeCount: explanation.reasoning.alternatives.length,
    });
  } catch (error) {
    spinner.fail('Failed to generate explanation');

    if (error instanceof Error) {
      if (error.message.includes('No actions to explain')) {
        console.log(chalk.yellow('\n⚠️  No recent actions to explain'));
        console.log(chalk.dim('Deploy something first, then ask me why!\n'));
      } else if (error.message.includes('Action not found')) {
        console.log(chalk.red(`\n❌ Action not found: ${options.action}\n`));
      } else {
        console.log(chalk.red(`\n❌ ${error.message}\n`));
      }
    }

    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    logger.error('Explain command failed', errorDetails as any);

    throw error;
  }
}

/**
 * Display explanation in human-readable format
 */
function displayExplanation(
  explanation: ExplainResponse,
  options: ExplainOptionsType
): void {
  console.log(); // Blank line

  // Header
  console.log(chalk.bold.cyan('🔍 Decision Explanation'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log();

  // User input context
  console.log(chalk.bold('Your request:'));
  console.log(chalk.white(`  "${explanation.metadata.userInput}"`));
  console.log();

  // Main summary
  console.log(chalk.bold('Decision made:'));
  console.log(
    chalk.green(
      `  ✓ ${explanation.reasoning.chosen.value} ${chalk.dim('(chosen)')}`
    )
  );
  console.log();

  // Primary reasons
  if (explanation.reasoning.chosen.reasons.length > 0) {
    console.log(chalk.bold('Why I chose this:'));
    explanation.reasoning.chosen.reasons.forEach((reason, index) => {
      const bullet = index === 0 ? '→' : ' ';
      console.log(chalk.white(`  ${bullet} ${reason}`));
    });
    console.log();
  }

  // Decision factors (if verbose)
  if (options.verbose && explanation.reasoning.factors.length > 0) {
    console.log(chalk.bold('Decision factors:'));
    explanation.reasoning.factors.forEach((factor) => {
      const icon = getFactorIcon(factor.type);
      const color = getFactorColor(factor.type);
      console.log(
        color(
          `  ${icon} ${factor.description} ${chalk.dim(`(weight: ${factor.weight})`)}`
        )
      );
    });
    console.log();
  }

  // Alternatives considered
  if (explanation.reasoning.alternatives.length > 0) {
    console.log(chalk.bold('Alternatives I considered:'));
    console.log();

    explanation.reasoning.alternatives.forEach((alt, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${alt.label}`));
      console.log(chalk.dim(`     Why not chosen: ${alt.whyNotChosen}`));

      if (alt.pros.length > 0) {
        console.log(chalk.dim('     Pros:'));
        alt.pros.slice(0, 2).forEach((pro) => {
          console.log(chalk.green(`       ✓ ${pro}`));
        });
      }

      if (alt.cons.length > 0) {
        console.log(chalk.dim('     Cons:'));
        alt.cons.slice(0, 2).forEach((con) => {
          console.log(chalk.red(`       ✗ ${con}`));
        });
      }

      console.log(); // Spacing between alternatives
    });
  }

  // Risks (if present)
  if (explanation.risks && explanation.risks.length > 0) {
    console.log(chalk.bold.red('⚠️  Risks identified:'));
    explanation.risks.forEach((risk) => {
      const icon = getRiskIcon(risk.level);
      console.log(chalk.yellow(`  ${icon} ${risk.description}`));
      if (risk.mitigation) {
        console.log(chalk.dim(`     Mitigation: ${risk.mitigation}`));
      }
    });
    console.log();
  }

  // Footer
  console.log(chalk.dim('─'.repeat(60)));
  console.log(
    chalk.dim(
      `Action ID: ${explanation.actionId} | Time: ${formatTimestamp(explanation.metadata.timestamp)}`
    )
  );
  console.log();

  // Helpful tip
  console.log(
    chalk.dim(
      '💡 Tip: Ask specific questions like "why vercel?" or "why not aws?"'
    )
  );
  console.log();
}

/**
 * Get icon for decision factor type
 */
function getFactorIcon(type: 'positive' | 'negative' | 'neutral'): string {
  const icons = {
    positive: '✓',
    negative: '✗',
    neutral: '•',
  };
  return icons[type];
}

/**
 * Get color function for decision factor type
 */
function getFactorColor(
  type: 'positive' | 'negative' | 'neutral'
): (text: string) => string {
  const colors = {
    positive: chalk.green,
    negative: chalk.red,
    neutral: chalk.white,
  };
  return colors[type];
}

/**
 * Get icon for risk level
 */
function getRiskIcon(level: 'low' | 'moderate' | 'high' | 'destructive'): string {
  const icons = {
    low: '⚠️ ',
    moderate: '⚠️ ',
    high: '🔴',
    destructive: '💥',
  };
  return icons[level];
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;

  return date.toLocaleString();
}

/**
 * Parse natural language explain query
 *
 * Extracts intent from conversational input:
 * - "why?" → general explanation
 * - "why vercel?" → specific question about vercel
 * - "why not aws?" → alternative question about aws
 *
 * @param input - User input
 * @returns Parsed explain options
 */
export function parseExplainQuery(input: string): ExplainOptionsType {
  const normalized = input.toLowerCase().trim();

  // Generic "why?" or "explain"
  if (normalized === 'why?' || normalized === 'why' || normalized === 'explain') {
    return {};
  }

  // Specific question: "why vercel?", "why not aws?", etc.
  const whyMatch = normalized.match(/why\s+(.+)/);
  if (whyMatch?.[1]) {
    return { question: whyMatch[1] };
  }

  // Default: general explanation
  return {};
}
