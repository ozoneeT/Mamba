import { X, Package, BarChart2, Layers } from 'lucide-react';
import { Product } from '../store/useShopStore';

interface ProductDetailsProps {
    product: Product;
    onClose: () => void;
}

export function ProductDetails({ product, onClose }: ProductDetailsProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-800 shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 p-6 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Product Details</h2>
                        <p className="text-gray-400 text-sm">ID: {product.product_id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Image */}
                    <div>
                        <div className="aspect-square rounded-xl overflow-hidden bg-gray-800 border border-gray-700 mb-4">
                            {product.main_image_url ? (
                                <img
                                    src={product.main_image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package size={64} className="text-gray-600" />
                                </div>
                            )}
                        </div>
                        {/* Additional images could go here in a carousel/grid */}
                    </div>

                    {/* Right Column: Details */}
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium 
                                    ${product.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                                    {product.status.toUpperCase()}
                                </span>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-4">{product.name}</h1>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-pink-500">{product.currency} {product.price}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                <div className="flex items-center gap-2 text-gray-400 mb-1">
                                    <Package size={16} />
                                    <span>Stock</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{product.stock_quantity}</p>
                            </div>
                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                <div className="flex items-center gap-2 text-gray-400 mb-1">
                                    <BarChart2 size={16} />
                                    <span>Sales</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{product.sales_count}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Layers className="text-pink-500" size={20} />
                                Specifications
                            </h3>
                            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-3">
                                <div className="flex justify-between py-2 border-b border-gray-700 last:border-0">
                                    <span className="text-gray-400">SKU ID</span>
                                    <span className="text-white font-mono text-sm">{product.product_id}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-700 last:border-0">
                                    <span className="text-gray-400">Currency</span>
                                    <span className="text-white">{product.currency}</span>
                                </div>
                                {/* Add more specs if available */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
