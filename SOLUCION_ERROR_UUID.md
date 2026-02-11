# 🔧 SOLUCIÓN AL ERROR DE UUID

## ❌ Error Original:
```
ERROR: 23502: null value in column "id" of relation "subcategories" violates not-null constraint
```

## ✅ Problema Resuelto:

El problema era que faltaba **habilitar la extensión UUID** en Supabase.

---

## 🚀 INSTRUCCIONES ACTUALIZADAS

### Paso 1: Ve a Supabase
1. Abre https://supabase.com
2. Selecciona tu proyecto
3. Click en **"SQL Editor"** en el menú lateral

### Paso 2: Copia el Script Actualizado
Copia **TODO** el contenido del archivo:
```
actualizar_base_de_datos.sql
```

### Paso 3: Ejecuta
1. Pega el script completo en el editor SQL
2. Click en **"RUN"** o presiona **Ctrl+Enter**

---

## 📝 Cambios Realizados en el SQL:

### **Antes** (❌ Error):
```sql
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- ❌ Error!
  ...
);
```

### **Ahora** (✅ Correcto):
```sql
-- Paso 0: Habilitar extensión
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Paso 1: Crear tabla
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- ✅ Correcto!
  ...
);
```

---

## 🎯 ¿Qué hace el script corregido?

1. ✅ **Habilita la extensión `uuid-ossp`** (necesaria para generar UUIDs)
2. ✅ **Crea la tabla `subcategories`** con UUID automático
3. ✅ **Inserta las 5 subcategorías**: Cintos, Bandoleras, Calcetines, Gorras, Varios
4. ✅ **Configura permisos** (RLS policies)
5. ✅ **Crea índices** para mejor rendimiento

---

## ✅ Resultado Esperado:

Después de ejecutar el script verás:

```
status: "Esquema actualizado correctamente con subcategorías de Accesorios"
```

Y luego una tabla mostrando las 5 subcategorías:

| id | name | category |
|----|------|----------|
| (uuid) | Cintos | Accesorios |
| (uuid) | Bandoleras | Accesorios |
| (uuid) | Calcetines | Accesorios |
| (uuid) | Gorras | Accesorios |
| (uuid) | Varios | Accesorios |

---

## 🔍 Verificación:

Si todo salió bien, puedes probar:
1. Ir al **Admin Panel** de tu app
2. Subir una imagen
3. Seleccionar categoría "Accesorios"
4. Verás aparecer el selector de subcategorías

---

¡Ahora sí debería funcionar perfecto! 🎉
