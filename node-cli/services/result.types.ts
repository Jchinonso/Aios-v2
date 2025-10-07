/**
 * @fileoverview Result Type for Railway-Oriented Programming
 * @description Discriminated union for type-safe error handling
 * @module node-cli/services
 */

/**
 * Result type for operations that can succeed or fail
 *
 * Discriminated union that eliminates need for try-catch in business logic.
 * Based on Railway-Oriented Programming pattern.
 *
 * @template T - Type of success value
 * @template E - Type of error (defaults to Error)
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number> {
 *   if (b === 0) {
 *     return {
 *       isSuccess: false,
 *       isFailure: true,
 *       error: new Error('Division by zero')
 *     };
 *   }
 *   return {
 *     isSuccess: true,
 *     isFailure: false,
 *     value: a / b
 *   };
 * }
 *
 * const result = divide(10, 2);
 * if (result.isSuccess) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export type Result<T, E = Error> =
  | {
      /** Operation succeeded */
      readonly isSuccess: true;
      /** Operation failed (always false when success) */
      readonly isFailure: false;
      /** Success value */
      readonly value: T;
      /** Error (undefined when success) */
      readonly error?: undefined;
    }
  | {
      /** Operation succeeded (always false when failure) */
      readonly isSuccess: false;
      /** Operation failed */
      readonly isFailure: true;
      /** Success value (undefined when failure) */
      readonly value?: undefined;
      /** Error details */
      readonly error: E;
    };

/**
 * Type guard to check if result is success
 *
 * @param result - Result to check
 * @returns True if result is success
 *
 * @example
 * ```typescript
 * const result = await loadData();
 * if (isSuccess(result)) {
 *   // result.value is available (type-safe)
 *   processData(result.value);
 * }
 * ```
 */
export function isSuccess<T, E = Error>(
  result: Result<T, E>
): result is Extract<Result<T, E>, { isSuccess: true }> {
  return result.isSuccess;
}

/**
 * Type guard to check if result is failure
 *
 * @param result - Result to check
 * @returns True if result is failure
 *
 * @example
 * ```typescript
 * const result = await saveData(data);
 * if (isFailure(result)) {
 *   // result.error is available (type-safe)
 *   logger.error('Save failed', result.error);
 * }
 * ```
 */
export function isFailure<T, E = Error>(
  result: Result<T, E>
): result is Extract<Result<T, E>, { isFailure: true }> {
  return result.isFailure;
}
