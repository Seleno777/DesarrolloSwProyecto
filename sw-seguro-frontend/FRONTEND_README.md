# 🔒 Software Seguro - Frontend

Aplicación React + TypeScript para gestión segura de documentos integrada con Supabase.

## 📋 Contenido

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Configuración](#configuración)
- [Medidas de Seguridad](#medidas-de-seguridad)
- [Servicios](#servicios)
- [Hooks](#hooks)
- [Validación](#validación)
- [Rate Limiting](#rate-limiting)
- [Deployment](#deployment)

---

## ✨ Características

- ✅ **Autenticación segura** con Supabase Auth
- ✅ **Gestión de documentos** con clasificación
- ✅ **Control de acceso** granular por usuario
- ✅ **Share links** con expiración y límite de usos
- ✅ **Auditoría completa** de todas las acciones
- ✅ **Versionado de archivos** con hash SHA256
- ✅ **Rate limiting** en cliente
- ✅ **Validación de datos** con Zod
- ✅ **Manejo seguro de errores**
- ✅ **TypeScript** para type safety

---

## 🏗️ Arquitectura

```
src/
├── auth/
│   ├── AuthProvider.tsx      # Context de autenticación
│   └── ProtectedRoute.tsx    # Rutas protegidas
├── services/
│   ├── AuthService.ts        # Autenticación
│   ├── DocumentsService.ts   # Gestión de documentos, grants, versiones, auditoría
│   └── ShareLinksService.ts  # Gestión de share links
├── hooks/
│   └── useDocuments.ts       # Hooks personalizados para documents
├── lib/
│   ├── supabase.ts           # Cliente Supabase
│   ├── validation.ts         # Esquemas Zod
│   ├── errors.ts             # Manejo de errores
│   └── rateLimit.ts          # Rate limiting
├── types/
│   └── models.ts             # Tipos de datos
├── pages/
│   ├── Login.tsx             # Página de login
│   └── DocumentsList.tsx     # Listado de documentos
├── config/
│   └── security.ts           # Configuración de seguridad
└── styles/
    ├── Auth.css              # Estilos globales
    └── Documents.css         # Estilos de documentos
```

---

## ⚙️ Configuración

### Variables de Entorno (.env)

```env
VITE_SUPABASE_URL=https://pqinxmkybbhykdtouuyv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_k06luEJNfCB3U3fmlGeqzg_RePxvEak
```

### Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build

# Lint
npm run lint
```

---

## 🔐 Medidas de Seguridad

### 1. **Validación de Entrada**
- Zod schemas validan todos los inputs
- Tipos TypeScript en compile time
- Sanitización de emails, URLs, MIME types

```typescript
import { validateInput, SignInSchema } from "../lib/validation";

const validated = validateInput(SignInSchema, { email, password });
```

### 2. **Manejo Seguro de Errores**
- Mensajes genéricos al usuario
- Detalles expuestos solo en desarrollo
- Nunca exponemos información sensible

```typescript
import { getUserErrorMessage } from "../lib/errors";

try {
  // operation
} catch (err) {
  const message = getUserErrorMessage(err); // Seguro para mostrar al usuario
}
```

### 3. **Rate Limiting**
- Previene brute force attacks
- Limites por tipo de operación
- Feedback al usuario con retryAfter

```typescript
import { withRateLimit, authLimiter } from "../lib/rateLimit";

await withRateLimit(authLimiter, async () => {
  return await AuthService.signIn(email, password);
});
```

### 4. **Control de Acceso**
- Verificación de permisos en RPC functions
- Document grants system
- RLS policies en backend

```typescript
const canView = await DocumentGrantService.canAccessDocument(
  documentId,
  userId,
  "view"
);
```

### 5. **Auditoría**
- Registro de todas las acciones
- Metadata detallado
- Timestamps exactos

```typescript
await AuditService.logEvent({
  action: "document_created",
  object_type: "document",
  object_id: documentId,
  metadata: { classification: "confidential" },
});
```

### 6. **Encriptación en Tránsito**
- HTTPS obligatorio
- TLS 1.2+
- JWT tokens en Authorization headers

### 7. **Hash de Archivos**
- SHA256 para integridad
- Verificación en finalize_document_version

```typescript
await DocumentVersionService.finalizeVersion(
  versionId,
  sizeBytes,
  mimeType,
  sha256Hash // SHA256 calculado en cliente
);
```

### 8. **XSS Prevention**
- React escapes contenido por defecto
- No usamos dangerouslySetInnerHTML
- CSP headers recomendados

### 9. **CSRF Protection**
- Supabase maneja automáticamente
- SameSite cookies
- HTTPS obligatorio

---

## 📚 Servicios

### AuthService
```typescript
// Sign in
await AuthService.signIn({ email, password });

// Sign up
await AuthService.signUp({ email, password, confirmPassword });

// Sign out
await AuthService.signOut();

// Get current user
const user = await AuthService.user();

// Reset password
await AuthService.resetPasswordForEmail(email);
```

### DocumentsService
```typescript
// Crear documento
const doc = await DocumentsService.createDocument({
  title: "Mi Documento",
  description: "Descripción",
  classification: "private" // public | private | confidential | restricted
});

// Listar documentos del usuario
const docs = await DocumentsService.listMyVisible();

// Listar documentos compartidos
const shared = await DocumentsService.listSharedWithMe();

// Actualizar documento
await DocumentsService.updateDocument({
  document_id: docId,
  title: "Nuevo Título"
});

// Eliminar documento (soft delete)
await DocumentsService.deleteDocument({ document_id: docId });
```

### DocumentGrantService
```typescript
// Otorgar acceso
await DocumentGrantService.grantAccess(
  documentId,
  granteeId,
  {
    can_view: true,
    can_download: true,
    can_edit: false,
    can_share: false
  }
);

// Verificar acceso
const canEdit = await DocumentGrantService.canAccessDocument(
  documentId,
  userId,
  "edit" // view | download | edit | share
);

// Revocar acceso
await DocumentGrantService.revokeAccess(documentId, granteeId);

// Listar permisos
const grants = await DocumentGrantService.listGrants(documentId);
```

### ShareLinksService
```typescript
// Crear share link
const link = await ShareLinksService.createShareLink({
  document_id: docId,
  expires_in_minutes: 60, // null = never
  max_uses: 10 // null = unlimited
});
// Retorna: { link_id, token, expires_at }

// Activar share link
const result = await ShareLinksService.activateShareLink({
  token: linkToken
});
// Retorna: { out_document_id }

// Consumir share link (increment usage)
const result = await ShareLinksService.consumeShareLink({
  token: linkToken
});

// Revocar share link
await ShareLinksService.revokeShareLink({ link_id: linkId });

// Listar share links de un documento
const links = await ShareLinksService.listShareLinks(documentId);

// Agregar recipient a share link
await ShareLinksService.upsertShareLinkRecipient({
  link_id: linkId,
  recipient_email: "user@example.com",
  permissions: { can_view: true, ... },
  max_uses: 5
});

// Listar recipients de un share link
const recipients = await ShareLinksService.listShareLinkRecipients(linkId);
```

### DocumentVersionService
```typescript
// Crear nueva versión
const versionId = await DocumentVersionService.createVersion(
  documentId,
  "documento.pdf",
  "application/pdf"
);

// Finalizar versión con hash
await DocumentVersionService.finalizeVersion(
  versionId,
  sizeBytes,
  "application/pdf",
  sha256Hash
);

// Listar versiones
const versions = await DocumentVersionService.listVersions(documentId);
```

### AuditService
```typescript
// Log event (no throws si falla)
await AuditService.logEvent({
  action: "document_created",
  object_type: "document",
  object_id: documentId,
  metadata: { classification: "confidential" }
});

// Obtener audit logs (solo security admin)
const logs = await AuditService.getAuditLogs(limit, offset);
```

---

## 🎣 Hooks

### useDocuments()
```typescript
const { documents, loading, error, refetch } = useDocuments();
```

### useCreateDocument()
```typescript
const { create, loading, error } = useCreateDocument();

const doc = await create(title, description, classification);
```

### useDocumentAccess(documentId)
```typescript
const { canView, canEdit, canShare, canDownload, loading, hasAccess } = 
  useDocumentAccess(documentId);
```

### useShareLinks(documentId)
```typescript
const {
  shareLinks,
  loading,
  error,
  createShareLink,
  revokeShareLink,
  refetch
} = useShareLinks(documentId);

const link = await createShareLink(expiresInMinutes, maxUses);
await revokeShareLink(linkId);
```

### useDocumentGrants(documentId)
```typescript
const {
  grants,
  loading,
  error,
  grantAccess,
  revokeAccess,
  refetch
} = useDocumentGrants(documentId);
```

### useAuditLogs()
```typescript
const { logs, loading, error, refetch } = useAuditLogs();
```

---

## ✅ Validación

Todos los inputs se validan con Zod schemas:

### Schemas disponibles

```typescript
// Auth
SignInSchema
SignUpSchema

// Documents
DocumentCreateSchema
DocumentUpdateSchema
DocumentDeleteSchema

// Grants
GrantAccessSchema
RevokeAccessSchema

// Share Links
ShareLinkCreateSchema
ShareLinkActivateSchema
ShareLinkConsumeSchema
ShareLinkRevokeSchema

// Audit
AuditEventSchema
```

### Uso

```typescript
import { validateInput, DocumentCreateSchema } from "../lib/validation";

const validated = validateInput(DocumentCreateSchema, {
  title: "My Doc",
  description: "...",
  classification: "private"
});
// Throws si no valida

// O usamos validateInputSafe para no throw
const result = validateInputSafe(DocumentCreateSchema, input);
if (!result.success) {
  console.error(result.error);
}
```

---

## ⏱️ Rate Limiting

Rate limiters predefinidos:

```typescript
export const authLimiter = new RateLimiter({
  maxRequests: 5,      // 5 intentos
  windowMs: 60000      // por 60 segundos
});

export const documentLimiter = new RateLimiter({
  maxRequests: 20,     // 20 requests
  windowMs: 60000      // por 60 segundos
});

export const shareLinkLimiter = new RateLimiter({
  maxRequests: 15,
  windowMs: 60000
});

export const uploadLimiter = new RateLimiter({
  maxRequests: 5,      // 5 uploads
  windowMs: 300000     // por 5 minutos
});

export const downloadLimiter = new RateLimiter({
  maxRequests: 30,     // 30 downloads
  windowMs: 300000     // por 5 minutos
});
```

Lanza `RateLimitError` cuando se excede el límite.

---

## 🚀 Deployment

### Producción

```bash
# Build
npm run build

# Resultado en dist/
# Deploy a Vercel, Netlify, AWS S3, etc.
```

### Environment variables en producción

```env
VITE_SUPABASE_URL=https://pqinxmkybbhykdtouuyv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_k06luEJNfCB3U3fmlGeqzg_RePxvEak
```

### Security headers (nginx ejemplo)

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://pqinxmkybbhykdtouuyv.supabase.co;" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## 📊 Clasificación de Documentos

- 🔓 **public** - Accesible públicamente
- 🔒 **private** - Solo el dueño
- 🔐 **confidential** - Acceso controlado
- ⛔ **restricted** - Máxima restricción

---

## 🐛 Debugging

```typescript
// Logs en consola (development only)
console.log("Event:", event);
console.error("Error:", error);

// Estructura segura
try {
  // operation
} catch (err) {
  console.error("Internal error:", err); // Servidor
  const message = getUserErrorMessage(err); // Usuario
  console.error("User sees:", message);
}
```

---

## 📞 Soporte

Para issues o preguntas:
1. Revisar [security.ts](src/config/security.ts)
2. Revisar logs de auditoría
3. Contactar al equipo de seguridad

---

## 📜 Licencia

Private - Software Seguro Project
