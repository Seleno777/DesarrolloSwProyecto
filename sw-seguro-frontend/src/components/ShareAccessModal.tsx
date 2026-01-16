import React, { useState } from "react";
import type { DocumentRow } from "../types/models";
import "../styles/ShareAccessModal.css";
import { ShareLinksService } from "../services/ShareLinksService";

interface ShareAccessModalProps {
  document: DocumentRow;
  onClose: () => void;
  isLoading?: boolean;
}

export const ShareAccessModal: React.FC<ShareAccessModalProps> = ({
  document,
  onClose,
  isLoading = false,
}) => {
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState({
    can_view: true,
    can_download: true,
    can_edit: false,
    can_share: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Config simple (puedes exponerlo en UI si quieres)
  const EXPIRES_IN_MINUTES = 60;
  const MAX_USES = 10;

  const isValidEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const togglePermission = (key: keyof typeof permissions) => {
    if (isLoading || creating) return;
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setShareUrl(null);

    const emailTrim = email.trim().toLowerCase();

    if (!emailTrim) {
      setError("Ingresa un email");
      return;
    }
    if (!isValidEmail(emailTrim)) {
      setError("Email inválido");
      return;
    }
    if (
      !permissions.can_view &&
      !permissions.can_download &&
      !permissions.can_edit &&
      !permissions.can_share
    ) {
      setError("Debe otorgar al menos un permiso");
      return;
    }

    setCreating(true);
    try {
      // 1) Crear share link (token)
      const link = await ShareLinksService.createShareLink({
        document_id: document.id,
        expires_in_minutes: EXPIRES_IN_MINUTES,
        max_uses: MAX_USES,
      });

      // 2) Registrar recipient por email (cualquier correo)
      await ShareLinksService.upsertShareLinkRecipient({
        link_id: link.link_id,
        recipient_email: emailTrim,
        permissions: {
          can_view: permissions.can_view,
          can_download: permissions.can_download,
          can_edit: permissions.can_edit,
          can_share: permissions.can_share,
        },
        max_uses: MAX_USES,
      });

      // 3) URL del link
      const url = `${window.location.origin}/share/${link.token}`;
      setShareUrl(url);

      // 4) Copiar al clipboard (si falla, igual mostramos el url)
      try {
        await navigator.clipboard.writeText(url);
        setSuccess("✅ Link creado y copiado al portapapeles");
      } catch {
        setSuccess("✅ Link creado. Copia el enlace manualmente.");
      }

      // Limpieza opcional
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Error al crear link de acceso");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="modal-header">
          <h2>🔗 Compartir por enlace</h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={isLoading || creating}
          >
            ✕
          </button>
        </div>

        {/* Información del documento */}
        <div className="modal-document-info">
          <p>
            <strong>📄 Documento:</strong> {document.title}
          </p>
          <p>
            <strong>🏷️ Clasificación:</strong> {document.classification}
          </p>
          <p style={{ color: "#666", marginTop: 8 }}>
            Este link expira en <b>{EXPIRES_IN_MINUTES} min</b> y permite hasta{" "}
            <b>{MAX_USES}</b> usos.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="share-form">
          {/* Email */}
          <div className="form-group">
            <label htmlFor="share-email" className="form-label">
              📧 Email del destinatario
            </label>
            <input
              id="share-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@example.com"
              disabled={isLoading || creating}
              className="form-input"
            />
            <p className="form-hint">
              Se permitirá acceso solo si el usuario inicia sesión con ese email.
            </p>
          </div>

          {/* Permisos */}
          <div className="form-group">
            <label className="form-label">🔐 Permisos</label>
            <div className="permissions-grid">
              <div className="permission-item">
                <label className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={permissions.can_view}
                    onChange={() => togglePermission("can_view")}
                    disabled={isLoading || creating}
                  />
                  <span className="permission-name">👁️ Ver</span>
                </label>
                <p className="permission-description">
                  Puede abrir y visualizar el documento
                </p>
              </div>

              <div className="permission-item">
                <label className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={permissions.can_download}
                    onChange={() => togglePermission("can_download")}
                    disabled={isLoading || creating}
                  />
                  <span className="permission-name">⬇️ Descargar</span>
                </label>
                <p className="permission-description">Puede descargar el PDF</p>
              </div>

              <div className="permission-item">
                <label className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={permissions.can_edit}
                    onChange={() => togglePermission("can_edit")}
                    disabled={isLoading || creating}
                  />
                  <span className="permission-name">✏️ Editar</span>
                </label>
                <p className="permission-description">
                  Puede modificar el documento
                </p>
              </div>

              <div className="permission-item">
                <label className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={permissions.can_share}
                    onChange={() => togglePermission("can_share")}
                    disabled={isLoading || creating}
                  />
                  <span className="permission-name">🔗 Compartir</span>
                </label>
                <p className="permission-description">
                  Puede compartir con otros
                </p>
              </div>
            </div>
          </div>

          {/* Alertas */}
          {error && <div className="alert alert-error">⚠️ {error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Mostrar URL si existe */}
          {shareUrl && (
            <div
              style={{
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                padding: 12,
                borderRadius: 10,
                marginTop: 12,
                wordBreak: "break-all",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>🔗 Enlace:</div>
              <div style={{ fontSize: 13 }}>{shareUrl}</div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setSuccess("✅ Link copiado al portapapeles");
                  } catch {
                    setError("No se pudo copiar. Cópialo manualmente.");
                  }
                }}
                disabled={isLoading || creating}
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#111827",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Copiar link
              </button>
            </div>
          )}

          {/* Botones */}
          <div className="modal-actions">
            <button
              type="submit"
              disabled={isLoading || creating}
              className="btn btn-primary"
            >
              {creating ? "🔄 Creando link..." : "✅ Crear link"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || creating}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
          </div>

          <div className="security-note">
            <p>
              🔐 <strong>Importante:</strong> El destinatario deberá abrir el
              enlace e iniciar sesión con el mismo email. El acceso expira y se
              limita por usos.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareAccessModal;
