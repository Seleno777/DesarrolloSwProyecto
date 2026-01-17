import React from "react";
import { FileUploadComponent } from "./FileUploadComponent";

type Props = {
  isOpen: boolean;
  onClose: () => void;

  documentId: string;
  documentTitle: string;
  classification: "public" | "private" | "confidential" | "restricted";
  watermarkText: string;

  onUploadOk: () => void;
  onUploadFail: (msg: string) => void;
};

export default function EditSharedDocumentModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  classification,
  watermarkText,
  onUploadOk,
  onUploadFail,
}: Props) {
  if (!isOpen) return null;

  const classificationLabel: Record<string, string> = {
    public: "Público",
    private: "Privado",
    confidential: "Confidencial",
    restricted: "Restringido",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        padding: 14,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(760px, 96vw)",
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 20px 40px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "grid", gap: 3, flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              ✏️ Editar documento (subir nueva versión)
            </div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>
              {documentTitle} · Clasificación: {classificationLabel[classification] || classification}
            </div>
          </div>

          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
            }}
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e3a8a",
              padding: 12,
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.35,
            }}
          >
            <b>¿Qué hace “Editar” aquí?</b>
            <div style={{ marginTop: 6 }}>
              Subes un nuevo PDF y se guarda como <b>nueva versión</b> del documento.
              {classification === "confidential" ? (
                <>
                  {" "}
                  Además, al ser <b>CONFIDENCIAL</b>, se aplicará marca de agua.
                </>
              ) : null}
            </div>
          </div>

          {/* Reutilizamos tu uploader */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <FileUploadComponent
              documentId={documentId}
              classification={classification}
              watermarkText={watermarkText}
              onUploadSuccess={onUploadOk}
              onUploadError={onUploadFail}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
