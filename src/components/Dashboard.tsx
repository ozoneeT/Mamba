import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { OverviewView } from './views/OverviewView';
import { ProfitLossView } from './views/ProfitLossView';
import { OrdersView } from './views/OrdersView';
import { ProductsView } from './views/ProductsView';
import WelcomeScreen from './WelcomeScreen';
import { ShopList } from './ShopList';
import { Account, supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function Dashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [checkingShop, setCheckingShop] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // Shop List State
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');

  // Initialize Account (Just fetch, don't create)
  useEffect(() => {
    if (profile?.id) {
      fetchAccount();
    }
  }, [profile]);

  const fetchAccount = async () => {
    try {
      setInitializing(true);

      if (!profile?.id) return;

      const { data: userAccounts, error } = await supabase
        .from('user_accounts')
        .select('account_id, accounts(*)')
        .eq('user_id', profile.id);

      if (error) throw error;

      const accounts = userAccounts
        ?.map((ua: any) => ua.accounts)
        .filter((acc: Account) => acc.status === 'active') || [];

      if (accounts.length > 0) {
        setSelectedAccount(accounts[0]);
      } else {
        // No account found, that's fine. We'll create one when they connect a shop.
        setSelectedAccount(null);
      }
    } catch (error) {
      console.error('Error fetching account:', error);
    } finally {
      setInitializing(false);
    }
  };

  const ensureAccountExists = async (): Promise<Account> => {
    if (selectedAccount) return selectedAccount;

    try {
      // Create the account
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .insert({
          name: 'My Shop',
          status: 'active',
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // Link account to user
      const { error: linkError } = await supabase
        .from('user_accounts')
        .insert({
          user_id: profile?.id,
          account_id: account.id,
        });

      if (linkError) throw linkError;

      setSelectedAccount(account);
      return account;
    } catch (error: any) {
      console.error('Error ensuring account exists:', error);
      throw new Error('Failed to create account record');
    }
  };

  // Check if TikTok Shop is connected when account changes
  useEffect(() => {
    if (selectedAccount) {
      fetchShops();
    } else if (!initializing) {
      // Only show welcome if we are done initializing and truly have no account
      setCheckingShop(false);
      setShowWelcome(true);
    }
  }, [selectedAccount, initializing]);

  // Handle TikTok Auth Redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tiktokConnected = params.get('tiktok_connected');
    const tiktokError = params.get('tiktok_error');
    const accountId = params.get('account_id');
    const tiktokCode = params.get('tiktok_code');
    const action = params.get('action');

    if (tiktokConnected === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      if (selectedAccount && selectedAccount.id === accountId) {
        fetchShops(true);
      } else if (accountId) {
        window.location.reload();
      }
    } else if (tiktokError) {
      window.history.replaceState({}, '', window.location.pathname);
      alert(`TikTok Connection Error: ${decodeURIComponent(tiktokError)}`);
    } else if (tiktokCode && action === 'finalize_auth') {
      // If we have a code but no selectedAccount (rare race condition or reload), 
      // we might need to fetch the account first or rely on accountId param if we passed it.
      // For now, assuming selectedAccount is loaded or will be loaded.
      if (selectedAccount) {
        finalizeAuth(tiktokCode, selectedAccount.id);
      }
    }
  }, [selectedAccount]);

  const finalizeAuth = async (code: string, accountId: string) => {
    try {
      window.history.replaceState({}, '', window.location.pathname);
      setCheckingShop(true);

      const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/auth/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, accountId }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchShops(true);
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
      const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/shops/${selectedAccount.id}`);
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        setShops(data.data);
        setShowWelcome(false);
        if (isAfterConnect || data.data.length === 1) {
          setSelectedShop(data.data[0]);
          setViewMode('details');
        }
      } else {
        setShops([]);
        setShowWelcome(true);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      setShops([]);
      setShowWelcome(true);
    } finally {
      setCheckingShop(false);
    }
  };

  const handleConnectShop = async () => {
    try {
      const account = await ensureAccountExists();

      const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/auth/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          accountName: account.name
        }),
      });

      const data = await response.json();

      if (data.authUrl || data.url) {
        window.location.href = data.authUrl || data.url;
      } else {
        alert(`Failed to start authorization. Response: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      console.error('Error starting auth:', error);
      alert(`Failed to start authorization: ${error.message}`);
    }
  };

  if (initializing || checkingShop) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  // Full screen Welcome if no account or no shops
  if (!selectedAccount || showWelcome) {
    return (
      <WelcomeScreen
        onConnect={handleConnectShop}
        isConnecting={false} // You could add state for this
      />
    );
  }

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
              {/* AccountSelector removed as per user request */}
            </div>

            {viewMode === 'details' && selectedShop && (
              <div className="text-gray-400 text-sm">
                Viewing: <span className="text-white font-medium">{selectedShop.shop_name}</span>
              </div>
            )}
          </div>

          {checkingShop ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
            </div>
          ) : viewMode === 'list' ? (
            <ShopList
              shops={shops}
              onSelectShop={(shop) => {
                setSelectedShop(shop);
                setViewMode('details');
              }}
              onAddShop={handleConnectShop}
              isLoading={checkingShop}
            />
          ) : (
            // Details Views
            (() => {
              switch (activeTab) {
                case 'overview': return <OverviewView account={selectedAccount} shopId={selectedShop?.shop_id} />;
                case 'orders': return <OrdersView account={selectedAccount} shopId={selectedShop?.shop_id} />;
                case 'products': return <ProductsView account={selectedAccount} shopId={selectedShop?.shop_id} />;
                case 'profit-loss': return <ProfitLossView account={selectedAccount} shopId={selectedShop?.shop_id} />;
                default: return <OverviewView account={selectedAccount} shopId={selectedShop?.shop_id} />;
              }
            })()
          )}
        </div>
      </main>
    </div>
  );
}
