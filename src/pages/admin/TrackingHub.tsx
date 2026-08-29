import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Truck, 
  Search, 
  RefreshCw, 
  Plus, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

// Tipos
type Order = {
  id: string;
  customer_email: string;
  customer_phone?: string;
  tracking_number: string | null;
  shipping_carrier: string | null;
  status: string;
  updated_at: string;
};

export default function TrackingHub() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventLoc, setNewEventLoc] = useState('');
  const [newEventStatus, setNewEventStatus] = useState('En tránsito');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch orders with tracking numbers or status paid/shipped/delivered/incident
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_email, tracking_number, shipping_carrier, status, updated_at')
        .or('tracking_number.not.is.null,status.in.(paid,shipped,delivered,incident)')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders for tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCorreos = async () => {
    setSyncing(true);
    try {
      const activeOrders = orders.filter(o => o.status === 'shipped' && o.tracking_number);
      
      if (activeOrders.length === 0) {
        alert("No hay envíos activos (shipped) con número de seguimiento para sincronizar.");
        setSyncing(false);
        return;
      }

      // Llamada a la Edge Function
      const { data, error } = await supabase.functions.invoke('sync-correos-tracking', {
        body: { orders: activeOrders.map(o => ({ id: o.id, tracking_number: o.tracking_number })) }
      });

      if (error) throw error;
      
      alert('Sincronización completada');
      fetchOrders();
    } catch (err) {
      console.error('Error sync correos:', err);
      alert('Error al sincronizar con Correos');
    } finally {
      setSyncing(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error al actualizar estado');
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !newEventDesc) return;

    try {
      const { error } = await supabase
        .from('order_tracking_events')
        .insert({
          order_id: selectedOrderId,
          status: newEventStatus,
          description: newEventDesc,
          location: newEventLoc || null,
        });

      if (error) throw error;
      
      alert('Evento añadido correctamente');
      setIsEventModalOpen(false);
      setNewEventDesc('');
      setNewEventLoc('');
    } catch (err) {
      console.error('Error adding tracking event:', err);
      alert('Error al añadir evento. Verifica si la tabla order_tracking_events existe.');
    }
  };

  const openEventModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsEventModalOpen(true);
  };

  // Filtrado
  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.tracking_number && o.tracking_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.customer_email && o.customer_email.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Métricas
  const activeShipments = orders.filter(o => o.status === 'shipped' || o.status === 'paid').length;
  const inTransit = orders.filter(o => o.status === 'shipped').length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const incidents = orders.filter(o => o.status === 'incident').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-foreground">Logística y Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de envíos y sincronización con Correos</p>
        </div>
        <button
          onClick={handleSyncCorreos}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-xl transition-all font-bold text-sm"
        >
          <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
          {syncing ? 'Sincronizando...' : 'Sync Correos'}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Envíos Activos" value={activeShipments} icon={Package} color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20" />
        <MetricCard title="En Tránsito" value={inTransit} icon={Truck} color="text-yellow-500" bg="bg-yellow-500/10" border="border-yellow-500/20" />
        <MetricCard title="Entregados" value={delivered} icon={CheckCircle2} color="text-green-500" bg="bg-green-500/10" border="border-green-500/20" />
        <MetricCard title="Incidencias / Aduanas" value={incidents} icon={AlertTriangle} color="text-red-500" bg="bg-red-500/10" border="border-red-500/20" />
      </div>

      {/* Main Container */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/20">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por ID, Email o Tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-mono placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="all">Todos los estados</option>
              <option value="paid">Pagado (Pre-envío)</option>
              <option value="shipped">En Tránsito (Shipped)</option>
              <option value="delivered">Entregado</option>
              <option value="incident">Incidencia</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-black tracking-wider">ID Pedido</th>
                <th className="px-6 py-4 font-black tracking-wider">Cliente</th>
                <th className="px-6 py-4 font-black tracking-wider">Tracking Info</th>
                <th className="px-6 py-4 font-black tracking-wider">Estado</th>
                <th className="px-6 py-4 font-black tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando envíos...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No se encontraron envíos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs" title={order.id}>{order.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 truncate max-w-[200px]" title={order.customer_email}>{order.customer_email}</td>
                    <td className="px-6 py-4">
                      {order.tracking_number ? (
                        <div>
                          <div className="font-mono text-xs text-blue-400">{order.tracking_number}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{order.shipping_carrier || 'Correos'}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin tracking</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={cn(
                          "text-xs font-bold px-2 py-1 rounded border appearance-none cursor-pointer",
                          order.status === 'shipped' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                          order.status === 'delivered' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                          order.status === 'incident' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                          "bg-muted/30 text-muted-foreground border-border"
                        )}
                      >
                        <option value="paid" className="bg-background text-foreground">Pagado</option>
                        <option value="shipped" className="bg-background text-foreground">Shipped</option>
                        <option value="delivered" className="bg-background text-foreground">Entregado</option>
                        <option value="incident" className="bg-background text-foreground">Incidencia</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEventModal(order.id)}
                        className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors inline-flex"
                        title="Añadir Evento Manual"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Añadir Evento Manual */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsEventModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-widest text-foreground">Añadir Evento</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-1">ID: {selectedOrderId?.slice(0, 8)}</p>
                </div>
                <button onClick={() => setIsEventModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Estado del Evento</label>
                  <select
                    value={newEventStatus}
                    onChange={(e) => setNewEventStatus(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="En tránsito">En tránsito</option>
                    <option value="Retenido en Aduanas">Retenido en Aduanas</option>
                    <option value="En reparto local">En reparto local</option>
                    <option value="Entregado">Entregado</option>
                    <option value="Incidencia">Incidencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Descripción</label>
                  <input
                    type="text"
                    required
                    value={newEventDesc}
                    onChange={(e) => setNewEventDesc(e.target.value)}
                    placeholder="Ej: Retenido en DUA Canaria..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Ubicación (Opcional)</label>
                  <input
                    type="text"
                    value={newEventLoc}
                    onChange={(e) => setNewEventLoc(e.target.value)}
                    placeholder="Ej: Madrid, CTA"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="flex-1 py-2 px-4 bg-muted/50 hover:bg-muted text-foreground rounded-xl text-sm font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    Guardar Evento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, bg, border }: any) {
  return (
    <div className={cn("p-4 rounded-2xl border flex items-center gap-4", bg, border)}>
      <div className={cn("p-3 rounded-xl bg-background border border-border/50", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{title}</p>
        <p className={cn("text-2xl font-black mt-1", color)}>{value}</p>
      </div>
    </div>
  );
}
