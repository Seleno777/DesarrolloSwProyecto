/**
 * Utilidades para normalizar y validar archivos de forma segura
 * - Remover caracteres especiales
 * - Normalizar nombres de documentos
 * - Validar tipos de archivo de forma segura
 */

/**
 * Normaliza el nombre de un archivo removiendo caracteres especiales y espacios
 * Mantiene solo letras, números, guiones y puntos
 * 
 * @param filename - Nombre original del archivo
 * @returns Nombre normalizado
 */
export function normalizeFilename(filename: string): string {
  if (!filename) return "documento";

  // Remover extensión
  const nameParts = filename.split(".");
  const ext = nameParts.pop()?.toLowerCase() || "";
  let name = nameParts.join(".");

  // Remover caracteres especiales, mantener solo alfanuméricos, guiones y espacios
  name = name
    .normalize("NFD") // Descomponer acentos
    .replace(/[\u0300-\u036f]/g, "") // Remover marcas diacríticas
    .replace(/[^a-zA-Z0-9\s-]/g, "") // Remover caracteres especiales
    .replace(/\s+/g, "-") // Reemplazar espacios con guiones
    .replace(/-+/g, "-") // Remover guiones múltiples
    .replace(/^-+|-+$/g, "") // Remover guiones al inicio/final
    .toLowerCase();

  // Si el nombre está vacío después de normalizar, usar por defecto
  if (!name) {
    name = "documento";
  }

  // Limitar longitud
  const maxLength = 200;
  if (name.length > maxLength) {
    name = name.substring(0, maxLength);
  }

  return `${name}.${ext}`;
}

/**
 * Valida de forma segura un archivo
 * Verifica MIME type, tamaño y contenido básico
 * 
 * @param file - Archivo a validar
 * @param maxSizeMB - Tamaño máximo permitido en MB (default: 50)
 * @returns Mensaje de error o null si es válido
 */
export function validateFileSecurely(
  file: File,
  maxSizeMB: number = 50
): string | null {
  // Validar que existe un archivo
  if (!file) {
    return "Debe seleccionar un archivo";
  }

  // Validar nombre del archivo
  if (!file.name || file.name.trim().length === 0) {
    return "El archivo debe tener un nombre válido";
  }

  // Validar MIME type (solo PDF)
  const allowedMimeTypes = ["application/pdf"];
  if (!allowedMimeTypes.includes(file.type)) {
    return "Solo se permiten archivos PDF";
  }

  // Validar extensión de archivo (double-check)
  const filename = file.name.toLowerCase();
  if (!filename.endsWith(".pdf")) {
    return "El archivo debe tener extensión .pdf";
  }

  // Validar tamaño
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `El archivo no puede exceder ${maxSizeMB} MB`;
  }

  // Validar que no está vacío
  if (file.size === 0) {
    return "El archivo está vacío";
  }

  // Validar tamaño mínimo razonable para un PDF
  const minSizeBytes = 100; // Mínimo 100 bytes
  if (file.size < minSizeBytes) {
    return "El archivo parece estar corrupto o incompleto";
  }

  return null;
}

/**
 * Valida un título o descripción de documento
 * Previene inyección de código y caracteres peligrosos
 * 
 * @param text - Texto a validar
 * @param maxLength - Longitud máxima permitida
 * @param fieldName - Nombre del campo para el mensaje de error
 * @returns Mensaje de error o null si es válido
 */
export function validateDocumentText(
  text: string,
  maxLength: number = 255,
  fieldName: string = "Campo"
): string | null {
  if (!text || !text.trim()) {
    return `${fieldName} es obligatorio`;
  }

  if (text.length > maxLength) {
    return `${fieldName} no puede exceder ${maxLength} caracteres`;
  }

  // Detectar patrones potencialmente peligrosos
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // event handlers
    /--/g, // SQL comment syntax
    /;\s*DROP/i, // SQL injection
    /;\s*DELETE/i,
    /;\s*UPDATE/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(text)) {
      return `${fieldName} contiene caracteres no permitidos`;
    }
  }

  return null;
}

/**
 * Sanitiza un nombre de documento para almacenamiento seguro
 * 
 * @param filename - Nombre original
 * @returns Nombre sanitizado apto para almacenamiento
 */
export function sanitizeStorageFilename(filename: string): string {
  // Normalizar
  let cleaned = normalizeFilename(filename);

  // Remover cualquier ruta relativa peligrosa
  cleaned = cleaned.replace(/\.\.\//g, "").replace(/\.\.\\/g, "");

  // Asegurar que no contenga caracteres peligrosos para ruta
  cleaned = cleaned.replace(/[<>:"|?*]/g, "");

  return cleaned;
}

/**
 * Genera un nombre de archivo único y seguro
 * Añade timestamp para evitar colisiones
 * 
 * @param originalFilename - Nombre original del archivo
 * @returns Nombre único y seguro
 */
export function generateSafeFilename(originalFilename: string): string {
  const normalized = normalizeFilename(originalFilename);
  // Solo usar timestamp para evitar colisiones (sin número aleatorio)
  const timestamp = Date.now();

  // Dividir en nombre y extensión
  const parts = normalized.split(".");
  const ext = parts.pop() || "pdf";
  const name = parts.join(".");

  return `${name}-${timestamp}.${ext}`;
}
