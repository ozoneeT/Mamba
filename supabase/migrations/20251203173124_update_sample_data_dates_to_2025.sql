/*
  # Update Sample Data Dates to 2025

  ## Overview
  Updates all sample campaign and content post dates from 2024 to 2025
  so they appear in the default 30-day date range filter.

  ## Changes
  - Updates ad_campaigns start dates to November-December 2025
  - Updates content_posts published dates to November 2025
  - Updates sales_campaigns start dates to November-December 2025
*/

-- Update Ad Campaigns to 2025
UPDATE ad_campaigns SET start_date = '2025-06-01' WHERE start_date = '2024-06-01';
UPDATE ad_campaigns SET start_date = '2025-11-15' WHERE start_date = '2024-11-15';
UPDATE ad_campaigns SET start_date = '2025-12-01' WHERE start_date = '2024-12-01';
UPDATE ad_campaigns SET start_date = '2025-10-01' WHERE start_date = '2024-10-01';
UPDATE ad_campaigns SET start_date = '2025-11-20' WHERE start_date = '2024-11-20';
UPDATE ad_campaigns SET start_date = '2025-11-01' WHERE start_date = '2024-11-01';
UPDATE ad_campaigns SET start_date = '2025-11-25' WHERE start_date = '2024-11-25';
UPDATE ad_campaigns SET start_date = '2025-11-10' WHERE start_date = '2024-11-10';
UPDATE ad_campaigns SET start_date = '2025-11-05' WHERE start_date = '2024-11-05';

-- Update Content Posts to 2025
UPDATE content_posts SET published_at = '2025-11-28' WHERE published_at::date = '2024-11-28';
UPDATE content_posts SET published_at = '2025-11-26' WHERE published_at::date = '2024-11-26';
UPDATE content_posts SET published_at = '2025-11-25' WHERE published_at::date = '2024-11-25';
UPDATE content_posts SET published_at = '2025-11-24' WHERE published_at::date = '2024-11-24';
UPDATE content_posts SET published_at = '2025-11-27' WHERE published_at::date = '2024-11-27';
UPDATE content_posts SET published_at = '2025-11-23' WHERE published_at::date = '2024-11-23';

-- Update Sales Campaigns to 2025
UPDATE sales_campaigns SET start_date = '2025-11-24' WHERE start_date = '2024-11-24';
UPDATE sales_campaigns SET start_date = '2025-11-27' WHERE start_date = '2024-11-27';
UPDATE sales_campaigns SET start_date = '2025-11-15' WHERE start_date = '2024-11-15';
UPDATE sales_campaigns SET start_date = '2025-11-20' WHERE start_date = '2024-11-20';
UPDATE sales_campaigns SET start_date = '2025-11-01' WHERE start_date = '2024-11-01';
UPDATE sales_campaigns SET start_date = '2025-12-01' WHERE start_date = '2024-12-01';
UPDATE sales_campaigns SET start_date = '2025-11-18' WHERE start_date = '2024-11-18';
