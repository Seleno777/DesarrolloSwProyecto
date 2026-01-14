import React, { useState } from "react";
import type { DocumentRow } from "../types/models";
import "../styles/ShareAccessModal.css";

interface ShareAccessModalProps {
  document: DocumentRow;
  onShare: (data: {
    documentId: string;
    email: string;
    permissions: {
      can_view: boolean;
      can_download: boolean;
      can_edit: boolean;
      can_share: boolean;
    };
  }) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export const ShareAccessModal: React.FC<ShareAccessModalProps> = ({
  document,
  onShare,
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

  // Validar email
  const isValidEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  // Manejar envío
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validaciones
    if (!email.trim()) {
      setError("Ingresa un email");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Email inválido");
      return;
    }
    if (!permissions.can_view && !permissions.can_download && !permissions.can_edit && !permissions.can_share) {
      setError("Debe otorgar al menos un permiso");
      return;
    }

    try {
      await onShare({
        documentId: document.id,
        email: email.trim().toLowerCase(),
        permissions,
      });

      setSuccess("✅ Acceso concedido correctamente");
      setTimeout(() => {
        setEmail("");
        setPermissions({
          can_view: true,
          can_download: true,
          can_edit: false,
          can_share: false,
        });
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al compartir");
    }
  };

  // Toggle permiso
  const togglePermission = (
    key: keyof typeof permissions,
    canToggle: boolean = true
  ) => {
    if (canToggle && !isLoading) {
      setPermissions((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="modal-header">
          <h2>🔗 Compartir Acceso</h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={isLoading}
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
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="share-form">
          {/* Email */}
          <div className="form-group">
            <label htmlFor="share-email" className="form-label">
              📧 Email del Usuario
            </label>
            <input
              id="share-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@example.com"
              disabled={isLoading}
              className="form-input"
            />
            <p className="form-hint">
              Ingresa el email del usuario que deseas autorizar
            </p>
          </div>

          {/* Permisos */}
          <div className="form-group">
            <label className="form-label">🔐 Permisos a Otorgar</label>
            <div className="permissions-grid">
              {/* Ver */}
              <div className="permission-item">
                <label className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={permissions.can_view}
                    onChange={() => togglePermission("can_view")}
                    disabled={isLoading}
                  />
                  <span className="permission-name">👁️ Ver Documento</span>
                </label>
                <p className="permission-description">
                  Puede abrir y visualizar el documento
                </p>
              </div>

              {/* Descargar */}
              <div className="permission-item">
                <label className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={permissions.can_download}
                    onChange={() => togglePermission("can_download")}
                    disabled={isLoading}
                  />
                  <span className="permission-name">⬇️ Descargar Archivo</span>
                </label>
                <p className="permission-description">
                  Puede descargar el PDF a su computadora
                </p>
              </div>

              {/* Editar */}
              <div className="permission-item">
                <label className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={permissions.can_edit}
                    onChange={() => togglePermission("can_edit")}
                    disabled={isLoading}
                  />
                  <span className="permission-name">✏️ Editar Documento</span>
                </label>
                <p className="permission-description">
                  Puede modificar el contenido del documento
                </p>
              </div>

              {/* Compartir */}
              <div className="permission-item">
                <label className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={permissions.can_share}
                    onChange={() => togglePermission("can_share")}
                    disabled={isLoading}
                  />
                  <span className="permission-name">
                    🔗 Compartir con Otros
                  </span>
                </label>
                <p className="permission-description">
                  Puede compartir este documento con otros usuarios
                </p>
              </div>
            </div>
          </div>

          {/* Resumen de permisos */}
          <div className="permissions-summary">
            <p className="summary-title">📋 Resumen de permisos:</p>
            <div className="summary-badges">
              {permissions.can_view && (
                <span className="badge badge-success">👁️ Ver</span>
              )}
              {permissions.can_download && (
                <span className="badge badge-success">⬇️ Descargar</span>
              )}
              {permissions.can_edit && (
                <span className="badge badge-warning">✏️ Editar</span>
              )}
              {permissions.can_share && (
                <span className="badge badge-info">🔗 Compartir</span>
              )}
              {!permissions.can_view &&
                !permissions.can_download &&
                !permissions.can_edit &&
                !permissions.can_share && (
                  <span className="badge badge-danger">❌ Sin permisos</span>
                )}
            </div>
          </div>

          {/* Alertas */}
          {error && <div className="alert alert-error">⚠️ {error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Botones */}
          <div className="modal-actions">
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? "🔄 Compartiendo..." : "✅ Conceder Acceso"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
          </div>

          {/* Info de seguridad */}
          <div className="security-note">
            <p>
              🔐 <strong>Nota de seguridad:</strong> El usuario recibirá una
              notificación y podrá acceder desde "Compartidos Conmigo". Puedes
              revocar el acceso en cualquier momento.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareAccessModal;
