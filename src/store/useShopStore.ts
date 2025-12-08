import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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

    // Actions
    fetchShopData: (accountId: string) => Promise<void>;
    setProducts: (products: Product[]) => void;
    setOrders: (orders: Order[]) => void;
}

export const useShopStore = create<ShopState>((set) => ({
    products: [],
    orders: [],
    isLoading: false,
    error: null,

    setProducts: (products) => set({ products }),
    setOrders: (orders) => set({ orders }),

    fetchShopData: async (accountId: string) => {
        set({ isLoading: true, error: null });
        try {
            // Fetch Products
            const { data: productsData, error: productsError } = await supabase
                .from('shop_products')
                .select('*')
                .eq('account_id', accountId);

            if (productsError) throw productsError;

            // Fetch Orders
            const { data: ordersData, error: ordersError } = await supabase
                .from('shop_orders')
                .select('*')
                .eq('account_id', accountId);

            if (ordersError) throw ordersError;

            set({
                products: productsData || [],
                orders: ordersData || [],
                isLoading: false
            });
        } catch (error: any) {
            console.error('Error fetching shop data:', error);
            set({ error: error.message, isLoading: false });
        }
    },
}));
