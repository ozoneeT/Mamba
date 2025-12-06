import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { AccountSelector } from './AccountSelector';
import { OverviewView } from './views/OverviewView';
import { ProfitLossView } from './views/ProfitLossView';
import { OrdersView } from './views/OrdersView';
import { ProductsView } from './views/ProductsView';
import WelcomeScreen from './WelcomeScreen';
import { Account } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [checkingShop, setCheckingShop] = useState(true);

  // Check if TikTok Shop is connected when account changes
  useEffect(() => {
    if (selectedAccount) {
      checkShopConnection();
    }
  }, [selectedAccount]);

  // Handle TikTok Auth Redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tiktokConnected = params.get('tiktok_connected');
    const tiktokError = params.get('tiktok_error');
    const accountId = params.get('account_id');

    if (tiktokConnected === 'true') {
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);

      // If we have an account ID, we should try to select it if it's not already selected
      // Or just refresh the connection status if it is selected
      if (selectedAccount && selectedAccount.id === accountId) {
        checkShopConnection();
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
    }
  }, [selectedAccount]);

  const checkShopConnection = async () => {
    if (!selectedAccount) return;

    try {
      setCheckingShop(true);

      // Check if TikTok Shop is connected
      const response = await fetch(`${API_BASE_URL}/api/tiktok-shop/auth/status/${selectedAccount.id}`);
      const data = await response.json();

      if (!data.connected) {
        // Not connected, show welcome screen
        setShowWelcome(true);
      } else {
        // Connected, hide welcome screen
        setShowWelcome(false);
      }
    } catch (error) {
      console.error('Error checking TikTok Shop connection:', error);
      // On error, show welcome screen to be safe
      setShowWelcome(true);
    } finally {
      setCheckingShop(false);
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

    // Show welcome screen if TikTok Shop not connected
    if (showWelcome && !checkingShop) {
      return <WelcomeScreen accountId={selectedAccount.id} accountName={selectedAccount.name} />;
    }

    // Show loading while checking
    if (checkingShop) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewView account={selectedAccount} />;
      case 'orders':
        return <OrdersView account={selectedAccount} />;
      case 'products':
        return <ProductsView account={selectedAccount} />;
      case 'profit-loss':
        return <ProfitLossView account={selectedAccount} />;
      default:
        return <OverviewView account={selectedAccount} />;
    }
  };

  // If showing welcome screen, render it full screen
  if (selectedAccount && showWelcome && !checkingShop) {
    return (
      <WelcomeScreen
        accountId={selectedAccount.id}
        accountName={selectedAccount.name}
        onComplete={() => setShowWelcome(false)} // Hide welcome screen and show dashboard
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-6">
            <AccountSelector
              selectedAccount={selectedAccount}
              onSelectAccount={setSelectedAccount}
            />
          </div>

          {renderView()}
        </div>
      </main>
    </div>
  );
}
