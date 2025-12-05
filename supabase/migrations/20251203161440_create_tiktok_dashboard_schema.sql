/*
  # TikTok Dashboard Schema

  ## Overview
  Multi-tenant TikTok dashboard for agency with 15 client accounts.
  Supports role-based access: admins see all accounts, clients see only their own.

  ## New Tables
  
  ### `profiles`
  - `id` (uuid, references auth.users)
  - `email` (text)
  - `full_name` (text)
  - `role` (text) - 'admin' or 'client'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `accounts`
  - `id` (uuid, primary key)
  - `name` (text) - TikTok account/store name
  - `tiktok_handle` (text) - @username
  - `avatar_url` (text, optional)
  - `status` (text) - 'active', 'inactive', 'suspended'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `user_accounts`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `account_id` (uuid, references accounts)
  - `created_at` (timestamptz)
  - Links users to accounts they can access
  
  ### `kpi_metrics`
  - `id` (uuid, primary key)
  - `account_id` (uuid, references accounts)
  - `date` (date)
  - `metric_type` (text) - 'ads', 'posts', 'engagement', 'affiliates', 'sales'
  - `impressions` (bigint)
  - `clicks` (bigint)
  - `conversions` (integer)
  - `revenue` (decimal)
  - `spend` (decimal)
  - `engagement_rate` (decimal)
  - `followers_gained` (integer)
  - `video_views` (bigint)
  - `likes` (integer)
  - `comments` (integer)
  - `shares` (integer)
  - `affiliate_commissions` (decimal)
  - `created_at` (timestamptz)

  ## Security
  
  ### Profiles
  - Enable RLS
  - Users can read their own profile
  - Users can update their own profile
  - Admins can read all profiles
  
  ### Accounts
  - Enable RLS
  - Admins can read all accounts
  - Clients can read accounts they have access to via user_accounts
  - Only admins can create/update accounts
  
  ### User Accounts
  - Enable RLS
  - Users can read their own account assignments
  - Only admins can manage assignments
  
  ### KPI Metrics
  - Enable RLS
  - Admins can read all metrics
  - Clients can read metrics for accounts they have access to
  - Only admins can create/update metrics
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tiktok_handle text NOT NULL,
  avatar_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create user_accounts junction table
CREATE TABLE IF NOT EXISTS user_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, account_id)
);

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

-- Create kpi_metrics table
CREATE TABLE IF NOT EXISTS kpi_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  metric_type text NOT NULL CHECK (metric_type IN ('ads', 'posts', 'engagement', 'affiliates', 'sales', 'overview')),
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  conversions integer DEFAULT 0,
  revenue decimal(15,2) DEFAULT 0,
  spend decimal(15,2) DEFAULT 0,
  engagement_rate decimal(5,2) DEFAULT 0,
  followers_gained integer DEFAULT 0,
  video_views bigint DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  affiliate_commissions decimal(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, date, metric_type)
);

ALTER TABLE kpi_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for accounts
CREATE POLICY "Admins can read all accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can read their assigned accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.account_id = accounts.id
      AND user_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for user_accounts
CREATE POLICY "Users can read own account assignments"
  ON user_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all account assignments"
  ON user_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert account assignments"
  ON user_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete account assignments"
  ON user_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for kpi_metrics
CREATE POLICY "Admins can read all metrics"
  ON kpi_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can read metrics for their accounts"
  ON kpi_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE user_accounts.account_id = kpi_metrics.account_id
      AND user_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert metrics"
  ON kpi_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update metrics"
  ON kpi_metrics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_account_id ON user_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_account_id ON kpi_metrics(account_id);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_date ON kpi_metrics(date);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);