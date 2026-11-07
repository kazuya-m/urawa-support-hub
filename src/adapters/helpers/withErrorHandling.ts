import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import { AppError } from '@/shared/errors/index.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';

/**
 * ルートごとのエラーハンドリング設定
 */
export interface ErrorHandlingContext {
  /** AppError ログのメッセージ `UseCase error in ${operation}` に使う */
  operation: string;
  /** AppError ログの category */
  category: LogCategory;
  /** AppError 以外の例外のログ出力と応答（ルートごとに形式が異なる） */
  onUnexpected: (error: unknown) => Response;
}

/**
 * Controller の処理を実行し、例外をログ出力 + エラーレスポンスに変換する
 * - AppError（DatabaseError を含む）: `formatMessage()` と `context` を 500 で返す
 * - それ以外: `ctx.onUnexpected` に委ねる
 */
export async function withErrorHandling(
  handler: () => Promise<Response>,
  ctx: ErrorHandlingContext,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof AppError) {
      CloudLogger.error(`UseCase error in ${ctx.operation}`, {
        category: ctx.category,
        error: {
          details: error.message,
          recoverable: true,
        },
      });
      return HttpResponseBuilder.error(
        error.formatMessage(),
        error.context,
      );
    }

    return ctx.onUnexpected(error);
  }
}
