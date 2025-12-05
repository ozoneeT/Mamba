/*
  # Add Comprehensive Sample Data for All Accounts

  ## Overview
  Adds campaigns, posts, affiliate programs, and sales data for all remaining
  accounts that don't have sample data yet.

  ## Data Added
  - Ad campaigns for 12 additional accounts
  - Content posts for 12 additional accounts
  - Affiliate programs for 12 additional accounts
  - Sales campaigns for 12 additional accounts
*/

-- Ad Campaigns for remaining accounts
INSERT INTO ad_campaigns (account_id, name, status, start_date, budget, impressions, clicks, conversions, spend, revenue) VALUES
((SELECT id FROM accounts WHERE name = 'Beauty Products' LIMIT 1), 'Q4 Growth Campaign', 'active', '2025-11-10', 4000, 1200000, 42000, 680, 3500, 20400),
((SELECT id FROM accounts WHERE name = 'Home Decor' LIMIT 1), 'Holiday Season Push', 'active', '2025-11-20', 3200, 950000, 35000, 520, 2900, 15600),
((SELECT id FROM accounts WHERE name = 'Pet Paradise' LIMIT 1), 'Pet Lovers Campaign', 'active', '2025-11-15', 2800, 820000, 29000, 450, 2500, 13500),
((SELECT id FROM accounts WHERE name = 'Snack Box' LIMIT 1), 'Snack Attack Promo', 'active', '2025-11-18', 3500, 1100000, 38000, 590, 3100, 17700),
((SELECT id FROM accounts WHERE name = 'Outdoor Adventure' LIMIT 1), 'Adventure Awaits', 'active', '2025-11-12', 4200, 1350000, 47000, 740, 3800, 22200),
((SELECT id FROM accounts WHERE name = 'Gaming World' LIMIT 1), 'Gaming Gear Launch', 'active', '2025-11-25', 5200, 1680000, 58000, 920, 4800, 27600),
((SELECT id FROM accounts WHERE name = 'Jewelry Shop' LIMIT 1), 'Sparkle & Shine', 'active', '2025-11-08', 3800, 1150000, 40000, 640, 3400, 19200),
((SELECT id FROM accounts WHERE name = 'Book Corner' LIMIT 1), 'Book Lovers Special', 'active', '2025-11-22', 2500, 780000, 27000, 420, 2300, 12600),
((SELECT id FROM accounts WHERE name = 'Toy Store' LIMIT 1), 'Toy Wonderland', 'active', '2025-11-28', 4500, 1420000, 49000, 780, 4100, 23400),
((SELECT id FROM accounts WHERE name = 'Kitchen Essentials' LIMIT 1), 'Kitchen Magic', 'active', '2025-11-14', 3600, 1080000, 38000, 600, 3300, 18000),
((SELECT id FROM accounts WHERE name = 'Music Shop' LIMIT 1), 'Music Mania', 'active', '2025-11-17', 3300, 1020000, 36000, 560, 3000, 16800),
((SELECT id FROM accounts WHERE name = 'FitGear Pro' LIMIT 1), 'Fit Pro Launch', 'active', '2025-11-19', 4800, 1520000, 53000, 840, 4400, 25200);

-- Content Posts for remaining accounts
INSERT INTO content_posts (account_id, title, published_at, views, likes, comments, shares, engagement_rate) VALUES
((SELECT id FROM accounts WHERE name = 'Beauty Products' LIMIT 1), 'Product Showcase Reel', '2025-11-27', 380000, 26000, 890, 620, 7.2),
((SELECT id FROM accounts WHERE name = 'Home Decor' LIMIT 1), 'Home Transformation Video', '2025-11-26', 420000, 29000, 980, 720, 7.3),
((SELECT id FROM accounts WHERE name = 'Pet Paradise' LIMIT 1), 'Cute Pet Moments', '2025-11-28', 680000, 52000, 1800, 1300, 8.1),
((SELECT id FROM accounts WHERE name = 'Snack Box' LIMIT 1), 'Snack Unboxing', '2025-11-25', 320000, 22000, 750, 480, 7.0),
((SELECT id FROM accounts WHERE name = 'Outdoor Adventure' LIMIT 1), 'Epic Outdoor Adventure', '2025-11-24', 580000, 42000, 1400, 980, 7.6),
((SELECT id FROM accounts WHERE name = 'Jewelry Shop' LIMIT 1), 'Jewelry Collection Tour', '2025-11-27', 290000, 19000, 640, 420, 6.9),
((SELECT id FROM accounts WHERE name = 'Book Corner' LIMIT 1), 'Book Recommendations', '2025-11-26', 240000, 16000, 540, 350, 6.8),
((SELECT id FROM accounts WHERE name = 'Toy Store' LIMIT 1), 'Toy Haul & Review', '2025-11-28', 480000, 35000, 1200, 850, 7.7),
((SELECT id FROM accounts WHERE name = 'Kitchen Essentials' LIMIT 1), 'Cooking Tips & Tricks', '2025-11-25', 390000, 27000, 920, 640, 7.2),
((SELECT id FROM accounts WHERE name = 'Music Shop' LIMIT 1), 'Music Gear Review', '2025-11-24', 310000, 21000, 710, 480, 7.1),
((SELECT id FROM accounts WHERE name = 'FitGear Pro' LIMIT 1), 'Workout Routine Demo', '2025-11-27', 520000, 38000, 1300, 920, 7.7),
((SELECT id FROM accounts WHERE name = 'Home Decor' LIMIT 1), 'Home Styling Ideas', '2025-11-28', 360000, 24000, 820, 580, 7.0);

-- Affiliate Programs
INSERT INTO affiliate_programs (account_id, program_name, product_name, commission_rate, status, clicks, conversions, revenue, commissions_earned) VALUES
((SELECT id FROM accounts WHERE name = 'Beauty Products' LIMIT 1), 'Partner Network', 'Beauty Collection', 9.5, 'active', 38000, 620, 36000, 3420),
((SELECT id FROM accounts WHERE name = 'Home Decor' LIMIT 1), 'Home Affiliates', 'Decor Essentials', 11.0, 'active', 42000, 680, 39000, 4290),
((SELECT id FROM accounts WHERE name = 'Pet Paradise' LIMIT 1), 'Pet Partners', 'Pet Care Products', 10.0, 'active', 35000, 580, 32000, 3200),
((SELECT id FROM accounts WHERE name = 'Snack Box' LIMIT 1), 'Snack Associates', 'Snack Boxes', 7.5, 'active', 32000, 520, 28000, 2100),
((SELECT id FROM accounts WHERE name = 'Outdoor Adventure' LIMIT 1), 'Adventure Network', 'Outdoor Gear', 12.5, 'active', 48000, 760, 44000, 5500),
((SELECT id FROM accounts WHERE name = 'Gaming World' LIMIT 1), 'Gaming Partners', 'Gaming Accessories', 13.0, 'active', 55000, 880, 52000, 6760),
((SELECT id FROM accounts WHERE name = 'Jewelry Shop' LIMIT 1), 'Jewelry Affiliates', 'Fine Jewelry', 8.0, 'active', 39000, 640, 42000, 3360),
((SELECT id FROM accounts WHERE name = 'Book Corner' LIMIT 1), 'Book Partners', 'Bestseller Books', 6.0, 'active', 28000, 450, 24000, 1440),
((SELECT id FROM accounts WHERE name = 'Toy Store' LIMIT 1), 'Toy Network', 'Educational Toys', 9.0, 'active', 44000, 720, 38000, 3420),
((SELECT id FROM accounts WHERE name = 'Kitchen Essentials' LIMIT 1), 'Kitchen Associates', 'Kitchen Tools', 10.5, 'active', 40000, 650, 35000, 3675),
((SELECT id FROM accounts WHERE name = 'Music Shop' LIMIT 1), 'Music Partners', 'Music Equipment', 11.5, 'active', 37000, 600, 33000, 3795),
((SELECT id FROM accounts WHERE name = 'FitGear Pro' LIMIT 1), 'Fitness Network', 'Pro Equipment', 14.0, 'active', 51000, 820, 48000, 6720);

-- Sales Campaigns
INSERT INTO sales_campaigns (account_id, campaign_name, product_name, status, start_date, total_orders, revenue, cost, profit, avg_order_value) VALUES
((SELECT id FROM accounts WHERE name = 'Beauty Products' LIMIT 1), 'Beauty Bundle Sale', 'Skincare Set', 'active', '2025-11-20', 720, 36000, 10800, 25200, 50.00),
((SELECT id FROM accounts WHERE name = 'Home Decor' LIMIT 1), 'Home Makeover Deal', 'Decor Package', 'active', '2025-11-18', 640, 38400, 11520, 26880, 60.00),
((SELECT id FROM accounts WHERE name = 'Pet Paradise' LIMIT 1), 'Pet Essentials Pack', 'Pet Care Bundle', 'active', '2025-11-22', 580, 29000, 8700, 20300, 50.00),
((SELECT id FROM accounts WHERE name = 'Snack Box' LIMIT 1), 'Snack Variety Box', 'Mixed Snacks', 'active', '2025-11-25', 980, 29400, 8820, 20580, 30.00),
((SELECT id FROM accounts WHERE name = 'Outdoor Adventure' LIMIT 1), 'Adventure Gear Sale', 'Camping Set', 'active', '2025-11-19', 760, 53200, 15960, 37240, 70.00),
((SELECT id FROM accounts WHERE name = 'Gaming World' LIMIT 1), 'Gaming Ultimate Pack', 'Gaming Bundle', 'active', '2025-11-26', 920, 73600, 22080, 51520, 80.00),
((SELECT id FROM accounts WHERE name = 'Jewelry Shop' LIMIT 1), 'Jewelry Collection', 'Premium Set', 'active', '2025-11-21', 540, 48600, 14580, 34020, 90.00),
((SELECT id FROM accounts WHERE name = 'Book Corner' LIMIT 1), 'Book Bundle Deal', 'Reader Pack', 'active', '2025-11-24', 680, 20400, 6120, 14280, 30.00),
((SELECT id FROM accounts WHERE name = 'Toy Store' LIMIT 1), 'Toy Mega Sale', 'Toy Collection', 'active', '2025-11-28', 1120, 44800, 13440, 31360, 40.00),
((SELECT id FROM accounts WHERE name = 'Kitchen Essentials' LIMIT 1), 'Kitchen Pro Bundle', 'Chef Set', 'active', '2025-11-23', 740, 44400, 13320, 31080, 60.00),
((SELECT id FROM accounts WHERE name = 'Music Shop' LIMIT 1), 'Music Starter Pack', 'Musician Set', 'active', '2025-11-20', 620, 43400, 13020, 30380, 70.00),
((SELECT id FROM accounts WHERE name = 'FitGear Pro' LIMIT 1), 'Pro Athlete Bundle', 'Elite Gear', 'active', '2025-11-27', 880, 70400, 21120, 49280, 80.00);
