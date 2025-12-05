import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Store, ShoppingBag, Package, TrendingUp } from 'lucide-react';

interface WelcomeScreenProps {
    accountId: string;
    accountName: string;
    onComplete?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function WelcomeScreen({ accountId, accountName }: WelcomeScreenProps) {
    const { profile } = useAuth();
    const [connecting, setConnecting] = useState(false);

    const handleConnectShop = async () => {
        try {
            setConnecting(true);

            // Request auth URL from backend
            const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/auth/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accountId }),
            });

            const data = await response.json();

            if (data.success && data.authUrl) {
                // Redirect to TikTok authorization
                window.location.href = data.authUrl;
            } else {
                alert('Failed to start authorization. Please try again.');
                setConnecting(false);
            }
        } catch (error) {
            console.error('Error connecting shop:', error);
            alert('Failed to connect. Please try again.');
            setConnecting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
            <div className="max-w-4xl w-full">
                {/* Welcome Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-pink-500 to-red-500 rounded-2xl mb-4">
                        <Store className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-4">
                        Welcome to Mamba! 🎉
                    </h1>
                    <p className="text-xl text-gray-300">
                        Hi {profile?.full_name || 'there'}! Let's connect your TikTok Shop to get started.
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
                    {/* Instructions */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">Quick Setup</h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="bg-pink-500 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-white font-bold">
                                    1
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold mb-1">Connect Your TikTok Shop</h3>
                                    <p className="text-gray-400">Authorize access to your TikTok Shop seller account</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-pink-500 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-white font-bold">
                                    2
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold mb-1">Sync Your Data</h3>
                                    <p className="text-gray-400">We'll fetch your orders, products, and sales data</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-pink-500 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-white font-bold">
                                    3
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold mb-1">View Your Analytics</h3>
                                    <p className="text-gray-400">Track revenue, orders, inventory, and performance</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Connection Component */}
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Account: {accountName}</h3>
                        <button
                            onClick={handleConnectShop}
                            disabled={connecting}
                            className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white px-6 py-4 rounded-xl font-semibold text-lg hover:from-pink-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {connecting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    Connecting...
                                </span>
                            ) : (
                                'Connect TikTok Shop'
                            )}
                        </button>
                    </div>

                    {/* Info Box */}
                    <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-blue-300 text-sm">
                            <strong>Note:</strong> We only request read-only access to your TikTok Shop data.
                            We cannot make changes to your shop or process orders on your behalf.
                        </p>
                    </div>

                    {/* Features Preview */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                            <ShoppingBag className="w-8 h-8 text-pink-400 mb-2" />
                            <h4 className="text-white font-semibold mb-1">Order Tracking</h4>
                            <p className="text-gray-400 text-sm">Monitor all orders in real-time</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                            <Package className="w-8 h-8 text-blue-400 mb-2" />
                            <h4 className="text-white font-semibold mb-1">Inventory Management</h4>
                            <p className="text-gray-400 text-sm">Track stock levels and products</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                            <TrendingUp className="w-8 h-8 text-green-400 mb-2" />
                            <h4 className="text-white font-semibold mb-1">Revenue Analytics</h4>
                            <p className="text-gray-400 text-sm">View sales and profit reports</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
