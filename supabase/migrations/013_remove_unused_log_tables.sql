-- Remove unused log tables that are replaced by GCP Cloud Logging
-- This migration removes error_logs, system_metrics, and system_health tables as they are no longer needed

-- Drop policies first
DROP POLICY IF EXISTS "Service role full access error_logs" ON error_logs;
DROP POLICY IF EXISTS "Service role full access system_metrics" ON system_metrics;
DROP POLICY IF EXISTS "Service role full access system_health" ON system_health;

-- Drop indexes
DROP INDEX IF EXISTS idx_system_metrics_name_timestamp;

-- Drop tables
DROP TABLE IF EXISTS error_logs;
DROP TABLE IF EXISTS system_metrics;
DROP TABLE IF EXISTS system_health;

-- Update cleanup function to remove references to deleted tables
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- 7日前より古い試合のチケット情報を削除
  DELETE FROM tickets 
  WHERE match_date < NOW() - INTERVAL '7 days';
  
  -- Note: error_logs, system_metrics, and system_health tables have been removed
  -- These are now handled by GCP Cloud Logging
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION cleanup_old_data() TO service_role;