/**
 * Dashboard.tsx — Fase 27: Purga Global de Mock Data
 * Todas las métricas se calculan en tiempo real desde Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Package,
  ArrowUpRight,
  Clock,
  Activity,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────
interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  inventoryValue: number;
}

interface RecentOrder {
  id: string;
  customer_email: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface ChartPoint {
  name: string;
  sales: number;
  orders: number;
}

// ── Skeleton Components ────────────────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <div className="p-6 glass rounded-2xl border border-white/5 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 bg-accent rounded-lg" />
        <div className="w-28 h-4 bg-accent rounded" />
      </div>
      <div className="w-32 h-8 bg-accent rounded mb-2" />
      <div className="w-24 h-3 bg-accent/50 rounded" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-2">
        <div className="w-24 h-4 bg-accent rounded" />
      </div>
      <div className="h-[280px] bg-accent/30 rounded-xl" />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-accent flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="w-3/4 h-3 bg-accent rounded" />
            <div className="w-1/3 h-2.5 bg-accent/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()];
}

function getLast7Days(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const last7Days = getLast7Days();

      // ── Queries paralelas ────────────────────────────────────────────────────
      const [revenueRes, ordersCountRes, customersRes, productsRes, recentRes, chartRes] =
        await Promise.all([
          // Total Revenue: suma de órdenes pagadas/enviadas
          supabase
            .from('orders')
            .select('total_amount')
            .in('status', ['paid', 'shipped', 'completed']),

          // Total Orders: count
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true }),

          // New Customers: count de profiles
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true }),

          // Inventory Value: base_price * base_stock
          supabase
            .from('products')
            .select('base_price, base_stock')
            .eq('status', 'active'),

          // Recent Activity: últimas 5 órdenes
          supabase
            .from('orders')
            .select('id, customer_email, total_amount, status, created_at')
            .order('created_at', { ascending: false })
            .limit(5),

          // Chart: órdenes de los últimos 7 días
          supabase
            .from('orders')
            .select('created_at, total_amount')
            .gte('created_at', last7Days)
            .order('created_at', { ascending: true }),
        ]);

      // ── Calcular métricas ────────────────────────────────────────────────────
      const totalRevenue = (revenueRes.data || []).reduce(
        (sum, o) => sum + (o.total_amount || 0), 0
      );

      const inventoryValue = (productsRes.data || []).reduce(
        (sum, p) => sum + ((p.base_price || 0) * (p.base_stock || 0)), 0
      );

      setMetrics({
        totalRevenue,
        totalOrders: ordersCountRes.count || 0,
        totalCustomers: customersRes.count || 0,
        inventoryValue,
      });

      setRecentOrders(recentRes.data || []);

      // ── Agrupar chart data por día ───────────────────────────────────────────
      const dayMap: Record<string, { sales: number; orders: number }> = {};
      (chartRes.data || []).forEach((o) => {
        const day = getDayLabel(o.created_at);
        if (!dayMap[day]) dayMap[day] = { sales: 0, orders: 0 };
        dayMap[day].sales += o.total_amount || 0;
        dayMap[day].orders += 1;
      });

      setChartData(
        Object.entries(dayMap).map(([name, v]) => ({ name, ...v }))
      );
    } catch (err: any) {
      console.error('[Dashboard] Error fetching data:', err);
      setError('Error al cargar el dashboard. Verifica la conexión con Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Stat cards config (datos dinámicos) ──────────────────────────────────────
  const statCards = metrics
    ? [
        {
          label: 'Total Revenue',
          value: formatCurrency(metrics.totalRevenue),
          icon: TrendingUp,
          sub: 'Órdenes pagadas y enviadas',
        },
        {
          label: 'Total Orders',
          value: metrics.totalOrders.toLocaleString(),
          icon: ShoppingCart,
          sub: 'Todos los estados',
        },
        {
          label: 'Customers',
          value: metrics.totalCustomers.toLocaleString(),
          icon: Users,
          sub: 'Perfiles registrados',
        },
        {
          label: 'Inventory Value',
          value: formatCurrency(metrics.inventoryValue),
          icon: Package,
          sub: 'Productos activos',
        },
      ]
    : [];

  // ── Error state ──────────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500/60" />
        <p className="text-muted-foreground text-sm max-w-sm">{error}</p>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-muted border border-border rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-zinc-500 mt-1">Real-time performance analytics for Sasori Labs.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-muted border border-border rounded-lg text-sm font-medium text-foreground transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button className="px-4 py-2 bg-red-600 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 text-white">
            Real-time Feed
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading
          ? [1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)
          : statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-6 glass rounded-2xl border border-white/5 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <card.icon className="w-12 h-12 text-foreground" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-accent rounded-lg">
                    <card.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{card.value}</h3>
                    <div className="flex items-center gap-1 text-xs mt-1 text-muted-foreground">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>{card.sub}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
      </div>

      {/* Charts + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 glass rounded-2xl border border-white/5 p-6 min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold italic">Revenue Analytics</h2>
              <p className="text-xs text-zinc-500 font-mono">Últimos 7 días — datos reales</p>
            </div>
          </div>

          {loading ? (
            <ChartSkeleton />
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground space-y-2">
              <Package className="w-10 h-10 opacity-30" />
              <p className="text-sm">Sin ventas en los últimos 7 días</p>
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(v: any) => [formatCurrency(v), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="glass rounded-2xl border border-white/5 p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-500" />
            Recent Activity
          </h2>

          {loading ? (
            <ActivitySkeleton />
          ) : recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground space-y-2">
              <Activity className="w-8 h-8 opacity-30" />
              <p className="text-sm text-center">Sin actividad reciente</p>
            </div>
          ) : (
            <div className="space-y-6">
              {recentOrders.map((order, i) => (
                <div key={order.id} className="flex gap-4 relative">
                  {i < recentOrders.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-[1px] bg-border" />
                  )}
                  <div className="w-8 h-8 rounded-full bg-accent flex-shrink-0 flex items-center justify-center border border-border shadow-sm">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium text-foreground">Nueva orden</span>
                      <span className="text-muted-foreground ml-2 font-mono text-xs">
                        #{order.id.slice(0, 8)}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {order.customer_email || 'Cliente'} · {formatCurrency(order.total_amount)}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{timeAgo(order.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="w-full mt-8 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded-lg hover:bg-accent/50">
            Ver todos los logs
          </button>
        </div>
      </div>
    </div>
  );
}
