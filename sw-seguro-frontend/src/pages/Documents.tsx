import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { listDocuments, type DocumentRow } from "../services/documents";

export default function Documents() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // Lee query param ?open=<uuid>
  const location = useLocation();
  const openDocId = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return (sp.get("open") || "").trim();
  }, [location.search]);

  // refs para hacer scroll al documento abierto
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightId, setHighlightId] = useState<string>("");

  async function refresh() {
    try {
      setErr("");
      setLoading(true);
      const res = await listDocuments();
      setDocs(res);
    } catch (e: any) {
      setErr(e?.message ?? "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // cuando termine de cargar, si viene open=..., hacer scroll + resaltar
  useEffect(() => {
    if (loading) return;
    if (!openDocId) return;

    const found = docs.find((d) => d.id === openDocId);
    if (!found) return;

    setHighlightId(openDocId);

    // pequeño delay para asegurar render
    const t = window.setTimeout(() => {
      const el = cardRefs.current[openDocId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);

    // quitar highlight después de unos segundos
    const t2 = window.setTimeout(() => setHighlightId(""), 3500);

    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [loading, openDocId, docs]);

  const openDocMissing = useMemo(() => {
    if (!openDocId) return false;
    if (loading) return false;
    return !docs.some((d) => d.id === openDocId);
  }, [openDocId, loading, docs]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Mis documentos</h2>
        <button onClick={refresh} disabled={loading}>
          Refrescar
        </button>
      </div>

      {openDocId && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e3a8a",
          }}
        >
          Abriendo documento compartido: <b>{openDocId}</b>
        </div>
      )}

      {openDocMissing && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
          }}
        >
          ⚠️ No encuentro ese documento en tu lista visible.  
          Si acabas de activar el link, revisa que `activate_share_link` haya creado el row en `document_grants`.
        </div>
      )}

      {loading && <div style={{ marginTop: 12 }}>Cargando...</div>}
      {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {docs.map((d) => {
          const isHighlight = highlightId === d.id;

          return (
            <div
              key={d.id}
              ref={(el) => {
                cardRefs.current[d.id] = el;
              }}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
                background: isHighlight ? "#dcfce7" : "#fff",
                boxShadow: isHighlight ? "0 0 0 3px rgba(34,197,94,0.35)" : "none",
                transition: "all 200ms ease",
              }}
            >
              <div style={{ fontWeight: 700 }}>{d.title}</div>
              <div style={{ opacity: 0.8 }}>{d.description ?? "—"}</div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                <div>id: {d.id}</div>
                <div>classification: {d.classification} | domain: {d.domain}</div>
                <div>updated: {new Date(d.updated_at).toLocaleString()}</div>
              </div>
            </div>
          );
        })}

        {!loading && docs.length === 0 && (
          <div style={{ marginTop: 12, opacity: 0.8 }}>
            No tienes documentos visibles.
          </div>
        )}
      </div>
    </div>
  );
}
