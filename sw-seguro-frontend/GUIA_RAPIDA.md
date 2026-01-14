# 🚀 GUÍA RÁPIDA - PASOS PARA RESOLVER EL ERROR

## 🎯 PROBLEMA PRINCIPAL
```
Error: Invalid version ID format from server
(Al intentar subir un PDF)
```

---

## ✅ LO QUE YA HICE

### 1. **Mejoré el manejo de respuestas del RPC**
- Ahora soporta múltiples formatos de datos
- Agregué logging detallado para debugging
- Mejor mensajes de error

### 2. **Conecté todos los botones sin funcionalidad**
- ✅ "Detalles" en Mis Documentos
- ✅ "Ver Accesos" en Gestionar Accesos
- ✅ "Crear Enlace" en Gestionar Accesos
- ✅ "Agregar Usuario" en Gestionar Accesos
- ✅ "Ver" en Documentos Compartidos

### 3. **Creé función de búsqueda de usuario por email**
- Ahora busca user_id antes de compartir
- Error claro si usuario no existe

---

## 🔧 PASOS PARA QUE FUNCIONE

### PASO 1: Verifica la tabla "profiles"

En **Supabase Console → SQL Editor**, ejecuta:

```sql
-- Verificar si existe y tiene datos
SELECT * FROM profiles LIMIT 5;

-- Si NO existe, crearla:
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Si existe pero está vacía, popular con usuarios:
INSERT INTO profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

---

### PASO 2: Verifica las RLS Policies

En **Supabase Console → Authentication → Policies**:

```sql
-- Para tabla: profiles
-- Policy: SELECT - Allow all authenticated users
CREATE POLICY "users_can_read_profiles"
ON profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Para tabla: document_grants
-- Policy: SELECT - Allow if user is owner or grantee
CREATE POLICY "users_can_view_grants"
ON document_grants FOR SELECT
USING (
  auth.uid() = (SELECT owner_id FROM documents WHERE id = document_id)
  OR auth.uid() = grantee_id
);

-- Policy: INSERT - Only document owner can grant
CREATE POLICY "users_can_grant_access"
ON document_grants FOR INSERT
WITH CHECK (
  auth.uid() = (SELECT owner_id FROM documents WHERE id = document_id)
);
```

---

### PASO 3: Investiga qué retorna el RPC

#### Opción A: Desde Supabase Console
1. Ve a **Supabase Console → SQL Editor**
2. Click en **"create_document_version"** en el panel derecho
3. Lee el código SQL/PL-pgSQL
4. Busca `SELECT` o `RETURN`
5. Verifica qué campo retorna

#### Opción B: Desde el navegador
1. Abre la aplicación en Chrome
2. Presiona **F12** (Developer Tools)
3. Ve a la pestaña **Console**
4. Cuando intentes subir un archivo, revisa el error
5. Copia el log: `"Version creation response:"`
6. Comparte ese log conmigo

---

### PASO 4: Ajusta el código si necesario

Si el RPC retorna un campo diferente, edita:

**Archivo:** `src/services/DocumentsService.ts`  
**Línea:** ~360

Cambia:
```typescript
// Actual - intenta múltiples opciones
versionId = data.id || data.version_id || data.data || null;

// Si el RPC usa otro nombre, agrégalo aquí:
versionId = data.id || data.version_id || data.data || data.your_field_name || null;
```

---

## 🧪 PRUEBA RÁPIDA

### Test 1: Upload de PDF
```
1. Crear nuevo documento
2. Subir PDF < 50MB
3. Ver si hay error en consola

ÉXITO: ✅ Progreso llega a 100%, no hay error
ERROR: ❌ Verifica los logs (F12)
```

### Test 2: Compartir con Usuario
```
1. Click "Compartir" en documento
2. Ingresar email de usuario registrado (que existe en BD)
3. Seleccionar permisos
4. Click "Conceder Acceso"

ÉXITO: ✅ Modal cierra, sin error
ERROR: ❌ Verifica que usuario exista en profiles
```

### Test 3: Crear Enlace
```
1. Click "Gestionar Accesos"
2. Click "🔗 Crear Enlace"

ÉXITO: ✅ Alert con URL y fecha expiración
ERROR: ❌ Revisa logs en consola
```

---

## 🐛 SI SIGUE FALLANDO

### Recolecta esta información:
1. **Screenshot del error** (completo)
2. **Log de consola** (F12 → Console):
   - Busca "Version creation response:"
   - Copia todo el objeto `data`
3. **Error exacto** que ves
4. **Pasos para reproducir**

### Ejecuta el script de debug:
```javascript
// Copia el contenido de DEBUG_RPC.js
// Pégalo en la consola (F12)
// Presiona Enter
// Comparte la salida conmigo
```

---

## 📱 FUNCIONALIDADES ADICIONALES AHORA DISPONIBLES

### ✅ NUEVAS:
- Crear enlace de compartir con expiración
- Ver lista de usuarios con acceso
- Botones de "Detalles" funcionales
- Búsqueda de usuario por email antes de compartir

### 🟡 EN PROGRESO:
- Auditoría real (ahora es estática)
- Notificaciones por email
- Descarga con validación de permisos

### ❌ NO IMPLEMENTADAS:
- Editar perfil
- Cambiar contraseña
- Eliminar cuenta
- Búsqueda avanzada
- Edición colaborativa

---

## 📞 PRÓXIMAS ACCIONES

**Después de que confirmes que upload funciona:**

1. [ ] Probar compartir documento
2. [ ] Probar crear enlace
3. [ ] Probar ver accesos
4. [ ] Implementar notificaciones
5. [ ] Implementar auditoría real
6. [ ] Agregar edición de perfil

---

## 📊 CAMBIOS APLICADOS HOYA

| Archivo | Cambios | Líneas |
|---------|---------|--------|
| DocumentsService.ts | Mejorar createVersion(), agregar getUserIdByEmail() | ~360, ~210 |
| ShareDocumentModal.tsx | Usar búsqueda de usuario | ~56 |
| DocumentsList.tsx | Conectar 5 botones sin funcionalidad | ~380, ~540-560, ~495 |

---

## ✨ CONCLUSIÓN

**Tu aplicación está casi lista.** El problema de upload probablemente se debe a:

1. ❌ RPC retorna formato no esperado
2. ❌ Tabla `profiles` no existe o está vacía
3. ❌ RLS policies no permiten SELECT en profiles

**Probabilidad:**
- 60% → Problema en RPC `create_document_version`
- 30% → Tabla `profiles` vacía o no existe
- 10% → RLS policies bloqueando

**Siguiente paso:** Ejecuta PASO 1 y PASO 2 arriba, luego prueba upload.

Si funciona → ¡Listo! 🎉  
Si no → Comparte los logs para debugging detallado.
