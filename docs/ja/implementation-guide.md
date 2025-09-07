# 実装ガイド

このドキュメントは、urawa-support-hubシステムの詳細な技術実装ガイダンスを提供し、Clean
Architectureレイヤー実装、ドメインエンティティ、リポジトリパターン、インフラストラクチャ実装、およびテスト戦略を含みます。

## Application Layer (Use Cases)

### TicketCollectionUseCase

日次チケット収集操作の主要なビジネスワークフローオーケストレーター:

```typescript
export class TicketCollectionUseCase implements ITicketCollectionUseCase {
  constructor(
    private readonly ticketCollectionService: ITicketCollectionService,
    private readonly healthRepository: IHealthRepository,
    private readonly ticketRepository: ITicketRepository,
    private readonly notificationRepository: INotificationRepository,
    private readonly notificationSchedulingService: INotificationSchedulingService,
    private readonly notificationSchedulerService: INotificationSchedulerService,
  ) {}

  async execute(): Promise<void> {
    const startTime = Date.now();
    let executionResult: HealthCheckResult;

    try {
      const result = await this.ticketCollectionService.collectAllTickets();
      const executionDuration = Date.now() - startTime;

      executionResult = {
        executedAt: new Date(),
        ticketsFound: result.totalTickets,
        status: 'success',
        executionDurationMs: executionDuration,
      };

      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.log(
          `Daily execution completed successfully. Found ${result.totalTickets} tickets in ${executionDuration}ms`,
        );
      }
    } catch (error) {
      // エラーハンドリングとヘルス記録
      executionResult = {
        executedAt: new Date(),
        ticketsFound: 0,
        status: 'error',
        executionDurationMs: Date.now() - startTime,
        errorDetails: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }

    // 重要: Supabase自動一時停止防止のため、常にヘルスを記録
    await this.healthRepository.recordDailyExecution(executionResult);
  }
}
```

#### 主要責務

- ビジネスワークフローオーケストレーション
- エラーハンドリングと復旧
- システムヘルス追跡
- Supabase無料枠自動一時停止防止

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

## Repository Interfaces

### TicketRepository実装

```typescript
// インタフェース駆動設計による依存性注入対応
export class TicketRepository implements ITicketRepository {
  constructor(
    private readonly client: SupabaseClient,
  ) {}

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

### NotificationRepository実装

```typescript
// インタフェース駆動設計による依存性注入対応
export class NotificationRepository implements INotificationRepository {
  constructor(
    private readonly client: SupabaseClient,
  ) {}

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

### 依存性注入（DI）パターン

中央集権的な依存関係管理を依存性注入（DI）パターンで実現:

```typescript
// src/config/di.ts
export const createDependencies = () => {
  const supabaseClient = createSupabaseAdminClient();

  // Repositories
  const ticketRepository = new TicketRepository(supabaseClient);
  const notificationRepository = new NotificationRepository(supabaseClient);
  const healthRepository = new HealthRepository(supabaseClient);

  return {
    ticketRepository,
    notificationRepository,
    healthRepository,
    // ... その他の依存関係
  };
};

// Use Caseファクトリー関数
export const createTicketCollectionUseCase = (): ITicketCollectionUseCase => {
  const dependencies = createDependencies();
  return new TicketCollectionUseCase(
    dependencies.ticketCollectionService,
    dependencies.healthRepository,
    dependencies.ticketRepository,
    dependencies.notificationRepository,
    dependencies.notificationSchedulingService,
    dependencies.notificationSchedulerService,
  );
};
```

**DI実装の利点:**

- **テスタビリティ**: モック注入による単体テスト容易性
- **疎結合**: インタフェースベースの依存関係
- **一元管理**: 依存関係の統一管理
- **拡張性**: 新規実装の容易な追加

## インフラストラクチャ実装

### TicketRepositoryImpl

```typescript
export class TicketRepositoryImpl {
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
        targetUrl: `${CLOUD_RUN_URL}/api/send-notification`,
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

### TicketCollectionService

```typescript
export class TicketCollectionService {
  private jleagueScraper: JLeagueTicketScraper;

  constructor() {
    this.jleagueScraper = new JLeagueTicketScraper();
  }

  async collectAllTickets(): Promise<TicketCollectionResult> {
    const sourceResults: SourceResult[] = [];
    const allTickets: ScrapedTicketData[] = [];
    const errors: string[] = [];

    // J-Leagueチケット収集
    try {
      const jleagueTickets = await this.jleagueScraper.scrapeTickets();
      sourceResults.push({
        source: 'J-League Ticket',
        ticketsFound: jleagueTickets.length,
        success: true,
      });
      allTickets.push(...jleagueTickets);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sourceResults.push({
        source: 'J-League Ticket',
        ticketsFound: 0,
        success: false,
        error: errorMessage,
      });
      errors.push(`J-League: ${errorMessage}`);
    }

    // ソース間で重複チケットを削除
    const uniqueTickets = this.removeDuplicateTickets(allTickets);
    const totalTickets = uniqueTickets.length;
    const overall_success = sourceResults.some((result) => result.success);

    return {
      success: overall_success,
      totalTickets,
      sourceResults,
      errors,
    };
  }

  private removeDuplicateTickets(tickets: ScrapedTicketData[]): ScrapedTicketData[] {
    const uniqueMap = new Map<string, ScrapedTicketData>();

    for (const ticket of tickets) {
      const key = `${ticket.matchName.toLowerCase()}_${ticket.venue.toLowerCase()}`;
      const existing = uniqueMap.get(key);

      if (!existing) {
        uniqueMap.set(key, ticket);
      } else {
        // より詳細なデータのマージ
        const merged = this.mergeTicketData(existing, ticket);
        uniqueMap.set(key, merged);
      }
    }

    return Array.from(uniqueMap.values());
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

### 🎯 単体テスト設計原則

**重要**: 各層の単体テストでは、依存する下位層を必ずモック化すること

#### Application層（UseCases）のテスト

```typescript
// ✅ 正しい単体テスト - Infrastructure層をモック化
import { assertEquals } from 'std/assert/mod.ts';
import { spy } from 'testing/mock.ts';

Deno.test('NotificationUseCase should delegate to NotificationService', async () => {
  const useCase = new NotificationUseCase();

  // Infrastructure層（NotificationService）をモック化
  const mockProcessScheduledNotification = spy(() => Promise.resolve());

  Object.defineProperty(useCase, 'notificationService', {
    value: { processScheduledNotification: mockProcessScheduledNotification },
    writable: true,
  });

  const input = { ticketId: 'test-123', notificationType: 'day_before' };
  await useCase.execute(input);

  // モック呼び出しの検証
  assertEquals(mockProcessScheduledNotification.calls.length, 1);
  if (mockProcessScheduledNotification.calls.length > 0) {
    assertEquals(mockProcessScheduledNotification.calls[0].args[0], input);
  }
});
```

#### Adapter層（Controllers）のテスト

```typescript
// ✅ 正しい単体テスト - Application層をモック化
Deno.test('NotificationController should delegate to UseCase', async () => {
  const controller = new NotificationController();

  // Application層（UseCase）をモック化
  const mockExecute = spy(() => Promise.resolve());

  Object.defineProperty(controller, 'notificationUseCase', {
    value: { execute: mockExecute },
    writable: true,
  });

  const request = new Request('http://localhost/api/send-notification', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer test-token' },
    body: JSON.stringify({ ticketId: 'test-123', notificationType: 'day_before' }),
  });

  await controller.handleSendNotification(request);

  assertEquals(mockExecute.calls.length, 1);
});
```

#### ❌ 避けるべき単体テストパターン

```typescript
// ❌ 間違った単体テスト - 実際のDB接続を試行
Deno.test('Should not do this', async () => {
  const useCase = new NotificationUseCase(); // 内部でNotificationServiceが実際のDB接続を試行

  try {
    await useCase.execute(input); // これは統合テスト
  } catch (error) {
    // DB接続エラーは想定内... ← これは単体テストではない
  }
});
```

### テスト構成

```
src/domain/entities/__tests__/
├── Ticket.test.ts
├── NotificationHistory.test.ts

src/adapters/controllers/__tests__/
├── NotificationController.test.ts          # Application層をモック化
├── NotificationBatchController.test.ts     # Application層をモック化

src/application/usecases/__tests__/
├── NotificationUseCase.test.ts             # Infrastructure層をモック化
├── NotificationBatchUseCase.test.ts        # Infrastructure層をモック化

src/infrastructure/repositories/__tests__/
├── TicketRepositoryImpl.test.ts            # Supabaseクライアントをモック化
├── NotificationRepositoryImpl.test.ts      # Supabaseクライアントをモック化

src/infrastructure/services/__tests__/
├── NotificationService.test.ts             # Repository層と外部APIをモック化

tests/integration/
├── repository.test.ts                      # 実際のDB接続（統合テスト）
├── cloud-tasks.test.ts                     # 実際のCloud Tasks（統合テスト）
├── end-to-end.test.ts                      # 全体フロー（E2Eテスト）
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

# データベースマイグレーションを適用
supabase db push

echo "Deployment completed successfully!"
```

この実装ガイドは、適切なアーキテクチャパターン、エラーハンドリング、テスト戦略でurawa-support-hubシステムを構築・維持するために必要な詳細な技術基盤を提供します。
