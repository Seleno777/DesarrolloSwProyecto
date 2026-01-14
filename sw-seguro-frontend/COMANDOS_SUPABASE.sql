# 🔧 COMANDOS SQL PARA SUPABASE

Ejecuta estos comandos en **Supabase Console → SQL Editor** para que la aplicación funcione correctamente.

---

## ✅ PASO 1: Verificar/Crear tabla `profiles`

```sql
-- 1. Verificar si existe
SELECT * FROM profiles LIMIT 1;

-- 2. Si NO existe o está vacía, ejecutar esto:

-- Crear tabla profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Poblr con usuarios existentes
INSERT INTO profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Verificar que tiene datos
SELECT COUNT(*) as total_users FROM profiles;
```

**Resultado esperado:**
```
✅ Tabla creada/actualizada
✅ Datos: COUNT(*) > 0
```

---

## ✅ PASO 2: Configurar RLS en tabla `profiles`

```sql
-- Política 1: Usuarios autenticados pueden ver todos los perfiles
CREATE POLICY "users_can_read_all_profiles" ON profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- Política 2: Usuarios pueden actualizar su propio perfil
CREATE POLICY "users_can_update_own_profile" ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Verificar políticas
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';
```

**Resultado esperado:**
```
✅ 2 policies creadas
✅ SELECT permitido para autenticados
✅ UPDATE solo para propietario
```

---

## ✅ PASO 3: Verificar tabla `documents`

```sql
-- Verificar estructura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'documents';

-- Si falta owner_id, agregarlo:
ALTER TABLE documents ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Actualizar owner_id de registros sin propietario
UPDATE documents
SET owner_id = auth.uid()
WHERE owner_id IS NULL;
```

---

## ✅ PASO 4: Configurar RLS en tabla `documents`

```sql
-- Habilitar RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Política 1: Propietario puede hacer todo con sus documentos
CREATE POLICY "users_can_manage_own_documents" ON documents
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Política 2: Ver documentos compartidos
CREATE POLICY "users_can_view_shared_documents" ON documents
FOR SELECT
USING (
  auth.uid() = owner_id 
  OR id IN (
    SELECT document_id FROM document_grants 
    WHERE grantee_id = auth.uid() AND revoked_at IS NULL
  )
);
```

---

## ✅ PASO 5: Configurar RLS en tabla `document_grants`

```sql
-- Habilitar RLS
ALTER TABLE document_grants ENABLE ROW LEVEL SECURITY;

-- Política 1: Ver accesos (propietario del doc o grantee)
CREATE POLICY "users_can_view_grants" ON document_grants
FOR SELECT
USING (
  auth.uid() = (SELECT owner_id FROM documents WHERE id = document_id)
  OR auth.uid() = grantee_id
);

-- Política 2: Crear accesos (solo propietario del documento)
CREATE POLICY "users_can_grant_access" ON document_grants
FOR INSERT
WITH CHECK (
  auth.uid() = (SELECT owner_id FROM documents WHERE id = document_id)
);

-- Política 3: Revocar accesos (propietario del documento)
CREATE POLICY "users_can_revoke_access" ON document_grants
FOR DELETE
USING (
  auth.uid() = (SELECT owner_id FROM documents WHERE id = document_id)
);
```

---

## ✅ PASO 6: Verificar tabla `document_versions`

```sql
-- Ver estructura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'document_versions';

-- La tabla debe tener:
-- - id (UUID)
-- - document_id (UUID) - Foreign key a documents
-- - filename (TEXT)
-- - mime_type (TEXT)
-- - size_bytes (INTEGER)
-- - sha256 (TEXT)
-- - created_at (TIMESTAMP)
```

---

## ✅ PASO 7: Configurar Storage

En **Supabase Console → Storage**:

```sql
-- Crear bucket "documents" si no existe
INSERT INTO storage.buckets (id, name, public, owner, created_at, updated_at)
VALUES ('documents', 'documents', FALSE, auth.uid(), NOW(), NOW())
ON CONFLICT DO NOTHING;
```

### Configurar RLS del Storage

```sql
-- Política 1: Upload solo si eres propietario del documento
CREATE POLICY "users_can_upload_own_documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
);

-- Política 2: Download si tienes acceso
CREATE POLICY "users_can_download_documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents'
  AND (
    -- Eres propietario
    owner = auth.uid()
    -- O te compartieron el documento
    OR split_part(name, '/', 1) IN (
      SELECT document_id::text FROM document_grants
      WHERE grantee_id = auth.uid()
    )
  )
);

-- Política 3: Delete solo si eres propietario
CREATE POLICY "users_can_delete_own_uploads"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents'
  AND owner = auth.uid()
);
```

---

## ✅ PASO 8: Verificar funciones RPC

```sql
-- Listar todas las funciones
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Verificar específicamente create_document_version
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'create_document_version';
```

**Importante:** Este comando te mostrará qué retorna exactamente.

---

## ✅ PASO 9: Testing básico

```sql
-- Obtener un usuario existente
SELECT id, email FROM auth.users LIMIT 1;

-- Insertar un documento de prueba (reemplaza USER_ID)
INSERT INTO documents (id, owner_id, title, description, classification)
VALUES (
  gen_random_uuid(),
  'USER_ID_AQUI',
  'Test Document',
  'Test',
  'private'
)
RETURNING id;

-- Insertar un grant de prueba (reemplaza IDs)
INSERT INTO document_grants (
  id, document_id, grantee_id, can_view, can_download, can_edit, can_share
)
VALUES (
  gen_random_uuid(),
  'DOC_ID_AQUI',
  'ANOTHER_USER_ID_AQUI',
  TRUE, TRUE, FALSE, FALSE
)
RETURNING *;

-- Verificar que funcionan los SELECTs
SELECT * FROM document_grants WHERE document_id = 'DOC_ID_AQUI';
```

---

## 🔍 VERIFICACIÓN FINAL

Ejecuta esto para verificar que todo está configurado:

```sql
-- 1. Tabla profiles existe
SELECT to_regclass('public.profiles') IS NOT NULL as profiles_exists;

-- 2. Tabla documents existe
SELECT to_regclass('public.documents') IS NOT NULL as documents_exists;

-- 3. Tabla document_grants existe
SELECT to_regclass('public.document_grants') IS NOT NULL as grants_exists;

-- 4. Tabla document_versions existe
SELECT to_regclass('public.document_versions') IS NOT NULL as versions_exists;

-- 5. RLS habilitado en todas
SELECT tablename, (SELECT count(*) FROM pg_policies WHERE pg_policies.tablename = information_schema.tables.tablename) as policy_count
FROM information_schema.tables
WHERE table_schema = 'public' AND tablename IN ('profiles', 'documents', 'document_grants', 'document_versions');

-- 6. Hay usuarios en auth
SELECT COUNT(*) as total_users FROM auth.users;

-- 7. Hay perfiles en profiles
SELECT COUNT(*) as total_profiles FROM profiles;

-- 8. Bucket documents existe
SELECT name, public FROM storage.buckets WHERE name = 'documents';
```

---

## ❌ SI ALGO FALLA

### Error: "permission denied for schema public"
```sql
-- Verificar rol
SELECT current_role;

-- Ejecutar como usuario admin (desde Supabase Console CLI)
-- O usar la cuenta de servicio
```

### Error: "RLS policy not found"
```sql
-- Verificar políticas existentes
SELECT policyname FROM pg_policies WHERE tablename = 'profiles';

-- Si está vacío, las políticas no existen - crear nuevas
```

### Error: "relation does not exist"
```sql
-- La tabla no existe - crearla según estructura de tu proyecto
-- Revisar migrations o schema del proyecto
```

---

## 📝 NOTAS IMPORTANTES

1. **Reemplaza placeholders:**
   - `USER_ID_AQUI` → ID real de usuario
   - `DOC_ID_AQUI` → ID real de documento

2. **Ejecuta en orden:**
   - Primero crear tablas (PASO 1)
   - Luego configurar RLS (PASOS 2-7)
   - Finalmente testing (PASO 9)

3. **Guarda los resultados:**
   - Comparte conmigo si hay errores
   - Copia el error completo
   - Incluye el comando que falló

4. **Para debugging:**
   - Ejecuta PASO 8 para ver qué retorna create_document_version
   - Cópiame el resultado completo de pg_get_functiondef

---

## ✅ CHECKLIST FINAL

```
[ ] PASO 1: Tabla profiles existe y tiene datos
[ ] PASO 2: RLS en profiles configurado
[ ] PASO 3: Tabla documents con owner_id
[ ] PASO 4: RLS en documents configurado
[ ] PASO 5: RLS en document_grants configurado
[ ] PASO 6: Tabla document_versions verificada
[ ] PASO 7: Storage "documents" configurado
[ ] PASO 8: Función create_document_version verificada
[ ] PASO 9: Testing básico exitoso
[ ] VERIFICACIÓN FINAL: Todos los checks OK
```

Una vez completes esto, tu aplicación debería funcionar sin problemas.

**Próximo paso:** Corre la aplicación y prueba upload.
