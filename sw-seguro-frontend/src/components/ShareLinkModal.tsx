import React, { useMemo, useState } from "react";
import { ShareLinksService } from "../services/ShareLinksService";

type Permissions = {
  can_view: boolean;
  can_download: boolean;
  can_edit: boolean;
  can_share: boolean;
};

interface ShareLinkModalProps {
  isOpen: boolean;
  documentId: string;
  documentTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ShareLinkModal({
  isOpen,
  documentId,
  documentTitle,
  onClose,
  onSuccess,
}: ShareLinkModalProps) {
  const [email, setEmail] = useState("");
  const [expiresMin, setExpiresMin] = useState<number>(60);
  const [maxUsesLink, setMaxUsesLink] = useState<number>(10);
  const [maxUsesRecipient, setMaxUsesRecipient] = useState<number>(1);

  const [perms, setPerms] = useState<Permissions>({
    can_view: true,
    can_download: true,
    can_edit: false,
    can_share: false,
  });

  const [loading, setLoading] = useState(false);

  // mensajes
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // resultado
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = useMemo(() => window.location.origin, []);

  const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  if (!isOpen) return null;

  const stringifySupabaseError = (err: any) => {
    if (!err) return "Ocurrió un error inesperado.";

    if (typeof err === "string") return err;

    const msg = (err?.message && typeof err.message === "string") ? err.message : "";
    const low = msg.toLowerCase();

    // mapeos típicos para que suene humano
    if (low.includes("rls") || low.includes("permission") || low.includes("not allowed")) {
      return "No tienes permisos para crear el link. Revisa tus policies (RLS) o que seas el dueño del documento.";
    }
    if (low.includes("restricted")) {
      return "⛔ Este documento es RESTRINGIDO y no se puede compartir por link.";
    }
    if (low.includes("duplicate") || low.includes("already exists")) {
      return "Ya existe un acceso similar para este correo. Intenta con otro destinatario.";
    }

    if (msg) return msg;

    if (err?.code || err?.hint || err?.details) {
      return `${err?.message || "Error"} (code: ${err?.code || "?"})`;
    }

    try {
      return JSON.stringify(err);
    } catch {
      return "Ocurrió un error inesperado.";
    }
  };

  const copyToClipboard = async (text: string) => {
    // 1) Modern clipboard
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 2) Fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const ensureNumber = (n: number, min: number, max: number) => {
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, Math.trunc(n)));
  };

  const validateBeforeCreate = () => {
    resetMessages();
    setCopied(false);

    const emailTrim = email.trim().toLowerCase();

    if (!documentId) return "Falta el identificador del documento (documentId). Cierra y vuelve a abrir el modal.";
    if (!emailTrim) return "Ingresa el correo del destinatario.";
    if (!isValidEmail(emailTrim)) return "Correo inválido. Ejemplo: alguien@gmail.com";

    // permisos mínimos
    if (!perms.can_view && !perms.can_download && !perms.can_edit && !perms.can_share) {
      return "Selecciona al menos un permiso (por ejemplo: Ver).";
    }
    // coherencia: si no hay ver, no tiene sentido otros permisos
    if (!perms.can_view && (perms.can_download || perms.can_edit || perms.can_share)) {
      return "Para Descargar/Editar/Compartir también debes permitir “Ver”.";
    }

    const exp = ensureNumber(expiresMin, 1, 10080); // 7 días
    const mul = ensureNumber(maxUsesLink, 1, 1000);
    const mur = ensureNumber(maxUsesRecipient, 1, 1000);

    if (exp !== expiresMin) setExpiresMin(exp);
    if (mul !== maxUsesLink) setMaxUsesLink(mul);
    if (mur !== maxUsesRecipient) setMaxUsesRecipient(mur);

    if (exp < 1) return "Expiración inválida (mínimo 1 minuto).";
    if (mul < 1) return "Máx. usos del link inválido (mínimo 1).";
    if (mur < 1) return "Máx. usos por destinatario inválido (mínimo 1).";

    return null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setResultUrl(null);
    setExpiresAt(null);
    setCopied(false);

    const validationError = validateBeforeCreate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const emailTrim = email.trim().toLowerCase();

    setLoading(true);
    setInfo("Creando link seguro...");

    try {
      // 1) Crear link
      const created = await ShareLinksService.createShareLink({
        document_id: documentId,
        expires_in_minutes: expiresMin,
        max_uses: maxUsesLink,
      });

      // 2) Registrar recipient
      await ShareLinksService.upsertShareLinkRecipient({
        link_id: created.link_id,
        recipient_email: emailTrim,
        permissions: perms,
        max_uses: maxUsesRecipient,
      });

      // 3) URL pública para abrir
      const url = `${origin}/share/${created.token}`;
      setResultUrl(url);
      setExpiresAt(created.expires_at);

      const ok = await copyToClipboard(url);
      if (ok) {
        setCopied(true);
        setInfo("Link creado ✅ (copiado al portapapeles)");
      } else {
        setInfo("Link creado ✅ (no se pudo copiar automáticamente; usa el botón Copiar)");
      }

      onSuccess?.();
    } catch (err: any) {
      setError(stringifySupabaseError(err));
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePerm = (k: keyof Permissions, checked: boolean) => {
    setPerms((p) => {
      // Si apaga "Ver", apaga los demás automáticamente (para coherencia)
      if (k === "can_view" && !checked) {
        return { can_view: false, can_download: false, can_edit: false, can_share: false };
      }
      // Si enciende descargar/editar/compartir, forzamos can_view=true
      if (k !== "can_view" && checked) {
        return { ...p, can_view: true, [k]: true } as Permissions;
      }
      return { ...p, [k]: checked } as Permissions;
    });
  };

  const closeSafe = () => {
    if (loading) return; // no cerrar mientras está creando
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: 14,
      }}
      onClick={closeSafe}
    >
      <div
        style={{
          background: "#fff",
          width: "min(760px, 96vw)",
          borderRadius: 14,
          boxShadow: "0 20px 40px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "grid", gap: 2, flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>🔗 Compartir por Link</div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>{documentTitle}</div>
          </div>

          <button
            type="button"
            onClick={closeSafe}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: loading ? "#f3f4f6" : "#fff",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          {/* Alerts */}
          {error && (
            <div
              style={{
                background: "#fef2f2",
                color: "#991b1b",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #fecaca",
              }}
            >
              <b>❌ No se pudo crear el link</b>
              <div style={{ marginTop: 6, fontSize: 13 }}>{error}</div>
            </div>
          )}

          {info && !error && (
            <div
              style={{
                background: "#eff6ff",
                color: "#1e3a8a",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #bfdbfe",
              }}
            >
              {info}
            </div>
          )}

          {/* Result */}
          {resultUrl && (
            <div
              style={{
                background: "#ecfdf5",
                color: "#065f46",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #a7f3d0",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 800 }}>
                ✅ Link listo {copied ? "· Copiado ✅" : ""}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  readOnly
                  value={resultUrl}
                  style={{
                    flex: 1,
                    padding: 10,
                    border: "1px solid #d1fae5",
                    borderRadius: 10,
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    const ok = await copyToClipboard(resultUrl);
                    setCopied(ok);
                    setInfo(ok ? "Copiado al portapapeles ✅" : "No se pudo copiar. Selecciona el link y Ctrl+C.");
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #10b981",
                    background: "#10b981",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  📋 Copiar
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => window.open(resultUrl, "_blank", "noopener,noreferrer")}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    color: "#111827",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ↗ Abrir
                </button>
              </div>

              {expiresAt && (
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  ⏳ Expira: {new Date(expiresAt).toLocaleString("es-ES")}
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleCreate} style={{ display: "grid", gap: 12 }}>
            {/* Email */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ display: "block", fontWeight: 800 }}>
                Email del destinatario
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="alguien@gmail.com"
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                }}
              />
              <small style={{ color: "#6b7280" }}>
                No necesita estar registrado. Se usa solo para controlar el acceso.
              </small>
            </div>

            {/* Config */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <div>
                <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>
                  ⏳ Expira (min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10080}
                  value={expiresMin}
                  onChange={(e) => setExpiresMin(Number(e.target.value))}
                  disabled={loading}
                  style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 10 }}
                />
                <small style={{ color: "#6b7280" }}>1 a 10080 (7 días)</small>
              </div>

              <div>
                <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>
                  🔢 Máx. usos (link)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={maxUsesLink}
                  onChange={(e) => setMaxUsesLink(Number(e.target.value))}
                  disabled={loading}
                  style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 10 }}
                />
                <small style={{ color: "#6b7280" }}>Límite total del link</small>
              </div>

              <div>
                <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>
                  👤 Máx. usos (recipient)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={maxUsesRecipient}
                  onChange={(e) => setMaxUsesRecipient(Number(e.target.value))}
                  disabled={loading}
                  style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 10 }}
                />
                <small style={{ color: "#6b7280" }}>Límite por correo</small>
              </div>
            </div>

            {/* Perms */}
            <div style={{ background: "#f3f4f6", padding: 12, borderRadius: 12 }}>
              <p style={{ margin: 0, fontWeight: 900 }}>Permisos</p>

              {(
                [
                  ["can_view", "👁️ Ver"] as const,
                  ["can_download", "⬇️ Descargar"] as const,
                  ["can_edit", "✏️ Editar"] as const,
                  ["can_share", "🔗 Compartir"] as const,
                ] as const
              ).map(([k, label]) => {
                const disabled =
                  loading ||
                  (k !== "can_view" && !perms.can_view); // si no hay Ver, bloquea otros
                return (
                  <label
                    key={k}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 10,
                      opacity: disabled ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={perms[k]}
                      onChange={(e) => handleTogglePerm(k, e.target.checked)}
                      disabled={disabled}
                    />
                    {label}
                    {k !== "can_view" && !perms.can_view && (
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        (Activa “Ver” primero)
                      </span>
                    )}
                  </label>
                );
              })}

              {!perms.can_view && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
                  Tip: si quieres permitir Descargar/Editar/Compartir, primero activa “Ver”.
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: loading ? "#cbd5e1" : "#2563eb",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontWeight: 900,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "⏳ Creando..." : "✅ Crear Link"}
              </button>

              <button
                type="button"
                onClick={closeSafe}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "#e5e7eb",
                  border: "none",
                  borderRadius: 10,
                  color: "#111827",
                  fontWeight: 900,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                ✕ Cancelar
              </button>
            </div>
          </form>

          {/* footer hint */}
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Recomendación: expiración corta + pocos usos = mayor seguridad.
          </div>
        </div>
      </div>
    </div>
  );
}
