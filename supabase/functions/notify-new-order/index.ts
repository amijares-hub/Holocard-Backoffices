import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOGO_EMAIL_TRANSPARENTE = "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Isologo%20Transparente.png";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const record = body.record || body;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY no configurado en Secrets de Supabase.");
    }

    const orderId = record.id ? record.id.slice(0, 8) : 'N/A';
    const amount = record.total_amount ? Number(record.total_amount).toFixed(2) : '0.00';
    const customer = record.customer_name || record.customer_email || record.email || 'Cliente Nuevo';
    const status = record.status || 'pending';

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "HOLOCARDS <onboarding@resend.dev>",
        to: ["soporte@holocardscanarias.com"],
        subject: `🛒 ¡NUEVO PEDIDO RECIBIDO! — #${orderId} (${amount}€)`,
        html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: #1e293b; padding: 24px; border-radius: 16px; border: 1px solid #334155;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="${LOGO_EMAIL_TRANSPARENTE}" alt="HOLOCARDS" style="height: 50px; width: auto; object-contain: contain;" />
            </div>
            <h2 style="color: #ef4444; margin-top: 0; text-align: center; font-size: 20px; text-transform: uppercase;">¡NUEVA VENTA EN HOLOCARDS!</h2>
            <p style="font-size: 14px; text-align: center; color: #94a3b8;">Se ha registrado una nueva orden en la tienda online.</p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
            <p><strong>ID del Pedido:</strong> #${record.id}</p>
            <p><strong>Total Importe:</strong> <span style="font-size: 20px; font-weight: bold; color: #22c55e;">${amount} €</span></p>
            <p><strong>Estado:</strong> <span style="text-transform: uppercase; font-weight: bold; color: #facc15;">${status}</span></p>
            <p><strong>Cliente:</strong> ${customer}</p>
            <p><strong>Email:</strong> ${record.customer_email || record.email || 'N/A'}</p>
            <p><strong>Teléfono:</strong> ${record.phone || 'N/A'}</p>
            <p><strong>Dirección:</strong> ${record.address_street || 'N/A'}, ${record.address_zip || ''} ${record.address_city || ''} (${record.address_province || ''})</p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
            <p style="font-size: 11px; color: #64748b; text-align: center;">Accede al Backoffice para revisar la orden y generar la etiqueta de Correos.</p>
          </div>
        </div>
        `
      })
    });

    const emailData = await emailResponse.json();

    return new Response(JSON.stringify({ success: true, emailData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});