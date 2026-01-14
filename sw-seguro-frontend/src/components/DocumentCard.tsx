import React from "react";
import type { DocumentRow, Classification } from "../types/models";
import "../styles/DocumentCard.css";

interface DocumentCardProps {
  document: DocumentRow & {
    permissions?: {
      can_view: boolean;
      can_download: boolean;
      can_edit: boolean;
      can_share: boolean;
    };
  };
  onView?: (doc: DocumentRow) => void;
  onShare?: (doc: DocumentRow) => void;
  onDownload?: (doc: DocumentRow) => Promise<void>;
  onDelete?: (doc: DocumentRow) => Promise<void>;
  isSharedWithMe?: boolean;
  isLoading?: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onView,
  onShare,
  onDownload,
  onDelete,
  isSharedWithMe = false,
  isLoading = false,
}) => {
  // Obtener información de clasificación
  const getClassificationInfo = (
    classif: Classification
  ): { emoji: string; label: string; color: string } => {
    const info: Record<
      Classification,
      { emoji: string; label: string; color: string }
    > = {
      public: { emoji: "🔓", label: "Público", color: "#10b981" },
      private: { emoji: "🔒", label: "Privado", color: "#3b82f6" },
      confidential: { emoji: "🔐", label: "Confidencial", color: "#f59e0b" },
      restricted: { emoji: "⛔", label: "Restringido", color: "#ef4444" },
    };
    return info[classif];
  };

  // Formatear fecha
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const classifInfo = getClassificationInfo(document.classification);

  return (
    <div className="document-card">
      {/* Encabezado */}
      <div className="card-header">
        <h3 className="card-title" title={document.title}>
          📄 {document.title}
        </h3>
        <span
          className="badge"
          style={{ backgroundColor: classifInfo.color }}
          title={`Clasificación: ${classifInfo.label}`}
        >
          {classifInfo.emoji} {classifInfo.label}
        </span>
      </div>

      {/* Descripción */}
      {document.description && (
        <p className="card-description">{document.description}</p>
      )}

      {/* Metadatos */}
      <div className="card-meta">
        <div className="meta-item">
          <span className="meta-label">📅 Creado:</span>
          <span className="meta-value">{formatDate(document.created_at)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">✏️ Actualizado:</span>
          <span className="meta-value">{formatDate(document.updated_at)}</span>
        </div>
      </div>

      {/* Permisos (si es compartido) */}
      {isSharedWithMe && document.permissions && (
        <div className="card-permissions">
          <p className="permissions-title">📋 Mis permisos:</p>
          <div className="permissions-list">
            {document.permissions.can_view && (
              <span className="permission-badge permission-view">👁️ Ver</span>
            )}
            {document.permissions.can_download && (
              <span className="permission-badge permission-download">
                ⬇️ Descargar
              </span>
            )}
            {document.permissions.can_edit && (
              <span className="permission-badge permission-edit">✏️ Editar</span>
            )}
            {document.permissions.can_share && (
              <span className="permission-badge permission-share">
                🔗 Compartir
              </span>
            )}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="card-actions">
        {/* Ver */}
        {onView && document.permissions?.can_view && (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => onView(document)}
            disabled={isLoading}
            title="Ver contenido del documento"
          >
            👁️ Ver
          </button>
        )}

        {/* Descargar */}
        {onDownload && document.permissions?.can_download && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onDownload(document)}
            disabled={isLoading}
            title="Descargar archivo PDF"
          >
            ⬇️ Descargar
          </button>
        )}

        {/* Compartir */}
        {onShare && document.permissions?.can_share && (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => onShare(document)}
            disabled={isLoading}
            title="Compartir con otros usuarios"
          >
            🔗 Compartir
          </button>
        )}

        {/* Eliminar (solo dueño) */}
        {onDelete && !isSharedWithMe && (
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => {
              if (
                window.confirm(
                  "¿Estás seguro de que deseas eliminar este documento? Esta acción es irreversible."
                )
              ) {
                onDelete(document);
              }
            }}
            disabled={isLoading}
            title="Eliminar documento permanentemente"
          >
            🗑️ Eliminar
          </button>
        )}
      </div>

      {/* Estado vacío de permisos */}
      {!document.permissions && isSharedWithMe && (
        <div className="card-permissions-empty">
          <p>⚠️ No tienes permisos para acceder a este documento</p>
        </div>
      )}
    </div>
  );
};

export default DocumentCard;
