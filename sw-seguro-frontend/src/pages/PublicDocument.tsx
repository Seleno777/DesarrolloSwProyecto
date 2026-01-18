// src/pages/PublicDocument.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function PublicDocument() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [signedUrl, setSignedUrl] = useState<string>("");

  const withPdfViewerParams = useMemo(() => {
    return (url: string) => `${url}#zoom=page-width&toolbar=0&navpanes=0&scrollbar=0`;
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");
        setSignedUrl("");

        const t = (token || "").trim();
        if (!t) throw new Error("Token inválido");

        // Edge Function: debe responder { signedUrl: "https://..." }
        const { data, error } = await supabase.functions.invoke("smooth-service", {
          body: { token: t },
        });

        if (error) throw new Error(error.message);
        if (!data?.signedUrl) throw new Error("Token inválido o expirado");

        setSignedUrl(withPdfViewerParams(data.signedUrl));
      } catch (e: any) {
        setErr(e?.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token, withPdfViewerParams]);

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", background: "#f6f7fb" }}>
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "#fff",
        }}
      >
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          ← Volver
        </button>
        <div style={{ marginLeft: 8, fontWeight: 800 }}>Documento público</div>
        {/* Quitado botón “Abrir” para evitar que dispare toolbar/acciones */}
      </div>

      {loading ? (
        <div style={{ padding: 16 }}>Cargando documento público...</div>
      ) : err ? (
        <div style={{ padding: 16 }}>
          <p style={{ color: "#dc2626", fontWeight: 800 }}>❌ {err}</p>
          <button className="btn btn-primary" onClick={() => navigate("/login", { replace: true })}>
            Ir a login
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, padding: 12 }}>
          <div style={{ height: "calc(100vh - 72px - 24px)", background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <iframe src={signedUrl} title="Documento público" style={{ flex: 1, width: "100%", height: "100%", border: 0 }} />
          </div>
        </div>
      )}
    </div>
  );
}
