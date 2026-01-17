// src/pages/DocumentsList.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useDocuments, useCreateDocument } from "../hooks/useDocuments";
import { useToast } from "../hooks/useToast";
import { DocumentVersionService } from "../services/DocumentsService";
import { FileUploadComponent } from "../components/FileUploadComponent";
import ShareLinkModal from "../components/ShareLinkModal";
import EditSharedDocumentModal from "../components/EditSharedDocumentModal"; // ✅ NUEVO
import { supabase } from "../lib/supabase";

type DocumentsTab =
  | "my-documents"
  | "shared-with-me"
  | "manage-access"
  | "audit-log"
  | "settings";

type ShareLinkRow = {
  id: string;
  document_id: string;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number | null;
  revoked_at: string | null;
};

type ShareRecipientRow = {
  id: string;
  link_id: string;
  recipient_email: string;
  recipient_user_id?: string | null;
  can_view: boolean;
  can_download: boolean;
  can_edit: boolean;
  can_share: boolean;
  max_uses: number | null;
  uses_count: number | null;
  created_at: string;
  revoked_at: string | null;
};

type PublicDocLinkRow = {
  document_id: string;
  token: string;
};

function generateStrongPassword(len = 16) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*()-_=+[]{};:,.<>?";
  const all = upper + lower + digits + special;

  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];

  // fuerza al menos 1 de cada
  let out = pick(upper) + pick(lower) + pick(digits) + pick(special);
  for (let i = out.length; i < len; i++) out += pick(all);

  return out
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export default function DocumentsPage() {
  const { user, signOut } = useAuth();
  const { documents, loading, error, refetch } = useDocuments();
  const { create: createDoc, loading: creating, error: createError } =
    useCreateDocument();
  const toast = useToast();

  // ✅ URL params
  const location = useLocation();
  const navigate = useNavigate();

  const query = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
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

  const effectiveTab: DocumentsTab = openDocId
    ? "shared-with-me"
    : allowedTabs.has(tabFromUrl as DocumentsTab)
    ? (tabFromUrl as DocumentsTab)
    : activeTab;

  useEffect(() => {
    if (effectiveTab !== activeTab) setActiveTab(effectiveTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTab]);

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
  const [selectedDocForShare, setSelectedDocForShare] = useState<string | null>(
    null
  );
  const [selectedDocTitle, setSelectedDocTitle] = useState("");

  // Shared docs (grants)
  const [sharedDocuments, setSharedDocuments] = useState<any[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);

  // highlight/scroll en shared
  const sharedCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightSharedId, setHighlightSharedId] = useState<string>("");

  // ----------------------------
  // ✅ Modal para contraseña RESTRINGIDO (copiable)
  // ----------------------------
  const [showRestrictedPwd, setShowRestrictedPwd] = useState(false);
  const [restrictedPwd, setRestrictedPwd] = useState("");
  const [restrictedCopied, setRestrictedCopied] = useState(false);
  const [restrictedCopyErr, setRestrictedCopyErr] = useState("");

  // ----------------------------
  // ✅ PUBLIC permanent tokens
  // ----------------------------
  const [publicTokens, setPublicTokens] = useState<Record<string, string>>({});

  // ----------------------------
  // ✅ EDITAR Shared (subir nueva versión)
  // ----------------------------
  const [showEditSharedModal, setShowEditSharedModal] = useState(false);
  const [editSharedCtx, setEditSharedCtx] = useState<{
    documentId: string;
    title: string;
    classification: "public" | "private" | "confidential" | "restricted";
  } | null>(null);

  useEffect(() => {
    const run = async () => {
      const publicDocs = (documents || []).filter(
        (d: any) => d.classification === "public"
      );
      if (!publicDocs.length) return;

      const ids = publicDocs.map((d: any) => d.id);

      const { data, error } = await supabase
        .from("public_document_links")
        .select("document_id, token")
        .in("document_id", ids);

      if (!error && data) {
        const map: Record<string, string> = {};
        for (const row of data as PublicDocLinkRow[]) {
          map[row.document_id] = row.token;
        }
        setPublicTokens(map);
      }
    };

    run();
  }, [documents]);

  // ----------------------------
  // ✅ Manage Access
  // ----------------------------
  const [manageDocId, setManageDocId] = useState<string>("");
  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [linksErr, setLinksErr] = useState<string>("");

  const [selectedLinkId, setSelectedLinkId] = useState<string>("");
  const [recipients, setRecipients] = useState<ShareRecipientRow[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientsErr, setRecipientsErr] = useState<string>("");

  useEffect(() => {
    if (effectiveTab !== "manage-access") return;
    if (manageDocId) return;
    if (documents?.length) setManageDocId((documents as any)[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTab, documents?.length]);

  const loadShareLinks = async (docId: string) => {
    if (!docId) {
      setLinks([]);
      setSelectedLinkId("");
      setRecipients([]);
      return;
    }
    setLoadingLinks(true);
    setLinksErr("");
    setLinks([]);
    setSelectedLinkId("");
    setRecipients([]);
    setRecipientsErr("");

    try {
      const { data, error } = await supabase
        .from("share_links")
        .select(
          "id, document_id, created_at, expires_at, max_uses, uses_count, revoked_at"
        )
        .eq("document_id", docId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLinks((data || []) as ShareLinkRow[]);
    } catch (e: any) {
      setLinksErr(e?.message || "Error cargando links");
      setLinks([]);
    } finally {
      setLoadingLinks(false);
    }
  };

  const loadRecipients = async (linkId: string) => {
    if (!linkId) {
      setRecipients([]);
      setRecipientsErr("");
      return;
    }
    setLoadingRecipients(true);
    setRecipientsErr("");
    setRecipients([]);

    try {
      const { data, error } = await supabase
        .from("share_link_recipients")
        .select(
          "id, link_id, recipient_email, recipient_user_id, can_view, can_download, can_edit, can_share, max_uses, uses_count, created_at, revoked_at"
        )
        .eq("link_id", linkId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecipients((data || []) as ShareRecipientRow[]);
    } catch (e: any) {
      setRecipientsErr(
        e?.message ||
          "No se pudo cargar recipients (revisa RLS/policies de share_link_recipients para owner)."
      );
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  };

  useEffect(() => {
    if (effectiveTab !== "manage-access") return;
    if (!manageDocId) return;
    loadShareLinks(manageDocId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTab, manageDocId]);

  const revokeLink = async (linkId: string) => {
    if (!linkId) return;
    const ok = window.confirm(
      "¿Revocar este link? (Esto también revoca grants creados por ese link)"
    );
    if (!ok) return;

    try {
      const { error } = await supabase.rpc("revoke_share_link_v2", {
        p_link_id: linkId,
      });
      if (error) throw error;

      await loadShareLinks(manageDocId);
      setSelectedLinkId("");
      setRecipients([]);
    } catch (e: any) {
      toast.error(e?.message || "Error al revocar el enlace");
    }
  };

  const revokeRecipient = async (recipientId: string) => {
    if (!recipientId) return;
    const ok = window.confirm("¿Revocar este recipient (correo) para este link?");
    if (!ok) return;

    try {
      const { error } = await supabase.rpc("revoke_share_link_recipient_v2", {
        p_recipient_id: recipientId,
      });
      if (error) throw error;

      await loadRecipients(selectedLinkId);
    } catch (e: any) {
      toast.error(e?.message || "Error al revocar el acceso");
    }
  };

  // ----------------------------
  // Handlers existentes + NUEVO restricted password (copiable)
  // ----------------------------
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!user?.id) throw new Error("No autenticado");

      // 1) crea documento (backend)
      await createDoc(title, description, classification);

      // 2) si es restricted -> generar password fuerte y guardarlo (hash) 1 sola vez
      if (classification === "restricted") {
        // buscar doc recién creado (demo-friendly)
        const { data: docRow, error: dErr } = await supabase
          .from("documents")
          .select("id")
          .eq("owner_id", user.id)
          .eq("title", title)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dErr || !docRow?.id) {
          throw dErr || new Error("No se pudo ubicar el documento creado");
        }

        const pwd = generateStrongPassword(16);

        const { error: pErr } = await supabase.rpc("set_restricted_password_v2", {
          p_document_id: docRow.id,
          p_password: pwd,
        });

        if (pErr) throw pErr;

        // ✅ mostrar modal + copiar
        setRestrictedPwd(pwd);
        setRestrictedCopied(false);
        setRestrictedCopyErr("");
        setShowRestrictedPwd(true);

        try {
          await navigator.clipboard.writeText(pwd);
          setRestrictedCopied(true);
        } catch {
          setRestrictedCopyErr(
            "No se pudo copiar automáticamente. Usa el botón Copiar."
          );
        }
      }

      // limpiar form
      setTitle("");
      setDescription("");
      setClassification("private");
      setShowCreateForm(false);

      // refrescar list (para que trigger de public link aparezca)
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Error al crear el documento");
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
        .select(
          `
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
        `
        )
        .eq("grantee_id", user.id)
        .eq("can_view", true)
        .is("revoked_at", null)
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

  useEffect(() => {
    if (effectiveTab !== "shared-with-me") return;
    if (!sharedDocuments?.length) return;

    const expiries = sharedDocuments
      .map((g: any) => g?.expires_at)
      .filter(Boolean)
      .map((s: string) => new Date(s).getTime())
      .filter((t: number) => Number.isFinite(t));

    if (expiries.length === 0) return;

    const nextExpiry = Math.min(...expiries);
    const ms = nextExpiry - Date.now();

    const kick = async () => {
      await supabase.auth.signOut();
      setSharedDocuments([]);
      navigate("/login?reason=share_expired", { replace: true });
    };

    if (ms <= 0) {
      kick();
      return;
    }

    const id = window.setTimeout(kick, ms);
    return () => window.clearTimeout(id);
  }, [effectiveTab, sharedDocuments, navigate]);

  useEffect(() => {
    if (effectiveTab !== "shared-with-me") return;

    const tick = () => {
      const now = Date.now();
      setSharedDocuments((prev) =>
        (prev || []).filter((g: any) => {
          if (!g?.expires_at) return true;
          const exp = new Date(g.expires_at).getTime();
          return exp > now;
        })
      );
    };

    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [effectiveTab]);

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
  }, [
    effectiveTab,
    loadingShared,
    openDocId,
    sharedDocuments,
    location.search,
    navigate,
  ]);

  // ✅ VER (dueño) -> viewer
  const handleView = (docId: string) => {
    navigate(`/documents/view/${docId}?mode=owner`);
  };

  // ✅ VER (compartido) -> viewer
  const handleViewShared = (docId: string) => {
    navigate(`/documents/view/${docId}?mode=shared`);
  };

  // ✅ Download con protección para restricted
  const handleDownload = async (docId: string) => {
    try {
      if (!user?.id) throw new Error("No autenticado");

      // si es restricted -> pedir contraseña y validar
      const { data: doc, error: dErr } = await supabase
        .from("documents")
        .select("id, owner_id, classification")
        .eq("id", docId)
        .maybeSingle();

      if (dErr) throw dErr;

      if (doc?.classification === "restricted") {
        // solo dueño
        if (doc.owner_id !== user.id) throw new Error("No autorizado (restricted).");

        const pwd = window.prompt(
          "🔐 Este documento es RESTRINGIDO. Ingresa la contraseña:"
        );
        if (!pwd) return;

        const { data: ok, error: vErr } = await supabase.rpc(
          "verify_restricted_password_v2",
          { p_document_id: docId, p_password: pwd }
        );

        if (vErr) throw vErr;
        if (!ok) throw new Error("Contraseña incorrecta.");
      }

      const versions = await DocumentVersionService.listVersions(docId);
      if (!versions || versions.length === 0) {
        toast.error("El documento no tiene archivos para descargar. Intenta subir una versión primero.");
        return;
      }

      const latestVersion = versions[0];
      const storagePathRaw: string =
        latestVersion.storage_path || latestVersion.storagePath;

      if (!storagePathRaw || typeof storagePathRaw !== "string") {
        toast.error("Error: No se encontró la ruta del archivo. Intenta de nuevo más tarde.");
        return;
      }

      const storagePath = storagePathRaw.replace(/^documents\//, "");

      const { data, error } = await supabase.storage
        .from("documents")
        .download(storagePath);

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
      toast.error(err?.message || "Error al descargar el documento");
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

  const linkStatusLabel = (l: ShareLinkRow) => {
    if (l.revoked_at) return "🚫 Revocado";
    if (l.expires_at && new Date(l.expires_at).getTime() <= Date.now())
      return "⏳ Expirado";
    const max = l.max_uses ?? null;
    const used = l.uses_count ?? 0;
    if (max !== null && used >= max) return "🔒 Usos agotados";
    return "✅ Activo";
  };

  return (
    <div className="documents-container">
      {/* Header */}
      <header className="documents-header">
        <div className="header-left">
          <h1>Gestión de Documentos DLP</h1>
          <p className="header-subtitle">
            Centro de control para prevención de pérdida de datos
          </p>
        </div>
        <div className="header-right">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="user-details">
              <p className="user-email">{user?.email}</p>
              <p className="user-status">Conectado</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-outline-danger">
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="documents-tabs">
        <button
          onClick={() => goTab("my-documents")}
          className={`tab-button ${
            effectiveTab === "my-documents" ? "active" : ""
          }`}
        >
          📑 Mis Documentos
        </button>
        <button
          onClick={() => goTab("shared-with-me")}
          className={`tab-button ${
            effectiveTab === "shared-with-me" ? "active" : ""
          }`}
        >
          👥 Compartidos Conmigo
        </button>
        <button
          onClick={() => goTab("manage-access")}
          className={`tab-button ${
            effectiveTab === "manage-access" ? "active" : ""
          }`}
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
      {(error || createError) && (
        <div className="alert alert-error">⚠️ {error || createError}</div>
      )}

      {/* ShareLink Modal */}
      <ShareLinkModal
        isOpen={showShareLinkModal}
        documentId={selectedDocForShare || ""}
        documentTitle={selectedDocTitle}
        onClose={() => {
          setShowShareLinkModal(false);
          if (effectiveTab === "manage-access" && manageDocId) {
            loadShareLinks(manageDocId);
          }
        }}
      />

      {/* ✅ Modal Contraseña RESTRINGIDO (copiable) */}
      {showRestrictedPwd && (
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
          onClick={() => setShowRestrictedPwd(false)}
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
            <h3 style={{ marginTop: 0 }}>🔐 Contraseña del documento RESTRINGIDO</h3>
            <p style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
              Guárdala ahora. Por seguridad, no se mostrará de nuevo.
            </p>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                readOnly
                value={restrictedPwd}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  fontFamily: "monospace",
                  fontSize: 13,
                }}
                onFocus={(e) => e.currentTarget.select()}
              />

              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  setRestrictedCopyErr("");
                  setRestrictedCopied(false);
                  try {
                    await navigator.clipboard.writeText(restrictedPwd);
                    setRestrictedCopied(true);
                  } catch {
                    setRestrictedCopyErr(
                      "No se pudo copiar. Copia manual: selecciona el texto y Ctrl+C."
                    );
                  }
                }}
              >
                📋 Copiar
              </button>
            </div>

            {(restrictedCopied || restrictedCopyErr) && (
              <div style={{ marginTop: 10, fontSize: 13 }}>
                {restrictedCopied && (
                  <span style={{ color: "#16a34a" }}>✅ Copiado al portapapeles</span>
                )}
                {restrictedCopyErr && (
                  <span style={{ color: "#dc2626" }}>❌ {restrictedCopyErr}</span>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setShowRestrictedPwd(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="tab-content">
        {/* My Documents */}
        {effectiveTab === "my-documents" && (
          <div className="section-my-documents">
            <div className="section-header">
              <h2>Mis Documentos</h2>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn btn-primary btn-lg"
                >
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
                        onChange={(e) =>
                          setClassification(e.target.value as any)
                        }
                        disabled={creating}
                      >
                        <option value="public">🔓 Público</option>
                        <option value="private">🔒 Privado (recomendado)</option>
                        <option value="confidential">🔐 Confidencial</option>
                        <option value="restricted">⛔ Restringido</option>
                      </select>

                      {classification === "restricted" && (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                          Se generará una contraseña fuerte automáticamente (se muestra 1 sola vez).
                        </div>
                      )}
                      {classification === "public" && (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                          Se creará un link permanente automáticamente.
                        </div>
                      )}
                      {classification === "confidential" && (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                          Al subir el PDF se aplicará una marca de agua.
                        </div>
                      )}
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
                    <button
                      type="submit"
                      disabled={creating}
                      className="btn btn-primary"
                    >
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
            ) : (documents as any[]).length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No tienes documentos todavía</h3>
                <p>Crea tu primer documento para comenzar</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn btn-primary btn-lg"
                >
                  ➕ Crear Documento
                </button>
              </div>
            ) : (
              <div className="documents-grid">
                {(documents as any[]).map((doc: any) => (
                  <div key={doc.id} className="document-card">
                    <div className="card-header">
                      <h3 className="card-title">{doc.title}</h3>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: getClassificationColor(doc.classification),
                        }}
                      >
                        {getClassificationLabel(doc.classification)}
                      </span>
                    </div>

                    {doc.description && (
                      <p className="card-description">{doc.description}</p>
                    )}

                    <div className="card-meta">
                      <div className="meta-item">
                        📅 Creado:{" "}
                        {new Date(doc.created_at).toLocaleDateString("es-ES")}
                      </div>
                      <div className="meta-item">
                        ✏️ Actualizado:{" "}
                        {new Date(doc.updated_at).toLocaleDateString("es-ES")}
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
                        title={
                          doc.classification === "restricted"
                            ? "Restringido no se puede compartir"
                            : "Compartir por link"
                        }
                        disabled={doc.classification === "restricted"}
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

                    {/* ✅ Link permanente para PUBLIC */}
                    {doc.classification === "public" && (
                      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                        {publicTokens[doc.id] ? (
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              readOnly
                              value={`${window.location.origin}/public/${publicTokens[doc.id]}`}
                              style={{
                                flex: 1,
                                padding: 8,
                                borderRadius: 8,
                                border: "1px solid #ddd",
                                fontSize: 12,
                              }}
                            />
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/public/${publicTokens[doc.id]}`
                                );
                                toast.success("Enlace público copiado al portapapeles");
                              }}
                            >
                              📋 Copiar
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, opacity: 0.75 }}>
                            Generando link público...
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ marginLeft: 8 }}
                              onClick={() => refetch()}
                            >
                              🔄
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <FileUploadComponent
                      documentId={doc.id}
                      classification={doc.classification}
                      watermarkText={`CONFIDENCIAL · ${user?.email || ""}`}
                      onUploadSuccess={() => {
                        toast.success("Archivo subido correctamente");
                        refetch();
                      }}
                      onUploadError={(err) => toast.error(`Error al subir el archivo: ${err}`)}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2>📤 Documentos Compartidos Conmigo</h2>
              <button
                className="btn btn-secondary"
                onClick={loadSharedDocuments}
                disabled={loadingShared}
              >
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
                  const sharedBy =
                    grant?.granted_by || doc?.owner_id || "Desconocido";

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
                        boxShadow: isHighlight
                          ? "0 0 0 3px rgba(34,197,94,0.35)"
                          : undefined,
                        transition: "all 200ms ease",
                      }}
                    >
                      <div className="card-header">
                        <h3 className="card-title">
                          {doc?.title || grant.document_id}
                        </h3>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: getClassificationColor(
                              doc?.classification || "private"
                            ),
                          }}
                        >
                          {getClassificationLabel(doc?.classification || "private")}
                        </span>
                      </div>

                      {doc?.description && (
                        <p className="card-description">{doc.description}</p>
                      )}

                      <div className="card-meta">
                        <div className="meta-item">
                          👤 Compartido por: {sharedBy}
                        </div>
                        <div className="meta-item">
                          📅 Desde:{" "}
                          {new Date(grant.created_at).toLocaleDateString("es-ES")}
                        </div>
                      </div>

                      <div className="card-actions">
                        {grant.can_view && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleViewShared(grant.document_id)}
                          >
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

                        {/* ✅ YA NO ES "pendiente": ahora abre modal para subir nueva versión */}
                        {grant.can_edit && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              const d = grant.documents;
                              setEditSharedCtx({
                                documentId: grant.document_id,
                                title: d?.title || "Documento",
                                classification: (d?.classification || "private") as any,
                              });
                              setShowEditSharedModal(true);
                            }}
                          >
                            ✏️ Editar
                          </button>
                        )}

                        {grant.can_share && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() =>
                              handleShareClick(
                                grant.document_id,
                                doc?.title || "Documento"
                              )
                            }
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ margin: 0 }}>🔐 Gestionar Accesos</h2>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={manageDocId}
                  onChange={(e) => setManageDocId(e.target.value)}
                  className="btn"
                  style={{ padding: "8px 10px" }}
                  disabled={!(documents as any[])?.length}
                >
                  {(documents as any[])?.length ? (
                    (documents as any[]).map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))
                  ) : (
                    <option value="">No hay documentos</option>
                  )}
                </select>

                <button
                  className="btn btn-secondary"
                  onClick={() => loadShareLinks(manageDocId)}
                  disabled={!manageDocId || loadingLinks}
                >
                  🔄 Refrescar
                </button>

                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const doc = (documents as any[]).find((d: any) => d.id === manageDocId);
                    if (!doc) return;
                    if (doc.classification === "restricted") {
                      toast.warning("Los documentos restringidos no se pueden compartir");
                      return;
                    }
                    handleShareClick(doc.id, doc.title);
                  }}
                  disabled={!manageDocId}
                >
                  ➕ Crear link
                </button>
              </div>
            </div>

            {!(documents as any[])?.length ? (
              <div className="empty-state" style={{ marginTop: 16 }}>
                <p>Crea un documento primero para gestionar accesos</p>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                {linksErr && (
                  <div className="alert alert-error">⚠️ {linksErr}</div>
                )}

                {loadingLinks ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Cargando links...</p>
                  </div>
                ) : links.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🔗</div>
                    <h3>No hay links para este documento</h3>
                    <p>Crea un link para empezar a compartir</p>
                  </div>
                ) : (
                  <div className="documents-grid">
                    {links.map((l) => (
                      <div key={l.id} className="document-card">
                        <div className="card-header">
                          <h3 className="card-title" style={{ fontSize: 16 }}>
                            Link: {l.id.slice(0, 8)}...
                          </h3>
                          <span className="badge">{linkStatusLabel(l)}</span>
                        </div>

                        <div className="card-meta">
                          <div className="meta-item">
                            📅 Creado:{" "}
                            {new Date(l.created_at).toLocaleString("es-ES")}
                          </div>
                          <div className="meta-item">
                            ⏳ Expira:{" "}
                            {l.expires_at
                              ? new Date(l.expires_at).toLocaleString("es-ES")
                              : "No expira"}
                          </div>
                          <div className="meta-item">
                            🔢 Usos: {(l.uses_count ?? 0).toString()} /{" "}
                            {l.max_uses ?? "∞"}
                          </div>
                        </div>

                        <div className="card-actions" style={{ gap: 8 }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={async () => {
                              setSelectedLinkId(l.id);
                              await loadRecipients(l.id);
                            }}
                          >
                            👥 Ver recipients
                          </button>

                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => revokeLink(l.id)}
                          >
                            🚫 Revocar link
                          </button>
                        </div>

                        {selectedLinkId === l.id && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: 10,
                              border: "1px solid #eee",
                              borderRadius: 10,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <strong>Recipients</strong>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => loadRecipients(l.id)}
                                disabled={loadingRecipients}
                              >
                                🔄
                              </button>
                            </div>

                            {recipientsErr && (
                              <div
                                className="alert alert-error"
                                style={{ marginTop: 8 }}
                              >
                                ⚠️ {recipientsErr}
                                <div style={{ marginTop: 6, fontSize: 12 }}>
                                  Para ver recipients como dueño necesitas policy
                                  SELECT owner en <code>share_link_recipients</code>.
                                </div>
                              </div>
                            )}

                            {loadingRecipients ? (
                              <div style={{ padding: 8 }}>Cargando...</div>
                            ) : recipients.length === 0 ? (
                              <div style={{ padding: 8, opacity: 0.8 }}>
                                No hay recipients (o RLS no te deja verlos).
                              </div>
                            ) : (
                              <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                                {recipients.map((r) => (
                                  <div
                                    key={r.id}
                                    style={{
                                      padding: 10,
                                      border: "1px solid #f0f0f0",
                                      borderRadius: 10,
                                      display: "grid",
                                      gap: 6,
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                      <div>
                                        <strong>{r.recipient_email}</strong>
                                        {r.revoked_at ? (
                                          <span style={{ marginLeft: 8, opacity: 0.7 }}>
                                            🚫 Revocado
                                          </span>
                                        ) : (
                                          <span style={{ marginLeft: 8, opacity: 0.7 }}>
                                            ✅ Activo
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => revokeRecipient(r.id)}
                                        disabled={!!r.revoked_at}
                                      >
                                        Revocar
                                      </button>
                                    </div>

                                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                                      Permisos:{" "}
                                      {r.can_view ? "Ver " : ""}
                                      {r.can_download ? "Descargar " : ""}
                                      {r.can_edit ? "Editar " : ""}
                                      {r.can_share ? "Compartir " : ""}
                                      {!r.can_view &&
                                        !r.can_download &&
                                        !r.can_edit &&
                                        !r.can_share &&
                                        "(sin permisos)"}
                                    </div>

                                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                                      Usos: {(r.uses_count ?? 0).toString()} /{" "}
                                      {r.max_uses ?? "∞"} · Creado:{" "}
                                      {new Date(r.created_at).toLocaleString("es-ES")}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  setSelectedLinkId("");
                                  setRecipients([]);
                                  setRecipientsErr("");
                                }}
                              >
                                Cerrar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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

      {/* ✅ MODAL EDITAR SHARED (subir nueva versión) */}
      <EditSharedDocumentModal
        isOpen={showEditSharedModal && !!editSharedCtx}
        onClose={() => {
          setShowEditSharedModal(false);
          setEditSharedCtx(null);
        }}
        documentId={editSharedCtx?.documentId || ""}
        documentTitle={editSharedCtx?.title || ""}
        classification={(editSharedCtx?.classification || "private") as any}
        watermarkText={`CONFIDENCIAL · ${user?.email || ""}`}
        onUploadOk={() => {
          toast.success("Nueva versión subida correctamente");
          setShowEditSharedModal(false);
          setEditSharedCtx(null);
          loadSharedDocuments();
        }}
        onUploadFail={(msg) => toast.error(`Error al subir la versión: ${msg}`)}
      />
    </div>
  );
}
