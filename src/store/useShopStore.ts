import { create } from 'zustand';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface Product {
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
}

export interface Statement {
    id: string;
    statement_time: number;
    settlement_amount: string;
    currency: string;
    status: string;
}

interface ShopState {
    products: Product[];
    orders: Order[];
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
    clearData: () => void;
}

export const useShopStore = create<ShopState>((set, get) => ({
    products: [],
    orders: [],
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
    clearData: () => set({
        products: [],
        orders: [],
        finance: { statements: [], payments: [], withdrawals: [], unsettledOrders: [] },
        lastFetchTime: null,
        lastFetchShopId: null
    }),

    fetchShopData: async (accountId: string, shopId?: string, forceRefresh = false) => {
        const state = get();

        // If data exists for this specific shop and not forcing refresh, skip fetch
        const isSameShop = state.lastFetchShopId === shopId;
        if (!forceRefresh && isSameShop && state.products.length > 0 && state.orders.length > 0) {
            console.log('[Store] Using cached data for shop:', shopId);
            return;
        }

        set({ isLoading: true, error: null });

        try {
            console.log('[Store] Fetching shop data from API...');

            // Fetch Products
            const productsUrl = `${API_BASE_URL}/api/tiktok-shop/products/${accountId}${shopId ? `?shopId=${shopId}` : ''}`;
            const productsPromise = fetch(productsUrl).then(r => r.json());

            // Fetch Orders
            const ordersUrl = `${API_BASE_URL}/api/tiktok-shop/orders/${accountId}${shopId ? `?shopId=${shopId}` : ''}`;
            const ordersPromise = fetch(ordersUrl).then(r => r.json());

            // Fetch Finance Data (Parallel)
            const financeBaseUrl = `${API_BASE_URL}/api/tiktok-shop/finance`;
            const queryParams = shopId ? `?shopId=${shopId}` : '';

            const statementsPromise = fetch(`${financeBaseUrl}/statements/${accountId}${queryParams}`).then(r => r.json());
            const paymentsPromise = fetch(`${financeBaseUrl}/payments/${accountId}${queryParams}`).then(r => r.json());
            const withdrawalsPromise = fetch(`${financeBaseUrl}/withdrawals/${accountId}${queryParams}`).then(r => r.json());
            const unsettledPromise = fetch(`${financeBaseUrl}/unsettled/${accountId}${queryParams}`).then(r => r.json());

            const [productsResult, ordersResult, statementsResult, paymentsResult, withdrawalsResult, unsettledResult] = await Promise.all([
                productsPromise,
                ordersPromise,
                statementsPromise,
                paymentsPromise,
                withdrawalsPromise,
                unsettledPromise
            ]);

            if (!productsResult.success || !ordersResult.success) {
                throw new Error('Failed to fetch shop data');
            }

            // Transform products
            const products: Product[] = (productsResult.data?.products || []).map((p: any) => ({
                product_id: p.product_id,
                name: p.product_name,
                status: p.status,
                price: p.price,
                currency: p.currency,
                stock_quantity: p.stock,
                sales_count: p.sales_count || 0,
                main_image_url: p.images?.[0] || '',
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
                }))
            }));

            // Transform finance data
            const statements = statementsResult.success ? (statementsResult.data?.statement_list || []) : [];
            const payments = paymentsResult.success ? (paymentsResult.data?.payment_list || []) : [];
            const withdrawals = withdrawalsResult.success ? (withdrawalsResult.data?.withdrawal_list || []) : [];
            const unsettledOrders = unsettledResult.success ? (unsettledResult.data?.order_list || []) : [];

            set({
                products,
                orders,
                finance: {
                    statements,
                    payments,
                    withdrawals,
                    unsettledOrders
                },
                isLoading: false,
                lastFetchTime: Date.now(),
                lastFetchShopId: shopId || null
            });

            console.log(`[Store] Fetched ${products.length} products, ${orders.length} orders`);
            console.log(`[Store] Finance: ${statements.length} statements, ${payments.length} payments, ${withdrawals.length} withdrawals`);
        } catch (error: any) {
            console.error('[Store] Error fetching shop data:', error);
            set({ error: error.message, isLoading: false });
        }
    },
}));
