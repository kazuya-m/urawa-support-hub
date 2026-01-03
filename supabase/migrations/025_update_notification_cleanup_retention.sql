-- Update notification cleanup retention period from 90 days to 30 days
-- This keeps the retention period consistent with tickets cleanup

-- ============================================================
-- UPDATE CRON JOB SCHEDULE
-- ============================================================

-- Remove the old cron job
SELECT cron.unschedule('cleanup-sent-notifications');

-- Create new cron job with 30 days retention
-- Runs daily at 2:30 AM JST (17:30 UTC)
SELECT cron.schedule(
    'cleanup-sent-notifications',
    '30 17 * * *',
    $$DELETE FROM public.notifications WHERE status = 'sent' AND sent_at < NOW() - INTERVAL '30 days';$$
);

-- ============================================================
-- UPDATE MANUAL CLEANUP FUNCTION
-- ============================================================

-- Update the default retention period from 90 to 30 days
CREATE OR REPLACE FUNCTION manual_cleanup_sent_notifications(retention_days INTEGER DEFAULT 30)
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
-- VERIFICATION QUERIES (uncomment to verify after migration)
-- ============================================================

-- SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'cleanup-sent-notifications';
-- SELECT * FROM manual_cleanup_sent_notifications(30);
