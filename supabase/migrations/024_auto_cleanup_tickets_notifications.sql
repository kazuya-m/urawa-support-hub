-- Automatic cleanup for tickets and notifications with PostgreSQL Cron
-- This prevents database bloat by removing old records that are no longer needed

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================
-- TICKETS TABLE CLEANUP
-- ============================================================

-- Schedule automatic cleanup job for old tickets
-- Runs daily at 2:00 AM JST (17:00 UTC) to delete tickets 30 days after match_date
SELECT cron.schedule(
    'cleanup-old-tickets',
    '0 17 * * *',
    'DELETE FROM public.tickets WHERE match_date < NOW() - INTERVAL ''30 days'';'
);

-- Manual cleanup function for tickets
CREATE OR REPLACE FUNCTION manual_cleanup_old_tickets(retention_days INTEGER DEFAULT 30)
RETURNS TABLE(deleted_count INTEGER, cleanup_info TEXT) AS $$
DECLARE
    v_deleted_count INTEGER;
    v_cutoff_date TIMESTAMP;
BEGIN
    v_cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

    DELETE FROM public.tickets
    WHERE match_date < v_cutoff_date;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RAISE NOTICE 'Deleted % old tickets (match_date before %)', v_deleted_count, v_cutoff_date;

    RETURN QUERY SELECT
        v_deleted_count,
        format('Deleted %s tickets with match_date before %s (older than %s days)',
               v_deleted_count, v_cutoff_date::DATE, retention_days);
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION manual_cleanup_old_tickets(INTEGER) TO service_role;

-- ============================================================
-- NOTIFICATIONS TABLE CLEANUP
-- ============================================================

-- Schedule automatic cleanup job for sent notifications
-- Runs daily at 2:30 AM JST (17:30 UTC) to delete sent notifications 90 days after sent_at
SELECT cron.schedule(
    'cleanup-sent-notifications',
    '30 17 * * *',
    $$DELETE FROM public.notifications WHERE status = 'sent' AND sent_at < NOW() - INTERVAL '90 days';$$
);

-- Manual cleanup function for sent notifications
CREATE OR REPLACE FUNCTION manual_cleanup_sent_notifications(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(deleted_count INTEGER, cleanup_info TEXT) AS $$
DECLARE
    v_deleted_count INTEGER;
    v_cutoff_date TIMESTAMP;
BEGIN
    v_cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

    DELETE FROM public.notifications
    WHERE status = 'sent' AND sent_at < v_cutoff_date;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RAISE NOTICE 'Deleted % sent notifications (sent_at before %)', v_deleted_count, v_cutoff_date;

    RETURN QUERY SELECT
        v_deleted_count,
        format('Deleted %s sent notifications with sent_at before %s (older than %s days)',
               v_deleted_count, v_cutoff_date::DATE, retention_days);
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION manual_cleanup_sent_notifications(INTEGER) TO service_role;

-- ============================================================
-- VERIFICATION QUERIES (commented out, uncomment to verify)
-- ============================================================

-- Verify scheduled cron jobs
-- SELECT jobname, schedule, command FROM cron.job WHERE jobname IN ('cleanup-old-tickets', 'cleanup-sent-notifications');

-- Test manual cleanup functions
-- SELECT * FROM manual_cleanup_old_tickets(30);
-- SELECT * FROM manual_cleanup_sent_notifications(90);
