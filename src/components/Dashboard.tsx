import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { AccountSelector } from './AccountSelector';
import { OverviewView } from './views/OverviewView';
import { ProfitLossView } from './views/ProfitLossView';
import { OrdersView } from './views/OrdersView';
import { ProductsView } from './views/ProductsView';
import WelcomeScreen from './WelcomeScreen';
import { ShopList } from './ShopList';
import { Account } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [checkingShop, setCheckingShop] = useState(true);

  // Shop List State
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');

  // Check if TikTok Shop is connected when account changes
  useEffect(() => {
    if (selectedAccount) {
      fetchShops();
    }
  }, [selectedAccount]);

  // Handle TikTok Auth Redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tiktokConnected = params.get('tiktok_connected');
    const tiktokError = params.get('tiktok_error');
    const accountId = params.get('account_id');
    const tiktokCode = params.get('tiktok_code');
    const action = params.get('action');

    if (tiktokConnected === 'true') {
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);

      // If we have an account ID, we should try to select it if it's not already selected
      // Or just refresh the connection status if it is selected
      if (selectedAccount && selectedAccount.id === accountId) {
        fetchShops();
      } else if (accountId) {
        // Ideally we would switch to this account, but for now let's just reload the page
        // or let the user select it. 
        // A simple reload might be safest to ensure everything syncs up if the account changed
        window.location.reload();
      }
    } else if (tiktokError) {
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
      alert(`TikTok Connection Error: ${decodeURIComponent(tiktokError)}`);
    } else if (tiktokCode && action === 'finalize_auth' && selectedAccount) {
      // Handle TikTok-initiated auth (missing state)
      // We need to finalize the connection with the current account
      finalizeAuth(tiktokCode, selectedAccount.id);
    }
  }, [selectedAccount]);

  const finalizeAuth = async (code: string, accountId: string) => {
    try {
      // Clear URL params to avoid double submission
      window.history.replaceState({}, '', window.location.pathname);

      // Show loading state
      setCheckingShop(true);

      const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/auth/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, accountId }),
      });

      const data = await response.json();

      if (data.success) {
        // Success! Refresh connection status
        await fetchShops(true); // Pass true to indicate we just connected a shop
        alert('TikTok Shop connected successfully!');
      } else {
        throw new Error(data.error || 'Failed to finalize connection');
      }
    } catch (error: any) {
      console.error('Error finalizing auth:', error);
      alert(`Failed to connect TikTok Shop: ${error.message}`);
      setCheckingShop(false);
    }
  };

  const fetchShops = async (isAfterConnect = false) => {
    if (!selectedAccount) return;

    try {
      setCheckingShop(true);

      // Fetch authorized shops
      const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/shops/${selectedAccount.id}`);
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        setShops(data.data);
        setShowWelcome(false);

        // If we just connected a shop, or if there's only one shop, select it automatically
        if (isAfterConnect || data.data.length === 1) {
          // If multiple shops, ideally we'd find the new one. For now, taking the last one or first one is a reasonable guess.
          // Let's assume the API returns them in some order, or we just pick the first one if it's the only one.
          // If we just connected, let's pick the most recent one if possible, or just the first one.
          const shopToSelect = data.data[0]; // You might want to sort by created_at if available
          setSelectedShop(shopToSelect);
          setViewMode('details');
        }
      } else {
        setShops([]);
        setShowWelcome(true); // Show welcome screen if no shops
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      setShops([]);
      setShowWelcome(true); // Default to welcome screen on error/empty
    } finally {
      setCheckingShop(false);
    }
  };

  const handleAddShop = async () => {
    if (!selectedAccount) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/auth/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          accountName: selectedAccount.name
        }),
      });

      const data = await response.json();
      console.log('Auth start response:', data);

      if (data.authUrl || data.url) { // Handle both potential key names
        window.location.href = data.authUrl || data.url;
      } else {
        alert(`Failed to start authorization. Response: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      console.error('Error starting auth:', error);
      alert(`Failed to start authorization: ${error.message}`);
    }
  };

  const renderView = () => {
    if (!selectedAccount) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-400 text-lg">No account selected</p>
            <p className="text-gray-500 text-sm mt-2">Please select an account to view analytics</p>
          </div>
        </div>
      );
    }

    // Show loading while checking
    if (checkingShop) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
        </div>
      );
    }

    // Show Welcome Screen if no shops
    if (showWelcome) {
      return (
        <WelcomeScreen
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
        />
      );
    }

    // Show Shop List if in list mode
    if (viewMode === 'list') {
      return (
        <ShopList
          shops={shops}
          onSelectShop={(shop) => {
            setSelectedShop(shop);
            setViewMode('details');
          }}
          onAddShop={handleAddShop}
          isLoading={checkingShop}
        />
      );
    }

    // Show Details View
    switch (activeTab) {
      case 'overview':
        return <OverviewView account={selectedAccount} shopId={selectedShop?.shop_id} />;
      case 'orders':
        return <OrdersView account={selectedAccount} shopId={selectedShop?.shop_id} />;
      case 'products':
        return <ProductsView account={selectedAccount} shopId={selectedShop?.shop_id} />;
      case 'profit-loss':
        return <ProfitLossView account={selectedAccount} shopId={selectedShop?.shop_id} />;
      default:
        return <OverviewView account={selectedAccount} shopId={selectedShop?.shop_id} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Only show sidebar in details mode */}
      {viewMode === 'details' && (
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {viewMode === 'details' && (
                <button
                  onClick={() => {
                    setViewMode('list');
                    setSelectedShop(null);
                  }}
                  className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
              )}
              <AccountSelector
                selectedAccount={selectedAccount}
                onSelectAccount={setSelectedAccount}
              />
            </div>

            {viewMode === 'details' && selectedShop && (
              <div className="text-gray-400 text-sm">
                Viewing: <span className="text-white font-medium">{selectedShop.shop_name}</span>
              </div>
            )}
          </div>

          {renderView()}
        </div>
      </main>
    </div>
  );
}
