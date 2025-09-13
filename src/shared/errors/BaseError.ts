/**
 * アプリケーション全体の基底エラークラス
 * すべてのカスタムエラーはこのクラスを継承する
 */
export abstract class BaseError extends Error {
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    public readonly code: string,
    public override readonly cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = context;

    // スタックトレースを保持
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

  /**
   * 構造化ログ用のオブジェクトを生成
   */
  public toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}
