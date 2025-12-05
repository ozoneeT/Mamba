import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import TikTokConnect from './TikTokConnect';
import TikTokAnalytics from './TikTokAnalytics';

interface WelcomeScreenProps {
    accountId: string;
    accountName: string;
    onComplete?: () => void; // Callback when user wants to go to dashboard
}

export default function WelcomeScreen({ accountId, accountName, onComplete }: WelcomeScreenProps) {
    const { profile } = useAuth();
    const [isConnected, setIsConnected] = useState(false);

    const handleConnectionChange = (connected: boolean) => {
        setIsConnected(connected);
        // Auto-hide welcome screen after a short delay when connected
        if (connected && onComplete) {
            setTimeout(() => {
                onComplete();
            }, 3000); // Give user 3 seconds to see the success message
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
            <div className="max-w-4xl w-full">
                {/* Welcome Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-white mb-4">
                        Welcome to Your TikTok Dashboard! 🎉
                    </h1>
                    <p className="text-xl text-gray-300">
                        Hi {profile?.full_name || 'there'}! Let's connect your TikTok account to get started.
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
                    {!isConnected ? (
                        <>
                            {/* Instructions */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-white mb-4">Quick Setup</h2>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-pink-500 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-white font-bold">
                                            1
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold mb-1">Connect Your TikTok Account</h3>
                                            <p className="text-gray-400">Click the button below to authorize access to your TikTok data</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="bg-pink-500 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-white font-bold">
                                            2
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold mb-1">Sync Your Data</h3>
                                            <p className="text-gray-400">After connecting, we'll fetch your follower count, videos, and engagement metrics</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="bg-pink-500 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-white font-bold">
                                            3
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold mb-1">View Your Analytics</h3>
                                            <p className="text-gray-400">Track your growth, engagement rates, and video performance</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Connection Component */}
                            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                                <h3 className="text-lg font-semibold text-white mb-4">Account: {accountName}</h3>
                                <TikTokConnect
                                    accountId={accountId}
                                    onConnectionChange={handleConnectionChange}
                                />
                            </div>

                            {/* Info Box */}
                            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                <p className="text-blue-300 text-sm">
                                    <strong>Note:</strong> We only request read-only access to your public TikTok data.
                                    We cannot post on your behalf or access private information.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Success State */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">You're All Set! 🎊</h2>
                                <p className="text-gray-300">Your TikTok account is connected. Here's your analytics:</p>
                            </div>

                            {/* Analytics */}
                            <TikTokAnalytics accountId={accountId} />

                            {/* Go to Dashboard Button */}
                            <div className="mt-8 text-center">
                                <button
                                    onClick={onComplete}
                                    className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-pink-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    Go to Dashboard →
                                </button>
                                <p className="text-gray-400 text-sm mt-3">Redirecting automatically in 3 seconds...</p>
                            </div>

                            {/* Next Steps */}
                            <div className="mt-8 bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                                <h3 className="text-lg font-semibold text-white mb-3">What's Next?</h3>
                                <ul className="space-y-2 text-gray-300">
                                    <li className="flex items-center gap-2">
                                        <span className="text-pink-400">→</span>
                                        Your data will automatically sync to keep your analytics up to date
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-pink-400">→</span>
                                        Click "Sync Now" anytime to refresh your latest TikTok data
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-pink-400">→</span>
                                        Explore different views in the sidebar to see detailed analytics
                                    </li>
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
