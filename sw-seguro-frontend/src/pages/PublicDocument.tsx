import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function PublicDocument() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [signedUrl, setSignedUrl] = useState<string>("");

  const withPdfViewerParams = (url: string) => `${url}#zoom=page-width`;


  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");
        setSignedUrl("");

        const t = (token || "").trim();
        if (!t) throw new Error("Token inválido");

        const { data, error } = await supabase.functions.invoke("smooth-service", {
          body: { token: t },
        });

        if (error) {
          // error puede venir como FunctionsHttpError con status
          throw new Error(error.message || "No se pudo resolver el link público");
        }

        if (!data?.signedUrl) {
          throw new Error("No se obtuvo signedUrl (token inválido o sin archivo)");
        }

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
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          ← Volver
        </button>

        {signedUrl && (
          <button
            className="btn btn-secondary"
            style={{ marginLeft: "auto" }}
            onClick={() => window.open(signedUrl, "_blank", "noopener,noreferrer")}
          >
            Abrir en pestaña
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 16 }}>Cargando documento público...</div>
      ) : err ? (
        <div style={{ padding: 16 }}>
          <p>❌ {err}</p>
        </div>
      ) : (
        <iframe
          src={signedUrl}
          title="Documento público"
          style={{ flex: 1, width: "100%", height: "100%", border: 0 }}
        />
      )}
    </div>
  );
}
