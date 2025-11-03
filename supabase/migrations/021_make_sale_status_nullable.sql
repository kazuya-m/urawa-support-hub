-- Make sale_status nullable to avoid guessing unknown status
-- Issue #176: Unify optional properties to null

-- Remove NOT NULL constraint from sale_status
ALTER TABLE tickets
ALTER COLUMN sale_status DROP NOT NULL;

-- Remove default value (new tickets should explicitly set status or null)
ALTER TABLE tickets
ALTER COLUMN sale_status DROP DEFAULT;

-- Update comment
COMMENT ON COLUMN tickets.sale_status IS 'Sale status from scraping. NULL if status could not be determined. Values: before_sale, on_sale, ended';
