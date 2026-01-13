import { useEffect, useState } from "react";
import { DocumentsService } from "../services/DocumentsService";
import type { DocumentRow } from "../types/models";

export default function DocumentsListPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await DocumentsService.listMyVisible();
        setDocs(data);
      } catch (e: any) {
        setErr(e?.message ?? "Error");
      }
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Documentos</h2>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <ul>
        {docs.map((d) => (
          <li key={d.id}>
            <strong>{d.title}</strong> — {d.classification} — {d.updated_at}
          </li>
        ))}
      </ul>
    </div>
  );
}
