import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, ShieldAlert } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verifyAdminAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session?.user) {
          // Verificar rol en metadata o tabla 'profiles/users'
          const role = session.user.user_metadata?.role || session.user.app_metadata?.role;
          
          if (role === 'admin') {
            setIsAdmin(true);
          } else {
            // Consulta de respaldo a la base de datos
            const { data } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle();

            setIsAdmin(data?.role === 'admin');
          }
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Error verificando permisos de administración:", err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    verifyAdminAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] animate-pulse">
          Autenticando Nivel de Acceso...
        </p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h2 className="text-xl font-black text-white uppercase tracking-tight">Acceso Restringido</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          Tu cuenta no cuenta con privilegios de administrador para gestionar la plataforma.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  return <>{children}</>;
};