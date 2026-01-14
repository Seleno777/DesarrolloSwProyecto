import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useDocuments, useCreateDocument } from "../hooks/useDocuments";
import { DocumentVersionService } from "../services/DocumentsService";
import { ShareDocumentModal } from "../components/ShareDocumentModal";
import { FileUploadComponent } from "../components/FileUploadComponent";
import { supabase } from "../lib/supabase";

type DocumentsTab = "my-documents" | "shared-with-me" | "manage-access" | "audit-log" | "settings";

export default function DocumentsPage() {
  const { user, signOut } = useAuth();
  const { documents, loading, error, refetch } = useDocuments();
  const { create: createDoc, loading: creating, error: createError } = useCreateDocument();
  const [activeTab, setActiveTab] = useState<DocumentsTab>("my-documents");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classification, setClassification] = useState<"public" | "private" | "confidential" | "restricted">("private");
  
  // Para compartir
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDocForShare, setSelectedDocForShare] = useState<string | null>(null);
  const [selectedDocTitle, setSelectedDocTitle] = useState("");

  // Para documentos compartidos
  const [sharedDocuments, setSharedDocuments] = useState<any[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);

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

  // Cargar documentos compartidos cuando cambia el tab
  useEffect(() => {
    if (activeTab === "shared-with-me") {
      loadSharedDocuments();
    }
  }, [activeTab]);

  const loadSharedDocuments = async () => {
    setLoadingShared(true);
    try {
      const { data, error } = await supabase
        .from("document_grants")
        .select(`
          document_id,
          can_view,
          can_download,
          can_edit,
          can_share,
          created_at,
          revoked_at,
          documents:document_id (
            id,
            title,
            description,
            classification,
            owner_id,
            created_at,
            updated_at,
            profiles:owner_id (email)
          )
        `)
        .is("revoked_at", null);

      if (error) throw error;
      setSharedDocuments(data || []);
    } catch (err) {
      console.error("Error loading shared documents:", err);
    } finally {
      setLoadingShared(false);
    }
  };

  const handleShareClick = (docId: string, docTitle: string) => {
    setSelectedDocForShare(docId);
    setSelectedDocTitle(docTitle);
    setShowShareModal(true);
  };

  const handleDownload = async (docId: string) => {
    try {
      // Obtener la versión más reciente
      const versions = await DocumentVersionService.listVersions(docId);
      if (versions.length === 0) {
        alert("❌ No hay archivo para descargar");
        return;
      }

      const latestVersion = versions[0];
      const filePath = `documents/${docId}/${latestVersion.id}.pdf`;

      // Obtener el archivo del storage
      const { data, error } = await supabase.storage.from("documents").download(filePath);

      if (error) {
        throw new Error(error.message);
      }

      // Crear descarga
      const blob = new Blob([data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = latestVersion.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert("❌ Error al descargar: " + (err?.message || "Error desconocido"));
    }
  };

  const handleDelete = async (docId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este documento? Esta acción no se puede deshacer.")) {
      try {
        // Aquí llamarías al servicio de eliminar
        // await DocumentsService.deleteDocument({ document_id: docId });
        alert("✅ Documento eliminado (función aún en desarrollo)");
        refetch();
      } catch (err) {
        alert("❌ Error al eliminar documento");
      }
    }
  };

  const getClassificationLabel = (classification: string) => {
    const labels: Record<string, string> = {
      public: "🔓 Público",
      private: "🔒 Privado",
      confidential: "🔐 Confidencial",
      restricted: "⛔ Restringido",
    };
    return labels[classification] || classification;
  };

  const getClassificationColor = (classification: string) => {
    const colors: Record<string, string> = {
      public: "#10b981",
      private: "#3b82f6",
      confidential: "#f59e0b",
      restricted: "#ef4444",
    };
    return colors[classification] || "#6b7280";
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
            <div className="user-avatar">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
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

      {/* Tabs Navigation */}
      <nav className="documents-tabs">
        <button
          onClick={() => setActiveTab("my-documents")}
          className={`tab-button ${activeTab === "my-documents" ? "active" : ""}`}
        >
          📑 Mis Documentos
        </button>
        <button
          onClick={() => setActiveTab("shared-with-me")}
          className={`tab-button ${activeTab === "shared-with-me" ? "active" : ""}`}
        >
          👥 Compartidos Conmigo
        </button>
        <button
          onClick={() => setActiveTab("manage-access")}
          className={`tab-button ${activeTab === "manage-access" ? "active" : ""}`}
        >
          🔐 Gestionar Accesos
        </button>
        <button
          onClick={() => setActiveTab("audit-log")}
          className={`tab-button ${activeTab === "audit-log" ? "active" : ""}`}
        >
          📋 Historial de Auditoría
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`tab-button ${activeTab === "settings" ? "active" : ""}`}
        >
          ⚙️ Configuración
        </button>
      </nav>

      {/* Error Alert */}
      {(error || createError) && (
        <div className="alert alert-error">
          ⚠️ {error || createError}
        </div>
      )}

      {/* Share Modal */}
      <ShareDocumentModal
        isOpen={showShareModal}
        documentId={selectedDocForShare || ""}
        documentTitle={selectedDocTitle}
        onClose={() => setShowShareModal(false)}
        onSuccess={() => {
          refetch();
          loadSharedDocuments();
        }}
      />

      {/* Tab Content */}
      <div className="tab-content">
        {/* My Documents */}
        {activeTab === "my-documents" && (
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

            <div className="documents-stats">
              <div className="stat-card">
                <div className="stat-number">{documents.length}</div>
                <div className="stat-label">Documentos Totales</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{documents.filter(d => d.classification === "public").length}</div>
                <div className="stat-label">Públicos</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{documents.filter(d => d.classification === "private").length}</div>
                <div className="stat-label">Privados</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{documents.filter(d => d.classification === "confidential").length}</div>
                <div className="stat-label">Confidenciales</div>
              </div>
            </div>

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
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn btn-primary btn-lg"
                >
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

                    {doc.description && (
                      <p className="card-description">{doc.description}</p>
                    )}

                    <div className="card-meta">
                      <div className="meta-item">
                        📅 Creado: {new Date(doc.created_at).toLocaleDateString("es-ES")}
                      </div>
                      <div className="meta-item">
                        ✏️ Actualizado: {new Date(doc.updated_at).toLocaleDateString("es-ES")}
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        className="btn btn-sm btn-primary"
                        title="Ver detalles"
                        onClick={() => {
                          alert(`📄 ${doc.title}\n\n${doc.classification === 'public' ? '🔓 Público' : doc.classification === 'private' ? '🔒 Privado' : doc.classification === 'confidential' ? '🔐 Confidencial' : '⛔ Restringido'}\n\nCreado: ${new Date(doc.created_at).toLocaleDateString("es-ES")}\nActualizado: ${new Date(doc.updated_at).toLocaleDateString("es-ES")}`);
                        }}
                      >
                        👁️ Detalles
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        title="Compartir documento"
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

                    {/* Mostrar componente de upload para este documento */}
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

        {/* Shared with Me */}
        {activeTab === "shared-with-me" && (
          <div className="section-shared">
            <h2>📤 Documentos Compartidos Conmigo</h2>
            <div className="info-box">
              <p>Aquí verás los documentos que otros usuarios han compartido contigo.</p>
              <p>Puedes ver, descargar, editar o compartir según los permisos otorgados.</p>
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
                  const ownerEmail = doc?.profiles?.email || "Desconocido";
                  
                  return (
                    <div key={`${grant.document_id}-${ownerEmail}`} className="document-card">
                      <div className="card-header">
                        <h3 className="card-title">{doc?.title}</h3>
                        <span
                          className="badge"
                          style={{ backgroundColor: getClassificationColor(doc?.classification) }}
                        >
                          {getClassificationLabel(doc?.classification)}
                        </span>
                      </div>

                      {doc?.description && (
                        <p className="card-description">{doc.description}</p>
                      )}

                      <div className="card-meta">
                        <div className="meta-item">
                          👤 Compartido por: {ownerEmail}
                        </div>
                        <div className="meta-item">
                          📅 Desde: {new Date(grant.created_at).toLocaleDateString("es-ES")}
                        </div>
                      </div>

                      {/* Mostrar permisos */}
                      <div style={{ padding: "12px", backgroundColor: "#f0f9ff", borderRadius: "8px", marginBottom: "12px" }}>
                        <p style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: "500", color: "#0369a1" }}>
                          Permisos:
                        </p>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {grant.can_view && <span style={{ backgroundColor: "#10b981", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>👁️ Ver</span>}
                          {grant.can_download && <span style={{ backgroundColor: "#3b82f6", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>⬇️ Descargar</span>}
                          {grant.can_edit && <span style={{ backgroundColor: "#f59e0b", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>✏️ Editar</span>}
                          {grant.can_share && <span style={{ backgroundColor: "#8b5cf6", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>🔗 Compartir</span>}
                        </div>
                      </div>

                      <div className="card-actions">
                        {grant.can_view && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              const perms = [grant.can_view && '👁️ Ver', grant.can_download && '⬇️ Descargar', grant.can_edit && '✏️ Editar', grant.can_share && '🔗 Compartir'].filter(Boolean).join(' | ');
                              alert(`📄 ${doc?.title}\n\n👤 Propietario: ${ownerEmail}\n\n${perms}`);
                            }}
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
                        {grant.can_share && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleShareClick(grant.document_id, doc?.title)}
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
        {activeTab === "manage-access" && (
          <div className="section-access">
            <h2>🔐 Gestionar Accesos a Documentos</h2>
            <div className="info-box">
              <p>Control completo sobre quién puede acceder a tus documentos.</p>
              <p>Define permisos de visualización, descarga, edición y compartir.</p>
            </div>

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
                      <span className="badge" style={{ backgroundColor: getClassificationColor(doc.classification) }}>
                        {getClassificationLabel(doc.classification)}
                      </span>
                    </div>
                    <div className="access-actions">
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setSelectedDocForShare(doc.id);
                          setSelectedDocTitle(doc.title);
                          setShowShareModal(true);
                        }}
                      >
                        👥 Agregar Usuario
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={async () => {
                          try {
                            const { DocumentGrantService } = await import("../services/DocumentsService");
                            const grants = await DocumentGrantService.listGrants(doc.id);
                            if (grants.length === 0) {
                              alert("Este documento no tiene accesos compartidos");
                            } else {
                              const grantsList = grants.map((g: any) => `• ${g.grantee_id}`).join("\n");
                              alert(`Accesos compartidos:\n\n${grantsList}`);
                            }
                          } catch (err) {
                            alert("Error: " + (err as any).message);
                          }
                        }}
                      >
                        📋 Ver Accesos
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={async () => {
                          try {
                            const { ShareLinksService } = await import("../services/ShareLinksService");
                            const result = await ShareLinksService.createShareLink({
                              document_id: doc.id,
                              expires_in_minutes: 1440,
                              max_uses: 10,
                            });
                            const shareLink = `${window.location.origin}?share_token=${result.token}`;
                            alert(`✅ Enlace creado\n\nURL: ${shareLink}\n\nExpira: ${new Date(result.expires_at).toLocaleDateString()}`);
                          } catch (err) {
                            alert("Error: " + (err as any).message);
                          }
                        }}
                      >
                        🔗 Crear Enlace
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audit Log */}
        {activeTab === "audit-log" && (
          <div className="section-audit">
            <h2>📋 Historial de Auditoría</h2>
            <div className="info-box">
              <p>Registro completo de todas las acciones realizadas en el sistema.</p>
              <p>Incluye creación, actualización, acceso, compartir y descarga de documentos.</p>
            </div>

            <div className="audit-filters">
              <input type="date" placeholder="Desde fecha" className="form-input" />
              <input type="date" placeholder="Hasta fecha" className="form-input" />
              <select className="form-input">
                <option>Todos los tipos de evento</option>
                <option>Documentos creados</option>
                <option>Documentos actualizados</option>
                <option>Documentos eliminados</option>
                <option>Acceso otorgado</option>
                <option>Acceso revocado</option>
              </select>
              <button className="btn btn-primary">🔍 Filtrar</button>
            </div>

            <div className="audit-table">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Evento</th>
                    <th>Usuario</th>
                    <th>Documento</th>
                    <th>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>12 Ene 2026 11:30</td>
                    <td>📄 Documento Creado</td>
                    <td>{user?.email}</td>
                    <td>-</td>
                    <td>Nuevo documento creado</td>
                  </tr>
                  <tr>
                    <td>11 Ene 2026 15:45</td>
                    <td>👤 Acceso Otorgado</td>
                    <td>{user?.email}</td>
                    <td>-</td>
                    <td>Permiso de lectura concedido</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === "settings" && (
          <div className="section-settings">
            <h2>⚙️ Configuración</h2>

            <div className="settings-group">
              <h3>👤 Perfil de Usuario</h3>
              <div className="settings-card">
                <div className="setting-item">
                  <label>Email</label>
                  <p className="setting-value">{user?.email}</p>
                </div>
                <div className="setting-item">
                  <label>Estado de la Cuenta</label>
                  <p className="setting-value">✓ Activa y Verificada</p>
                </div>
                <button className="btn btn-secondary">✎ Editar Perfil</button>
              </div>
            </div>

            <div className="settings-group">
              <h3>🔒 Seguridad</h3>
              <div className="settings-card">
                <div className="setting-item">
                  <label>Contraseña</label>
                  <p className="setting-value">Última actualización: hace 30 días</p>
                </div>
                <button className="btn btn-secondary">🔑 Cambiar Contraseña</button>
              </div>
            </div>

            <div className="settings-group">
              <h3>🔔 Notificaciones</h3>
              <div className="settings-card">
                <div className="setting-item checkbox">
                  <input type="checkbox" id="notify-share" defaultChecked />
                  <label htmlFor="notify-share">Notificar cuando compartan documentos conmigo</label>
                </div>
                <div className="setting-item checkbox">
                  <input type="checkbox" id="notify-access" defaultChecked />
                  <label htmlFor="notify-access">Notificar cambios de permisos</label>
                </div>
                <div className="setting-item checkbox">
                  <input type="checkbox" id="notify-download" />
                  <label htmlFor="notify-download">Notificar descargas de documentos</label>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h3>⚡ Peligro</h3>
              <div className="settings-card danger">
                <p>⚠️ Estas acciones son irreversibles</p>
                <button className="btn btn-outline-danger">🗑️ Eliminar Cuenta</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
