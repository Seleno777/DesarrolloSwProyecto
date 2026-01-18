/**
 * SCRIPT DE DEBUGGING - Investigar qué retorna create_document_version RPC
 * 
 * Copia este código en la consola del navegador (F12) dentro de la página de documentos
 * cuando intentes subir un archivo
 */

// Interceptar el llamado al RPC
async function debugCreateVersion() {
  const documentId = "test-doc-id"; // Reemplazar con ID real
  const filename = "test.pdf";
  const mimeType = "application/pdf";

  console.log("🔍 Llamando create_document_version RPC...");
  console.log({
    documentId,
    filename,
    mimeType,
  });

  try {
    const { data, error } = await window.supabase.rpc(
      "create_document_version",
      {
        p_document_id: documentId,
        p_filename: filename,
        p_mime_type: mimeType,
      }
    );

    console.log("📊 Resultado del RPC:");
    console.log("data:", data);
    console.log("error:", error);

    if (error) {
      console.error("❌ ERROR EN RPC:", error.message);
      console.error("Detalles:", error);
    } else {
      console.log("📦 TIPO DE DATA:", typeof data);
      console.log("📦 VALOR DATA:", JSON.stringify(data, null, 2));

      // Intentar extraer ID
      let versionId = null;
      if (typeof data === "string") {
        versionId = data;
        console.log("✅ Extrayendo como STRING:", versionId);
      } else if (typeof data === "object" && data !== null) {
        versionId = data.id || data.version_id || data.data || null;
        console.log("✅ Extrayendo como OBJECT:");
        console.log("   - data.id:", data.id);
        console.log("   - data.version_id:", data.version_id);
        console.log("   - data.data:", data.data);
        console.log("   - Resultado final:", versionId);
      }

      if (versionId) {
        console.log("✅ VERSION ID VÁLIDO:", versionId);
      } else {
        console.error("❌ NO SE PUDO EXTRAER VERSION ID");
        console.error("ESTRUCTURA DE DATA:", Object.keys(data || {}));
      }
    }
  } catch (err) {
    console.error("❌ ERROR DE JAVASCRIPT:", err);
  }
}

// Ejecutar
debugCreateVersion();

console.log("\n✅ Script ejecutado. Revisa los logs arriba.");
