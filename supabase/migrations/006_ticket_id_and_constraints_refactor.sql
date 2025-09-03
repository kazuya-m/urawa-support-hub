-- Refactor ticket ID type and constraints
-- This migration combines multiple changes for better ticket management:
-- 1. Change tickets.id from UUID to TEXT to use Entity IDs directly
-- 2. Remove overly restrictive unique constraint on (match_name, venue, match_date)
-- 3. Fix date constraints to be more reasonable
-- 4. Make home_team and away_team optional

-- Step 1: Drop dependent constraints
ALTER TABLE notification_history DROP CONSTRAINT IF EXISTS notification_history_ticket_id_fkey;

-- Step 2: Change tickets.id from UUID to TEXT
ALTER TABLE tickets ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE tickets ALTER COLUMN id DROP DEFAULT;

-- Step 3: Change notification_history.ticket_id to TEXT
ALTER TABLE notification_history ALTER COLUMN ticket_id TYPE TEXT USING ticket_id::TEXT;

-- Step 4: Re-add foreign key constraint
ALTER TABLE notification_history 
  ADD CONSTRAINT notification_history_ticket_id_fkey 
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

-- Step 5: Drop problematic constraints
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS unique_ticket_match;  -- Too restrictive
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS match_date_future;     -- Prevents historical data
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS sale_date_valid;       -- Prevents imports

-- Step 6: Add more reasonable constraint
ALTER TABLE tickets 
  ADD CONSTRAINT match_date_after_sale CHECK (match_date > sale_start_date);

-- Step 7: Add sale_end_date column for future use
ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS sale_end_date TIMESTAMPTZ;

-- Step 8: Make home_team and away_team optional
UPDATE tickets 
SET 
  home_team = CASE 
    WHEN home_team = 'Unknown Home Team' THEN NULL 
    ELSE home_team 
  END,
  away_team = CASE 
    WHEN away_team = 'Unknown Away Team' THEN NULL 
    ELSE away_team 
  END;

ALTER TABLE tickets 
  ALTER COLUMN home_team DROP NOT NULL,
  ALTER COLUMN away_team DROP NOT NULL;

-- Step 9: Remove overly restrictive unique constraint on notification_history
-- This allows retry attempts for failed notifications
ALTER TABLE notification_history DROP CONSTRAINT IF EXISTS notification_history_ticket_id_notification_type_key;

-- Step 10: Add index for performance (without uniqueness constraint)
CREATE INDEX IF NOT EXISTS idx_notification_history_ticket_type 
  ON notification_history(ticket_id, notification_type);

-- Step 11: Add comments
COMMENT ON COLUMN tickets.id IS 'Primary key using Entity-generated ID (match + date based unique identifier)';
COMMENT ON COLUMN notification_history.ticket_id IS 'Foreign key to tickets.id (TEXT type matching Entity ID)';
COMMENT ON CONSTRAINT match_date_after_sale ON tickets IS 'Ensures match date is after sale start date (logical constraint)';
COMMENT ON COLUMN tickets.sale_end_date IS 'Ticket sale end date. Retrieved after sale starts.';
COMMENT ON COLUMN tickets.home_team IS 'Home team name. NULL if cannot be extracted from match_name';
COMMENT ON COLUMN tickets.away_team IS 'Away team name. NULL if cannot be extracted from match_name';
COMMENT ON TABLE notification_history IS 'Notification history table allowing multiple attempts per ticket/type combination for retry functionality';