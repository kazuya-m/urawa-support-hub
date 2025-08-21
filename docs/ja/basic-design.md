# 基本設計書

## システムアーキテクチャ

### ハイブリッドアーキテクチャ実装（GCP + Supabase）

```
┌─────────────────────────────────────────────────────────┐
│                Google Cloud Platform                    │
├─────────────────────────────────────────────────────────┤
│  Cloud Scheduler  →  Cloud Run  →  Cloud Tasks         │
│       (Trigger)       (Scraping)    (Task Queue)        │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      Supabase                          │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL  ←→  PostgREST API  ←→  Edge Functions     │
│   (Storage)       (CRUD Layer)      (Notifications)     │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                External Services                        │
├─────────────────────────────────────────────────────────┤
│         LINE API         Discord Webhook               │
└─────────────────────────────────────────────────────────┘
```

### 1.2 クリーンアーキテクチャ構成

```
┌─────────────────────────────────────┐
│     Edge Functions (Interface)     │  ← daily-check, notification-check
├─────────────────────────────────────┤
│      Application Services          │  ← ScrapingService, NotificationService
├─────────────────────────────────────┤
│        Domain Layer                │  ← Entities: Ticket, NotificationHistory, NotificationConfig
│                                     │    Interfaces: TicketRepository, NotificationRepository
├─────────────────────────────────────┤
│     Infrastructure Layer           │  ← RepositoryImpl, Supabase Client, API Clients
├─────────────────────────────────────┤
│         External Services          │  ← Supabase, LINE API, Discord Webhook, Playwright
└─────────────────────────────────────┘
```

### 1.3 通知アーキテクチャ

```
[エラー発生] → [ErrorNotificationRouter]
    ├── info: データベースログのみ
    ├── warning: Discord通知 + データベースログ
    ├── error: Discord通知 + データベースログ + コンソールログ
    └── critical: Discord通知 + データベースログ + スタックトレース + コンソールログ

[チケット情報] → [LINE通知] → [ユーザーグループチャット]

[システム状態] → [Discord通知] → [開発者チャンネル]
```

## 2. 処理フロー

### 2.1 日次チケット監視（daily-check）

```
1. シーズンオフチェック（12月スキップ）
2. エラー通知システム初期化（Discord + DatabaseLogger）
3. 浦和レッズAWAYタブアクセス（フォールバック対応）
4. アウェイチケット情報抽出（エラーハンドリング強化）
5. 既存データとの差分比較
6. 新規・更新データの保存（個別エラーキャッチ）
7. 通知スケジュール自動作成
8. 古いデータのクリーンアップ
9. システム健康状態レポート送信（Discord）
10. 処理結果サマリー（LINE通知）
```

### 2.2 通知送信（notification-check）

```
1. 送信予定通知の検索（5分間隔実行）
2. 通知メッセージ生成（エラーハンドリング）
3. LINE Messaging API経由送信
4. 送信結果記録（成功・失敗）
5. エラー時の再試行処理（最大3回）
6. 失敗時のDiscord通知（重要度別）
```

### 2.3 エラー監視・通知（継続的）

```
1. 全Edge Function実行時のエラーキャッチ
2. エラーレベル判定（info/warning/error/critical）
3. Discord Webhook経由でリアルタイム通知
4. エラーログのデータベース永続化
5. システム健康状態の定期レポート
6. 重大エラー時のスタックトレース送信
```

## 3. ドメインモデル

### 3.1 ドメインエンティティ

#### Ticket（チケット情報）

- **プロパティ**: id, matchName, matchDate, homeTeam, awayTeam, saleStartDate, venue, ticketTypes,
  ticketUrl
- **ビジネスロジック**: shouldSendNotification, isOnSale, shouldReceiveNotification
- **バリデーション**: URL検証、日付整合性チェック、必須項目検証

#### NotificationHistory（通知履歴）

- **プロパティ**: id, ticketId, notificationType, status, scheduledAt, sentAt, errorMessage
- **ビジネスロジック**: canSend, isExpired, canRetry, markAsSent, markAsFailed
- **状態管理**: pending, sent, failed, expired

#### NotificationConfig（通知設定）

- **設定駆動設計**: NOTIFICATION_TIMING_CONFIG による外部化
- **通知タイプ**: day_before, hour_before, minutes_before
- **計算ロジック**: calculateScheduledTime, 許容時間差管理

### 3.2 データベーススキーマ（tickets）

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_name TEXT NOT NULL,           -- 試合名
  match_date TIMESTAMPTZ NOT NULL,    -- 試合日時
  home_team TEXT NOT NULL,            -- ホームチーム
  away_team TEXT NOT NULL,            -- アウェイチーム
  sale_start_date TIMESTAMPTZ NOT NULL, -- 販売開始日時
  sale_start_time TEXT,               -- 販売開始時刻詳細
  venue TEXT NOT NULL,                -- 会場名
  ticket_types TEXT[] NOT NULL,       -- チケット種別配列
  ticket_url TEXT NOT NULL,           -- 購入URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 通知履歴（notification_history）

```sql
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (
    notification_type IN ('day_before', 'hour_before', 'minutes_before')
  ),
  scheduled_at TIMESTAMPTZ NOT NULL,  -- 通知予定時刻
  sent_at TIMESTAMPTZ,                -- 実際の送信時刻
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'failed')
  ),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ticket_id, notification_type)
);
```

### 3.3 エラーログ（error_logs）

```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  function_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 システムメトリクス（system_metrics）

```sql
CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  
  -- パフォーマンス用インデックス
  INDEX idx_system_metrics_name_timestamp (metric_name, metric_timestamp)
);
```

## 4. 外部サービス変更対応設計

### 4.1 リポジトリパターンによる抽象化

- **TicketRepository**: データベース変更に対応
- **NotificationRepository**: 通知履歴管理
- **ErrorLogRepository**: エラー監視・分析機能
- **NotificationService**: 通知サービス変更に対応（LINE/Discord切り替え）
- **ScrapingService**: スクレイピング対象変更に対応

### 4.2 設定駆動設計

- **URL管理**: 固定・可変・環境依存の3段階管理
- **セレクタ設定**: 複数候補による堅牢性確保
- **エラー通知設定**: レベル別通知先・形式設定
- **フォールバック機能**: 障害時の自動復旧

### 4.3 通知ルーティング戦略

```typescript
// エラーレベル別通知設定
const errorRoutingConfig = {
  info: {
    discord: false,
    database: true,
    console: true,
  },
  warning: {
    discord: true,
    database: true,
    console: true,
    color: 0xffaa00, // オレンジ
  },
  error: {
    discord: true,
    database: true,
    console: true,
    color: 0xff0000, // 赤
    includeContext: true,
  },
  critical: {
    discord: true,
    database: true,
    console: true,
    color: 0x8b0000, // 濃い赤
    includeContext: true,
    includeStackTrace: true,
  },
};
```

### 4.4 URL管理戦略

```typescript
// 1. 固定URL（ハードコーディング）
const staticUrls = {
  jleagueTicketBase: 'https://www.jleague-ticket.jp',
  urawaClubPage: 'https://www.jleague-ticket.jp/club/ur/',
  lineApiBase: 'https://api.line.me/v2/bot',
};

// 2. 可変URL（設定ファイル）
const dynamicUrls = {
  urawaAwayTabUrl: process.env.URAWA_AWAY_TAB_URL ||
    'https://www.jleague-ticket.jp/club/ur/?tab=away',
  fallbackUrls: [
    'https://www.jleague-ticket.jp/club/ur/#away',
    'https://www.jleague-ticket.jp/club/ur/away/',
  ],
};

// 3. 環境依存URL（環境変数）
const environmentUrls = {
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
  lineWebhookUrl: process.env.LINE_WEBHOOK_URL,
  debugUrl: process.env.DEBUG_URL,
};
```
