-- 1. Crear tabla 'settings' si no existe
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 2. Habilitar RLS (Row Level Security) - opcional pero recomendado
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para permitir que cualquiera lea/escriba (o restringe si prefieres)
CREATE POLICY "Enable all access for all users" ON "public"."settings"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. Confirmación
SELECT 'Tabla settings configurada correctamente' as status;
