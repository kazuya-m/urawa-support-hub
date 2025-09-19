-- Improve notification schedule management
-- Fix data consistency issues and improve column naming

-- 1. Rename scheduled_at to notification_time for better semantic meaning
ALTER TABLE notifications
RENAME COLUMN scheduled_at TO notification_time;

-- Update existing index to use new column name
DROP INDEX IF EXISTS idx_notification_history_scheduled_at;
CREATE INDEX idx_notifications_notification_time
ON notifications(notification_time);

-- 2. Add cloud_task_id column if it doesn't exist (defensive migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'cloud_task_id'
    ) THEN
        ALTER TABLE notifications
        ADD COLUMN cloud_task_id TEXT;
    END IF;
END $$;

-- 3. Update column comments for better documentation
COMMENT ON COLUMN notifications.notification_time IS
'The exact time when the notification should be sent (not when it was scheduled)';

COMMENT ON COLUMN notifications.cloud_task_id IS
'Cloud Tasks task ID for cancellation purposes (set when notification is scheduled)';

COMMENT ON COLUMN notifications.status IS
'Notification status: scheduled (queued in Cloud Tasks), sent (delivered), failed (delivery failed), cancelled (manually cancelled)';

-- 4. Create index for efficient Cloud Tasks management
CREATE INDEX IF NOT EXISTS idx_notifications_cloud_task_id
ON notifications(cloud_task_id)
WHERE cloud_task_id IS NOT NULL;

-- 5. Create composite index for scheduled notifications lookup
CREATE INDEX IF NOT EXISTS idx_notifications_status_notification_time
ON notifications(status, notification_time)
WHERE status IN ('scheduled', 'failed');