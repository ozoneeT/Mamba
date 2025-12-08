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

interface Order {
    order_id: string;
    order_status: string;
    order_amount: number;
    currency: string;
    created_time: number;
}

interface ShopState {
    products: Product[];
    orders: Order[];
    isLoading: boolean;
    error: string | null;
    lastFetchTime: number | null;

    // Actions
    fetchShopData: (accountId: string, shopId?: string, forceRefresh?: boolean) => Promise<void>;
    setProducts: (products: Product[]) => void;
    setOrders: (orders: Order[]) => void;
    clearData: () => void;
}

export const useShopStore = create<ShopState>((set, get) => ({
    products: [],
    orders: [],
    isLoading: false,
    error: null,
    lastFetchTime: null,

    setProducts: (products) => set({ products }),
    setOrders: (orders) => set({ orders }),
    clearData: () => set({ products: [], orders: [], lastFetchTime: null }),

    fetchShopData: async (accountId: string, shopId?: string, forceRefresh = false) => {
        const state = get();

        // If data exists and not forcing refresh, skip fetch
        if (!forceRefresh && state.products.length > 0 && state.orders.length > 0) {
            console.log('[Store] Using cached data, skipping fetch');
            return;
        }

        set({ isLoading: true, error: null });

        try {
            console.log('[Store] Fetching shop data from API...');

            // Fetch Products from API
            const productsUrl = `${API_BASE_URL}/api/tiktok-shop/products/${accountId}${shopId ? `?shopId=${shopId}` : ''}`;
            const productsResponse = await fetch(productsUrl);
            const productsResult = await productsResponse.json();

            // Fetch Orders from API
            const ordersUrl = `${API_BASE_URL}/api/tiktok-shop/orders/${accountId}${shopId ? `?shopId=${shopId}` : ''}`;
            const ordersResponse = await fetch(ordersUrl);
            const ordersResult = await ordersResponse.json();

            if (!productsResult.success || !ordersResult.success) {
                throw new Error('Failed to fetch shop data');
            }

            // Transform products to match store interface
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

            // Transform orders to match store interface
            const orders: Order[] = (ordersResult.data?.orders || []).map((o: any) => ({
                order_id: o.order_id,
                order_status: o.order_status,
                order_amount: o.total_amount,
                currency: o.currency,
                created_time: o.create_time,
            }));

            set({
                products,
                orders,
                isLoading: false,
                lastFetchTime: Date.now()
            });

            console.log(`[Store] Fetched ${products.length} products and ${orders.length} orders`);
        } catch (error: any) {
            console.error('[Store] Error fetching shop data:', error);
            set({ error: error.message, isLoading: false });
        }
    },
}));
