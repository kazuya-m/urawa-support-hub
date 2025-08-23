/**
 * Domain Types - 共通型定義
 * エンティティや他のドメインオブジェクトで使用される基本型を定義
 */

// NotificationHistory関連の型
export type NotificationStatus = 'pending' | 'sent' | 'failed';

// Ticket関連の型
export interface ScrapedTicketData {
  matchName: string;
  matchDate: string;
  saleDate: string;
  ticketTypes: string[];
  ticketUrl: string;
  venue: string;
}

// 通知メッセージ関連の型
export interface NotificationMessage {
  content: string;
  type: string;
}

// 通知設定関連の型
export interface NotificationTimingConfig {
  /** 表示名 */
  displayName: string;
  /** スケジュール時刻計算ロジック */
  calculateScheduledTime: (saleStartDate: Date) => Date;
  /** 許容時間差（ミリ秒） */
  toleranceMs: number;
  /** 説明（運用・デバッグ用） */
  description: string;
}

// 基本エンティティプロパティ型
export interface BaseEntityProps {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// データベース関連の型
export interface DatabaseConfig {
  url: string;
  apiKey: string;
}

// エラー処理関連の型
export interface ErrorContext {
  operation: string;
  entityType?: string;
  entityId?: string;
  timestamp: Date;
}
