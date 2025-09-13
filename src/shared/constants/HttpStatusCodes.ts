/**
 * HTTPステータスコード定数定義
 * アプリケーション全体で使用するHTTPステータスコードを統一管理
 */

export const HttpStatusCodes = {
  // 2xx Success
  OK: 200, // リクエスト成功
  CREATED: 201, // リソース作成成功
  ACCEPTED: 202, // リクエスト受理済み
  NO_CONTENT: 204, // 成功、コンテンツなし

  // 3xx Redirection
  MOVED_PERMANENTLY: 301, // 永続的なリダイレクト
  FOUND: 302, // 一時的なリダイレクト
  NOT_MODIFIED: 304, // 変更なし

  // 4xx Client Error
  BAD_REQUEST: 400, // 不正なリクエスト
  UNAUTHORIZED: 401, // 認証が必要
  FORBIDDEN: 403, // アクセス禁止
  NOT_FOUND: 404, // リソースが見つからない
  METHOD_NOT_ALLOWED: 405, // メソッドが許可されていない
  CONFLICT: 409, // リソースの競合
  UNPROCESSABLE_ENTITY: 422, // バリデーションエラー
  TOO_MANY_REQUESTS: 429, // レート制限

  // 5xx Server Error
  INTERNAL_SERVER_ERROR: 500, // サーバー内部エラー
  NOT_IMPLEMENTED: 501, // 機能が実装されていない
  BAD_GATEWAY: 502, // 不正なゲートウェイ
  SERVICE_UNAVAILABLE: 503, // サービス利用不可
  GATEWAY_TIMEOUT: 504, // ゲートウェイタイムアウト
} as const;

export type HttpStatusCode = typeof HttpStatusCodes[keyof typeof HttpStatusCodes];
