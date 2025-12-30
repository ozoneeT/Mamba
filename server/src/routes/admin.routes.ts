import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Apply admin middleware to all routes
router.use(adminMiddleware);

// GET /api/admin/stats - Total users and stores
router.get('/stats', async (req, res) => {
    try {
        console.log('[Admin API] Fetching stats...');
        const { count: userCount, error: userError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        const { count: storeCount, error: storeError } = await supabase
            .from('tiktok_shops')
            .select('*', { count: 'exact', head: true });

        console.log('[Admin API] Stats result:', { userCount, storeCount, userError, storeError });

        if (userError || storeError) throw userError || storeError;

        res.json({
            success: true,
            data: {
                totalUsers: userCount || 0,
                totalStores: storeCount || 0
            }
        });
    } catch (error: any) {
        console.error('[Admin API] Stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/admin/users - List users with roles and connected stores
router.get('/users', async (req, res) => {
    try {
        console.log('[Admin API] Fetching users...');
        const { data: users, error: userError } = await supabase
            .from('profiles')
            .select(`
                *,
                user_accounts (
                    account_id,
                    accounts (
                        id,
                        name,
                        tiktok_shops (
                            id,
                            shop_name
                        )
                    )
                )
            `)
            .order('created_at', { ascending: false });

        console.log('[Admin API] Users result count:', users?.length, 'Error:', userError);

        if (userError) throw userError;

        res.json({
            success: true,
            data: users
        });
    } catch (error: any) {
        console.error('[Admin API] Users error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PATCH /api/admin/users/:id/role - Update user role
router.patch('/users/:id/role', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'client', 'moderator', 'accountant'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ role, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/admin/stores - List stores grouped by account with owner name
router.get('/stores', async (req, res) => {
    try {
        console.log('[Admin API] Fetching stores grouped by account...');

        // 1. Fetch all accounts with their owners and shops
        const { data: accounts, error: accountError } = await supabase
            .from('accounts')
            .select(`
                id,
                name,
                user_accounts!inner (
                    profiles!inner (
                        id,
                        full_name,
                        email,
                        role
                    )
                ),
                tiktok_shops (
                    id,
                    shop_id,
                    shop_name,
                    region,
                    shop_orders (count),
                    shop_products (count),
                    shop_settlements (
                        total_amount,
                        net_amount
                    )
                )
            `);

        if (accountError) {
            console.error('[Admin API] Account fetch error:', accountError);
            // Fallback to fetching accounts without owners if the join fails
            const { data: fallbackAccounts, error: fallbackError } = await supabase
                .from('accounts')
                .select(`
                    id,
                    name,
                    user_accounts (
                        profiles (*)
                    ),
                    tiktok_shops (
                        id,
                        shop_id,
                        shop_name,
                        region,
                        shop_orders (count),
                        shop_products (count),
                        shop_settlements (
                            total_amount,
                            net_amount
                        )
                    )
                `);

            if (fallbackError) throw fallbackError;

            // Process fallback accounts
            const processedFallback = fallbackAccounts.map((account: any) => {
                const shops = account.tiktok_shops || [];
                let totalOrders = 0;
                let totalProducts = 0;
                let totalRevenue = 0;
                let totalNet = 0;

                const processedShops = shops.map((shop: any) => {
                    const ordersCount = shop.shop_orders?.[0]?.count || 0;
                    const productsCount = shop.shop_products?.[0]?.count || 0;
                    const revenue = shop.shop_settlements?.reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0) || 0;
                    const net = shop.shop_settlements?.reduce((sum: number, s: any) => sum + (Number(s.net_amount) || 0), 0) || 0;

                    totalOrders += ordersCount;
                    totalProducts += productsCount;
                    totalRevenue += revenue;
                    totalNet += net;

                    return {
                        id: shop.id,
                        shop_id: shop.shop_id,
                        shop_name: shop.shop_name,
                        region: shop.region,
                        ordersCount,
                        productsCount,
                        revenue,
                        net,
                        created_at: shop.created_at
                    };
                });

                return {
                    id: account.id,
                    account_name: account.name || 'Unknown Account',
                    owner_id: account.user_accounts?.[0]?.profiles?.id,
                    owner_role: account.user_accounts?.[0]?.profiles?.role || 'client',
                    owner_full_name: account.user_accounts?.[0]?.profiles?.full_name || account.name,
                    original_name: account.name,
                    storesCount: shops.length,
                    totalOrders,
                    totalProducts,
                    totalRevenue,
                    totalNet,
                    stores: processedShops
                };
            });

            return res.json({ success: true, data: processedFallback });
        }

        // 2. Process and group data
        const processedAccounts = accounts.map((account: any) => {
            // In the join, user_accounts is an array, and each has a profiles object
            const owner = account.user_accounts?.[0]?.profiles;
            const ownerName = owner?.full_name || owner?.email || account.name || 'Unknown';

            const shops = account.tiktok_shops || [];

            // Aggregate metrics across all shops in this account
            let totalOrders = 0;
            let totalProducts = 0;
            let totalRevenue = 0;
            let totalNet = 0;

            const processedShops = shops.map((shop: any) => {
                const ordersCount = shop.shop_orders?.[0]?.count || 0;
                const productsCount = shop.shop_products?.[0]?.count || 0;

                // Filter settlements for last 30 days
                const now = Date.now();
                const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
                const startSec = thirtyDaysAgo / 1000;

                const recentSettlements = shop.shop_settlements?.filter((s: any) => s.settlement_time >= startSec) || [];

                const revenue = recentSettlements.reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0);
                const net = recentSettlements.reduce((sum: number, s: any) => sum + (Number(s.net_amount) || 0), 0);

                totalOrders += ordersCount;
                totalProducts += productsCount;
                totalRevenue += revenue;
                totalNet += net;

                return {
                    id: shop.id,
                    shop_id: shop.shop_id,
                    shop_name: shop.shop_name,
                    region: shop.region,
                    ordersCount,
                    productsCount,
                    revenue,
                    net,
                    created_at: shop.created_at
                };
            });

            return {
                id: account.id,
                account_name: ownerName,
                owner_id: owner?.id,
                owner_role: owner?.role || 'client',
                owner_full_name: owner?.full_name || ownerName,
                original_name: account.name,
                storesCount: shops.length,
                totalOrders,
                totalProducts,
                totalRevenue,
                totalNet,
                stores: processedShops
            };
        });

        res.json({
            success: true,
            data: processedAccounts
        });
    } catch (error: any) {
        console.error('[Admin API] Stores error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/admin/stores/:shopId/pl - Get detailed P&L for a specific shop
router.get('/stores/:shopId/pl', async (req, res) => {
    try {
        const { shopId } = req.params;
        const { startDate, endDate } = req.query;

        console.log(`[Admin API] Fetching P&L for shop ${shopId}...`);

        let query = supabase
            .from('shop_settlements')
            .select('*')
            .eq('shop_id', shopId);

        if (startDate && endDate) {
            query = query
                .gte('settlement_time', startDate)
                .lte('settlement_time', endDate);
        }

        const { data: settlements, error: settlementError } = await query;

        if (settlementError) throw settlementError;

        // Calculate P&L metrics
        const totalRevenue = settlements.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
        const platformFees = settlements.reduce((sum, s) => sum + (Number(s.platform_fee) || 0), 0);
        const shippingFees = settlements.reduce((sum, s) => sum + (Number(s.shipping_fee) || 0), 0);
        const affiliateCommissions = settlements.reduce((sum, s) => sum + (Number(s.affiliate_commission) || 0), 0);
        const refunds = settlements.reduce((sum, s) => sum + (Number(s.refund_amount) || 0), 0);
        const adjustments = settlements.reduce((sum, s) => sum + (Number(s.adjustment_amount) || 0), 0);
        const netProfit = settlements.reduce((sum, s) => sum + (Number(s.net_amount) || 0), 0);

        res.json({
            success: true,
            data: {
                totalRevenue,
                platformFees,
                shippingFees,
                affiliateCommissions,
                refunds,
                adjustments,
                netProfit,
                settlementCount: settlements.length
            }
        });
    } catch (error: any) {
        console.error('[Admin API] P&L error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
