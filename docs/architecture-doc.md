# Architecture Design Document

## System Overview

The urawa-support-hub is an automated ticket monitoring and notification system for Urawa Red
Diamonds supporters. The system scrapes ticket information from the J-League website, stores it in a
database, and sends timely notifications to LINE groups before ticket sales begin.

## System Architecture

This system utilizes a hybrid architecture combining Google Cloud Platform services with Supabase
backend:

- **Google Cloud Run**: Web scraping execution environment
- **Google Cloud Tasks**: Efficient notification scheduling
- **Supabase**: Database and Edge Functions for notifications
- **Event-driven**: Notification system for improved efficiency

## Technology Stack

| Layer                       | Technology              | Purpose                               | Execution Frequency |
| --------------------------- | ----------------------- | ------------------------------------- | ------------------- |
| **Scraping Execution**      | Google Cloud Run        | Playwright execution, data extraction | Once daily          |
| **Schedule Trigger**        | Google Cloud Scheduler  | Trigger daily scraping                | 12:00 JST daily     |
| **Notification Scheduling** | Google Cloud Tasks      | Individual notification timing        | As scheduled        |
| **Data Storage**            | Supabase PostgreSQL     | Ticket and notification history       | Real-time           |
| **Data API**                | Supabase PostgREST      | CRUD operations                       | On-demand           |
| **Notification Delivery**   | Supabase Edge Functions | LINE/Discord messaging                | When triggered      |

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Google Cloud Platform                  │
├─────────────────────────────────────────────────────────┤
│  Cloud Scheduler → Cloud Run → Cloud Tasks              │
│       ↓              ↓            ↓                      │
│   (12:00 JST)   (Scraping)   (Schedule)                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                      Supabase                           │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL ← PostgREST API → Edge Functions           │
│      ↓           ↓                ↓                     │
│   (Storage)   (CRUD API)    (Notifications)            │
└─────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────┐
│                  External Services                      │
├─────────────────────────────────────────────────────────┤
│            LINE API        Discord Webhook              │
└─────────────────────────────────────────────────────────┘
```

## Detailed Component Design

### 1. Scraping Layer (Google Cloud Run)

**Purpose**: Execute web scraping with Playwright to extract ticket information from J-League
website.

**Implementation**:

```javascript
// Cloud Run Service
export async function scrapeTickets() {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto('https://www.jleague-ticket.jp/club/ur/?tab=away');

  // Extract ticket information
  const tickets = await page.evaluate(() => {
    // DOM parsing logic
    return extractedTickets;
  });

  await browser.close();
  return tickets;
}
```

**Container Configuration**:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "index.js"]
```

**Resource Requirements**:

- Memory: 2GB
- CPU: 1 vCPU
- Timeout: 300 seconds
- Concurrency: 1

### 2. Scheduling Layer

#### Cloud Scheduler

**Purpose**: Trigger daily scraping at 12:00 JST

```yaml
schedule: '0 3 * * *' # 03:00 UTC = 12:00 JST
target:
  uri: https://ticket-scraper-xxxxx-an.a.run.app/scrape
  http_method: POST
  oidc_token:
    service_account_email: scraper@project.iam.gserviceaccount.com
```

#### Cloud Tasks

**Purpose**: Schedule individual notifications at specific times

```javascript
async function scheduleNotification(ticketId, notificationTime, type) {
  const task = {
    httpRequest: {
      url: `${SUPABASE_URL}/functions/v1/send-notification`,
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: Buffer.from(JSON.stringify({
        ticketId,
        notificationType: type,
      })),
    },
    scheduleTime: {
      seconds: Math.floor(notificationTime.getTime() / 1000),
    },
  };

  await tasksClient.createTask({
    parent: queuePath,
    task,
  });
}
```

### 3. Data Layer (Supabase)

#### Database Schema

```sql
-- Tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    notification_type VARCHAR NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    sent_time TIMESTAMPTZ,
    status VARCHAR NOT NULL DEFAULT 'scheduled',
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_status_scheduled (status, scheduled_time)
);

-- Trigger for notification record creation
CREATE OR REPLACE FUNCTION create_notification_records()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_history 
    (ticket_id, notification_type, scheduled_time, status)
  VALUES
    (NEW.id, 'day_before', NEW.sale_start_date - interval '1 day' + time '20:00', 'scheduled'),
    (NEW.id, 'one_hour', NEW.sale_start_date - interval '1 hour', 'scheduled'),
    (NEW.id, '15_minutes', NEW.sale_start_date - interval '15 minutes', 'scheduled');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ticket_insert
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION create_notification_records();
```

### 4. Notification Layer (Supabase Edge Functions)

**Purpose**: Send notifications to LINE and Discord when triggered by Cloud Tasks

```typescript
// Edge Function: send-notification
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  // Verify authorization
  const authHeader = req.headers.get('Authorization');
  if (!isValidServiceRole(authHeader)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { ticketId, notificationType } = await req.json();

  // Fetch ticket details
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  // Check if already sent
  const { data: notification } = await supabase
    .from('notification_history')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('notification_type', notificationType)
    .single();

  if (notification.status === 'sent') {
    return new Response('Already sent', { status: 200 });
  }

  // Send to LINE
  await sendLineNotification(ticket, notificationType);

  // Send to Discord for monitoring
  await sendDiscordNotification(ticket, notificationType);

  // Update status
  await supabase
    .from('notification_history')
    .update({
      status: 'sent',
      sent_time: new Date().toISOString(),
    })
    .eq('id', notification.id);

  return new Response('Success', { status: 200 });
});
```

## Data Flow

### Complete Processing Flow

1. **Daily Scraping (12:00 JST)**
   - Cloud Scheduler triggers Cloud Run
   - Cloud Run executes Playwright scraping
   - Extracts ticket data from J-League website

2. **Data Storage**
   - Cloud Run saves tickets via Supabase PostgREST API
   - Database trigger creates notification records
   - Cloud Run registers notification tasks with Cloud Tasks

3. **Notification Scheduling**
   - Cloud Tasks holds notification tasks until scheduled time
   - Three notifications per ticket:
     - Day before at 20:00 JST
     - 1 hour before sale start
     - 15 minutes before sale start

4. **Notification Delivery**
   - Cloud Tasks triggers Edge Functions at scheduled time
   - Edge Functions retrieve ticket details
   - Send notifications to LINE group
   - Send monitoring info to Discord
   - Update notification status in database

## Security Architecture

### Authentication & Authorization

#### Service-to-Service Authentication

- **Cloud Run → Supabase**: Service Role Key (environment variable)
- **Cloud Tasks → Edge Functions**: Service Role Key in Authorization header
- **Cloud Scheduler → Cloud Run**: OIDC token with service account

#### Security Best Practices

- All API keys stored in environment variables
- Service Role Keys rotated quarterly
- Minimum privilege principle for service accounts
- No public endpoints without authentication

### Data Protection

- TLS encryption for all API communications
- No PII storage in logs
- Database Row Level Security (RLS) policies
- Input validation at all entry points

## Configuration Management

### Environment Variables

#### Cloud Run Configuration

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
GOOGLE_CLOUD_PROJECT=urawa-support-hub
CLOUD_TASKS_QUEUE=notifications
CLOUD_TASKS_LOCATION=asia-northeast1
```

#### Edge Functions Configuration

```bash
LINE_CHANNEL_ACCESS_TOKEN=xxxxx
LINE_GROUP_ID=Cxxxxx
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxx
```

### Notification Timing Configuration

```javascript
const NOTIFICATION_CONFIG = {
  day_before: {
    offsetHours: -4, // 20:00 on previous day for 00:00 sale
    displayName: 'Day before sale',
  },
  one_hour: {
    offsetMinutes: -60,
    displayName: '1 hour before sale',
  },
  fifteen_minutes: {
    offsetMinutes: -15,
    displayName: '15 minutes before sale',
  },
};
```

## Monitoring & Observability

### Logging Strategy

#### Structured Logging Format

```json
{
  "timestamp": "2025-01-20T12:00:00Z",
  "severity": "INFO",
  "service": "ticket-scraper",
  "operation": "scrape_tickets",
  "duration_ms": 3500,
  "tickets_found": 5,
  "trace_id": "xxxxx"
}
```

### Health Monitoring

#### Cloud Run Health Check

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '1.0.0',
  });
});
```

#### Notification Monitoring via Discord

- Successful notifications logged
- Failed notifications with error details
- Daily summary of notification stats

### Error Handling

#### Retry Strategy

- Cloud Tasks: Automatic retry with exponential backoff
- Maximum 3 retry attempts
- Dead letter queue for persistent failures

#### Error Notification

```javascript
async function notifyError(error, context) {
  await sendDiscordAlert({
    level: 'ERROR',
    service: context.service,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
}
```

## Performance Optimization

### Scraping Optimization

- Parallel page processing where possible
- Browser context reuse
- Minimal DOM interactions
- Response caching for static resources

### Database Optimization

- Indexes on frequently queried columns
- Batch inserts for multiple tickets
- Connection pooling
- Query result caching

### Cloud Tasks Optimization

- Batch task creation
- Appropriate queue configuration
- Rate limiting to prevent API throttling

## Cost Analysis

### Google Cloud (Monthly)

- **Cloud Run**: ~60 minutes/month = Free (180,000 vCPU-seconds free tier)
- **Cloud Scheduler**: 1 job = Free (3 jobs free tier)
- **Cloud Tasks**: ~300 tasks/month = Free (1 million tasks free tier)

### Supabase (Monthly)

- **Database**: < 500MB = Free
- **Edge Functions**: ~300 invocations = Free
- **API Calls**: Minimal = Free

**Total Monthly Cost**: $0 (completely within free tiers)

## Scalability Considerations

### System Capacity

- Tickets: ~10-20 per month
- Notifications: ~30-60 per month
- Users: Single LINE group

### Future Expansion Capability

- Users: Up to 1,000 users (Cloud Tasks free tier supports 1M tasks/month)
- Tickets: Up to 1,000 per month
- Notification channels: Easily add email, push notifications
- Custom timing: Supported via Cloud Tasks dynamic scheduling

## Future Enhancement Path

### Phase 1

- ✅ Automated scraping
- ✅ Fixed notification timing
- ✅ LINE group notifications

### Phase 2 (Next)

- Manual ticket addition via API
- User preference management
- Individual LINE notifications

### Phase 3 (Future)

- Mobile app with push notifications
- AI-powered ticket recommendations
- Multi-language support
- Seat availability tracking

### Phase 4 (Advanced)

- Ticket purchase automation
- Price tracking and alerts
- Social features for supporter groups
- Integration with official fan club systems

## Deployment Guide

### Prerequisites

1. Google Cloud account with billing enabled
2. Supabase project created
3. LINE Messaging API channel
4. Discord webhook (optional)

### Cloud Run Deployment

```bash
# Build and deploy
gcloud run deploy ticket-scraper \
  --source . \
  --region asia-northeast1 \
  --memory 2Gi \
  --timeout 300 \
  --max-instances 1 \
  --min-instances 0

# Set environment variables
gcloud run services update ticket-scraper \
  --set-env-vars SUPABASE_URL=xxx,SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Cloud Scheduler Setup

```bash
gcloud scheduler jobs create http daily-scraping \
  --location asia-northeast1 \
  --schedule="0 3 * * *" \
  --uri="https://ticket-scraper-xxx-an.a.run.app/scrape" \
  --http-method=POST
```

### Cloud Tasks Queue Creation

```bash
gcloud tasks queues create notifications \
  --location=asia-northeast1 \
  --max-dispatches-per-second=10 \
  --max-concurrent-dispatches=10
```

## Conclusion

This architecture provides a robust, scalable, and cost-effective solution for automated ticket
monitoring and notifications. The use of Google Cloud Platform services ensures reliability and
performance, while Supabase provides a powerful backend with minimal operational overhead. The
system is designed to be easily maintainable and extensible for future enhancements.
