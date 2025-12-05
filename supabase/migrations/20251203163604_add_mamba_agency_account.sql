/*
  # Add Mamba Agency Account

  ## Overview
  Creates a special "Mamba" account that represents the entire agency.
  When admins select this account, they see aggregated data across all accounts.

  ## Changes
  1. Insert Mamba account with a special flag
  2. Add is_agency_view column to accounts table to identify this special account
*/

-- Add column to mark agency-level accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'is_agency_view'
  ) THEN
    ALTER TABLE accounts ADD COLUMN is_agency_view boolean DEFAULT false;
  END IF;
END $$;

-- Insert the Mamba agency account
INSERT INTO accounts (id, name, tiktok_handle, status, is_agency_view)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Mamba',
  '@mamba_agency',
  'active',
  true
)
ON CONFLICT (id) DO UPDATE
SET name = 'Mamba',
    tiktok_handle = '@mamba_agency',
    is_agency_view = true;
