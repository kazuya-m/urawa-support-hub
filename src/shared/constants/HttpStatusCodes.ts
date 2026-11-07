/**
 * HTTPステータスコード定数定義
 * アプリケーション全体で使用するHTTPステータスコードを統一管理
 */

export const HttpStatusCodes = {
  // 2xx Success
  OK: 200, // リクエスト成功

  // 4xx Client Error
  BAD_REQUEST: 400, // 不正なリクエスト

  // 5xx Server Error
  INTERNAL_SERVER_ERROR: 500, // サーバー内部エラー
  SERVICE_UNAVAILABLE: 503, // サービス利用不可
} as const;

export type HttpStatusCode = typeof HttpStatusCodes[keyof typeof HttpStatusCodes];
