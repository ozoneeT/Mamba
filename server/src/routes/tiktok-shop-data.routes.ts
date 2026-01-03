import { Router, Request, Response } from 'express';
import { tiktokShopApi, TikTokShopError } from '../services/tiktok-shop-api.service.js';
import { supabase } from '../config/supabase.js';

const router = Router();

/**
 * Helper function to get shop with valid token
 */
export const getShopWithToken = async (accountId: string, shopId?: string, forceRefresh: boolean = false) => {
    let query = supabase
        .from('tiktok_shops')
        .select('*')
        .eq('account_id', accountId);

    if (shopId) {
        query = query.eq('shop_id', shopId);
    }

    const { data: shops, error } = await query.limit(1).single();

    if (error || !shops) {
        console.error(`[Data API] Shop not found for account ${accountId} and shop ${shopId || 'any'}. Error:`, error?.message);
        throw new Error(`Shop not found or not connected (Account: ${accountId}, Shop: ${shopId || 'any'})`);
    }

    // Check if token is expired (with 5 minute buffer) OR if forceRefresh is requested
    const tokenExpiresAt = new Date(shops.token_expires_at);
    const fiveMinutes = 5 * 60 * 1000;

    if (forceRefresh || (tokenExpiresAt.getTime() - fiveMinutes < Date.now())) {
        console.log(`Refreshing token for shop ${shops.shop_name} (Force: ${forceRefresh})`);
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
        shops.shop_cipher = shops.shop_cipher; // Ensure cipher is passed along
    }

    return shops;
}

/**
 * Helper to execute API calls with auto-refresh on 105002 error
 */
async function executeWithRefresh<T>(
    accountId: string,
    shopId: string | undefined,
    operation: (token: string, cipher: string) => Promise<T>
): Promise<T> {
    try {
        // First try with existing token (will refresh if close to expiry)
        const shop = await getShopWithToken(accountId, shopId);
        return await operation(shop.access_token, shop.shop_cipher);
    } catch (error: any) {
        // Check for Expired Credentials error (105002)
        if (error instanceof TikTokShopError && error.code === 105002) {
            console.log('Token expired (105002), forcing refresh and retrying...');
            // Force refresh token
            const shop = await getShopWithToken(accountId, shopId, true);
            // Retry operation with new token
            return await operation(shop.access_token, shop.shop_cipher);
        }
        throw error;
    }
}

/**
 * GET /api/tiktok-shop/shops/:accountId
 * Get all authorized shops for an account
 */
router.get('/shops/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const { refresh } = req.query;

        // Check user role first
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', accountId)
            .single();

        const isAdmin = profile?.role === 'admin';

        // If refresh is requested, sync with TikTok first (ONLY if not admin, or handle admin refresh differently)
        // For now, let's keep refresh logic tied to the specific account unless it's a global admin refresh which is complex.
        // The user requirement says "when i loggin get the shopList from supabase... Do not call any api from tiktok at this point"
        // So we only refresh if explicitly asked.

        if (refresh === 'true' && !isAdmin) {
            // Get any existing shop to get the access token
            const { data: existingShop } = await supabase
                .from('tiktok_shops')
                .select('*')
                .eq('account_id', accountId)
                .limit(1)
                .single();

            if (existingShop) {
                // Ensure token is valid
                let accessToken = existingShop.access_token;
                const tokenExpiresAt = new Date(existingShop.token_expires_at);
                if (tokenExpiresAt.getTime() - 5 * 60 * 1000 < Date.now()) {
                    const tokenData = await tiktokShopApi.refreshAccessToken(existingShop.refresh_token);
                    accessToken = tokenData.access_token;
                    // Update DB
                    await supabase
                        .from('tiktok_shops')
                        .update({
                            access_token: tokenData.access_token,
                            refresh_token: tokenData.refresh_token,
                            token_expires_at: new Date(Date.now() + tokenData.access_token_expire_in * 1000).toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existingShop.id);
                }

                // Fetch authorized shops from TikTok
                const authorizedShops = await tiktokShopApi.getAuthorizedShops(accessToken);

                // Update DB with fresh list
                for (const shop of authorizedShops) {
                    await supabase
                        .from('tiktok_shops')
                        .upsert({
                            account_id: accountId,
                            shop_id: shop.id,
                            shop_cipher: shop.cipher,
                            shop_name: shop.name,
                            region: shop.region,
                            seller_type: shop.seller_type,
                            access_token: accessToken, // They share the token
                            updated_at: new Date().toISOString(),
                        }, {
                            onConflict: 'account_id,shop_id',
                        });
                }
            }
        }

        // Fetch shops based on role
        let query = supabase
            .from('tiktok_shops')
            .select('shop_id, shop_name, region, seller_type, created_at, account_id');

        if (!isAdmin) {
            query = query.eq('account_id', accountId);
        }

        const { data: shops, error } = await query;

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
 * GET /api/tiktok-shop/shop/:accountId
 * Get shop details
 */
router.get('/shop/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const { shopId } = req.query;

        const shopInfo = await executeWithRefresh(
            accountId,
            shopId as string,
            (token, cipher) => tiktokShopApi.getShopInfo(token, cipher)
        );

        res.json({
            success: true,
            data: shopInfo,
        });
    } catch (error: any) {
        console.error('Error fetching shop info:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/tiktok-shop/orders/synced/:accountId
 * Get all synced orders from the database
 */
router.get('/orders/synced/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const { shopId } = req.query;

        // Join with tiktok_shops to filter by account_id
        let shopsQuery = supabase
            .from('tiktok_shops')
            .select('id, shop_id')
            .eq('account_id', accountId);

        // If shopId is provided, it's the TikTok shop_id, not the internal Supabase ID
        if (shopId) {
            shopsQuery = shopsQuery.eq('shop_id', shopId);
        }

        const { data: shops } = await shopsQuery;

        if (!shops || shops.length === 0) {
            console.log(`[Orders Synced] No shops found for account ${accountId}${shopId ? ` and shop ${shopId}` : ''}`);
            return res.json({ success: true, data: { orders: [] } });
        }

        // Get internal Supabase IDs to query shop_orders
        const internalShopIds = shops.map(s => s.id);
        console.log(`[Orders Synced] Fetching orders for internal shop IDs:`, internalShopIds);

        const { data: orders, error } = await supabase
            .from('shop_orders')
            .select('*')
            .in('shop_id', internalShopIds)
            .order('create_time', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: {
                orders: orders.map(o => ({
                    id: o.order_id,
                    status: o.order_status,
                    payment: {
                        total_amount: o.total_amount.toString(),
                        currency: o.currency,
                        sub_total: o.total_amount.toString(), // Fallback
                        tax: "0"
                    },
                    create_time: Math.floor(new Date(o.create_time).getTime() / 1000),
                    update_time: o.update_time ? Math.floor(new Date(o.update_time).getTime() / 1000) : undefined,
                    line_items: o.line_items || [],
                    buyer_info: o.buyer_info,
                    shipping_info: o.shipping_info,
                    is_sample_order: (o as any).is_sample_order || false
                }))
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
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

        const params: any = {
            page_size: parseInt(pageSize as string),
            page_number: parseInt(page as string)
        };

        if (status) {
            params.order_status = status;
        }

        const orders = await executeWithRefresh(
            accountId,
            shopId as string,
            (token, cipher) => tiktokShopApi.makeApiRequest(
                '/order/202309/orders/search', // Updated endpoint
                token,
                cipher,
                params,
                'POST'
            )
        );

        // Background sync to persist data
        getShopWithToken(accountId, shopId as string).then(shop => syncOrders(shop)).catch(err => console.error('Background syncOrders error:', err));

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
 * GET /api/tiktok-shop/orders/:accountId/:orderId
 * Get single order details
 */
router.get('/orders/:accountId/:orderId', async (req: Request, res: Response) => {
    try {
        const { accountId, orderId } = req.params;
        const { shopId } = req.query;

        // API expects a list of IDs, we just send one
        const response = await executeWithRefresh(
            accountId,
            shopId as string,
            (token, cipher) => tiktokShopApi.getOrderDetails(
                token,
                cipher,
                [orderId]
            )
        );

        const order = response.orders?.[0];

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found',
            });
        }

        res.json({
            success: true,
            data: order,
        });
    } catch (error: any) {
        console.error('Error fetching order details:', error);
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

        const params = {
            page_size: parseInt(pageSize as string),
            page_number: parseInt(page as string)
        };

        const response = await executeWithRefresh(
            accountId,
            shopId as string,
            (token, cipher) => tiktokShopApi.searchProducts(
                token,
                cipher,
                params
            )
        );

        // Transform the response to match frontend expectations
        const products = (response.products || []).map((p: any) => {
            const mainSku = p.skus?.[0] || {};
            const priceInfo = mainSku.price || {};
            const inventoryInfo = mainSku.inventory?.[0] || {};

            return {
                product_id: p.id,
                product_name: p.title, // 202502 uses 'title'
                price: parseFloat(priceInfo.tax_exclusive_price || '0'), // 202502 uses 'tax_exclusive_price'
                currency: priceInfo.currency || 'USD',
                stock: inventoryInfo.quantity || 0, // 202502 uses 'inventory' and 'quantity'
                sales_count: 0, // Sales count not directly available in this endpoint response structure
                status: p.status === 'ACTIVATE' ? 'active' : 'inactive', // 202502 uses 'ACTIVATE' string
                images: [], // Images not in the search response, would need detail call
                create_time: p.create_time
            };
        });

        // Background sync to persist data
        getShopWithToken(accountId, shopId as string).then(shop => syncProducts(shop)).catch(err => console.error('Background syncProducts error:', err));

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
 * GET /api/tiktok-shop/settlements/synced/:accountId
 * Get synced settlement data from database
 */
router.get('/settlements/synced/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const { shopId } = req.query;

        // Get shop IDs
        let shopsQuery = supabase
            .from('tiktok_shops')
            .select('id')
            .eq('account_id', accountId);

        if (shopId) {
            shopsQuery = shopsQuery.eq('shop_id', shopId);
        }

        const { data: shops } = await shopsQuery;

        if (!shops || shops.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const shopIds = shops.map(s => s.id);

        const { data: settlements, error } = await supabase
            .from('shop_settlements')
            .select('*')
            .in('shop_id', shopIds)
            .order('settlement_time', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: settlements.map(s => ({
                ...s.settlement_data,
                id: s.settlement_id,
                shop_id: s.shop_id // Internal ID, might need mapping back if frontend needs external shop_id
            })),
        });
    } catch (error: any) {
        console.error('Error fetching synced settlements:', error);
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

        const performance = await executeWithRefresh(
            accountId,
            shopId as string,
            (token, cipher) => tiktokShopApi.makeApiRequest(
                '/seller/202309/performance',
                token,
                cipher
            )
        );

        // Background sync to persist data
        getShopWithToken(accountId, shopId as string).then(shop => syncPerformance(shop)).catch(err => console.error('Background syncPerformance error:', err));

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
 * GET /api/tiktok-shop/overview/:accountId
 * Get consolidated overview data (Metrics, Orders, Products, Finance)
 * Optimized to reduce API calls.
 */
router.get('/overview/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const { shopId, refresh } = req.query;

        console.log(`[Overview API] Fetching overview for account ${accountId}, shop ${shopId || 'all'}, refresh=${refresh}...`);

        // 1. If refresh=true, trigger sync first
        if (refresh === 'true') {
            const shop = await getShopWithToken(accountId, shopId as string, true); // Force token refresh if needed

            // Run syncs in parallel
            await Promise.all([
                syncOrders(shop),
                syncProducts(shop),
                syncSettlements(shop),
                syncPerformance(shop)
            ]);
        }

        // 2. Fetch Aggregated Data from Supabase
        let shopQuery = supabase
            .from('tiktok_shops')
            .select(`
                id,
                shop_id,
                shop_name,
                region,
                shop_orders (count),
                shop_products (count),
                shop_settlements (
                    total_amount,
                    net_amount,
                    settlement_time
                )
            `)
            .eq('account_id', accountId);

        if (shopId) {
            shopQuery = shopQuery.eq('shop_id', shopId);
        }

        const { data: shops, error: shopError } = await shopQuery;

        if (shopError) throw shopError;

        // 3. Aggregate Metrics
        let totalOrders = 0;
        let totalProducts = 0;
        let totalRevenue = 0;
        let totalNet = 0;
        let recentOrders: any[] = []; // We could fetch recent orders here too if needed

        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        const startSec = thirtyDaysAgo / 1000;

        shops?.forEach((shop: any) => {
            totalOrders += shop.shop_orders?.[0]?.count || 0;
            totalProducts += shop.shop_products?.[0]?.count || 0;

            // Filter settlements for 30d revenue
            const relevantSettlements = shop.shop_settlements?.filter((s: any) => {
                const time = new Date(s.settlement_time).getTime() / 1000;
                return time >= startSec;
            }) || [];

            totalRevenue += relevantSettlements.reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0);
            totalNet += relevantSettlements.reduce((sum: number, s: any) => sum + (Number(s.net_amount) || 0), 0);
        });

        // 4. Fetch recent orders for the "Orders" card preview or just to ensure we have them
        // The user wants "result from orders... updated". We already synced them.
        // Let's return the latest 5 orders for preview if needed, or just the counts.
        // The OverviewView mainly needs metrics.

        res.json({
            success: true,
            data: {
                metrics: {
                    totalOrders,
                    totalProducts,
                    totalRevenue,
                    totalNet,
                    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
                    conversionRate: 2.5, // Placeholder or fetch from performance
                    shopRating: 4.8 // Placeholder
                },
                lastUpdated: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('[Overview API] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});



/**
 * GET /api/tiktok-shop/products/synced/:accountId
 * Get all synced products from the database
 */
router.get('/products/synced/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const { shopId } = req.query;

        const { data: shops } = await supabase
            .from('tiktok_shops')
            .select('id')
            .eq('account_id', accountId);

        if (!shops || shops.length === 0) {
            return res.json({ success: true, data: { products: [] } });
        }

        const shopIds = shops.map(s => s.id);
        const { data: products, error } = await supabase
            .from('shop_products')
            .select('*')
            .in('shop_id', shopIds);

        if (error) throw error;

        res.json({
            success: true,
            data: {
                products: products.map(p => ({
                    product_id: p.product_id,
                    product_name: p.product_name,
                    status: p.status === 'active' ? 'ACTIVATE' : 'INACTIVE',
                    price: p.price,
                    currency: 'USD', // Default or fetch from shop
                    stock: p.stock,
                    sales_count: p.sales_count,
                    images: p.images
                }))
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
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
        // Fetch recent orders (last 1 year to ensure we get everything including sandbox data)
        const now = Math.floor(Date.now() / 1000);
        const oneYearAgo = now - (365 * 24 * 60 * 60);

        let allOrders: any[] = [];
        let nextPageToken = '';
        let hasMore = true;
        let page = 1;

        while (hasMore) {
            console.log(`Fetching orders page ${page}... (Token: ${nextPageToken ? 'Yes' : 'No'})`);
            const params: any = {
                page_size: '50', // Explicitly string
                create_time_from: oneYearAgo,
                create_time_to: now
            };

            if (nextPageToken) {
                params.page_token = nextPageToken;
            } else {
                params.page_number = page;
            }

            const response = await tiktokShopApi.searchOrders(
                shop.access_token,
                shop.shop_cipher,
                params
            );

            const orders = response.orders || response.order_list || [];
            console.log(`Page ${page} returned ${orders.length} orders. Next Token: ${response.next_page_token ? 'Yes' : 'No'}`);

            if (orders.length === 0) {
                console.log('No orders returned in this page, stopping.');
                hasMore = false;
                break;
            }

            // Check if we've already seen these orders (API returning duplicate pages)
            const firstOrderId = orders[0]?.id || orders[0]?.order_id;
            const isDuplicatePage = allOrders.some(o => (o.id || o.order_id) === firstOrderId);

            if (isDuplicatePage) {
                console.log(`Detected duplicate page from API (Order ID ${firstOrderId} already exists), stopping sync.`);
                console.log('This usually means the API ignored the page_token and returned the first page again.');
                hasMore = false;
                break;
            }

            allOrders = [...allOrders, ...orders];

            // If no new token or same token, stop
            if (!response.next_page_token || response.next_page_token === nextPageToken) {
                console.log('No new next_page_token returned, stopping sync.');
                hasMore = false;
            } else {
                nextPageToken = response.next_page_token;
                // TRUST THE TOKEN: If we have a token, we have more, even if page < 50
                hasMore = true;
            }

            page++;

            // Safety break - increased to 100 pages (5000 orders)
            if (page > 100) {
                console.log('Hit safety limit of 100 pages, stopping.');
                break;
            }
        }

        console.log(`Found total ${allOrders.length} orders for shop ${shop.shop_name}`);

        if (allOrders.length === 0) return;

        // Deduplicate orders by ID
        const uniqueOrdersMap = new Map();
        allOrders.forEach(order => {
            uniqueOrdersMap.set(order.id, order);
        });
        const uniqueOrders = Array.from(uniqueOrdersMap.values());
        console.log(`Deduplicated to ${uniqueOrders.length} unique orders`);

        // Find all records for this shop_id to update them all
        const { data: allShops } = await supabase
            .from('tiktok_shops')
            .select('id')
            .eq('shop_id', shop.shop_id);

        const shopIds = allShops?.map(s => s.id) || [shop.id];

        // Batch upsert orders for all associated shop records
        // Process in chunks of 100 to avoid request size limits
        const chunkSize = 100;
        for (let i = 0; i < uniqueOrders.length; i += chunkSize) {
            const chunk = uniqueOrders.slice(i, i + chunkSize);

            for (const sId of shopIds) {
                const upsertData = chunk.map((order: any) => ({
                    shop_id: sId,
                    order_id: order.id,
                    order_status: order.status,
                    total_amount: order.payment_info?.total_amount || order.payment?.total_amount || 0,
                    currency: order.payment_info?.currency || order.payment?.currency || 'USD',
                    create_time: new Date(Number(order.create_time) * 1000).toISOString(),
                    update_time: new Date(Number(order.update_time) * 1000).toISOString(),
                    line_items: order.line_items,
                    payment_info: order.payment || order.payment_info,
                    buyer_info: order.buyer_info || {
                        buyer_email: order.buyer_email,
                        buyer_nickname: order.buyer_nickname,
                        buyer_avatar: order.buyer_avatar,
                        buyer_message: order.buyer_message
                    },
                    shipping_info: order.shipping_info || {
                        ...order.recipient_address,
                        tracking_number: order.tracking_number,
                        shipping_provider: order.shipping_provider,
                        shipping_provider_id: order.shipping_provider_id,
                        delivery_option_name: order.delivery_option_name
                    },
                    updated_at: new Date().toISOString()
                }));

                const { error } = await supabase
                    .from('shop_orders')
                    .upsert(upsertData, {
                        onConflict: 'shop_id,order_id'
                    });

                if (error) console.error('Error upserting orders chunk:', error);
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
            page_size: '50',
            page_number: 1,
            status: 'ACTIVATE' // Active products
        };

        const response = await tiktokShopApi.searchProducts(
            shop.access_token,
            shop.shop_cipher,
            params
        );

        const products = response.products || response.product_list || [];
        console.log(`Found ${products.length} products for shop ${shop.shop_name}`);

        if (products.length === 0) return;

        // Find all records for this shop_id to update them all
        const { data: allShops } = await supabase
            .from('tiktok_shops')
            .select('id')
            .eq('shop_id', shop.shop_id);

        const shopIds = allShops?.map(s => s.id) || [shop.id];

        // Batch upsert products for all associated shop records
        for (const sId of shopIds) {
            const upsertData = products.map((product: any) => ({
                shop_id: sId,
                product_id: product.id,
                product_name: product.title,
                sku_list: product.skus,
                status: product.status === 'ACTIVATE' ? 'active' : 'inactive',
                price: product.skus?.[0]?.price?.tax_exclusive_price || 0,
                stock: product.skus?.[0]?.inventory?.[0]?.quantity || 0,
                sales_count: product.sales_regions?.[0]?.sales_count || 0,
                images: product.images,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('shop_products')
                .upsert(upsertData, {
                    onConflict: 'shop_id,product_id'
                });

            if (error) {
                console.error(`Error batch syncing products for shop record ${sId}:`, error);
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
            page_size: '20', // Explicitly string
            sort_field: 'statement_time',
            sort_order: 'DESC'
        };

        const response = await tiktokShopApi.getStatements(
            shop.access_token,
            shop.shop_cipher,
            params
        );

        const settlements = response.statements || response.statement_list || [];
        console.log(`Found ${settlements.length} settlements for shop ${shop.shop_name}`);

        if (settlements.length === 0) return;

        // Find all records for this shop_id to update them all
        const { data: allShops } = await supabase
            .from('tiktok_shops')
            .select('id')
            .eq('shop_id', shop.shop_id);

        const shopIds = allShops?.map(s => s.id) || [shop.id];

        // Batch upsert settlements for all associated shop records
        for (const sId of shopIds) {
            const upsertData = settlements.map((settlement: any) => ({
                shop_id: sId,
                settlement_id: settlement.id,
                order_id: settlement.order_id,
                settlement_time: new Date(Number(settlement.statement_time) * 1000).toISOString(),
                total_amount: parseFloat(settlement.revenue_amount || '0'),
                net_amount: parseFloat(settlement.settlement_amount || '0'),
                currency: settlement.currency || 'USD',
                settlement_data: settlement,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('shop_settlements')
                .upsert(upsertData, {
                    onConflict: 'shop_id,settlement_id'
                });

            if (error) {
                console.error(`Error batch syncing settlements for shop record ${sId}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error in syncSettlements for ${shop.shop_name}:`, error);
    }
}

async function syncPerformance(shop: any) {
    console.log(`Syncing performance for shop ${shop.shop_name}...`);
    try {
        // Format: YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const params = {
            start_date_ge: yesterday,
            end_date_lt: today
        };

        const performance = await tiktokShopApi.makeApiRequest(
            '/analytics/202405/shop/performance',
            shop.access_token,
            shop.shop_cipher,
            params,
            'GET'
        );

        if (!performance) return;

        // The API might return multiple days or just today
        // For now, we'll assume it's today's data or a list
        const data = Array.isArray(performance) ? performance : [performance];

        for (const record of data) {
            const { error } = await supabase
                .from('shop_performance')
                .upsert({
                    shop_id: shop.id,
                    date: record.date || new Date().toISOString().split('T')[0],
                    total_orders: record.total_orders || 0,
                    total_revenue: record.total_revenue || 0,
                    total_items_sold: record.total_items_sold || 0,
                    avg_order_value: record.avg_order_value || 0,
                    conversion_rate: record.conversion_rate || 0,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'shop_id,date'
                });

            if (error) {
                console.error(`Error syncing performance for ${shop.shop_name}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error in syncPerformance for ${shop.shop_name}:`, error);
    }
}

export default router;
