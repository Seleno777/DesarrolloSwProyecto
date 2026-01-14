# 🎨 Guía Completa de la Interfaz - Software Seguro

## 📑 Tabla de Contenidos
1. [Página de Autenticación](#página-de-autenticación)
2. [Dashboard Principal](#dashboard-principal)
3. [Funcionalidades Disponibles](#funcionalidades-disponibles)
4. [Flujos de Uso](#flujos-de-uso)

---

## 🔐 Página de Autenticación

La página de login ha sido mejorada significativamente con 3 tabs principales:

### 📱 Tab 1: **Iniciar Sesión** 🔓
Permite a los usuarios que ya tienen cuenta ingresar al sistema.

**Campos:**
- 📧 Email
- 🔑 Contraseña

**Características:**
- Validación en tiempo real
- Rate limiting: máximo 5 intentos por minuto
- Manejo de errores con mensajes claros
- Contador de reintentos si se excede el límite

**Ejemplo de uso:**
```
1. Ingresa tu email: usuario@example.com
2. Ingresa tu contraseña
3. Haz clic en "✓ Iniciar Sesión"
```

---

### ✍️ Tab 2: **Crear Cuenta** 📝
Para nuevos usuarios que desean registrarse en el sistema.

**Campos:**
- 📧 Email: debe ser válido
- 🔑 Contraseña: requiere:
  - Mínimo 8 caracteres
  - Al menos 1 mayúscula
  - Al menos 1 minúscula
  - Al menos 1 número
  - Al menos 1 símbolo especial (!@#$%^&* etc)
- ✓ Confirmar Contraseña: debe coincidir

**Validaciones:**
- Email debe ser único
- Contraseña debe cumplir requisitos de seguridad
- Las contraseñas deben coincidir
- Rate limiting: máximo 5 intentos por minuto

**Ejemplo de contraseña válida:**
```
MiContraseña123!
```

---

### 🔑 Tab 3: **Recuperar Contraseña** 🆘
Para usuarios que olvidaron su contraseña.

**Campos:**
- 📧 Email: debe estar asociada a una cuenta

**Características:**
- Se envía un enlace de recuperación por email
- El enlace caduca en 24 horas
- Proceso seguro y verificado

---

## 📊 Dashboard Principal

Después de iniciar sesión, accedes a un dashboard completo con múltiples funcionalidades.

### 👤 Encabezado del Dashboard
- **Avatar del Usuario**: Muestra la inicial de tu email
- **Email**: Tu correo electrónico registrado
- **Estado**: Indica "Conectado"
- **Botón Cerrar Sesión**: 🚪 Logout seguro

---

## 📑 Funcionalidades Disponibles

### 1️⃣ **Tab: Mis Documentos** 📄

#### Vista General
- Estadísticas de documentos creados
- Contador por clasificación (Público, Privado, Confidencial, Restringido)

#### Crear Nuevo Documento
**Botón:** ➕ Crear Nuevo Documento

**Formulario:**
- **Título**: Texto (obligatorio, máx 255 caracteres)
- **Clasificación**: Selector (obligatorio)
  - 🔓 Público: Accesible para todos
  - 🔒 Privado: Solo para ti (recomendado)
  - 🔐 Confidencial: Acceso restringido
  - ⛔ Restringido: Máximo nivel de seguridad
- **Descripción**: Texto largo (opcional, máx 1000 caracteres)

**Acciones después de crear:**
- El documento aparece en la grid
- Puedes ver, compartir o descargar
- Se registra automáticamente en auditoría

#### Tarjeta de Documento
Cada documento muestra:
- 📌 **Título**: Del documento
- 🏷️ **Etiqueta de clasificación**: Con código de color
  - Verde: Público
  - Azul: Privado
  - Ámbar: Confidencial
  - Rojo: Restringido
- 📝 **Descripción**: Primeras 2 líneas
- 📅 **Fechas**: Creación y última actualización
- 🎯 **Botones de acción**:
  - 👁️ **Detalles**: Ver información completa
  - 🔗 **Compartir**: Crear enlaces de compartir
  - ⬇️ **Descargar**: Descargar el documento

---

### 2️⃣ **Tab: Compartidos Conmigo** 📤

**Descripción:**
Muestra todos los documentos que otros usuarios han compartido contigo.

**Características:**
- Visualiza documentos compartidos
- Respeta los permisos asignados por el propietario
- Puedes descargar, ver, editar o compartir según permisos
- Registro de acceso en auditoría

**Estados:**
- ✅ Si hay documentos compartidos: se muestran en una grid
- 📭 Si no hay: mensaje "Sin documentos compartidos aún"

---

### 3️⃣ **Tab: Gestionar Accesos** 🔐

**Descripción:**
Control completo sobre quién tiene acceso a tus documentos.

**Para cada documento puedes:**

#### 👥 Agregar Usuario
- Selecciona un usuario
- Define permisos:
  - 👁️ `can_view`: Ver documento
  - ⬇️ `can_download`: Descargar
  - ✏️ `can_edit`: Editar
  - 🔗 `can_share`: Compartir con otros

#### 📋 Ver Accesos
- Lista de usuarios que tienen acceso
- Sus permisos específicos
- Opción de revocar acceso

#### 🔗 Crear Enlace Compartido
- Genera un link de compartición
- Configurable con:
  - 📅 Fecha de expiración
  - 📊 Límite de descargas
  - 🔒 Contraseña opcional (en futuras versiones)

---

### 4️⃣ **Tab: Historial de Auditoría** 📋

**Descripción:**
Registro completo de todas las acciones en el sistema.

#### Filtros Disponibles
- 📅 **Fecha desde - hasta**: Rango de fechas
- 📌 **Tipo de evento**: 
  - 📄 Documento Creado
  - ✏️ Documento Actualizado
  - 🗑️ Documento Eliminado
  - 🔓 Acceso Otorgado
  - 🔒 Acceso Revocado
  - 🔗 Enlace Compartido Creado
  - ✅ Enlace Compartido Activado
  - 📥 Enlace Compartido Consumido
  - 🆑 Enlace Compartido Revocado

#### Tabla de Auditoría
Muestra:
- 🕐 **Fecha y Hora**: Cuándo ocurrió
- 📌 **Evento**: Qué pasó
- 👤 **Usuario**: Quién lo hizo
- 📄 **Documento**: A cuál documento
- ℹ️ **Detalles**: Información adicional

**Ejemplo:**
```
12 Ene 2026 11:30 | Documento Creado | usuario@email.com | - | Nuevo documento creado
11 Ene 2026 15:45 | Acceso Otorgado  | usuario@email.com | - | Permiso de lectura concedido
```

---

### 5️⃣ **Tab: Configuración** ⚙️

#### 👤 Perfil de Usuario
- Mostrar email
- Estado de la cuenta (Activa y Verificada)
- Botón para editar perfil (próxima versión)

#### 🔒 Seguridad
- Estado de la contraseña
- Última vez que se cambió
- Botón: 🔑 **Cambiar Contraseña**
  - Nueva contraseña con validación de fortaleza
  - Confirmación de cambio

#### 🔔 Notificaciones
- ☑️ Notificar cuando compartan documentos conmigo
- ☑️ Notificar cambios de permisos
- ☑️ Notificar descargas de documentos
- (Más opciones próximamente)

#### ⚡ Zona de Peligro
- ⚠️ **Eliminar Cuenta**: Acción irreversible
  - Requiere confirmación
  - Se perderán todos los datos

---

## 🎯 Flujos de Uso

### 🔄 Flujo 1: Crear Documento y Compartir

```
1. Iniciar Sesión (Tab Iniciar Sesión)
   └─ Ingresa credenciales
   └─ Haz clic en "✓ Iniciar Sesión"

2. Dashboard (Tab Mis Documentos)
   └─ Haz clic en "➕ Crear Nuevo Documento"
   └─ Completa el formulario:
      • Título: "Reporte Q1 2026"
      • Clasificación: "🔒 Privado"
      • Descripción: "Reporte trimestral Q1"
   └─ Haz clic en "✓ Crear Documento"

3. Dashboard (Tab Gestionar Accesos)
   └─ Busca tu documento creado
   └─ Haz clic en "👥 Agregar Usuario"
   └─ Selecciona usuario y permisos
   └─ O haz clic en "🔗 Crear Enlace Compartido"

4. Auditoría (Tab Historial de Auditoría)
   └─ Verifica que todo se registró correctamente
   └─ Puedes filtrar por fecha o tipo de evento
```

### 🔑 Flujo 2: Recuperar Acceso

```
1. Página de Login
   └─ Haz clic en "Recuperar Contraseña"

2. Formulario de Recuperación
   └─ Ingresa tu email: usuario@example.com
   └─ Haz clic en "✓ Enviar Enlace de Recuperación"
   └─ Verifica tu email

3. Email Recibido
   └─ Haz clic en el enlace dentro del email
   └─ Crea nueva contraseña (debe cumplir requisitos)
   └─ Confirma el cambio

4. Login Nuevamente
   └─ Usa tu nueva contraseña
   └─ Accede a tu dashboard
```

### 📥 Flujo 3: Acceder Documento Compartido

```
1. Recibe Enlace de Compartición
   └─ Desde email o mensaje directo

2. Haz Clic en el Enlace
   └─ Se abre el documento compartido
   └─ Puedes ver según permisos

3. Dashboard (Tab Compartidos Conmigo)
   └─ Verás el documento listado
   └─ Puedes descargar, ver, editar o compartir

4. Auditoría
   └─ Se registra tu acceso automáticamente
```

---

## 🛡️ Características de Seguridad Implementadas

### ✅ En Autenticación
- Rate limiting en login (5 intentos/minuto)
- Validación de contraseña fuerte
- Sesión JWT segura
- Logout seguro

### ✅ En Documentos
- Validación de entrada con Zod
- Clasificación de seguridad
- Rate limiting por operación
- Auditoría de accesos

### ✅ En Compartición
- Control granular de permisos
- Enlaces seguros con token
- Expiración configurable
- Auditoría completa

### ✅ General
- Manejo seguro de errores (sin exponer internos)
- HTTPS/TLS en producción
- CORS configurado
- Protección contra XSS

---

## 📱 Responsividad

La interfaz se adapta a todos los dispositivos:

### 💻 Desktop (>1200px)
- Vista completa con grid de 3+ columnas
- Sidebar completo
- Tooltips y efectos hover

### 📱 Tablet (768px - 1200px)
- Grid adaptada a 2 columnas
- Menús colapsibles
- Botones optimizados

### 📞 Móvil (<768px)
- Una columna
- Tabs con scroll horizontal
- Botones grandes y fáciles de tocar
- Texto legible sin zoom

---

## 🆘 Ayuda y Soporte

### Si encuentras error en login:
- Verifica que el email es correcto
- Revisa que la contraseña sea la correcta
- Si olvidaste contraseña: usa "Recuperar Contraseña"
- Si ves límite de reintentos: espera X segundos

### Si no ves tu documento:
- Verifica que iniciaste sesión
- Recarga la página (F5)
- Comprueba en "Compartidos Conmigo" si fue compartido
- Revisa la auditoría para verificar que se creó

### Si tienes problema compartiendo:
- Verifica los permisos otorgados
- Prueba crear un enlace en vez de agregar usuario
- Comprueba en auditoría si se registró la acción
- Verifica que el usuario existe en el sistema

---

## 🚀 Próximas Características

- 📁 Gestión de carpetas
- 🏷️ Tags y categorías
- 🔍 Búsqueda avanzada
- 📊 Estadísticas de uso
- 🔔 Notificaciones en tiempo real
- 📧 Invitaciones por email
- 🖼️ Previsualización de archivos
- 💬 Comentarios en documentos
- 🔐 Autenticación de dos factores
- 🌙 Modo oscuro

---

## 📞 Contacto y Reportar Bugs

Si encuentras un bug o tienes sugerencias:
1. Documenta qué hiciste
2. Anota la hora exacta
3. Revisa la sección de auditoría
4. Reporta al equipo de soporte

**Email:** support@softwareseguro.local

---

**Versión:** 1.0  
**Última actualización:** 12 Enero 2026  
**Estado:** ✅ Producción
