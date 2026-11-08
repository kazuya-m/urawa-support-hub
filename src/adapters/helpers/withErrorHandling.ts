import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import { AppError } from '@/shared/errors/index.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import type { LogCategory } from '@/shared/logging/types.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

/**
 * ルートごとのエラー応答とログの設定
 */
export interface ErrorHandlingOptions {
  /** ログのメッセージ */
  logMessage: string;
  /** ログのカテゴリ */
  category: LogCategory;
  /** 想定外のエラーのログの severity（AppError は常に error） */
  severity?: 'error' | 'critical';
  /** ログに付けるコンテキスト */
  context?: Record<string, unknown>;
  /** 想定外のエラーのときの応答（エラーメッセージ → [error, details]） */
  unexpectedResponse: (errorMessage: string) => [string, unknown];
}

/**
 * ハンドラの例外をログに出し、500 の JSON 応答に変換する
 * - AppError: [code] message と context を返す
 * - それ以外: options.unexpectedResponse で応答を組み立てる
 */
export async function withErrorHandling(
  handle: () => Promise<Response>,
  options: ErrorHandlingOptions,
): Promise<Response> {
  try {
    return await handle();
  } catch (error) {
    if (error instanceof AppError) {
      CloudLogger.error(options.logMessage, {
        category: options.category,
        context: options.context,
        error: {
          details: error.message,
          recoverable: true,
        },
      });
      return HttpResponseBuilder.error(error.formatMessage(), error.context);
    }

    CloudLogger[options.severity ?? 'error'](options.logMessage, {
      category: options.category,
      context: options.context,
      error: toErrorInfo(error, undefined, false),
    });
    const [message, details] = options.unexpectedResponse(getErrorMessage(error));
    return HttpResponseBuilder.error(message, details);
  }
}
