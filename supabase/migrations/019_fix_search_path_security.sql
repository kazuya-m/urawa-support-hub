-- Fix search_path security warning for update_updated_at_column function
-- Issue: Function public.update_updated_at_column has a role mutable search_path
-- This migration sets an explicit search_path to prevent security vulnerabilities

-- Drop the existing function and recreate with secure search_path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recreate the function with explicit search_path set to 'pg_catalog, public'
-- This prevents malicious schema injection attacks
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger for notifications table
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to document the security fix
COMMENT ON FUNCTION update_updated_at_column() IS
'Automatically updates the updated_at column on row update.
Fixed search_path security warning by explicitly setting search_path to pg_catalog, public.';