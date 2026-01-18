import type { ErrorResponse } from "../types/models";

/**
 * Safe error handler - Never exposes sensitive information
 */

export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toResponse(): ErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", 400, message, details);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Debes iniciar sesión para continuar") {
    super("AUTHENTICATION_ERROR", 401, message);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "No tienes permiso para realizar esta acción") {
    super("AUTHORIZATION_ERROR", 403, message);
    this.name = "AuthorizationError";
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Recurso") {
    super("NOT_FOUND", 404, `${resource} no encontrado`);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", 409, message);
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Ocurrió un error inesperado") {
    super("INTERNAL_SERVER_ERROR", 500, message);
    this.name = "InternalServerError";
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

// Alias for ApiError for backward compatibility
export const ApiError = AppError;

/**
 * Handle errors safely - Never expose internal details in production
 */
export function handleError(error: unknown): ErrorResponse {
  console.error("Error:", error);

  if (error instanceof AppError) {
    return error.toResponse();
  }

  if (error instanceof Error) {
    // Generic error - don't expose details in production
    const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
    return {
      code: "UNKNOWN_ERROR",
      message: isDev ? error.message : "Ocurrió un error inesperado",
      timestamp: new Date().toISOString(),
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "Ocurrió un error inesperado",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Extract user-safe error message
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
    return isDev ? error.message : "Ocurrió un error inesperado";
  }

  return "Ocurrió un error inesperado";
}

/**
 * Check if error indicates user is not authenticated
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AuthenticationError) return true;
  if (error instanceof Error && error.message.includes("not authenticated")) return true;
  return false;
}

/**
 * Check if error indicates user doesn't have permission
 */
export function isAuthorizationError(error: unknown): boolean {
  if (error instanceof AuthorizationError) return true;
  if (error instanceof Error && error.message.includes("permission")) return true;
  return false;
}

/**
 * Check if error indicates rate limit exceeded
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof AppError && error.code === "RATE_LIMIT_EXCEEDED") return true;
  if (error instanceof Error && error.message.includes("rate limit")) return true;
  return false;
}
