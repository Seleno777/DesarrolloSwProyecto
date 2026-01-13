import { supabase } from "../lib/supabase";
import type { ShareLinkCreateResponse, ActivateShareLinkResponse } from "../types/models";

export class ShareLinksService {
  /** create_share_link RPC */
  static async createShareLink(params: {
    p_document_id: string;
    p_expires_in_minutes: number;
    p_max_uses: number;
  }): Promise<ShareLinkCreateResponse> {
    const { data, error } = await supabase.rpc("create_share_link", params);
    if (error) throw error;

    // PostgREST devuelve array en tu caso (como en Postman)
    const row = Array.isArray(data) ? data[0] : data;
    return row as ShareLinkCreateResponse;
  }

  /** upsert_share_link_recipient RPC (ojo: suele devolver void => en REST sale 204) */
  static async upsertRecipient(params: {
    p_link_id: string;
    p_recipient_email: string;
    p_can_view: boolean;
    p_can_download: boolean;
    p_can_edit: boolean;
    p_can_share: boolean;
    p_max_uses?: number; // si tu función lo tiene
  }) {
    const { error } = await supabase.rpc("upsert_share_link_recipient", params);
    if (error) throw error;
    return true;
  }

  /** activate_share_link RPC: devuelve document_id si el usuario tiene derecho a usar el token */
  static async activateShareLink(p_token: string): Promise<string> {
    const { data, error } = await supabase.rpc("activate_share_link", { p_token });
    if (error) throw error;

    const row = Array.isArray(data) ? (data[0] as ActivateShareLinkResponse) : (data as ActivateShareLinkResponse);
    return row.out_document_id;
  }
}
