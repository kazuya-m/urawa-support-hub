import { BaseError } from './BaseError.ts';
import { ErrorCode } from './ErrorCodes.ts';

/**
 * インフラ層で発生する技術的エラーの基底クラス
 */
export class InfrastructureError extends BaseError {
  constructor(
    service: string,
    operation: string,
    message: string,
    code: ErrorCode,
    cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(`[${service}.${operation}] ${message}`, code, cause, context);
  }
}

/**
 * データベース操作エラー
 */
export class DatabaseError extends InfrastructureError {
  constructor(
    repository: string,
    operation: string,
    message: string,
    code: ErrorCode,
    cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(repository, operation, message, code, cause, {
      ...context,
      type: 'DATABASE',
    });
  }

  /**
   * データが見つからないエラーかどうか判定
   */
  public isNotFound(): boolean {
    return this.code === 'DB_NOT_FOUND';
  }
}

/**
 * 外部サービスとの通信エラー
 */
export class ExternalServiceError extends InfrastructureError {
  constructor(
    service: string,
    operation: string,
    message: string,
    code: ErrorCode,
    cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(service, operation, message, code, cause, {
      ...context,
      type: 'EXTERNAL_SERVICE',
    });
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends BaseError {
  constructor(
    field: string,
    message: string,
    code: ErrorCode = 'VALIDATION_ERROR',
    context?: Record<string, unknown>,
  ) {
    super(`[Validation.${field}] ${message}`, code, undefined, context);
  }
}
