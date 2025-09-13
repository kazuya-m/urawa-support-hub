import { BaseError } from './BaseError.ts';
import { ErrorCode } from './ErrorCodes.ts';

/**
 * アプリケーション層（UseCase）で発生するエラー
 */
export class ApplicationError extends BaseError {
  constructor(
    useCase: string,
    message: string,
    code: ErrorCode,
    cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(`[${useCase}] ${message}`, code, cause, context);
  }
}
