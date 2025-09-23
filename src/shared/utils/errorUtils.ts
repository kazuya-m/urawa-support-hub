import type { ErrorInfo } from '@/shared/logging/types.ts';

/**
 * エラーオブジェクトから安全にメッセージを取得
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error occurred';
}

/**
 * エラーオブジェクトから安全にスタックトレースを取得（開発環境のみ）
 */
export function getErrorStack(error: unknown): string | undefined {
  // 本番環境ではスタックトレースを返さない
  if (Deno.env.get('NODE_ENV') === 'production') {
    return undefined;
  }

  if (error instanceof Error && error.stack) {
    return error.stack;
  }
  return undefined;
}

/**
 * エラーオブジェクトから詳細情報を取得
 */
export function getErrorDetails(error: unknown): string | Record<string, unknown> | undefined {
  // シンプルなエラーメッセージの場合は詳細不要
  if (error instanceof Error) {
    // 追加のプロパティがある場合のみ詳細を返す
    const errorObj = error as unknown as Record<string, unknown>;
    const details: Record<string, unknown> = {};

    if ('code' in errorObj) details.code = errorObj.code;
    if ('statusCode' in errorObj) details.statusCode = errorObj.statusCode;
    if ('hint' in errorObj) details.hint = errorObj.hint;

    return Object.keys(details).length > 0 ? details : undefined;
  }

  if (error && typeof error === 'object') {
    // Errorインスタンスではないが、オブジェクトの場合
    return error as Record<string, unknown>;
  }

  return undefined;
}

/**
 * CloudLogger用のErrorInfo型に変換
 */
export function toErrorInfo(
  error: unknown,
  code?: string,
  recoverable = true,
): ErrorInfo {
  return {
    code,
    message: getErrorMessage(error),
    details: getErrorDetails(error),
    stack: getErrorStack(error),
    recoverable,
  };
}
