/**
 * @fileoverview Reusable confirmation prompts
 * @description Shared prompts for user confirmations
 * @module node-cli/prompts/confirmation-prompts
 */

import { confirm, input } from '@inquirer/prompts';

/**
 * Simple yes/no confirmation
 *
 * @param message - Confirmation message
 * @param defaultValue - Default value
 * @returns True if user confirmed
 */
export async function confirmAction(message: string, defaultValue = false): Promise<boolean> {
  const confirmed = await confirm({
    message,
    default: defaultValue
  });

  return confirmed;
}

/**
 * Press Enter to continue
 *
 * @param message - Optional custom message
 */
export async function pressEnterToContinue(message = 'Press Enter to continue...'): Promise<void> {
  await input({
    message,
    theme: {
      prefix: ''
    }
  });
}

/**
 * Type-to-confirm for destructive actions
 *
 * @param confirmText - Text user must type to confirm
 * @param message - Optional custom message
 * @returns True if user typed correct confirmation
 */
export async function typeToConfirm(
  confirmText: string,
  message = `Type '${confirmText}' to confirm:`
): Promise<boolean> {
  const userInput = await input({
    message,
    validate: (value: string) => {
      if (value === confirmText) {
        return true;
      }
      return `Please type '${confirmText}' to confirm`;
    }
  });

  return userInput === confirmText;
}
