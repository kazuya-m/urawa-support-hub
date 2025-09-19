-- Rename the primary key constraint from notification_history_pkey to notifications_pkey
-- This aligns the constraint name with the current table name

-- Drop the old constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notification_history_pkey;

-- Add the new constraint with the correct name
ALTER TABLE notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

-- Add comment to document the change
COMMENT ON CONSTRAINT notifications_pkey ON notifications IS 'Primary key constraint for notifications table (renamed from notification_history_pkey)';