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
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const origin = useMemo(() => window.location.origin, []);
  const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  if (!isOpen) return null;

  const stringifySupabaseError = (err: any) => {
    if (!err) return "Error desconocido";
    if (typeof err === "string") return err;
    if (err?.message && typeof err.message === "string") return err.message;
    // PostgREST error shape
    if (err?.code || err?.hint || err?.details) {
      return `${err?.message || "Error"} (code: ${err?.code || "?"})`;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return "Error desconocido";
    }
  };

  const copyToClipboard = async (text: string) => {
    // 1) Modern clipboard
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 2) Fallback (older browsers)
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard anti-doble submit
    if (loading) return;

    setError(null);
    setResultUrl(null);
    setExpiresAt(null);

    const emailTrim = email.trim().toLowerCase();

    if (!documentId) return setError("Falta documentId");
    if (!emailTrim) return setError("Ingresa un email");
    if (!isValidEmail(emailTrim)) return setError("Email inválido");
    if (!perms.can_view && !perms.can_download && !perms.can_edit && !perms.can_share) {
      return setError("Debes seleccionar al menos un permiso");
    }

    if (!Number.isFinite(expiresMin) || expiresMin < 1) return setError("Expira (min) inválido");
    if (!Number.isFinite(maxUsesLink) || maxUsesLink < 1) return setError("Max usos (link) inválido");
    if (!Number.isFinite(maxUsesRecipient) || maxUsesRecipient < 1) return setError("Max usos (recipient) inválido");

    setLoading(true);
    try {
      // 1) Crear link
      const created = await ShareLinksService.createShareLink({
        document_id: documentId,
        expires_in_minutes: expiresMin,
        max_uses: maxUsesLink,
      });

      // 2) Registrar recipient (email NO necesita existir en profiles)
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

      await copyToClipboard(url);

      onSuccess?.();
    } catch (err: any) {
      setError(stringifySupabaseError(err));
    } finally {
      setLoading(false);
    }
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          width: "min(720px, 92vw)",
          borderRadius: 12,
          padding: 22,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: 0 }}>🔗 Compartir por Link</h2>
        <p style={{ marginTop: 6, color: "#666" }}>{documentTitle}</p>

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginTop: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {resultUrl && (
          <div style={{ background: "#dcfce7", color: "#166534", padding: 12, borderRadius: 8, marginTop: 12 }}>
            ✅ Link creado y copiado al portapapeles
            <div style={{ marginTop: 8, fontFamily: "monospace", wordBreak: "break-all" }}>{resultUrl}</div>
            {expiresAt && (
              <div style={{ marginTop: 6, color: "#14532d" }}>
                Expira: {new Date(expiresAt).toLocaleString()}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleCreate} style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Email del destinatario</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="alguien@gmail.com"
            style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
          <small style={{ color: "#6b7280" }}>
            * Este correo NO necesita estar registrado (no usamos profiles).
          </small>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
            <div>
              <label style={{ fontWeight: 600 }}>⏳ Expira (min)</label>
              <input
                type="number"
                min={1}
                value={expiresMin}
                onChange={(e) => setExpiresMin(Number(e.target.value))}
                disabled={loading}
                style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 8 }}
              />
            </div>
            <div>
              <label style={{ fontWeight: 600 }}>🔢 Max usos (link)</label>
              <input
                type="number"
                min={1}
                value={maxUsesLink}
                onChange={(e) => setMaxUsesLink(Number(e.target.value))}
                disabled={loading}
                style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 8 }}
              />
            </div>
            <div>
              <label style={{ fontWeight: 600 }}>👤 Max usos (recipient)</label>
              <input
                type="number"
                min={1}
                value={maxUsesRecipient}
                onChange={(e) => setMaxUsesRecipient(Number(e.target.value))}
                disabled={loading}
                style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 8 }}
              />
            </div>
          </div>

          <div style={{ background: "#f3f4f6", padding: 12, borderRadius: 8, marginTop: 14 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Permisos</p>

            {(
              [
                ["can_view", "👁️ Ver"] as const,
                ["can_download", "⬇️ Descargar"] as const,
                ["can_edit", "✏️ Editar"] as const,
                ["can_share", "🔗 Compartir"] as const,
              ] as const
            ).map(([k, label]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={perms[k]}
                  onChange={(e) => setPerms((p) => ({ ...p, [k]: e.target.checked }))}
                  disabled={loading}
                />
                {label}
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: loading ? "#cbd5e1" : "#2563eb",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "⏳ Creando..." : "✅ Crear Link"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: "#e5e7eb",
                border: "none",
                borderRadius: 8,
                color: "#111827",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              ✕ Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
