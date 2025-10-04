/**
 * @fileoverview Console Formatting Utility
 * @description Centralized console output formatting for consistent CLI experience.
 * Eliminates ~150 LOC of duplicated chalk/console formatting across commands.
 *
 * @version 2.0.0
 * @author AIOS Team
 * @since 2.0.0
 */

import chalk from 'chalk';

/**
 * Console formatting utility class
 * Provides consistent styling for CLI output
 */
export class ConsoleFormatter {
  /**
   * Print a section header with emoji and bold text
   *
   * @param emoji - Emoji icon
   * @param title - Section title
   *
   * @example
   * ```typescript
   * formatter.header('📊', 'Project Analysis');
   * // Outputs: 📊 Project Analysis
   * ```
   */
  static header(emoji: string, title: string): void {
    console.log(chalk.blue.bold(`\n${emoji} ${title}\n`));
  }

  /**
   * Print a horizontal separator line (DISABLED for clean UI)
   *
   * @param length - Line length (default: 60)
   * @param char - Character to repeat (default: '═')
   */
  static separator(_length: number = 60, _char: string = '═'): void {
    // Disabled for minimal, conversational UI
    // No visual separators - keep it clean like Claude Code
  }

  /**
   * Print a key-value pair with consistent formatting
   *
   * @param key - Label text
   * @param value - Value text
   * @param valueColor - Chalk color for value (default: 'green')
   *
   * @example
   * ```typescript
   * formatter.keyValue('Language', 'TypeScript');
   * // Outputs: Language: TypeScript (in color)
   * ```
   */
  static keyValue(key: string, value: string, valueColor: 'green' | 'yellow' | 'cyan' | 'blue' = 'green'): void {
    console.log(chalk.bold(`${key}:`), chalk[valueColor](value));
  }

  /**
   * Print a list item with consistent indentation
   *
   * @param label - Item label
   * @param value - Item value
   * @param indent - Indentation spaces (default: 2)
   *
   * @example
   * ```typescript
   * formatter.listItem('Frameworks', 'React, Next.js');
   * // Outputs:   Frameworks: React, Next.js
   * ```
   */
  static listItem(label: string, value: string, indent: number = 2): void {
    const padding = ' '.repeat(indent);
    console.log(chalk.bold(`${padding}${label}:`), value);
  }

  /**
   * Print a success message
   *
   * @param message - Success message
   *
   * @example
   * ```typescript
   * formatter.success('Deployment completed!');
   * // Outputs: ✓ Deployment completed! (in green)
   * ```
   */
  static success(message: string): void {
    console.log(chalk.green(`✓ ${message}`));
  }

  /**
   * Print an error message
   *
   * @param message - Error message
   *
   * @example
   * ```typescript
   * formatter.error('Deployment failed!');
   * // Outputs: ✗ Deployment failed! (in red)
   * ```
   */
  static error(message: string): void {
    console.error(chalk.red(`✗ ${message}`));
  }

  /**
   * Print a warning message
   *
   * @param message - Warning message
   *
   * @example
   * ```typescript
   * formatter.warning('No config found');
   * // Outputs: ⚠️  No config found (in yellow)
   * ```
   */
  static warning(message: string): void {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  /**
   * Print an info message
   *
   * @param message - Info message
   *
   * @example
   * ```typescript
   * formatter.info('Using default settings');
   * // Outputs: ℹ Using default settings (in blue)
   * ```
   */
  static info(message: string): void {
    console.log(chalk.blue(`ℹ ${message}`));
  }

  /**
   * Print a section of next steps
   *
   * @param title - Section title (default: 'Next Steps')
   * @param steps - Array of step objects with description and command
   *
   * @example
   * ```typescript
   * formatter.nextSteps('Next Steps', [
   *   { description: 'Deploy to cloud', command: 'aios cloud deploy' },
   *   { description: 'Check status', command: 'aios cloud status' }
   * ]);
   * ```
   */
  static nextSteps(title: string = 'Next Steps', steps: Array<{ description: string; command: string }>): void {
    console.log(chalk.blue(`\n💡 ${title}:\n`));
    steps.forEach(step => {
      console.log(chalk.gray(`  • ${step.description}:`), chalk.cyan(step.command));
    });
  }

  /**
   * Print a table-like structure with aligned columns
   *
   * @param rows - Array of row objects with label and value
   * @param options - Formatting options
   *
   * @example
   * ```typescript
   * formatter.table([
   *   { label: 'Language', value: 'TypeScript' },
   *   { label: 'Framework', value: 'Next.js' }
   * ]);
   * ```
   */
  static table(
    rows: Array<{ label: string; value: string }>,
    options: { labelWidth?: number; valueColor?: 'green' | 'yellow' | 'cyan' | 'blue' } = {}
  ): void {
    const labelWidth = options.labelWidth || 20;
    const valueColor = options.valueColor || 'green';

    rows.forEach(row => {
      const paddedLabel = row.label.padEnd(labelWidth);
      console.log(chalk.bold(paddedLabel), chalk[valueColor](row.value));
    });
  }

  /**
   * Print a progress indicator
   *
   * @param current - Current step number
   * @param total - Total steps
   * @param message - Progress message
   *
   * @example
   * ```typescript
   * formatter.progress(2, 5, 'Uploading files');
   * // Outputs: [2/5] Uploading files
   * ```
   */
  static progress(current: number, total: number, message: string): void {
    console.log(chalk.cyan(`[${current}/${total}]`), message);
  }

  /**
   * Print a bulleted list
   *
   * @param items - Array of list items
   * @param options - Formatting options
   *
   * @example
   * ```typescript
   * formatter.list(['Install dependencies', 'Build project', 'Deploy'], {
   *   bullet: '→',
   *   color: 'cyan'
   * });
   * ```
   */
  static list(
    items: string[],
    options: { bullet?: string; color?: 'gray' | 'green' | 'yellow' | 'cyan' | 'blue'; indent?: number } = {}
  ): void {
    const bullet = options.bullet || '•';
    const color = options.color || 'gray';
    const indent = ' '.repeat(options.indent || 2);

    items.forEach(item => {
      console.log(chalk[color](`${indent}${bullet} ${item}`));
    });
  }

  /**
   * Print a box with border around text
   *
   * @param text - Text to display in box
   * @param options - Box formatting options
   *
   * @example
   * ```typescript
   * formatter.box('Deployment Successful!', { padding: 2, color: 'green' });
   * ```
   */
  static box(
    text: string,
    options: { padding?: number; color?: 'green' | 'yellow' | 'red' | 'blue' | 'cyan' } = {}
  ): void {
    const padding = options.padding || 1;
    const color = options.color || 'blue';
    const paddingStr = ' '.repeat(padding);
    const width = text.length + (padding * 2);
    const border = '─'.repeat(width + 2);

    console.log(chalk[color](`┌${border}┐`));
    console.log(chalk[color](`│${paddingStr}${text}${paddingStr}│`));
    console.log(chalk[color](`└${border}┘`));
  }

  /**
   * Print a summary section with key metrics
   *
   * @param title - Summary title
   * @param metrics - Object with metric key-value pairs
   *
   * @example
   * ```typescript
   * formatter.summary('Deployment Summary', {
   *   'Duration': '2m 34s',
   *   'Files Uploaded': '156',
   *   'Size': '12.4 MB'
   * });
   * ```
   */
  static summary(title: string, metrics: Record<string, string>): void {
    console.log(chalk.blue.bold(`\n${title}\n`));
    this.separator();
    Object.entries(metrics).forEach(([key, value]) => {
      this.keyValue(key, value, 'cyan');
    });
    this.separator();
  }

  /**
   * Print JSON output with optional formatting
   *
   * @param data - Data to output as JSON
   * @param pretty - Whether to pretty-print (default: true)
   *
   * @example
   * ```typescript
   * formatter.json({ status: 'success', deploymentId: '123' });
   * ```
   */
  static json(data: any, pretty: boolean = true): void {
    console.log(pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data));
  }

  /**
   * Print a status badge
   *
   * @param status - Status text
   * @param type - Badge type (success, error, warning, info)
   *
   * @example
   * ```typescript
   * formatter.badge('READY', 'success');
   * // Outputs: [ READY ] (in green)
   * ```
   */
  static badge(status: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const colors = {
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      info: chalk.blue
    };
    const color = colors[type];
    console.log(color(`[ ${status} ]`));
  }

  /**
   * Print an empty line
   */
  static newline(): void {
    console.log();
  }

  /**
   * Clear the console
   */
  static clear(): void {
    console.clear();
  }

  /**
   * Print a loading message with animated dots
   * Note: For actual spinner animation, use ora directly
   *
   * @param message - Loading message
   *
   * @example
   * ```typescript
   * formatter.loading('Deploying');
   * // Outputs: Deploying... (in cyan)
   * ```
   */
  static loading(message: string): void {
    console.log(chalk.cyan(`${message}...`));
  }
}

/**
 * Convenience export for shorter usage
 */
export const fmt = ConsoleFormatter;
