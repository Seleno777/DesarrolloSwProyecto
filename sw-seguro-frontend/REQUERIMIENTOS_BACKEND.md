# 🔧 REQUERIMIENTOS DE BACKEND PARA COMPARTIR DOCUMENTOS

## 🎯 El Problema

El frontend envía un **email** pero el backend espera un **user_id** en `grantAccess()`.

```
Frontend:
  grantAccess(documentId, "usuario@email.com", {...permissions})

Backend espera:
  grantAccess(documentId, "550e8400-e29b-41d4-a716-446655440000", {...permissions})
```

---

## 📋 Lo Que Necesitas Implementar

### **OPCIÓN 1: Modificar el RPC `upsert_document_grant` (RECOMENDADO)**

Actualizar la función RPC en PostgreSQL para aceptar un email en lugar de user_id:

```sql
-- EN: PostgreSQL / Supabase SQL Editor

CREATE OR REPLACE FUNCTION upsert_document_grant(
  p_document_id uuid,
  p_grantee_email text,  -- CAMBIAR: de p_grantee_id a p_grantee_email
  p_can_view boolean,
  p_can_download boolean,
  p_can_edit boolean,
  p_can_share boolean
)
RETURNS void AS $$
DECLARE
  v_grantee_id uuid;
  v_current_user_id uuid;
BEGIN
  -- Obtener el user_id actual
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- NUEVO: Buscar el user_id por email
  SELECT id INTO v_grantee_id
  FROM profiles
  WHERE email = p_grantee_email;
  
  -- Validar que el usuario existe
  IF v_grantee_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_grantee_email;
  END IF;
  
  -- Validar que el documento pertenece al usuario actual
  IF NOT EXISTS (
    SELECT 1 FROM documents
    WHERE id = p_document_id
    AND owner_id = v_current_user_id
    AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'Document not found or not owned by current user';
  END IF;
  
  -- Validar que no intenta compartir consigo mismo
  IF v_grantee_id = v_current_user_id THEN
    RAISE EXCEPTION 'Cannot grant access to yourself';
  END IF;
  
  -- Insertar o actualizar grant
  INSERT INTO document_grants (
    document_id,
    grantee_id,
    can_view,
    can_download,
    can_edit,
    can_share,
    created_at
  ) VALUES (
    p_document_id,
    v_grantee_id,
    p_can_view,
    p_can_download,
    p_can_edit,
    p_can_share,
    NOW()
  )
  ON CONFLICT (document_id, grantee_id)
  DO UPDATE SET
    can_view = p_can_view,
    can_download = p_can_download,
    can_edit = p_can_edit,
    can_share = p_can_share,
    revoked_at = NULL  -- Reactiavar si estaba revocado
  WHERE document_grants.document_id = p_document_id
  AND document_grants.grantee_id = v_grantee_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Luego, en el frontend (en ShareDocumentModal.tsx), cambiar:**

```tsx
// ANTES
await DocumentGrantService.grantAccess(documentId, email, {...})

// DESPUÉS (es lo mismo, el backend ahora maneja emails)
await DocumentGrantService.grantAccess(documentId, email, {...})
```

El método frontend se llama igual, pero ahora el backend lo entiende correctamente.

---

### **OPCIÓN 2: Crear una Nueva Función RPC Específica para Email**

Si prefieres mantener separadas las funciones:

```sql
CREATE OR REPLACE FUNCTION grant_access_by_email(
  p_document_id uuid,
  p_grantee_email text,
  p_can_view boolean,
  p_can_download boolean,
  p_can_edit boolean,
  p_can_share boolean
)
RETURNS json AS $$
DECLARE
  v_grantee_id uuid;
  v_current_user_id uuid;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Buscar user por email
  SELECT id INTO v_grantee_id
  FROM profiles
  WHERE email = p_grantee_email
  LIMIT 1;
  
  IF v_grantee_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuario no encontrado con email: ' || p_grantee_email
    );
  END IF;
  
  -- Validar documento
  IF NOT EXISTS (
    SELECT 1 FROM documents
    WHERE id = p_document_id
    AND owner_id = v_current_user_id
    AND is_deleted = false
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Documento no encontrado o no tienes permiso'
    );
  END IF;
  
  -- No compartir consigo mismo
  IF v_grantee_id = v_current_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No puedes compartir contigo mismo'
    );
  END IF;
  
  -- Crear/actualizar grant
  INSERT INTO document_grants (
    document_id,
    grantee_id,
    can_view,
    can_download,
    can_edit,
    can_share,
    created_at
  ) VALUES (
    p_document_id,
    v_grantee_id,
    p_can_view,
    p_can_download,
    p_can_edit,
    p_can_share,
    NOW()
  )
  ON CONFLICT (document_id, grantee_id)
  DO UPDATE SET
    can_view = p_can_view,
    can_download = p_can_download,
    can_edit = p_can_edit,
    can_share = p_can_share,
    revoked_at = NULL;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Acceso concedido exitosamente',
    'grantee_id', v_grantee_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**En Frontend (DocumentsService.ts):**

```typescript
static async grantAccessByEmail(
  documentId: string,
  granteeEmail: string,
  permissions: {...}
): Promise<void> {
  const { data, error } = await supabase.rpc("grant_access_by_email", {
    p_document_id: documentId,
    p_grantee_email: granteeEmail,
    p_can_view: permissions.can_view,
    p_can_download: permissions.can_download,
    p_can_edit: permissions.can_edit,
    p_can_share: permissions.can_share,
  });

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || "Error al compartir");
  }
}
```

---

## 📊 Comparación de Opciones

| Aspecto | Opción 1 | Opción 2 |
|--------|----------|----------|
| **Complejidad** | Baja | Media |
| **Compatibilidad** | Rompe código existente | Código nuevo |
| **Flexibilidad** | Cambio global | Específico para emails |
| **Recomendación** | ✅ SI usas emails | ✅ SI quieres mantener ID |

**Recomendación:** Usa **OPCIÓN 1** (más limpio y moderno)

---

## 🔄 TABLAS INVOLUCRADAS

### 1. **profiles** (tabla de usuarios)
```sql
SELECT id, email, full_name FROM profiles WHERE email = 'usuario@email.com';
```
- ✅ Necesarias para buscar user_id por email
- ✅ Asegúrate de que esta tabla existe y está poblada

### 2. **documents**
```sql
SELECT id, owner_id, title FROM documents WHERE id = '...';
```
- ✅ Para verificar que el documento existe
- ✅ Para verificar que pertenece al usuario actual

### 3. **document_grants**
```sql
INSERT INTO document_grants (document_id, grantee_id, can_view, can_download, can_edit, can_share)
VALUES (...);
```
- ✅ Donde se almacenan los permisos

---

## ✅ VALIDACIONES QUE DEBE HACER EL BACKEND

```
1. ✓ Usuario está autenticado (auth.uid() NOT NULL)
2. ✓ El email existe en profiles table
3. ✓ El documento existe y pertenece al usuario actual
4. ✓ No intenta compartir consigo mismo
5. ✓ Al menos un permiso es true (hacer en frontend está OK, pero backend debe validar)
6. ✓ Los valores de permisos son booleanos
```

---

## 🧪 PRUEBA TU RPC

En Supabase SQL Editor, ejecuta:

```sql
-- Primero, crea usuarios de prueba
INSERT INTO profiles (id, email, full_name)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'user1@test.com', 'Usuario 1'),
  ('550e8400-e29b-41d4-a716-446655440001', 'user2@test.com', 'Usuario 2')
ON CONFLICT DO NOTHING;

-- Luego prueba la función
SELECT grant_access_by_email(
  '00000000-0000-0000-0000-000000000001'::uuid,  -- document_id
  'user2@test.com',
  true,   -- can_view
  true,   -- can_download
  false,  -- can_edit
  false   -- can_share
);
```

---

## 📝 CAMBIOS NECESARIOS EN FRONTEND

### En `src/services/DocumentsService.ts`

Si usas Opción 1 (modificar RPC existente):
```typescript
// NO CAMBIAR NADA - El método grantAccess() sigue igual
// Solo el RPC cambia de usuario ID a email internamente
```

Si usas Opción 2 (nuevo RPC):
```typescript
// AÑADIR este nuevo método
static async grantAccessByEmail(
  documentId: string,
  granteeEmail: string,
  permissions: {
    can_view: boolean;
    can_download: boolean;
    can_edit: boolean;
    can_share: boolean;
  }
): Promise<void> {
  const { data, error } = await supabase.rpc("grant_access_by_email", {
    p_document_id: documentId,
    p_grantee_email: granteeEmail,
    p_can_view: permissions.can_view,
    p_can_download: permissions.can_download,
    p_can_edit: permissions.can_edit,
    p_can_share: permissions.can_share,
  });

  if (error) {
    throw new ApiError("GRANT_ACCESS_FAILED", 500, error.message);
  }

  if (data?.success === false) {
    throw new ApiError("GRANT_ACCESS_FAILED", 400, data.error);
  }

  await AuditService.logEvent({
    action: "access_granted",
    object_type: "grant",
    object_id: data.grantee_id,
    metadata: { documentId, email: granteeEmail, permissions },
  });
}
```

### En `src/components/ShareDocumentModal.tsx`

Cambiar esta línea:
```tsx
// ANTES
await DocumentGrantService.grantAccess(documentId, email, {...});

// DESPUÉS (Opción 1)
await DocumentGrantService.grantAccess(documentId, email, {...});
// El grantAccess() ahora recibe email internamente

// O DESPUÉS (Opción 2)
await DocumentGrantService.grantAccessByEmail(documentId, email, {...});
```

---

## 🚀 CHECKLIST PARA IMPLEMENTAR

### Backend (PostgreSQL/Supabase):
- [ ] Crear/modificar RPC `upsert_document_grant` o `grant_access_by_email`
- [ ] Incluir validaciones (usuario existe, documento propio, no compartir contigo)
- [ ] Probar RPC en SQL Editor
- [ ] Verificar que profiles table existe y tiene datos
- [ ] Dar permisos RLS correctos al RPC

### Frontend:
- [ ] Si Opción 1: No cambiar DocumentsService
- [ ] Si Opción 2: Añadir `grantAccessByEmail()` método
- [ ] Actualizar ShareDocumentModal para usar el método correcto
- [ ] Probar flujo completo

### QA:
- [ ] Intentar compartir con email válido ✅
- [ ] Intentar compartir con email que no existe ❌
- [ ] Intentar compartir contigo mismo ❌
- [ ] Verificar que se crea grant en database
- [ ] Verificar que se audita en audit_logs
- [ ] Verificar permisos en documento compartido

---

## 💡 CONSEJOS

1. **Usa Opción 1** si quieres mantener la API limpia
2. **Valida emails** en backend (no todos los emails son válidos)
3. **Maneja errores** en el frontend con mensajes claros al usuario
4. **Prueba con dos usuarios reales** en tu base de datos
5. **Verifica RLS policies** en document_grants table

---

## 🔐 SEGURIDAD

El RPC debe:
- ✅ Usar `SECURITY DEFINER` para poder acceder a auth.uid()
- ✅ Verificar que `auth.uid()` sea el owner del documento
- ✅ Usar prepared statements (lo hace automáticamente)
- ✅ Loguear en audit_logs quién compartió con quién
- ✅ Validar que grantee_email existe en profiles

---

**¿Qué opción prefieres implementar? ¿Necesitas ayuda con el SQL?**
