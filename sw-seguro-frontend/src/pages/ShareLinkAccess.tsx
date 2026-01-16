import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ShareLinksService } from "../services/ShareLinksService";

const EXPECTED_EMAIL_KEY = "share_expected_email";

export default function ShareLinkAccess() {
  const { token } = useParams();
  const navigate = useNavigate();

  const tokenStr = useMemo(() => (token || "").trim(), [token]);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Helper: activa el link (RPC) y redirige
  const activateNow = async () => {
    if (!tokenStr) return;

    setLoading(true);
    setMsg("Validando link...");

    try {
      const res = await ShareLinksService.activateShareLink(tokenStr);

      setMsg("✅ Acceso concedido. Redirigiendo...");
      sessionStorage.removeItem(EXPECTED_EMAIL_KEY);

      setTimeout(() => {
        navigate(`/documents?tab=shared-with-me&open=${res.out_document_id}`, {
          replace: true,
        });
      }, 250);
    } catch (e: any) {
      setMsg(`❌ No se pudo activar el link: ${e?.message || "Error"}`);
    } finally {
      setLoading(false);
    }
  };

  // Si ya viene de magic link y existe expectedEmail, valida y activa
  useEffect(() => {
    const run = async () => {
      if (!tokenStr) return;

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;

      const loggedEmail = (session.user.email || "").toLowerCase();
      const expectedEmail = (sessionStorage.getItem(EXPECTED_EMAIL_KEY) || "").toLowerCase();

      // Si expectedEmail existe, debe coincidir para activar automático
      if (expectedEmail) {
        if (loggedEmail !== expectedEmail) {
          setMsg(
            `⚠️ Estás logueado como ${loggedEmail}, pero el enlace fue solicitado para ${expectedEmail}.\nCierra sesión e inicia con el correo correcto.`
          );
          return;
        }
        await activateNow();
        return;
      }

      // Si NO hay expectedEmail, no activamos automático.
      // Permitimos que el usuario escriba su email y lo confirme manualmente.
      setMsg(
        `Estás logueado como ${loggedEmail}. Escribe tu correo y presiona "Validar acceso" para continuar.`
      );
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenStr]);

  // ✅ Nuevo: Validar manualmente si ya está logueado
  const validateAndActivate = async () => {
    setMsg(null);

    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim) {
      setMsg("Ingresa tu email.");
      return;
    }

    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      setMsg("No estás logueado. Usa 'Enviar enlace de acceso' para iniciar sesión.");
      return;
    }

    const loggedEmail = (session.user.email || "").toLowerCase();

    if (loggedEmail !== emailTrim) {
      setMsg(
        `⚠️ Estás logueado como ${loggedEmail} pero escribiste ${emailTrim}.\nCierra sesión o escribe el correo correcto.`
      );
      return;
    }

    // Guardamos expectedEmail para mantener consistencia (opcional)
    sessionStorage.setItem(EXPECTED_EMAIL_KEY, emailTrim);

    await activateNow();
  };

  // Enviar OTP (cuando NO está logueado)
  const sendOtp = async () => {
    setMsg(null);

    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim) {
      setMsg("Ingresa tu email.");
      return;
    }

    setLoading(true);
    try {
      sessionStorage.setItem(EXPECTED_EMAIL_KEY, emailTrim);

      const { error } = await supabase.auth.signInWithOtp({
        email: emailTrim,
        options: {
          emailRedirectTo: `${window.location.origin}/share/${tokenStr}`,
        },
      });

      if (error) throw error;

      setMsg("📩 Revisa tu correo. Te enviamos un enlace para iniciar sesión.");
    } catch (e: any) {
      setMsg(`❌ Error enviando OTP: ${e?.message || "Error"}`);
    } finally {
      setLoading(false);
    }
  };

  const forceSignOut = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem(EXPECTED_EMAIL_KEY);
    setMsg("Sesión cerrada. Ahora ingresa el correo destinatario.");
  };

  if (!tokenStr) return <div style={{ padding: 24 }}>Token inválido.</div>;

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h2>🔗 Acceso por enlace</h2>
      <p style={{ color: "#555" }}>
        Escribe el correo al que se compartió el link. Si ya estás logueado con ese correo,
        puedes validar el acceso directamente.
      </p>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tuemail@dominio.com"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
          disabled={loading}
        />
      </div>

      <button
        onClick={validateAndActivate}
        disabled={loading}
        style={{
          marginTop: 12,
          width: "100%",
          padding: 12,
          borderRadius: 8,
          border: "none",
          background: loading ? "#cbd5e1" : "#16a34a",
          color: "#fff",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 700,
        }}
      >
        {loading ? "Procesando..." : "Validar acceso"}
      </button>

      <button
        onClick={sendOtp}
        disabled={loading}
        style={{
          marginTop: 10,
          width: "100%",
          padding: 12,
          borderRadius: 8,
          border: "none",
          background: loading ? "#cbd5e1" : "#3b82f6",
          color: "#fff",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 700,
        }}
      >
        {loading ? "Procesando..." : "Enviar enlace de acceso (si no estás logueado)"}
      </button>

      <button
        onClick={forceSignOut}
        disabled={loading}
        style={{
          marginTop: 10,
          width: "100%",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #ef4444",
          background: "#fff",
          color: "#ef4444",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 700,
        }}
      >
        Cerrar sesión en este navegador
      </button>

      {msg && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            background: "#f3f4f6",
            whiteSpace: "pre-line",
          }}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
