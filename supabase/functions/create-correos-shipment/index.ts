import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORREOS_CONFIG = {
  contractNumber: "54099640",
  clientNumber: "9981628805",
  labellerCode: "DH4T",
  clientId: "cc524d7f312f422eb0abe4ef288cccea",
  defaultProduct: "PAFXB",
  defaultDeliveryMethod: "DOUAOF",
  endpoint: Deno.env.get("CORREOS_API_ENDPOINT") || "https://api1.correos.es/preregister/v1/shipments"
};

const LOGO_EMAIL_TRANSPARENTE = "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Isologo%20Transparente.png";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmailNotification(subject: string, htmlContent: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("⚠️ RESEND_API_KEY no configurado en Secrets. Correo no enviado.");
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "HOLOCARDS <onboarding@resend.dev>",
        to: ["soporte@holocardscanarias.com"],
        subject: subject,
        html: htmlContent
      })
    });
    console.log("--> Email de notificación enviado a soporte@holocardscanarias.com");
  } catch (err) {
    console.error("Error enviando email:", err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    let body: any = {};
    
    if (rawBody && rawBody.trim().length > 0) {
      try {
        body = JSON.parse(rawBody);
      } catch (_e) {
        throw new Error("El cuerpo de la petición contiene un formato JSON inválido.");
      }
    }

    const recipientData = body.recipient || body.shipping_address || {};
    let parsedAddress = recipientData;
    
    if (typeof recipientData === 'string') {
      try { parsedAddress = JSON.parse(recipientData); } catch (_) { parsedAddress = {}; }
    }
    
    const personName = body.nombre || body.customer_name || parsedAddress.name || "Cliente HoloCards";
    const streetAddress = (body.direccion && body.direccion !== "Dirección no especificada") 
      ? body.direccion 
      : (parsedAddress.street || parsedAddress.address || body.address_street || "CTRA Monte Las Mercedes N127");
    const cityName = body.ciudad || parsedAddress.city || body.address_city || "San Cristóbal de La Laguna";
    const zipCodeVal = String(body.cp || parsedAddress.zipCode || parsedAddress.zip || body.address_zip || "38293");
    const provinceName = body.provincia || parsedAddress.province || body.address_province || "Santa Cruz de Tenerife";
    const phoneVal = body.telefono || parsedAddress.phone || body.phone || "626119815";
    const emailVal = body.email || body.customer_email || parsedAddress.email || "soporte@holocardscanarias.com";

    const payload = {
      contractNumber: CORREOS_CONFIG.contractNumber,
      clientNumber: CORREOS_CONFIG.clientNumber,
      labellerCode: CORREOS_CONFIG.labellerCode,
      shipments: [
        {
          product: body.productCode || CORREOS_CONFIG.defaultProduct,
          deliveryMethod: body.deliveryMethod || CORREOS_CONFIG.defaultDeliveryMethod,
          admissionMethod: "I",
          sender: {
            name: "HOLOCARDS",
            address: "CTRA Monte Las Mercedes N127",
            street: "CTRA Monte Las Mercedes N127",
            city: "San Cristóbal de La Laguna",
            zipCode: "38293",
            province: "Santa Cruz de Tenerife",
            country: "ES",
            phone: "626119815",
            email: "soporte@holocardscanarias.com"
          },
          recipient: {
            name: personName,
            address: streetAddress,
            street: streetAddress,
            city: cityName,
            zipCode: zipCodeVal,
            province: provinceName,
            country: "ES",
            phone: phoneVal,
            email: emailVal
          },
          parcels: [
            {
              weight: Number(body.parcel?.weightGrams || body.parcel?.weight || 500),
              height: Number(body.parcel?.heightCm || body.parcel?.height || 10),
              width: Number(body.parcel?.widthCm || body.parcel?.width || 15),
              length: Number(body.parcel?.lengthCm || body.parcel?.length || 20)
            }
          ]
        }
      ]
    };

    let response: Response;
    try {
      response = await fetch(CORREOS_CONFIG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Id": CORREOS_CONFIG.clientId,
          "Authorization": req.headers.get("Authorization") || ""
        },
        body: JSON.stringify(payload)
      });
    } catch (_netErr) {
      response = await fetch("https://preregistro.correos.es/preregister/v1/shipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Id": CORREOS_CONFIG.clientId,
          "Authorization": req.headers.get("Authorization") || ""
        },
        body: JSON.stringify(payload)
      });
    }

    const result = await response.json();
    const trackingCode = result?.shipmentCode || result?.shipments?.[0]?.shipmentCode || "REGISTRADO";

    if (response.ok) {
      await sendEmailNotification(
        `🚚 Etiqueta de Correos Generada — Pedido #${(body.order_id || '').slice(0, 8)}`,
        `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: #1e293b; padding: 24px; border-radius: 16px; border: 1px solid #334155;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="${LOGO_EMAIL_TRANSPARENTE}" alt="HOLOCARDS" style="height: 50px; width: auto; object-contain: contain;" />
            </div>
            <h2 style="color: #facc15; margin-top: 0; text-align: center; font-size: 18px; text-transform: uppercase;">ETIQUETA DE CORREOS GENERADA</h2>
            <p style="font-size: 14px; text-align: center; color: #94a3b8;">Se ha generado con éxito la etiqueta de envío en el Backoffice.</p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
            <p><strong>Nº de Seguimiento:</strong> <span style="font-family: monospace; font-size: 16px; font-weight: bold; background: #facc15; color: #000; padding: 4px 8px; border-radius: 4px;">${trackingCode}</span></p>
            <p><strong>ID Pedido:</strong> ${body.order_id || 'N/A'}</p>
            <p><strong>Destinatario:</strong> ${personName}</p>
            <p><strong>Dirección:</strong> ${streetAddress}, ${zipCodeVal} ${cityName} (${provinceName})</p>
            <p><strong>Teléfono:</strong> ${phoneVal}</p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
            <p style="font-size: 11px; color: #64748b; text-align: center;">HoloCards Canarias — Sistema de Logística Automática</p>
          </div>
        </div>
        `
      );
    }

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});