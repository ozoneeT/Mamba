import { useState } from 'react';
import { ShoppingBag, Package, Clock, CheckCircle, XCircle, TruckIcon } from 'lucide-react';
import { Account } from '../../lib/supabase';
import { useShopStore } from '../../store/useShopStore';

interface OrdersViewProps {
    account: Account;
    shopId?: string;
}

export function OrdersView({ account }: OrdersViewProps) {
    const orders = useShopStore(state => state.orders);
    const isLoading = useShopStore(state => state.isLoading);
    const [statusFilter, setStatusFilter] = useState('all');

    console.log('[OrdersView] Rendering with:', { ordersCount: orders.length, isLoading });

    // No automatic fetch - data is loaded by App.tsx on mount
    // Data is already in the global store
    const filteredOrders = statusFilter === 'all'
        ? orders
        : orders.filter(order => order.order_status === statusFilter);

    const getStatusIcon = (status: string) => {
        if (!status) {
            return <ShoppingBag className="w-5 h-5 text-gray-500" />;
        }

        switch (status.toLowerCase()) {
            case 'unpaid':
                return <Clock className="w-5 h-5 text-yellow-500" />;
            case 'awaiting_shipment':
            case 'awaiting_collection':
                return <Package className="w-5 h-5 text-blue-500" />;
            case 'shipped':
                return <TruckIcon className="w-5 h-5 text-purple-500" />;
            case 'delivered':
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'cancelled':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <ShoppingBag className="w-5 h-5 text-gray-500" />;
        }
    };

    const formatStatus = (status: string) => {
        if (!status) return 'Unknown';
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatDate = (timestamp: string | number) => {
        const date = typeof timestamp === 'number'
            ? new Date(timestamp * 1000) // Assuming unix timestamp in seconds
            : new Date(timestamp);

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Orders</h2>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-pink-500"
                    >
                        <option value="all">All Orders</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="awaiting_shipment">Awaiting Shipment</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                    <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No orders found</p>
                    <p className="text-gray-500 text-sm mt-2">
                        {statusFilter !== 'all' ? 'Try changing the filter' : 'Orders will appear here once you connect your TikTok Shop'}
                    </p>
                </div>
            ) : (
                <div className="bg-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-900">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Order ID
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Items
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredOrders.map((order) => (
                                <tr key={order.order_id} className="hover:bg-gray-750 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-white">{order.order_id}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(order.order_status)}
                                            <span className="text-sm text-gray-300">{formatStatus(order.order_status)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-300">{formatDate(order.created_time.toString())}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-300">View Details</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-white">
                                            {order.currency} {order.order_amount?.toFixed(2)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
