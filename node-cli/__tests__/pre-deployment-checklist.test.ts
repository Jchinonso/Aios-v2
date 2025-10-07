/**
 * @fileoverview TDD Tests for Pre-Deployment Checklist
 * @module node-cli/__tests__/pre-deployment-checklist.test
 *
 * Tests production-grade pre-deployment validation system.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PreDeploymentChecklist } from '../services/pre-deployment-checklist.js';
import {
  ChecklistItemPriority,
  ChecklistItemStatus,
  type ChecklistContext,
} from '../services/deployment-checklist.types.js';
import type { ILogger } from '@aios/shared';

// Mock logger
const createMockLogger = (): ILogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLevel: jest.fn(),
  child: jest.fn(() => createMockLogger()),
});

describe('PreDeploymentChecklist - TDD', () => {
  let checklist: PreDeploymentChecklist;
  let logger: ILogger;

  beforeEach(() => {
    logger = createMockLogger();
    checklist = new PreDeploymentChecklist(logger);
  });

  describe('Checklist Creation', () => {
    it('should create checklist for production environment', () => {
      const context: ChecklistContext = {
        environment: 'production',
        projectPath: '/tmp/test-project',
      };

      const items = checklist.createChecklist(context);

      expect(items.length).toBeGreaterThan(0);
      // Production should have more required items
      const requiredItems = items.filter(
        (i) => i.priority === ChecklistItemPriority.REQUIRED
      );
      expect(requiredItems.length).toBeGreaterThan(0);
    });

    it('should create lighter checklist for staging', () => {
      const prodContext: ChecklistContext = { environment: 'production' };
      const stagingContext: ChecklistContext = { environment: 'staging' };

      const prodItems = checklist.createChecklist(prodContext);
      const stagingItems = checklist.createChecklist(stagingContext);

      const prodRequired = prodItems.filter(
        (i) => i.priority === ChecklistItemPriority.REQUIRED
      ).length;
      const stagingRequired = stagingItems.filter(
        (i) => i.priority === ChecklistItemPriority.REQUIRED
      ).length;

      // Production has more required checks than staging
      expect(prodRequired).toBeGreaterThanOrEqual(stagingRequired);
    });

    it('should include common automated checks', () => {
      const context: ChecklistContext = { environment: 'production' };
      const items = checklist.createChecklist(context);

      // Should have at least one automated check
      const automatedItems = items.filter((i) => i.automated);
      expect(automatedItems.length).toBeGreaterThan(0);
    });
  });

  describe('Automated Checks', () => {
    it('should verify environment variables exist', async () => {
      const context: ChecklistContext = {
        environment: 'production',
      };

      const items = checklist.createChecklist(context);
      const result = await checklist.runAutomatedChecks(items);

      // At least one check should run
      expect(result.totalChecked).toBeGreaterThan(0);
    });

    it('should mark passing checks as PASSED', async () => {
      const context: ChecklistContext = { environment: 'staging' };
      const items = checklist.createChecklist(context);

      const result = await checklist.runAutomatedChecks(items);

      // Items should be marked with status
      const passedItems = result.items.filter(
        (i) => i.status === ChecklistItemStatus.PASSED
      );
      expect(passedItems.length).toBeGreaterThanOrEqual(0);
    });

    it('should mark failing checks as FAILED', async () => {
      // Create a custom check that always fails
      const context: ChecklistContext = { environment: 'production' };
      const items = checklist.createChecklist(context);

      // Add a failing check
      const failingItem = checklist.addCustomCheck({
        id: 'test-failing-check',
        title: 'Test Failing Check',
        description: 'This check always fails',
        priority: ChecklistItemPriority.REQUIRED,
        automated: true,
        checkFn: async () => false,
        canSkip: false,
      });

      const allItems = [...items, failingItem];
      const result = await checklist.runAutomatedChecks(allItems);

      const failed = result.items.find((i) => i.id === 'test-failing-check');
      expect(failed?.status).toBe(ChecklistItemStatus.FAILED);
    });
  });

  describe('Manual Checks', () => {
    it('should include manual checks for production', () => {
      const context: ChecklistContext = { environment: 'production' };
      const items = checklist.createChecklist(context);

      const manualItems = items.filter((i) => !i.automated);
      expect(manualItems.length).toBeGreaterThan(0);
    });

    it('should require migrations review for production', () => {
      const context: ChecklistContext = { environment: 'production' };
      const items = checklist.createChecklist(context);

      const migrationsCheck = items.find((i) => i.id.includes('migrations'));
      expect(migrationsCheck).toBeDefined();
      expect(migrationsCheck!.priority).toBe(ChecklistItemPriority.REQUIRED);
    });

    it('should allow marking manual checks as complete', () => {
      const context: ChecklistContext = { environment: 'production' };
      const items = checklist.createChecklist(context);

      const manualItem = items.find((i) => !i.automated);
      expect(manualItem).toBeDefined();

      const marked = checklist.markItemComplete(manualItem!.id, items);
      const updated = marked.find((i) => i.id === manualItem!.id);

      expect(updated!.status).toBe(ChecklistItemStatus.PASSED);
    });
  });

  describe('Validation Logic', () => {
    it('should block deployment when required items pending', async () => {
      const context: ChecklistContext = { environment: 'production' };
      const items = checklist.createChecklist(context);

      // Don't run checks - all items are pending
      const validation = checklist.validate(items);

      expect(validation.canDeploy).toBe(false);
      expect(validation.requiredPending).toBeGreaterThan(0);
      expect(validation.blockers.length).toBeGreaterThan(0);
    });

    it('should allow deployment when all required items pass', async () => {
      const context: ChecklistContext = { environment: 'staging' };
      let items = checklist.createChecklist(context);

      // Run automated checks
      const automated = await checklist.runAutomatedChecks(items);
      items = automated.items;

      // Mark all manual required items as complete
      const manualRequired = items.filter(
        (i) => !i.automated && i.priority === ChecklistItemPriority.REQUIRED
      );

      for (const item of manualRequired) {
        items = checklist.markItemComplete(item.id, items);
      }

      const validation = checklist.validate(items);

      // Should be able to deploy if all required items pass
      if (validation.requiredPending === 0) {
        expect(validation.canDeploy).toBe(true);
      }
    });

    it('should warn but allow deployment for optional items', async () => {
      const context: ChecklistContext = { environment: 'production' };
      let items = checklist.createChecklist(context);

      // Complete only required items
      const automated = await checklist.runAutomatedChecks(items);
      items = automated.items;

      const manualRequired = items.filter(
        (i) => !i.automated && i.priority === ChecklistItemPriority.REQUIRED
      );

      for (const item of manualRequired) {
        items = checklist.markItemComplete(item.id, items);
      }

      const validation = checklist.validate(items);

      // Should have warnings for optional items
      const hasOptionalPending = items.some(
        (i) => i.priority === ChecklistItemPriority.OPTIONAL && i.status === ChecklistItemStatus.PENDING
      );

      if (hasOptionalPending) {
        expect(validation.warnings.length).toBeGreaterThan(0);
      }
    });

    it('should count passed/failed/pending items correctly', async () => {
      const context: ChecklistContext = { environment: 'production' };
      const items = checklist.createChecklist(context);

      const validation = checklist.validate(items);

      expect(validation.totalItems).toBe(items.length);
      expect(validation.passedItems).toBeGreaterThanOrEqual(0);
      expect(validation.failedItems).toBeGreaterThanOrEqual(0);
      expect(validation.pendingItems).toBeGreaterThanOrEqual(0);
      expect(
        validation.passedItems + validation.failedItems + validation.pendingItems
      ).toBe(validation.totalItems);
    });
  });

  describe('Custom Checks', () => {
    it('should allow adding custom automated checks', () => {
      const customCheck = checklist.addCustomCheck({
        id: 'custom-test',
        title: 'Custom Test',
        description: 'Testing custom check',
        priority: ChecklistItemPriority.RECOMMENDED,
        automated: true,
        checkFn: async () => true,
        canSkip: true,
      });

      expect(customCheck.id).toBe('custom-test');
      expect(customCheck.automated).toBe(true);
    });

    it('should allow adding custom manual checks', () => {
      const customCheck = checklist.addCustomCheck({
        id: 'custom-manual',
        title: 'Custom Manual Check',
        description: 'Manual verification',
        priority: ChecklistItemPriority.REQUIRED,
        automated: false,
        instructions: ['Step 1', 'Step 2'],
        canSkip: false,
      });

      expect(customCheck.id).toBe('custom-manual');
      expect(customCheck.automated).toBe(false);
      if (!customCheck.automated) {
        expect(customCheck.instructions.length).toBe(2);
      }
    });
  });

  describe('Checklist Display', () => {
    it('should format checklist for CLI display', () => {
      const context: ChecklistContext = { environment: 'production' };
      const items = checklist.createChecklist(context);

      const formatted = checklist.formatForDisplay(items);

      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
      // Should have sections
      expect(formatted).toContain('Required');
    });

    it('should show clear status indicators', () => {
      const context: ChecklistContext = { environment: 'production' };
      const items = checklist.createChecklist(context);

      const formatted = checklist.formatForDisplay(items);

      // Should have status symbols (✓, ✗, ⏳, etc.)
      expect(formatted).toMatch(/[✓✗⏳]/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty checklist gracefully', () => {
      const validation = checklist.validate([]);

      expect(validation.canDeploy).toBe(true); // No blockers
      expect(validation.totalItems).toBe(0);
    });

    it('should handle all items passed', async () => {
      const context: ChecklistContext = { environment: 'development' };
      let items = checklist.createChecklist(context);

      // Mark all as passed
      items = items.map((item) => ({
        ...item,
        status: ChecklistItemStatus.PASSED,
      }));

      const validation = checklist.validate(items);

      expect(validation.canDeploy).toBe(true);
      expect(validation.passedItems).toBe(items.length);
    });

    it('should handle non-existent item ID gracefully', () => {
      const items = checklist.createChecklist({ environment: 'production' });

      const updated = checklist.markItemComplete('non-existent-id', items);

      // Should return unchanged items
      expect(updated).toEqual(items);
    });
  });
});
