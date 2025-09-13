import { BaseError } from './BaseError.ts';
import { ErrorCode } from './ErrorCodes.ts';

/**
 * ドメイン層で発生するビジネスルール違反エラー
 */
export class DomainError extends BaseError {
  constructor(
    operation: string,
    message: string,
    code: ErrorCode,
    cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(`[${operation}] ${message}`, code, cause, context);
  }
}
