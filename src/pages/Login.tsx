import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { User, Lock, ArrowRight, Github, Zap, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        // Redirigir al perfil o admin dependiendo del rol. Por defecto al perfil/admin
        navigate('/perfil');
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Account created successfully. You can now establish connection.');
        setIsLogin(true);
      }
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Back to Home Button */}
      <div className="absolute top-8 left-8 z-20">
        <Link 
          to="/" 
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all group"
        >
          <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          <span>Voltar ao Inicio</span>
        </Link>
      </div>

      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 blur-3xl rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass p-8 rounded-3xl border border-white/5 relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex justify-center w-full mb-6 group">
            <img src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagen%20De%20Logo%20de%20Empresa/logo%20Holocard.jpg" alt="HoloCards" className="h-12 w-auto object-contain group-hover:scale-105 transition-transform" />
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">
            {isLogin ? 'Authentication' : 'Registration'}
          </h2>
          <p className="text-zinc-500 mt-2 text-sm font-mono tracking-widest">
            {isLogin ? 'SECURE_ACCESS_PORTAL_V4.0' : 'NEW_ENTITY_REGISTRATION'}
          </p>
        </div>

        {/* Toggle Login / Register */}
        <div className="flex bg-black/50 p-1 rounded-xl mb-8 border border-white/5">
          <button
            onClick={() => { setIsLogin(true); setError(null); setSuccess(null); }}
            className={cn(
              "flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
              isLogin ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-zinc-500 hover:text-white"
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); setSuccess(null); }}
            className={cn(
              "flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
              !isLogin ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-zinc-500 hover:text-white"
            )}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg text-red-500 text-xs font-bold text-center shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-green-500/10 border border-green-500/50 p-3 rounded-lg text-green-500 text-xs font-bold text-center shadow-[0_0_15px_rgba(34,197,94,0.2)]"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Identity</label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
              <input 
                type="email" 
                placeholder="email@sasorilabs.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 font-mono transition-all text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between ml-1">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Secret Key</label>
              {isLogin && (
                <a href="#" className="text-[10px] text-red-500 uppercase tracking-widest font-bold hover:underline">Forgot Key?</a>
              )}
            </div>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 font-mono transition-all text-white"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50 group"
          >
            {loading ? (isLogin ? 'Verifying...' : 'Initializing...') : (isLogin ? 'Establish Connection' : 'Initialize Entity')}
            {isLogin ? <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> : <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />}
          </button>

          <button 
            type="button"
            onClick={handleDevBypass}
            className="w-full py-4 bg-zinc-900 border border-zinc-800 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all mt-4 text-zinc-400 group"
          >
            <Zap className="w-4 h-4 text-red-500 group-hover:scale-125 transition-transform" />
            Dev Mode: Skip Authorization
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 w-full">
            <div className="h-[1px] flex-1 bg-white/5"></div>
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Alternatively</span>
            <div className="h-[1px] flex-1 bg-white/5"></div>
          </div>

          <button className="flex items-center gap-3 px-6 py-3 bg-zinc-900 border border-white/5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all w-full justify-center text-white">
            <Github className="w-5 h-5" />
            Connect via Github Organization
          </button>
        </div>

        <p className="mt-8 text-center text-[10px] text-zinc-600 font-mono tracking-widest">
          ENCRYPTED VIA AES-256-GCM. UNAUTHORIZED ACCESS ATTEMPTS ARE LOGGED.
        </p>
      </motion.div>
    </div>
  );
}
