# Supabase Row Level Security (RLS) Settings

This document defines the basic RLS policies for the Urawa Support Hub database tables.

## Overview

Row Level Security (RLS) ensures that users can only access data they are authorized to see. For
this personal notification system, we implement basic security policies to protect ticket and
notification data.

## Database Schema Security

### 1. Tickets Table RLS Policies

**Table**: `tickets` **Purpose**: Store scraped ticket sale information

```sql
-- Enable RLS on tickets table
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can perform all operations
CREATE POLICY "Service role full access on tickets"
ON tickets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can only read tickets
CREATE POLICY "Authenticated users can read tickets"
ON tickets
FOR SELECT
TO authenticated
USING (true);

-- Policy: Anonymous users cannot access tickets
-- (No policy needed - RLS denies by default)
```

### 2. Notification History Table RLS Policies

**Table**: `notification_history` **Purpose**: Track sent notifications to prevent duplicates

```sql
-- Enable RLS on notification_history table
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can perform all operations
CREATE POLICY "Service role full access on notification_history"
ON notification_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can only read their own notification history
CREATE POLICY "Authenticated users can read own notification_history"
ON notification_history
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id OR user_id IS NULL);

-- Note: user_id IS NULL condition allows reading system-wide notifications
-- for single-user deployment, but restricts access in multi-user scenarios

-- Policy: Anonymous users cannot access notification history
-- (No policy needed - RLS denies by default)
```

### 3. User Subscriptions Table RLS Policies (Future)

**Table**: `user_subscriptions` (for future multi-user support) **Purpose**: Manage user
notification preferences

```sql
-- Enable RLS on user_subscriptions table
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions"
ON user_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can perform all operations
CREATE POLICY "Service role full access on user_subscriptions"
ON user_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

## Role-Based Access Control

### 1. Service Role

**Purpose**: Backend services (Cloud Run, Edge Functions) **Permissions**: Full access to all tables
**Usage**: Scraping service, notification service

```sql
-- Service role already has bypass RLS capability
-- No additional policies needed beyond the above
```

### 2. Authenticated Role

**Purpose**: Future web dashboard users **Permissions**: Read-only access to tickets, read ONLY own
notification history **Usage**: Web interface for monitoring ticket sales

**❌ EXCESSIVE PERMISSION REMOVED**: No longer can read all users' notification history

### 3. Anonymous Role

**Purpose**: Unauthenticated access **Permissions**: No access to any tables **Usage**: Not used in
this application

## Security Implementation

### 1. Environment-Specific Keys

```bash
# Development environment
SUPABASE_URL="https://your-dev-project.supabase.co"
SUPABASE_ANON_KEY="eyJ..."  # Public key with limited permissions
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # Full access key for backend

# Production environment
SUPABASE_URL="https://your-prod-project.supabase.co"
SUPABASE_ANON_KEY="eyJ..."  # Public key with limited permissions  
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # Full access key for backend
```

### 2. Client Configuration

```typescript
// For backend services (full access)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// For frontend/authenticated access (limited access)
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
);
```

## RLS Policy Testing

### 1. Test Service Role Access

```sql
-- Connect with service role key
SELECT count(*) FROM tickets;  -- Should return all records
INSERT INTO tickets (...) VALUES (...);  -- Should succeed
```

### 2. Test Authenticated User Access

```sql
-- Connect with anon key + authenticate user
SELECT count(*) FROM tickets;  -- Should return all records (read-only)
INSERT INTO tickets (...) VALUES (...);  -- Should fail (no insert permission)
```

### 3. Test Anonymous Access

```sql
-- Connect with anon key only
SELECT count(*) FROM tickets;  -- Should return 0 or error
```

## Security Best Practices

### 1. Key Management

- Store service role key securely (environment variables only)
- Rotate keys regularly (every 90 days)
- Never expose service role key in client-side code
- Use anon key for public/authenticated client access

### 2. Policy Review

- Review RLS policies monthly
- Test policies after any schema changes
- Document policy changes in this file
- Use least privilege principle

### 3. Monitoring

```sql
-- Monitor failed authentication attempts
SELECT * FROM auth.audit_log_entries 
WHERE event_type = 'token_verification_failure'
ORDER BY created_at DESC;

-- Monitor RLS policy violations
SELECT * FROM postgres_log 
WHERE message LIKE '%policy violation%'
ORDER BY log_time DESC;
```

## Emergency Procedures

### 1. Disable RLS (Emergency Only)

```sql
-- EMERGENCY: Disable RLS temporarily
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history DISABLE ROW LEVEL SECURITY;

-- Remember to re-enable after fixing issues
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
```

### 2. Revoke Compromised Keys

```bash
# Revoke and regenerate keys in Supabase dashboard
# Update environment variables immediately
# Test all services after key rotation
```

## Implementation Commands

### Apply RLS Policies

```sql
-- Run these commands in Supabase SQL Editor
-- Copy and paste the policies defined above

-- Verify policies are active
SELECT * FROM pg_policies WHERE tablename IN ('tickets', 'notification_history');
```
