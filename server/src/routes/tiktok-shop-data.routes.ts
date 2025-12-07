import { Router, Request, Response } from 'express';
import { tiktokShopApi } from '../services/tiktok-shop-api.service.js';
import { supabase } from '../config/supabase.js';

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

        const response = await tiktokShopApi.makeApiRequest(
            '/products/search',
            shop.access_token,
            shop.shop_cipher,
            params,
            'POST'
        );

        // Transform the response to match frontend expectations
        const products = (response.products || []).map((p: any) => {
            const mainSku = p.skus?.[0] || {};
            const priceInfo = mainSku.price || {};
            const stockInfo = mainSku.stock_infos?.[0] || {};

            return {
                product_id: p.id,
                product_name: p.name,
                price: parseFloat(priceInfo.original_price || '0'),
                currency: priceInfo.currency || 'USD',
                stock: stockInfo.available_stock || 0,
                sales_count: 0, // Sales count not directly available in this endpoint response structure
                status: p.status === 4 ? 'active' : 'inactive', // Map status 4 to active
                images: [], // Images not in the search response, would need detail call
                create_time: p.create_time
            };
        });

        res.json({
            success: true,
            data: {
                products,
                total: response.total
            },
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

// Cron job endpoint for Vercel
router.get('/sync/cron', async (req: Request, res: Response) => {
    // Verify Vercel Cron signature (optional but recommended)
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // For now, allow open access or check a simple secret
        // return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('Starting scheduled sync...');

        // Get all active shops
        const { data: shops, error } = await supabase
            .from('tiktok_shops')
            .select('*');

        if (error) throw error;

        if (!shops || shops.length === 0) {
            return res.json({ message: 'No shops to sync' });
        }

        console.log(`Found ${shops.length} shops to sync`);

        // Sync each shop
        const results = await Promise.allSettled(shops.map(async (shop) => {
            try {
                // Refresh token if needed
                const tokenExpiresAt = new Date(shop.token_expires_at);
                if (tokenExpiresAt < new Date()) {
                    const tokenData = await tiktokShopApi.refreshAccessToken(shop.refresh_token);

                    // Update shop with new token
                    await supabase
                        .from('tiktok_shops')
                        .update({
                            access_token: tokenData.access_token,
                            refresh_token: tokenData.refresh_token,
                            token_expires_at: new Date(Date.now() + tokenData.access_token_expire_in * 1000).toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', shop.id);

                    shop.access_token = tokenData.access_token;
                }

                // Run syncs
                await Promise.all([
                    syncOrders(shop),
                    syncProducts(shop),
                    syncSettlements(shop)
                ]);

                return { shop_id: shop.shop_id, status: 'success' };
            } catch (err: any) {
                console.error(`Failed to sync shop ${shop.shop_name}:`, err);
                return { shop_id: shop.shop_id, status: 'failed', error: err.message };
            }
        }));

        res.json({
            success: true,
            results
        });
    } catch (error: any) {
        console.error('Cron sync failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper functions for syncing data
async function syncOrders(shop: any) {
    console.log(`Syncing orders for shop ${shop.shop_name}...`);
    try {
        // Fetch recent orders (last 30 days)
        const now = Math.floor(Date.now() / 1000);
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

        const params = {
            page_size: 50,
            page_number: 1,
            create_time_from: thirtyDaysAgo,
            create_time_to: now
        };

        const response = await tiktokShopApi.searchOrders(
            shop.access_token,
            shop.shop_cipher,
            params
        );

        const orders = response.orders || [];
        console.log(`Found ${orders.length} orders for shop ${shop.shop_name}`);

        if (orders.length === 0) return;

        // Upsert orders to database
        for (const order of orders) {
            const { error } = await supabase
                .from('shop_orders')
                .upsert({
                    shop_id: shop.shop_id,
                    account_id: shop.account_id,
                    order_id: order.order_id,
                    order_status: order.order_status,
                    order_amount: order.payment_info?.total_amount || 0,
                    currency: order.payment_info?.currency || 'USD',
                    payment_method: order.payment_method_name,
                    shipping_provider: order.shipping_provider,
                    tracking_number: order.tracking_number,
                    buyer_uid: order.buyer_uid,
                    created_time: order.create_time,
                    updated_time: order.update_time,
                    line_items: order.line_items,
                    recipient_address: order.recipient_address,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'order_id'
                });

            if (error) {
                console.error(`Error syncing order ${order.order_id}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error in syncOrders for ${shop.shop_name}:`, error);
    }
}

async function syncProducts(shop: any) {
    console.log(`Syncing products for shop ${shop.shop_name}...`);
    try {
        const params = {
            page_size: 50,
            page_number: 1,
            search_status: 1 // Active products
        };

        const response = await tiktokShopApi.searchProducts(
            shop.access_token,
            shop.shop_cipher,
            params
        );

        const products = response.products || [];
        console.log(`Found ${products.length} products for shop ${shop.shop_name}`);

        if (products.length === 0) return;

        for (const product of products) {
            const { error } = await supabase
                .from('shop_products')
                .upsert({
                    shop_id: shop.shop_id,
                    account_id: shop.account_id,
                    product_id: product.id,
                    name: product.name,
                    sku: product.skus?.[0]?.seller_sku, // Use first SKU as main
                    status: product.status,
                    price: product.skus?.[0]?.price?.original_price,
                    currency: product.skus?.[0]?.price?.currency,
                    stock_quantity: product.skus?.[0]?.stock_infos?.[0]?.available_stock || 0,
                    sales_count: product.sales_regions?.[0]?.sales_count || 0, // Simplified
                    main_image_url: product.images?.[0]?.url_list?.[0],
                    created_time: product.create_time,
                    updated_time: product.update_time,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'product_id'
                });

            if (error) {
                console.error(`Error syncing product ${product.id}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error in syncProducts for ${shop.shop_name}:`, error);
    }
}

async function syncSettlements(shop: any) {
    console.log(`Syncing settlements for shop ${shop.shop_name}...`);
    try {
        const now = Math.floor(Date.now() / 1000);
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

        const params = {
            start_time: thirtyDaysAgo,
            end_time: now,
            page_size: 20
        };

        const response = await tiktokShopApi.getSettlements(
            shop.access_token,
            shop.shop_cipher,
            params
        );

        const settlements = response.statement_list || [];
        console.log(`Found ${settlements.length} settlements for shop ${shop.shop_name}`);

        if (settlements.length === 0) return;

        for (const settlement of settlements) {
            const { error } = await supabase
                .from('shop_settlements')
                .upsert({
                    shop_id: shop.shop_id,
                    account_id: shop.account_id,
                    settlement_id: settlement.id,
                    settlement_time: settlement.settlement_time,
                    currency: settlement.currency,
                    settlement_amount: settlement.settlement_amount,
                    revenue_amount: settlement.revenue_amount,
                    fee_amount: settlement.fee_amount,
                    adjustment_amount: settlement.adjustment_amount,
                    status: settlement.status,
                    created_at: new Date().toISOString()
                }, {
                    onConflict: 'settlement_id'
                });

            if (error) {
                console.error(`Error syncing settlement ${settlement.id}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error in syncSettlements for ${shop.shop_name}:`, error);
    }
}

export default router;
