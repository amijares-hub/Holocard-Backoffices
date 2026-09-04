import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Tag, Plus, Trash2, AlertCircle, 
  UserCheck, RefreshCw, X, Gift, Truck
} from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping';
  discount_value: number;
  min_order_amount: number;
  max_uses_total: number | null;
  max_uses_per_user: number;
  current_uses_count: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  creator_id: string | null;
  creator_benefit_type: 'commission_percentage' | 'fixed_credit' | 'reward_points' | null;
  creator_benefit_value: number;
  profiles?: { email: string };
}

export function PromoEngine() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount' | 'free_shipping',
    discount_value: 10,
    min_order_amount: 0,
    max_uses_total: '' as any,
    max_uses_per_user: 1,
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    is_active: true,
    creator_id: '',
    creator_benefit_type: '' as any,
    creator_benefit_value: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) return;

      const [promoRes, creatorsRes] = await Promise.all([
        supabase
          .from('promo_codes')
          .select('*, profiles:creator_id(email)')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, email')
      ]);

      if (promoRes.error) throw promoRes.error;
      setPromos(promoRes.data || []);
      setCreators(creatorsRes.data || []);
    } catch (err: any) {
      console.error("Error cargando códigos de promoción:", err);
      setError(err.message || 'Error al conectar con la base de datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!supabase) throw new Error("Cliente Supabase no disponible");

      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description,
        discount_type: form.discount_type,
        discount_value: form.discount_type === 'free_shipping' ? 0 : Number(form.discount_value),
        min_order_amount: Number(form.min_order_amount) || 0,
        max_uses_total: form.max_uses_total ? Number(form.max_uses_total) : null,
        max_uses_per_user: Number(form.max_uses_per_user) || 1,
        start_date: new Date(form.start_date).toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        is_active: form.is_active,
        creator_id: form.creator_id || null,
        creator_benefit_type: form.creator_benefit_type || null,
        creator_benefit_value: form.creator_benefit_type ? Number(form.creator_benefit_value) : 0
      };

      const { error: insertError } = await supabase.from('promo_codes').insert([payload]);
      if (insertError) throw insertError;

      setIsModalOpen(false);
      setForm({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_amount: 0,
        max_uses_total: '',
        max_uses_per_user: 1,
        start_date: new Date().toISOString().slice(0, 16),
        end_date: '',
        is_active: true,
        creator_id: '',
        creator_benefit_type: '',
        creator_benefit_value: 0
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al crear el código promocional');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('promo_codes').update({ is_active: !currentStatus }).eq('id', id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deletePromo = async (id: string) => {
    if (!confirm('¿Deseas eliminar permanentemente este código promocional?')) return;
    try {
      await supabase.from('promo_codes').delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-black uppercase text-yellow-400 tracking-widest flex items-center gap-2">
            <Tag className="w-4 h-4" /> Marketing & Afiliados
          </span>
          <h1 className="text-3xl font-black uppercase text-white tracking-tight mt-1">
            Gestor de Códigos Promocionales
          </h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-black px-5 py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-yellow-400/20"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Crear Nuevo Código
        </button>
      </div>

      <div className="bg-[#0a1628] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#030c1a] border-b border-white/10 text-gray-400 uppercase font-black text-[10px] tracking-widest">
              <tr>
                <th className="p-4">Código / Descripción</th>
                <th className="p-4">Efecto Cliente</th>
                <th className="p-4">Creador / Afiliado</th>
                <th className="p-4">Beneficio Creador</th>
                <th className="p-4">Usos</th>
                <th className="p-4">Vencimiento</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-yellow-400" />
                  </td>
                </tr>
              ) : promos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 font-bold uppercase">
                    No hay códigos promocionales registrados.
                  </td>
                </tr>
              ) : (
                promos.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-mono font-bold text-white">
                      <span className="text-yellow-400 text-sm">{p.code}</span>
                      {p.description && <p className="text-[10px] text-gray-500 font-sans font-normal">{p.description}</p>}
                    </td>
                    <td className="p-4 font-bold">
                      {p.discount_type === 'percentage' && <span className="text-emerald-400">{p.discount_value}% Descuento</span>}
                      {p.discount_type === 'fixed_amount' && <span className="text-emerald-400">{p.discount_value}€ Descuento</span>}
                      {p.discount_type === 'free_shipping' && (
                        <span className="text-yellow-400 flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" /> Envío Gratis (0€)
                        </span>
                      )}
                      {p.min_order_amount > 0 && <span className="block text-[9px] text-gray-500">Mín. {p.min_order_amount}€</span>}
                    </td>
                    <td className="p-4">
                      {p.profiles ? (
                        <span className="text-white font-bold flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                          {p.profiles.email}
                        </span>
                      ) : (
                        <span className="text-gray-600 font-mono">Público / Ninguno</span>
                      )}
                    </td>
                    <td className="p-4">
                      {p.creator_benefit_type ? (
                        <span className="text-blue-400 font-bold">
                          {p.creator_benefit_type === 'commission_percentage' && `${p.creator_benefit_value}% Comisión`}
                          {p.creator_benefit_type === 'fixed_credit' && `${p.creator_benefit_value}€ Crédito`}
                          {p.creator_benefit_type === 'reward_points' && `${p.creator_benefit_value} Puntos`}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="p-4 font-mono">
                      {p.current_uses_count} / {p.max_uses_total ?? '∞'}
                    </td>
                    <td className="p-4 text-[10px] font-mono">
                      {p.end_date ? new Date(p.end_date).toLocaleDateString() : 'Sin expiración'}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleStatus(p.id, p.is_active)}
                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          p.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {p.is_active ? 'Activo' : 'Pausado'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => deletePromo(p.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a1628] border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" /> Crear Código Promocional
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 font-bold uppercase block mb-1">Código Promocional</label>
                  <input
                    required
                    type="text"
                    placeholder="EJ: HOLO10 / ENVIOFREE"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full bg-[#030c1a] border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono uppercase focus:border-yellow-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 font-bold uppercase block mb-1">Descripción Interna</label>
                  <input
                    type="text"
                    placeholder="Ej. Campaña envío gratis o código creador"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-[#030c1a] border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-yellow-400 outline-none"
                  />
                </div>
              </div>

              <div className="bg-[#030c1a] border border-white/5 p-4 rounded-2xl space-y-3">
                <span className="text-yellow-400 font-black uppercase text-[10px] tracking-wider block">Efecto / Beneficio para el Cliente</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-gray-400 block mb-1">Tipo de Efecto</label>
                    <select
                      value={form.discount_type}
                      onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })}
                      className="w-full bg-[#0a1628] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed_amount">Fijo (€)</option>
                      <option value="free_shipping">🚚 Envío Gratis</option>
                    </select>
                  </div>

                  {form.discount_type !== 'free_shipping' ? (
                    <div>
                      <label className="text-gray-400 block mb-1">Valor Descuento</label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.discount_value}
                        onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#0a1628] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-gray-400 block mb-1">Gastos de Envío</label>
                      <input
                        type="text"
                        disabled
                        value="0.00 € (Bonificado)"
                        className="w-full bg-[#0a1628]/50 border border-white/5 rounded-xl px-3 py-2 text-yellow-400 font-bold outline-none cursor-not-allowed"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-gray-400 block mb-1">Pedido Mínimo (€)</label>
                    <input
                      type="number"
                      value={form.min_order_amount}
                      onChange={(e) => setForm({ ...form, min_order_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#0a1628] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#030c1a] border border-white/5 p-4 rounded-2xl space-y-3">
                <span className="text-blue-400 font-black uppercase text-[10px] tracking-wider block">Asignar Creador / Afiliado (Opcional)</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-gray-400 block mb-1">Creador Asignado</label>
                    <select
                      value={form.creator_id}
                      onChange={(e) => setForm({ ...form, creator_id: e.target.value })}
                      className="w-full bg-[#0a1628] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="">Ninguno (Código Público)</option>
                      {creators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Tipo Comisión Creador</label>
                    <select
                      value={form.creator_benefit_type}
                      onChange={(e) => setForm({ ...form, creator_benefit_type: e.target.value as any })}
                      className="w-full bg-[#0a1628] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="">Sin Beneficio</option>
                      <option value="commission_percentage">% Comisión por Venta</option>
                      <option value="fixed_credit">€ Fijos por Uso</option>
                      <option value="reward_points">Puntos de Recompensa</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Valor Beneficio Creador</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.creator_benefit_value}
                      onChange={(e) => setForm({ ...form, creator_benefit_value: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#0a1628] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Usos Totales Máximos</label>
                  <input
                    type="number"
                    placeholder="Vacío = Ilimitado"
                    value={form.max_uses_total}
                    onChange={(e) => setForm({ ...form, max_uses_total: e.target.value })}
                    className="w-full bg-[#030c1a] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Usos Máximos por Usuario</label>
                  <input
                    type="number"
                    value={form.max_uses_per_user}
                    onChange={(e) => setForm({ ...form, max_uses_per_user: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#030c1a] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Fecha de Vencimiento</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full bg-[#030c1a] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-3 rounded-xl uppercase tracking-wider text-xs transition-all disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar y Activar Código'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PromoEngine;