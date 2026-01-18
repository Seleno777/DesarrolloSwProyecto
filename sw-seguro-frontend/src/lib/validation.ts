import { z } from "zod";
import { CLASSIFICATIONS, AUDIT_ACTIONS, OBJECT_TYPES } from "../types/models";

// ==================== UTILITY SCHEMAS ====================
const UUIDSchema = z.string().uuid("ID must be a valid UUID");
const EmailSchema = z.string().email("Invalid email format").max(255, "Email too long");

// ==================== DOCUMENT SCHEMAS ====================
export const DocumentCreateSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters")
    .trim(),
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .nullable()
    .default(null),
  classification: z.enum(CLASSIFICATIONS),
});
export type DocumentCreateInput = z.infer<typeof DocumentCreateSchema>;

export const DocumentUpdateSchema = z.object({
  document_id: UUIDSchema,
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .nullable()
    .optional(),
  classification: z
    .enum(CLASSIFICATIONS)
    .optional(),
});
export type DocumentUpdateInput = z.infer<typeof DocumentUpdateSchema>;

export const DocumentDeleteSchema = z.object({
  document_id: UUIDSchema,
});
export type DocumentDeleteInput = z.infer<typeof DocumentDeleteSchema>;

// ==================== GRANT/PERMISSION SCHEMAS ====================
export const PermissionsSchema = z.object({
  can_view: z.boolean().default(false),
  can_download: z.boolean().default(false),
  can_edit: z.boolean().default(false),
  can_share: z.boolean().default(false),
});

export const GrantAccessSchema = z.object({
  document_id: UUIDSchema,
  grantee_id: UUIDSchema,
  permissions: PermissionsSchema,
});
export type GrantAccessInput = z.infer<typeof GrantAccessSchema>;

export const RevokeAccessSchema = z.object({
  document_id: UUIDSchema,
  grantee_id: UUIDSchema,
});
export type RevokeAccessInput = z.infer<typeof RevokeAccessSchema>;

export const RevokeAllAccessSchema = z.object({
  document_id: UUIDSchema,
});
export type RevokeAllAccessInput = z.infer<typeof RevokeAllAccessSchema>;

// ==================== SHARE LINK SCHEMAS ====================
export const ShareLinkCreateSchema = z.object({
  document_id: UUIDSchema,
  expires_in_minutes: z
    .number()
    .int("Expiration must be in minutes")
    .min(5, "Link must expire in at least 5 minutes")
    .max(525600, "Link cannot expire in more than 1 year")
    .nullable()
    .default(null),
  max_uses: z
    .number()
    .int("Max uses must be an integer")
    .min(1, "Max uses must be at least 1")
    .max(1000, "Max uses cannot exceed 1000")
    .nullable()
    .default(null),
});
export type ShareLinkCreateInput = z.infer<typeof ShareLinkCreateSchema>;

export const ShareLinkActivateSchema = z.object({
  token: z.string().min(1, "Token is required").max(500, "Invalid token"),
});
export type ShareLinkActivateInput = z.infer<typeof ShareLinkActivateSchema>;

export const ShareLinkConsumeSchema = z.object({
  token: z.string().min(1, "Token is required").max(500, "Invalid token"),
});
export type ShareLinkConsumeInput = z.infer<typeof ShareLinkConsumeSchema>;

export const ShareLinkRevokeSchema = z.object({
  link_id: UUIDSchema,
});
export type ShareLinkRevokeInput = z.infer<typeof ShareLinkRevokeSchema>;

export const UpsertShareLinkRecipientSchema = z.object({
  link_id: UUIDSchema,
  recipient_email: EmailSchema,
  permissions: PermissionsSchema,
  max_uses: z
    .number()
    .int("Max uses must be an integer")
    .min(1, "Max uses must be at least 1")
    .max(1000, "Max uses cannot exceed 1000")
    .nullable()
    .default(null),
});
export type UpsertShareLinkRecipientInput = z.infer<typeof UpsertShareLinkRecipientSchema>;

// ==================== VERSION SCHEMAS ====================
export const DocumentVersionCreateSchema = z.object({
  document_id: UUIDSchema,
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename too long")
    .regex(/^[\w\s.-]+$/, "Invalid filename format"),
  mime_type: z
    .string()
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_+.]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_+.]*$/,
      "Invalid MIME type"
    ),
});
export type DocumentVersionCreateInput = z.infer<typeof DocumentVersionCreateSchema>;

export const DocumentVersionFinalizeSchema = z.object({
  version_id: UUIDSchema,
  size_bytes: z.number().int("Size must be an integer").min(0, "Size cannot be negative"),
  mime_type: z
    .string()
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_+.]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_+.]*$/,
      "Invalid MIME type"
    ),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/, "Invalid SHA256 hash format"),
});
export type DocumentVersionFinalizeInput = z.infer<typeof DocumentVersionFinalizeSchema>;

// ==================== AUDIT SCHEMAS ====================
export const AuditEventSchema = z.object({
  action: z.enum(AUDIT_ACTIONS),
  object_type: z.enum(OBJECT_TYPES),
  object_id: UUIDSchema,
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type AuditEventInput = z.infer<typeof AuditEventSchema>;

// ==================== AUTH SCHEMAS ====================
export const SignInSchema = z.object({
  email: EmailSchema,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password cannot exceed 128 characters"),
});
export type SignInInput = z.infer<typeof SignInSchema>;

export const SignUpSchema = z.object({
  email: EmailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
export type SignUpInput = z.infer<typeof SignUpSchema>;

// ==================== VALIDATION UTILITIES ====================
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      throw new Error(`Validation failed: ${messages.join("; ")}`);
    }
    throw error;
  }
}

export function validateInputSafe<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } {
  try {
    const result = schema.safeParse(data);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      return {
        success: false,
        error: messages.join("; "),
      };
    }
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown validation error",
    };
  }
}
