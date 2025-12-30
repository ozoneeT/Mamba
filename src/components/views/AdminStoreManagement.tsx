import { useQuery } from '@tanstack/react-query';
import { Store, Package, ShoppingBag, Globe } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function AdminStoreManagement() {
    const { data: stores, isLoading } = useQuery({
        queryKey: ['admin-stores'],
        queryFn: async () => {
            const session = await (window as any).supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const response = await fetch(`${API_BASE_URL}/api/admin/stores`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) return data.data;
            throw new Error(data.error);
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Store Management</h2>
                <p className="text-gray-400">Monitor all integrated TikTok Shops and their performance.</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-700 bg-gray-800/50">
                            <th className="px-6 py-4 text-sm font-semibold text-gray-300">Store Name</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-300">Account</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-300">Products</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-300">Orders</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-300">Total Revenue</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-300">Net Profit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {stores?.map((store: any) => (
                            <tr key={store.id} className="hover:bg-gray-700/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-pink-500/10 p-2 rounded-lg">
                                            <Store className="w-4 h-4 text-pink-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{store.shop_name}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Globe className="w-3 h-3 text-gray-500" />
                                                <span className="text-xs text-gray-500">{store.region}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-gray-300">{store.account_name}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-sm text-white font-medium">{store.productsCount}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-sm text-white font-medium">{store.ordersCount}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-semibold text-green-400">
                                        ${store.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-semibold text-blue-400">
                                        ${store.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
