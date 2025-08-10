# Basic Design Document

## System Architecture

### Clean Architecture Implementation

```
┌─────────────────────────────────────┐
│     Edge Functions (Interface)     │  ← daily-check, notification-check
├─────────────────────────────────────┤
│      Application Services          │  ← ScrapingService, NotificationService  
├─────────────────────────────────────┤
│        Domain Layer                │  ← Entities: Ticket, NotificationHistory
│                                     │    Interfaces: TicketRepository
├─────────────────────────────────────┤
│     Infrastructure Layer           │  ← RepositoryImpl, Supabase Client
└─────────────────────────────────────┘
```

### Layer Responsibilities

#### Domain Layer

- **Entities**: Core business objects with behavior
  - `Ticket`: Match ticket information with business logic
  - `NotificationHistory`: Notification tracking with duplicate prevention
- **Interfaces**: Abstract contracts for external dependencies
  - `TicketRepository`: Data persistence abstraction
  - `NotificationRepository`: Notification history abstraction

#### Infrastructure Layer

- **Repository Implementations**: Concrete data access implementations
  - `TicketRepositoryImpl`: Supabase-based ticket storage
  - `NotificationRepositoryImpl`: Supabase-based notification tracking
- **Converters**: Data transformation between database and domain models
- **Utils**: Common infrastructure utilities (error handling, logging)

#### Application Layer

- **Services**: Orchestration of domain operations
  - `ScrapingService`: Ticket information extraction
  - `NotificationService`: Multi-channel notification delivery

#### Interface Layer

- **Edge Functions**: HTTP endpoints for scheduled operations
  - `daily-check`: Daily ticket monitoring
  - `notification-check`: Time-based notification triggers

## Data Flow

### Daily Ticket Check Flow

1. Edge Function triggers scraping service
2. ScrapingService extracts ticket data from J-League site
3. TicketRepositoryImpl persists new/updated tickets
4. Ticket entities validate business rules
5. System schedules appropriate notifications

### Notification Flow

1. Scheduled trigger activates notification check
2. NotificationService queries due notifications
3. Multi-channel delivery (LINE + Discord monitoring)
4. NotificationHistory tracks delivery status
5. Error handling and retry logic

## Design Patterns

### Repository Pattern

- Abstracts data access behind interfaces
- Enables testing with mock implementations
- Isolates domain logic from persistence concerns

### Configuration-Driven Design

- Externalized notification timing configuration
- Runtime adjustable without code changes
- Type-safe configuration management

### Error Handling Strategy

- Centralized error processing utilities
- Structured error logging
- Graceful degradation and recovery
