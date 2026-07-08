/**
 * POS.tsx — Fase 27: Purga Global de Mock Data
 * Inventario migrado de localStorage/inventory-db a Supabase products.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  ShoppingCart,
  Trash2,
  CreditCard,
  Zap,
  Package,
  Plus,
  Minus,
  User,
  QrCode,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  base_stock: number;
  image_url?: string | null;
  categories?: { name: string } | null;
}

interface CartItem extends Product {
  qty: number;
}

// ── Skeleton Grid ──────────────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="glass p-4 rounded-xl border border-white/5 animate-pulse space-y-3">
      <div className="w-10 h-10 bg-accent rounded-lg" />
      <div className="w-3/4 h-3 bg-accent rounded" />
      <div className="w-1/2 h-2.5 bg-accent/50 rounded" />
      <div className="w-1/3 h-2.5 bg-accent/30 rounded" />
    </div>
  );
}

export default function POS() {
  // ── Inventory from Supabase ────────────────────────────────────────────────
  const [inventory, setInventory] = useState<Product[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // ── Cart & Filters ─────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priceFilter, setPriceFilter] = useState(10000);

  // ── Trainer Scanner ────────────────────────────────────────────────────────
  const [scannedUser, setScannedUser] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // ── Fetch products from Supabase ───────────────────────────────────────────
  const fetchInventory = async () => {
    setLoadingInventory(true);
    setInventoryError(null);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, base_price, base_stock, image_url, categories(name)')
        .eq('status', 'active')
        .gt('base_stock', 0)
        .order('name', { ascending: true });

      if (error) throw error;
      setInventory(data || []);
    } catch (err: any) {
      console.error('[POS] Error fetching inventory:', err);
      setInventoryError('No se pudo cargar el inventario.');
    } finally {
      setLoadingInventory(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // ── Derived: unique categories from real data ──────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set<string>();
    inventory.forEach((p) => {
      if (p.categories?.name) cats.add(p.categories.name);
    });
    return ['All', ...Array.from(cats).sort()];
  }, [inventory]);

  // ── Cart operations ────────────────────────────────────────────────────────
  const addToCart = (item: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  };

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((acc, i) => acc + i.base_price * i.qty, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  // ── Filtered inventory ─────────────────────────────────────────────────────
  const filteredInventory = inventory.filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || i.categories?.name === categoryFilter;
    const matchesPrice = (i.base_price || 0) <= priceFilter;
    return matchesSearch && matchesCategory && matchesPrice;
  });

  // ── Trainer scanner ────────────────────────────────────────────────────────
  const scanTrainerID = async () => {
    if (!searchUserQuery) return;
    setIsScanning(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`id.eq.${searchUserQuery},email.ilike.%${searchUserQuery}%`)
      .single();

    if (!error && data) {
      setScannedUser(data);
      setSearchUserQuery('');
    } else {
      alert('TRAINER NOT FOUND: Identity node not detected.');
    }
    setIsScanning(false);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      {/* ── Product Selection ─────────────────────────────────────────────── */}
      <div className="flex-1 space-y-6 flex flex-col min-w-0">
        {/* Filters */}
        <div className="glass p-4 rounded-xl border border-white/5 flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <label htmlFor="pos-search" className="sr-only">Search inventory</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="pos-search"
                type="text"
                placeholder="Buscar producto o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-red-600/50 text-white"
              />
            </div>
            <button
              onClick={fetchInventory}
              title="Recargar inventario"
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-red-600/30 transition-all"
            >
              <RefreshCw className={cn('w-4 h-4 text-red-500', loadingInventory && 'animate-spin')} />
            </button>
          </div>

          <div className="flex gap-4 flex-wrap">
            {/* Category filter — dinámico desde Supabase */}
            <label htmlFor="category-filter" className="sr-only">Categoría</label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none appearance-none cursor-pointer text-white"
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-3">
              <label htmlFor="max-price" className="text-[10px] font-mono text-zinc-500 uppercase">Max $</label>
              <input
                id="max-price"
                type="number"
                title="Precio Máximo"
                placeholder="Price"
                className="bg-transparent border-none p-0 w-20 text-xs focus:ring-0 font-mono text-white"
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setPriceFilter(isNaN(val) ? 10000 : val);
                }}
              />
            </div>

            <span className="text-[10px] text-zinc-600 font-mono self-center">
              {filteredInventory.length} productos
            </span>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
          {loadingInventory ? (
            Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
          ) : inventoryError ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 space-y-4 text-muted-foreground">
              <AlertCircle className="w-10 h-10 text-red-500/50" />
              <p className="text-sm">{inventoryError}</p>
              <button onClick={fetchInventory} className="text-xs text-red-500 hover:underline">
                Reintentar
              </button>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
              <Package className="w-12 h-12 opacity-20" />
              <p className="text-sm">Sin productos disponibles</p>
            </div>
          ) : (
            filteredInventory.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => addToCart(item)}
                className="glass p-4 rounded-xl border border-white/5 text-left hover:border-red-500/30 transition-all group relative"
              >
                <div className="w-10 h-10 bg-zinc-900 rounded-lg mb-3 flex items-center justify-center group-hover:bg-red-500/20 transition-colors overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package className="w-5 h-5 text-zinc-500 group-hover:text-red-500" />
                  )}
                </div>
                <p className="font-bold text-sm truncate text-white">{item.name}</p>
                <p className="text-[10px] text-zinc-500 font-mono mb-1">{item.sku}</p>
                <p className="text-xs text-zinc-400 mb-2 font-mono">{formatCurrency(item.base_price)}</p>
                <p className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-950 px-2 py-0.5 rounded inline-block">
                  STOCK: {item.base_stock}
                </p>
                {cart.find((c) => c.id === item.id) && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    {cart.find((c) => c.id === item.id)!.qty}
                  </div>
                )}
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* ── Cart / Checkout ───────────────────────────────────────────────── */}
      <div className="w-[400px] glass rounded-2xl border border-white/5 flex flex-col overflow-hidden bg-black/40">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold italic flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-red-500" />
            Current Session
          </h2>
          <button
            onClick={() => setCart([])}
            title="Vaciar carrito"
            aria-label="Vaciar carrito"
            className="text-xs text-zinc-500 hover:text-white uppercase font-bold"
          >
            Clear
          </button>
        </div>

        {/* Trainer Scanner */}
        <div className="px-6 py-4 border-b border-white/5 bg-black/20">
          {!scannedUser ? (
            <div className="flex gap-2">
              <label htmlFor="trainer-scan" className="sr-only">Scan Trainer ID or Email</label>
              <input
                id="trainer-scan"
                type="text"
                placeholder="Scan ID or Enter Email..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && scanTrainerID()}
                className="flex-1 bg-zinc-950 border border-white/10 rounded-lg py-2 px-3 text-[10px] font-mono focus:border-cyan-500 outline-none text-white"
              />
              <button
                onClick={scanTrainerID}
                disabled={isScanning}
                title="Scan Trainer"
                aria-label="Scan Trainer"
                className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-all"
              >
                <QrCode className={cn('w-4 h-4', isScanning && 'animate-pulse')} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{scannedUser.email?.split('@')[0]}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-cyan-400/70 uppercase">Lvl {scannedUser.level}</span>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">Tier: {scannedUser.tier}</span>
                </div>
              </div>
              <button onClick={() => setScannedUser(null)} className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase">
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2 opacity-50">
              <ShoppingCart className="w-12 h-12" />
              <p className="font-mono text-sm tracking-widest uppercase">Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-4 bg-zinc-900/40 p-3 rounded-xl border border-white/5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.name}</p>
                  <p className="text-xs text-zinc-500 font-mono">{formatCurrency(item.base_price)} / unit</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-zinc-950 rounded-lg p-1 px-2 border border-white/5">
                    <button onClick={() => updateQty(item.id, -1)} title="Decrease" aria-label="Decrease quantity">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-mono w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} title="Increase" aria-label="Increase quantity">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} title="Remove" aria-label="Remove from cart" className="text-zinc-600 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout */}
        <div className="p-6 border-t border-white/5 bg-zinc-950/50 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Subtotal</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Tax (8%)</span>
              <span className="font-mono">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-white/5">
              <span className="italic">Total</span>
              <span className="text-red-500">{formatCurrency(total)}</span>
            </div>
          </div>

          <button
            disabled={cart.length === 0}
            title="Finalizar transacción"
            aria-label="Finalizar transacción"
            className="w-full py-4 bg-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50 disabled:grayscale text-white"
          >
            <CreditCard className="w-5 h-5" />
            Complete Transaction
          </button>

          <p className="text-[10px] text-center text-zinc-600 font-mono uppercase tracking-widest">
            TX_GATEWAY: SASORI_PAY_V2 • SUPABASE_SYNC: ACTIVE
          </p>
        </div>
      </div>
    </div>
  );
}
