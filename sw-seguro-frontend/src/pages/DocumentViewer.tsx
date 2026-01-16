import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { DocumentVersionService } from "../services/DocumentsService";

type DocRow = {
  id: string;
  title: string;
  description: string | null;
  classification: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

type GrantRow = {
  document_id: string;
  grantee_id: string;
  can_view: boolean;
  can_download: boolean;
  can_edit: boolean;
  can_share: boolean;
  revoked_at: string | null;
};

export default function DocumentViewer() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const from = useMemo(() => (searchParams.get("from") || "").trim(), [searchParams]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [grant, setGrant] = useState<GrantRow | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");

  useEffect(() => {
    let revokeUrl: string | null = null;

    const run = async () => {
      try {
        setErr("");
        setLoading(true);

        if (!user?.id) {
          setErr("No autenticado");
          return;
        }
        if (!docId) {
          setErr("Documento inválido");
          return;
        }

        // 1) Traer doc (RLS ya permite owner o granted)
        const { data: docData, error: docErr } = await supabase
          .from("documents")
          .select("id,title,description,classification,owner_id,created_at,updated_at")
          .eq("id", docId)
          .single();

        if (docErr) throw docErr;
        setDoc(docData as DocRow);

        // 2) Traer grant (si no soy owner)
        if (docData.owner_id !== user.id) {
          const { data: gData, error: gErr } = await supabase
            .from("document_grants")
            .select("document_id,grantee_id,can_view,can_download,can_edit,can_share,revoked_at")
            .eq("document_id", docId)
            .eq("grantee_id", user.id)
            .is("revoked_at", null)
            .maybeSingle();

          if (gErr) throw gErr;

          if (!gData || !gData.can_view) {
            setErr("No tienes permiso para ver este documento.");
            return;
          }
          setGrant(gData as GrantRow);
        } else {
          // owner: todos los permisos implícitos
          setGrant({
            document_id: docId,
            grantee_id: user.id,
            can_view: true,
            can_download: true,
            can_edit: true,
            can_share: true,
            revoked_at: null,
          });
        }

        // 3) Descargar última versión PDF y mostrarla
        const versions = await DocumentVersionService.listVersions(docId);
        if (!versions || versions.length === 0) {
          setErr("Este documento no tiene archivo PDF cargado.");
          return;
        }

        const latest = versions[0];
        const storagePathRaw: string = latest.storage_path || latest.storagePath;

        if (!storagePathRaw) {
          setErr("No existe storage_path para este PDF.");
          return;
        }

        // tu bucket es "documents" y normalmente guardas como "documents/<...>"
        const storagePath = storagePathRaw.replace(/^documents\//, "");

        const { data: fileBlob, error: dlErr } = await supabase.storage
          .from("documents")
          .download(storagePath);

        if (dlErr) throw dlErr;
        if (!fileBlob) {
          setErr("No se recibió archivo desde Storage.");
          return;
        }

        const url = URL.createObjectURL(fileBlob);
        revokeUrl = url;
        setPdfUrl(url);
      } catch (e: any) {
        setErr(e?.message || "Error al cargar el documento");
      } finally {
        setLoading(false);
      }
    };

    run();

    return () => {
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [docId, user?.id]);

  const canDownload = !!grant?.can_download;

  const handleDownload = async () => {
    if (!docId) return;
    if (!canDownload) {
      alert("No tienes permiso para descargar.");
      return;
    }
    // Reutiliza tu download actual (si quieres) pero aquí lo hacemos simple:
    try {
      const versions = await DocumentVersionService.listVersions(docId);
      if (!versions || versions.length === 0) {
        alert("❌ No hay archivo para descargar");
        return;
      }
      const latest = versions[0];
      const storagePathRaw: string = latest.storage_path || latest.storagePath;
      const storagePath = storagePathRaw.replace(/^documents\//, "");

      const { data, error } = await supabase.storage.from("documents").download(storagePath);
      if (error) throw new Error(error.message);
      if (!data) throw new Error("No se recibió el archivo");

      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;

      const fileName =
        latest.filename ||
        latest.file_name ||
        latest.original_filename ||
        storagePath.split("/").pop() ||
        "documento.pdf";

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("❌ Error al descargar: " + (e?.message || "Error desconocido"));
    }
  };

  const goBack = () => {
    if (from === "shared") {
      navigate("/documents?tab=shared-with-me", { replace: true });
      return;
    }
    navigate("/documents?tab=my-documents", { replace: true });
  };

  return (
    <div className="documents-container">
      <header className="documents-header">
        <div className="header-left">
          <h1>👁️ Visor de Documento</h1>
          <p className="header-subtitle">{doc?.title || "Documento"}</p>
        </div>
        <div className="header-right" style={{ display: "flex", gap: 8 }}>
          <button onClick={goBack} className="btn btn-secondary">
            ⬅️ Volver
          </button>
          {canDownload && (
            <button onClick={handleDownload} className="btn btn-primary">
              ⬇️ Descargar
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando documento...</p>
        </div>
      ) : err ? (
        <div className="alert alert-error">⚠️ {err}</div>
      ) : pdfUrl ? (
        <div style={{ height: "calc(100vh - 180px)", borderRadius: 12, overflow: "hidden" }}>
          <iframe
            title="PDF Viewer"
            src={pdfUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No hay PDF para mostrar</h3>
        </div>
      )}
    </div>
  );
}
