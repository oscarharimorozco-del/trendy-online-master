-- COPIA Y PEGA ESTO EN EL EDITOR SQL DE SUPABASE --

-- 1. Actualizar tabla 'gallery' para soportar imágenes destacadas (Presentación)
ALTER TABLE public.gallery 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- 2. Actualizar tabla 'products' para soportar precios especiales y estados
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS promo_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_promotion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT false;

-- 3. Confirmación (Opcional, solo para verificar)
SELECT 'Esquema actualizado correctamente' as status;
