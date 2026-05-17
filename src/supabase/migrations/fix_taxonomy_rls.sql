-- FIX RLS PARA TAXONOMÍA (Permitir lectura a usuarios autenticados/admins)

-- 1. Franquicias (Games)
DROP POLICY IF EXISTS "Allow public read games" ON games;
CREATE POLICY "Allow public read games" ON games 
FOR SELECT USING (true);

-- 2. Categorías
DROP POLICY IF EXISTS "Allow public read categories" ON categories;
CREATE POLICY "Allow public read categories" ON categories 
FOR SELECT USING (true);

-- 3. Expansiones
DROP POLICY IF EXISTS "Allow public read expansions" ON expansions;
CREATE POLICY "Allow public read expansions" ON expansions 
FOR SELECT USING (true);
