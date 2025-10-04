/**
 * @fileoverview AI Analyze Command - AI-Powered Project Analysis
 * @description Uses LLMs to provide intelligent insights about your project
 * @module node-cli/commands
 */

import chalk from 'chalk';
import ora from 'ora';
import type { ILogger, IMetricsCollector } from '@aios/shared';
import { UnifiedAnalyzer, ProjectStateManager } from '@aios/shared';
import {
  getAIConfigFromEnv,
  createSimpleAIService,
  isAIAvailable
} from '../services/ai-service-helper.js';
import { ConsoleFormatter as fmt } from '../utils/console-formatter.js';

/**
 * AI Analyze command options
 */
export interface AIAnalyzeOptionsType {
  readonly path: string;
  readonly insights?: boolean;
  readonly improvements?: boolean;
  readonly architecture?: boolean;
  readonly json?: boolean;
}

/**
 * Execute AI-powered analyze command
 *
 * Uses LLM to provide intelligent insights beyond static analysis
 */
export async function executeAIAnalyze(
  options: AIAnalyzeOptionsType,
  logger: ILogger
): Promise<void> {
  // Check if AI is configured
  if (!isAIAvailable()) {
    fmt.warning('AI features require configuration');
    fmt.newline();
    console.log(chalk.gray('Set one of the following in your .env file:\n'));
    console.log(chalk.cyan('  AIOS_BACKEND=openai'));
    console.log(chalk.cyan('  OPENAI_API_KEY=sk-...\n'));
    console.log(chalk.gray('Or:\n'));
    console.log(chalk.cyan('  AIOS_BACKEND=anthropic'));
    console.log(chalk.cyan('  ANTHROPIC_API_KEY=sk-ant-...\n'));
    console.log(chalk.gray('Or:\n'));
    console.log(chalk.cyan('  AIOS_BACKEND=groq'));
    console.log(chalk.cyan('  GROQ_API_KEY=gsk_...\n'));
    console.log(chalk.gray('See .env.example for more options\n'));
    process.exit(1);
  }

  const spinner = ora('Analyzing project with AI...').start();

  try {
    // Step 1: Get project analysis
    const stateManager = new ProjectStateManager(options.path, logger);
    const state = await stateManager.detectState();

    if (state.hasAiosConfig) {
      spinner.info('Existing AIOS configuration detected');
    }

    // Create analyzer with no-op metrics that implements IMetricsCollector
    const noopMetrics: IMetricsCollector = {
      increment: () => {},
      gauge: () => {},
      timing: () => {},
      histogram: () => {}
    };

    const analyzer = new UnifiedAnalyzer(
      undefined,
      logger,
      noopMetrics,
      undefined
    );

    spinner.text = 'Performing static analysis...';

    const analysisResult = await analyzer.analyze(options.path, {
      requestId: `ai-analyze-${Date.now()}`,
      timestamp: new Date()
    });

    if (!analysisResult.isSuccess || !analysisResult.value?.success || !analysisResult.value?.data) {
      spinner.fail('Static analysis failed');
      const errorMsg = analysisResult.error?.message || analysisResult.value?.error || 'Unknown error';
      console.error(chalk.red(`Error: ${errorMsg}`));
      process.exit(1);
    }

    const analysis = analysisResult.value.data;

    // Step 2: Initialize AI service
    const aiConfig = getAIConfigFromEnv()!;
    spinner.text = `Connecting to ${aiConfig.backend} (${aiConfig.model})...`;

    const aiService = await createSimpleAIService(aiConfig, logger);

    spinner.succeed(`Connected to ${chalk.green(aiConfig.backend)}`);

    // Step 3: Generate AI insights
    if (options.json) {
      const results: any = { analysis };

      if (options.insights !== false) {
        spinner.start('Generating AI insights...');
        results.insights = await aiService.generateInsights(analysis);
        spinner.succeed('Insights generated');
      }

      if (options.improvements) {
        spinner.start('Getting improvement suggestions...');
        results.improvements = await aiService.suggestImprovements(analysis);
        spinner.succeed('Improvements generated');
      }

      if (options.architecture) {
        spinner.start('Analyzing architecture...');
        results.architecture = await aiService.analyzeArchitecture(analysis);
        spinner.succeed('Architecture analyzed');
      }

      console.log(JSON.stringify(results, null, 2));
      return;
    }

    // Step 4: Display results
    fmt.header('🤖', 'AI-Powered Project Analysis');
    fmt.separator();

    // Basic info
    fmt.keyValue('Project', analysis.framework || analysis.language || 'Unknown');
    fmt.keyValue('Language', analysis.language);
    fmt.keyValue('Package Manager', analysis.packageManager);

    if (analysis.dependencies && analysis.dependencies.length > 0) {
      fmt.keyValue('Dependencies', `${analysis.dependencies.length} packages`, 'cyan');
    }

    // AI Insights (default)
    if (options.insights !== false) {
      fmt.header('💡', 'AI Insights');
      spinner.start('Analyzing with AI...');

      try {
        const insights = await aiService.generateInsights(analysis);
        spinner.succeed('Analysis complete');
        console.log(chalk.gray(insights));
      } catch (error) {
        spinner.fail('Failed to generate insights');
        logger.error('AI insights error', error as Error);
      }
    }

    // Improvement Suggestions
    if (options.improvements) {
      fmt.header('✨', 'Suggested Improvements');
      spinner.start('Getting suggestions...');

      try {
        const improvements = await aiService.suggestImprovements(analysis);
        spinner.succeed('Suggestions ready');

        improvements.forEach((improvement, index) => {
          console.log(chalk.green(`${index + 1}. ${improvement.trim()}`));
        });
      } catch (error) {
        spinner.fail('Failed to get suggestions');
        logger.error('AI improvements error', error as Error);
      }
    }

    // Architecture Analysis
    if (options.architecture) {
      fmt.header('🏗️', 'Architecture Analysis');
      spinner.start('Analyzing architecture...');

      try {
        const archAnalysis = await aiService.analyzeArchitecture(analysis.projectStructure || analysis);
        spinner.succeed('Architecture analyzed');
        console.log(chalk.gray(archAnalysis));
      } catch (error) {
        spinner.fail('Failed to analyze architecture');
        logger.error('AI architecture error', error as Error);
      }
    }

    fmt.separator();

    // Show next steps
    fmt.nextSteps('Next Steps', [
      { description: 'Get provider recommendations', command: 'aios cloud recommend' },
      { description: 'Deploy with best practices', command: 'aios cloud deploy' }
    ]);

  } catch (error) {
    spinner.fail('AI analysis failed');
    logger.error('AI analysis error', error as Error);
    console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`));

    if (error instanceof Error && error.message.includes('SDK not installed')) {
      console.log(chalk.yellow('Install the required SDK:\n'));
      console.log(chalk.cyan('  npm install openai          # For OpenAI'));
      console.log(chalk.cyan('  npm install @anthropic-ai/sdk  # For Anthropic'));
      console.log(chalk.cyan('  npm install groq-sdk        # For Groq\n'));
    }

    process.exit(1);
  }
}