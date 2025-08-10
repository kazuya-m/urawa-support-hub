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
  shouldSendNotification(type: NotificationType, currentTime: Date): boolean;
  isExpired(): boolean;
  getNotificationMessage(type: NotificationType): string;
}
```

#### Key Responsibilities

- Match ticket information encapsulation
- Notification timing business logic
- Data validation and business rules

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
  ) {}

  // Business Logic Methods
  canRetry(): boolean;
  markAsSent(): NotificationHistory;
  incrementRetry(): NotificationHistory;
}
```

#### Key Responsibilities

- Notification delivery tracking
- Retry logic management
- Duplicate prevention

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
}
```

## Infrastructure Implementations

### TicketRepositoryImpl

```typescript
export class TicketRepositoryImpl implements TicketRepository {
  constructor(private supabaseClient: SupabaseClient) {}

  async save(ticket: Ticket): Promise<void> {
    const dbData = TicketConverter.toDatabase(ticket);
    const { error } = await this.supabaseClient
      .from('tickets')
      .insert(dbData);

    if (error) handleSupabaseError('save ticket', error);
  }

  // Other implementation methods...
}
```

### Data Converters

#### TicketConverter

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
  },
  one_hour_before: {
    displayName: '1 hour before sale start',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      const oneHourBefore = new Date(saleStartDate.getTime() - 60 * 60 * 1000);
      return oneHourBefore;
    },
    toleranceMs: 2 * 60 * 1000, // 2 minutes
  },
  fifteen_minutes_before: {
    displayName: '15 minutes before sale start',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      const fifteenMinBefore = new Date(saleStartDate.getTime() - 15 * 60 * 1000);
      return fifteenMinBefore;
    },
    toleranceMs: 1 * 60 * 1000, // 1 minute
  },
} as const;
```

## Error Handling Strategy

### Common Error Handler

```typescript
export function handleSupabaseError(operation: string, error: any): never {
  const message = `Failed to ${operation}: ${error.message}`;
  console.error(message, { error, operation });
  throw new Error(message);
}
```

### Error Types

- **ValidationError**: Business rule violations
- **DatabaseError**: Data persistence failures
- **NetworkError**: External service communication failures
- **ConfigurationError**: Invalid configuration settings

## Testing Strategy

### Test Structure

- **Unit Tests**: Entity business logic, repository implementations
- **Integration Tests**: Database operations, end-to-end workflows
- **Mock Utilities**: External service simulation

### Test Organization

```
src/domain/entities/__tests__/
├── Ticket.test.ts (8 test cases)
├── NotificationHistory.test.ts (11 test cases)

src/infrastructure/repositories/__tests__/
├── TicketRepositoryImpl.test.ts (9 test cases)
├── NotificationRepositoryImpl.test.ts (8 test cases)

tests/integration/
├── repository.test.ts (9 test cases)
```

**Total: 45 test cases ensuring comprehensive coverage**
