export interface ISuccessResult<T> {
  readonly success: true;
  readonly value: T;
}

export interface IErrorResult {
  readonly success: false;
  readonly error: Error;
}

export type ResultType<T> = ISuccessResult<T> | IErrorResult;

export abstract class Result {

  public static success<T>(value: T): ISuccessResult<T> {
    return new SuccessResult(value);
  }

  public static fail(error: Error): IErrorResult {
    return new ErrorResult(error);
  }

  public static combine<T>(results: ResultType<T>[]): ResultType<T | undefined> {
    for (const result of results) {
      if (result.success === false) {
        return result;
      }
    }
    return Result.success<undefined>(undefined);
  }
}

class SuccessResult<T> implements ISuccessResult<T> {
  public readonly success = true as const;

  public constructor(public readonly value: T) { /* empty */ }
}

class ErrorResult implements IErrorResult {
  public readonly success = false as const;

  public constructor(public readonly error: Error) { /* empty */ }
}
