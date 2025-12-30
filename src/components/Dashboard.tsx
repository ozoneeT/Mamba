import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { OverviewView } from './views/OverviewView';
import { ProfitLossView } from './views/ProfitLossView';
import { OrdersView } from './views/OrdersView';
import { ProductsView } from './views/ProductsView';
import { AdminDashboard } from './views/AdminDashboard';
import { AdminUserManagement } from './views/AdminUserManagement';
import { AdminStoreManagement } from './views/AdminStoreManagement';
import { ProfileView } from './views/ProfileView';
import WelcomeScreen from './WelcomeScreen';
import { ShopList } from './ShopList';
import { Account, supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useShopStore } from '../store/useShopStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function Dashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(profile?.role === 'admin' ? 'admin-dashboard' : 'overview');
  // We still keep selectedAccount state to allow switching if we ever re-enable it, 
  // but we'll default it to the first account from the query.
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  // Shop List State
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Queries ---

  // 1. Fetch Accounts
  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    isFetched: isAccountsFetched
  } = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: userAccounts, error } = await supabase
        .from('user_accounts')
        .select('account_id, accounts(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      return userAccounts
        ?.map((ua: any) => ua.accounts)
        .filter((acc: Account) => acc.status === 'active') || [];
    },
    enabled: !!user?.id,
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
      const shopStore = useShopStore.getState();
      // Only fetch if it's a different shop or we don't have data yet
      if (shopStore.lastFetchShopId !== selectedShop.shop_id || shopStore.products.length === 0) {
        console.log('[Dashboard] Triggering fetch for:', selectedShop.shop_name);
        shopStore.fetchShopData(selectedAccount.id, selectedShop.shop_id);
      }
    }
  }, [selectedAccount?.id, selectedShop?.shop_id]);

  // Prefetch Admin Data on Mount
  useEffect(() => {
    if (profile?.role === 'admin') {
      console.log('[Dashboard] Admin detected, prefetching admin data...');

      const prefetchAdminData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const headers = { 'Authorization': `Bearer ${token}` };

        // Prefetch Stats
        queryClient.prefetchQuery({
          queryKey: ['admin-stats'],
          queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/api/admin/stats`, { headers });
            const data = await res.json();
            return data.success ? data.data : null;
          }
        });

        // Prefetch Users
        queryClient.prefetchQuery({
          queryKey: ['admin-users'],
          queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/api/admin/users`, { headers });
            const data = await res.json();
            return data.success ? data.data : null;
          }
        });

        // Prefetch Stores
        queryClient.prefetchQuery({
          queryKey: ['admin-stores'],
          queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/api/admin/stores`, { headers });
            const data = await res.json();
            return data.success ? data.data : null;
          }
        });
      };

      prefetchAdminData();
    }
  }, [profile?.role, queryClient]);


  // --- Actions ---

  const ensureAccountExists = async (): Promise<Account> => {
    if (selectedAccount) return selectedAccount;

    try {
      if (!user?.id) throw new Error('User not authenticated');

      // 1. Ensure Profile Exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        console.log('Profile missing, creating new profile for user:', user.id);
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            role: 'client',
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Continue anyway, maybe it exists but we couldn't read it? 
          // But if insert fails, likely next step fails too.
          throw profileError;
        }
      }

      // 2. Create the account
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .insert({
          name: 'My Shop',
          status: 'active',
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // 3. Link account to user
      const { error: linkError } = await supabase
        .from('user_accounts')
        .insert({
          user_id: user.id,
          account_id: account.id,
        });

      if (linkError) throw linkError;

      // Invalidate accounts query to refresh the list and trigger the useEffect to set selectedAccount
      await queryClient.invalidateQueries({ queryKey: ['accounts', user.id] });

      // We return the account directly here because invalidation is async and we need it now
      setSelectedAccount(account);
      return account;
    } catch (error: any) {
      console.error('Error ensuring account exists:', error);
      throw new Error('Failed to create account record: ' + error.message);
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

  const handleConnectAgency = async () => {
    try {
      const account = await ensureAccountExists();

      const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/auth/partner/start`, {
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
        alert(`Failed to start agency authorization. Response: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      console.error('Error starting agency auth:', error);
      alert(`Failed to start agency authorization: ${error.message}`);
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

  const handleDeleteShop = async (shop: any) => {
    if (!selectedAccount || !shop) return;

    if (!confirm(`Are you sure you want to delete ${shop.shop_name}? This will remove all data associated with this shop.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/auth/disconnect/${selectedAccount.id}/${shop.shop_id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        await queryClient.invalidateQueries({ queryKey: ['shops', selectedAccount.id] });
        // If the deleted shop was selected, deselect it
        if (selectedShop?.shop_id === shop.shop_id) {
          setSelectedShop(null);
          setViewMode('list');
        }
      } else {
        throw new Error(data.error || 'Failed to delete shop');
      }
    } catch (error: any) {
      console.error('Error deleting shop:', error);
      alert(`Failed to delete shop: ${error.message}`);
    }
  };

  const handleSyncShops = async () => {
    if (!selectedAccount) return;

    try {
      setIsSyncing(true);
      const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/shops/${selectedAccount.id}?refresh=true`);
      const data = await response.json();

      if (data.success) {
        await queryClient.invalidateQueries({ queryKey: ['shops', selectedAccount.id] });
        // alert('Shops synced successfully!'); // Optional: show success message
      } else {
        throw new Error(data.error || 'Failed to sync shops');
      }
    } catch (error: any) {
      console.error('Error syncing shops:', error);
      alert(`Failed to sync shops: ${error.message}`);
    } finally {
      setIsSyncing(false);
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
  // CRITICAL: Bypassed for admins
  const isUserAdmin = profile?.role === 'admin';
  const needsWelcome = !isUserAdmin && ((!selectedAccount && !isLoadingAccounts) || (showWelcome && !isLoadingShops));

  if (needsWelcome) {
    return (
      <WelcomeScreen
        onConnect={handleConnectShop}
        onConnectAgency={handleConnectAgency}
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
              onAddAgency={handleConnectAgency}
              onSyncShops={handleSyncShops}
              onDeleteShop={handleDeleteShop}
              isLoading={isLoadingShops}
              isSyncing={isSyncing}
            />
          ) : (
            // Details Views
            (() => {
              if (!selectedAccount) return null;
              switch (activeTab) {
                case 'overview': return <OverviewView account={selectedAccount} shopId={selectedShop?.shop_id} onNavigate={setActiveTab} />;
                case 'orders': return <OrdersView />;
                case 'products': return <ProductsView account={selectedAccount} shopId={selectedShop?.shop_id} />;
                case 'profit-loss': return <ProfitLossView shopId={selectedShop?.shop_id} />;
                case 'profile': return <ProfileView />;
                case 'admin-dashboard': return <AdminDashboard />;
                case 'admin-users': return <AdminUserManagement />;
                case 'admin-stores': return <AdminStoreManagement />;
                default: return <OverviewView account={selectedAccount} shopId={selectedShop?.shop_id} />;
              }
            })()
          )}
        </div>
      </main>
    </div>
  );
}
