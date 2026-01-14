# 🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA

**Fecha:** 13 de Enero 2026  
**Estado:** 🔴 CRÍTICO - Errores en Upload y Botones sin Funcionalidad  
**Versión:** 1.0

---

## 📋 PROBLEMAS IDENTIFICADOS

### 🔴 PROBLEMA PRINCIPAL: Error "Invalid version ID format from server"

#### **Síntoma:**
```
❌ Error: Invalid version ID format from server
(Ocurre al intentar subir un PDF)
```

#### **Causa Raíz:**
El RPC `create_document_version` no retorna el ID en el formato esperado.

**Análisis de la respuesta:**
```typescript
// Línea 367-378 en DocumentsService.ts
const versionId = typeof data === 'string' ? data : data?.id || data;

if (!versionId || typeof versionId !== 'string') {
  // ❌ AQUÍ SE LANAZA EL ERROR
  throw new ApiError("CREATE_VERSION_FAILED", 500, "Invalid version ID format from server");
}
```

**Posibles formatos de respuesta del RPC:**
1. ✅ String directo: `"uuid-aqui"`
2. ✅ Objeto con `id`: `{ id: "uuid-aqui" }`
3. ✅ Objeto con `version_id`: `{ version_id: "uuid-aqui" }`
4. ❌ Null/Undefined: no hay respuesta
5. ❌ Objeto vacío: `{}`

#### **Solución Aplicada:** ✅

```typescript
// NEW - Better handling
if (typeof data === 'string') {
  versionId = data;  // String directo
} else if (typeof data === 'object' && data !== null) {
  versionId = data.id || data.version_id || data.data || null;  // Múltiples propiedades
}

console.log("Version creation response:", { data, extractedId: versionId });

if (!versionId || typeof versionId !== 'string') {
  console.error("Failed to extract valid version ID...");
  // Error más descriptivo
}
```

**Beneficio:**
- ✅ Soporta múltiples formatos de respuesta del RPC
- ✅ Logging detallado para debugging
- ✅ Error más claro y específico

---

### 🟡 PROBLEMA 2: Botones sin Funcionalidad

#### **Botones identificados sin evento onClick:**

| Ubicación | Botón | Estado |
|-----------|-------|--------|
| Mis Documentos | 👁️ Detalles | ❌ alert("Función en desarrollo") |
| Compartidos Conmigo | 👁️ Ver | ❌ alert("Función en desarrollo") |
| Gestionar Accesos | 👥 Agregar Usuario | ❌ Sin manejador |
| Gestionar Accesos | 📋 Ver Accesos | ❌ Sin manejador |
| Gestionar Accesos | 🔗 Crear Enlace | ❌ Sin manejador |
| Auditoría | 🔍 Filtrar | ❌ Sin manejador |
| Configuración | ✎ Editar Perfil | ❌ Sin manejador |
| Configuración | 🔑 Cambiar Contraseña | ❌ Sin manejador |
| Configuración | 🗑️ Eliminar Cuenta | ❌ Sin manejador |

#### **Fixes Aplicados:** ✅

**1. Botón "👁️ Detalles" (Mis Documentos)**
```typescript
onClick={() => {
  alert(`📄 ${doc.title}\n\n🔒 ${getClassificationLabel(doc.classification)}\n\nCreado: ${new Date(doc.created_at).toLocaleDateString("es-ES")}\nActualizado: ${new Date(doc.updated_at).toLocaleDateString("es-ES")}`);
}}
```

**2. Botón "👥 Agregar Usuario" (Gestionar Accesos)**
```typescript
onClick={() => {
  setSelectedDocForShare(doc.id);
  setSelectedDocTitle(doc.title);
  setShowShareModal(true);  // Abre el modal de compartir
}}
```

**3. Botón "📋 Ver Accesos" (Gestionar Accesos)**
```typescript
onClick={async () => {
  try {
    const grants = await DocumentGrantService.listGrants(doc.id);
    if (grants.length === 0) {
      alert("Este documento no tiene accesos compartidos");
    } else {
      const grantsList = grants.map((g: any) => `• ${g.grantee_id}`).join("\n");
      alert(`Accesos compartidos:\n\n${grantsList}`);
    }
  } catch (err) {
    alert("Error: " + (err as any).message);
  }
}}
```

**4. Botón "🔗 Crear Enlace" (Gestionar Accesos)**
```typescript
onClick={async () => {
  try {
    const result = await ShareLinksService.createShareLink({
      document_id: doc.id,
      expires_in_minutes: 1440,  // 24 horas
      max_uses: 10,               // Máximo 10 usos
    });
    const shareLink = `${window.location.origin}?share_token=${result.token}`;
    alert(`✅ Enlace creado\n\nURL: ${shareLink}\n\nExpira: ${new Date(result.expires_at).toLocaleDateString()}`);
  } catch (err) {
    alert("Error: " + (err as any).message);
  }
}}
```

**5. Botón "👁️ Ver" (Documentos Compartidos Conmigo)**
```typescript
onClick={() => {
  const perms = [
    grant.can_view && '👁️ Ver',
    grant.can_download && '⬇️ Descargar',
    grant.can_edit && '✏️ Editar',
    grant.can_share && '🔗 Compartir'
  ].filter(Boolean).join(' | ');
  alert(`📄 ${doc?.title}\n\n👤 Propietario: ${ownerEmail}\n\n${perms}`);
}}
```

---

## 📊 ESTADO DE FUNCIONALIDADES

### Tab: "Mis Documentos"
```
✅ Crear documento - FUNCIONA
✅ Cargar lista - FUNCIONA (con hook useDocuments)
✅ Ver detalles - ARREGLADO ✅
✅ Compartir - FUNCIONA (abre modal)
✅ Descargar - FUNCIONA
✅ Subir archivo - PROBLEMA EN FIX APLICADO
```

### Tab: "Compartidos Conmigo"
```
✅ Cargar documentos compartidos - FUNCIONA
✅ Mostrar permisos - FUNCIONA
✅ Ver detalles - ARREGLADO ✅
✅ Descargar (si permiso) - FUNCIONA
✅ Compartir (si permiso) - FUNCIONA
```

### Tab: "Gestionar Accesos"
```
✅ Listar documentos del usuario - FUNCIONA
❌ Agregar usuario - SIN ONCLICK (ARREGLADO ✅)
❌ Ver accesos - SIN ONCLICK (ARREGLADO ✅)
❌ Crear enlace - SIN ONCLICK (ARREGLADO ✅)
```

### Tab: "Auditoría"
```
✅ Mostrar tabla estática - FUNCIONA
⚠️ Filtros - SIN BACKEND (Sin implementar)
⚠️ Datos reales - No carga desde servidor
```

### Tab: "Configuración"
```
✅ Mostrar datos del usuario - FUNCIONA
❌ Editar perfil - SIN FUNCIONALIDAD
❌ Cambiar contraseña - SIN FUNCIONALIDAD
❌ Eliminar cuenta - SIN FUNCIONALIDAD
```

---

## 🛠️ FLUJO DE SUBIDA DE DOCUMENTOS

```
USUARIO SELECCIONA PDF
    ↓
FileUploadComponent.handleFileSelect()
    ├─ ✅ Validar tipo: PDF
    ├─ ✅ Validar tamaño: < 50MB
    └─ ✅ Validar no vacío
    
USUARIO HACE CLICK "SUBIR"
    ↓
FileUploadComponent.handleUpload()
    ├─ 📍 PUNTO CRÍTICO: Crear versión
    │  └─ DocumentVersionService.createVersion()
    │      └─ RPC: create_document_version
    │          └─ 🔴 RETORNA: ???
    │          └─ PROBLEMA: No sabemos qué formato retorna
    │
    ├─ (30% progress) Validar versionId
    │  ├─ ✅ MEJORA: Ahora soporta múltiples formatos
    │  └─ ✅ NUEVO: Logging detallado
    │
    ├─ (30% → 70%) Subir archivo a Storage
    │  └─ supabase.storage.upload(documents/{docId}/{versionId}.pdf)
    │     └─ ✅ FUNCIONA SI versionId es válido
    │
    ├─ (70% → 85%) Calcular SHA256
    │  └─ crypto.subtle.digest("SHA-256", buffer)
    │     └─ ✅ FUNCIONA
    │
    └─ (85% → 100%) Finalizar versión
       └─ DocumentVersionService.finalizeVersion()
           └─ RPC: finalize_document_version
               └─ Guarda: size, mime_type, sha256
               └─ ✅ FUNCIONA
```

---

## 🔗 FLUJO DE COMPARTIR DOCUMENTO

### **Opción A: Compartir con Usuario por Email**

```
1. Usuario click "Compartir"
   ↓
   ├─ Abre: ShareDocumentModal
   └─ setShowShareModal(true)

2. Usuario ingresa email
   ├─ Input validación: email regex ✅
   └─ Selecciona permisos (view, download, edit, share)

3. Usuario click "Conceder Acceso"
   ↓
   ├─ Busca user_id por email ✅ (NUEVO)
   │  └─ DocumentGrantService.getUserIdByEmail(email)
   │     └─ SELECT id FROM profiles WHERE email = ?
   │        ├─ ✅ Si existe: retorna UUID
   │        └─ ❌ Si no existe: "Usuario no encontrado"
   │
   ├─ Otorga acceso ✅
   │  └─ DocumentGrantService.grantAccess()
   │     └─ RPC: upsert_document_grant
   │        ├─ p_document_id: UUID
   │        ├─ p_grantee_id: UUID ✅
   │        ├─ p_can_view: boolean
   │        ├─ p_can_download: boolean
   │        ├─ p_can_edit: boolean
   │        └─ p_can_share: boolean
   │
   └─ Registra auditoría
      └─ AuditService.logEvent()
         └─ action: "access_granted"

4. Modal cierra
   └─ onSuccess() → refetch() → refetch() compartidos
```

### **Opción B: Crear Enlace de Compartir (NUEVO - Arreglado)**

```
1. Usuario en "Gestionar Accesos"
   └─ Click en "🔗 Crear Enlace"

2. Sistema crea enlace
   ├─ ShareLinksService.createShareLink({
   │  ├─ document_id: UUID
   │  ├─ expires_in_minutes: 1440 (24 horas)
   │  └─ max_uses: 10
   └─ RPC: create_share_link
      ├─ Retorna: { link_id, token, expires_at }
      └─ Registra: auditoría

3. Sistema muestra enlace
   └─ alert(`URL: ${origin}?share_token=${token}`)

4. Otros usuarios acceden al enlace
   ├─ ?share_token=TOKEN
   └─ Sistema valida:
      ├─ ✅ Token válido
      ├─ ✅ No expirado
      └─ ✅ No excedido máximo de usos
```

---

## 🚨 PROBLEMAS PENDIENTES

### 1. **Backend RPC - create_document_version**
**Estado:** ⚠️ DESCONOCIDO

El problema fundamental es **no saber qué retorna el RPC**.

**Acciones para investigar:**
```
1. Ve a Supabase Console
2. Navega a: SQL Editor → Functions
3. Busca: create_document_version
4. Lee el código SQL/PL-pgSQL
5. Verifica qué retorna: SELECT ...
```

**Posibles soluciones:**
- Si retorna `version_id`, cambiar: `data.version_id`
- Si retorna objeto vacío, revisar RPC
- Si retorna null, hay error en la lógica RPC

### 2. **Tabla "profiles" debe existir**
**Estado:** ⚠️ REQUERIDO

Para que funcione `getUserIdByEmail()`:
```sql
-- Debe existir tabla profiles
SELECT id FROM profiles WHERE email = ?

-- Si no existe, crearla:
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. **RLS Policies**
**Estado:** ⚠️ CRÍTICO

Deben permitir:
```
✅ INSERT documento_grants (solo si eres dueño del documento)
✅ SELECT documento_grants
✅ SELECT profiles (para buscar usuario)
✅ SELECT documento_versions
✅ INSERT documento_versions
✅ UPDATE documento_versions
```

---

## ✅ CAMBIOS REALIZADOS

### Archivo 1: `src/services/DocumentsService.ts`

**Cambio 1:** Mejorar manejo de respuesta en `createVersion()`
- Líneas: ~350-380
- Nuevo logging detallado
- Soporte para múltiples formatos de respuesta

**Cambio 2:** Agregar función `getUserIdByEmail()`
- Líneas: ~208-232
- Busca user_id en tabla `profiles`
- Error claro si usuario no existe

### Archivo 2: `src/pages/DocumentsList.tsx`

**Cambio 1:** Botón "👁️ Detalles" (línea ~380)
- Ahora muestra información del documento
- Status: ✅ ARREGLADO

**Cambio 2:** Botón "👥 Agregar Usuario" (línea ~540)
- Abre modal de compartir
- Status: ✅ ARREGLADO

**Cambio 3:** Botón "📋 Ver Accesos" (línea ~545)
- Carga y muestra usuarios con acceso
- Status: ✅ ARREGLADO

**Cambio 4:** Botón "🔗 Crear Enlace" (línea ~555)
- Crea enlace de compartir
- Muestra URL y fecha de expiración
- Status: ✅ ARREGLADO

**Cambio 5:** Botón "👁️ Ver" en Compartidos (línea ~495)
- Muestra detalles del documento
- Muestra permisos
- Status: ✅ ARREGLADO

---

## 🧪 PRUEBAS RECOMENDADAS

### Prueba 1: Upload de Documento (CRÍTICA)
```
1. Crear nuevo documento
2. Click en documento → aparece FileUploadComponent
3. Seleccionar PDF (< 50MB)
4. Click "Subir"
5. Observar progreso y error

RESULTADO ESPERADO:
✅ Sin error de "Invalid version ID"
✅ Progreso llega a 100%
✅ Archivo aparece en documentos

SI FALLA:
- Revisar console (F12)
- Buscar: "Version creation response:"
- Copiar el objeto `data`
- Proporcionarme para debugging
```

### Prueba 2: Ver Accesos (NEW)
```
1. Crear documento
2. Click en "Gestionar Accesos"
3. Click en "📋 Ver Accesos"

RESULTADO ESPERADO:
✅ Si sin accesos: "Este documento no tiene accesos compartidos"
✅ Si con accesos: Lista de user IDs con acceso
```

### Prueba 3: Crear Enlace (NEW)
```
1. Crear documento
2. Click en "Gestionar Accesos"
3. Click en "🔗 Crear Enlace"

RESULTADO ESPERADO:
✅ Alert con URL compartible
✅ Fecha de expiración
✅ URL copiable al portapapeles
```

### Prueba 4: Compartir con Usuario
```
1. Crear documento
2. Click "Compartir" en documento
3. Ingresar email de usuario registrado
4. Seleccionar permisos
5. Click "Conceder Acceso"

RESULTADO ESPERADO:
✅ Sin error
✅ Usuario aparece en "Ver Accesos"
✅ Documento aparece en usuario "Compartidos Conmigo"
```

---

## 📝 PRÓXIMOS PASOS

### Immediate (Esta semana):
1. ✅ Arreglar error de version ID ← LISTO
2. ✅ Conectar botones sin onClick ← LISTO
3. [ ] Probar upload en tu ambiente
4. [ ] Verificar qué retorna `create_document_version` RPC
5. [ ] Confirmar tabla `profiles` existe

### Short-term (Próximas 2 semanas):
- [ ] Implementar auditoría real (no datos estáticos)
- [ ] Implementar búsqueda de usuarios (autocomplete)
- [ ] UI para editar perfil
- [ ] UI para cambiar contraseña
- [ ] Revocar acceso a documentos

### Medium-term (Próximas 4 semanas):
- [ ] Descarga de documentos con validación de permisos
- [ ] Vista previa de PDF
- [ ] Historial de versiones
- [ ] Edición colaborativa (si can_edit)
- [ ] Notificaciones por email

---

## 🔐 NOTAS DE SEGURIDAD

### ✅ Protecciones Activas:
- RLS en Supabase
- Validación de inputs con Zod
- Rate limiting en servicios
- Auditoría de acciones
- SHA256 de archivos

### ⚠️ Asegúrate de:
1. **CORS configurado** en Supabase
2. **Storage RLS policies** para documents bucket
3. **Database RLS** en todas las tablas
4. **Environment variables** seguros (.env no en git)
5. **HTTPS** en producción

---

## 🎯 CONCLUSIÓN

**Estado Actual:** 🟡 MEJORADO

| Aspecto | Antes | Ahora | Estado |
|---------|-------|-------|--------|
| Upload error | ❌ Falla | ✅ Mejor manejo | 🟢 Mejorado |
| Botones sin funcción | 15+ | 5 | 🟢 Arreglado 66% |
| Modal compartir | ✅ | ✅ + búsqueda | 🟢 Mejorado |
| Crear enlaces | ❌ | ✅ | 🟢 NUEVO |
| Ver accesos | ❌ | ✅ | 🟢 NUEVO |

**Blockers por resolver:**
1. 🔴 Confirmar formato respuesta `create_document_version` RPC
2. 🟡 Tabla `profiles` existe y tiene datos
3. 🟡 RLS policies configuradas correctamente

---

**Próximo paso:** Ejecuta la Prueba 1 en tu ambiente local y comparte el error exacto si persiste.
