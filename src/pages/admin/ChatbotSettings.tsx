import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Save, Plus, X, Trash2, ShieldCheck, 
  HelpCircle, Sparkles, RefreshCw, Palette, HelpCircleIcon 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatbotConfig {
  id: string;
  is_active: boolean;
  bot_name: string;
  welcome_message: string;
  primary_color: string;
  quick_replies: string[];
  updated_at?: string;
}

export default function ChatbotSettings() {
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('chatbot_config')
        .select('*')
        .single();

      if (fetchErr) {
        throw fetchErr;
      }
      if (data) {
        setConfig(data);
      }
    } catch (err: any) {
      console.error('Error fetching chatbot config:', err);
      setError('No se pudo cargar la configuración del chatbot.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateErr } = await supabase
        .from('chatbot_config')
        .update({
          is_active: config.is_active,
          bot_name: config.bot_name,
          welcome_message: config.welcome_message,
          primary_color: config.primary_color,
          quick_replies: config.quick_replies,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (updateErr) throw updateErr;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating chatbot config:', err);
      setError('Error al guardar los cambios en la base de datos.');
    } finally {
      setSaving(false);
    }
  };

  const addQuickReply = () => {
    if (!config || !newReply.trim()) return;
    if (config.quick_replies.includes(newReply.trim())) {
      setError('Esta respuesta rápida ya existe.');
      return;
    }
    setConfig({
      ...config,
      quick_replies: [...config.quick_replies, newReply.trim()]
    });
    setNewReply('');
    setError(null);
  };

  const removeQuickReply = (indexToRemove: number) => {
    if (!config) return;
    setConfig({
      ...config,
      quick_replies: config.quick_replies.filter((_, index) => index !== indexToRemove)
    });
  };

  if (loading) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Sincronizando con la central del Chatbot...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4 bg-red-950/10 border border-red-500/20 rounded-[2rem]">
        <HelpCircleIcon className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-2xl font-black uppercase text-white italic">Error de Inicialización</h2>
        <p className="text-sm text-zinc-400">
          La tabla `chatbot_config` no posee ninguna fila de configuración válida en Supabase.
        </p>
        <button onClick={fetchConfig} className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all">
          Reintentar Conexión
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter text-foreground mb-2 italic">Chatbot Intel Hub</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> AI Support Core // Node Status: Online
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* FORM PANEL */}
        <form onSubmit={handleSave} className="lg:col-span-8 space-y-8">
          <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden transition-all shadow-2xl">
            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-500 border border-indigo-500/20">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-foreground">Configuración General</h2>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Define el comportamiento básico de tu asistente</p>
                </div>
              </div>

              {/* IS ACTIVE TOGGLE */}
              <div className="flex items-center gap-4 bg-black/40 px-4 py-2.5 rounded-2xl border border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {config.is_active ? 'Activo en Tienda' : 'Inactivo'}
                </span>
                <button 
                  type="button"
                  onClick={() => setConfig({ ...config, is_active: !config.is_active })}
                  title={config.is_active ? "Desactivar Chatbot" : "Activar Chatbot"}
                  className={cn(
                    "w-14 h-7 rounded-full relative transition-all shadow-inner",
                    config.is_active ? "bg-indigo-600" : "bg-zinc-800"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md", 
                    config.is_active ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* GRID: NAME & COLOR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label htmlFor="bot-name" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block ml-1">
                    Nombre del Bot
                  </label>
                  <input 
                    id="bot-name"
                    type="text"
                    required
                    value={config.bot_name}
                    onChange={(e) => setConfig({ ...config, bot_name: e.target.value })}
                    placeholder="ej. HoloBot"
                    className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-indigo-500 outline-none transition-all font-bold italic uppercase"
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="bot-color" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block ml-1">
                    Color Primario (Branding)
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Palette className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        id="bot-color"
                        type="text"
                        required
                        value={config.primary_color}
                        onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                        placeholder="#EF4444"
                        className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:border-indigo-500 outline-none transition-all font-mono"
                      />
                    </div>
                    <div className="relative w-14 h-14 rounded-2xl border border-white/10 overflow-hidden shrink-0">
                      <input 
                        type="color"
                        title="Seleccionar color de marca"
                        value={config.primary_color}
                        onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                        className="absolute inset-[-8px] w-[calc(100%+16px)] h-[calc(100%+16px)] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* WELCOME MESSAGE */}
              <div className="space-y-3">
                <label htmlFor="bot-welcome" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block ml-1">
                  Mensaje de Bienvenida
                </label>
                <textarea 
                  id="bot-welcome"
                  required
                  rows={3}
                  value={config.welcome_message}
                  onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
                  placeholder="¡Hola, Comandante! ¿En qué puedo ayudarte hoy?"
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* QUICK REPLIES MANAGER */}
              <div className="space-y-4 pt-6 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">
                      Respuestas Rápidas (FAQ)
                    </h3>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-tighter mt-1">
                      Preguntas más frecuentes que el usuario podrá pulsar
                    </p>
                  </div>
                </div>

                {/* Tag List */}
                <div className="flex flex-wrap gap-2.5 min-h-[50px] p-4 bg-black/40 rounded-3xl border border-white/5">
                  <AnimatePresence>
                    {config.quick_replies.length === 0 ? (
                      <span className="text-[10px] text-zinc-600 uppercase font-mono italic p-1">
                        No hay respuestas rápidas configuradas. Agrega una abajo.
                      </span>
                    ) : (
                      config.quick_replies.map((reply, idx) => (
                        <motion.div 
                          key={reply}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-bold"
                        >
                          <span>{reply}</span>
                          <button 
                            type="button"
                            onClick={() => removeQuickReply(idx)}
                            className="p-0.5 hover:bg-indigo-500/20 rounded-md text-indigo-400 hover:text-white transition-colors"
                            title="Eliminar pregunta"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {/* Add Reply Bar */}
                <div className="flex gap-3">
                  <input 
                    type="text"
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addQuickReply();
                      }
                    }}
                    placeholder="Escribe una pregunta rápida (ej. ¿Cuáles son los horarios?)"
                    className="flex-1 bg-black border border-white/10 rounded-xl py-3 px-5 text-xs text-white focus:border-indigo-500 outline-none"
                  />
                  <button 
                    type="button"
                    onClick={addQuickReply}
                    className="px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* SIDE PANEL: STATUS & SAVE */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-card border border-border rounded-[2.5rem] p-8 space-y-8 transition-all shadow-2xl relative overflow-hidden group">
            <div className="absolute top-[-50px] right-[-50px] p-10 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
              <MessageSquare className="w-56 h-56 text-indigo-500" />
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Deployment Center</h3>
              <RefreshCw className={cn("w-3.5 h-3.5 text-indigo-600", saving && "animate-spin")} />
            </div>

            <button 
              type="submit"
              disabled={saving}
              onClick={handleSave}
              className="w-full py-5 bg-white text-black font-black uppercase italic tracking-[0.3em] rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Config_
            </button>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl">
                <p className="text-[10px] font-mono text-red-500 uppercase tracking-wide leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest leading-relaxed">
                  Guardado Exitoso!
                </p>
              </div>
            )}

            <div className="p-5 bg-indigo-600/5 rounded-2xl border border-indigo-600/10">
              <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest leading-relaxed">
                Al guardar, los cambios en los colores, el estado y las respuestas rápidas se propagarán automáticamente a toda la tienda web pública al recargar la página.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
