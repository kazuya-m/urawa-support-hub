-- Remove redundant notification_scheduled column from notifications table
-- This resolves schema inconsistency issue #129

-- The notification_scheduled column in notifications table is redundant because:
-- 1. notification status is already managed by the 'status' column ('scheduled', 'sent', 'failed', 'cancelled')
-- 2. tickets.notification_scheduled serves a different purpose (ticket-level scheduling flag)
-- 3. The column was added in migration 007 but never used in the codebase
-- 4. Type definitions (NotificationRow) don't include this column, creating inconsistency

-- Remove the redundant column
ALTER TABLE notifications
DROP COLUMN IF EXISTS notification_scheduled;

-- Add comment to document the change
COMMENT ON TABLE notifications IS
'Stores notification scheduling and execution records. Status is managed via the status column (scheduled/sent/failed/cancelled). notification_scheduled column removed in migration 015 to resolve redundancy with tickets.notification_scheduled.';