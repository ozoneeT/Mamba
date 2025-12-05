import { TrendingUp, DollarSign, ShoppingBag, Package, Users, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { StatCard } from '../StatCard';
import { Account } from '../../lib/supabase';

interface OverviewViewProps {
  account: Account;
}

interface ShopMetrics {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  avgOrderValue: number;
  conversionRate: number;
  shopRating: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function OverviewView({ account }: OverviewViewProps) {
  const [metrics, setMetrics] = useState<ShopMetrics>({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    shopRating: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShopMetrics();
  }, [account.id]);

  const fetchShopMetrics = async () => {
    try {
      setLoading(true);

      // Fetch orders, products, and performance data
      const [ordersRes, productsRes, performanceRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/tiktok-shop/orders/${account.id}?page=1&pageSize=100`),
        fetch(`${API_BASE_URL}/api/tiktok-shop/products/${account.id}?page=1&pageSize=100`),
        fetch(`${API_BASE_URL}/api/tiktok-shop/performance/${account.id}`),
      ]);

      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();
      const performanceData = await performanceRes.json();

      // Calculate metrics
      const orders = ordersData.data?.orders || [];
      const products = productsData.data?.products || [];
      const performance = performanceData.data || {};

      const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setMetrics({
        totalOrders,
        totalRevenue,
        totalProducts: products.length,
        avgOrderValue,
        conversionRate: performance.conversion_rate || 0,
        shopRating: performance.shop_rating || 0,
      });
    } catch (error) {
      console.error('Error fetching shop metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (num: number): string => {
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Header */}
      <div className="bg-gradient-to-r from-pink-500/10 to-red-500/10 border border-pink-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {account.avatar_url ? (
              <img src={account.avatar_url} alt={account.name} className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center text-white text-2xl font-bold">
                {account.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">{account.name}</h2>
              <p className="text-pink-400 font-medium">{account.tiktok_handle || 'TikTok Shop'}</p>
              {metrics.shopRating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm text-gray-300">{metrics.shopRating.toFixed(1)} Shop Rating</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Revenue Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            change={0}
            icon={DollarSign}
            iconColor="bg-gradient-to-r from-green-500 to-emerald-500"
            subtitle="All-time earnings"
          />
          <StatCard
            title="Total Orders"
            value={formatNumber(metrics.totalOrders)}
            change={0}
            icon={ShoppingBag}
            iconColor="bg-gradient-to-r from-blue-500 to-cyan-500"
            subtitle="Completed orders"
          />
          <StatCard
            title="Avg Order Value"
            value={formatCurrency(metrics.avgOrderValue)}
            change={0}
            icon={TrendingUp}
            iconColor="bg-gradient-to-r from-purple-500 to-pink-500"
            subtitle="Per transaction"
          />
        </div>
      </div>

      {/* Shop Performance */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Shop Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Products"
            value={formatNumber(metrics.totalProducts)}
            icon={Package}
            iconColor="bg-gradient-to-r from-orange-500 to-red-500"
            subtitle="Active listings"
          />
          <StatCard
            title="Conversion Rate"
            value={`${metrics.conversionRate.toFixed(2)}%`}
            icon={Users}
            iconColor="bg-gradient-to-r from-pink-500 to-purple-500"
            subtitle="Visitors to buyers"
          />
          <StatCard
            title="Shop Rating"
            value={metrics.shopRating > 0 ? metrics.shopRating.toFixed(1) : 'N/A'}
            icon={Star}
            iconColor="bg-gradient-to-r from-yellow-500 to-orange-500"
            subtitle="Customer satisfaction"
          />
        </div>
      </div>

      {/* Quick Actions / Info */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Orders Today</p>
            <p className="text-2xl font-bold text-white">-</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Revenue Today</p>
            <p className="text-2xl font-bold text-white">-</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Pending Orders</p>
            <p className="text-2xl font-bold text-white">-</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Low Stock Items</p>
            <p className="text-2xl font-bold text-white">-</p>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-4">
          💡 Tip: Navigate to Orders or Products for detailed insights
        </p>
      </div>
    </div>
  );
}
