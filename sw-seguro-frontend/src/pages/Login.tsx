import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AuthService } from "../services/AuthService";
import { getUserErrorMessage, isRateLimitError } from "../lib/errors";

type AuthMode = "signin" | "signup" | "reset";

export default function LoginPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  if (session) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setRetryAfter(null);

    try {
      await AuthService.signIn({
        email: email.trim(),
        password,
      });
      navigate("/", { replace: true });
    } catch (err) {
      const message = getUserErrorMessage(err);
      setError(message);
      if (isRateLimitError(err)) {
        const rateError = err as any;
        setRetryAfter(rateError.retryAfter);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setRetryAfter(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      setLoading(false);
      return;
    }

    try {
      await AuthService.signUp({
        email: email.trim(),
        password,
        confirmPassword,
      });
      setSuccess("¡Cuenta creada exitosamente! Redirigiendo...");
      setTimeout(() => navigate("/", { replace: true }), 2000);
    } catch (err) {
      const message = getUserErrorMessage(err);
      setError(message);
      if (isRateLimitError(err)) {
        const rateError = err as any;
        setRetryAfter(rateError.retryAfter);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await AuthService.resetPasswordForEmail(email.trim());
      setSuccess("Se envió un enlace de recuperación a tu email");
      setEmail("");
    } catch (err) {
      const message = getUserErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || retryAfter !== null;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">🔐 Software Seguro</h1>
          <p className="auth-subtitle">Gestión Segura de Documentos</p>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            onClick={() => {
              setMode("signin");
              setError(null);
              setSuccess(null);
            }}
            className={`tab ${mode === "signin" ? "active" : ""}`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => {
              setMode("signup");
              setError(null);
              setSuccess(null);
            }}
            className={`tab ${mode === "signup" ? "active" : ""}`}
          >
            Crear Cuenta
          </button>
          <button
            onClick={() => {
              setMode("reset");
              setError(null);
              setSuccess(null);
            }}
            className={`tab ${mode === "reset" ? "active" : ""}`}
          >
            Recuperar Contraseña
          </button>
        </div>

        {/* Sign In Form */}
        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="auth-form">
            <div className="form-group">
              <label htmlFor="signin-email" className="form-label">
                📧 Email
              </label>
              <input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isDisabled}
                className="form-input"
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="signin-password" className="form-label">
                🔑 Contraseña
              </label>
              <input
                id="signin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isDisabled}
                className="form-input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="alert alert-error">
                ⚠️ {error}
                {retryAfter && ` (Intenta de nuevo en ${retryAfter}s)`}
              </div>
            )}

            <button
              type="submit"
              disabled={isDisabled}
              className="btn btn-primary btn-large"
            >
              {loading ? "⏳ Iniciando sesión..." : "✓ Iniciar Sesión"}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="auth-form">
            <div className="form-group">
              <label htmlFor="signup-email" className="form-label">
                📧 Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isDisabled}
                className="form-input"
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-password" className="form-label">
                🔑 Contraseña
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isDisabled}
                className="form-input"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <small className="form-hint">
                Mín. 8 caracteres, mayúscula, minúscula, número y símbolo
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="signup-confirm" className="form-label">
                ✓ Confirmar Contraseña
              </label>
              <input
                id="signup-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isDisabled}
                className="form-input"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="alert alert-error">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                ✓ {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isDisabled}
              className="btn btn-primary btn-large"
            >
              {loading ? "⏳ Creando cuenta..." : "✓ Crear Cuenta"}
            </button>
          </form>
        )}

        {/* Password Reset Form */}
        {mode === "reset" && (
          <form onSubmit={handleReset} className="auth-form">
            <p className="auth-form-description">
              Ingresa tu email y te enviaremos un enlace para recuperar tu contraseña.
            </p>

            <div className="form-group">
              <label htmlFor="reset-email" className="form-label">
                📧 Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isDisabled}
                className="form-input"
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>

            {error && (
              <div className="alert alert-error">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                ✓ {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isDisabled}
              className="btn btn-primary btn-large"
            >
              {loading ? "⏳ Enviando..." : "✓ Enviar Enlace de Recuperación"}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p className="text-muted">
            🔒 Todas tus contraseñas están encriptadas y protegidas
          </p>
        </div>
      </div>
    </div>
  );
}
