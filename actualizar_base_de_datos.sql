-- ============================================
-- COPIA Y PEGA ESTO EN EL EDITOR SQL DE SUPABASE
-- ============================================

-- 0. Habilitar extensión para UUIDs (IMPORTANTE)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Actualizar tabla 'gallery' para soportar imágenes destacadas (Presentación)
ALTER TABLE public.gallery 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- 2. Actualizar tabla 'products' para soportar precios especiales y estados
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS promo_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_promotion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT false;

-- 3. Crear tabla 'subcategories' para manejar subcategorías de productos
CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Actualizar tabla 'products' para soportar subcategorías
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.subcategories(id),
ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- 5. Insertar las subcategorías para ACCESORIOS
INSERT INTO public.subcategories (name, category) VALUES
  ('Cintos', 'Accesorios'),
  ('Bandoleras', 'Accesorios'),
  ('Calcetines', 'Accesorios'),
  ('Gorras', 'Accesorios'),
  ('Varios', 'Accesorios')
ON CONFLICT DO NOTHING;

-- 6. Habilitar RLS (Row Level Security) para la tabla subcategories
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- 7. Crear políticas para permitir acceso público a subcategorías
-- Primero eliminamos políticas existentes si las hay
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."subcategories";
DROP POLICY IF EXISTS "Enable insert access for all users" ON "public"."subcategories";
DROP POLICY IF EXISTS "Enable update access for all users" ON "public"."subcategories";
DROP POLICY IF EXISTS "Enable delete access for all users" ON "public"."subcategories";

-- Crear nuevas políticas
CREATE POLICY "Enable read access for all users" ON "public"."subcategories"
AS PERMISSIVE 
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert access for all users" ON "public"."subcategories"
AS PERMISSIVE 
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON "public"."subcategories"
AS PERMISSIVE 
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON "public"."subcategories"
AS PERMISSIVE 
FOR DELETE
TO public
USING (true);

-- 8. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON public.subcategories(category);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON public.products(subcategory);

-- 9. Confirmación Final
SELECT 'Esquema actualizado correctamente con subcategorías de Accesorios' as status;

-- 10. Verificar subcategorías insertadas
SELECT * FROM public.subcategories WHERE category = 'Accesorios';
