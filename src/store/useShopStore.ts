import { create } from 'zustand';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface ProductSKU {
    id: string;
    seller_sku?: string;
    price: {
        currency: string;
        sale_price?: string;
        tax_exclusive_price: string;
    };
    inventory: Array<{
        quantity: number;
        warehouse_id?: string;
    }>;
    sales_attributes?: Array<{
        id: string;
        name: string;
        value_id: string;
        value_name: string;
        sku_img?: {
            urls: string[];
        };
    }>;
}

export interface Product {
    product_id: string;
    name: string;
    status: string;
    price: number;
    currency: string;
    stock_quantity: number;
    sales_count: number;
    main_image_url: string;
    images?: string[];
    click_through_rate?: number;
    gmv?: number;
    orders_count?: number;
    details?: any; // Full JSON blob
    skus?: ProductSKU[]; // SKU variants
}

export interface Order {
    order_id: string;
    order_status: string;
    order_amount: number;
    currency: string;
    created_time: number;
    line_items: {
        id: string;
        product_name: string;
        sku_image: string;
        quantity: number;
        sale_price: string;
    }[];
    buyer_info?: {
        buyer_email?: string;
        buyer_nickname?: string;
        buyer_avatar?: string;
        buyer_message?: string;
    };
    shipping_info?: {
        name?: string;
        phone_number?: string;
        address_line1?: string;
        address_line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
        tracking_number?: string;
        shipping_provider?: string;
        delivery_option_name?: string;
        full_address?: string;
    };
    payment_info?: {
        currency?: string;
        sub_total?: string;
        shipping_fee?: string;
        tax?: string;
        total_amount?: string;
        subtotal_before_discount_amount?: string;
        customer_paid_shipping_fee_amount?: string;
    };
    revenue_breakdown?: Array<{
        type: string;
        amount: string;
        currency: string;
        discount_name?: string;
    }>;
}

export interface Statement {
    id: string;
    statement_time: number;
    settlement_amount: string;
    currency: string;
    payment_status: string;
    revenue_amount: string;
    fee_amount: string;
    adjustment_amount: string;
    shipping_fee: string;
    net_sales_amount: string;
    payment_id?: string;
    payment_time?: number;
}

interface ShopMetrics {
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
    totalNet: number;
    avgOrderValue: number;
    conversionRate: number;
    shopRating: number;
    unsettledRevenue?: number;
    netProfit?: number;
}

interface CacheMetadata {
    shopId: string | null;
    accountId: string | null;
    ordersLastSynced: string | null;
    productsLastSynced: string | null;
    settlementsLastSynced: string | null;
    isSyncing: boolean;
    showRefreshPrompt: boolean;
    isStale: boolean;
}

interface ShopState {
    products: Product[];
    orders: Order[];
    metrics: ShopMetrics;
    finance: {
        statements: Statement[];
        payments: any[];
        withdrawals: any[];
        unsettledOrders: any[];
    };
    isLoading: boolean;
    error: string | null;
    lastFetchTime: number | null;
    lastFetchShopId: string | null;
    cacheMetadata: CacheMetadata;

    // Actions
    fetchShopData: (accountId: string, shopId?: string, options?: { forceRefresh?: boolean; showCached?: boolean; skipSyncCheck?: boolean }) => Promise<void>;
    setProducts: (products: Product[]) => void;
    setOrders: (orders: Order[]) => void;
    setMetrics: (metrics: Partial<ShopMetrics>) => void;
    clearData: () => void;
    syncData: (accountId: string, shopId: string, syncType?: 'orders' | 'products' | 'finance' | 'all') => Promise<void>;
    dismissRefreshPrompt: () => void;
    memoryCache: Record<string, {
        products: Product[];
        orders: Order[];
        metrics: ShopMetrics;
        finance: {
            statements: Statement[];
            payments: any[];
            withdrawals: any[];
            unsettledOrders: any[];
        };
        lastFetchTime: number | null;
        cacheMetadata: CacheMetadata;
    }>;
}

export const useShopStore = create<ShopState>((set, get) => ({
    products: [],
    orders: [],
    metrics: {
        totalOrders: 0,
        totalRevenue: 0,
        totalProducts: 0,
        totalNet: 0,
        avgOrderValue: 0,
        conversionRate: 0,
        shopRating: 0
    },
    finance: {
        statements: [],
        payments: [],
        withdrawals: [],
        unsettledOrders: []
    },
    isLoading: false,
    error: null,
    lastFetchTime: null,
    lastFetchShopId: null,
    cacheMetadata: {
        shopId: null,
        accountId: null,
        ordersLastSynced: null,
        productsLastSynced: null,
        settlementsLastSynced: null,
        isSyncing: false,
        showRefreshPrompt: false,
        isStale: false
    },
    memoryCache: {},

    setProducts: (products) => set({ products }),
    setOrders: (orders) => set({ orders }),
    setMetrics: (newMetrics) => set((state) => ({
        metrics: { ...state.metrics, ...newMetrics }
    })),


    fetchShopData: async (accountId: string, shopId?: string, options = {}) => {
        const { forceRefresh = false, showCached = true, skipSyncCheck = false } = options;
        const state = get();

        // If switching shops, save current data to cache and clear (or load from cache)
        if (shopId && state.lastFetchShopId !== shopId) {
            // Save current shop data to memory cache if we have a valid shop loaded
            if (state.lastFetchShopId) {
                console.log(`[Store] Saving data for ${state.lastFetchShopId} to memory cache`);
                const currentData = {
                    products: state.products,
                    orders: state.orders,
                    metrics: state.metrics,
                    finance: state.finance,
                    lastFetchTime: state.lastFetchTime,
                    cacheMetadata: state.cacheMetadata
                };
                set(s => ({ memoryCache: { ...s.memoryCache, [state.lastFetchShopId!]: currentData } }));
            }

            // Check if we have data for the new shop in memory cache
            if (state.memoryCache[shopId] && !forceRefresh) {
                console.log(`[Store] Cache hit for ${shopId}, loading from memory...`);
                const cached = state.memoryCache[shopId];

                // Check if memory cache is stale (> 30 mins)
                const isMemoryStale = !cached.lastFetchTime || (Date.now() - cached.lastFetchTime > 30 * 60 * 1000);

                set({
                    products: cached.products,
                    orders: cached.orders,
                    metrics: cached.metrics,
                    finance: cached.finance,
                    lastFetchTime: cached.lastFetchTime,
                    cacheMetadata: cached.cacheMetadata,
                    lastFetchShopId: shopId,
                    isLoading: false,
                    error: null
                });

                if (!isMemoryStale) {
                    console.log(`[Store] Memory cache is fresh (< 30 mins), skipping network fetch.`);
                    return;
                }
                console.log(`[Store] Memory cache is stale (> 30 mins), proceeding to check DB/Sync.`);
            } else {
                console.log('[Store] Shop changed, clearing old data...');
                set({
                    products: [],
                    orders: [],
                    metrics: {
                        totalOrders: 0,
                        totalRevenue: 0,
                        totalProducts: 0,
                        totalNet: 0,
                        avgOrderValue: 0,
                        conversionRate: 0,
                        shopRating: 0
                    },
                    finance: { statements: [], payments: [], withdrawals: [], unsettledOrders: [] },
                    error: null,
                    lastFetchShopId: shopId,
                    isLoading: true, // Only show loader if no memory cache
                    cacheMetadata: {
                        ...state.cacheMetadata,
                        shopId,
                        accountId
                    }
                });
            }
        } else if (forceRefresh) {
            set({ isLoading: true, error: null });
        }

        try {
            // Step 1: Check cache status
            let cacheStatus: any = null;
            let shouldSync = false;

            if (shopId) {
                console.log('[Store] Checking cache status...');
                const cacheStatusUrl = `${API_BASE_URL}/api/tiktok-shop/cache-status/${accountId}?shopId=${shopId}`;
                const cacheResponse = await fetch(cacheStatusUrl);
                const cacheResult = await cacheResponse.json();

                if (cacheResult.success) {
                    cacheStatus = cacheResult.data;
                    // Sync if data is older than 30 minutes
                    shouldSync = cacheStatus.should_prompt_user || forceRefresh;
                    console.log(`[Store] Cache status - Should Sync: ${shouldSync}`);
                }
            }

            // Step 2: Load cached data from DB if available
            if (showCached && shopId) {
                console.log('[Store] Loading cached data from DB...');

                const productsUrl = `${API_BASE_URL}/api/tiktok-shop/products/synced/${accountId}${shopId ? `?shopId=${shopId}` : ''}`;
                const ordersUrl = `${API_BASE_URL}/api/tiktok-shop/orders/synced/${accountId}${shopId ? `?shopId=${shopId}` : ''}`;
                const settlementsUrl = `${API_BASE_URL}/api/tiktok-shop/settlements/synced/${accountId}${shopId ? `?shopId=${shopId}` : ''}`;
                const overviewUrl = `${API_BASE_URL}/api/tiktok-shop/overview/${accountId}?shopId=${shopId}&refresh=false`;

                const [productsResult, ordersResult, settlementsResult, overviewResult] = await Promise.all([
                    fetch(productsUrl).then(r => r.json()).catch(e => ({ success: false, error: e.message })),
                    fetch(ordersUrl).then(r => r.json()).catch(e => ({ success: false, error: e.message })),
                    fetch(settlementsUrl).then(r => r.json()).catch(e => ({ success: false, error: e.message })),
                    fetch(overviewUrl).then(r => r.json()).catch(e => ({ success: false, error: e.message }))
                ]);

                const products: Product[] = (productsResult.data?.products || []).map((p: any) => ({
                    product_id: p.product_id,
                    name: p.product_name,
                    status: p.status,
                    price: p.price,
                    currency: p.currency,
                    stock_quantity: p.stock,
                    sales_count: p.sales_count || 0,
                    main_image_url: p.main_image_url || p.images?.[0] || '',
                    images: p.images || [],
                    gmv: p.gmv || 0,
                    orders_count: p.orders_count || 0,
                    click_through_rate: p.click_through_rate || 0,
                    details: p.details,
                    skus: p.details?.skus || []
                }));

                const orders: Order[] = (ordersResult.data?.orders || []).map((o: any) => ({
                    order_id: o.id,
                    order_status: o.status,
                    order_amount: parseFloat(o.payment?.total_amount || '0'),
                    currency: o.payment?.currency || 'USD',
                    created_time: o.create_time,
                    line_items: (o.line_items || []).map((item: any) => ({
                        id: item.id,
                        product_name: item.product_name,
                        sku_image: item.sku_image,
                        quantity: 1,
                        sale_price: item.sale_price
                    })),
                    buyer_info: o.buyer_info,
                    shipping_info: o.shipping_info
                }));

                const statements: Statement[] = settlementsResult.success ? (settlementsResult.data || []).map((s: any) => ({
                    ...s,
                    fee_amount: s.fee_amount?.toString() || '0',
                    adjustment_amount: s.adjustment_amount?.toString() || '0',
                    shipping_fee: s.shipping_fee?.toString() || '0',
                    net_sales_amount: s.net_sales_amount?.toString() || '0'
                })) : [];
                const metrics: ShopMetrics = overviewResult.success ? {
                    ...overviewResult.data.metrics,
                    conversionRate: overviewResult.data.metrics.conversionRate || 0,
                    shopRating: overviewResult.data.metrics.shopRating || 0
                } : state.metrics;

                set({
                    products: products.length > 0 ? products : get().products,
                    orders: orders.length > 0 ? orders : get().orders,
                    metrics,
                    finance: {
                        statements,
                        payments: [],
                        withdrawals: [],
                        unsettledOrders: []
                    },
                    isLoading: false, // Never show overlay loader for background syncs
                    error: null,
                    lastFetchTime: Date.now(),
                    lastFetchShopId: shopId,
                    cacheMetadata: {
                        shopId,
                        accountId,
                        ordersLastSynced: cacheStatus?.last_synced_times?.orders || null,
                        productsLastSynced: cacheStatus?.last_synced_times?.products || null,
                        settlementsLastSynced: cacheStatus?.last_synced_times?.settlements || null,
                        isSyncing: get().cacheMetadata.isSyncing, // Keep current syncing state
                        showRefreshPrompt: false,
                        isStale: shouldSync
                    }
                });

                console.log(`[Store] DB data loaded. Products: ${products.length}, Orders: ${orders.length}`);
            }

            // Step 3: Trigger background sync if stale and not already syncing
            if (shouldSync && shopId && !skipSyncCheck && !get().cacheMetadata.isSyncing) {
                console.log('[Store] Triggering background sync...');
                await get().syncData(accountId, shopId, 'all');
            }

        } catch (error: any) {
            console.error('[Store] Fatal error fetching shop data:', error);
            set({ error: error.message, isLoading: false });
        }
    },

    clearData: () => set({
        products: [],
        orders: [],
        metrics: {
            totalOrders: 0,
            totalRevenue: 0,
            totalProducts: 0,
            totalNet: 0,
            avgOrderValue: 0,
            conversionRate: 0,
            shopRating: 0
        },
        finance: { statements: [], payments: [], withdrawals: [], unsettledOrders: [] },
        error: null,
        lastFetchTime: null,
        lastFetchShopId: null
    }),

    syncData: async (accountId: string, shopId: string, syncType = 'all') => {
        // Don't set isLoading to true for background syncs if we already have data
        const hasData = get().products.length > 0 || get().orders.length > 0;
        set({
            isLoading: !hasData,
            error: null,
            cacheMetadata: { ...get().cacheMetadata, isSyncing: true }
        });

        try {
            const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/sync/${accountId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shopId,
                    syncType
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Sync failed');
            }

            // Refresh data after sync, but skip the sync check to avoid loop
            await get().fetchShopData(accountId, shopId, { forceRefresh: false, showCached: true, skipSyncCheck: true });

        } catch (error: any) {
            console.error('Sync error:', error);
            set({ error: error.message, isLoading: false });
            throw error; // Re-throw to let caller know
        } finally {
            set(s => ({ cacheMetadata: { ...s.cacheMetadata, isSyncing: false } }));
        }
    },

    dismissRefreshPrompt: () => {
        set({
            cacheMetadata: {
                ...get().cacheMetadata,
                showRefreshPrompt: false
            }
        });
    }
}));
