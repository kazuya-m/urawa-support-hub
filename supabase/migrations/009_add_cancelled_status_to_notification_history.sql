-- Add 'cancelled' status to notification_history table
-- This allows tracking of cancelled notifications separately from failed ones

ALTER TABLE notification_history 
DROP CONSTRAINT IF EXISTS notification_history_status_check;

ALTER TABLE notification_history 
ADD CONSTRAINT notification_history_status_check 
CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'));

-- Add cloud_task_id column for Cloud Tasks integration
-- This column may already exist from previous development
ALTER TABLE notification_history 
ADD COLUMN IF NOT EXISTS cloud_task_id TEXT;

-- Add index for efficient querying of pending notifications by ticket_id
CREATE INDEX IF NOT EXISTS idx_notification_history_ticket_status 
ON notification_history(ticket_id, status) 
WHERE status IN ('pending', 'cancelled');

-- Comment explaining the status values
COMMENT ON COLUMN notification_history.status IS 
'Notification status: pending (scheduled), sent (delivered), failed (delivery failed), cancelled (manually cancelled)';