-- Change 'pending' status to 'scheduled' for better semantic meaning
-- The 'scheduled' status more accurately represents notifications that are scheduled in Cloud Tasks

-- First, update all existing 'pending' records to 'scheduled'
UPDATE notifications SET status = 'scheduled' WHERE status = 'pending';

-- Drop the existing status check constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notification_history_status_check;

-- Add new constraint with 'scheduled' instead of 'pending'
ALTER TABLE notifications 
ADD CONSTRAINT notifications_status_check 
CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled'));

-- Update the existing index to use 'scheduled' instead of 'pending'
DROP INDEX IF EXISTS idx_notification_history_ticket_status;

CREATE INDEX idx_notifications_ticket_status 
ON notifications(ticket_id, status) 
WHERE status IN ('scheduled', 'cancelled');

-- Update the column comment to reflect the new status
COMMENT ON COLUMN notifications.status IS 
'Notification status: scheduled (queued in Cloud Tasks), sent (delivered), failed (delivery failed), cancelled (manually cancelled)';