import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey || !stripeSecretKey.trim()) {
      throw new Error("La variable STRIPE_SECRET_KEY no está configurada en Supabase Edge Functions Secrets.");
    }

    const stripe = new Stripe(stripeSecretKey.trim(), {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.json().catch(() => ({}));
    const { amount, currency = "eur", items, shippingCost = 0 } = body;

    let finalAmountCents = 0;

    // 1. Si vienen items válidos, calcula el precio de forma segura desde la BD de Supabase
    if (items && Array.isArray(items) && items.length > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const productIds = items.map((i: any) => i.id).filter(Boolean);
        
        const { data: dbProducts } = await supabase
          .from("products")
          .select("id, base_price, price, precio")
          .in("id", productIds);

        if (dbProducts && dbProducts.length > 0) {
          const priceMap = new Map();
          dbProducts.forEach((p: any) => {
            const realPrice = Number(p.base_price ?? p.price ?? p.precio ?? 0);
            priceMap.set(String(p.id), realPrice);
          });

          let itemsTotalEuros = 0;
          items.forEach((item: any) => {
            const price = priceMap.get(String(item.id)) || Number(item.price || 0);
            const qty = Number(item.quantity || 1);
            itemsTotalEuros += price * qty;
          });

          itemsTotalEuros += Number(shippingCost || 0);
          finalAmountCents = Math.round(itemsTotalEuros * 100);
        }
      }
    }

    // 2. Respaldo: Si no hay items o falló el cálculo por BD, usa el amount recibido directamente
    if (!finalAmountCents || finalAmountCents < 50) {
      finalAmountCents = Math.round(Number(amount) || 0);
    }

    if (!finalAmountCents || finalAmountCents < 50) {
      throw new Error("El carrito está vacío o el importe final es inferior a 0.50€.");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmountCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error en create-payment-intent:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error al procesar el intento de pago" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});