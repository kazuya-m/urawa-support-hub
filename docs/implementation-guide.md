# Implementation Guide

This document provides detailed technical implementation guidance for the urawa-support-hub system,
including Clean Architecture layer implementations, domain entities, repository patterns,
infrastructure implementations, and testing strategies.

## Application Layer (Use Cases)

### TicketCollectionUseCase

The primary business workflow orchestrator for daily ticket collection operations:

```typescript
export class TicketCollectionUseCase {
  constructor(
    private scrapingService: ScrapingService,
    private healthRepository: HealthRepository,
  ) {}

  async execute(): Promise<void> {
    const startTime = Date.now();
    let executionResult: HealthCheckResult;

    try {
      const tickets = await this.scrapingService.scrapeAwayTickets();
      const executionDuration = Date.now() - startTime;

      executionResult = {
        executedAt: new Date(),
        ticketsFound: tickets.length,
        status: 'success',
        executionDurationMs: executionDuration,
      };

      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.log(
          `Daily execution completed successfully. Found ${tickets.length} tickets in ${executionDuration}ms`,
        );
      }
    } catch (error) {
      // Error handling and health recording
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

    // Critical: Always record health to prevent Supabase auto-pause
    await this.healthRepository.recordDailyExecution(executionResult);
  }
}
```

#### Key Responsibilities

- Business workflow orchestration
- Error handling and recovery
- System health tracking
- Supabase free tier auto-pause prevention

## Domain Entities

### Ticket Entity

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

  // Business Logic Methods
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

#### Key Responsibilities

- Match ticket information encapsulation
- Notification timing business logic with configuration-driven calculations
- Data validation and business rules
- Integration with Cloud Tasks scheduling

### NotificationHistory Entity

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

  // Business Logic Methods
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
      null, // Clear error message on success
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

#### Key Responsibilities

- Notification delivery tracking with enhanced status management
- Retry logic management with configurable limits
- Duplicate prevention and error tracking
- Integration with Cloud Tasks retry mechanisms

## Repository Interfaces

### TicketRepository Interface

```typescript
export interface TicketRepository {
  save(ticket: Ticket): Promise<void>;
  findById(id: string): Promise<Ticket | null>;
  findByMatchDate(startDate: Date, endDate: Date): Promise<Ticket[]>;
  update(ticket: Ticket): Promise<void>;
  delete(id: string): Promise<void>;
  findExpiredTickets(): Promise<Ticket[]>;

  // Enhanced methods for Cloud Tasks integration
  scheduleNotifications(ticketId: string): Promise<void>;
  findPendingTickets(): Promise<Ticket[]>;
  upsert(ticket: Ticket): Promise<void>; // Save or update
}
```

### NotificationRepository Interface

```typescript
export interface NotificationRepository {
  save(history: NotificationHistory): Promise<void>;
  findByTicketId(ticketId: string): Promise<NotificationHistory[]>;
  findPendingNotifications(currentTime: Date): Promise<NotificationHistory[]>;
  update(history: NotificationHistory): Promise<void>;
  findDuplicates(ticketId: string, type: NotificationType): Promise<NotificationHistory[]>;

  // Enhanced methods for improved error handling
  findByTicketAndType(
    ticketId: string,
    type: NotificationType,
  ): Promise<NotificationHistory | null>;
  findOverdueNotifications(currentTime: Date): Promise<NotificationHistory[]>;
  markAsError(id: string, errorMessage: string): Promise<void>;
}
```

## Infrastructure Layer

### Repository Factory Pattern

Centralized dependency management using the Factory pattern:

```typescript
export class RepositoryFactory {
  private static ticketRepository: TicketRepository | null = null;
  private static notificationRepository: NotificationRepository | null = null;
  private static healthRepository: HealthRepository | null = null;

  static getTicketRepository(): TicketRepository {
    if (!this.ticketRepository) {
      const client = getSupabaseClient();
      this.ticketRepository = new TicketRepositoryImpl(client);
    }
    return this.ticketRepository;
  }

  static getHealthRepository(): HealthRepository {
    if (!this.healthRepository) {
      const client = getSupabaseClient();
      this.healthRepository = new HealthRepositoryImpl(client);
    }
    return this.healthRepository;
  }

  static resetInstances(): void {
    this.ticketRepository = null;
    this.notificationRepository = null;
    this.healthRepository = null;
  }
}
```

### Configuration Management

Configuration is externalized and organized under `src/infrastructure/config/`:

```typescript
// src/infrastructure/config/scraping.ts
export const URAWA_SCRAPING_CONFIG: ScrapingConfig = {
  awayTabSelectors: ['.ticket-tab li:nth-child(2) span'],
  selectors: {
    ticketContainer: ['.game-list ul li'],
    matchTitle: ['.vs-box-place .team-name'],
    venue: ['.vs-box-place span'],
    // ...
  },
  timeouts: {
    pageLoad: 30000,
    elementWait: 5000,
    tabSwitch: 2000,
  },
};
```

### Scraping Service Architecture

```typescript
// Base ScrapingService (Infrastructure layer)
export class ScrapingService {
  constructor(
    private config: ScrapingConfig,
    private urlConfig: UrlConfig,
  ) {}

  async scrapeAwayTickets(): Promise<ScrapedTicketData[]> {
    // Browser management and scraping logic
  }
}

// Urawa-specific implementation
export class UrawaScrapingService extends ScrapingService {
  constructor() {
    super(URAWA_SCRAPING_CONFIG, URAWA_URL_CONFIG);
  }

  async scrapeUrawaAwayTickets(): Promise<ScrapedTicketData[]> {
    const tickets = await this.scrapeAwayTickets();
    // Urawa-specific post-processing
    return tickets;
  }
}
```

## Repository Implementations

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

  // Cloud Tasks integration for notification scheduling
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

  // Additional implementation methods...
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

### CloudTasksClient Implementation

```typescript
export interface CloudTasksClient {
  scheduleNotification(params: {
    ticketId: string;
    notificationType: NotificationType;
    scheduledTime: Date;
    targetUrl: string;
  }): Promise<string>; // Returns task ID

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

### PlaywrightClient Implementation

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
        // DOM parsing logic for ticket extraction
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

## Data Converters

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

## Configuration Management

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
    toleranceMs: 5 * 60 * 1000, // 5 minutes
    priority: 1,
  },
  one_hour_before: {
    displayName: '1 hour before sale start',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      return new Date(saleStartDate.getTime() - 60 * 60 * 1000);
    },
    toleranceMs: 2 * 60 * 1000, // 2 minutes
    priority: 2,
  },
  fifteen_minutes_before: {
    displayName: '15 minutes before sale start',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      return new Date(saleStartDate.getTime() - 15 * 60 * 1000);
    },
    toleranceMs: 1 * 60 * 1000, // 1 minute
    priority: 3,
  },
} as const;
```

### Environment Configuration

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
      timeout: 30000, // 30 seconds
    },
  };
}
```

## Application Services

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
      // Scrape tickets from J-League site
      const scrapedData = await this.playwrightClient.scrapeTickets();

      // Process each scraped ticket
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
    // Check if already sent
    const history = await this.notificationRepository
      .findByTicketAndType(ticketId, notificationType);

    if (history?.status === 'sent') {
      console.log('Notification already sent:', { ticketId, notificationType });
      return;
    }

    try {
      // Send to LINE
      await this.lineClient.sendTicketNotification(ticketId, notificationType);

      // Send monitoring alert to Discord
      await this.discordClient.sendNotificationAlert(ticketId, notificationType, 'success');

      // Update status
      if (history) {
        await this.notificationRepository.update(history.markAsSent());
      }
    } catch (error) {
      console.error('Notification failed:', error);

      // Send error alert to Discord
      await this.discordClient.sendNotificationAlert(
        ticketId,
        notificationType,
        'error',
        (error as Error).message,
      );

      // Update error status
      if (history) {
        await this.notificationRepository
          .update(history.incrementRetry((error as Error).message));
      }

      throw error;
    }
  }
}
```

## Error Handling Strategy

### Structured Error Types

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

### Error Handler

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

  // Log structured error
  console.error(structuredError.message, structuredError.context);

  throw structuredError;
}

export class ErrorRecoveryService {
  constructor(private discordClient: DiscordClient) {}

  async handleError(error: BaseError): Promise<void> {
    // Log error
    console.error(
      `[${error.severity.toUpperCase()}] ${error.code}: ${error.message}`,
      error.context,
    );

    // Send alert for high/critical errors
    if (error.severity === 'high' || error.severity === 'critical') {
      await this.discordClient.sendErrorAlert(error);
    }

    // Implement recovery strategies based on error type
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
    // Schedule retry for next execution cycle
    // Implementation depends on specific error
  }

  // Other error handling methods...
}
```

## Database Schema Implementation

### Database Setup

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tickets table
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

-- Notification history table
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

-- Indexes for performance
CREATE INDEX idx_tickets_match_date ON tickets(match_date);
CREATE INDEX idx_tickets_sale_start_date ON tickets(sale_start_date);
CREATE INDEX idx_notification_history_status_scheduled ON notification_history(status, scheduled_time);
CREATE INDEX idx_notification_history_ticket_type ON notification_history(ticket_id, notification_type);

-- Automatic notification record creation trigger
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

## Testing Strategy

### Test Organization

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

### Mock Implementations

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
    // Simulate network delay
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

## Performance Optimization

### Database Query Optimization

```typescript
// Index recommendations for optimal query performance
const RECOMMENDED_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_tickets_match_date ON tickets(match_date)',
  'CREATE INDEX IF NOT EXISTS idx_tickets_sale_start_date ON tickets(sale_start_date)',
  'CREATE INDEX IF NOT EXISTS idx_notification_history_status_scheduled ON notification_history(status, scheduled_time)',
  'CREATE INDEX IF NOT EXISTS idx_notification_history_ticket_type ON notification_history(ticket_id, notification_type)',
];
```

### Caching Strategy

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

  // Other methods...
}
```

## Cloud Run API Implementation

### HTTP Endpoints

```typescript
// src/main.ts
import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { TicketCollectionUseCase } from './application/usecases/TicketCollectionUseCase.ts';
import { NotificationService } from './infrastructure/services/NotificationService.ts';

const app = new Hono();
const port = parseInt(Deno.env.get('PORT') ?? '8080');

// Ticket collection endpoint (triggered by Cloud Scheduler)
app.post('/api/collect-tickets', async (c) => {
  try {
    const ticketCollectionUseCase = new TicketCollectionUseCase(
      scrapingService,
      healthRepository,
    );

    await ticketCollectionUseCase.execute();

    return c.json({
      success: true,
      message: 'Scraping completed successfully',
    });
  } catch (error) {
    console.error('Scraping failed:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// Notification endpoint (triggered by Cloud Tasks)
app.post('/api/send-notification', async (c) => {
  try {
    const { ticketId, notificationType } = await c.req.json();

    const notificationService = new NotificationService(
      notificationRepository,
      lineClient,
      discordClient,
    );

    await notificationService.sendNotification(ticketId, notificationType);

    return c.json({
      success: true,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('Notification failed:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// Start server
Deno.serve({ port }, app.fetch);
console.log(`Server running on port ${port}`);
```

### LINE Notification Client

```typescript
// src/infrastructure/clients/LineClient.ts
export class LineClient {
  private readonly baseUrl = 'https://api.line.me/v2/bot';

  constructor(
    private readonly channelAccessToken: string,
  ) {}

  async broadcast(message: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/message/broadcast`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          type: 'text',
          text: message,
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`LINE API error: ${response.status}`);
    }
  }
}
```

### Discord Alert Client

```typescript
// src/infrastructure/clients/DiscordClient.ts
export class DiscordClient {
  constructor(
    private readonly webhookUrl: string,
  ) {}

  async sendAlert(message: string, isError: boolean = false): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
        embeds: isError
          ? [{
            title: '⚠️ Error Alert',
            description: message,
            color: 0xff0000,
            timestamp: new Date().toISOString(),
          }]
          : undefined,
      }),
    });

    if (!response.ok) {
      console.error(`Discord webhook error: ${response.status}`);
    }
  }
}
```

## Deployment Implementation

### Cloud Run Dockerfile

```dockerfile
FROM denoland/deno:1.38.0

WORKDIR /app

# Copy dependency files
COPY deno.json deno.lock ./

# Cache dependencies
RUN deno cache deno.json

# Copy source code
COPY . .

# Cache application
RUN deno cache src/main.ts

EXPOSE 8000

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "src/main.ts"]
```

### Deployment Scripts

```bash
#!/bin/bash
# deploy.sh

# Build and deploy Cloud Run
gcloud run deploy urawa-scraper \
  --source . \
  --region asia-northeast1 \
  --memory 2Gi \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production"

# Apply database migrations
supabase db push

echo "Deployment completed successfully!"
```

This implementation guide provides the detailed technical foundation needed to build and maintain
the urawa-support-hub system with proper architecture patterns, error handling, and testing
strategies.
