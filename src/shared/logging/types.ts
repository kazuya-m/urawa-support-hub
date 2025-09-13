/**
 * Cloud Logging用の型定義
 * GCP Cloud Loggingで使用する構造化ログのインターフェース定義
 */

import type { ErrorCode } from './ErrorCodes.ts';

/**
 * ログカテゴリ
 */
export enum LogCategory {
  TICKET_COLLECTION = 'TICKET_COLLECTION', // チケット収集処理（スクレイピング等）
  PARSING = 'PARSING', // データパース処理
  VALIDATION = 'VALIDATION', // データ検証処理
  NOTIFICATION = 'NOTIFICATION', // 通知処理
  DATABASE = 'DATABASE', // データベース処理
  SYSTEM = 'SYSTEM', // システム全般
}

/**
 * ログ重要度レベル
 */
export type LogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * データ品質問題の種類
 */
export type DataQualityIssueType = 'MISSING_FIELD' | 'UNKNOWN_PATTERN' | 'INVALID_FORMAT';

/**
 * コンテキスト情報
 */
export interface LogContext {
  sessionId?: string; // スクレイピングセッションID
  ticketId?: string; // チケットID
  matchName?: string; // 試合名
  ticketUrl?: string; // チケットURL
  processingStage?: string; // 処理段階
  saleStatus?: 'before_sale' | 'on_sale' | 'ended'; // 販売状態
}

/**
 * データ品質情報
 */
export interface DataQualityInfo {
  issueType: DataQualityIssueType; // 問題の種類
  field: string; // 対象フィールド名
  rawValue?: unknown; // 実際の値
  expectedPattern?: string; // 期待されるパターン
}

/**
 * 処理メトリクス
 */
export interface ProcessingMetrics {
  totalProcessed: number; // 総処理数
  successCount: number; // 成功数
  failureCount: number; // 失敗数
  unknownPatterns: number; // 未知パターン数
  processingTimeMs: number; // 処理時間（ミリ秒）
  successRate?: number; // 成功率 (0.0-1.0)
}

/**
 * エラー情報
 */
export interface ErrorInfo {
  code?: ErrorCode; // エラーコード（ErrorCodesの定数を使用）
  details?: string; // 詳細メッセージ
  stack?: string; // スタックトレース（開発環境のみ）
  recoverable: boolean; // 回復可能かどうか
}

/**
 * Cloud Loggingエントリの基本構造
 */
export interface CloudLoggingEntry {
  severity: LogSeverity;
  message: string;
  // Cloud Logging特殊フィールド（自動設定）
  'logging.googleapis.com/labels'?: {
    service?: string; // K_SERVICE環境変数から
    revision?: string; // K_REVISION環境変数から
  };
  // カスタムペイロード
  jsonPayload?: {
    category: LogCategory;
    context?: LogContext;
    dataQuality?: DataQualityInfo;
    metrics?: ProcessingMetrics;
    error?: ErrorInfo;
  };
}
