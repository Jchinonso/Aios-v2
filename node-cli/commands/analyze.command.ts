/**
 * @fileoverview Analyze Command - Project Analysis
 * @description Wraps existing UnifiedAnalyzer for CLI usage
 * @module node-cli/commands
 */

import chalk from 'chalk';
import ora from 'ora';
import type { ILogger, IMetricsCollector } from '@aios/shared';
import { UnifiedAnalyzer } from '@aios/shared';
import { ProjectStateManager } from '@aios/shared';
import { ConsoleFormatter as fmt } from '../utils/console-formatter.js';

/**
 * Analyze command options
 */
export interface AnalyzeOptionsType {
  readonly path: string;
  readonly verbose?: boolean;
  readonly json?: boolean;
}

/**
 * Execute analyze command
 *
 * Uses existing UnifiedAnalyzer from shared module
 */
export async function executeAnalyze(
  options: AnalyzeOptionsType,
  logger: ILogger
): Promise<void> {
  const spinner = ora('Analyzing project...').start();

  try {
    // Initialize state manager
    const stateManager = new ProjectStateManager(options.path, logger);
    const state = await stateManager.detectState();

    if (state.hasAiosConfig) {
      spinner.info('Existing AIOS configuration detected');
    }

    // Use existing UnifiedAnalyzer in legacy mode (logger, metrics, config)
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

    // Analyze the project
    const analysisResult = await analyzer.analyze(options.path, {
      requestId: `analyze-${Date.now()}`,
      timestamp: new Date()
    });

    if (!analysisResult.isSuccess || !analysisResult.value?.success || !analysisResult.value?.data) {
      spinner.fail('Analysis failed');
      const errorMsg = analysisResult.error?.message || analysisResult.value?.error || 'Unknown error';
      console.error(chalk.red(`Error: ${errorMsg}`));
      process.exit(1);
    }

    spinner.succeed('Analysis complete!');

    const analysis = analysisResult.value.data;

    // Display results based on format
    if (options.json) {
      console.log(JSON.stringify(analysis, null, 2));
      return;
    }

    // Human-readable output with beautiful tables
    const Table = (await import('cli-table3')).default;
    const boxen = (await import('boxen')).default;

    const mainTable = new Table({
      style: {
        head: [],
        border: ['cyan']
      }
    });

    mainTable.push(
      [chalk.cyan('Language'), chalk.white(analysis.language)],
      [chalk.cyan('Framework'), chalk.white(analysis.framework || 'None detected')],
      [chalk.cyan('Package Manager'), chalk.white(analysis.packageManager)]
    );

    if (analysis.buildCommand) {
      mainTable.push([chalk.cyan('Build Command'), chalk.yellow(analysis.buildCommand)]);
    }

    if (analysis.outputDirectory) {
      mainTable.push([chalk.cyan('Output Directory'), chalk.yellow(analysis.outputDirectory)]);
    }

    let content = mainTable.toString();

    if (analysis.dependencies && analysis.dependencies.length > 0) {
      content += '\n\n' + chalk.bold('Dependencies: ') + chalk.cyan(`${analysis.dependencies.length} packages`);

      if (options.verbose) {
        const frameworks = analysis.dependencies.filter((d: any) => d.isFramework);
        const buildTools = analysis.dependencies.filter((d: any) => d.isBuildTool);
        const testTools = analysis.dependencies.filter((d: any) => d.isTestingTool);

        if (frameworks.length > 0 || buildTools.length > 0 || testTools.length > 0) {
          const depsTable = new Table({
            head: [chalk.cyan('Type'), chalk.cyan('Packages')],
            style: {
              head: [],
              border: ['gray']
            }
          });

          if (frameworks.length > 0) {
            depsTable.push(['Frameworks', frameworks.map((f: any) => f.name).join(', ')]);
          }
          if (buildTools.length > 0) {
            depsTable.push(['Build Tools', buildTools.map((b: any) => b.name).join(', ')]);
          }
          if (testTools.length > 0) {
            depsTable.push(['Testing', testTools.map((t: any) => t.name).join(', ')]);
          }

          content += '\n\n' + depsTable.toString();
        }
      }
    }

    console.log(boxen(content, {
      title: chalk.bold('📊 Project Analysis'),
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }));

    if (analysis.projectStructure) {
      console.log(chalk.bold('\nProject Structure:'));
      console.log(chalk.gray(`  Type: ${analysis.projectStructure.type}`));
      console.log(chalk.gray(`  Has Tests: ${analysis.projectStructure.hasTests ? '✓' : '✗'}`));
      console.log(chalk.gray(`  Has Docs: ${analysis.projectStructure.hasDocumentation ? '✓' : '✗'}`));
    }

    fmt.separator();

    // Show next steps
    fmt.nextSteps('Next Steps', [
      { description: 'Get provider recommendations', command: 'aios cloud recommend' },
      { description: 'Connect to cloud provider', command: 'aios cloud connect --provider <name>' },
      { description: 'Deploy to cloud', command: 'aios cloud deploy' }
    ]);

    // Save to state if not exists
    if (!state.hasAiosConfig) {
      console.log(chalk.yellow('\n⚠️  No AIOS config found. Run'), chalk.cyan('aios cloud connect'), chalk.yellow('to set up.'));
    }

  } catch (error) {
    spinner.fail('Analysis failed');
    logger.error('Analysis error', error as Error);
    console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}