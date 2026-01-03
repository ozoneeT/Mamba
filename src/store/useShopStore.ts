import { create } from 'zustand';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface Product {
    product_id: string;
    name: string;
    status: string;
    price: number;
    currency: string;
    stock_quantity: number;
    sales_count: number;
    main_image_url: string;
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
    };
}

export interface Statement {
    id: string;
    statement_time: number;
    settlement_amount: string;
    currency: string;
    payment_status: string;
    revenue_amount: string;
    fee_amount: string;
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

    // Actions
    fetchShopData: (accountId: string, shopId?: string, forceRefresh?: boolean) => Promise<void>;
    setProducts: (products: Product[]) => void;
    setOrders: (orders: Order[]) => void;
    setMetrics: (metrics: Partial<ShopMetrics>) => void;
    clearData: () => void;
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

    setProducts: (products) => set({ products }),
    setOrders: (orders) => set({ orders }),
    setMetrics: (newMetrics) => set((state) => ({
        metrics: { ...state.metrics, ...newMetrics }
    })),
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
        lastFetchTime: null,
        lastFetchShopId: null
    }),

    fetchShopData: async (accountId: string, shopId?: string, forceRefresh = false) => {
        const state = get();

        // If switching shops, clear data immediately to avoid showing old data
        if (shopId && state.lastFetchShopId !== shopId) {
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
                lastFetchShopId: shopId
            });
        }

        // If data exists for this specific shop and not forcing refresh, skip fetch
        const isSameShop = state.lastFetchShopId === shopId;
        if (!forceRefresh && isSameShop && state.products.length > 0 && state.orders.length > 0) {
            console.log('[Store] Using cached data for shop:', shopId);
            return;
        }

        set({ isLoading: true, error: null });

        try {
            console.log('[Store] Fetching shop data (Optimized)...');

            // 1. Call Overview API (Handles Sync if forceRefresh=true)
            const overviewUrl = `${API_BASE_URL}/api/tiktok-shop/overview/${accountId}${shopId ? `?shopId=${shopId}` : '?'}&refresh=${forceRefresh}`;
            const overviewPromise = fetch(overviewUrl).then(r => r.json());

            // Wait for overview/sync to complete before fetching lists, so lists are fresh
            const overviewResult = await overviewPromise;

            if (!overviewResult.success) {
                throw new Error(overviewResult.error || 'Failed to fetch overview data');
            }

            // 2. Fetch Lists (Synced from DB) - Parallel
            const productsUrl = `${API_BASE_URL}/api/tiktok-shop/products/synced/${accountId}${shopId ? `?shopId=${shopId}` : ''}`;
            const ordersUrl = `${API_BASE_URL}/api/tiktok-shop/orders/synced/${accountId}${shopId ? `?shopId=${shopId}` : ''}`;
            const settlementsUrl = `${API_BASE_URL}/api/tiktok-shop/settlements/synced/${accountId}${shopId ? `?shopId=${shopId}` : ''}`;

            const [productsResult, ordersResult, settlementsResult] = await Promise.all([
                fetch(productsUrl).then(r => r.json()).catch(e => ({ success: false, error: e.message })),
                fetch(ordersUrl).then(r => r.json()).catch(e => ({ success: false, error: e.message })),
                fetch(settlementsUrl).then(r => r.json()).catch(e => ({ success: false, error: e.message }))
            ]);

            // Transform products
            const products: Product[] = (productsResult.data?.products || []).map((p: any) => ({
                product_id: p.product_id,
                name: p.product_name,
                status: p.status,
                price: p.price,
                currency: p.currency,
                stock_quantity: p.stock,
                sales_count: p.sales_count || 0,
                main_image_url: p.images?.[0]?.url_list?.[0] || p.images?.[0] || '', // Handle different image structures
            }));

            // Transform orders
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
                // Store extra info if needed
                buyer_info: o.buyer_info,
                shipping_info: o.shipping_info
            }));

            // Transform finance data
            const statements = settlementsResult.success ? (settlementsResult.data || []) : [];

            // Update Metrics from Overview Result
            const metrics: ShopMetrics = {
                ...overviewResult.data.metrics,
                // Ensure defaults
                conversionRate: overviewResult.data.metrics.conversionRate || 0,
                shopRating: overviewResult.data.metrics.shopRating || 0
            };

            set({
                products: products.length > 0 ? products : get().products,
                orders: orders.length > 0 ? orders : get().orders,
                metrics: metrics,
                finance: {
                    statements: statements,
                    payments: [], // TODO: Add synced payments if needed
                    withdrawals: [], // TODO: Add synced withdrawals if needed
                    unsettledOrders: []
                },
                isLoading: false,
                error: null,
                lastFetchTime: Date.now(),
                lastFetchShopId: shopId || null
            });

            console.log(`[Store] Processed ${products.length} products, ${orders.length} orders.`);
        } catch (error: any) {
            console.error('[Store] Fatal error fetching shop data:', error);
            set({ error: error.message, isLoading: false });
        }
    },
}));
