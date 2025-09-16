# Logging Specification and Implementation Guide

## Overview

This document defines the logging specification and implementation guide for the urawa-support-hub
project. It leverages GCP Cloud Logging to implement data quality monitoring and alert notifications
through structured logs.

## Architecture Overview

```
Cloud Scheduler → Cloud Run → Cloud Logging → Cloud Monitoring
                      ↓                           ↓
                 Structured Logs            Alert Policies
                      ↓                           ↓
                 Log Explorer              Discord Webhook
```

## Basic Policies

1. **30-day Retention Policy**: Logs are retained for 30 days and automatically deleted thereafter
   (to avoid billing)
2. **Structured Logs**: Output in JSON format for automatic parsing by Cloud Logging
3. **Appropriate Log Levels**: Only INFO and above are output in production environments
4. **Minimal Information**: Only necessary minimal information is recorded in logs
5. **GCP Complete Solution**: Complete solution within GCP without using Supabase's error_logs table

## Log Level Definitions

Using Cloud Logging's standard severity levels:

| Level    | Purpose                               | Output Environment | Examples                                                  |
| -------- | ------------------------------------- | ------------------ | --------------------------------------------------------- |
| DEBUG    | Detailed information for development  | Development only   | Pattern matching details, intermediate processing results |
| INFO     | Normal processing information         | All environments   | Process completion, statistics                            |
| WARNING  | Warnings (processing continues)       | All environments   | Unknown pattern detection, fallback processing            |
| ERROR    | Errors (individual failures)          | All environments   | Missing required fields, parsing failures                 |
| CRITICAL | Critical errors (system-wide failure) | All environments   | Complete scraping failure, system errors                  |

※ NOTICE, ALERT, EMERGENCY are not used (for simplicity)

## Log Structure Specification

### Basic Structure

```typescript
interface CloudLoggingEntry {
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  // Cloud Logging special fields (automatically set)
  'logging.googleapis.com/labels'?: {
    service?: string; // From K_SERVICE environment variable
    revision?: string; // From K_REVISION environment variable
  };
  // Custom payload
  jsonPayload?: {
    category: LogCategory;
    context?: LogContext;
    dataQuality?: DataQualityInfo;
    metrics?: ProcessingMetrics;
    error?: ErrorInfo;
  };
}
```

### Category Definitions

```typescript
enum LogCategory {
  TICKET_COLLECTION = 'TICKET_COLLECTION', // Ticket collection processing (scraping, etc.)
  PARSING = 'PARSING', // Data parsing processing
  VALIDATION = 'VALIDATION', // Data validation processing
  NOTIFICATION = 'NOTIFICATION', // Notification processing
  DATABASE = 'DATABASE', // Database processing
  SYSTEM = 'SYSTEM', // General system
}
```

### Data Structure Definitions

```typescript
// Context information
interface LogContext {
  sessionId?: string; // Scraping session ID
  ticketId?: string; // Ticket ID
  matchName?: string; // Match name
  ticketUrl?: string; // Ticket URL
  processingStage?: string; // Processing stage
}

// Data quality information
interface DataQualityInfo {
  issueType: 'MISSING_FIELD' | 'UNKNOWN_PATTERN' | 'INVALID_FORMAT';
  field: string; // Target field name
  rawValue?: any; // Actual value
  expectedPattern?: string; // Expected pattern
}

// Processing metrics
interface ProcessingMetrics {
  totalProcessed: number; // Total processed count
  successCount: number; // Success count
  failureCount: number; // Failure count
  unknownPatterns: number; // Unknown pattern count
  processingTimeMs: number; // Processing time (milliseconds)
  successRate?: number; // Success rate (0.0-1.0)
}

// Error information
interface ErrorInfo {
  code?: string; // Error code (using ErrorCodes constants)
  details?: string; // Detailed message
  stack?: string; // Stack trace (development environment only)
  recoverable: boolean; // Whether recoverable
}
```

## Error Code Constants Definition

```typescript
// src/shared/logging/ErrorCodes.ts
export const ErrorCodes = {
  // Scraping related - specific failure causes
  SCRAPING_SITE_UNREACHABLE: 'SCR_001', // Cannot access site
  SCRAPING_TIMEOUT: 'SCR_002', // Timeout
  SCRAPING_PAGE_STRUCTURE_CHANGED: 'SCR_003', // Page structure changed
  SCRAPING_NO_TICKETS_FOUND: 'SCR_004', // No ticket information found

  // Data parsing related - ERROR (business function impediment)
  PARSE_MATCH_DATE_UNKNOWN_FORMAT: 'PRS_001', // Unknown format for match date/time
  PARSE_SALE_START_DATE_MISSING_BEFORE_SALE: 'PRS_002', // Cannot get sale start date for pre-sale (notification impossible)
  PARSE_TICKET_URL_INVALID: 'PRS_003', // Invalid ticket URL
  PARSE_MATCH_NAME_EMPTY: 'PRS_004', // Empty match name

  // Data parsing related - WARNING (missing supplementary information, processing can continue)
  PARSE_SALE_END_DATE_MISSING_ON_SALE: 'PRS_W001', // Cannot get sale end date for on-sale ticket
  PARSE_SALE_STATUS_UNKNOWN: 'PRS_W002', // Cannot determine sale status
  PARSE_VENUE_INFO_MISSING: 'PRS_W003', // Cannot get venue information
  PARSE_COMPETITION_MISSING: 'PRS_W004', // Cannot get competition name
  PARSE_TEAM_INFO_INCOMPLETE: 'PRS_W005', // Incomplete home/away team information

  // Database related - by operation
  DB_CONNECTION_FAILED: 'DB_001', // Connection failure
  DB_SAVE_TICKET_FAILED: 'DB_002', // Ticket save failure
  DB_QUERY_TIMEOUT: 'DB_003', // Query timeout

  // Notification related - business logic
  NOTIFICATION_LINE_API_ERROR: 'NOT_001', // LINE API error
  NOTIFICATION_SCHEDULE_FAILED: 'NOT_002', // Schedule failure

  // System related - critical failures
  SYS_TOTAL_FAILURE: 'SYS_001', // System-wide failure
  SYS_RESOURCE_EXHAUSTED: 'SYS_002', // Resource exhaustion
  SYS_UNEXPECTED_ERROR: 'SYS_003', // Unexpected exception
  EXT_ALL_SERVICES_DOWN: 'EXT_001', // All external services down
  DB_SYSTEM_DOWN: 'DB_999', // Database system completely down
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

## Log Search Query Examples

### Cloud Logging Queries

#### 📊 **Basic Data Quality Error Search**

```sql
-- Data quality error search
resource.type="cloud_run_revision"
jsonPayload.dataQuality.issueType=("UNKNOWN_PATTERN" OR "MISSING_FIELD")
timestamp>="2025-09-13T00:00:00Z"

-- Today's error rate calculation
resource.type="cloud_run_revision"
severity>="ERROR"
timestamp>=timestamp_trunc(@timestamp, DAY)
| stats count() as error_count by bin(timestamp, 1h)

-- Specific field issue tracking
resource.type="cloud_run_revision"
jsonPayload.dataQuality.field="saleStartDate"
jsonPayload.dataQuality.issueType="MISSING_FIELD"
```

#### 🎫 **Detailed Ticket Collection Log Search (Issue #108)**

```sql
-- Individual ticket processing result search
resource.type="cloud_run_revision"
jsonPayload.category="TICKET_COLLECTION"
(message:"Ticket created" OR message:"Ticket updated" OR message:"Ticket unchanged")
timestamp>=timestamp_trunc(@timestamp, DAY)

-- Specific match processing history tracking
resource.type="cloud_run_revision"
jsonPayload.context.matchName:"Yokohama F. Marinos"

-- Specific ticket ID processing history
resource.type="cloud_run_revision"
jsonPayload.context.ticketId="urawa-vs-yokohama-20250315"

-- Newly created tickets only
resource.type="cloud_run_revision"
message:"Ticket created"
timestamp>=timestamp_trunc(@timestamp, DAY)

-- Updated tickets only
resource.type="cloud_run_revision"
message:"Ticket updated"
timestamp>=timestamp_trunc(@timestamp, DAY)

-- Unchanged tickets
resource.type="cloud_run_revision"
message:"Ticket unchanged"
timestamp>=timestamp_trunc(@timestamp, DAY)
```

#### 🔔 **Notification Scheduling Log Search**

```sql
-- Notification scheduling success logs
resource.type="cloud_run_revision"
jsonPayload.category="NOTIFICATION"
message:"Notifications scheduled"
timestamp>=timestamp_trunc(@timestamp, DAY)

-- Specific match notification scheduling history
resource.type="cloud_run_revision"
jsonPayload.category="NOTIFICATION"
jsonPayload.context.matchName:"Yokohama F. Marinos"

-- Notification related errors
resource.type="cloud_run_revision"
jsonPayload.category="NOTIFICATION"
severity>="ERROR"

-- NotificationSchedulerService errors
resource.type="cloud_run_revision"
jsonPayload.category="NOTIFICATION"
(message:"Failed to schedule" OR message:"dequeue operations failed")
```

#### 📈 **Collection Processing Statistics and Metrics Search**

```sql
-- Ticket collection completion summary
resource.type="cloud_run_revision"
message:"Ticket collection completed"
timestamp>=timestamp_trunc(@timestamp, DAY)

-- Collection processing success rate analysis
resource.type="cloud_run_revision"
jsonPayload.category="TICKET_COLLECTION"
jsonPayload.metrics.successRate>=0
timestamp>=timestamp_trunc(@timestamp, WEEK)

-- Processing time performance analysis
resource.type="cloud_run_revision"
jsonPayload.metrics.processingTimeMs>0
timestamp>=timestamp_trunc(@timestamp, DAY)

-- Daily processing count trends
resource.type="cloud_run_revision"
jsonPayload.metrics.totalProcessed>0
| stats avg(jsonPayload.metrics.totalProcessed) as avg_processed by bin(timestamp, 1d)
```

#### 🔍 **Debug and Operations Monitoring Queries**

```sql
-- Session-based processing tracking
resource.type="cloud_run_revision"
jsonPayload.context.sessionId="ea7fc161-bfe0-4286-aa04-f7bd852e7f72"

-- Today's processing result summary (by count)
resource.type="cloud_run_revision"
jsonPayload.category="TICKET_COLLECTION"
(message:"Ticket created" OR message:"Ticket updated" OR message:"Ticket unchanged")
timestamp>=timestamp_trunc(@timestamp, DAY)
| stats count() by message

-- Error ticket identification
resource.type="cloud_run_revision"
jsonPayload.category="TICKET_COLLECTION"
severity="ERROR"
jsonPayload.context.ticketId!=""

-- Notification scheduling success rate
resource.type="cloud_run_revision"
jsonPayload.category="NOTIFICATION"
(message:"Notifications scheduled" OR severity="ERROR")
timestamp>=timestamp_trunc(@timestamp, DAY)
| stats count() by if(severity="ERROR", "failed", "success")
```

#### ⚠️ **Alert and Troubleshooting Queries**

```sql
-- Critical error immediate detection
resource.type="cloud_run_revision"
severity="CRITICAL"
timestamp>=timestamp_sub(@timestamp, interval 5 minute)

-- Data quality issue trend analysis
resource.type="cloud_run_revision"
jsonPayload.dataQuality.issueType!=""
timestamp>=timestamp_trunc(@timestamp, WEEK)
| stats count() by jsonPayload.dataQuality.issueType, bin(timestamp, 1d)

-- Unrecoverable error monitoring
resource.type="cloud_run_revision"
jsonPayload.error.recoverable=false
severity>="ERROR"
```

### 🎯 **Practical Operations Query Examples**

#### **Daily Report Generation**

```sql
-- Today's collection processing summary
resource.type="cloud_run_revision"
jsonPayload.category="TICKET_COLLECTION"
timestamp>=timestamp_trunc(@timestamp, DAY)
| stats
    sum(jsonPayload.metrics.totalProcessed) as total,
    avg(jsonPayload.metrics.processingTimeMs) as avg_time_ms,
    min(jsonPayload.metrics.successRate) as min_success_rate
```

#### **Problem Investigation**

```sql
-- Specific timeframe error concentration investigation
resource.type="cloud_run_revision"
severity>="ERROR"
timestamp>="2025-09-17T12:00:00Z"
timestamp<="2025-09-17T13:00:00Z"
| sort by timestamp asc
```

#### **Performance Analysis**

```sql
-- Long processing time execution identification
resource.type="cloud_run_revision"
jsonPayload.metrics.processingTimeMs>5000
timestamp>=timestamp_trunc(@timestamp, WEEK)
| sort by jsonPayload.metrics.processingTimeMs desc
```

## CloudLogger Class Implementation

```typescript
// src/shared/logging/CloudLogger.ts
export class CloudLogger {
  private static formatEntry(
    severity: LogSeverity,
    message: string,
    payload?: CloudLoggingEntry['jsonPayload'],
  ): CloudLoggingEntry {
    const entry: CloudLoggingEntry = {
      severity,
      message,
    };

    if (payload) {
      entry.jsonPayload = payload;
    }

    // Utilize environment variables automatically set by Cloud Run
    if (Deno.env.get('K_SERVICE')) {
      entry['logging.googleapis.com/labels'] = {
        service: Deno.env.get('K_SERVICE') || '',
        revision: Deno.env.get('K_REVISION') || '',
      };
    }

    return entry;
  }

  private static shouldLog(severity: LogSeverity): boolean {
    const env = Deno.env.get('NODE_ENV') || 'production';
    // Suppress DEBUG logs in production environment only
    if (env === 'production' && severity === 'DEBUG') {
      return false;
    }
    return true;
  }

  private static log(
    severity: LogSeverity,
    message: string,
    payload?: CloudLoggingEntry['jsonPayload'],
  ): void {
    if (!this.shouldLog(severity)) return;

    const entry = this.formatEntry(severity, message, payload);

    // Automatically collected by Cloud Run
    console.log(JSON.stringify(entry));
  }

  static debug(message: string, payload?: CloudLoggingEntry['jsonPayload']): void {
    this.log('DEBUG', message, payload);
  }

  static info(message: string, payload?: CloudLoggingEntry['jsonPayload']): void {
    this.log('INFO', message, payload);
  }

  static warning(message: string, payload?: CloudLoggingEntry['jsonPayload']): void {
    this.log('WARNING', message, payload);
  }

  static error(message: string, payload?: CloudLoggingEntry['jsonPayload']): void {
    this.log('ERROR', message, payload);
  }

  static critical(message: string, payload?: CloudLoggingEntry['jsonPayload']): void {
    this.log('CRITICAL', message, payload);
  }
}
```

## Implementation Patterns

### 1. Scraping Data Quality Monitoring (JLeagueDataParser)

**Automatically recorded (no logging required)**:

- Cloud Scheduler → Cloud Run request/response
- Cloud Tasks enqueue/execution status
- HTTP status codes, processing time
- Retry count, error occurrence

**Logging required**:

- Data quality issue details
- Business logic level errors

```typescript
// src/infrastructure/scraping/jleague/parser/JLeagueDataParser.ts
private parseMatchDateTime(rawData: JLeagueRawTicketData, referenceDate: Date): Date {
  if (rawData.enhancedMatchDateTime) {
    try {
      const result = this.parseEnhancedDateTime(rawData.enhancedMatchDateTime, referenceDate);
      return result;
    } catch (error) {
      // Unknown pattern detection (ERROR) - only this needs logging
      CloudLogger.error('Unknown date pattern detected', {
        category: LogCategory.PARSING,
        dataQuality: {
          issueType: 'UNKNOWN_PATTERN',
          field: 'matchDateTime',
          rawValue: rawData.enhancedMatchDateTime,
          expectedPattern: 'YYYY/MM/DD HH:MM'
        },
        context: {
          matchName: rawData.matchName,
          ticketUrl: rawData.ticketUrl
        },
        error: {
          code: ErrorCodes.PARSE_MATCH_DATE_UNKNOWN_FORMAT,
          details: `Unexpected date format: ${rawData.enhancedMatchDateTime}`,
          recoverable: true
        }
      });
      throw error;
    }
  }

  // Missing required data (ERROR)
  CloudLogger.error('Sale start date missing for pre-sale ticket', {
    category: LogCategory.VALIDATION,
    dataQuality: {
      issueType: 'MISSING_FIELD',
      field: 'saleStartDate'
    },
    context: {
      matchName: rawData.matchName,
      ticketUrl: rawData.ticketUrl,
      saleStatus: 'before_sale'
    },
    error: {
      code: ErrorCodes.PARSE_SALE_START_DATE_MISSING_BEFORE_SALE,
      details: 'Sale start date is required for pre-sale tickets to enable notifications',
      recoverable: false
    }
  });
  throw new Error('Required field saleStartDate is missing for pre-sale ticket');
}
```

### 2. Critical Error Discord Notifications

**Automatic notifications via Cloud Monitoring** (no code changes required):

- Automatic Discord notifications when CRITICAL logs are detected
- External API errors can also be understood through Cloud Run's automatic logs

```
App → CloudLogger.critical() → Cloud Logging → Alert Policy → Discord
```

### 3. Aggregation Metrics (TicketCollectionUseCase)

**Logging required**:

- Processing result statistics (for Log-based Metrics)
- Data quality anomaly detection

```typescript
// src/application/usecases/TicketCollectionUseCase.ts
async execute(): Promise<void> {
  try {
    const tickets = await this.scrapingService.collectTickets();
    // Individual validation processing already logged by each parser

    // Only aggregation metrics logging (for Log-based Metrics)
    CloudLogger.info('Ticket collection completed', {
      category: LogCategory.TICKET_COLLECTION,
      metrics: {
        totalProcessed: tickets.length,
        processingTimeMs: Date.now() - startTime
      }
    });

  } catch (error) {
    // Only system-level failures are logged
    CloudLogger.critical('Ticket collection system failure', {
      category: LogCategory.SYSTEM,
      error: {
        code: ErrorCodes.SYS_TOTAL_FAILURE,
        details: error.message,
        recoverable: false
      }
    });
    throw error;
  }
}
```

## Environment Variables

```env
# Log level setting
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL

# Environment setting
ENVIRONMENT=production  # development, staging, production

# Cloud Run automatic settings (no configuration required)
# K_SERVICE=ticket-scraping
# K_REVISION=ticket-scraping-00001-abc
```

## Security and Privacy

### Information NOT to include in logs

- Personal information (names, email addresses, phone numbers)
- Authentication credentials (passwords, API keys, tokens)
- Payment information
- Detailed internal system path information

### Information OK to include in logs

- Public ticket information (match names, dates, venues)
- Processing statistics (counts, success rates)
- Error messages (stack traces in development environment only)
- Session IDs (UUIDs for tracking)

## Cost Estimation

### Monthly Usage Prediction

```
【Cloud Logging】
- Scraping execution once daily
- Approximately 100KB of logs per execution
- Monthly: 100KB × 30 days = 3MB
→ Completely free (0.006% of 50GB quota)

【Cloud Monitoring】
- Log-based Metrics: 3 items
- Data points: 30 per day
- Monthly: approximately 1MB
→ Completely free (0.7% of 150MB quota)
```

### Monthly Cost

```
Cloud Logging:    $0 (within 50GB free quota)
Cloud Monitoring: $0 (within 150MB free quota)
━━━━━━━━━━━━━━━━━━━━━━━━
Total: $0/month
```

## Summary

This specification provides:

### 🎯 **Significant Implementation Scope Reduction**

- **Code changes**: Only 2 files (JLeagueDataParser + TicketCollectionUseCase)
- **External API・main.ts**: No changes required (Cloud Run automatically records)
- **Discord notifications**: Automated via Cloud Monitoring

### 📊 **Effective Monitoring**

1. **Data quality**: Immediate detection of unknown patterns and missing required fields
2. **Automatic notifications**: Automatic Discord notifications for CRITICAL errors
3. **Cost efficiency**: Stay within free quota with 30-day retention
4. **Operational**: 24-hour monitoring with GCP configuration only

### 🚀 **Technical Benefits**

- **Structured logs**: Automatic aggregation with Log-based Metrics
- **Automatic recording utilization**: Maximum use of Cloud Run's standard features
- **Scalable**: Automatic scaling with GCP managed services
- **Maintainable**: Maximum effect with minimal code changes

Everything is achieved with GCP standard features, no additional infrastructure required.
