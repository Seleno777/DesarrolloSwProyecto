import { useEffect, useState } from "react";
import { listDocuments, type DocumentRow } from "../services/documents";

export default function Documents() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  async function refresh() {
    try {
      setErr("");
      setLoading(true);
      const res = await listDocuments();
      setDocs(res);
    } catch (e: any) {
      setErr(e.message ?? "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Mis documentos</h2>
        <button onClick={refresh} disabled={loading}>
          Refrescar
        </button>
      </div>

      {loading && <div style={{ marginTop: 12 }}>Cargando...</div>}
      {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {docs.map((d) => (
          <div key={d.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{d.title}</div>
            <div style={{ opacity: 0.8 }}>{d.description ?? "—"}</div>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              <div>id: {d.id}</div>
              <div>classification: {d.classification} | domain: {d.domain}</div>
              <div>updated: {new Date(d.updated_at).toLocaleString()}</div>
            </div>
          </div>
        ))}

        {!loading && docs.length === 0 && (
          <div style={{ marginTop: 12, opacity: 0.8 }}>No tienes documentos visibles.</div>
        )}
      </div>
    </div>
  );
}
