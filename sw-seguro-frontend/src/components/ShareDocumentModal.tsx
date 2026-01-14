import { useState } from "react";
import { DocumentGrantService } from "../services/DocumentsService";

interface ShareDocumentModalProps {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
  onSuccess: () => void;
  isOpen: boolean;
}

export function ShareDocumentModal({
  documentId,
  documentTitle,
  onClose,
  onSuccess,
  isOpen,
}: ShareDocumentModalProps) {
  const [email, setEmail] = useState("");
  const [canView, setCanView] = useState(true);
  const [canDownload, setCanDownload] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError("Por favor ingresa un email");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Por favor ingresa un email válido");
      return;
    }

    if (!canView && !canDownload && !canEdit && !canShare) {
      setError("Debes seleccionar al menos un permiso");
      return;
    }

    setLoading(true);

    try {
      // 1. Buscar el user_id por email
      const userId = await DocumentGrantService.getUserIdByEmail(email);

      // 2. Otorgar acceso usando el user_id
      await DocumentGrantService.grantAccess(documentId, userId, {
        can_view: canView,
        can_download: canDownload,
        can_edit: canEdit,
        can_share: canShare,
      });

      setSuccess(true);
      setEmail("");
      setCanView(true);
      setCanDownload(true);
      setCanEdit(false);
      setCanShare(false);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Error al compartir documento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px" }}>🔗 Compartir Documento</h2>
          <p style={{ color: "#666", margin: "8px 0 0 0" }}>{documentTitle}</p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
              borderLeft: "4px solid #dc2626",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div
            style={{
              backgroundColor: "#dcfce7",
              color: "#166534",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
              borderLeft: "4px solid #22c55e",
            }}
          >
            ✅ Acceso concedido exitosamente
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              Email del Usuario *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                opacity: loading ? 0.6 : 1,
              }}
            />
          </div>

          <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "8px" }}>
            <p style={{ margin: "0 0 12px 0", fontWeight: "500" }}>Permisos</p>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "8px" }}>
                <input
                  type="checkbox"
                  checked={canView}
                  onChange={(e) => setCanView(e.target.checked)}
                  disabled={loading}
                  style={{ marginRight: "8px" }}
                />
                <span style={{ fontWeight: "500" }}>👁️ Ver Documento</span>
              </label>
              <p style={{ margin: "0 0 0 26px", fontSize: "13px", color: "#666" }}>
                Permitir visualizar el contenido
              </p>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "8px" }}>
                <input
                  type="checkbox"
                  checked={canDownload}
                  onChange={(e) => setCanDownload(e.target.checked)}
                  disabled={loading}
                  style={{ marginRight: "8px" }}
                />
                <span style={{ fontWeight: "500" }}>⬇️ Descargar</span>
              </label>
              <p style={{ margin: "0 0 0 26px", fontSize: "13px", color: "#666" }}>
                Permitir descargar el archivo PDF
              </p>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "8px" }}>
                <input
                  type="checkbox"
                  checked={canEdit}
                  onChange={(e) => setCanEdit(e.target.checked)}
                  disabled={loading}
                  style={{ marginRight: "8px" }}
                />
                <span style={{ fontWeight: "500" }}>✏️ Editar</span>
              </label>
              <p style={{ margin: "0 0 0 26px", fontSize: "13px", color: "#666" }}>
                Permitir modificar el contenido
              </p>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "8px" }}>
                <input
                  type="checkbox"
                  checked={canShare}
                  onChange={(e) => setCanShare(e.target.checked)}
                  disabled={loading}
                  style={{ marginRight: "8px" }}
                />
                <span style={{ fontWeight: "500" }}>🔗 Compartir</span>
              </label>
              <p style={{ margin: "0 0 0 26px", fontSize: "13px", color: "#666" }}>
                Permitir compartir con otros usuarios
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 16px",
                backgroundColor: loading ? "#cbd5e1" : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "⏳ Compartiendo..." : "✅ Conceder Acceso"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 16px",
                backgroundColor: "#e5e7eb",
                color: "#1f2937",
                border: "none",
                borderRadius: "8px",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              ✕ Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
