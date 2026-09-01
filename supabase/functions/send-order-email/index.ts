import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verificación de Seguridad: Extraer y validar el token JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized: Invalid or expired token");
    }

    const payload = await req.json();
    
    // Suport for Webhook payload from Supabase (record.record) or direct invocation
    const data = payload.record || payload;
    
    const { 
      order_id, 
      customer_email, 
      customer_name, 
      total_amount, 
      shipping_address, 
      items_summary, 
      payment_instructions,
      action = "order_created", // order_created or order_shipped
      tracking_number
    } = data;

    // Use order_id or fallback to id (if called from a trigger directly where the column is id)
    const idToUse = order_id || data.id;
    if (!idToUse) {
       throw new Error("order_id or id is required");
    }

    const shortId = idToUse.slice(0, 8).toUpperCase();
    
    let subject = "";
    let customerEmailHtml = "";
    let adminEmailHtml = "";
    let toAdmin = false;

    if (action === "order_shipped") {
      // Plantilla de Envío Realizado (Tracking)
      subject = `📦 ¡Tu pedido #${shortId} está en camino!`;
      customerEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #09090b; color: #ffffff; margin: 0; padding: 40px; }
            .container { max-width: 600px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 24px; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; font-style: italic; color: #ffffff; text-transform: uppercase; }
            .logo span { color: #dc2626; }
            .status-badge { display: inline-block; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 8px 16px; border-radius: 12px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
            h1 { font-size: 32px; font-weight: 900; font-style: italic; margin: 0 0 10px 0; }
            p { color: #a1a1aa; font-size: 14px; line-height: 1.6; }
            .tracking-box { background: #000000; border-radius: 16px; padding: 24px; margin-top: 30px; border: 1px solid #10b98133; text-align: center; }
            .tracking-title { color: #10b981; font-size: 12px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px; display: block; }
            .tracking-number { font-family: monospace; font-size: 24px; color: #ffffff; font-weight: bold; margin-bottom: 20px; display: block; letter-spacing: 2px; }
            .btn { background: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block; text-transform: uppercase; letter-spacing: 1px; }
            .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #52525b; text-transform: uppercase; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">HOLO<span>CARDS</span></div>
            </div>
            <div style="text-align: center;">
              <div class="status-badge">Pedido Enviado</div>
            </div>
            <h1 style="text-align: center;">¡Buenas noticias, ${customer_name || 'Coleccionista'}!</h1>
            <p style="text-align: center;">Tu pedido <strong>#${shortId}</strong> ha sido empaquetado con cuidado y entregado a Correos. ¡Ya está en camino hacia ti!</p>
            
            <div class="tracking-box">
              <span class="tracking-title">Número de Seguimiento (Correos)</span>
              <span class="tracking-number">${tracking_number || 'Pendiente'}</span>
              ${tracking_number ? `<a href="https://s.correos.es/seguimiento-envios/detalle.html?tracking=${tracking_number}" class="btn">Rastrear mi paquete</a>` : ''}
            </div>

            <div class="footer">
              Gracias por confiar en Sasori Labs & HOLOCARDS
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // 1. Email for Customer (Reservado)
      subject = `¡Pedido Confirmado! #${shortId} - HOLOCARDS`;
      customerEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #09090b; color: #ffffff; margin: 0; padding: 40px; }
            .container { max-width: 600px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 24px; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; font-style: italic; color: #ffffff; text-transform: uppercase; }
            .logo span { color: #dc2626; }
            .status-badge { display: inline-block; background: rgba(220, 38, 38, 0.1); color: #dc2626; padding: 8px 16px; border-radius: 12px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
            h1 { font-size: 32px; font-weight: 900; font-style: italic; margin: 0 0 10px 0; }
            p { color: #a1a1aa; font-size: 14px; line-height: 1.6; }
            .order-details { margin: 30px 0; border-top: 1px solid #27272a; border-bottom: 1px solid #27272a; padding: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
            .detail-label { color: #71717a; font-weight: bold; text-transform: uppercase; font-size: 10px; }
            .payment-box { background: #000000; border-radius: 16px; padding: 24px; margin-top: 30px; border: 1px solid #dc262633; }
            .payment-title { color: #dc2626; font-size: 12px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px; display: block; }
            .payment-info { font-family: monospace; font-size: 16px; color: #ffffff; font-weight: bold; }
            .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #52525b; text-transform: uppercase; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">HOLO<span>CARDS</span></div>
            </div>
            <div class="status-badge">Pedido Reservado</div>
            <h1>¡Hola ${customer_name || 'Coleccionista'}!</h1>
            <p>Hemos recibido correctamente tu pedido y ya está registrado en nuestro sistema. Estamos listos para preparar tu envío en cuanto confirmemos el pago.</p>
            
            <div class="order-details">
              <div class="detail-row">
                <span class="detail-label">Total a Pagar</span>
                <span style="color: #ffffff; font-weight: 900;">${total_amount || '-'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Envío a</span>
                <span style="color: #ffffff;">${shipping_address || '-'}</span>
              </div>
            </div>

            <div class="payment-box">
              <span class="payment-title">Instrucciones de Pago</span>
              <p style="color: #ffffff; margin-bottom: 20px;">Realiza el pago e indica el concepto <strong>#${shortId}</strong></p>
              <div style="margin-bottom: 15px;">
                <span style="color: #71717a; font-size: 10px; text-transform: uppercase;">Bizum:</span><br/>
                <span class="payment-info">600 000 000</span>
              </div>
              <div>
                <span style="color: #71717a; font-size: 10px; text-transform: uppercase;">IBAN:</span><br/>
                <span class="payment-info">ES21 0000 0000 0000 0000 0000</span>
              </div>
            </div>

            <div class="footer">
              Gracias por confiar en Sasori Labs & HOLOCARDS
            </div>
          </div>
        </body>
        </html>
      `;

      // 2. Email for Admin
      adminEmailHtml = `
        <div style="font-family: sans-serif; background: #000; color: #fff; padding: 40px;">
          <h1 style="color: #dc2626;">🚨 NUEVA VENTA DETECTADA</h1>
          <p>Se ha registrado un nuevo pedido pendiente de pago manual.</p>
          <ul>
            <li><strong>ID Pedido:</strong> #${shortId}</li>
            <li><strong>Cliente:</strong> ${customer_email || 'No provisto'}</li>
            <li><strong>Total:</strong> ${total_amount || '-'}</li>
          </ul>
          <p>Revisa el panel de administración para gestionar el envío una vez verifiques el cobro.</p>
        </div>
      `;
      toAdmin = true;
    }

    const emailsToSend = [
      {
        from: "HOLOCARDS <pedidos@sasorilabs.io>",
        to: customer_email,
        subject: subject,
        html: customerEmailHtml,
      }
    ];

    if (toAdmin) {
      emailsToSend.push({
        from: "HOLOCARDS Vault <sistema@sasorilabs.io>",
        to: "amijares@sasorilabs.io",
        subject: `🚨 NUEVA VENTA - Pedido #${shortId}`,
        html: adminEmailHtml,
      });
    }

    // Send using Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailsToSend),
    });

    const resData = await res.json();

    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
