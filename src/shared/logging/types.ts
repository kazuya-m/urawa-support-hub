/**
 * Cloud Logging 用の構造化ログの型
 * 型は実行時に消えるので、ここに無いキーを渡しても出力はそのまま残る
 */

import type { ErrorCode } from '@/shared/errors/ErrorCodes.ts';

/**
 * ログカテゴリ（jsonPayload.category。Cloud Logging のフィルタで使う）
 */
export enum LogCategory {
  TICKET_COLLECTION = 'TICKET_COLLECTION', // チケット収集処理（スクレイピング等）
  PARSING = 'PARSING', // データパース処理
  VALIDATION = 'VALIDATION', // データ検証処理
  NOTIFICATION = 'NOTIFICATION', // 通知処理
  SYSTEM = 'SYSTEM', // システム全般
  CLOUD_TASKS = 'CLOUD_TASKS', // Cloud Tasksタスク管理
}

export type LogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * 何を・どの段階で処理しているか
 */
export interface LogContext {
  ticketId?: string;
  taskId?: string; // Cloud TasksのタスクID
  sessionId?: string; // 収集処理1回ごとのID
  notificationId?: string;
  stage?: string; // 処理段階（例: 'parsing', 'upsert', 'enqueue_error'）
}

/**
 * 処理件数と処理時間
 */
export interface ProcessingMetrics {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  unknownPatterns?: number; // 未知パターン数（スクレイピング・パース処理のみ）
  processingTimeMs: number;
  successRate?: number; // 0.0-1.0
}

/**
 * データ品質の問題（スクレイピング結果の欠落・未知の書式）
 */
export interface DataQualityInfo {
  issueType: 'MISSING_FIELD' | 'UNKNOWN_PATTERN';
  field: string;
  rawValue?: unknown;
  expectedPattern?: string;
}

/**
 * エラー情報（jsonPayload.error。code は Cloud Logging のフィルタで使う）
 */
export interface ErrorInfo {
  code?: ErrorCode | string;
  message?: string;
  details?: string | Record<string, unknown>;
  stack?: string; // 本番では出さない
  recoverable?: boolean;
}

/**
 * jsonPayload の中身
 */
export interface LogPayload {
  category: LogCategory;
  context?: LogContext;
  metadata?: Record<string, unknown>; // 設定・環境・通知タイプなど
  data?: Record<string, unknown>; // 処理内容・結果
  metrics?: ProcessingMetrics;
  dataQuality?: DataQualityInfo;
  error?: ErrorInfo;
}

/**
 * Cloud Logging のエントリ（console.log に 1 行の JSON で出す）
 */
export interface CloudLoggingEntry {
  severity: LogSeverity;
  message: string;
  jsonPayload?: LogPayload;
  'logging.googleapis.com/labels'?: {
    service?: string; // K_SERVICE
    revision?: string; // K_REVISION
  };
}
