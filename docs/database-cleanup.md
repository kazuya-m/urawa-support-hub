# Database Automatic Cleanup

Automatic cleanup mechanism to prevent database bloat by removing old records.

## Overview

This system automatically deletes old records from `tickets` and `notifications` tables using
PostgreSQL Cron jobs, preventing database size growth and reducing operational costs.

## Retention Policy

| Table           | Condition                | Retention Period | Cron Schedule (JST) |
| --------------- | ------------------------ | ---------------- | ------------------- |
| `tickets`       | `match_date` is past     | 30 days          | Daily at 02:00      |
| `notifications` | `status = 'sent'`        | 90 days          | Daily at 02:30      |
| `system_health` | `executed_at` (existing) | 30 days          | Daily at 03:00      |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Supabase)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌──────────────────────────────────────┐  │
│  │  pg_cron    │────▶│  Scheduled Jobs                      │  │
│  │  Extension  │     │  - cleanup-old-tickets (02:00 JST)   │  │
│  └─────────────┘     │  - cleanup-sent-notifications        │  │
│                      │    (02:30 JST)                        │  │
│                      └──────────────────────────────────────┘  │
│                                    │                            │
│                                    ▼                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  DELETE Operations                                        │  │
│  │  - tickets: match_date < NOW() - 30 days                 │  │
│  │  - notifications: status='sent' AND sent_at < NOW()-90d  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Manual Cleanup Functions (for on-demand execution)       │  │
│  │  - manual_cleanup_old_tickets(retention_days)             │  │
│  │  - manual_cleanup_sent_notifications(retention_days)      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Cleanup Logic

### Tickets Table

```sql
DELETE FROM public.tickets
WHERE match_date < NOW() - INTERVAL '30 days';
```

**Rationale**: Past match tickets no longer require notifications. 30-day retention allows for
post-match reference if needed.

### Notifications Table

```sql
DELETE FROM public.notifications
WHERE status = 'sent' AND sent_at < NOW() - INTERVAL '90 days';
```

**Rationale**: Only `sent` notifications are deleted. `scheduled` and `failed` notifications are
preserved for debugging and retry purposes. 90-day retention provides sufficient audit trail.

## Manual Cleanup Functions

For on-demand cleanup or custom retention periods:

### Cleanup Old Tickets

```sql
SELECT * FROM manual_cleanup_old_tickets(30);  -- Default: 30 days
SELECT * FROM manual_cleanup_old_tickets(7);   -- Custom: 7 days
```

**Returns**:

| Column          | Type    | Description                    |
| --------------- | ------- | ------------------------------ |
| `deleted_count` | INTEGER | Number of deleted records      |
| `cleanup_info`  | TEXT    | Human-readable cleanup summary |

### Cleanup Sent Notifications

```sql
SELECT * FROM manual_cleanup_sent_notifications(90);  -- Default: 90 days
SELECT * FROM manual_cleanup_sent_notifications(30);  -- Custom: 30 days
```

**Returns**: Same structure as `manual_cleanup_old_tickets`.

## Security

### Schema Qualification

All cleanup operations use explicit `public.` schema prefix:

```sql
DELETE FROM public.tickets ...
DELETE FROM public.notifications ...
```

**Reason**: Functions use `SET search_path = ''` for security (prevents search_path injection
attacks). Without explicit schema, tables cannot be found.

### Permission Control

- Cron jobs execute with database owner privileges
- Manual functions are granted to `service_role` only
- RLS policies apply to all operations

## Verification

### Check Scheduled Jobs

```sql
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname IN ('cleanup-old-tickets', 'cleanup-sent-notifications');
```

### Check Job Execution History

```sql
SELECT jobid, runid, job_pid, status, return_message, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### Test Manual Functions

```sql
-- Dry run: Check what would be deleted (don't actually delete)
SELECT COUNT(*) FROM tickets WHERE match_date < NOW() - INTERVAL '30 days';
SELECT COUNT(*) FROM notifications WHERE status = 'sent' AND sent_at < NOW() - INTERVAL '90 days';

-- Execute cleanup
SELECT * FROM manual_cleanup_old_tickets(30);
SELECT * FROM manual_cleanup_sent_notifications(90);
```

## Migration File

Location: `supabase/migrations/024_auto_cleanup_tickets_notifications.sql`

## Testing

Integration tests: `tests/integration/database-cleanup.test.ts`

| Test Case                           | Description                                                |
| ----------------------------------- | ---------------------------------------------------------- |
| `manual_cleanup_old_tickets`        | Verifies tickets older than 30 days are deleted            |
| `manual_cleanup_sent_notifications` | Verifies sent notifications older than 90 days are deleted |
| `retention period edge cases`       | Verifies boundary conditions (29 vs 31 days)               |

## Troubleshooting

### Cron Job Not Running

1. Check if `pg_cron` extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Verify job is scheduled:
   ```sql
   SELECT * FROM cron.job;
   ```

3. Check job execution logs:
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
   ```

### Manual Function Returns Error

- Ensure calling with `service_role` key (not `anon` key)
- Check table permissions and RLS policies

## Related Documentation

- [System Architecture](./system-architecture.md)
- [Database Schema](../supabase/migrations/)
