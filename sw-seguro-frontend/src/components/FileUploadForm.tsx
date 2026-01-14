import React, { useState, useRef } from "react";
import type { DocumentRow, Classification } from "../types/models";
import "../styles/FileUploadForm.css";

interface FileUploadFormProps {
  onUpload: (data: {
    title: string;
    description: string;
    classification: Classification;
    file: File;
  }) => Promise<DocumentRow>;
  isLoading?: boolean;
}

export const FileUploadForm: React.FC<FileUploadFormProps> = ({
  onUpload,
  isLoading = false,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classification, setClassification] = useState<Classification>("private");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validar archivo seleccionado
  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Solo se permiten archivos PDF";
    }
    if (file.size > 50 * 1024 * 1024) {
      // 50MB
      return "El archivo no puede exceder 50 MB";
    }
    if (file.size === 0) {
      return "El archivo está vacío";
    }
    return null;
  };

  // Manejar selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileError = validateFile(file);

    if (fileError) {
      setError(fileError);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validaciones
    if (!title.trim()) {
      setError("El título es obligatorio");
      return;
    }
    if (title.length > 255) {
      setError("El título no puede exceder 255 caracteres");
      return;
    }
    if (description.length > 1000) {
      setError("La descripción no puede exceder 1000 caracteres");
      return;
    }
    if (!selectedFile) {
      setError("Debe seleccionar un archivo PDF");
      return;
    }

    try {
      // Simular progreso de carga
      setUploadProgress(0);
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return 90; // Máximo 90% hasta completar
          return prev + Math.random() * 30;
        });
      }, 100);

      // Llamar función de upload
      await onUpload({
        title: title.trim(),
        description: description.trim(),
        classification,
        file: selectedFile,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Limpiar formulario
      setTitle("");
      setDescription("");
      setClassification("private");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadProgress(0);

      setSuccess("✅ Documento subido correctamente");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir documento");
      setUploadProgress(0);
    }
  };

  // Obtener etiqueta de clasificación
  const getClassificationLabel = (
    classif: Classification
  ): { emoji: string; label: string } => {
    const labels: Record<Classification, { emoji: string; label: string }> = {
      public: { emoji: "🔓", label: "Público" },
      private: { emoji: "🔒", label: "Privado" },
      confidential: { emoji: "🔐", label: "Confidencial" },
      restricted: { emoji: "⛔", label: "Restringido" },
    };
    return labels[classif];
  };

  // Obtener tamaño archivo en MB
  const getFileSizeDisplay = (): string => {
    if (!selectedFile) return "0 MB";
    return (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="file-upload-form-container">
      <form onSubmit={handleSubmit} className="file-upload-form">
        {/* Título */}
        <div className="form-group">
          <label htmlFor="upload-title" className="form-label">
            📝 Título del Documento
          </label>
          <input
            id="upload-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Propuesta de Proyecto"
            maxLength={255}
            disabled={isLoading}
            className="form-input"
          />
          <span className="char-count">{title.length}/255 caracteres</span>
        </div>

        {/* Descripción */}
        <div className="form-group">
          <label htmlFor="upload-description" className="form-label">
            📋 Descripción (Opcional)
          </label>
          <textarea
            id="upload-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe brevemente el contenido del documento..."
            maxLength={1000}
            disabled={isLoading}
            className="form-textarea"
            rows={3}
          />
          <span className="char-count">{description.length}/1000 caracteres</span>
        </div>

        {/* Clasificación */}
        <div className="form-group">
          <label htmlFor="upload-classification" className="form-label">
            🏷️ Clasificación del Documento
          </label>
          <select
            id="upload-classification"
            value={classification}
            onChange={(e) => setClassification(e.target.value as Classification)}
            disabled={isLoading}
            className="form-select"
          >
            {(["public", "private", "confidential", "restricted"] as const).map(
              (classif) => {
                const { emoji, label } = getClassificationLabel(classif);
                return (
                  <option key={classif} value={classif}>
                    {emoji} {label}
                  </option>
                );
              }
            )}
          </select>
          <p className="classification-help">
            {
              {
                public:
                  "📖 Público: Cualquiera en el sistema puede ver este documento",
                private:
                  "🔒 Privado: Solo tú puedes ver, a menos que lo compartas",
                confidential:
                  "🔐 Confidencial: Documento sensible, requiere autorización especial",
                restricted:
                  "⛔ Restringido: Acceso muy limitado, solo usuarios autorizados",
              }[classification]
            }
          </p>
        </div>

        {/* Selector de Archivo */}
        <div className="form-group">
          <label htmlFor="upload-file" className="form-label">
            📄 Archivo PDF
          </label>
          <div className="file-input-wrapper">
            <input
              ref={fileInputRef}
              id="upload-file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              disabled={isLoading}
              className="file-input"
            />
            <label htmlFor="upload-file" className="file-input-label">
              {selectedFile ? (
                <>
                  <span className="file-icon">✅</span>
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">({getFileSizeDisplay()})</span>
                </>
              ) : (
                <>
                  <span className="file-icon">📁</span>
                  <span>Haz clic para seleccionar PDF o arrastra uno aquí</span>
                </>
              )}
            </label>
          </div>
          <p className="file-help">
            ✓ Máximo 50 MB | ✓ Solo PDF | ✓ Cifrado en almacenamiento
          </p>
        </div>

        {/* Barra de Progreso */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="progress-container">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(uploadProgress)}%</span>
          </div>
        )}

        {/* Alertas */}
        {error && <div className="alert alert-error">⚠️ {error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Botones */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={isLoading || !selectedFile}
            className="btn btn-primary btn-lg"
          >
            {isLoading ? "🔄 Subiendo..." : "📤 Subir Documento"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTitle("");
              setDescription("");
              setClassification("private");
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
              setError(null);
              setSuccess(null);
            }}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            Limpiar
          </button>
        </div>

        {/* Info de seguridad */}
        <div className="security-info">
          <p>
            🔐 <strong>Seguridad:</strong> Tu documento se cifra automáticamente.
            Solo tú y los usuarios autorizados pueden acceder.
          </p>
        </div>
      </form>
    </div>
  );
};

export default FileUploadForm;
