/**
 * GAMIFICACIÓN Y CHECKOUT - SASORI LABS
 */

-- 1. Perfiles de Usuario (Extensión de auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    battle_pass_points INTEGER DEFAULT 0,
    pokeballs INTEGER DEFAULT 5,
    tier TEXT DEFAULT 'entrenador',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Items del Pedido (Relación N:M entre Pedidos y Productos)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price_at_purchase DECIMAL(12,2) NOT NULL
);

-- 3. Colección de Capturas (Inventario Personal del Usuario)
CREATE TABLE IF NOT EXISTS user_collection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    product_id UUID REFERENCES products(id),
    method TEXT DEFAULT 'purchased', -- 'purchased' o 'captured'
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Función de Escalado de Nivel Automático
CREATE OR REPLACE FUNCTION check_level_up()
RETURNS TRIGGER AS $$
DECLARE
    next_level_exp FLOAT;
BEGIN
    -- Fórmula: 1000 * (level ^ 1.5)
    next_level_exp := 1000 * POWER(NEW.level, 1.5);
    
    -- Lógica de Level Up recursiva por si gana mucha EXP de golpe
    WHILE NEW.exp >= next_level_exp LOOP
        NEW.level := NEW.level + 1;
        NEW.pokeballs := NEW.pokeballs + 5; -- Recompensa de Pokéballs
        next_level_exp := 1000 * POWER(NEW.level, 1.5);
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_level_up
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION check_level_up();

-- 5. Trigger de Recompensas por Compra Confirmada (paid)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION reward_user_on_paid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        -- Actualizar Perfil (EXP y Battle Pass)
        UPDATE user_profiles 
        SET exp = exp + 100,
            battle_pass_points = battle_pass_points + (NEW.total_amount * 10)::INT
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reward_on_paid
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION reward_user_on_paid();

-- 6. Función Atómica para Restar Stock
CREATE OR REPLACE FUNCTION decrement_stock(p_id UUID, qty INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE product_inventory 
    SET stock = stock - qty 
    WHERE product_id = p_id 
    AND stock >= qty;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto %', p_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS en nuevas tablas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collection ENABLE ROW LEVEL SECURITY;

-- Políticas: El usuario solo ve su propio perfil/colección
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view own items" ON order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid()));
CREATE POLICY "Users can view own collection" ON user_collection FOR SELECT USING (auth.uid() = user_id);

-- Gestión total para service_role
CREATE POLICY "Service role full access on profiles" ON user_profiles TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on items" ON order_items TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on collection" ON user_collection TO service_role USING (true) WITH CHECK (true);

-- Recargar esquema
NOTIFY pgrst, 'reload schema';
