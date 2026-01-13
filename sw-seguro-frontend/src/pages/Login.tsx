import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const nav = useNavigate();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
        nav("/", { replace: true });
      } else {
        await signUp(email.trim(), password);
        setMsg("Cuenta creada. Si tu proyecto requiere confirmación por email, revisa tu correo.");
        // opcional: nav("/") si no usas confirmación
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h2>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <button type="submit" disabled={loading} style={{ padding: 10 }}>
          {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Registrar"}
        </button>

        {msg && <div style={{ padding: 10, background: "#ffe9e9" }}>{msg}</div>}
      </form>

      <div style={{ marginTop: 16 }}>
        {mode === "login" ? (
          <button onClick={() => setMode("signup")} style={{ padding: 8 }}>
            No tengo cuenta → Registrarme
          </button>
        ) : (
          <button onClick={() => setMode("login")} style={{ padding: 8 }}>
            Ya tengo cuenta → Login
          </button>
        )}
      </div>
    </div>
  );
}
