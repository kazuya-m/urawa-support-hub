import { ErrorCode } from './ErrorCodes.ts';

/**
 * アプリケーションのエラー
 * code・cause・context を持ち、cause の stack を自身の stack に連結する
 */
export class AppError extends Error {
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    public readonly code: ErrorCode,
    public override readonly cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
    this.context = context;

    if (cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }

  /**
   * [エラーコード] メッセージ
   */
  public formatMessage(): string {
    return `[${this.code}] ${this.message}`;
  }
}

/**
 * データベース操作のエラー
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
