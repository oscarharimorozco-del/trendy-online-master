-- ============================================
-- SCRIPT PARA CREAR SUBCATEGORÍAS DE ACCESORIOS
-- ============================================

-- 1. Crear tabla 'subcategories' para manejar subcategorías
CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Actualizar tabla 'products' para soportar subcategorías
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.subcategories(id),
ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- 3. Insertar las subcategorías para ACCESORIOS
INSERT INTO public.subcategories (name, category) VALUES
  ('Cintos', 'Accesorios'),
  ('Bandoleras', 'Accesorios'),
  ('Calcetines', 'Accesorios'),
  ('Gorras', 'Accesorios'),
  ('Varios', 'Accesorios')
ON CONFLICT DO NOTHING;

-- 4. Habilitar RLS (Row Level Security) para la tabla subcategories
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- 5. Crear política para permitir acceso público a subcategorías
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

-- 6. Crear índice para mejorar el rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON public.subcategories(category);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON public.products(subcategory);

-- 7. Verificación final
SELECT 'Subcategorías de Accesorios creadas correctamente' as status;

-- 8. Consulta para verificar las subcategorías insertadas
SELECT * FROM public.subcategories WHERE category = 'Accesorios';
