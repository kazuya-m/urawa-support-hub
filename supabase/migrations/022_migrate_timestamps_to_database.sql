-- Migrate createdAt/updatedAt management to database side
-- Issue #165: Improve data consistency and reduce application layer responsibility

-- Step 1: Ensure created_at and updated_at have proper defaults
-- (created_at already has DEFAULT NOW() from initial schema)
-- (updated_at already has DEFAULT NOW() from initial schema)

-- Step 2: Create trigger function for automatic updated_at management
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only update updated_at if business data has changed
    -- (Exclude id, created_at, updated_at, scraped_at for comparison)
    IF (
        NEW.match_name IS DISTINCT FROM OLD.match_name OR
        NEW.match_date IS DISTINCT FROM OLD.match_date OR
        NEW.home_team IS DISTINCT FROM OLD.home_team OR
        NEW.away_team IS DISTINCT FROM OLD.away_team OR
        NEW.competition IS DISTINCT FROM OLD.competition OR
        NEW.sale_start_date IS DISTINCT FROM OLD.sale_start_date OR
        NEW.sale_end_date IS DISTINCT FROM OLD.sale_end_date OR
        NEW.venue IS DISTINCT FROM OLD.venue OR
        NEW.ticket_types IS DISTINCT FROM OLD.ticket_types OR
        NEW.ticket_url IS DISTINCT FROM OLD.ticket_url OR
        NEW.sale_status IS DISTINCT FROM OLD.sale_status OR
        NEW.notification_scheduled IS DISTINCT FROM OLD.notification_scheduled
    ) THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;

-- Step 3: Create trigger for tickets table
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Add comments for documentation
COMMENT ON FUNCTION update_updated_at_column() IS
'Automatically updates updated_at timestamp only when business data changes. Excludes id, created_at, updated_at, scraped_at from comparison.';

COMMENT ON COLUMN tickets.created_at IS
'Timestamp when the ticket record was first created. Automatically managed by database DEFAULT NOW().';

COMMENT ON COLUMN tickets.updated_at IS
'Timestamp when the ticket business data was last updated. Automatically managed by database trigger. Only updates when business data changes.';
