import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { AccountSelector } from './AccountSelector';
import { OverviewView } from './views/OverviewView';
import { ProfitLossView } from './views/ProfitLossView';
import { AdsView } from './views/AdsView';
import { PostsView } from './views/PostsView';
import { EngagementView } from './views/EngagementView';
import { AffiliatesView } from './views/AffiliatesView';
import { SalesView } from './views/SalesView';
import WelcomeScreen from './WelcomeScreen';
import { Account, supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_TIKTOK_API_URL || 'http://localhost:3001';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [checkingTikTok, setCheckingTikTok] = useState(true);

  // Check if TikTok is connected when account changes
  useEffect(() => {
    if (selectedAccount) {
      checkTikTokConnection();
    }
  }, [selectedAccount]);

  const checkTikTokConnection = async () => {
    if (!selectedAccount) return;

    try {
      setCheckingTikTok(true);

      // Check if TikTok is connected
      const response = await fetch(`${API_BASE_URL}/api/tiktok/auth/status/${selectedAccount.id}`);
      const data = await response.json();

      if (!data.connected) {
        // Not connected, show welcome screen
        setShowWelcome(true);
      } else {
        // Connected, check if we have any synced data
        const { data: userData } = await supabase
          .from('tiktok_user_info')
          .select('id')
          .eq('account_id', selectedAccount.id)
          .single();

        // Show welcome if no data synced yet
        setShowWelcome(!userData);
      }
    } catch (error) {
      console.error('Error checking TikTok connection:', error);
      // On error, show welcome screen to be safe
      setShowWelcome(true);
    } finally {
      setCheckingTikTok(false);
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

    // Show welcome screen if TikTok not connected or no data
    if (showWelcome && !checkingTikTok) {
      return <WelcomeScreen accountId={selectedAccount.id} accountName={selectedAccount.name} />;
    }

    // Show loading while checking
    if (checkingTikTok) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewView account={selectedAccount} />;
      case 'profit-loss':
        return <ProfitLossView account={selectedAccount} />;
      case 'ads':
        return <AdsView account={selectedAccount} />;
      case 'posts':
        return <PostsView account={selectedAccount} />;
      case 'engagement':
        return <EngagementView account={selectedAccount} />;
      case 'affiliates':
        return <AffiliatesView account={selectedAccount} />;
      case 'sales':
        return <SalesView account={selectedAccount} />;
      default:
        return <OverviewView account={selectedAccount} />;
    }
  };

  // If showing welcome screen, render it full screen
  if (selectedAccount && showWelcome && !checkingTikTok) {
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
