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

// GET /api/admin/stores - List stores with products, orders, and P&L data
router.get('/stores', async (req, res) => {
    try {
        console.log('[Admin API] Fetching stores...');
        const { data: stores, error: storeError } = await supabase
            .from('tiktok_shops')
            .select(`
                *,
                accounts (
                    name
                ),
                shop_orders (count),
                shop_products (count),
                shop_settlements (
                    total_amount,
                    net_amount
                )
            `);

        console.log('[Admin API] Stores result count:', stores?.length, 'Error:', storeError);

        if (storeError) throw storeError;

        // Process stores to include counts and P&L summary
        const processedStores = stores.map((shop: any) => {
            const ordersCount = shop.shop_orders?.[0]?.count || 0;
            const productsCount = shop.shop_products?.[0]?.count || 0;

            const totalRevenue = shop.shop_settlements?.reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0) || 0;
            const totalNet = shop.shop_settlements?.reduce((sum: number, s: any) => sum + (Number(s.net_amount) || 0), 0) || 0;

            return {
                id: shop.id,
                shop_id: shop.shop_id,
                shop_name: shop.shop_name,
                account_name: shop.accounts?.name,
                region: shop.region,
                ordersCount,
                productsCount,
                totalRevenue,
                totalNet
            };
        });

        res.json({
            success: true,
            data: processedStores
        });
    } catch (error: any) {
        console.error('[Admin API] Stores error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
