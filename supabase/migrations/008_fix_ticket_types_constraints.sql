-- Fix ticket_types column constraints to match implementation
-- Allow null values and empty arrays for cases where ticket types cannot be scraped

-- Remove NOT NULL constraint from ticket_types
ALTER TABLE tickets ALTER COLUMN ticket_types DROP NOT NULL;

-- Remove empty array check constraint
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS ticket_types_not_empty;

-- Update comment to reflect the new behavior
COMMENT ON COLUMN tickets.ticket_types IS 'Ticket types array. Can be null or empty array if types cannot be determined during scraping. Used for data quality assessment.';

-- Set any existing empty arrays to null for consistency (optional - can keep empty arrays)
-- UPDATE tickets SET ticket_types = NULL WHERE ticket_types = '{}';