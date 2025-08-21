# Detailed Design Document

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

  // New method for
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
- **New**: Integration with Cloud Tasks scheduling

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
    public readonly errorMessage: string | null = null, // New in
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

  // New method for
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
- **New**: Integration with Cloud Tasks retry mechanisms

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

  // New methods for
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

  // New methods for
  findByTicketAndType(
    ticketId: string,
    type: NotificationType,
  ): Promise<NotificationHistory | null>;
  findOverdueNotifications(currentTime: Date): Promise<NotificationHistory[]>;
  markAsError(id: string, errorMessage: string): Promise<void>;
}
```

## Infrastructure Implementations

### TicketRepositoryImpl

```typescript
export class TicketRepositoryImpl implements TicketRepository {
  constructor(
    private supabaseClient: SupabaseClient,
    private cloudTasksClient: CloudTasksClient, // New dependency for
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

  // New method for : Cloud Tasks integration
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

  // Other implementation methods...
}
```

### CloudTasksClient

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

  // Other implementation methods...
}
```

### PlaywrightClient

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

  // New method for : Convert scraped data to domain entity
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

## Testing Strategy

### Test Structure

- **Unit Tests**: Entity business logic, repository implementations
- **Integration Tests**: Database operations, Cloud Tasks integration, end-to-end workflows
- **Contract Tests**: External service API interactions
- **Mock Utilities**: External service simulation with enhanced scenarios

### Test Organization

```
src/domain/entities/__tests__/
├── Ticket.test.ts (12 test cases, enhanced)
├── NotificationHistory.test.ts (15 test cases, enhanced)

src/infrastructure/repositories/__tests__/
├── TicketRepositoryImpl.test.ts (14 test cases, enhanced with Cloud Tasks)
├── NotificationRepositoryImpl.test.ts (12 test cases, enhanced)

src/infrastructure/clients/__tests__/ 
├── CloudTasksClientImpl.test.ts (8 test cases)
├── PlaywrightClientImpl.test.ts (10 test cases)

src/application/services/__tests__/ 
├── ScrapingService.test.ts (12 test cases)
├── NotificationService.test.ts (10 test cases)

tests/integration/
├── repository.test.ts (15 test cases, enhanced)
├── cloud-tasks.test.ts (8 test cases, new)
├── end-to-end.test.ts (6 test cases, new)
```

**Total: 122 test cases ensuring comprehensive coverage**

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
