# Basic Design Document

## System Architecture

### Hybrid Architecture Implementation (GCP + Supabase)

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

### Clean Architecture Implementation

```
┌─────────────────────────────────────┐
│     Interface Layer                │  ← Cloud Run Service, Edge Functions
├─────────────────────────────────────┤
│     Application Services           │  ← ScrapingService, NotificationService  
├─────────────────────────────────────┤
│        Domain Layer               │  ← Entities: Ticket, NotificationHistory
│                                   │    Interfaces: TicketRepository
├─────────────────────────────────────┤
│     Infrastructure Layer          │  ← RepositoryImpl, CloudTasks, Supabase
└─────────────────────────────────────┘
```

### Layer Responsibilities

#### Interface Layer

- **Cloud Run Service**: Web scraping execution environment
  - `scrape`: Daily ticket extraction endpoint
  - `health`: Service health monitoring endpoint
- **Supabase Edge Functions**: Notification delivery
  - `send-notification`: Individual notification delivery
  - `system-health`: System status monitoring

#### Application Layer

- **Services**: Orchestration of domain operations
  - `ScrapingService`: Ticket information extraction with Playwright
  - `NotificationService`: Multi-channel notification delivery
  - `CloudTasksService`: Event-driven notification scheduling

#### Domain Layer

- **Entities**: Core business objects with behavior
  - `Ticket`: Match ticket information with business logic
  - `NotificationHistory`: Notification tracking with duplicate prevention
  - `NotificationConfig`: Configuration-driven timing management
- **Interfaces**: Abstract contracts for external dependencies
  - `TicketRepository`: Data persistence abstraction
  - `NotificationRepository`: Notification history abstraction

#### Infrastructure Layer

- **Repository Implementations**: Concrete data access implementations
  - `TicketRepositoryImpl`: Supabase-based ticket storage
  - `NotificationRepositoryImpl`: Supabase-based notification tracking
- **Cloud Services Integration**: External service clients
  - `CloudTasksClient`: Google Cloud Tasks integration
  - `PlaywrightClient`: Web scraping automation
- **Converters**: Data transformation between database and domain models
- **Utils**: Common infrastructure utilities (error handling, logging)

## Data Flow

### Daily Ticket Check Flow (Updated)

```mermaid
sequenceDiagram
    participant CS as Cloud Scheduler
    participant CR as Cloud Run
    participant SS as ScrapingService
    participant JS as J-League Site
    participant TR as TicketRepository
    participant DB as Supabase DB
    participant CT as Cloud Tasks

    CS->>CR: Daily trigger (12:00 JST)
    CR->>SS: Start scraping process
    SS->>JS: Extract ticket data
    JS-->>SS: Return ticket information
    SS->>TR: Save/update tickets
    TR->>DB: Store ticket data
    DB-->>TR: Confirm storage
    TR->>CT: Schedule notifications
    CT-->>CR: Task scheduling confirmed
    CR-->>CS: Process completed
```

### Notification Flow (Updated)

```mermaid
sequenceDiagram
    participant CT as Cloud Tasks
    participant EF as Edge Functions
    participant NS as NotificationService
    participant NR as NotificationRepository
    participant LINE as LINE API
    participant DISC as Discord Webhook
    participant DB as Supabase DB

    CT->>EF: Trigger notification at scheduled time
    EF->>NS: Process notification request
    NS->>NR: Check notification status
    NR->>DB: Query notification history
    DB-->>NR: Return status
    NR-->>NS: Confirm not sent
    
    par Send to LINE
        NS->>LINE: Send notification
        LINE-->>NS: Delivery confirmation
    and Send to Discord
        NS->>DISC: Send monitoring alert
        DISC-->>NS: Webhook confirmation
    end
    
    NS->>NR: Update delivery status
    NR->>DB: Mark as sent
    DB-->>NR: Confirm update
    NR-->>EF: Process completed
```

### Notification Scheduling Flow

```mermaid
sequenceDiagram
    participant TR as TicketRepository
    participant DB as Supabase DB
    participant CT as Cloud Tasks
    participant NC as NotificationConfig

    TR->>DB: Insert new ticket
    DB->>DB: Trigger: create_notification_records()
    DB->>DB: Insert notification history records
    TR->>NC: Get notification timing config
    NC-->>TR: Return timing calculations
    
    loop For each notification type
        TR->>CT: Create scheduled task
        CT-->>TR: Task created with ID
    end
    
    TR-->>DB: All notifications scheduled
```

## System Components

### Google Cloud Platform Components (New)

#### Cloud Run Service

- **Purpose**: Execute web scraping with adequate resources
- **Configuration**:
  - Memory: 2GB
  - CPU: 1 vCPU
  - Timeout: 300 seconds
  - Concurrency: 1 (sequential processing)
- **Endpoints**:
  - `POST /scrape`: Main scraping endpoint
  - `GET /health`: Health check endpoint

#### Cloud Scheduler

- **Purpose**: Reliable daily trigger mechanism
- **Configuration**:
  - Schedule: 0 3 * * * (03:00 UTC = 12:00 JST)
  - Target: Cloud Run service
  - Authentication: OIDC token

#### Cloud Tasks

- **Purpose**: Event-driven notification scheduling
- **Configuration**:
  - Queue: notifications
  - Location: asia-northeast1
  - Retry policy: 3 attempts with exponential backoff
  - Rate limiting: 10 dispatches/second

### Supabase Components

#### PostgreSQL Database

- **Purpose**: Primary data storage with ACID compliance
- **Features**:
  - Row Level Security (RLS)
  - Automatic triggers for notification scheduling
  - Real-time subscriptions capability

#### PostgREST API

- **Purpose**: Auto-generated REST API from database schema
- **Features**:
  - Type-safe database operations
  - Automatic API documentation
  - Built-in filtering and pagination

#### Edge Functions

- **Purpose**: Serverless notification delivery
- **Functions**:
  - `send-notification`: Process individual notification requests
  - `system-health`: Monitor system status and performance

## Design Patterns

### Repository Pattern (Enhanced)

- Abstracts data access behind interfaces
- Enables testing with mock implementations
- Isolates domain logic from persistence concerns
- **New**: Integrates with Cloud Tasks for scheduling

```typescript
interface TicketRepository {
  save(ticket: Ticket): Promise<void>;
  findByMatchDate(date: Date): Promise<Ticket[]>;
  // Event-driven notification scheduling
  scheduleNotifications(ticketId: string): Promise<void>;
}
```

### Configuration-Driven Design (Enhanced)

- Externalized notification timing configuration
- Runtime adjustable without code changes
- Type-safe configuration management
- **New**: Supports complex timing calculations

```typescript
export const NOTIFICATION_TIMING_CONFIG = {
  day_before: {
    displayName: 'Day before sale start',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      const scheduledTime = new Date(saleStartDate);
      scheduledTime.setDate(scheduledTime.getDate() - 1);
      scheduledTime.setHours(20, 0, 0, 0);
      return scheduledTime;
    },
    toleranceMs: 5 * 60 * 1000,
  },
};
```

### Event-Driven Architecture

- **Decoupled Components**: Services communicate via events
- **Asynchronous Processing**: Non-blocking notification scheduling
- **Scalable Design**: Independent scaling of components
- **Error Isolation**: Failures in one component don't cascade

### Service Orchestration Pattern (New)

```typescript
// Cloud Run orchestrates multiple services
export class ScrapingOrchestrator {
  constructor(
    private scrapingService: ScrapingService,
    private ticketRepository: TicketRepository,
    private cloudTasksService: CloudTasksService,
  ) {}

  async executeDaily(): Promise<void> {
    const tickets = await this.scrapingService.scrapeTickets();

    for (const ticket of tickets) {
      await this.ticketRepository.save(ticket);
      await this.cloudTasksService.scheduleNotifications(ticket);
    }
  }
}
```

### Error Handling Strategy (Enhanced)

#### Layered Error Handling

- **Domain Layer**: Business rule violations
- **Application Layer**: Service orchestration errors
- **Infrastructure Layer**: External service failures
- **Interface Layer**: HTTP/request errors

#### Retry Mechanisms

- **Cloud Tasks**: Built-in exponential backoff
- **Database Operations**: Connection pool retry
- **External APIs**: Custom retry with circuit breaker

#### Error Recovery

```typescript
export class ErrorRecoveryService {
  async handleScrapingFailure(error: Error): Promise<void> {
    // Log structured error
    await this.logger.error('Scraping failed', { error, timestamp: new Date() });

    // Send alert to Discord
    await this.alertService.sendErrorAlert(error);

    // Schedule retry if appropriate
    if (this.shouldRetry(error)) {
      await this.scheduleRetry();
    }
  }
}
```

## Performance Characteristics

### System Performance Characteristics

| Metric                    | Performance Target | Implementation            |
| ------------------------- | ------------------ | ------------------------- |
| **Scraping Success Rate** | ~98%               | Cloud Run reliability     |
| **Notification Latency**  | <30 seconds        | Event-driven architecture |
| **Concurrent Processing** | Unlimited scaling  | Cloud Run auto-scaling    |
| **Error Recovery**        | 100% automated     | Cloud Tasks retry         |

### Resource Utilization

#### Cloud Run Optimization

- **Memory**: 2GB allocated for Playwright browser processes
- **CPU**: 1 vCPU for sufficient processing power
- **Cold Start**: Minimized with optimized container images
- **Scaling**: Automatic based on request volume

#### Database Optimization

- **Connection Pooling**: Supabase built-in pooling
- **Query Optimization**: Indexed columns for fast retrieval
- **Batch Operations**: Multiple notifications scheduled together

## Security Design

### Multi-Layer Security Architecture

#### Service-to-Service Authentication

```typescript
const AUTH_FLOW = {
  'Cloud Scheduler → Cloud Run': 'OIDC Token (Service Account)',
  'Cloud Run → Supabase': 'Service Role Key (JWT)',
  'Cloud Tasks → Edge Functions': 'Service Role Key (Authorization Header)',
  'Edge Functions → External APIs': 'API Keys (Environment Variables)',
};
```

#### Data Protection

- **Encryption in Transit**: TLS 1.3 for all API communications
- **Encryption at Rest**: Supabase automatic database encryption
- **Secrets Management**: Environment variables with proper access controls
- **Input Validation**: Type-safe processing at all boundaries

#### Access Control

- **Principle of Least Privilege**: Minimal required permissions
- **IAM Policies**: Fine-grained Google Cloud IAM roles
- **Network Security**: Private service communication where possible

## Monitoring and Observability

### Distributed Tracing

```typescript
interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: Date;
  endTime?: Date;
  tags: Record<string, any>;
}
```

### Structured Logging

```typescript
interface LogEntry {
  timestamp: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  service: 'cloud-run' | 'edge-functions' | 'cloud-tasks';
  operation: string;
  traceId?: string;
  duration_ms?: number;
  data?: Record<string, any>;
  error?: Error;
}
```

### Health Monitoring

#### Service Health Checks

- **Cloud Run**: `/health` endpoint with dependency checks
- **Edge Functions**: Built-in health monitoring
- **Database**: Connection and query performance monitoring
- **External Services**: API availability and response time tracking

#### Alert Thresholds

```typescript
const ALERT_THRESHOLDS = {
  SCRAPING_FAILURE_RATE: 0.1, // 10% failure rate
  NOTIFICATION_DELAY_MINUTES: 5, // 5 minutes delay
  ERROR_COUNT_PER_HOUR: 10, // 10 errors per hour
  RESPONSE_TIME_MS: 30000, // 30 second response time
};
```
