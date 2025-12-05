/*
  # Add Campaign and Content Tracking Tables

  ## Overview
  Creates detailed tables to track individual campaigns, content pieces, affiliate programs,
  and sales items. This enables drill-down analysis from aggregated metrics to individual
  performance data.

  ## New Tables
  
  1. **ad_campaigns**
     - `id` (uuid, primary key)
     - `account_id` (uuid, foreign key to accounts)
     - `name` (text) - Campaign name
     - `status` (text) - active, paused, completed
     - `start_date` (date)
     - `end_date` (date, nullable)
     - `budget` (numeric)
     - `impressions` (bigint)
     - `clicks` (bigint)
     - `conversions` (integer)
     - `spend` (numeric)
     - `revenue` (numeric)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  2. **content_posts**
     - `id` (uuid, primary key)
     - `account_id` (uuid, foreign key to accounts)
     - `title` (text)
     - `video_url` (text, nullable)
     - `thumbnail_url` (text, nullable)
     - `published_at` (timestamptz)
     - `views` (bigint)
     - `likes` (integer)
     - `comments` (integer)
     - `shares` (integer)
     - `engagement_rate` (numeric)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  3. **affiliate_programs**
     - `id` (uuid, primary key)
     - `account_id` (uuid, foreign key to accounts)
     - `program_name` (text)
     - `product_name` (text)
     - `affiliate_link` (text)
     - `commission_rate` (numeric)
     - `status` (text) - active, paused, ended
     - `clicks` (bigint)
     - `conversions` (integer)
     - `revenue` (numeric)
     - `commissions_earned` (numeric)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  4. **sales_campaigns**
     - `id` (uuid, primary key)
     - `account_id` (uuid, foreign key to accounts)
     - `campaign_name` (text)
     - `product_name` (text)
     - `status` (text) - active, paused, completed
     - `start_date` (date)
     - `end_date` (date, nullable)
     - `total_orders` (integer)
     - `revenue` (numeric)
     - `cost` (numeric)
     - `profit` (numeric)
     - `avg_order_value` (numeric)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users based on account access
*/

-- Ad Campaigns Table
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  budget numeric(12, 2) DEFAULT 0,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  conversions integer DEFAULT 0,
  spend numeric(12, 2) DEFAULT 0,
  revenue numeric(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ad campaigns for their accounts"
  ON ad_campaigns FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM user_accounts WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Content Posts Table
CREATE TABLE IF NOT EXISTS content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  video_url text,
  thumbnail_url text,
  published_at timestamptz DEFAULT now(),
  views bigint DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  engagement_rate numeric(5, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view content posts for their accounts"
  ON content_posts FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM user_accounts WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Affiliate Programs Table
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  program_name text NOT NULL,
  product_name text NOT NULL,
  affiliate_link text,
  commission_rate numeric(5, 2) DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  clicks bigint DEFAULT 0,
  conversions integer DEFAULT 0,
  revenue numeric(12, 2) DEFAULT 0,
  commissions_earned numeric(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view affiliate programs for their accounts"
  ON affiliate_programs FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM user_accounts WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Sales Campaigns Table
CREATE TABLE IF NOT EXISTS sales_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  campaign_name text NOT NULL,
  product_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  total_orders integer DEFAULT 0,
  revenue numeric(12, 2) DEFAULT 0,
  cost numeric(12, 2) DEFAULT 0,
  profit numeric(12, 2) DEFAULT 0,
  avg_order_value numeric(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sales campaigns for their accounts"
  ON sales_campaigns FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM user_accounts WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_account_id ON ad_campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_account_id ON content_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_account_id ON affiliate_programs(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_campaigns_account_id ON sales_campaigns(account_id);
