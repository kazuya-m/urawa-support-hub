-- System health automatic cleanup with PostgreSQL Cron
-- This ensures old health records are automatically deleted to prevent database bloat

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule automatic cleanup job
-- Runs daily at 3:00 AM JST (18:00 UTC) to delete records older than 30 days
SELECT cron.schedule(
    'cleanup-old-health-records',
    '0 18 * * *',
    'DELETE FROM system_health WHERE executed_at < NOW() - INTERVAL ''30 days'';'
);

-- Verify the scheduled job
-- This query can be used to check if the cron job is properly scheduled
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-old-health-records';

-- Manual cleanup function (can be called if needed)
CREATE OR REPLACE FUNCTION manual_cleanup_health_records(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM system_health 
    WHERE executed_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % old health records (older than % days)', deleted_count, retention_days;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION manual_cleanup_health_records(INTEGER) TO service_role;