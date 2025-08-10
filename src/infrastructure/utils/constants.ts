/**
 * データベーステーブル名定数
 */
export const TABLE_NAMES = {
  TICKETS: 'tickets',
  NOTIFICATION_HISTORY: 'notification_history'
} as const;

/**
 * エラーコード定数
 */
export const ERROR_CODES = {
  NOT_FOUND: 'PGRST116' // Postgrest "not found" error code
} as const;