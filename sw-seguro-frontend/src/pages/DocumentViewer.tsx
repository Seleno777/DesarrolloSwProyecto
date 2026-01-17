import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { DocumentVersionService } from "../services/DocumentsService";
import { useAuth } from "../auth/AuthProvider";

export default function DocumentViewer() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const mode = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return (sp.get("mode") || "shared").trim(); // "shared" | "owner"
  }, [location.search]);

  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // ✅ Expiración del GRANT (modo shared)
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // ✅ Para refrescar signedUrl sin duplicar timers
  const refreshTimerRef = useRef<number | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  // ✅ Fuerza ajuste al ancho SIN habilitar toolbars extra
  const withPdfViewerParams = (url: string) => {
    // zoom=page-width: ajusta al ancho
    // toolbar=0&navpanes=0: intenta ocultar barras (algunos browsers lo ignoran)
    return `${url}#zoom=page-width&toolbar=0&navpanes=0`;
  };

  // ✅ Genera signedUrl y programa refresh antes de que expire
  const generateSignedUrl = async (storagePathRaw: string) => {
    const p0 = storagePathRaw.replace(/^\/+/, "");
    const path = p0.replace(/^documents\//, "");

    // 5 minutos (más usable) y refrescamos antes de caducar
    const TTL_SECONDS = 60 * 5;

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, TTL_SECONDS);

    if (error) throw error;
    if (!data?.signedUrl) throw new Error("No se generó signedUrl.");

    setSignedUrl(withPdfViewerParams(data.signedUrl));

    // refresca 30s antes de expirar
    clearRefreshTimer();
    refreshTimerRef.current = window.setTimeout(() => {
      // re-intenta refrescar (silencioso)
      generateSignedUrl(storagePathRaw).catch(() => {});
    }, Math.max(5_000, (TTL_SECONDS - 30) * 1000));
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");
        setSignedUrl("");
        setExpiresAt(null);
        clearRefreshTimer();

        if (!docId) throw new Error("docId inválido");
        if (!user?.id) throw new Error("No autenticado");

        // ✅ Validación de permisos
        if (mode === "shared") {
          const { data: grant, error: gErr } = await supabase
            .from("document_grants")
            .select("document_id, grantee_id, can_view, revoked_at, expires_at")
            .eq("document_id", docId)
            .eq("grantee_id", user.id)
            .maybeSingle();

          if (gErr) throw gErr;
          if (!grant) throw new Error("No tienes acceso a este documento.");
          if (!grant.can_view) throw new Error("No tienes permiso de ver.");
          if (grant.revoked_at) throw new Error("Acceso revocado.");

          if (grant.expires_at && new Date(grant.expires_at).getTime() <= Date.now()) {
            throw new Error("Acceso expirado.");
          }

          setExpiresAt(grant.expires_at || null);
        } else {
          // ✅ modo owner: confirma que el doc es mío
          const { data: doc, error: dErr } = await supabase
            .from("documents")
            .select("id, owner_id")
            .eq("id", docId)
            .maybeSingle();

          if (dErr) throw dErr;
          if (!doc) throw new Error("Documento no existe.");
          if (doc.owner_id !== user.id) throw new Error("No eres el dueño de este documento.");
        }

        // ✅ Obtener última versión
        const versions = await DocumentVersionService.listVersions(docId);
        if (!versions || versions.length === 0) {
          throw new Error("No hay archivo para ver.");
        }

        const latest = versions[0];
        const storagePathRaw: string =
          latest.storage_path || latest.storagePath || latest.storagePathRaw || "";

        if (!storagePathRaw) throw new Error("No hay storage_path.");

        await generateSignedUrl(storagePathRaw);
      } catch (e: any) {
        setErr(e?.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    run();

    return () => {
      clearRefreshTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, user?.id, mode]);

  // ✅ auto-kick cuando expire (solo modo shared)
  useEffect(() => {
    if (mode !== "shared") return;
    if (!expiresAt) return;

    const expMs = new Date(expiresAt).getTime();
    const msLeft = expMs - Date.now();

    const kick = async () => {
      await supabase.auth.signOut();
      navigate("/login?reason=share_expired", { replace: true });
    };

    if (msLeft <= 0) {
      kick();
      return;
    }

    const t = window.setTimeout(kick, msLeft);
    return () => window.clearTimeout(t);
  }, [expiresAt, mode, navigate]);

  const back = () => {
    if (mode === "owner") {
      navigate("/documents?tab=my-documents", { replace: true });
    } else {
      navigate("/documents?tab=shared-with-me", { replace: true });
    }
  };

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", gap: 8 }}>
        <button className="btn btn-secondary" onClick={back}>
          ← Volver
        </button>

        {mode === "shared" && expiresAt && (
          <span style={{ marginLeft: "auto", opacity: 0.7 }}>
            Expira: {new Date(expiresAt).toLocaleString("es-ES")}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 16 }}>Cargando...</div>
      ) : err ? (
        <div style={{ padding: 16 }}>
          <p>❌ {err}</p>
          <button className="btn btn-primary" onClick={back}>
            Volver
          </button>
        </div>
      ) : (
        <iframe
          src={signedUrl}
          title="Documento"
          style={{ flex: 1, width: "100%", height: "100%", border: 0 }}
        />
      )}
    </div>
  );
}
