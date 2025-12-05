import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface TikTokConnectProps {
    accountId: string;
    onConnectionChange?: (connected: boolean) => void;
}

interface ConnectionStatus {
    connected: boolean;
    openId?: string;
    expiresAt?: string;
    isExpired?: boolean;
}

interface SyncStatus {
    lastSync: string | null;
    videoCount: number;
    followerCount: number;
}

const API_BASE_URL = import.meta.env.VITE_TIKTOK_API_URL || 'http://localhost:3001';

export default function TikTokConnect({ accountId, onConnectionChange }: TikTokConnectProps) {
    const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check connection status on mount
    useEffect(() => {
        checkConnectionStatus();
        checkSyncStatus();
    }, [accountId]);

    // Handle OAuth callback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const connected = params.get('tiktok_connected');
        const tiktokError = params.get('tiktok_error');
        const callbackAccountId = params.get('account_id');

        if (connected === 'true' && callbackAccountId === accountId) {
            setStatus({ connected: true });
            onConnectionChange?.(true);
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
            // Trigger initial sync
            handleSync();
        } else if (tiktokError) {
            setError(decodeURIComponent(tiktokError));
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [accountId]);

    const checkConnectionStatus = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/tiktok/auth/status/${accountId}`);
            const data = await response.json();

            if (data.success) {
                setStatus({
                    connected: data.connected,
                    openId: data.openId,
                    expiresAt: data.expiresAt,
                    isExpired: data.isExpired,
                });
                onConnectionChange?.(data.connected);
            }
        } catch (err: any) {
            console.error('Error checking connection status:', err);
            setError('Failed to check connection status');
        } finally {
            setLoading(false);
        }
    };

    const checkSyncStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/tiktok/sync/status/${accountId}`);
            const data = await response.json();

            if (data.success) {
                setSyncStatus(data.data);
            }
        } catch (err: any) {
            console.error('Error checking sync status:', err);
        }
    };

    const handleConnect = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/api/tiktok/auth/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accountId }),
            });

            const data = await response.json();

            if (data.success && data.authUrl) {
                // Redirect to TikTok OAuth
                window.location.href = data.authUrl;
            } else {
                setError('Failed to start authentication');
            }
        } catch (err: any) {
            console.error('Error connecting to TikTok:', err);
            setError('Failed to connect to TikTok');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect this TikTok account?')) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/api/tiktok/auth/disconnect/${accountId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                setStatus({ connected: false });
                setSyncStatus(null);
                onConnectionChange?.(false);
            } else {
                setError('Failed to disconnect');
            }
        } catch (err: any) {
            console.error('Error disconnecting:', err);
            setError('Failed to disconnect');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/api/tiktok/sync/${accountId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ syncType: 'all' }),
            });

            const data = await response.json();

            if (data.success) {
                await checkSyncStatus();
            } else {
                setError(data.error || 'Failed to sync data');
            }
        } catch (err: any) {
            console.error('Error syncing data:', err);
            setError('Failed to sync data');
        } finally {
            setSyncing(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    if (loading && !status.connected) {
        return (
            <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking TikTok connection...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                    {status.connected ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            {status.connected ? 'TikTok Connected' : 'TikTok Not Connected'}
                        </h3>
                        {status.connected && status.openId && (
                            <p className="text-sm text-gray-500">ID: {status.openId}</p>
                        )}
                        {status.connected && status.isExpired && (
                            <p className="text-sm text-orange-600">⚠️ Token expired - please reconnect</p>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    {status.connected ? (
                        <>
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {syncing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Sync Now
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleDisconnect}
                                disabled={loading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                Disconnect
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleConnect}
                            disabled={loading}
                            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                            Connect TikTok
                        </button>
                    )}
                </div>
            </div>

            {/* Sync Status */}
            {status.connected && syncStatus && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Sync Status</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Last Sync</p>
                            <p className="font-semibold text-gray-900">{formatDate(syncStatus.lastSync)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Videos</p>
                            <p className="font-semibold text-gray-900">{syncStatus.videoCount.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Followers</p>
                            <p className="font-semibold text-gray-900">{syncStatus.followerCount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}
        </div>
    );
}
