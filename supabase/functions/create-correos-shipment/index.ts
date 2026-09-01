import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, client_id, client_secret",
};

async function getCorreosJwtToken(idIdentidad: string, secretIdentidad: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      scope: "AP3 LBS RCG",
      grant_type: "client_credentials",
      client_id: idIdentidad,
      client_secret: secretIdentidad
    });

    const res = await fetch("https://apioauthcid.correos.es/Api/Authorize/Token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
      body: params.toString()
    });

    if (res.ok) {
      const data = await res.json();
      return data.idToken || data.access_token || data.token || null;
    }
  } catch (e: any) {
    console.warn("Error obteniendo token:", e.message);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let payload: any = {};
    try { payload = await req.json(); } catch (_e) {}

    const idIdentidad = (Deno.env.get("CORREOS_IDENTIDAD_CLIENT_ID") || "").trim();
    const secretIdentidad = (Deno.env.get("CORREOS_IDENTIDAD_CLIENT_SECRET") || "").trim();
    const idApi = (Deno.env.get("CORREOS_API_CLIENT_ID") || "").trim();
    const secretApi = (Deno.env.get("CORREOS_API_CLIENT_SECRET") || "").trim();

    if (!idIdentidad || !secretIdentidad || !idApi || !secretApi) {
      return new Response(
        JSON.stringify({ success: false, error: "Correos secrets no configurados en Supabase." }),
        { headers: corsHeaders, status: 500 }
      );
    }

    const numCliente = (Deno.env.get("CORREOS_CLIENTE") || "9981628805").trim();
    const numContrato = (Deno.env.get("CORREOS_CONTRATO") || "54099640").trim();

    const jwtToken = await getCorreosJwtToken(idIdentidad, secretIdentidad);

    if (!jwtToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Fallo al obtener JWT Token de Correos." }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const rawNombre = (payload.nombre || "Armando Mijares").trim();
    const partesNombre = rawNombre.split(" ");
    const nombreDest = partesNombre[0] || "Cliente";
    const apellidoDest = partesNombre.slice(1).join(" ") || "HoloCards";

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
            name: nombreDest,
            lastName1: apellidoDest,
            address: (payload.direccion || "Calle San Benito 48").trim(),
            locality: (payload.ciudad || "La Laguna").trim(),
            province: (payload.cp || "38108").substring(0, 2) || "38",
            cp: (payload.cp || "38108").trim(),
            country: "ESP",
            contactPhone: (payload.telefono || "672106989").trim(),
            email: (payload.email || "armandomijaresarmas@gmail.com").trim(),
            language: "spa"
          },
          sender: {
            name: "HoloCards",
            company: "HoloCards",
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

    const res = await fetch("https://api1.correos.es/admissions/preregister/api/v1/delivery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwtToken}`,
        "client_id": idApi,
        "client_secret": secretApi
      },
      body: JSON.stringify(swaggerPayload)
    });

    const resText = await res.text();
    console.log(`Respuesta Prerregistro (${res.status}):`, resText);

    if (res.ok) {
      const data = JSON.parse(resText);
      const shipment = data.shipments?.[0];
      const trackingNumber = shipment?.shipmentCode || shipment?.packages?.[0]?.packageCode || null;
      const pdfBase64 = data.labelB64 || shipment?.labelB64 || null;

      return new Response(
        JSON.stringify({
          success: true,
          tracking_number: trackingNumber,
          pdf_base64: pdfBase64,
          is_real: !!trackingNumber,
          raw: data
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: resText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: res.status }
      );
    }

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});