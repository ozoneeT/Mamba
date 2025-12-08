import { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { useShopStore } from './store/useShopStore';

function AppContent() {
  const { user, loading } = useAuth();
  const fetchShopData = useShopStore(state => state.fetchShopData);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (user && !hasFetched.current) {
      console.log('[App] Fetching shop data on initial load');
      fetchShopData(user.id);
      hasFetched.current = true;
    }
  }, [user?.id]); // Only depend on user.id, not the function

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
