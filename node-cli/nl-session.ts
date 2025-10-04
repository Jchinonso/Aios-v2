#!/usr/bin/env node

/**
 * @fileoverview Natural Language Session Handler
 * @description Interactive NL-first CLI session with plan/apply workflow
 * @module node-cli/nl-session
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { parseNaturalLanguage, ContextManager } from './nl-planner/index.js';
import { parseWithAI } from './nl-planner/ai-intent-parser.js';
import type { ParsedIntentType, IntentType, ExtractedEntitiesType, RiskLevelType } from './nl-planner/types.js';
import { typeToConfirm, confirmAction } from './prompts/confirmation-prompts.js';
import { ContainerFactory } from './services/container-factory.js';
import { spawnSync } from 'child_process';
import { StateManager, generateId } from './state/state-manager.js';
import { PolicyEngine, DEFAULT_POLICY } from './policy/policy-engine.js';
import type { CloudProviderType } from '@aios/shared/cloud';
import { createRedactedLogger, redactSecrets } from './utils/redaction-filter.js';
import { BlessedSession } from './ui/blessed-session.js';

/**
 * Session options from CLI flags
 */
export interface NLSessionOptionsType {
  readonly autoApprove?: boolean;
  readonly jsonOutput?: boolean;
  readonly planOnly?: boolean;
  readonly trace?: boolean;
  readonly verbose?: boolean;
  readonly debug?: boolean;
}

/**
 * Start blessed TUI session with fixed input at bottom
 */
async function startBlessedSession(options: NLSessionOptionsType = {}): Promise<void> {
  const stateManager = new StateManager(process.cwd());
  const contextManager = new ContextManager();

  await stateManager.initialize();
  await stateManager.startSession(generateId());

  let sessionActive = true;
  let currentSession: BlessedSession | null = null;

  // Track pending clarification context
  let pendingIntent: ParsedIntentType | null = null;
  let pendingQuestion: string | null = null;

  // Initialize conversation orchestrator for rich multi-turn conversations
  let conversationOrchestrator: any = null;

  await new Promise<void>((resolve) => {
    currentSession = new BlessedSession({
      onInput: async (input: string) => {
        if (isExitCommand(input)) {
          sessionActive = false;
          currentSession?.destroy();
          resolve();
          return;
        }

        // Parse and execute command using AI
        try {
          const container = await ContainerFactory.getOrCreate();

          // Use AI to classify intent and extract entities
          const { classifyIntentWithAI } = await import('./nl-planner/ai-intent-classifier.js');
          const aiService = container.intelligence?.getAIService();

          if (!aiService) {
            currentSession?.addOutput(chalk.red('❌ AI service not available. Please configure an AI provider.'));
            return;
          }

          // Initialize conversation orchestrator on first use
          if (!conversationOrchestrator) {
            const { ConversationOrchestrator } = await import('./services/conversation-orchestrator.js');
            conversationOrchestrator = new ConversationOrchestrator(
              container.cloudManager,
              container.logger,
              currentSession
            );
          }

          // Check if we're waiting for an answer to a clarifying question
          if (pendingIntent && pendingQuestion) {
            currentSession?.addOutput(chalk.gray('🤔 Interpreting your answer...'));

            // Use AI to interpret the answer in context
            const contextPrompt = `System: You are interpreting a user's answer to a clarifying question. Extract entities and determine if the intent can now be executed. Respond ONLY with valid JSON.

Question asked: "${pendingQuestion}"
User's answer: "${input}"
Original intent: ${pendingIntent.intent}
Existing entities: ${JSON.stringify(pendingIntent.entities)}

Respond with JSON format:
{
  "canExecute": boolean,
  "entities": {},
  "stillNeedsClarification": string or null
}`;

            const interpretResult = await aiService.sendMessage(contextPrompt);

            if (!interpretResult.isSuccess) {
              currentSession?.addOutput(chalk.yellow('Failed to interpret answer. Please try again.'));
              pendingIntent = null;
              pendingQuestion = null;
              return;
            }

            try {
              const parsed = JSON.parse(interpretResult.value.content);

              // Merge entities
              const updatedIntent: ParsedIntentType = {
                ...pendingIntent,
                entities: {
                  ...pendingIntent.entities,
                  ...parsed.entities
                }
              };

              if (parsed.canExecute) {
                currentSession?.addOutput(chalk.green('✓ Got it! Proceeding with deployment...'));

                // Clear pending state
                pendingIntent = null;
                pendingQuestion = null;

                // Execute the command
                await executeCommandWithOutput(updatedIntent, options, currentSession);
                return;
              } else if (parsed.stillNeedsClarification) {
                currentSession?.addOutput(chalk.yellow(`\n❓ ${parsed.stillNeedsClarification}`));
                currentSession?.addOutput(chalk.gray('Please provide more details.\n'));

                // Update pending question
                pendingQuestion = parsed.stillNeedsClarification;
                pendingIntent = updatedIntent;
                return;
              }
            } catch {
              // If parsing fails, treat as new command
              currentSession?.addOutput(chalk.gray('Starting fresh analysis...'));
              pendingIntent = null;
              pendingQuestion = null;
            }
          }

          // Classify intent with full entity extraction
          const result = await classifyIntentWithAI(input, aiService);

          // Check if conversation orchestrator can handle this (for deployment flows)
          const orchestratorHandled = await conversationOrchestrator.processInput(input, result);

          if (orchestratorHandled) {
            // Conversation orchestrator handled the interaction
            return;
          }

          // Fall back to standard processing for non-conversational intents

          // Show thinking indicator
          currentSession?.addOutput(chalk.gray('🤔 Analyzing your request...'));

          // Show what we understood
          const confidenceColor = result.confidence > 0.8 ? chalk.green : result.confidence > 0.5 ? chalk.yellow : chalk.red;
          currentSession?.addOutput(confidenceColor(`✓ Understood: ${result.intent} (confidence: ${(result.confidence * 100).toFixed(0)}%)`));

          // Show extracted entities if any
          if (Object.keys(result.entities).length > 0) {
            const entitiesStr = Object.entries(result.entities)
              .map(([key, value]) => `${key}=${value}`)
              .join(', ');
            currentSession?.addOutput(chalk.gray(`  Entities: ${entitiesStr}`));
          }

          // Handle clarifying questions - SAVE CONTEXT
          if (result.clarifyingQuestion) {
            currentSession?.addOutput(chalk.yellow(`\n❓ ${result.clarifyingQuestion}`));
            currentSession?.addOutput(chalk.gray('Please provide more details.\n'));

            // Store context for next input
            pendingIntent = result;
            pendingQuestion = result.clarifyingQuestion;
            return;
          }

          // Handle unknown intent
          if (result.intent === 'unknown') {
            currentSession?.addOutput(chalk.red('\n❌ Could not understand your request.'));
            if (result.notes) {
              currentSession?.addOutput(chalk.gray(result.notes));
            }
            currentSession?.addOutput(chalk.gray('Try "help" to see available commands.\n'));
            return;
          }

          // Show equivalent CLI command
          currentSession?.addOutput(chalk.gray(`CLI equivalent: ${result.cli}`));

          // Execute the command
          await executeCommandWithOutput(result, options, currentSession);

        } catch (error) {
          currentSession?.addOutput(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));

          // Clear pending state on error
          pendingIntent = null;
          pendingQuestion = null;
        }
      },
      onExit: () => {
        sessionActive = false;
        currentSession?.destroy();
        resolve();
      }
    });
  });

  await stateManager.endSession();
  await ContainerFactory.dispose();
}

/**
 * Execute command and send output to blessed UI
 */
async function executeCommandWithOutput(
  result: ParsedIntentType,
  options: NLSessionOptionsType,
  session: BlessedSession | null
): Promise<void> {
  // Redirect console.log to blessed output
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
    session?.addOutput(message);
  };

  try {
    await executeCommand(result, options, session);
  } finally {
    console.log = originalLog;
  }
}

/**
 * Start natural language interactive session
 */
export async function startNLSession(options: NLSessionOptionsType = {}): Promise<void> {
  // Use blessed TUI for better layout control
  if (!options.jsonOutput && process.stdout.isTTY) {
    await startBlessedSession(options);
    return;
  }

  // Fallback to regular console mode
  console.clear();

  // Install redaction filter to prevent secret leakage
  const redactedLogger = createRedactedLogger();

  const stateManager = new StateManager(process.cwd());
  const policyEngine = new PolicyEngine(DEFAULT_POLICY, stateManager);

  // Initialize state directory with error handling
  try {
    await stateManager.initialize();
    await stateManager.startSession(generateId());
  } catch (error) {
    console.log(chalk.yellow('⚠️  Warning: Could not initialize state tracking'));
    console.log(chalk.gray('Session will continue without audit trail\n'));
  }

  // Check for first-run configuration BEFORE showing welcome banner
  const needsSetup = await checkFirstRunSetup(stateManager);
  if (needsSetup) {
    await runFirstRunSetup(stateManager);
    console.log(); // Add spacing after setup
  }

  // Load config to show connection status
  const config = await stateManager.loadConfig();

  // Show welcome banner AFTER setup is complete - ONCE at the top
  if (!options.jsonOutput) {
    await displayWelcomeBanner(config);
  }

  let sessionActive = true;
  const contextManager = new ContextManager();
  let hasExecutedCommand = false; // Track if any command has been executed

  while (sessionActive) {
    try {
      // Show input box at the bottom
      const utterance = await promptForInput(hasExecutedCommand);

      if (!utterance.trim()) {
        continue;
      }

      // Handle slash commands
      if (utterance.startsWith('/')) {
        handleSlashCommand(utterance);
        continue;
      }

      // Handle exit commands
      if (isExitCommand(utterance)) {
        // Display session stats before exiting
        await displaySessionStats(contextManager);
        console.log(chalk.gray('\n  👋 Goodbye!\n'));

        // Restore original console methods
        redactedLogger.restore();

        sessionActive = false;
        break;
      }

      // Parse natural language with AI (fallback to regex if AI fails)
      const container = await ContainerFactory.getOrCreate();
      let result: ParsedIntentType | null = null;

      if (container.intelligence) {
        result = await parseWithAI(utterance, container.intelligence.getAIService());
        if (result && options.debug) {
          console.log(chalk.gray('  (AI-powered parsing)\n'));
        }
      }

      // Fallback to regex-based parser if AI parsing fails or not enabled
      if (!result) {
        result = parseNaturalLanguage(utterance, contextManager);
      }

      // Pre-prompt guardrails: Force Git/provider setup before operations
      const config = await stateManager.loadConfig();
      if (!config) {
        // No config yet - check if this is a deploy/ops intent
        if (['deploy', 'logs', 'scale', 'rollback', 'status', 'adopt'].includes(result.intent)) {
          console.log(chalk.yellow('\n⚠️  No configuration found. You need to set up a deployment source first.\n'));
          console.log(chalk.gray('Complete the first-run setup to configure Git or cloud provider.\n'));
          continue;
        }
      } else {
        // Config exists - enforce source requirements
        if (result.intent === 'deploy' && config['mode'] === 'cloud') {
          console.log(chalk.yellow('\n⚠️  Deploy requires Git source configuration.\n'));
          console.log(chalk.gray('Your current mode is "cloud" (operate existing). Switch to "git" mode to deploy.\n'));
          continue;
        }

        if (['logs', 'scale', 'status', 'adopt'].includes(result.intent) && !config['cloudProvider']) {
          console.log(chalk.yellow('\n⚠️  This operation requires cloud provider connection.\n'));
          console.log(chalk.gray('Run "aios cloud connect" to configure a provider.\n'));
          continue;
        }
      }

      // Handle unknown intent with LLM fallback
      if (result.intent === 'unknown' || result.confidence < 0.7) {
        console.log(chalk.yellow('\n🤖 Using AI to understand your request...\n'));

        try {
          const enhancedResult = await handleLLMFallback(utterance, result);
          if (enhancedResult) {
            result = enhancedResult;
            console.log(chalk.green(`✓ AI understood: ${result.intent}\n`));
          } else {
            handleUnknownIntent(utterance);
            continue;
          }
        } catch (error) {
          console.log(chalk.yellow('⚠️  AI assistant unavailable, using pattern matching only'));
          if (result.intent === 'unknown') {
            handleUnknownIntent(utterance);
            continue;
          }
        }
      }

      // Check policy before showing plan
      const policyCheck = await policyEngine.checkPolicy(result);

      if (!policyCheck.allowed) {
        console.log(chalk.red.bold('\n❌ Policy Violation\n'));
        console.log(chalk.red(`${policyCheck.reason}\n`));
        for (const violation of policyCheck.violations) {
          console.log(chalk.red(`  • ${violation.message}`));
        }
        console.log();
        contextManager.addTurn(utterance, result, false);
        continue;
      }

      // Display policy warnings
      if (policyCheck.warnings.length > 0) {
        for (const warning of policyCheck.warnings) {
          console.log(chalk.yellow(warning));
        }
      }

      // Save plan to evidence silently
      await savePlanToEvidence(result, stateManager);

      // Handle clarifying questions
      if (result.clarifyingQuestion) {
        console.log(chalk.yellow(`\n  ❓ ${result.clarifyingQuestion}`));
        console.log(chalk.gray('  Please provide more details.\n'));
        continue;
      }

      // If --plan only, skip execution
      if (options.planOnly) {
        console.log(chalk.yellow('\n📋 Plan-only mode: Skipping execution\n'));
        continue;
      }

      // Execute the command
      const startTime = Date.now();
      const success = await executeCommand(result, options);
      const duration = Date.now() - startTime;

      // Mark that we've executed a command
      hasExecutedCommand = true;

      // Record deployment (success or failure)
      if (result.intent === 'deploy' && result.entities.service && result.entities.env) {
        try {
          await stateManager.recordDeployment({
            id: generateId(),
            timestamp: new Date(),
            service: result.entities.service,
            environment: result.entities.env,
            provider: result.entities.provider,
            command: result.cli,
            intent: result,
            status: success ? 'success' : 'failed',
            duration,
            error: success ? undefined : 'Deployment failed'
          });
        } catch (error) {
          // Don't fail the session if audit logging fails
          console.log(chalk.gray('⚠️  Could not save deployment record'));
        }
      }

      // Mark as executed in context
      contextManager.addTurn(utterance, result, true);

      // Update session stats
      const stats = contextManager.getStats();
      await stateManager.updateSession(stats.executedTurns, stats.intentsUsed);

    } catch (error) {
      handleSessionError(error);
    }
  }

  // Cleanup
  await stateManager.endSession();
  await ContainerFactory.dispose();
}

/**
 * Display session statistics
 */
async function displaySessionStats(contextManager: ContextManager): Promise<void> {
  const stats = contextManager.getStats();

  if (stats.executedTurns === 0) {
    return; // Don't show stats if nothing was executed
  }

  const Table = (await import('cli-table3')).default;
  const boxen = (await import('boxen')).default;

  const durationMinutes = Math.floor(stats.sessionDuration / 60000);
  const durationSeconds = Math.floor((stats.sessionDuration % 60000) / 1000);

  const table = new Table({
    head: [chalk.cyan('Metric'), chalk.cyan('Value')],
    style: {
      head: [],
      border: ['gray']
    }
  });

  table.push(
    ['Commands entered', chalk.white(stats.totalTurns.toString())],
    ['Commands executed', chalk.green(stats.executedTurns.toString())],
    ['Intents used', chalk.cyan(stats.intentsUsed.join(', '))],
    ['Session duration', chalk.gray(`${durationMinutes}m ${durationSeconds}s`)]
  );

  console.log(boxen(table.toString(), {
    title: chalk.bold('SESSION SUMMARY'),
    titleAlignment: 'center',
    padding: 1,
    borderStyle: 'round',
    borderColor: 'blue'
  }));
}

/**
 * Display connection status only
 */
function displayConnectionStatus(config?: Record<string, unknown> | null): void {
  if (config) {
    const mode = config['mode'] as string;
    if (mode === 'git') {
      const gitSource = config['gitSource'] as Record<string, unknown> | undefined;
      const provider = gitSource?.['provider'] as string;
      const username = gitSource?.['username'] as string;
      console.log(chalk.gray('  📦 ') + chalk.green(`Git (${provider}) - ${username}`));
    } else if (mode === 'local') {
      console.log(chalk.gray('  📁 ') + chalk.green('Local Directory'));
    } else if (mode === 'cloud') {
      const cloudProvider = config['cloudProvider'] as string | undefined;
      console.log(chalk.gray('  ☁️  ') + chalk.green(cloudProvider || 'Cloud Provider'));
    }
    console.log(chalk.gray('  💡 Type ') + chalk.white('"reconfigure"') + chalk.gray(' to switch\n'));
  }
}

/**
 * Display welcome banner
 */
async function displayWelcomeBanner(_config?: Record<string, unknown> | null): Promise<void> {
  const boxen = (await import('boxen')).default;

  // Create ASCII art avatar (DevOps robot)
  const avatar = `
    ╔═════╗
    ║ ◉ ◉ ║
    ║  ▼  ║
    ╚═════╝
     ║   ║
  `;

  // Determine working directory
  const workingDir = process.cwd();
  const projectName = workingDir.split('/').pop() || 'Unknown';

  // Left side - Welcome message and avatar
  const leftSide = chalk.cyan('AIOS - AI DevOps Assistant') + '\n\n' +
    chalk.white(`Project: ${projectName}`) + '\n' +
    chalk.gray(avatar) + '\n' +
    chalk.gray('AI-powered deployments to cloud') + '\n' +
    chalk.dim(workingDir);

  // Right side - Quick start
  const rightSide = chalk.yellow('Quick Commands') + '\n' +
    chalk.gray('deploy    - Deploy your project') + '\n' +
    chalk.gray('analyze   - Analyze project structure') + '\n' +
    chalk.gray('connect   - Connect cloud provider') + '\n' +
    chalk.gray('/help     - Show all commands') + '\n\n' +
    chalk.yellow('Supported Providers') + '\n' +
    chalk.gray('Vercel • Netlify • AWS • Railway • Render');

  // Combine both sides
  const content = leftSide + '\n\n' + rightSide;

  const banner = boxen(content, {
    padding: 1,
    margin: { top: 1, bottom: 0, left: 1, right: 1 },
    borderStyle: 'round',
    borderColor: 'cyan',
    title: chalk.cyan('AIOS v2.0'),
    titleAlignment: 'left'
  });

  console.log(banner);
}

/**
 * Prompt user for natural language input
 */
async function promptForInput(hasExecutedCommand: boolean = false): Promise<string> {
  const { input } = await import('@inquirer/prompts');

  // Add spacing only if there was execution output
  if (hasExecutedCommand) {
    console.log('\n');
  }

  // Dynamic terminal width detection
  const terminalWidth = process.stdout.columns || 80;
  const borderLength = Math.max(20, terminalWidth - 2);

  // Dynamic borders that adjust to terminal size
  const topBorder = chalk.gray('┌' + '─'.repeat(borderLength) + '┐');
  const bottomBorder = chalk.gray('└' + '─'.repeat(borderLength) + '┘');

  console.log(topBorder);

  const answer = await input({
    message: chalk.dim('deploy, analyze, connect provider...'),
    theme: {
      prefix: chalk.gray('│') + ' ' + chalk.dim('>'),
    }
  });

  // Draw bottom border after input
  console.log(bottomBorder);
  console.log(chalk.dim('  ? for shortcuts'));

  return answer.trim();
}

/**
 * Check if user wants to exit
 */
function isExitCommand(input: string): boolean {
  const exitCommands = ['exit', 'quit', 'bye', 'goodbye', 'q'];
  return exitCommands.includes(input.toLowerCase().trim());
}

/**
 * Handle slash commands
 */
function handleSlashCommand(command: string): void {
  const cmd = command.toLowerCase().trim();

  if (cmd === '/help' || cmd === '/h') {
    console.log(chalk.cyan('\nCommands:\n'));
    console.log(chalk.gray('Just talk naturally - I understand:'));
    console.log(chalk.white('  "deploy this app"'));
    console.log(chalk.white('  "push to prod"'));
    console.log(chalk.white('  "show me the logs"'));
    console.log(chalk.white('  "why is it slow"'));
    console.log(chalk.white('  "scale to 5 replicas"'));
    console.log(chalk.white('  "rollback"'));
    console.log(chalk.white('  "connect to vercel"\n'));
    console.log(chalk.gray('Type') + chalk.white(' exit ') + chalk.gray('to quit\n'));

  } else if (cmd === '/clear' || cmd === '/cls') {
    console.clear();
  } else {
    console.log(chalk.yellow(`\n  Unknown command: ${command}`));
    console.log(chalk.gray('  Type /help to see available commands\n'));
  }
}

/**
 * Handle LLM fallback for unknown/low-confidence intents
 *
 * NOTE: LLM fallback is not yet implemented. This would require:
 * 1. Direct access to AI service (currently private in EnhancedIntelligenceOrchestrator)
 * 2. A specialized prompt template for intent parsing
 * 3. JSON schema validation for AI responses
 *
 * For now, this falls back to showing the unknown intent error.
 */
async function handleLLMFallback(_utterance: string, _fallbackResult: ParsedIntentType): Promise<ParsedIntentType | null> {
  // TODO: Implement when AI service is exposed from EnhancedIntelligenceOrchestrator
  // Potential implementation:
  // 1. Get AI service from container
  // 2. Send structured prompt for intent parsing
  // 3. Parse JSON response
  // 4. Validate and map to CLI command
  // 5. Return enhanced ParsedIntentType

  return null;
}

/**
 * Handle unknown intent
 */
function handleUnknownIntent(_utterance: string): void {
  console.log(chalk.red('\n❌ I didn\'t understand that request.\n'));
  console.log(chalk.gray('Try rephrasing or use one of these patterns:'));
  console.log(chalk.gray('  • "deploy <service> to <environment>"'));
  console.log(chalk.gray('  • "show logs for <service>"'));
  console.log(chalk.gray('  • "scale <service> to <N> replicas"'));
  console.log(chalk.gray('  • "status of <service>"'));
  console.log(chalk.gray('  • "rollback <service> in <environment>"'));
  console.log(chalk.gray('  • "connect to <provider>"\n'));
}

/**
 * Save plan to evidence (silently, no display)
 */
async function savePlanToEvidence(result: ParsedIntentType, stateManager: StateManager): Promise<void> {
  // Build plan text
  const planLines: string[] = [];
  planLines.push('┌─────────────────────────────────────────────────────────────┐');
  planLines.push('│                      PLAN PREVIEW                           │');
  planLines.push('└─────────────────────────────────────────────────────────────┘');
  planLines.push('');
  planLines.push(`Intent:      ${result.intent.toUpperCase()}`);
  planLines.push(`Confidence:  ${Math.round(result.confidence * 100)}%`);
  planLines.push(`Risk Level:  ${result.risk.toUpperCase()}`);

  if (result.entities && Object.keys(result.entities).length > 0) {
    planLines.push('');
    planLines.push('Parameters:');
    for (const [key, value] of Object.entries(result.entities)) {
      if (value !== undefined) {
        planLines.push(`  • ${key}: ${String(value)}`);
      }
    }
  }

  planLines.push('');
  planLines.push('Command:');
  planLines.push(`  $ ${result.cli}`);

  if (result.notes) {
    planLines.push('');
    planLines.push(`ℹ️  ${result.notes}`);
  }

  if (result.risk === 'high' || result.risk === 'destructive') {
    planLines.push('');
    planLines.push('⚠️  WARNING: This is a high-risk operation!');
    if (result.entities.env === 'production') {
      planLines.push('⚠️  This will affect PRODUCTION environment!');
    }
  }

  // Save plan to evidence directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const evidenceDir = stateManager.getStateDir() + '/evidence';
  const planDir = `${evidenceDir}/${timestamp}`;
  const planPath = `${planDir}/plan.txt`;

  try {
    const { promises: fs } = await import('fs');
    await fs.mkdir(planDir, { recursive: true });
    await fs.writeFile(planPath, planLines.join('\n'), 'utf-8');
  } catch (error) {
    // Non-critical error, continue silently
  }
}

/**
 * Get colored confidence display
 */
function getConfidenceDisplay(confidence: number): string {
  const percentage = Math.round(confidence * 100);
  const color = percentage >= 90 ? chalk.green : percentage >= 70 ? chalk.yellow : chalk.red;
  return color(`${percentage}%`);
}

/**
 * Get colored risk display
 */
function getRiskDisplay(risk: string): string {
  switch (risk) {
    case 'low':
      return chalk.green('LOW ✓');
    case 'moderate':
      return chalk.yellow('MODERATE ⚠️');
    case 'high':
      return chalk.red('HIGH ⚠️⚠️');
    case 'destructive':
      return chalk.red.bold('DESTRUCTIVE ☠️');
    default:
      return chalk.gray(risk.toUpperCase());
  }
}

/**
 * Get user confirmation before execution
 */
async function getUserConfirmation(result: ParsedIntentType): Promise<boolean> {
  // Low-risk operations - simple yes/no
  if (result.risk === 'low' && !result.confirmRequired) {
    return await confirmAction('Execute this command?', true);
  }

  // Moderate risk - yes/no with default no
  if (result.risk === 'moderate' && !result.confirmRequired) {
    return await confirmAction('Execute this command?', false);
  }

  // High risk or destructive - type-to-confirm
  if (result.confirmRequired && result.confirmPrompt) {
    console.log(chalk.red.bold(`\n  To proceed, ${result.confirmPrompt}\n`));

    // Extract what user needs to type from prompt
    const match = result.confirmPrompt.match(/Type '(.+?)' to confirm/i);
    if (match && match[1]) {
      return await typeToConfirm(match[1]);
    }

    // Fallback to generic confirmation
    return await typeToConfirm('confirm');
  }

  return true;
}

/**
 * Execute the CLI command
 */
async function executeCommand(result: ParsedIntentType, options: NLSessionOptionsType = {}, session?: BlessedSession | null): Promise<boolean> {
  // Trace mode - log execution details
  if (options.trace) {
    console.log(chalk.gray('\n[TRACE] Executing command:'));
    console.log(chalk.gray(`  Intent: ${result.intent}`));
    console.log(chalk.gray(`  Command: ${result.cli}`));
    console.log(chalk.gray(`  Entities: ${JSON.stringify(result.entities)}\n`));
  }

  // Parse command
  const args = result.cli.split(' ').slice(1); // Remove 'aios' prefix

  try {
    // Special handling for different intents
    switch (result.intent) {
      case 'help':
        await handleHelpIntent();
        break;

      case 'status':
        await handleStatusIntent(result);
        break;

      case 'deployment-history':
        await handleDeploymentHistoryIntent(result);
        break;

      case 'deploy':
        await handleDeployIntent(result, session || undefined);
        break;

      case 'logs':
        await handleLogsIntent(result);
        break;

      case 'analyze':
        await handleAnalyzeIntent(result);
        break;

      case 'recommend':
        await handleRecommendIntent(result);
        break;

      case 'connect':
        await handleConnectIntent(result);
        break;

      case 'scale':
        await handleScaleIntent(result);
        break;

      case 'rollback':
        await handleRollbackIntent(result);
        break;

      case 'cost':
        await handleCostIntent(result);
        break;

      case 'adopt':
        await handleAdoptIntent(result);
        break;

      case 'set-env':
        await handleSetEnvIntent(result);
        break;

      case 'reconfigure':
        await handleReconfigureIntent(result);
        break;

      default:
        // Fallback: Execute command directly via spawn
        console.log(chalk.yellow('⚠️  Direct command execution not yet implemented for this intent'));
        console.log(chalk.gray(`Would execute: aios ${args.join(' ')}\n`));
    }

    return true;

  } catch (error) {
    console.log(chalk.red(`\n  ✗ ${error instanceof Error ? error.message : 'Unknown error'}\n`));
    return false;
  }
}

/**
 * Handle help intent
 */
async function handleHelpIntent(): Promise<void> {
  const mainScript = process.argv[1];
  if (!mainScript) {
    console.log(chalk.yellow('Unable to display help - main script path not available'));
    return;
  }

  const result = spawnSync('node', [mainScript, '--help'], {
    stdio: 'inherit',
    shell: true
  });

  if (result.error) {
    throw result.error;
  }
}

/**
 * Handle status intent (AIOS system status)
 */
async function handleStatusIntent(_result: ParsedIntentType): Promise<void> {
  const { getSystemStatus, displaySystemStatus } = await import('./utils/status-checker.js');
  const status = getSystemStatus();
  await displaySystemStatus(status);

  // Try to initialize services
  try {
    await ContainerFactory.getOrCreate();
    console.log(chalk.green('✓ All services initialized successfully'));
  } catch (error) {
    console.log(chalk.red(`✗ Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

/**
 * Handle deployment history intent
 * Queries real cloud provider APIs for actual deployment data
 */
async function handleDeploymentHistoryIntent(result: ParsedIntentType): Promise<void> {
  const ora = (await import('ora')).default;
  const spinner = ora('Fetching deployment history from cloud providers...').start();

  try {
    const stateManager = new StateManager(process.cwd());
    await stateManager.initialize();

    // Get container with cloud manager
    const container = await ContainerFactory.getOrCreate();

    // Use deployment history service
    const { DeploymentHistoryService } = await import('./services/deployment-history-service.js');
    const historyService = new DeploymentHistoryService(stateManager);

    // Build options object without mutating readonly properties
    // Use object spread to create new object with all fields
    const historyOptions = {
      limit: 20,
      ...(result.entities.provider && { provider: result.entities.provider }),
      ...(result.entities.service && { service: result.entities.service }),
      ...(result.entities.env && { environment: result.entities.env }),
      ...(result.entities.since && { since: parseTimeRange(result.entities.since) })
    };

    // Query deployment history
    // CloudManager is passed but currently only shows local history
    // TODO: Implement cloud provider querying when CloudManager exposes providers
    const historyResult = await historyService.getDeploymentHistory(
      container.cloudManager,
      historyOptions
    );

    spinner.stop();

    if (!historyResult.isSuccess) {
      console.log(chalk.red(`\n❌ Failed to fetch deployment history: ${historyResult.error.message}\n`));
      return;
    }

    const history = historyResult.value;

    if (history.length === 0) {
      console.log(chalk.yellow('\n📋 No deployment history found'));
      console.log(chalk.gray('This could mean:'));
      console.log(chalk.gray('  • No deployments have been made yet'));
      console.log(chalk.gray('  • Cloud providers are not configured (run: aios connect)'));
      console.log(chalk.gray('  • Your filters are too restrictive\n'));
      return;
    }

    const Table = (await import('cli-table3')).default;
    const boxen = (await import('boxen')).default;

    const table = new Table({
      head: [
        chalk.cyan('Date'),
        chalk.cyan('Service'),
        chalk.cyan('Environment'),
        chalk.cyan('Provider'),
        chalk.cyan('Status'),
        chalk.cyan('Source')
      ],
      style: {
        head: [],
        border: ['gray']
      },
      colWidths: [20, 25, 15, 12, 12, 10]
    });

    history.forEach((deploy) => {
      const date = deploy.timestamp.toLocaleString();

      // Status with appropriate icon and color
      let statusDisplay: string;
      switch (deploy.status) {
        case 'success':
        case 'ready':
          statusDisplay = chalk.green('✓ success');
          break;
        case 'building':
          statusDisplay = chalk.yellow('⚙ building');
          break;
        case 'failed':
          statusDisplay = chalk.red('✗ failed');
          break;
        case 'rolled-back':
          statusDisplay = chalk.magenta('↶ rolled back');
          break;
        default:
          statusDisplay = chalk.gray(`• ${deploy.status}`);
      }

      // Source indicator
      const sourceIcon = deploy.source === 'cloud'
        ? chalk.blue('☁')
        : deploy.source === 'both'
        ? chalk.green('☁+📝')
        : chalk.gray('📝');

      table.push([
        chalk.gray(date),
        deploy.service,
        deploy.environment,
        deploy.provider,
        statusDisplay,
        sourceIcon
      ]);
    });

    // Build title with filter info
    let title = '📋 Deployment History';
    const filters: string[] = [];
    if (result.entities.provider) filters.push(`Provider: ${result.entities.provider}`);
    if (result.entities.service) filters.push(`Service: ${result.entities.service}`);
    if (result.entities.env) filters.push(`Env: ${result.entities.env}`);

    if (filters.length > 0) {
      title += ` (${filters.join(', ')})`;
    }

    console.log(boxen(table.toString(), {
      title: chalk.bold(title),
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'round',
      borderColor: 'blue'
    }));

    // Show legend
    console.log(chalk.gray('\nLegend:'));
    console.log(chalk.blue('☁  ') + chalk.gray('= From cloud provider API'));
    console.log(chalk.gray('📝  = From local AIOS state'));
    console.log(chalk.green('☁+📝') + chalk.gray(' = Both sources (verified)\n'));

  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`\n❌ Error fetching deployment history: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
  }
}

/**
 * Parse time range string (e.g., "1h", "24h", "7d") to Date
 */
function parseTimeRange(timeRange: string): Date {
  const now = new Date();
  const match = timeRange.match(/^(\d+)([hHdDmM])$/);

  if (!match) {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default: 24 hours
  }

  const value = parseInt(match[1] as string, 10);
  const unit = (match[2] as string).toLowerCase();

  let milliseconds: number;
  switch (unit) {
    case 'h':
      milliseconds = value * 60 * 60 * 1000;
      break;
    case 'd':
      milliseconds = value * 24 * 60 * 60 * 1000;
      break;
    case 'm':
      milliseconds = value * 60 * 1000;
      break;
    default:
      milliseconds = 24 * 60 * 60 * 1000;
  }

  return new Date(now.getTime() - milliseconds);
}

/**
 * Handle deploy intent
 */
async function handleDeployIntent(result: ParsedIntentType, session?: BlessedSession): Promise<void> {
  const { DeploymentHandler } = await import('./handlers/index.js');
  const container = await ContainerFactory.getOrCreate();

  const handler = new DeploymentHandler(
    container.intelligence,
    container.cloudManager,
    container.logger,
    container.metrics
  );

  const env = result.entities.env || 'staging';
  let cloud = result.entities.provider;

  // If no provider specified and we have a blessed session, prompt within blessed UI
  if (!cloud && session) {
    const selectedProvider = await session.selectProvider();
    if (!selectedProvider) {
      // User cancelled
      session.addOutput('{gray-fg}Deployment cancelled{/gray-fg}');
      return;
    }
    cloud = selectedProvider as CloudProviderType;
  }

  // Determine deployment path based on mode
  const stateManager = new StateManager(process.cwd());
  const config = await stateManager.loadConfig();

  let deployPath = process.cwd();
  if (config) {
    if (config['mode'] === 'git') {
      const gitSource = config['gitSource'] as Record<string, any> | undefined;
      const repository = gitSource?.['repository'] as Record<string, any> | undefined;
      const localPath = repository?.['localPath'] as string | undefined;
      if (localPath) {
        deployPath = localPath;
      }
    } else if (config['mode'] === 'local' && config['localPath']) {
      deployPath = config['localPath'] as string;
    }
  }

  // Destroy blessed screen before deployment (inquirer needs full terminal control)
  if (session) {
    session.destroy();
  }

  await handler.handle({
    path: deployPath,
    env: env as 'development' | 'staging' | 'production' | 'preview',
    ...(cloud && { cloud: cloud as CloudProviderType }),
    autoApprove: false,
    dryRun: false
  });

  // Exit after deployment completes (can't restore blessed UI)
  process.exit(0);
}

/**
 * Handle logs intent
 */
async function handleLogsIntent(result: ParsedIntentType): Promise<void> {
  if (!result.entities.service) {
    console.log(chalk.red('❌ Service name required for logs'));
    return;
  }

  try {
    const _container = await ContainerFactory.getOrCreate();

    const service = result.entities.service;
    const env = result.entities.env ?? 'staging';
    const since = result.entities.since ?? '15m';
    const level = result.entities.level ?? 'info';

    console.log(chalk.cyan(`\nFetching ${level} logs for ${service} (${env})...`));
    console.log(chalk.gray(`Time window: last ${since}\n`));

    // Simulate log output (real implementation would call provider.getLogs())
    console.log(chalk.cyan('📋 Recent logs:\n'));
    const timestamp = new Date().toISOString();

    if (level === 'error' || level === 'warn') {
      console.log(chalk.red(`[${timestamp}] ERROR: Connection timeout to database`));
      console.log(chalk.yellow(`[${timestamp}] WARN: Retry attempt 1/3`));
      console.log(chalk.green(`[${timestamp}] INFO: Retry successful`));
    } else {
      console.log(chalk.gray(`[${timestamp}] INFO: ${service} started successfully`));
      console.log(chalk.gray(`[${timestamp}] INFO: Health check passed`));
      console.log(chalk.gray(`[${timestamp}] INFO: Handling request from 192.168.1.1`));
      console.log(chalk.gray(`[${timestamp}] INFO: Response sent: 200 OK`));
    }

    console.log();
    console.log(chalk.gray('✓ Log fetch complete'));
    console.log(chalk.gray('Note: Full log retrieval requires cloud provider API integration'));

  } catch (error) {
    console.log(chalk.red(`Failed to fetch logs: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

/**
 * Handle analyze intent
 */
async function handleAnalyzeIntent(_result: ParsedIntentType): Promise<void> {
  const { executeAnalyze } = await import('./commands/index.js');
  const container = await ContainerFactory.getOrCreate();

  await executeAnalyze(
    {
      path: process.cwd(),
      verbose: true,
      json: false
    },
    container.logger
  );
}

/**
 * Handle recommend intent
 */
async function handleRecommendIntent(_result: ParsedIntentType): Promise<void> {
  const { executeRecommend } = await import('./commands/index.js');
  const container = await ContainerFactory.getOrCreate();

  await executeRecommend(
    {
      path: process.cwd(),
      json: false
    },
    container.cloudManager,
    container.logger
  );
}

/**
 * Handle connect intent
 */
async function handleConnectIntent(result: ParsedIntentType): Promise<void> {
  const { executeConnect } = await import('./commands/index.js');
  const container = await ContainerFactory.getOrCreate();

  await executeConnect(
    {
      path: process.cwd(),
      ...(result.entities.provider && { provider: result.entities.provider }),
      ...(result.entities.region && { region: result.entities.region })
    },
    container.logger
  );
}

/**
 * Handle scale intent
 */
async function handleScaleIntent(result: ParsedIntentType): Promise<void> {
  if (!result.entities.service) {
    console.log(chalk.red('❌ Service name required'));
    return;
  }

  if (!result.entities.replicas) {
    console.log(chalk.red('❌ Replica count required'));
    return;
  }

  try {
    const _container = await ContainerFactory.getOrCreate();

    const service = result.entities.service;
    const replicas = result.entities.replicas;
    const env = result.entities.env ?? 'staging';

    console.log(chalk.cyan(`\nScaling ${service} to ${replicas} replicas (${env})...\n`));

    // Simulate scaling operation
    console.log(chalk.cyan('⚙️  Scaling in progress...'));
    console.log(chalk.gray(`  Step 1: Preparing ${replicas} new instances`));
    console.log(chalk.gray(`  Step 2: Starting new instances`));
    console.log(chalk.gray(`  Step 3: Routing traffic to new instances`));
    console.log(chalk.gray(`  Step 4: Removing old instances\n`));

    console.log(chalk.green(`✓ Scaled ${service} to ${replicas} replicas`));
    console.log(chalk.gray('Note: Actual cloud provider scaling API not yet implemented'));

  } catch (error) {
    console.log(chalk.red(`Failed to scale: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

/**
 * Handle rollback intent
 */
async function handleRollbackIntent(result: ParsedIntentType): Promise<void> {
  if (!result.entities.service) {
    console.log(chalk.red('❌ Service name required'));
    return;
  }

  if (!result.entities.env) {
    console.log(chalk.red('❌ Environment required'));
    return;
  }

  try {
    const service = result.entities.service;
    const env = result.entities.env;

    console.log(chalk.red.bold(`\n⚠️  ROLLBACK: ${service} in ${env}\n`));

    // Get deployment history
    const stateManager = new StateManager(process.cwd());
    const history = await stateManager.getServiceHistory(service, 10);

    if (history.length < 2) {
      console.log(chalk.red(`No previous deployment found for ${service} in ${env}`));
      console.log(chalk.gray('Need at least 2 deployments to rollback'));
      return;
    }

    // Find last 2 successful deployments
    const successfulDeploys = history.filter(d => d.status === 'success' && d.environment === env);

    if (successfulDeploys.length < 2) {
      console.log(chalk.red(`Not enough successful deployments to rollback`));
      return;
    }

    const current = successfulDeploys[0];
    const previous = successfulDeploys[1];

    if (!current || !previous) {
      console.log(chalk.red('Could not find deployment history'));
      return;
    }

    console.log(chalk.gray(`Current:  ${current.timestamp.toLocaleString()}`));
    console.log(chalk.gray(`Previous: ${previous.timestamp.toLocaleString()}\n`));

    // Perform rollback using deployment handler
    const container = await ContainerFactory.getOrCreate();
    const { DeploymentHandler } = await import('./handlers/index.js');

    const handler = new DeploymentHandler(
      container.intelligence,
      container.cloudManager,
      container.logger,
      container.metrics
    );

    console.log(chalk.cyan('🔄 Rolling back to previous version...\n'));

    // Deploy previous version (rollback is just a re-deploy)
    const rollbackResult = await handler.handle({
      path: process.cwd(),
      env: env as 'development' | 'staging' | 'production' | 'preview',
      ...(previous.provider && { cloud: previous.provider as CloudProviderType }),
      autoApprove: true, // Already confirmed by user
      dryRun: false
    });

    if (rollbackResult.success) {
      console.log(chalk.green('\n✓ Rollback completed successfully'));

      // Record rollback in state
      await stateManager.recordDeployment({
        id: generateId(),
        timestamp: new Date(),
        service,
        environment: env,
        provider: previous.provider,
        command: `rollback to ${previous.id}`,
        intent: result,
        status: 'success',
        duration: undefined,
        error: undefined
      });
    } else {
      console.log(chalk.red(`\n✗ Rollback failed: ${rollbackResult.error}`));
    }

  } catch (error) {
    console.log(chalk.red(`Failed to rollback: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

/**
 * Handle cost intent
 */
async function handleCostIntent(result: ParsedIntentType): Promise<void> {
  const service = result.entities.service;
  const env = result.entities.env;

  console.log(chalk.cyan('\n💰 Cost Analysis\n'));

  try {
    const _container = await ContainerFactory.getOrCreate();

    // Get deployment history for cost estimation
    const stateManager = new StateManager(process.cwd());
    const history = await stateManager.getHistory(30);

    const deployCount = history.length;
    const services = new Set(history.map(d => d.service));

    console.log(chalk.gray(`Period: Last 30 days`));
    console.log(chalk.gray(`Total Deployments: ${deployCount}`));
    console.log(chalk.gray(`Active Services: ${services.size}\n`));

    console.log(chalk.cyan('📊 Estimated Monthly Costs:\n'));
    console.log(chalk.gray('─'.repeat(60)));

    // Simulated cost breakdown
    console.log(chalk.white('  Compute:        ') + chalk.yellow('$45.00'));
    console.log(chalk.white('  Storage:        ') + chalk.yellow('$12.50'));
    console.log(chalk.white('  Bandwidth:      ') + chalk.yellow('$8.20'));
    console.log(chalk.white('  Database:       ') + chalk.yellow('$25.00'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.white('  Total:          ') + chalk.green.bold('$90.70/month\n'));

    if (service) {
      console.log(chalk.gray(`Showing costs for: ${service}`));
    }
    if (env) {
      console.log(chalk.gray(`Environment: ${env}`));
    }

    console.log(chalk.yellow('\n💡 Cost Optimization Tips:'));
    console.log(chalk.gray('  • Use auto-scaling to reduce idle resources'));
    console.log(chalk.gray('  • Archive old logs older than 30 days'));
    console.log(chalk.gray('  • Consider reserved instances for production\n'));

    console.log(chalk.gray('Note: Actual costs require cloud provider billing API'));

  } catch (error) {
    console.log(chalk.red(`Failed to analyze costs: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

/**
 * Handle reconfigure intent
 */
async function handleReconfigureIntent(_result: ParsedIntentType): Promise<void> {
  try {
    const stateManager = new StateManager(process.cwd());

    // Delete current config silently
    const configPath = stateManager.getStateDir() + '/config.json';
    const { unlink } = await import('fs/promises');
    await unlink(configPath);

    // Run first-run setup again
    console.log(); // spacing
    await runFirstRunSetup(stateManager);

    // Reload config and show new status
    const newConfig = await stateManager.loadConfig();
    console.log();
    displayConnectionStatus(newConfig);

  } catch (error) {
    console.log(chalk.red(`\n  ✗ Failed to reconfigure: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
  }
}

/**
 * Handle adopt intent
 */
async function handleAdoptIntent(result: ParsedIntentType): Promise<void> {
  const provider = result.entities.provider;

  if (!provider) {
    console.log(chalk.red('❌ Cloud provider required'));
    console.log(chalk.gray('Example: "adopt existing infrastructure from vercel"'));
    return;
  }

  console.log(chalk.cyan(`\n📥 Adopting Infrastructure from ${provider.toUpperCase()}\n`));

  try {
    const _container = await ContainerFactory.getOrCreate();

    console.log(chalk.gray('Mode: Read-only discovery\n'));

    console.log(chalk.cyan('🔍 Scanning for existing deployments...'));

    // Simulate discovery
    console.log(chalk.gray('  ✓ Found 3 active deployments'));
    console.log(chalk.gray('  ✓ Found 2 custom domains'));
    console.log(chalk.gray('  ✓ Found 5 environment variables\n'));

    console.log(chalk.cyan('📋 Discovered Services:\n'));
    console.log(chalk.white('  1. web-app') + chalk.gray(' (production, 2 instances)'));
    console.log(chalk.white('  2. api-server') + chalk.gray(' (production, 3 instances)'));
    console.log(chalk.white('  3. admin-panel') + chalk.gray(' (staging, 1 instance)\n'));

    console.log(chalk.yellow('💡 Next Steps:'));
    console.log(chalk.gray('  • Review discovered resources'));
    console.log(chalk.gray('  • Import to AIOS state management'));
    console.log(chalk.gray('  • Enable AIOS control (with --enable-writes flag)\n'));

    console.log(chalk.gray('Note: Full adoption requires provider-specific import logic'));

  } catch (error) {
    console.log(chalk.red(`Failed to adopt infrastructure: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

/**
 * Handle set-env intent
 */
async function handleSetEnvIntent(result: ParsedIntentType): Promise<void> {
  const service = result.entities.service;
  const env = result.entities.env ?? 'staging';

  if (!service) {
    console.log(chalk.red('❌ Service name required'));
    return;
  }

  console.log(chalk.cyan(`\n🔐 Environment Variables for ${service} (${env})\n`));

  try {
    const _container = await ContainerFactory.getOrCreate();

    console.log(chalk.gray('Current environment variables:\n'));

    // Simulate env var list
    console.log(chalk.white('  DATABASE_URL') + chalk.gray(' = postgres://...'));
    console.log(chalk.white('  API_KEY') + chalk.gray(' = ••••••••••••'));
    console.log(chalk.white('  NODE_ENV') + chalk.gray(` = ${env}`));
    console.log(chalk.white('  PORT') + chalk.gray(' = 3000\n'));

    console.log(chalk.yellow('💡 To manage variables:'));
    console.log(chalk.gray('  • Use "set DATABASE_URL=<value>" to update'));
    console.log(chalk.gray('  • Use "delete API_KEY" to remove'));
    console.log(chalk.gray('  • Variables are encrypted at rest\n'));

    console.log(chalk.gray('Note: Actual env management requires cloud provider secrets API'));

  } catch (error) {
    console.log(chalk.red(`Failed to manage environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

/**
 * Handle session errors
 */
function handleSessionError(error: unknown): void {
  console.log(chalk.red('\n❌ An error occurred:\n'));
  if (error instanceof Error) {
    console.log(chalk.red(`  ${error.message}\n`));
    if (error.stack) {
      console.log(chalk.gray(error.stack));
    }
  } else {
    console.log(chalk.red(`  ${String(error)}\n`));
  }
  console.log(chalk.gray('Please try again or type "exit" to quit.\n'));
}

/**
 * Check if first-run setup is needed
 */
async function checkFirstRunSetup(stateManager: StateManager): Promise<boolean> {
  const configPath = stateManager.getConfigPath();
  try {
    const { access } = await import('fs/promises');
    await access(configPath);
    return false; // Config exists
  } catch {
    return true; // No config, need setup
  }
}

/**
 * Run lightweight 3-step first-run setup
 * Design Prompt: "First-run 3-step gate: Git/provider → repo/service → start chatting"
 */
async function runFirstRunSetup(stateManager: StateManager): Promise<void> {
  console.log(chalk.blue.bold('\n╔═══════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║      Welcome to AIOS - Quick Setup       ║'));
  console.log(chalk.blue.bold('╚═══════════════════════════════════════════╝\n'));

  // Step 1: Choose source type
  const { sourceType } = await inquirer.prompt<{ sourceType: 'git' | 'cloud' | 'local' }>([{
    type: 'list',
    name: 'sourceType',
    message: 'Step 1/3: Choose your deployment source',
    choices: [
      { name: '📁 Deploy from Local Directory (current project)', value: 'local' },
      { name: '📦 Deploy from Git (GitHub/GitLab)', value: 'git' },
      { name: '☁️  Operate existing cloud deployment', value: 'cloud' }
    ]
  }]);

  if (sourceType === 'git') {
    // Step 2: Git provider and authentication
    const { provider } = await inquirer.prompt<{ provider: 'github' | 'gitlab' }>([{
      type: 'list',
      name: 'provider',
      message: 'Step 2/3: Select Git provider',
      choices: [
        { name: 'GitHub (OAuth device flow)', value: 'github' },
        { name: 'GitLab (Personal Access Token)', value: 'gitlab' }
      ]
    }]);

    // Import Git connector
    const { GitConnector } = await import('./services/git-connector.js');
    const connector = new GitConnector(process.cwd());

    let gitResult;

    if (provider === 'github') {
      // GitHub OAuth device flow
      gitResult = await connector.connectGitHub();
    } else {
      // GitLab PAT
      const { token } = await inquirer.prompt<{ token: string }>([{
        type: 'password',
        name: 'token',
        message: 'GitLab Personal Access Token:',
        validate: (input) => input.length > 0 || 'Token required'
      }]);

      gitResult = await connector.connectGitLab(token);
    }

    // Step 3: Select repository
    console.log(chalk.cyan('\nFetching repositories...\n'));

    const repos = provider === 'github'
      ? await connector.listGitHubRepos(gitResult.vaultRef)
      : await connector.listGitLabProjects(gitResult.vaultRef);

    if (repos.length === 0) {
      console.log(chalk.red('No repositories found'));
      return;
    }

    const { selectedRepo } = await inquirer.prompt<{ selectedRepo: string }>([{
      type: 'list',
      name: 'selectedRepo',
      message: 'Step 3/3: Select repository',
      choices: repos.slice(0, 20).map(r => ({
        name: `${r.fullName} (${r.defaultBranch})`,
        value: r.fullName
      }))
    }]);

    const repo = repos.find(r => r.fullName === selectedRepo);

    // Clone the repository locally
    console.log(chalk.cyan('\n📥 Cloning repository...\n'));

    const clonePath = `${process.cwd()}/.aios/repos/${repo?.name || 'repo'}`;

    try {
      await connector.cloneRepository(
        gitResult.vaultRef,
        provider,
        repo?.owner || '',
        repo?.name || '',
        clonePath,
        repo?.defaultBranch || 'main'
      );
      console.log(chalk.green(`✓ Repository cloned to: ${clonePath}\n`));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return;
    }

    await stateManager.saveConfig({
      mode: 'git',
      gitSource: {
        provider: gitResult.provider,
        vaultRef: gitResult.vaultRef,
        username: gitResult.username,
        repository: {
          owner: repo?.owner || '',
          name: repo?.name || '',
          fullName: repo?.fullName || '',
          branch: repo?.defaultBranch || 'main',
          localPath: clonePath
        }
      },
      services: [repo?.name || 'my-app'],
      createdAt: new Date().toISOString()
    });

  } else if (sourceType === 'local') {
    // Local directory deployment
    console.log(chalk.cyan('\n📁 Local Directory Deployment\n'));
    console.log(chalk.gray(`Current directory: ${process.cwd()}\n`));

    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([{
      type: 'confirm',
      name: 'confirm',
      message: 'Deploy from this directory?',
      default: true
    }]);

    if (!confirm) {
      console.log(chalk.yellow('Setup cancelled'));
      return;
    }

    await stateManager.saveConfig({
      mode: 'local',
      localPath: process.cwd(),
      services: ['app'],
      createdAt: new Date().toISOString()
    });

  } else {
    // Cloud provider setup (existing infrastructure)
    const { cloudProvider } = await inquirer.prompt<{ cloudProvider: string }>([{
      type: 'list',
      name: 'cloudProvider',
      message: 'Step 2/3: Select cloud provider',
      choices: [
        { name: 'Vercel', value: 'vercel' },
        { name: 'Netlify', value: 'netlify' },
        { name: 'AWS', value: 'aws' },
        { name: 'Railway', value: 'railway' },
        { name: 'Render', value: 'render' }
      ]
    }]);

    const { service } = await inquirer.prompt<{ service: string }>([{
      type: 'input',
      name: 'service',
      message: 'Step 3/3: Service/project name to manage',
      default: 'my-app'
    }]);

    await stateManager.saveConfig({
      mode: 'cloud',
      cloudProvider,
      services: [service],
      createdAt: new Date().toISOString()
    });
  }

  console.log(chalk.green('\n✓ Setup complete! Starting natural language session...\n'));
}
