-- Add updated_at column to notifications table
-- This column will track when notification records are updated (status changes, etc.)

ALTER TABLE notifications
ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to notifications table
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Update existing records to have created_at as their initial updated_at value
UPDATE notifications SET updated_at = created_at;