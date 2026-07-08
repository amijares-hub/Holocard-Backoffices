/**
 * AdminLogin — Fase 26: Optimización de Sesión y Login de Extensión
 *
 * Añadido:
 * - Botón Maximize2 (abrir en pestaña completa antes de hacer login)
 * - Selector de duración de sesión: 24h / 48h / 1 semana
 * - Integración con SessionStore para guardar el expiry al hacer login
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { SessionStore } from '../../lib/sessionStore';
import {
  ShieldCheck, Lock, Mail, Loader2,
  ArrowRight, AlertCircle, Zap, Maximize2, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

// ── Opciones de duración de sesión ─────────────────────────────────────────────
const SESSION_OPTIONS = [
  { label: '24 horas', hours: 24 },
  { label: '48 horas', hours: 48 },
  { label: '1 semana', hours: 168 },
] as const;

// ── Función: Abrir en pestaña completa ─────────────────────────────────────────
function openInFullTab() {
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime) {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  } else {
    window.open('/', '_blank');
  }
}

export const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState<24 | 48 | 168>(168); // default: 1 semana
  const navigate = useNavigate();

  const handleDevBypass = () => {
    navigate('/admin');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.session) {
        // Guardar expiración custom según la opción elegida
        SessionStore.set(selectedHours);
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* ── Botón Maximize (Fase 25/26) ──────────────────────────────────────── */}
      <button
        onClick={openInFullTab}
        className="absolute top-4 right-4 z-50 p-2.5 bg-zinc-900/80 border border-white/5 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-600/10 hover:border-red-600/30 transition-all group backdrop-blur-sm"
        title="Abrir en pestaña completa"
      >
        <Maximize2 className="w-4 h-4 transition-transform group-hover:scale-110" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass p-10 rounded-[2.5rem] border border-white/5 space-y-8 shadow-2xl bg-black/40 backdrop-blur-3xl">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 bg-red-600/20 rounded-2xl mb-4">
              <ShieldCheck className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Admin Access</h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">Sasori Labs // Internal Protocol</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Campos de credenciales */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Corporate Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sasorilabs.io"
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-xs font-bold text-white focus:border-red-600/50 focus:ring-0 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Security Key</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-xs font-bold text-white focus:border-red-600/50 focus:ring-0 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* ── Selector de Duración de Sesión ──────────────────────────────── */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                <Clock className="w-3 h-3" />
                Mantener sesión abierta
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SESSION_OPTIONS.map((opt) => (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => setSelectedHours(opt.hours as 24 | 48 | 168)}
                    className={`
                      py-2.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border
                      ${selectedHours === opt.hours
                        ? 'bg-red-600/20 border-red-600/50 text-red-400'
                        : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-4 bg-red-600/10 border border-red-600/20 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-[9px] text-red-500 font-bold uppercase tracking-tight">{error}</p>
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full group flex items-center justify-center gap-3 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-red-900/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Entrar al Mainframe
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Dev Bypass */}
            <button
              type="button"
              onClick={handleDevBypass}
              className="w-full py-4 bg-zinc-900 border border-zinc-800 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all mt-4 text-zinc-400 group"
            >
              <Zap className="w-4 h-4 text-red-500 group-hover:scale-125 transition-transform" />
              Dev Mode: Skip Authorization
            </button>
          </form>

          <div className="pt-6 border-t border-white/5 text-center">
            <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest leading-loose">
              Uso restringido a personal autorizado de Sasori Labs.<br />
              Todos los accesos son monitoreados y encriptados.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
