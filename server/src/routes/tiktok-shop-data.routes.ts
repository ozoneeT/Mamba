import { Router, Request, Response } from 'express';
import { tiktokShopApi } from '../services/tiktok-shop-api.service';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * Helper function to get shop with valid token
 */
async function getShopWithToken(accountId: string, shopId?: string) {
    let query = supabase
        .from('tiktok_shops')
        .select('*')
        .eq('account_id', accountId);

    if (shopId) {
        query = query.eq('shop_id', shopId);
    }

    const { data: shops, error } = await query.limit(1).single();

    if (error || !shops) {
        throw new Error('Shop not found or not connected');
    }

    // Check if token is expired
    const tokenExpiresAt = new Date(shops.token_expires_at);
    if (tokenExpiresAt < new Date()) {
        // Refresh token
        const tokenData = await tiktokShopApi.refreshAccessToken(shops.refresh_token);

        const now = new Date();
        const newExpiresAt = new Date(now.getTime() + tokenData.access_token_expire_in * 1000);

        // Update token in database
        await supabase
            .from('tiktok_shops')
            .update({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                token_expires_at: newExpiresAt.toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', shops.id);

        shops.access_token = tokenData.access_token;
    }

    return shops;
}

/**
 * GET /api/tiktok-shop/shops/:accountId
 * Get all authorized shops for an account
 */
router.get('/shops/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;

        const { data: shops, error } = await supabase
            .from('tiktok_shops')
            .select('shop_id, shop_name, region, seller_type, created_at')
            .eq('account_id', accountId);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: shops || [],
        });
    } catch (error: any) {
        console.error('Error fetching shops:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/tiktok-shop/orders/:accountId
 * Get orders for a shop
 */
router.get('/orders/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const { shopId, status, page = '1', pageSize = '20' } = req.query;

        const shop = await getShopWithToken(accountId, shopId as string);

        const params: any = {
            page_size: parseInt(pageSize as string),
            page_number: parseInt(page as string),
        };

        if (status) {
            params.order_status = status;
        }

        const orders = await tiktokShopApi.makeApiRequest(
            '/order/202309/orders/search',
            shop.access_token,
            shop.shop_cipher,
            params,
            'POST'
        );

        res.json({
            success: true,
            data: orders,
        });
    } catch (error: any) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/tiktok-shop/products/:accountId
 * Get products for a shop
 */
router.get('/products/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const { shopId, page = '1', pageSize = '20' } = req.query;

        const shop = await getShopWithToken(accountId, shopId as string);

        const params = {
            page_size: parseInt(pageSize as string),
            page_number: parseInt(page as string),
        };

        const products = await tiktokShopApi.makeApiRequest(
            '/product/202309/products/search',
            shop.access_token,
            shop.shop_cipher,
            params,
            'POST'
        );

        res.json({
            success: true,
            data: products,
        });
    } catch (error: any) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/tiktok-shop/settlements/:accountId
 * Get settlement data for financial reporting
 */
router.get('/settlements/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const { shopId, startTime, endTime } = req.query;

        const shop = await getShopWithToken(accountId, shopId as string);

        const params: any = {};

        if (startTime) params.start_time = parseInt(startTime as string);
        if (endTime) params.end_time = parseInt(endTime as string);

        const settlements = await tiktokShopApi.makeApiRequest(
            '/finance/202309/statements',
            shop.access_token,
            shop.shop_cipher,
            params
        );

        res.json({
            success: true,
            data: settlements,
        });
    } catch (error: any) {
        console.error('Error fetching settlements:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/tiktok-shop/performance/:accountId
 * Get shop performance metrics
 */
router.get('/performance/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const { shopId } = req.query;

        const shop = await getShopWithToken(accountId, shopId as string);

        const performance = await tiktokShopApi.makeApiRequest(
            '/seller/202309/performance',
            shop.access_token,
            shop.shop_cipher
        );

        res.json({
            success: true,
            data: performance,
        });
    } catch (error: any) {
        console.error('Error fetching performance:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * POST /api/tiktok-shop/sync/:accountId
 * Trigger data synchronization
 */
router.post('/sync/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const { shopId, syncType = 'all' } = req.body;

        const shop = await getShopWithToken(accountId, shopId);

        // Fetch and store data based on syncType
        const syncPromises = [];

        if (syncType === 'all' || syncType === 'orders') {
            syncPromises.push(syncOrders(shop));
        }

        if (syncType === 'all' || syncType === 'products') {
            syncPromises.push(syncProducts(shop));
        }

        if (syncType === 'all' || syncType === 'settlements') {
            syncPromises.push(syncSettlements(shop));
        }

        await Promise.all(syncPromises);

        res.json({
            success: true,
            message: 'Data synchronization completed',
        });
    } catch (error: any) {
        console.error('Error syncing data:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// Helper functions for syncing data
async function syncOrders(shop: any) {
    // Fetch recent orders and store in database
    const orders = await tiktokShopApi.makeApiRequest(
        '/order/202309/orders/search',
        shop.access_token,
        shop.shop_cipher,
        { page_size: 50, page_number: 1 },
        'POST'
    );

    // Store in shop_orders table
    // Implementation depends on your data structure
}

async function syncProducts(shop: any) {
    // Fetch products and store in database
    const products = await tiktokShopApi.makeApiRequest(
        '/product/202309/products/search',
        shop.access_token,
        shop.shop_cipher,
        { page_size: 50, page_number: 1 },
        'POST'
    );

    // Store in shop_products table
}

async function syncSettlements(shop: any) {
    // Fetch settlements and store in database
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    const settlements = await tiktokShopApi.makeApiRequest(
        '/finance/202309/statements',
        shop.access_token,
        shop.shop_cipher,
        {
            start_time: Math.floor(thirtyDaysAgo / 1000),
            end_time: Math.floor(now / 1000),
        }
    );

    // Store in shop_settlements table
}

export default router;
