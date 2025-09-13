/**
 * エラーコード定数定義
 * GCP Cloud Loggingで使用する構造化ログ用のエラーコード
 */

export const ErrorCodes = {
  // スクレイピング関連 - 具体的な失敗原因
  SCRAPING_SITE_UNREACHABLE: 'SCR_001', // サイトにアクセスできない
  SCRAPING_TIMEOUT: 'SCR_002', // タイムアウト
  SCRAPING_PAGE_STRUCTURE_CHANGED: 'SCR_003', // ページ構造変更
  SCRAPING_NO_TICKETS_FOUND: 'SCR_004', // チケット情報が見つからない

  // データパース関連 - ERROR（ビジネス機能阻害）
  PARSE_MATCH_DATE_UNKNOWN_FORMAT: 'PRS_001', // 試合日時の未知フォーマット
  PARSE_SALE_START_DATE_MISSING_BEFORE_SALE: 'PRS_002', // 販売前なのに販売開始日が取得できない（通知不可）
  PARSE_TICKET_URL_INVALID: 'PRS_003', // チケットURL不正
  PARSE_MATCH_NAME_EMPTY: 'PRS_004', // 試合名が空

  // データパース関連 - WARNING（補完情報の欠落、処理は継続可能）
  PARSE_SALE_END_DATE_MISSING_ON_SALE: 'PRS_W001', // 販売中なのに販売終了日が取得できない
  PARSE_SALE_STATUS_UNKNOWN: 'PRS_W002', // 販売状態が判定できない
  PARSE_VENUE_INFO_MISSING: 'PRS_W003', // 会場情報が取得できない
  PARSE_COMPETITION_MISSING: 'PRS_W004', // 大会名が取得できない
  PARSE_TEAM_INFO_INCOMPLETE: 'PRS_W005', // ホーム/アウェイチーム情報が不完全

  // データベース関連 - 操作別
  DB_CONNECTION_FAILED: 'DB_001', // 接続失敗
  DB_SAVE_TICKET_FAILED: 'DB_002', // チケット保存失敗
  DB_QUERY_TIMEOUT: 'DB_003', // クエリタイムアウト

  // 通知関連 - ビジネスロジック
  NOTIFICATION_LINE_API_ERROR: 'NOT_001', // LINE API エラー
  NOTIFICATION_SCHEDULE_FAILED: 'NOT_002', // スケジュール失敗

  // システム関連 - 重大障害
  SYS_TOTAL_FAILURE: 'SYS_001', // システム全体停止
  SYS_RESOURCE_EXHAUSTED: 'SYS_002', // リソース枯渇
  SYS_UNEXPECTED_ERROR: 'SYS_003', // 予期しない例外
  EXT_ALL_SERVICES_DOWN: 'EXT_001', // 全外部サービス停止
  DB_SYSTEM_DOWN: 'DB_999', // データベースシステム完全停止
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
