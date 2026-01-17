// src/pages/DocumentViewer.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { DocumentVersionService } from "../services/DocumentsService";
import { useAuth } from "../auth/AuthProvider";

type DocRow = {
  id: string;
  owner_id: string;
  classification: "public" | "private" | "confidential" | "restricted";
};

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
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [docInfo, setDocInfo] = useState<DocRow | null>(null);

  // UI: modal password
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [verifyingPwd, setVerifyingPwd] = useState(false);

  // para no ejecutar 2 veces en DEV StrictMode
  const lastRunKeyRef = useRef<string>("");
  const runIdRef = useRef(0);

  // refresh signedUrl sin duplicar timers
  const refreshTimerRef = useRef<number | null>(null);
  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  // Ajuste visual del PDF (no desactiva toolbar del browser, solo zoom)
  const withPdfViewerParams = useMemo(() => {
        return (url: string) => `${url}#zoom=page-width&toolbar=0&navpanes=0`;
      }, []);

  const generateSignedUrl = async (storagePathRaw: string) => {
    const p0 = storagePathRaw.replace(/^\/+/, "");
    const path = p0.replace(/^documents\//, "");

    const TTL_SECONDS = 60 * 5;

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, TTL_SECONDS);

    if (error) throw error;
    if (!data?.signedUrl) throw new Error("No se generó signedUrl.");

    setSignedUrl(withPdfViewerParams(data.signedUrl));

    clearRefreshTimer();
    refreshTimerRef.current = window.setTimeout(() => {
      generateSignedUrl(storagePathRaw).catch(() => {});
    }, Math.max(5_000, (TTL_SECONDS - 30) * 1000));
  };

  const back = () => {
    if (mode === "owner") navigate("/documents?tab=my-documents", { replace: true });
    else navigate("/documents?tab=shared-with-me", { replace: true });
  };

  const runLoad = async (myRunId: number) => {
    try {
      setLoading(true);
      setErr("");
      setSignedUrl("");
      setExpiresAt(null);
      setDocInfo(null);
      setPwdInput("");
      setPwdErr("");
      setShowPwdModal(false);
      clearRefreshTimer();

      if (!docId) throw new Error("docId inválido");
      if (!user?.id) throw new Error("No autenticado");

      // 1) doc info
      const { data: docRow, error: dErr } = await supabase
        .from("documents")
        .select("id, owner_id, classification")
        .eq("id", docId)
        .maybeSingle();

      if (myRunId !== runIdRef.current) return; // cancel stale run
      if (dErr) throw dErr;
      if (!docRow) throw new Error("Documento no existe.");

      const doc = docRow as DocRow;
      setDocInfo(doc);

      // 2) permisos
      if (mode === "shared") {
        if (doc.classification === "restricted") {
          throw new Error("⛔ Documento RESTRINGIDO no se puede acceder por compartido.");
        }

        const { data: grant, error: gErr } = await supabase
          .from("document_grants")
          .select("document_id, grantee_id, can_view, revoked_at, expires_at")
          .eq("document_id", docId)
          .eq("grantee_id", user.id)
          .maybeSingle();

        if (myRunId !== runIdRef.current) return;
        if (gErr) throw gErr;
        if (!grant) throw new Error("No tienes acceso a este documento.");
        if (!grant.can_view) throw new Error("No tienes permiso de ver.");
        if (grant.revoked_at) throw new Error("Acceso revocado.");
        if (grant.expires_at && new Date(grant.expires_at).getTime() <= Date.now()) {
          throw new Error("Acceso expirado.");
        }
        setExpiresAt(grant.expires_at || null);
      } else {
        // owner
        if (doc.owner_id !== user.id) throw new Error("No eres el dueño de este documento.");

        // restricted => pedir password por modal (solo 1 vez)
        if (doc.classification === "restricted") {
          setShowPwdModal(true);
          // detenemos aquí, el resto lo continúa cuando valide password
          return;
        }
      }

      // 3) cargar PDF (no restricted o shared)
      const versions = await DocumentVersionService.listVersions(docId);
      if (myRunId !== runIdRef.current) return;

      if (!versions || versions.length === 0) throw new Error("No hay archivo para ver.");

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

  // VALIDAR PASSWORD (solo restricted owner)
  const validateRestrictedPasswordAndLoad = async () => {
    if (!docId) return;
    if (!pwdInput) {
      setPwdErr("Ingresa la contraseña.");
      return;
    }
    setVerifyingPwd(true);
    setPwdErr("");

    try {
      const { data: ok, error: vErr } = await supabase.rpc(
        "verify_restricted_password_v2",
        { p_document_id: docId, p_password: pwdInput }
      );
      if (vErr) throw vErr;
      if (!ok) {
        setPwdErr("Contraseña incorrecta.");
        return;
      }

      setShowPwdModal(false);

      // continuar carga del PDF
      const versions = await DocumentVersionService.listVersions(docId);
      if (!versions || versions.length === 0) throw new Error("No hay archivo para ver.");

      const latest = versions[0];
      const storagePathRaw: string =
        latest.storage_path || latest.storagePath || latest.storagePathRaw || "";

      if (!storagePathRaw) throw new Error("No hay storage_path.");

      await generateSignedUrl(storagePathRaw);
    } catch (e: any) {
      setErr(e?.message || "Error verificando contraseña");
    } finally {
      setVerifyingPwd(false);
      setLoading(false);
    }
  };

  // CARGA PRINCIPAL (con guard para StrictMode DEV)
  useEffect(() => {
    const key = `${docId || ""}|${user?.id || ""}|${mode}`;
    if (!docId || !user?.id) return;

    // guard DEV StrictMode: si React ejecuta efecto 2 veces con el mismo key, ignoramos la 2da
    if (import.meta.env.DEV && lastRunKeyRef.current === key) {
      return;
    }
    lastRunKeyRef.current = key;

    runIdRef.current += 1;
    const myRunId = runIdRef.current;

    runLoad(myRunId);

    return () => {
      clearRefreshTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, user?.id, mode]);

  // auto-kick cuando expire (solo modo shared)
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

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", background: "#f6f7fb" }}>
      {/* Header */}
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button className="btn btn-secondary" onClick={back}>
          ← Volver
        </button>

        <div style={{ display: "grid", lineHeight: 1.2 }}>
          <strong style={{ fontSize: 14 }}>Visor de Documento</strong>
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            {mode === "owner" ? "Modo: Dueño" : "Modo: Compartido"}
            {docInfo?.classification ? ` · Clasificación: ${docInfo.classification}` : ""}
          </span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {mode === "shared" && expiresAt && (
            <span style={{ fontSize: 12, opacity: 0.75 }}>
              Expira: {new Date(expiresAt).toLocaleString("es-ES")}
            </span>
          )}

          {signedUrl && (
            <button
              className="btn btn-secondary"
              onClick={() => window.open(signedUrl, "_blank", "noopener,noreferrer")}
              title="Abrir en una nueva pestaña"
            >
              ↗ Abrir
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: 12 }}>
        {loading ? (
          <div style={{ padding: 16, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }}>
            Cargando...
          </div>
        ) : err ? (
          <div style={{ padding: 16, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }}>
            <p style={{ margin: 0, color: "#dc2626" }}>❌ {err}</p>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={back}>
                Volver
              </button>
            </div>
          </div>
        ) : (
          <div style={{ height: "calc(100vh - 72px - 24px)", background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <iframe
              src={signedUrl}
              title="Documento"
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          </div>
        )}
      </div>

      {/* Modal password (restricted owner) */}
      {showPwdModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => {
            // si quieres obligar a ingresar, comenta estas 2 lineas:
            setShowPwdModal(false);
            back();
          }}
        >
          <div
            style={{
              width: "min(520px, 95vw)",
              background: "#fff",
              borderRadius: 14,
              padding: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>🔐 Documento RESTRINGIDO</h3>
            <p style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
              Ingresa la contraseña para ver el documento.
            </p>

            <input
              autoFocus
              type="password"
              value={pwdInput}
              onChange={(e) => setPwdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") validateRestrictedPasswordAndLoad();
              }}
              placeholder="Contraseña"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ddd",
                marginTop: 10,
              }}
              disabled={verifyingPwd}
            />

            {pwdErr && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#dc2626" }}>
                ❌ {pwdErr}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowPwdModal(false);
                  back();
                }}
                disabled={verifyingPwd}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={validateRestrictedPasswordAndLoad}
                disabled={verifyingPwd}
              >
                {verifyingPwd ? "Validando..." : "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
