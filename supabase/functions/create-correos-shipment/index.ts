import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORREOS_CONFIG = {
  contractNumber: "54099640",
  clientNumber: "9981628805",
  labellerCode: "DH4T",
  clientId: "cc524d7f312f422eb0abe4ef288cccea",
  defaultProduct: "PAFXB",       // Paq Estándar Domicilio
  defaultDeliveryMethod: "DOUAOF", // Entrega a Domicilio
  
  endpoint: Deno.env.get("CORREOS_API_ENDPOINT") || "https://api1.correos.es/preregister/v1/shipments"
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log("--> Datos recibidos en Edge Function:", JSON.stringify(body));

    const recipientData = body.recipient || body.shipping_address || {};
    let parsedAddress = recipientData;
    
    if (typeof recipientData === 'string') {
      try {
        parsedAddress = JSON.parse(recipientData);
      } catch (_) {
        parsedAddress = {};
      }
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

    console.log("--> Enviando Payload a Correos API:", JSON.stringify(payload));

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
    } catch (networkError: any) {
      console.warn("Fallo en endpoint primario, reintentando con endpoint de respaldo...");
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
    console.log("<-- Respuesta Correos API:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Error en Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});