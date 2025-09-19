-- Update all remaining constraint and index names to use 'notifications' instead of 'notification_history'
-- This ensures consistency across the database schema

-- Drop old indexes with notification_history prefix
DROP INDEX IF EXISTS idx_notification_history_ticket_type;
DROP INDEX IF EXISTS idx_notification_history_ticket_status;
DROP INDEX IF EXISTS idx_notification_history_scheduled_at;
DROP INDEX IF EXISTS idx_notification_history_status;
DROP INDEX IF EXISTS idx_notification_pending;

-- Create new indexes with correct naming
CREATE INDEX IF NOT EXISTS idx_notifications_ticket_type
  ON notifications(ticket_id, notification_type);

CREATE INDEX IF NOT EXISTS idx_notifications_ticket_status
  ON notifications(ticket_id, status)
  WHERE status IN ('scheduled', 'sent', 'failed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_notifications_status
  ON notifications(status);

CREATE INDEX IF NOT EXISTS idx_notifications_scheduled
  ON notifications(notification_time)
  WHERE status = 'scheduled';

-- Update foreign key constraint name
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notification_history_ticket_id_fkey;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

-- Add comment to document the changes
COMMENT ON TABLE notifications IS 'Stores notification scheduling and execution records';