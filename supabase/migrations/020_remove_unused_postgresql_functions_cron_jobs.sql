-- Remove unused PostgreSQL functions and cron jobs to unify architecture
-- This migration removes PostgreSQL functions/cron jobs that are either:
-- 1. Replaced by Google Cloud Scheduler
-- 2. Reference deleted tables (system_health, error_logs, system_metrics)
-- 3. Duplicated functionality handled by application layer

-- Remove cron jobs replaced by Google Cloud Scheduler
SELECT cron.unschedule('daily-ticket-check');
SELECT cron.unschedule('notification-check');

-- Remove cron job for deleted table
SELECT cron.unschedule('cleanup-old-health-records');

-- Remove functions that reference deleted tables
DROP FUNCTION IF EXISTS manual_cleanup_health_records(INTEGER);

-- Update update_table_statistics function to only analyze existing tables
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
  -- Only analyze tables that still exist
  ANALYZE tickets;
  ANALYZE notifications;
  -- Note: error_logs, system_metrics, system_health have been removed (migration 013)
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Remove trigger for updated_at as it's managed by application layer
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Note: cleanup_old_data() function and weekly-cleanup cron job are preserved
-- These are needed for Issue #68 (database history and GCP log cost optimization)
-- The cleanup_old_data() function will be enhanced in a future migration to handle notifications table

-- Fix RLS policy performance issues
-- This addresses two performance problems reported in production:
-- 1. Multiple permissive policies on notifications table
-- 2. Unnecessary re-evaluation of auth.jwt() for each row

-- Fix notifications table: remove duplicate policies and create single optimized policy
DROP POLICY IF EXISTS "Service role full access notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_policy" ON notifications;

-- Create single optimized policy for notifications
CREATE POLICY "Service role full access notifications" ON notifications
  FOR ALL USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Fix tickets table: optimize auth.jwt() evaluation
DROP POLICY IF EXISTS "Service role full access tickets" ON tickets;

-- Create optimized policy for tickets (auth.jwt() evaluated once per query, not per row)
CREATE POLICY "Service role full access tickets" ON tickets
  FOR ALL USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Add comments to document the optimization
COMMENT ON POLICY "Service role full access notifications" ON notifications IS
'Optimized RLS policy: auth.jwt() evaluated once per query instead of per row';

COMMENT ON POLICY "Service role full access tickets" ON tickets IS
'Optimized RLS policy: auth.jwt() evaluated once per query instead of per row';