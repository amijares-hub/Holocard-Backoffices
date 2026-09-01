/**
 * correosConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Configuración tipada y segura para la integración con la API oficial de
 * Correos España. Las credenciales se leen del entorno (Supabase Secrets /
 * .env local). Las credenciales NUNCA deben hardcodearse en el código.
 *
 * ⚠️  Este módulo es importable desde Edge Functions (Deno) y desde el bundle
 *     Vite (Node/Browser). El acceso a process.env está protegido para evitar
 *     ReferenceError en entornos que no lo provean.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Lectura segura de variables de entorno compatible con Node, Deno y Browser */
function getEnvVar(key: string): string {
  // Deno / Node (Edge Functions de Supabase, scripts de servidor)
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key] as string;
  }
  // Vite browser bundle (variables VITE_ expuestas en import.meta.env)
  if (typeof import.meta !== "undefined" && (import.meta as unknown as Record<string, unknown>).env) {
    const viteEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
    if (viteEnv[key]) return viteEnv[key] as string;
    const viteKey = `VITE_${key}`;
    if (viteEnv[viteKey]) return viteEnv[viteKey] as string;
  }
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipado del objeto de configuración
// ─────────────────────────────────────────────────────────────────────────────

export interface CorreosSenderConfig {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  phone: string;
  email: string;
}

export interface CorreosConfig {
  contractNumber: string;
  clientNumber: string;
  etagCode: string;
  clientId: string;
  clientSecret: string;
  apiUrl: string;
  sender: CorreosSenderConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuración exportada
// ─────────────────────────────────────────────────────────────────────────────

export const CORREOS_CONFIG: CorreosConfig = {
  contractNumber: getEnvVar("CORREOS_CONTRACT_NUMBER"),
  clientNumber:   getEnvVar("CORREOS_CLIENT_NUMBER"),
  etagCode:       getEnvVar("CORREOS_ETAG_CODE"),
  clientId:       getEnvVar("CORREOS_CLIENT_ID"),
  clientSecret:   getEnvVar("CORREOS_CLIENT_SECRET"),
  apiUrl:         getEnvVar("CORREOS_API_URL") || "https://api.correos.es",

  /** Datos de origen fijos para los envíos desde Canarias */
  sender: {
    name:       "HOLOCARDS",
    address:    "Ctra. Monte Las Mercedes, 127",
    postalCode: "38293",
    city:       "San Cristóbal de La Laguna",
    province:   "Santa Cruz de Tenerife",
    phone:      "626119815",
    email:      "soporte@holocardscanarias.com",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de validación
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida que todas las credenciales requeridas estén presentes y no vacías.
 * Útil para hacer un early-exit en Edge Functions antes de invocar la API.
 */
export function validateCorreosConfig(): boolean {
  const requiredFields: (keyof Omit<CorreosConfig, "sender" | "apiUrl">)[] = [
    "contractNumber",
    "clientNumber",
    "etagCode",
    "clientId",
    "clientSecret",
  ];

  return requiredFields.every((key) => {
    const value = CORREOS_CONFIG[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}
