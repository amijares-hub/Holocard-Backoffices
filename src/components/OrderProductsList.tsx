import React from 'react';
import { useOrderItems } from '../hooks/useOrderItems';

interface OrderProductsListProps {
  order: any;
}

export const OrderProductsList: React.FC<OrderProductsListProps> = ({ order }) => {
  const { items, loading, error } = useOrderItems(order);

  if (loading) {
    return (
      <div className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center gap-2 text-zinc-400 text-xs">
        <span className="animate-spin">⏳</span> CARGANDO ARTÍCULOS DEL PEDIDO...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-red-950/30 border border-red-800/50 rounded-lg text-red-400 text-xs">
        ⚠️ ERROR AL CARGAR PRODUCTOS: {error}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="w-full p-6 bg-zinc-950 border border-zinc-800/80 rounded-lg text-center">
        <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
          No hay artículos asociados o registrados para este pedido.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800 flex justify-between items-center">
        <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-2">
          🛍️ PRODUCTOS EN EL PEDIDO ({items.length})
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">
          ID PEDIDO: {order?.id?.slice(0, 8) || 'N/A'}
        </span>
      </div>

      <div className="divide-y divide-zinc-800/60">
        {items.map((item, index) => (
          <div key={item.id || index} className="p-3 flex items-center justify-between hover:bg-zinc-900/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-600 text-xs">📦</span>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">{item.title}</p>
                <p className="text-[10px] text-zinc-500 font-mono">
                  REF: {item.product_id || 'N/A'} | CANTIDAD: <span className="text-zinc-300 font-bold">{item.quantity}</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-bold text-emerald-400 font-mono">
                ${item.total_price.toFixed(2)}
              </p>
              {item.quantity > 1 && (
                <p className="text-[10px] text-zinc-500 font-mono">
                  (${item.unit_price.toFixed(2)} c/u)
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};