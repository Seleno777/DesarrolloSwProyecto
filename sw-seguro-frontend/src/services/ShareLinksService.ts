import { supabase } from "../lib/supabase";
import { validateInput } from "../lib/validation";
import {
  ShareLinkCreateSchema,
  ShareLinkActivateSchema,
  ShareLinkConsumeSchema,
  ShareLinkRevokeSchema,
  UpsertShareLinkRecipientSchema,
  type ShareLinkCreateInput,
  type ShareLinkActivateInput,
  type ShareLinkConsumeInput,
  type ShareLinkRevokeInput,
  type UpsertShareLinkRecipientInput,
} from "../lib/validation";
import { ApiError, ValidationError } from "../lib/errors";
import { shareLinkLimiter, withRateLimit } from "../lib/rateLimit";
import type {
  ShareLinkRow,
  ShareLinkRecipientRow,
  ShareLinkCreateResponse,
  ActivateShareLinkResponse,
  ConsumeShareLinkResponse,
} from "../types/models";
import { AuditService } from "./DocumentsService";

/**
 * Share Link Service - Secure link sharing
 * All inputs validated with Zod
 * Implements access control and audit logging
 */
export class ShareLinksService {
  /**
   * Create a share link for a document
   */
  static async createShareLink(input: ShareLinkCreateInput): Promise<ShareLinkCreateResponse> {
    return withRateLimit(shareLinkLimiter, async () => {
      const validated = validateInput(ShareLinkCreateSchema, input);

      const { data, error } = await supabase.rpc("create_share_link", {
        p_document_id: validated.document_id,
        p_expires_in_minutes: validated.expires_in_minutes,
        p_max_uses: validated.max_uses,
      });

      if (error) {
        console.error("Create share link error:", error);
        throw new ApiError("CREATE_SHARE_LINK_FAILED", 500, "Failed to create share link");
      }

      if (!data || !data.link_id || !data.token) {
        throw new ApiError("CREATE_SHARE_LINK_FAILED", 500, "Share link creation returned invalid data");
      }

      // Log audit event
      await AuditService.logEvent({
        action: "share_link_created",
        object_type: "share_link",
        object_id: data.link_id,
        metadata: {
          documentId: validated.document_id,
          expiresInMinutes: validated.expires_in_minutes,
          maxUses: validated.max_uses,
        },
      });

      return {
        link_id: data.link_id,
        token: data.token,
        expires_at: data.expires_at,
      };
    });
  }

  /**
   * Activate a share link (get document ID for viewing)
   */
  static async activateShareLink(input: ShareLinkActivateInput): Promise<ActivateShareLinkResponse> {
    return withRateLimit(shareLinkLimiter, async () => {
      const validated = validateInput(ShareLinkActivateSchema, input);

      const { data, error } = await supabase.rpc("activate_share_link", {
        p_token: validated.token,
      });

      if (error) {
        console.error("Activate share link error:", error);
        throw new ApiError("ACTIVATE_SHARE_LINK_FAILED", 500, "Failed to activate share link");
      }

      if (!data || !data.out_document_id) {
        throw new ApiError("ACTIVATE_SHARE_LINK_FAILED", 500, "Invalid share link");
      }

      // Log audit event
      await AuditService.logEvent({
        action: "share_link_activated",
        object_type: "share_link",
        object_id: data.out_document_id,
      });

      return {
        out_document_id: data.out_document_id,
      };
    });
  }

  /**
   * Consume a share link (increment usage count)
   */
  static async consumeShareLink(input: ShareLinkConsumeInput): Promise<ConsumeShareLinkResponse> {
    return withRateLimit(shareLinkLimiter, async () => {
      const validated = validateInput(ShareLinkConsumeSchema, input);

      const { data, error } = await supabase.rpc("consume_share_link", {
        p_token: validated.token,
      });

      if (error) {
        console.error("Consume share link error:", error);
        throw new ApiError("CONSUME_SHARE_LINK_FAILED", 500, "Failed to consume share link");
      }

      if (!data || !data.out_document_id) {
        throw new ApiError("CONSUME_SHARE_LINK_FAILED", 500, "Invalid or expired share link");
      }

      // Log audit event
      await AuditService.logEvent({
        action: "share_link_consumed",
        object_type: "share_link",
        object_id: data.out_document_id,
      });

      return {
        out_document_id: data.out_document_id,
        out_max_uses: data.out_max_uses,
      };
    });
  }

  /**
   * Revoke a share link
   */
  static async revokeShareLink(input: ShareLinkRevokeInput): Promise<void> {
    return withRateLimit(shareLinkLimiter, async () => {
      const validated = validateInput(ShareLinkRevokeSchema, input);

      const { error } = await supabase.rpc("revoke_share_link", {
        p_link_id: validated.link_id,
      });

      if (error) {
        console.error("Revoke share link error:", error);
        throw new ApiError("REVOKE_SHARE_LINK_FAILED", 500, "Failed to revoke share link");
      }

      // Log audit event
      await AuditService.logEvent({
        action: "share_link_revoked",
        object_type: "share_link",
        object_id: validated.link_id,
      });
    });
  }

  /**
   * List share links for a document
   */
  static async listShareLinks(documentId: string): Promise<ShareLinkRow[]> {
    if (!documentId) {
      throw new ValidationError("Document ID is required");
    }

    const { data, error } = await supabase.rpc("list_share_links", {
      p_document_id: documentId,
    });

    if (error) {
      console.error("List share links error:", error);
      throw new ApiError("LIST_SHARE_LINKS_FAILED", 500, "Failed to list share links");
    }

    return data || [];
  }

  /**
   * Add or update a share link recipient
   */
  static async upsertShareLinkRecipient(
    input: UpsertShareLinkRecipientInput
  ): Promise<void> {
    return withRateLimit(shareLinkLimiter, async () => {
      const validated = validateInput(UpsertShareLinkRecipientSchema, input);

      const { error } = await supabase.rpc("upsert_share_link_recipient", {
        p_link_id: validated.link_id,
        p_recipient_email: validated.recipient_email,
        p_can_view: validated.permissions.can_view,
        p_can_download: validated.permissions.can_download,
        p_can_edit: validated.permissions.can_edit,
        p_can_share: validated.permissions.can_share,
        p_max_uses: validated.max_uses,
      });

      if (error) {
        console.error("Upsert share link recipient error:", error);
        throw new ApiError("UPSERT_RECIPIENT_FAILED", 500, "Failed to add recipient");
      }

      // Log audit event
      await AuditService.logEvent({
        action: "share_link_created",
        object_type: "share_link",
        object_id: validated.link_id,
        metadata: {
          recipientEmail: validated.recipient_email,
          permissions: validated.permissions,
        },
      });
    });
  }

  /**
   * List recipients of a share link
   */
  static async listShareLinkRecipients(linkId: string): Promise<ShareLinkRecipientRow[]> {
    if (!linkId) {
      throw new ValidationError("Link ID is required");
    }
    const { data, error } = await supabase.rpc("list_share_link_recipients", {
      p_link_id: linkId,
    });

    if (error) {
      console.error("List share link recipients error:", error);
      throw new ApiError("LIST_RECIPIENTS_FAILED", 500, "Failed to list recipients");
    }

    return data || [];
  }
}
