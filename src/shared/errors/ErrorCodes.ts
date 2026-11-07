/**
 * エラーコード定数（アプリケーション全体で唯一の定義）
 *
 * - エラークラス（`AppError` / `DatabaseError`）の `code` と、
 *   CloudLogger の構造化ログ `error.code` の両方で使う
 * - 値はログ・レスポンスに出るため、既存の値を変更しないこと
 */
export const ErrorCodes = {
  // データベース操作（DatabaseError.code。database-error-handler で Supabase エラーから変換）
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_SAVE_ERROR: 'DB_SAVE_ERROR',
  DB_FETCH_ERROR: 'DB_FETCH_ERROR',
  DB_UPDATE_ERROR: 'DB_UPDATE_ERROR',
  DB_DELETE_ERROR: 'DB_DELETE_ERROR',
  DB_NOT_FOUND: 'DB_NOT_FOUND',

  // UseCase 実行（AppError.code）
  USECASE_EXECUTION_FAILED: 'USECASE_EXECUTION_FAILED',
  TICKET_COLLECTION_FAILED: 'TICKET_COLLECTION_FAILED',

  // スクレイピング
  SCRAPING_SERVICE_ERROR: 'SCR_005', // 個別スクレイピングサービスエラー

  // データパース - ERROR（ビジネス機能阻害）
  PARSE_MATCH_DATE_UNKNOWN_FORMAT: 'PRS_001', // 試合日時の未知フォーマット
  PARSE_SALE_START_DATE_MISSING_BEFORE_SALE: 'PRS_002', // 販売前なのに販売開始日が取得できない（通知不可）

  // データパース - WARNING（補完情報の欠落、処理は継続可能）
  PARSE_VENUE_INFO_MISSING: 'PRS_W003', // 会場情報が取得できない
  PARSE_COMPETITION_MISSING: 'PRS_W004', // 大会名が取得できない

  // 通知
  NOTIFICATION_FAILED: 'NOT_003', // 通知処理失敗
  TICKET_SUMMARY_ERROR: 'NOT_004', // チケットサマリー処理失敗
  MAX_RETRIES_EXCEEDED: 'NOT_005', // 最大リトライ回数超過

  // Cloud Tasks
  CLOUD_TASKS_ERROR: 'TASKS_001', // Cloud Tasks一般エラー
  PERMISSION_DENIED: 'TASKS_403', // 権限不足エラー（403）

  // ブラウザ
  BROWSER_CLOSE_ERROR: 'BRW_001', // ブラウザクローズエラー
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
