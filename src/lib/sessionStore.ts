/**
 * SessionStore — Utilidades de expiración de sesión admin
 * Fase 26: Optimización de Sesión y Login de Extensión
 *
 * Gestiona un timestamp de expiración custom en localStorage,
 * independiente del token de Supabase. Esto permite al admin
 * elegir cuánto tiempo quiere mantener la sesión abierta.
 */

const EXPIRY_KEY = 'admin_session_expiry';

export const SessionStore = {
  /**
   * Guarda el timestamp de expiración basado en las horas elegidas.
   * @param hours - Duración en horas (24, 48 o 168 para 1 semana)
   */
  set: (hours: number): void => {
    const expiryTimestamp = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem(EXPIRY_KEY, String(expiryTimestamp));
  },

  /**
   * Comprueba si la sesión custom ha expirado.
   * Retorna false si no hay registro (sin límite custom establecido).
   */
  isExpired: (): boolean => {
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (!expiry) return false;
    return Date.now() > Number(expiry);
  },

  /**
   * Elimina el registro de expiración. Llamar en logout.
   */
  clear: (): void => {
    localStorage.removeItem(EXPIRY_KEY);
  },

  /**
   * Retorna el timestamp de expiración formateado, o null si no existe.
   */
  getExpiryDate: (): Date | null => {
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (!expiry) return null;
    return new Date(Number(expiry));
  },
};
