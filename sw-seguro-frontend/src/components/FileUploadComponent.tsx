// src/components/FileUploadComponent.tsx
import { useMemo, useState } from "react";
import { DocumentVersionService } from "../services/DocumentsService";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/useToast";

// ✅ Watermark (pdf-lib)
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

interface FileUploadProps {
  documentId: string;
  onUploadSuccess: () => void;
  onUploadError: (error: string) => void;

  // ✅ opcionales (por si luego lo conectas desde DocumentsList)
  classification?: "public" | "private" | "confidential" | "restricted";
  watermarkText?: string;
}

async function watermarkPdf(file: File, watermarkText: string) {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();

    page.drawText(watermarkText, {
      x: width * 0.08,
      y: height * 0.5,
      size: 44,
      font,
      color: rgb(0.75, 0.75, 0.75),
      rotate: degrees(25),
      opacity: 0.25,
    });
  }
   const outBytes = await pdfDoc.save();

// Convierte Uint8Array -> ArrayBuffer exacto (slice correcto)
const ab = outBytes.buffer.slice(
  outBytes.byteOffset,
  outBytes.byteOffset + outBytes.byteLength
);

const blob = new Blob([ab], { type: "application/pdf" });
return new File([blob], file.name, { type: "application/pdf" });




}

export function FileUploadComponent({
  documentId,
  onUploadSuccess,
  onUploadError,
  classification = "private",
  watermarkText = "CONFIDENCIAL",
}: FileUploadProps) {
  const toast = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ✅ evita IDs duplicados si hay muchos cards
  const inputId = useMemo(
    () => `file-input-${documentId}-${Math.random().toString(16).slice(2)}`,
    [documentId]
  );

  const handleFileSelect = (file: File | null) => {
    setError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validar PDF
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("❌ Solo se permiten archivos PDF");
      return;
    }

    // Máx 50MB
    if (file.size > 50 * 1024 * 1024) {
      setError("❌ El archivo no puede ser mayor a 50MB");
      return;
    }

    if (file.size === 0) {
      setError("❌ El archivo no puede estar vacío");
      return;
    }

    setSelectedFile(file);
  };

  const calculateSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Por favor selecciona un archivo");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const forcedMime = "application/pdf";

      // ✅ si es CONFIDENTIAL, aplicamos watermark antes de subir
      const fileToUpload =
        classification === "confidential"
          ? await watermarkPdf(selectedFile, watermarkText)
          : selectedFile;

      // 1) Crear versión (DB) -> retorna { versionId, storagePath }
      const { versionId, storagePath } = await DocumentVersionService.createVersion(
        documentId,
        fileToUpload.name,
        forcedMime
      );

      if (!versionId || !storagePath) {
        throw new Error("No se pudo obtener un ID/path de versión válido");
      }

      setUploadProgress(30);

      // 2) Subir al Storage EXACTAMENTE con storagePath del backend
      const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, fileToUpload, {
        contentType: forcedMime,
        upsert: false,
      });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error("No se pudo guardar el documento. Intenta nuevamente.");
      }

      setUploadProgress(70);

      // 3) SHA256 del archivo realmente subido (si watermark => cambia)
      const sha256 = await calculateSHA256(fileToUpload);

      setUploadProgress(85);

      // 4) Finalizar versión
      await DocumentVersionService.finalizeVersion(versionId, fileToUpload.size, forcedMime, sha256);

      setUploadProgress(100);

      // Limpiar
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(0);
        onUploadSuccess();
      }, 600);
    } catch (err: any) {
      const errorMsg = err?.message || "Error desconocido al subir archivo";
      setError(errorMsg);
      onUploadError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "20px" }}>
      <h3 style={{ marginTop: 0 }}>📄 Subir Archivo PDF</h3>

      {classification === "confidential" && (
        <div style={{ marginBottom: 10, fontSize: 13, opacity: 0.8 }}>
          🟠 Este documento es <b>CONFIDENCIAL</b>: se aplicará marca de agua al subir.
        </div>
      )}

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
          {error}
        </div>
      )}

      <div
        style={{
          border: "2px dashed #3b82f6",
          borderRadius: "8px",
          padding: "20px",
          textAlign: "center",
          backgroundColor: "#f0f9ff",
          cursor: selectedFile ? "default" : "pointer",
          marginBottom: "16px",
          opacity: uploading ? 0.6 : 1,
        }}
        onClick={() => {
          if (!uploading) {
            document.getElementById(inputId)?.click();
          }
        }}
      >
        <input
          id={inputId}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          style={{ display: "none" }}
          disabled={uploading}
        />

        {selectedFile ? (
          <div>
            <p style={{ margin: 0, fontSize: "18px", marginBottom: "8px" }}>📄 {selectedFile.name}</p>
            <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div>
            <p style={{ margin: "0 0 8px 0", fontSize: "16px" }}>📤 Selecciona o arrastra tu PDF aquí</p>
            <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Máximo 50MB</p>
          </div>
        )}
      </div>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              backgroundColor: "#e2e8f0",
              borderRadius: "4px",
              overflow: "hidden",
              height: "8px",
            }}
          >
            <div
              style={{
                backgroundColor: "#3b82f6",
                height: "100%",
                width: `${uploadProgress}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#666" }}>Cargando... {uploadProgress}%</p>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{
            flex: 1,
            padding: "10px 16px",
            backgroundColor: !selectedFile || uploading ? "#cbd5e1" : "#10b981",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "500",
            cursor: !selectedFile || uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "⏳ Subiendo..." : "📤 Subir"}
        </button>

        <button
          onClick={() => {
            setSelectedFile(null);
            setError(null);
            setUploadProgress(0);
          }}
          disabled={uploading}
          style={{
            flex: 1,
            padding: "10px 16px",
            backgroundColor: "#e5e7eb",
            color: "#1f2937",
            border: "none",
            borderRadius: "8px",
            fontWeight: "500",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          ✕ Limpiar
        </button>
      </div>
    </div>
  );
}
