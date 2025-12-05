/*
  # Add Sample Campaign and Content Data

  ## Overview
  Populates the new campaign and content tables with realistic sample data
  across multiple accounts to demonstrate drill-down functionality.

  ## Data Added
  - Ad campaigns with varying performance metrics
  - Content posts with engagement data
  - Affiliate programs with conversion data
  - Sales campaigns with revenue data
*/

-- Sample Ad Campaigns
INSERT INTO ad_campaigns (account_id, name, status, start_date, budget, impressions, clicks, conversions, spend, revenue) VALUES
  ((SELECT id FROM accounts WHERE name = 'Tech Gadgets Store' LIMIT 1), 'Summer Sale 2024', 'active', '2024-06-01', 5000, 1250000, 45000, 890, 4200, 22400),
  ((SELECT id FROM accounts WHERE name = 'Tech Gadgets Store' LIMIT 1), 'Product Launch - New Collection', 'active', '2024-11-15', 8000, 2100000, 78000, 1450, 7200, 43500),
  ((SELECT id FROM accounts WHERE name = 'Tech Gadgets Store' LIMIT 1), 'Holiday Special', 'paused', '2024-12-01', 3000, 850000, 28000, 420, 2800, 12600),
  ((SELECT id FROM accounts WHERE name = 'Fashion Boutique' LIMIT 1), 'Brand Awareness Q4', 'active', '2024-10-01', 6000, 1800000, 62000, 1120, 5500, 33600),
  ((SELECT id FROM accounts WHERE name = 'Fashion Boutique' LIMIT 1), 'Flash Sale Weekend', 'completed', '2024-11-20', 2000, 950000, 35000, 580, 1850, 17400),
  ((SELECT id FROM accounts WHERE name = 'Fitness Hub' LIMIT 1), 'New Product Teaser', 'active', '2024-11-01', 4500, 1500000, 52000, 780, 4100, 23400),
  ((SELECT id FROM accounts WHERE name = 'Fitness Hub' LIMIT 1), 'Retargeting Campaign', 'active', '2024-11-25', 3500, 680000, 38000, 920, 3200, 27600),
  ((SELECT id FROM accounts WHERE name = 'Beauty Bliss' LIMIT 1), 'Skincare Essentials', 'active', '2024-11-10', 4200, 1350000, 48000, 850, 3900, 25500),
  ((SELECT id FROM accounts WHERE name = 'Sports Gear' LIMIT 1), 'Athlete Series Launch', 'active', '2024-11-05', 5500, 1680000, 58000, 1050, 5100, 31500);

-- Sample Content Posts
INSERT INTO content_posts (account_id, title, published_at, views, likes, comments, shares, engagement_rate) VALUES
  ((SELECT id FROM accounts WHERE name = 'Tech Gadgets Store' LIMIT 1), 'Unboxing Our Best Seller', '2024-11-28', 450000, 32000, 1200, 890, 7.6),
  ((SELECT id FROM accounts WHERE name = 'Tech Gadgets Store' LIMIT 1), 'Behind the Scenes: Product Creation', '2024-11-26', 280000, 18500, 650, 420, 6.9),
  ((SELECT id FROM accounts WHERE name = 'Tech Gadgets Store' LIMIT 1), '5 Ways to Use Our Gadget', '2024-11-25', 520000, 41000, 1800, 1200, 8.2),
  ((SELECT id FROM accounts WHERE name = 'Tech Gadgets Store' LIMIT 1), 'Customer Review Compilation', '2024-11-24', 180000, 12000, 420, 280, 7.1),
  ((SELECT id FROM accounts WHERE name = 'Fashion Boutique' LIMIT 1), 'Viral Style Challenge', '2024-11-27', 1200000, 95000, 3200, 2800, 8.4),
  ((SELECT id FROM accounts WHERE name = 'Fashion Boutique' LIMIT 1), 'Outfit Transformation', '2024-11-26', 680000, 48000, 1600, 950, 7.4),
  ((SELECT id FROM accounts WHERE name = 'Fashion Boutique' LIMIT 1), 'Day in the Life', '2024-11-23', 420000, 28000, 920, 580, 7.0),
  ((SELECT id FROM accounts WHERE name = 'Fitness Hub' LIMIT 1), 'Trending Workout Routine', '2024-11-28', 890000, 72000, 2400, 1800, 8.6),
  ((SELECT id FROM accounts WHERE name = 'Fitness Hub' LIMIT 1), 'Quick Tips Tutorial', '2024-11-25', 350000, 24000, 780, 520, 7.2),
  ((SELECT id FROM accounts WHERE name = 'Beauty Bliss' LIMIT 1), 'Skincare Routine Reveal', '2024-11-27', 520000, 38000, 1200, 850, 7.7),
  ((SELECT id FROM accounts WHERE name = 'Beauty Bliss' LIMIT 1), 'Product Comparison', '2024-11-24', 290000, 19000, 680, 420, 7.0),
  ((SELECT id FROM accounts WHERE name = 'Sports Gear' LIMIT 1), 'Athlete Training Tips', '2024-11-26', 640000, 45000, 1400, 980, 7.8),
  ((SELECT id FROM accounts WHERE name = 'Gaming World' LIMIT 1), 'Epic Gaming Setup Tour', '2024-11-25', 780000, 58000, 2100, 1450, 7.9);

-- Sample Affiliate Programs
INSERT INTO affiliate_programs (account_id, program_name, product_name, commission_rate, status, clicks, conversions, revenue, commissions_earned) VALUES
  ((SELECT id FROM accounts WHERE name = 'Tech Gadgets Store' LIMIT 1), 'Amazon Associates', 'Premium Tech Gear', 8.5, 'active', 45000, 890, 44500, 3782),
  ((SELECT id FROM accounts WHERE name = 'Tech Gadgets Store' LIMIT 1), 'ClickBank', 'Digital Training Course', 40.0, 'active', 28000, 420, 20900, 8360),
  ((SELECT id FROM accounts WHERE name = 'Fashion Boutique' LIMIT 1), 'ShareASale', 'Designer Clothing', 12.0, 'active', 62000, 1120, 56000, 6720),
  ((SELECT id FROM accounts WHERE name = 'Fashion Boutique' LIMIT 1), 'CJ Affiliate', 'Fashion Accessories', 10.0, 'active', 35000, 580, 29000, 2900),
  ((SELECT id FROM accounts WHERE name = 'Fitness Hub' LIMIT 1), 'Impact', 'Fitness Equipment', 15.0, 'active', 52000, 780, 39000, 5850),
  ((SELECT id FROM accounts WHERE name = 'Fitness Hub' LIMIT 1), 'Rakuten', 'Nutrition Supplements', 8.0, 'active', 38000, 620, 31000, 2480),
  ((SELECT id FROM accounts WHERE name = 'Beauty Bliss' LIMIT 1), 'Commission Junction', 'Beauty Products', 6.5, 'active', 41000, 720, 48000, 3120),
  ((SELECT id FROM accounts WHERE name = 'Sports Gear' LIMIT 1), 'AWIN', 'Athletic Wear', 11.0, 'active', 48000, 850, 42500, 4675);

-- Sample Sales Campaigns
INSERT INTO sales_campaigns (account_id, campaign_name, product_name, status, start_date, total_orders, revenue, cost, profit, avg_order_value) VALUES
  ((SELECT id FROM accounts WHERE name = 'Tech Gadgets Store' LIMIT 1), 'Black Friday Deals', 'Premium Bundle', 'active', '2024-11-24', 890, 44500, 12000, 32500, 50.00),
  ((SELECT id FROM accounts WHERE name = 'Tech Gadgets Store' LIMIT 1), 'Cyber Monday Special', 'Starter Pack', 'active', '2024-11-27', 1200, 36000, 9600, 26400, 30.00),
  ((SELECT id FROM accounts WHERE name = 'Fashion Boutique' LIMIT 1), 'Winter Collection Launch', 'Deluxe Set', 'active', '2024-11-15', 1450, 87000, 28000, 59000, 60.00),
  ((SELECT id FROM accounts WHERE name = 'Fashion Boutique' LIMIT 1), 'Flash Sale Series', 'Best Sellers Mix', 'completed', '2024-11-20', 580, 17400, 5200, 12200, 30.00),
  ((SELECT id FROM accounts WHERE name = 'Fitness Hub' LIMIT 1), 'Limited Edition Drop', 'Exclusive Item', 'active', '2024-11-01', 780, 58500, 18000, 40500, 75.00),
  ((SELECT id FROM accounts WHERE name = 'Fitness Hub' LIMIT 1), 'Bundle Promotion', 'Value Pack', 'active', '2024-11-15', 920, 36800, 11000, 25800, 40.00),
  ((SELECT id FROM accounts WHERE name = 'Beauty Bliss' LIMIT 1), 'Holiday Gift Guide', 'Gift Sets', 'active', '2024-12-01', 650, 32500, 9750, 22750, 50.00),
  ((SELECT id FROM accounts WHERE name = 'Sports Gear' LIMIT 1), 'Athlete Pro Series', 'Performance Gear', 'active', '2024-11-18', 1100, 66000, 19800, 46200, 60.00);
