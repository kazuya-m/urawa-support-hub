import type { ErrorCode } from './ErrorCodes.ts';

/**
 * アプリケーション共通のエラークラス
 *
 * - `code`: ErrorCodes の値
 * - `cause`: 元のエラー（stack に `Caused by:` として連結される）
 * - `context`: レスポンスやログに添える付加情報
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
    this.name = this.constructor.name;
    this.context = context;

    if (cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }

  /**
   * エラーメッセージをフォーマット
   * [エラーコード] メッセージ
   */
  public formatMessage(): string {
    return `[${this.code}] ${this.message}`;
  }
}
