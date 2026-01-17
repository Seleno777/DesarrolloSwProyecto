import { supabase } from "../lib/supabase";
import { validateInput } from "../lib/validation";
import { SignInSchema, SignUpSchema, type SignInInput, type SignUpInput } from "../lib/validation";
import { ApiError, AuthenticationError } from "../lib/errors";
import { authLimiter, withRateLimit } from "../lib/rateLimit";

/**
 * Auth Service - Secure authentication
 * All inputs validated with Zod
 * Implements rate limiting for auth attempts
 */
export class AuthService {
  /**
   * Sign in with email and password
   */
  static async signIn(input: SignInInput) {
    return withRateLimit(authLimiter, async () => {
      const validated = validateInput(SignInSchema, input);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error || !data.session) {
        throw new AuthenticationError("Email o contraseña incorrectos");
      }

      return data;
    });
  }

  /**
   * Sign up with email and password
   */
  static async signUp(input: SignUpInput) {
    return withRateLimit(authLimiter, async () => {
      const validated = validateInput(SignUpSchema, input);

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes("already registered")) {
          throw new ApiError("ALREADY_REGISTERED", 409, "Este email ya está registrado");
        }
        throw new ApiError("SIGNUP_FAILED", 500, "No se pudo crear la cuenta");
      }

      return data;
    });
  }

  /**
   * Sign out
   */
  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Get current session
   */
  static async session() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  /**
   * Get current user
   */
  static async user() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  /**
   * Reset password for email
   */
  static async resetPasswordForEmail(email: string) {
    const validated = validateInput(SignInSchema.pick({ email: true }), { email });

    const { error } = await supabase.auth.resetPasswordForEmail(validated.email);
    if (error) {
      throw new ApiError("RESET_PASSWORD_FAILED", 500, "No se pudo enviar el enlace de recuperación");
    }
  }

  /**
   * Update user
   */
  static async updateUser(updates: { email?: string; password?: string }) {
    const { error } = await supabase.auth.updateUser(updates);
    if (error) {
      throw new ApiError("UPDATE_USER_FAILED", 500, "No se pudo actualizar tu perfil");
    }
  }
}
