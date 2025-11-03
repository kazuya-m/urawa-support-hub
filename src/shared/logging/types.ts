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
  CLOUD_TASKS = 'CLOUD_TASKS', // Cloud Tasksタスク管理
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
 * コンテキスト情報（真のコンテキスト: 何を・どこで・どの段階で）
 */
export interface LogContext {
  // 識別子（何を処理しているか）
  ticketId?: string; // チケットID
  taskId?: string; // Cloud TasksのタスクID
  sessionId?: string; // スクレイピングセッションID
  notificationId?: string; // 通知ID

  // 処理段階（どの段階か）
  stage?: string; // 処理段階（例: 'scraping', 'parsing', 'saving', 'scheduling'）
  processingStage?: string; // 旧フィールド名（互換性のため残す）

  // 処理場所（どこで処理しているか）
  queueName?: string; // Cloud Tasksのキュー名
  endpoint?: string; // エンドポイント名
}

/**
 * チケットデータ比較用
 */
export interface TicketComparison {
  id: string;
  matchName?: string;
  matchDate?: string | Date;
  saleStatus?: string | null;
  saleStartDate?: string | Date;
  saleEndDate?: string | Date;
  venue?: string;
  [key: string]: unknown; // その他のフィールド
}

/**
 * 変更検出結果
 */
export interface ChangeDetails {
  field: string;
  before: unknown;
  after: unknown;
}

/**
 * チケット操作の種類
 */
export type TicketOperationType = 'created' | 'updated' | 'unchanged' | 'failed';

/**
 * チケット操作結果
 */
export interface TicketOperationResult {
  id: string;
  matchName?: string;
  matchDate?: string | Date;
  saleStatus?: string | null;
  operation: TicketOperationType;
  changes?: ChangeDetails[]; // 更新時の変更内容
  error?: string; // 失敗時のエラーメッセージ
}

/**
 * チケット操作サマリー
 */
export interface TicketOperationSummary {
  created: number; // 新規作成数
  updated: number; // 更新数
  unchanged: number; // 変更なし数
  failed: number; // 失敗数
  totalScraped: number; // スクレイピング取得総数
}

/**
 * 処理データ（実際の処理内容・結果）
 */
export interface LogData {
  // チケットデータ比較用
  scraped?: TicketComparison; // スクレイピングで取得したデータ
  existing?: TicketComparison; // DBの既存データ
  current?: TicketComparison; // 現在の（更新後の）データ
  updated?: TicketComparison; // 更新後のデータ（currentと同義）
  changes?: Record<string, string> | ChangeDetails[]; // 検出された変更

  // チケット操作結果（スクレイピング後のDB操作詳細）
  ticketOperations?: TicketOperationResult[]; // 各チケットの操作結果（全操作タイプを含む）
  operationSummary?: TicketOperationSummary; // 操作サマリー

  // 大量データ対応
  ticketOperationsLimited?: boolean; // ticketOperationsが制限されているかどうか
  maxTicketOperationsLogged?: number; // ログに記録する最大チケット数

  // API関連
  request?: {
    method?: string;
    url?: string;
    body?: unknown;
    headers?: Record<string, string>;
  };
  response?: {
    status?: number;
    body?: unknown;
    headers?: Record<string, string>;
  };

  // 通知関連
  notifications?: Array<{
    type: string;
    scheduledTime: string | Date;
    status?: string;
  }>;

  // その他
  payload?: unknown; // 汎用ペイロード
  result?: unknown; // 処理結果
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
  unknownPatterns?: number; // 未知パターン数（スクレイピング・パース処理のみ）
  processingTimeMs: number; // 処理時間（ミリ秒）
  successRate?: number; // 成功率 (0.0-1.0)

  // DB操作関連メトリクス
  dbOperations?: {
    created: number; // 新規作成数
    updated: number; // 更新数
    unchanged: number; // 変更なし数
    failed: number; // DB操作失敗数
  };
}

/**
 * エラー情報
 */
export interface ErrorInfo {
  code?: ErrorCode | string; // エラーコード（ErrorCodesの定数を使用）
  message?: string; // エラーメッセージ
  details?: string | Record<string, unknown>; // 詳細情報（文字列またはオブジェクト）
  stack?: string; // スタックトレース（開発環境のみ）
  recoverable?: boolean; // 回復可能かどうか
  name?: string; // エラー名
  grpcCode?: string | number; // gRPCエラーコード
  apiDetails?: unknown; // API詳細情報
  metadata?: unknown; // メタデータ
  statusDetails?: unknown; // ステータス詳細
}

/**
 * メタデータ情報（設定、環境、システム情報）
 */
export interface LogMetadata {
  // 設定情報
  projectId?: string; // プロジェクトID（マスキング済み）
  queueName?: string; // キュー名
  environment?: string; // 環境（development/staging/production）
  serviceAccount?: string; // サービスアカウント（マスキング済み）

  // 通知メタデータ
  notificationType?: string; // 通知タイプ
  maxRetries?: number; // 最大リトライ回数
  retryCount?: number; // 現在のリトライ回数

  // その他のメタデータ
  [key: string]: unknown; // 拡張可能
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
    context?: LogContext; // 真のコンテキスト：何を・どこで・どの段階で
    metadata?: LogMetadata; // メタデータ：設定・環境情報
    data?: LogData; // データ：処理内容・結果
    metrics?: ProcessingMetrics; // メトリクス：パフォーマンス指標
    dataQuality?: DataQualityInfo;
    error?: ErrorInfo;
  };
}
