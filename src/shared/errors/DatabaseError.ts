import { AppError } from './AppError.ts';
import type { ErrorCode } from './ErrorCodes.ts';

/**
 * データベース操作エラー
 * message は `[repository.operation] message`、context には `type: 'DATABASE'` を付与する
 */
export class DatabaseError extends AppError {
  constructor(
    repository: string,
    operation: string,
    message: string,
    code: ErrorCode,
    cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(`[${repository}.${operation}] ${message}`, code, cause, {
      ...context,
      type: 'DATABASE',
    });
  }
}
