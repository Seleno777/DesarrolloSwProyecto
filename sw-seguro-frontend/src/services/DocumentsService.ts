import { supabase } from "../lib/supabase";
import { validateInput } from "../lib/validation";
import {
  DocumentCreateSchema,
  DocumentUpdateSchema,
  DocumentDeleteSchema,
  AuditEventSchema,
  type DocumentCreateInput,
  type DocumentUpdateInput,
  type DocumentDeleteInput,
  type AuditEventInput,
} from "../lib/validation";
import { ApiError, ValidationError } from "../lib/errors";
import { documentLimiter, withRateLimit } from "../lib/rateLimit";
import type { DocumentRow } from "../types/models";

/**
 * Document Service - Secure document management
 * All inputs validated with Zod
 * All outputs filtered for security
 */
export class DocumentsService {
  /**
   * Create a new document
   */
  static async createDocument(input: DocumentCreateInput): Promise<DocumentRow> {
    return withRateLimit(documentLimiter, async () => {
      const validated = validateInput(DocumentCreateSchema, input);

      const { data, error } = await supabase.rpc("create_document", {
        p_title: validated.title,
        p_description: validated.description,
        p_classification: validated.classification,
      });

      if (error) {
        console.error("Create document error:", error);
        throw new ApiError("CREATE_DOCUMENT_FAILED", 500, "Failed to create document");
      }

      if (!data) {
        throw new ApiError("CREATE_DOCUMENT_FAILED", 500, "Document creation returned no data");
      }

      // Log audit event
      await AuditService.logEvent({
        action: "document_created",
        object_type: "document",
        object_id: data,
        metadata: { classification: validated.classification },
      });

      return this.getDocument(data);
    });
  }

  /**
   * Get document by ID
   */
  static async getDocument(documentId: string): Promise<DocumentRow> {
    if (!documentId || typeof documentId !== "string") {
      throw new ValidationError("Invalid document ID");
    }

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("is_deleted", false)
      .single();

    if (error || !data) {
      throw new ApiError("DOCUMENT_NOT_FOUND", 404, "Document not found");
    }

    return data;
  }

  /** Document list (lo que RLS permita ver en documents) */
  static async listMyVisible(): Promise<DocumentRow[]> {
    return withRateLimit(documentLimiter, async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id,title,classification,owner_id,created_at,updated_at")
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("List my visible error:", error);
        throw new ApiError("LIST_DOCUMENTS_FAILED", 500, "Failed to list documents");
      }
      return (data ?? []) as DocumentRow[];
    });
  }

  /** Shared with me (si usas document_grants) */
  static async listSharedWithMe() {
    return withRateLimit(documentLimiter, async () => {
      const { data, error } = await supabase
        .from("document_grants")
        .select(`
        document_id,
        can_view, can_download, can_edit, can_share,
        created_at, revoked_at,
        documents:document_id ( id, title, classification, owner_id, created_at, updated_at )
      `)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("List shared with me error:", error);
        throw new ApiError("LIST_SHARED_FAILED", 500, "Failed to list shared documents");
      }
      return data ?? [];
    });
  }

  /**
   * Update document metadata
   */
  static async updateDocument(input: DocumentUpdateInput): Promise<DocumentRow> {
    return withRateLimit(documentLimiter, async () => {
      const validated = validateInput(DocumentUpdateSchema, input);

      const { error } = await supabase.rpc("update_document_metadata", {
        p_document_id: validated.document_id,
        p_title: validated.title,
        p_description: validated.description,
        p_classification: validated.classification,
      });

      if (error) {
        console.error("Update document error:", error);
        throw new ApiError("UPDATE_DOCUMENT_FAILED", 500, "Failed to update document");
      }

      // Log audit event
      await AuditService.logEvent({
        action: "document_updated",
        object_type: "document",
        object_id: validated.document_id,
        metadata: validated,
      });

      return this.getDocument(validated.document_id);
    });
  }

  /**
   * Soft delete document
   */
  static async deleteDocument(input: DocumentDeleteInput): Promise<void> {
    return withRateLimit(documentLimiter, async () => {
      const validated = validateInput(DocumentDeleteSchema, input);

      const { error } = await supabase.rpc("soft_delete_document", {
        p_document_id: validated.document_id,
      });

      if (error) {
        console.error("Delete document error:", error);
        throw new ApiError("DELETE_DOCUMENT_FAILED", 500, "Failed to delete document");
      }

      // Log audit event
      await AuditService.logEvent({
        action: "document_deleted",
        object_type: "document",
        object_id: validated.document_id,
      });
    });
  }
}

/**
 * Document Grant Service - Access control management
 */
export class DocumentGrantService {
  /**
   * Find user ID by email
   */
  static async getUserIdByEmail(email: string): Promise<string> {
    if (!email || typeof email !== 'string') {
      throw new ValidationError("Valid email is required");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !data) {
      throw new ApiError(
        "USER_NOT_FOUND",
        404,
        `Usuario con email "${email}" no encontrado. Verifica que el usuario esté registrado.`
      );
    }

    return data.id;
  }

  /**
   * Grant access to a document
   */
  static async grantAccess(
    documentId: string,
    granteeId: string,
    permissions: {
      can_view: boolean;
      can_download: boolean;
      can_edit: boolean;
      can_share: boolean;
    }
  ): Promise<void> {
    return withRateLimit(documentLimiter, async () => {
      if (!documentId || !granteeId) {
        throw new ValidationError("Document ID and Grantee ID are required");
      }

      const { error } = await supabase.rpc("upsert_document_grant", {
        p_document_id: documentId,
        p_grantee_id: granteeId,
        p_can_view: permissions.can_view,
        p_can_download: permissions.can_download,
        p_can_edit: permissions.can_edit,
        p_can_share: permissions.can_share,
      });

      if (error) {
        console.error("Grant access error:", error);
        throw new ApiError("GRANT_ACCESS_FAILED", 500, "Failed to grant access");
      }

      // Log audit event
      await AuditService.logEvent({
        action: "access_granted",
        object_type: "grant",
        object_id: granteeId,
        metadata: { documentId, permissions },
      });
    });
  }

  /**
   * Check if user can access document
   */
  static async canAccessDocument(
    documentId: string,
    userId: string,
    action: "view" | "download" | "edit" | "share"
  ): Promise<boolean> {
    if (!documentId || !userId) {
      return false;
    }

    const { data, error } = await supabase.rpc("can_access_document", {
      uid: userId,
      doc_id: documentId,
      act: action,
    });

    if (error) {
      console.error("Check access error:", error);
      return false;
    }

    return data === true;
  }

  /**
   * Revoke access to document
   */
  static async revokeAccess(documentId: string, granteeId: string): Promise<void> {
    return withRateLimit(documentLimiter, async () => {
      if (!documentId || !granteeId) {
        throw new ValidationError("Document ID and Grantee ID are required");
      }

      const { error } = await supabase.rpc("revoke_document_grant", {
        p_document_id: documentId,
        p_grantee_id: granteeId,
      });

      if (error) {
        console.error("Revoke access error:", error);
        throw new ApiError("REVOKE_ACCESS_FAILED", 500, "Failed to revoke access");
      }

      // Log audit event
      await AuditService.logEvent({
        action: "access_revoked",
        object_type: "grant",
        object_id: granteeId,
        metadata: { documentId },
      });
    });
  }

  /**
   * Revoke all access to document
   */
  static async revokeAllAccess(documentId: string): Promise<void> {
    return withRateLimit(documentLimiter, async () => {
      if (!documentId) {
        throw new ValidationError("Document ID is required");
      }

      const { error } = await supabase.rpc("revoke_all_document_access", {
        p_document_id: documentId,
      });

      if (error) {
        console.error("Revoke all access error:", error);
        throw new ApiError("REVOKE_ALL_ACCESS_FAILED", 500, "Failed to revoke all access");
      }

      // Log audit event
      await AuditService.logEvent({
        action: "access_revoked",
        object_type: "document",
        object_id: documentId,
        metadata: { revokedAll: true },
      });
    });
  }

  /**
   * List grants for a document
   */
  static async listGrants(documentId: string) {
    if (!documentId) {
      throw new ValidationError("Document ID is required");
    }

    const { data, error } = await supabase.rpc("list_document_grants", {
      p_document_id: documentId,
    });

    if (error) {
      console.error("List grants error:", error);
      throw new ApiError("LIST_GRANTS_FAILED", 500, "Failed to list grants");
    }

    return data || [];
  }
}

/**
 * Document Version Service - File versioning
 */
export class DocumentVersionService {
  /**
   * Create a new document version
   */
  static async createVersion(
    documentId: string,
    filename: string,
    mimeType: string
  ): Promise<string> {
    if (!documentId || !filename || !mimeType) {
      throw new ValidationError("Document ID, filename, and MIME type are required");
    }

    const { data, error } = await supabase.rpc("create_document_version", {
      p_document_id: documentId,
      p_filename: filename,
      p_mime_type: mimeType,
    });

    if (error) {
      console.error("Create version RPC error:", error);
      throw new ApiError("CREATE_VERSION_FAILED", 500, `Backend error: ${error.message}`);
    }

    if (!data) {
      console.error("No data returned from create_document_version RPC");
      throw new ApiError("CREATE_VERSION_FAILED", 500, "No version ID returned from server");
    }

    // Extract version ID - handle multiple formats
    let versionId: string | null = null;

    if (typeof data === 'string') {
      // If RPC returns string directly
      versionId = data;
    } else if (typeof data === 'object' && data !== null) {
      // If RPC returns object, try common field names
      versionId = data.id || data.version_id || data.data || null;
    }

    console.log("Version creation response:", { data, extractedId: versionId });
    
    if (!versionId || typeof versionId !== 'string') {
      console.error("Failed to extract valid version ID from response:", { data, attempt: versionId });
      throw new ApiError(
        "CREATE_VERSION_FAILED",
        500,
        "Server did not return a valid version ID. Check your backend RPC function."
      );
    }

    return versionId;
  }

  /**
   * Finalize document version with file hash
   */
  static async finalizeVersion(
    versionId: string,
    sizeBytes: number,
    mimeType: string,
    sha256: string
  ): Promise<void> {
    if (!versionId || !sha256 || sizeBytes < 0) {
      throw new ValidationError("Invalid version finalization parameters");
    }

    const { error } = await supabase.rpc("finalize_document_version", {
      p_version_id: versionId,
      p_size_bytes: sizeBytes,
      p_mime_type: mimeType,
      p_sha256: sha256,
    });

    if (error) {
      console.error("Finalize version error:", error);
      throw new ApiError("FINALIZE_VERSION_FAILED", 500, "Failed to finalize document version");
    }

    // Log audit event
    await AuditService.logEvent({
      action: "file_uploaded",
      object_type: "file",
      object_id: versionId,
      metadata: { sizeBytes, sha256 },
    });
  }

  /**
   * List versions for a document
   */
  static async listVersions(documentId: string) {
    if (!documentId) {
      throw new ValidationError("Document ID is required");
    }

    const { data, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("List versions error:", error);
      throw new ApiError("LIST_VERSIONS_FAILED", 500, "Failed to list document versions");
    }

    return data || [];
  }
}

/**
 * Audit Service - Activity logging
 */
export class AuditService {
  /**
   * Log an audit event
   */
  static async logEvent(input: AuditEventInput): Promise<void> {
    try {
      const validated = validateInput(AuditEventSchema, input);

      const { error } = await supabase.rpc("audit_event", {
        p_action: validated.action,
        p_object_type: validated.object_type,
        p_object_id: validated.object_id,
        p_metadata: validated.metadata,
      });

      if (error) {
        console.error("Audit log error:", error);
        // Don't throw - audit failures shouldn't break the app
      }
    } catch (error) {
      console.error("Audit event validation error:", error);
      // Don't throw - audit failures shouldn't break the app
    }
  }

  /**
   * Get audit logs (for security admin)
   */
  static async getAuditLogs(limit: number = 100, offset: number = 0) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      throw new ValidationError("Limit must be between 1 and 1000");
    }

    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("occurred_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Get audit logs error:", error);
      throw new ApiError("GET_AUDIT_LOGS_FAILED", 500, "Failed to retrieve audit logs");
    }

    return data || [];
  }
}
