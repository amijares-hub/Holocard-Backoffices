import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { SessionStore } from './lib/sessionStore';
import { StoreProvider } from './lib/StoreContext';
import { useThemeStore, updateDocumentTheme } from './lib/useThemeStore';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import UsersEngine from './pages/admin/UsersEngine';
import Inventory from './pages/admin/Inventory';
import Orders from './pages/admin/Orders';
import POS from './pages/admin/POS';
import SystemSettings from './pages/admin/SystemSettings';
import Collections from './pages/admin/Collections';
import TaxonomyEngine from './pages/admin/TaxonomyEngine';
import TrackingHub from './pages/admin/TrackingHub';
import PromoEngine from './pages/admin/PromoEngine';
import { AdminLogin } from './pages/admin/AdminLogin';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background transition-colors">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-red-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

function RootRedirect({ session }: { session: any }) {
  if (session) return <Navigate to="/admin" replace />;
  return <Navigate to="/admin/login" replace />;
}

function SessionGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (SessionStore.isExpired()) {
      supabase.auth.signOut();
      SessionStore.clear();
      navigate('/admin/login', { replace: true });
    }
  }, [location.pathname]);

  return null;
}

function AppInner({ session }: { session: any }) {
  return (
    <Router>
      <SessionGuard />

      <Routes>
        <Route path="/" element={<RootRedirect session={session} />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UsersEngine />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="taxonomy" element={<TaxonomyEngine />} />
          <Route path="collections" element={<Collections />} />
          <Route path="orders" element={<Orders />} />
          <Route path="tracking" element={<TrackingHub />} />
          <Route path="pos" element={<POS />} />
          <Route path="promos" element={<PromoEngine />} />
          <Route path="system" element={<SystemSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    updateDocumentTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (SessionStore.isExpired()) {
      supabase.auth.signOut();
      SessionStore.clear();
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch((err) => {
        console.error('Supabase Session Error:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) SessionStore.clear();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <StoreProvider>
      <AppInner session={session} />
    </StoreProvider>
  );
}