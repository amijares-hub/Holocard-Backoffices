-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Proveedores (Suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    delivery_time_avg INTEGER DEFAULT 3, -- Días promedio
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Productos (Base)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL, -- Para SEO URL
    image_url TEXT, -- Preparado para transformaciones Supabase (?format=webp)
    meta_tags JSONB DEFAULT '{}'::jsonb, -- Para SEO dinámico
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Inventario y Relación Producto-Proveedor (product_inventory)
CREATE TABLE IF NOT EXISTS product_inventory (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    sale_price DECIMAL(12,2) NOT NULL,
    cost_price DECIMAL(12,2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (product_id, supplier_id)
);

-- 5. Tabla de Pedidos (Orders) con integración Odoo fiscal
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID, -- Referencia opcional a tabla auth.users
    order_number SERIAL UNIQUE,
    status TEXT DEFAULT 'pending',
    
    -- Campos Fiscales / Odoo
    customer_nif TEXT NOT NULL, -- NIF/CIF del cliente
    billing_address TEXT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) NOT NULL, -- Cuota de IVA
    
    -- Vínculo ERP
    odoo_invoice_id TEXT, -- ID de factura generado en Odoo
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Trigger para actualización automática de last_sync en Inventario
CREATE OR REPLACE FUNCTION update_last_sync_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_sync = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_inventory_sync
BEFORE UPDATE ON product_inventory
FOR EACH ROW
EXECUTE FUNCTION update_last_sync_column();

-- 7. Políticas de Seguridad (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Lectura pública habilitada (Productos e Inventario)
CREATE POLICY "Public can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Public can view suppliers" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Public can view inventory" ON product_inventory FOR SELECT USING (true);

-- Gestión total para el rol de servicio (Manejado por el Servidor Express)
CREATE POLICY "Service role manages products" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages suppliers" ON suppliers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages inventory" ON product_inventory FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages orders" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. Índices para performance y SEO
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_inventory_prices ON product_inventory(sale_price) WHERE stock > 0;
CREATE INDEX IF NOT EXISTS idx_orders_customer_nif ON orders(customer_nif);
CREATE INDEX IF NOT EXISTS idx_orders_odoo_id ON orders(odoo_invoice_id) WHERE odoo_invoice_id IS NOT NULL;
