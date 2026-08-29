import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, client_id, client_secret",
};

// Obtención del JWT Token enviando JSON a la API de Correos
async function getCorreosJwtToken(clientId: string, clientSecret: string): Promise<string | null> {
  const tokenEndpoints = [
    "https://api1.correos.es/oauth2/token",
    "https://identidad.correos.es/oauth2/token"
  ];

  for (const endpoint of tokenEndpoints) {
    try {
      console.log(`Solicitando JWT Token a ${endpoint}...`);
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "client_id": clientId,
          "client_secret": clientSecret
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret
        })
      });

      const text = await res.text();
      console.log(`Respuesta de token (${res.status}):`, text);

      if (res.ok) {
        const data = JSON.parse(text);
        const token = data.access_token || data.id_token || data.token;
        if (token) return token;
      }
    } catch (e: any) {
      console.warn(`Error conectando a ${endpoint}:`, e.message);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let payload: any = {};
    try {
      payload = await req.json();
    } catch (_e) {
      console.warn("Payload JSON vacío.");
    }

    const clientId = (Deno.env.get("CORREOS_CLIENT_ID") || "cc524d7f312f422eb0abe4ef288cccea").trim();
    const clientSecret = (Deno.env.get("CORREOS_CLIENT_SECRET") || "8fF98306b87B41B892e9388574E4dF0d").trim();
    const numCliente = (Deno.env.get("CORREOS_CLIENTE") || "9981628805").trim();
    const numContrato = (Deno.env.get("CORREOS_CONTRATO") || "54099640").trim();
    const codEtiquetador = (Deno.env.get("CORREOS_ETIQUETADOR") || "CEDH4T").trim();

    let trackingNumber: string | null = null;
    let pdfBase64: string | null = null;
    let isReal = false;
    let errorMessage: string | null = null;

    if (clientId && clientSecret) {
      // 1. Obtener Token JWT de autenticación
      const jwtToken = await getCorreosJwtToken(clientId, clientSecret);

      if (!jwtToken) {
        errorMessage = "No se pudo obtener el JWT Token. Recuerda que el gestor comercial debe vincular la app en Correos ID antes de autorizar tokens.";
        console.warn(errorMessage);
      } else {
        console.log("JWT Token obtenido con éxito. Enviando prerregistro a Correos...");

        const swaggerPayload = {
          errorCodeLanguage: "spa",
          shipments: [
            {
              admissionProvince: "38",
              packagesNumber: "1",
              product: "S0132",
              deliveryMethod: "ST",
              contractNumber: numContrato,
              clientNumber: numCliente,
              labellerCode: codEtiquetador,
              totalWeight: "500",
              packages: [
                {
                  packageWeightGrams: "500",
                  packageHeight: "100",
                  packageWidth: "150",
                  packageLength: "200"
                }
              ],
              addressee: {
                name: (payload.nombre || "Cliente").split(" ")[0],
                lastName1: (payload.nombre || "HoloCards").split(" ").slice(1).join(" ") || "HoloCards",
                address: payload.direccion || "Ctra Monte Las Mercedes N127",
                locality: payload.ciudad || "La Laguna",
                province: (payload.cp || "38200").substring(0, 2) || "38",
                cp: payload.cp || "38200",
                country: "ESP",
                contactPhone: payload.telefono || "600000000",
                email: payload.email || "cliente@holocardscanarias.com",
                language: "spa"
              },
              sender: {
                name: "HoloCards",
                company: "Elisa González Rojas",
                address: "Ctra Monte Las Mercedes 127",
                locality: "San Cristóbal de La Laguna",
                province: "38",
                cp: "38293",
                country: "ESP",
                contactPhone: "626119815",
                email: "elisagonrojas@gmail.com",
                language: "spa"
              }
            }
          ]
        };

        // 2. Realizar la petición enviando el JWT Token en la cabecera Authorization
        const res = await fetch("https://api1.correos.es/admissions/preregister/api/v1/delivery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwtToken}`,
            "client_id": clientId,
            "client_secret": clientSecret
          },
          body: JSON.stringify(swaggerPayload)
        });

        const resText = await res.text();
        console.log(`Respuesta Correos API (${res.status}):`, resText);

        if (res.ok) {
          try {
            const data = JSON.parse(resText);
            const shipment = data.shipments?.[0];
            trackingNumber = shipment?.shipmentCode || shipment?.packages?.[0]?.packageCode || null;
            pdfBase64 = data.labelB64 || shipment?.labelB64 || null;
            if (trackingNumber) isReal = true;
          } catch (_e) {
            errorMessage = "Error al procesar la respuesta JSON de Correos.";
          }
        } else {
          errorMessage = `Correos respondió (${res.status}): ${resText.substring(0, 150)}`;
        }
      }
    } else {
      errorMessage = "Faltan credenciales Client ID y Client Secret.";
    }

    // Modo contingencia automático
    if (!trackingNumber) {
      trackingNumber = `PQ${Math.floor(1000000000 + Math.random() * 9000000000)}ES`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        tracking_number: trackingNumber,
        pdf_base64: pdfBase64,
        is_real: isReal,
        error: errorMessage
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err: any) {
    const mockTracking = `PQ${Math.floor(1000000000 + Math.random() * 9000000000)}ES`;
    return new Response(
      JSON.stringify({
        success: true,
        tracking_number: mockTracking,
        pdf_base64: null,
        is_real: false,
        error: err.message
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});