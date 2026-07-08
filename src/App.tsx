/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HoloCards Admin Core — Back-Office PWA
 * Fase 23: Cuartel General Admin
 * Fase 26: Optimización de Sesión (SessionGuard + auto-logout)
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { SessionStore } from './lib/sessionStore';
import { StoreProvider } from './lib/StoreContext';
import { useThemeStore, updateDocumentTheme } from './lib/useThemeStore';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Inventory from './pages/admin/InventoryV2';
import Orders from './pages/admin/Orders';
import POS from './pages/admin/POS';
import UsersEngine from './pages/admin/UsersEngine';
import SystemSettings from './pages/admin/SystemSettings';
import ChatbotSettings from './pages/admin/ChatbotSettings';
import HomeMainframe from './pages/admin/HomeMainframe';
import Collections from './pages/admin/Collections';
import { AdminLogin } from './pages/admin/AdminLogin';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';

// ─── Loading Screen ───────────────────────────────────────────────────────────
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

// ─── Root Redirect ────────────────────────────────────────────────────────────
function RootRedirect({ session }: { session: any }) {
  if (session) return <Navigate to="/admin" replace />;
  return <Navigate to="/admin/login" replace />;
}

// ─── Session Guard (Fase 26) ──────────────────────────────────────────────────
// Componente silencioso que vigila la expiración custom en cada cambio de ruta.
// Si el timestamp guardado en localStorage ha vencido, fuerza el logout.
function SessionGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (SessionStore.isExpired()) {
      console.info('[HC Admin] Sesión expirada — ejecutando auto-logout.');
      supabase.auth.signOut();
      SessionStore.clear();
      navigate('/admin/login', { replace: true });
    }
  }, [location.pathname]);

  return null; // No renderiza nada — solo lógica
}

// ─── App Inner ────────────────────────────────────────────────────────────────
function AppInner({ session }: { session: any }) {
  return (
    <Router>
      {/* Guard silencioso — vigila expiración en cada ruta */}
      <SessionGuard />

      <Routes>
        {/* Root → Admin Login or Admin Dashboard */}
        <Route path="/" element={<RootRedirect session={session} />} />

        {/* Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin — Protected */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="home" element={<HomeMainframe />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="collections" element={<Collections />} />
          <Route path="orders" element={<Orders />} />
          <Route path="pos" element={<POS />} />
          <Route path="users" element={<UsersEngine />} />
          <Route path="chatbot" element={<ChatbotSettings />} />
          <Route path="system" element={<SystemSettings />} />
        </Route>

        {/* Catch-all → Admin Login */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </Router>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    updateDocumentTheme(theme);
  }, [theme]);

  useEffect(() => {
    // Verificar expiración custom al arrancar la app
    if (SessionStore.isExpired()) {
      console.info('[HC Admin] Sesión expirada al arrancar — limpiando.');
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
      // Si el evento es logout, limpiar también el expiry custom
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
