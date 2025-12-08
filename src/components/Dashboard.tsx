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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useShopStore } from '../store/useShopStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function Dashboard() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  // We still keep selectedAccount state to allow switching if we ever re-enable it, 
  // but we'll default it to the first account from the query.
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  // Shop List State
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');

  // --- Queries ---

  // 1. Fetch Accounts
  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    isFetched: isAccountsFetched
  } = useQuery({
    queryKey: ['accounts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data: userAccounts, error } = await supabase
        .from('user_accounts')
        .select('account_id, accounts(*)')
        .eq('user_id', profile.id);

      if (error) throw error;

      return userAccounts
        ?.map((ua: any) => ua.accounts)
        .filter((acc: Account) => acc.status === 'active') || [];
    },
    enabled: !!profile?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sync selectedAccount with fetched accounts
  useEffect(() => {
    if (isAccountsFetched) {
      if (accounts.length > 0) {
        // If we don't have a selected account, or the selected one is not in the list anymore
        if (!selectedAccount || !accounts.find(a => a.id === selectedAccount.id)) {
          setSelectedAccount(accounts[0]);
        }
      } else {
        setSelectedAccount(null);
      }
    }
  }, [accounts, isAccountsFetched, selectedAccount]);


  // 2. Fetch Shops
  const {
    data: shops = [],
    isLoading: isLoadingShops,
    isFetched: isShopsFetched
  } = useQuery({
    queryKey: ['shops', selectedAccount?.id],
    queryFn: async () => {
      if (!selectedAccount?.id) return [];
      const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/shops/${selectedAccount.id}`);
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return [];
    },
    enabled: !!selectedAccount?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Handle Shop Selection & Welcome Screen logic
  useEffect(() => {
    if (isShopsFetched) {
      if (shops.length > 0) {
        setShowWelcome(false);
        // Auto-select if only one shop and we haven't selected one yet (or just connected)
        // Or if we are in a state where we should be viewing details
        if (shops.length === 1 && !selectedShop) {
          setSelectedShop(shops[0]);
          setViewMode('details');
        }
      } else {
        // No shops found
        setShowWelcome(true);
      }
    } else if (!isLoadingAccounts && !isLoadingShops && !selectedAccount) {
      // No account, show welcome
      setShowWelcome(true);
    }
  }, [shops, isShopsFetched, selectedAccount, isLoadingAccounts, isLoadingShops]);

  // Fetch Shop Data when a shop is selected
  useEffect(() => {
    if (selectedAccount?.id && selectedShop?.shop_id) {
      console.log('[Dashboard] Fetching shop data for:', selectedShop.shop_name);
      useShopStore.getState().fetchShopData(selectedAccount.id, selectedShop.shop_id);
    }
  }, [selectedAccount?.id, selectedShop?.shop_id]);


  // --- Actions ---

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

      // Invalidate accounts query to refresh the list and trigger the useEffect to set selectedAccount
      await queryClient.invalidateQueries({ queryKey: ['accounts', profile?.id] });

      // We return the account directly here because invalidation is async and we need it now
      setSelectedAccount(account);
      return account;
    } catch (error: any) {
      console.error('Error ensuring account exists:', error);
      throw new Error('Failed to create account record');
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

  const finalizeAuth = async (code: string, accountId: string) => {
    try {
      window.history.replaceState({}, '', window.location.pathname);
      // We can show a loading state if we want, but React Query's isFetching might be enough if we invalidate

      const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/auth/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, accountId }),
      });

      const data = await response.json();

      if (data.success) {
        await queryClient.invalidateQueries({ queryKey: ['shops', accountId] });
        alert('TikTok Shop connected successfully!');
      } else {
        throw new Error(data.error || 'Failed to finalize connection');
      }
    } catch (error: any) {
      console.error('Error finalizing auth:', error);
      alert(`Failed to connect TikTok Shop: ${error.message}`);
    }
  };

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
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: ['shops', accountId] });
      }
    } else if (tiktokError) {
      window.history.replaceState({}, '', window.location.pathname);
      alert(`TikTok Connection Error: ${decodeURIComponent(tiktokError)}`);
    } else if (tiktokCode && action === 'finalize_auth') {
      // If we have a code, we try to finalize. 
      // We need an accountId. If selectedAccount is not yet loaded, we might have an issue.
      // But usually this happens after redirect, so we should have the account loaded or loading.
      if (selectedAccount) {
        finalizeAuth(tiktokCode, selectedAccount.id);
      } else if (accountId) {
        // Fallback if selectedAccount isn't set but we have param
        finalizeAuth(tiktokCode, accountId);
      }
    }
  }, [selectedAccount, queryClient]); // Added queryClient to deps


  // --- Render ---

  // Initial loading state
  if (isLoadingAccounts && !accounts.length) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  // Full screen Welcome if no account or no shops (and not loading)
  // We check !isLoadingShops to avoid flashing welcome screen while fetching shops
  if ((!selectedAccount && !isLoadingAccounts) || (showWelcome && !isLoadingShops)) {
    return (
      <WelcomeScreen
        onConnect={handleConnectShop}
        isConnecting={false}
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
            </div>

            {viewMode === 'details' && selectedShop && (
              <div className="text-gray-400 text-sm">
                Viewing: <span className="text-white font-medium">{selectedShop.shop_name}</span>
              </div>
            )}
          </div>

          {isLoadingShops ? (
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
              isLoading={isLoadingShops}
            />
          ) : (
            // Details Views
            (() => {
              if (!selectedAccount) return null;
              switch (activeTab) {
                case 'overview': return <OverviewView account={selectedAccount} shopId={selectedShop?.shop_id} onNavigate={setActiveTab} />;
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
