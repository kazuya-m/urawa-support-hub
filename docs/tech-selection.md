# Technology Selection Document

## Technology Stack Overview

### Architecture Evolution

The system utilizes a hybrid GCP + Supabase architecture to address scalability and reliability
requirements for web scraping workloads.

## Core Technology Stack

### Runtime Environment

- **Deno + TypeScript**: Modern runtime with built-in TypeScript support
- **Reason**: Type safety, modern JavaScript features, secure by default
- **Use Cases**: All application logic, Edge Functions, Cloud Run services

### Cloud Computing Platform

#### Google Cloud Platform

- **Google Cloud Run**: Containerized web scraping execution environment
- **Google Cloud Scheduler**: Reliable daily trigger mechanism
- **Google Cloud Tasks**: Event-driven notification scheduling
- **Reason**: Better resource allocation for Playwright, automatic scaling, cost-effective

#### Supabase Platform

- **Supabase PostgreSQL**: Cloud-native PostgreSQL with REST API
- **Supabase Edge Functions**: Serverless notification delivery
- **Supabase PostgREST API**: Auto-generated REST API from schema
- **Reason**: Free tier availability, real-time capabilities, integrated with database

### Database

- **Supabase PostgreSQL**: Primary data storage
- **Reason**:
  - Free tier availability
  - Built-in Row Level Security (RLS)
  - Real-time subscriptions
  - Auto-generated REST API
  - Integrated with Edge Functions

### Web Scraping

- **Playwright**: Modern browser automation library
- **Execution Environment**: Google Cloud Run (changed from Edge Functions)
- **Reason**:
  - Reliable scraping with JavaScript execution support
  - Multiple browser support (Chromium, Firefox, WebKit)
  - Adequate resource allocation in Cloud Run (2GB memory)
  - Sufficient execution time (300s timeout)
  - Container-based deployment

### Notification Services

- **LINE Messaging API**: Primary user notifications
- **Discord Webhook**: Developer/system monitoring and error alerts
- **Reason**: Target user base preferences, reliable delivery, rich formatting

### Scheduling Architecture

#### Hybrid Approach

- **Google Cloud Scheduler**: Daily scraping trigger (12:00 JST)
- **Google Cloud Tasks**: Individual notification scheduling
- **Reason**:
  - More reliable than pg_cron for external service calls
  - Event-driven notifications (no polling)
  - Better retry mechanisms with exponential backoff
  - Automatic dead letter queue handling

#### v1.0 Approach (Deprecated)

- **pg_cron**: PostgreSQL extension for scheduled tasks
- **Reason for Change**: Limited memory and execution time for scraping

### Architecture Pattern

- **Clean Architecture**: Domain-driven design with clear separation of concerns
- **Repository Pattern**: Data access abstraction
- **Configuration-Driven Design**: Externalized business rules and timing
- **Reason**: Testability, maintainability, external service independence

## Technology Comparison

### Scraping Execution Environment

| Aspect                 | Supabase Edge Functions | Google Cloud Run            |
| ---------------------- | ----------------------- | --------------------------- |
| **Memory Limit**       | 512MB                   | 2GB                         |
| **Execution Time**     | 60 seconds              | 300 seconds                 |
| **Container Support**  | Deno runtime only       | Full Docker containers      |
| **Playwright Support** | Limited                 | Full support                |
| **Cold Start**         | ~100ms                  | ~1-2 seconds                |
| **Cost**               | Free (500,000 requests) | Free (180,000 vCPU-seconds) |
| **Reliability**        | Good                    | Excellent                   |

**Decision**: Cloud Run chosen for better resource allocation and Playwright compatibility.

### Scheduling Mechanisms

| Aspect             | pg_cron               | Cloud Scheduler + Tasks      |
| ------------------ | --------------------- | ---------------------------- |
| **Reliability**    | Database-dependent    | Independent service          |
| **Retry Logic**    | Manual implementation | Built-in exponential backoff |
| **Error Handling** | Limited               | Dead letter queue            |
| **Scalability**    | Database load         | Unlimited task queuing       |
| **Cost**           | Free                  | Free (1M tasks/month)        |
| **Monitoring**     | PostgreSQL logs       | Cloud Console + logging      |

**Decision**: Cloud Scheduler + Tasks for better reliability and error handling.

## Technology Dependencies

### Runtime Dependencies

```typescript
// Core Dependencies (Deno)
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Google Cloud Dependencies
import { CloudTasksClient } from 'https://esm.sh/@google-cloud/tasks@4.0.0';
import { CloudSchedulerClient } from 'https://esm.sh/@google-cloud/scheduler@3.0.0';

// Web Scraping
import { chromium } from 'https://esm.sh/playwright-chromium@1.40.0';

// Testing Framework
import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
```

### External Services

- **J-League Ticket Site**: Primary data source
- **LINE Messaging API**: User notification delivery
- **Discord Webhooks**: System monitoring and alerts
- **Google Cloud APIs**: Tasks, Scheduler, Run services

## Performance Characteristics

### System Performance Specifications

| Metric                    | Target Performance    | Implementation Strategy      |
| ------------------------- | --------------------- | ---------------------------- |
| **Scraping Success Rate** | ~98%                  | Cloud Run adequate resources |
| **Notification Latency**  | <30 seconds           | Event-driven architecture    |
| **Error Recovery**        | Fully automated       | Cloud Tasks automatic retry  |
| **Resource Utilization**  | Optimal allocation    | GCP + Supabase hybrid        |
| **Cost Efficiency**       | Within all free tiers | Optimized resource usage     |

### Scalability Metrics

- **Expected Load**: ~10-20 tickets/month, ~30-60 notifications/month
- **Supported Scale**: Up to 1,000 tickets/month, 3,000 notifications/month
- **Bottlenecks**: J-League site rate limiting, LINE API rate limits
- **Future Scaling**: Regional deployment, caching layers

## Security Considerations

### Authentication Architecture

```typescript
// Service Authentication Matrix
const AUTH_MATRIX = {
  'Cloud Scheduler → Cloud Run': 'OIDC Token (Service Account)',
  'Cloud Run → Supabase': 'Service Role Key',
  'Cloud Tasks → Edge Functions': 'Service Role Key',
  'Edge Functions → LINE API': 'Channel Access Token',
  'Edge Functions → Discord': 'Webhook URL (no auth)',
};
```

### Security Best Practices

- **Principle of Least Privilege**: Minimal IAM permissions
- **Secrets Management**: Environment variables with rotation
- **Network Security**: Private service communication where possible
- **Input Validation**: Type-safe data processing throughout
- **Audit Logging**: Comprehensive security event logging

## Cost Analysis

### Monthly Cost Breakdown (Free Tier)

#### Google Cloud Platform

- **Cloud Run**: 60 minutes execution = $0 (within 180,000 vCPU-seconds free tier)
- **Cloud Scheduler**: 1 job = $0 (within 3 jobs free tier)
- **Cloud Tasks**: ~300 tasks = $0 (within 1M tasks free tier)
- **Cloud Logging**: <1GB = $0 (within free tier)

#### Supabase

- **Database Storage**: <500MB = $0
- **Edge Functions**: ~300 invocations = $0
- **API Requests**: ~1,000 requests = $0
- **Bandwidth**: <1GB = $0

#### External Services

- **LINE Messaging API**: Free (push messages within limits)
- **Discord Webhooks**: Free

**Total Monthly Cost**: $0 (completely within all free tiers)

### Future Cost Projections

- **10x Scale** (100-200 tickets/month): Still within free tiers
- **100x Scale** (1,000-2,000 tickets/month): ~$5-10/month estimated
- **1000x Scale**: Requires paid tiers, estimated ~$50-100/month

## Alternative Technology Evaluations

### Considered Alternatives

#### AWS Lambda + DynamoDB

- **Pros**: Mature ecosystem, extensive integrations
- **Cons**: Cold start latency, more complex pricing, vendor lock-in
- **Decision**: GCP + Supabase hybrid chosen for simplicity

#### Azure Functions + Cosmos DB

- **Pros**: Good enterprise integration
- **Cons**: Less generous free tiers, complexity
- **Decision**: Not suitable for this project's requirements

#### Self-hosted Solution

- **Pros**: Full control, no vendor dependency
- **Cons**: Operational overhead, reliability concerns
- **Decision**: Managed services preferred for this project

### Technology Selection Criteria

1. **Free Tier Adequacy**: Must operate within free tiers
2. **Reliability**: 99%+ uptime requirement
3. **Developer Experience**: TypeScript support, good documentation
4. **Scalability**: Handle 10x growth without architecture changes
5. **Maintenance Overhead**: Minimal operational requirements
6. **Community Support**: Active community, regular updates
