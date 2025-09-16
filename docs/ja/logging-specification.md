# Logging Specification and Implementation Guide

## 概要

本ドキュメントは、urawa-support-hubプロジェクトにおけるログ出力の仕様と実装ガイドを定義します。 GCP
Cloud Loggingを活用し、構造化ログによるデータ品質監視とアラート通知を実現します。

## アーキテクチャ概要

```
Cloud Scheduler → Cloud Run → Cloud Logging → Cloud Monitoring
                      ↓                           ↓
                 Structured Logs            Alert Policies
                      ↓                           ↓
                 Log Explorer              Discord Webhook
```

## 基本方針

1. **30日保持ポリシー**: ログは30日間保持し、それ以降は自動削除（課金回避）
2. **構造化ログ**: JSON形式で出力し、Cloud Loggingで自動解析
3. **適切なログレベル**: 本番環境ではINFO以上のみ出力
4. **最小限の情報**: 必要最小限の情報のみログに記録
5. **GCP完結**: Supabaseのerror_logsテーブルは使用せず、GCPで完結

## ログレベル定義

Cloud Loggingの標準severityレベルを使用：

| レベル   | 用途                   | 出力環境     | 例                                     |
| -------- | ---------------------- | ------------ | -------------------------------------- |
| DEBUG    | 開発時の詳細情報       | 開発環境のみ | パターンマッチングの詳細、中間処理結果 |
| INFO     | 正常な処理情報         | 全環境       | 処理完了、統計情報                     |
| WARNING  | 警告（処理は継続）     | 全環境       | 未知パターン検出、フォールバック処理   |
| ERROR    | エラー（個別失敗）     | 全環境       | 必須フィールド欠落、パース失敗         |
| CRITICAL | 重大エラー（全体停止） | 全環境       | スクレイピング完全失敗、システムエラー |

※ NOTICE, ALERT, EMERGENCYは使用しない（シンプルさのため）

## ログ構造仕様

### 基本構造

```typescript
interface CloudLoggingEntry {
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
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
```

### カテゴリ定義

```typescript
enum LogCategory {
  TICKET_COLLECTION = 'TICKET_COLLECTION', // チケット収集処理（スクレイピング等）
  PARSING = 'PARSING', // データパース処理
  VALIDATION = 'VALIDATION', // データ検証処理
  NOTIFICATION = 'NOTIFICATION', // 通知処理
  DATABASE = 'DATABASE', // データベース処理
  SYSTEM = 'SYSTEM', // システム全般
}
```

### データ構造定義

```typescript
// コンテキスト情報
interface LogContext {
  sessionId?: string; // スクレイピングセッションID
  ticketId?: string; // チケットID
  matchName?: string; // 試合名
  ticketUrl?: string; // チケットURL
  processingStage?: string; // 処理段階
}

// データ品質情報
interface DataQualityInfo {
  issueType: 'MISSING_FIELD' | 'UNKNOWN_PATTERN' | 'INVALID_FORMAT';
  field: string; // 対象フィールド名
  rawValue?: any; // 実際の値
  expectedPattern?: string; // 期待されるパターン
}

// 処理メトリクス
interface ProcessingMetrics {
  totalProcessed: number; // 総処理数
  successCount: number; // 成功数
  failureCount: number; // 失敗数
  unknownPatterns: number; // 未知パターン数
  processingTimeMs: number; // 処理時間（ミリ秒）
  successRate?: number; // 成功率 (0.0-1.0)
}

// エラー情報
interface ErrorInfo {
  code?: string; // エラーコード（ErrorCodesの定数を使用）
  details?: string; // 詳細メッセージ
  stack?: string; // スタックトレース（開発環境のみ）
  recoverable: boolean; // 回復可能かどうか
}
```

## エラーコード定数定義

```typescript
// src/shared/logging/ErrorCodes.ts
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
```

## ログレベル出力タイミング一覧

### 🔍 DEBUG (開発環境のみ)

| タイミング             | 状態     | ログ内容                               | エラーコード |
| ---------------------- | -------- | -------------------------------------- | ------------ |
| スクレイピング開始     | 処理開始 | "Starting ticket scraping session"     | -            |
| データ抽出中           | 中間処理 | "Extracted raw data from page element" | -            |
| パターンマッチング成功 | 正常処理 | "Date pattern matched successfully"    | -            |
| フォールバック実行     | 代替処理 | "Using fallback parsing method"        | -            |

### ℹ️ INFO (全環境)

| タイミング           | 状態     | ログ内容                                         | エラーコード |
| -------------------- | -------- | ------------------------------------------------ | ------------ |
| スクレイピング完了   | 正常完了 | "Ticket collection completed"                    | -            |
| チケット保存完了     | 正常完了 | "Ticket saved successfully"                      | -            |
| 通知スケジュール完了 | 正常完了 | "Notification scheduled successfully"            | -            |
| 日次実行完了         | 正常完了 | "Daily execution completed" (集計メトリクス含む) | -            |

### ⚠️ WARNING (全環境)

| タイミング               | 状態           | ログ内容                                   | エラーコード                          |
| ------------------------ | -------------- | ------------------------------------------ | ------------------------------------- |
| データ形式異常           | データ品質問題 | "Unexpected ticket URL format"             | `PARSE_TICKET_URL_INVALID`            |
| **ビジネスロジック関連** |                |                                            |                                       |
| 販売中で終了日欠落       | 情報不完全     | "Sale end date missing for on-sale ticket" | `PARSE_SALE_END_DATE_MISSING_ON_SALE` |
| 販売状態不明             | 状況判定不可   | "Sale status could not be determined"      | `PARSE_SALE_STATUS_UNKNOWN`           |
| 会場情報欠落             | 補完情報不足   | "Venue information is missing"             | `PARSE_VENUE_INFO_MISSING`            |
| 大会名欠落               | 補完情報不足   | "Competition name is missing"              | `PARSE_COMPETITION_MISSING`           |
| チーム情報不完全         | 補完情報不足   | "Home/Away team information incomplete"    | `PARSE_TEAM_INFO_INCOMPLETE`          |
| **システム処理関連**     |                |                                            |                                       |
| 外部API遅延              | 性能問題       | "External API response slow"               | -                                     |
| リトライ実行             | 一時的問題     | "Retrying failed operation"                | -                                     |
| フォールバック使用       | 代替処理       | "Using fallback date parsing"              | -                                     |

### ❌ ERROR (全環境)

| タイミング             | 状態             | ログ内容                                      | エラーコード                                |
| ---------------------- | ---------------- | --------------------------------------------- | ------------------------------------------- |
| **スクレイピング関連** |                  |                                               |                                             |
| サイトアクセス失敗     | 接続不可         | "Unable to reach scraping target site"        | `SCRAPING_SITE_UNREACHABLE`                 |
| タイムアウト発生       | 処理超過         | "Scraping operation timed out"                | `SCRAPING_TIMEOUT`                          |
| ページ構造変更         | 構造異常         | "Page structure appears to have changed"      | `SCRAPING_PAGE_STRUCTURE_CHANGED`           |
| チケット情報なし       | データなし       | "No ticket information found on page"         | `SCRAPING_NO_TICKETS_FOUND`                 |
| **データパース関連**   |                  |                                               |                                             |
| 販売前で販売開始日欠落 | ビジネス機能阻害 | "Sale start date missing for pre-sale ticket" | `PARSE_SALE_START_DATE_MISSING_BEFORE_SALE` |
| 試合名が空             | データ異常       | "Match name is empty or invalid"              | `PARSE_MATCH_NAME_EMPTY`                    |
| **データベース関連**   |                  |                                               |                                             |
| 接続失敗               | DB接続不可       | "Database connection failed"                  | `DB_CONNECTION_FAILED`                      |
| 保存失敗               | DB操作失敗       | "Failed to save ticket data"                  | `DB_SAVE_TICKET_FAILED`                     |
| クエリタイムアウト     | DB性能問題       | "Database query timed out"                    | `DB_QUERY_TIMEOUT`                          |
| **通知関連**           |                  |                                               |                                             |
| LINE API エラー        | 外部API失敗      | "LINE messaging API error"                    | `NOTIFICATION_LINE_API_ERROR`               |
| 通知スケジュール失敗   | 内部処理失敗     | "Failed to schedule notification"             | `NOTIFICATION_SCHEDULE_FAILED`              |

### 🚨 CRITICAL (全環境 + Discord即時通知)

| タイミング               | 状態           | ログ内容                                 | エラーコード             |
| ------------------------ | -------------- | ---------------------------------------- | ------------------------ |
| システム全体停止         | 完全失敗       | "Ticket collection system failure"       | `SYS_TOTAL_FAILURE`      |
| データベース完全停止     | DB全停止       | "Database system completely unavailable" | `DB_SYSTEM_DOWN`         |
| 複数外部API同時失敗      | 外部依存全停止 | "All external services unavailable"      | `EXT_ALL_SERVICES_DOWN`  |
| メモリ不足・リソース枯渇 | リソース不足   | "System resources exhausted"             | `SYS_RESOURCE_EXHAUSTED` |
| 予期しない例外           | 不明エラー     | "Unexpected system error occurred"       | `SYS_UNEXPECTED_ERROR`   |

## ログ出力基準と制限

### 🎯 ログ出力の判断基準

- **DEBUG**: 開発者がコードの動作を追跡するための詳細情報
- **INFO**: 正常な処理の完了や重要な状態変更
- **WARNING**: 処理は継続するが注意が必要な状況
- **ERROR**: 個別処理の失敗（システム全体は継続）
- **CRITICAL**: システム全体に影響する重大な問題（即時対応必要）

### 🔄 ログ出力頻度制限

- **DEBUG/INFO**: 制限なし
- **WARNING**: 同一エラーコードで5分間に最大3回
- **ERROR**: 同一エラーコードで5分間に最大5回
- **CRITICAL**: 制限なし（ただしDiscord通知は5分間に1回）

### 📊 Log-based Metrics対象

- **INFO**: 成功数カウント用
- **WARNING**: データ品質監視用
- **ERROR以上**: エラー率計算用
- **CRITICAL**: 即時アラート用

## CloudLoggerクラス実装

```typescript
// src/shared/logging/CloudLogger.ts
export class CloudLogger {
  private static formatEntry(
    severity: string,
    message: string,
    payload?: any,
  ): CloudLoggingEntry {
    const entry: CloudLoggingEntry = {
      severity,
      message,
    };

    if (payload) {
      entry.jsonPayload = payload;
    }

    // Cloud Runで自動的に設定される環境変数を利用
    if (Deno.env.get('K_SERVICE')) {
      entry['logging.googleapis.com/labels'] = {
        service: Deno.env.get('K_SERVICE') || '',
        revision: Deno.env.get('K_REVISION') || '',
      };
    }

    return entry;
  }

  private static shouldLog(severity: string): boolean {
    const env = Deno.env.get('ENVIRONMENT') || 'production';
    if (env === 'production' && severity === 'DEBUG') {
      return false;
    }
    return true;
  }

  private static log(severity: string, message: string, payload?: any): void {
    if (!this.shouldLog(severity)) return;

    const entry = this.formatEntry(severity, message, payload);

    // Cloud Runで自動的に収集される
    console.log(JSON.stringify(entry));
  }

  static debug(message: string, payload?: any): void {
    this.log('DEBUG', message, payload);
  }

  static info(message: string, payload?: any): void {
    this.log('INFO', message, payload);
  }

  static warning(message: string, payload?: any): void {
    this.log('WARNING', message, payload);
  }

  static error(message: string, payload?: any): void {
    this.log('ERROR', message, payload);
  }

  static critical(message: string, payload?: any): void {
    this.log('CRITICAL', message, payload);
  }
}
```

## 実装パターン

### 1. スクレイピングデータ品質監視（JLeagueDataParser）

**自動記録されるもの（ログ不要）**:

- Cloud Scheduler → Cloud Run のリクエスト/レスポンス
- Cloud Tasks のエンキュー/実行状況
- HTTP ステータスコード、処理時間
- リトライ回数、エラー発生

**ログが必要なもの**:

- データ品質問題の詳細
- ビジネスロジックレベルのエラー

```typescript
// src/infrastructure/scraping/jleague/parser/JLeagueDataParser.ts
private parseMatchDateTime(rawData: JLeagueRawTicketData, referenceDate: Date): Date {
  if (rawData.enhancedMatchDateTime) {
    try {
      const result = this.parseEnhancedDateTime(rawData.enhancedMatchDateTime, referenceDate);
      return result;
    } catch (error) {
      // 未知のパターン検出（ERROR） - これのみログ必要
      CloudLogger.error('Unknown date pattern detected', {
        category: 'PARSING',
        dataQuality: {
          issueType: 'UNKNOWN_PATTERN',
          field: 'matchDateTime',
          rawValue: rawData.enhancedMatchDateTime,
          expectedPattern: 'YYYY/MM/DD HH:MM'
        },
        context: {
          matchName: rawData.matchName,
          ticketUrl: rawData.ticketUrl
        },
        error: {
          code: ErrorCodes.PARSE_MATCH_DATE_UNKNOWN_FORMAT,
          details: `Unexpected date format: ${rawData.enhancedMatchDateTime}`,
          recoverable: true
        }
      });
      throw error;
    }
  }
  
  // 必須データ不足（ERROR）
  CloudLogger.error('Sale start date missing for pre-sale ticket', {
    category: 'VALIDATION',
    dataQuality: {
      issueType: 'MISSING_FIELD',
      field: 'saleStartDate'
    },
    context: {
      matchName: rawData.matchName,
      ticketUrl: rawData.ticketUrl,
      saleStatus: 'before_sale'
    },
    error: {
      code: ErrorCodes.PARSE_SALE_START_DATE_MISSING_BEFORE_SALE,
      details: 'Sale start date is required for pre-sale tickets to enable notifications',
      recoverable: false
    }
  });
  throw new Error('Required field saleStartDate is missing for pre-sale ticket');
}
```

### 2. 重大エラー時のDiscord通知

**Cloud Monitoring経由の自動通知**（コード変更不要）:

- CRITICALログ検出時にDiscord自動通知
- Cloud Runの自動ログで外部APIエラーも把握可能

```
アプリ → CloudLogger.critical() → Cloud Logging → Alert Policy → Discord
```

### 3. 集計メトリクス（TicketCollectionUseCase）

**ログが必要なもの**:

- 処理結果の統計（Log-based Metrics用）
- データ品質の異常検知

```typescript
// src/application/usecases/TicketCollectionUseCase.ts
async execute(): Promise<void> {
  try {
    const tickets = await this.scrapingService.collectTickets();
    // 個別の検証処理は各パーサーでログ出力済み
    
    // 集計メトリクスのみログ出力（Log-based Metrics用）
    CloudLogger.info('Ticket collection completed', {
      category: 'TICKET_COLLECTION',
      metrics: {
        totalProcessed: tickets.length,
        processingTimeMs: Date.now() - startTime
      }
    });
    
  } catch (error) {
    // システムレベルの失敗のみログ
    CloudLogger.critical('Ticket collection system failure', {
      category: 'SYSTEM',
      error: {
        code: ErrorCodes.SYS_TOTAL_FAILURE,
        details: error.message,
        recoverable: false
      }
    });
    throw error;
  }
}
```

## Log-based Metricsの設定

### カスタムメトリクス定義

```yaml
# データ品質エラー数
name: custom.googleapis.com/scraping/data_quality_errors
description: Count of data quality errors detected
filter: |
  resource.type="cloud_run_revision"
  jsonPayload.dataQuality.issueType="UNKNOWN_PATTERN" OR jsonPayload.dataQuality.issueType="MISSING_FIELD"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: '1'
labelExtractors:
  field: EXTRACT(jsonPayload.dataQuality.field)
  service: EXTRACT(resource.labels.service_name)

# チケット収集処理数
name: custom.googleapis.com/ticket_collection/processed_count
description: Count of processed tickets
filter: |
  resource.type="cloud_run_revision"
  jsonPayload.category="TICKET_COLLECTION"
  jsonPayload.metrics.totalProcessed>=0
metricDescriptor:
  metricKind: GAUGE
  valueType: INT64
valueExtractor: EXTRACT(jsonPayload.metrics.totalProcessed)
labelExtractors:
  service: EXTRACT(resource.labels.service_name)

# エラー発生数
name: custom.googleapis.com/application/errors
description: Count of application errors
filter: |
  resource.type="cloud_run_revision"
  severity>="ERROR"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  unit: '1'
```

## アラートポリシー設定

### Cloud Monitoring Alert Policies

```yaml
# 重大エラーアラート（即座）
displayName: 'Critical Scraping Error'
conditions:
  - displayName: 'Log severity is CRITICAL'
    conditionMatchedLog:
      filter: |
        resource.type="cloud_run_revision"
        severity="CRITICAL"
notificationChannels:
  - discord_webhook_channel
alertStrategy:
  notificationRateLimit:
    period: 300s # 5分間に1回まで

# データ品質エラーアラート
displayName: 'Data Quality Error Detected'
conditions:
  - displayName: 'Data quality errors > 0'
    conditionThreshold:
      filter: |
        metric.type="custom.googleapis.com/scraping/data_quality_errors"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: 0s
notificationChannels:
  - discord_webhook_channel

# エラー多発アラート
displayName: 'High Error Rate'
conditions:
  - displayName: 'Errors > 5 in 5 minutes'
    conditionThreshold:
      filter: |
        metric.type="custom.googleapis.com/application/errors"
        resource.type="cloud_run_revision"
      comparison: COMPARISON_GT
      thresholdValue: 5
      duration: 300s
notificationChannels:
  - discord_webhook_channel
```

## Discord 通知の仕組み

**Cloud Monitoring → Discord Webhookへ直接通知**

Cloud Monitoringの通知チャネルとして、Discord WebhookのURLを直接設定。 カスタムCloud
Functionsは不要で、GCPの標準機能で自動通知されます。

### 設定手順

1. **Discord Webhook URL取得**：Discordサーバーでwebhook作成
2. **GCP通知チャネル作成**：Cloud MonitoringでWebhook通知チャネル設定
3. **Alert Policy設定**：各アラートポリシーに通知チャネル紐付け

**コード実装は一切不要**です。

## ログ検索クエリ例

### Cloud Logging クエリ

#### 📊 **基本的なデータ品質エラー検索**

```sql
-- データ品質エラーの検索
resource.type="cloud_run_revision"
jsonPayload.dataQuality.issueType=("UNKNOWN_PATTERN" OR "MISSING_FIELD")
timestamp>="2025-09-13T00:00:00Z"

-- 本日のエラー率計算
resource.type="cloud_run_revision"
severity>="ERROR"
timestamp>=timestamp_trunc(@timestamp, DAY)
| stats count() as error_count by bin(timestamp, 1h)

-- 特定フィールドの問題追跡
resource.type="cloud_run_revision"
jsonPayload.dataQuality.field="saleStartDate"
jsonPayload.dataQuality.issueType="MISSING_FIELD"
```

#### 🎫 **チケット収集の詳細ログ検索（Issue #108対応）**

```sql
-- 個別チケット処理結果の検索
resource.type="cloud_run_revision"
jsonPayload.category="TICKET_COLLECTION"
(message:"Ticket created" OR message:"Ticket updated" OR message:"Ticket unchanged")
timestamp>=timestamp_trunc(@timestamp, DAY)

-- 特定試合の処理履歴追跡
resource.type="cloud_run_revision"
jsonPayload.context.matchName:"横浜F・マリノス戦"

-- 特定チケットIDの処理履歴
resource.type="cloud_run_revision"
jsonPayload.context.ticketId="urawa-vs-yokohama-20250315"

-- 新規作成されたチケットのみ
resource.type="cloud_run_revision"
message:"Ticket created"
timestamp>=timestamp_trunc(@timestamp, DAY)

-- 更新されたチケットのみ
resource.type="cloud_run_revision"
message:"Ticket updated"
timestamp>=timestamp_trunc(@timestamp, DAY)

-- 変更がなかったチケット
resource.type="cloud_run_revision"
message:"Ticket unchanged"
timestamp>=timestamp_trunc(@timestamp, DAY)
```

#### 🔔 **通知スケジューリングログ検索**

```sql
-- 通知スケジューリング成功ログ
resource.type="cloud_run_revision"
jsonPayload.category="NOTIFICATION"
message:"Notifications scheduled"
timestamp>=timestamp_trunc(@timestamp, DAY)

-- 特定試合の通知スケジューリング履歴
resource.type="cloud_run_revision"
jsonPayload.category="NOTIFICATION"
jsonPayload.context.matchName:"横浜F・マリノス戦"

-- 通知関連エラー
resource.type="cloud_run_revision"
jsonPayload.category="NOTIFICATION"
severity>="ERROR"

-- NotificationSchedulerServiceのエラー
resource.type="cloud_run_revision"
jsonPayload.category="NOTIFICATION"
(message:"Failed to schedule" OR message:"dequeue operations failed")
```

#### 📈 **収集処理統計とメトリクス検索**

```sql
-- チケット収集完了サマリー
resource.type="cloud_run_revision"
message:"Ticket collection completed"
timestamp>=timestamp_trunc(@timestamp, DAY)

-- 収集処理の成功率分析
resource.type="cloud_run_revision"
jsonPayload.category="TICKET_COLLECTION"
jsonPayload.metrics.successRate>=0
timestamp>=timestamp_trunc(@timestamp, WEEK)

-- 処理時間のパフォーマンス分析
resource.type="cloud_run_revision"
jsonPayload.metrics.processingTimeMs>0
timestamp>=timestamp_trunc(@timestamp, DAY)

-- 処理件数の日次推移
resource.type="cloud_run_revision"
jsonPayload.metrics.totalProcessed>0
| stats avg(jsonPayload.metrics.totalProcessed) as avg_processed by bin(timestamp, 1d)
```

#### 🔍 **デバッグと運用監視用クエリ**

```sql
-- セッション別の処理追跡
resource.type="cloud_run_revision"
jsonPayload.context.sessionId="ea7fc161-bfe0-4286-aa04-f7bd852e7f72"

-- 今日の処理結果サマリー（件数別）
resource.type="cloud_run_revision"
jsonPayload.category="TICKET_COLLECTION"
(message:"Ticket created" OR message:"Ticket updated" OR message:"Ticket unchanged")
timestamp>=timestamp_trunc(@timestamp, DAY)
| stats count() by message

-- エラー発生チケットの特定
resource.type="cloud_run_revision"
jsonPayload.category="TICKET_COLLECTION"
severity="ERROR"
jsonPayload.context.ticketId!=""

-- 通知スケジューリング成功率
resource.type="cloud_run_revision"
jsonPayload.category="NOTIFICATION"
(message:"Notifications scheduled" OR severity="ERROR")
timestamp>=timestamp_trunc(@timestamp, DAY)
| stats count() by if(severity="ERROR", "failed", "success")
```

#### ⚠️ **アラートとトラブルシューティング用**

```sql
-- 重大エラーの即座検知
resource.type="cloud_run_revision"
severity="CRITICAL"
timestamp>=timestamp_sub(@timestamp, interval 5 minute)

-- データ品質問題の傾向分析
resource.type="cloud_run_revision"
jsonPayload.dataQuality.issueType!=""
timestamp>=timestamp_trunc(@timestamp, WEEK)
| stats count() by jsonPayload.dataQuality.issueType, bin(timestamp, 1d)

-- 回復不可能なエラーの監視
resource.type="cloud_run_revision"
jsonPayload.error.recoverable=false
severity>="ERROR"
```

### 🎯 **実用的な運用クエリ例**

#### **日次レポート作成用**

```sql
-- 本日の収集処理サマリー
resource.type="cloud_run_revision"
jsonPayload.category="TICKET_COLLECTION"
timestamp>=timestamp_trunc(@timestamp, DAY)
| stats
    sum(jsonPayload.metrics.totalProcessed) as total,
    avg(jsonPayload.metrics.processingTimeMs) as avg_time_ms,
    min(jsonPayload.metrics.successRate) as min_success_rate
```

#### **問題調査用**

```sql
-- 特定時間帯のエラー集中調査
resource.type="cloud_run_revision"
severity>="ERROR"
timestamp>="2025-09-17T12:00:00Z"
timestamp<="2025-09-17T13:00:00Z"
| sort by timestamp asc
```

#### **パフォーマンス分析用**

```sql
-- 処理時間が長い実行の特定
resource.type="cloud_run_revision"
jsonPayload.metrics.processingTimeMs>5000
timestamp>=timestamp_trunc(@timestamp, WEEK)
| sort by jsonPayload.metrics.processingTimeMs desc
```

## 環境変数設定

```env
# ログレベル設定
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL

# 環境設定
ENVIRONMENT=production  # development, staging, production

# Cloud Run自動設定（設定不要）
# K_SERVICE=ticket-scraping
# K_REVISION=ticket-scraping-00001-abc
```

## セキュリティとプライバシー

### ログに含めてはいけない情報

- 個人情報（氏名、メールアドレス、電話番号）
- 認証情報（パスワード、APIキー、トークン）
- 支払い情報
- 内部システムの詳細なパス情報

### ログに含めて良い情報

- チケット公開情報（試合名、日時、会場）
- 処理統計（件数、成功率）
- エラーメッセージ（スタックトレースは開発環境のみ）
- セッションID（追跡用のUUID）

## コスト見積もり

### 月間使用量予測

```
【Cloud Logging】
- 1日1回スクレイピング実行
- 1回あたり約100KB のログ
- 月間: 100KB × 30日 = 3MB
→ 完全無料（50GB枠の0.006%）

【Cloud Monitoring】
- Log-based Metrics: 3個
- データポイント: 1日30個
- 月間: 約1MB
→ 完全無料（150MB枠の0.7%）
```

### 月間コスト

```
Cloud Logging:    $0（50GB無料枠内）
Cloud Monitoring: $0（150MB無料枠内）
━━━━━━━━━━━━━━━━━━━━━━━━
合計: $0/月
```

## 実装チェックリスト

### Phase 1: 基盤実装

- [ ] CloudLoggerクラスの実装
- [ ] 型定義ファイルの作成
- [ ] 環境変数の設定

### Phase 2: 既存コードへの組み込み（2ファイルのみ）

- [ ] JLeagueDataParserへのデータ品質ログ追加
- [ ] TicketCollectionUseCaseへのメトリクス集計

### Phase 3: GCP設定（コード変更なし）

- [ ] Discord Webhook通知チャネル作成
- [ ] Log-based Metricsの作成
- [ ] Alert Policiesの設定（CRITICALログ → Discord通知）
- [ ] アラート通知テスト

### Phase 4: テストと調整

- [ ] ローカル環境でのログ出力確認
- [ ] Cloud Runでの動作確認
- [ ] データ品質エラーの発火テスト
- [ ] Discord通知の確認
- [ ] Log-based Metricsの動作確認

## トラブルシューティング

### ログが出力されない

1. 環境変数`ENVIRONMENT`を確認
2. Cloud Runのコンソール出力を確認
3. `console.log`が正しくJSON文字列を出力しているか確認

### アラートが発火しない

1. Log-based Metricsが正しく作成されているか確認
2. Alert Policyのフィルタ条件を確認
3. 通知チャネルが正しく設定されているか確認

### Discord通知が届かない

1. Webhook URLが正しいか確認
2. Cloud Functionsのログを確認
3. Discord Webhookの設定を確認

## まとめ

この仕様により：

### 🎯 **実装範囲の大幅削減**

- **コード変更**: たった2ファイル（JLeagueDataParser + TicketCollectionUseCase）
- **外部API・main.ts**: 変更不要（Cloud Runが自動記録）
- **Discord通知**: Cloud Monitoring経由で自動化

### 📊 **効果的な監視**

1. **データ品質**: 未知パターン・必須フィールド不足を即座に検知
2. **自動通知**: CRITICALエラー時にDiscord自動通知
3. **コスト効率**: 30日保持で無料枠内に収める
4. **運用性**: GCP設定のみで24時間監視

### 🚀 **技術的メリット**

- **構造化ログ**: Log-based Metricsで自動集計
- **自動記録活用**: Cloud Runの標準機能を最大限利用
- **スケーラブル**: GCP管理サービスで自動スケール
- **保守性**: 最小限のコード変更で最大効果

すべてGCP標準機能で実現し、追加インフラは不要です。
