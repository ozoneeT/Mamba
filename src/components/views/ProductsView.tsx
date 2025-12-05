import { useState, useEffect } from 'react';
import { Package, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';
import { Account } from '../../lib/supabase';

interface ProductsViewProps {
    account: Account;
}

interface Product {
    product_id: string;
    product_name: string;
    price: number;
    stock: number;
    sales_count: number;
    status: string;
    images?: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function ProductsView({ account }: ProductsViewProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts();
    }, [account.id]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/products/${account.id}?page=1&pageSize=50`);
            const result = await response.json();

            if (result.success && result.data?.products) {
                setProducts(result.data.products);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const getLowStockProducts = () => {
        return products.filter(p => p.stock < 10 && p.status === 'active');
    };

    const getTotalValue = () => {
        return products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
            </div>
        );
    }

    const lowStockProducts = getLowStockProducts();

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Products</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Package className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Products</p>
                            <p className="text-2xl font-bold text-white">{products.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/20 rounded-lg">
                            <AlertCircle className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Low Stock</p>
                            <p className="text-2xl font-bold text-white">{lowStockProducts.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Inventory Value</p>
                            <p className="text-2xl font-bold text-white">${getTotalValue().toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        <p className="text-yellow-400 font-medium">
                            {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} running low on stock
                        </p>
                    </div>
                </div>
            )}

            {/* Products Grid */}
            {products.length === 0 ? (
                <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No products found</p>
                    <p className="text-gray-500 text-sm mt-2">Products will appear here once you connect your TikTok Shop</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                        <div key={product.product_id} className="bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-pink-500 transition-all">
                            <div className="aspect-square bg-gray-900 flex items-center justify-center">
                                {product.images && product.images[0] ? (
                                    <img src={product.images[0]} alt={product.product_name} className="w-full h-full object-cover" />
                                ) : (
                                    <Package className="w-16 h-16 text-gray-600" />
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="text-white font-semibold mb-2 line-clamp-2">{product.product_name}</h3>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl font-bold text-pink-400">${product.price?.toFixed(2)}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${product.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                                        }`}>
                                        {product.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-1 text-gray-400">
                                        <Package className="w-4 h-4" />
                                        <span>Stock: {product.stock}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-400">
                                        <TrendingUp className="w-4 h-4" />
                                        <span>{product.sales_count || 0} sold</span>
                                    </div>
                                </div>
                                {product.stock < 10 && product.status === 'active' && (
                                    <div className="mt-2 flex items-center gap-1 text-yellow-400 text-xs">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>Low stock!</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
