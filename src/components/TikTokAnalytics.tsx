import { useEffect, useState } from 'react';

interface TikTokAnalyticsProps {
    accountId: string;
}

interface UserInfo {
    display_name: string;
    follower_count: number;
    following_count: number;
    likes_count: number;
    video_count: number;
    is_verified: boolean;
}

interface AggregatedMetrics {
    videoCount: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalViews: number;
    avgEngagementRate: number;
}

const API_BASE_URL = 'http://localhost:3001';

export default function TikTokAnalytics({ accountId }: TikTokAnalyticsProps) {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, [accountId]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/tiktok/analytics/${accountId}`);
            const data = await response.json();

            if (data.success) {
                setUserInfo(data.data.userInfo);
                setMetrics(data.data.aggregatedMetrics);
            }
        } catch (error) {
            console.error('Error fetching TikTok analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-gray-200 rounded-lg"></div>
                    <div className="h-24 bg-gray-200 rounded-lg"></div>
                    <div className="h-24 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (!userInfo || !metrics) {
        return null;
    }

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    };

    return (
        <div className="space-y-6">
            {/* User Info Card */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            {userInfo.display_name}
                            {userInfo.is_verified && (
                                <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            )}
                        </h3>
                        <div className="mt-4 grid grid-cols-4 gap-6">
                            <div>
                                <p className="text-pink-100 text-sm">Followers</p>
                                <p className="text-2xl font-bold">{formatNumber(userInfo.follower_count)}</p>
                            </div>
                            <div>
                                <p className="text-pink-100 text-sm">Following</p>
                                <p className="text-2xl font-bold">{formatNumber(userInfo.following_count)}</p>
                            </div>
                            <div>
                                <p className="text-pink-100 text-sm">Total Likes</p>
                                <p className="text-2xl font-bold">{formatNumber(userInfo.likes_count)}</p>
                            </div>
                            <div>
                                <p className="text-pink-100 text-sm">Videos</p>
                                <p className="text-2xl font-bold">{formatNumber(userInfo.video_count)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
}
