import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORREOS_CONFIG = {
  contractNumber: "54099640",
  clientNumber: "9981628805",
  labellerCode: "DH4T",
  clientId: "cc524d7f312f422eb0abe4ef288cccea",
  defaultProduct: "PAFXB",
  defaultDeliveryMethod: "DOUAOF"
};

serve(async (req) => {
  try {
    const { recipient, parcel, productCode, deliveryMethod } = await req.json();

    const payload = {
      contractNumber: CORREOS_CONFIG.contractNumber,
      clientNumber: CORREOS_CONFIG.clientNumber,
      labellerCode: CORREOS_CONFIG.labellerCode,
      product: productCode || CORREOS_CONFIG.defaultProduct,
      deliveryMethod: deliveryMethod || CORREOS_CONFIG.defaultDeliveryMethod,
      
      sender: {
        name: "HoloCards Canarias",
        street: "CTRA Monte Las Mercedes N127",
        city: "La Laguna",
        zipCode: "38293",
        province: "Santa Cruz de Tenerife",
        phone: "626119815",
        email: "soporte@holocardscanarias.com"
      },
      recipient,
      parcel
    };

    const response = await fetch("https://apis.correos.es/preregister/v1/shipments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": CORREOS_CONFIG.clientId,
        "Authorization": `Bearer ${Deno.env.get("CORREOS_API_SECRET") || ""}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});