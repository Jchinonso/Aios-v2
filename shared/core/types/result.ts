/**
 * Result Type - Functional error handling
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for result wrapping
 * - DIP: Depends on abstractions for error handling
 */

export interface IResult<T> {
  readonly isSuccess: boolean;
  readonly isFailure: boolean;
  readonly value: T;
  readonly error: Error;
}

export class Result<T> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: Error
  ) {}

  get isSuccess(): boolean {
    return this._isSuccess;
  }

  get isFailure(): boolean {
    return !this._isSuccess;
  }

  get value(): T {
    if (!this._isSuccess || this._value === undefined) {
      throw new Error('Cannot access value of failed result');
    }
    return this._value;
  }

  get error(): Error {
    if (this._isSuccess) {
      throw new Error('Cannot access error of successful result');
    }
    return this._error!;
  }

  static success<T>(value: T): Result<T> {
    return new Result<T>(true, value, undefined);
  }

  static failure<T>(error: Error): Result<T> {
    return new Result<T>(false, undefined, error);
  }
}
