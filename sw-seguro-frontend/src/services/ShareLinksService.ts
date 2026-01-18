import { supabase } from "../lib/supabase";

export type ShareLinkCreateInput = {
  document_id: string;
  expires_in_minutes: number;
  max_uses: number;
};

export type ShareLinkCreateResponse = {
  link_id: string;
  token: string;
  expires_at: string;
};

export type UpsertRecipientInput = {
  link_id: string;
  recipient_email: string;
  permissions: {
    can_view: boolean;
    can_download: boolean;
    can_edit: boolean;
    can_share: boolean;
  };
  max_uses?: number;
};

export type ActivateShareLinkResponse = {
  out_document_id: string;
};

export class ShareLinksService {
  static async createShareLink(input: ShareLinkCreateInput): Promise<ShareLinkCreateResponse> {
    const { data, error } = await supabase.rpc("create_share_link", {
      p_document_id: input.document_id,
      p_expires_in_minutes: input.expires_in_minutes,
      p_max_uses: input.max_uses,
    });

    if (error) {
      console.error("create_share_link error:", error);
      throw new Error(error.message || "Failed to create share link");
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.link_id || !row?.token || !row?.expires_at) {
      console.error("create_share_link RPC row:", row);
      throw new Error("Share link creation returned invalid data");
    }

    return {
      link_id: row.link_id,
      token: row.token,
      expires_at: row.expires_at,
    };
  }

  static async upsertShareLinkRecipient(input: UpsertRecipientInput): Promise<string> {
    const email = (input.recipient_email || "").trim().toLowerCase();
    if (!email) throw new Error("recipient_email is required");

    const { data, error } = await supabase.rpc("upsert_share_link_recipient", {
      p_link_id: input.link_id,
      p_recipient_email: email,
      p_can_view: !!input.permissions.can_view,
      p_can_download: !!input.permissions.can_download,
      p_can_edit: !!input.permissions.can_edit,
      p_can_share: !!input.permissions.can_share,
      p_max_uses: input.max_uses ?? 1,
    });

    if (error) {
      console.error("Upsert share link recipient error:", error);
      throw new Error(error.message || "Failed to add recipient");
    }

    if (!data) throw new Error("Recipient upsert returned empty response");
    return String(data);
  }

  static async activateShareLink(token: string): Promise<ActivateShareLinkResponse> {
  const tokenTrim = (token || "").trim();
  if (!tokenTrim) throw new Error("Token is required");

  const { data, error } = await supabase.rpc("activate_share_link", {
    p_token: tokenTrim,
  });

  if (error) {
    // ✅ log completo (lo que te falta)
    console.error("Activate share link error FULL:", {
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: (error as any).code,
    });
    throw new Error(
      `${error.message}${
        (error as any)?.details ? " | " + (error as any).details : ""
      }`
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.out_document_id) throw new Error("Invalid activation response");

  return { out_document_id: row.out_document_id };
}

}
