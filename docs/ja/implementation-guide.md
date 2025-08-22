# 実装ガイド

このドキュメントは、urawa-support-hubシステムの詳細な技術実装ガイダンスを提供し、ドメインエンティティ、リポジトリパターン、インフラストラクチャ実装、およびテスト戦略を含みます。

## ドメインエンティティ

### Ticket エンティティ

```typescript
export class Ticket {
  constructor(
    public readonly id: string,
    public readonly matchName: string,
    public readonly matchDate: Date,
    public readonly venue: string,
    public readonly saleStartDate: Date,
    public readonly purchaseUrl: string,
    public readonly seatCategories: string[],
  ) {}

  // ビジネスロジックメソッド
  shouldSendNotification(type: NotificationType, currentTime: Date): boolean {
    return shouldSendNotificationAtTime(type, this.saleStartDate, currentTime);
  }

  isExpired(): boolean {
    return this.saleStartDate < new Date();
  }

  getNotificationMessage(type: NotificationType): string {
    const config = NOTIFICATION_TIMING_CONFIG[type];
    return formatNotificationMessage(this, config.displayName);
  }

  getScheduledNotificationTimes(): Array<{ type: NotificationType; scheduledTime: Date }> {
    return Object.entries(NOTIFICATION_TIMING_CONFIG).map(([type, config]) => ({
      type: type as NotificationType,
      scheduledTime: config.calculateScheduledTime(this.saleStartDate),
    }));
  }
}
```

#### 主要責務

- 試合チケット情報のカプセル化
- 設定駆動計算による通知タイミングビジネスロジック
- データ検証とビジネスルール
- Cloud Tasksスケジューリングとの統合

### NotificationHistory エンティティ

```typescript
export class NotificationHistory {
  constructor(
    public readonly id: string,
    public readonly ticketId: string,
    public readonly notificationType: NotificationType,
    public readonly scheduledTime: Date,
    public readonly sentTime: Date | null = null,
    public readonly status: NotificationStatus,
    public readonly retryCount: number = 0,
    public readonly errorMessage: string | null = null,
  ) {}

  // ビジネスロジックメソッド
  canRetry(): boolean {
    const maxRetries = FEATURE_FLAGS.MAX_RETRY_ATTEMPTS;
    return this.retryCount < maxRetries && this.status !== 'sent';
  }

  markAsSent(): NotificationHistory {
    return new NotificationHistory(
      this.id,
      this.ticketId,
      this.notificationType,
      this.scheduledTime,
      new Date(),
      'sent',
      this.retryCount,
      null, // 成功時はエラーメッセージをクリア
    );
  }

  incrementRetry(errorMessage?: string): NotificationHistory {
    return new NotificationHistory(
      this.id,
      this.ticketId,
      this.notificationType,
      this.scheduledTime,
      this.sentTime,
      'pending',
      this.retryCount + 1,
      errorMessage || this.errorMessage,
    );
  }

  isOverdue(currentTime: Date): boolean {
    const config = NOTIFICATION_TIMING_CONFIG[this.notificationType];
    const deadline = new Date(this.scheduledTime.getTime() + config.toleranceMs);
    return currentTime > deadline && this.status !== 'sent';
  }
}
```

#### 主要責務

- 拡張ステータス管理付き通知配信追跡
- 設定可能制限付きリトライロジック管理
- 重複防止とエラー追跡
- Cloud Tasksリトライメカニズムとの統合

## リポジトリインターフェース

### TicketRepository インターフェース

```typescript
export interface TicketRepository {
  save(ticket: Ticket): Promise<void>;
  findById(id: string): Promise<Ticket | null>;
  findByMatchDate(startDate: Date, endDate: Date): Promise<Ticket[]>;
  update(ticket: Ticket): Promise<void>;
  delete(id: string): Promise<void>;
  findExpiredTickets(): Promise<Ticket[]>;

  // Cloud Tasks統合用拡張メソッド
  scheduleNotifications(ticketId: string): Promise<void>;
  findPendingTickets(): Promise<Ticket[]>;
  upsert(ticket: Ticket): Promise<void>; // 保存または更新
}
```

### NotificationRepository インターフェース

```typescript
export interface NotificationRepository {
  save(history: NotificationHistory): Promise<void>;
  findByTicketId(ticketId: string): Promise<NotificationHistory[]>;
  findPendingNotifications(currentTime: Date): Promise<NotificationHistory[]>;
  update(history: NotificationHistory): Promise<void>;
  findDuplicates(ticketId: string, type: NotificationType): Promise<NotificationHistory[]>;

  // 改善されたエラーハンドリング用拡張メソッド
  findByTicketAndType(
    ticketId: string,
    type: NotificationType,
  ): Promise<NotificationHistory | null>;
  findOverdueNotifications(currentTime: Date): Promise<NotificationHistory[]>;
  markAsError(id: string, errorMessage: string): Promise<void>;
}
```

## インフラストラクチャ実装

### TicketRepositoryImpl

```typescript
export class TicketRepositoryImpl implements TicketRepository {
  constructor(
    private supabaseClient: SupabaseClient,
    private cloudTasksClient: CloudTasksClient,
  ) {}

  async save(ticket: Ticket): Promise<void> {
    const dbData = TicketConverter.toDatabase(ticket);
    const { error } = await this.supabaseClient
      .from('tickets')
      .insert(dbData);

    if (error) handleSupabaseError('save ticket', error);
  }

  async upsert(ticket: Ticket): Promise<void> {
    const dbData = TicketConverter.toDatabase(ticket);
    const { error } = await this.supabaseClient
      .from('tickets')
      .upsert(dbData, {
        onConflict: 'match_name,match_date',
        ignoreDuplicates: false,
      });

    if (error) handleSupabaseError('upsert ticket', error);
  }

  // 通知スケジューリング用Cloud Tasks統合
  async scheduleNotifications(ticketId: string): Promise<void> {
    const ticket = await this.findById(ticketId);
    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    const scheduledTimes = ticket.getScheduledNotificationTimes();

    for (const { type, scheduledTime } of scheduledTimes) {
      await this.cloudTasksClient.scheduleNotification({
        ticketId,
        notificationType: type,
        scheduledTime,
        targetUrl: `${SUPABASE_URL}/functions/v1/send-notification`,
      });
    }
  }

  // 追加実装メソッド...
  async findById(id: string): Promise<Ticket | null> {
    const { data, error } = await this.supabaseClient
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      handleSupabaseError('find ticket by id', error);
    }

    return data ? TicketConverter.fromDatabase(data) : null;
  }
}
```

### CloudTasksClient 実装

```typescript
export interface CloudTasksClient {
  scheduleNotification(params: {
    ticketId: string;
    notificationType: NotificationType;
    scheduledTime: Date;
    targetUrl: string;
  }): Promise<string>; // タスクIDを返す

  cancelTask(taskId: string): Promise<void>;
  listTasks(queueName: string): Promise<CloudTask[]>;
}

export class CloudTasksClientImpl implements CloudTasksClient {
  constructor(
    private tasksClient: any, // @google-cloud/tasks client
    private projectId: string,
    private location: string,
    private queueName: string,
  ) {}

  async scheduleNotification(params: {
    ticketId: string;
    notificationType: NotificationType;
    scheduledTime: Date;
    targetUrl: string;
  }): Promise<string> {
    const queuePath = this.tasksClient.queuePath(
      this.projectId,
      this.location,
      this.queueName,
    );

    const task = {
      httpRequest: {
        httpMethod: 'POST',
        url: params.targetUrl,
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify({
          ticketId: params.ticketId,
          notificationType: params.notificationType,
        })).toString('base64'),
      },
      scheduleTime: {
        seconds: Math.floor(params.scheduledTime.getTime() / 1000),
      },
    };

    const [response] = await this.tasksClient.createTask({
      parent: queuePath,
      task,
    });

    return response.name;
  }

  async cancelTask(taskId: string): Promise<void> {
    await this.tasksClient.deleteTask({ name: taskId });
  }
}
```

### PlaywrightClient 実装

```typescript
export interface PlaywrightClient {
  scrapeTickets(): Promise<ScrapedTicketData[]>;
  takeScreenshot(url: string): Promise<Buffer>;
  checkSiteAvailability(): Promise<boolean>;
}

export class PlaywrightClientImpl implements PlaywrightClient {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
  }

  async scrapeTickets(): Promise<ScrapedTicketData[]> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();

    try {
      await page.goto('https://www.jleague-ticket.jp/club/ur/?tab=away', {
        waitUntil: 'networkidle',
      });

      const tickets = await page.evaluate(() => {
        // チケット抽出用DOM解析ロジック
        const ticketElements = document.querySelectorAll('.ticket-item');
        return Array.from(ticketElements).map((element) => {
          return {
            matchName: element.querySelector('.match-name')?.textContent?.trim(),
            matchDate: element.querySelector('.match-date')?.textContent?.trim(),
            venue: element.querySelector('.venue')?.textContent?.trim(),
            saleStartDate: element.querySelector('.sale-start')?.textContent?.trim(),
            purchaseUrl: element.querySelector('.purchase-link')?.getAttribute('href'),
            seatCategories: Array.from(element.querySelectorAll('.seat-category'))
              .map((cat) => cat.textContent?.trim())
              .filter(Boolean),
          };
        });
      });

      return tickets.filter((ticket) => ticket.matchName && ticket.matchDate);
    } finally {
      await page.close();
    }
  }

  async dispose(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
```

## データコンバーター

### TicketConverter

```typescript
export class TicketConverter {
  static toDatabase(ticket: Ticket): DatabaseTicket {
    return {
      id: ticket.id,
      match_name: ticket.matchName,
      match_date: ticket.matchDate.toISOString(),
      venue: ticket.venue,
      sale_start_date: ticket.saleStartDate.toISOString(),
      purchase_url: ticket.purchaseUrl,
      seat_categories: ticket.seatCategories,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  static fromDatabase(data: DatabaseTicket): Ticket {
    return new Ticket(
      data.id,
      data.match_name,
      new Date(data.match_date),
      data.venue,
      new Date(data.sale_start_date),
      data.purchase_url,
      data.seat_categories,
    );
  }

  static fromScrapedData(data: ScrapedTicketData): Ticket {
    return new Ticket(
      generateUUID(),
      data.matchName,
      parseMatchDate(data.matchDate),
      data.venue,
      parseSaleStartDate(data.saleStartDate),
      data.purchaseUrl,
      data.seatCategories,
    );
  }
}
```

### NotificationHistoryConverter

```typescript
export class NotificationHistoryConverter {
  static toDatabase(history: NotificationHistory): DatabaseNotificationHistory {
    return {
      id: history.id,
      ticket_id: history.ticketId,
      notification_type: history.notificationType,
      scheduled_time: history.scheduledTime.toISOString(),
      sent_time: history.sentTime?.toISOString() || null,
      status: history.status,
      retry_count: history.retryCount,
      error_message: history.errorMessage,
      created_at: new Date().toISOString(),
    };
  }

  static fromDatabase(data: DatabaseNotificationHistory): NotificationHistory {
    return new NotificationHistory(
      data.id,
      data.ticket_id,
      data.notification_type as NotificationType,
      new Date(data.scheduled_time),
      data.sent_time ? new Date(data.sent_time) : null,
      data.status as NotificationStatus,
      data.retry_count,
      data.error_message,
    );
  }
}
```

## 設定管理

### NotificationConfig

```typescript
export const NOTIFICATION_TIMING_CONFIG = {
  day_before: {
    displayName: 'Day before sale start',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      const dayBefore = new Date(saleStartDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(20, 0, 0, 0); // 20:00 JST
      return dayBefore;
    },
    toleranceMs: 5 * 60 * 1000, // 5分
    priority: 1,
  },
  one_hour_before: {
    displayName: '1 hour before sale start',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      return new Date(saleStartDate.getTime() - 60 * 60 * 1000);
    },
    toleranceMs: 2 * 60 * 1000, // 2分
    priority: 2,
  },
  fifteen_minutes_before: {
    displayName: '15 minutes before sale start',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      return new Date(saleStartDate.getTime() - 15 * 60 * 1000);
    },
    toleranceMs: 1 * 60 * 1000, // 1分
    priority: 3,
  },
} as const;
```

### 環境設定

```typescript
export interface EnvironmentConfig {
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  googleCloud: {
    projectId: string;
    region: string;
    taskQueue: string;
    credentials: string;
  };
  notifications: {
    lineChannelAccessToken: string;
    lineGroupId: string;
    discordWebhookUrl: string;
  };
  scraping: {
    targetUrl: string;
    userAgent: string;
    timeout: number;
  };
}

export function loadEnvironmentConfig(): EnvironmentConfig {
  return {
    supabase: {
      url: getEnvVar('SUPABASE_URL'),
      serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
    },
    googleCloud: {
      projectId: getEnvVar('GOOGLE_CLOUD_PROJECT'),
      region: getEnvVar('CLOUD_TASKS_LOCATION', 'asia-northeast1'),
      taskQueue: getEnvVar('CLOUD_TASKS_QUEUE', 'notifications'),
      credentials: getEnvVar('GOOGLE_APPLICATION_CREDENTIALS'),
    },
    notifications: {
      lineChannelAccessToken: getEnvVar('LINE_CHANNEL_ACCESS_TOKEN'),
      lineGroupId: getEnvVar('LINE_GROUP_ID'),
      discordWebhookUrl: getEnvVar('DISCORD_WEBHOOK_URL'),
    },
    scraping: {
      targetUrl: 'https://www.jleague-ticket.jp/club/ur/?tab=away',
      userAgent: 'Mozilla/5.0 (compatible; Urawa-Support-Hub/2.0)',
      timeout: 30000, // 30秒
    },
  };
}
```

## アプリケーションサービス

### ScrapingService

```typescript
export class ScrapingService {
  constructor(
    private playwrightClient: PlaywrightClient,
    private ticketRepository: TicketRepository,
  ) {}

  async executeDaily(): Promise<ScrapingResult> {
    const startTime = new Date();
    let processedCount = 0;
    let errorCount = 0;
    const errors: Error[] = [];

    try {
      // Jリーグサイトからチケットをスクレイピング
      const scrapedData = await this.playwrightClient.scrapeTickets();

      // スクレイピングされた各チケットを処理
      for (const data of scrapedData) {
        try {
          const ticket = TicketConverter.fromScrapedData(data);
          await this.ticketRepository.upsert(ticket);
          await this.ticketRepository.scheduleNotifications(ticket.id);
          processedCount++;
        } catch (error) {
          errorCount++;
          errors.push(error as Error);
          console.error('Failed to process ticket:', data, error);
        }
      }

      return {
        success: true,
        processedCount,
        errorCount,
        duration: new Date().getTime() - startTime.getTime(),
        errors: errors.map((e) => e.message),
      };
    } catch (error) {
      return {
        success: false,
        processedCount,
        errorCount: errorCount + 1,
        duration: new Date().getTime() - startTime.getTime(),
        errors: [...errors.map((e) => e.message), (error as Error).message],
      };
    }
  }
}
```

### NotificationService

```typescript
export class NotificationService {
  constructor(
    private notificationRepository: NotificationRepository,
    private lineClient: LineClient,
    private discordClient: DiscordClient,
  ) {}

  async sendNotification(ticketId: string, notificationType: NotificationType): Promise<void> {
    // 既に送信済みかチェック
    const history = await this.notificationRepository
      .findByTicketAndType(ticketId, notificationType);

    if (history?.status === 'sent') {
      console.log('Notification already sent:', { ticketId, notificationType });
      return;
    }

    try {
      // LINEに送信
      await this.lineClient.sendTicketNotification(ticketId, notificationType);

      // 監視アラートをDiscordに送信
      await this.discordClient.sendNotificationAlert(ticketId, notificationType, 'success');

      // ステータス更新
      if (history) {
        await this.notificationRepository.update(history.markAsSent());
      }
    } catch (error) {
      console.error('Notification failed:', error);

      // エラーアラートをDiscordに送信
      await this.discordClient.sendNotificationAlert(
        ticketId,
        notificationType,
        'error',
        (error as Error).message,
      );

      // エラーステータス更新
      if (history) {
        await this.notificationRepository
          .update(history.incrementRetry((error as Error).message));
      }

      throw error;
    }
  }
}
```

## エラーハンドリング戦略

### 構造化エラータイプ

```typescript
export abstract class BaseError extends Error {
  abstract readonly code: string;
  abstract readonly severity: 'low' | 'medium' | 'high' | 'critical';

  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ScrapingError extends BaseError {
  readonly code = 'SCRAPING_ERROR';
  readonly severity = 'high';
}

export class NotificationError extends BaseError {
  readonly code = 'NOTIFICATION_ERROR';
  readonly severity = 'medium';
}

export class DatabaseError extends BaseError {
  readonly code = 'DATABASE_ERROR';
  readonly severity = 'critical';
}

export class CloudTasksError extends BaseError {
  readonly code = 'CLOUD_TASKS_ERROR';
  readonly severity = 'high';
}
```

### エラーハンドラー

```typescript
export function handleSupabaseError(operation: string, error: any): never {
  const structuredError = new DatabaseError(
    `Failed to ${operation}: ${error.message}`,
    {
      operation,
      error: error,
      timestamp: new Date().toISOString(),
      code: error.code,
    },
  );

  // 構造化エラーをログ
  console.error(structuredError.message, structuredError.context);

  throw structuredError;
}

export class ErrorRecoveryService {
  constructor(private discordClient: DiscordClient) {}

  async handleError(error: BaseError): Promise<void> {
    // エラーログ
    console.error(
      `[${error.severity.toUpperCase()}] ${error.code}: ${error.message}`,
      error.context,
    );

    // high/criticalエラーのアラート送信
    if (error.severity === 'high' || error.severity === 'critical') {
      await this.discordClient.sendErrorAlert(error);
    }

    // エラータイプに基づく復旧戦略実装
    switch (error.code) {
      case 'SCRAPING_ERROR':
        await this.handleScrapingError(error as ScrapingError);
        break;
      case 'NOTIFICATION_ERROR':
        await this.handleNotificationError(error as NotificationError);
        break;
      case 'DATABASE_ERROR':
        await this.handleDatabaseError(error as DatabaseError);
        break;
    }
  }

  private async handleScrapingError(error: ScrapingError): Promise<void> {
    // 次の実行サイクルでリトライスケジュール
    // 具体的なエラーに依存する実装
  }

  // その他のエラーハンドリングメソッド...
}
```

## データベーススキーマ実装

### データベースセットアップ

```sql
-- UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- チケットテーブル
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_name VARCHAR NOT NULL,
    match_date TIMESTAMPTZ NOT NULL,
    venue VARCHAR NOT NULL,
    sale_start_date TIMESTAMPTZ NOT NULL,
    purchase_url VARCHAR NOT NULL,
    seat_categories TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_name, match_date)
);

-- 通知履歴テーブル
CREATE TABLE notification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    notification_type VARCHAR NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    sent_time TIMESTAMPTZ,
    status VARCHAR NOT NULL DEFAULT 'scheduled',
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- パフォーマンス用インデックス
CREATE INDEX idx_tickets_match_date ON tickets(match_date);
CREATE INDEX idx_tickets_sale_start_date ON tickets(sale_start_date);
CREATE INDEX idx_notification_history_status_scheduled ON notification_history(status, scheduled_time);
CREATE INDEX idx_notification_history_ticket_type ON notification_history(ticket_id, notification_type);

-- 自動通知レコード作成トリガー
CREATE OR REPLACE FUNCTION create_notification_records()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_history 
    (ticket_id, notification_type, scheduled_time, status)
  VALUES
    (NEW.id, 'day_before', NEW.sale_start_date - interval '1 day' + time '20:00', 'scheduled'),
    (NEW.id, 'one_hour', NEW.sale_start_date - interval '1 hour', 'scheduled'),
    (NEW.id, 'fifteen_minutes', NEW.sale_start_date - interval '15 minutes', 'scheduled');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_notifications
    AFTER INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION create_notification_records();
```

## テスト戦略

### テスト構成

```
src/domain/entities/__tests__/
├── Ticket.test.ts
├── NotificationHistory.test.ts

src/infrastructure/repositories/__tests__/
├── TicketRepositoryImpl.test.ts
├── NotificationRepositoryImpl.test.ts

src/infrastructure/clients/__tests__/ 
├── CloudTasksClientImpl.test.ts
├── PlaywrightClientImpl.test.ts

src/application/services/__tests__/ 
├── ScrapingService.test.ts
├── NotificationService.test.ts

tests/integration/
├── repository.test.ts
├── cloud-tasks.test.ts
├── end-to-end.test.ts
```

### モック実装

```typescript
export class MockCloudTasksClient implements CloudTasksClient {
  private scheduledTasks: Map<string, any> = new Map();

  async scheduleNotification(params: {
    ticketId: string;
    notificationType: NotificationType;
    scheduledTime: Date;
    targetUrl: string;
  }): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random()}`;
    this.scheduledTasks.set(taskId, params);
    return taskId;
  }

  async cancelTask(taskId: string): Promise<void> {
    this.scheduledTasks.delete(taskId);
  }

  getScheduledTasks(): Map<string, any> {
    return this.scheduledTasks;
  }
}

export class MockPlaywrightClient implements PlaywrightClient {
  private mockData: ScrapedTicketData[] = [];

  setMockData(data: ScrapedTicketData[]): void {
    this.mockData = data;
  }

  async scrapeTickets(): Promise<ScrapedTicketData[]> {
    // ネットワーク遅延シミュレート
    await new Promise((resolve) => setTimeout(resolve, 100));
    return this.mockData;
  }

  async takeScreenshot(): Promise<Buffer> {
    return Buffer.from('mock-screenshot');
  }

  async checkSiteAvailability(): Promise<boolean> {
    return true;
  }
}
```

## パフォーマンス最適化

### データベースクエリ最適化

```typescript
// 最適クエリパフォーマンス用推奨インデックス
const RECOMMENDED_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_tickets_match_date ON tickets(match_date)',
  'CREATE INDEX IF NOT EXISTS idx_tickets_sale_start_date ON tickets(sale_start_date)',
  'CREATE INDEX IF NOT EXISTS idx_notification_history_status_scheduled ON notification_history(status, scheduled_time)',
  'CREATE INDEX IF NOT EXISTS idx_notification_history_ticket_type ON notification_history(ticket_id, notification_type)',
];
```

### キャッシュ戦略

```typescript
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class InMemoryCacheService implements CacheService {
  private cache = new Map<string, { value: any; expiry: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item || item.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
    });
  }

  // その他のメソッド...
}
```

## デプロイ実装

### Cloud Run Dockerfile

```dockerfile
FROM denoland/deno:1.38.0

WORKDIR /app

# 依存関係ファイルをコピー
COPY deno.json deno.lock ./

# 依存関係をキャッシュ
RUN deno cache deno.json

# ソースコードをコピー
COPY . .

# アプリケーションをキャッシュ
RUN deno cache src/main.ts

EXPOSE 8000

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "src/main.ts"]
```

### デプロイスクリプト

```bash
#!/bin/bash
# deploy.sh

# Cloud Runをビルド・デプロイ
gcloud run deploy urawa-scraper \
  --source . \
  --region asia-northeast1 \
  --memory 2Gi \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production"

# Edge Functionsをデプロイ
supabase functions deploy send-notification
supabase functions deploy system-health

# データベースマイグレーションを適用
supabase db push

echo "Deployment completed successfully!"
```

この実装ガイドは、適切なアーキテクチャパターン、エラーハンドリング、テスト戦略でurawa-support-hubシステムを構築・維持するために必要な詳細な技術基盤を提供します。
