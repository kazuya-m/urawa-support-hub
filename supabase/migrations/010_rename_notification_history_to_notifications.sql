-- Rename notification_history table to notifications
-- This migration aligns the table name with the renamed entity class

-- Rename the table
ALTER TABLE notification_history RENAME TO notifications;

-- Update RLS policies to reference the new table name
DROP POLICY IF EXISTS "notification_history_policy" ON notifications;

CREATE POLICY "notifications_policy" 
ON notifications FOR ALL 
USING (true);

-- Add comment to document the change
COMMENT ON TABLE notifications IS 'Stores notification scheduling and execution records (renamed from notification_history)';