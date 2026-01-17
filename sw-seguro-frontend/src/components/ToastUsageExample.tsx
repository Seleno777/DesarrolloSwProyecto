import { useToast } from "../hooks/useToast";

/**
 * Ejemplo de cómo usar el sistema de toasts en tus componentes
 * 
 * Este archivo muestra los patrones recomendados para integrar
 * el nuevo sistema de notificaciones Toast en lugar de alert()
 */

export function ToastUsageExample() {
  const toast = useToast();

  return (
    <div style={{ padding: "20px" }}>
      <h2>Ejemplos de Uso del Sistema de Toasts</h2>

      {/* Success Toast */}
      <button
        onClick={() => toast.success("Archivo subido correctamente")}
        style={{
          padding: "10px 20px",
          margin: "10px",
          background: "#10b981",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Mostrar Toast de Éxito
      </button>

      {/* Error Toast */}
      <button
        onClick={() => toast.error("Error al descargar el documento")}
        style={{
          padding: "10px 20px",
          margin: "10px",
          background: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Mostrar Toast de Error
      </button>

      {/* Warning Toast */}
      <button
        onClick={() => toast.warning("Los documentos restringidos no se pueden compartir")}
        style={{
          padding: "10px 20px",
          margin: "10px",
          background: "#f59e0b",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Mostrar Toast de Advertencia
      </button>

      {/* Info Toast */}
      <button
        onClick={() => toast.info("Este es un mensaje informativo")}
        style={{
          padding: "10px 20px",
          margin: "10px",
          background: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Mostrar Toast de Información
      </button>

      {/* Toast with custom duration */}
      <button
        onClick={() =>
          toast.success("Este mensaje desaparece en 2 segundos", 2000)
        }
        style={{
          padding: "10px 20px",
          margin: "10px",
          background: "#8b5cf6",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Toast con Duración Custom (2s)
      </button>

      {/* Persistente (sin cerrar automático) */}
      <button
        onClick={() =>
          toast.success("Este mensaje persiste hasta que lo cierres", Infinity)
        }
        style={{
          padding: "10px 20px",
          margin: "10px",
          background: "#06b6d4",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Toast Persistente
      </button>

      <hr style={{ margin: "20px 0" }} />

      <h3>Cómo usar en tus componentes:</h3>
      <pre
        style={{
          background: "#f3f4f6",
          padding: "12px",
          borderRadius: "6px",
          overflow: "auto",
        }}
      >
{`import { useToast } from "../hooks/useToast";

export function MiComponente() {
  const toast = useToast();

  const handleDownload = async () => {
    try {
      // ... código de descarga
      toast.success("Archivo descargado correctamente");
    } catch (error) {
      toast.error("Error al descargar el documento");
    }
  };

  return (
    <div>
      <button onClick={handleDownload}>Descargar</button>
    </div>
  );
}`}
      </pre>
    </div>
  );
}
