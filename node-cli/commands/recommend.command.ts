/**
 * @fileoverview Recommend Command - Provider Recommendations
 * @description Wraps existing CloudManager.getProviderRecommendations
 * @module node-cli/commands
 */

import chalk from 'chalk';
import ora from 'ora';
import type { ILogger, IMetricsCollector, CloudManager } from '@aios/shared';
import { UnifiedAnalyzer } from '@aios/shared';
import { ProjectStateManager } from '@aios/shared';
import { ConsoleFormatter as fmt } from '../utils/console-formatter.js';

/**
 * Recommend command options
 */
export interface RecommendOptionsType {
  readonly path: string;
  readonly costOptimization?: boolean;
  readonly performanceFirst?: boolean;
  readonly json?: boolean;
}

/**
 * Execute recommend command
 *
 * Uses existing CloudManager.getProviderRecommendations()
 */
export async function executeRecommend(
  options: RecommendOptionsType,
  cloudManager: CloudManager,
  logger: ILogger
): Promise<void> {
  const spinner = ora('Analyzing project for recommendations...').start();

  try {
    // Check existing state
    const stateManager = new ProjectStateManager(options.path, logger);
    const state = await stateManager.detectState();

    if (state.hasDeployment) {
      spinner.info(`Already deployed to ${state.provider}`);
    }

    // Analyze project using existing UnifiedAnalyzer in legacy mode
    // Create a no-op metrics object that implements IMetricsCollector
    const noopMetrics: IMetricsCollector = {
      increment: () => {},
      gauge: () => {},
      timing: () => {},
      histogram: () => {}
    };

    const analyzer = new UnifiedAnalyzer(
      undefined, // dependencies
      logger, // logger
      noopMetrics, // metrics
      undefined  // config (optional)
    );

    spinner.text = 'Analyzing project structure...';

    const analysisResult = await analyzer.analyze(options.path, {
      requestId: `recommend-${Date.now()}`,
      timestamp: new Date()
    });

    if (!analysisResult.isSuccess || !analysisResult.value?.success || !analysisResult.value?.data) {
      spinner.fail('Analysis failed');
      const errorMsg = analysisResult.error?.message || analysisResult.value?.error || 'Unknown error';
      console.error(chalk.red(`Error: ${errorMsg}`));
      process.exit(1);
    }

    const analysis = analysisResult.value.data;

    spinner.text = 'Getting provider recommendations...';

    // Use existing CloudManager.getProviderRecommendations()
    // CloudManager accepts both ProjectAnalysis types and converts internally
    // UnifiedProjectInfo is compatible with both accepted types
    const recommendations = await cloudManager.getProviderRecommendations(
      analysis as any, // CloudManager handles type conversion internally
      {
        costOptimization: options.costOptimization || false,
        performanceFirst: options.performanceFirst || false
      }
    );

    spinner.succeed('Recommendations ready!');

    // Display results
    if (options.json) {
      console.log(JSON.stringify(recommendations, null, 2));
      return;
    }

    // Human-readable output
    fmt.header('🌐', 'Provider Recommendations');
    console.log(chalk.gray('Based on: '), chalk.cyan(`${analysis.framework || analysis.language} project`));
    fmt.separator();

    if (!recommendations.success || !recommendations.data || recommendations.data.length === 0) {
      fmt.warning('No recommendations available');
      return;
    }

    recommendations.data.slice(0, 3).forEach((rec, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      const matchPercent = rec.score.toFixed(0);

      console.log(chalk.bold(`\n${medal} ${index + 1}. ${rec.provider.toUpperCase()}`), chalk.green(`(${matchPercent}% match)`));

      console.log(chalk.bold('   Why this provider:'));
      console.log(chalk.gray(`   ${rec.reasoning}`));

      if (rec.limitations && rec.limitations.length > 0) {
        console.log(chalk.bold('   Limitations:'));
        rec.limitations.forEach(limitation => {
          console.log(chalk.yellow(`   ⚠️  ${limitation}`));
        });
      }

      if (rec.costEstimate) {
        const monthlyCost = rec.costEstimate.monthly;
        if (monthlyCost) {
          const min = monthlyCost.minimum;
          const max = monthlyCost.maximum ?? monthlyCost.typical;
          console.log(chalk.bold('   Estimated Cost:'), chalk.cyan(`$${min}-${max}/month`));
        }
      }

      console.log(chalk.bold('   Setup Complexity:'), chalk.cyan(rec.setupComplexity));
    });

    fmt.separator();

    // Show next steps
    const topProvider = recommendations.data[0]?.provider;
    if (topProvider) {
      fmt.nextSteps('Next Steps', [
        { description: 'Connect to recommended provider', command: `aios cloud connect --provider ${topProvider}` },
        { description: 'Or deploy directly', command: `aios cloud deploy --cloud ${topProvider}` }
      ]);
    }

  } catch (error) {
    spinner.fail('Recommendation failed');
    logger.error('Recommendation error', error as Error);
    console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}