/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  RLS policies were querying the profiles table to check user roles, causing infinite recursion
  when trying to read from profiles (policies checking profiles to allow access to profiles).

  ## Solution
  1. Create a security definer function that bypasses RLS to get the current user's role
  2. Update all RLS policies to use this function instead of querying profiles directly
  
  ## Changes
  - Drop existing problematic policies
  - Create `get_user_role()` helper function
  - Recreate all policies using the helper function
*/

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all accounts" ON accounts;
DROP POLICY IF EXISTS "Admins can insert accounts" ON accounts;
DROP POLICY IF EXISTS "Admins can update accounts" ON accounts;
DROP POLICY IF EXISTS "Admins can read all account assignments" ON user_accounts;
DROP POLICY IF EXISTS "Admins can insert account assignments" ON user_accounts;
DROP POLICY IF EXISTS "Admins can delete account assignments" ON user_accounts;
DROP POLICY IF EXISTS "Admins can read all metrics" ON kpi_metrics;
DROP POLICY IF EXISTS "Admins can insert metrics" ON kpi_metrics;
DROP POLICY IF EXISTS "Admins can update metrics" ON kpi_metrics;

-- Create a security definer function to get user role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Recreate profiles policies
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

-- Recreate accounts policies
CREATE POLICY "Admins can read all accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can insert accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Recreate user_accounts policies
CREATE POLICY "Admins can read all account assignments"
  ON user_accounts FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can insert account assignments"
  ON user_accounts FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can delete account assignments"
  ON user_accounts FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Recreate kpi_metrics policies
CREATE POLICY "Admins can read all metrics"
  ON kpi_metrics FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can insert metrics"
  ON kpi_metrics FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update metrics"
  ON kpi_metrics FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');
