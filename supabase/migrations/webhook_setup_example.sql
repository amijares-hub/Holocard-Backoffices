-- 1. Asegurar que la columna tracking_number existe en la tabla orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='tracking_number') THEN
        ALTER TABLE orders ADD COLUMN tracking_number TEXT;
    END IF;
END $$;

-- 2. Crear la función que llama al Edge Function cuando se actualiza el tracking
CREATE OR REPLACE FUNCTION notify_tracking_email()
RETURNS TRIGGER AS $$
DECLARE
    edge_function_url TEXT := 'https://<TU_PROYECTO>.supabase.co/functions/v1/send-order-email';
    anon_key TEXT := '<TU_SUPABASE_ANON_KEY>'; -- Reemplazar con tu Anon Key real
    payload JSONB;
BEGIN
    -- Solo enviar el correo si el tracking_number es nuevo o acaba de ser añadido
    IF (NEW.tracking_number IS NOT NULL AND (OLD.tracking_number IS NULL OR OLD.tracking_number != NEW.tracking_number)) THEN
        
        -- Preparamos el payload incluyendo el action 'order_shipped'
        payload := jsonb_build_object(
            'order_id', NEW.id,
            'customer_email', NEW.customer_email, -- Si no tienes customer_email en orders, deberás unirlo con la tabla correspondiente o pasarlo
            'customer_name', 'Coleccionista',
            'action', 'order_shipped',
            'tracking_number', NEW.tracking_number
        );

        -- Hacemos la llamada HTTP (requiere la extensión pg_net o se puede hacer vía webhook nativo de Supabase)
        -- Si tienes pg_net instalado:
        -- PERFORM net.http_post(
        --     url := edge_function_url,
        --     headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
        --     body := payload
        -- );
        
        -- Alternativamente: Usa la interfaz gráfica de Supabase (Database -> Webhooks) 
        -- y configura que al actualizar la tabla 'orders' llame a 'send-order-email'
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear el Trigger
DROP TRIGGER IF EXISTS trigger_notify_tracking ON orders;
CREATE TRIGGER trigger_notify_tracking
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_tracking_email();
