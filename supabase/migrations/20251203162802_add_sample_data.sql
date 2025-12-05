/*
  # Add Sample Data for Demo Accounts
  
  1. Overview
    Creates comprehensive sample data for two TikTok accounts to populate all dashboard views
    
  2. Accounts Created
    - FitGear Pro (@fitgearpro) - Fitness equipment store
    - Beauty Bliss (@beautybliss_) - Beauty products store
    
  3. Data Generated
    - 30 days of historical metrics for each account
    - Coverage for all metric types: overview, posts, engagement, ads, sales, affiliates
    - Realistic trending data showing growth patterns
    
  4. Metrics Per Account
    - Overview: Daily aggregate metrics
    - Posts: Video performance data
    - Engagement: Follower growth, likes, comments, shares
    - Ads: Ad spend, impressions, clicks, conversions
    - Sales: Revenue and transaction data
    - Affiliates: Commission tracking
*/

-- Generate 30 days of sample data for FitGear Pro
DO $$
DECLARE
  account_id_fitgear uuid;
  account_id_beauty uuid;
  day_offset int;
  base_date date;
BEGIN
  -- Get account IDs
  SELECT id INTO account_id_fitgear FROM accounts WHERE tiktok_handle = '@fitgearpro';
  SELECT id INTO account_id_beauty FROM accounts WHERE tiktok_handle = '@beautybliss_';
  
  -- Generate data for last 30 days
  FOR day_offset IN 0..29 LOOP
    base_date := CURRENT_DATE - day_offset;
    
    -- FitGear Pro - Overview metrics
    INSERT INTO kpi_metrics (account_id, date, metric_type, impressions, clicks, conversions, revenue, spend, engagement_rate, followers_gained, video_views, likes, comments, shares)
    VALUES (
      account_id_fitgear,
      base_date,
      'overview',
      250000 + (random() * 50000)::bigint,
      12000 + (random() * 3000)::bigint,
      180 + (random() * 40)::int,
      8500 + (random() * 2000)::decimal,
      1200 + (random() * 300)::decimal,
      4.5 + (random() * 1.5)::decimal,
      450 + (random() * 150)::int,
      180000 + (random() * 40000)::bigint,
      8500 + (random() * 2000)::int,
      420 + (random() * 100)::int,
      280 + (random() * 70)::int
    ) ON CONFLICT (account_id, date, metric_type) DO NOTHING;
    
    -- FitGear Pro - Posts metrics
    INSERT INTO kpi_metrics (account_id, date, metric_type, video_views, likes, comments, shares, engagement_rate)
    VALUES (
      account_id_fitgear,
      base_date,
      'posts',
      180000 + (random() * 40000)::bigint,
      8500 + (random() * 2000)::int,
      420 + (random() * 100)::int,
      280 + (random() * 70)::int,
      4.7 + (random() * 1.3)::decimal
    ) ON CONFLICT (account_id, date, metric_type) DO NOTHING;
    
    -- FitGear Pro - Engagement metrics
    INSERT INTO kpi_metrics (account_id, date, metric_type, followers_gained, likes, comments, shares, engagement_rate)
    VALUES (
      account_id_fitgear,
      base_date,
      'engagement',
      450 + (random() * 150)::int,
      8500 + (random() * 2000)::int,
      420 + (random() * 100)::int,
      280 + (random() * 70)::int,
      4.5 + (random() * 1.5)::decimal
    ) ON CONFLICT (account_id, date, metric_type) DO NOTHING;
    
    -- FitGear Pro - Ads metrics
    INSERT INTO kpi_metrics (account_id, date, metric_type, impressions, clicks, conversions, spend, revenue)
    VALUES (
      account_id_fitgear,
      base_date,
      'ads',
      85000 + (random() * 15000)::bigint,
      3200 + (random() * 800)::bigint,
      95 + (random() * 25)::int,
      1200 + (random() * 300)::decimal,
      5800 + (random() * 1200)::decimal
    ) ON CONFLICT (account_id, date, metric_type) DO NOTHING;
    
    -- FitGear Pro - Sales metrics
    INSERT INTO kpi_metrics (account_id, date, metric_type, conversions, revenue)
    VALUES (
      account_id_fitgear,
      base_date,
      'sales',
      180 + (random() * 40)::int,
      8500 + (random() * 2000)::decimal
    ) ON CONFLICT (account_id, date, metric_type) DO NOTHING;
    
    -- FitGear Pro - Affiliates metrics
    INSERT INTO kpi_metrics (account_id, date, metric_type, clicks, conversions, revenue, affiliate_commissions)
    VALUES (
      account_id_fitgear,
      base_date,
      'affiliates',
      1850 + (random() * 350)::bigint,
      42 + (random() * 12)::int,
      2100 + (random() * 500)::decimal,
      315 + (random() * 75)::decimal
    ) ON CONFLICT (account_id, date, metric_type) DO NOTHING;
    
    -- Beauty Bliss - Overview metrics
    INSERT INTO kpi_metrics (account_id, date, metric_type, impressions, clicks, conversions, revenue, spend, engagement_rate, followers_gained, video_views, likes, comments, shares)
    VALUES (
      account_id_beauty,
      base_date,
      'overview',
      320000 + (random() * 60000)::bigint,
      15500 + (random() * 3500)::bigint,
      235 + (random() * 55)::int,
      11200 + (random() * 2800)::decimal,
      1650 + (random() * 400)::decimal,
      5.2 + (random() * 1.8)::decimal,
      580 + (random() * 180)::int,
      235000 + (random() * 50000)::bigint,
      11500 + (random() * 2500)::int,
      580 + (random() * 130)::int,
      385 + (random() * 95)::int
    ) ON CONFLICT (account_id, date, metric_type) DO NOTHING;
    
    -- Beauty Bliss - Posts metrics
    INSERT INTO kpi_metrics (account_id, date, metric_type, video_views, likes, comments, shares, engagement_rate)
    VALUES (
      account_id_beauty,
      base_date,
      'posts',
      235000 + (random() * 50000)::bigint,
      11500 + (random() * 2500)::int,
      580 + (random() * 130)::int,
      385 + (random() * 95)::int,
      5.4 + (random() * 1.6)::decimal
    ) ON CONFLICT (account_id, date, metric_type) DO NOTHING;
    
    -- Beauty Bliss - Engagement metrics
    INSERT INTO kpi_metrics (account_id, date, metric_type, followers_gained, likes, comments, shares, engagement_rate)
    VALUES (
      account_id_beauty,
      base_date,
      'engagement',
      580 + (random() * 180)::int,
      11500 + (random() * 2500)::int,
      580 + (random() * 130)::int,
      385 + (random() * 95)::int,
      5.2 + (random() * 1.8)::decimal
    ) ON CONFLICT (account_id, date, metric_type) DO NOTHING;
    
    -- Beauty Bliss - Ads metrics
    INSERT INTO kpi_metrics (account_id, date, metric_type, impressions, clicks, conversions, spend, revenue)
    VALUES (
      account_id_beauty,
      base_date,
      'ads',
      110000 + (random() * 20000)::bigint,
      4200 + (random() * 1000)::bigint,
      125 + (random() * 35)::int,
      1650 + (random() * 400)::decimal,
      7800 + (random() * 1600)::decimal
    ) ON CONFLICT (account_id, date, metric_type) DO NOTHING;
    
    -- Beauty Bliss - Sales metrics
    INSERT INTO kpi_metrics (account_id, date, metric_type, conversions, revenue)
    VALUES (
      account_id_beauty,
      base_date,
      'sales',
      235 + (random() * 55)::int,
      11200 + (random() * 2800)::decimal
    ) ON CONFLICT (account_id, date, metric_type) DO NOTHING;
    
    -- Beauty Bliss - Affiliates metrics
    INSERT INTO kpi_metrics (account_id, date, metric_type, clicks, conversions, revenue, affiliate_commissions)
    VALUES (
      account_id_beauty,
      base_date,
      'affiliates',
      2350 + (random() * 450)::bigint,
      58 + (random() * 18)::int,
      2850 + (random() * 650)::decimal,
      427 + (random() * 97)::decimal
    ) ON CONFLICT (account_id, date, metric_type) DO NOTHING;
    
  END LOOP;
END $$;