/**
 * @fileoverview Pre-Deployment Checklist System
 * @module node-cli/services/pre-deployment-checklist
 *
 * Production-grade deployment validation with automated and manual checks.
 *
 * Features:
 * - Environment-specific checklist generation
 * - Automated verification (tests, env vars, etc.)
 * - Manual confirmation tracking
 * - Validation with clear blocking/warning distinction
 * - CLI-friendly formatting
 *
 * @example
 * ```typescript
 * const checklist = new PreDeploymentChecklist(logger);
 * let items = checklist.createChecklist({ environment: 'production' });
 *
 * // Run automated checks
 * const result = await checklist.runAutomatedChecks(items);
 * items = result.items;
 *
 * // Validate
 * const validation = checklist.validate(items);
 * if (!validation.canDeploy) {
 *   console.log(validation.blockers.join('\n'));
 * }
 * ```
 */

import type { ILogger } from '@aios/shared';
import {
  ChecklistItemPriority,
  ChecklistItemStatus,
  type DeploymentChecklistItem,
  type AutomatedChecklistItem,
  type ManualChecklistItem,
  type ChecklistContext,
  type ChecklistValidationResult,
  isAutomatedItem,
} from './deployment-checklist.types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Result of running automated checks
 */
interface AutomatedCheckResult {
  readonly items: readonly DeploymentChecklistItem[];
  readonly totalChecked: number;
  readonly passed: number;
  readonly failed: number;
}

/**
 * Pre-Deployment Checklist Manager
 *
 * Creates and validates deployment checklists with automated and manual verification.
 */
export class PreDeploymentChecklist {
  constructor(private readonly logger: ILogger) {
    this.logger.debug('PreDeploymentChecklist initialized');
  }

  /**
   * Create environment-specific checklist
   *
   * Production has more stringent requirements than staging/development.
   *
   * @param context - Deployment context
   * @returns Array of checklist items
   *
   * @example
   * ```typescript
   * const items = checklist.createChecklist({
   *   environment: 'production',
   *   projectPath: '/app',
   * });
   * ```
   */
  public createChecklist(context: ChecklistContext): DeploymentChecklistItem[] {
    const items: DeploymentChecklistItem[] = [];
    const isProduction = context.environment === 'production';

    // Automated: Environment variables check
    items.push({
      id: 'env-vars-set',
      title: 'Environment variables configured',
      description: 'Required environment variables are set',
      priority: ChecklistItemPriority.REQUIRED,
      status: ChecklistItemStatus.PENDING,
      automated: true,
      canSkip: false,
      checkFn: async () => {
        // Simple check: NODE_ENV should be set for production
        if (isProduction) {
          return process.env['NODE_ENV'] === 'production';
        }
        return true;
      },
    });

    // Manual: Database migrations review (production only)
    if (isProduction) {
      items.push({
        id: 'migrations-reviewed',
        title: 'Database migrations reviewed',
        description: 'All pending migrations have been reviewed and tested',
        priority: ChecklistItemPriority.REQUIRED,
        status: ChecklistItemStatus.PENDING,
        automated: false,
        canSkip: false,
        instructions: [
          'Review all pending migrations',
          'Verify migrations are reversible',
          'Test migrations on staging data',
          'Confirm no breaking schema changes',
        ],
      });

      // Manual: Rollback plan
      items.push({
        id: 'rollback-plan',
        title: 'Rollback plan documented',
        description: 'Clear plan exists for rolling back if deployment fails',
        priority: ChecklistItemPriority.REQUIRED,
        status: ChecklistItemStatus.PENDING,
        automated: false,
        canSkip: false,
        instructions: [
          'Document rollback steps',
          'Identify rollback triggers',
          'Test rollback procedure',
          'Communicate plan to team',
        ],
      });
    }

    // Recommended: Monitoring configured
    items.push({
      id: 'monitoring-configured',
      title: 'Monitoring and alerts configured',
      description: 'Application monitoring and alerting are set up',
      priority: isProduction ? ChecklistItemPriority.REQUIRED : ChecklistItemPriority.RECOMMENDED,
      status: ChecklistItemStatus.PENDING,
      automated: false,
      canSkip: !isProduction,
      instructions: [
        'Verify error tracking is active',
        'Configure performance monitoring',
        'Set up alerting thresholds',
        'Test alert delivery',
      ],
    });

    // Optional: Load testing (production only)
    if (isProduction) {
      items.push({
        id: 'load-testing',
        title: 'Load testing completed',
        description: 'Application has been load tested under expected traffic',
        priority: ChecklistItemPriority.OPTIONAL,
        status: ChecklistItemStatus.PENDING,
        automated: false,
        canSkip: true,
        instructions: [
          'Define expected traffic patterns',
          'Run load tests',
          'Analyze bottlenecks',
          'Verify scaling behavior',
        ],
      });
    }

    return items;
  }

  /**
   * Run all automated checks
   *
   * Executes checkFn for all automated items and updates their status.
   *
   * @param items - Checklist items
   * @returns Updated items with check results
   *
   * @example
   * ```typescript
   * const result = await checklist.runAutomatedChecks(items);
   * console.log(`${result.passed}/${result.totalChecked} checks passed`);
   * ```
   */
  public async runAutomatedChecks(
    items: readonly DeploymentChecklistItem[]
  ): Promise<AutomatedCheckResult> {
    this.logger.info('Running automated checks', {
      totalItems: items.length,
    });

    const updatedItems: DeploymentChecklistItem[] = [];
    let totalChecked = 0;
    let passed = 0;
    let failed = 0;

    for (const item of items) {
      if (isAutomatedItem(item)) {
        totalChecked++;

        try {
          this.logger.debug('Running automated check', { id: item.id });
          const result = await item.checkFn();

          updatedItems.push({
            ...item,
            status: result ? ChecklistItemStatus.PASSED : ChecklistItemStatus.FAILED,
          });

          if (result) {
            passed++;
          } else {
            failed++;
            this.logger.warn('Automated check failed', {
              id: item.id,
              title: item.title,
            });
          }
        } catch (error) {
          // Automated check threw error - mark as failed
          updatedItems.push({
            ...item,
            status: ChecklistItemStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
          failed++;
          this.logger.error(`Automated check error for ${item.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        // Manual item - unchanged
        updatedItems.push(item);
      }
    }

    this.logger.info('Automated checks complete', {
      totalChecked,
      passed,
      failed,
    });

    return {
      items: updatedItems,
      totalChecked,
      passed,
      failed,
    };
  }

  /**
   * Mark a manual checklist item as complete
   *
   * @param itemId - ID of item to mark complete
   * @param items - Current checklist items
   * @returns Updated items
   *
   * @example
   * ```typescript
   * items = checklist.markItemComplete('migrations-reviewed', items);
   * ```
   */
  public markItemComplete(
    itemId: string,
    items: readonly DeploymentChecklistItem[]
  ): DeploymentChecklistItem[] {
    return items.map((item) => {
      if (item.id === itemId) {
        this.logger.info('Marking checklist item complete', {
          id: itemId,
          title: item.title,
        });
        return {
          ...item,
          status: ChecklistItemStatus.PASSED,
        };
      }
      return item;
    });
  }

  /**
   * Validate checklist and determine if deployment can proceed
   *
   * @param items - Checklist items to validate
   * @returns Validation result
   *
   * @example
   * ```typescript
   * const validation = checklist.validate(items);
   * if (!validation.canDeploy) {
   *   console.error('Deployment blocked:', validation.blockers);
   * }
   * ```
   */
  public validate(items: readonly DeploymentChecklistItem[]): ChecklistValidationResult {
    const passedItems = items.filter((i) => i.status === ChecklistItemStatus.PASSED).length;
    const failedItems = items.filter((i) => i.status === ChecklistItemStatus.FAILED).length;
    const pendingItems = items.filter((i) => i.status === ChecklistItemStatus.PENDING).length;

    const requiredPending = items.filter(
      (i) => i.priority === ChecklistItemPriority.REQUIRED && i.status === ChecklistItemStatus.PENDING
    ).length;

    const requiredFailed = items.filter(
      (i) => i.priority === ChecklistItemPriority.REQUIRED && i.status === ChecklistItemStatus.FAILED
    );

    const blockers: string[] = [];
    const warnings: string[] = [];

    // Blockers: Required items not passed
    if (requiredPending > 0) {
      blockers.push(`${requiredPending} required item(s) not completed`);
    }

    if (requiredFailed.length > 0) {
      blockers.push(...requiredFailed.map((i) => `Required check failed: ${i.title}`));
    }

    // Warnings: Recommended/optional items not passed
    const recommendedPending = items.filter(
      (i) => i.priority === ChecklistItemPriority.RECOMMENDED && i.status === ChecklistItemStatus.PENDING
    ).length;

    const optionalPending = items.filter(
      (i) => i.priority === ChecklistItemPriority.OPTIONAL && i.status === ChecklistItemStatus.PENDING
    ).length;

    if (recommendedPending > 0) {
      warnings.push(`${recommendedPending} recommended item(s) not completed`);
    }

    if (optionalPending > 0) {
      warnings.push(`${optionalPending} optional item(s) not completed`);
    }

    const canDeploy = blockers.length === 0;

    this.logger.info('Checklist validation complete', {
      canDeploy,
      passedItems,
      failedItems,
      pendingItems,
      blockers: blockers.length,
      warnings: warnings.length,
    });

    return {
      canDeploy,
      totalItems: items.length,
      passedItems,
      failedItems,
      pendingItems,
      requiredPending,
      blockers,
      warnings,
    };
  }

  /**
   * Add a custom checklist item
   *
   * Allows extending the checklist with project-specific checks.
   *
   * @param item - Custom item definition
   * @returns Created checklist item
   *
   * @example
   * ```typescript
   * checklist.addCustomCheck({
   *   id: 'custom-security-scan',
   *   title: 'Security scan passed',
   *   description: 'Run security scanner',
   *   priority: ChecklistItemPriority.REQUIRED,
   *   automated: true,
   *   checkFn: async () => runSecurityScan(),
   *   canSkip: false,
   * });
   * ```
   */
  public addCustomCheck(
    item: Omit<AutomatedChecklistItem, 'status'> | Omit<ManualChecklistItem, 'status'>
  ): DeploymentChecklistItem {
    this.logger.debug('Adding custom checklist item', { id: item.id });

    return {
      ...item,
      status: ChecklistItemStatus.PENDING,
    } as DeploymentChecklistItem;
  }

  /**
   * Format checklist for CLI display
   *
   * Generates human-readable checklist with status indicators.
   *
   * @param items - Checklist items to format
   * @returns Formatted string
   *
   * @example
   * ```typescript
   * console.log(checklist.formatForDisplay(items));
   * // Output:
   * // Pre-Deployment Checklist
   * //
   * // Required:
   * // ✓ Environment variables configured
   * // ✗ Database migrations reviewed
   * // ⏳ Rollback plan documented
   * ```
   */
  public formatForDisplay(items: readonly DeploymentChecklistItem[]): string {
    const sections: string[] = ['Pre-Deployment Checklist\n'];

    // Group by priority
    const required = items.filter((i) => i.priority === ChecklistItemPriority.REQUIRED);
    const recommended = items.filter((i) => i.priority === ChecklistItemPriority.RECOMMENDED);
    const optional = items.filter((i) => i.priority === ChecklistItemPriority.OPTIONAL);

    const formatItem = (item: DeploymentChecklistItem): string => {
      const statusIcon = {
        [ChecklistItemStatus.PASSED]: '✓',
        [ChecklistItemStatus.FAILED]: '✗',
        [ChecklistItemStatus.PENDING]: '⏳',
        [ChecklistItemStatus.CHECKING]: '🔄',
        [ChecklistItemStatus.SKIPPED]: '⊘',
      }[item.status];

      const autoLabel = item.automated ? ' (auto)' : ' (manual)';
      return `${statusIcon} ${item.title}${autoLabel}`;
    };

    if (required.length > 0) {
      sections.push('Required:');
      sections.push(...required.map(formatItem));
      sections.push('');
    }

    if (recommended.length > 0) {
      sections.push('Recommended:');
      sections.push(...recommended.map(formatItem));
      sections.push('');
    }

    if (optional.length > 0) {
      sections.push('Optional:');
      sections.push(...optional.map(formatItem));
    }

    return sections.join('\n');
  }
}
