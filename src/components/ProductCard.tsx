import { Package, BarChart2, AlertCircle } from 'lucide-react';
import { Product } from '../store/useShopStore';

interface ProductCardProps {
    product: Product;
    onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'text-green-400 bg-green-900/50';
            case 'inactive': return 'text-gray-400 bg-gray-700/50';
            case 'frozen': return 'text-blue-400 bg-blue-900/50';
            case 'deleted': return 'text-red-400 bg-red-900/50';
            default: return 'text-gray-400 bg-gray-700/50';
        }
    };

    return (
        <div
            onClick={onClick}
            className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-pink-500 transition-all cursor-pointer group flex flex-col h-full"
        >
            <div className="relative aspect-square mb-4 rounded-lg overflow-hidden bg-gray-700">
                {product.main_image_url ? (
                    <img
                        src={product.main_image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Package size={48} className="text-gray-600" />
                    </div>
                )}
                <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                        {product.status}
                    </span>
                </div>
            </div>

            <div className="flex-1">
                <h3 className="text-white font-medium line-clamp-2 mb-2 h-12" title={product.name}>
                    {product.name}
                </h3>

                <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-lg font-bold text-pink-500">{product.currency} {product.price}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-700/30 p-2 rounded-lg">
                        <p className="text-gray-400 text-xs mb-1">Stock</p>
                        <p className="text-white font-medium flex items-center gap-1">
                            <Package size={12} />
                            {product.stock_quantity}
                        </p>
                    </div>
                    <div className="bg-gray-700/30 p-2 rounded-lg">
                        <p className="text-gray-400 text-xs mb-1">Sales</p>
                        <p className="text-white font-medium flex items-center gap-1">
                            <BarChart2 size={12} />
                            {product.sales_count}
                        </p>
                    </div>
                </div>
            </div>

            {product.stock_quantity === 0 && (
                <div className="mt-3 flex items-center gap-2 text-red-400 text-xs bg-red-900/20 p-2 rounded-lg">
                    <AlertCircle size={12} />
                    <span>Out of stock</span>
                </div>
            )}
        </div>
    );
}
