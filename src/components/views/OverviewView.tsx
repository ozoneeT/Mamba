import { TrendingUp, Eye, MousePointer, DollarSign, Users, Heart, Video, MessageCircle, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { StatCard } from '../StatCard';
import { useKPIData } from '../../hooks/useKPIData';
import { Account } from '../../lib/supabase';
import { DateRangePicker, DateRange } from '../DateRangePicker';
import TikTokAnalytics from '../TikTokAnalytics';

interface OverviewViewProps {
  account: Account;
}

const getDefaultDateRange = (): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
};

export function OverviewView({ account }: OverviewViewProps) {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const { data, loading, aggregateMetrics } = useKPIData(account, 'overview', dateRange);
  const [tikTokMetrics, setTikTokMetrics] = useState<any>(null);

  // Fetch TikTok analytics
  useEffect(() => {
    const fetchTikTokData = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_TIKTOK_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_BASE_URL}/api/tiktok/analytics/${account.id}`);
        const result = await response.json();
        if (result.success) {
          setTikTokMetrics(result.data);
        }
      } catch (error) {
        console.error('Error fetching TikTok metrics:', error);
      }
    };

    if (account.id) {
      fetchTikTokData();
    }
  }, [account.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  const metrics = aggregateMetrics(data);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num: number): string => {
    return `$${formatNumber(num)}`;
  };

  // Use real TikTok data if available, otherwise fall back to 0
  const realFollowers = tikTokMetrics?.userInfo?.follower_count || 0;
  const realLikes = tikTokMetrics?.aggregatedMetrics?.totalLikes || 0;
  const realViews = tikTokMetrics?.aggregatedMetrics?.totalViews || 0;
  const realEngagement = tikTokMetrics?.aggregatedMetrics?.avgEngagementRate || 0;
  const realVideos = tikTokMetrics?.aggregatedMetrics?.videoCount || 0;
  const realComments = tikTokMetrics?.aggregatedMetrics?.totalComments || 0;
  const realShares = tikTokMetrics?.aggregatedMetrics?.totalShares || 0;

  return (
    <div className="space-y-6">
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
              <p className="text-pink-400 font-medium">{account.tiktok_handle}</p>
              {account.is_agency_view && (
                <p className="text-gray-400 text-sm mt-1">Showing aggregated data across all accounts</p>
              )}
            </div>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* TikTok Analytics Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">TikTok Analytics (Real-time)</h3>
        <TikTokAnalytics accountId={account.id} />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Key Metrics (Real-time)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Followers"
            value={formatNumber(realFollowers)}
            change={0} // We don't have historical data yet
            icon={Users}
            iconColor="bg-gradient-to-r from-purple-500 to-pink-500"
            subtitle="Total audience"
          />
          <StatCard
            title="Total Likes"
            value={formatNumber(realLikes)}
            change={0}
            icon={Heart}
            iconColor="bg-gradient-to-r from-pink-500 to-red-500"
            subtitle="Across all videos"
          />
          <StatCard
            title="Total Views"
            value={formatNumber(realViews)}
            change={0}
            icon={Eye}
            iconColor="bg-gradient-to-r from-blue-500 to-cyan-500"
            subtitle="Lifetime views"
          />
          <StatCard
            title="Engagement Rate"
            value={`${realEngagement.toFixed(2)}%`}
            change={0}
            icon={TrendingUp}
            iconColor="bg-gradient-to-r from-green-500 to-emerald-500"
            subtitle="Average per video"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Content Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Videos Posted"
            value={realVideos}
            icon={Video}
            iconColor="bg-gradient-to-r from-pink-500 to-purple-500"
            subtitle="Total videos"
          />
          <StatCard
            title="Total Comments"
            value={formatNumber(realComments)}
            icon={MessageCircle}
            iconColor="bg-gradient-to-r from-orange-500 to-red-500"
            subtitle="Community interaction"
          />
          <StatCard
            title="Total Shares"
            value={formatNumber(realShares)}
            icon={Share2}
            iconColor="bg-gradient-to-r from-indigo-500 to-blue-500"
            subtitle="Viral reach"
          />
        </div>
      </div>
    </div>
  );
}
