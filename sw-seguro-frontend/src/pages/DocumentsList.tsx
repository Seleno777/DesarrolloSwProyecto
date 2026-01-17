import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useDocuments, useCreateDocument } from "../hooks/useDocuments";
import { DocumentVersionService } from "../services/DocumentsService";
import { FileUploadComponent } from "../components/FileUploadComponent";
import ShareLinkModal from "../components/ShareLinkModal";
import { supabase } from "../lib/supabase";

type DocumentsTab =
  | "my-documents"
  | "shared-with-me"
  | "manage-access"
  | "audit-log"
  | "settings";

export default function DocumentsPage() {
  const { user, signOut } = useAuth();
  const { documents, loading, error, refetch } = useDocuments();
  const { create: createDoc, loading: creating, error: createError } = useCreateDocument();

  // ✅ URL params
  const location = useLocation();
  const navigate = useNavigate();

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const tabFromUrl = useMemo(() => (query.get("tab") || "").trim(), [query]);
  const openDocId = useMemo(() => (query.get("open") || "").trim(), [query]);

  const allowedTabs = useMemo(
    () =>
      new Set<DocumentsTab>([
        "my-documents",
        "shared-with-me",
        "manage-access",
        "audit-log",
        "settings",
      ]),
    []
  );

  const [activeTab, setActiveTab] = useState<DocumentsTab>("my-documents");

  // effectiveTab:
  // - Si viene open=..., forzamos shared-with-me para mostrarlo
  // - Si viene tab válido, usamos ese
  // - Si no, usamos estado local
  const effectiveTab: DocumentsTab = openDocId
    ? "shared-with-me"
    : allowedTabs.has(tabFromUrl as DocumentsTab)
      ? (tabFromUrl as DocumentsTab)
      : activeTab;

  // sincroniza estado local con URL
  useEffect(() => {
    if (effectiveTab !== activeTab) setActiveTab(effectiveTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTab]);

  // navegación de tabs: actualiza URL y elimina open
  const goTab = (tab: DocumentsTab) => {
    setActiveTab(tab);
    const sp = new URLSearchParams(location.search);
    sp.set("tab", tab);
    sp.delete("open");
    navigate(`/documents?${sp.toString()}`, { replace: true });
  };

  // Create doc form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classification, setClassification] = useState<
    "public" | "private" | "confidential" | "restricted"
  >("private");

  // ShareLink modal
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [selectedDocForShare, setSelectedDocForShare] = useState<string | null>(null);
  const [selectedDocTitle, setSelectedDocTitle] = useState("");

  // Shared docs (grants)
  const [sharedDocuments, setSharedDocuments] = useState<any[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);

  // highlight/scroll en shared
  const sharedCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightSharedId, setHighlightSharedId] = useState<string>("");

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDoc(title, description, classification);
      setTitle("");
      setDescription("");
      setClassification("private");
      setShowCreateForm(false);
      refetch();
    } catch (err) {
      console.error("Error creating document:", err);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleShareClick = (docId: string, docTitle: string) => {
    setSelectedDocForShare(docId);
    setSelectedDocTitle(docTitle);
    setShowShareLinkModal(true);
  };

  // ✅ Cargar compartidos al entrar al tab (y cuando user cambia)
  useEffect(() => {
    if (effectiveTab === "shared-with-me") {
      loadSharedDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTab, user?.id]);

  // ✅ IMPORTANTE: Filtrar por grantee_id = user.id
  const loadSharedDocuments = async () => {
  if (!user?.id) {
    setSharedDocuments([]);
    return;
  }

  setLoadingShared(true);
  try {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("document_grants")
      .select(`
        document_id,
        grantee_id,
        granted_by,
        can_view,
        can_download,
        can_edit,
        can_share,
        created_at,
        revoked_at,
        granted_via_link_id,
        expires_at,
        documents:document_id (
          id, title, description, classification, owner_id, created_at, updated_at
        )
      `)
      .eq("grantee_id", user.id)
      .eq("can_view", true) // ✅ SOLO los que puede ver
      .is("revoked_at", null)
      // ✅ NO mostrar expirados
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setSharedDocuments(data || []);
  } catch (err) {
    console.error("Error loading shared documents:", err);
    setSharedDocuments([]);
  } finally {
    setLoadingShared(false);
  }
};
// ✅ Auto-cerrar sesión cuando caduque el grant más cercano (solo estando en shared-with-me)
useEffect(() => {
  if (effectiveTab !== "shared-with-me") return;
  if (!sharedDocuments?.length) return;

  // busca el expires_at más cercano (ignora null)
  const expiries = sharedDocuments
    .map((g: any) => g?.expires_at)
    .filter(Boolean)
    .map((s: string) => new Date(s).getTime())
    .filter((t: number) => Number.isFinite(t));

  if (expiries.length === 0) return;

  const nextExpiry = Math.min(...expiries);
  const ms = nextExpiry - Date.now();

  if (ms <= 0) {
    // ya expiró
    (async () => {
      await supabase.auth.signOut();
      setSharedDocuments([]);
      navigate("/login", { replace: true });
    })();
    return;
  }

  const id = window.setTimeout(async () => {
    await supabase.auth.signOut();
    setSharedDocuments([]);
    navigate("/login", { replace: true });
  }, ms);

  return () => window.clearTimeout(id);
}, [effectiveTab, sharedDocuments, navigate]);

// ✅ Auto-limpieza: esconder grants expirados mientras estás en "Compartidos Conmigo"
useEffect(() => {
  if (effectiveTab !== "shared-with-me") return;

  const tick = () => {
    const now = Date.now();

    setSharedDocuments((prev) =>
      (prev || []).filter((g: any) => {
        if (!g?.expires_at) return true; // si no expira, se queda
        const exp = new Date(g.expires_at).getTime();
        return exp > now; // solo los que no han expirado
      })
    );

    // Si prefieres recargar desde BD en vez de solo filtrar:
    // loadSharedDocuments();
  };

  // corre una vez al entrar
  tick();

  const id = window.setInterval(tick, 15_000);
  return () => window.clearInterval(id);
}, [effectiveTab]);




  // ✅ scroll/highlight si viene open=... y limpiar open= para que no se quede “pegado”
  useEffect(() => {
    if (effectiveTab !== "shared-with-me") return;
    if (loadingShared) return;
    if (!openDocId) return;

    const found = sharedDocuments.find((g) => g.document_id === openDocId);

    const cleanupOpenParam = () => {
      const sp = new URLSearchParams(location.search);
      if (sp.get("open")) {
        sp.delete("open");
        sp.set("tab", "shared-with-me");
        navigate(`/documents?${sp.toString()}`, { replace: true });
      }
    };

    if (found) {
      setHighlightSharedId(openDocId);

      const t = window.setTimeout(() => {
        const el = sharedCardRefs.current[openDocId];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);

      const t2 = window.setTimeout(() => setHighlightSharedId(""), 3500);

      const t3 = window.setTimeout(() => cleanupOpenParam(), 700);

      return () => {
        window.clearTimeout(t);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
      };
    }

    const t4 = window.setTimeout(() => cleanupOpenParam(), 700);
    return () => window.clearTimeout(t4);
  }, [effectiveTab, loadingShared, openDocId, sharedDocuments, location.search, navigate]);

/*  const handleView = async (docId: string) => {
    try {
      const versions = await DocumentVersionService.listVersions(docId);
      if (!versions || versions.length === 0) {
        alert("❌ No hay archivo para ver");
        return;
      }

      const latestVersion = versions[0];
      const storagePathRaw: string =
        latestVersion.storage_path || latestVersion.storagePath;

      if (!storagePathRaw || typeof storagePathRaw !== "string") {
        alert("❌ No hay ruta de archivo (storage_path) para ver");
        return;
      }

      const storagePath = storagePathRaw.replace(/^documents\//, "");

      // ✅ Abrir en pestaña nueva usando URL firmada (si bucket es privado)
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 60 * 10); // 10 min

      if (error) throw new Error(error.message);
      if (!data?.signedUrl) throw new Error("No se generó signedUrl");

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      alert("❌ Error al ver: " + (err?.message || "Error desconocido"));
    }
  };

  const handleViewShared = async (docId: string) => {
    try {
      const versions = await DocumentVersionService.listVersions(docId);
      if (!versions || versions.length === 0) {
        alert("❌ No hay archivo para ver");
        return;
      }

      const latestVersion = versions[0];

      const storagePathRaw: string =
        latestVersion.storage_path ||
        latestVersion.storagePath ||
        latestVersion.storagePathRaw ||
        "";

      if (!storagePathRaw || typeof storagePathRaw !== "string") {
        alert("❌ No hay ruta de archivo (storage_path) para ver");
        return;
      }

      // 1) Normaliza: quita solo "/" al inicio (NO quites documents/ a la fuerza)
      const p0 = storagePathRaw.replace(/^\/+/, "");

      // 2) Prueba 2 candidatos:
      // - tal cual
      // - sin "documents/" por si tu DB lo guarda con prefijo de bucket
      const candidates = Array.from(
        new Set([p0, p0.replace(/^documents\//, "")].filter(Boolean))
      );

      let signedUrl: string | null = null;
      let lastErr: any = null;

      for (const path of candidates) {
        const { data, error } = await supabase.storage
          .from("documents")
          .createSignedUrl(path, 60 * 10); // 10 min

        if (!error && data?.signedUrl) {
          signedUrl = data.signedUrl;
          break;
        }
        lastErr = error;
      }

      if (!signedUrl) {
        // deja un error más claro
        const msg =
          lastErr?.message ||
          "No se pudo generar signedUrl. Revisa que storage_path coincida con el objeto en el bucket.";
        throw new Error(msg);
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      alert("❌ Error al ver: " + (err?.message || "Error desconocido"));
    }
  };


*/

// ✅ VER (dueño) -> navega al viewer (caso B)
const handleView = (docId: string) => {
  navigate(`/documents/view/${docId}?mode=owner`);
};

// ✅ VER (compartido) -> navega al viewer (caso B)
const handleViewShared = (docId: string) => {
  navigate(`/documents/view/${docId}?mode=shared`);
};

  const handleDownload = async (docId: string) => {
    try {
      const versions = await DocumentVersionService.listVersions(docId);
      if (!versions || versions.length === 0) {
        alert("❌ No hay archivo para descargar");
        return;
      }

      const latestVersion = versions[0];
      const storagePathRaw: string = latestVersion.storage_path || latestVersion.storagePath;

      if (!storagePathRaw || typeof storagePathRaw !== "string") {
        alert("❌ No hay ruta de archivo (storage_path) para descargar");
        return;
      }

      const storagePath = storagePathRaw.replace(/^documents\//, "");

      const { data, error } = await supabase.storage.from("documents").download(storagePath);
      if (error) throw new Error(error.message);
      if (!data) throw new Error("No se recibió el archivo desde Storage");

      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;

      const fileName =
        latestVersion.filename ||
        latestVersion.file_name ||
        latestVersion.original_filename ||
        storagePath.split("/").pop() ||
        "documento.pdf";

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("❌ Error al descargar: " + (err?.message || "Error desconocido"));
    }
  };

  const getClassificationLabel = (c: string) => {
    const labels: Record<string, string> = {
      public: "🔓 Público",
      private: "🔒 Privado",
      confidential: "🔐 Confidencial",
      restricted: "⛔ Restringido",
    };
    return labels[c] || c;
  };

  const getClassificationColor = (c: string) => {
    const colors: Record<string, string> = {
      public: "#10b981",
      private: "#3b82f6",
      confidential: "#f59e0b",
      restricted: "#ef4444",
    };
    return colors[c] || "#6b7280";
  };

  return (
    <div className="documents-container">
      {/* Header */}
      <header className="documents-header">
        <div className="header-left">
          <h1>📄 Gestión de Documentos</h1>
          <p className="header-subtitle">Centro de control para documentos y acceso</p>
        </div>
        <div className="header-right">
          <div className="user-profile">
            <div className="user-avatar">{user?.email?.charAt(0).toUpperCase() || "U"}</div>
            <div className="user-details">
              <p className="user-email">{user?.email}</p>
              <p className="user-status">Conectado</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-outline-danger">
            🚪 Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="documents-tabs">
        <button
          onClick={() => goTab("my-documents")}
          className={`tab-button ${effectiveTab === "my-documents" ? "active" : ""}`}
        >
          📑 Mis Documentos
        </button>
        <button
          onClick={() => goTab("shared-with-me")}
          className={`tab-button ${effectiveTab === "shared-with-me" ? "active" : ""}`}
        >
          👥 Compartidos Conmigo
        </button>
        <button
          onClick={() => goTab("manage-access")}
          className={`tab-button ${effectiveTab === "manage-access" ? "active" : ""}`}
        >
          🔐 Gestionar Accesos
        </button>
        <button
          onClick={() => goTab("audit-log")}
          className={`tab-button ${effectiveTab === "audit-log" ? "active" : ""}`}
        >
          📋 Historial de Auditoría
        </button>
        <button
          onClick={() => goTab("settings")}
          className={`tab-button ${effectiveTab === "settings" ? "active" : ""}`}
        >
          ⚙️ Configuración
        </button>
      </nav>

      {/* Errors */}
      {(error || createError) && <div className="alert alert-error">⚠️ {error || createError}</div>}

      {/* ShareLink Modal */}
      <ShareLinkModal
        isOpen={showShareLinkModal}
        documentId={selectedDocForShare || ""}
        documentTitle={selectedDocTitle}
        onClose={() => setShowShareLinkModal(false)}
      />

      {/* Tab Content */}
      <div className="tab-content">
        {/* My Documents */}
        {effectiveTab === "my-documents" && (
          <div className="section-my-documents">
            <div className="section-header">
              <h2>Mis Documentos</h2>
              {!showCreateForm && (
                <button onClick={() => setShowCreateForm(true)} className="btn btn-primary btn-lg">
                  ➕ Crear Nuevo Documento
                </button>
              )}
            </div>

            {showCreateForm && (
              <div className="create-document-card">
                <h3>🆕 Crear Nuevo Documento</h3>
                <form onSubmit={handleCreateDocument} className="create-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="title">Título *</label>
                      <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        disabled={creating}
                        placeholder="Ingresa el título del documento"
                        maxLength={255}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="classification">Clasificación *</label>
                      <select
                        id="classification"
                        value={classification}
                        onChange={(e) => setClassification(e.target.value as any)}
                        disabled={creating}
                      >
                        <option value="public">🔓 Público</option>
                        <option value="private">🔒 Privado (recomendado)</option>
                        <option value="confidential">🔐 Confidencial</option>
                        <option value="restricted">⛔ Restringido</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="description">Descripción</label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={creating}
                      placeholder="Descripción opcional del documento"
                      rows={3}
                      maxLength={1000}
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" disabled={creating} className="btn btn-primary">
                      {creating ? "⏳ Creando..." : "✓ Crear Documento"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      disabled={creating}
                      className="btn btn-secondary"
                    >
                      ✕ Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Cargando documentos...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No tienes documentos todavía</h3>
                <p>Crea tu primer documento para comenzar</p>
                <button onClick={() => setShowCreateForm(true)} className="btn btn-primary btn-lg">
                  ➕ Crear Documento
                </button>
              </div>
            ) : (
              <div className="documents-grid">
                {documents.map((doc) => (
                  <div key={doc.id} className="document-card">
                    <div className="card-header">
                      <h3 className="card-title">{doc.title}</h3>
                      <span
                        className="badge"
                        style={{ backgroundColor: getClassificationColor(doc.classification) }}
                      >
                        {getClassificationLabel(doc.classification)}
                      </span>
                    </div>

                    {doc.description && <p className="card-description">{doc.description}</p>}

                    <div className="card-meta">
                      <div className="meta-item">
                        📅 Creado: {new Date(doc.created_at).toLocaleDateString("es-ES")}
                      </div>
                      <div className="meta-item">
                        ✏️ Actualizado: {new Date(doc.updated_at).toLocaleDateString("es-ES")}
                      </div>
                    </div>

                    {/* Acciones dueño */}
                    <div className="card-actions">
                      <button
                        className="btn btn-sm btn-primary"
                        title="Ver documento"
                        onClick={() => handleView(doc.id)}
                      >
                        👁️ Ver
                      </button>


                      <button
                        className="btn btn-sm btn-secondary"
                        title="Compartir por link"
                        onClick={() => handleShareClick(doc.id, doc.title)}
                      >
                        🔗 Compartir
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        title="Descargar documento"
                        onClick={() => handleDownload(doc.id)}
                      >
                        ⬇️ Descargar
                      </button>
                    </div>

                    <FileUploadComponent
                      documentId={doc.id}
                      onUploadSuccess={() => {
                        alert("✅ Archivo subido exitosamente");
                        refetch();
                      }}
                      onUploadError={(err) => alert("❌ Error: " + err)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shared with me */}
        {effectiveTab === "shared-with-me" && (
          <div className="section-shared">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2>📤 Documentos Compartidos Conmigo</h2>
              <button className="btn btn-secondary" onClick={loadSharedDocuments} disabled={loadingShared}>
                🔄 Refrescar
              </button>
            </div>

            {loadingShared ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Cargando documentos...</p>
              </div>
            ) : sharedDocuments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🤝</div>
                <h3>Sin documentos compartidos aún</h3>
                <p>Los documentos que compartan contigo aparecerán aquí</p>
              </div>
            ) : (
              <div className="documents-grid">
                {sharedDocuments.map((grant: any) => {
                  const doc = grant.documents;
                  const sharedBy = grant?.granted_by || doc?.owner_id || "Desconocido";

                  const isHighlight = highlightSharedId === grant.document_id;

                  return (
                    <div
                      key={`${grant.document_id}-${grant.created_at}`}
                      ref={(el) => {
                        sharedCardRefs.current[grant.document_id] = el;
                      }}
                      className="document-card"
                      style={{
                        background: isHighlight ? "#dcfce7" : undefined,
                        boxShadow: isHighlight ? "0 0 0 3px rgba(34,197,94,0.35)" : undefined,
                        transition: "all 200ms ease",
                      }}
                    >
                      <div className="card-header">
                        <h3 className="card-title">{doc?.title || grant.document_id}</h3>
                        <span
                          className="badge"
                          style={{ backgroundColor: getClassificationColor(doc?.classification || "private") }}
                        >
                          {getClassificationLabel(doc?.classification || "private")}
                        </span>
                      </div>

                      {doc?.description && <p className="card-description">{doc.description}</p>}

                      <div className="card-meta">
                        <div className="meta-item">👤 Compartido por: {sharedBy}</div>
                        <div className="meta-item">
                          📅 Desde: {new Date(grant.created_at).toLocaleDateString("es-ES")}
                        </div>
                      </div>

                      {/* ✅ botones SOLO por permisos */}
                      <div className="card-actions">
                        {grant.can_view && (
                          <button className="btn btn-sm btn-primary" onClick={() => handleViewShared(grant.document_id)}>
                            👁️ Ver
                          </button>
                        )}


                        {grant.can_download && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleDownload(grant.document_id)}
                          >
                            ⬇️ Descargar
                          </button>
                        )}

                        {grant.can_edit && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => alert("✏️ Editar: (pendiente de implementar editor)")}
                          >
                            ✏️ Editar
                          </button>
                        )}

                        {grant.can_share && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleShareClick(grant.document_id, doc?.title || "Documento")}
                          >
                            🔗 Compartir
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Manage Access */}
        {effectiveTab === "manage-access" && (
          <div className="section-access">
            <h2>🔐 Gestionar Accesos</h2>

            {documents.length === 0 ? (
              <div className="empty-state">
                <p>Crea un documento primero para gestionar accesos</p>
              </div>
            ) : (
              <div className="access-management">
                {documents.map((doc) => (
                  <div key={doc.id} className="access-card">
                    <div className="access-header">
                      <h4>{doc.title}</h4>
                      <span
                        className="badge"
                        style={{ backgroundColor: getClassificationColor(doc.classification) }}
                      >
                        {getClassificationLabel(doc.classification)}
                      </span>
                    </div>

                    <div className="access-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => handleShareClick(doc.id, doc.title)}>
                        🔗 Crear link para email
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audit Log */}
        {effectiveTab === "audit-log" && (
          <div className="section-audit">
            <h2>📋 Historial de Auditoría</h2>
            <p>(Pendiente de implementar)</p>
          </div>
        )}

        {/* Settings */}
        {effectiveTab === "settings" && (
          <div className="section-settings">
            <h2>⚙️ Configuración</h2>
            <p>(Pendiente de implementar)</p>
          </div>
        )}
      </div>
    </div>
  );
}
