/**
 * correosService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Servicio de autenticación OAuth 2.0 (client_credentials) para la API
 * oficial de Correos España.
 *
 * • Obtiene y recicla el Bearer token automáticamente con caché en memoria.
 * • Compatible con entornos Node, Deno (Edge Functions) y Browser.
 * • El token se renueva 60 s antes de su expiración para evitar errores 401.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CORREOS_CONFIG } from "./correosConfig";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────────────────────

interface CachedToken {
  value: string;
  /** Timestamp (ms) hasta el que el token es válido (con margen de seguridad) */
  expiresAt: number;
}

interface CorreosTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado del módulo (singleton in-memory cache)
// ─────────────────────────────────────────────────────────────────────────────

let _cachedToken: CachedToken | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Codifica en Base64 de forma compatible con Browser (btoa) y Node/Deno (Buffer).
 */
function encodeBase64(str: string): string {
  if (typeof btoa !== "undefined") {
    return btoa(str);
  }
  // Node.js / Deno con Buffer global
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str).toString("base64");
  }
  throw new Error("No se encontró btoa ni Buffer para codificar en Base64.");
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública del servicio
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene o recicla el token Bearer para la API de Correos España.
 *
 * El token se cachea en memoria durante su vigencia (menos 60 s de margen).
 * Si el token ha expirado o no existe, realiza un nuevo flujo OAuth 2.0
 * `client_credentials` usando las credenciales de `CORREOS_CONFIG`.
 *
 * @throws {Error} Si la autenticación falla o la respuesta no contiene `access_token`.
 * @returns {Promise<string>} El Bearer token vigente.
 */
export async function getCorreosAuthToken(): Promise<string> {
  const now = Date.now();

  // Devolver el token cacheado si todavía es válido
  if (_cachedToken !== null && _cachedToken.expiresAt > now) {
    return _cachedToken.value;
  }

  const { clientId, clientSecret, apiUrl } = CORREOS_CONFIG;

  if (!clientId || !clientSecret) {
    throw new Error(
      "[CorreosService] CORREOS_CLIENT_ID y/o CORREOS_CLIENT_SECRET no están configurados."
    );
  }

  // Cabecera Basic Auth: Base64(clientId:clientSecret)
  const credentials = `${clientId}:${clientSecret}`;
  const encodedCredentials = encodeBase64(credentials);

  const tokenUrl = `${apiUrl}/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${encodedCredentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "(sin cuerpo de respuesta)");
    throw new Error(
      `[CorreosService] Error al autenticar con Correos (${response.status} ${response.statusText}): ${errorBody}`
    );
  }

  let data: CorreosTokenResponse;
  try {
    data = (await response.json()) as CorreosTokenResponse;
  } catch {
    throw new Error("[CorreosService] La respuesta del servidor de tokens no es JSON válido.");
  }

  if (!data.access_token) {
    throw new Error(
      "[CorreosService] La respuesta del servidor de tokens no contiene 'access_token'."
    );
  }

  const SAFETY_MARGIN_MS = 60_000; // 1 minuto de margen de seguridad
  const expiresInMs = ((data.expires_in ?? 3600) * 1000) - SAFETY_MARGIN_MS;

  _cachedToken = {
    value:     data.access_token,
    expiresAt: now + expiresInMs,
  };

  return _cachedToken.value;
}

/**
 * Invalida el token en caché de forma forzada.
 * Útil en test o cuando Correos devuelve un 401 inesperado.
 */
export function invalidateCorreosToken(): void {
  _cachedToken = null;
}
