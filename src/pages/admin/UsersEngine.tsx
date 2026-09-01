import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { 
  Users, Crosshair, Search, ShieldAlert, Zap, Gift, Activity, 
  X, Shield, Star, Terminal, Database, RefreshCw, User, Hexagon,
  Package, History, Mail, ShoppingBag, CheckCircle2, UserCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface UserProfileWithStats {
  id: string;
  email: string;
  full_name: string;
  level: number;
  exp: number;
  battle_pass_points: number;
  pokeballs: number;
  tier: string;
  role: 'admin' | 'client';
  total_spent: number;
  total_orders: number;
  last_activity: string;
  captured_count: number;
  shadow_notes?: string;
  phone?: string;
  address_street?: string;
  address_city?: string;
  address_zip?: string;
  address_country?: string;
  is_at_risk?: boolean;
  archetype?: 'Whale' | 'Hunter' | 'Collector' | 'Newbie' | 'Sniper';
}

interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'level_up' | 'capture' | 'purchase' | 'system';
}

export default function UsersEngine() {
  const [users, setUsers] = useState<UserProfileWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredUsers, setFilteredUsers] = useState<UserProfileWithStats[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfileWithStats | null>(null);
  const [selectedUserVault, setSelectedUserVault] = useState<any[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [liveLogs, setLiveLogs] = useState<ActivityLog[]>([]);
  
  // Filtros
  const [filterType, setFilterType] = useState<'all' | 'whales' | 'dormant' | 'active_sub' | 'admins'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edición
  const [editLevel, setEditLevel] = useState(1);
  const [editExp, setEditExp] = useState(0);
  const [editTier, setEditTier] = useState('entrenador');
  const [editRole, setEditRole] = useState<'admin' | 'client'>('client');
  const [editPokeballs, setEditPokeballs] = useState(0);
  const [editShadowNotes, setEditShadowNotes] = useState('');
  const [isConfirmingEdit, setIsConfirmingEdit] = useState(false);

  // Consola / Pestañas de detalle
  const [activeConsoleTab, setActiveConsoleTab] = useState<'mainframe' | 'identity' | 'transactions'>('mainframe');
  const [editPhone, setEditPhone] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editZip, setEditZip] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Regalos / Airdrop
  const [isConfirmingGift, setIsConfirmingGift] = useState(false);
  const [giftTier, setGiftTier] = useState('All');
  const [giftResourceType, setGiftResourceType] = useState<'exp' | 'pokeballs' | 'bp' | 'sku'>('pokeballs');
  const [giftAmount, setGiftAmount] = useState(10);
  const [giftMinLevel, setGiftMinLevel] = useState(0);
  const [giftMaxLevel, setGiftMaxLevel] = useState(100);
  const [giftMinLTV, setGiftMinLTV] = useState(0);
  const [giftInactivity, setGiftInactivity] = useState(0);
  const [giftMessage, setGiftMessage] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);

  useEffect(() => {
    fetchUsers();
    fetchRealLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filterType, searchQuery]);

  // Carga de usuarios reales desde Supabase
  const fetchUsers = async () => {
    setLoading(true);
    
    try {
      let profiles: any[] = [];
      
      // Consultar tabla de perfiles de la base de datos
      const { data: pData, error: pError } = await supabase.from('profiles').select('*');
      if (!pError && pData) {
        profiles = pData;
      } else {
        const { data: fallbackProfiles } = await supabase.from('user_profiles').select('*');
        if (fallbackProfiles) profiles = fallbackProfiles;
      }

      // Consultar la tabla de pedidos para LTV y recuento de compras
      const { data: orders } = await supabase.from('orders').select('user_id, total_amount, status');
      const userOrderStats = new Map<string, { count: number; spent: number }>();

      (orders || []).forEach(o => {
        if (!o.user_id) return;
        const cur = userOrderStats.get(o.user_id) || { count: 0, spent: 0 };
        userOrderStats.set(o.user_id, {
          count: cur.count + 1,
          spent: cur.spent + (Number(o.total_amount) || 0)
        });
      });

      // Mapeo con los datos reales
      const mappedUsers: UserProfileWithStats[] = profiles.map(p => {
        const stats = userOrderStats.get(p.id) || { count: 0, spent: 0 };
        const computedSpent = (p.total_spent && Number(p.total_spent) > 0) ? Number(p.total_spent) : stats.spent;
        const lastActivityDate = new Date(p.updated_at || p.created_at || Date.now());
        const daysSinceActivity = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);

        const isAtRisk = daysSinceActivity > 10 || (p.tier && p.tier !== 'Entrenador' && daysSinceActivity > 7);

        let archetype: any = 'Newbie';
        if (computedSpent > 500) archetype = 'Whale';
        else if ((p.captured_count || 0) > 50) archetype = 'Collector';
        else if ((p.captured_count || 0) > 20) archetype = 'Hunter';
        else if (computedSpent > 0 && (p.level || 1) > 10) archetype = 'Sniper';

        const displayEmail = p.email || p.user_metadata?.email || `id_${p.id.substring(0, 8)}`;
        const displayName = p.full_name || p.nombre || p.name || p.user_metadata?.full_name || displayEmail.split('@')[0];

        return {
          id: p.id,
          email: displayEmail,
          full_name: displayName,
          level: p.level || 1,
          exp: p.points || p.exp || 0,
          battle_pass_points: p.battle_pass_points || p.points || 0,
          pokeballs: p.pokeballs || 0,
          tier: p.tier || 'Entrenador',
          role: p.role === 'admin' ? 'admin' : 'client',
          total_spent: computedSpent,
          total_orders: stats.count,
          last_activity: lastActivityDate.toISOString(),
          captured_count: p.captured_count || 0,
          shadow_notes: p.shadow_notes || '',
          phone: p.phone || p.telefono || p.contact_phone || '',
          address_street: p.address_street || p.direccion || '',
          address_city: p.address_city || p.ciudad || '',
          address_zip: p.address_zip || p.cp || '',
          address_country: p.address_country || p.pais || 'ESP',
          is_at_risk: isAtRisk,
          archetype: archetype
        };
      });

      setUsers(mappedUsers);
    } catch (err: any) {
      console.error('Error al cargar usuarios de Supabase:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Carga de logs reales basados en actividad de pedidos y registros reales
  const fetchRealLogs = async () => {
    try {
      const logsList: ActivityLog[] = [];

      // Obtener últimos pedidos
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5);

      (recentOrders || []).forEach(o => {
        logsList.push({
          id: `ord_${o.id}`,
          timestamp: o.created_at || new Date().toISOString(),
          message: `Pedido #${String(o.id).substring(0, 6)} completado por ${Number(o.total_amount).toFixed(2)}€`,
          type: 'purchase'
        });
      });

      // Obtener últimos registros de usuarios
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      (recentUsers || []).forEach(u => {
        logsList.push({
          id: `usr_${u.id}`,
          timestamp: u.created_at || new Date().toISOString(),
          message: `Nuevo usuario registrado: ${u.full_name || u.email || u.id.substring(0, 8)}`,
          type: 'system'
        });
      });

      // Ordenar por fecha descendente
      logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (logsList.length === 0) {
        logsList.push({
          id: 'init',
          timestamp: new Date().toISOString(),
          message: 'Sistema listo. Conectado a Supabase en tiempo real.',
          type: 'system'
        });
      }

      setLiveLogs(logsList);
    } catch (e) {
      console.warn('Error al cargar el historial de eventos reales:', e);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: 'admin' | 'client') => {
    const newRole = currentRole === 'admin' ? 'client' : 'admin';
    try {
      let { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) {
        await supabase.from('user_profiles').update({ role: newRole }).eq('id', userId);
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
        setEditRole(newRole);
      }
    } catch (err: any) {
      console.error('Error al actualizar rol de usuario:', err);
    }
  };

  const exportAudiences = () => {
    const sanitizeCSV = (str: any) => {
      const val = String(str ?? '').replace(/"/g, '""');
      const safeVal = /^[=+@-]/.test(val) ? `'${val}` : val;
      return `"${safeVal}"`;
    };

    const headers = ['Nombre', 'Email', 'Nivel', 'Tier', 'Rol', 'Pedidos', 'Total Gastado', 'Arquetipo', 'Ultima Actividad'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(u => [
        sanitizeCSV(u.full_name),
        sanitizeCSV(u.email),
        sanitizeCSV(u.level),
        sanitizeCSV(u.tier),
        sanitizeCSV(u.role),
        sanitizeCSV(u.total_orders),
        sanitizeCSV(u.total_spent),
        sanitizeCSV(u.archetype),
        sanitizeCSV(u.last_activity)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `holocard_usuarios_${filterType}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchVault = async (userId: string) => {
    setVaultLoading(true);
    const { data, error } = await supabase
      .from('user_collection')
      .select('*')
      .eq('user_id', userId)
      .limit(10);

    if (!error && data) {
      setSelectedUserVault(data);
    }
    setVaultLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...users];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(q) || 
        u.full_name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    }

    if (filterType === 'whales') {
      filtered = filtered.filter(u => u.total_spent >= 500);
    } else if (filterType === 'dormant') {
      filtered = filtered.filter(u => u.is_at_risk);
    } else if (filterType === 'active_sub') {
      filtered = filtered.filter(u => u.tier.toLowerCase() !== 'entrenador');
    } else if (filterType === 'admins') {
      filtered = filtered.filter(u => u.role === 'admin');
    }

    setFilteredUsers(filtered);
  };

  const fetchUserOrders = async (userId: string) => {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setUserOrders(data);
    }
    setOrdersLoading(false);
  };

  const openGodConsole = (user: UserProfileWithStats) => {
    setSelectedUser(user);
  };

  useEffect(() => {
    if (selectedUser) {
      setEditLevel(selectedUser.level);
      setEditExp(selectedUser.exp);
      setEditTier(selectedUser.tier);
      setEditRole(selectedUser.role);
      setEditPokeballs(selectedUser.pokeballs);
      setEditShadowNotes(selectedUser.shadow_notes || '');
      setEditPhone(selectedUser.phone || '');
      setEditStreet(selectedUser.address_street || '');
      setEditCity(selectedUser.address_city || '');
      setEditZip(selectedUser.address_zip || '');
      setEditCountry(selectedUser.address_country || '');
      fetchVault(selectedUser.id);
      fetchUserOrders(selectedUser.id);
      setActiveConsoleTab('mainframe');
    }
  }, [selectedUser]);

  const saveUserEdits = async () => {
    if (!selectedUser) return;

    const payload = {
      level: editLevel,
      points: editExp,
      tier: editTier,
      role: editRole,
      pokeballs: editPokeballs,
      shadow_notes: editShadowNotes,
      phone: editPhone,
      address_street: editStreet,
      address_city: editCity,
      address_zip: editZip,
      address_country: editCountry
    };

    let { error } = await supabase.from('profiles').update(payload).eq('id', selectedUser.id);
    if (error) {
      await supabase.from('user_profiles').update(payload).eq('id', selectedUser.id);
    }

    setUsers(users.map(u => u.id === selectedUser.id ? {
      ...u,
      ...payload
    } : u));
    
    setIsConfirmingEdit(false);
    setSelectedUser(null);
    fetchRealLogs();
  };

  const calculateAirdropImpact = () => {
    return users.filter(u => {
      const matchesTier = giftTier === 'All' || u.tier === giftTier;
      const matchesLevel = u.level >= giftMinLevel && u.level <= giftMaxLevel;
      const matchesLTV = u.total_spent >= giftMinLTV;
      
      const lastActivityDate = new Date(u.last_activity);
      const daysInactive = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);
      const matchesInactivity = daysInactive >= giftInactivity;

      return matchesTier && matchesLevel && matchesLTV && matchesInactivity;
    });
  };

  const executeMassiveGift = async () => {
    const targets = calculateAirdropImpact();
    if (targets.length === 0) return;

    setIsDeploying(true);
    setDeployProgress(0);

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      try {
        const updateData: any = {};
        if (giftResourceType === 'exp') updateData.points = target.exp + giftAmount;
        if (giftResourceType === 'pokeballs') updateData.pokeballs = target.pokeballs + giftAmount;
        if (giftResourceType === 'bp') updateData.points = (target.battle_pass_points || 0) + giftAmount;

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', target.id);

        if (updateError) {
          await supabase.from('user_profiles').update(updateData).eq('id', target.id);
        }
      } catch (rowErr) {
        console.warn(`[Airdrop] Error actualizando usuario ${target.id}:`, rowErr);
      }

      setDeployProgress(Math.round(((i + 1) / targets.length) * 100));
    }

    await fetchUsers();
    setIsDeploying(false);
    setIsConfirmingGift(false);
    fetchRealLogs();
  };

  const totalRevenue = users.reduce((acc, u) => acc + (u.total_spent || 0), 0);
  const totalWhales = users.filter(u => u.total_spent >= 500).length;

  return (
    <div className="space-y-8 pb-20 font-sans text-zinc-200">
      
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight uppercase flex items-center gap-3">
            <Users className="w-8 h-8 text-zinc-300" />
            CRM & Users Engine
          </h1>
          <p className="text-zinc-400 font-mono text-xs mt-1 uppercase tracking-widest">
            Gestión de Usuarios y Clientes Registrados en Tiempo Real
          </p>
        </div>

        <button
          onClick={() => { fetchUsers(); fetchRealLogs(); }}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar Base de Datos
        </button>
      </div>

      {/* DASHBOARD DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#12141c] border border-zinc-800 p-6 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="relative z-10">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Ingresos LTV Totales</p>
            <p className="text-3xl font-black text-zinc-100">{totalRevenue.toFixed(2)}€</p>
            <div className="mt-4 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-400 w-[85%]"></div>
            </div>
          </div>
        </div>

        <div className="bg-[#12141c] border border-zinc-800 p-6 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="relative z-10">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Whales / Clientes VIP</p>
            <p className="text-3xl font-black text-amber-400">{totalWhales}</p>
            <p className="text-[10px] text-zinc-500 font-mono mt-2">Gasto acumulado {'>'} 500€</p>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 bg-[#12141c] border border-zinc-800 p-6 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Directorio Registrado</p>
              <p className="text-2xl font-black text-zinc-100">{users.length} Usuarios Activos</p>
              <p className="text-[11px] text-zinc-400 mt-1">Sincronizado con Supabase Auth & Profiles</p>
            </div>
            <button 
              onClick={exportAudiences}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95"
            >
              <Database className="w-4 h-4 text-zinc-300" />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* TABLA PRINCIPAL CRM */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#12141c] border border-zinc-800 rounded-2xl shadow-xl">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {(['all', 'whales', 'dormant', 'active_sub', 'admins'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                    filterType === t 
                      ? "bg-zinc-700 text-white shadow-md border border-zinc-600" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  )}
                >
                  {t === 'all' ? 'Todos' : t === 'whales' ? 'Whales' : t === 'dormant' ? 'En Riesgo' : t === 'active_sub' ? 'Suscritos' : 'Admins'}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Buscar por Nombre / Email / ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none w-full"
              />
            </div>
          </div>

          {/* TABLA DE USUARIOS REALES */}
          <div className="bg-[#12141c] border border-zinc-800 rounded-2xl overflow-hidden overflow-x-auto shadow-2xl">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-zinc-800/60 border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-400 font-black">
                  <th className="p-4">Usuario / Cliente</th>
                  <th className="p-4 text-center">Rol / Nivel</th>
                  <th className="p-4 text-center">Pedidos</th>
                  <th className="p-4 text-right">LTV Real</th>
                  <th className="p-4 text-center">HoloBalls</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      <td className="p-4"><div className="h-10 w-48 bg-zinc-800/60 rounded-xl" /></td>
                      <td className="p-4 text-center"><div className="h-8 w-20 mx-auto bg-zinc-800/60 rounded-xl" /></td>
                      <td className="p-4 text-center"><div className="h-6 w-12 mx-auto bg-zinc-800/60 rounded-xl" /></td>
                      <td className="p-4 text-right"><div className="h-6 w-16 ml-auto bg-zinc-800/60 rounded-xl" /></td>
                      <td className="p-4 text-center"><div className="h-6 w-16 mx-auto bg-zinc-800/60 rounded-full" /></td>
                      <td className="p-4 text-center"><div className="h-8 w-24 mx-auto bg-zinc-800/60 rounded-xl" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-zinc-500 font-bold uppercase tracking-widest">
                      No hay usuarios que coincidan con la búsqueda
                    </td>
                  </tr>
                ) : filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className={cn(
                      "group hover:bg-zinc-800/40 transition-colors cursor-pointer",
                      user.is_at_risk && "bg-amber-950/10 border-l-2 border-l-amber-500"
                    )}
                    onClick={() => openGodConsole(user)}
                  >
                    {/* Usuario / Email */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-200 font-black text-sm shrink-0">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors truncate">
                            {user.full_name}
                          </p>
                          <p className="text-[11px] font-mono text-zinc-400 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Rol y Nivel */}
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          user.role === 'admin' 
                            ? 'bg-amber-400/10 text-amber-400 border-amber-400/30' 
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Cliente'}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-bold">Lvl {user.level} • {user.tier}</span>
                      </div>
                    </td>

                    {/* Pedidos */}
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800/80 rounded-lg border border-zinc-700/50 text-zinc-200 font-bold">
                        <ShoppingBag className="w-3 h-3 text-zinc-400" />
                        {user.total_orders}
                      </span>
                    </td>

                    {/* LTV Real */}
                    <td className="p-4 text-right font-black text-zinc-100">
                      {user.total_spent.toFixed(2)}€
                    </td>

                    {/* HoloBalls */}
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800/80 border border-zinc-700/60 rounded-full">
                        <Hexagon className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-black text-amber-400">{user.pokeballs}</span>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => toggleUserRole(user.id, user.role)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
                          title="Cambiar permisos"
                        >
                          {user.role === 'admin' ? 'Hacer Cliente' : 'Hacer Admin'}
                        </button>
                        <button 
                          onClick={() => openGodConsole(user)}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700"
                          title="Abrir Ficha"
                        >
                          <Crosshair className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FEED Y RECURSOS */}
        <div className="space-y-6">
          
          {/* FEED REAL DE ACTIVIDAD */}
          <div className="bg-[#12141c] border border-zinc-800 rounded-2xl p-6 relative overflow-hidden h-[360px] flex flex-col shadow-xl">
            <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-4">
              <Terminal className="w-5 h-5 text-zinc-300" />
              <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest">Actividad Reciente</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px] custom-scrollbar pr-2">
              {liveLogs.map(log => (
                <div key={log.id} className="flex gap-2.5">
                  <span className="text-zinc-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={cn(
                    "flex-1 break-words font-medium",
                    log.type === 'system' ? "text-zinc-300" :
                    log.type === 'purchase' ? "text-amber-400" : "text-zinc-400"
                  )}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* MÓDULO AIRDROP */}
          <div className="bg-[#12141c] border border-zinc-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-xl border border-zinc-700">
                  <Gift className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest">Airdrop Pro</h3>
                  <p className="text-[10px] text-zinc-400 font-mono">Inyección masiva de recursos</p>
                </div>
              </div>
            </div>

            {isDeploying ? (
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Enviando recursos...</p>
                  <span className="text-sm font-mono text-amber-400 font-bold">{deployProgress}%</span>
                </div>
                <div className="h-3 bg-zinc-900 rounded-full border border-zinc-800 overflow-hidden p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${deployProgress}%` }}
                    className="h-full bg-amber-400 rounded-full shadow-md" 
                  />
                </div>
              </div>
            ) : isConfirmingGift ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <ShieldAlert className="w-4 h-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Confirmar Envío</p>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Vas a enviar <span className="text-amber-400 font-bold">{giftAmount} {giftResourceType.toUpperCase()}</span> a 
                    <span className="text-white font-bold"> {calculateAirdropImpact().length} usuarios</span>.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsConfirmingGift(false)} 
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={executeMassiveGift} 
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs uppercase tracking-wider"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-zinc-400 uppercase">Recurso</label>
                    <select 
                      value={giftResourceType} 
                      onChange={e => setGiftResourceType(e.target.value as any)} 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-bold text-zinc-200 outline-none"
                    >
                      <option value="pokeballs">HoloBalls</option>
                      <option value="exp">Experiencia (EXP)</option>
                      <option value="bp">Puntos BP</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-zinc-400 uppercase">Cantidad</label>
                    <input 
                      type="number" 
                      value={giftAmount} 
                      onChange={e => setGiftAmount(parseInt(e.target.value) || 0)} 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-bold text-zinc-200 outline-none" 
                    />
                  </div>
                </div>

                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Destinatarios</span>
                  <span className="text-xs font-black text-amber-400">{calculateAirdropImpact().length} Usuarios</span>
                </div>

                <button 
                  onClick={() => setIsConfirmingGift(true)}
                  disabled={calculateAirdropImpact().length === 0}
                  className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 font-bold uppercase tracking-wider text-xs rounded-xl border border-zinc-700 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  Lanzar Airdrop
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* GOD CONSOLE / PANEL DETALLE CRM */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#12141c] border-l border-zinc-800 z-[110] shadow-2xl flex flex-col text-zinc-200"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-zinc-800 rounded-xl border border-zinc-700">
                    <UserCheck className="w-5 h-5 text-zinc-200" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100">{selectedUser.full_name}</h2>
                    <p className="text-[11px] font-mono text-zinc-400">{selectedUser.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)} 
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-xl border border-zinc-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pestañas */}
              <div className="flex border-b border-zinc-800 bg-zinc-900/30">
                {[
                  { id: 'mainframe', label: 'Parámetros', icon: Activity },
                  { id: 'identity', label: 'Datos Personales', icon: Shield },
                  { id: 'transactions', label: 'Pedidos', icon: History }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveConsoleTab(tab.id as any)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] font-bold uppercase tracking-wider transition-all relative border-b-2",
                      activeConsoleTab === tab.id ? "text-zinc-100 border-amber-400 bg-zinc-800/40" : "text-zinc-400 border-transparent hover:text-zinc-200"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Contenido Pestañas */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {activeConsoleTab === 'mainframe' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
                        Configuración de Nivel y Rol
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-400 uppercase">Nivel</label>
                          <input 
                            type="number" 
                            value={editLevel} 
                            onChange={e => setEditLevel(parseInt(e.target.value) || 1)} 
                            className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm font-black text-zinc-100 text-center outline-none" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-zinc-400 uppercase">Puntos EXP</label>
                          <input 
                            type="number" 
                            value={editExp} 
                            onChange={e => setEditExp(parseInt(e.target.value) || 0)} 
                            className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm font-black text-zinc-100 text-center outline-none" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-400 uppercase">Tier / Suscripción</label>
                          <select 
                            value={editTier} 
                            onChange={e => setEditTier(e.target.value)} 
                            className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-bold text-zinc-100 outline-none"
                          >
                            <option value="Entrenador">Entrenador</option>
                            <option value="Elite">Elite</option>
                            <option value="Apex">Apex</option>
                            <option value="Legend">Legend</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-zinc-400 uppercase">Rol de Usuario</label>
                          <select 
                            value={editRole} 
                            onChange={e => setEditRole(e.target.value as any)} 
                            className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-bold text-zinc-100 outline-none"
                          >
                            <option value="client">Cliente</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-zinc-400 uppercase">Notas Privadas (CRM Admin)</label>
                        <textarea 
                          value={editShadowNotes}
                          onChange={(e) => setEditShadowNotes(e.target.value)}
                          placeholder="Escribe observaciones internas del cliente..."
                          className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 outline-none resize-none custom-scrollbar"
                        />
                      </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Hexagon className="w-7 h-7 text-amber-400" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-zinc-100">HoloBalls</p>
                          <p className="text-[10px] text-zinc-400">Saldo actual</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1 border border-zinc-700">
                        <button onClick={() => setEditPokeballs(Math.max(0, editPokeballs - 1))} className="w-7 h-7 flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-200 font-bold">-</button>
                        <span className="w-8 text-center font-black text-sm text-zinc-100">{editPokeballs}</span>
                        <button onClick={() => setEditPokeballs(editPokeballs + 1)} className="w-7 h-7 flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-200 font-bold">+</button>
                      </div>
                    </div>
                  </div>
                )}

                {activeConsoleTab === 'identity' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
                      Información de Contacto
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-mono text-zinc-400 uppercase">Teléfono de Contacto</label>
                        <input 
                          type="text" 
                          value={editPhone} 
                          onChange={e => setEditPhone(e.target.value)} 
                          className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 outline-none" 
                          placeholder="+34 600 000 000" 
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-zinc-400 uppercase">Dirección / Calle</label>
                        <input 
                          type="text" 
                          value={editStreet} 
                          onChange={e => setEditStreet(e.target.value)} 
                          className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 outline-none" 
                          placeholder="Calle, Número, Piso..." 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-400 uppercase">Ciudad</label>
                          <input 
                            type="text" 
                            value={editCity} 
                            onChange={e => setEditCity(e.target.value)} 
                            className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 outline-none" 
                            placeholder="Ciudad" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-zinc-400 uppercase">Código Postal</label>
                          <input 
                            type="text" 
                            value={editZip} 
                            onChange={e => setEditZip(e.target.value)} 
                            className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 outline-none" 
                            placeholder="38000" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeConsoleTab === 'transactions' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
                      Historial de Pedidos
                    </h3>

                    {ordersLoading ? (
                      <p className="text-center py-8 text-xs text-zinc-500 font-bold uppercase tracking-wider">Cargando pedidos...</p>
                    ) : userOrders.length > 0 ? (
                      <div className="space-y-2.5">
                        {userOrders.map((order) => (
                          <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-zinc-100">
                                Pedido #{order.id.substring(0, 8)}
                              </p>
                              <p className="text-[10px] text-zinc-400 font-mono">
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-amber-400">{Number(order.total_amount).toFixed(2)}€</p>
                              <span className="text-[9px] font-bold uppercase text-zinc-400">{order.status || 'Completado'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-xs text-zinc-500 font-bold uppercase tracking-wider">Sin compras registradas</p>
                    )}
                  </div>
                )}

              </div>

              {/* Botón Guardar */}
              <div className="p-6 border-t border-zinc-800 bg-zinc-900/60">
                <button 
                  onClick={saveUserEdits}
                  className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold uppercase tracking-wider text-xs rounded-xl border border-zinc-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  Guardar Cambios del Usuario
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}